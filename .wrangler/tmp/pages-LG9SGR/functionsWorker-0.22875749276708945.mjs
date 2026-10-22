var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _lib/registro-env.js
var REQUIRED = ["DIRECTORIO_DB", "SOLICITUDES", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "TURNSTILE_SITE_KEY", "IP_HASH_SALT", "MAIL_FROM", "MAIL_INTERNAL_TO"];
var SITE_KEY_RE = /^[0-3]x[A-Za-z0-9_-]{16,}$/;
function missingConfig(env) {
  const missing = REQUIRED.filter((k) => !env || !env[k]);
  if (env && env.TURNSTILE_SITE_KEY && !SITE_KEY_RE.test(String(env.TURNSTILE_SITE_KEY))) {
    missing.push("TURNSTILE_SITE_KEY (formato no v\xE1lido: debe ser la Site Key, no el nombre del widget)");
  }
  return missing;
}
__name(missingConfig, "missingConfig");
function isSwitchOpen(env) {
  return !!env && env.REGISTRO_ABIERTO === "1";
}
__name(isSwitchOpen, "isSwitchOpen");
function registrationStatus(env) {
  const missing = missingConfig(env);
  const switchOpen = isSwitchOpen(env);
  return { open: switchOpen && missing.length === 0, missing, switchOpen };
}
__name(registrationStatus, "registrationStatus");
function closedReason(status) {
  const parts = [];
  if (!status.switchOpen) parts.push('interruptor REGISTRO_ABIERTO distinto de "1"');
  if (status.missing.length) parts.push("falta: " + status.missing.join(", "));
  return "Registro de empresas cerrado \u2014 " + parts.join(" \xB7 ");
}
__name(closedReason, "closedReason");
function jsonResponse(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign(
      {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex"
      },
      extra
    )
  });
}
__name(jsonResponse, "jsonResponse");

// registro/config.js
async function onRequestGet({ env }) {
  const status = registrationStatus(env);
  if (!status.open) console.warn(closedReason(status));
  return jsonResponse({ ready: status.open, turnstileSiteKey: status.open ? env.TURNSTILE_SITE_KEY : "" });
}
__name(onRequestGet, "onRequestGet");

