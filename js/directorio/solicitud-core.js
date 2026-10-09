/*
  solicitud-core.js — Reglas ÚNICAS de la solicitud de Perfil Empresarial
  ======================================================================
  Módulo ES compartido por:
    - el navegador  (js/directorio/solicitud-form.js, registra-tu-empresa.html)
    - el servidor   (functions/registro/enviar.js, Cloudflare Pages Function)
  Así el formulario y el servidor validan exactamente igual. El servidor
  SIEMPRE vuelve a validar: lo que diga el navegador no es de fiar.

  No contiene claves ni datos privados (este archivo es público).
========================================================================= */

/* Categorías del directorio (mismos id que BUSINESS_CATEGORIES en
   js/businesses.js; una prueba verifica que coincidan) + "otra". */
export const CATEGORIES = [
  { id: "automoviles", label: "Automóviles" },
  { id: "seguros-finanzas", label: "Seguros y protección financiera" },
  { id: "vivienda", label: "Vivienda" },
  { id: "empleo", label: "Empleo" },
  { id: "salud", label: "Salud" },
  { id: "servicios-hogar", label: "Servicios del hogar" },
  { id: "otra", label: "Otra categoría" },
];

export const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
  "Northwest Territories", "Nunavut", "Yukon",
];

export const LIMITS = {
  text: 120,          /* nombres, ciudad, cargo */
  categoryOther: 80,
  summary: 300,       /* reseña corta */
  url: 300,
  address: 200,
  imageMaxBytes: 5 * 1024 * 1024,   /* lo que acepta el servidor */
  imageMinSide: 300,                 /* px */
  imageMaxSide: 8000,
};

export const IMAGE_KINDS = { foto: "Fotografía del profesional", logo: "Logotipo de la empresa" };
export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/* ---------- Normalización ---------- */
const one = (v) => (v == null ? "" : String(v)).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
const multi = (v) => (v == null ? "" : String(v)).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
const digits = (v) => one(v).replace(/\D/g, "");
const checked = (v) => v === true || v === "on" || v === "si" || v === "true" || v === "1";

