/*
  podcastdelmigrante-analytics — Cloudflare Worker
  ======================================================================
  Recibe los eventos que envía js/analytics.js (navigator.sendBeacon) y
  los guarda en la base D1 "podcastdelmigrante-analytics" (binding: DB),
  tabla `events`.

  QUÉ GUARDA (una fila por evento):
    received_at    hora del SERVIDOR (ISO 8601, UTC). La hora del navegador
                   (`ts`) se ignora.
    event          solo nombres de ALLOWED_EVENTS
    business_id    solo ids de la lista pública de empresas autorizadas
    business_slug  slug oficial del negocio (lo pone el Worker, no el navegador)
    target         qué botón y en qué lugar (ej. "whatsapp-sticky")
    page           ruta de la página, sin parámetros
    referrer_host  solo el dominio de origen (ej. "instagram.com")
    utm_source / utm_medium / utm_campaign / utm_content
    device_type    "mobile" | "tablet" | "desktop" (deducido del navegador;
                   el User-Agent NO se guarda)

  QUÉ NO GUARDA: IP, User-Agent, cookies, ni ningún dato personal.
  La IP solo se usa en memoria, unos segundos, para limitar abusos.

  EMPRESAS AUTORIZADAS (sin lista fija): el Worker lee
  https://podcastdelmigrante.com/negocios-premium.json, que genera
  scripts/build-profile-pages.mjs a partir de js/businesses.js (perfiles
  Premium publicados: business_id → slug). Publicar un perfil nuevo basta;
  este Worker NO se vuelve a desplegar. Un visitante no puede añadir
  empresas: la lista sale del repositorio, y el id y el slug del evento
  deben coincidir con ella. Si la lista no se puede leer, se usa la última
  leída o, en su defecto, FALLBACK_BUSINESSES.
  AGREGAR UN EVENTO NUEVO: añadirlo a ALLOWED_EVENTS.

  RUTAS
    POST /api/events          recibe un evento
    GET  /api/events/health   comprobación (no expone datos)
========================================================================= */

/* ---------- Configuración ---------- */

/* Lista pública de empresas Premium autorizadas (ver cabecera) */
const AUTHORIZED_URL = "https://podcastdelmigrante.com/negocios-premium.json";
const AUTHORIZED_TTL_MS = 5 * 60 * 1000;  /* se relee como mucho cada 5 min por instancia */
const AUTHORIZED_MISS_RETRY_MS = 60 * 1000; /* id desconocido: relee como mucho 1 vez por minuto */
const AUTHORIZED_EDGE_TTL_S = 60;          /* caché en Cloudflare (bajo costo) */

/* Respaldo si la lista pública no se puede leer y aún no hay ninguna en
   memoria: las empresas publicadas al desplegar esta versión. */
const FALLBACK_BUSINESSES = {
  "BIZ-001": "tomas-velazquez",
  "BIZ-002": "carlos-d-castillo",
  "BIZ-003": "santa-latino",
  "BIZ-004": "1juanromero1",
};

const BIZ_ID_RE = /^BIZ-\d{3,6}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* Eventos válidos de los Perfiles Empresariales */
const ALLOWED_EVENTS = new Set([
  "profile_view",
  "video_click",
  "video_start",
  "booking_click",
  "whatsapp_click",
  "phone_click",
  "email_click",
  "website_click",
  "vehicles_click",
  "directions_click",
  "instagram_click",
  "tiktok_click",
  "facebook_click",
  "linkedin_click",
  /* «Conecta con …» (QR y vCard), presentes en los perfiles Premium */
  "vcard_download",
  "qr_profile_download",
  "qr_contact_download",
]);

/* Orígenes desde los que se aceptan eventos */
const ALLOWED_ORIGINS = new Set([
  "https://podcastdelmigrante.com",
  "https://www.podcastdelmigrante.com",
]);

const MAX_BODY_BYTES = 2048;        /* un evento real pesa ~400 bytes */
const RATE_LIMIT_PER_MINUTE = 60;   /* por visitante y por instancia del Worker */

const EVENTS_PATH = "/api/events";
const HEALTH_PATH = "/api/events/health";

/* ---------- Utilidades ---------- */

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, corsHeaders(origin)),
  });
}

function noContent(origin) {
  return new Response(null, { status: 204, headers: Object.assign({ "Cache-Control": "no-store" }, corsHeaders(origin)) });
}

function corsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/* Texto corto y limpio: sin caracteres de control, recortado, o null */
function cleanText(value, max) {
  if (typeof value !== "string") return null;
  const t = value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
  return t || null;
}

/* Identificador tipo "whatsapp-sticky": minúsculas, números y guiones */
function cleanToken(value, max) {
  if (typeof value !== "string") return null;
  const t = value.trim().toLowerCase();
  return t.length <= max && /^[a-z0-9][a-z0-9_-]*$/.test(t) ? t : null;
}

/* Ruta de la página: empieza por "/", sin parámetros ni fragmento */
function cleanPage(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  const path = value.split(/[?#]/)[0].slice(0, 200);
  return /^\/[A-Za-z0-9._~\/-]*$/.test(path) ? path : null;
}

/* Dominio de origen: solo el nombre de host */
function cleanHost(value) {
  if (typeof value !== "string") return null;
  const h = value.trim().toLowerCase().slice(0, 100);
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) ? h : null;
}

function deviceType(ua) {
  if (!ua) return "unknown";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  return "desktop";
}

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|httpclient|axios|node-fetch|go-http/i;

/* Límite de frecuencia en memoria (no se guarda en ningún lado) */
const hits = new Map();
function rateLimited(key) {
  const now = Date.now();
  const windowStart = now - 60000;
  const list = (hits.get(key) || []).filter((t) => t > windowStart);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.length || v[v.length - 1] < windowStart) hits.delete(k);
  }
  return list.length > RATE_LIMIT_PER_MINUTE;
}

