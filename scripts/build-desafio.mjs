#!/usr/bin/env node
/*
  build-desafio.mjs — Páginas estáticas de «Desafío 100 Empresas»
  ======================================================================
  Escribe, a partir de la fuente única js/desafio-datos.js:

    desafio-100-empresas/index.html                  → /desafio-100-empresas/
    desafio-100-empresas/<edicion>/index.html        → /desafio-100-empresas/calgary/
    desafio-100-empresas/<edicion>/entrevistas.html  → …/calgary/entrevistas
    desafio-100-empresas/<edicion>/<ep-NN-slug>.html → …/calgary/ep-03-carlos-d-castillo
    desafio-100-empresas/<edicion>/muro.html         → …/calgary/muro

  y el bloque del Desafío en sitemap.xml (entre comentarios marcadores).

  Una edición nueva (otra ciudad) solo necesita su entrada en
  `ediciones` y sus episodios y participantes con `edicion: "<id>"`:
  este script genera sus páginas con las mismas plantillas. Solo se
  generan las ediciones con estado "en-curso" o "completada"; las demás
  aparecen en la portada del programa como «En evaluación».

  Contadores: nunca se escriben a mano. Se calculan con resumen() de
  js/desafio-datos.js. Si el conteo de la edición es "provisional", las
  páginas lo dicen junto a la cifra.

  Cabecera y pie: se copian de 404.html (rutas absolutas), como en
  Canadá en Datos. El video usa el componente del portal
  (js/video-cover.js): la página no contacta a YouTube hasta pulsar.

  USO (sin dependencias, Node 18+):
    node scripts/build-desafio.mjs           genera / actualiza
    node scripts/build-desafio.mjs --check   solo verifica (pruebas)
*/

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://podcastdelmigrante.com";
const BASE = "/desafio-100-empresas";
const OUT_DIR = join(ROOT, "desafio-100-empresas");
const CHECK = process.argv.includes("--check");
const IMAGEN_SOCIAL = "/assets/desafio-100-empresas/social-desafio.jpg";
const SITEMAP_INI = "  <!-- desafio-100-empresas: generado por scripts/build-desafio.mjs -->";
const SITEMAP_FIN = "  <!-- /desafio-100-empresas -->";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dos = (n) => String(n).padStart(2, "0");
const fechaLarga = (iso) => new Intl.DateTimeFormat("es-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));

export function loadData(root = ROOT) {
  const req = createRequire(join(root, "package.json"));
  const ruta = join(root, "js/desafio-datos.js");
  delete req.cache[ruta];
  return req(ruta);
}

function cargarVideoCover(root) {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(join(root, "js/video-cover.js"), "utf8"), ctx);
  return ctx.window.VideoCover;
}

function cargarHistorias(root) {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(join(root, "js/desafio-stories.js"), "utf8") + ";globalThis.__S=DESAFIO_STORIES;", ctx);
  return ctx.__S;
}

/* ---------- Cabecera y pie compartidos (de 404.html) ---------- */
function chrome(root) {
  const html = readFileSync(join(root, "404.html"), "utf8");
  const ini = html.indexOf('<a class="skip-link"');
  const finCab = html.indexOf('<main id="main">');
  const iniPie = html.indexOf("<!-- ================= FOOTER");
  const finPie = html.indexOf("</footer>") + "</footer>".length;
  if (ini < 0 || finCab < 0 || iniPie < 0 || finPie < 9) throw new Error("404.html cambió: no se encontró la cabecera o el pie");
  return { cabecera: html.slice(ini, finCab).trimEnd(), pie: html.slice(iniPie, finPie) };
}

