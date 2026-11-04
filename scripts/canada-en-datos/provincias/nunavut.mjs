/*
  provincias/nunavut.mjs — Directorio de comunidades de Nunavut
  =============================================================
  Criterio de inclusión (documentado en el repositorio interno):
  - Una página por cada subdivisión censal (CSD) del territorio en el Censo
    2021 de Statistics Canada: 31 en total, que cubren todo Nunavut:
      · 1 ciudad (Iqaluit, la capital) y 24 hamlets: las 25 comunidades
        con gobierno municipal;
      · 3 asentamientos (settlements) sin población en el Censo 2021
        (Nanisivik, Bathurst Inlet y Umingmaktok);
      · 3 zonas no organizadas, una por región.
  - Sin página propia, dentro de la página de su CSD: los lugares poblados
    con nombre oficial de la Base de datos de nombres geográficos de Canadá
    (CGNDB, Recursos Naturales Canadá), ubicados en su CSD por sus
    coordenadas oficiales (p. ej., Apex, en Iqaluit, o Alert y Eureka).
  - Las tres regiones (Qikiqtaaluk, Kivalliq y Kitikmeot) son las
    divisiones censales: son el filtro «Región» y el área de cada página.
    Todo Nunavut es una sola región económica de Statistics Canada.
  - Nombres: Kinngait y Sanirajak se llamaban Cape Dorset y Hall Beach;
    el Censo 2021 todavía usa los nombres anteriores. Se muestran los
    nombres oficiales vigentes de la CGNDB y se indica el del censo.
  No se promete cobertura de campamentos o lugares sin nombre oficial.

  Hora: Nunavut tiene tres zonas horarias (ver ZONAS). Cada página muestra
  el reloj de su comunidad solo si su zona está identificada en la base de
  datos de zonas horarias de la IANA; si no, no se muestra un reloj.

  Datos (scripts/canada-en-datos/):
    nu-localidades.json   obtener-nu-localidades.py + compactar-nu.py

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, datoBloque } from "../localidades.mjs";

const PROV = "Nunavut";

/* ---------- Clasificación oficial ---------- */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "municipio", plural: "ciudad (la capital)", censo: "CY" },
  hamlet: { es: "Hamlet", en: "Hamlet", grupo: "municipio", plural: "hamlets (comunidades con gobierno municipal)", censo: "HAM" },
  asentamiento: { es: "Asentamiento", en: "Settlement", grupo: "otro", plural: "asentamientos (settlements) sin población en el Censo 2021", censo: "SET" },
  "no-organizado": { es: "Zona no organizada", en: "Unorganized", grupo: "otro", plural: "zonas no organizadas (una por región)", censo: "NO" },
  localidad: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades (localities)", gn: "Locality" },
  barrio: { es: "Barrio", en: "Neighbourhood", grupo: "comunidad", plural: "barrios (neighbourhoods)", gn: "Neighbourhood" },
  "lugar-asentamiento": { es: "Asentamiento (nombre geográfico)", en: "Settlement", grupo: "comunidad", plural: "asentamientos registrados como nombre geográfico", gn: "Settlement" },
  desembarcadero: { es: "Desembarcadero", en: "Landing", grupo: "comunidad", plural: "desembarcaderos (landings)", gn: "Landing" },
  estacion: { es: "Estación meteorológica", en: "Weather Station", grupo: "comunidad", plural: "estaciones meteorológicas", gn: "Weather Station" },
  antigua: { es: "Antigua localidad", en: "Former Locality", grupo: "comunidad", plural: "antiguas localidades", gn: "Former Locality" },
};
export const GRUPOS = {
  municipio: "Comunidades con gobierno municipal",
  otro: "Otras subdivisiones del censo",
  comunidad: "Lugares con nombre oficial (sin página propia)",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "comunidad";
const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
const POR_GN = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k]));

/* Regiones (divisiones censales 2021) */
export const REGIONES = { 6204: "Qikiqtaaluk", 6205: "Kivalliq", 6208: "Kitikmeot" };

/* Nombres oficiales vigentes (CGNDB) de las comunidades que el Censo 2021 nombra con su nombre anterior */
const NOMBRES = {
  6204007: { n: "Kinngait", antes: "Cape Dorset" },
  6204011: { n: "Sanirajak", antes: "Hall Beach" },
};
/* Nombres anteriores conocidos, solo para el buscador */
const ALIAS = { 6205027: ["Repulse Bay"], 6204022: ["Resolute Bay"] };

/* ---------- Zonas horarias ----------
   Base de datos de zonas horarias de la IANA (tzdata). Solo se asigna la
   zona de las comunidades que la IANA identifica; el Consejo Nacional de
   Investigación de Canadá (NRC) confirma que Nunavut tiene tres zonas y que la
   isla Southampton (Coral Harbour) usa la hora del Este todo el año. */
