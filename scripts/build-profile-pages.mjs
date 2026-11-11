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
  profesional ya escritas en el HTML. Además escribe en el HTML:
    - el CONTENIDO del perfil (nombre, descripción, ciudad, servicios,
      contactos...), generado con la misma función que usa el navegador
      (js/business-profile.js → contentHtml): se lee sin JavaScript y el
      diseño no cambia. El navegador solo activa botones, video y medición.
    - sus datos estructurados (JSON-LD, schema.org) con
      js/business-profile.js → structuredData: solo datos del registro.
  También actualiza:
    - quien-puede-ayudarte.html: las tarjetas de TODO el directorio (fichas
      Premium y gratuitas publicadas) y su JSON-LD (CollectionPage +
      ItemList), con js/business-directory.js → allCardsHtml.
    - sitemap.xml: el bloque «directorio-empresarial» (directorio y cada
      miniweb publicada, con la fecha real updatedAt de su registro).
  Las URL canónicas son las direcciones limpias /perfil-<slug> y
  /quien-puede-ayudarte (Cloudflare Pages redirige las que terminan en .html).

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

/* Carga los mismos scripts que el navegador (datos, portada de video,
   perfil y directorio) en un contexto aislado: así el HTML generado es
   idéntico al que dibuja la página. */
function loadRuntime() {
  const ctx = vm.createContext({ document: { addEventListener() {} }, console });
  ctx.window = ctx;
  for (const f of ["js/businesses.js", "js/video-cover.js", "js/business-profile.js", "js/business-directory.js"]) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  vm.runInContext("globalThis.__BUSINESSES = BUSINESSES; globalThis.__CATEGORIES = BUSINESS_CATEGORIES;", ctx);
  return ctx;
}
const RT = loadRuntime();
function loadBusinesses() {
  return RT.__BUSINESSES;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function checkDate(b) {
  if (b.updatedAt === undefined || b.updatedAt === "") return;
  const d = new Date(b.updatedAt + "T00:00:00Z");
  if (!DATE_RE.test(b.updatedAt) || isNaN(d) || d.toISOString().slice(0, 10) !== b.updatedAt) throw new Error(`${b.id}: updatedAt no válido ("${b.updatedAt}", formato AAAA-MM-DD)`);
  if (d.getTime() > Date.now() + 86400000) throw new Error(`${b.id}: updatedAt en el futuro (${b.updatedAt})`);
}

/* JSON dentro de <script>: sin «</» ni separadores de línea problemáticos */
function jsonForScript(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
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
    url: SITE_ORIGIN + "/perfil-" + b.slug,
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
  /* Tema visual propio (opcional): solo en el perfil que lo declara */
  if (b.theme) {
    if (!/^[a-z0-9-]+$/.test(b.theme) || !existsSync(join(ROOT, `css/temas/${b.theme}.css`))) throw new Error(`${b.id}: tema no válido o sin css/temas/${b.theme}.css`);
    html = html.replace(/<html\b([^>]*)>/, (m, attrs) => `<html${attrs} data-profile-theme="${escAttr(b.theme)}">`);
    html = html.replace('<link rel="stylesheet" href="css/business.css">', `<link rel="stylesheet" href="css/business.css">\n<link rel="stylesheet" href="css/temas/${escAttr(b.theme)}.css">`);
  }
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
  /* Datos estructurados en el HTML */
  const ldComment = /<!-- JSON-LD del perfil:[^>]*-->/;
  if (!ldComment.test(html)) throw new Error("business-profile.html: falta el comentario «JSON-LD del perfil»");
  html = html.replace(ldComment, () => `<script type="application/ld+json" id="bizJsonLd">${jsonForScript(RT.PDMBizProfile.structuredData(b))}</script>`);
  /* Contenido del perfil, legible sin JavaScript */
  const loading = '<div class="biz-page wrap" id="bizRoot">\n    <p class="biz-loading">Cargando perfil…</p>\n  </div>';
  if (!html.includes(loading)) throw new Error("business-profile.html: no se encontró el contenedor bizRoot");
  html = html.replace(loading, () => `<div class="biz-page wrap" id="bizRoot" data-prerendered="${escAttr(b.slug)}">${RT.PDMBizProfile.contentHtml(b)}</div>`);
  return html.replace("<head>", "<head>\n" + GENERATED_MARK);
}

/* ---------- Directorio (quien-puede-ayudarte.html) ---------- */
const DIR_URL = SITE_ORIGIN + "/quien-puede-ayudarte";
const maxDate = (list) => list.map((b) => b.updatedAt).filter(Boolean).sort().at(-1) || "";

function between(html, ini, fin, contenido, archivo) {
  const a = html.indexOf(ini);
  const z = html.indexOf(fin);
  if (a < 0 || z < a) throw new Error(`${archivo}: faltan los marcadores ${ini} … ${fin}`);
  return html.slice(0, a + ini.length) + contenido + html.slice(z);
}

function directoryJsonLd(all) {
  const D = RT.PDMBizDirectory;
  const ordered = D.results("", "", "");
  const items = ordered.map((b, i) => {
    const li = { "@type": "ListItem", position: i + 1, name: b.name };
    if (b.plan !== "gratuito") li.url = SITE_ORIGIN + "/perfil-" + b.slug;
    else {
      /* Ficha gratuita: sin página propia; solo los datos de su tarjeta */
      const item = { "@type": "Organization", name: b.name };
      if (b.shortDescription) item.description = b.shortDescription;
      if (b.city) item.address = Object.assign({ "@type": "PostalAddress", addressLocality: b.city }, b.province ? { addressRegion: b.province } : {}, { addressCountry: "CA" });
      if (b.phone) item.telephone = b.phone;
      li.item = item;
    }
    return li;
  });
  const page = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: DIR_URL,
    name: "Encuentra quién puede ayudarte en Canadá",
    description: "Encuentra empresas y profesionales que pueden ayudarte en tu ciudad. Llegaste a Canadá: no tienes que conocer a quién buscar, solo dinos qué necesitas.",
    inLanguage: "es",
    isPartOf: { "@type": "WebSite", name: "El Podcast del Migrante Magazine", url: SITE_ORIGIN + "/" },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: "Quién puede ayudarte", item: DIR_URL },
      ],
    },
    mainEntity: { "@type": "ItemList", numberOfItems: items.length, itemListElement: items },
  };
  const fecha = maxDate(all);
  if (fecha) page.dateModified = fecha;
  return page;
}

