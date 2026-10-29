#!/usr/bin/env node
/*
  build-canada-datos.mjs — Páginas estáticas de «Canadá en Datos»
  ======================================================================
  Escribe, a partir de js/canada-datos.js y de la geometría
  scripts/canada-en-datos/mapa-canada.json:

    canada-en-datos/index.html      → /canada-en-datos/
    canada-en-datos/<perfil>.html   → /canada-en-datos/<perfil>  (una por
                                      región con ficha; hoy: alberta)

  Por qué páginas estáticas: Facebook, WhatsApp y los buscadores leen el
  HTML tal como llega (sin JavaScript). Aquí van ya escritos el título,
  la descripción, la URL canónica, las etiquetas og:/twitter:, el mapa SVG
  y todo el contenido de la ficha. El JavaScript solo agrega el reloj, la
  selección del mapa y las noticias.

  Cabecera y pie: se copian de 404.html, que ya usa rutas absolutas (las
  páginas viven en una subcarpeta). Así el módulo mantiene el mismo menú y
  footer que el resto del portal sin tocar nav.js ni las demás páginas.

  USO (sin dependencias, Node 18+):
    node scripts/build-canada-datos.mjs           genera / actualiza
    node scripts/build-canada-datos.mjs --check   solo verifica (pruebas)
*/

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import * as Localidades from "./canada-en-datos/localidades.mjs";
import { compartirHtml } from "./canada-en-datos/compartir.mjs";
import Alberta from "./canada-en-datos/provincias/alberta.mjs";
import Ontario from "./canada-en-datos/provincias/ontario.mjs";
import BritishColumbia from "./canada-en-datos/provincias/british-columbia.mjs";
import PrinceEdwardIsland from "./canada-en-datos/provincias/prince-edward-island.mjs";
import Saskatchewan from "./canada-en-datos/provincias/saskatchewan.mjs";

/* Provincias y territorios con directorio de localidades (ver docs del estándar en el repositorio interno) */
export const PROVINCIAS = { alberta: Alberta, ontario: Ontario, "british-columbia": BritishColumbia, "prince-edward-island": PrinceEdwardIsland, saskatchewan: Saskatchewan };
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://podcastdelmigrante.com";
const OUT_DIR = join(ROOT, "canada-en-datos");
const BASE_PATH = "/canada-en-datos";
const CHECK = process.argv.includes("--check");

