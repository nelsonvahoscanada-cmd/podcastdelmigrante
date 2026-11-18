/*
  provincias/new-brunswick.mjs — Directorio de localidades de Nuevo Brunswick
  ===========================================================================
  Criterio de inclusión (mismo estándar que las demás provincias):
  - Una página por cada subdivisión censal (CSD) de la provincia en el Censo
    2021 de Statistics Canada: 266 en total, que cubren toda la provincia y
    tienen un código estable de 7 dígitos:
      · 104 municipios del censo (8 ciudades, 26 pueblos, 61 villas, 8
        comunidades rurales y 1 municipio regional);
      · 142 parroquias (Parish, tipo «P»): el territorio no incorporado en
        2021, organizado entonces en distritos de servicios locales;
      · 20 reservas indígenas.
  - Reforma de 2023: desde el 1 de enero de 2023 (Local Governance Act,
    reglamentos 2022-50 y 2022-45) la provincia tiene 77 gobiernos locales y
    12 distritos rurales, cuyos límites no coinciden con las subdivisiones del
    Censo 2021. Cada página indica qué gobiernos locales o distritos rurales
    vigentes ocupan su territorio (porcentaje de superficie calculado con los
    límites oficiales de GeoNB y del censo). Las cifras de población siguen
    siendo las del Censo 2021, la última cifra oficial por subdivisión.
  - Sin página propia, dentro del directorio y de la página de su CSD: los
    lugares poblados con nombre oficial de la Base de datos de nombres
    geográficos de Canadá (CGNDB, Recursos Naturales Canadá), ubicados en su
    CSD por sus coordenadas oficiales.
  - Filtros: región económica (5, formadas por condados completos) y condado
    (15 divisiones censales).
  No se promete cobertura de asentamientos sin nombre oficial registrado.

  Datos (scripts/canada-en-datos/):
    nb-localidades.json   compactar-nb.py (a partir de obtener-nb-localidades.py,
                          obtener-nb-ficha.py geonb y consultar-nb-wds.py)

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";

const PROV = "Nuevo Brunswick";

/* ---------- Clasificación oficial ----------
   Tipos de subdivisión censal de Statistics Canada (código en `censo`) y
   tipos de nombre geográfico de la CGNDB (en `gn`). Los nombres oficiales
   se dejan en inglés junto al equivalente en español. */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "municipio", plural: "ciudades", censo: "C" },
  town: { es: "Pueblo", en: "Town", grupo: "municipio", plural: "pueblos (towns)", censo: "TV" },
  village: { es: "Villa", en: "Village", grupo: "municipio", plural: "villas (villages)", censo: "VL" },
  "rural-community": { es: "Comunidad rural", en: "Rural Community", grupo: "municipio", plural: "comunidades rurales (rural communities)", censo: "RCR" },
  regional: { es: "Municipio regional", en: "Regional Municipality", grupo: "municipio", plural: "municipio regional (regional municipality)", censo: "MRM" },
  parish: { es: "Parroquia", en: "Parish", grupo: "rural", plural: "parroquias (parishes) del territorio no incorporado", censo: "P" },
  reserve: { es: "Reserva indígena", en: "Indian Reserve", grupo: "indigena", plural: "reservas indígenas (Indian reserves)", censo: "IRI" },
  "comunidad-rural-dispersa": { es: "Comunidad rural dispersa", en: "Dispersed Rural Community", grupo: "comunidad", plural: "comunidades rurales dispersas", gn: "Dispersed Rural Community" },
  "comunidad-urbana": { es: "Comunidad urbana", en: "Urban Community", grupo: "comunidad", plural: "comunidades urbanas", gn: "Urban Community" },
  suburbio: { es: "Comunidad suburbana", en: "Suburban Community", grupo: "comunidad", plural: "comunidades suburbanas", gn: "Suburban Community" },
  localidad: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades (localities)", gn: "Locality" },
  "villa-rural": { es: "Villa rural", en: "Rural Village", grupo: "comunidad", plural: "villas rurales (rural villages)", gn: "Rural Village" },
  "comunidad-rural-nombre": { es: "Comunidad rural (nombre geográfico)", en: "Rural Community", grupo: "comunidad", plural: "comunidades rurales registradas como nombre geográfico", gn: "Rural Community" },
  asentamiento: { es: "Asentamiento", en: "Settlement", grupo: "comunidad", plural: "asentamientos (settlements)", gn: "Settlement" },
  barrio: { es: "Barrio", en: "Neighbourhood", grupo: "comunidad", plural: "barrios (neighbourhoods)", gn: "Neighbourhood" },
  desembarcadero: { es: "Desembarcadero", en: "Landing", grupo: "comunidad", plural: "desembarcaderos (landings)", gn: "Landing" },
  "nombre-municipal": { es: "Nombre geográfico de ciudad, pueblo o villa", en: "City, Town or Village (geographical name)", grupo: "comunidad", plural: "nombres registrados como ciudad, pueblo o villa que no son una subdivisión censal" },
  "punto-ferroviario": { es: "Punto ferroviario", en: "Railway Point", grupo: "comunidad", plural: "puntos ferroviarios (railway points)", gn: "Railway Point" },
  estacion: { es: "Estación", en: "Station", grupo: "comunidad", plural: "estaciones", gn: "Station" },
  "oficina-correos": { es: "Lugar con oficina de correos (nombre histórico)", en: "Post Office", grupo: "comunidad", plural: "lugares con nombre de oficina de correos", gn: "Post Office" },
  "parque-industrial": { es: "Parque industrial", en: "Industrial Park", grupo: "comunidad", plural: "parques industriales", gn: "Industrial Park" },
  "reserva-nombre": { es: "Reserva indígena (nombre geográfico)", en: "Indian Reserve", grupo: "comunidad", plural: "reservas registradas como nombre geográfico", gn: "Indian Reserve" },
};
export const GRUPOS = {
  municipio: "Municipios del Censo 2021",
  rural: "Territorio no incorporado en 2021 (parroquias del censo)",
  indigena: "Reservas indígenas (clasificación del censo)",
  comunidad: "Comunidades, localidades y otros nombres geográficos",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "comunidad";
const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
const POR_GN = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k]));