function head({ title, description, path, image, jsonLd }) {
  const url = SITE + path;
  const img = image || { src: IMAGEN_SOCIAL, w: 1200, h: 630, alt: "Desafío 100 Empresas — 100 empresarios. 100 historias. Un legado." };
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="El Podcast del Migrante Magazine">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${img.src}">
<meta property="og:image:secure_url" content="${SITE}${img.src}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${img.w}">
<meta property="og:image:height" content="${img.h}">
<meta property="og:image:alt" content="${esc(img.alt)}">
<meta property="og:locale" content="es_CA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}${img.src}">
<meta name="twitter:image:alt" content="${esc(img.alt)}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/favicon.png">
<!-- Tipografías alojadas en el sitio (sin conexión a Google Fonts) -->
<link rel="preload" href="/assets/fonts/public-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/desafio.css">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
</head>`;
}

function migas(items) {
  const partes = items.map(([texto, href]) => (href ? `<a href="${href}">${esc(texto)}</a>` : `<span aria-current="page">${esc(texto)}</span>`));
  return `<nav class="dz-migas" aria-label="Ruta de navegación">${partes.join('<span aria-hidden="true">›</span>')}</nav>`;
}

function breadcrumbLd(items) {
  return { "@type": "BreadcrumbList", itemListElement: items.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + (href || items.at(-1)[2]) })) };
}

function pagina(c, { title, description, path, image, jsonLd, cuerpo, video = false }) {
  return `${head({ title, description, path, image, jsonLd })}
<body>
${c.cabecera}
<main id="main">
${cuerpo}
</main>

${c.pie}

<script>window.PDM_SITE_ROOT_LINKS = true;</script>
<script src="/js/data.js"></script>
<script src="/js/nav.js"></script>
<script>document.addEventListener("DOMContentLoaded", () => window.PDM && window.PDM.initSiteChrome && window.PDM.initSiteChrome());</script>
${video ? '<script src="/js/video-cover.js"></script>\n' : ""}<script src="/js/desafio-seccion.js"></script>
</body>
</html>
`;
}

/* ---------- Piezas ---------- */
const PLAY = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';
const PIN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

function portadaPropia(e) {
  return `<div class="dz-portada" data-ep="${dos(e.ep)}" aria-hidden="true">
        <span class="dz-portada__kicker">Desafío 100 Empresas · EP ${dos(e.ep)}</span>
        <span class="dz-portada__nombre">${esc(e.persona)}</span>
        <span class="dz-portada__empresa">${esc(e.empresa || e.categoriaTexto)} · ${esc(e.ciudad)}</span>
      </div>`;
}

function anillo(valor, total) {
  const r = 54;
  const c = 2 * Math.PI * r;
  return `<svg class="dz-anillo" viewBox="0 0 132 132" width="132" height="132" aria-hidden="true">
            <circle class="fondo" cx="66" cy="66" r="${r}"/>
            <circle class="avance" cx="66" cy="66" r="${r}" stroke-dasharray="${((c * valor) / total).toFixed(1)} ${c.toFixed(1)}"/>
            <text x="66" y="66" text-anchor="middle" dominant-baseline="central" font-size="30">${Math.round((100 * valor) / total)}%</text>
          </svg>`;
}

function sello(ed) {
  const fecha = fechaLarga(ed.verificacion.fecha);
  if (ed.conteo && ed.conteo.estado === "provisional") {
    return `<span class="dz-sello dz-sello--provisional">Cifra provisional · revisada el ${esc(fecha)}</span>`;
  }
  return `<span class="dz-sello"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>Verificado el ${esc(fecha)}</span>`;
}

function notaConteo(ed, r) {
  const prov = ed.conteo && ed.conteo.estado === "provisional"
    ? ` La cifra es provisional mientras terminamos de revisar ${r.enVerificacion === 1 ? "una historia que podría estar repetida" : "historias que podrían estar repetidas"}.`
    : "";
  return `Contamos historias empresariales únicas: una empresa con varios episodios cuenta una sola vez, y solo cuentan las historias con video público en el canal oficial.${prov}`;
}

function contador(ed, r, enlace) {
  return `<aside class="dz-contador" aria-labelledby="dz-contador-titulo">
        <h2 class="dz-kicker" id="dz-contador-titulo">Avance hacia las ${r.meta} historias</h2>
        <div class="dz-contador__top">
          ${anillo(r.historiasPublicadas, r.meta)}
          <div>
            <p class="dz-cifra" data-dz-cifra="historias">${r.historiasPublicadas} <small>/ ${r.meta}</small></p>
            <p class="dz-cifra-label">historias empresariales publicadas</p>
            ${sello(ed)}
          </div>
        </div>
        <p class="dz-nota dz-contador__pie">${esc(notaConteo(ed, r))} <a href="${enlace}">Compruébalo en la lista</a>.</p>
      </aside>`;
}

function insignias(d, e) {
  const h = d.historia(e.historia);
  const out = [];
  if (h.episodios.length > 1) out.push(`<span class="dz-insignia dz-insignia--gris">Misma historia que ${h.episodios.filter((n) => n !== e.ep).map((n) => `EP ${dos(n)}`).join(", ")}</span>`);
  if (d.perfilDe(e)) out.push('<span class="dz-insignia">Perfil en el Directorio</span>');
  return out.length ? `<div class="dz-card-pie">${out.join("")}</div>` : "";
}

function tarjeta(d, e, VC) {
  const media = e.portadaPropia
    ? portadaPropia(e)
    : `<img src="${VC.thumb(e.videoId)}" alt="" loading="lazy" decoding="async" width="1280" height="720">`;
  return `<a class="desafio-card" href="${d.url(e)}" data-categoria="${esc(e.categoria)}">
      <div class="desafio-card__media">
        ${media}
        <span class="desafio-card__play" aria-hidden="true">${PLAY}</span>
        <span class="desafio-card__pending">EP ${dos(e.ep)}</span>
      </div>
      <div class="desafio-card__body">
        <span class="tag tag--sm">${esc(e.categoriaTexto)}</span>
        <h3 class="desafio-card__title">${esc(e.titulo)}</h3>
        <p class="byline">${esc(e.persona)}${e.empresa ? ` · ${esc(e.empresa)}` : ""}</p>
        <span class="dz-lugar">${PIN}${esc(e.ciudad)}</span>
        ${insignias(d, e)}
      </div>
    </a>`;
}

function persona(d, p) {
  const h = d.historia(p.historia);
  const pub = h.estado === "publicada";
  const eps = d.episodiosDe(p.historia);
  /* El enlace va al episodio de la propia persona; si no lo hay, al primero de su historia */
  const palabras = new Set(slug(p.nombre).split("-"));
  const propio = eps.length ? eps.slice().sort((a, b) => coincidencias(palabras, b) - coincidencias(palabras, a) || a.ep - b.ep)[0] : null;
  const texto = `${p.nombre} ${p.empresa || ""} ${p.ciudad}`.toLowerCase();
  return `<article class="dz-persona${pub ? " dz-persona--pub" : ""}${p.muro ? "" : " dz-persona--sin-num"}" data-estado="${pub ? "publicada" : "confirmado"}" data-texto="${esc(texto)}">
        ${p.muro ? `<span class="dz-persona__num" aria-label="Número ${p.muro}">${p.muro}</span>` : ""}
        <h3 class="dz-persona__nombre">${esc(p.nombre)}</h3>
        <p class="dz-persona__empresa">${esc(p.empresa || "Empresa por confirmar")}</p>
        <p class="dz-persona__meta"><span class="dz-lugar">${PIN}${esc(p.ciudad)}, ${esc(p.provincia)}</span>${pub ? '<span class="dz-estado dz-estado--pub">Historia publicada</span>' : '<span class="dz-estado">Confirmado</span>'}${propio && pub ? `<a class="dz-persona__ver" href="${d.url(propio)}">Ver EP ${dos(propio.ep)}<span class="sr-only">: ${esc(p.nombre)}</span></a>` : ""}</p>
      </article>`;
}

function slug(s) {
  return String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function coincidencias(palabras, e) {
  return slug(e.persona).split("-").filter((w) => palabras.has(w)).length;
}

function mosaico(r) {
  let celdas = "";
  for (let i = 0; i < r.meta; i++) celdas += i < r.historiasPublicadas ? '<i class="pub"></i>' : "<i></i>";
  return `<div class="dz-mosaico" role="img" aria-label="${r.historiasPublicadas} de ${r.meta} historias publicadas">${celdas}</div>
    <p class="dz-leyenda"><span><i class="pub"></i>Historia publicada (${r.historiasPublicadas})</span><span><i></i>Por completar (${r.meta - r.historiasPublicadas})</span></p>`;
}

function cifras(ed, r, base) {
  const grabadas = ed.grabadas == null ? "" : `
      <div class="dz-stat"><b>${ed.grabadas}</b><span>Entrevistas grabadas</span><p>Incluye las publicadas. ${ed.grabadas - r.episodiosPublicados} en edición.</p></div>`;
  return `<div class="dz-cifras">
      <div class="dz-stat dz-stat--principal"><b>${r.historiasPublicadas}</b><span>Historias empresariales publicadas</span><p>Historias únicas con video público. Es la cifra del contador${ed.conteo && ed.conteo.estado === "provisional" ? " (provisional)" : ""}.</p></div>
      <div class="dz-stat"><b>${r.episodiosPublicados}</b><span>Episodios publicados</span><p>Algunas historias tienen más de un episodio.</p></div>${grabadas}
      <div class="dz-stat"><b>${r.participantes}</b><span>Empresarios confirmados en el Muro</span><p>Incluye a quienes aún no tienen su historia publicada. <a href="${base}/muro">Ver el Muro del Legado</a>.</p></div>
    </div>`;
}

const PASOS = [
  ["Identificar", "Conocemos a empresarios latinos y confirmamos su participación gratuita."],
  ["Entrevistar", "Cada empresario comparte su historia, su empresa, sus aprendizajes y su visión de futuro."],
  ["Visibilizar", "Publicamos el episodio en el canal y las plataformas de El Podcast del Migrante."],
  ["Conectar", "Encuentros empresariales para crear redes y nuevas oportunidades de colaboración."],
  ["Reunir", "Espacios de encuentro con organizaciones aliadas y la comunidad latina."],
  ["Documentar", "Las 100 historias se reunirán en una obra editorial."],
  ["Medir", "Evaluamos resultados y aprendizajes para guiar las próximas ediciones."],
];

/* ---------- Contexto de datos ---------- */
function contexto(api, edicionId, VC, historiasEditoriales) {
  const D = api.DATOS;
  const ed = D.ediciones.find((e) => e.id === edicionId);
  const programa = D.programas.find((p) => p.id === ed.programa);
  const r = api.resumen(edicionId);
  const enEd = (x) => (x.edicion || "calgary") === edicionId;
  const episodios = D.episodios.filter(enEd).slice().sort((a, b) => a.ep - b.ep);
  const participantes = D.participantes.filter(enEd);
  const base = `${BASE}/${ed.id}`;
  const d = {
    D, ed, programa, r, base, episodios, participantes, VC,
    url: (e) => `${base}/${e.slug}`,
    historia: (id) => D.historias.find((h) => h.id === id),
    episodiosDe: (id) => episodios.filter((e) => e.historia === id),
    personasDe: (id) => participantes.filter((p) => p.historia === id),
    perfilDe: (e) => participantes.find((p) => p.historia === e.historia && p.businessSlug && slug(p.nombre).split("-").some((w) => slug(e.persona).includes(w))),
    historiaEditorial: (e) => historiasEditoriales.find((s) => s.slug === e.storySlug),
  };
  return d;
}

/* ---------- Portada del programa ---------- */
function paginaPrograma(api, c, VC, historias) {
  const D = api.DATOS;
  const prog = D.programas[0];
  const activas = D.ediciones.filter((e) => e.estado === "en-curso" || e.estado === "completada");
  const ed = activas[0];
  const d = contexto(api, ed.id, VC, historias);
  const r = d.r;
  const ciudades = [...new Set(d.participantes.map((p) => p.ciudad))].sort((a, b) => (a === ed.ciudad ? -1 : b === ed.ciudad ? 1 : a.localeCompare(b, "es")));
  const recientes = d.episodios.slice().sort((a, b) => b.ep - a.ep).slice(0, 3);
  const path = `${BASE}/`;
  const items = [["Inicio", "/"], [prog.nombre, null, path]];
  const ediciones = D.ediciones.map((e) => {
    const re = api.resumen(e.id);
    return `<a class="dz-edicion dz-edicion--activa" href="${BASE}/${e.id}/"><span class="tag tag--sm">${e.estado === "completada" ? "Completada" : "En curso"}</span><h3>${esc(e.ciudad)} · ${e.numero === 1 ? "Primera edición" : `Edición ${e.numero}`}</h3><p>${re.historiasPublicadas} de ${re.meta} historias publicadas${e.conteo && e.conteo.estado === "provisional" ? " (cifra provisional)" : ""}.</p><div class="dz-barra"><span style="width:${Math.round((100 * re.historiasPublicadas) / re.meta)}%"></span></div></a>`;
  }).join("\n      ");
  const cuerpo = `
<section class="dz-hero">
  <div class="wrap">
    ${migas(items)}
    <div class="dz-hero__grid">
      <div>
        <p class="dz-kicker">${esc(prog.nombre)} · El Podcast del Migrante</p>
        <h1>100 empresarios. 100 historias. <em>Un legado.</em></h1>
        <p class="dz-lead">Documentamos 100 historias empresariales de latinos que construyen negocios en Canadá: sus decisiones, sus aprendizajes y el legado que dejan a la comunidad. La primera edición nació en ${esc(ed.ciudad)}.</p>
        <div class="dz-ctas"><a class="btn" href="${d.base}/">Ir a la edición ${esc(ed.ciudad)}</a><a class="dz-boton-borde" href="${d.base}/entrevistas">Ver las entrevistas</a></div>
      </div>
      ${contador(ed, r, `${d.base}/entrevistas`)}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="dz-que-es" style="border-top:0">
  <div class="wrap dz-dos">
    <div>
      <p class="dz-kicker">El Desafío</p>
      <h2 class="section-title" id="dz-que-es" style="margin:8px 0 18px">Documentamos el legado de una generación de emprendedores</h2>
      <blockquote class="dz-cita">«No estamos documentando empresas. Estamos documentando el legado de una generación de emprendedores.»<cite>Nelson Vahos — CEO, eRadio Global Corp.</cite></blockquote>
    </div>
    <div class="dz-texto">
      <p>El Desafío 100 Empresas recorre el camino de los empresarios latinos que eligieron Canadá para construir su sueño. Cada historia se graba en formato audiovisual y quedará reunida en una obra editorial.</p>
      <p>La participación no tiene costo para el empresario. La intención no es cobrar por contar una historia, sino fortalecer la confianza, la visibilidad y la capacidad comercial de quienes están construyendo empresa en Canadá.</p>
      <p>La primera edición comenzó en ${esc(ed.ciudad)} y también reúne a empresarios de otras localidades, cada uno con su ciudad real.</p>
      <div class="dz-ciudades">${ciudades.map((x) => `<span class="tag tag--sm">${esc(x)}</span>`).join("")}</div>
    </div>
  </div>
</section>

<section class="section dz-alt" aria-labelledby="dz-recientes">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title" id="dz-recientes">Entrevistas más recientes</h2><a class="section-link" href="${d.base}/entrevistas">Ver las ${r.episodiosPublicados} entrevistas</a></div>
    <div class="desafio-grid">
    ${recientes.map((e) => tarjeta(d, e, VC)).join("\n    ")}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="dz-como">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title" id="dz-como">Cómo funciona</h2></div>
    <div class="dz-pasos">
      ${PASOS.map(([t, p]) => `<div class="dz-paso"><b>${t}</b><p>${p}</p></div>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="section dz-alt" aria-labelledby="dz-ediciones">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title" id="dz-ediciones">Ediciones</h2></div>
    <div class="dz-ediciones">
      ${ediciones}
      <div class="dz-edicion"><span class="tag tag--sm">En evaluación</span><h3>Nuevas ciudades</h3><p>Otras ciudades de Alberta y de Canadá. Se anunciarán cuando estén confirmadas.</p></div>
      <div class="dz-edicion"><span class="tag tag--sm">En evaluación</span><h3>Nuevos desafíos</h3><p>La misma metodología podrá aplicarse a otros programas de El Podcast del Migrante.</p></div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="dz-libro">
  <div class="wrap dz-libro">
    <div class="dz-libro-portada" aria-hidden="true"><small>Desafío 100 Empresas</small><b>El libro de las 100 historias</b><small>Próximamente</small></div>
    <div>
      <span class="dz-proximamente">Próximamente</span>
      <h2 class="section-title" id="dz-libro" style="margin:12px 0 14px">El libro del Desafío</h2>
      <div class="dz-texto"><p>Las 100 historias del Desafío se reunirán en una obra editorial: un registro de la generación de empresarios latinos que eligió Canadá para construir su futuro.</p></div>
      <p class="dz-nota">El título, la fecha y los canales de publicación se anunciarán cuando estén confirmados.</p>
    </div>
  </div>
</section>

<section class="section dz-alt" aria-labelledby="dz-equipo">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title" id="dz-equipo">Equipo del proyecto</h2></div>
    <div class="dz-equipo">
      <div class="dz-miembro"><small>Dirección general y producción audiovisual</small><b>Nelson Vahos</b><p>Concepto y dirección general · Conducción de entrevistas · Producción audiovisual</p></div>
      <div class="dz-miembro"><small>Dirección editorial</small><b>Alejandro Rey</b><p>Línea editorial · Construcción narrativa · Documentación de historias empresariales</p></div>
      <div class="dz-miembro"><small>Dirección administrativa y operativa</small><b>Marcela Alvarado</b><p>Gestión administrativa · Coordinación · Relaciones con empresarios y aliados</p></div>
    </div>
    <p class="dz-creditos"><span><strong>Producción:</strong> El Podcast del Migrante</span><span><strong>Desarrollado por:</strong> eRadio Global Corp.</span></p>
  </div>
</section>

<section class="section dz-faq" aria-labelledby="dz-faq">
  <div class="wrap" style="max-width:900px">
    <h2 class="section-title" id="dz-faq" style="margin-bottom:8px">Preguntas frecuentes</h2>
    <details open><summary>¿Quién puede participar?</summary><p>Empresarios y emprendedores de origen latino con un negocio en Canadá: una empresa establecida, una startup o un proyecto en etapa temprana. La primera edición comenzó en ${esc(ed.ciudad)} y también recibe a empresarios de otras localidades.</p></details>
    <details><summary>¿Cuánto cuesta participar?</summary><p>Nada. La participación no tiene costo para el empresario seleccionado.</p></details>
    <details><summary>¿Qué cuenta el contador de las 100 historias?</summary><p>Historias empresariales únicas con video público. Si una empresa aparece en varios episodios, o varias personas de la misma empresa participan en una entrevista, cuenta una sola vez.</p></details>
    <details><summary>¿Dónde se publican las entrevistas?</summary><p>En el canal de YouTube de El Podcast del Migrante y en esta sección del Magazine, donde cada entrevista tiene su propia página.</p></details>
    <details><summary>¿Cuándo estará disponible el libro?</summary><p>Próximamente. Anunciaremos el título, la fecha y los canales de publicación cuando estén confirmados.</p></details>
  </div>
</section>
${cta()}`;
  return pagina(c, {
    title: `${prog.nombre} — El Podcast del Migrante Magazine`,
    description: "100 empresarios. 100 historias. Un legado. Entrevistas a empresarios latinos que construyen negocios en Canadá: El Podcast del Migrante documenta 100 historias empresariales.",
    path,
    jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: prog.nombre, description: prog.lema, url: SITE + path, inLanguage: "es", publisher: { "@type": "Organization", name: "eRadio Global Corp." }, breadcrumb: breadcrumbLd(items) },
    cuerpo,
  });
}

function cta() {
  return `
<section class="section dz-cta" id="participa" aria-labelledby="dz-participa">
  <div class="wrap">
    <h2 id="dz-participa">¿Tu historia merece estar entre las 100?</h2>
    <p class="dz-lead" style="margin-top:10px">Si eres empresario latino, escríbenos y el equipo editorial se pondrá en contacto contigo.</p>
    <div class="dz-ctas"><a class="btn" href="mailto:podcastdelmigrante@gmail.com?subject=Desaf%C3%ADo%20100%20Empresas">Quiero ser uno de los 100</a><a class="dz-boton-borde" href="mailto:podcastdelmigrante@gmail.com?subject=Alianzas%20Desaf%C3%ADo%20100%20Empresas">Alianzas para organizaciones</a></div>
  </div>
</section>`;
}

/* ---------- Edición ---------- */
function nombreEdicion(d) {
  return `${d.ed.ciudad} · ${d.ed.numero === 1 ? "Primera edición" : `Edición ${d.ed.numero}`}`;
}

function paginaEdicion(d, c) {
  const { ed, r, base, VC } = d;
  const path = `${base}/`;
  const items = [["Inicio", "/"], [d.programa.nombre, `${BASE}/`], [ed.ciudad, null, path]];
  const ciudades = [...new Set(d.participantes.map((p) => p.ciudad))].filter((x) => x !== ed.ciudad).sort((a, b) => a.localeCompare(b, "es"));
  const recientes = d.episodios.slice().sort((a, b) => b.ep - a.ep).slice(0, 6);
  const perfiles = d.participantes.filter((p) => p.businessSlug);
  const directorio = perfiles.length
    ? perfiles.map((p) => {
        const e = d.episodiosDe(p.historia)[0];
        return `<div class="dz-perfil"><img src="/assets/${esc(p.businessSlug)}-logo.jpg" alt="Logotipo de ${esc(p.empresa)}" width="72" height="72" loading="lazy"><div><h3>${esc(p.nombre)}</h3><p>${esc(p.empresa)} · ${esc(p.ciudad)}${e ? ` · EP ${dos(e.ep)}` : ""}</p><a href="/perfil-${esc(p.businessSlug)}.html">Ver perfil en el Directorio →</a></div></div>`;
      }).join("\n      ")
    : "";
  const cuerpo = `
<section class="dz-hero">
  <div class="wrap">
    ${migas(items)}
    <div class="dz-hero__grid">
      <div>
        <p class="dz-kicker">${esc(ed.nombre)} · ${ed.numero === 1 ? "Primera edición" : `Edición ${ed.numero}`}</p>
        <h1>100 empresarios. 100 historias. <em>Un legado.</em></h1>
        <p class="dz-lead">La primera edición del Desafío 100 Empresas comenzó en ${esc(ed.ciudad)}. Aquí están sus entrevistas y el Muro del Legado, con empresarios de ${esc(ed.ciudad)}${ciudades.length ? ` y de ${esc(ciudades.slice(0, -1).join(", "))}${ciudades.length > 1 ? " y " : ""}${esc(ciudades.at(-1))}` : ""}.</p>
        <div class="dz-ctas"><a class="btn" href="${base}/entrevistas">Ver las entrevistas</a><a class="dz-boton-borde" href="${base}/muro">Muro del Legado</a></div>
      </div>
      ${contador(ed, r, `${base}/entrevistas`)}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="dz-avance" style="border-top:0">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title" id="dz-avance">Las 100 historias de la edición</h2></div>
    ${cifras(ed, r, base)}
    ${mosaico(r)}
  </div>
</section>

<section class="section dz-alt" aria-labelledby="dz-recientes">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title" id="dz-recientes">Entrevistas más recientes</h2><a class="section-link" href="${base}/entrevistas">Ver las ${r.episodiosPublicados} entrevistas</a></div>
    <div class="desafio-grid">
    ${recientes.map((e) => tarjeta(d, e, VC)).join("\n    ")}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="dz-muro">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title" id="dz-muro">Muro del Legado</h2><a class="section-link" href="${base}/muro">Ver los ${r.participantes} empresarios</a></div>
    <p class="dz-nota" style="margin:-10px 0 16px">Cada empresario que se suma al Desafío queda en el Muro, con su ciudad real. Sin datos de contacto: quien lo autorice tiene su perfil en el Directorio Empresarial.</p>
    <div class="dz-muro dz-muro--avance">
      ${d.participantes.slice(0, 8).map((p) => persona(d, p)).join("\n      ")}
    </div>
    <div class="dz-mas"><a class="dz-boton-borde" href="${base}/muro">Ver el Muro completo</a></div>
  </div>
</section>
${directorio ? `
<section class="section dz-alt" aria-labelledby="dz-directorio">
  <div class="wrap dz-dos">
    <div>
      <h2 class="section-title" id="dz-directorio" style="margin-bottom:12px">Conoce sus empresas en el Directorio</h2>
      <div class="dz-texto"><p>Los participantes que lo autorizan tienen un perfil en el Directorio Empresarial de El Podcast del Migrante, con sus servicios y la forma de contactarlos. Cada perfil enlaza a su entrevista y cada entrevista, a su perfil.</p></div>
    </div>
    <div class="dz-lateral">
      ${directorio}
    </div>
  </div>
</section>` : ""}
${cta()}`;
  return pagina(c, {
    title: `${ed.nombre}: entrevistas y Muro del Legado — El Podcast del Migrante`,
    description: `Primera edición del Desafío 100 Empresas: ${r.historiasPublicadas} de 100 historias empresariales publicadas, entrevistas en video y el Muro del Legado de empresarios latinos.`,
    path,
    jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: ed.nombre, url: SITE + path, inLanguage: "es", isPartOf: { "@type": "CollectionPage", name: d.programa.nombre, url: `${SITE}${BASE}/` }, breadcrumb: breadcrumbLd(items) },
    cuerpo,
  });
}