const Z = {
  este: { timeZone: "America/Iqaluit", texto: "Hora del Este: UTC−5 en invierno (EST) y UTC−4 con el horario de verano (EDT), de marzo a noviembre" },
  centro: { timeZone: "America/Rankin_Inlet", texto: "Hora del Centro: UTC−6 en invierno (CST) y UTC−5 con el horario de verano (CDT), de marzo a noviembre" },
  resolute: { timeZone: "America/Resolute", texto: "Hora del Centro: UTC−6 en invierno (CST) y UTC−5 con el horario de verano (CDT), de marzo a noviembre" },
  montana: { timeZone: "America/Cambridge_Bay", texto: "Hora de la Montaña: UTC−7 en invierno (MST) y UTC−6 con el horario de verano (MDT), de marzo a noviembre" },
  southampton: { timeZone: "America/Atikokan", texto: "Hora del Este todo el año (UTC−5), sin cambio de hora: igual que Iqaluit en invierno y una hora menos en verano" },
};
export const ZONAS = {
  6204003: "este", /* Iqaluit: America/Iqaluit, «Eastern - NU (most areas)» */
  6204022: "resolute", /* Resolute: America/Resolute, «Central - NU (Resolute)» */
  6205017: "centro", /* Rankin Inlet: America/Rankin_Inlet, «Central - NU (central)» */
  6208073: "montana", /* Cambridge Bay: America/Cambridge_Bay, «Mountain - NU (west)» */
  6205014: "southampton", /* Coral Harbour: «EST - NU (Coral H)»; NRC: isla Southampton, hora del Este todo el año */
};

/* ---------- Fichas completas ----------
   La capital y los dos centros regionales con hospital (Statistics Canada,
   ODHF). Enlaces comprobados antes de publicar. */
export const FICHAS = {
  iqaluit: { nombre: "Iqaluit", web: "https://www.iqaluit.ca/", centro: "la capital de Nunavut y de la región de Qikiqtaaluk" },
  "rankin-inlet": { nombre: "Rankin Inlet", centro: "el centro regional de Kivalliq" },
  "cambridge-bay": { nombre: "Cambridge Bay", centro: "el centro regional de Kitikmeot" },
};

/* Hospitales (Statistics Canada, ODHF 2020): nombre de la base → nombre oficial */
const HOSPITALES = {
  "qikiqtani general hospital": "Qikiqtani General Hospital",
  "kivalliq health centre": "Kivalliq Health Centre",
  "kitikmeot regional health centre": "Kitikmeot Regional Health Centre",
};

/* Aerolíneas regionales (sitios de las aerolíneas). Calm Air enumera entre sus comunidades las de Kivalliq,
   Sanikiluaq, Churchill y Winnipeg, con Rankin Inlet como centro de su red; Canadian North publica destinos en
   Qikiqtaaluk y Kitikmeot (por ejemplo, Iqaluit, Resolute, Kimmirut y Kugluktuk). No se publican rutas ni
   horarios: cambian y deben consultarse con la aerolínea. */
const AEROLINEAS = {
  calm: { label: "Calm Air — Aerolínea de Kivalliq y Sanikiluaq, con vuelos hacia Churchill y Winnipeg", href: "https://www.calmair.com/" },
  north: { label: "Canadian North — Aerolínea de Qikiqtaaluk y Kitikmeot, con vuelos hacia el sur del país", href: "https://canadiannorth.com/" },
};
const aerolineas = (r) => (r.cd === "6205" || r.c === "6204001" ? [AEROLINEAS.calm] : [AEROLINEAS.north]);

/* Nunavut Arctic College: campus que atiende a cada región (arcticcollege.com, «Locations») */
const CAMPUS = {
  6204: { label: "Nunavut Arctic College — Campus Nunatta (Iqaluit), que atiende a Qikiqtaaluk", href: "https://www.arcticcollege.com/campuses" },
  6205: { label: "Nunavut Arctic College — Campus Kivalliq (Rankin Inlet)", href: "https://www.arcticcollege.com/campuses" },
  6208: { label: "Nunavut Arctic College — Campus Kitikmeot (Cambridge Bay)", href: "https://www.arcticcollege.com/campuses" },
};

/* Índice de precios al consumidor (Statistics Canada, tabla 18-10-0004-01). Mide la variación de los precios,
   no su nivel: no permite decir cuánto más caro es Iqaluit que otra ciudad. */
const IPC = { periodo: "septiembre de 2026", anterior: "septiembre de 2025", iqaluit: { indice: "149.6", previo: "145.2", variacion: "3.0" }, canada: { variacion: "3.1" }, publicado: "19 de octubre de 2026" };

