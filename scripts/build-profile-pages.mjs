#!/usr/bin/env node
/*
  build-profile-pages.mjs — Una página estática por Perfil Empresarial
  ======================================================================
  Por qué existe: WhatsApp, Facebook, iMessage (iPhone), LinkedIn, X...
  leen las vistas previas del HTML tal como llega del servidor: no
  ejecutan JavaScript y GitHub Pages entrega el mismo archivo para
  cualquier ?slug=. Por eso business-profile.html?slug=... no puede tener
  una vista previa distinta para cada profesional.

  Este script lee js/businesses.js y, para cada perfil publicado, escribe
  perfil-<slug>.html: una copia de business-profile.html con el <title>,
  la descripción, la URL canónica y las etiquetas og:/twitter: de ESE
  profesional ya escritas en el HTML. El cuerpo y el diseño son los de la
  plantilla (lo arma js/business-profile.js igual que siempre).

  También escribe vcard/<slug>.vcf (tarjeta de contacto que abre el QR
  "Guarda mi contacto") para los perfiles con connect.contactCard. Sus
  datos salen del mismo registro (nombre, cargo, empresa, teléfono,
  email, sitio web, dirección): si cambian, se regenera aquí. Los QR en
  imagen se generan aparte con scripts/build-qr-images.py.

  USO (sin dependencias, Node 18+):
    node scripts/build-profile-pages.mjs           genera / actualiza
    node scripts/build-profile-pages.mjs --check   solo verifica (CI)

  Cada vez que se agrega o edita un perfil en js/businesses.js, o cambia
  business-profile.html, hay que volver a ejecutarlo y subir los
  perfil-*.html y vcard/*.vcf resultantes. El workflow de GitHub "Perfiles: vistas
  previas" falla si alguien lo olvida.
========================================================================= */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ORIGIN = "https://podcastdelmigrante.com";
const DEFAULT_IMAGE = "assets/logo.png";
const GENERATED_MARK = "<!-- Generado por scripts/build-profile-pages.mjs a partir de js/businesses.js. No editar a mano. -->";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHECK = process.argv.includes("--check");

function loadBusinesses() {
  const code = readFileSync(join(ROOT, "js/businesses.js"), "utf8");
  const ctx = vm.createContext({});
  vm.runInContext(code + "\n;globalThis.__BUSINESSES = BUSINESSES;", ctx);
  return ctx.__BUSINESSES;
}

