/*
  provincias/northwest-territories.mjs — Directorio de comunidades de los Territorios del Noroeste
  ================================================================================================
  Criterio de inclusión (mismo estándar que Nunavut):
  - Una página por cada subdivisión censal (CSD) del territorio en el Censo
    2021 de Statistics Canada: 41 en total, que cubren todo el territorio:
      · la ciudad de Yellowknife (capital), 4 pueblos (towns), 1 aldea
        (village), 11 hamlets, 3 comunidades con carta (charter
        communities), 4 gobiernos comunitarios tłı̨chǫ, 9 asentamientos
        (settlements) y 2 reservas;
      · 6 zonas no organizadas, una por región censal.
  - Sin página propia, dentro de la página de su CSD: los lugares poblados
    con nombre oficial de la Base de datos de nombres geográficos de Canadá
    (CGNDB, Recursos Naturales Canadá), ubicados en su CSD por sus
    coordenadas oficiales (p. ej., Ndilǫ y los barrios de Yellowknife).
  - Las seis regiones son las divisiones censales («Region 1» a «Region 6»).
    Se acompañan del nombre de la región administrativa del Gobierno de los
    Territorios del Noroeste (GNWT) que corresponde a sus comunidades. Todo
    el territorio es una sola región económica de Statistics Canada.
  - Nombres: se muestran los nombres oficiales de la CGNDB cuando el Censo
    2021 los escribe sin sus signos diacríticos (Délı̨nę, Behchokǫ̀, Whatì,
    Łutselk'e) y se indica el nombre del censo.

  Hora: según el reglamento de la Interpretation Act de los Territorios del
  Noroeste (vigente desde el 21 de agosto de 2026), el territorio usa UTC−6
  todo el año. El reloj usa la zona IANA «America/Yellowknife», que en la
  base de datos horaria vigente (tzdata 2026d y posteriores) ya refleja esa
  regla. No se usan zonas de ramas no aprobadas.

  Datos (scripts/canada-en-datos/):
    nwt-localidades.json   obtener-nwt-localidades.py + compactar-nwt.py
    nwt-servicios.json     compactar-nwt-servicios.py: escuelas (ODEF 2022),
                           normales climáticas 1991-2020, diferenciales de costo
                           de vida 2025 e índice de precios de alimentos 2019 por
                           comunidad (NWT Bureau of Statistics) y alquileres de
                           CMHC en Yellowknife

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, datoBloque } from "../localidades.mjs";

const PROV = "Territorios del Noroeste";
const PAG = "/canada-en-datos/northwest-territories";

/* ---------- Clasificación oficial ---------- */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "comunidad-censo", plural: "ciudad (la capital)", censo: "CY" },
  town: { es: "Pueblo", en: "Town", grupo: "comunidad-censo", plural: "pueblos (towns)", censo: "T" },
  village: { es: "Aldea", en: "Village", grupo: "comunidad-censo", plural: "aldea (village)", censo: "VL" },
  hamlet: { es: "Hamlet", en: "Hamlet", grupo: "comunidad-censo", plural: "hamlets", censo: "HAM" },
  carta: { es: "Comunidad con carta", en: "Charter Community", grupo: "comunidad-censo", plural: "comunidades con carta (charter communities)", censo: "CC" },
  tlicho: { es: "Gobierno comunitario tłı̨chǫ", en: "Tłı̨chǫ Community Government", grupo: "comunidad-censo", plural: "gobiernos comunitarios tłı̨chǫ", censo: "CG" },
  asentamiento: { es: "Asentamiento", en: "Settlement", grupo: "comunidad-censo", plural: "asentamientos (settlements)", censo: "SET" },
  reserva: { es: "Reserva", en: "Indian Reserve", grupo: "comunidad-censo", plural: "reservas de Primeras Naciones", censo: "IRI" },
  "no-organizado": { es: "Zona no organizada", en: "Unorganized", grupo: "otro", plural: "zonas no organizadas (una por región)", censo: "NO" },
  localidad: { es: "Localidad", en: "Locality", grupo: "lugar", plural: "localidades (localities)", gn: "Locality" },
  barrio: { es: "Barrio", en: "Subdivision", grupo: "lugar", plural: "barrios y subdivisiones", gn: "Subdivision" },
  "lugar-asentamiento": { es: "Asentamiento (nombre geográfico)", en: "Settlement", grupo: "lugar", plural: "asentamientos registrados como nombre geográfico", gn: "Settlement" },
  ferroviario: { es: "Punto ferroviario", en: "Railway Point", grupo: "lugar", plural: "puntos ferroviarios", gn: "Railway Point" },
  estacion: { es: "Estación meteorológica", en: "Weather Station", grupo: "lugar", plural: "estaciones meteorológicas", gn: "Weather Station" },
  abandonada: { es: "Localidad abandonada", en: "Abandoned Locality", grupo: "lugar", plural: "localidades abandonadas", gn: "Abandoned Locality" },
  antigua: { es: "Antigua localidad", en: "Former Locality", grupo: "lugar", plural: "antiguas localidades", gn: "Former Locality" },
};
export const GRUPOS = {
  "comunidad-censo": "Comunidades",
  otro: "Zonas no organizadas",
  lugar: "Lugares con nombre oficial (sin página propia)",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "lugar";
const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
const POR_GN = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k]));
/* Tipos de la CGNDB que ya son subdivisiones censales (no se repiten como lugar) */
const GN_CSD = new Set(["City", "Town", "Village", "Hamlet", "Charter Community", "Community Government", "Community"]);

