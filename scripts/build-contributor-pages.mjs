#!/usr/bin/env node
/*
  build-contributor-pages.mjs — Una página estática por colaborador editorial
  ======================================================================
  WhatsApp, Facebook, LinkedIn y X leen la vista previa del HTML tal como
  llega del servidor (no ejecutan JavaScript). colaborador.html?id=... es
  la misma página para todos, así que no puede tener una vista previa
  propia por colaborador.

  Este script lee CONTRIBUTORS (js/data.js) y, para cada colaborador,
  escribe colaborador-<id>.html: una copia de colaborador.html con el
  <title>, la descripción, la URL canónica y las etiquetas og:/twitter: de
  ESA persona ya escritas en el HTML, y su imagen para compartir
  assets/social/colaborador-<id>.jpg (1200 × 630, la genera
  scripts/build-social-images.py). El cuerpo lo arma js/colaborador.js
  igual que siempre.

  Agregar un colaborador = añadir su objeto a CONTRIBUTORS y ejecutar:
    python3 scripts/build-social-images.py
    node scripts/build-contributor-pages.mjs
  URL pública: https://podcastdelmigrante.com/colaborador-<id>

  Son perfiles EDITORIALES: no tienen relación con las miniwebs
  empresariales (perfil-<slug>.html, scripts/build-profile-pages.mjs).

  USO (sin dependencias, Node 18+):
    node scripts/build-contributor-pages.mjs           genera / actualiza
    node scripts/build-contributor-pages.mjs --check   solo verifica (CI)
========================================================================= */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ORIGIN = "https://podcastdelmigrante.com";
const GENERATED_MARK = "<!-- Generado por scripts/build-contributor-pages.mjs a partir de js/data.js (CONTRIBUTORS). No editar a mano. -->";
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHECK = process.argv.includes("--check");

export function loadContributors() {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(join(ROOT, "js/data.js"), "utf8") + "\n;globalThis.__C = CONTRIBUTORS;", ctx);
  return ctx.__C;
}

function escAttr(t) {
  return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function jpegSize(file) {
  const buf = readFileSync(file);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

export function seoFor(c) {
  const specialty = c.shareSpecialty || c.specialty || "";
  const image = `assets/social/colaborador-${c.id}.jpg`;
  if (!existsSync(join(ROOT, image))) throw new Error(`Falta ${image}: ejecuta python3 scripts/build-social-images.py`);
  return {
    title: `${c.name} — ${specialty} | El Podcast del Migrante Magazine`,
    description: c.shareDescription || c.bio || "",
    url: `${SITE_ORIGIN}/colaborador-${c.id}`,
    image: `${SITE_ORIGIN}/${image}`,
    imageSize: jpegSize(join(ROOT, image)),
    imageAlt: `${c.name}, ${(c.roleLabel || "colaborador").toLowerCase()} de El Podcast del Migrante Magazine — ${specialty}`,
  };
}

function setById(html, id, attr, value) {
  const re = new RegExp(`(<[^>]*\\bid="${id}"[^>]*\\b${attr}=")[^"]*(")`, "g");
  const n = (html.match(re) || []).length;
  if (n !== 1) throw new Error(`colaborador.html: se esperaba una etiqueta id="${id}" con ${attr}=, hay ${n}`);
  return html.replace(re, (_, a, b) => a + escAttr(value) + b);
}

function buildPage(template, c) {
  const seo = seoFor(c);
  let html = template;
  html = html.replace(/<html\b([^>]*)>/, (m, attrs) => `<html${attrs} data-contributor-id="${escAttr(c.id)}">`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(seo.title)}</title>`);
  html = setById(html, "metaDescription", "content", seo.description);
  html = setById(html, "canonicalLink", "href", seo.url);
  html = setById(html, "ogTitle", "content", seo.title);
  html = setById(html, "ogDescription", "content", seo.description);
  html = setById(html, "ogUrl", "content", seo.url);
  html = setById(html, "ogImage", "content", seo.image);
  html = setById(html, "ogImageAlt", "content", seo.imageAlt);
  html = setById(html, "twitterTitle", "content", seo.title);
  html = setById(html, "twitterDescription", "content", seo.description);
  html = setById(html, "twitterImage", "content", seo.image);
  html = setById(html, "twitterImageAlt", "content", seo.imageAlt);
  if (seo.imageSize) {
    html = html.replace(
      /(<meta id="ogImage"[^>]*>)/,
      `$1\n<meta property="og:image:secure_url" content="${escAttr(seo.image)}">\n<meta property="og:image:type" content="image/jpeg">\n<meta property="og:image:width" content="${seo.imageSize.width}">\n<meta property="og:image:height" content="${seo.imageSize.height}">`
    );
  }
  return html.replace("<head>", "<head>\n" + GENERATED_MARK);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const template = readFileSync(join(ROOT, "colaborador.html"), "utf8");
  const expected = new Map();
  for (const c of loadContributors()) {
    if (!ID_RE.test(c.id || "")) throw new Error(`id de colaborador no válido: "${c.id}"`);
    const file = `colaborador-${c.id}.html`;
    if (expected.has(file)) throw new Error(`id de colaborador duplicado: ${c.id}`);
    expected.set(file, buildPage(template, c));
  }
  const stale = readdirSync(ROOT).filter(
    (f) => /^colaborador-.+\.html$/.test(f) && !expected.has(f) && readFileSync(join(ROOT, f), "utf8").includes(GENERATED_MARK)
  );
  const problems = [];
  for (const [file, html] of expected) {
    const path = join(ROOT, file);
    const current = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (current === html) continue;
    if (CHECK) problems.push(current === null ? `falta ${file}` : `${file} está desactualizado`);
    else { writeFileSync(path, html); console.log(`escrito  ${file}`); }
  }
  for (const file of stale) {
    if (CHECK) problems.push(`${file} ya no corresponde a un colaborador`);
    else { unlinkSync(join(ROOT, file)); console.log(`borrado  ${file}`); }
  }
  if (CHECK && problems.length) {
    console.error("Las páginas de colaboradores no están al día:\n  - " + problems.join("\n  - "));
    console.error("Ejecuta: python3 scripts/build-social-images.py && node scripts/build-contributor-pages.mjs");
    process.exit(1);
  }
  console.log(`${expected.size} página(s) de colaboradores ${CHECK ? "verificadas" : "al día"}.`);
}
