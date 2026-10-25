/*
  provincias/alberta.mjs — Directorio de localidades de Alberta
  ======================================================================
  Datos oficiales ya descargados (scripts/canada-en-datos/obtener-
  localidades.py y obtener-ciudades.py) y contenido de cada ficha. La
  estructura de las páginas la pone el motor común (../localidades.mjs).

  Criterio: todos los municipios y las comunidades no incorporadas que
  publica el Gobierno de Alberta. Cada municipio tiene una página; las
  seis fichas completas (FICHAS) se indexan y las demás llevan noindex
  hasta completarse.
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";

export const slugProvincia = "alberta";

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

/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Gobierno de Alberta: límites municipales y comunidades; Municipal Affairs Population List 2025",
  poblacion: "Municipal Affairs Population List 2025",
  regiones: "8 regiones económicas",
  regionEtiqueta: "Región económica",
  ejemplo: "Brooks",
  notaFichas: "Las demás localidades tienen, por ahora, una página con información básica. Iremos completándolas.",
  intro: () => `<p>Investiga las localidades de Alberta antes de decidir dónde vivir, trabajar o estudiar. El directorio incluye todos los municipios y las comunidades no incorporadas que publica el Gobierno de Alberta, con su clasificación oficial. Los <strong>hamlets</strong> y las demás comunidades no incorporadas no son municipios: pertenecen a un municipio, que es quien las administra.</p>`,
  nota: (L) => `Total: ${miles(L.items.length)} localidades. Las regiones son las 8 regiones económicas oficiales de 2021; cada localidad se asignó según su ubicación en los límites oficiales.`,
  fuentes: (L, esc) => `Fuentes: <a href="${FUENTES.geo.url}" target="_blank" rel="noopener">${esc(FUENTES.geo.org)} — ${esc(FUENTES.geo.title)}</a>; <a href="${FUENTES.regiones.url}" target="_blank" rel="noopener">regiones económicas 2021</a>; población: <a href="${FUENTES.mapl.url}" target="_blank" rel="noopener">${esc(FUENTES.mapl.title)}</a> (no es una estimación oficial de población). Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
function pagina(r, L, { esc }) {
  const { ciu, hosp } = L;
  const tipo = TIPOS[r.t];
  const k = r.s;
  const c = r.ficha ? ciu.ciudades[k] : null;
  const region = nombreRegion(L.regiones[r.r]);
  const epa = ciu.regiones[EPA_GEO[r.r]];
  const consultado = fechaEs(L.meta.consultado);

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
  const empleo = empleoRegional({
    epa,
    nombre: r.n,
    nombreEpa: (EPA_GEO[r.r] || "").replace(", Alberta", "").replace(/-/g, "–"),
    nota: r.r === "4840" || r.r === "4870" ? " (Statistics Canada publica estas dos regiones juntas)" : "",
    esc,
    consultado,
    fuentes: FUENTES,
  });
  const busqueda = r.ficha ? [{ label: `Job Bank — Empleos en ${r.n}`, href: `https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=${encodeURIComponent(r.n).replace(/%20/g, "+")}%2C+AB` }, ...RECURSOS.empleo.slice(1)] : RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = `<p>${NO_DISPONIBLE}: CMHC no publica alquileres para esta localidad en su encuesta anual.</p>`;
  if (c && c.cmhc && c.cmhc.alquiler) {
    vivienda = viviendaCmhc({ cmhc: c.cmhc, centro: c.cmhc.centro.replace(/ CMA$/, " (área metropolitana censal)").replace(/ CA$/, " (aglomeración censal)"), esc, fuenteCmhc: FUENTES.cmhc });
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

  const recien = `<p>Los servicios de asentamiento financiados por el Gobierno de Canadá son gratuitos para quienes cumplen los requisitos de elegibilidad. Busca los más cercanos con tu código postal.</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la <a href="/canada-en-datos/alberta#recien-llegado">guía de primeros pasos en Alberta</a>.</p>`;

  /* --- Fuentes --- */
  const fuentes = [
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

  const intro = c && c.censo2021
    ? `${r.n} es una ciudad (City) de la región económica ${region}. Según el Censo 2021 de Statistics Canada, tenía ${miles(c.censo2021.pob2021)} habitantes. Aquí encontrarás datos oficiales y enlaces útiles para investigar la ciudad antes de mudarte, trabajar o estudiar.`
    : `${r.n} está clasificada oficialmente como ${tipo.es.toLowerCase()} (${tipo.en}) y se encuentra en la región económica ${region}. Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.`;

  return {
    titulo,
    descripcion,
    kicker: `Alberta · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro,
    datos,
    ubicacion: `Ubicación aproximada en la región económica ${esc(region)}. Mapa elaborado con los límites oficiales del Gobierno de Alberta.`,
    comunidades: listaComunidades,
    empleo,
    busqueda,
    vivienda,
    escuelas,
    escuelasEnlaces: [{ label: "Alberta Education — Directorio de escuelas y autoridades escolares", href: FUENTES.escuelas.url }],
    salud,
    saludEnlaces: RECURSOS.salud,
    transporte,
    recien,
    oficiales,
    fuentes,
    indexar: !!r.ficha,
    ciudad: r.t === "city" || r.t === "town" || r.t === "village",
  };
}

/* Texto de la imagen social de cada localidad */
function tarjeta(r) {
  const tipo = TIPOS[r.t];
  return {
    tipo: tipo.es === tipo.en ? tipo.es : `${tipo.es} (${tipo.en})`,
    dato: typeof r.p === "number" ? `${miles(r.p)} habitantes (Municipal Affairs Population List 2025)` : "",
  };
}

export default {
  slug: "alberta",
  nombre: "Alberta",
  TIPOS,
  GRUPOS,
  FICHAS,
  FUENTES,
  esMunicipio: (r) => ES_MUNICIPIO(r.t),
  cargar,
  directorio,
  pagina,
  tarjeta,
};
