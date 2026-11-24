/*
  provincias/nova-scotia.mjs — Directorio de localidades de Nueva Escocia
  =====================================================================
  Criterio de inclusión (mismo estándar que las demás provincias):
  - Una página por cada subdivisión censal (CSD) de la provincia en el Censo
    2021 de Statistics Canada: 95 en total, que cubren toda la provincia y
    tienen un código estable de 7 dígitos:
      · 40 municipios del censo: 3 municipios regionales (Halifax, Cape
        Breton y Queens), West Hants (código «RM» del censo), 25 pueblos
        (towns) y 11 municipios de distrito (municipal districts);
      · 28 subdivisiones de los municipios de condado (Subdivision of county
        municipality, tipo «SC»): Statistics Canada divide en partes («Subd.
        A», «Subd. B»…) el territorio de los nueve municipios de condado;
      · 27 reservas indígenas.
  - Gobierno municipal actual: cada página indica qué municipios vigentes
    ocupan su territorio (límites municipales oficiales del Gobierno de Nueva
    Escocia, datos abiertos), y las villas (villages) con comisión de villa
    que hay dentro. Las villas forman parte de su municipio: no son una
    subdivisión censal.
  - Páginas de comunidad: Dartmouth y Sydney no son municipios ni
    subdivisiones censales (forman parte de los municipios regionales de
    Halifax y de Cape Breton), pero tienen ficha propia por su peso como
    centros urbanos. Sus escuelas y hospitales se ubican con los límites de
    comunidad del archivo oficial de direcciones civiles de Nueva Escocia
    (NSCAF); sus alquileres, con las zonas de CMHC.
  - Sin página propia, dentro del directorio y de la página de su CSD: los
    lugares poblados con nombre oficial de la Base de datos de nombres
    geográficos de Canadá (CGNDB, Recursos Naturales Canadá), ubicados en su
    CSD por sus coordenadas oficiales.
  - Filtros: región económica (5, formadas por condados completos) y condado
    (18 divisiones censales).
  No se promete cobertura de asentamientos sin nombre oficial registrado.

  Datos (scripts/canada-en-datos/):
    ns-localidades.json   compactar-ns.py (a partir de obtener-ns-localidades.py,
                          obtener-ns-ficha.py datos y consultar-ns-wds.py)

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";

const PROV = "Nueva Escocia";

/* ---------- Clasificación oficial ----------
   Tipos de subdivisión censal de Statistics Canada (código en `censo`) y
   tipos de nombre geográfico de la CGNDB (en `gn`). Los nombres oficiales
   se dejan en inglés junto al equivalente en español. */
export const TIPOS = {
  regional: { es: "Municipio regional", en: "Regional Municipality", grupo: "municipio", plural: "municipios regionales (regional municipalities)", censo: "RGM" },
  "regional-rm": { es: "Municipio regional", en: "Regional Municipality", grupo: "municipio", plural: "municipios regionales (regional municipalities)", censo: "RM" },
  town: { es: "Pueblo", en: "Town", grupo: "municipio", plural: "pueblos (towns)", censo: "T" },
  district: { es: "Municipio de distrito", en: "Municipal District", grupo: "municipio", plural: "municipios de distrito (municipal districts)", censo: "MD" },
  "county-subd": { es: "Subdivisión de municipio de condado", en: "Subdivision of County Municipality", grupo: "condado", plural: "subdivisiones de los municipios de condado", censo: "SC" },
  reserve: { es: "Reserva indígena", en: "Indian Reserve", grupo: "indigena", plural: "reservas indígenas (Indian reserves)", censo: "IRI" },
  "comunidad-urbana": { es: "Comunidad urbana", en: "Urban Community", grupo: "comunidad", plural: "comunidades urbanas", gn: "Urban Community" },
  comunidad: { es: "Comunidad", en: "Community", grupo: "comunidad", plural: "comunidades (communities)", gn: "Community" },
  villa: { es: "Villa (village)", en: "Village", grupo: "comunidad", plural: "villas (villages)", gn: "Village" },
  suburbio: { es: "Comunidad suburbana", en: "Suburban Community", grupo: "comunidad", plural: "comunidades suburbanas", gn: "Suburban Community" },
  "comunidad-rural-compacta": { es: "Comunidad rural compacta", en: "Compact Rural Community", grupo: "comunidad", plural: "comunidades rurales compactas", gn: "Compact Rural Community" },
  "comunidad-rural-dispersa": { es: "Comunidad rural dispersa", en: "Dispersed Rural Community", grupo: "comunidad", plural: "comunidades rurales dispersas", gn: "Dispersed Rural Community" },
  localidad: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades (localities)", gn: "Locality" },
  barrio: { es: "Barrio", en: "Neighbourhood", grupo: "comunidad", plural: "barrios (neighbourhoods)", gn: "Neighbourhood" },
  desembarcadero: { es: "Desembarcadero", en: "Landing", grupo: "comunidad", plural: "desembarcaderos (landings)", gn: "Landing" },
  "punto-ferroviario": { es: "Punto ferroviario", en: "Railway Point", grupo: "comunidad", plural: "puntos ferroviarios (railway points)", gn: "Railway Point" },
  "oficina-correos": { es: "Lugar con oficina de correos (nombre histórico)", en: "Post Office", grupo: "comunidad", plural: "lugares con nombre de oficina de correos", gn: "Post Office" },
  "reserva-nombre": { es: "Reserva indígena (nombre geográfico)", en: "Indian Reserve", grupo: "comunidad", plural: "reservas registradas como nombre geográfico", gn: "Indian Reserve" },
};
export const GRUPOS = {
  municipio: "Municipios del Censo 2021",
  condado: "Subdivisiones de los municipios de condado",
  indigena: "Reservas indígenas (clasificación del censo)",
  comunidad: "Comunidades, villas y otros nombres geográficos",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "comunidad";
const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
const POR_GN = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k]));