/* Regiones: divisiones censales 2021 («Region 1» a «Region 6») y región administrativa del GNWT con las mismas comunidades */
export const REGIONES = {
  6101: "Beaufort Delta (región 1)",
  6102: "Sahtú (región 2)",
  6103: "Tłı̨chǫ (región 3)",
  6104: "Dehcho (región 4)",
  6105: "South Slave (región 5)",
  6106: "North Slave (región 6)",
};

/* Nombres oficiales vigentes (CGNDB) cuando el Censo 2021 los escribe sin diacríticos */
const NOMBRES = {
  6102003: { n: "Délı̨nę", censo: "Déline" },
  6103031: { n: "Behchokǫ̀", censo: "Behchokò" },
  6103034: { n: "Whatì", censo: "Whatì" },
  6105020: { n: "Łutselk'e", censo: "Lutselk'e" },
  6104006: { n: "Sambaa K'e", censo: "Sambaa K’e" },
};
/* Nombres anteriores conocidos, solo para el buscador */
const ALIAS = {
  6103031: ["Rae", "Rae-Edzo", "Edzo", "Behchoko"],
  6102003: ["Deline", "Fort Franklin"],
  6105020: ["Lutselke", "Snowdrift"],
  6101095: ["Holman"],
  6102005: ["Fort Norman"],
  6101010: ["Arctic Red River"],
  6103034: ["Whati", "Lac La Martre"],
  6103049: ["Gameti", "Rae Lakes"],
  6103052: ["Wekweeti", "Snare Lake"],
  6104006: ["Trout Lake"],
  6106021: ["Detah"],
  6104017: ["K'atl'odeeche", "Hay River Reserve"],
};

/* ---------- Hora ----------
   Un solo horario en todo el territorio: UTC−6 todo el año desde el 21 de agosto de 2026
   (reglamento de la Interpretation Act; IANA tzdata 2026d). El reloj de cada comunidad
   habitada usa la zona IANA America/Yellowknife. */
const HORA = {
  timeZone: "America/Yellowknife",
  texto: "UTC−6 todo el año, sin cambio de hora (desde el 21 de agosto de 2026, el mismo horario de todo el territorio)",
};

/* ---------- Fichas completas ----------
   La capital y los tres centros con hospital o centro regional de salud más poblados
   (Censo 2021; Statistics Canada, ODHF). */
export const FICHAS = {
  yellowknife: { nombre: "Yellowknife", web: "https://www.yellowknife.ca/", centro: "la capital de los Territorios del Noroeste" },
  "hay-river": { nombre: "Hay River", centro: "el centro de la región South Slave, a orillas del Gran Lago del Esclavo" },
  inuvik: { nombre: "Inuvik", centro: "el centro de la región Beaufort Delta, al norte del círculo polar ártico" },
  "fort-smith": { nombre: "Fort Smith", centro: "una de las comunidades más pobladas de la región South Slave, en la frontera con Alberta" },
};