function escAttr(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toAbsolute(src) {
  return /^https?:\/\//.test(src) ? src : SITE_ORIGIN + "/" + src.replace(/^\//, "");
}

/* Ancho y alto de un JPEG o PNG local (para og:image:width/height, que
   permite a Facebook y WhatsApp mostrar la imagen desde el primer envío). */
function imageSize(src) {
  if (/^https?:\/\//.test(src)) return null;
  const file = join(ROOT, src.replace(/^\//, ""));
  if (!existsSync(file)) throw new Error(`No existe la imagen ${src}`);
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/* Mismas reglas que setSEO() en js/business-profile.js */
function seoFor(b) {
  const image = b.ogImage || b.profileImage || b.coverImage || DEFAULT_IMAGE;
  return {
    title: (b.seo && b.seo.title) || b.name + " | El Podcast del Migrante",
    description: (b.seo && b.seo.description) || b.shortDescription || "",
    url: SITE_ORIGIN + "/perfil-" + b.slug + ".html",
    image: toAbsolute(image),
    imageSize: imageSize(image),
    imageAlt: b.name,
  };
}

/* Reemplaza el valor de un atributo en la etiqueta con ese id (exactamente una). */
function setById(html, id, attr, value) {
  const re = new RegExp(`(<[^>]*\\bid="${id}"[^>]*\\b${attr}=")[^"]*(")`, "g");
  const matches = html.match(re) || [];
  if (matches.length !== 1) throw new Error(`business-profile.html: se esperaba una etiqueta id="${id}" con ${attr}=, hay ${matches.length}`);
  return html.replace(re, (_, a, b) => a + escAttr(value) + b);
}

function buildPage(template, b) {
  const seo = seoFor(b);
  let html = template;
  html = html.replace(/<html\b([^>]*)>/, (m, attrs) => `<html${attrs} data-profile-slug="${escAttr(b.slug)}">`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(seo.title)}</title>`);
  html = setById(html, "metaDescription", "content", seo.description);
  html = setById(html, "canonicalLink", "href", seo.url);
  html = setById(html, "ogType", "content", "profile");
  html = setById(html, "ogTitle", "content", seo.title);
  html = setById(html, "ogDescription", "content", seo.description);
  html = setById(html, "ogUrl", "content", seo.url);
  html = setById(html, "ogImage", "content", seo.image);
  html = setById(html, "ogImageAlt", "content", seo.imageAlt);
  html = setById(html, "twitterTitle", "content", seo.title);
  html = setById(html, "twitterDescription", "content", seo.description);
  html = setById(html, "twitterImage", "content", seo.image);
  if (seo.imageSize) {
    html = html.replace(
      /(<meta id="ogImage"[^>]*>)/,
      `$1\n<meta property="og:image:width" content="${seo.imageSize.width}">\n<meta property="og:image:height" content="${seo.imageSize.height}">`
    );
  }
  return html.replace("<head>", "<head>\n" + GENERATED_MARK);
}

/* ---------- vCard 3.0 (la versión que mejor leen iPhone y Android) ---------- */
const VCARD_MARK = "PRODID:-//El Podcast del Migrante//build-profile-pages//ES";

function vEsc(t) {
  return String(t).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/* Líneas de máximo 75 bytes (RFC 2426), sin partir caracteres UTF-8 */
function vFold(line) {
  const out = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function buildVcard(b) {
  const card = b.connect.contactCard;
  if (!card.givenName || !card.familyName) throw new Error(`${b.id}: connect.contactCard necesita givenName y familyName`);
  const tel = (b.phone || "").replace(/[^\d+]/g, "");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    VCARD_MARK,
    `N:${vEsc(card.familyName)};${vEsc(card.givenName)};${vEsc(card.middleName || "")};;`,
    `FN:${vEsc(b.name)}`,
    b.company && `ORG:${vEsc(b.company)}`,
    b.professionalTitle && `TITLE:${vEsc(b.professionalTitle)}`,
    tel && `TEL;TYPE=WORK,VOICE:${tel}`,
    b.email && `EMAIL;TYPE=INTERNET,WORK:${b.email}`,
    b.website && `URL:${b.website}`,
    /* Sin dirección pública (ej. atención con cita) solo van ciudad,
       provincia y país, si están en el registro */
    (b.address || b.city) && `ADR;TYPE=WORK:;;${[b.address, b.city, b.province, b.postalCode, b.country].map((v) => vEsc(v || "")).join(";")}`,
    "END:VCARD",
  ].filter(Boolean);
  return lines.map(vFold).join("\r\n") + "\r\n";
}

const template = readFileSync(join(ROOT, "business-profile.html"), "utf8");
const published = loadBusinesses().filter((b) => b.published);
const expected = new Map();
for (const b of published) {
  if (!SLUG_RE.test(b.slug || "")) throw new Error(`Slug no válido para ${b.id}: "${b.slug}" (solo minúsculas, números y guiones)`);
  if (expected.has(`perfil-${b.slug}.html`)) throw new Error(`Slug duplicado: ${b.slug}`);
  expected.set(`perfil-${b.slug}.html`, buildPage(template, b));
  if (b.connect && b.connect.contactCard) expected.set(`vcard/${b.slug}.vcf`, buildVcard(b));
}

/* Archivos generados que ya no corresponden a un perfil publicado */
const stale = readdirSync(ROOT)
  .filter((f) => /^perfil-.+\.html$/.test(f) && !expected.has(f) && readFileSync(join(ROOT, f), "utf8").includes(GENERATED_MARK))
  .concat(
    existsSync(join(ROOT, "vcard"))
      ? readdirSync(join(ROOT, "vcard"))
          .map((f) => `vcard/${f}`)
          .filter((f) => f.endsWith(".vcf") && !expected.has(f) && readFileSync(join(ROOT, f), "utf8").includes(VCARD_MARK))
      : []
  );

const problems = [];
for (const [file, html] of expected) {
  const path = join(ROOT, file);
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === html) continue;
  if (CHECK) problems.push(current === null ? `falta ${file}` : `${file} está desactualizado`);
  else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, html); console.log(`escrito  ${file}`); }
}
for (const file of stale) {
  if (CHECK) problems.push(`${file} ya no corresponde a un perfil publicado`);
  else { unlinkSync(join(ROOT, file)); console.log(`borrado  ${file}`); }
}

if (CHECK && problems.length) {
  console.error("Las páginas de perfiles no están al día:\n  - " + problems.join("\n  - "));
  console.error("Ejecuta: node scripts/build-profile-pages.mjs  y sube los cambios.");
  process.exit(1);
}
console.log(`${expected.size} archivo(s) de perfiles ${CHECK ? "verificados" : "al día"}.`);
