/*
  provincias/ontario.mjs — Directorio de localidades de Ontario
  ======================================================================
  Criterio de inclusión (documentado en el repositorio interno):
  una página por cada municipio local de Ontario, es decir, los 414
  municipios de nivel único (single-tier) y de nivel inferior
  (lower-tier) de la lista oficial del Ministerio de Asuntos Municipales
  y Vivienda. Los 30 municipios de nivel superior (condados y regiones)
  y los distritos del norte no tienen página propia: aparecen como «área
  geográfica» de cada municipio. Las reservas de las Primeras Naciones y
  los territorios no organizados no son municipios y no se incluyen.

  Fuentes ya descargadas (scripts/canada-en-datos/obtener-ontario-*.py):
    ontario-fuentes.json       lista de municipios, límites (LIO), Censo
                               2021, Encuesta de Población Activa y CMHC
    ontario-complementos.json  escuelas (SIF 2024-2025) y SGC 2021
    ontario-complementos2.json hospitales (MOH Service Location)
    ontario-er-cd.json         división censal → región económica
                               (variante SGC 2021)
    ontario-enlaces.json       enlaces de las listas oficiales que ya no
                               responden: reemplazo verificado o retiro

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";

/* ---------- Clasificación oficial ----------
   El estatus oficial es el nivel (single-tier o lower-tier). La palabra
   del nombre (City, Town, Township…) no determina el estatus, según el
   propio Gobierno de Ontario; se muestra como «denominación». */
const DENOM = {
  city: ["Ciudad", "City", "ciudades"],
  town: ["Pueblo", "Town", "pueblos (towns)"],
  township: ["Cantón", "Township", "cantones (townships)"],
  municipality: ["Municipio", "Municipality", "municipios (municipalities)"],
  village: ["Villa", "Village", "villas (villages)"],
  county: ["Condado", "County", "condados"],
};
const NIVELES = { unico: "Municipios de nivel único (single-tier)", inferior: "Municipios de nivel inferior (lower-tier)" };
export const TIPOS = Object.fromEntries(
  Object.keys(NIVELES).flatMap((nivel) =>
    Object.entries(DENOM).map(([k, [es, en, plural]]) => [`${nivel}-${k}`, { es, en, grupo: nivel, plural, denominacion: k }]),
  ),
);
export const GRUPOS = NIVELES;
const PREFIJO = /^(?:the )?(city|town|township|municipality|village|county) of$|^municipality$/i;

/* Fichas completas: las ciudades más pobladas y los principales destinos
   de recién llegados. Enlaces de transporte verificados el 24 de octubre
   de 2026 (consultar-ontario.mjs, ronda 3). */
