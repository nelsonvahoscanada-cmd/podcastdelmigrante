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
  draft), escribe articulo-<slug>.html: una copia exacta de
  articulo.html con <title>, descripción, URL canónica, og:*, article:*
  y twitter:* de ESE artículo ya escritos en el HTML. El cuerpo lo sigue
  armando js/article.js como siempre (mismo diseño).

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
========================================================================= */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ORIGIN = "https://podcastdelmigrante.com";
const SITE_NAME = "El Podcast del Migrante Magazine";
const DEFAULT_IMAGE = "assets/logo.png";
const GENERATED_MARK = "<!-- Generado por scripts/build-article-pages.mjs a partir de js/articles.js. No editar a mano. -->";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHECK = process.argv.includes("--check");

export function articlePath(slug) {
  return `articulo-${slug}.html`;
}

function loadArticles() {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(join(ROOT, "js/articles.js"), "utf8") + "\n;globalThis.__A = ARTICLES;", ctx);
  return ctx.__A;
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
  const social = `assets/social/${a.slug}.jpg`;
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
    url: `${SITE_ORIGIN}/${articlePath(a.slug)}`,
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
  return html.replace("<head>", "<head>\n" + GENERATED_MARK);
}

const template = readFileSync(join(ROOT, "articulo.html"), "utf8");
const problems = [];
const expected = new Map();
for (const a of loadArticles()) {
  if (a.draft) continue;   /* los borradores no se publican ni se comparten */
  if (!SLUG_RE.test(a.slug || "")) throw new Error(`Slug no válido para ${a.id}: "${a.slug}" (solo minúsculas, números y guiones)`);
  if (expected.has(articlePath(a.slug))) throw new Error(`Slug duplicado: ${a.slug}`);
  expected.set(articlePath(a.slug), buildPage(template, a, problems));
}

const stale = readdirSync(ROOT).filter(
  (f) => /^articulo-.+\.html$/.test(f) && !expected.has(f) && readFileSync(join(ROOT, f), "utf8").includes(GENERATED_MARK)
);

for (const [file, html] of expected) {
  const path = join(ROOT, file);
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === html) continue;
  if (CHECK) problems.push(current === null ? `falta ${file}` : `${file} está desactualizado`);
  else { writeFileSync(path, html); console.log(`escrito  ${file}`); }
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
console.log(`${expected.size} artículo(s) ${CHECK ? "verificados" : "al día"}.`);