/* ---------- Archivo de entrevistas ---------- */
function paginaEntrevistas(d, c) {
  const { ed, r, base, VC } = d;
  const path = `${base}/entrevistas`;
  const items = [["Inicio", "/"], [d.programa.nombre, `${BASE}/`], [ed.ciudad, `${base}/`], ["Entrevistas", null, path]];
  const cats = {};
  for (const e of d.episodios) cats[e.categoria] = cats[e.categoria] || { n: 0, texto: CATEGORIAS[e.categoria] || e.categoriaTexto };
  for (const e of d.episodios) cats[e.categoria].n++;
  const filtros = `<button class="dz-filtro" type="button" data-dz-categoria="todas" aria-pressed="true">Todas (${d.episodios.length})</button>` +
    Object.entries(cats).sort((a, b) => b[1].n - a[1].n || a[1].texto.localeCompare(b[1].texto, "es")).map(([k, v]) => `<button class="dz-filtro" type="button" data-dz-categoria="${esc(k)}" aria-pressed="false">${esc(v.texto)} (${v.n})</button>`).join("");
  const cuerpo = `
<div class="wrap">${migas(items)}</div>
<section class="section" aria-labelledby="dz-titulo" style="border-top:0;padding-top:22px">
  <div class="wrap">
    <p class="dz-kicker">${esc(ed.nombre)}</p>
    <h1 class="dz-titulo-pagina" id="dz-titulo">Entrevistas</h1>
    <p class="dz-lead">Las ${r.episodiosPublicados} entrevistas publicadas de la edición, de la más reciente a la primera. Forman ${r.historiasPublicadas} historias empresariales: algunas empresas tienen más de un episodio.</p>
    <div class="dz-filtros" role="group" aria-label="Filtrar por categoría" style="margin-top:22px">${filtros}</div>
    <div class="desafio-grid" id="dzRejilla">
    ${d.episodios.slice().sort((a, b) => b.ep - a.ep).map((e) => tarjeta(d, e, VC)).join("\n    ")}
    </div>
  </div>
</section>`;
  return pagina(c, {
    title: `Entrevistas del ${ed.nombre} — El Podcast del Migrante`,
    description: `Las ${r.episodiosPublicados} entrevistas en video del ${ed.nombre}: empresarios latinos cuentan cómo construyeron sus negocios en Canadá.`,
    path,
    jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: `Entrevistas del ${ed.nombre}`, url: SITE + path, inLanguage: "es", breadcrumb: breadcrumbLd(items) },
    cuerpo,
  });
}