/* Hospitales de la base ODHF (Statistics Canada, 2020): nombre de la base → nombre que se muestra.
   Stanton figura dos veces en la base (nombre anterior y actual): se usa el actual. */
const HOSPITALES = {
  "stanton territorial hospital": "Stanton Territorial Hospital",
  "inuvik regional hospital": "Inuvik Regional Hospital",
  "h.h. williams memorial hospital": "Hospital de Hay River (H.H. Williams Memorial Hospital en la base ODHF de 2020)",
};

/* Encuesta de Población Activa de los territorios (Statistics Canada). No hay datos por comunidad. */
const EPA = {
  mensual: { desempleo: "5.1", empleo: "67.8", periodo: "octubre de 2026 (promedio móvil de 3 meses, desestacionalizado)" },
  anual: { desempleo: "5.0", periodo: "2025", fuente: { org: "Job Bank (Gobierno de Canadá)", title: "Economic Scan — Yukon, Northwest Territories and Nunavut: 2026", url: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/northwest-territories/environmental-scan" } },
};

/* Índice de precios al consumidor de Yellowknife (Statistics Canada, tabla 18-10-0004-01).
   Mide la variación de los precios, no su nivel. Publicada el 19 de octubre de 2026. */
const IPC = { periodo: "septiembre de 2026", anterior: "septiembre de 2025", yk: { indice: "170.0", previo: "162.4", variacion: "4.7" }, canada: { variacion: "3.1" }, publicado: "19 de octubre de 2026" };

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales, regiones y región económica", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Territorios del Noroeste", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0292-01 — Características de la población activa de los territorios, promedio móvil de 3 meses", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410029201" },
  escuelas: { org: "Statistics Canada", title: "Open Database of Educational Facilities (ODEF), versión 2.1 (2022)", url: "https://www.statcan.gc.ca/en/lode/databases/odef" },
  clima: { org: "Environment and Climate Change Canada", title: "Normales climáticas de Canadá 1991-2020", url: "https://climate.weather.gc.ca/climate_normals/index_e.html" },
  ipc: { org: "Statistics Canada", title: "Tabla 18-10-0004-01 — Índice de precios al consumidor, mensual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401" },
  cmhc: { org: "Statistics Canada y CMHC", title: "Tabla 34-10-0133-01 — Alquiler promedio de CMHC, por tipo de unidad", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3410013301" },
  hospitales: { org: "Statistics Canada", title: "Open Database of Healthcare Facilities (ODHF), versión 1.1 (2020)", url: "https://www.statcan.gc.ca/en/lode/databases/odhf" },
  lcd: { org: "NWT Bureau of Statistics", title: "Federal Isolated Post Living Cost Differentials, by Community (2025)", url: "https://www.statsnwt.ca/en/prices-and-expenditures/living-cost-differentials" },
  fpi: { org: "NWT Bureau of Statistics", title: "NWT Food Price Index, by Community (2019 Community Price Survey)", url: "https://www.statsnwt.ca/en/prices-and-expenditures/community-price-index" },
  hora: { org: "Gobierno de los Territorios del Noroeste", title: "Interpretation Act — reglamento sobre la hora (R-2), vigente desde el 21 de agosto de 2026", url: "https://www.justice.gov.nt.ca/en/files/legislation/interpretation/interpretation.r2.pdf" },
  horaIana: { org: "IANA", title: "Base de datos de zonas horarias (tzdata 2026d): America/Yellowknife", url: "https://www.iana.org/time-zones" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en los Territorios del Noroeste", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Northwest+Territories" },
    { label: "Job Bank — Panorama económico de los territorios (2026)", href: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/northwest-territories/environmental-scan" },
  ],
  escuelas: [
    { label: "GNWT (Educación, Cultura y Empleo) — Directorio de los organismos educativos de los Territorios del Noroeste", href: "https://www.ece.gov.nt.ca/en/directory-nwt-education-bodies" },
  ],
  salud: [
    { label: "GNWT — Plan de Salud de los Territorios del Noroeste (tarjeta de salud)", href: "https://www.hss.gov.nt.ca/en/services/nwt-health-care-plan" },
    { label: "GNWT — 811: enfermería por teléfono, las 24 horas", href: "https://www.hss.gov.nt.ca/en/services/811" },
    { label: "9-8-8 — Línea de prevención del suicidio (llamada o mensaje de texto)", href: "https://988.ca/" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
    { label: "GNWT — Programa de Nominados de los Territorios del Noroeste (NTNP)", href: "https://www.immigratenwt.ca/" },
  ],
  familias: [
    { label: "CRA — Canada Child Benefit (CCB): quién puede solicitarla", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview/canada-child-benefit-before-you-apply.html" },
    { label: "CRA — Northwest Territories Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/northwest-territories.html" },
    { label: "CRA — Deducciones para residentes del norte (línea 25500)", href: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions.html" },
  ],
  vivienda: [
    { label: "Housing NWT — Vivienda pública y programas de vivienda", href: "https://www.nwthc.gov.nt.ca/en/services" },
    { label: "Housing NWT — Vivienda pública: cómo se calcula el alquiler y cómo solicitarla", href: "https://www.nwthc.gov.nt.ca/en/services/public-housing-program" },
  ],
  transporte: [
    { label: "DriveNWT (GNWT) — Estado de las carreteras, transbordadores y cruces de hielo", href: "https://www.inf.gov.nt.ca/en/services/highway-conditions-map-drivenwt" },
    { label: "GNWT (Infraestructura) — Transporte: carreteras, aeropuertos y transbordadores", href: "https://www.inf.gov.nt.ca/en/transportation" },
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
  const J = JSON.parse(readFileSync(join(base, "nwt-localidades.json"), "utf8"));
  const SV = JSON.parse(readFileSync(join(base, "nwt-servicios.json"), "utf8"));
  const censo = (v) => Object.fromEntries(J.censo_campos.map((k, i) => [k, num(v[i])]));
  const csd = J.csd.map((f) => objeto(J.csd_campos, f));

  /* Encuadre del mapa (metros, EPSG:3347) */
  const geo = J.cd_geo;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (g, fn) => g.coordinates.forEach((p) => p.forEach((q) => q.forEach(([x, y]) => fn(x, y))));
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
    const nombre = t === "no-organizado" ? `${REGIONES[c.cd].replace(/ \(región \d\)/, "")}: zona no organizada` : oficial ? oficial.n : c.nombre;
    items.push({
      c: c.id,
      n: nombre,
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
  for (const r of items) r.s = slug(latino(r.n));
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error("Nombres de URL repetidos en los Territorios del Noroeste");
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r || TIPOS[r.t].grupo !== "comunidad-censo") throw new Error(`Ficha completa sin comunidad: ${k}`);
    r.ficha = true;
  }
  for (const c of Object.keys(SV.clima)) if (!porCodigo.has(c)) throw new Error(`Normales climáticas de una subdivisión inexistente: ${c}`);
  for (const c of [...Object.keys(SV.lcd), ...Object.keys(SV.fpi)]) if (!porCodigo.has(c)) throw new Error(`Índice de costo de vida de una subdivisión inexistente: ${c}`);

  /* --- Lugares con nombre oficial (sin página propia) --- */
  const nombresCsd = new Set(items.flatMap((r) => [norm(r.n), norm(r.censoNombre)]));
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

  const hospitales = [];
  for (const f of J.hospitales) {
    const h = objeto(J.hospitales_campos, f);
    if (HOSPITALES[h.nombre] && !hospitales.some((x) => x.nombre === HOSPITALES[h.nombre])) hospitales.push({ ...h, nombre: HOSPITALES[h.nombre] });
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
    lcd: SV.lcd,
    fpi: SV.fpi,
    cmhc: SV.cmhc,
    hospitales,
  };
}

/* ---------- Textos del directorio en la ficha territorial ---------- */
const directorio = {
  titulo: "Explora las comunidades de los Territorios del Noroeste",
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales y regiones); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá",
  poblacion: "Censo 2021",
  regiones: "6 regiones",
  regionEtiqueta: "Región",
  rangosPoblacion: [["10000-", "10,000 o más"], ["2000-9999", "2,000 a 9,999"], ["500-1999", "500 a 1,999"], ["1-499", "1 a 499"], ["0-0", "0 habitantes"]],
  tipoEtiqueta: "Tipo de comunidad",
  ejemplo: "Fort Simpson",
  extendido: true,
  notaFichas: "Las demás comunidades tienen, por ahora, una página con información básica: clasificación oficial, región, población del Censo 2021, hora local, escuelas, hospital más cercano, costo de vida y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const comunidades = L.items.filter((r) => TIPOS[r.t].grupo === "comunidad-censo");
    const habitadas = comunidades.filter((r) => r.p > 0).length;
    const lugares = L.items.filter((r) => TIPOS[r.t].grupo === "lugar").length;
    return `<p>Investiga las comunidades de los Territorios del Noroeste antes de decidir dónde vivir, trabajar o estudiar. Yellowknife, la capital, concentra la mitad de la población; las demás comunidades son pequeñas y muchas están a orillas de grandes ríos y lagos. Algunas tienen carretera todo el año; otras solo se alcanzan en avión o por caminos de invierno. El directorio reúne las ${miles(L.items.filter((r) => ES_PAGINA(r.t)).length)} subdivisiones censales del Censo 2021, que cubren todo el territorio (${miles(habitadas)} comunidades con población en ese censo), y <strong>${miles(lugares)} lugares con nombre oficial</strong> que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Comunidades</strong>: la ciudad de Yellowknife, los pueblos (towns), la aldea de Fort Simpson, los hamlets, las comunidades con carta, los gobiernos comunitarios tłı̨chǫ, los asentamientos y dos reservas de Primeras Naciones. Cada página indica la hora local, el clima cuando hay una estación de Environment Canada y el costo de vida frente a Edmonton cuando está publicado.</li>
        <li><strong>Zonas no organizadas</strong>: una en cada región, que cubre el territorio fuera de las comunidades.</li>
        <li><strong>Lugares con nombre oficial</strong>: barrios (como Ndilǫ y Old Town, en Yellowknife), localidades a lo largo de las carreteras y antiguos asentamientos. No son comunidades aparte: aparecen dentro de la subdivisión en la que están.</li>
      </ul>`;
  },
  nota: () => "El filtro «Región» usa las seis regiones del Censo 2021 (divisiones censales «Region 1» a «Region 6»); a cada una se le añade el nombre de la región del Gobierno de los Territorios del Noroeste que reúne las mismas comunidades. Statistics Canada considera todo el territorio una sola región económica, y la Encuesta de Población Activa da cifras para todo el territorio, no por comunidad. Délı̨nę, Behchokǫ̀ y Łutselk'e aparecen en el Censo 2021 escritos sin sus signos diacríticos. Los lugares con nombre oficial provienen de la Base de datos de nombres geográficos de Canadá y no tienen cifras de población propias.",
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.nombres, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada página ---------- */
const DIST = (n) => (n < 1.5 ? "1 km" : `${miles(Math.round(n))} km`);
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };
const grados = (v) => `${v.toFixed(1).replace("-", "−")} °C`;

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const consultado = fechaEs(L.meta.consultado);
  const f = r.ficha ? FICHAS[r.s] : null;
  const nombre = r.n;
  const habitada = typeof r.p === "number" && r.p > 0;
  const cl = L.clima[r.c] || null;
  const lcd = L.lcd[r.c] || null;
  const fpi = L.fpi[r.c] || null;
  const regionCorta = r.region.replace(/ \(región \d\)/, "");

  const titulo = r.ficha ? `${nombre}, Territorios del Noroeste: guía para inmigrantes y recién llegados` : `${nombre}, Territorios del Noroeste: información básica`;
  const que = {
    city: "la capital de los Territorios del Noroeste",
    town: "un pueblo (town)",
    village: "una aldea (village)",
    hamlet: "un hamlet (comunidad con gobierno municipal)",
    carta: "una comunidad con carta (charter community)",
    tlicho: "un gobierno comunitario tłı̨chǫ",
    asentamiento: "un asentamiento (settlement)",
    reserva: "una reserva de Primeras Naciones",
    "no-organizado": "la zona no organizada",
  }[r.t];
  const descripcion = r.ficha
    ? `${nombre} (Territorios del Noroeste) en datos: población, hora local, empleo, vivienda, escuelas, salud, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} de la región ${regionCorta}, en los Territorios del Noroeste. Clasificación oficial, población del Censo 2021, hora local y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null && r.p16 ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  const datos = [
    fila("Clasificación oficial", `${esc(tipo.es === tipo.en ? tipo.es : `${tipo.es} (${tipo.en})`)} <small class="cd-fact__period">Tipo de subdivisión censal: ${esc(tipo.censo)}</small>`),
    r.censoNombre !== nombre && r.t !== "no-organizado" ? fila("Nombre en el Censo 2021", esc(r.censoNombre)) : "",
    fila("Región", esc(r.region)),
    fila("Población", pob),
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null && habitada ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    r.viviendas != null && habitada ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    habitada ? fila("Emergencias", `911 <small class="cd-fact__period">Servicio 9-1-1 de los Territorios del Noroeste para policía, bomberos y ambulancias</small>`) : "",
    fila("Hora local", esc(HORA.texto)),
    lcd ? fila("Costo de vida (Edmonton = 100)", `${lcd[0]} a ${lcd[1]} <small class="cd-fact__period">Diferencial de costo de vida de los puestos aislados federales, 2025. Fuente: NWT Bureau of Statistics</small>`) : "",
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
  const empleo = `<p>Statistics Canada publica las cifras de empleo de los Territorios del Noroeste para todo el territorio, no por comunidad.</p>
      <div class="cd-indicators">
        ${datoBloque("Tasa de desempleo del territorio", `${EPA.mensual.desempleo}%`, `${esc(EPA.mensual.periodo)}. Fuente: ${fuente(FUENTES.epa, esc)}. Consultado el ${esc(consultado)}.`)}
        ${datoBloque("Tasa de desempleo, promedio anual", `${EPA.anual.desempleo}%`, `Año ${esc(EPA.anual.periodo)}. Fuente: ${fuente(EPA.anual.fuente, esc)}.`)}
      </div>`;

  /* --- Vivienda --- */
  const cm = r.t === "city" ? L.cmhc : null;
  const vivienda = `${cm ? `<p>Encuesta de alquileres de CMHC, ${esc(cm.periodo)}, para apartamentos privados en Yellowknife (tabla 34-10-0133-01 de Statistics Canada).</p>
      <div class="cd-indicators">
        ${cm.filas.map(([etq, v]) => datoBloque(`Alquiler promedio, ${esc(etq)}`, v ? `$${miles(v)} al mes` : null, `${esc(cm.periodo)}. Fuente: ${fuente(FUENTES.cmhc, esc)}.`)).join("\n        ")}
      </div>
      <p class="cd-indicator__src">Los promedios incluyen contratos antiguos y nuevos: un alquiler nuevo suele costar más que el promedio.</p>` : `<p>${NO_DISPONIBLE}: CMHC publica alquileres de los Territorios del Noroeste solo para Yellowknife, y Statistics Canada no tiene una serie de alquileres por comunidad. Fuera de Yellowknife la oferta de alquiler privado es limitada y una parte importante de las viviendas es pública (Housing NWT) o del personal de los empleadores: antes de aceptar un empleo, pregunta si incluye vivienda.</p>`}
      ${r.t === "city" ? `<h3>Precios en Yellowknife</h3>
      <div class="cd-indicators">
        ${datoBloque("Índice de precios al consumidor de Yellowknife", `+${IPC.yk.variacion}%`, `Variación de ${esc(IPC.anterior)} a ${esc(IPC.periodo)}${IPC.yk.previo ? ` (índice ${IPC.yk.previo} → ${IPC.yk.indice}; base 2002 = 100)` : ""}. En Canadá fue de +${IPC.canada.variacion}%. El índice mide cuánto cambian los precios, no cuánto cuestan: no sirve para comparar el costo de vida entre ciudades. Fuente: ${fuente(FUENTES.ipc, esc)}.`)}
      </div>` : ""}
      ${lcd || fpi ? `<h3>Costo de vida en ${esc(nombre)}</h3>
      <div class="cd-indicators">
        ${lcd ? datoBloque("Diferencial de costo de vida (Edmonton = 100)", `${lcd[0]} a ${lcd[1]}`, `2025. Rango de precios de ${esc(nombre)} frente a Edmonton (100), que el Gobierno de Canadá usa para fijar la asignación de sus empleados en puestos aislados. Fuente: ${fuente(FUENTES.lcd, esc)}.`) : ""}
        ${fpi ? datoBloque("Índice de precios de alimentos (Yellowknife = 100)", String(fpi), `Encuesta de precios por comunidad de 2019, la más reciente publicada: los alimentos costaban ${fpi > 100 ? `un ${fpi - 100}% más` : fpi < 100 ? `un ${100 - fpi}% menos` : "lo mismo"} que en Yellowknife. Fuente: ${fuente(FUENTES.fpi, esc)}.`) : ""}
      </div>` : ""}
      <p>Consulta la sección de vivienda y costo de vida de la <a href="${PAG}#vivienda">guía de los Territorios del Noroeste</a>.</p>
      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas: base abierta de establecimientos educativos (Statistics Canada, ODEF 2022) --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c).sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
  let escuelas;
  if (escs.length) {
    escuelas = `<p>${escs.length === 1 ? `${esc(nombre)} tiene 1 establecimiento educativo` : `${esc(nombre)} tiene ${miles(escs.length)} establecimientos educativos`} en la base abierta de Statistics Canada (2022):</p>
      <ul class="cd-list-items">
        ${escs.map((e) => `<li>${esc(e.nombre)}${e.en_ndilo ? " (en Ndilǫ)" : ""}${e.niveles ? ` — ${esc(e.niveles)}` : ""}${e.autoridad === "CSF" ? " — en francés" : ""}</li>`).join("\n        ")}
      </ul>
      <p>Para inscribir a tus hijos, comunícate con la escuela o con el organismo educativo de tu comunidad (education body).${escs.some((e) => e.autoridad === "CSF") ? " Las escuelas marcadas «en francés» dependen de la Commission scolaire francophone des Territoires du Nord-Ouest." : ""}</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. La base se publicó en 2022: confirma nombres y niveles con el Departamento de Educación, Cultura y Empleo.</p>`;
  } else if (habitada) {
    escuelas = `<p>La base abierta de establecimientos educativos de Statistics Canada no lista escuelas en ${esc(nombre)}. Consulta al Departamento de Educación, Cultura y Empleo del GNWT.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}.</p>`;
  } else {
    escuelas = `<p>${esc(nombre)} no tiene población permanente en el Censo 2021 ni escuelas en la base abierta de Statistics Canada.</p>`;
  }

  /* --- Salud --- */
  const hs = L.hospitales.filter((h) => h.csd === r.c);
  let salud;
  if (hs.length) {
    salud = `<p>${esc(nombre)} tiene ${hs.length === 1 ? "un hospital" : "hospitales"} según la base de centros de salud de Statistics Canada:</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(h.nombre)}</li>`).join("\n        ")}
      </ul>
      <p>La atención especializada que no se ofrece en el territorio se recibe, en general, en Edmonton (Alberta): el Plan de Salud de los Territorios del Noroeste tiene un programa de viajes médicos.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Confirma servicios y horarios con la Autoridad de Servicios de Salud y Sociales.</p>`;
  } else if (habitada) {
    const cerca = L.hospitales.map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
    salud = `<p>La atención de salud diaria en las comunidades pequeñas se da en el centro de salud local (health centre), atendido sobre todo por personal de enfermería. No hay un hospital dentro de ${esc(nombre)}: el más cercano es <strong>${esc(cerca.h.nombre)}</strong>, a unos ${DIST(cerca.d)} en línea recta.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancia calculada con las coordenadas oficiales.</p>`;
  } else {
    salud = `<p>${esc(nombre)} no tiene población permanente en el Censo 2021 ni servicios de salud propios.</p>`;
  }
  if (habitada) {
    salud += `
      <h3>Emergencias y líneas de ayuda</h3>
      <ul class="cd-list-items">
        <li><strong>Emergencias: 9-1-1</strong> para policía (RCMP), bomberos o ambulancia. Di primero dónde estás: la operadora no conoce tu ubicación. Si no hablas inglés ni francés, pide tu idioma: hay intérpretes. En los Territorios del Noroeste no se puede enviar un mensaje de texto al 9-1-1, y donde no hay cobertura celular la llamada no funciona; desde un teléfono satelital, marca el 1-867-920-0911.</li>
        <li><strong>811:</strong> personal de enfermería por teléfono, las 24 horas, en todas las comunidades del territorio (o 1-844-259-1793).</li>
        <li>Si te sientes en crisis o piensas en el suicidio: <strong>9-8-8</strong> (llamada o mensaje de texto, las 24 horas, en todo Canadá).</li>
      </ul>
      <p class="cd-indicator__src">Fuentes: <a href="https://www.maca.gov.nt.ca/en/services/9-1-1-nwt" target="_blank" rel="noopener">GNWT (Asuntos Municipales y Comunitarios) — 9-1-1 en los Territorios del Noroeste</a>; <a href="https://www.hss.gov.nt.ca/en/services/811" target="_blank" rel="noopener">GNWT (Salud y Servicios Sociales) — 811</a>; <a href="https://988.ca/" target="_blank" rel="noopener">9-8-8: Suicide Crisis Helpline</a>. Consultado el ${esc(consultado)}.</p>`;
  }

  /* --- Transporte --- */
  const transporte = habitada
    ? `<p>En los Territorios del Noroeste, algunas comunidades tienen carretera todo el año, otras dependen de transbordadores en verano y de cruces o caminos de hielo en invierno, y otras solo se alcanzan en avión. Los cruces de los ríos se cierran durante la congelación y el deshielo. Antes de viajar a ${esc(nombre)} o de mudarte, confirma cómo se llega en cada temporada y consulta el estado de las carreteras, los transbordadores y los cruces de hielo en DriveNWT.</p>
      ${enlaces(RECURSOS.transporte, esc)}`
    : `<p>${esc(nombre)} no tiene población permanente en el Censo 2021.</p>`;

  const recien = `<p>Los servicios para recién llegados financiados por el Gobierno de Canadá son gratuitos para quienes cumplen sus requisitos. Usa el buscador oficial para ver cuáles atienden en los Territorios del Noroeste o en línea.</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la sección <a href="${PAG}#inmigracion">Inmigración</a> y la <a href="${PAG}#recien-llegado">guía de primeros pasos</a> de los Territorios del Noroeste.</p>`;
  const familias = `<p>Estos son recursos territoriales y federales: se aplican en todo el territorio, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia. Más detalles en la sección <a href="${PAG}#beneficios">Beneficios familiares y ayudas</a> de la guía.</p>
      ${enlaces(RECURSOS.familias, esc)}`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f && f.web ? [{ label: `Sitio oficial de ${f.nombre}`, href: f.web }] : []),
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, ...(lista.length ? [FUENTES.nombres] : []), FUENTES.epa, ...(r.t === "city" ? [FUENTES.cmhc, FUENTES.ipc] : []), FUENTES.escuelas, FUENTES.hospitales, ...(lcd ? [FUENTES.lcd] : []), ...(fpi ? [FUENTES.fpi] : []), ...(cl ? [FUENTES.clima] : []), FUENTES.hora, FUENTES.horaIana];

  const pobTxt = habitada ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : "";
  const intro = {
    city: `${nombre} es la capital de los Territorios del Noroeste y su única ciudad, a orillas del Gran Lago del Esclavo, en la región North Slave.${pobTxt}`,
    "no-organizado": `${nombre} es el territorio de la región ${regionCorta} que queda fuera de las comunidades. ${habitada ? `En el Censo 2021 tenía ${miles(r.p)} habitantes.` : "No tenía población permanente en el Censo 2021."}`,
  }[r.t] || `${nombre} es ${que} de la región ${regionCorta}, en los Territorios del Noroeste${f ? `, y ${f.centro}` : ""}.${habitada ? pobTxt : " No tenía población permanente en el Censo 2021."}`;
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la comunidad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Territorios del Noroeste · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
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
    ubicacion: `Ubicación aproximada en la región ${esc(regionCorta)}. Mapa elaborado con los límites de las divisiones censales del Censo 2021 de Statistics Canada (solo las islas más grandes).`,
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
  slug: "northwest-territories",
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