export function normalizeUrl(v) {
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

const SOCIAL = {
  instagram: { base: "https://www.instagram.com/", host: /(^|\.)instagram\.com$/i },
  facebook: { base: "https://www.facebook.com/", host: /(^|\.)(facebook|fb)\.com$/i },
  tiktok: { base: "https://www.tiktok.com/@", host: /(^|\.)tiktok\.com$/i },
  linkedin: { base: "https://www.linkedin.com/in/", host: /(^|\.)linkedin\.com$/i },
};

/* Acepta enlace completo o @usuario; el enlace debe ser de la red correcta */
export function socialUrl(network, v) {
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

export const EMAIL_RE = /^[^\s@<>"'(),;:\\[\]]+@[^\s@<>"'(),;:\\[\]]+\.[A-Za-z]{2,}$/;

/* Objeto plano (FormData → objeto) → datos limpios */
export function normalize(raw) {
  const g = (k) => raw[k];
  return {
    name: one(g("name")),
    category: one(g("category")),
    categoryOther: one(g("categoryOther")),
    city: one(g("city")),
    province: one(g("province")),
    representative: one(g("representative")),
    title: one(g("title")),
    summary: multi(g("summary")),
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
    honey: one(g("company_website")),        /* campo trampa (invisible) */
    idempotencyKey: one(g("idempotencyKey")),
  };
}

/* Valida datos normalizados. Devuelve { data, errors } con los enlaces y
   teléfonos ya en su forma final. */
export function validate(input) {
  const d = Object.assign({}, input);
  const e = {};
  const need = (k, msg) => { if (!d[k]) e[k] = msg; };
  const max = (k, n) => { if (d[k] && d[k].length > n) e[k] = `Máximo ${n} caracteres.`; };

  need("name", "Escribe el nombre de la empresa o del profesional.");
  if (!CATEGORIES.some((c) => c.id === d.category)) e.category = "Elige una categoría.";
  if (d.category === "otra") need("categoryOther", "Indica a qué se dedica tu negocio.");
  else d.categoryOther = "";
  need("city", "Escribe la ciudad.");
  if (!PROVINCES.includes(d.province)) e.province = "Elige la provincia o territorio.";
  need("representative", "Escribe el nombre del representante.");
  need("summary", "Escribe una reseña corta de tu negocio.");
  ["name", "city", "representative", "title"].forEach((k) => max(k, LIMITS.text));
  max("categoryOther", LIMITS.categoryOther);
  max("summary", LIMITS.summary);
  max("address", LIMITS.address);

  if (!EMAIL_RE.test(d.email) || d.email.length > 200) e.email = "Escribe un correo válido: ahí recibirás la confirmación.";

  if (d.phone) {
    const n = digits(d.phone).length;
    if (n < 10 || n > 15) e.phone = "Escribe un teléfono válido, ej. +1 403 555 1234.";
  }
  if (d.whatsapp) {
    const w = digits(d.whatsapp);
    if (w.length < 11 || w.length > 15) e.whatsapp = "Incluye el código de país (1 para Canadá), ej. 1 403 555 1234.";
    else d.whatsapp = w;
  }
  if (d.website) {
    const u = normalizeUrl(d.website);
    if (!u || u.length > LIMITS.url) e.website = "Escribe un enlace válido, ej. https://minegocio.ca";
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
    e.contact = "Indica al menos un medio de contacto comercial publicable: teléfono, WhatsApp, página web o una red social.";
  }

  if (!IMAGE_KINDS[d.imageKind]) e.imageKind = "Indica si la imagen es una fotografía o un logotipo.";
  if (!d.consentData) e.consentData = "Necesitamos tu autorización para tratar estos datos.";
  if (!d.consentRights) e.consentRights = "Confirma que tienes derecho a usar la imagen.";
  if (!d.consentPublish) e.consentPublish = "Necesitamos tu autorización para publicar la información comercial.";
  if (d.idempotencyKey && !/^[A-Za-z0-9-]{16,64}$/.test(d.idempotencyKey)) e.idempotencyKey = "Solicitud no válida.";
  return { data: d, errors: e };
}

/* ---------- Imagen: tipo REAL por su contenido (no por el nombre) ---------- */
export function inspectImage(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const u16be = (i) => (b[i] << 8) | b[i + 1];
  const u32be = (i) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  const u24le = (i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  if (b.length < 32) return null;
  /* PNG */
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { type: "image/png", width: u32be(16), height: u32be(20) };
  }
  /* JPEG */
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { type: "image/jpeg", width: u16be(i + 7), height: u16be(i + 5) };
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      i += 2 + u16be(i + 2);
    }
    return null;
  }
  /* WebP (RIFF....WEBP) */
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8X") return { type: "image/webp", width: u24le(24) + 1, height: u24le(27) + 1 };
    if (chunk === "VP8 ") return { type: "image/webp", width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { type: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}
function u16le(b, i) {
  return b[i] | (b[i + 1] << 8);
}

/* Valida la imagen subida. Devuelve { ok, info } o { ok:false, error } */
export function validateImage(bytes) {
  const size = bytes.byteLength;
  if (!size) return { ok: false, error: "Adjunta una fotografía o un logotipo." };
  if (size > LIMITS.imageMaxBytes) return { ok: false, error: "La imagen pesa demasiado (máximo 5 MB)." };
  const info = inspectImage(bytes);
  if (!info || !IMAGE_TYPES[info.type]) return { ok: false, error: "Formato no admitido: usa JPG, PNG o WebP." };
  if (Math.min(info.width, info.height) < LIMITS.imageMinSide) return { ok: false, error: `La imagen es muy pequeña: mínimo ${LIMITS.imageMinSide} px por lado.` };
  if (Math.max(info.width, info.height) > LIMITS.imageMaxSide) return { ok: false, error: "La imagen es demasiado grande en píxeles." };
  return { ok: true, info: Object.assign({ size, ext: IMAGE_TYPES[info.type] }, info) };
}

/* ---------- Identificador de solicitud ---------- */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   /* sin 0/O/1/I */
export function newRequestId(now = new Date(), randomBytes) {
  const r = randomBytes || crypto.getRandomValues(new Uint8Array(6));
  const tag = Array.from(r.slice(0, 6), (x) => ALPHABET[x % ALPHABET.length]).join("");
  const p = (n) => String(n).padStart(2, "0");
  return `SOL-${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}-${tag}`;
}
export const REQUEST_ID_RE = /^SOL-\d{8}-[A-Z2-9]{6}$/;

export function categoryLabel(d) {
  if (d.category === "otra") return d.categoryOther ? `Otra: ${d.categoryOther}` : "Otra";
  return (CATEGORIES.find((c) => c.id === d.category) || {}).label || d.category;
}