const CATEGORIAS = { servicios: "Servicios", finanzas: "Finanzas", salud: "Salud", alimentos: "Alimentos", belleza: "Belleza", inmigracion: "Inmigración", comunidad: "Comunidad", moda: "Moda" };

/* ---------- Entrevista individual ---------- */
function reproductor(e, VC) {
  if (!e.portadaPropia) return VC.html({ id: e.videoId, title: e.titulo, playLabel: "Reproducir la entrevista" });
  return `
      <div class="article-video__frame article-video__frame--cover" data-video-id="${esc(e.videoId)}" data-video-title="${esc(e.titulo)}">
        ${portadaPropia(e)}
        <button type="button" class="article-video__play" data-video-play>
          <span class="article-video__play-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30"><polygon points="8,5 19,12 8,19" fill="currentColor"/></svg>
          </span>
          <span class="article-video__play-label">Reproducir la entrevista<span class="sr-only">: ${esc(e.titulo)}</span></span>
          ${VC.noteHtml()}
        </button>
      </div>`;
}

function paginaEpisodio(d, c, e, i) {
  const { ed, r, base, VC } = d;
  const path = d.url(e);
  const h = d.historia(e.historia);
  const personas = d.personasDe(e.historia);
  const story = d.historiaEditorial(e);
  const perfil = d.perfilDe(e);
  const ant = d.episodios[i - 1];
  const sig = d.episodios[i + 1];
  const items = [["Inicio", "/"], [d.programa.nombre, `${BASE}/`], [ed.ciudad, `${base}/`], [`EP ${dos(e.ep)}`, null, path]];
  const lugar = `${e.ciudad}, ${e.provincia}`;
  /* Resumen: historia editorial del portal, frase destacada o una presentación neutra (nunca comillas vacías) */
  let resumen;
  if (story) {
    resumen = story.bodyHtml.trim();
  } else if (e.frase) {
    resumen = `<blockquote class="dz-frase">«${esc(e.frase.replace(/^[«"“]+|[»"”]+$/g, ""))}»</blockquote>
        <p>En el episodio ${e.ep} del ${esc(ed.nombre)} conversamos con ${esc(e.persona)}${e.empresa ? `, de ${esc(e.empresa)}` : ""} (${esc(lugar)}).</p>`;
  } else {
    resumen = `<p>En el episodio ${e.ep} del ${esc(ed.nombre)} conversamos con ${esc(e.persona)}${e.empresa ? `, de ${esc(e.empresa)}` : ""} (${esc(lugar)}), sobre su camino como emprendedor en Canadá. Mira la entrevista completa en video.</p>`;
  }
  const aviso = story && story.disclaimer ? `<p class="dz-aviso">${esc(story.disclaimer)}</p>` : "";
  const historiaFila = h.episodios.length > 1
    ? `${esc(h.empresa)}: ${h.episodios.length} episodios (${h.episodios.map((n) => `EP ${dos(n)}`).join(", ")}); cuenta como 1 de las ${r.meta}`
    : `1 de las ${r.meta}`;
  const muro = personas.filter((p) => p.muro).map((p) => `N.º ${p.muro}`).join(", ");
  const cajaEmpresario = perfil
    ? `<div class="dz-perfil" style="border:0;padding:0"><img src="/assets/${esc(perfil.businessSlug)}-logo.jpg" alt="Logotipo de ${esc(perfil.empresa)}" width="72" height="72"><div><h3>${esc(e.persona)}</h3><p>${esc(e.empresa || "")} · ${esc(e.ciudad)}</p><a href="/perfil-${esc(perfil.businessSlug)}.html">Ver perfil en el Directorio →</a></div></div>`
    : `<h3>${esc(e.persona)}</h3><p class="dz-nota" style="margin-top:4px">${esc(e.empresa || e.categoriaTexto)}</p><span class="dz-lugar">${PIN}${esc(lugar)}</span>`;
  const enlaces = [
    `<a class="dz-boton-borde" href="https://www.youtube.com/watch?v=${esc(e.videoId)}" target="_blank" rel="noopener">Ver en YouTube</a>`,
    story ? `<a class="dz-boton-borde" href="/historia.html?slug=${esc(story.slug)}">Leer la historia</a>` : "",
    perfil ? `<a class="dz-boton-borde" href="/perfil-${esc(perfil.businessSlug)}.html">Perfil en el Directorio</a>` : "",
  ].filter(Boolean).join("");
  const relacionadas = [...d.episodios.filter((x) => x.historia === e.historia && x.ep !== e.ep), ...d.episodios.filter((x) => x.categoria === e.categoria && x.historia !== e.historia).sort((a, b) => b.ep - a.ep)].slice(0, 3);
  const mas = relacionadas.length ? relacionadas : d.episodios.filter((x) => x.ep !== e.ep).slice(-3);
  const descripcion = story ? story.cardDescription : `Entrevista del ${ed.nombre}, episodio ${e.ep}: ${e.persona}${e.empresa ? `, ${e.empresa}` : ""} (${lugar}).`;
  const imagen = e.portadaPropia || VC.thumb(e.videoId).endsWith(".svg") ? null : { src: VC.thumb(e.videoId), w: 1280, h: 720, alt: `Miniatura de la entrevista con ${e.persona}` };
  const cuerpo = `
<div class="wrap">${migas(items)}</div>
<section class="section" style="border-top:0;padding-top:22px">
  <div class="wrap dz-ent">
    <article>
      <span class="tag">${esc(ed.nombre)} · EP ${dos(e.ep)}</span>
      <h1>${esc(e.titulo)}</h1>
      <p class="byline">Entrevista con <strong>${esc(e.persona)}</strong>${e.empresa ? ` · ${esc(e.empresa)}` : ""} · ${esc(lugar)}</p>
      <div class="dz-video">${reproductor(e, VC)}
      </div>
      <div class="dz-cuerpo">
        ${resumen}
      </div>
      ${aviso}
      <div class="dz-enlaces">${enlaces}</div>
      <nav class="dz-navep" aria-label="Otras entrevistas">
        ${ant ? `<a href="${d.url(ant)}"><small>← EP ${dos(ant.ep)}</small>${esc(ant.persona)}</a>` : "<span></span>"}
        ${sig ? `<a href="${d.url(sig)}"><small>EP ${dos(sig.ep)} →</small>${esc(sig.persona)}</a>` : "<span></span>"}
      </nav>
    </article>
    <aside class="dz-lateral">
      <div class="dz-caja"><h2>Empresario</h2>${cajaEmpresario}</div>
      <div class="dz-caja">
        <h2>Ficha</h2>
        <dl class="dz-ficha">
          <dt>Edición</dt><dd><a href="${base}/">${esc(nombreEdicion(d))}</a></dd>
          <dt>Episodio</dt><dd>${dos(e.ep)}</dd>
          <dt>Ubicación</dt><dd>${esc(lugar)}</dd>
          <dt>Categoría</dt><dd>${esc(e.categoriaTexto)}</dd>
          <dt>Historia</dt><dd>${historiaFila}</dd>
          ${muro ? `<dt>Muro</dt><dd><a href="${base}/muro">${muro}</a></dd>` : ""}
        </dl>
      </div>
      <div class="dz-caja">
        <h2>Avance del Desafío</h2>
        <p class="dz-cifra" style="font-size:2.2rem">${r.historiasPublicadas} <small>/ ${r.meta}</small></p>
        <p class="dz-nota">historias empresariales publicadas${ed.conteo && ed.conteo.estado === "provisional" ? " (cifra provisional)" : ""}</p>
        <div class="dz-barra"><span style="width:${Math.round((100 * r.historiasPublicadas) / r.meta)}%"></span></div>
      </div>
    </aside>
  </div>
</section>
<section class="section dz-alt" aria-labelledby="dz-mas">
  <div class="wrap">
    <div class="section-head"><h2 class="section-title" id="dz-mas">${relacionadas.length && relacionadas[0].historia === e.historia ? "Más de esta historia" : "Más entrevistas del Desafío"}</h2><a class="section-link" href="${base}/entrevistas">Todas las entrevistas</a></div>
    <div class="desafio-grid">
    ${mas.map((x) => tarjeta(d, x, VC)).join("\n    ")}
    </div>
  </div>
</section>`;
  return pagina(c, {
    title: `${e.titulo} | ${e.persona} — Desafío 100 Empresas`,
    description: descripcion,
    path,
    image: imagen,
    jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: e.titulo, url: SITE + path, inLanguage: "es", about: { "@type": "Person", name: e.persona, ...(e.empresa ? { worksFor: { "@type": "Organization", name: e.empresa } } : {}), homeLocation: { "@type": "Place", name: lugar } }, breadcrumb: breadcrumbLd(items) },
    cuerpo,
    video: true,
  });
}

