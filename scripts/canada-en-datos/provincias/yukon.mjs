/*
  provincias/yukon.mjs — Directorio de comunidades de Yukón
  ==========================================================
  Mismo estándar que Nunavut y los Territorios del Noroeste:
  - Una página por cada subdivisión censal (CSD) de Yukón en el Censo 2021
    de Statistics Canada: 35 en total, que cubren todo el territorio
    (la ciudad de Whitehorse, 3 pueblos, 4 aldeas, 2 hamlets, asentamientos,
    tierras de gobierno propio de Primeras Naciones, asentamientos indios,
    tierras de Teslin y 5 zonas no organizadas).
  - Sin página propia, dentro de la página de su CSD: los lugares poblados
    con nombre oficial de la Base de datos de nombres geográficos de Canadá
    (CGNDB), ubicados en su CSD por sus coordenadas oficiales (p. ej., los
    barrios de Whitehorse).
  - Yukón es una sola división censal y una sola región económica: el
    filtro «Región» tiene una sola opción.

  Hora: Yukón usa UTC−7 todo el año desde 2020 (la hora de Yukón). La zona
  IANA «America/Whitehorse» lo aplica desde el 1 de noviembre de 2020.
  No se copian reglas de otras provincias.

  Datos (scripts/canada-en-datos/):
    yt-localidades.json   obtener-yt-localidades.py + compactar-yt.py
    yt-servicios.json     compactar-yt-servicios.py

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, datoBloque } from "../localidades.mjs";

const PROV = "Yukón";
const PAG = "/canada-en-datos/yukon";

/* ---------- Clasificación oficial ---------- */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "comunidad-censo", plural: "ciudad (la capital)", censo: "CY" },
  town: { es: "Pueblo", en: "Town", grupo: "comunidad-censo", plural: "pueblos (towns)", censo: "T" },
  village: { es: "Aldea", en: "Village", grupo: "comunidad-censo", plural: "aldeas (villages)", censo: "VL" },
  hamlet: { es: "Hamlet", en: "Hamlet", grupo: "comunidad-censo", plural: "hamlets", censo: "HAM" },
  asentamiento: { es: "Asentamiento", en: "Settlement", grupo: "comunidad-censo", plural: "asentamientos (settlements)", censo: "SÉ" },
  "gobierno-propio": { es: "Tierras de gobierno propio", en: "Self-government", grupo: "tierras", plural: "tierras de gobierno propio de Primeras Naciones", censo: "SG" },
  "asentamiento-indio": { es: "Asentamiento indio", en: "Indian settlement", grupo: "tierras", plural: "asentamientos indios (Indian settlements)", censo: "S-É" },
  "tierras-teslin": { es: "Tierras de Teslin", en: "Teslin land", grupo: "tierras", plural: "tierras de Teslin (Teslin land)", censo: "TL" },
  "no-organizado": { es: "Zona no organizada", en: "Unorganized", grupo: "otro", plural: "zonas no organizadas", censo: "NO" },
  localidad: { es: "Localidad", en: "Locality", grupo: "lugar", plural: "localidades (localities)", gn: "Locality" },
  "lugar-asentamiento": { es: "Asentamiento (nombre geográfico)", en: "Settlement", grupo: "lugar", plural: "asentamientos registrados como nombre geográfico", gn: "Settlement" },
  barrio: { es: "Barrio o comunidad", en: "Community", grupo: "lugar", plural: "barrios y comunidades", gn: "Community" },
  antigua: { es: "Antigua localidad", en: "Former Locality", grupo: "lugar", plural: "antiguas localidades", gn: "Former Locality" },
};
export const GRUPOS = {
  "comunidad-censo": "Comunidades",
  tierras: "Tierras de Primeras Naciones",
  otro: "Zonas no organizadas",
  lugar: "Lugares con nombre oficial (sin página propia)",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "lugar";
const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
const POR_GN = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k]));
/* Tipos de la CGNDB que ya son subdivisiones censales (no se repiten como lugar) */
const GN_CSD = new Set(["City", "Town", "Village", "Hamlet"]);

/* Yukón es una sola división censal («Yukon», 6001) y una sola región económica */
export const REGIONES = { 6001: "Yukón" };

/* Nombres con los que se conoce la subdivisión cuando el Censo 2021 usa otro, o para distinguir
   subdivisiones con el mismo nombre en el censo */
const NOMBRES = {
  6001029: { n: "Dawson City", censo: "Dawson" },
  6001057: { n: "Teslin (tierras de Teslin)", censo: "Teslin" },
  6001045: { n: "Yukón: zona no organizada", censo: "Yukon, Unorganized" },
  6001060: { n: "Whitehorse: zona no organizada", censo: "Whitehorse, Unorganized" },
};
/* Otros nombres conocidos, solo para el buscador */
const ALIAS = {
  6001029: ["City of Dawson"],
  6001044: ["Mount Lorne"],
  6001049: ["Destruction Bay"],
};