/* Tipos de los gobiernos locales vigentes (GeoNB, 2023) */
const TIPO_ACTUAL = { City: "ciudad", Town: "pueblo", Village: "villa", "Rural Community": "comunidad rural", "Regional Municipality": "municipio regional", "Rural District": "distrito rural" };

/* ---------- Fichas completas ----------
   Las ciudades y pueblos con datos propios en la encuesta de alquileres de
   CMHC (octubre de 2025). Sitios oficiales comprobados antes de publicar;
   el transporte, según la página oficial para recién llegados del Gobierno
   de Nuevo Brunswick. */
const CODIAC = { label: "Codiac Transpo — Rutas y horarios (Moncton, Dieppe y Riverview)", href: "https://www.codiactranspo.ca/moncton-transport/schedules-routes" };
const MARITIME = { label: "Maritime Bus — Autobuses entre ciudades", href: "https://maritimebus.com/" };
export const FICHAS = {
  moncton: { nombre: "Moncton", web: "https://www.moncton.ca/", cmhc: ["moncton", "Moncton City (Zones 1-4)", "la ciudad de Moncton (zonas 1 a 4 de CMHC)"], transporte: [CODIAC, MARITIME] },
  "saint-john": { nombre: "Saint John", web: "https://saintjohn.ca/en", cmhc: ["saint-john", "Saint John City (Zones 1-4)", "la ciudad de Saint John (zonas 1 a 4 de CMHC)"], transporte: [{ label: "Saint John Transit — Rutas, paradas y horarios", href: "https://saintjohn.ca/en/transit/routes-stops-and-schedules" }, MARITIME] },
  fredericton: { nombre: "Fredericton", web: "https://www.fredericton.ca/", cmhc: ["fredericton", "Fredericton CMA", "el área metropolitana de Fredericton (CMHC no publica una cifra solo de la ciudad)"], transporte: [{ label: "Fredericton Transit — Horarios y mapas", href: "https://www.fredericton.ca/resident-services/fredericton-transit/schedule-maps" }, MARITIME] },
  dieppe: { nombre: "Dieppe", web: "https://www.dieppe.ca/en/", cmhc: ["moncton", "Zone 6 - Dieppe City", "la zona 6 de CMHC (ciudad de Dieppe)"], transporte: [CODIAC, MARITIME] },
  riverview: { nombre: "Riverview", web: "https://www.townofriverview.ca/", cmhc: ["moncton", "Zone 5 - Riverview", "la zona 5 de CMHC (Riverview)"], transporte: [CODIAC, MARITIME] },
  miramichi: { nombre: "Miramichi", web: "https://www.miramichi.org/", cmhc: ["new-brunswick", "Miramichi CA", "la aglomeración de Miramichi"], transporte: [MARITIME] },
  edmundston: { nombre: "Edmundston", web: "https://edmundston.ca/en", cmhc: ["new-brunswick", "Edmundston CA", "la aglomeración de Edmundston"], transporte: [MARITIME] },
  bathurst: { nombre: "Bathurst", web: "https://www.bathurst.ca/", cmhc: ["new-brunswick", "Bathurst CA", "la aglomeración de Bathurst"], transporte: [MARITIME] },
  /* Sin sitio oficial: no se pudo comprobar su dirección (18-11-2026) */
  campbellton: { nombre: "Campbellton", web: null, cmhc: ["new-brunswick", "Campbellton CA", "la parte de Nuevo Brunswick de la aglomeración de Campbellton"], transporte: [MARITIME] },
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales, condados y regiones económicas", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Nuevo Brunswick", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  gobiernos: { org: "Gobierno de Nuevo Brunswick (GeoNB)", title: "Gobiernos locales y distritos rurales, vigentes desde el 1 de enero de 2023", url: "https://www.gnb.ca/en/campaign/geonb/data-catalogue/local-governments.html" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0464-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046401" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0466-01 — Características del empleo por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046601" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Gobierno de Nuevo Brunswick (GeoNB)", title: "Escuelas públicas (Departamento de Educación y Desarrollo de la Primera Infancia)", url: "https://www.gnb.ca/en/topic/education-training/k-12/district.html" },
  hospitales: { org: "Gobierno de Nuevo Brunswick (GeoNB)", title: "Hospitales de las redes de salud Horizon y Vitalité", url: "https://www.gnb.ca/en/topic/health-wellness/access-health-care/regional-health-authorities.html" },
  hora: { org: "IANA", title: "Base de datos de zonas horarias (America/Moncton): hora del Atlántico con horario de verano", url: "https://www.iana.org/time-zones" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Nuevo Brunswick", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=New+Brunswick" },
    { label: "NBjobs.ca — Empleos en Nuevo Brunswick", href: "https://www.nbjobs.ca/" },
  ],
  escuelas: [
    { label: "Gobierno de Nuevo Brunswick — Distritos escolares (inglés y francés)", href: "https://www.gnb.ca/en/topic/education-training/k-12/district.html" },
    { label: "Gobierno de Nuevo Brunswick — Familias nuevas en el sistema escolar", href: "https://www.gnb.ca/en/topic/education-training/k-12/school/new-families.html" },
  ],
  salud: [
    { label: "Gobierno de Nuevo Brunswick — Cómo acceder a la atención de salud", href: "https://www.gnb.ca/en/campaign/accessing-health-care-nb.html" },
    { label: "NB Health Link — Lista de espera para conseguir médico de familia", href: "https://nbhealthlink.ca/" },
    { label: "Gobierno de Nuevo Brunswick — Tele-Care 811", href: "https://www.gnb.ca/en/topic/health-wellness/access-health-care/tele-care-811.html" },
  ],
  recienLlegados: [
    { label: "Gobierno de Nuevo Brunswick — Servicios de asentamiento por región", href: "https://www.gnb.ca/en/topic/family-home-community/immigration/newcomers.html" },
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
  ],
  familias: [
    { label: "CRA — Beneficios de la Provincia de Nuevo Brunswick", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/province-new-brunswick.html" },
    { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
  ],
  vivienda: [
    { label: "Gobierno de Nuevo Brunswick — Alquilar: derechos y aumentos de alquiler", href: "https://www.gnb.ca/en/topic/family-home-community/renting.html" },
  ],
};

/* ---------- Utilidades ---------- */
/* Variantes de escritura para el buscador: sin apóstrofo, sin punto, con «Saint» y sin acentos.
   No son nombres oficiales: solo ayudan a encontrar el oficial. */
const variantes = (n) =>
  [...new Set([n.replace(/['’]/g, ""), n.replace(/['’]/g, " "), n.replace(/\./g, ""), n.replace(/\bSt\.\s*/g, "Saint "), n.replace(/\bSte\.\s*/g, "Sainte "), n.normalize("NFD").replace(/[̀-ͯ]/g, "")])].filter((v) => v !== n);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const objeto = (campos, fila_) => Object.fromEntries(campos.map((c, i) => [c, fila_[i]]));
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
function km(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
/* Nombre de la región económica en la Encuesta de Población Activa («Campbellton--Miramichi» → «Campbellton-Miramichi, New Brunswick») */
const claveEpa = (n) => `${n.replace(/--/g, "-")}, New Brunswick`;

/* Mapa: GeoJSON en metros (EPSG:3347) → trazo SVG simplificado (Douglas-Peucker, tolerancia en píxeles).
   Igual que en los demás módulos; se copia para no modificar módulos ya publicados. */
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
  const J = JSON.parse(readFileSync(join(base, "nb-localidades.json"), "utf8"));
  const censo = (v) => Object.fromEntries(J.censo_campos.map((k, i) => [k, num(v[i])]));
  const csd = J.csd.map((f) => objeto(J.csd_campos, f));
  const condadoDe = Object.fromEntries(J.condados.map(([id, n]) => [id, n]));

  /* Encuadre del mapa (metros, EPSG:3347) */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (geo, fn) => (geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates).forEach((p) => p.forEach((q) => q.forEach(([x, y]) => fn(x, y))));
  for (const g of Object.values(J.cd_geo)) recorre(g, (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))));
  const ANCHO = 560, MARGEN = 6;
  const escala = (ANCHO - 2 * MARGEN) / (x1 - x0);
  const alto = Math.ceil((y1 - y0) * escala + 2 * MARGEN);
  const a = (x, y) => [Math.round(((x - x0) * escala + MARGEN) * 10) / 10, Math.round(((y1 - y) * escala + MARGEN) * 10) / 10];
  const mapa = { ancho: ANCHO, alto, regiones: J.condados.map(([id, n, er]) => ({ r: er, n, d: trazo(J.cd_geo[id], a) })) };

  /* --- Subdivisiones censales: una página cada una --- */
  const items = [];
  for (const c of csd) {
    const t = POR_CENSO[c.tipo];
    if (!t) throw new Error(`Tipo de subdivisión censal sin clasificar: ${c.tipo} (${c.nombre})`);
    if (!condadoDe[c.cd]) throw new Error(`División censal sin condado: ${c.cd}`);
    const d = censo(c.censo);
    const [xx, yy] = a(c.x, c.y);
    items.push({
      c: c.id,
      n: c.nombre,
      censoNombre: c.nombre,
      alias: variantes(c.nombre),
      t,
      r: c.er,
      cd: c.cd,
      sup: condadoDe[c.cd],
      condado: condadoDe[c.cd],
      division: condadoDe[c.cd],
      cma: c.ca || null,
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
      actual: c.actual,
    });
  }

  /* Nombres de URL: el nombre; si se repite (p. ej., la villa y la parroquia de Rogersville), el municipio conserva
     el corto (si son dos municipios, el más poblado) y los demás llevan el tipo en inglés; si aún se repite, el condado */
  const PRIORIDAD = { municipio: 0, indigena: 1, rural: 2 };
  const porSlug = new Map();
  for (const r of items) (porSlug.get(slug(r.n)) || porSlug.set(slug(r.n), []).get(slug(r.n))).push(r);
  for (const grupo of porSlug.values()) {
    grupo.sort((m, n) => PRIORIDAD[TIPOS[m.t].grupo] - PRIORIDAD[TIPOS[n.t].grupo] || (n.p || 0) - (m.p || 0));
    grupo.forEach((r, i) => (r.s = i === 0 ? slug(r.n) : `${slug(r.n)}-${slug(TIPOS[r.t].en)}`));
  }
  const vistos = new Map();
  for (const r of items) {
    if (vistos.has(r.s)) r.s = `${r.s}-${slug(r.condado)}`;
    vistos.set(r.s, r);
  }
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error("Nombres de URL repetidos en Nuevo Brunswick");
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r || TIPOS[r.t].grupo !== "municipio") throw new Error(`Ficha completa sin municipio: ${k}`);
    r.ficha = true;
  }

  /* --- Comunidades, localidades y otros nombres geográficos (sin página propia) --- */
  const nombresCsd = new Set(csd.map((c) => norm(c.nombre)));
  const comunidades = [];
  const vistosGn = new Set();
  /* Un mismo nombre puede estar registrado con varios tipos en la misma subdivisión: se muestra una sola vez,
     con el tipo de mayor prioridad de esta lista. Las parroquias de la CGNDB ya son subdivisiones censales. */
  const PRIORIDAD_GN = ["comunidad-urbana", "suburbio", "comunidad-rural-dispersa", "villa-rural", "comunidad-rural-nombre", "localidad", "asentamiento", "nombre-municipal", "barrio", "desembarcadero", "reserva-nombre", "punto-ferroviario", "estacion", "oficina-correos", "parque-industrial"];
  const candidatos = [];
  for (const f of J.cgn) {
    const g = objeto(J.cgn_campos, f);
    if (g.tipo === "Parish") continue;
    let t = POR_GN[g.tipo];
    if (!t && ["City", "Town", "Village"].includes(g.tipo)) t = "nombre-municipal";
    if (!t) throw new Error(`Tipo de nombre geográfico sin clasificar: ${g.tipo}`);
    candidatos.push({ g, t });
  }
  candidatos.sort((x, y) => PRIORIDAD_GN.indexOf(x.t) - PRIORIDAD_GN.indexOf(y.t));
  for (const { g, t } of candidatos) {
    /* Un nombre que ya es una subdivisión censal (ciudades, pueblos, villas, reservas) no se repite */
    if ((t === "nombre-municipal" || t === "reserva-nombre") && nombresCsd.has(norm(g.nombre))) continue;
    const padre = porCodigo.get(g.csd);
    const k = `${norm(g.nombre)}|${g.csd}`;
    if (!padre || vistosGn.has(k) || norm(g.nombre) === norm(padre.n)) continue;
    vistosGn.add(k);
    const [xx, yy] = a(g.x, g.y);
    comunidades.push({ n: g.nombre, alias: variantes(g.nombre), t, m: g.csd, r: padre.r, sup: padre.sup, x: xx, y: yy, lat: g.lat, lon: g.lon, p: null, p16: null, id: `cgn-${g.id}` });
  }
  /* Ancla estable de cada lugar dentro de la página de su subdivisión (/<subdivisión>#lugar-<nombre>) */
  for (const o of comunidades) {
    const hermanos = (porCodigo.get(o.m).comunidades ||= []);
    const b = `lugar-${slug(o.n) || String(o.id).toLowerCase()}`;
    let ancla = b;
    for (let k = 2; hermanos.some((h) => h.ancla === ancla); k++) ancla = `${b}-${k}`;
    o.ancla = ancla;
    hermanos.push(o);
  }

  const hospitales = J.hospitales.map((f) => objeto(J.hospitales_campos, f));
  if (hospitales.length < 20) throw new Error("Faltan hospitales en la capa de GeoNB");

  return {
    meta: { consultado: J.consultado, consultadoWds: J.consultado_wds },
    regiones: Object.fromEntries(Object.entries(J.er).map(([k, v]) => [k, v])),
    mapa,
    items: [...items, ...comunidades],
    porCodigo,
    epa: J.epa,
    cmhc: J.cmhc,
    gobiernos: J.gobiernos,
    provincia: censo(J.provincia),
    condados: J.condados.map(([id, n, er, v]) => ({ id, n, er, ...censo(v) })),
    escuelas: J.escuelas.map((f) => objeto(J.escuelas_campos, f)),
    hospitales,
  };
}