/* Encuesta de Población Activa de Nunavut (Statistics Canada). No hay datos por comunidad. */
const EPA = {
  mensual: { desempleo: "11.0", empleo: "55.5", ocupados: "15,400", periodo: "septiembre de 2026 (promedio móvil de 3 meses, desestacionalizado)" },
  anual: { desempleo: "10.3", periodo: "2025", fuente: { org: "Job Bank (Gobierno de Canadá)", title: "Economic Scan — Yukon, Northwest Territories and Nunavut: 2026", url: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/nunavut/environmental-scan" } },
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales, regiones y región económica", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Nunavut", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0292-01 — Características de la población activa de los territorios, promedio móvil de 3 meses", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410029201" },
  escuelas: { org: "Gobierno de Nunavut (Departamento de Educación)", title: "Schools and Colleges — directorio de escuelas (copia del Internet Archive del 22 de abril de 2026)", url: "https://www.gov.nu.ca/en/education-and-schools/schools-and-colleges" },
  csfn: { org: "Commission scolaire francophone du Nunavut", title: "École des Trois-Soleils (kínder a 12.º grado, en francés)", url: "https://trois-soleils.ca/" },
  rcmp: { org: "RCMP en Nunavut", title: "Nunavut RCMP detachment locations (números de cada destacamento)", url: "https://rcmp.ca/en/nunavut/detachments" },
  rcmp911: { org: "RCMP en Nunavut", title: "Tips for calling the Nunavut RCMP for emergencies (12 de diciembre de 2025)", url: "https://rcmp.ca/en/nunavut/news/2025/12/4348432" },
  clima: { org: "Environment and Climate Change Canada", title: "Normales climáticas de Canadá 1991-2020", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ipc: { org: "Statistics Canada", title: "Tabla 18-10-0004-01 — Índice de precios al consumidor, mensual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401" },
  hospitales: { org: "Statistics Canada", title: "Open Database of Healthcare Facilities (ODHF), versión 1.1 (2020)", url: "https://www.statcan.gc.ca/en/lode/databases/odhf" },
  hora: { org: "IANA", title: "Base de datos de zonas horarias (tzdata): zonas de Nunavut", url: "https://www.iana.org/time-zones" },
  horaNrc: { org: "Consejo Nacional de Investigación de Canadá (NRC)", title: "Time zones and daylight saving time", url: "https://nrc.canada.ca/en/certifications-evaluations-standards/canadas-official-time/time-zones-daylight-saving-time" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Nunavut", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Nunavut" },
    { label: "Job Bank — Panorama económico de Nunavut y los territorios (2026)", href: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/nunavut/environmental-scan" },
  ],
  escuelas: [
    { label: "Gobierno de Nunavut — Directorio de escuelas", href: "https://www.gov.nu.ca/en/education-and-schools/schools-and-colleges" },
  ],
  salud: [
    { label: "Gobierno de Nunavut — Plan de Salud de Nunavut (tarjeta de salud)", href: "https://www.gov.nu.ca/en/health/nunavut-health-care-plan" },
    { label: "RCMP en Nunavut — Números de emergencia de cada comunidad", href: "https://rcmp.ca/en/nunavut/detachments" },
    { label: "Kamatsiaqtut Nunavut Helpline — Línea de ayuda emocional de Nunavut", href: "https://nunavuthelpline.ca/" },
    { label: "9-8-8 — Línea de prevención del suicidio (llamada o mensaje de texto)", href: "https://988.ca/" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
  ],
  familias: [
    { label: "CRA — Canada Child Benefit (CCB): quién puede solicitarla", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview/canada-child-benefit-before-you-apply.html" },
    { label: "CRA — Nunavut Child Benefit (NUCB)", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/nunavut.html" },
    { label: "CRA — Deducciones para residentes del norte (línea 25500)", href: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions.html" },
    { label: "Gobierno de Nunavut — Asistencia de ingresos (Income Assistance)", href: "https://www.gov.nu.ca/en/social-supports/income-assistance" },
  ],
  vivienda: [
    { label: "Nunavut Housing Corporation — Vivienda pública, programas y organizaciones locales de vivienda", href: "https://www.nunavuthousing.ca/" },
  ],
};

/* ---------- Utilidades ---------- */
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const objeto = (campos, fila_) => Object.fromEntries(campos.map((c, i) => [c, fila_[i]]));
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
function km(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/* Mapa: GeoJSON en metros (EPSG:3347) → trazo SVG simplificado (igual que en los demás módulos; se copia para no modificarlos) */
function simplifica(pts, tol) {
  if (pts.length < 4) return pts;
  const dist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const marca = new Uint8Array(pts.length);
  marca[0] = marca[pts.length - 1] = 1;
  const pila = [[0, pts.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let max = 0, k = -1;
    for (let x = i + 1; x < j; x++) {
      const d = dist(pts[x], pts[i], pts[j]);
      if (d > max) (max = d), (k = x);
    }
    if (max > tol) (marca[k] = 1), pila.push([i, k], [k, j]);
  }
  return pts.filter((_, i) => marca[i]);
}
function trazo(geo, a, tol = 0.6) {
  const polis = geo.type === "Polygon" ? [geo.coordinates] : geo.type === "MultiPolygon" ? geo.coordinates : [];
  return polis
    .flatMap((p) =>
      p.map((anillo) => {
        const pts = simplifica(anillo.map(([x, y]) => a(x, y)), tol);
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        if (pts.length < 4 || Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys) < 3) return "";
        return "M" + pts.map((q) => q.join(",")).join("L") + "Z";
      }),
    )
    .join("");
}

/* Desplazamiento en metros (EPSG:3347) de las islas del sur y recuadro que las rodea: [xmín, ymín, xmáx, ymáx] */
const RECUADRO = { belcher: [0, 0.5e6], james: [0.2e6, 0.89e6], marco: [6.865e6, 2.69e6, 7.29e6, 2.875e6] };

/* ---------- Carga y preparación de datos ---------- */
export function cargar(root) {
  const base = join(root, "scripts/canada-en-datos");
  const J = JSON.parse(readFileSync(join(base, "nu-localidades.json"), "utf8"));
  const E = JSON.parse(readFileSync(join(base, "nu-escuelas.json"), "utf8"));
  const SV = JSON.parse(readFileSync(join(base, "nu-servicios.json"), "utf8"));
  const censo = (v) => Object.fromEntries(J.censo_campos.map((k, i) => [k, num(v[i])]));
  const csd = J.csd.map((f) => objeto(J.csd_campos, f));

  /* Recuadro: las islas Belcher (Sanikiluaq) y las de la bahía James (Akimiski, Charlton) quedan muy al sur del
     resto del territorio y dejaban casi una cuarta parte del mapa vacía en el celular. Se dibujan desplazadas
     dentro de un recuadro, en la bahía de Hudson, como es habitual en los mapas de ubicación. Las coordenadas
     reales (latitud y longitud) no cambian: solo cambia su posición en el dibujo. */
  const desplaza = (x, y) => (y < 2.0e6 ? [x + RECUADRO.james[0], y + RECUADRO.james[1]] : y < 2.45e6 && x > 6.8e6 ? [x + RECUADRO.belcher[0], y + RECUADRO.belcher[1]] : [x, y]);
  const geo = Object.fromEntries(Object.entries(J.cd_geo).map(([id, g]) => [id, { type: "MultiPolygon", coordinates: (g.type === "Polygon" ? [g.coordinates] : g.coordinates).map((p) => p.map((q) => q.map(([x, y]) => desplaza(x, y)))) }]));

  /* Encuadre del mapa (metros, EPSG:3347) */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (g, fn) => g.coordinates.forEach((p) => p.forEach((q) => q.forEach(([x, y]) => fn(x, y))));
  for (const g of Object.values(geo)) recorre(g, (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))));
  const ANCHO = 600, MARGEN = 6;
  const escala = (ANCHO - 2 * MARGEN) / (x1 - x0);
  const alto = Math.ceil((y1 - y0) * escala + 2 * MARGEN);
  const a0 = (x, y) => [Math.round(((x - x0) * escala + MARGEN) * 10) / 10, Math.round(((y1 - y) * escala + MARGEN) * 10) / 10];
  const a = (x, y) => a0(...desplaza(x, y));
  const [mx, my] = a0(RECUADRO.marco[0], RECUADRO.marco[3]);
  const [mx2, my2] = a0(RECUADRO.marco[2], RECUADRO.marco[1]);
  const mapa = {
    ancho: ANCHO,
    alto,
    regiones: J.regiones.map(([id, n]) => ({ r: id, n, d: trazo(geo[id], a0, 0.8) })),
    marcos: [{ x: mx, y: my, w: Math.round((mx2 - mx) * 10) / 10, h: Math.round((my2 - my) * 10) / 10, etiqueta: "Islas Belcher (Sanikiluaq) y de la bahía James, desplazadas hacia el norte en el dibujo" }],
  };

  /* --- Subdivisiones censales: una página cada una --- */
  const items = [];
  for (const c of csd) {
    const t = POR_CENSO[c.tipo];
    if (!t) throw new Error(`Tipo de subdivisión censal sin clasificar: ${c.tipo} (${c.nombre})`);
    if (!REGIONES[c.cd]) throw new Error(`División censal sin región: ${c.cd}`);
    const d = censo(c.censo);
    const [xx, yy] = a(c.x, c.y);
    const actual = NOMBRES[c.id];
    items.push({
      c: c.id,
      n: actual ? actual.n : c.nombre,
      censoNombre: c.nombre,
      antes: actual ? actual.antes : null,
      alias: [...(actual ? [actual.antes] : []), ...(ALIAS[c.id] || [])],
      t,
      r: c.cd,
      cd: c.cd,
      region: REGIONES[c.cd],
      x: xx,
      y: yy,
      lat: c.lat,
      lon: c.lon,
      desplazado: desplaza(c.x, c.y)[1] !== c.y,
      p: d.p,
      p16: d.p16,
      cambio: d.cambio,
      viviendas: d.viviendas,
      superficie: d.superficie,
      densidad: d.densidad,
    });
  }
  for (const r of items) r.s = slug(r.n);
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error("Nombres de URL repetidos en Nunavut");
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r || TIPOS[r.t].grupo !== "municipio") throw new Error(`Ficha completa sin comunidad: ${k}`);
    r.ficha = true;
  }
  for (const c of Object.keys(ZONAS)) if (!porCodigo.has(c)) throw new Error(`Zona horaria de una subdivisión inexistente: ${c}`);
  for (const e of E.escuelas) if (!porCodigo.has(e.csd)) throw new Error(`Escuela en una subdivisión inexistente: ${e.nombre}`);
  for (const c of Object.keys(SV.rcmp)) if (!porCodigo.has(c)) throw new Error(`Destacamento de la RCMP en una subdivisión inexistente: ${c}`);
  for (const r of items.filter((x) => TIPOS[x.t].grupo === "municipio")) {
    if (!SV.rcmp[r.c]) throw new Error(`Comunidad sin destacamento de la RCMP: ${r.n}`);
    if (!E.escuelas.some((e) => e.csd === r.c)) throw new Error(`Comunidad sin escuela en el directorio oficial: ${r.n}`);
  }

  /* --- Lugares con nombre oficial (sin página propia) --- */
  const nombresCsd = new Set(items.flatMap((r) => [norm(r.n), norm(r.censoNombre)]));
  const comunidades = [];
  const vistos = new Set();
  for (const f of J.cgn) {
    const g = objeto(J.cgn_campos, f);
    if (g.tipo === "Hamlet" || g.tipo === "City") continue; /* ya son subdivisiones censales */
    const t = POR_GN[g.tipo];
    if (!t) throw new Error(`Tipo de nombre geográfico sin clasificar: ${g.tipo}`);
    if (nombresCsd.has(norm(g.nombre))) continue;
    const padre = porCodigo.get(g.csd);
    const k = `${norm(g.nombre)}|${g.csd}`;
    if (!padre || vistos.has(k)) continue;
    vistos.add(k);
    const [xx, yy] = a(g.x, g.y);
    comunidades.push({ n: g.nombre, alias: [], t, m: g.csd, r: padre.r, x: xx, y: yy, lat: g.lat, lon: g.lon, p: null, p16: null, id: `cgn-${g.id}` });
  }
  for (const o of comunidades) {
    const hermanos = (porCodigo.get(o.m).comunidades ||= []);
    const b = `lugar-${slug(o.n) || String(o.id).toLowerCase()}`;
    let ancla = b;
    for (let k = 2; hermanos.some((h) => h.ancla === ancla); k++) ancla = `${b}-${k}`;
    o.ancla = ancla;
    hermanos.push(o);
  }

  const hospitales = [];
  for (const f of J.hospitales) {
    const h = objeto(J.hospitales_campos, f);
    if (HOSPITALES[h.nombre] && !hospitales.some((x) => x.nombre === HOSPITALES[h.nombre])) hospitales.push({ ...h, nombre: HOSPITALES[h.nombre] });
  }
  if (hospitales.length !== Object.keys(HOSPITALES).length) throw new Error("Faltan hospitales de la lista en la base ODHF");

  return {
    meta: { consultado: J.consultado },
    /* Las tres regiones (divisiones censales). Todo Nunavut es una sola región económica, así que el filtro usa las regiones. */
    regiones: { ...REGIONES },
    regionEconomica: Object.values(J.er)[0].split(" / ")[0],
    mapa,
    items: [...items, ...comunidades],
    porCodigo,
    territorio: censo(J.territorio),
    regionesCenso: J.regiones.map(([id, n, v]) => ({ id, n, ...censo(v) })),
    escuelas: E.escuelas,
    rcmp: SV.rcmp,
    clima: SV.clima,
    hospitales,
  };
}

/* ---------- Textos del directorio en la ficha territorial ---------- */
const directorio = {
  titulo: "Explora las comunidades de Nunavut",
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales y regiones); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá",
  poblacion: "Censo 2021",
  regiones: "3 regiones",
  regionEtiqueta: "Región",
  /* Ninguna comunidad llega a 10,000 habitantes (Iqaluit: 7,429 en el Censo 2021) */
  rangosPoblacion: [["2000-", "2,000 o más"], ["1000-1999", "1,000 a 1,999"], ["500-999", "500 a 999"], ["1-499", "1 a 499"], ["0-0", "0 habitantes"]],
  tipoEtiqueta: "Tipo de comunidad",
  ejemplo: "Pangnirtung",
  extendido: true,
  notaFichas: "Las demás comunidades tienen, por ahora, una página con información básica: clasificación oficial, región, población del Censo 2021, hora local, escuelas, hospital más cercano y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const n = (t) => L.items.filter((r) => r.t === t).length;
    return `<p>Investiga las comunidades de Nunavut antes de decidir dónde vivir, trabajar o estudiar. Nunavut tiene <strong>25 comunidades</strong>: Iqaluit, la capital, y ${miles(n("hamlet"))} hamlets. Ninguna está conectada con las demás ni con el sur de Canadá por carretera: se llega en avión, y en verano también por barco. El directorio reúne las ${miles(L.items.filter((r) => ES_PAGINA(r.t)).length)} subdivisiones censales del Censo 2021, que cubren todo el territorio, y <strong>${miles(n("localidad") + n("barrio") + n("lugar-asentamiento") + n("desembarcadero") + n("estacion") + n("antigua"))} lugares con nombre oficial</strong> que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Comunidades con gobierno municipal</strong>: la ciudad de Iqaluit y los hamlets. Cada página indica su zona horaria y muestra su hora local cuando la zona está identificada oficialmente.</li>
        <li><strong>Otras subdivisiones del censo</strong>: tres asentamientos sin población en el Censo 2021 y una zona no organizada en cada región, que cubre el territorio fuera de las comunidades.</li>
        <li><strong>Lugares con nombre oficial</strong>: barrios (como Apex, en Iqaluit), estaciones científicas o meteorológicas (como Alert y Eureka) y antiguos asentamientos. No son comunidades aparte: aparecen dentro de la subdivisión en la que están.</li>
      </ul>`;
  },
  nota: () => "El filtro «Región» usa las tres regiones del territorio (Qikiqtaaluk, Kivalliq y Kitikmeot), que son sus divisiones censales; Statistics Canada considera todo Nunavut una sola región económica, y la Encuesta de Población Activa da cifras para todo el territorio, no por comunidad. En el mapa, las islas Belcher (Sanikiluaq) y las de la bahía James aparecen desplazadas hacia el norte, dentro de un recuadro, para ahorrar espacio. Kinngait y Sanirajak aparecen en el Censo 2021 con sus nombres anteriores, Cape Dorset y Hall Beach. Los lugares con nombre oficial provienen de la Base de datos de nombres geográficos de Canadá y no tienen cifras de población propias.",
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.nombres, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada página ---------- */
const DIST = (n) => (n < 1.5 ? "1 km" : `${miles(Math.round(n))} km`);
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const grupo = tipo.grupo;
  const consultado = fechaEs(L.meta.consultado);
  const f = r.ficha ? FICHAS[r.s] : null;
  const nombre = r.n;
  const zona = ZONAS[r.c] ? Z[ZONAS[r.c]] : null;
  const habitada = typeof r.p === "number" && r.p > 0;
  const rc = L.rcmp[r.c] || null;
  const cl = L.clima[r.c] || null;

  const titulo = r.ficha ? `${nombre}, Nunavut: guía para inmigrantes y recién llegados` : `${nombre}, Nunavut: información básica`;
  const que = { city: "la capital de Nunavut", hamlet: "una comunidad (hamlet)", asentamiento: "un asentamiento (settlement) del censo", "no-organizado": "la zona no organizada" }[r.t];
  const descripcion = r.ficha
    ? `${nombre} (Nunavut) en datos: población, hora local, empleo, vivienda, escuelas, salud, transporte aéreo y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} de la región de ${r.region}, en Nunavut. Clasificación oficial, población del Censo 2021, hora local y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null && r.p16 ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  const datos = [
    fila("Clasificación oficial", `${esc(tipo.es === tipo.en ? tipo.es : `${tipo.es} (${tipo.en})`)} <small class="cd-fact__period">Tipo de subdivisión censal: ${esc(tipo.censo)}</small>`),
    r.antes ? fila("Nombre en el Censo 2021", `${esc(r.antes)} <small class="cd-fact__period">Nombre anterior de ${esc(nombre)}</small>`) : "",
    fila("Región", esc(r.region)),
    fila("Población", pob),
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null && habitada ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    r.viviendas != null && habitada ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    rc ? fila("Emergencias: policía (RCMP)", `${esc(rc.emergencia)} <small class="cd-fact__period">Nunavut no tiene 911. Consultas que no son urgentes: ${esc(rc.general)}. Fuente: RCMP en Nunavut</small>`) : "",
    fila("Zona horaria", zona ? esc(zona.texto) : `${NO_DISPONIBLE} <small class="cd-fact__period">La base de datos de zonas horarias de la IANA no identifica la zona de esta comunidad. Nunavut tiene tres zonas horarias (del Este, del Centro y de la Montaña): confirma la hora local con la comunidad.</small>`),
  ].filter(Boolean).join("\n          ");

  /* --- Lugares dentro de la subdivisión --- */
  const lista = (r.comunidades || []).slice().sort((x, y) => x.n.localeCompare(y.n, "es", { numeric: true }));
  const porTipo = {};
  for (const x of lista) (porTipo[x.t] ||= []).push(x);
  const comunidades = lista.length
    ? `<p>Dentro de ${esc(nombre)} hay ${miles(lista.length)} ${lista.length === 1 ? "lugar con nombre oficial" : "lugares con nombre oficial"}. No son comunidades aparte: forman parte de ${esc(nombre)}.</p>
      ${Object.entries(porTipo)
        .map(([t, xs]) => `<h3>${esc(TIPOS[t].plural.replace(/^./, (m) => m.toUpperCase()))} (${xs.length})</h3>
      <p class="cd-loc-comunidades">${xs.map((x) => `<span class="cd-loc-lugar" id="${x.ancla}">${esc(x.n)}</span>`).join(" · ")}</p>`)
        .join("\n      ")}
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.nombres, esc)}. Cada lugar se ubicó en la subdivisión censal que contiene sus coordenadas oficiales o en la más cercana.</p>`
    : "";

  /* --- Empleo (todo el territorio) --- */
  const empleo = `<p>Statistics Canada publica las cifras de empleo de Nunavut para todo el territorio, no por comunidad.</p>
      <div class="cd-indicators">
        ${datoBloque("Tasa de desempleo de Nunavut", `${EPA.mensual.desempleo}%`, `${esc(EPA.mensual.periodo)}. Fuente: ${fuente(FUENTES.epa, esc)}. Consultado el ${esc(consultado)}.`)}
        ${datoBloque("Tasa de desempleo, promedio anual", `${EPA.anual.desempleo}%`, `Año ${esc(EPA.anual.periodo)}: la más alta de Canadá. Fuente: ${fuente(EPA.anual.fuente, esc)}.`)}
      </div>`;

  /* --- Vivienda --- */
  const vivienda = `<p>${NO_DISPONIBLE}: CMHC no publica alquileres de Nunavut en su encuesta anual, y Statistics Canada no tiene una serie de alquileres por comunidad. En Nunavut la oferta de alquiler privado es muy limitada y la mayoría de las viviendas son públicas o del personal de los empleadores (staff housing): antes de aceptar un empleo, pregunta si incluye vivienda. Consulta la sección de vivienda de la <a href="/canada-en-datos/nunavut#vivienda">guía de Nunavut</a>.</p>
      ${r.t === "city" ? `<h3>Precios en Iqaluit</h3>
      <div class="cd-indicators">
        ${datoBloque("Índice de precios al consumidor de Iqaluit", `+${IPC.iqaluit.variacion}%`, `Variación de ${esc(IPC.anterior)} a ${esc(IPC.periodo)} (índice ${IPC.iqaluit.previo} → ${IPC.iqaluit.indice}; base 2002 = 100). En Canadá fue de +${IPC.canada.variacion}%. El índice mide cuánto cambian los precios, no cuánto cuestan: no sirve para comparar el costo de vida entre ciudades. Fuente: ${fuente(FUENTES.ipc, esc)}, publicada el ${esc(IPC.publicado)}.`)}
      </div>` : ""}
      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas: directorio oficial del Gobierno de Nunavut y Commission scolaire francophone du Nunavut --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c).sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
  const campus = CAMPUS[r.cd];
  let escuelas;
  if (escs.length) {
    escuelas = `<p>${escs.length === 1 ? `${esc(nombre)} tiene 1 escuela` : `${esc(nombre)} tiene ${miles(escs.length)} escuelas`} en el directorio oficial del Gobierno de Nunavut${escs.some((e) => e.web) ? " y de la Commission scolaire francophone du Nunavut" : ""}:</p>
      <ul class="cd-list-items">
        ${escs.map((e) => `<li>${esc(e.nombre)}${e.comunidad === "Apex" ? " (en Apex, barrio de Iqaluit)" : ""}${e.niveles ? ` — en francés, de ${esc(e.niveles)}` : ""}${e.telefono ? ` — teléfono ${esc(e.telefono)}` : ""}</li>`).join("\n        ")}
      </ul>
      <p>Para inscribir a tus hijos, llama a la escuela o a la autoridad educativa de la comunidad (District Education Authority). Las escuelas públicas dependen de ${esc(escs.find((e) => !e.web)?.operaciones || "la oficina regional de escuelas")} del Departamento de Educación.${escs.some((e) => e.web) ? " La École des Trois-Soleils es la escuela en francés de Nunavut." : ""} La educación postsecundaria la ofrece Nunavut Arctic College, que tiene un centro de aprendizaje en cada comunidad.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}${escs.some((e) => e.web) ? `; ${fuente(FUENTES.csfn, esc)}` : ""}. Consultado el ${esc(consultado)}. El sitio del Gobierno de Nunavut no permite la lectura automática; se usó su copia pública más reciente.</p>`;
  } else if (habitada) {
    escuelas = `<p>El directorio oficial del Gobierno de Nunavut no lista escuelas en ${esc(nombre)}. Consulta al Departamento de Educación.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}.</p>`;
  } else {
    escuelas = `<p>${esc(nombre)} no tiene población permanente en el Censo 2021 ni escuelas en el directorio oficial del Gobierno de Nunavut.</p>`;
  }

  /* --- Salud --- */
  const hs = L.hospitales.filter((h) => h.csd === r.c);
  let salud;
  if (hs.length) {
    salud = `<p>${esc(nombre)} tiene el hospital o centro regional de salud de su región, según la base de centros de salud de Statistics Canada:</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(h.nombre)}</li>`).join("\n        ")}
      </ul>
      <p>Para la atención especializada que no se ofrece en Nunavut, el Plan de Salud organiza viajes médicos a otras provincias.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Confirma servicios y horarios con el Departamento de Salud de Nunavut.</p>`;
  } else if (habitada) {
    const cerca = L.hospitales.map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
    salud = `<p>La atención de salud diaria en las comunidades de Nunavut se da en el centro de salud (health centre) local, atendido sobre todo por personal de enfermería. No hay un hospital dentro de ${esc(nombre)}: el más cercano es <strong>${esc(cerca.h.nombre)}</strong>, a unos ${DIST(cerca.d)} en línea recta, y el traslado se hace en avión.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancia calculada con las coordenadas oficiales.</p>`;
  } else {
    salud = `<p>${esc(nombre)} no tiene población permanente en el Censo 2021 ni servicios de salud propios.</p>`;
  }

  /* --- Emergencias y ayuda (se añade a la sección de salud de las comunidades habitadas) --- */
  if (habitada && rc) {
    salud += `
      <h3>Emergencias y líneas de ayuda</h3>
      <ul class="cd-list-items">
        <li><strong>Nunavut no tiene servicio 911.</strong> Según la RCMP, para la policía se marcan los tres primeros dígitos del teléfono local seguidos de 1111. En ${esc(nombre)}, la línea de emergencia de la RCMP es el <strong>${esc(rc.emergencia)}</strong>; para consultas que no son urgentes, ${esc(rc.general)}.</li>
        <li>${r.t === "city" ? "En Iqaluit, la Ciudad publica su número de bomberos y ambulancias: <strong>(867) 979-4422</strong>. En las demás comunidades" : "En todas las comunidades, salvo Iqaluit,"} los bomberos y las ambulancias son voluntarios locales y cada comunidad tiene su propio número. Apréndelo al llegar; si no lo conoces, llama a la línea de emergencia de la RCMP.</li>
        <li>Si te sientes en crisis o piensas en el suicidio: <strong>9-8-8</strong> (llamada o mensaje de texto, las 24 horas, en todo Canadá). La Kamatsiaqtut Nunavut Helpline atiende de forma anónima las 24 horas en el <strong>1-800-265-3333</strong> (en Iqaluit, 867-979-3333). La línea Hope for Wellness, para personas indígenas, atiende las 24 horas en el <strong>1-855-242-3310</strong>, también en inuktitut si se solicita.</li>
      </ul>
      <p class="cd-indicator__src">Fuentes: ${fuente(FUENTES.rcmp911, esc)}; ${fuente(FUENTES.rcmp, esc)}${r.t === "city" ? '; <a href="https://www.iqaluit.ca/" target="_blank" rel="noopener">Ciudad de Iqaluit</a>' : ""}; <a href="https://988.ca/" target="_blank" rel="noopener">9-8-8: Suicide Crisis Helpline</a>; <a href="https://nunavuthelpline.ca/" target="_blank" rel="noopener">Kamatsiaqtut Nunavut Helpline</a>; <a href="https://www.canada.ca/en/public-health/services/mental-health-services/mental-health-get-help.html" target="_blank" rel="noopener">Gobierno de Canadá — Hope for Wellness Help Line</a>. Consultado el ${esc(consultado)}.</p>`;
  }

  /* --- Transporte --- */
  const transporte = habitada
    ? `<p>Ninguna comunidad de Nunavut está conectada por carretera con las demás ni con el resto de Canadá: los viajes se hacen en avión durante todo el año, y la carga pesada (vehículos, materiales de construcción y alimentos no perecederos) llega en barco durante el verano. ${r.cd === "6205" || r.c === "6204001" ? "En Kivalliq y Sanikiluaq vuela Calm Air, que tiene en Rankin Inlet el centro de su red" : "En Qikiqtaaluk y Kitikmeot vuela Canadian North"}; consulta rutas, horarios y tarifas directamente con la aerolínea, porque cambian con frecuencia.</p>
      ${enlaces(aerolineas(r), esc)}`
    : `<p>${esc(nombre)} no tiene población permanente en el Censo 2021. Solo se llega en avión o por mar.</p>`;

  const recien = `<p>Los servicios para recién llegados financiados por el Gobierno de Canadá son gratuitos para quienes cumplen sus requisitos. En Nunavut hay pocos proveedores: usa el buscador oficial para ver cuáles atienden en el territorio o en línea.</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la sección <a href="/canada-en-datos/nunavut#integracion">Asentamiento e integración</a> y la <a href="/canada-en-datos/nunavut#recien-llegado">guía de primeros pasos en Nunavut</a>.</p>`;
  const familias = `<p>Estos son recursos territoriales y federales: se aplican en todo Nunavut, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia. La Nunavut Child Benefit se paga junto con la Canada Child Benefit; quien vive en Nunavut al menos seis meses seguidos puede pedir las deducciones fiscales para residentes del norte; y las guarderías con licencia cuestan $10 al día, donde hay cupo. Más detalles en la sección <a href="/canada-en-datos/nunavut#beneficios">Beneficios familiares y ayudas</a> de la guía.</p>
      ${enlaces(RECURSOS.familias, esc)}`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f && f.web ? [{ label: `Sitio oficial de ${f.nombre}`, href: f.web }] : []),
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, ...(lista.length ? [FUENTES.nombres] : []), FUENTES.epa, ...(r.t === "city" ? [FUENTES.ipc] : []), FUENTES.escuelas, ...(escs.some((e) => e.web) ? [FUENTES.csfn] : []), FUENTES.hospitales, ...(rc ? [FUENTES.rcmp, FUENTES.rcmp911] : []), ...(cl ? [FUENTES.clima] : []), FUENTES.hora, FUENTES.horaNrc];

  const intro = {
    city: `${nombre} es la capital de Nunavut y su única ciudad, en la isla de Baffin, región de ${r.region}.${habitada ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : ""}`,
    hamlet: `${nombre} es una comunidad de la región de ${r.region}, en Nunavut, con gobierno municipal propio (hamlet)${f ? ` y ${f.centro}` : ""}.${habitada ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : ""}${r.antes ? ` Hasta 2020 se llamaba ${r.antes}, nombre que todavía usa el Censo 2021.` : ""}`,
    asentamiento: `${nombre} figura en el Censo 2021 de Statistics Canada como asentamiento (settlement) de la región de ${r.region}, sin población permanente en ese censo.`,
    "no-organizado": `${nombre} es la zona no organizada de la región de ${r.region}: el territorio que queda fuera de las comunidades. ${habitada ? `En el Censo 2021 tenía ${miles(r.p)} habitantes.` : "No tenía población permanente en el Censo 2021."}`,
  }[r.t];
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la comunidad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Nunavut · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro: intro + cierre,
    datos,
    reloj: zona ? { timeZone: zona.timeZone, lat: r.lat, lon: r.lon, etiqueta: `Hora local en ${nombre}` } : null,
    ubicacionExtra: cl ? `
      <h3>Clima (normales 1991-2020)</h3>
      <div class="cd-indicators">
        ${datoBloque("Temperatura media de enero", `${cl.enero.toFixed(1).replace("-", "−")} °C`, `Promedio diario de enero en la estación ${esc(cl.estacion)} de Environment Canada.`)}
        ${datoBloque("Temperatura media de julio", `${cl.julio.toFixed(1).replace("-", "−")} °C`, `Promedio diario de julio; promedio anual: ${cl.anual.toFixed(1).replace("-", "−")} °C.`)}
        ${cl.nieve != null ? datoBloque("Nieve al año", `${decimal(cl.nieve.toFixed(1))} cm`, `Nevada anual promedio${cl.precipitacion != null ? `; precipitación total (lluvia y nieve): ${decimal(cl.precipitacion.toFixed(1))} mm` : ""}.`) : ""}
      </div>
      <p class="cd-indicator__src">Fuente: <a href="${esc(cl.url)}" target="_blank" rel="noopener">Environment and Climate Change Canada — Normales climáticas 1991-2020, estación ${esc(cl.estacion)}</a>. Consultado el ${esc(consultado)}.</p>` : "",
    ubicacion: `Ubicación aproximada en la región de ${esc(r.region)}.${r.desplazado ? ` ${esc(nombre)} está en las islas del sur de la bahía de Hudson y de la bahía James, que el mapa muestra desplazadas hacia el norte, dentro del recuadro, para ahorrar espacio.` : ""} Mapa elaborado con los límites de las divisiones censales del Censo 2021 de Statistics Canada (solo las islas más grandes).`,
    comunidades,
    empleo,
    busqueda: RECURSOS.empleo,
    vivienda,
    escuelas,
    escuelasEnlaces: [...RECURSOS.escuelas, ...(campus ? [campus] : [])],
    salud,
    saludEnlaces: RECURSOS.salud,
    transporte,
    recien,
    familias,
    oficiales,
    fuentes,
    indexar: !!r.ficha,
    ciudad: r.t === "city",
  };
}

function tarjeta(r) {
  const tipo = TIPOS[r.t];
  return {
    tipo: tipo.es === tipo.en ? tipo.es : `${tipo.es} (${tipo.en})`,
    dato: typeof r.p === "number" ? `${miles(r.p)} habitantes (Censo 2021)` : "",
  };
}

export default {
  slug: "nunavut",
  nombre: PROV,
  TIPOS,
  GRUPOS,
  FICHAS,
  FUENTES,
  esMunicipio: (r) => ES_PAGINA(r.t),
  cargar,
  directorio,
  pagina,
  tarjeta,
};