/* Tipos de los municipios vigentes (límites municipales del Gobierno de Nueva Escocia) */
const TIPO_ACTUAL = { "Regional Municipality": "municipio regional", Town: "pueblo", "Municipal District": "municipio de distrito", "Municipal County": "municipio de condado" };
/* Tipos de hospital de los datos abiertos del Gobierno de Nueva Escocia */
const TIPO_HOSPITAL = { Regional: "hospital regional", Community: "hospital comunitario", Tertiary: "hospital terciario (de referencia)", "Community Health Centre": "centro de salud comunitario", Rehabilitation: "rehabilitación", "Environmental Health": "atención continua", "Out Patient/ Nursing Home": "consultas externas y residencia" };
const HOSPITAL_GENERAL = new Set(["Regional", "Community", "Tertiary"]);

/* ---------- Fichas completas ----------
   Las ciudades y pueblos que pidió la dirección (Halifax, Dartmouth, Sydney,
   Truro, New Glasgow, Amherst, Bridgewater, Yarmouth y Kentville) y el
   municipio regional de Cape Breton. Alquileres: la fila de CMHC que les
   corresponde (octubre de 2025); si CMHC no publica la localidad, «Dato no
   disponible». Sitios oficiales comprobados antes de publicar. */
const MARITIME = { label: "Maritime Bus — Autobuses entre ciudades", href: "https://maritimebus.com/" };
const HALIFAX_TRANSIT = { label: "Halifax Transit — Autobuses y ferris de Halifax y Dartmouth", href: "https://www.halifax.ca/transportation/halifax-transit" };
const TRANSIT_CB = { label: "Transit Cape Breton — Autobuses del municipio regional de Cape Breton", href: "https://cbrm.ns.ca/transportation/transit-cape-breton/" };
export const FICHAS = {
  halifax: { nombre: "Halifax", web: "https://www.halifax.ca/", cmhc: ["halifax", "Halifax RGM (Zones 1-10)", "el municipio regional de Halifax (zonas 1 a 10 de CMHC)"], transporte: [HALIFAX_TRANSIT, MARITIME] },
  dartmouth: { nombre: "Dartmouth", comunidad: true, nscaf: "DARTMOUTH", padre: "halifax", web: "https://www.halifax.ca/", cmhc: ["halifax", "City of Dartmouth (Zones 5-7)", "Dartmouth (zonas 5 a 7 de CMHC)"], centro: null, transporte: [HALIFAX_TRANSIT, MARITIME] },
  "cape-breton": { nombre: "Cape Breton", web: "https://www.cbrm.ns.ca/", cmhc: ["nova-scotia", "Cape Breton CA", "la aglomeración de Cape Breton"], transporte: [TRANSIT_CB, MARITIME] },
  sydney: { nombre: "Sydney", comunidad: true, nscaf: "SYDNEY", padre: "cape-breton", web: "https://www.cbrm.ns.ca/", cmhc: ["nova-scotia", "Sydney City", "Sydney (la antigua ciudad, según CMHC)"], centro: "Cape Breton - Sydney", transporte: [TRANSIT_CB, MARITIME] },
  truro: { nombre: "Truro", web: "https://www.truro.ca/", cmhc: ["nova-scotia", "Truro CA", "la aglomeración de Truro"], transporte: [MARITIME] },
  "new-glasgow": { nombre: "New Glasgow", web: "https://www.newglasgow.ca/", cmhc: ["nova-scotia", "New Glasgow CA", "la aglomeración de New Glasgow"], transporte: [MARITIME] },
  kentville: { nombre: "Kentville", web: "https://www.kentville.ca/", cmhc: ["nova-scotia", "Kentville CA", "la aglomeración de Kentville"], transporte: [MARITIME] },
  amherst: { nombre: "Amherst", web: "https://www.amherst.ca/", cmhc: null, transporte: [MARITIME] },
  bridgewater: { nombre: "Bridgewater", web: "https://www.bridgewater.ca/", cmhc: null, transporte: [MARITIME] },
  yarmouth: { nombre: "Yarmouth", web: "https://www.townofyarmouth.ca/", cmhc: null, transporte: [MARITIME] },
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales, condados y regiones económicas", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  centros: { org: "Statistics Canada", title: "Tabla 98-10-0011-01 — Población y viviendas de los centros de población, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810001101" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Nueva Escocia", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  municipios: { org: "Gobierno de Nueva Escocia (datos abiertos)", title: "Municipality Boundaries — límites municipales vigentes", url: "https://data.novascotia.ca/d/7bqh-hssn" },
  villas: { org: "Gobierno de Nueva Escocia (datos abiertos)", title: "Village Boundaries — límites de las villas", url: "https://data.novascotia.ca/d/23hp-7dde" },
  comunidades: { org: "Gobierno de Nueva Escocia (datos abiertos)", title: "Nova Scotia Civic Address File (NSCAF) — límites de comunidad", url: "https://data.novascotia.ca/d/a89z-tinp" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0464-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046401" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0466-01 — Características del empleo por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410046601" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Gobierno de Nueva Escocia (datos abiertos)", title: "Nova Scotia Public School Contact Information — escuelas públicas", url: "https://data.novascotia.ca/d/iyap-ttn5" },
  hospitales: { org: "Gobierno de Nueva Escocia (datos abiertos)", title: "Hospitals — hospitales de Nueva Escocia", url: "https://data.novascotia.ca/d/tmfr-3h8a" },
  hora: { org: "IANA", title: "Base de datos de zonas horarias (America/Halifax): hora del Atlántico con horario de verano", url: "https://www.iana.org/time-zones" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Nueva Escocia", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Nova+Scotia" },
    { label: "Live in Nova Scotia — Encontrar empleo (Gobierno de Nueva Escocia)", href: "https://liveinnovascotia.com/finding-job" },
  ],
  escuelas: [
    { label: "Gobierno de Nueva Escocia — Ir a la escuela en Nueva Escocia", href: "https://www.ednet.ns.ca/going-school-nova-scotia" },
    { label: "Gobierno de Nueva Escocia — Centros regionales de educación y CSAP", href: "https://www.ednet.ns.ca/eecd-contacts/regional-centres-education-csap" },
  ],
  salud: [
    { label: "Gobierno de Nueva Escocia — Solicitar la tarjeta de salud (Health Card)", href: "https://www.novascotia.ca/apply-health-card" },
    { label: "Nova Scotia Health — Need a Family Practice Registry (lista de espera)", href: "https://needafamilypractice.nshealth.ca/" },
    { label: "Nova Scotia Health — Encuentra el servicio de urgencias más cercano", href: "https://www.nshealth.ca/emergency-care/find-nearest-emergency-care" },
  ],
  recienLlegados: [
    { label: "Live in Nova Scotia — Servicios de asentamiento (Gobierno de Nueva Escocia)", href: "https://liveinnovascotia.com/settlement-services" },
    { label: "ISANS — Immigrant Services Association of Nova Scotia", href: "https://www.isans.ca/" },
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
  ],
  familias: [
    { label: "CRA — Beneficios de la Provincia de Nueva Escocia", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/province-nova-scotia.html" },
    { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
  ],
  vivienda: [
    { label: "Gobierno de Nueva Escocia — Arrendamientos residenciales: inquilinos y propietarios", href: "https://novascotia.ca/residential-tenancies-tenants-and-landlords/" },
  ],
};

/* ---------- Utilidades ---------- */
/* Variantes de escritura para el buscador: sin apóstrofo, sin punto, con «Saint» y sin acentos.
   No son nombres oficiales: solo ayudan a encontrar el oficial. */
const variantes = (n) =>
  [...new Set([n.replace(/['’]/g, ""), n.replace(/['’]/g, " "), n.replace(/\./g, ""), n.replace(/\bSt\.\s*/g, "Saint "), n.replace(/\bSubd\.\s*/g, "Subdivision "), n.normalize("NFD").replace(/[̀-ͯ]/g, "")])].filter((v) => v !== n);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const objeto = (campos, fila_) => Object.fromEntries(campos.map((c, i) => [c, fila_[i]]));
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
function km(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
/* Nombre de la región económica en la Encuesta de Población Activa («North Shore / Côte-nord» → «North Shore, Nova Scotia») */
const claveEpa = (n) => `${n.split(" / ")[0]}, Nova Scotia`;

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
  const J = JSON.parse(readFileSync(join(base, "ns-localidades.json"), "utf8"));
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
      villas: c.villas || [],
    });
  }

  /* Nombres de URL: el nombre; si se repite (p. ej., el pueblo y el municipio de distrito de Yarmouth), el pueblo
     conserva el corto y los demás llevan el tipo en inglés; si aún se repite, el condado */
  const PRIORIDAD = { town: 0, regional: 1, "regional-rm": 1, district: 2, "county-subd": 3, reserve: 4 };
  const porSlug = new Map();
  for (const r of items) (porSlug.get(slug(r.n)) || porSlug.set(slug(r.n), []).get(slug(r.n))).push(r);
  for (const grupo of porSlug.values()) {
    grupo.sort((m, n) => PRIORIDAD[m.t] - PRIORIDAD[n.t] || (n.p || 0) - (m.p || 0));
    /* Mismo nombre y mismo tipo (las dos partes de la reserva Bear River (Part) 6): el condado distingue las URL */
    const mismoTipo = grupo.length > 1 && grupo.every((r) => r.t === grupo[0].t);
    grupo.forEach((r, i) => (r.s = mismoTipo ? `${slug(r.n)}-${slug(r.condado)}` : i === 0 ? slug(r.n) : `${slug(r.n)}-${slug(TIPOS[r.t].en)}`));
  }
  const vistos = new Map();
  for (const r of items) {
    if (vistos.has(r.s)) r.s = `${r.s}-${slug(r.condado)}`;
    vistos.set(r.s, r);
  }
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error("Nombres de URL repetidos en Nueva Escocia");
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const [k, f] of Object.entries(FICHAS)) {
    if (f.comunidad) continue;
    const r = items.find((x) => x.s === k);
    if (!r || TIPOS[r.t].grupo !== "municipio") throw new Error(`Ficha completa sin municipio: ${k}`);
    r.ficha = true;
  }

  /* --- Comunidades, villas y otros nombres geográficos (sin página propia, salvo Dartmouth y Sydney) --- */
  const nombresCsd = new Set(csd.map((c) => norm(c.nombre)));
  const comunidades = [];
  const vistosGn = new Set();
  /* Un mismo nombre puede estar registrado con varios tipos en la misma subdivisión: se muestra una sola vez,
     con el tipo de mayor prioridad de esta lista. */
  const PRIORIDAD_GN = ["villa", "comunidad-urbana", "suburbio", "comunidad", "comunidad-rural-compacta", "comunidad-rural-dispersa", "localidad", "barrio", "desembarcadero", "reserva-nombre", "punto-ferroviario", "oficina-correos"];
  const candidatos = [];
  for (const f of J.cgn) {
    const g = objeto(J.cgn_campos, f);
    let t = POR_GN[g.tipo];
    if (g.tipo === "Town") continue; /* los pueblos ya son subdivisiones censales */
    if (!t) throw new Error(`Tipo de nombre geográfico sin clasificar: ${g.tipo}`);
    candidatos.push({ g, t });
  }
  candidatos.sort((x, y) => PRIORIDAD_GN.indexOf(x.t) - PRIORIDAD_GN.indexOf(y.t));
  for (const { g, t } of candidatos) {
    /* Una reserva que ya es una subdivisión censal no se repite */
    if (t === "reserva-nombre" && nombresCsd.has(norm(g.nombre))) continue;
    const padre = porCodigo.get(g.csd);
    const k = `${norm(g.nombre)}|${g.csd}`;
    if (!padre || vistosGn.has(k) || norm(g.nombre) === norm(padre.n)) continue;
    vistosGn.add(k);
    const [xx, yy] = a(g.x, g.y);
    const o = { n: g.nombre, alias: variantes(g.nombre), t, m: g.csd, r: padre.r, sup: padre.sup, condado: padre.condado, division: padre.division, x: xx, y: yy, lat: g.lat, lon: g.lon, p: null, p16: null, id: `cgn-${g.id}` };
    /* Dartmouth y Sydney: página propia */
    const ficha = Object.entries(FICHAS).find(([, f]) => f.comunidad && f.nombre === g.nombre && porCodigo.get(g.csd) && porCodigo.get(g.csd).s === f.padre);
    if (ficha) {
      if (comunidades.some((x) => x.s === ficha[0])) throw new Error(`Comunidad con ficha repetida: ${g.nombre}`);
      o.s = ficha[0];
      o.ficha = true;
      o.cma = padre.cma;
      o.padre = padre;
    }
    comunidades.push(o);
  }
  for (const [k, f] of Object.entries(FICHAS)) if (f.comunidad && !comunidades.some((x) => x.s === k)) throw new Error(`Falta la comunidad con ficha: ${k}`);
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
  if (hospitales.length < 30) throw new Error("Faltan hospitales en los datos abiertos de Nueva Escocia");

  return {
    meta: { consultado: J.consultado, consultadoWds: J.consultado_wds, municipios: J.municipios_meta },
    regiones: Object.fromEntries(Object.entries(J.er).map(([k, v]) => [k, v.split(" / ")[0]])),
    erOficial: J.er,
    mapa,
    items: [...items, ...comunidades],
    porCodigo,
    epa: J.epa,
    cmhc: J.cmhc,
    centros: J.centros,
    municipios: J.municipios,
    provincia: censo(J.provincia),
    condados: J.condados.map(([id, n, er, v]) => ({ id, n, er, ...censo(v) })),
    escuelas: J.escuelas.map((f) => objeto(J.escuelas_campos, f)),
    hospitales,
  };
}