export function loadData(root = ROOT) {
  const ctx = vm.createContext({});
  vm.runInContext(
    readFileSync(join(root, "js/canada-datos.js"), "utf8") +
      ";globalThis.__D={CD_META,CD_SOURCES,CD_REGIONS,CD_PROFILES};",
    ctx,
  );
  return JSON.parse(JSON.stringify(ctx.__D));
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fechaLarga = (iso) => new Intl.DateTimeFormat("es-CA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));
const enlaceExterno = (href) => (href.startsWith("/") ? "" : ' target="_blank" rel="noopener"');

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

/* ---------- <head> ---------- */
function head({ meta, title, description, path, image, imageAlt, jsonLd, noindex = false }) {
  const url = SITE + path;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${meta.prototype || noindex ? '<meta name="robots" content="noindex">\n' : ""}<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="El Podcast del Migrante Magazine">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${image}">
<meta property="og:image:secure_url" content="${SITE}${image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta property="og:locale" content="es_CA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}${image}">
<meta name="twitter:image:alt" content="${esc(imageAlt)}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/favicon.png">
<!-- Tipografías alojadas en el sitio (sin conexión a Google Fonts) -->
<link rel="preload" href="/assets/fonts/public-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/canada-datos.css">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
</head>`;
}

function aviso(meta) {
  if (!meta.prototype) return "";
  return `
  <div class="cd-proto" role="note">
    <div class="wrap"><strong>Prototipo en revisión editorial.</strong> Esta sección todavía no está publicada: las cifras marcadas como pendientes se completarán solo con datos oficiales verificados.</div>
  </div>`;
}

function scripts(extra, { soloSitio = false } = {}) {
  return `<script>window.PDM_SITE_ROOT_LINKS = true;</script>
<script src="/js/data.js"></script>
<script src="/js/nav.js"></script>
<script>document.addEventListener("DOMContentLoaded", () => window.PDM && window.PDM.initSiteChrome && window.PDM.initSiteChrome());</script>
${soloSitio ? "" : `<script src="/js/canada-datos.js"></script>
<script src="/js/canada-reloj.js"></script>
`}${extra.map((s) => `<script src="${s}"></script>`).join("\n")}
</body>
</html>
`;
}

/* ---------- Bloques reutilizables ---------- */
function relojHtml(region) {
  return `<div class="cd-clock" id="cdClock">
        <span class="cd-clock__label" data-reloj-etiqueta>Hora local en ${esc(region.capital)}</span>
        <time class="cd-clock__time" data-reloj-hora role="timer" aria-live="off">—</time>
        <span class="cd-clock__date" data-reloj-fecha></span>
        <span class="cd-clock__phase" data-reloj-fase></span>
      </div>`;
}

/* Otras zonas horarias de la región (region.zones), además de la capital.
   La hora la escribe js/canada-region.js; sin JavaScript se ve la descripción. */
function zonasHtml(region) {
  if (!region.zones || !region.zones.length) return "";
  return `<div class="cd-zones" aria-label="Otras zonas horarias de ${esc(region.name)}">
          ${region.zones.map((z) => `<p class="cd-zone" data-zona="${esc(z.timeZone)}"><span class="cd-zone__label">${esc(z.label)}</span> <time class="cd-zone__time" data-zona-hora>—</time><small class="cd-zone__note">${esc(z.note)}</small></p>`).join("\n          ")}
        </div>`;
}

/* Tabla comparativa de una sección (p. ej., alquileres de varias ciudades de una misma encuesta) */
function tablaHtml(s) {
  const tb = s.table;
  return `<figure class="cd-table">
        <figcaption>${esc(tb.caption)}</figcaption>
        <div class="cd-table__wrap" tabindex="0" role="region" aria-label="${esc(tb.caption)}">
          <table>
            <thead><tr>${tb.headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>
            <tbody>
              ${tb.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join("")}</tr>`).join("\n              ")}
            </tbody>
          </table>
        </div>
        <p class="cd-table__note">${esc(tb.note)} Fuente: <a href="${esc(tb.source.url)}" target="_blank" rel="noopener">${esc(tb.source.org)} — ${esc(tb.source.title)}</a>. Período: ${esc(tb.refPeriod)}; consultado el ${esc(fechaLarga(tb.retrievedAt))}.</p>
      </figure>`;
}

/* Fichas de ciudades dentro de la página provincial */
function ciudadesHtml(s) {
  return `<div class="cd-cities">
        ${s.cities.map((c) => `<article class="cd-city" id="ciudad-${esc(c.id)}">
          <h3>${esc(c.name)}</h3>
          <p class="cd-city__meta">${esc(c.region)}${c.population ? ` · ${esc(formatoValor({ value: c.population.value, format: "numero" }))} habitantes (${esc(c.population.refPeriod)})` : ""}</p>
          <p>${esc(c.text)}</p>
          <p class="cd-city__sectors"><strong>Sectores destacados:</strong> ${esc(c.sectors.join(", "))}.</p>
          <p class="cd-city__src">${esc(c.sectorsSource)}</p>
          <div class="cd-links">
            ${c.links.map((l) => `<a href="${esc(l.href)}"${enlaceExterno(l.href)}>${esc(l.label)}</a>`).join("\n            ")}
          </div>
        </article>`).join("\n        ")}
      </div>
      ${s.citiesNote ? `<p class="cd-table__note">${esc(s.citiesNote)}</p>` : ""}`;
}

/* Formato numérico del portal (convención canadiense): 5,101,050 · 7.2% · $37.35 · 95.63.
   Propio y sin Intl, para que la página generada y el navegador muestren lo mismo. */
export function formatoValor(ind) {
  const [entero, decimales] = Math.abs(ind.value).toFixed(ind.decimals ?? 0).split(".");
  const num = (ind.value < 0 ? "-" : "") + entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (decimales ? "." + decimales : "");
  if (ind.format === "moneda") return "$" + num;
  return ind.format === "porcentaje" ? num + "%" : num;
}

const pendiente = (ind) => ind.value === null || ind.value === undefined;

function valorIndicador(ind) {
  if (pendiente(ind)) return '<span class="cd-pending">Pendiente de verificación</span>';
  const unidad = ind.format === "moneda" && /^(CAD )?(por|al)\b/.test(ind.unit) ? ` ${esc(ind.unit)}` : "";
  return `${esc(formatoValor(ind))}${unidad}<small class="cd-fact__period">${esc(ind.refPeriod)}</small>`;
}

function filaIndicador(ind) {
  return `<div class="cd-fact"><dt>${esc(ind.label)}</dt><dd>${valorIndicador(ind)}</dd></div>`;
}

const fuenteHtml = (ind) => `<a href="${esc(ind.source.url)}" target="_blank" rel="noopener">${esc(ind.source.org)} — ${esc(ind.source.title)}</a>`;

function tarjetaIndicador(ind) {
  if (pendiente(ind)) {
    return `<div class="cd-indicator">
          <p class="cd-indicator__label">${esc(ind.label)}</p>
          <p class="cd-indicator__value cd-pending">Pendiente de verificación</p>
          <p class="cd-indicator__src">${ind.pending ? `${esc(ind.pending)} ` : ""}Se publicará con el dato oficial de ${fuenteHtml(ind)}. Frecuencia: ${esc(ind.cadence.toLowerCase())}.</p>
        </div>`;
  }
  return `<div class="cd-indicator">
          <p class="cd-indicator__label">${esc(ind.label)}</p>
          <p class="cd-indicator__value">${esc(formatoValor(ind))}</p>
          <p class="cd-indicator__unit">${esc(ind.unit)} · ${esc(ind.refPeriod)}</p>
          ${ind.note ? `<p class="cd-indicator__note">${esc(ind.note)}</p>` : ""}
          <p class="cd-indicator__src">Fuente: ${fuenteHtml(ind)}. Consultado el ${esc(fechaLarga(ind.retrievedAt))}; revisado el ${esc(fechaLarga(ind.reviewedAt))}. Frecuencia: ${esc(ind.cadence.toLowerCase())}.</p>
        </div>`;
}

function panelHtml(region, perfiles) {
  const perfil = region.profile ? perfiles[region.profile] : null;
  const tipo = region.type === "territorio" ? "Territorio" : "Provincia";
  const nota = region.multiZone
    ? `${esc(region.name)} tiene más de una zona horaria: el reloj muestra la hora de ${esc(region.capital)}.`
    : `Hora oficial de ${esc(region.capital)}.`;
  const indicadores = perfil
    ? perfil.summary.map((k) => filaIndicador(perfil.indicators[k])).join("")
    : '<div class="cd-fact"><dt>Población e indicadores</dt><dd><span class="cd-pending">Próximamente</span></dd></div>';
  const cta = perfil
    ? `<a class="btn" href="${BASE_PATH}/${esc(region.profile)}">Ver la ficha completa de ${esc(region.name)}</a>`
    : `<span class="cd-soon">Ficha completa: próximamente</span>`;
  return `
      <p class="cd-panel__type">${tipo}</p>
      <h2 class="cd-panel__name" id="cdPanelTitle">${esc(region.name)}</h2>
      ${relojHtml(region)}
      <dl class="cd-facts">
        <div class="cd-fact"><dt>Capital</dt><dd>${esc(region.capital)}</dd></div>
        ${indicadores}
      </dl>
      <p class="cd-panel__note">${nota}</p>
      <div class="cd-panel__cta">${cta}</div>`;
}

/* Recuadro de un trazo SVG (M x y l dx dy … z) para marcar regiones diminutas */
function caja(d) {
  let x = 0, y = 0;
  const xs = [], ys = [];
  for (const seg of d.split(/(?=[Mlz])/)) {
    const nums = seg.slice(1).trim().split(/\s+/).filter(Boolean).map(Number);
    if (seg[0] === "M") { x = nums[0]; y = nums[1]; xs.push(x); ys.push(y); }
    if (seg[0] === "l") for (let i = 0; i < nums.length; i += 2) { x += nums[i]; y += nums[i + 1]; xs.push(x); ys.push(y); }
  }
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function mapaSvg(geo, regiones) {
  const trazos = regiones
    .map((r) => {
      const d = geo.paths[r.code];
      if (!d) throw new Error(`Falta la geometría de ${r.code}`);
      const clase = r.profile ? "cd-region cd-region--ficha" : "cd-region";
      return `<path class="${clase}" data-code="${r.code}" d="${d}" role="button" tabindex="${r.code === "AB" ? 0 : -1}" aria-pressed="${r.code === "AB"}" aria-label="${esc(r.name)}${r.profile ? " (ficha disponible)" : ""}"><title>${esc(r.name)}</title></path>`;
    })
    .join("\n        ");
  const pe = caja(geo.paths.PE);
  const radio = Math.max(pe.w, pe.h) / 2 + 9;
  return `<svg class="cd-map" id="cdMap" viewBox="0 0 ${geo.width} ${geo.height}" role="group" aria-labelledby="cdMapTitle cdMapDesc">
        <title id="cdMapTitle">Mapa de las provincias y territorios de Canadá</title>
        <desc id="cdMapDesc">Selecciona una provincia o un territorio para ver su información. También puedes usar la lista que está debajo del mapa.</desc>
        ${trazos}
        <circle class="cd-marker" cx="${(pe.x + pe.w / 2).toFixed(1)}" cy="${(pe.y + pe.h / 2).toFixed(1)}" r="${radio.toFixed(1)}" aria-hidden="true"/>
      </svg>`;
}

/* ---------- Portada del módulo ---------- */
function paginaIndice(d, geo, comun) {
  const { CD_META: meta, CD_SOURCES: fuentes, CD_REGIONS: regiones, CD_PROFILES: perfiles } = d;
  const title = "Canadá en Datos: provincias y territorios de Canadá — El Podcast del Migrante";
  /* Regiones con ficha completa, en el orden del mapa: «Alberta», «Alberta y Ontario»… */
  const conFicha = regiones.filter((r) => r.profile).map((r) => r.name);
  const fichas = conFicha.length > 1 ? `${conFicha.slice(0, -1).join(", ")} y ${conFicha.at(-1)}` : conFicha[0];
  const description = conFicha.length > 1
    ? `Mapa interactivo de las 10 provincias y los 3 territorios de Canadá: capital, hora local e información oficial para inmigrantes y recién llegados. Fichas completas: ${fichas}.`
    : `Mapa interactivo de las 10 provincias y los 3 territorios de Canadá: capital, hora local e información oficial para inmigrantes y recién llegados. Empezamos por ${fichas}.`;
  const revision = [meta.lastReview, ...Object.values(perfiles).map((p) => p.lastReview).filter(Boolean)].sort().at(-1);
  const path = `${BASE_PATH}/`;
  const alberta = regiones.find((r) => r.code === "AB");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: meta.title,
    description,
    url: SITE + path,
    inLanguage: "es",
    isPartOf: { "@type": "WebSite", name: "El Podcast del Migrante Magazine", url: SITE + "/" },
    about: { "@type": "Country", name: "Canadá" },
  };
  const chips = regiones
    .map((r) => `<button type="button" class="cd-chip" data-code="${r.code}" aria-pressed="${r.code === "AB"}">${esc(r.name)}</button>`)
    .join("\n          ");
  return `${head({ meta, title, description, path, image: "/assets/canada-en-datos/social-canada-en-datos.jpg", imageAlt: "Mapa de Canadá con sus provincias y territorios, y el título Canadá en Datos de El Podcast del Migrante.", jsonLd })}
<body>
${comun.cabecera}

<main id="main" class="cd">
  ${aviso(meta)}
  <section class="cd-hero">
    <div class="wrap">
      <p class="cd-kicker">El Podcast del Migrante</p>
      <h1>Canadá en Datos</h1>
      <p class="cd-lead">Explora las 10 provincias y los 3 territorios de Canadá: capital, hora local e información oficial útil para inmigrantes y recién llegados. ${conFicha.length > 1 ? `Ya están disponibles las fichas completas de ${esc(fichas)}; las demás llegarán pronto` : `Empezamos por ${esc(fichas)}; las demás fichas llegarán pronto`}.</p>
      <p class="cd-meta">Última revisión: ${esc(fechaLarga(revision))}</p>
    </div>
  </section>

  <div class="wrap cd-explorer">
    <div class="cd-map-wrap">
      ${mapaSvg(geo, regiones)}
      <div class="cd-legend" aria-hidden="true">
        <span><i class="cd-swatch cd-swatch--ficha"></i>Con ficha completa</span>
        <span><i class="cd-swatch cd-swatch--basica"></i>Información básica</span>
        <span><i class="cd-swatch cd-swatch--sel"></i>Seleccionada</span>
      </div>
      <h2 class="cd-list-title" id="cdListTitle">Provincias y territorios</h2>
      <div class="cd-list" role="group" aria-labelledby="cdListTitle">
          ${chips}
      </div>
      <p class="cd-sr" id="cdAnuncio" aria-live="polite"></p>
    </div>
    <aside class="cd-panel" id="cdPanel" aria-labelledby="cdPanelTitle">${panelHtml(alberta, perfiles)}
    </aside>
  </div>

  <section class="cd-method">
    <div class="wrap">
      <h2>Fuentes y metodología</h2>
      <ul>
        <li>Capitales: <a href="${esc(fuentes.capitals.url)}" target="_blank" rel="noopener">${esc(fuentes.capitals.org)} — ${esc(fuentes.capitals.title)}</a>, consultado el ${esc(fechaLarga(fuentes.capitals.retrievedAt))}.</li>
        <li>Hora local: zona horaria de la capital según la <a href="${esc(fuentes.timeZones.url)}" target="_blank" rel="noopener">${esc(fuentes.timeZones.title)}</a> de ${esc(fuentes.timeZones.org)}, calculada en tu navegador con el horario de verano vigente. El día y la noche se estiman con la hora de salida y puesta del sol en la capital.</li>
        <li>Indicadores: solo se publican cifras de fuentes oficiales, con su período de referencia y la fecha de consulta. Las que todavía no se han verificado aparecen como «Pendiente de verificación».</li>
        <li>Mapa: ${esc(meta.geometry.name)}. <a href="${esc(meta.geometry.url)}" target="_blank" rel="noopener">naturalearthdata.com</a>. ${esc(meta.geometry.note)}</li>
      </ul>
    </div>
  </section>
</main>

${comun.pie}

${scripts(["/js/canada-mapa.js"])}`;
}

/* ---------- Ficha de una región ---------- */
function paginaRegion(d, region, comun, L) {
  const { CD_META: meta, CD_SOURCES: fuentes, CD_PROFILES: perfiles } = d;
  const perfil = perfiles[region.profile];
  const path = `${BASE_PATH}/${region.profile}`;
  const title = `${perfil.seo.title} — El Podcast del Migrante`;
  const tipo = region.type === "territorio" ? "Territorio" : "Provincia";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: perfil.seo.title,
    description: perfil.seo.description,
    url: SITE + path,
    inLanguage: "es",
    dateModified: perfil.lastReview || meta.lastReview,
    isPartOf: { "@type": "CollectionPage", name: meta.title, url: `${SITE}${BASE_PATH}/` },
    about: { "@type": "AdministrativeArea", name: region.name, containedInPlace: { "@type": "Country", name: "Canadá" } },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: meta.title, item: `${SITE}${BASE_PATH}/` },
        { "@type": "ListItem", position: 3, name: region.name, item: SITE + path },
      ],
    },
  };
  const toc = [...perfil.sections.map((s) => [s.id, s.title]), ...(perfil.localidades ? [["localidades", "Ciudades y pueblos"]] : []), ["recien-llegado", "Recién llegado"], ...(perfil.scams && perfil.scams.length ? [["estafas", "Estafas"]] : []), ["noticias", "Noticias"], ["fuentes", "Fuentes"]]
    .map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`)
    .join("\n      ");
  const secciones = perfil.sections
    .map((s) => {
      const parrafos = s.text.map((p) => `<p>${esc(p)}</p>`).join("\n      ");
      const lista = s.items && s.items.length ? `<ul class="cd-list-items">
        ${s.items.map((i) => `<li>${esc(i)}</li>`).join("\n        ")}
      </ul>` : "";
      const aviso = s.alert ? `<p class="cd-alert">${esc(s.alert)}</p>` : "";
      const explicacion = s.explainer ? `<aside class="cd-explainer" aria-labelledby="${s.id}-explicacion">
        <h3 id="${s.id}-explicacion">${esc(s.explainer.title)}</h3>
        <p>${esc(s.explainer.text)}</p>
        <p class="cd-alert">${esc(s.explainer.warning)}</p>
      </aside>` : "";
      const tarjetas = s.indicators.length
        ? `<div class="cd-indicators">
        ${s.indicators.map((k) => tarjetaIndicador(perfil.indicators[k])).join("\n        ")}
      </div>`
        : "";
      const enlaces = s.links.map((l) => `<a href="${esc(l.href)}"${enlaceExterno(l.href)}>${esc(l.label)}</a>`).join("\n        ");
      return `<section class="cd-section" id="${s.id}" aria-labelledby="${s.id}-titulo">
      <h2 id="${s.id}-titulo">${esc(s.title)}</h2>
      ${parrafos}
      ${lista}
      ${aviso}
      ${tarjetas}${s.table ? tablaHtml(s) : ""}${s.cities ? ciudadesHtml(s) : ""}
      ${explicacion}
      <div class="cd-links">
        ${enlaces}
      </div>
    </section>`;
    })
    .join("\n    ");
  const pasos = perfil.newcomer
    .map((p) => `<li class="cd-step">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.text)}</p>
          ${p.warning ? `<p class="cd-step__warn"><strong>Atención:</strong> ${esc(p.warning)}</p>` : ""}
          <a href="${esc(p.link.href)}"${enlaceExterno(p.link.href)}>${esc(p.link.label)}</a>
        </li>`)
    .join("\n        ");
  const estafas = perfil.scams && perfil.scams.length
    ? `<div class="cd-scams" id="estafas">
        <h3>Cómo reconocer estafas</h3>
        <p>Estas son señales de alerta frecuentes. Ante la duda, no pagues y consulta las fuentes oficiales. Esta guía es informativa y no sustituye la asesoría de un profesional autorizado.</p>
        <ul>
          ${perfil.scams.map((e) => `<li><strong>${esc(e.title)}:</strong> ${esc(e.text)}</li>`).join("\n          ")}
        </ul>
      </div>`
    : "";
  const listaFuentes = Object.values(perfil.indicators)
    .map((ind) => `<li>${esc(ind.label)}: ${fuenteHtml(ind)} (${pendiente(ind) ? "pendiente de verificación" : `período: ${esc(ind.refPeriod)}; consultado el ${esc(fechaLarga(ind.retrievedAt))}`}).</li>`)
    .join("\n        ");
  return `${head({ meta, title, description: perfil.seo.description, path, image: `/assets/canada-en-datos/social-${region.profile}.jpg`, imageAlt: `Mapa de Canadá con ${region.name} resaltada y el título ${region.name} en datos, de El Podcast del Migrante.`, jsonLd })}