export const FICHAS = {
  toronto: { nombre: "Toronto", comunidades: ["Toronto", "Scarborough", "North York", "Etobicoke", "East York", "York"], cmhc: ["toronto", "City of Toronto (Zones 1-17)", "la ciudad de Toronto (zonas 1 a 17 de CMHC)"], transporte: [{ label: "TTC — Toronto Transit Commission", href: "https://www.ttc.ca/" }, { label: "GO Transit — Trenes y autobuses regionales (Metrolinx)", href: "https://www.gotransit.com/" }] },
  ottawa: { nombre: "Ottawa", comunidades: ["Ottawa", "Nepean", "Kanata", "Orléans", "Orleans", "Gloucester", "Stittsville", "Vanier"], cmhc: ["ottawa", "Ottawa CMA", "el área metropolitana de Ottawa (parte de Ontario)"], transporte: [{ label: "OC Transpo — Transporte público de Ottawa", href: "https://www.octranspo.com/" }] },
  hamilton: { nombre: "Hamilton", comunidades: ["Hamilton", "Ancaster", "Stoney Creek", "Dundas", "Waterdown"], cmhc: ["hamilton", "Hamilton City (Zones 1-6)", "la ciudad de Hamilton (zonas 1 a 6 de CMHC)"], transporte: [{ label: "HSR — Transporte público de Hamilton", href: "https://www.hamilton.ca/home-neighbourhood/hsr" }, { label: "GO Transit — Trenes y autobuses regionales (Metrolinx)", href: "https://www.gotransit.com/" }] },
  london: { nombre: "London", comunidades: ["London"], cmhc: ["london", "London City (Zones 1-8)", "la ciudad de London (zonas 1 a 8 de CMHC)"], transporte: [{ label: "London Transit Commission", href: "https://www.londontransit.ca/" }] },
  kitchener: { nombre: "Kitchener", comunidades: ["Kitchener"], cmhc: ["kitchener-cambridge-waterloo", "Kitchener City (Zones 1-3)", "la ciudad de Kitchener (zonas 1 a 3 de CMHC)"], transporte: [{ label: "Grand River Transit (Región de Waterloo)", href: "https://www.grt.ca/" }] },
  waterloo: { nombre: "Waterloo", comunidades: ["Waterloo"], cmhc: ["kitchener-cambridge-waterloo", "Zone 4 - Waterloo", "la zona 4 de CMHC (Waterloo)"], transporte: [{ label: "Grand River Transit (Región de Waterloo)", href: "https://www.grt.ca/" }] },
  mississauga: { nombre: "Mississauga", comunidades: ["Mississauga"], cmhc: ["toronto", "Mississauga City (Zones 18-20)", "la ciudad de Mississauga (zonas 18 a 20 de CMHC)"], transporte: [{ label: "MiWay — Transporte público de Mississauga", href: "https://www.mississauga.ca/miway-transit/" }, { label: "GO Transit — Trenes y autobuses regionales (Metrolinx)", href: "https://www.gotransit.com/" }] },
  brampton: { nombre: "Brampton", comunidades: ["Brampton"], cmhc: ["toronto", "Brampton City (Zones 21-22)", "la ciudad de Brampton (zonas 21 y 22 de CMHC)"], transporte: [{ label: "Brampton Transit", href: "https://www.brampton.ca/EN/residents/transit/Pages/Welcome.aspx" }, { label: "GO Transit — Trenes y autobuses regionales (Metrolinx)", href: "https://www.gotransit.com/" }] },
  windsor: { nombre: "Windsor", comunidades: ["Windsor"], cmhc: ["windsor", "Windsor City (Zones 1-4)", "la ciudad de Windsor (zonas 1 a 4 de CMHC)"], transporte: [{ label: "Transit Windsor", href: "https://www.citywindsor.ca/residents/transit-windsor" }] },
  "greater-sudbury": { nombre: "Greater Sudbury", comunidades: ["Sudbury"], cmhc: ["greater-sudbury", "Greater Sudbury / Grand Sudbury CMA", "el área metropolitana de Greater Sudbury"], transporte: null },
  kingston: { nombre: "Kingston", comunidades: ["Kingston"], cmhc: ["kingston", "Kingston CMA", "el área metropolitana de Kingston"], transporte: [{ label: "Kingston Transit", href: "https://www.kingstontransit.ca/" }] },
  "thunder-bay": { nombre: "Thunder Bay", comunidades: ["Thunder Bay"], cmhc: ["thunder-bay", "Thunder Bay CMA", "el área metropolitana de Thunder Bay"], transporte: [{ label: "Thunder Bay Transit", href: "https://www.thunderbay.ca/city-services/transit/" }] },
  guelph: { nombre: "Guelph", comunidades: ["Guelph"], cmhc: ["guelph", "Guelph CMA", "el área metropolitana de Guelph"], transporte: null },
  barrie: { nombre: "Barrie", comunidades: ["Barrie"], cmhc: ["barrie", "Barrie CMA", "el área metropolitana de Barrie"], transporte: [{ label: "Barrie Transit", href: "https://www.barrie.ca/services-payments/transportation-parking/barrie-transit" }] },
  oshawa: { nombre: "Oshawa", comunidades: ["Oshawa"], cmhc: ["oshawa", "Oshawa City (Zones 1-2)", "la ciudad de Oshawa (zonas 1 y 2 de CMHC)"], transporte: [{ label: "Durham Region Transit", href: "https://www.durhamregiontransit.com/" }, { label: "GO Transit — Trenes y autobuses regionales (Metrolinx)", href: "https://www.gotransit.com/" }] },
  "st-catharines": { nombre: "St. Catharines", comunidades: ["St. Catharines", "St Catharines"], cmhc: ["st-catharines-niagara", "St. Catharines (Zones 1-3)", "la ciudad de St. Catharines (zonas 1 a 3 de CMHC)"], transporte: [{ label: "Niagara Region Transit", href: "https://nrtransit.ca/" }] },
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  municipios: { org: "Gobierno de Ontario (Ministerio de Asuntos Municipales y Vivienda)", title: "Municipalities — Ontario Data Catalogue (lista de los 444 municipios, 26 de mayo de 2026)", url: "https://data.ontario.ca/dataset/municipalities" },
  lista: { org: "Gobierno de Ontario", title: "List of Ontario municipalities", url: "https://www.ontario.ca/page/list-ontario-municipalities" },
  limites: { org: "Gobierno de Ontario (Land Information Ontario)", title: "Municipal boundaries — lower and single tier; upper tier and district", url: "https://data.ontario.ca/dataset/municipal-boundaries" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  er: { org: "Statistics Canada", title: "Variant of SGC 2021 for Economic Regions", url: "https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/er-additionalinfo" },
  lugares: { org: "Statistics Canada", title: "Standard Geographical Classification (SGC) 2021 — nombres de lugares", url: "https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/index" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0393-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039301" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0392-01 — Empleo por industria y región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039201" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Gobierno de Ontario (Ministerio de Educación)", title: "School information and student demographics, 2024-2025", url: "https://data.ontario.ca/dataset/school-information-and-student-demographics" },
  salud: { org: "Gobierno de Ontario (Ministerio de Salud), Land Information Ontario", title: "Ministry of Health Service Provider Locations (MOH Service Location)", url: "https://data.ontario.ca/dataset/ministry-of-health-service-provider-locations-mohserlo" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Ontario", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Ontario" },
    { label: "Gobierno de Ontario — Employment Ontario (ayuda gratuita para buscar empleo)", href: "https://www.ontario.ca/page/employment-ontario" },
  ],
  escuelas: [
    { label: "Gobierno de Ontario — Guía del sistema escolar para padres", href: "https://www.ontario.ca/page/your-childs-education-parent-guide-our-school-system" },
    { label: "Gobierno de Ontario — Información de las escuelas (datos abiertos)", href: "https://data.ontario.ca/dataset/school-information-and-student-demographics" },
  ],
  salud: [
    { label: "Health811 — Consejos de salud las 24 horas", href: "https://health811.ontario.ca/" },
    { label: "Gobierno de Ontario — Encontrar un médico de familia (Health Care Connect)", href: "https://www.ontario.ca/page/find-family-doctor-or-nurse-practitioner" },
    { label: "Gobierno de Ontario — Solicitar OHIP", href: "https://www.ontario.ca/page/apply-ohip-and-get-health-card" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
    { label: "Gobierno de Ontario — Recién llegados a Ontario", href: "https://www.ontario.ca/page/newcomers" },
    { label: "211 Ontario — Orientación sobre ayudas comunitarias", href: "https://211ontario.ca/" },
  ],
  familias: [
    { label: "Gobierno de Ontario — Ontario Child Benefit", href: "https://www.ontario.ca/page/ontario-child-benefit" },
    { label: "Gobierno de Ontario — Encontrar y pagar cuidado infantil", href: "https://www.ontario.ca/page/find-and-pay-child-care" },
    { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
  ],
};

/* ---------- Utilidades ---------- */
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
/* Algunos nombres de la lista oficial llegan con doble codificación UTF-8 (p. ej. «CÃ´tÃ©»). */
const reparar = (s) => (/Ã|Â/.test(s) ? Buffer.from(s, "latin1").toString("utf8") : s);
function partirNombre(nombre) {
  /* «Armour, Township of» → base «Armour», prefijo «Township of»; «The Nation Municipality» → «The Nation», «Municipality» */
  const m = nombre.match(/^(.*), ((?:Regional |District |United )?(?:City|Town|Township|Municipality|Village|County|Counties|Municipality) of)$/);
  if (m) return { base: m[1], prefijo: m[2] };
  const m2 = nombre.match(/^(.*) (Municipality)$/);
  if (m2) return { base: m2[1], prefijo: m2[2] };
  return { base: nombre, prefijo: "" };
}
const denominacion = (prefijo) => {
  const p = prefijo.toLowerCase().replace(/ of$/, "");
  return { city: "city", town: "town", township: "township", municipality: "municipality", village: "village", county: "county" }[p] || "municipality";
};

/* Mapa: GeoJSON en metros (EPSG:3347) → trazo SVG simplificado (Douglas-Peucker, tolerancia en píxeles) */
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
function trazo(geo, a, tol = 0.8) {
  const polis = geo.type === "Polygon" ? [geo.coordinates] : geo.type === "MultiPolygon" ? geo.coordinates : [];
  return polis
    .flatMap((p) =>
      p.map((anillo) => {
        const pts = simplifica(anillo.map(([x, y]) => a(x, y)), tol);
        /* Se descartan islas y lagos diminutos (menos de ~4 px a la escala del mapa) */
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        if (pts.length < 4 || Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys) < 4) return "";
        return "M" + pts.map((q) => q.join(",")).join("L") + "Z";
      }),
    )
    .join("");
}

/* ---------- Carga y preparación de datos ---------- */
export function cargar(root) {
  const base = join(root, "scripts/canada-en-datos");
  const F = JSON.parse(readFileSync(join(base, "ontario-fuentes.json"), "utf8"));
  const C = JSON.parse(readFileSync(join(base, "ontario-complementos.json"), "utf8"));
  const C2 = JSON.parse(readFileSync(join(base, "ontario-complementos2.json"), "utf8"));
  const ER = JSON.parse(readFileSync(join(base, "ontario-er-cd.json"), "utf8"));
  /* Enlaces de las listas oficiales que ya no responden: reemplazo verificado (mismo organismo) o se retiran */
  const ENL = JSON.parse(readFileSync(join(base, "ontario-enlaces.json"), "utf8"));
  const enlace = (u) => (!u || !/^https?:\/\//.test(u) ? null : u in ENL.reemplazos ? ENL.reemplazos[u] : u);

  /* Lista oficial: nombre, sitio web, nivel y área geográfica */
  const lista = F.municipios.filas.map((f) => {
    const m = f[0].match(/title="([^"]+)" href="([^"]*)"/);
    const nombre = reparar(m ? m[1] : f[0].replace(/<[^>]+>/g, "")).trim();
    return { nombre, web: enlace(m && m[2]), nivel: f[1], area: reparar(f[2]).trim(), ...partirNombre(nombre) };
  });
  const locales = lista.filter((x) => x.nivel === "Lower Tier" || x.nivel === "Single Tier");

  /* Cruce con los límites de Land Information Ontario (MUNID = código de subdivisión censal) */
  const lio = F.lio.inferior;
  const porBase = new Map();
  for (const x of lio) {
    const k = norm(x.a.MUNICIPAL_NAME_SHORTFORM);
    (porBase.get(k) || porBase.set(k, []).get(k)).push(x);
  }
  /* Censo 2021: subdivisiones (CSD) y divisiones censales (CD) de Ontario.
     El cruce es por nombre; si el nombre se repite (p. ej. Hamilton), decide
     la división censal, que corresponde al área geográfica de la lista oficial. */
  const nombreCenso = (g) => norm(g.split(" / ")[0]);
  const cdNombre = new Map(Object.entries(F.censo).filter(([k]) => /^2021A0003/.test(k)).map(([k, v]) => [k.slice(-4), norm(v.GEO.split(" / ")[0])]));
  const csdPorNombre = new Map();
  for (const [k, v] of Object.entries(F.censo)) {
    if (!/^2021A0005/.test(k)) continue;
    const n = nombreCenso(v.GEO);
    (csdPorNombre.get(n) || csdPorNombre.set(n, []).get(n)).push({ csd: k.slice(-7), v });
  }
  /* Nombre con el que figura en el Censo 2021 cuando el municipio cambió de nombre después */
  const ALIAS_CENSO = { Tarbutt: "Tarbutt and Tarbutt Additional" };
  const AREA_CD = { "haldimand": "haldimand norfolk", "norfolk": "haldimand norfolk", "brant": "brant", "prince edward": "prince edward", "greater sudbury": "greater sudbury" };
  function censoDe(m) {
    /* El Censo usa a veces otra forma del nombre (p. ej. «Prince Edward County») */
    const c = csdPorNombre.get(norm(ALIAS_CENSO[m.base] || m.base)) || csdPorNombre.get(norm(`${m.base} ${m.prefijo.replace(/ of$/i, "")}`)) || [];
    if (c.length === 1) return c[0];
    const area = AREA_CD[norm(m.area)] || norm(m.area);
    return c.find((x) => cdNombre.get(x.csd.slice(0, 4)) === area) || null;
  }

  const items = [];
  for (const m of locales) {
    const cands = porBase.get(norm(m.base)) || [];
    const g = cands.length === 1 ? cands[0] : cands.find((x) => norm(x.a.MUNICIPAL_NAME_PREFIX || "").replace(/ of$/, "") === norm(m.prefijo).replace(/ of$/, ""));
    if (!g) throw new Error(`Sin límites oficiales (LIO) para ${m.nombre}`);
    const enCenso = censoDe(m);
    if (!enCenso) throw new Error(`Sin subdivisión censal (Censo 2021) para ${m.nombre}`);
    const csd = enCenso.csd;
    const censo = enCenso.v;
    const cd = csd.slice(0, 4);
    /* Única excepción de Ontario (SGC 2021): Burlington, en Halton, pertenece a Hamilton–Niagara Peninsula */
    const er = csd === "3524002" ? "3550" : ER.cd[cd];
    if (!er) throw new Error(`Sin región económica para ${m.nombre} (división censal ${cd})`);
    items.push({
      n: m.base,
      nombre: m.nombre,
      prefijo: m.prefijo,
      t: `${m.nivel === "Single Tier" ? "unico" : "inferior"}-${denominacion(m.prefijo)}`,
      nivel: m.nivel,
      area: m.area,
      sup: m.area,
      web: m.web,
      c: csd,
      cd,
      r: er,
      p: censo ? Number(censo["Population and dwelling counts (13): Population, 2021 [1]"]) : null,
      p16: censo && censo["Population and dwelling counts (13): Population, 2016 [2]"] ? Number(censo["Population and dwelling counts (13): Population, 2016 [2]"]) : null,
      cambio: censo && censo["Population and dwelling counts (13): Population percentage change, 2016 to 2021 [3]"] ? Number(censo["Population and dwelling counts (13): Population percentage change, 2016 to 2021 [3]"]) : null,
      censoNombre: censo ? censo.GEO : null,
      lio: g,
      mx: g.x,
      my: g.y,
      lat: g.lat,
      lon: g.lon,
    });
  }

  /* Nombres de URL: el nombre base; si se repite (Hamilton), se añade la denominación */
  const conteo = {};
  for (const r of items) conteo[slug(r.n)] = (conteo[slug(r.n)] || 0) + 1;
  for (const r of items) r.s = conteo[slug(r.n)] > 1 && r.t !== "unico-city" ? `${slug(r.n)}-${slug(DENOM[TIPOS[r.t].denominacion][1])}` : slug(r.n);
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r) throw new Error(`Ficha completa sin municipio: ${k}`);
    r.ficha = true;
  }

  /* Mapa: condados, regiones y distritos (nivel superior) + municipios de nivel único */
  const unidades = [
    ...F.lio.superior.map((u) => ({ n: u.a.MUNICIPAL_NAME, geo: u.geo, cd: null, munid: u.a.MUNID })),
    ...lio.filter((x) => /single/i.test(x.a.MUNICIPAL_TYPE)).map((x) => ({ n: x.a.MUNICIPAL_NAME, geo: x.geo, cd: (items.find((r) => r.lio === x) || {}).cd || null })),
  ];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (geo, fn) => (geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates).forEach((p) => p.forEach((a) => a.forEach(([x, y]) => fn(x, y))));
  for (const u of unidades) recorre(u.geo, (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))));
  const ANCHO = 600, MARGEN = 6;
  const esc = (ANCHO - 2 * MARGEN) / (x1 - x0);
  const alto = Math.ceil((y1 - y0) * esc + 2 * MARGEN);
  const a = (x, y) => [Math.round(((x - x0) * esc + MARGEN) * 10) / 10, Math.round(((y1 - y) * esc + MARGEN) * 10) / 10];
  /* Región económica de cada unidad del mapa: la de sus municipios (por división censal) */
  const erDeUnidad = (u) => {
    if (u.cd) return ER.cd[u.cd];
    const hijos = items.filter((r) => norm(r.area) === norm(u.n.replace(/^(COUNTY|REGIONAL MUNICIPALITY|UNITED COUNTIES|DISTRICT MUNICIPALITY|DISTRICT) OF /, "")));
    return hijos.length ? hijos[0].r : null;
  };
  const mapa = {
    ancho: ANCHO,
    alto,
    regiones: unidades.map((u) => ({ r: erDeUnidad(u) || "", n: u.n, d: trazo(u.geo, a) })),
  };
  for (const r of items) [r.x, r.y] = a(r.mx, r.my);

  /* Nombres de lugares dentro de cada subdivisión censal (SGC 2021) */
  const elementos = Object.entries(C.sgc.archivos).find(([u]) => /element/.test(u));
  const lugares = new Map();
  if (elementos) for (const [codigo, nombre] of elementos[1].filas) (lugares.get(codigo) || lugares.set(codigo, []).get(codigo)).push(nombre);

  return {
    meta: { consultado: F.consultado },
    regiones: ER.nombres,
    mapa,
    items,
    porCodigo: new Map(items.map((r) => [r.c, r])),
    epa: F.epa,
    cmhc: F.cmhc,
    escuelas: C.escuelas,
    enlace,
    hospitales: Object.values(C2.hospitales).find((x) => x && x.filas).filas.filter((f) => f.SERVICE_TYPE === "Hospital"),
    lugares,
    erFuente: ER,
  };
}