/* ---------- Hora ----------
   Un solo horario en todo el territorio: los relojes se adelantaron por última vez el 8 de marzo
   de 2020 y, desde el 1 de noviembre de 2020, la hora normal es UTC−7 todo el año (Orden en
   Consejo 2020/125). La zona IANA America/Whitehorse aplica esa regla (archivo northamerica). */
const HORA = {
  timeZone: "America/Whitehorse",
  texto: "UTC−7 todo el año, sin cambio de hora (hora de Yukón, desde noviembre de 2020)",
};

/* ---------- Fichas completas ----------
   La capital y los tres centros de servicios con mayor población o con hospital
   (Censo 2021; Statistics Canada, ODHF). */
export const FICHAS = {
  whitehorse: { nombre: "Whitehorse", web: "https://www.whitehorse.ca/", centro: "la capital de Yukón" },
  "dawson-city": { nombre: "Dawson City", web: "https://www.cityofdawson.ca/", centro: "el segundo centro de población del territorio, a orillas del río Yukón, con hospital comunitario" },
  "watson-lake": { nombre: "Watson Lake", centro: "la puerta de entrada de la carretera de Alaska desde Columbia Británica, con hospital comunitario" },
  "haines-junction": { nombre: "Haines Junction", centro: "la entrada al parque nacional Kluane, en el cruce de las carreteras de Alaska y Haines" },
};

/* Hospitales de la base ODHF (Statistics Canada, 2020): nombre de la base → nombre que se muestra */
const HOSPITALES = {
  "whitehorse general hospital": "Whitehorse General Hospital",
  "dawson city community hospital": "Dawson City Community Hospital",
  "watson lake community hospital": "Watson Lake Community Hospital",
};