<body data-cd-region="${esc(region.slug)}">
${comun.cabecera}

<main id="main" class="cd">
  ${aviso(meta)}
  <div class="wrap">
    <div class="cd-region-hero">
      <div>
        <nav class="cd-breadcrumb" aria-label="Ruta de navegación"><a href="/index.html">Inicio</a> › <a href="${BASE_PATH}/">${esc(meta.title)}</a> › <span aria-current="page">${esc(region.name)}</span></nav>
        <p class="cd-kicker">Canadá en Datos · ${tipo}</p>
        <h1>${esc(region.name)}</h1>
        <p class="cd-lead">${esc(perfil.intro)}</p>
        <p class="cd-meta">Última revisión: ${esc(fechaLarga(perfil.lastReview || meta.lastReview))}</p>
        ${compartirHtml({ url: SITE + path, titulo: perfil.seo.title, texto: `${region.name} en datos: guía para migrantes con cifras y enlaces oficiales, en Canadá en Datos de El Podcast del Migrante.`, lugar: region.name })}
      </div>
      <aside class="cd-panel" aria-label="Datos rápidos de ${esc(region.name)}">
        ${relojHtml(region)}
        <dl class="cd-facts">
          <div class="cd-fact"><dt>Capital</dt><dd>${esc(region.capital)}</dd></div>
          ${perfil.summary.map((k) => filaIndicador(perfil.indicators[k])).join("\n          ")}
        </dl>
        <p class="cd-panel__note">${region.multiZone ? `${esc(region.name)} tiene más de una zona horaria: el reloj muestra la hora de ${esc(region.capital)}.` : `Hora oficial de ${esc(region.capital)}.`}</p>${zonasHtml(region)}
      </aside>
    </div>

    <nav class="cd-toc" aria-label="Contenido de la ficha">
      ${toc}
    </nav>

    ${secciones}

    ${perfil.localidades ? Localidades.seccionDirectorio(PROVINCIAS[region.profile], L[region.profile], esc) : ""}

    <section class="cd-section cd-newcomer" id="recien-llegado" aria-labelledby="recien-llegado-titulo">
      <h2 id="recien-llegado-titulo">Recién llegado: ¿por dónde empezar?</h2>
      <p>Una ruta de primeros pasos para instalarte en ${esc(region.name)}. Cada trámite tiene sus requisitos: confírmalos siempre en la página oficial.</p>
      <ol class="cd-steps">
        ${pasos}
      </ol>
      ${estafas}
    </section>

    <section class="cd-section" id="noticias" aria-labelledby="noticias-titulo">
      <h2 id="noticias-titulo">Noticias de ${esc(region.name)}</h2>
      <p>Lo más reciente de El Podcast del Migrante sobre ${esc(region.name)}.</p>
      <ul class="cd-news" id="cdNews"></ul>
      <noscript><p class="cd-news-empty">Activa JavaScript para ver las noticias, o visita la <a href="/index.html">portada</a>.</p></noscript>
    </section>

    <section class="cd-method" id="fuentes" aria-labelledby="fuentes-titulo">
      <h2 id="fuentes-titulo">Fuentes y metodología</h2>
      <p>Esta ficha reúne información general y enlaces a fuentes oficiales; no sustituye la información oficial vigente ni la asesoría profesional. Las cifras se leyeron directamente en la publicación oficial (archivo o página original) y solo se publican con su fuente, su período de referencia y las fechas de consulta y revisión. Una estimación de población no es un censo: cada cifra indica qué mide.</p>
      <ul>
        <li>Capital: <a href="${esc(fuentes.capitals.url)}" target="_blank" rel="noopener">${esc(fuentes.capitals.org)} — ${esc(fuentes.capitals.title)}</a>.</li>
        <li>Hora local: zona horaria ${esc(region.timeZone)} (<a href="${esc(fuentes.timeZones.url)}" target="_blank" rel="noopener">${esc(fuentes.timeZones.org)}</a>), calculada en tu navegador.</li>
        ${listaFuentes}
      </ul>
    </section>
  </div>
