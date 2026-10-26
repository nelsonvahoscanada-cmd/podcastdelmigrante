/*
  functions/_lib/vistas.js — Contador público de visualizaciones
  ======================================================================
  Lectura y registro de visualizaciones de noticias y guías.
  Base D1 INDEPENDIENTE (binding VISTAS_DB, solo en Producción); esquema en
  db/vistas/0001_vistas.sql; documentación en docs/contador-visualizaciones.md.
  No tiene relación con /api/events ni con las estadísticas de las miniwebs.

  GET  /api/vistas/ART-AAAA-NNN   → { id, vistas, inicio }   (público, en caché)
  POST /api/vistas/ART-AAAA-NNN   → { contado: true|false }  (una visualización)

  Una visualización se cuenta solo si:
    - el artículo es una noticia o guía publicada (lista generada por
      scripts/build-article-pages.mjs: ARTICULOS_CON_CONTADOR);
    - la petición llega al dominio oficial, desde una página del mismo
      origen, como JSON pequeño;
    - el navegador no es un robot conocido;
    - ese navegador no la contó ya en los últimos 30 minutos (huella con
      sal diaria, sin IP guardada) ni superó el límite de frecuencia.
  La regla de los 5 segundos con la pestaña visible la aplica js/vistas.js.
  Nadie puede fijar el valor: el servidor solo suma 1, nunca lee un número
  enviado por el navegador.
*/

import { ARTICULOS_CON_CONTADOR } from "./published-articles.js";

export const DOMINIO = "podcastdelmigrante.com";
export const ID_RE = /^ART-\d{4}-\d{3}$/;
export const VENTANA_MS = 30 * 60 * 1000;          /* deduplicación: 30 minutos */
export const LIMITE_POR_VENTANA = 20;               /* artículos distintos por navegador en 30 minutos */
export const MAX_CUERPO = 256;                       /* bytes */
const ZONA = "America/Edmonton";

/* Robots, rastreadores, generadores de vistas previas de enlaces y clientes
   automáticos. Los navegadores integrados de Facebook, Instagram, TikTok,
   LinkedIn o Pinterest (FBAN/FBAV, Instagram, BytedanceWebview, LinkedInApp,
   Pinterest for iOS) NO coinciden: los usan personas. Solo se excluyen sus
   robots de vista previa (facebookexternalhit, LinkedInBot, Pinterestbot…). */
export const ROBOTS =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp\/|skypeuripreview|slack-imgproxy|embedly|headless|phantom|lighthouse|pagespeed|gtmetrix|python|curl|wget|httpclient|okhttp|java\/|go-http|axios|node-fetch|undici|postman|insomnia|uptime|pingdom|statuscake|scrapy|semrush|ahrefs|mj12|dataforseo|bytespider|petalbot|yandex|baidu|google-|googleother|adsbot|mediapartners/i;