/* ---------- Muro del Legado ---------- */
function paginaMuro(d, c) {
  const { ed, r, base } = d;
  const path = `${base}/muro`;
  const items = [["Inicio", "/"], [d.programa.nombre, `${BASE}/`], [ed.ciudad, `${base}/`], ["Muro del Legado", null, path]];
  const conHistoria = d.participantes.filter((p) => d.historia(p.historia).estado === "publicada").length;
  const cuerpo = `
<div class="wrap">${migas(items)}</div>
<section class="section" aria-labelledby="dz-titulo" style="border-top:0;padding-top:22px">
  <div class="wrap">
    <p class="dz-kicker">${esc(ed.nombre)}</p>
    <h1 class="dz-titulo-pagina" id="dz-titulo">Muro del Legado</h1>
    <p class="dz-lead">Los empresarios de la ${ed.numero === 1 ? "primera edición" : `edición ${ed.numero}`}, con su ciudad real. Cuando su historia se publica, su tarjeta enlaza a la entrevista.</p>
    <div class="dz-cifras" style="margin-top:22px">
      <div class="dz-stat"><b>${r.participantes}</b><span>Empresarios confirmados en el Muro</span></div>
      <div class="dz-stat dz-stat--principal"><b>${r.historiasPublicadas}</b><span>Historias empresariales publicadas${ed.conteo && ed.conteo.estado === "provisional" ? " (provisional)" : ""}</span></div>
      <div class="dz-stat"><b>${r.meta - r.historiasPublicadas}</b><span>Historias por completar</span></div>
    </div>
    <p class="dz-nota" style="margin-top:12px">Algunas historias reúnen a más de un empresario de la misma empresa: por eso hay más empresarios con historia publicada (${conHistoria}) que historias.</p>
  </div>
</section>
<section class="section dz-alt" aria-label="Empresarios del Muro">
  <div class="wrap">
    <div class="dz-buscar">
      <input id="dzBuscarMuro" type="search" placeholder="Buscar por nombre, empresa o ciudad" aria-label="Buscar en el Muro">
      <div class="dz-filtros" role="group" aria-label="Filtrar por estado">
        <button class="dz-filtro" type="button" data-dz-estado="todos" aria-pressed="true">Todos (${r.participantes})</button>
        <button class="dz-filtro" type="button" data-dz-estado="publicada" aria-pressed="false">Historia publicada (${conHistoria})</button>
        <button class="dz-filtro" type="button" data-dz-estado="confirmado" aria-pressed="false">Confirmados (${r.participantes - conHistoria})</button>
      </div>
    </div>
    <div class="dz-muro" id="dzMuro">
      ${d.participantes.map((p) => persona(d, p)).join("\n      ")}
    </div>
    <p class="dz-sin-resultados" id="dzMuroVacio" hidden>No hay empresarios que coincidan con la búsqueda.</p>
    <p class="dz-nota" style="margin-top:18px">El Muro no publica correos, teléfonos ni direcciones. Para contactar a una empresa, consulta su perfil en el <a href="/index.html#quien-puede-ayudarte">Directorio Empresarial</a> cuando exista.</p>
  </div>
</section>`;
  return pagina(c, {
    title: `Muro del Legado — ${ed.nombre}`,
    description: `Los ${r.participantes} empresarios del ${ed.nombre}, con su empresa y su ciudad real.`,
    path,
    jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: `Muro del Legado — ${ed.nombre}`, url: SITE + path, inLanguage: "es", breadcrumb: breadcrumbLd(items) },
    cuerpo,
  });
}