</main>

${comun.pie}

${scripts(["/js/articles.js", "/js/canada-region.js", "/js/canada-compartir.js", ...(perfil.localidades ? ["/js/canada-directorio.js"] : [])])}`;
}

/* ---------- Sitemap: bloque de Canadá en Datos (entre marcadores) ----------
   Solo las páginas indexables: portada, fichas provinciales y fichas
   completas de localidades (las de información básica llevan noindex). */
const SITEMAP_INI = "  <!-- canada-en-datos: generado por scripts/build-canada-datos.mjs -->";
const SITEMAP_FIN = "  <!-- /canada-en-datos -->";
export function sitemapCanada(xml, rutas) {
  const bloque = `${SITEMAP_INI}\n${rutas
    .map(([ruta, fecha, prioridad]) => `  <url>\n    <loc>${SITE}${ruta}</loc>\n    <lastmod>${fecha}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${prioridad}</priority>\n  </url>`)
    .join("\n")}\n${SITEMAP_FIN}`;
  const i = xml.indexOf(SITEMAP_INI), f = xml.indexOf(SITEMAP_FIN);
  if (i >= 0 && f > i) return xml.slice(0, i) + bloque + xml.slice(f + SITEMAP_FIN.length);
  return xml.replace("</urlset>", `${bloque}\n</urlset>`);
}

/* ---------- Imágenes sociales de las localidades (scripts/build-canada-datos-images.py) ---------- */
export function manifiestoImagenes(root = ROOT) {
  const d = loadData(root);
  return Object.entries(d.CD_PROFILES)
    .filter(([, p]) => p.localidades)
    .map(([k]) => Localidades.imagenes(PROVINCIAS[k], PROVINCIAS[k].cargar(root)));
}

/* ---------- Generación ---------- */
export function render(root = ROOT) {
  const d = loadData(root);
  const geo = JSON.parse(readFileSync(join(root, "scripts/canada-en-datos/mapa-canada.json"), "utf8"));
  const comun = chrome(root);
  const files = { "index.html": paginaIndice(d, geo, comun) };
  /* Directorio de localidades de Alberta (claves que empiezan por «/»: rutas desde la raíz del proyecto) */
  const L = {};
  for (const [k, p] of Object.entries(d.CD_PROFILES)) {
    if (!p.localidades) continue;
    if (!PROVINCIAS[k]) throw new Error(`Falta el módulo de localidades de ${k} (scripts/canada-en-datos/provincias/)`);
    L[k] = PROVINCIAS[k].cargar(root);
  }
  for (const region of d.CD_REGIONS.filter((r) => r.profile)) {
    if (!d.CD_PROFILES[region.profile]) throw new Error(`Falta CD_PROFILES.${region.profile}`);
    files[`${region.profile}.html`] = paginaRegion(d, region, comun, L);
  }
  /* Sitemap: portada, fichas provinciales y fichas completas de localidades */
  const revision = [d.CD_META.lastReview, ...Object.values(d.CD_PROFILES).map((p) => p.lastReview).filter(Boolean)].sort().at(-1);
  const rutas = [[`${BASE_PATH}/`, revision, "0.8"]];
  for (const region of d.CD_REGIONS.filter((r) => r.profile)) {
    const p = d.CD_PROFILES[region.profile];
    rutas.push([`${BASE_PATH}/${region.profile}`, p.lastReview || d.CD_META.lastReview, "0.8"]);
    if (L[region.profile]) for (const r of L[region.profile].items.filter((x) => x.ficha)) rutas.push([`${BASE_PATH}/${region.profile}/${r.s}`, L[region.profile].meta.consultado, "0.7"]);
  }
  files["/sitemap.xml"] = sitemapCanada(readFileSync(join(root, "sitemap.xml"), "utf8"), rutas);
  for (const [k, l] of Object.entries(L)) {
    const P = PROVINCIAS[k];
    Object.assign(files, Localidades.paginas(P, l, { esc, head, chrome: comun, scriptsBase: (extra) => scripts(extra, { soloSitio: true }), meta: d.CD_META }));
    files[`/js/${k}-localidades.js`] = Localidades.datosNavegador(P, l);
    files[`/assets/canada-en-datos/${k}-regiones.svg`] = Localidades.mapaSvg(P, l);
  }
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = render();
  const problemas = [];
  if (!CHECK) mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, html] of Object.entries(files)) {
    const dest = name.startsWith("/") ? join(ROOT, name) : join(OUT_DIR, name);
    if (!CHECK) mkdirSync(dirname(dest), { recursive: true });
    const actual = existsSync(dest) ? readFileSync(dest, "utf8") : null;
    if (actual === html) continue;
    const rel = name.startsWith("/") ? name.slice(1) : `canada-en-datos/${name}`;
    if (CHECK) problemas.push(`desactualizado: ${rel}`);
    else {
      writeFileSync(dest, html);
      if (!/^canada-en-datos\/[a-z-]+\/[^/]+\.html$/.test(rel)) console.log(`escrito  ${rel}`);
    }
  }
  const sobrantes = [
    ...(existsSync(OUT_DIR) ? readdirSync(OUT_DIR).filter((f) => f.endsWith(".html") && !files[f]) : []),
    ...Object.keys(PROVINCIAS).flatMap((k) => (existsSync(join(OUT_DIR, k)) ? readdirSync(join(OUT_DIR, k)).map((f) => `${k}/${f}`).filter((f) => !files[f]) : [])),
  ];
  for (const f of sobrantes) problemas.push(`sobrante: canada-en-datos/${f} (no corresponde a ninguna ficha)`);
  if (problemas.length) {
    console.error(problemas.join("\n") + "\nEjecuta: node scripts/build-canada-datos.mjs");
    process.exit(1);
  }
  console.log(`${Object.keys(files).length} página(s) de Canadá en Datos ${CHECK ? "verificadas" : "al día"}.`);
}
