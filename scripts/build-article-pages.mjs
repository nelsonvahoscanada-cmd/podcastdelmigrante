#!/usr/bin/env node
/*
  build-article-pages.mjs — Una página estática por artículo
  ======================================================================
  Por qué existe: WhatsApp, Facebook, LinkedIn, X e iMessage leen la
  vista previa del HTML tal como llega del servidor. No ejecutan
  JavaScript y GitHub Pages entrega el MISMO archivo para cualquier
  articulo.html?slug=..., así que esa URL no puede tener la foto ni el
  titular de cada noticia.

  Este script lee js/articles.js y, para cada artículo publicado (no
  draft), escribe articulo-<slug>.html (URL pública:
  https://podcastdelmigrante.com/articulo-<slug>, sin .html): una copia exacta de
  articulo.html con <title>, descripción, URL canónica, og:*, article:*
  y twitter:* de ESE artículo ya escritos en el HTML. El cuerpo lo sigue
  armando js/article.js como siempre (mismo diseño).

  Artículos con «prerender: true»: la página trae además el contenido
  completo y los datos estructurados (NewsArticle) escritos en el HTML, con
  las mismas funciones del navegador (js/article.js → articleContentHtml y
  articleJsonLd), para que se lean sin JavaScript. Sus scripts llevan una
  versión (?v=<huella>) para que el navegador no use una copia anterior.
  Los demás artículos no cambian.

  Imagen social: assets/social/<slug>.jpg (1200 × 630, la genera
  scripts/build-social-images.py a partir de la foto principal). Si
  todavía no existe se usa la foto original; sin foto, el logotipo.

  USO (sin dependencias, Node 18+):
    node scripts/build-article-pages.mjs           genera / actualiza
    node scripts/build-article-pages.mjs --check   solo verifica (CI)

  Publicar o editar un artículo = editar js/articles.js y ejecutar:
    python3 scripts/build-social-images.py
    node scripts/build-article-pages.mjs
  El chequeo de GitHub «Artículos: vistas previas» falla si se olvida.

  Portada (index.html): Cloudflare entrega index.html revalidándolo en cada
  visita, pero los archivos .js con max-age de 4 horas. Para que la portada,
  y su barra «Última hora», muestren una noticia nueva en cuanto se publica,
  este script pone en index.html, junto a js/data.js, js/articles.js,
  js/noticias.js y js/main.js, una versión calculada con su contenido
  (?v=<huella>): si el archivo cambia, cambia la URL y el navegador lo pide
  de nuevo.
========================================================================= */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { rutasValidas, archivo as archivoRutas } from "./build-rutas-validas.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ORIGIN = "https://podcastdelmigrante.com";
const SITE_NAME = "El Podcast del Migrante Magazine";
const DEFAULT_IMAGE = "assets/logo.png";
const GENERATED_MARK = "<!-- Generado por scripts/build-article-pages.mjs a partir de js/articles.js. No editar a mano. -->";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHECK = process.argv.includes("--check");

/* Archivo generado y URL pública. La URL va SIN .html: Cloudflare Pages
   redirige x.html → /x (308) y GitHub Pages también sirve /x, así que
   canonical, og:url y compartir no pasan por ninguna redirección. */
export function articlePath(slug) {
  return `articulo-${slug}.html`;
}
export function articleUrl(slug) {
  return `${SITE_ORIGIN}/articulo-${slug}`;
}

function loadArticles() {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(join(ROOT, "js/articles.js"), "utf8") + "\n;globalThis.__A = ARTICLES;", ctx);
  return ctx.__A;
}

/* Mismos scripts que el navegador, en un contexto aislado (solo para los
   artículos con prerender: true). */