export function esRobot(ua, cf) {
  if (!ua || !/^Mozilla\//.test(ua)) return true;
  if (ROBOTS.test(ua)) return true;
  if (cf && (cf.verifiedBotCategory || (cf.botManagement && cf.botManagement.verifiedBot))) return true;
  return false;
}

/* Dominio donde se cuentan visualizaciones. Las vistas previas (*.pages.dev)
   nunca cuentan. VISTAS_PRUEBAS_LOCAL=1 solo habilita 127.0.0.1/localhost,
   que no existen en Cloudflare. */
export function dominioValido(url, env) {
  if (url.hostname === DOMINIO) return true;
  return env.VISTAS_PRUEBAS_LOCAL === "1" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
}

export function idValido(id) {
  return typeof id === "string" && ID_RE.test(id) && ARTICULOS_CON_CONTADOR.has(id);
}

/* Fecha local de Alberta (AAAA-MM-DD) de un instante. */
export function diaAlberta(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

async function sha256(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function respuesta(datos, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(datos), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}

export function metodoNoPermitido() {
  return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
}

/* ---------- GET: cifra pública ---------- */
export async function leerVistas(request, env, id, ahora = Date.now()) {
  const url = new URL(request.url);
  if (!dominioValido(url, env) || !idValido(id)) return respuesta({ error: "No encontrado" }, 404);
  if (!env.VISTAS_DB) return respuesta({ error: "Servicio no disponible" }, 503);

  /* Caché de 60 s en el borde: una noticia muy leída no consulta D1 en cada visita. */
  const cache = typeof caches !== "undefined" && caches.default ? caches.default : null;
  const clave = new Request(`${url.origin}/api/vistas/${id}`, { method: "GET" });
  if (cache) {
    try {
      const guardada = await cache.match(clave);
      if (guardada) return guardada;
    } catch {
      /* sin caché, se consulta D1 */
    }
  }

  try {
    const fila = await env.VISTAS_DB.prepare(
      `SELECT (SELECT vistas FROM vistas_total WHERE article_id = ?1) AS vistas,
              (SELECT valor FROM vistas_config WHERE clave = 'inicio') AS inicio`
    )
      .bind(id)
      .first();
    const res = respuesta({ id, vistas: (fila && fila.vistas) || 0, inicio: (fila && fila.inicio) || null }, 200, "public, max-age=30, s-maxage=60");
    if (cache) {
      try {
        await cache.put(clave, res.clone());
      } catch {
        /* la caché es opcional */
      }
    }
    return res;
  } catch (e) {
    console.error("vistas: error al leer", id, e && e.message);
    return respuesta({ error: "Servicio no disponible" }, 503);
  }
}

/* ---------- POST: registrar una visualización ---------- */
export async function registrarVista(request, env, id, ahora = Date.now()) {
  const url = new URL(request.url);
  /* Vistas previas y otros dominios: nunca se cuenta. */
  if (!dominioValido(url, env)) return respuesta({ contado: false }, 403);
  if (!idValido(id)) return respuesta({ error: "No encontrado" }, 404);

  /* Solo desde una página del propio sitio (no desde otros sitios ni scripts). */
  const origen = request.headers.get("Origin");
  if (origen !== url.origin) return respuesta({ contado: false }, 403);
  const sitio = request.headers.get("Sec-Fetch-Site");
  if (sitio && sitio !== "same-origin") return respuesta({ contado: false }, 403);
  if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return respuesta({ contado: false }, 415);

  const texto = await request.text().catch(() => "");
  if (texto.length > MAX_CUERPO) return respuesta({ contado: false }, 413);
  let cuerpo = null;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    cuerpo = null;
  }
  if (!cuerpo || typeof cuerpo !== "object" || cuerpo.id !== id) return respuesta({ contado: false }, 400);

  const ua = request.headers.get("User-Agent") || "";
  if (esRobot(ua, request.cf)) return respuesta({ contado: false });

  if (!env.VISTAS_DB || !env.VISTAS_SAL) return respuesta({ contado: false }, 503);

  try {
    const db = env.VISTAS_DB;
    const dia = diaAlberta(ahora);
    const sal = `${env.VISTAS_SAL}|${dia}`;
    const ip = request.headers.get("CF-Connecting-IP") || "";
    /* La IP solo se usa aquí, dentro de la huella; nunca se guarda. */
    const grupo = await sha256(`${sal}|${ip}|${ua}`);
    const huella = await sha256(`${sal}|${ip}|${ua}|${id}`);
    const ahoraIso = new Date(ahora).toISOString();
    const expira = new Date(ahora + VENTANA_MS).toISOString();

    await db.prepare("DELETE FROM vistas_reciente WHERE expira <= ?1").bind(ahoraIso).run();

    const uso = await db.prepare("SELECT COUNT(*) AS n FROM vistas_reciente WHERE grupo = ?1 AND expira > ?2").bind(grupo, ahoraIso).first();
    if (uso && uso.n >= LIMITE_POR_VENTANA) return respuesta({ contado: false }, 429);

    const nueva = await db
      .prepare("INSERT INTO vistas_reciente (huella, grupo, expira) VALUES (?1, ?2, ?3) ON CONFLICT(huella) DO NOTHING")
      .bind(huella, grupo, expira)
      .run();
    if (!nueva.meta || nueva.meta.changes !== 1) return respuesta({ contado: false });

    await db.batch([
      db
        .prepare(
          `INSERT INTO vistas_total (article_id, vistas, actualizado) VALUES (?1, 1, ?2)
           ON CONFLICT(article_id) DO UPDATE SET vistas = vistas + 1, actualizado = excluded.actualizado`
        )
        .bind(id, ahoraIso),
      db
        .prepare(
          `INSERT INTO vistas_dia (dia, article_id, vistas) VALUES (?1, ?2, 1)
           ON CONFLICT(dia, article_id) DO UPDATE SET vistas = vistas + 1`
        )
        .bind(dia, id),
      db.prepare("INSERT INTO vistas_config (clave, valor) VALUES ('inicio', ?1) ON CONFLICT(clave) DO NOTHING").bind(ahoraIso),
    ]);
    return respuesta({ contado: true });
  } catch (e) {
    console.error("vistas: error al registrar", id, e && e.message);
    return respuesta({ contado: false }, 503);
  }
}
