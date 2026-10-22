/*
  localidades.mjs — «Explora las ciudades y pueblos de Alberta»
  ======================================================================
  Lo usa scripts/build-canada-datos.mjs. A partir de los datos oficiales
  ya descargados (ver obtener-localidades.py y obtener-ciudades.py):

    - seccionDirectorio(): la sección del directorio dentro de la ficha
      de Alberta (buscador, filtros, mapa y listado; los datos se cargan
      solo cuando el lector llega a la sección).
    - datosNavegador(): js/alberta-localidades.js (datos compactos del
      directorio para el navegador).
    - mapaSvg(): assets/canada-en-datos/alberta-regiones.svg (regiones
      económicas, para el mapa de cada página).
    - paginas(): una página por municipio en canada-en-datos/alberta/.
      Las seis fichas completas (FICHAS) se indexan; las páginas con
      información básica llevan noindex hasta completarse.

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ---------- Clasificación oficial ---------- */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "incorporado", plural: "ciudades" },
  town: { es: "Pueblo", en: "Town", grupo: "incorporado", plural: "pueblos (towns)" },
  village: { es: "Villa", en: "Village", grupo: "incorporado", plural: "villas (villages)" },
  "summer-village": { es: "Villa de verano", en: "Summer Village", grupo: "incorporado", plural: "villas de verano (summer villages)" },
  specialized: { es: "Municipio especializado", en: "Specialized Municipality", grupo: "incorporado", plural: "municipios especializados" },
  md: { es: "Distrito municipal o condado", en: "Municipal District / County", grupo: "incorporado", plural: "distritos municipales y condados" },
  id: { es: "Distrito de mejora", en: "Improvement District", grupo: "provincial", plural: "distritos de mejora" },
  "special-area": { es: "Área especial", en: "Special Area", grupo: "provincial", plural: "áreas especiales" },
  metis: { es: "Asentamiento métis", en: "Metis Settlement", grupo: "metis", plural: "asentamientos métis" },
  usa: { es: "Área de servicio urbano", en: "Urban Service Area", grupo: "comunidad", plural: "áreas de servicio urbano" },
  hamlet: { es: "Hamlet", en: "Hamlet", grupo: "comunidad", plural: "hamlets" },
  townsite: { es: "Townsite", en: "Townsite", grupo: "comunidad", plural: "townsites" },
  locality: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades (lugares con nombre)" },
};
export const GRUPOS = {
  incorporado: "Municipios incorporados",
  provincial: "Distritos de mejora y áreas especiales",
  metis: "Asentamientos métis",
  comunidad: "Comunidades no incorporadas",
};
const ES_MUNICIPIO = (t) => TIPOS[t].grupo !== "comunidad";

/* Regiones económicas 2021 → fila de la Encuesta de Población Activa
   (Statistics Canada combina 4840 y 4870 en una sola región). */
const EPA_GEO = {
  4810: "Lethbridge-Medicine Hat, Alberta",
  4820: "Camrose-Drumheller, Alberta",
  4830: "Calgary, Alberta",
  4840: "Banff-Jasper-Rocky Mountain House and Athabasca-Grande Prairie-Peace River, Alberta",
  4850: "Red Deer, Alberta",
  4860: "Edmonton, Alberta",
  4870: "Banff-Jasper-Rocky Mountain House and Athabasca-Grande Prairie-Peace River, Alberta",
  4880: "Wood Buffalo-Cold Lake, Alberta",
};
const INDUSTRIAS_ES = {
  "Agriculture [111-112, 1100, 1151-1152]": "Agricultura",
  "Forestry, fishing, mining, quarrying, oil and gas [21, 113-114, 1153, 2100]": "Silvicultura, pesca, minería, petróleo y gas",
  "Utilities [22]": "Servicios públicos (electricidad, gas y agua)",
  "Construction [23]": "Construcción",
  "Manufacturing [31-33]": "Manufactura",
  "Wholesale and retail trade [41, 44-45]": "Comercio mayorista y minorista",
  "Transportation and warehousing [48-49]": "Transporte y almacenamiento",
  "Finance, insurance, real estate, rental and leasing [52-53]": "Finanzas, seguros e inmobiliarias",
  "Professional, scientific and technical services [54]": "Servicios profesionales, científicos y técnicos",
  "Business, building and other support services [55-56]": "Servicios de apoyo a empresas",
  "Educational services [61]": "Educación",
  "Health care and social assistance [62]": "Salud y asistencia social",
  "Information, culture and recreation [51, 71]": "Información, cultura y recreación",
  "Accommodation and food services [72]": "Alojamiento y servicios de comida",
  "Other services (except public administration) [81]": "Otros servicios",
  "Public administration [91]": "Administración pública",
};