/* Encuesta de Población Activa de los territorios (Statistics Canada, tabla 14-10-0292-01). No hay datos por comunidad. */
const EPA = {
  mensual: { desempleo: "5.3", empleo: "68.9", periodo: "octubre de 2026 (promedio móvil de 3 meses, desestacionalizado)" },
  anual: { desempleo: "4.2", periodo: "2025", fuente: { org: "Job Bank (Gobierno de Canadá)", title: "Economic Scan — Yukon, Northwest Territories and Nunavut: 2026", url: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/yukon/environmental-scan" } },
};

/* Índice de precios al consumidor de Whitehorse (Statistics Canada, tabla 18-10-0004-01).
   Mide la variación de los precios, no su nivel. */
const IPC = { periodo: "septiembre de 2026", anterior: "septiembre de 2025", wh: { indice: "174.4", previo: "164.4", variacion: "6.1" }, canada: { variacion: "3.1" } };

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales y división censal de Yukón", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Yukón", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0292-01 — Características de la población activa de los territorios, promedio móvil de 3 meses", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410029201" },
  clima: { org: "Environment and Climate Change Canada", title: "Normales climáticas de Canadá 1991-2020", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ipc: { org: "Statistics Canada", title: "Tabla 18-10-0004-01 — Índice de precios al consumidor, mensual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401" },
  cmhc: { org: "Statistics Canada y CMHC", title: "Tabla 34-10-0133-01 — Alquiler promedio de CMHC, por tipo de unidad", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3410013301" },
  hospitales: { org: "Statistics Canada", title: "Open Database of Healthcare Facilities (ODHF), versión 1.1 (2020)", url: "https://www.statcan.gc.ca/en/lode/databases/odhf" },
  hora: { org: "Base de datos horaria (tz) de la IANA", title: "Archivo northamerica: America/Whitehorse, UTC−7 todo el año desde el 1 de noviembre de 2020 (Orden en Consejo 2020/125 del Gobierno de Yukón)", url: "https://github.com/eggert/tz/blob/main/northamerica" },
  horaIana: { org: "IANA", title: "Base de datos de zonas horarias", url: "https://www.iana.org/time-zones" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Yukón", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Yukon" },
    { label: "Job Bank — Panorama económico de los territorios (2026)", href: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/yukon/environmental-scan" },
    { label: "Yuwin — Bolsa de empleo de Yukón (citada por el Gobierno de Yukón)", href: "https://www.yuwin.ca/" },
  ],
  escuelas: [
    { label: "Gobierno de Yukón — Inscribir a tu hijo en la escuela (zonas de asistencia)", href: "https://yukon.ca/en/education-and-schools/plan-elementary-and-high-school/register-your-child-school" },
    { label: "Gobierno de Yukón — Buscar una escuela", href: "https://yukon.ca/en/education-and-schools/plan-elementary-and-high-school/find-school" },
    { label: "Commission scolaire francophone du Yukon — Escuelas en francés", href: "https://commissionscolaire.csfy.ca/" },
  ],
  salud: [
    { label: "Gobierno de Yukón — Solicitar la tarjeta de salud (Yukon Health Care Insurance Plan)", href: "https://yukon.ca/en/health-and-wellness/care-services/apply-health-care-card" },
    { label: "Gobierno de Yukón — 811: consejos de salud por teléfono, las 24 horas", href: "https://yukon.ca/en/health-and-wellness/care-services/access-24-hour-health-advice-811" },
    { label: "Gobierno de Yukón — Buscar un hospital o centro de salud", href: "https://yukon.ca/en/health-and-wellness/care-services/find-hospital-or-health-centre" },
    { label: "9-8-8 — Línea de prevención del suicidio (llamada o mensaje de texto)", href: "https://988.ca/" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
    { label: "Gobierno de Yukón — Programa de Nominados de Yukón (YNP), proceso de 2026", href: "https://yukon.ca/en/yukon-nominee-program" },
    { label: "Gobierno de Yukón — Trabajar en Yukón: derechos, seguridad y clases de idioma", href: "https://yukon.ca/en/immigration/yukon-nominee-program/learn-about-working-yukon" },
  ],
  familias: [
    { label: "CRA — Canada Child Benefit (CCB): quién puede solicitarla", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview/canada-child-benefit-before-you-apply.html" },
    { label: "CRA — Yukon Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/yukon.html" },
    { label: "CRA — Deducciones para residentes del norte (línea 25500)", href: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions.html" },
  ],
  vivienda: [
    { label: "Yukon Housing Corporation — Vivienda con alquiler según ingresos (Rent-Geared-to-Income)", href: "https://yukon.ca/en/housing-and-property/social-housing-tenant-supports/apply-rent-geared-income-housing" },
    { label: "Yukon Housing Corporation — Ayuda para el alquiler (Canada-Yukon Housing Benefit)", href: "https://yukon.ca/en/housing-and-property/funding-and-loans/apply-rent-subsidy" },
    { label: "Yukon Housing Corporation — Límites de ingresos vigentes", href: "https://yukon.ca/en/housing-and-property/social-housing-tenant-supports/find-household-income-limit-thresholds" },
  ],
  transporte: [
    { label: "511 Yukon — Estado de las carreteras y de los transbordadores", href: "https://511yukon.ca/" },
    { label: "Gobierno de Yukón — Transbordadores gratuitos (Dawson y Ross River)", href: "https://yukon.ca/en/driving-and-transportation/travel-yukon/find-sailing-times-yukon-ferries" },
    { label: "Gobierno de Yukón — Oficinas de vehículos motorizados (licencias)", href: "https://yukon.ca/en/driving-and-transportation/driver-licensing/find-motor-vehicles-services-office" },
  ],
};

/* ---------- Utilidades ---------- */
/* Letras de las lenguas dene sin equivalente en la descomposición Unicode (ł, ı sin punto, ʔ) → latinas, solo para las URL */
const latino = (s) => s.replace(/ł/g, "l").replace(/Ł/g, "L").replace(/ı/g, "i").replace(/[ʔɁ]/g, "");
const norm = (s) => latino(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
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

/* ---------- Carga y preparación de datos ---------- */
export function cargar(root) {
  const base = join(root, "scripts/canada-en-datos");
  const J = JSON.parse(readFileSync(join(base, "yt-localidades.json"), "utf8"));
  const SV = JSON.parse(readFileSync(join(base, "yt-servicios.json"), "utf8"));
  const censo = (v) => Object.fromEntries(J.censo_campos.map((k, i) => [k, num(v[i])]));
  const csd = J.csd.map((f) => objeto(J.csd_campos, f));

  /* Encuadre del mapa (metros, EPSG:3347) */
  const geo = J.cd_geo;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (g, fn) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).forEach((p) => p.forEach((q) => q.forEach(([x, y]) => fn(x, y))));
  for (const g of Object.values(geo)) recorre(g, (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))));
  const ANCHO = 600, MARGEN = 6;
  const escala = (ANCHO - 2 * MARGEN) / (x1 - x0);
  const alto = Math.ceil((y1 - y0) * escala + 2 * MARGEN);
  const a = (x, y) => [Math.round(((x - x0) * escala + MARGEN) * 10) / 10, Math.round(((y1 - y) * escala + MARGEN) * 10) / 10];
  const mapa = {
    ancho: ANCHO,
    alto,
    regiones: J.regiones.map(([id]) => ({ r: id, n: REGIONES[id], d: trazo(geo[id], a, 0.8) })),
  };

  /* --- Subdivisiones censales: una página cada una --- */
  const items = [];
  for (const c of csd) {
    const t = POR_CENSO[c.tipo];
    if (!t) throw new Error(`Tipo de subdivisión censal sin clasificar: ${c.tipo} (${c.nombre})`);
    if (!REGIONES[c.cd]) throw new Error(`División censal sin región: ${c.cd}`);
    const d = censo(c.censo);
    const [xx, yy] = a(c.x, c.y);
    const oficial = NOMBRES[c.id];
    items.push({
      c: c.id,
      n: oficial ? oficial.n : c.nombre,
      censoNombre: c.nombre,
      alias: [...(oficial && oficial.censo !== oficial.n ? [oficial.censo] : []), ...(ALIAS[c.id] || [])],
      t,
      r: c.cd,
      cd: c.cd,
      region: REGIONES[c.cd],
      x: xx,
      y: yy,
      lat: c.lat,
      lon: c.lon,
      p: d.p,
      p16: d.p16,
      cambio: d.cambio,
      viviendas: d.viviendas,
      superficie: d.superficie,
      densidad: d.densidad,
    });
  }
  /* Subdivisiones con el mismo nombre en el censo (p. ej., Carcross y Carcross 4): la URL lleva el número */
  for (const r of items) r.s = slug(latino(r.n));
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error("Nombres de URL repetidos en Yukón");
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r || TIPOS[r.t].grupo !== "comunidad-censo") throw new Error(`Ficha completa sin comunidad: ${k}`);
    r.ficha = true;
  }
  for (const c of Object.keys(SV.clima)) if (!porCodigo.has(c)) throw new Error(`Normales climáticas de una subdivisión inexistente: ${c}`);
  for (const e of SV.escuelas) if (!porCodigo.has(e.csd)) throw new Error(`Escuela en una subdivisión inexistente: ${e.nombre}`);

  /* --- Lugares con nombre oficial (sin página propia) --- */
  const nombresCsd = new Set(items.flatMap((r) => [norm(r.n), norm(r.censoNombre), ...r.alias.map(norm)]));
  const lugares = [];
  const vistos = new Set();
  for (const f of J.cgn) {
    const g = objeto(J.cgn_campos, f);
    if (GN_CSD.has(g.tipo)) continue; /* ya son subdivisiones censales */
    const t = POR_GN[g.tipo];
    if (!t) throw new Error(`Tipo de nombre geográfico sin clasificar: ${g.tipo}`);
    if (nombresCsd.has(norm(g.nombre))) continue;
    const padre = porCodigo.get(g.csd);
    const k = `${norm(g.nombre)}|${g.csd}`;
    if (!padre || vistos.has(k)) continue;
    vistos.add(k);
    const [xx, yy] = a(g.x, g.y);
    lugares.push({ n: g.nombre, alias: [], t, m: g.csd, r: padre.r, x: xx, y: yy, lat: g.lat, lon: g.lon, p: null, p16: null, id: `cgn-${g.id}` });
  }
  for (const o of lugares) {
    const hermanos = (porCodigo.get(o.m).comunidades ||= []);
    const b = `lugar-${slug(latino(o.n)) || String(o.id).toLowerCase()}`;
    let ancla = b;
    for (let k = 2; hermanos.some((h) => h.ancla === ancla); k++) ancla = `${b}-${k}`;
    o.ancla = ancla;
    hermanos.push(o);
  }

  /* Hospitales y centros de salud comunitarios de la base ODHF (Statistics Canada, 2020) */
  const hospitales = [];
  const centros = [];
  const titulo = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());
  for (const f of J.hospitales) {
    const h = objeto(J.hospitales_campos, f);
    if (HOSPITALES[h.nombre]) {
      if (!hospitales.some((x) => x.nombre === HOSPITALES[h.nombre])) hospitales.push({ ...h, nombre: HOSPITALES[h.nombre] });
    } else if (/health centre$/.test(h.nombre)) centros.push({ ...h, nombre: titulo(h.nombre) });
  }
  if (hospitales.length !== Object.keys(HOSPITALES).length) throw new Error("Faltan hospitales de la lista en la base ODHF");

  return {
    meta: { consultado: J.consultado },
    regiones: { ...REGIONES },
    regionEconomica: Object.values(J.er)[0].split(" / ")[0],
    mapa,
    items: [...items, ...lugares],
    porCodigo,
    territorio: censo(J.territorio),
    regionesCenso: J.regiones.map(([id, n, v]) => ({ id, n: REGIONES[id], ...censo(v) })),
    escuelas: SV.escuelas,
    clima: SV.clima,
    cmhc: SV.cmhc,
    hospitales,
    centros,
  };
}

