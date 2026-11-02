#!/usr/bin/env node
/*
  build-ediciones.mjs — Ediciones mensuales del Magazine y su hemeroteca
  ======================================================================
  Lee EDICIONES (js/ediciones.js) y escribe:

    magazine/ediciones/index.html   hemeroteca: solo ediciones publicadas
    magazine/AAAA-MM/index.html     cada edición publicada (ruta permanente)
    magazine/index.html             la edición vigente (solo si hay alguna
                                    publicada), con canonical a su ruta
                                    permanente para no duplicar en buscadores
    sitemap.xml                     bloque propio con las ediciones
                                    publicadas (sin bloque mientras no haya)

  Preservación: la página de una edición publicada se arma SOLO con sus
  propios datos y su `instantanea` (titulares, bajadas, imágenes, fechas y
  URL congelados el día de la publicación). No lee ARTICLES ni ninguna otra
  fuente, ni enlaza a la edición siguiente: publicar una edición nueva, o
  cambiar un artículo, no altera las ya publicadas. La `huella` (SHA-256 de
  toda la edición) detecta cualquier cambio accidental, y una edición
  publicada no puede retirarse sin --retirar.

  Borradores: nunca se escriben dentro del sitio. Su vista previa privada se
  genera fuera, con --borradores=DIR.

  USO (sin dependencias, Node 18+):
    node scripts/build-ediciones.mjs                      genera / actualiza
    node scripts/build-ediciones.mjs --check              solo verifica (pruebas)
    node scripts/build-ediciones.mjs --congelar=AAAA-MM   guarda instantánea y huella
        [--correccion="motivo"]                           corrección de una publicada
    node scripts/build-ediciones.mjs --borradores=DIR     vista previa de borradores
    node scripts/build-ediciones.mjs --retirar=AAAA-MM    borra la página de una
                                                          edición retirada (excepcional)
========================================================================= */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://podcastdelmigrante.com";
const BASE = "/magazine";
const ZONA = "America/Edmonton";
const MARCA = "<!-- Generado por scripts/build-ediciones.mjs a partir de js/ediciones.js. No editar a mano. -->";
const SITEMAP_INI = "  <!-- magazine-ediciones: generado por scripts/build-ediciones.mjs -->";
const SITEMAP_FIN = "  <!-- /magazine-ediciones -->";
const SLUG_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ISO_ZONA_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dos = (n) => String(n).padStart(2, "0");
export const periodoTexto = (p) => `${MESES[p.mes - 1]} de ${p.anio}`;
export const fechaTexto = (iso) => new Intl.DateTimeFormat("es-CA", { day: "numeric", month: "long", year: "numeric", timeZone: ZONA }).format(new Date(iso));

/* ---------- Datos ---------- */
function correr(archivo, expr, root) {
  const ctx = vm.createContext({ window: {}, console });
  vm.runInContext(readFileSync(join(root, archivo), "utf8") + `\n;globalThis.__R = ${expr};`, ctx);
  return JSON.parse(JSON.stringify(ctx.__R));
}