/* ---------- Sitemap ---------- */
function bloqueSitemap(rutas, fecha) {
  const urls = rutas.map(([ruta, prioridad]) => `  <url>
    <loc>${SITE}${ruta}</loc>
    <lastmod>${fecha}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${prioridad}</priority>
  </url>`);
  return `${SITEMAP_INI}\n${urls.join("\n")}\n${SITEMAP_FIN}`;
}

export function sitemapActualizado(xml, bloque) {
  const ini = xml.indexOf(SITEMAP_INI);
  const fin = xml.indexOf(SITEMAP_FIN);
  if (ini >= 0 && fin > ini) return xml.slice(0, ini) + bloque + xml.slice(fin + SITEMAP_FIN.length);
  return xml.replace("</urlset>", `${bloque}\n</urlset>`);
}

/* ---------- Generación ---------- */
export function render(root = ROOT) {
  const api = loadData(root);
  const VC = cargarVideoCover(root);
  const historias = cargarHistorias(root);
  const c = chrome(root);
  const files = { "index.html": paginaPrograma(api, c, VC, historias) };
  const rutas = [[`${BASE}/`, "0.8"]];
  for (const ed of api.DATOS.ediciones.filter((e) => e.estado === "en-curso" || e.estado === "completada")) {
    const d = contexto(api, ed.id, VC, historias);
    files[`${ed.id}/index.html`] = paginaEdicion(d, c);
    files[`${ed.id}/entrevistas.html`] = paginaEntrevistas(d, c);
    files[`${ed.id}/muro.html`] = paginaMuro(d, c);
    rutas.push([`${d.base}/`, "0.8"], [`${d.base}/entrevistas`, "0.7"], [`${d.base}/muro`, "0.6"]);
    d.episodios.forEach((e, i) => {
      files[`${ed.id}/${e.slug}.html`] = paginaEpisodio(d, c, e, i);
      rutas.push([d.url(e), "0.6"]);
    });
  }
  const fecha = api.DATOS.ediciones.map((e) => e.verificacion.fecha).sort().at(-1);
  files["/sitemap.xml"] = sitemapActualizado(readFileSync(join(root, "sitemap.xml"), "utf8"), bloqueSitemap(rutas, fecha));
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = render();
  const problemas = [];
  for (const [name, html] of Object.entries(files)) {
    const dest = name.startsWith("/") ? join(ROOT, name) : join(OUT_DIR, name);
    const actual = existsSync(dest) ? readFileSync(dest, "utf8") : null;
    if (actual === html) continue;
    const rel = name.startsWith("/") ? name.slice(1) : `desafio-100-empresas/${name}`;
    if (CHECK) problemas.push(`desactualizado: ${rel}`);
    else {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, html);
    }
  }
  if (existsSync(OUT_DIR)) {
    for (const ent of readdirSync(OUT_DIR, { recursive: true })) {
      const rel = String(ent).split("\\").join("/");
      if (rel.endsWith(".html") && !files[rel]) problemas.push(`sobrante: desafio-100-empresas/${rel}`);
    }
  }
  if (problemas.length) {
    console.error(problemas.join("\n") + "\nEjecuta: node scripts/build-desafio.mjs");
    process.exit(1);
  }
  console.log(`${Object.keys(files).length - 1} página(s) del Desafío 100 Empresas ${CHECK ? "verificadas" : "al día"}.`);
}