function buildDirectory(html, all) {
  html = between(html, "<!-- directorio-jsonld -->", "<!-- /directorio-jsonld -->", `\n<script type="application/ld+json" id="bizDirJsonLd">${jsonForScript(directoryJsonLd(all))}</script>\n`, "quien-puede-ayudarte.html");
  return between(html, "<!-- directorio-tarjetas -->", "<!-- /directorio-tarjetas -->", RT.PDMBizDirectory.allCardsHtml(), "quien-puede-ayudarte.html");
}

/* ---------- sitemap.xml: bloque del directorio empresarial ---------- */
const SM_INI = "  <!-- directorio-empresarial: generado por scripts/build-profile-pages.mjs -->";
const SM_FIN = "  <!-- /directorio-empresarial -->";

function sitemapBlock(all, premium) {
  const url = (loc, lastmod, priority) => `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <priority>${priority}</priority>
  </url>`;
  const urls = [url(DIR_URL, maxDate(all), "0.7")].concat(premium.map((b) => url(SITE_ORIGIN + "/perfil-" + b.slug, b.updatedAt || "", "0.6")));
  return `${SM_INI}\n${urls.join("\n")}\n${SM_FIN}`;
}

function updateSitemap(xml, block) {
  const a = xml.indexOf(SM_INI);
  const z = xml.indexOf(SM_FIN);
  if (a >= 0 && z > a) return xml.slice(0, a) + block + xml.slice(z + SM_FIN.length);
  const ancla = xml.indexOf("  <!-- canada-en-datos:");
  if (ancla >= 0) return xml.slice(0, ancla) + block + "\n" + xml.slice(ancla);
  return xml.replace("</urlset>", `${block}\n</urlset>`);
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
    /* Con representante (negocio o personaje comercial): el contacto se
       guarda con el nombre principal (ej. «Santa Latino»; X-ABShowAs hace que
       el iPhone lo muestre así) y la persona figura como representante. */
    `FN:${vEsc(b.name)}`,
    b.representative ? `ORG:${vEsc(b.name)}` : b.company && `ORG:${vEsc(b.company)}`,
    b.representative && "X-ABShowAs:COMPANY",
    b.professionalTitle && `TITLE:${vEsc(b.professionalTitle)}`,
    b.representative && `NOTE:${vEsc(`Representante: ${b.representative}`)}`,
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
/* Las fichas del plan gratuito (plan: "gratuito") no tienen miniweb: se muestran
   solo como tarjeta en el directorio (js/business-directory.js). */
const allPublished = loadBusinesses().filter((b) => b.published);
allPublished.forEach(checkDate);
const published = allPublished.filter((b) => b.plan !== "gratuito");
const expected = new Map();
for (const b of published) {
  if (!SLUG_RE.test(b.slug || "")) throw new Error(`Slug no válido para ${b.id}: "${b.slug}" (solo minúsculas, números y guiones)`);
  if (expected.has(`perfil-${b.slug}.html`)) throw new Error(`Slug duplicado: ${b.slug}`);
  expected.set(`perfil-${b.slug}.html`, buildPage(template, b));
  if (b.connect && b.connect.contactCard) expected.set(`vcard/${b.slug}.vcf`, buildVcard(b));
}

/* Directorio y sitemap */
expected.set("quien-puede-ayudarte.html", buildDirectory(readFileSync(join(ROOT, "quien-puede-ayudarte.html"), "utf8"), allPublished));
expected.set("sitemap.xml", updateSitemap(readFileSync(join(ROOT, "sitemap.xml"), "utf8"), sitemapBlock(allPublished, published)));

/* Lista pública de empresas Premium autorizadas para estadísticas
   (negocios-premium.json): business_id → slug de cada perfil Premium
   PUBLICADO. La lee el Worker podcastdelmigrante-analytics para aceptar
   eventos sin lista fija en su código: publicar un perfil aquí basta. Solo
   datos que ya son públicos (id y slug). */
const BIZ_ID_RE = /^BIZ-\d{3,6}$/;
const authorized = {};
for (const b of published) {
  if (!BIZ_ID_RE.test(b.id || "")) throw new Error(`business_id no válido: "${b.id}" (formato BIZ-001)`);
  if (authorized[b.id]) throw new Error(`business_id duplicado: ${b.id}`);
  authorized[b.id] = b.slug;
}
expected.set(
  "negocios-premium.json",
  JSON.stringify({ version: 1, generated_from: "js/businesses.js", businesses: authorized }, null, 2) + "\n"
);

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