/* ---------- Textos del directorio en la ficha territorial ---------- */
const directorio = {
  titulo: "Explora las comunidades de Yukón",
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá",
  poblacion: "Censo 2021",
  regiones: "1 región",
  regionEtiqueta: "Región",
  rangosPoblacion: [["10000-", "10,000 o más"], ["1000-9999", "1,000 a 9,999"], ["300-999", "300 a 999"], ["1-299", "1 a 299"], ["0-0", "0 habitantes"]],
  tipoEtiqueta: "Tipo de comunidad",
  ejemplo: "Carmacks",
  extendido: true,
  notaFichas: "Las demás comunidades tienen, por ahora, una página con información básica: clasificación oficial, población del Censo 2021, hora local, escuelas, hospital o centro de salud más cercano, clima cuando hay estación y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const paginas = L.items.filter((r) => ES_PAGINA(r.t));
    const habitadas = paginas.filter((r) => r.p > 0).length;
    const lugares = L.items.filter((r) => TIPOS[r.t].grupo === "lugar").length;
    return `<p>Investiga las comunidades de Yukón antes de decidir dónde vivir, trabajar o estudiar. Whitehorse, la capital, concentra cerca de siete de cada diez habitantes del territorio; las demás comunidades son pequeñas. Casi todas tienen acceso por carretera; Old Crow, en el extremo norte, solo se alcanza en avión. El directorio reúne las ${miles(paginas.length)} subdivisiones censales del Censo 2021, que cubren todo el territorio (${miles(habitadas)} con población en ese censo), y <strong>${miles(lugares)} lugares con nombre oficial</strong> que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Comunidades</strong>: la ciudad de Whitehorse, los pueblos (towns) de Dawson City, Watson Lake y Faro, las aldeas (villages), los hamlets y los asentamientos (settlements). Cada página indica la hora local, las escuelas, el hospital o centro de salud más cercano y el clima cuando hay una estación de Environment Canada.</li>
        <li><strong>Tierras de Primeras Naciones</strong>: tierras de gobierno propio, asentamientos indios y tierras de Teslin que el censo cuenta aparte. La mayoría tiene muy pocos habitantes o ninguno.</li>
        <li><strong>Zonas no organizadas</strong>: el resto del territorio, incluidas las zonas rurales cercanas a Whitehorse.</li>
        <li><strong>Lugares con nombre oficial</strong>: barrios de Whitehorse, localidades a lo largo de las carreteras y antiguos asentamientos. No son comunidades aparte: aparecen dentro de la subdivisión en la que están.</li>
      </ul>`;
  },
  nota: () => "Yukón es una sola división censal y una sola región económica: el filtro «Región» tiene una sola opción, y la Encuesta de Población Activa da cifras para todo el territorio, no por comunidad. El Censo 2021 llama «Dawson» a Dawson City. Hay dos subdivisiones llamadas Carcross (el asentamiento y las tierras de gobierno propio «Carcross 4») y dos llamadas Teslin (la aldea y las tierras de Teslin). Los lugares con nombre oficial provienen de la Base de datos de nombres geográficos de Canadá y no tienen cifras de población propias.",
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.nombres, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada página ---------- */
const DIST = (n) => (n < 1.5 ? "1 km" : `${miles(Math.round(n))} km`);
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };
const grados = (v) => `${v.toFixed(1).replace("-", "−")} °C`;
const QUE = {
  city: "la capital de Yukón",
  town: "un pueblo (town)",
  village: "una aldea (village)",
  hamlet: "un hamlet (comunidad rural con consejo propio)",
  asentamiento: "un asentamiento (settlement)",
  "gobierno-propio": "una subdivisión censal de tierras de gobierno propio de una Primera Nación",
  "asentamiento-indio": "un asentamiento indio (Indian settlement) según el censo",
  "tierras-teslin": "una subdivisión censal de tierras de la Primera Nación Teslin Tlingit",
  "no-organizado": "una zona no organizada",
};

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const consultado = fechaEs(L.meta.consultado);
  const f = r.ficha ? FICHAS[r.s] : null;
  const nombre = r.n;
  const habitada = typeof r.p === "number" && r.p > 0;
  const cl = L.clima[r.c] || null;
  const que = QUE[r.t];

  const titulo = r.ficha ? `${nombre}, Yukón: guía para inmigrantes y recién llegados` : `${nombre}, Yukón: información básica`;
  const descripcion = r.ficha
    ? `${nombre} (Yukón) en datos: población, hora local, empleo, vivienda, escuelas, salud, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} de Yukón. Clasificación oficial, población del Censo 2021, hora local, escuelas, salud y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null && r.p16 ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  const datos = [
    fila("Clasificación oficial", `${esc(tipo.es === tipo.en ? tipo.es : `${tipo.es} (${tipo.en})`)} <small class="cd-fact__period">Tipo de subdivisión censal: ${esc(tipo.censo)}</small>`),
    r.censoNombre !== nombre ? fila("Nombre en el Censo 2021", esc(r.censoNombre)) : "",
    fila("Población", pob),
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null && habitada ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    r.viviendas != null && habitada ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    habitada ? fila("Emergencias", `911 <small class="cd-fact__period">Servicio 9-1-1 básico de Yukón: policía (RCMP), bomberos y ambulancias</small>`) : "",
    fila("Hora local", esc(HORA.texto)),
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
  const empleo = `<p>Statistics Canada publica las cifras de empleo de Yukón para todo el territorio, no por comunidad. El salario mínimo de Yukón es de $18.51 por hora desde el 1 de abril de 2026 y se ajusta cada 1 de abril según la inflación.</p>
      <div class="cd-indicators">
        ${datoBloque("Tasa de desempleo del territorio", `${EPA.mensual.desempleo}%`, `${esc(EPA.mensual.periodo)}. Fuente: ${fuente(FUENTES.epa, esc)}. Consultado el ${esc(consultado)}.`)}
        ${datoBloque("Tasa de desempleo, promedio anual", `${EPA.anual.desempleo}%`, `Año ${esc(EPA.anual.periodo)}. Fuente: ${fuente(EPA.anual.fuente, esc)}.`)}
      </div>
      <p class="cd-indicator__src">Salario mínimo: <a href="https://yukon.ca/en/doing-business/employer-responsibilities/find-minimum-wage-yukon" target="_blank" rel="noopener">Gobierno de Yukón — Find minimum wage in Yukon</a>.</p>`;

  /* --- Vivienda --- */
  const ciudad = r.t === "city";
  const vivienda = `${ciudad ? `<p><strong>Alquiler promedio de CMHC en Whitehorse: ${NO_DISPONIBLE}.</strong> Statistics Canada marca como poco fiables para publicarse (F) los alquileres promedio de Whitehorse de 2021 a 2025 en su tabla de la encuesta de alquileres de CMHC. Consulta las encuestas de alquileres de la Oficina de Estadísticas de Yukón (Yukon Bureau of Statistics).</p>
      <h3>Precios en Whitehorse</h3>
      <div class="cd-indicators">
        ${datoBloque("Índice de precios al consumidor de Whitehorse", `+${IPC.wh.variacion}%`, `Variación de ${esc(IPC.anterior)} a ${esc(IPC.periodo)} (índice ${IPC.wh.previo} → ${IPC.wh.indice}; base 2002 = 100). En Canadá fue de +${IPC.canada.variacion}%. El índice mide cuánto cambian los precios, no cuánto cuestan: no sirve para comparar el costo de vida entre ciudades. Fuente: ${fuente(FUENTES.ipc, esc)}.`)}
      </div>` : `<p>${NO_DISPONIBLE}: no hay una serie oficial de alquileres para ${esc(nombre)}. Fuera de Whitehorse la oferta de alquiler privado es limitada: antes de aceptar un empleo, pregunta si incluye vivienda.</p>`}
      ${habitada ? `<p>La vivienda social de la Yukon Housing Corporation cobra un alquiler del 25% de los ingresos brutos del hogar y exige haber vivido en Yukón 12 meses seguidos antes de solicitarla. Los ingresos del hogar deben estar por debajo de un límite: ${ciudad ? "en Whitehorse va de $59,000 al año (estudio) a $102,500 (3 habitaciones o más)" : "en las comunidades fuera de Whitehorse es de $110,000 al año"}, según los límites vigentes desde el 1 de septiembre de 2025. Hay lista de espera.</p>
      <p class="cd-indicator__src">Fuentes: <a href="https://yukon.ca/en/housing-and-property/social-housing-tenant-supports/apply-rent-geared-income-housing" target="_blank" rel="noopener">Yukon Housing Corporation — Rent-Geared-to-Income</a>; <a href="https://yukon.ca/en/housing-and-property/social-housing-tenant-supports/find-household-income-limit-thresholds" target="_blank" rel="noopener">límites de ingresos</a> (copias del Internet Archive; yukon.ca no permite la lectura automática).</p>` : ""}
      <p>Consulta la sección de vivienda y costo de vida de la <a href="${PAG}#vivienda">guía de Yukón</a>.</p>
      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas: lista oficial del Gobierno de Yukón --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c).sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
  let escuelas;
  if (escs.length) {
    escuelas = `<p>${escs.length === 1 ? `${esc(nombre)} tiene 1 escuela` : `${esc(nombre)} tiene ${miles(escs.length)} escuelas`} en la lista oficial del Gobierno de Yukón:</p>
      <ul class="cd-list-items">
        ${escs.map((e) => `<li>${esc(e.nombre)} — ${esc(e.sistema)}</li>`).join("\n        ")}
      </ul>
      <p>Cada escuela tiene una zona de asistencia: tus hijos se inscriben en la que corresponde a tu domicilio. Las escuelas católicas, de inmersión en francés, en francés y de la Junta Escolar de las Primeras Naciones tienen zonas más amplias.${ciudad ? " En Whitehorse la inscripción al kínder se hace en línea." : " En las comunidades rurales la inscripción se hace en persona, en la escuela."}</p>
      <p class="cd-indicator__src">Fuente: <a href="https://yukon.ca/en/education-and-schools/plan-elementary-and-high-school/register-your-child-school" target="_blank" rel="noopener">Gobierno de Yukón — Register your child for school</a> (copia del Internet Archive). Consultado el ${esc(consultado)}.</p>`;
  } else if (habitada) {
    const cerca = L.escuelas.map((e) => ({ e, d: km({ lat: r.lat, lon: r.lon }, L.porCodigo.get(e.csd)) })).sort((x, y) => x.d - y.d)[0];
    escuelas = `<p>La lista oficial de escuelas del Gobierno de Yukón no incluye ninguna en ${esc(nombre)}. La escuela más cercana está en <strong>${esc(L.porCodigo.get(cerca.e.csd).n)}</strong>, a unos ${DIST(cerca.d)} en línea recta. Confirma con el Departamento de Educación a qué escuela corresponde tu domicilio y si hay transporte escolar.</p>
      <p class="cd-indicator__src">Fuente: <a href="https://yukon.ca/en/education-and-schools/plan-elementary-and-high-school/register-your-child-school" target="_blank" rel="noopener">Gobierno de Yukón — Register your child for school</a>. Distancia calculada entre los puntos de referencia de las subdivisiones censales.</p>`;
  } else {
    escuelas = `<p>${esc(nombre)} no tiene población permanente en el Censo 2021 ni escuelas en la lista oficial.</p>`;
  }

  /* --- Salud --- */
  const hs = L.hospitales.filter((h) => h.csd === r.c);
  const cs = L.centros.filter((h) => h.csd === r.c);
  let salud;
  if (hs.length || cs.length) {
    salud = `<p>Según la base de centros de salud de Statistics Canada, ${esc(nombre)} tiene:</p>
      <ul class="cd-list-items">
        ${[...hs.map((h) => `<li>${esc(h.nombre)} (hospital)</li>`), ...cs.map((h) => `<li>${esc(h.nombre)} (centro de salud comunitario)</li>`)].join("\n        ")}
      </ul>
      ${hs.length ? "" : `<p>No hay un hospital en ${esc(nombre)}: el más cercano es <strong>${esc(cercano(r, L.hospitales).h.nombre)}</strong>, a unos ${DIST(cercano(r, L.hospitales).d)} en línea recta.</p>`}
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Confirma servicios y horarios en la página de hospitales y centros de salud del Gobierno de Yukón.</p>`;
  } else if (habitada) {
    const h = cercano(r, L.hospitales), c = cercano(r, L.centros);
    salud = `<p>${esc(nombre)} no tiene hospital ni centro de salud en la base de Statistics Canada. El centro de salud más cercano es <strong>${esc(c.h.nombre)}</strong>, a unos ${DIST(c.d)}, y el hospital más cercano, <strong>${esc(h.h.nombre)}</strong>, a unos ${DIST(h.d)} (en línea recta).</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancias calculadas con las coordenadas oficiales.</p>`;
  } else {
    salud = `<p>${esc(nombre)} no tiene población permanente en el Censo 2021 ni servicios de salud propios.</p>`;
  }
  if (habitada) {
    salud += `
      <p>Para usar el sistema público necesitas la tarjeta de salud de Yukón (Yukon Health Care Insurance Plan). La cobertura no es automática: hay que inscribirse en persona y, para los nuevos residentes, hay una espera de 3 meses. Pueden solicitarla los ciudadanos, los residentes permanentes y quienes tienen un permiso de trabajo de al menos 1 año; no quienes tienen permiso de estudios o visa de turista.</p>
      <h3>Emergencias y líneas de ayuda</h3>
      <ul class="cd-list-items">
        <li><strong>Emergencias: 9-1-1</strong> para policía (RCMP), bomberos o ambulancia. Te preguntarán desde qué comunidad llamas. El 9-1-1 de Yukón no recibe mensajes de texto, y no hay cobertura celular en todo el territorio: desde un teléfono satelital que no marque el 9-1-1, llama al 867-668-9911 (RCMP).</li>
        <li><strong>811:</strong> Yukon HealthLine, personal de enfermería por teléfono, las 24 horas (desde un teléfono satelital, 1-604-215-4700).</li>
        <li>Si te sientes en crisis o piensas en el suicidio: <strong>9-8-8</strong> (llamada o mensaje de texto, las 24 horas, en todo Canadá).</li>
      </ul>
      <p class="cd-indicator__src">Fuentes: <a href="https://yukon.ca/en/health-and-wellness/care-services/apply-health-care-card" target="_blank" rel="noopener">Gobierno de Yukón — Apply for a Yukon health care card</a>; <a href="https://yukon.ca/en/emergencies-and-safety/communicating-during-emergencies/learn-how-9-1-1-services-work-yukon" target="_blank" rel="noopener">Learn how 911 services work in the Yukon</a> (copias del Internet Archive); <a href="https://988.ca/" target="_blank" rel="noopener">9-8-8: Suicide Crisis Helpline</a>. Consultado el ${esc(consultado)}.</p>`;
  }

  /* --- Transporte --- */
  const transporte = habitada
    ? `<p>En Yukón se viaja sobre todo por carretera, y las distancias entre comunidades son largas. En invierno hay temperaturas extremas y pocas horas de luz: antes de salir, consulta el estado de las carreteras en 511 Yukon. El Gobierno de Yukón opera dos transbordadores gratuitos en verano: el George Black, en Dawson City, y el Pelly Barge, en Ross River. Old Crow no tiene acceso por carretera: se llega en avión.${ciudad ? " Whitehorse tiene transporte público municipal (Whitehorse Transit)." : ""}</p>
      ${enlaces([...RECURSOS.transporte, ...(ciudad ? [{ label: "Ciudad de Whitehorse — Transporte público (rutas y tarifas)", href: "https://www.whitehorse.ca/living-in-whitehorse/transit/" }] : [])], esc)}`
    : `<p>${esc(nombre)} no tiene población permanente en el Censo 2021.</p>`;

  const recien = `<p>Los servicios para recién llegados financiados por el Gobierno de Canadá son gratuitos para quienes cumplen sus requisitos. Usa el buscador oficial para ver cuáles atienden en Yukón o en línea.</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la sección <a href="${PAG}#inmigracion">Inmigración</a> y la <a href="${PAG}#recien-llegado">guía de primeros pasos</a> de Yukón.</p>`;
  const familias = `<p>Estos son recursos territoriales y federales: se aplican en todo el territorio, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia. Más detalles en la sección <a href="${PAG}#beneficios">Beneficios familiares y ayudas</a> de la guía.</p>
      ${enlaces(RECURSOS.familias, esc)}`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f && f.web ? [{ label: `Sitio oficial de ${f.nombre}`, href: f.web }] : []),
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, ...(lista.length ? [FUENTES.nombres] : []), FUENTES.epa, ...(ciudad ? [FUENTES.cmhc, FUENTES.ipc] : []), FUENTES.hospitales, ...(cl ? [FUENTES.clima] : []), FUENTES.hora, FUENTES.horaIana];

  const pobTxt = habitada ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : " No tenía población permanente en el Censo 2021.";
  const intro = ciudad
    ? `${nombre} es la capital de Yukón y su única ciudad, a orillas del río Yukón.${pobTxt}`
    : `${nombre} es ${que} de Yukón${f ? `, y ${f.centro}` : ""}.${pobTxt}`;
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la comunidad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Yukón · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro: intro + cierre,
    datos,
    reloj: habitada ? { timeZone: HORA.timeZone, lat: r.lat, lon: r.lon, etiqueta: `Hora local en ${nombre}` } : null,
    ubicacionExtra: cl ? `
      <h3>Clima (normales 1991-2020)</h3>
      <div class="cd-indicators">
        ${datoBloque("Temperatura media de enero", grados(cl.enero), `Promedio diario de enero en la estación ${esc(cl.estacion)} de Environment Canada.`)}
        ${datoBloque("Temperatura media de julio", grados(cl.julio), `Promedio diario de julio; promedio anual: ${grados(cl.anual)}.`)}
        ${cl.nieve != null ? datoBloque("Nieve al año", `${decimal(cl.nieve.toFixed(1))} cm`, `Nevada anual promedio${cl.precipitacion != null ? `; precipitación total (lluvia y nieve): ${decimal(cl.precipitacion.toFixed(1))} mm` : ""}.`) : ""}
      </div>
      <p class="cd-indicator__src">Fuente: <a href="${esc(cl.url)}" target="_blank" rel="noopener">Environment and Climate Change Canada — Normales climáticas 1991-2020, estación ${esc(cl.estacion)}</a>. Consultado el ${esc(consultado)}.</p>` : "",
    ubicacion: "Ubicación aproximada en Yukón. Mapa elaborado con el límite de la división censal de Yukón del Censo 2021 de Statistics Canada.",
    comunidades,
    empleo,
    busqueda: RECURSOS.empleo,
    vivienda,
    escuelas,
    escuelasEnlaces: RECURSOS.escuelas,
    salud,
    saludEnlaces: RECURSOS.salud,
    transporte,
    recien,
    familias,
    oficiales,
    fuentes,
    indexar: !!r.ficha,
    ciudad,
  };
}

function cercano(r, lista) {
  return lista.map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
}

function tarjeta(r) {
  const tipo = TIPOS[r.t];
  return {
    tipo: tipo.es === tipo.en ? tipo.es : `${tipo.es} (${tipo.en})`,
    dato: typeof r.p === "number" ? `${miles(r.p)} habitantes (Censo 2021)` : "",
  };
}

export default {
  slug: "yukon",
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