/* ---------- Fichas completas (segunda etapa) ----------
   Enlaces verificados el 22 de octubre de 2026 (respuesta 200). */
export const FICHAS = {
  calgary: { nombre: "Calgary", web: "https://www.calgary.ca/", transporte: { label: "Calgary Transit", href: "https://www.calgarytransit.com/" } },
  edmonton: { nombre: "Edmonton", web: "https://www.edmonton.ca/", transporte: { label: "Edmonton Transit Service (ETS)", href: "https://www.edmonton.ca/edmonton-transit-system-ets" } },
  brooks: { nombre: "Brooks", web: "https://www.brooks.ca/", transporte: null },
  "red-deer": { nombre: "Red Deer", web: "https://www.reddeer.ca/", transporte: { label: "Transporte público de la Ciudad de Red Deer", href: "https://www.reddeer.ca/city-services/transit/" } },
  lethbridge: { nombre: "Lethbridge", web: "https://www.lethbridge.ca/", transporte: { label: "Lethbridge Transit", href: "https://www.lethbridge.ca/transit" } },
  "medicine-hat": { nombre: "Medicine Hat", web: "https://www.medicinehat.ca/", transporte: { label: "Transporte público de la Ciudad de Medicine Hat", href: "https://www.medicinehat.ca/roads-parking-transportation/transit/" } },
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  geo: { org: "Gobierno de Alberta", title: "Límites municipales y comunidades (servidor geoespacial)", url: "https://geospatial.alberta.ca/titan/rest/services/boundaries" },
  regiones: { org: "Gobierno de Alberta, adaptado de Statistics Canada", title: "Límites censales 2021: regiones económicas", url: "https://geospatial.alberta.ca/titan/rest/services/census/census_boundaries_2021/MapServer" },
  mapl: { org: "Alberta Municipal Affairs", title: "Municipal Affairs Population List 2025", url: "https://open.alberta.ca/dataset/alberta-municipal-affairs-population-list" },
  tipos: { org: "Gobierno de Alberta", title: "Types of municipalities in Alberta", url: "https://www.alberta.ca/types-of-municipalities-in-alberta" },
  perfiles: { org: "Gobierno de Alberta", title: "Municipal profiles", url: "https://www.alberta.ca/municipal-profiles" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0393-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039301" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0392-01 — Empleo por industria y región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039201" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Alberta Education", title: "Alberta schools and authorities", url: "https://open.alberta.ca/opendata/alberta-education-schools-and-authorities" },
  instalaciones: { org: "Gobierno de Alberta", title: "Facility and functional centre definitions and facility listing (octubre de 2026)", url: "https://open.alberta.ca/dataset/alberta-health-facility-and-functional-centre-definitions-and-facility-listing" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Alberta", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Alberta" },
    { label: "ALIS — Cómo buscar trabajo en Alberta", href: "https://alis.alberta.ca/look-for-work/" },
  ],
  salud: [
    { label: "Alberta Health Services — Buscar servicios de salud", href: "https://www.albertahealthservices.ca/findhealth/" },
    { label: "Health Link 811 — Consejos de salud las 24 horas", href: "https://www.primarycarealberta.ca/page14176.aspx" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
    { label: "211 Alberta — Orientación sobre ayudas comunitarias", href: "https://ab.211.ca/" },
  ],
};

/* ---------- Utilidades ---------- */
export function slug(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const nombreRegion = (n) => n.replace(/--/g, "–");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fechaEs = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
};

/* Celdas de una fila de CMHC: valor + indicador de calidad (a–d); se ignoran las flechas. */
function celdasCmhc(fila) {
  const out = [];
  for (const t of fila.slice(1)) {
    if (/^[a-d]$/.test(t) && out.length) out[out.length - 1].q = t;
    else if (/^[\d,.]+$/.test(t) || t === "**") out.push({ v: t === "**" ? null : Number(t.replace(/,/g, "")), q: null });
  }
  return out; /* estudio 24/25, 1 hab. 24/25, 2 hab. 24/25, 3+ hab. 24/25, total 24/25 */
}

/* ---------- Carga y preparación de datos ---------- */
export function cargar(root) {
  const base = join(root, "scripts/canada-en-datos");
  const loc = JSON.parse(readFileSync(join(base, "alberta-localidades.json"), "utf8"));
  const ciu = JSON.parse(readFileSync(join(base, "alberta-ciudades.json"), "utf8"));
  const hosp = JSON.parse(readFileSync(join(base, "alberta-hospitales.json"), "utf8"));

  const todos = loc.localidades.map((r) => ({ ...r }));
  /* Encuadre del mapa: en la proyección cónica el paralelo 49 (frontera sur)
     se curva, así que los límites se calculan con la geometría real. */
  const xs = [], ys = [];
  for (const r of loc.mapa.regiones) for (const m of r.d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)) xs.push(+m[1]), ys.push(+m[2]);
  for (const r of todos) xs.push(r.x), ys.push(r.y);
  const MARGEN = 6;
  const dx = MARGEN - Math.min(...xs), dy = MARGEN - Math.min(...ys);
  const mueve = (v, d) => Math.round((v + d) * 10) / 10;
  const mapa = {
    ancho: Math.ceil(Math.max(...xs) + dx + MARGEN),
    alto: Math.ceil(Math.max(...ys) + dy + MARGEN),
    regiones: loc.mapa.regiones.map((r) => ({ ...r, d: r.d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${mueve(+x, dx)},${mueve(+y, dy)}`) })),
  };
  for (const r of todos) (r.x = mueve(r.x, dx)), (r.y = mueve(r.y, dy));
  const porCodigo = new Map(todos.filter((r) => ES_MUNICIPIO(r.t)).map((r) => [r.c, r]));
  /* Un mismo lugar puede figurar como área de servicio urbano y como
     hamlet o localidad del mismo municipio: se muestra una sola vez. */
  const clave = (r) => `${r.n.replace(/\s*\(.*\)$/, "").toLowerCase()}|${r.m}`;
  const usa = new Set(todos.filter((r) => r.t === "usa").map(clave));
  const hamlets = new Set(todos.filter((r) => r.t === "hamlet" || r.t === "townsite").map(clave));
  const items = todos.filter((r) => {
    if ((r.t === "hamlet" || r.t === "townsite") && usa.has(clave(r))) return false;
    if (r.t === "locality" && (usa.has(clave(r)) || hamlets.has(clave(r)))) return false;
    return true;
  });

  /* Páginas: una por municipio; nombre de URL único */
  const usados = new Set();
  for (const r of items.filter((x) => ES_MUNICIPIO(x.t))) {
    let s = slug(r.n);
    if (usados.has(s)) s = `${s}-${slug(TIPOS[r.t].en)}`;
    if (usados.has(s)) throw new Error(`Nombre de URL repetido: ${s}`);
    usados.add(s);
    r.s = s;
  }
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r || r.t !== "city") throw new Error(`Ficha completa sin municipio: ${k}`);
    r.ficha = true;
  }
  /* Comunidades de cada municipio */
  for (const r of items.filter((x) => !ES_MUNICIPIO(x.t))) {
    const p = porCodigo.get(r.m);
    if (!p) throw new Error(`Comunidad sin municipio: ${r.n}`);
    (p.comunidades ||= []).push(r);
  }
  /* Población de las áreas especiales: la lista la publica solo en conjunto (Special Areas Board) */
  return { meta: loc._fuentes, conteo: loc.conteo_capas, regiones: loc.regiones, mapa, items, porCodigo, ciu, hosp };
}

/* ---------- Datos para el navegador (js/alberta-localidades.js) ---------- */
export function datosNavegador(L) {
  const indice = new Map(L.items.map((r, i) => [r, i]));
  const filas = L.items.map((r) => [
    r.n,
    r.t,
    Number(r.r),
    r.x,
    r.y,
    ES_MUNICIPIO(r.t) ? -1 : indice.get(L.porCodigo.get(r.m)),
    typeof r.p === "number" ? r.p : null,
    r.s || "",
    r.ficha ? 1 : 0,
  ]);
  const datos = {
    tipos: Object.fromEntries(Object.entries(TIPOS).map(([k, v]) => [k, [v.es, v.en, v.grupo]])),
    grupos: GRUPOS,
    regiones: Object.fromEntries(Object.entries(L.regiones).map(([k, v]) => [k, nombreRegion(v)])),
    mapa: L.mapa,
    campos: ["nombre", "tipo", "region", "x", "y", "municipio", "poblacion", "url", "ficha"],
    localidades: filas,
  };
  return `/* Generado por scripts/build-canada-datos.mjs a partir de fuentes oficiales del Gobierno de Alberta
   (límites municipales y comunidades; Municipal Affairs Population List 2025). No editar a mano. */
window.AB_LOCALIDADES = ${JSON.stringify(datos)};
`;
}

/* ---------- Mapa de regiones (SVG estático) ---------- */
export function mapaSvg(L) {
  const { ancho, alto, regiones } = L.mapa;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}">
<title>Alberta: regiones económicas</title>
${regiones.map((r) => `<path d="${r.d}" fill="#f2f1ed" stroke="#9aa58a" stroke-width="1.2" stroke-linejoin="round"/>`).join("\n")}
</svg>
`;
}

/* ---------- Sección del directorio en la ficha de Alberta ---------- */
export function seccionDirectorio(L, esc) {
  const cuenta = (t) => L.items.filter((r) => r.t === t).length;
  const resumen = Object.entries(GRUPOS)
    .map(([g, titulo]) => {
      const tipos = Object.entries(TIPOS).filter(([, v]) => v.grupo === g);
      const total = tipos.reduce((a, [k]) => a + cuenta(k), 0);
      return `<li><strong>${esc(titulo)}: ${miles(total)}</strong> — ${tipos.map(([k, v]) => `${miles(cuenta(k))} ${esc(cuenta(k) === 1 ? (v.es === v.en ? v.es.toLowerCase() : `${v.es.toLowerCase()} (${v.en.toLowerCase()})`) : v.plural)}`).join(", ")}</li>`;
    })
    .join("\n          ");
  const fichas = Object.keys(FICHAS)
    .map((k) => `<li><a href="/canada-en-datos/alberta/${k}">${esc(FICHAS[k].nombre)}</a></li>`)
    .join("\n          ");
  const opcionesTipo = Object.entries(GRUPOS)
    .map(([g, titulo]) => `<optgroup label="${esc(titulo)}">
              <option value="grupo:${g}">Todos: ${esc(titulo.toLowerCase())}</option>
              ${Object.entries(TIPOS)
                .filter(([, v]) => v.grupo === g)
                .map(([k, v]) => `<option value="${k}">${esc(v.es)} (${esc(v.en)})</option>`)
                .join("\n              ")}
            </optgroup>`)
    .join("\n            ");
  const opcionesRegion = Object.entries(L.regiones)
    .map(([k, v]) => `<option value="${k}">${esc(nombreRegion(v))}</option>`)
    .join("\n            ");
  return `<section class="cd-section cd-loc" id="localidades" aria-labelledby="localidades-titulo">
      <h2 id="localidades-titulo">Explora las ciudades y pueblos de Alberta</h2>
      <p>Investiga las localidades de Alberta antes de decidir dónde vivir, trabajar o estudiar. El directorio incluye todos los municipios y las comunidades no incorporadas que publica el Gobierno de Alberta, con su clasificación oficial. Los <strong>hamlets</strong> y las demás comunidades no incorporadas no son municipios: pertenecen a un municipio, que es quien las administra.</p>
      <div class="cd-loc__resumen">
        <h3>Qué incluye</h3>
        <ul>
          ${resumen}
        </ul>
        <p class="cd-loc__nota">Total: ${miles(L.items.length)} localidades. Las regiones son las 8 regiones económicas oficiales de 2021; cada localidad se asignó según su ubicación en los límites oficiales.</p>
      </div>
      <div class="cd-loc__fichas">
        <h3>Fichas completas</h3>
        <ul>
          ${fichas}
        </ul>
        <p class="cd-loc__nota">Las demás localidades tienen, por ahora, una página con información básica. Iremos completándolas.</p>
      </div>

      <div class="cd-loc__app" id="cdLoc" data-src="/js/alberta-localidades.js">
        <form class="cd-loc__filtros" role="search" aria-label="Buscar localidades de Alberta" onsubmit="return false">
          <div class="cd-loc__campo cd-loc__campo--buscar">
            <label for="cdLocBuscar">Buscar por nombre</label>
            <input type="search" id="cdLocBuscar" autocomplete="off" placeholder="Por ejemplo: Brooks" disabled>
          </div>
          <div class="cd-loc__campo">
            <label for="cdLocTipo">Tipo de localidad</label>
            <select id="cdLocTipo" disabled>
              <option value="">Todos los tipos</option>
            ${opcionesTipo}
            </select>
          </div>
          <div class="cd-loc__campo">
            <label for="cdLocRegion">Región económica</label>
            <select id="cdLocRegion" disabled>
              <option value="">Todas las regiones</option>
            ${opcionesRegion}
            </select>
          </div>
        </form>
        <p class="cd-loc__estado" id="cdLocEstado" role="status" aria-live="polite">Cargando el directorio…</p>
        <div class="cd-loc__cuerpo">
          <figure class="cd-loc__mapa" id="cdLocMapa" aria-label="Mapa de Alberta con las localidades del listado"></figure>
          <div class="cd-loc__lista-caja">
            <ul class="cd-loc__lista" id="cdLocLista"></ul>
            <button type="button" class="btn cd-loc__mas" id="cdLocMas" hidden>Mostrar más</button>
          </div>
        </div>
        <noscript><p>Para usar el buscador y el mapa, activa JavaScript. Puedes abrir directamente las fichas completas de arriba.</p></noscript>
      </div>
      <p class="cd-loc__fuente">Fuentes: <a href="${FUENTES.geo.url}" target="_blank" rel="noopener">${esc(FUENTES.geo.org)} — ${esc(FUENTES.geo.title)}</a>; <a href="${FUENTES.regiones.url}" target="_blank" rel="noopener">regiones económicas 2021</a>; población: <a href="${FUENTES.mapl.url}" target="_blank" rel="noopener">${esc(FUENTES.mapl.title)}</a> (no es una estimación oficial de población). Consultado el ${esc(fechaEs(L.meta.consultado))}.</p>
    </section>`;
}

/* ---------- Páginas de cada localidad ---------- */
function fila(dt, dd) {
  return `<div class="cd-fact"><dt>${dt}</dt><dd>${dd}</dd></div>`;
}
const NO_DISPONIBLE = '<span class="cd-pending">Dato no disponible</span>';
const enlaces = (lista, esc) => `<div class="cd-links">
        ${lista.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("\n        ")}
      </div>`;
const fuente = (f, esc) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.org)} — ${esc(f.title)}</a>`;

function seccion(id, titulo, cuerpo) {
  return `<section class="cd-section" id="${id}" aria-labelledby="${id}-titulo">
      <h2 id="${id}-titulo">${titulo}</h2>
      ${cuerpo}
    </section>`;
}

function datoBloque(etiqueta, valor, detalle) {
  return `<div class="cd-indicator">
          <p class="cd-indicator__label">${etiqueta}</p>
          <p class="cd-indicator__value${valor ? "" : " cd-pending"}">${valor || "Dato no disponible"}</p>
          ${detalle ? `<p class="cd-indicator__src">${detalle}</p>` : ""}
        </div>`;
}

export function paginas(L, ctx) {
  const { esc, head, chrome, scriptsBase, meta } = ctx;
  const { ciu, hosp } = L;
  const consultado = fechaEs(L.meta.consultado);
  const out = {};
  for (const r of L.items.filter((x) => x.s)) {
    const tipo = TIPOS[r.t];
    const k = r.s;
    const c = r.ficha ? ciu.ciudades[k] : null;
    const region = nombreRegion(L.regiones[r.r]);
    const epa = ciu.regiones[EPA_GEO[r.r]];
    const path = `/canada-en-datos/alberta/${k}`;
    const titulo = r.ficha ? `${r.n}, Alberta: guía para inmigrantes y recién llegados` : `${r.n}, Alberta: información básica`;
    const descripcion = r.ficha
      ? `${r.n} (Alberta) en datos: población, empleo, alquileres, escuelas, hospitales, transporte y servicios para recién llegados, con fuentes oficiales.`
      : `${r.n} es ${tipo.grupo === "incorporado" ? "un municipio" : "una entidad"} de Alberta (${tipo.es}, ${tipo.en}). Clasificación oficial, región, población y enlaces oficiales.`;

    /* --- Datos rápidos --- */
    const pobLista = typeof r.p === "number"
      ? `${miles(r.p)} <small class="cd-fact__period">Municipal Affairs Population List 2025${r.cm ? `; último censo municipal: ${fechaEs(r.cm)}` : ""}</small>`
      : r.t === "special-area"
        ? `${NO_DISPONIBLE} <small class="cd-fact__period">La lista oficial publica una sola cifra para las tres áreas especiales (Special Areas Board).</small>`
        : NO_DISPONIBLE;
    const datos = [
      fila("Clasificación oficial", `${esc(tipo.es)} <small class="cd-fact__period">${esc(tipo.en)}${r.l ? ` · Nombre legal: ${esc(r.l)}` : ""}</small>`),
      fila("Región económica", esc(region)),
      fila("Población", pobLista),
      c && c.censo2021 ? fila("Población, Censo 2021", `${miles(c.censo2021.pob2021)} <small class="cd-fact__period">Censo 2016: ${miles(c.censo2021.pob2016)} (${c.censo2021.cambio >= 0 ? "+" : ""}${String(c.censo2021.cambio)}%)</small>`) : "",
    ].join("\n          ");

    /* --- Mapa --- */
    const px = ((r.x / L.mapa.ancho) * 100).toFixed(2);
    const py = ((r.y / L.mapa.alto) * 100).toFixed(2);
    const mapa = `<figure class="cd-loc-mini">
        <div class="cd-loc-mini__lienzo" style="aspect-ratio:${L.mapa.ancho}/${L.mapa.alto}">
          <img src="/assets/canada-en-datos/alberta-regiones.svg" alt="Mapa de Alberta con la ubicación de ${esc(r.n)}" width="${L.mapa.ancho}" height="${L.mapa.alto}" loading="lazy">
          <span class="cd-loc-mini__punto" style="left:${px}%;top:${py}%" aria-hidden="true"></span>
        </div>
        <figcaption>Ubicación aproximada en la región económica ${esc(region)}. Mapa elaborado con los límites oficiales del Gobierno de Alberta.</figcaption>
      </figure>`;

    /* --- Comunidades del municipio --- */
    const comunidades = (r.comunidades || []).slice().sort((a, b) => a.n.localeCompare(b.n, "es"));
    const porTipo = {};
    for (const x of comunidades) (porTipo[x.t] ||= []).push(x.n);
    const listaComunidades = comunidades.length
      ? `<p>Según el Gobierno de Alberta, dentro de ${esc(r.n)} hay ${miles(comunidades.length)} ${comunidades.length === 1 ? "comunidad no incorporada" : "comunidades no incorporadas"}. No son municipios: las administra ${esc(r.n)}.</p>
      ${Object.entries(porTipo)
        .map(([t, nombres]) => `<h3>${esc(TIPOS[t].plural.replace(/^./, (m) => m.toUpperCase()))} (${nombres.length})</h3>
      <p class="cd-loc-comunidades">${nombres.map(esc).join(" · ")}</p>`)
        .join("\n      ")}`
      : "";

    /* --- Empleo (región económica) --- */
    let empleo;
    if (epa && epa.lfs) {
      const ind = Object.entries(epa.industrias || {})
        .filter(([n]) => INDUSTRIAS_ES[n] && /^[\d.]+$/.test(epa.industrias[n].v))
        .sort((a, b) => Number(b[1].v) - Number(a[1].v))
        .slice(0, 4);
      const nombreEpa = EPA_GEO[r.r].replace(", Alberta", "").replace(/-/g, "–");
      empleo = `<p>Las cifras de empleo de Statistics Canada se publican por región económica, no por localidad. ${esc(r.n)} está en la región ${esc(nombreEpa)}${r.r === "4840" || r.r === "4870" ? " (Statistics Canada publica estas dos regiones juntas)" : ""}.</p>
      <div class="cd-indicators">
        ${datoBloque("Tasa de desempleo de la región", `${esc(epa.lfs["Unemployment rate"].v)}%`, `Promedio anual ${esc(epa.anio)}. Fuente: ${fuente(FUENTES.epa, esc)}. Consultado el ${esc(consultado)}.`)}
        ${datoBloque("Tasa de empleo de la región", `${esc(epa.lfs["Employment rate"].v)}%`, `Promedio anual ${esc(epa.anio)}. Fuente: ${fuente(FUENTES.epa, esc)}.`)}
      </div>
      ${ind.length ? `<h3>Industrias con más empleo en la región (${esc(epa.anio)})</h3>
      <ol class="cd-list-items">
        ${ind.map(([n, v]) => `<li>${esc(INDUSTRIAS_ES[n])}: unas ${miles(Math.round(Number(v.v) * 1000))} personas ocupadas</li>`).join("\n        ")}
      </ol>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.industrias, esc)}. Cifras redondeadas de la Encuesta de Población Activa.</p>` : ""}`;
    } else empleo = `<p>${NO_DISPONIBLE}</p>`;
    const busqueda = r.ficha ? [{ label: `Job Bank — Empleos en ${r.n}`, href: `https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=${encodeURIComponent(r.n).replace(/%20/g, "+")}%2C+AB` }, ...RECURSOS.empleo.slice(1)] : RECURSOS.empleo;

    /* --- Vivienda --- */
    let vivienda = `<p>${NO_DISPONIBLE}: CMHC no publica alquileres para esta localidad en su encuesta anual.</p>`;
    if (c && c.cmhc && c.cmhc.alquiler) {
      const a = celdasCmhc(c.cmhc.alquiler);
      const v = celdasCmhc(c.cmhc.vacancia);
      const calidad = (q) => (q === "d" ? " (calidad baja según CMHC: usar con precaución)" : "");
      const centro = c.cmhc.centro.replace(/ CMA$/, " (área metropolitana censal)").replace(/ CA$/, " (aglomeración censal)");
      vivienda = `<p>Encuesta de alquileres de CMHC, octubre de 2025, para apartamentos privados en ${esc(centro)}.</p>
      <div class="cd-indicators">
        ${datoBloque("Alquiler promedio, 2 habitaciones", a[5].v ? `$${miles(a[5].v)} al mes` : null, `Octubre de 2025${calidad(a[5].q)}. Fuente: ${fuente(FUENTES.cmhc, esc)}.`)}
        ${datoBloque("Alquiler promedio, todos los tamaños", a[9].v ? `$${miles(a[9].v)} al mes` : null, `Octubre de 2025${calidad(a[9].q)}.`)}
        ${datoBloque("Tasa de desocupación", v[9].v !== null ? `${v[9].v.toFixed(1)}%` : null, `Octubre de 2025${calidad(v[9].q)}. Porcentaje de apartamentos privados vacíos y disponibles.`)}
      </div>
      <p class="cd-indicator__src">Los promedios incluyen contratos antiguos y nuevos: un alquiler nuevo suele costar más que el promedio.</p>`;
    }

    /* --- Escuelas --- */
    let escuelas = `<p>${NO_DISPONIBLE} en esta página. Consulta el directorio oficial de escuelas y autoridades escolares.</p>`;
    if (c && c.escuelas) {
      const e = c.escuelas;
      const auts = Object.entries(e.autoridades).sort((a, b) => b[1].n - a[1].n);
      const tipoAut = { Public: "Pública", Separate: "Católica (separada)", Francophone: "Francófona" };
      escuelas = `<p>El directorio oficial de Alberta Education registra ${miles(e.total)} escuelas con dirección en ${esc(r.n)} (actualizado el ${esc(fechaEs(ciu.escuelas_fecha))}), entre públicas, católicas, francófonas, privadas y otras.</p>
      <h3>Autoridades escolares con escuelas en ${esc(r.n)}</h3>
      <ul class="cd-list-items">
        ${auts.map(([n, v]) => `<li>${v.web ? `<a href="${esc(v.web)}" target="_blank" rel="noopener">${esc(n)}</a>` : esc(n)} — ${esc(tipoAut[v.tipo] || v.tipo)}, ${v.n} ${v.n === 1 ? "escuela" : "escuelas"}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. Para inscribir a tus hijos, comunícate con la autoridad escolar de tu zona.</p>`;
    }

    /* --- Salud --- */
    let salud = `<p>${NO_DISPONIBLE} en esta página. Usa el buscador oficial de servicios de salud o llama a Health Link 811. En una emergencia, llama al 911.</p>`;
    const h = r.ficha ? hosp.ciudades[r.n] : null;
    if (h) {
      const urg = h.filter((x) => x.urgencias.EMRG);
      const ucc = h.filter((x) => x.urgencias.UCC);
      salud = `<p>Instalaciones de ${esc(r.n)} con un área de urgencias registrada en el listado oficial de instalaciones del Gobierno de Alberta. En una emergencia, llama al 911. Para consejos de salud, llama gratis a Health Link 811.</p>
      <ul class="cd-list-items">
        ${urg.map((x) => `<li>${esc(x.nombre)}${x.urgencias.PEMG ? " — incluye urgencias pediátricas" : ""}</li>`).join("\n        ")}
      </ul>
      ${ucc.length ? `<h3>Centros de atención urgente</h3>
      <ul class="cd-list-items">
        ${ucc.map((x) => `<li>${esc(x.nombre)}</li>`).join("\n        ")}
      </ul>` : ""}
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.instalaciones, esc)}. Los nombres aparecen tal como figuran en el listado. Confirma horarios y servicios en Alberta Health Services antes de ir.</p>`;
    }

    /* --- Transporte --- */
    const f = r.ficha ? FICHAS[k] : null;
    const transporte = f && f.transporte
      ? `<p>Información oficial de transporte público:</p>${enlaces([f.transporte], esc)}`
      : `<p>${NO_DISPONIBLE}${f ? ": no encontramos un servicio municipal de transporte público en el sitio oficial de la ciudad." : "."}</p>`;

    /* --- Fuentes --- */
    const listaFuentes = [
      FUENTES.geo,
      FUENTES.regiones,
      FUENTES.mapl,
      FUENTES.tipos,
      ...(c ? [FUENTES.censo, FUENTES.cmhc, FUENTES.escuelas, FUENTES.instalaciones] : []),
      ...(epa ? [FUENTES.epa, FUENTES.industrias] : []),
    ];
    const oficiales = [
      ...(f ? [{ label: `Sitio oficial de ${r.n}`, href: f.web }] : []),
      { label: "Gobierno de Alberta — Perfiles municipales (Municipal profiles)", href: FUENTES.perfiles.url },
      { label: "Gobierno de Alberta — Tipos de municipios", href: FUENTES.tipos.url },
    ];

    const toc = [["resumen", "Resumen"], ["ubicacion", "Ubicación"], ...(comunidades.length ? [["comunidades", "Comunidades"]] : []), ["economia-empleo", "Economía y empleo"], ["vivienda", "Vivienda"], ["educacion", "Educación"], ["salud", "Salud"], ["transporte", "Transporte"], ["recien-llegados", "Recién llegados"], ["enlaces", "Enlaces y fuentes"]];
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: titulo,
      description: descripcion,
      url: `https://podcastdelmigrante.com${path}`,
      inLanguage: "es",
      dateModified: L.meta.consultado,
      about: { "@type": r.t === "city" || r.t === "town" || r.t === "village" ? "City" : "AdministrativeArea", name: r.n, containedInPlace: { "@type": "AdministrativeArea", name: "Alberta" } },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: "https://podcastdelmigrante.com/" },
          { "@type": "ListItem", position: 2, name: "Canadá en Datos", item: "https://podcastdelmigrante.com/canada-en-datos/" },
          { "@type": "ListItem", position: 3, name: "Alberta", item: "https://podcastdelmigrante.com/canada-en-datos/alberta" },
          { "@type": "ListItem", position: 4, name: r.n, item: `https://podcastdelmigrante.com${path}` },
        ],
      },
    };
    const intro = c && c.censo2021
      ? `${r.n} es una ciudad (City) de la región económica ${region}. Según el Censo 2021 de Statistics Canada, tenía ${miles(c.censo2021.pob2021)} habitantes. Aquí encontrarás datos oficiales y enlaces útiles para investigar la ciudad antes de mudarte, trabajar o estudiar.`
      : `${r.n} está clasificada oficialmente como ${tipo.es.toLowerCase()} (${tipo.en}) y se encuentra en la región económica ${region}. Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.`;

    out[`alberta/${k}.html`] = `${head({ meta, title: `${titulo} — El Podcast del Migrante`, description: descripcion, path, image: "/assets/canada-en-datos/social-alberta.jpg", imageAlt: "Mapa de Canadá con Alberta resaltada y el título Alberta en datos, de El Podcast del Migrante.", jsonLd, noindex: !r.ficha })}
<body data-cd-localidad="${esc(k)}">
${chrome.cabecera}

<main id="main" class="cd">
  <div class="wrap">
    <div class="cd-region-hero">
      <div>
        <nav class="cd-breadcrumb" aria-label="Ruta de navegación"><a href="/index.html">Inicio</a> › <a href="/canada-en-datos/">Canadá en Datos</a> › <a href="/canada-en-datos/alberta">Alberta</a> › <span aria-current="page">${esc(r.n)}</span></nav>
        <p class="cd-kicker">Alberta · ${esc(tipo.es)}${r.ficha ? "" : " · Información básica"}</p>
        <h1>${esc(r.n)}</h1>
        <p class="cd-lead">${esc(intro)}</p>
        <p class="cd-meta">Datos consultados el ${esc(consultado)}. <a href="/canada-en-datos/alberta#localidades">Volver al directorio de Alberta</a></p>
      </div>
      <aside class="cd-panel" id="resumen" aria-label="Datos rápidos de ${esc(r.n)}">
        <dl class="cd-facts">
          ${datos}
        </dl>
      </aside>
    </div>

    <nav class="cd-toc" aria-label="Contenido de la página">
      ${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join("\n      ")}
    </nav>

    ${seccion("ubicacion", "Ubicación y mapa", mapa)}

    ${comunidades.length ? seccion("comunidades", `Comunidades de ${esc(r.n)}`, listaComunidades) : ""}

    ${seccion("economia-empleo", "Economía, empleo y búsqueda de trabajo", `${empleo}
      <h3>Buscar trabajo</h3>
      ${enlaces(busqueda, esc)}`)}

    ${seccion("vivienda", "Vivienda y alquileres", vivienda)}

    ${seccion("educacion", "Escuelas y educación", `${escuelas}
      ${enlaces([{ label: "Alberta Education — Directorio de escuelas y autoridades escolares", href: FUENTES.escuelas.url }], esc)}`)}

    ${seccion("salud", "Hospitales y servicios de salud", `${salud}
      ${enlaces(RECURSOS.salud, esc)}`)}

    ${seccion("transporte", "Transporte", transporte)}

    ${seccion("recien-llegados", "Servicios para inmigrantes y recién llegados", `<p>Los servicios de asentamiento financiados por el Gobierno de Canadá son gratuitos para quienes cumplen los requisitos de elegibilidad. Busca los más cercanos con tu código postal.</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la <a href="/canada-en-datos/alberta#recien-llegado">guía de primeros pasos en Alberta</a>.</p>`)}

    <section class="cd-method" id="enlaces" aria-labelledby="enlaces-titulo">
      <h2 id="enlaces-titulo">Enlaces oficiales y fuentes</h2>
      ${enlaces(oficiales, esc)}
      <p>Esta página reúne información general y enlaces a fuentes oficiales; no sustituye la información oficial vigente. Cuando un dato no tiene una fuente oficial verificada, se indica «Dato no disponible».</p>
      <ul>
        ${listaFuentes.map((x) => `<li>${fuente(x, esc)}</li>`).join("\n        ")}
      </ul>
    </section>
  </div>
</main>

${chrome.pie}

${scriptsBase([])}`;
  }
  return out;
}