/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales y condados); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá; Gobierno de Nuevo Brunswick (GeoNB): gobiernos locales, escuelas y hospitales",
  poblacion: "Censo 2021",
  regiones: "5 regiones económicas",
  regionEtiqueta: "Región económica",
  subregion: "Condado",
  tipoEtiqueta: "Tipo de localidad",
  ejemplo: "Shediac",
  extendido: true,
  notaFichas: "Las demás localidades tienen, por ahora, una página con información básica: clasificación oficial, condado, población del Censo 2021, gobierno local actual, empleo de su región, escuelas públicas, hospital más cercano y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const n = (g) => L.items.filter((r) => TIPOS[r.t].grupo === g).length;
    return `<p>Investiga las localidades de Nuevo Brunswick antes de decidir dónde vivir, trabajar o estudiar. El directorio reúne <strong>${miles(n("municipio") + n("rural") + n("indigena"))} subdivisiones censales</strong> del Censo 2021, que cubren toda la provincia, y <strong>${miles(n("comunidad"))} comunidades, localidades y otros nombres geográficos</strong> registrados oficialmente que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Municipios del Censo 2021</strong> (ciudades, pueblos, villas, comunidades rurales y un municipio regional): tenían su propio gobierno local en 2021.</li>
        <li><strong>Parroquias</strong>: el territorio que en 2021 no pertenecía a ningún municipio. Statistics Canada lo divide en parroquias (Parish, tipo «P»).</li>
        <li><strong>Reservas indígenas</strong>: las ${n("indigena")} reservas con su clasificación oficial en el censo. Se respetan sus nombres oficiales.</li>
        <li><strong>Comunidades, localidades y otros nombres geográficos</strong>: no son municipios; aparecen dentro de la subdivisión censal en la que están.</li>
      </ul>
      <p><strong>Importante: el mapa local cambió en 2023.</strong> Desde el 1 de enero de 2023, Nuevo Brunswick tiene ${L.gobiernos.locales} gobiernos locales y ${L.gobiernos.distritos} distritos rurales, creados por la reforma de la gobernanza local (Local Governance Act). Muchas villas y parroquias de 2021 se unieron a otras localidades. Cada página indica qué gobiernos locales o distritos rurales actuales ocupan su territorio; la población sigue siendo la del Censo 2021, la última cifra oficial por subdivisión.</p>`;
  },
  nota: () => "Statistics Canada divide Nuevo Brunswick en cinco regiones económicas formadas por condados completos: la Encuesta de Población Activa da cifras por región, no por localidad. Los condados son las divisiones censales y sirven para filtrar por zona. Las comunidades y localidades provienen de la Base de datos de nombres geográficos de Canadá y no tienen cifras de población propias. No hay un inventario oficial completo de asentamientos sin nombre registrado.",
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.nombres, esc)}; ${fuente(FUENTES.gobiernos, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
function filaCmhc(L, archivo, centro, hoja_) {
  const t = (L.cmhc[archivo] && L.cmhc[archivo].hojas[hoja_]) || [];
  return t.find((f) => f[0] === centro) || null;
}
const DIST = (n) => (n < 1.5 ? "1 km" : `${miles(Math.round(n))} km`);
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };
const ZONA = "Hora del Atlántico: UTC−4 en invierno (AST) y UTC−3 con el horario de verano (ADT), de marzo a noviembre";
const DISTRITOS = { "ASD-N": "Anglophone North", "ASD-S": "Anglophone South", "ASD-E": "Anglophone East", "ASD-W": "Anglophone West", "DSF-NE": "Francophone Nord-Est", "DSF-NO": "Francophone Nord-Ouest", "DSF-S": "Francophone Sud" };

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const grupo = tipo.grupo;
  const region = nombreRegion(L.regiones[r.r]);
  const epa = L.epa[claveEpa(L.regiones[r.r])];
  const consultado = fechaEs(L.meta.consultadoWds);
  const f = r.ficha ? FICHAS[r.s] : null;
  const denom = `${tipo.es} (${tipo.en})`;
  const nombre = r.n;

  const titulo = r.ficha ? `${nombre}, Nuevo Brunswick: guía para inmigrantes y recién llegados` : `${nombre}, Nuevo Brunswick: información básica`;
  const que = grupo === "municipio" ? "un municipio del Censo 2021" : grupo === "rural" ? "una parroquia del territorio no incorporado en el Censo 2021" : "una reserva indígena";
  const descripcion = r.ficha
    ? `${nombre} (Nuevo Brunswick) en datos: población, empleo, alquileres, escuelas, hospitales, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} del condado de ${r.condado}, Nuevo Brunswick (${tipo.es}). Clasificación oficial, población del Censo 2021, gobierno local actual y enlaces oficiales.`;

  /* --- Gobierno local actual (reforma de 2023) --- */
  const actual = (r.actual || []).map(([n, t, pct]) => ({ n, t: TIPO_ACTUAL[t] || t, pct }));
  const actualTexto = actual.length
    ? actual.length === 1
      ? `${esc(actual[0].n)} (${esc(actual[0].t)})`
      : actual.map((x) => `${esc(x.n)} (${esc(x.t)}, ${x.pct}% del territorio)`).join("; ")
    : NO_DISPONIBLE;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  const datos = [
    fila("Clasificación oficial", `${esc(denom)} <small class="cd-fact__period">Tipo de subdivisión censal en 2021: ${esc(tipo.censo)}</small>`),
    fila("Gobierno local actual", `${actualTexto} <small class="cd-fact__period">Desde el 1 de enero de 2023 (reforma de la gobernanza local)</small>`),
    fila("Condado", esc(r.condado)),
    fila("Región económica", esc(region)),
    r.cma ? fila("Área urbana del censo", `${esc(r.cma)} <small class="cd-fact__period">Área metropolitana o aglomeración censal, Censo 2021</small>`) : "",
    fila("Población", pob),
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    r.viviendas != null ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    fila("Zona horaria", ZONA),
  ].filter(Boolean).join("\n          ");

  /* --- Comunidades y lugares dentro de la subdivisión --- */
  const lista = (r.comunidades || []).slice().sort((x, y) => x.n.localeCompare(y.n, "es", { numeric: true }));
  const porTipo = {};
  for (const x of lista) (porTipo[x.t] ||= []).push(x);
  const comunidades = lista.length
    ? `<p>Dentro de ${esc(nombre)} hay ${miles(lista.length)} ${lista.length === 1 ? "lugar con nombre oficial" : "lugares con nombre oficial"} (comunidades, localidades u otros nombres geográficos). No son municipios: forman parte de ${esc(nombre)}.</p>
      ${Object.entries(porTipo)
        .map(([t, xs]) => `<h3>${esc(TIPOS[t].plural.replace(/^./, (m) => m.toUpperCase()))} (${xs.length})</h3>
      <p class="cd-loc-comunidades">${xs.map((x) => `<span class="cd-loc-lugar" id="${x.ancla}">${esc(x.n)}</span>`).join(" · ")}</p>`)
        .join("\n      ")}
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.nombres, esc)}. Cada lugar se ubicó en la subdivisión censal que contiene sus coordenadas oficiales.</p>`
    : "";

  /* --- Empleo (región económica) --- */
  const empleo = empleoRegional({ epa, nombre, nombreEpa: region, esc, consultado, fuentes: FUENTES });
  const busqueda = RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = "";
  if (f) {
    const [archivo, centro, etiqueta] = f.cmhc;
    const alquiler = filaCmhc(L, archivo, centro, "Table 1.1.2");
    const vacancia = filaCmhc(L, archivo, centro, "Table 1.1.1");
    if (alquiler && vacancia) vivienda = viviendaCmhc({ cmhc: { alquiler, vacancia }, centro: etiqueta, esc, fuenteCmhc: FUENTES.cmhc });
  }
  if (!vivienda) vivienda = `<p>${NO_DISPONIBLE}: CMHC no publica alquileres para esta localidad en su encuesta anual. Consulta Moncton, Saint John, Fredericton y las demás ciudades en la <a href="/canada-en-datos/new-brunswick#vivienda">guía de Nuevo Brunswick</a>.</p>`;
  vivienda += `\n      <p>Antes de alquilar, conoce tus derechos: en Nuevo Brunswick el alquiler no puede subir más de 3% cada 12 meses.</p>\n      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas públicas (GeoNB) --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c);
  let escuelas;
  if (escs.length) {
    const fr = escs.filter((e) => e.sector === "Francophone");
    escuelas = `<p>Según el Gobierno de Nuevo Brunswick, en ${esc(nombre)} hay ${miles(escs.length)} ${escs.length === 1 ? "escuela pública" : "escuelas públicas"}${fr.length ? `: ${miles(escs.length - fr.length)} del sector en inglés y ${miles(fr.length)} del sector en francés` : " del sector en inglés"}.</p>
      <ul class="cd-list-items">
        ${escs.slice().sort((x, y) => x.nombre.localeCompare(y.nombre, "es")).map((e) => `<li>${esc(e.nombre)} <small>(${esc(e.sector === "Francophone" ? "francés" : "inglés")}; ${esc(e.grados)}; distrito ${esc(DISTRITOS[e.distrito] || e.distrito)})</small></li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}. Confirma la escuela que corresponde a tu dirección con el distrito escolar.</p>`;
  } else {
    escuelas = `<p>El Gobierno de Nuevo Brunswick no registra escuelas públicas dentro de ${esc(nombre)}; las más cercanas pueden estar en una localidad vecina. Para inscribir a tus hijos, consulta con el distrito escolar qué escuela corresponde a tu dirección.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}.</p>`;
  }

  /* --- Salud --- */
  const hs = L.hospitales.filter((h) => h.csd === r.c);
  const hNombre = (h) => (h.nombre === h.nombre_fr ? h.nombre : `${h.nombre} / ${h.nombre_fr}`);
  let salud;
  if (hs.length) {
    salud = `<p>Hospitales en ${esc(nombre)} según el Gobierno de Nuevo Brunswick. En una emergencia, llama al 911. Para consejos de salud de enfermería las 24 horas, llama gratis al 8-1-1.</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(hNombre(h))} <small>(red ${esc(h.red)}${h.telefono ? `; ${esc(h.telefono)}` : ""})</small></li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Confirma servicios y horarios con la red de salud antes de ir.</p>`;
  } else {
    const cerca = L.hospitales.map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
    salud = `<p>No hay un hospital dentro de ${esc(nombre)}. El más cercano a su punto de referencia es <strong>${esc(hNombre(cerca.h))}</strong> (red ${esc(cerca.h.red)}), a unos ${DIST(cerca.d)} en línea recta (la distancia por carretera puede ser mayor). En una emergencia, llama al 911. Para consejos de salud de enfermería las 24 horas, llama gratis al 8-1-1.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancia calculada con las coordenadas oficiales.</p>`;
  }

  /* --- Transporte --- */
  const transporte = f && f.transporte && f.transporte.length
    ? `<p>Información oficial de transporte público:</p>${enlaces(f.transporte, esc)}`
    : `<p>Según el Gobierno de Nuevo Brunswick, hay autobuses urbanos en Moncton (Codiac Transpo, que también sirve a Dieppe y Riverview), Saint John y Fredericton. Maritime Bus es la principal línea de autobuses entre ciudades de la provincia y conecta también con Nueva Escocia e Isla del Príncipe Eduardo. Fuera de las ciudades, en general se necesita vehículo propio.</p>
      ${enlaces([MARITIME], esc)}`;

  const recien = `<p>Los servicios de asentamiento ayudan a los recién llegados con el idioma, el empleo y la integración en la comunidad. El Gobierno de Nuevo Brunswick publica la lista de organizaciones por región; cada una indica a quién puede atender y en qué idioma:</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la <a href="/canada-en-datos/new-brunswick#recien-llegado">guía de primeros pasos en Nuevo Brunswick</a>.</p>`;
  const familias = `<p>Estos son recursos provinciales y federales: se aplican en toda la provincia, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia.</p>
      ${enlaces(RECURSOS.familias, esc)}
      <p>Más información en la sección de <a href="/canada-en-datos/new-brunswick#beneficios">beneficios de la guía de Nuevo Brunswick</a>.</p>`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f && f.web ? [{ label: `Sitio oficial de ${f.nombre}`, href: f.web }] : []),
    { label: "Gobierno de Nuevo Brunswick — Gobiernos locales y distritos rurales (GeoNB)", href: FUENTES.gobiernos.url },
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, FUENTES.gobiernos, ...(lista.length ? [FUENTES.nombres] : []), ...(epa ? [FUENTES.epa, FUENTES.industrias] : []), ...(f ? [FUENTES.cmhc] : []), FUENTES.escuelas, FUENTES.hospitales, FUENTES.hora];

  const actualFrase = actual.length
    ? ` Desde la reforma del 1 de enero de 2023, su territorio corresponde a ${actual.length === 1 ? `${esc(actual[0].n)} (${esc(actual[0].t)})` : actual.map((x) => `${esc(x.n)} (${esc(x.t)}, ${x.pct}%)`).join(", ")}.`
    : "";
  const intro = {
    municipio: `${nombre} figura en el Censo 2021 como ${tipo.es === "Ciudad" ? "ciudad" : `${tipo.es.toLowerCase()} (${tipo.en})`} del condado de ${r.condado}, en Nuevo Brunswick.${typeof r.p === "number" ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : ""}${actualFrase}`,
    rural: `${nombre} es una parroquia (Parish) del condado de ${r.condado}: en el Censo 2021 era territorio no incorporado, que no pertenecía a ningún municipio.${typeof r.p === "number" ? ` En el Censo 2021 tenía ${miles(r.p)} habitantes.` : ""}${actualFrase}`,
    indigena: `${nombre} figura en el Censo 2021 de Statistics Canada como reserva indígena (Indian Reserve), en el condado de ${r.condado}. No es un municipio. Para información sobre la comunidad, consulta directamente a la Primera Nación correspondiente.`,
  }[grupo];
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la localidad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Nuevo Brunswick · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro: intro + cierre,
    datos,
    ubicacion: `Ubicación aproximada en el condado de ${esc(r.condado)}. Mapa elaborado con los límites de las divisiones censales del Censo 2021 de Statistics Canada.`,
    comunidades,
    empleo,
    busqueda,
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
    ciudad: tipo.grupo === "municipio",
  };
}

function tarjeta(r) {
  const tipo = TIPOS[r.t];
  return {
    tipo: `${tipo.es} (${tipo.en})`,
    dato: typeof r.p === "number" ? `${miles(r.p)} habitantes (Censo 2021)` : "",
  };
}

export default {
  slug: "new-brunswick",
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