// ../js/directorio/solicitud-core.js
var CATEGORIES = [
  { id: "automoviles", label: "Autom\xF3viles" },
  { id: "seguros-finanzas", label: "Seguros y protecci\xF3n financiera" },
  { id: "vivienda", label: "Vivienda" },
  { id: "empleo", label: "Empleo" },
  { id: "salud", label: "Salud" },
  { id: "servicios-hogar", label: "Servicios del hogar" },
  { id: "otra", label: "Otra categor\xEDa" }
];
var PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Northwest Territories",
  "Nunavut",
  "Yukon"
];
var LIMITS = {
  text: 120,
  /* nombres, ciudad, cargo */
  categoryOther: 80,
  summary: 300,
  /* reseña corta */
  services: 500,
  /* productos o servicios principales */
  notes: 1e3,
  /* información adicional (privada) */
  extraImagesMax: 3,
  /* fotografías adicionales, opcionales */
  url: 300,
  address: 200,
  imageMaxBytes: 5 * 1024 * 1024,
  /* lo que acepta el servidor */
  imageMinSide: 300,
  /* px */
  imageMaxSide: 8e3
};
var IMAGE_KINDS = { foto: "Fotograf\xEDa del profesional", logo: "Logotipo de la empresa" };
var IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
var one = /* @__PURE__ */ __name((v) => (v == null ? "" : String(v)).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim(), "one");
var multi = /* @__PURE__ */ __name((v) => (v == null ? "" : String(v)).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(), "multi");
var digits = /* @__PURE__ */ __name((v) => one(v).replace(/\D/g, ""), "digits");
var checked = /* @__PURE__ */ __name((v) => v === true || v === "on" || v === "si" || v === "true" || v === "1", "checked");
function normalizeUrl(v) {
  const s = one(v);
  if (!s) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : "https://" + s.replace(/^\/+/, "");
  try {
    const u = new URL(withScheme);
    if (!/^https?:$/.test(u.protocol) || !/\.[a-z]{2,}$/i.test(u.hostname) || u.username || u.password) return null;
    return u.href;
  } catch (e) {
    return null;
  }
}
__name(normalizeUrl, "normalizeUrl");
var SOCIAL = {
  instagram: { base: "https://www.instagram.com/", host: /(^|\.)instagram\.com$/i },
  facebook: { base: "https://www.facebook.com/", host: /(^|\.)(facebook|fb)\.com$/i },
  tiktok: { base: "https://www.tiktok.com/@", host: /(^|\.)tiktok\.com$/i },
  linkedin: { base: "https://www.linkedin.com/in/", host: /(^|\.)linkedin\.com$/i }
};
function socialUrl(network, v) {
  const s = one(v);
  if (!s) return "";
  const cfg = SOCIAL[network];
  if (/^https?:\/\//i.test(s) || s.includes("/")) {
    const u = normalizeUrl(s);
    if (!u) return null;
    return cfg.host.test(new URL(u).hostname) ? u : null;
  }
  const handle = s.replace(/^@/, "");
  if (!/^[A-Za-z0-9._-]{2,60}$/.test(handle)) return null;
  return cfg.base + handle + (network === "tiktok" ? "" : "/");
}
__name(socialUrl, "socialUrl");
var EMAIL_RE = /^[^\s@<>"'(),;:\\[\]]+@[^\s@<>"'(),;:\\[\]]+\.[A-Za-z]{2,}$/;
function normalize(raw) {
  const g = /* @__PURE__ */ __name((k) => raw[k], "g");
  return {
    name: one(g("name")),
    category: one(g("category")),
    categoryOther: one(g("categoryOther")),
    city: one(g("city")),
    province: one(g("province")),
    representative: one(g("representative")),
    title: one(g("title")),
    summary: multi(g("summary")),
    services: multi(g("services")),
    notes: multi(g("notes")),
    email: one(g("email")).toLowerCase(),
    phone: one(g("phone")),
    whatsapp: one(g("whatsapp")),
    website: one(g("website")),
    address: one(g("address")),
    instagram: one(g("instagram")),
    facebook: one(g("facebook")),
    tiktok: one(g("tiktok")),
    linkedin: one(g("linkedin")),
    imageKind: one(g("imageKind")),
    consentData: checked(g("consentData")),
    consentRights: checked(g("consentRights")),
    consentPublish: checked(g("consentPublish")),
    honey: one(g("company_website")),
    /* campo trampa (invisible) */
    idempotencyKey: one(g("idempotencyKey"))
  };
}
__name(normalize, "normalize");
function validate(input) {
  const d = Object.assign({}, input);
  const e = {};
  const need = /* @__PURE__ */ __name((k, msg) => {
    if (!d[k]) e[k] = msg;
  }, "need");
  const max = /* @__PURE__ */ __name((k, n) => {
    if (d[k] && d[k].length > n) e[k] = `M\xE1ximo ${n} caracteres.`;
  }, "max");
  need("name", "Escribe el nombre de la empresa o del profesional.");
  if (!CATEGORIES.some((c) => c.id === d.category)) e.category = "Elige una categor\xEDa.";
  if (d.category === "otra") need("categoryOther", "Indica a qu\xE9 se dedica tu negocio.");
  else d.categoryOther = "";
  need("city", "Escribe la ciudad.");
  if (!PROVINCES.includes(d.province)) e.province = "Elige la provincia o territorio.";
  need("representative", "Escribe el nombre del representante.");
  need("summary", "Escribe una rese\xF1a corta de tu negocio.");
  need("services", "Indica tus productos o servicios principales.");
  ["name", "city", "representative", "title"].forEach((k) => max(k, LIMITS.text));
  max("categoryOther", LIMITS.categoryOther);
  max("summary", LIMITS.summary);
  max("services", LIMITS.services);
  max("notes", LIMITS.notes);
  max("address", LIMITS.address);
  if (!EMAIL_RE.test(d.email) || d.email.length > 200) e.email = "Escribe un correo v\xE1lido: ah\xED recibir\xE1s la confirmaci\xF3n.";
  if (d.phone) {
    const n = digits(d.phone).length;
    if (n < 10 || n > 15) e.phone = "Escribe un tel\xE9fono v\xE1lido, ej. +1 403 555 1234.";
  }
  if (d.whatsapp) {
    const w = digits(d.whatsapp);
    if (w.length < 11 || w.length > 15) e.whatsapp = "Incluye el c\xF3digo de pa\xEDs (1 para Canad\xE1), ej. 1 403 555 1234.";
    else d.whatsapp = w;
  }
  if (d.website) {
    const u = normalizeUrl(d.website);
    if (!u || u.length > LIMITS.url) e.website = "Escribe un enlace v\xE1lido, ej. https://minegocio.ca";
    else d.website = u;
  }
  for (const k of Object.keys(SOCIAL)) {
    if (!d[k]) continue;
    const u = socialUrl(k, d[k]);
    if (!u || u.length > LIMITS.url) e[k] = `Escribe tu @usuario o el enlace de tu ${k === "linkedin" ? "LinkedIn" : k === "tiktok" ? "TikTok" : k[0].toUpperCase() + k.slice(1)}.`;
    else d[k] = u;
  }
  const publicContact = ["phone", "whatsapp", "website", "instagram", "facebook", "tiktok", "linkedin"].some((k) => d[k] && !e[k]);
  if (!publicContact && !["phone", "whatsapp", "website"].some((k) => e[k])) {
    e.contact = "Indica al menos un medio de contacto comercial publicable: tel\xE9fono, WhatsApp, p\xE1gina web o una red social.";
  }
  if (!IMAGE_KINDS[d.imageKind]) e.imageKind = "Indica si la imagen es una fotograf\xEDa o un logotipo.";
  if (!d.consentData) e.consentData = "Necesitamos tu autorizaci\xF3n para tratar estos datos.";
  if (!d.consentRights) e.consentRights = "Confirma que tienes derecho a usar la imagen.";
  if (!d.consentPublish) e.consentPublish = "Necesitamos tu autorizaci\xF3n para publicar la informaci\xF3n comercial.";
  if (d.idempotencyKey && !/^[A-Za-z0-9-]{16,64}$/.test(d.idempotencyKey)) e.idempotencyKey = "Solicitud no v\xE1lida.";
  return { data: d, errors: e };
}
__name(validate, "validate");
function inspectImage(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const u16be = /* @__PURE__ */ __name((i) => b[i] << 8 | b[i + 1], "u16be");
  const u32be = /* @__PURE__ */ __name((i) => (b[i] << 24 >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3], "u32be");
  const u24le = /* @__PURE__ */ __name((i) => b[i] | b[i + 1] << 8 | b[i + 2] << 16, "u24le");
  if (b.length < 32) return null;
  if (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) {
    return { type: "image/png", width: u32be(16), height: u32be(20) };
  }
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 255) {
        i++;
        continue;
      }
      const m = b[i + 1];
      if (m >= 192 && m <= 207 && ![196, 200, 204].includes(m)) return { type: "image/jpeg", width: u16be(i + 7), height: u16be(i + 5) };
      if (m === 216 || m === 1 || m >= 208 && m <= 215) {
        i += 2;
        continue;
      }
      i += 2 + u16be(i + 2);
    }
    return null;
  }
  if (b[0] === 82 && b[1] === 73 && b[2] === 70 && b[3] === 70 && b[8] === 87 && b[9] === 69 && b[10] === 66 && b[11] === 80) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8X") return { type: "image/webp", width: u24le(24) + 1, height: u24le(27) + 1 };
    if (chunk === "VP8 ") return { type: "image/webp", width: u16le(b, 26) & 16383, height: u16le(b, 28) & 16383 };
    if (chunk === "VP8L") {
      const bits = b[21] | b[22] << 8 | b[23] << 16 | b[24] << 24;
      return { type: "image/webp", width: (bits & 16383) + 1, height: (bits >> 14 & 16383) + 1 };
    }
  }
  return null;
}
__name(inspectImage, "inspectImage");
function u16le(b, i) {
  return b[i] | b[i + 1] << 8;
}
__name(u16le, "u16le");
function validateImage(bytes) {
  const size = bytes.byteLength;
  if (!size) return { ok: false, error: "Adjunta una fotograf\xEDa o un logotipo." };
  if (size > LIMITS.imageMaxBytes) return { ok: false, error: "La imagen pesa demasiado (m\xE1ximo 5 MB)." };
  const info = inspectImage(bytes);
  if (!info || !IMAGE_TYPES[info.type]) return { ok: false, error: "Formato no admitido: usa JPG, PNG o WebP." };
  if (Math.min(info.width, info.height) < LIMITS.imageMinSide) return { ok: false, error: `La imagen es muy peque\xF1a: m\xEDnimo ${LIMITS.imageMinSide} px por lado.` };
  if (Math.max(info.width, info.height) > LIMITS.imageMaxSide) return { ok: false, error: "La imagen es demasiado grande en p\xEDxeles." };
  return { ok: true, info: Object.assign({ size, ext: IMAGE_TYPES[info.type] }, info) };
}
__name(validateImage, "validateImage");
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newRequestId(now = /* @__PURE__ */ new Date(), randomBytes) {
  const r = randomBytes || crypto.getRandomValues(new Uint8Array(6));
  const tag = Array.from(r.slice(0, 6), (x) => ALPHABET[x % ALPHABET.length]).join("");
  const p = /* @__PURE__ */ __name((n) => String(n).padStart(2, "0"), "p");
  return `SOL-${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}-${tag}`;
}
__name(newRequestId, "newRequestId");
function categoryLabel(d) {
  if (d.category === "otra") return d.categoryOther ? `Otra: ${d.categoryOther}` : "Otra";
  return (CATEGORIES.find((c) => c.id === d.category) || {}).label || d.category;
}
__name(categoryLabel, "categoryLabel");