export function cargar(root = ROOT) {
  return {
    ediciones: correr("js/ediciones.js", "EDICIONES", root),
    fuentes: {
      articulos: correr("js/articles.js", "ARTICLES", root),
      ...correr("js/data.js", "({ historias: STORIES, videos: VIDEOS })", root),
      existe: (ruta) => existsSync(join(root, ruta.replace(/^\//, ""))),
    },
  };
}

/* JSON con las claves ordenadas: la huella no depende del orden de escritura */
function canonico(v) {
  if (Array.isArray(v)) return `[${v.map(canonico).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonico(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
export function huellaDe(ed) {
  const { huella, ...resto } = ed;
  return createHash("sha256").update(canonico(resto)).digest("hex");
}
export const clavePieza = (p) => `${p.tipo}:${p.id || p.slug || p.videoId}`;

/* ---------- Instantánea de cada pieza (lo que se congela al publicar) ---------- */
export function resolverPieza(p, fuentes) {
  const img = (ruta) => (ruta && fuentes.existe(ruta) ? ruta : "/assets/logo.png");
  if (p.tipo === "articulo") {
    const a = fuentes.articulos.find((x) => x.id === p.id);
    if (!a) throw new Error(`No existe el artículo ${p.id}`);
    if (a.draft || a.demo === true) throw new Error(`El artículo ${p.id} no está publicado`);
    return { tipo: "articulo", titulo: a.title, bajada: a.dek || a.excerpt || "", categoria: a.category || "", fecha: a.publishedAt, url: `/articulo-${a.slug}`, imagen: img(`/assets/social/${a.slug}.jpg`) };
  }
  if (p.tipo === "historia") {
    const h = fuentes.historias.find((x) => (x.href || "").endsWith(`slug=${p.slug}`));
    if (!h) throw new Error(`No existe la historia ${p.slug}`);
    if (h.demo) throw new Error(`La historia ${p.slug} no está publicada`);
    return { tipo: "historia", titulo: h.title, bajada: h.excerpt || "", categoria: "Historia de vida", fecha: null, url: `/${h.href.replace(/^\//, "").replace(/\.html(?=\?|$)/, "")}`, imagen: img(h.videoId ? `/assets/yt/${h.videoId}.jpg` : null) };
  }
  if (p.tipo === "video") {
    const v = fuentes.videos.find((x) => x.videoId === p.videoId);
    if (!v) throw new Error(`No existe el video ${p.videoId}`);
    if (v.demo || v.published === false) throw new Error(`El video ${p.videoId} no está publicado`);
    return { tipo: "video", titulo: v.title, bajada: v.desc || "", categoria: v.tag || "Video", fecha: null, url: v.articleSlug ? `/articulo-${v.articleSlug}` : `https://www.youtube.com/watch?v=${v.videoId}`, imagen: img(`/assets/yt/${v.videoId}.jpg`) };
  }
  throw new Error(`Tipo de pieza desconocido: ${p.tipo}`);
}

/* Congela una edición: instantánea de todas sus piezas + huella. Una edición
   ya congelada solo vuelve a congelarse con una corrección registrada. */
export function congelar(ed, fuentes, { correccion = null, fecha = new Date().toISOString() } = {}) {
  if (ed.huella && !correccion) throw new Error(`La edición ${ed.slug} ya está congelada: una corrección necesita --correccion="motivo"`);
  const piezas = {};
  for (const s of ed.secciones || []) for (const p of s.piezas || []) piezas[clavePieza(p)] = resolverPieza(p, fuentes);
  const nueva = { ...ed, instantanea: { congeladaEn: fecha, piezas } };
  if (correccion) nueva.correcciones = [...(ed.correcciones || []), { fecha: fecha.slice(0, 10), nota: correccion }];
  delete nueva.huella;
  return { ...nueva, huella: huellaDe(nueva) };
}

/* ---------- Validación ---------- */
const HTML_PROHIBIDO = /<\s*(script|style|iframe|object|embed|form|input)\b|\son\w+\s*=|javascript:/i;

export function validar(ediciones) {
  const err = [];
  if (!Array.isArray(ediciones)) return ["EDICIONES debe ser una lista"];
  const nums = new Set(), slugs = new Set();
  ediciones.forEach((ed, i) => {
    const q = `Edición ${ed.slug || `#${i + 1}`}`;
    if (!Number.isInteger(ed.numero) || ed.numero < 1) err.push(`${q}: número inválido`);
    if (nums.has(ed.numero)) err.push(`${q}: número repetido`);
    nums.add(ed.numero);
    const m = SLUG_RE.exec(ed.slug || "");
    if (!m) err.push(`${q}: slug debe ser AAAA-MM`);
    if (slugs.has(ed.slug)) err.push(`${q}: slug repetido`);
    slugs.add(ed.slug);
    const p = ed.periodo || {};
    if (m && (p.anio !== +m[1] || p.mes !== +m[2])) err.push(`${q}: el período no coincide con el slug`);
    if (!["borrador", "publicada"].includes(ed.estado)) err.push(`${q}: estado debe ser «borrador» o «publicada»`);
    if (!ed.titulo) err.push(`${q}: falta el titular`);
    if (!Array.isArray(ed.secciones) || !ed.secciones.length) err.push(`${q}: falta el índice (secciones)`);
    for (const s of ed.secciones || []) {
      if (!s.titulo || !Array.isArray(s.piezas) || !s.piezas.length) err.push(`${q}: sección sin título o sin piezas`);
      for (const pz of s.piezas || []) if (!["articulo", "historia", "video"].includes(pz.tipo) || !(pz.id || pz.slug || pz.videoId)) err.push(`${q}: pieza inválida ${JSON.stringify(pz)}`);
    }
    const claves = (ed.secciones || []).flatMap((s) => (s.piezas || []).map(clavePieza));
    if (new Set(claves).size !== claves.length) err.push(`${q}: hay piezas repetidas en el índice`);
    if (ed.editorial && HTML_PROHIBIDO.test(ed.editorial.html || "")) err.push(`${q}: el editorial contiene HTML no permitido`);
    if (ed.estado === "borrador" && ed.publicadaEn) err.push(`${q}: un borrador no tiene fecha de publicación`);
    if (ed.estado === "publicada") {
      if (!ISO_ZONA_RE.test(ed.publicadaEn || "")) err.push(`${q}: publicadaEn debe ser una fecha ISO con zona horaria`);
      else if (m && new Date(ed.publicadaEn) < new Date(Date.UTC(p.anio, p.mes - 1, 1))) err.push(`${q}: la publicación no puede ser anterior al período de la edición`);
      if (!ed.portada || !ed.portada.imagen || !ed.portada.alt || !ed.portada.ancho || !ed.portada.alto) err.push(`${q}: falta la portada (imagen, alt, ancho y alto)`);
      const so = ed.portada && ed.portada.social;
      if (so && (!so.imagen || !so.alt || !so.ancho || !so.alto)) err.push(`${q}: portada.social necesita imagen, alt, ancho y alto`);
      if (!ed.editorial || !ed.editorial.titulo || !ed.editorial.html) err.push(`${q}: falta el editorial`);
      if (!ed.instantanea || !ed.huella) err.push(`${q}: una edición publicada debe estar congelada (--congelar=${ed.slug})`);
      else {
        if (huellaDe(ed) !== ed.huella) err.push(`${q}: la edición publicada cambió y su huella ya no coincide (corrección intencional: --congelar=${ed.slug} --correccion="motivo")`);
        for (const k of claves) if (!ed.instantanea.piezas || !ed.instantanea.piezas[k]) err.push(`${q}: la instantánea no incluye ${k}`);
      }
    }
  });
  const pub = ediciones.filter((e) => e.estado === "publicada").sort((a, b) => a.numero - b.numero);
  pub.forEach((e, i) => { if (i && e.slug <= pub[i - 1].slug) err.push(`Edición ${e.slug}: los números y los períodos deben avanzar juntos`); });
  return err;
}

/* ---------- Cabecera y pie del sitio (de 404.html, como Canadá en Datos) ---------- */
function chrome(root) {
  const html = readFileSync(join(root, "404.html"), "utf8");
  const ini = html.indexOf('<a class="skip-link"');
  const finCab = html.indexOf('<main id="main">');
  const iniPie = html.indexOf("<!-- ================= FOOTER");
  const finPie = html.indexOf("</footer>") + "</footer>".length;
  if (ini < 0 || finCab < 0 || iniPie < 0 || finPie < 9) throw new Error("404.html cambió: no se encontró la cabecera o el pie");
  return { cabecera: html.slice(ini, finCab).trimEnd(), pie: html.slice(iniPie, finPie) };
}

function head({ title, description, path, canonical = path, image, imageAlt, imageType = "image/jpeg", imageW, imageH, jsonLd, noindex }) {
  const url = SITE + canonical;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${MARCA}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="El Podcast del Migrante Magazine">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${image}">
<meta property="og:image:type" content="${imageType}">
${imageW ? `<meta property="og:image:width" content="${imageW}">\n<meta property="og:image:height" content="${imageH}">\n` : ""}<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta property="og:locale" content="es_CA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}${image}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/favicon.png">
<link rel="preload" href="/assets/fonts/public-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/ediciones.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n` : ""}</head>`;
}

const SCRIPTS = `<script>window.PDM_SITE_ROOT_LINKS = true;</script>
<script src="/js/data.js"></script>
<script src="/js/nav.js"></script>
<script>document.addEventListener("DOMContentLoaded", () => window.PDM && window.PDM.initSiteChrome && window.PDM.initSiteChrome());</script>
</body>
</html>
`;

const rotulo = (ed) => `Edición ${dos(ed.numero)} · ${periodoTexto(ed.periodo).replace(/^./, (c) => c.toUpperCase())}`;

/* ---------- Página de una edición (solo con sus propios datos) ---------- */
function piezaHtml(s) {
  const externo = /^https?:/.test(s.url) ? ' target="_blank" rel="noopener"' : "";
  const fecha = s.fecha ? `<span class="ed-pieza__fecha">Publicado el ${esc(fechaTexto(s.fecha))}</span>` : "";
  return `<li class="ed-pieza">
            <a class="ed-pieza__enlace" href="${esc(s.url)}"${externo}>
              <img class="ed-pieza__img" src="${esc(s.imagen)}" alt="" width="1200" height="630" loading="lazy" decoding="async">
              <span class="ed-pieza__texto">
                ${s.categoria ? `<span class="ed-pieza__cat">${esc(s.categoria)}</span>` : ""}
                <span class="ed-pieza__titulo">${esc(s.titulo)}</span>
                ${s.bajada ? `<span class="ed-pieza__bajada">${esc(s.bajada)}</span>` : ""}
                ${fecha}
              </span>
            </a>
          </li>`;
}

export function paginaEdicion(ed, comun, { vigente = false, borrador = false } = {}) {
  const permanente = `${BASE}/${ed.slug}/`;
  const piezas = ed.instantanea.piezas;
  const indice = ed.secciones
    .map((s) => `<section class="ed-seccion">
        <h3 class="ed-seccion__titulo">${esc(s.titulo)}</h3>
        <ol class="ed-piezas">
          ${s.piezas.map((p) => piezaHtml(piezas[clavePieza(p)])).join("\n          ")}
        </ol>
      </section>`)
    .join("\n      ");
  const fechas = `<p class="ed-fechas"><span>Período de la edición: ${esc(periodoTexto(ed.periodo))}</span>${ed.publicadaEn ? `<span>Publicada el <time datetime="${esc(ed.publicadaEn)}">${esc(fechaTexto(ed.publicadaEn))}</time></span>` : "<span>Sin publicar</span>"}</p>`;
  const correcciones = (ed.correcciones || []).length
    ? `<aside class="ed-correcciones"><h2>Correcciones</h2><ul>${ed.correcciones.map((c) => `<li><time datetime="${esc(c.fecha)}">${esc(fechaTexto(c.fecha + "T12:00:00Z"))}</time>: ${esc(c.nota)}</li>`).join("")}</ul></aside>`
    : "";
  const jsonLd = { "@context": "https://schema.org", "@type": "PublicationIssue", issueNumber: String(ed.numero), name: ed.titulo, url: SITE + permanente, ...(ed.publicadaEn ? { datePublished: ed.publicadaEn } : {}), image: SITE + ed.portada.imagen, inLanguage: "es", isPartOf: { "@type": "Periodical", name: "El Podcast del Migrante Magazine", url: SITE + "/" } };
  /* Para compartir: la imagen horizontal (portada.social) si existe; si no, la portada */
  const social = ed.portada.social || ed.portada;
  return `${head({ title: `${rotulo(ed)}: ${ed.titulo} — El Podcast del Migrante Magazine`, description: ed.bajada || ed.titulo, path: vigente ? `${BASE}/` : permanente, canonical: permanente, image: social.imagen, imageAlt: social.alt, imageType: /\.png$/i.test(social.imagen) ? "image/png" : "image/jpeg", imageW: social.ancho, imageH: social.alto, jsonLd, noindex: borrador })}
<body class="ed-pagina">
${comun.cabecera}

<main id="main" class="ed">
  ${borrador ? '<p class="ed-borrador" role="note"><strong>Borrador: vista previa privada.</strong> Esta edición no está publicada.</p>' : ""}
  <div class="wrap">
    <nav class="ed-migas" aria-label="Ruta de navegación"><a href="/index.html">Inicio</a> › <a href="${BASE}/ediciones/">Ediciones</a> › <span aria-current="page">Edición ${dos(ed.numero)}</span></nav>
    <header class="ed-cabecera">
      <figure class="ed-portada">
        <img src="${esc(ed.portada.imagen)}" alt="${esc(ed.portada.alt)}" width="${ed.portada.ancho}" height="${ed.portada.alto}" fetchpriority="high">
      </figure>
      <div class="ed-cabecera__texto">
        <p class="ed-rotulo">${esc(rotulo(ed))}</p>
        <h1 class="ed-titulo">${esc(ed.titulo)}</h1>
        ${ed.bajada ? `<p class="ed-bajada">${esc(ed.bajada)}</p>` : ""}
        ${fechas}
      </div>
    </header>
    <section class="ed-editorial" aria-labelledby="edEditorial">
      <h2 id="edEditorial">${esc(ed.editorial.titulo)}</h2>
      ${ed.editorial.autor ? `<p class="ed-editorial__autor">Por ${esc(ed.editorial.autor)}</p>` : ""}
      <div class="ed-editorial__texto">${ed.editorial.html}</div>
    </section>
    <section class="ed-indice" aria-labelledby="edIndice">
      <h2 id="edIndice">En esta edición</h2>
      ${indice}
    </section>
    ${correcciones}
    <p class="ed-volver"><a href="${BASE}/ediciones/">Ver todas las ediciones</a></p>
  </div>
</main>

${comun.pie}

${SCRIPTS}`;
}

/* ---------- Hemeroteca ---------- */
export function paginaHemeroteca(publicadas, comun) {
  const ordenadas = publicadas.slice().sort((a, b) => b.numero - a.numero);
  const porAnio = {};
  for (const ed of ordenadas) (porAnio[ed.periodo.anio] ||= []).push(ed);
  const cuerpo = ordenadas.length
    ? Object.keys(porAnio).sort((a, b) => b - a).map((anio) => `<section class="hem-anio" aria-labelledby="hem${anio}">
        <h2 class="hem-anio__titulo" id="hem${anio}">${anio}</h2>
        <ol class="hem-lista">
          ${porAnio[anio].map((ed) => `<li class="hem-ed">
            <a href="${BASE}/${ed.slug}/">
              <img src="${esc(ed.portada.imagen)}" alt="${esc(ed.portada.alt)}" width="${ed.portada.ancho}" height="${ed.portada.alto}" loading="lazy" decoding="async">
              <span class="hem-ed__rotulo">${esc(rotulo(ed))}</span>
              <span class="hem-ed__titulo">${esc(ed.titulo)}</span>
              <span class="hem-ed__fecha">Publicada el ${esc(fechaTexto(ed.publicadaEn))}</span>
            </a>
          </li>`).join("\n          ")}
        </ol>
      </section>`).join("\n      ")
    : `<p class="hem-vacia">Todavía no hay ediciones publicadas en la hemeroteca.</p>`;
  return `${head({ title: "Ediciones — El Podcast del Migrante Magazine", description: "Hemeroteca de El Podcast del Migrante Magazine: todas las ediciones mensuales publicadas, con su portada, su editorial y su índice.", path: `${BASE}/ediciones/`, image: "/assets/logo.png", imageAlt: "Logotipo de El Podcast del Migrante", imageType: "image/png", noindex: !ordenadas.length, jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: "Ediciones de El Podcast del Migrante Magazine", url: `${SITE}${BASE}/ediciones/`, inLanguage: "es" } })}
<body class="ed-pagina">
${comun.cabecera}

<main id="main" class="ed">
  <div class="wrap">
    <nav class="ed-migas" aria-label="Ruta de navegación"><a href="/index.html">Inicio</a> › <span aria-current="page">Ediciones</span></nav>
    <header class="hem-cabecera">
      <p class="ed-rotulo">El Podcast del Migrante Magazine</p>
      <h1 class="ed-titulo">Ediciones</h1>
      <p class="ed-bajada">Cada mes, una selección editorial con portada, editorial e índice propios. Las ediciones publicadas se conservan tal como salieron.</p>
    </header>
    ${cuerpo}
  </div>
</main>

${comun.pie}

${SCRIPTS}`;
}

/* ---------- Sitemap ---------- */
export function sitemapEdiciones(xml, rutas) {
  const i = xml.indexOf(SITEMAP_INI), f = xml.indexOf(SITEMAP_FIN);
  const sin = i >= 0 && f > i ? xml.slice(0, i).replace(/\n$/, "") + xml.slice(f + SITEMAP_FIN.length) : xml;
  if (!rutas.length) return sin;
  const bloque = `${SITEMAP_INI}\n${rutas.map(([ruta, fecha, prio]) => `  <url>\n    <loc>${SITE}${ruta}</loc>\n    <lastmod>${fecha}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${prio}</priority>\n  </url>`).join("\n")}\n${SITEMAP_FIN}`;
  return sin.replace("</urlset>", `${bloque}\n</urlset>`);
}

/* ---------- Generación ---------- */
export function render(ediciones, { root = ROOT, sitemap = readFileSync(join(root, "sitemap.xml"), "utf8") } = {}) {
  const errores = validar(ediciones);
  if (errores.length) throw new Error(`Ediciones inválidas:\n- ${errores.join("\n- ")}`);
  const comun = chrome(root);
  const publicadas = ediciones.filter((e) => e.estado === "publicada");
  const files = { "magazine/ediciones/index.html": paginaHemeroteca(publicadas, comun) };
  for (const ed of publicadas) files[`magazine/${ed.slug}/index.html`] = paginaEdicion(ed, comun);
  const vigente = publicadas.slice().sort((a, b) => b.numero - a.numero)[0];
  if (vigente) files["magazine/index.html"] = paginaEdicion(vigente, comun, { vigente: true });
  const dia = (iso) => new Date(iso).toISOString().slice(0, 10);
  const rutas = vigente ? [[`${BASE}/ediciones/`, dia(vigente.publicadaEn), "0.6"], ...publicadas.slice().sort((a, b) => a.numero - b.numero).map((e) => [`${BASE}/${e.slug}/`, dia(e.publicadaEn), "0.7"])] : [];
  files["sitemap.xml"] = sitemapEdiciones(sitemap, rutas);
  return files;
}

/* Páginas de ediciones que existen en el sitio pero ya no corresponden a una publicada */
export function retiradas(ediciones, root = ROOT) {
  const dir = join(root, "magazine");
  if (!existsSync(dir)) return [];
  const pub = new Set(ediciones.filter((e) => e.estado === "publicada").map((e) => e.slug));
  return readdirSync(dir).filter((d) => SLUG_RE.test(d) && !pub.has(d));
}

/* Reescribe js/ediciones.js conservando su encabezado */
function guardarEdiciones(ediciones, root) {
  const ruta = join(root, "js/ediciones.js");
  const src = readFileSync(ruta, "utf8");
  const i = src.indexOf("const EDICIONES = ");
  if (i < 0) throw new Error("js/ediciones.js: no se encontró «const EDICIONES = »");
  writeFileSync(ruta, `${src.slice(0, i)}const EDICIONES = ${JSON.stringify(ediciones, null, 2)};\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3) || null;
  const { ediciones, fuentes } = cargar();

  const aCongelar = arg("congelar");
  if (aCongelar) {
    const i = ediciones.findIndex((e) => e.slug === aCongelar);
    if (i < 0) throw new Error(`No existe la edición ${aCongelar}`);
    ediciones[i] = congelar(ediciones[i], fuentes, { correccion: arg("correccion") });
    guardarEdiciones(ediciones, ROOT);
    console.log(`congelada ${aCongelar} (huella ${ediciones[i].huella.slice(0, 12)}…)`);
  }

  const dirBorradores = arg("borradores");
  if (dirBorradores) {
    const destino = resolve(dirBorradores);
    const rel = relative(ROOT, destino);
    if (!rel.startsWith("..") && !isAbsolute(rel)) throw new Error("La vista previa de borradores debe escribirse FUERA del proyecto, nunca dentro del sitio");
    const comun = chrome(ROOT);
    for (const ed of ediciones.filter((e) => e.estado === "borrador")) {
      const vista = congelar({ ...ed, huella: null }, fuentes);
      mkdirSync(join(destino, ed.slug), { recursive: true });
      writeFileSync(join(destino, ed.slug, "index.html"), paginaEdicion(vista, comun, { borrador: true }));
      console.log(`vista previa del borrador ${ed.slug}: ${join(destino, ed.slug, "index.html")}`);
    }
  }

  const CHECK = process.argv.includes("--check");
  const aRetirar = arg("retirar");
  const files = render(ediciones);
  const problemas = [];
  for (const [nombre, contenido] of Object.entries(files)) {
    const ruta = join(ROOT, nombre);
    const actual = existsSync(ruta) ? readFileSync(ruta, "utf8") : null;
    if (actual === contenido) continue;
    if (CHECK) problemas.push(`desactualizado: ${nombre}`);
    else {
      mkdirSync(dirname(ruta), { recursive: true });
      writeFileSync(ruta, contenido);
      console.log(`escrito  ${nombre}`);
    }
  }
  for (const slug of retiradas(ediciones)) {
    if (!CHECK && aRetirar === slug) {
      rmSync(join(ROOT, "magazine", slug), { recursive: true });
      console.log(`retirada magazine/${slug}/`);
    } else problemas.push(`la edición publicada ${slug} tiene página pero ya no figura como publicada en js/ediciones.js (si es intencional: --retirar=${slug})`);
  }
  if (!files["magazine/index.html"] && existsSync(join(ROOT, "magazine/index.html"))) problemas.push("magazine/index.html existe pero no hay ninguna edición publicada");
  if (problemas.length) {
    console.error(problemas.map((p) => `✗ ${p}`).join("\n"));
    process.exit(1);
  }
  console.log(`${Object.keys(files).length} archivo(s) de ediciones al día.`);
}