let RT = null;
function runtime() {
  if (RT) return RT;
  const ctx = vm.createContext({ document: { addEventListener() {} }, console, URLSearchParams });
  ctx.window = ctx;
  ctx.PDM = { el() {}, initSiteChrome() {} };
  for (const f of ["js/articles.js", "js/columns.js", "js/video-cover.js", "js/article.js"]) vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  vm.runInContext("globalThis.__ARTICLES = ARTICLES;", ctx);
  return (RT = ctx);
}
const versionDe = (f) => createHash("sha256").update(readFileSync(join(ROOT, f))).digest("hex").slice(0, 10);
const PRERENDER_SCRIPTS = ["js/data.js", "js/articles.js", "js/columns.js", "js/nav.js", "js/video-cover.js", "js/article.js", "js/vistas.js"];
function jsonForScript(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function prerender(html, a) {
  const R = runtime();
  const art = R.__ARTICLES.find((x) => x.slug === a.slug);
  const loading = '<article class="article-page wrap" id="articleRoot">\n    <p class="article-loading">Cargando artículo…</p>\n  </article>';
  if (!html.includes(loading)) throw new Error("articulo.html: no se encontró el contenedor articleRoot");
  html = html.replace(loading, () => `<article class="article-page wrap" id="articleRoot" data-prerendered="${escAttr(a.slug)}">${R.PDMArticle.articleContentHtml(art)}</article>`);
  html = html.replace("</head>", () => `<script type="application/ld+json" id="articleJsonLd">${jsonForScript(R.PDMArticle.articleJsonLd(art))}</script>\n</head>`);
  for (const f of PRERENDER_SCRIPTS) {
    const tag = `<script src="${f}"></script>`;
    if (!html.includes(tag)) throw new Error(`articulo.html: falta ${tag}`);
    html = html.replace(tag, `<script src="${f}?v=${versionDe(f)}"></script>`);
  }
  return html;
}

function escAttr(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Texto plano de una sola línea (los metadatos no admiten HTML) */
function plain(t) {
  return String(t == null ? "" : t).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function heroSrc(a) {
  const m = ((a.heroImage && a.heroImage.background) || "").match(/url\(['"]?([^'")]+)['"]?\)/);
  return m ? m[1].replace(/^\//, "") : null;
}

/* Ancho y alto de un JPEG o PNG local */
function imageSize(src) {
  const buf = readFileSync(join(ROOT, src));
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), type: "image/png" };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5), type: "image/jpeg" };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  throw new Error(`No se pudo leer el tamaño de ${src}`);
}

/* Imagen para compartir: social 1200×630 > foto original > logotipo */
function socialImage(a, problems) {
  const hero = heroSrc(a);
  if (!hero) return { src: DEFAULT_IMAGE, alt: SITE_NAME };
  if (!existsSync(join(ROOT, hero))) throw new Error(`${a.slug}: no existe la foto ${hero}`);
  const social = `assets/social/${a.heroImage.socialName || a.slug}.jpg`;
  if (existsSync(join(ROOT, social))) return { src: social, alt: plain(a.heroImage.alt) || plain(a.title) };
  problems.push(`falta ${social} (python3 scripts/build-social-images.py)`);
  return { src: hero, alt: plain(a.heroImage.alt) || plain(a.title) };
}

/* Mismas reglas que setSEO() en js/article.js */
function seoFor(a, problems) {
  const seo = a.seo || {};
  const img = socialImage(a, problems);
  return {
    docTitle: plain(seo.fullTitle || (seo.title || a.title) + " — " + SITE_NAME),
    title: plain(a.title),
    description: plain(seo.description || a.excerpt),
    url: articleUrl(a.slug),
    image: `${SITE_ORIGIN}/${img.src}`,
    imageSize: imageSize(img.src),
    imageAlt: img.alt,
    locale: a.lang === "en" ? "en_CA" : "es_CA",
  };
}

function setById(html, id, attr, value) {
  const re = new RegExp(`(<[^>]*\\bid="${id}"[^>]*\\b${attr}=")[^"]*(")`, "g");
  const n = (html.match(re) || []).length;
  if (n !== 1) throw new Error(`articulo.html: se esperaba una etiqueta id="${id}" con ${attr}=, hay ${n}`);
  return html.replace(re, (_, x, y) => x + escAttr(value) + y);
}