// _lib/correos.js
var BRAND = "El Podcast del Migrante";
var TAGLINE = "Conectando latinos, construyendo futuro";
var esc = /* @__PURE__ */ __name((t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), "esc");
var oneLine = /* @__PURE__ */ __name((t) => String(t == null ? "" : t).replace(/[\r\n\t]+/g, " ").trim(), "oneLine");
function layout(inner) {
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f2f1ed;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ed;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:4px solid #6f9a03;font-family:Arial,Helvetica,sans-serif;color:#0b0b0b;">
<tr><td style="padding:26px 28px 6px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#557902;font-weight:bold;">${BRAND}</td></tr>
${inner}
<tr><td style="padding:18px 28px 26px;border-top:1px solid #d9d9d6;font-size:12px;color:#5b5b5b;">${BRAND}<br>${TAGLINE}</td></tr>
</table></td></tr></table></body></html>`;
}
__name(layout, "layout");
function internalEmail(d, meta) {
  const rows = [
    ["N\xFAmero de solicitud", meta.id],
    ["Fecha de recepci\xF3n", meta.receivedLabel],
    ["Empresa o profesional", d.name],
    ["Categor\xEDa", categoryLabel(d)],
    ["Ciudad y provincia", `${d.city}, ${d.province}`],
    ["Representante", d.representative],
    ["Cargo o especialidad", d.title],
    ["Correo (privado)", d.email],
    ["Tel\xE9fono", d.phone],
    ["WhatsApp", d.whatsapp ? "+" + d.whatsapp : ""],
    ["P\xE1gina web", d.website],
    ["Direcci\xF3n comercial", d.address],
    ["Instagram", d.instagram],
    ["Facebook", d.facebook],
    ["TikTok", d.tiktok],
    ["LinkedIn", d.linkedin],
    ["Imagen", `${IMAGE_KINDS[d.imageKind]} (adjunta)`],
    ["Fotograf\xEDas adicionales", meta.extraCount ? meta.extraAttached === meta.extraCount ? `${meta.extraCount} (adjuntas)` : `${meta.extraCount} (${meta.extraAttached} adjuntas; el resto, en el panel)` : ""]
  ].filter(([, v]) => v);
  const blocks = [
    ["Rese\xF1a", d.summary],
    ["Productos o servicios principales", d.services],
    ["Informaci\xF3n adicional (privada)", d.notes]
  ].filter(([, v]) => v);
  const htmlRows = rows.map(([k, v]) => `<tr><td style="padding:7px 0;width:42%;vertical-align:top;font-size:13px;color:#5b5b5b;">${esc(k)}</td><td style="padding:7px 0;font-size:14px;font-weight:bold;">${esc(v)}</td></tr>`).join("");
  const panel = meta.panelUrl ? `${meta.panelUrl}/solicitudes?id=${encodeURIComponent(meta.id)}` : "";
  const html = layout(`
<tr><td style="padding:4px 28px 0;"><h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;">Nueva solicitud empresarial</h1>
<p style="margin:0 0 16px;font-size:14px;color:#2a2a2a;">Pendiente de revisi\xF3n. No se publica nada sin aprobaci\xF3n.</p></td></tr>
<tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d9d9d6;border-bottom:1px solid #d9d9d6;">${htmlRows}</table></td></tr>
${blocks.map(([k, v]) => `<tr><td style="padding:16px 28px 0;"><p style="margin:0 0 6px;font-size:13px;color:#5b5b5b;">${esc(k)}</p><p style="margin:0;font-size:14px;line-height:1.55;white-space:pre-line;">${esc(v)}</p></td></tr>`).join("")}
${panel ? `<tr><td style="padding:22px 28px 6px;"><a href="${esc(panel)}" style="display:inline-block;background:#0b0b0b;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;">Revisar en el panel</a></td></tr>` : ""}`);
  const text = [
    "Nueva solicitud empresarial (pendiente de revisi\xF3n)",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...blocks.flatMap(([k, v]) => ["", `${k}:`, v]),
    "",
    panel ? `Revisar en el panel: ${panel}` : ""
  ].join("\n");
  return {
    subject: oneLine(`Nueva solicitud empresarial \u2014 ${d.name} \u2014 ${meta.id}`).slice(0, 180),
    html,
    text
  };
}
__name(internalEmail, "internalEmail");
function confirmationEmail(meta) {
  const html = layout(`
<tr><td style="padding:4px 28px 0;"><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:24px;">Recibimos tu solicitud</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hemos recibido correctamente tu solicitud de Perfil Empresarial Premium en El Podcast del Migrante.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">N\xFAmero de solicitud: <strong>${esc(meta.id)}</strong></p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Nuestro equipo revisar\xE1 la informaci\xF3n y se comunicar\xE1 contigo para explicarte los siguientes pasos.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Enviar esta solicitud no implica contratar ni pagar ning\xFAn servicio.</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;"><strong>Tu perfil no ser\xE1 publicado sin tu aprobaci\xF3n.</strong></p></td></tr>`);
  const text = [
    "Recibimos tu solicitud",
    "",
    "Hemos recibido correctamente tu solicitud de Perfil Empresarial Premium en El Podcast del Migrante.",
    "",
    `N\xFAmero de solicitud: ${meta.id}`,
    "",
    "Nuestro equipo revisar\xE1 la informaci\xF3n y se comunicar\xE1 contigo para explicarte los siguientes pasos.",
    "",
    "Enviar esta solicitud no implica contratar ni pagar ning\xFAn servicio.",
    "",
    "Tu perfil no ser\xE1 publicado sin tu aprobaci\xF3n.",
    "",
    BRAND,
    TAGLINE
  ].join("\n");
  return { subject: "Recibimos tu solicitud \u2014 El Podcast del Migrante", html, text };
}
__name(confirmationEmail, "confirmationEmail");
async function sendEmail(env, message, idempotencyKey) {
  const res = await fetch(env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(message)
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
  return true;
}
__name(sendEmail, "sendEmail");
function toBase64(bytes) {
  let s = "";
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
  return btoa(s);
}
__name(toBase64, "toBase64");

// _lib/historial.js
async function recordEvent(db, event) {
  try {
    await db.prepare("INSERT INTO application_events (application_id, at, actor, action, from_status, to_status, detail) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(event.id, event.at || (/* @__PURE__ */ new Date()).toISOString(), event.actor, event.action, event.from || null, event.to || null, event.detail || null).run();
    return true;
  } catch (e) {
    console.error("Historial no registrado", event.id, event.action, e && e.message);
    return false;
  }
}
__name(recordEvent, "recordEvent");

// registro/enviar.js
var CONSENT_VERSION = "directorio-2026-10-v3";
var MAX_BODY = (1 + LIMITS.extraImagesMax) * LIMITS.imageMaxBytes + 512 * 1024;
var MAX_ATTACH_BYTES = 12 * 1024 * 1024;
var LIMIT_PER_IP_HOUR = 5;
var LIMIT_PER_EMAIL_DAY = 3;
async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
var DEFAULT_TURNSTILE_HOSTNAMES = ["podcastdelmigrante.com", "www.podcastdelmigrante.com"];
function allowedTurnstileHostnames(env) {
  const list = String(env && env.TURNSTILE_HOSTNAMES || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  return list.length ? list : DEFAULT_TURNSTILE_HOSTNAMES;
}
__name(allowedTurnstileHostnames, "allowedTurnstileHostnames");
async function verifyTurnstile(env, token, ip) {
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set("remoteip", ip);
  let res;
  try {
    res = await fetch(env.TURNSTILE_VERIFY_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  } catch (e) {
    console.error("Turnstile no respondi\xF3:", e && e.message);
    return null;
  }
  if (!res.ok) {
    console.error("Turnstile respondi\xF3", res.status);
    return null;
  }
  const out = await res.json().catch(() => ({}));
  if (out.success !== true) return false;
  const host = String(out.hostname || "").toLowerCase();
  if (!allowedTurnstileHostnames(env).includes(host)) {
    console.warn("Turnstile: token emitido para un dominio no permitido:", host || "(sin dominio)");
    return false;
  }
  return true;
}
__name(verifyTurnstile, "verifyTurnstile");
function receivedLabel(date) {
  try {
    return new Intl.DateTimeFormat("es-CA", { dateStyle: "long", timeStyle: "short", timeZone: "America/Edmonton" }).format(date) + " (hora de Alberta)";
  } catch (e) {
    return date.toISOString();
  }
}
__name(receivedLabel, "receivedLabel");
async function onRequestPost(context) {
  try {
    return await handlePost(context);
  } catch (e) {
    console.error("Error inesperado en /registro/enviar:", e && e.message);
    return jsonResponse({ ok: false, error: "No pudimos registrar tu solicitud. Tus datos siguen en el formulario: int\xE9ntalo de nuevo en unos minutos." }, 500);
  }
}
__name(onRequestPost, "onRequestPost");
async function handlePost(context) {
  const { request, env } = context;
  const status = registrationStatus(env);
  if (!status.open) {
    console.warn(closedReason(status));
    return jsonResponse({ ok: false, error: "El registro no est\xE1 disponible en este momento. Int\xE9ntalo m\xE1s tarde." }, 503);
  }
  const ctype = request.headers.get("Content-Type") || "";
  if (!ctype.startsWith("multipart/form-data")) return jsonResponse({ ok: false, error: "Solicitud no v\xE1lida." }, 415);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY) return jsonResponse({ ok: false, error: "Las im\xE1genes pesan demasiado (m\xE1ximo 5 MB cada una)." }, 413);
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Solicitud no v\xE1lida." }, 400);
  }
  const raw = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") raw[k] = v;
  const { data, errors } = validate(normalize(raw));
  const file = form.get("image");
  let image = null;
  if (!file || typeof file === "string") {
    errors.image = "Adjunta una fotograf\xEDa o un logotipo.";
  } else {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = validateImage(bytes);
    if (!check.ok) errors.image = check.error;
    else image = Object.assign({ bytes }, check.info);
  }
  const extraFiles = form.getAll("extraImages").filter((f) => f && typeof f !== "string" && f.size > 0);
  const extras = [];
  if (extraFiles.length > LIMITS.extraImagesMax) {
    errors.extraImages = `Puedes enviar como m\xE1ximo ${LIMITS.extraImagesMax} fotograf\xEDas adicionales.`;
  } else {
    for (const f of extraFiles) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const check = validateImage(bytes);
      if (!check.ok) {
        errors.extraImages = "Fotograf\xEDa adicional: " + check.error.charAt(0).toLowerCase() + check.error.slice(1);
        break;
      }
      extras.push(Object.assign({ bytes }, check.info));
    }
  }
  if (Object.keys(errors).length) return jsonResponse({ ok: false, error: "Revisa los campos marcados.", errors }, 400);
  if (data.honey) return jsonResponse({ ok: false, error: "No pudimos procesar la solicitud." }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const human = await verifyTurnstile(env, raw["cf-turnstile-response"], ip);
  if (human === null) {
    return jsonResponse({ ok: false, error: "No pudimos completar la verificaci\xF3n en este momento. Tus datos siguen en el formulario: int\xE9ntalo de nuevo en unos minutos." }, 503);
  }
  if (!human) {
    return jsonResponse({ ok: false, error: "No pudimos verificar que no eres un robot. Recarga la p\xE1gina e int\xE9ntalo de nuevo." }, 403);
  }
  const db = env.DIRECTORIO_DB;
  const now = /* @__PURE__ */ new Date();
  const nowIso = now.toISOString();
  const ipHash = ip ? await sha256(env.IP_HASH_SALT + "|" + ip) : null;
  const idemKey = data.idempotencyKey || (await sha256(`${data.email}|${data.name}|${nowIso.slice(0, 13)}`)).slice(0, 40);
  const prev = await db.prepare("SELECT id FROM business_applications WHERE idempotency_key = ?").bind(idemKey).first();
  if (prev) return jsonResponse({ ok: true, requestId: prev.id, duplicate: true });
  const open = await db.prepare("SELECT id FROM business_applications WHERE email = ? AND lower(name) = lower(?) AND status IN ('pendiente','en_revision') ORDER BY created_at DESC LIMIT 1").bind(data.email, data.name).first();
  if (open) return jsonResponse({ ok: true, requestId: open.id, duplicate: true });
  const hourAgo = new Date(now.getTime() - 36e5).toISOString();
  const dayAgo = new Date(now.getTime() - 864e5).toISOString();
  if (ipHash) {
    const r = await db.prepare("SELECT COUNT(*) AS n FROM business_applications WHERE ip_hash = ? AND created_at > ?").bind(ipHash, hourAgo).first();
    if (r && r.n >= LIMIT_PER_IP_HOUR) return jsonResponse({ ok: false, error: "Recibimos varias solicitudes desde tu conexi\xF3n. Int\xE9ntalo de nuevo m\xE1s tarde." }, 429);
  }
  const r2 = await db.prepare("SELECT COUNT(*) AS n FROM business_applications WHERE email = ? AND created_at > ?").bind(data.email, dayAgo).first();
  if (r2 && r2.n >= LIMIT_PER_EMAIL_DAY) return jsonResponse({ ok: false, error: "Ya recibimos varias solicitudes con este correo hoy. Te contactaremos pronto." }, 429);
  let id = "";
  for (let attempt = 0; attempt < 3 && !id; attempt++) {
    const candidate = newRequestId(now);
    const exists = await db.prepare("SELECT 1 FROM business_applications WHERE id = ?").bind(candidate).first();
    if (!exists) id = candidate;
  }
  if (!id) return jsonResponse({ ok: false, error: "No pudimos registrar la solicitud. Int\xE9ntalo de nuevo." }, 500);
  const imageKey = `solicitudes/${id}/imagen.${image.ext}`;
  const extraMeta = extras.map((x, i) => ({ key: `solicitudes/${id}/adicional-${i + 1}.${x.ext}`, type: x.type, bytes: x.size, width: x.width, height: x.height }));
  const uploaded = [];
  try {
    await env.SOLICITUDES.put(imageKey, image.bytes, {
      httpMetadata: { contentType: image.type },
      customMetadata: { solicitud: id, tipo: data.imageKind }
    });
    uploaded.push(imageKey);
    for (let i = 0; i < extras.length; i++) {
      await env.SOLICITUDES.put(extraMeta[i].key, extras[i].bytes, {
        httpMetadata: { contentType: extras[i].type },
        customMetadata: { solicitud: id, tipo: "adicional" }
      });
      uploaded.push(extraMeta[i].key);
    }
    await db.prepare(
      `INSERT INTO business_applications (id, idempotency_key, created_at, updated_at, status, name, category, category_other, city, province,
          representative, title, summary, email, phone, whatsapp, website, address, instagram, facebook, tiktok, linkedin,
          image_kind, image_key, image_type, image_bytes, image_width, image_height, consent_version, consent_at, ip_hash,
          services, notes, extra_images)
         VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      idemKey,
      nowIso,
      nowIso,
      data.name,
      data.category,
      data.categoryOther || null,
      data.city,
      data.province,
      data.representative,
      data.title || null,
      data.summary,
      data.email,
      data.phone || null,
      data.whatsapp || null,
      data.website || null,
      data.address || null,
      data.instagram || null,
      data.facebook || null,
      data.tiktok || null,
      data.linkedin || null,
      data.imageKind,
      imageKey,
      image.type,
      image.size,
      image.width,
      image.height,
      CONSENT_VERSION,
      nowIso,
      ipHash,
      data.services,
      data.notes || null,
      extraMeta.length ? JSON.stringify(extraMeta) : null
    ).run();
  } catch (e) {
    console.error("No se pudo guardar la solicitud", id, e && e.message);
    for (const key of uploaded) await env.SOLICITUDES.delete(key).catch(() => {
    });
    return jsonResponse({ ok: false, error: "No pudimos registrar la solicitud. Int\xE9ntalo de nuevo en unos minutos." }, 500);
  }
  await recordEvent(db, { id, at: nowIso, actor: "formulario", action: "recibida", to: "pendiente", detail: `Consentimientos ${CONSENT_VERSION} \xB7 ${data.imageKind}${extras.length ? ` + ${extras.length} fotograf\xEDa(s) adicional(es)` : ""}` });
  const meta = { id, receivedLabel: receivedLabel(now), panelUrl: (env.PANEL_URL || "").replace(/\/+$/, "") };
  const work = sendNotifications(env, data, image, meta, extras);
  if (context.waitUntil) context.waitUntil(work);
  else await work;
  return jsonResponse({ ok: true, requestId: id }, 201);
}
__name(handlePost, "handlePost");
async function sendNotifications(env, data, image, meta, extras = []) {
  const db = env.DIRECTORIO_DB;
  const errors = [];
  const attachments = [{ filename: `${meta.id}-${data.imageKind}.${image.ext}`, content: toBase64(image.bytes) }];
  let attached = image.size;
  extras.forEach((x, i) => {
    if (attached + x.size > MAX_ATTACH_BYTES) return;
    attached += x.size;
    attachments.push({ filename: `${meta.id}-adicional-${i + 1}.${x.ext}`, content: toBase64(x.bytes) });
  });
  const internal = internalEmail(data, Object.assign({ extraCount: extras.length, extraAttached: attachments.length - 1 }, meta));
  let internalStatus = "enviado";
  try {
    await sendEmail(env, {
      from: env.MAIL_FROM,
      to: [env.MAIL_INTERNAL_TO],
      reply_to: data.email,
      subject: internal.subject,
      html: internal.html,
      text: internal.text,
      attachments
    }, `${meta.id}-interno`);
  } catch (e) {
    internalStatus = "error";
    errors.push("interno: " + e.message);
  }
  const conf = confirmationEmail(meta);
  let confStatus = "enviado";
  try {
    await sendEmail(env, {
      from: env.MAIL_FROM,
      to: [data.email],
      reply_to: env.MAIL_REPLY_TO || env.MAIL_INTERNAL_TO,
      subject: conf.subject,
      html: conf.html,
      text: conf.text
    }, `${meta.id}-confirmacion`);
  } catch (e) {
    confStatus = "error";
    errors.push("confirmaci\xF3n: " + e.message);
  }
  try {
    await db.prepare("UPDATE business_applications SET internal_email_status = ?, confirmation_email_status = ?, email_error = ?, updated_at = ? WHERE id = ?").bind(internalStatus, confStatus, errors.length ? errors.join(" | ").slice(0, 500) : null, (/* @__PURE__ */ new Date()).toISOString(), meta.id).run();
  } catch (e) {
    console.error("No se pudo registrar el estado de los correos", meta.id, e && e.message);
  }
  await recordEvent(db, { id: meta.id, actor: "sistema", action: "correos", detail: `Aviso interno: ${internalStatus} \xB7 Confirmaci\xF3n: ${confStatus}` });
  if (errors.length) console.error("Correos de", meta.id, errors.join(" | "));
}
__name(sendNotifications, "sendNotifications");

// _lib/published-articles.js
var PUBLISHED_ARTICLES = /* @__PURE__ */ new Set([
  "referendum-alberta-octubre-2026-inmigrantes",
  "express-entry-nuevos-puntos-noviembre-2026",
  "express-entry-anuncio-cambios-octubre-2026",
  "reglas-invierno-electricidad-gas-alberta",
  "diana-cardona-emprendimiento-digital-canada",
  "working-holiday-2026-cierre-invitaciones-canada",
  "reembolso-bombas-de-calor-canada",
  "alberta-energy-rebate-plazo-octubre",
  "subvenciones-etnoculturales-antirracismo-alberta",
  "premios-impacto-inmigrante-alberta-2026",
  "rocky-ridge-athletic-park-calgary",
  "medico-familia-latino-brooks-alberta",
  "el-frio-no-pudo-apagar-mi-senal",
  "carney-aumento-controlado-inmigracion-canada",
  "alberta-suspende-impuesto-gasolina-octubre-2026",
  "nueva-via-jbs-brooks-highway-873",
  "trabajadores-estudiar-sin-study-permit-canada",
  "canada-limite-cargos-nsf-10-dolares",
  "immigrant-bridging-program-alberta",
  "ayuda-pagar-arriendo-alberta",
  "plan-dental-canada-cdcp",
  "servicios-gratuitos-trabajadores-temporales-alberta",
  "el-error-financiero-inmigrantes-canada",
  "100-empresarios-100-historias-calgary",
  "primer-arriendo-alberta",
  "certificaciones-trabajo-alberta",
  "llegar-canada-documentos-primer-dia",
  "documentos-tramite-migratorio-alberta"
]);

// _middleware.js
var TEMPLATE_PATHS = /* @__PURE__ */ new Set(["/articulo", "/articulo.html", "/articulo/"]);
var INTERNAL_PATH = /^\/(?:admin-worker|db|docs|tests|scripts|functions|\.github)(?:\/|$)/;
async function onRequest(context) {
  const url = new URL(context.request.url);
  if (INTERNAL_PATH.test(url.pathname)) {
    return new Response("No encontrado", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }
    });
  }
  const slug = url.searchParams.get("slug");
  const method = context.request.method;
  if (!TEMPLATE_PATHS.has(url.pathname) || !slug || !PUBLISHED_ARTICLES.has(slug) || method !== "GET" && method !== "HEAD") {
    return context.next();
  }
  const target = new URL("/articulo-" + slug, url.origin);
  url.searchParams.delete("slug");
  target.search = url.searchParams.toString();
  return new Response(null, {
    status: 301,
    headers: {
      Location: target.pathname + target.search,
      "Cache-Control": "public, max-age=3600"
    }
  });
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-LG9SGR/functionsRoutes-0.8952865928254883.mjs
var routes = [
  {
    routePath: "/registro/config",
    mountPath: "/registro",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/registro/enviar",
    mountPath: "/registro",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];

// ../../../../tmp/claude-0/-home-user/86bd38a2-b310-542f-b99c-21ab2ae4b64e/scratchpad/wr/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../tmp/claude-0/-home-user/86bd38a2-b310-542f-b99c-21ab2ae4b64e/scratchpad/wr/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../tmp/claude-0/-home-user/86bd38a2-b310-542f-b99c-21ab2ae4b64e/scratchpad/wr/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../tmp/claude-0/-home-user/86bd38a2-b310-542f-b99c-21ab2ae4b64e/scratchpad/wr/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-QRpMqQ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../tmp/claude-0/-home-user/86bd38a2-b310-542f-b99c-21ab2ae4b64e/scratchpad/wr/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-QRpMqQ/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.22875749276708945.mjs.map