/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales y condados); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá; Gobierno de Nueva Escocia (datos abiertos): límites municipales, villas, comunidades, escuelas y hospitales",
  poblacion: "Censo 2021",
  regiones: "5 regiones económicas",
  regionEtiqueta: "Región económica",
  subregion: "Condado",
  tipoEtiqueta: "Tipo de localidad",
  ejemplo: "Wolfville",
  extendido: true,
  notaFichas: "Las demás localidades tienen, por ahora, una página con información básica: clasificación oficial, condado, población del Censo 2021, municipio actual, empleo de su región, escuelas públicas, hospital más cercano y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const n = (g) => L.items.filter((r) => TIPOS[r.t].grupo === g).length;
    const m = L.municipios;
    const t = m.tipos;
    const resumen = `${t["Regional Municipality"]} municipios regionales, ${t.Town} pueblos (towns), ${t["Municipal District"]} municipios de distrito y ${t["Municipal County"]} municipios de condado`;
    return `<p>Investiga las localidades de Nueva Escocia antes de decidir dónde vivir, trabajar o estudiar. El directorio reúne <strong>${miles(n("municipio") + n("condado") + n("indigena"))} subdivisiones censales</strong> del Censo 2021, que cubren toda la provincia, y <strong>${miles(n("comunidad"))} comunidades, villas y otros nombres geográficos</strong> registrados oficialmente que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Municipios del Censo 2021</strong>: municipios regionales (como Halifax y Cape Breton), pueblos (towns) y municipios de distrito (municipal districts).</li>
        <li><strong>Subdivisiones de los municipios de condado</strong>: Statistics Canada divide el territorio de los nueve municipios de condado en partes («Subd. A», «Subd. B»…). Cada página indica a qué municipio de condado pertenece.</li>
        <li><strong>Reservas indígenas</strong>: las ${n("indigena")} reservas con su clasificación oficial en el censo. Se respetan sus nombres oficiales.</li>
        <li><strong>Comunidades, villas y otros nombres geográficos</strong>: no son municipios; aparecen dentro de la subdivisión censal en la que están. Dartmouth, en Halifax, y Sydney, en Cape Breton, tienen además su propia ficha.</li>
      </ul>
      <p>Según los límites municipales oficiales del Gobierno de Nueva Escocia, la provincia tiene hoy ${miles(m.total)} municipios: ${resumen}. Las ${m.villas} villas (villages) tienen una comisión de villa, pero forman parte del municipio que las rodea.</p>`;
  },
  nota: () => "Statistics Canada divide Nueva Escocia en cinco regiones económicas formadas por condados completos: la Encuesta de Población Activa da cifras por región, no por localidad. Los condados son las divisiones censales y sirven para filtrar por zona. Las comunidades y localidades provienen de la Base de datos de nombres geográficos de Canadá y no tienen cifras de población propias. No hay un inventario oficial completo de asentamientos sin nombre registrado.",
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.nombres, esc)}; ${fuente(FUENTES.municipios, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
function filaCmhc(L, archivo, centro, hoja_) {
  const t = (L.cmhc[archivo] && L.cmhc[archivo].hojas[hoja_]) || [];
  return t.find((f) => f[0] === centro) || null;
}
const DIST = (n) => (n < 1.5 ? "1 km" : `${miles(Math.round(n))} km`);
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };
const ZONA = "Hora del Atlántico: UTC−4 en invierno (AST) y UTC−3 con el horario de verano (ADT), de marzo a noviembre";

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const grupo = tipo.grupo;
  const esComunidad = grupo === "comunidad";
  const padre = esComunidad ? r.padre : null;
  const base = padre || r;
  const region = nombreRegion(L.regiones[r.r]);
  const epa = L.epa[claveEpa(L.erOficial[r.r])];
  const consultado = fechaEs(L.meta.consultadoWds);
  const f = r.ficha ? FICHAS[r.s] : null;
  const denom = `${tipo.es} (${tipo.en})`;
  const nombre = r.n;

  const titulo = r.ficha ? `${nombre}, Nueva Escocia: guía para inmigrantes y recién llegados` : `${nombre}, Nueva Escocia: información básica`;
  const que = { municipio: "un municipio del Censo 2021", condado: "una subdivisión de un municipio de condado en el Censo 2021", indigena: "una reserva indígena" }[grupo];
  const descripcion = r.ficha
    ? `${nombre} (Nueva Escocia) en datos: población, empleo, alquileres, escuelas, hospitales, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} del condado de ${r.condado}, Nueva Escocia (${tipo.es}). Clasificación oficial, población del Censo 2021, municipio actual y enlaces oficiales.`;

  /* --- Municipio actual (límites oficiales del Gobierno de Nueva Escocia) --- */
  const actual = (base.actual || []).map(([n, t, pct]) => ({ n, t: TIPO_ACTUAL[t] || t, pct }));
  const actualTexto = grupo === "indigena"
    ? `No corresponde <small class="cd-fact__period">Las reservas indígenas no forman parte de ningún municipio</small>`
    : actual.length
    ? actual.length === 1
      ? `${esc(actual[0].n)} (${esc(actual[0].t)})`
      : actual.map((x) => `${esc(x.n)} (${esc(x.t)}, ${x.pct}% del territorio)`).join("; ")
    : NO_DISPONIBLE;
  const villas = (base.villas || []).slice().sort((x, y) => x.localeCompare(y, "es"));

  /* --- Datos rápidos --- */
  let pob;
  if (esComunidad) {
    const c = f && f.centro ? (L.centros.datos || {})[f.centro] : null;
    pob = c && typeof c.p === "number"
      ? `${miles(c.p)} <small class="cd-fact__period">Centro de población «${esc(f.centro)}», Censo 2021${c.p16 != null ? `; Censo 2016: ${miles(c.p16)}` : ""}. Statistics Canada no publica una cifra solo de la comunidad.</small>`
      : `${NO_DISPONIBLE} <small class="cd-fact__period">${esc(nombre)} no es una subdivisión censal ni un centro de población propio en el Censo 2021: su población forma parte de la del municipio regional de ${esc(padre.n)}${f && f.nombre === "Dartmouth" ? " y de la del centro de población de Halifax" : ""}.</small>`;
  } else {
    pob = typeof r.p === "number"
      ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
      : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  }
  const datos = [
    fila("Clasificación oficial", esComunidad ? `${esc(denom)} <small class="cd-fact__period">Nombre geográfico oficial (CGNDB). Forma parte de ${esc(padre.n)}, ${esc(TIPOS[padre.t].es.toLowerCase())}.</small>` : `${esc(denom)} <small class="cd-fact__period">Tipo de subdivisión censal en 2021: ${esc(tipo.censo)}</small>`),
    fila("Municipio actual", grupo === "indigena" ? actualTexto : `${actualTexto} <small class="cd-fact__period">Límites municipales del Gobierno de Nueva Escocia</small>`),
    villas.length ? fila(villas.length === 1 ? "Villa dentro de su territorio" : "Villas dentro de su territorio", `${villas.map(esc).join(", ")} <small class="cd-fact__period">Con comisión de villa; forman parte del municipio</small>`) : "",
    fila("Condado", esc(r.condado)),
    fila("Región económica", esc(region)),
    r.cma ? fila("Área urbana del censo", `${esc(r.cma)} <small class="cd-fact__period">Área metropolitana o aglomeración censal, Censo 2021</small>`) : "",
    fila("Población", pob),
    !esComunidad && r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    !esComunidad && r.viviendas != null ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">${esComunidad ? "Coordenadas oficiales del nombre geográfico" : "Punto de referencia dentro de la subdivisión censal"}</small>`),
    fila("Zona horaria", ZONA),
  ].filter(Boolean).join("\n          ");

  /* --- Comunidades y lugares dentro de la subdivisión --- */
  const lista = esComunidad ? [] : (r.comunidades || []).slice().sort((x, y) => x.n.localeCompare(y.n, "es", { numeric: true }));
  const porTipo = {};
  for (const x of lista) (porTipo[x.t] ||= []).push(x);
  const conFicha = lista.filter((x) => x.ficha);
  const comunidades = lista.length
    ? `<p>Dentro de ${esc(nombre)} hay ${miles(lista.length)} ${lista.length === 1 ? "lugar con nombre oficial" : "lugares con nombre oficial"} (comunidades, villas, localidades u otros nombres geográficos). No son municipios: forman parte de ${esc(nombre)}.${conFicha.length ? ` ${conFicha.map((x) => `<a href="/canada-en-datos/nova-scotia/${x.s}">${esc(x.n)}</a>`).join(" y ")} ${conFicha.length === 1 ? "tiene" : "tienen"} su propia ficha.` : ""}</p>
      ${Object.entries(porTipo)
        .map(([t, xs]) => `<h3>${esc(TIPOS[t].plural.replace(/^./, (m) => m.toUpperCase()))} (${xs.length})</h3>
      <p class="cd-loc-comunidades">${xs.map((x) => `<span class="cd-loc-lugar" id="${x.ancla}">${x.ficha ? `<a href="/canada-en-datos/nova-scotia/${x.s}">${esc(x.n)}</a>` : esc(x.n)}</span>`).join(" · ")}</p>`)
        .join("\n      ")}
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.nombres, esc)}. Cada lugar se ubicó en la subdivisión censal que contiene sus coordenadas oficiales.</p>`
    : "";

  /* --- Empleo (región económica) --- */
  const empleo = empleoRegional({ epa, nombre, nombreEpa: region, esc, consultado, fuentes: FUENTES });
  const busqueda = RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = "";
  if (f && f.cmhc) {
    const [archivo, centro, etiqueta] = f.cmhc;
    const alquiler = filaCmhc(L, archivo, centro, "Table 1.1.2");
    const vacancia = filaCmhc(L, archivo, centro, "Table 1.1.1");
    if (alquiler && vacancia) vivienda = viviendaCmhc({ cmhc: { alquiler, vacancia }, centro: etiqueta, esc, fuenteCmhc: FUENTES.cmhc });
  }
  if (!vivienda) vivienda = `<p>${NO_DISPONIBLE}: CMHC no publica alquileres para esta localidad en su encuesta anual. Consulta Halifax, Dartmouth, Sydney, Truro y las demás ciudades en la <a href="/canada-en-datos/nova-scotia#vivienda">guía de Nueva Escocia</a>.</p>`;
  vivienda += `\n      <p>Antes de alquilar, conoce tus derechos: el Gobierno de Nueva Escocia limita por ley los aumentos de alquiler de las viviendas existentes; consulta el tope vigente en la <a href="/canada-en-datos/nova-scotia#vivienda">guía de Nueva Escocia</a>.</p>\n      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas públicas (datos abiertos del Gobierno de Nueva Escocia) --- */
  const escs = esComunidad ? L.escuelas.filter((e) => e.comunidad === f.nscaf) : L.escuelas.filter((e) => e.csd === r.c);
  let escuelas;
  if (escs.length) {
    const fr = escs.filter((e) => /CSAP|acadien/i.test(e.centro));
    escuelas = `<p>Según el Gobierno de Nueva Escocia, en ${esc(nombre)} hay ${miles(escs.length)} ${escs.length === 1 ? "escuela pública" : "escuelas públicas"}${fr.length ? `, ${miles(fr.length)} de ellas del Conseil scolaire acadien provincial (CSAP), en francés` : ""}.</p>
      <ul class="cd-list-items">
        ${escs.slice().sort((x, y) => x.nombre.localeCompare(y.nombre, "es")).map((e) => `<li>${esc(e.nombre)} <small>(${e.localidad ? `${esc(e.localidad)}; ` : ""}${esc(e.centro)})</small></li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}. ${esComunidad ? "Cada escuela se ubicó dentro de los límites oficiales de la comunidad. " : ""}Confirma la escuela que corresponde a tu dirección con el centro regional de educación.</p>`;
  } else {
    escuelas = `<p>El Gobierno de Nueva Escocia no registra escuelas públicas dentro de ${esc(nombre)}; las más cercanas pueden estar en una localidad vecina. Para inscribir a tus hijos, consulta con el centro regional de educación qué escuela corresponde a tu dirección.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}.</p>`;
  }

  /* --- Salud --- */
  /* Comunidades con ficha: hospitales dentro de sus límites (NSCAF) o con la comunidad como localidad en su dirección oficial */
  const hs = esComunidad ? L.hospitales.filter((h) => h.comunidad === f.nscaf || h.ciudad === nombre) : L.hospitales.filter((h) => h.csd === r.c);
  let salud;
  if (hs.length) {
    salud = `<p>Hospitales en ${esc(nombre)} según el Gobierno de Nueva Escocia. En una emergencia, llama al 911. Para consejos de salud de enfermería las 24 horas, llama gratis al 8-1-1.</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(h.nombre)}${h.tipo ? ` <small>(${esc(TIPO_HOSPITAL[h.tipo] || h.tipo)})</small>` : ""}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Confirma servicios y horarios de urgencias con Nova Scotia Health antes de ir: algunos servicios de urgencias cierran temporalmente.</p>`;
  } else {
    const cerca = L.hospitales.filter((h) => HOSPITAL_GENERAL.has(h.tipo)).map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
    salud = `<p>No hay un hospital dentro de ${esc(nombre)}. El hospital más cercano a su punto de referencia es <strong>${esc(cerca.h.nombre)}</strong>${cerca.h.ciudad ? `, en ${esc(cerca.h.ciudad)}` : ""} (${esc(TIPO_HOSPITAL[cerca.h.tipo])}), a unos ${DIST(cerca.d)} en línea recta (la distancia por carretera puede ser mayor). En una emergencia, llama al 911. Para consejos de salud de enfermería las 24 horas, llama gratis al 8-1-1.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancia calculada con las coordenadas oficiales.</p>`;
  }

  /* --- Transporte --- */
  const transporte = f && f.transporte && f.transporte.length
    ? `<p>Información oficial de transporte público:</p>${enlaces(f.transporte, esc)}`
    : `<p>Halifax Transit da servicio de autobuses y ferris en el municipio regional de Halifax, incluido Dartmouth, y Transit Cape Breton, en el municipio regional de Cape Breton. Maritime Bus es la principal línea de autobuses entre ciudades de la provincia y conecta también con Nuevo Brunswick e Isla del Príncipe Eduardo. Fuera de las ciudades, en general se necesita vehículo propio.</p>
      ${enlaces([MARITIME], esc)}`;

  const recien = `<p>Los servicios de asentamiento ayudan a los recién llegados con el idioma, el empleo y la integración en la comunidad. El Gobierno de Nueva Escocia publica la lista de organizaciones; cada una indica a quién puede atender:</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la <a href="/canada-en-datos/nova-scotia#recien-llegado">guía de primeros pasos en Nueva Escocia</a>.</p>`;
  const familias = `<p>Estos son recursos provinciales y federales: se aplican en toda la provincia, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia.</p>
      ${enlaces(RECURSOS.familias, esc)}
      <p>Más información en la sección de <a href="/canada-en-datos/nova-scotia#beneficios">beneficios de la guía de Nueva Escocia</a>.</p>`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${base.c}`;
  const oficiales = [
    ...(f && f.web ? [{ label: f.comunidad ? `Sitio oficial del municipio regional de ${padre.n}` : `Sitio oficial de ${f.nombre}`, href: f.web }] : []),
    { label: "Gobierno de Nueva Escocia — Límites municipales (datos abiertos)", href: FUENTES.municipios.url },
    { label: `Statistics Canada — Perfil del Censo 2021 de ${base.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, ...(esComunidad && f.centro ? [FUENTES.centros] : []), FUENTES.municipios, ...(villas.length ? [FUENTES.villas] : []), ...(esComunidad ? [FUENTES.comunidades] : []), ...(lista.length || esComunidad ? [FUENTES.nombres] : []), ...(epa ? [FUENTES.epa, FUENTES.industrias] : []), ...(f && f.cmhc ? [FUENTES.cmhc] : []), FUENTES.escuelas, FUENTES.hospitales, FUENTES.hora];

  const actualFrase = actual.length
    ? ` Según los límites municipales del Gobierno de Nueva Escocia, su territorio corresponde a ${actual.length === 1 ? `${esc(actual[0].n)} (${esc(actual[0].t)})` : actual.map((x) => `${esc(x.n)} (${esc(x.t)}, ${x.pct}%)`).join(", ")}.`
    : "";
  const intro = {
    municipio: () => `${nombre} figura en el Censo 2021 como ${tipo.es.toLowerCase()} (${tipo.en}) del condado de ${r.condado}, en Nueva Escocia.${typeof r.p === "number" ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : ""}${actualFrase}`,
    condado: () => `${nombre} es una de las partes en que Statistics Canada divide el territorio de un municipio de condado (Subdivision of County Municipality), en el condado de ${r.condado}. No es un municipio por sí misma.${typeof r.p === "number" ? ` En el Censo 2021 tenía ${miles(r.p)} habitantes.` : ""}${actualFrase}`,
    indigena: () => `${nombre} figura en el Censo 2021 de Statistics Canada como reserva indígena (Indian Reserve), en el condado de ${r.condado}. No es un municipio. Para información sobre la comunidad, consulta directamente a la Primera Nación correspondiente.`,
    comunidad: () => `${nombre} es una comunidad de Nueva Escocia que forma parte de ${padre.n}, ${TIPOS[padre.t].es.toLowerCase()} del condado de ${r.condado}. No es un municipio ni una subdivisión censal: su gobierno local es el municipio regional.`,
  }[grupo]();
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la localidad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Nueva Escocia · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
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
    ciudad: grupo === "municipio" || !!r.ficha,
  };
}

function tarjeta(r, L) {
  const tipo = TIPOS[r.t];
  let dato = typeof r.p === "number" ? `${miles(r.p)} habitantes (Censo 2021)` : "";
  if (r.ficha && TIPOS[r.t].grupo === "comunidad") dato = `Comunidad de ${r.padre.n}`;
  return { tipo: `${tipo.es} (${tipo.en})`, dato };
}

export default {
  slug: "nova-scotia",
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