/* ---------- Empresas autorizadas ---------- */

/* Solo entradas con formato válido; cualquier otra cosa se ignora */
export function parseAuthorized(data) {
  if (!data || data.version !== 1 || !data.businesses || typeof data.businesses !== "object" || Array.isArray(data.businesses)) return null;
  const out = {};
  for (const [id, slug] of Object.entries(data.businesses)) {
    if (BIZ_ID_RE.test(id) && typeof slug === "string" && SLUG_RE.test(slug)) out[id] = slug;
  }
  return Object.keys(out).length ? out : null;
}

let authorized = { map: null, loadedAt: 0, triedAt: 0 };
export function resetAuthorizedCache() {
  authorized = { map: null, loadedAt: 0, triedAt: 0 };
}

async function loadAuthorized(env) {
  authorized.triedAt = Date.now();
  try {
    const res = await fetch((env && env.AUTHORIZED_URL) || AUTHORIZED_URL, { cf: { cacheTtl: AUTHORIZED_EDGE_TTL_S, cacheEverything: true } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const map = parseAuthorized(await res.json());
    if (!map) throw new Error("lista vacía o con formato no válido");
    authorized.map = map;
    authorized.loadedAt = authorized.triedAt;
  } catch (e) {
    console.error("negocios-premium.json no disponible:", e && e.message);
  }
}

async function authorizedBusinesses(env, businessId) {
  const now = Date.now();
  const stale = !authorized.map || now - authorized.loadedAt > AUTHORIZED_TTL_MS;
  const unknown = authorized.map && businessId && !authorized.map[businessId];
  /* Como mucho una lectura por minuto, aunque la lista falle o lleguen ids inventados */
  if ((stale || unknown) && now - authorized.triedAt > AUTHORIZED_MISS_RETRY_MS) await loadAuthorized(env);
  return authorized.map || FALLBACK_BUSINESSES;
}

/* ---------- Validación del evento ---------- */

function validate(payload, businesses) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { error: "invalid_json" };

  const event = typeof payload.event === "string" ? payload.event.trim() : "";
  if (!ALLOWED_EVENTS.has(event)) return { error: "event_not_allowed" };

  const businessId = typeof payload.business_id === "string" ? payload.business_id.trim().toUpperCase() : "";
  const slug = BIZ_ID_RE.test(businessId) ? businesses[businessId] : undefined;
  if (!slug) return { error: "business_not_allowed" };

  /* Si el navegador manda el slug, debe coincidir con el oficial */
  if (payload.business != null && payload.business !== slug) return { error: "business_mismatch" };

  return {
    row: {
      event,
      business_id: businessId,
      business_slug: slug,
      target: cleanToken(payload.target, 40),
      page: cleanPage(payload.page),
      referrer_host: cleanHost(payload.referrer),
      utm_source: cleanText(payload.utm_source, 100),
      utm_medium: cleanText(payload.utm_medium, 100),
      utm_campaign: cleanText(payload.utm_campaign, 100),
      utm_content: cleanText(payload.utm_content, 100),
    },
  };
}

/* ---------- Worker ---------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (url.pathname === HEALTH_PATH && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1 FROM events LIMIT 1").all();
        return json({ ok: true, db: "connected" }, 200, origin);
      } catch (e) {
        return json({ ok: false, db: "error" }, 500, origin);
      }
    }

    if (url.pathname !== EVENTS_PATH) return json({ ok: false, error: "not_found" }, 404, origin);

    if (request.method === "OPTIONS") {
      return ALLOWED_ORIGINS.has(origin) ? noContent(origin) : new Response(null, { status: 403 });
    }
    if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, origin);

    /* Solo desde el propio sitio */
    if (!ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "origin_not_allowed" }, 403, origin);

    /* Bots evidentes: se responde OK pero no se guarda */
    const ua = request.headers.get("User-Agent") || "";
    if (BOT_UA.test(ua) && request.headers.get("X-PDM-Test") !== "1") return noContent(origin);

    /* Abuso: demasiados eventos desde el mismo visitante */
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) return json({ ok: false, error: "rate_limited" }, 429, origin);

    /* Tamaño máximo */
    const declared = Number(request.headers.get("Content-Length") || 0);
    if (declared > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413, origin);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413, origin);

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      return json({ ok: false, error: "invalid_json" }, 400, origin);
    }

    const businessId = payload && typeof payload.business_id === "string" ? payload.business_id.trim().toUpperCase() : "";
    const { row, error } = validate(payload, await authorizedBusinesses(env, businessId));
    if (error) return json({ ok: false, error }, 400, origin);

    try {
      await env.DB.prepare(
        `INSERT INTO events
           (received_at, event, business_id, business_slug, target, page, referrer_host,
            utm_source, utm_medium, utm_campaign, utm_content, device_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          new Date().toISOString(),
          row.event,
          row.business_id,
          row.business_slug,
          row.target,
          row.page,
          row.referrer_host,
          row.utm_source,
          row.utm_medium,
          row.utm_campaign,
          row.utm_content,
          deviceType(ua)
        )
        .run();
    } catch (e) {
      console.error("D1 insert failed:", e && e.message);
      return json({ ok: false, error: "storage_error" }, 500, origin);
    }

    return noContent(origin);
  },
};