function buildPage(template, a, problems) {
  const s = seoFor(a, problems);
  let html = template;
  html = html.replace(/<html\b([^>]*)>/, (m, attrs) => `<html${attrs.replace(/\blang="[^"]*"/, `lang="${escAttr(a.lang || "es")}"`)} data-article-slug="${escAttr(a.slug)}">`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(s.docTitle)}</title>`);
  html = setById(html, "metaDescription", "content", s.description);
  html = setById(html, "canonicalLink", "href", s.url);
  html = setById(html, "ogType", "content", "article");
  html = setById(html, "ogTitle", "content", s.title);
  html = setById(html, "ogDescription", "content", s.description);
  html = setById(html, "ogUrl", "content", s.url);
  html = setById(html, "ogImage", "content", s.image);
  html = setById(html, "ogImageAlt", "content", s.imageAlt);
  html = setById(html, "ogLocale", "content", s.locale);
  html = setById(html, "twitterTitle", "content", s.title);
  html = setById(html, "twitterDescription", "content", s.description);
  html = setById(html, "twitterImage", "content", s.image);
  html = setById(html, "twitterImageAlt", "content", s.imageAlt);
  const extra = [
    `<meta property="og:image:secure_url" content="${escAttr(s.image)}">`,
    `<meta property="og:image:type" content="${s.imageSize.type}">`,
    `<meta property="og:image:width" content="${s.imageSize.width}">`,
    `<meta property="og:image:height" content="${s.imageSize.height}">`,
    a.publishedAt && `<meta property="article:published_time" content="${escAttr(a.publishedAt)}">`,
    a.updatedAt && `<meta property="article:modified_time" content="${escAttr(a.updatedAt)}">`,
    a.category && `<meta property="article:section" content="${escAttr(a.category)}">`,
  ].filter(Boolean);
  html = html.replace(/(<meta id="ogImage"[^>]*>)/, `$1\n${extra.join("\n")}`);
  if (a.prerender === true) html = prerender(html, a);
  return html.replace("<head>", "<head>\n" + GENERATED_MARK);
}

/* Contador público de visualizaciones: noticias y guías publicadas (misma
   regla que tieneContador() en js/article.js). Ver docs/contador-visualizaciones.md. */
const TIPOS_CON_CONTADOR = ["Noticia", "Guía"];
const tieneContador = (a) => TIPOS_CON_CONTADOR.includes(a.contentType) && !a.draft && a.demo !== true;
const ID_RE = /^ART-\d{4}-\d{3}$/;

const template = readFileSync(join(ROOT, "articulo.html"), "utf8");
const problems = [];
const expected = new Map();
const conContador = [];
for (const a of loadArticles()) {
  if (a.draft) continue;   /* los borradores no se publican ni se comparten */
  if (!SLUG_RE.test(a.slug || "")) throw new Error(`Slug no válido para ${a.id}: "${a.slug}" (solo minúsculas, números y guiones)`);
  if (expected.has(articlePath(a.slug))) throw new Error(`Slug duplicado: ${a.slug}`);
  expected.set(articlePath(a.slug), buildPage(template, a, problems));
  if (tieneContador(a)) {
    if (!ID_RE.test(a.id || "")) throw new Error(`Identificador no válido para el contador en ${a.slug}: "${a.id}" (formato ART-AAAA-NNN)`);
    if (conContador.includes(a.id)) throw new Error(`Identificador duplicado: ${a.id}`);
    conContador.push(a.id);
  }
}

/* Lista de artículos publicados para la función de Cloudflare Pages
   (functions/_middleware.js redirige /articulo?slug=X → /articulo-X solo
   si X está aquí) y lista de identificadores con contador de
   visualizaciones (functions/_lib/vistas.js solo acepta estos). */
const MANIFEST = "functions/_lib/published-articles.js";
expected.set(
  MANIFEST,
  "/* Generado por scripts/build-article-pages.mjs a partir de js/articles.js. No editar a mano. */\n" +
    "export const PUBLISHED_ARTICLES = new Set(" + JSON.stringify([...expected.keys()].map((f) => f.slice("articulo-".length, -".html".length)), null, 2) + ");\n" +
    "\n/* Noticias y guías publicadas con contador público de visualizaciones. */\n" +
    "export const ARTICULOS_CON_CONTADOR = new Set(" + JSON.stringify(conContador, null, 2) + ");\n"
);

/* Parámetros válidos de las plantillas (functions/_middleware.js responde
   404 real a los demás): se actualizan aquí también, porque publicar una
   noticia agrega un ?slug= válido. Ver scripts/build-rutas-validas.mjs. */
expected.set("functions/_lib/rutas-validas.js", archivoRutas(rutasValidas(ROOT)));

/* Portada: versión de los scripts que dependen de los artículos publicados */
const VERSIONADOS = ["js/data.js", "js/articles.js", "js/noticias.js", "js/main.js"];
const huella = (f) => createHash("sha256").update(readFileSync(join(ROOT, f))).digest("hex").slice(0, 10);
let portada = readFileSync(join(ROOT, "index.html"), "utf8");
for (const f of VERSIONADOS) {
  const re = new RegExp(`<script src="${f.replace(/[.]/g, "\\.")}(\\?v=[0-9a-f]+)?"></script>`);
  if (!re.test(portada)) problems.push(`index.html no carga ${f}`);
  portada = portada.replace(re, `<script src="${f}?v=${huella(f)}"></script>`);
}
expected.set("index.html", portada);

const stale = readdirSync(ROOT).filter(
  (f) => /^articulo-.+\.html$/.test(f) && !expected.has(f) && readFileSync(join(ROOT, f), "utf8").includes(GENERATED_MARK)
);

for (const [file, html] of expected) {
  const path = join(ROOT, file);
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === html) continue;
  if (CHECK) problems.push(current === null ? `falta ${file}` : `${file} está desactualizado`);
  else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, html); console.log(`escrito  ${file}`); }
}
for (const file of stale) {
  if (CHECK) problems.push(`${file} ya no corresponde a un artículo publicado`);
  else { unlinkSync(join(ROOT, file)); console.log(`borrado  ${file}`); }
}

if (problems.length) {
  console.error((CHECK ? "Las páginas de artículos no están al día:" : "Atención:") + "\n  - " + problems.join("\n  - "));
  if (CHECK) {
    console.error("Ejecuta: python3 scripts/build-social-images.py && node scripts/build-article-pages.mjs  y sube los cambios.");
    process.exit(1);
  }
}
console.log(`${expected.size - 3} artículo(s) y la portada ${CHECK ? "verificados" : "al día"}.`);