/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Gobierno de Ontario: lista de municipios y límites municipales (LIO); Statistics Canada: Censo 2021 y SGC 2021",
  poblacion: "Censo 2021",
  regiones: "11 regiones económicas",
  regionEtiqueta: "Región económica",
  tipoEtiqueta: "Nivel y denominación",
  ejemplo: "Mississauga",
  notaFichas: "Los demás municipios tienen, por ahora, una página con información básica: clasificación oficial, ubicación, población del Censo 2021, empleo de su región y enlaces oficiales. Iremos completándolos.",
  intro: () => `<p>Investiga los municipios de Ontario antes de decidir dónde vivir, trabajar o estudiar. El directorio incluye los <strong>414 municipios locales</strong> de la lista oficial del Gobierno de Ontario: los de <strong>nivel único</strong> (single-tier), que prestan todos los servicios municipales, y los de <strong>nivel inferior</strong> (lower-tier), que comparten servicios con un condado o una región (nivel superior). La palabra del nombre (city, town, township…) no indica por sí sola el estatus del municipio.</p>
      <p>No se incluyen como localidades las reservas de las Primeras Naciones ni los territorios no organizados del norte, porque no son municipios.</p>`,
  nota: (L) => `Total: ${miles(L.items.length)} municipios. Las regiones son las 11 regiones económicas oficiales de Statistics Canada (SGC 2021); cada municipio se asignó según su división censal.`,
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.municipios, esc)}; ${fuente(FUENTES.limites, esc)}; población: ${fuente(FUENTES.censo, esc)}; regiones: ${fuente(FUENTES.er, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
const EPA_GEO = (nombre) => `${nombre.replace(/–/g, "-")}, Ontario`;

function filaCmhc(L, archivo, centro, hoja) {
  const t = (L.cmhc[archivo] && L.cmhc[archivo].hojas[hoja]) || [];
  return t.find((f) => f[0] === centro) || null;
}

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const region = nombreRegion(L.regiones[r.r]);
  const epa = L.epa[EPA_GEO(region)];
  const consultado = fechaEs(L.meta.consultado);
  const f = r.ficha ? FICHAS[r.s] : null;
  const unico = r.nivel === "Single Tier";
  const denom = `${tipo.es}${tipo.es === tipo.en ? "" : ` (${tipo.en})`}`;

  const titulo = r.ficha ? `${r.n}, Ontario: guía para inmigrantes y recién llegados` : `${r.n}, Ontario: información básica`;
  const descripcion = r.ficha
    ? `${r.nBase ? `${r.n}, en Ontario,` : `${r.n} (Ontario)`} en datos: población, empleo, alquileres, escuelas, hospitales, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${r.n} es un municipio de Ontario (${unico ? "nivel único" : `nivel inferior, en ${r.area}`}). Clasificación oficial, región, población del Censo 2021 y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : NO_DISPONIBLE;
  const datos = [
    fila("Clasificación oficial", `${unico ? "Municipio de nivel único" : "Municipio de nivel inferior"} <small class="cd-fact__period">${unico ? "Single-tier" : "Lower-tier"} · Nombre oficial: ${esc(r.nombre)}</small>`),
    fila("Denominación", esc(denom)),
    fila(unico ? "Área geográfica" : "Condado, región o distrito", esc(r.area)),
    fila("Región económica", esc(region)),
    fila("Población", pob),
  ].join("\n          ");

  /* --- Lugares con nombre dentro del municipio --- */
  const lugares = (L.lugares.get(r.c) || []).slice().sort((a, b) => a.localeCompare(b, "es"));
  const comunidades = lugares.length
    ? `<p>Según la Clasificación Geográfica Estándar de Statistics Canada, dentro de ${esc(r.n)} hay ${miles(lugares.length)} ${lugares.length === 1 ? "lugar con nombre propio" : "lugares con nombre propio"} (barrios, comunidades o antiguos pueblos). No son municipios: forman parte de ${esc(r.n)}.</p>
      <p class="cd-loc-comunidades">${lugares.map(esc).join(" · ")}</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.lugares, esc)}.</p>`
    : "";

  /* --- Empleo (región económica) --- */
  const empleo = empleoRegional({ epa, nombre: r.n, nombreEpa: region, esc, consultado, fuentes: FUENTES });
  const busqueda = r.ficha
    ? [{ label: `Job Bank — Empleos en ${r.n}`, href: `https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=${encodeURIComponent(r.nBase || r.n).replace(/%20/g, "+")}%2C+ON` }, ...RECURSOS.empleo.slice(1)]
    : RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = `<p>${NO_DISPONIBLE}: CMHC no publica alquileres para esta localidad en su encuesta anual. Consulta los datos de los centros urbanos de Ontario en la <a href="/canada-en-datos/ontario#vivienda">guía de Ontario</a>.</p>`;
  if (f) {
    const [archivo, centro, etiqueta] = f.cmhc;
    const alquiler = filaCmhc(L, archivo, centro, "Table 1.1.2");
    const vacancia = filaCmhc(L, archivo, centro, "Table 1.1.1");
    if (alquiler && vacancia) vivienda = viviendaCmhc({ cmhc: { alquiler, vacancia }, centro: etiqueta, esc, fuenteCmhc: FUENTES.cmhc });
  }
  vivienda += `\n      <p>Antes de alquilar, conoce tus derechos: <a href="https://www.ontario.ca/page/renting-ontario-your-rights" target="_blank" rel="noopener">Gobierno de Ontario — Alquilar en Ontario: tus derechos</a>.</p>`;

  /* --- Escuelas: consejos escolares con escuelas en la ciudad (SIF 2024-2025) --- */
  let escuelas = `<p>${NO_DISPONIBLE} en esta página. En Ontario, las escuelas públicas dependen de consejos escolares (school boards): públicos y católicos, en inglés y en francés. Para inscribir a tus hijos, comunícate con el consejo escolar de tu zona.</p>`;
  if (f) {
    const E = L.escuelas;
    const i = (n) => E.cabecera.indexOf(n);
    const consejos = new Map();
    for (const x of E.filas) {
      if (!f.comunidades.includes(x[i("City")])) continue;
      const nombre = x[i("Board Name")];
      const c = consejos.get(nombre) || { n: 0, tipo: x[i("Board Type")], idioma: {}, web: L.enlace(x[i("Board Website")]) };
      c.n++;
      c.idioma[x[i("School Language")]] = (c.idioma[x[i("School Language")]] || 0) + 1;
      consejos.set(nombre, c);
    }
    const lista = [...consejos.entries()].filter(([, c]) => /Pub Dist|Cath Dist/.test(c.tipo)).sort((a, b) => b[1].n - a[1].n);
    if (lista.length) {
      const desc = (c) => `${/Cath/.test(c.tipo) ? "Católico" : "Público"}, ${(c.idioma.French || 0) > (c.idioma.English || 0) ? "en francés" : "en inglés"}`;
      escuelas = `<p>Consejos escolares con escuelas en ${esc(r.n)}, según el registro de escuelas del Ministerio de Educación de Ontario (año escolar 2024-2025). Para inscribir a tus hijos, comunícate con el consejo de tu zona.</p>
      <ul class="cd-list-items">
        ${lista.map(([n, c]) => `<li>${c.web ? `<a href="${esc(c.web)}" target="_blank" rel="noopener">${esc(n)}</a>` : esc(n)} — ${desc(c)}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. Los nombres aparecen tal como figuran en el registro. Las escuelas en francés son para familias con derecho a la educación en francés.</p>`;
    }
  }

  /* --- Salud --- */
  let salud = `<p>${NO_DISPONIBLE} en esta página. En una emergencia, llama al 911. Para consejos de salud las 24 horas, llama gratis a Health811 (811).</p>`;
  if (f) {
    const hs = L.hospitales.filter((h) => f.comunidades.includes(h.COMMUNITY)).sort((a, b) => a.ENGLISH_NAME.localeCompare(b.ENGLISH_NAME, "es"));
    salud = hs.length
      ? `<p>Hospitales registrados por el Ministerio de Salud de Ontario con dirección en ${esc(r.n)}. En una emergencia, llama al 911. Para consejos de salud las 24 horas, llama gratis a Health811 (811).</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(h.ENGLISH_NAME)}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.salud, esc)}. Los nombres aparecen tal como figuran en el registro; no todos los hospitales tienen servicio de urgencias. Confirma servicios y horarios antes de ir.</p>`
      : `<p>El registro del Ministerio de Salud de Ontario no muestra hospitales con dirección en ${esc(r.n)}; los más cercanos pueden estar en un municipio vecino. En una emergencia, llama al 911. Para consejos de salud las 24 horas, llama gratis a Health811 (811).</p>`;
  }

  /* --- Transporte --- */
  const transporte = f && f.transporte
    ? `<p>Información oficial de transporte público:</p>${enlaces(f.transporte, esc)}`
    : `<p>${NO_DISPONIBLE}${f ? ": no pudimos verificar el enlace oficial de transporte público. Consulta el sitio oficial del municipio." : ". Consulta el sitio oficial del municipio."}</p>`;

  const recien = `<p>Los servicios de asentamiento financiados por el Gobierno de Canadá son gratuitos para quienes cumplen los requisitos de elegibilidad. Busca los más cercanos con tu código postal.</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la <a href="/canada-en-datos/ontario#recien-llegado">guía de primeros pasos en Ontario</a>.</p>`;
  const familias = `<p>Estos son recursos provinciales y federales: se aplican en todo Ontario, no solo en ${esc(r.n)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia.</p>
      ${enlaces(RECURSOS.familias, esc)}`;

  const oficiales = [
    ...(r.web ? [{ label: `Sitio oficial de ${r.nombre}`, href: r.web }] : []),
    { label: "Gobierno de Ontario — Lista de municipios de Ontario", href: FUENTES.lista.url },
  ];
  const fuentes = [FUENTES.municipios, FUENTES.limites, FUENTES.censo, FUENTES.er, ...(lugares.length ? [FUENTES.lugares] : []), ...(epa ? [FUENTES.epa, FUENTES.industrias] : []), ...(f ? [FUENTES.cmhc, FUENTES.escuelas, FUENTES.salud] : [])];

  const intro = r.ficha
    ? `${r.n} es un municipio de ${unico ? "nivel único" : `nivel inferior, dentro de ${r.area}`}, en la región económica ${region}.${typeof r.p === "number" ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : ""} Aquí encontrarás datos oficiales y enlaces útiles para investigar la ciudad antes de mudarte, trabajar o estudiar.`
    : `${r.n} es un municipio de ${unico ? "nivel único" : `nivel inferior, dentro de ${r.area}`}, en la región económica ${region}. Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.`;

  return {
    titulo,
    descripcion,
    kicker: `Ontario · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro,
    datos,
    ubicacion: `Ubicación aproximada en la región económica ${esc(region)}. Mapa elaborado con los límites municipales oficiales del Gobierno de Ontario (Land Information Ontario).`,
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
    ciudad: TIPOS[r.t].denominacion === "city" || TIPOS[r.t].denominacion === "town" || TIPOS[r.t].denominacion === "village",
  };
}

function tarjeta(r) {
  const tipo = TIPOS[r.t];
  return {
    tipo: `${tipo.es}${tipo.es === tipo.en ? "" : ` (${tipo.en})`} · ${r.nivel === "Single Tier" ? "nivel único" : "nivel inferior"}`,
    dato: typeof r.p === "number" ? `${miles(r.p)} habitantes (Censo 2021)` : "",
  };
}

export default {
  slug: "ontario",
  nombre: "Ontario",
  TIPOS,
  GRUPOS,
  FICHAS,
  FUENTES,
  esMunicipio: () => true,
  cargar,
  directorio,
  pagina,
  tarjeta,
};
