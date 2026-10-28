/*
  provincias/british-columbia.mjs — Directorio de localidades de Columbia Británica
  ======================================================================
  Criterio de inclusión (documentado en el repositorio interno):
  - Una página por cada subdivisión censal (CSD) de Columbia Británica en el
    Censo 2021 de Statistics Canada: 751 en total. Son la unidad oficial que
    cubre todo el territorio y tiene un código estable de 7 dígitos:
      · 160 municipios (ciudades, municipios de distrito, pueblos, villas,
        un municipio insular y un municipio regional);
      · 160 áreas electorales de distritos regionales (territorio rural no
        incorporado, administrado por el distrito regional);
      · 431 tierras de Primeras Naciones con su clasificación censal
        (reservas, asentamientos, distritos de gobierno indígena, tierras
        nisga'a, tsawwassen y tla'amin).
  - Sin página propia, dentro del directorio y de la página de su CSD
    (como los hamlets de Alberta): los lugares designados de Statistics
    Canada (Censo 2021) y las comunidades y localidades con nombre oficial
    del Gobierno de BC (BC Geographical Names), ubicados en su CSD por sus
    coordenadas oficiales.
  - Los distritos regionales (27) no son localidades: son el filtro
    «Distrito regional» y el área geográfica de cada página.
  No se promete cobertura de asentamientos informales o históricos sin
  inventario oficial: los lugares «antiguos» (Former Locality) se excluyen.

  Datos (scripts/canada-en-datos/):
    bc-localidades.json   obtener-bc-localidades.py + compactar-bc.py
    bc-estimaciones.json  obtener-bc-ficha2.py (BC Stats, 1 de julio de 2025)

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";

const PROV = "Columbia Británica";

/* ---------- Clasificación oficial ----------
   Tipos de subdivisión censal de Statistics Canada (código entre paréntesis
   en `censo`) y tipos de lugar de las fuentes oficiales. Los nombres
   oficiales se dejan en inglés junto al equivalente en español. */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "municipio", plural: "ciudades", censo: "CY" },
  district: { es: "Municipio de distrito", en: "District Municipality", grupo: "municipio", plural: "municipios de distrito (district municipalities)", censo: "DM" },
  town: { es: "Pueblo", en: "Town", grupo: "municipio", plural: "pueblos (towns)", censo: "T" },
  village: { es: "Villa", en: "Village", grupo: "municipio", plural: "villas (villages)", censo: "VL" },
  island: { es: "Municipio insular", en: "Island Municipality", grupo: "municipio", plural: "municipios insulares", censo: "IM" },
  regional: { es: "Municipio regional", en: "Regional Municipality", grupo: "municipio", plural: "municipios regionales", censo: "RGM" },
  electoral: { es: "Área electoral", en: "Regional District Electoral Area", grupo: "rural", plural: "áreas electorales de distritos regionales", censo: "RDA" },
  reserve: { es: "Reserva indígena", en: "Indian Reserve", grupo: "indigena", plural: "reservas indígenas (Indian reserves)", censo: "IRI" },
  settlement: { es: "Asentamiento indígena", en: "Indian Settlement", grupo: "indigena", plural: "asentamientos indígenas (Indian settlements)", censo: "S-É" },
  igd: { es: "Distrito de gobierno indígena", en: "Indian Government District", grupo: "indigena", plural: "partes del distrito de gobierno indígena de Sechelt", censo: "IGD" },
  nisgaa: { es: "Tierras nisga'a", en: "Nisga'a Lands", grupo: "indigena", plural: "tierras nisga'a", censo: "NL" },
  tsawwassen: { es: "Tierras tsawwassen", en: "Tsawwassen Lands", grupo: "indigena", plural: "tierras tsawwassen", censo: "TWL" },
  tlaamin: { es: "Tierras tla'amin", en: "Tla'amin Lands", grupo: "indigena", plural: "tierras tla'amin", censo: "TAL" },
  "lugar-no-incorporado": { es: "Lugar no incorporado", en: "Unincorporated place (Statistics Canada)", grupo: "comunidad", plural: "lugares no incorporados (Statistics Canada)", dpl: "UNP" },
  "lugar-reserva": { es: "Reserva (lugar designado)", en: "Indian reserve (designated place)", grupo: "comunidad", plural: "reservas registradas como lugar designado", dpl: "IRI" },
  "aldea-nisgaa": { es: "Aldea nisga'a", en: "Nisga'a village", grupo: "comunidad", plural: "aldeas nisga'a", dpl: "NVL" },
  "islands-trust": { es: "Área del Islands Trust", en: "Islands Trust area", grupo: "comunidad", plural: "áreas del Islands Trust", dpl: "IST" },
  "antiguo-centro": { es: "Antiguo centro de población", en: "Retired population centre", grupo: "comunidad", plural: "antiguos centros de población (Statistics Canada)", dpl: "RPC" },
  comunidad: { es: "Comunidad", en: "Community", grupo: "comunidad", plural: "comunidades (communities)", gn: "Community" },
  localidad: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades (localities)", gn: "Locality" },
  "comunidad-urbana": { es: "Comunidad urbana", en: "Urban Community", grupo: "comunidad", plural: "comunidades urbanas", gn: "Urban Community" },
  "comunidad-recreativa": { es: "Comunidad recreativa", en: "Recreational Community", grupo: "comunidad", plural: "comunidades recreativas", gn: "Recreational Community" },
  "aldea-primera-nacion": { es: "Aldea de Primera Nación", en: "First Nation Village", grupo: "comunidad", plural: "aldeas de Primeras Naciones", gn: "First Nation Village" },
  asentamiento: { es: "Asentamiento", en: "Settlement", grupo: "comunidad", plural: "asentamientos (settlements)", gn: "Settlement" },
};
export const GRUPOS = {
  municipio: "Municipios incorporados",
  rural: "Áreas electorales (territorio rural no incorporado)",
  indigena: "Tierras de Primeras Naciones (clasificación del censo)",
  comunidad: "Comunidades y lugares no incorporados",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "comunidad";
const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
const POR_DPL = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.dpl).map(([k, v]) => [v.dpl, k]));
const POR_GN = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k]));

/* ---------- Distritos regionales ----------
   División censal (Censo 2021) → nombre oficial vigente del Gobierno de BC
   (límites legales ABMS). El censo usa a veces nombres anteriores
   (Powell River → qathet, Skeena-Queen Charlotte → North Coast, Greater
   Vancouver → Metro Vancouver). Northern Rockies es un municipio regional
   y el Stikine es una región no incorporada: no son distritos regionales. */
export const DISTRITOS = {
  5901: ["Regional District of East Kootenay", "East Kootenay"],
  5903: ["Regional District of Central Kootenay", "Central Kootenay"],
  5905: ["Regional District of Kootenay Boundary", "Kootenay Boundary"],
  5907: ["Regional District of Okanagan-Similkameen", "Okanagan-Similkameen"],
  5909: ["Fraser Valley Regional District", "Fraser Valley"],
  5915: ["Metro Vancouver Regional District", "Metro Vancouver"],
  5917: ["Capital Regional District", "Capital"],
  5919: ["Cowichan Valley Regional District", "Cowichan Valley"],
  5921: ["Regional District of Nanaimo", "Nanaimo"],
  5923: ["Regional District of Alberni-Clayoquot", "Alberni-Clayoquot"],
  5924: ["Strathcona Regional District", "Strathcona"],
  5926: ["Comox Valley Regional District", "Comox Valley"],
  5927: ["qathet Regional District", "qathet"],
  5929: ["Sunshine Coast Regional District", "Sunshine Coast"],
  5931: ["Squamish-Lillooet Regional District", "Squamish-Lillooet"],
  5933: ["Thompson-Nicola Regional District", "Thompson-Nicola"],
  5935: ["Regional District of Central Okanagan", "Central Okanagan"],
  5937: ["Regional District of North Okanagan", "North Okanagan"],
  5939: ["Columbia Shuswap Regional District", "Columbia Shuswap"],
  5941: ["Cariboo Regional District", "Cariboo"],
  5943: ["Regional District of Mount Waddington", "Mount Waddington"],
  5945: ["Central Coast Regional District", "Central Coast"],
  5947: ["North Coast Regional District", "North Coast"],
  5949: ["Regional District of Kitimat-Stikine", "Kitimat-Stikine"],
  5951: ["Regional District of Bulkley-Nechako", "Bulkley-Nechako"],
  5953: ["Regional District of Fraser-Fort George", "Fraser-Fort George"],
  5955: ["Peace River Regional District", "Peace River"],
  5957: ["Stikine Region (Unincorporated)", "Stikine (región no incorporada)"],
  5959: ["Northern Rockies Regional Municipality", "Northern Rockies (municipio regional)"],
};

/* Nombre vigente cuando difiere del que trae el Censo 2021: municipios que cambiaron de nombre
   (Queen Charlotte → Daajing Giids, 2022) y formas oficiales de los límites legales (ABMS).
   El nombre del censo se conserva como variante para la búsqueda. */
const NOMBRE_ACTUAL = { "Queen Charlotte": "Daajing Giids", "Sun Peaks Mountain": "Sun Peaks", "One Hundred Mile House": "100 Mile House" };
const ABREV_ABMS = {};
const ABREV_HOMONIMOS = { city: " - City", district: " - District" };

/* Regiones económicas 2021 → fila de la Encuesta de Población Activa
   (Statistics Canada publica North Coast y Nechako juntas). */
const EPA_GEO = {
  5910: "Vancouver Island and Coast, British Columbia",
  5920: "Lower Mainland-Southwest, British Columbia",
  5930: "Thompson-Okanagan, British Columbia",
  5940: "Kootenay, British Columbia",
  5950: "Cariboo, British Columbia",
  5960: "North Coast and Nechako, British Columbia",
  5970: "North Coast and Nechako, British Columbia",
  5980: "Northeast, British Columbia",
};

/* ---------- Fichas completas ----------
   Los 15 municipios más poblados según BC Stats (2025), salvo los que
   comparten zona de CMHC con otro mayor, más los centros regionales con
   encuesta propia de CMHC. Enlaces comprobados antes de publicar. */
const TRANSLINK = { label: "TransLink — Transporte público de Metro Vancouver (autobús, SkyTrain, SeaBus)", href: "https://www.translink.ca/" };
const bct = (s, n) => ({ label: `BC Transit — Sistema de ${n}`, href: `https://www.bctransit.com/${s}/` });
export const FICHAS = {
  vancouver: { nombre: "Vancouver", web: "https://vancouver.ca/", cmhc: ["vancouver", "City of Vancouver (Zones 1-10)", "la ciudad de Vancouver (zonas 1 a 10 de CMHC)"], transporte: [TRANSLINK] },
  surrey: { nombre: "Surrey", web: "https://www.surrey.ca/", cmhc: ["vancouver", "Zone 21 - Surrey", "la zona 21 de CMHC (Surrey)"], transporte: [TRANSLINK] },
  burnaby: { nombre: "Burnaby", web: "https://www.burnaby.ca/", cmhc: ["vancouver", "Burnaby (Zones 12-14)", "Burnaby (zonas 12 a 14 de CMHC)"], transporte: [TRANSLINK] },
  richmond: { nombre: "Richmond", web: "https://www.richmond.ca/", cmhc: ["vancouver", "Zone 19 - Richmond", "la zona 19 de CMHC (Richmond)"], transporte: [TRANSLINK] },
  coquitlam: { nombre: "Coquitlam", web: "https://www.coquitlam.ca/", cmhc: ["vancouver", "Zone 24 - Tri-Cities", "la zona 24 de CMHC (Tri-Cities: Coquitlam, Port Coquitlam y Port Moody)"], transporte: [TRANSLINK] },
  delta: { nombre: "Delta", web: "https://www.delta.ca/", cmhc: ["vancouver", "Zone 20 - Delta", "la zona 20 de CMHC (Delta)"], transporte: [TRANSLINK] },
  langley: { nombre: "Langley (municipio de distrito)", web: "https://www.tol.ca/", cmhc: ["vancouver", "Zone 23 - Langley City and Langley DM", "la zona 23 de CMHC (ciudad y municipio de distrito de Langley)"], transporte: [TRANSLINK] },
  abbotsford: { nombre: "Abbotsford", web: "https://www.abbotsford.ca/", cmhc: ["abbotsford-mission", "Zone 1 - Abbotsford", "la zona 1 de CMHC (Abbotsford)"], transporte: [bct("central-fraser-valley", "Central Fraser Valley")] },
  victoria: { nombre: "Victoria", web: "https://www.victoria.ca/", cmhc: ["victoria", "City of Victoria (Zones 1-4)", "la ciudad de Victoria (zonas 1 a 4 de CMHC)"], transporte: [bct("victoria", "Victoria")] },
  saanich: { nombre: "Saanich", web: "https://www.saanich.ca/", cmhc: ["victoria", "Zone 5 - Saanich/Central Saanich", "la zona 5 de CMHC (Saanich y Central Saanich)"], transporte: [bct("victoria", "Victoria")] },
  kelowna: { nombre: "Kelowna", web: "https://www.kelowna.ca/", cmhc: ["kelowna", "Kelowna CMA", "el área metropolitana de Kelowna"], transporte: [bct("kelowna", "Kelowna")] },
  nanaimo: { nombre: "Nanaimo", web: "https://www.nanaimo.ca/", cmhc: ["nanaimo", "Nanaimo CMA", "el área metropolitana de Nanaimo"], transporte: [bct("nanaimo", "Nanaimo")] },
  kamloops: { nombre: "Kamloops", web: "https://www.kamloops.ca/", cmhc: ["kamloops", "Kamloops CMA", "el área metropolitana de Kamloops"], transporte: [bct("kamloops", "Kamloops")] },
  chilliwack: { nombre: "Chilliwack", web: "https://www.chilliwack.com/", cmhc: ["chilliwack", "Chilliwack CMA", "el área metropolitana de Chilliwack"], transporte: [bct("chilliwack", "Chilliwack")] },
  "prince-george": { nombre: "Prince George", web: "https://www.princegeorge.ca/", cmhc: ["british-columbia", "Prince George CA", "la aglomeración de Prince George"], transporte: [bct("prince-george", "Prince George")] },
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada (copia oficial del Gobierno de BC)", title: "Current Census Subdivision Boundaries — subdivisiones censales 2021 y su clasificación", url: "https://catalogue.data.gov.bc.ca/dataset/current-census-subdivision-boundaries" },
  perfil: { org: "Statistics Canada (copia oficial del Gobierno de BC)", title: "Census Profiles for BC Census Subdivisions — 2021 Census", url: "https://catalogue.data.gov.bc.ca/dataset/census-profiles-for-bc-census-subdivisions-2021-census" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  dpl: { org: "Statistics Canada", title: "Tabla 98-10-0012-01 — Población de los lugares designados, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810001201" },
  gaf: { org: "Statistics Canada (copia oficial del Gobierno de BC)", title: "Archivo de atributos geográficos 2021 (92-151-X)", url: "https://catalogue.data.gov.bc.ca/dataset/census-geographic-attribute-file" },
  nombres: { org: "Gobierno de Columbia Británica", title: "BC Geographical Names (nombres geográficos oficiales)", url: "https://catalogue.data.gov.bc.ca/dataset/bc-geographical-names" },
  abms: { org: "Gobierno de Columbia Británica", title: "Límites legales vigentes: municipios, distritos regionales y áreas electorales (ABMS)", url: "https://catalogue.data.gov.bc.ca/dataset/municipalities-legally-defined-administrative-areas-of-bc" },
  estimaciones: { org: "BC Stats (Gobierno de BC)", title: "Municipal and sub-provincial areas population, 2011 to 2025", url: "https://www2.gov.bc.ca/gov/content/data/statistics/people-population-community/population/population-estimates" },
  er: { org: "Statistics Canada (copia oficial del Gobierno de BC)", title: "Regiones económicas 2021", url: "https://catalogue.data.gov.bc.ca/dataset/current-census-economic-regions" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0393-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039301" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0392-01 — Empleo por industria y región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039201" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Gobierno de Columbia Británica (Ministerio de Educación)", title: "BC Schools K-12 — ubicación de las escuelas (BC Geographic Warehouse)", url: "https://catalogue.data.gov.bc.ca/dataset/bc-schools-k-12-with-francophone-indicators" },
  hospitales: { org: "Gobierno de Columbia Británica (HealthLink BC)", title: "Hospitals in BC", url: "https://catalogue.data.gov.bc.ca/dataset/hospitals-in-bc" },
  listaMunicipios: { org: "Gobierno de Columbia Británica, Ministerio de Vivienda y Asuntos Municipales", title: "Local Government Legal Names and Incorporation Dates (actualizado el 6 de agosto de 2026)", url: "https://www2.gov.bc.ca/assets/gov/british-columbians-our-governments/local-governments/finance/local-government-statistics/local_government_legal_name_and_incorporation_dates.pdf" },
  okanaganFalls: { org: "Gobierno de Columbia Británica", title: "Okanagan Falls taking final steps to become a municipality", url: "https://news.gov.bc.ca/releases/2026HMA0069-000747" },
  horaRegiones: { org: "Gobierno de Columbia Británica", title: "Adopting permanent daylight saving time (2 de marzo de 2026): zonas con hora de la montaña", url: "https://news.gov.bc.ca/releases/2026AG0013-000209" },
  hora: { org: "Gobierno de Columbia Británica", title: "No falling back with B.C.’s new time zone code, Pacific Time: PCT (17 de septiembre de 2026)", url: "https://news.gov.bc.ca/releases/2026CITZ0009-001073" },
  municipios: { org: "Gobierno de Columbia Británica", title: "Municipalities in B.C.", url: "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/municipalities" },
  distritos: { org: "Gobierno de Columbia Británica", title: "Regional districts in B.C.", url: "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/regional-districts" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Columbia Británica", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=British+Columbia" },
    { label: "WorkBC — Centros de empleo con ayuda gratuita", href: "https://www.workbc.ca/get-support/workbc-centre-services" },
  ],
  escuelas: [
    { label: "Gobierno de BC — Buscar escuelas y distritos escolares (BC School Contacts)", href: "https://bcschoolcontacts.gov.bc.ca/" },
  ],
  salud: [
    { label: "HealthLink BC — Consejos de salud las 24 horas (8-1-1)", href: "https://www.healthlinkbc.ca/" },
    { label: "Health Connect Registry — Inscribirse para conseguir médico de familia", href: "https://www.healthlinkbc.ca/find-care/health-connect-registry" },
    { label: "Gobierno de BC — Elegibilidad para MSP", href: "https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp/bc-residents/eligibility-and-enrolment/are-you-eligible" },
  ],
  recienLlegados: [
    { label: "WelcomeBC — Servicios gratuitos para recién llegados", href: "https://www.welcomebc.ca/start-your-life-in-b-c/find-newcomer-services" },
    { label: "WelcomeBC — B.C. Newcomers' Guide (también en español)", href: "https://www.welcomebc.ca/start-your-life-in-b-c/bc-newcomers-guide" },
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
    { label: "211 British Columbia — Orientación sobre ayudas comunitarias", href: "https://bc.211.ca/" },
  ],
  familias: [
    { label: "Gobierno de BC — B.C. family benefit", href: "https://www2.gov.bc.ca/gov/content/family-social-supports/affordability/family-benefit" },
    { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
  ],
  vivienda: [
    { label: "Gobierno de BC — Residential Tenancy Branch (derechos de inquilinos y propietarios)", href: "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies" },
    { label: "BC Housing — Vivienda de alquiler subsidiada", href: "https://www.bchousing.org/housing-assistance/rental-housing" },
  ],
};

/* ---------- Utilidades ---------- */
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const objeto = (campos, fila_) => Object.fromEntries(campos.map((c, i) => [c, fila_[i]]));
/* Distancia en línea recta (km) entre dos puntos en grados */
function km(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/* Mapa: GeoJSON en metros (EPSG:3347) → trazo SVG simplificado (Douglas-Peucker, tolerancia en píxeles).
   Igual que en el módulo de Ontario; se copia para no modificar módulos ya publicados. */
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
  const J = JSON.parse(readFileSync(join(base, "bc-localidades.json"), "utf8"));
  const E = JSON.parse(readFileSync(join(base, "bc-estimaciones.json"), "utf8"));

  /* Estimaciones de BC Stats (1 de julio): municipios y distritos regionales.
     El código SGC de la hoja son los 5 últimos dígitos del código de la CSD o de la división censal. */
  const hoja = E.hojas["Mun-RD"];
  const cab = hoja.find((f) => f[0] === "SGC");
  /* Última columna de año (después vienen las columnas de variación «2024-25 Changes») */
  const col = cab.reduce((m, c, i) => (/^\d{4}$/.test(c) ? i : m), -1);
  const ANIO = cab[col];
  const est = new Map();
  /* La hoja guarda el código como número: «09052» llega como «9052» */
  for (const f of hoja) if (/^\d{4,5}$/.test(f[0]) && /^\d+$/.test(f[col])) est.set(`59${f[0].padStart(5, "0")}`, { n: f[1], tipo: f[2], v: Number(f[col]) });

  const perfil = (id) => (J.perfil[id] ? objeto(J.perfil_campos, J.perfil[id]) : {});
  const csd = J.csd.map((f) => objeto(J.csd_campos, f));
  const regionDe = new Map(csd.map((c) => [c.id, c.er]));

  /* Encuadre del mapa (metros, EPSG:3347) */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (geo, fn) => (geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates).forEach((p) => p.forEach((a) => a.forEach(([x, y]) => fn(x, y))));
  for (const c of J.cd) recorre(c.geo, (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))));
  const ANCHO = 600, MARGEN = 6;
  const escala = (ANCHO - 2 * MARGEN) / (x1 - x0);
  const alto = Math.ceil((y1 - y0) * escala + 2 * MARGEN);
  const a = (x, y) => [Math.round(((x - x0) * escala + MARGEN) * 10) / 10, Math.round(((y1 - y) * escala + MARGEN) * 10) / 10];
  const erDeCd = new Map();
  for (const c of csd) if (!erDeCd.has(c.cd)) erDeCd.set(c.cd, c.er);
  const mapa = { ancho: ANCHO, alto, regiones: J.cd.map((c) => ({ r: erDeCd.get(c.CDUID) || "", n: c.CDNAME, d: trazo(c.geo, a) })) };

  /* Municipios: nombre legal vigente (ABMS) */
  const legal = new Map();
  for (const [nombre, abrev] of J.municipios) {
    const k = norm(abrev);
    (legal.get(k) || legal.set(k, []).get(k)).push(nombre);
  }
  const legalDe = (c, t) => {
    const base = NOMBRE_ACTUAL[c.nombre] || ABREV_ABMS[c.nombre] || c.nombre;
    /* Homónimos (Langley, North Vancouver): ABMS los abrevia «… - City» y «… - District» */
    const cands = legal.get(norm(base)) || legal.get(norm(base + (ABREV_HOMONIMOS[t] || ""))) || [];
    return cands.length === 1 ? cands[0] : null;
  };

  /* --- Subdivisiones censales: una página cada una --- */
  const items = [];
  for (const c of csd) {
    const t = POR_CENSO[c.tipo];
    if (!t) throw new Error(`Tipo de subdivisión censal sin clasificar: ${c.tipo} (${c.nombre})`);
    if (!DISTRITOS[c.cd]) throw new Error(`División censal sin distrito: ${c.cd}`);
    const p = perfil(c.id);
    const [sup, dens] = (J.superficie_censo[c.id] || []).map((v) => (v == null || v === "" ? null : Number(v)));
    const [xx, yy] = a(c.x, c.y);
    const actual = NOMBRE_ACTUAL[c.nombre];
    items.push({
      c: c.id,
      n: actual || c.nombre,
      censoNombre: c.nombre,
      alias: actual ? [c.nombre] : c.tipo === "IGD" ? [IGD_NOMBRE] : [],
      t,
      r: c.er,
      cd: c.cd,
      sup: DISTRITOS[c.cd][1],
      distrito: DISTRITOS[c.cd][0],
      cma: c.cma || null,
      x: xx,
      y: yy,
      lat: c.lat,
      lon: c.lon,
      p: typeof p.p === "number" ? p.p : null,
      p16: typeof p.p16 === "number" ? p.p16 : null,
      cambio: typeof p.cambio === "number" ? p.cambio : null,
      viviendas: p.viviendas ?? null,
      superficie: Number.isFinite(sup) ? sup : null,
      densidad: Number.isFinite(dens) ? dens : null,
      alquiler: p.costo_alquiler ?? null,
      est: est.get(c.id) || null,
      legal: TIPOS[t].grupo === "municipio" ? legalDe(c, t) : null,
    });
  }
  /* Las dos partes de Sechelt (IGD) y de Okanagan (Part) 1 llevan el distrito en el nombre */
  const repetidos = new Map();
  for (const r of items) repetidos.set(`${r.n}|${r.t}`, (repetidos.get(`${r.n}|${r.t}`) || 0) + 1);
  for (const r of items) if (repetidos.get(`${r.n}|${r.t}`) > 1) r.n = `${r.n} · ${r.sup}`;

  /* Nombres de URL: el nombre; si se repite (Langley, North Vancouver, Alert Bay, Esquimalt), el más poblado conserva el corto y el otro lleva el tipo en inglés */
  const porSlug = new Map();
  for (const r of items) (porSlug.get(slug(r.n)) || porSlug.set(slug(r.n), []).get(slug(r.n))).push(r);
  for (const grupo of porSlug.values()) {
    grupo.sort((m, n) => (n.p || 0) - (m.p || 0));
    grupo.forEach((r, i) => (r.s = i === 0 ? slug(r.n) : `${slug(r.n)}-${slug(TIPOS[r.t].en)}`));
  }
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error("Nombres de URL repetidos en Columbia Británica");
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r || TIPOS[r.t].grupo !== "municipio") throw new Error(`Ficha completa sin municipio: ${k}`);
    r.ficha = true;
  }

  /* --- Comunidades y lugares (sin página propia) --- */
  const nombresCsd = new Set(csd.map((c) => norm(c.nombre)));
  const comunidades = [];
  const vistos = new Set();
  const agrega = (o) => {
    const k = `${norm(o.n)}|${o.m}`;
    const padre = porCodigo.get(o.m);
    if (!padre || vistos.has(k) || norm(o.n) === norm(padre.n) || norm(o.n) === norm(padre.censoNombre)) return;
    vistos.add(k);
    const [xx, yy] = a(o.mx, o.my);
    comunidades.push({ n: o.n, t: o.t, m: o.m, r: regionDe.get(o.m), sup: padre.sup, x: xx, y: yy, lat: o.lat, lon: o.lon, p: o.p ?? null, p16: o.p16 ?? null, id: o.id });
  };
  /* Lugares designados de Statistics Canada (con población del Censo 2021) */
  for (const f of J.dpl) {
    const d = objeto(J.dpl_campos, f);
    const t = POR_DPL[d.tipo];
    if (!t) throw new Error(`Tipo de lugar designado sin clasificar: ${d.tipo}`);
    /* Una reserva que ya es subdivisión censal no se repite */
    if (t === "lugar-reserva" && nombresCsd.has(norm(d.nombre))) continue;
    agrega({ n: d.nombre, t, m: d.csd, mx: d.x, my: d.y, lat: d.lat, lon: d.lon, p: d.p, p16: d.p16, id: d.uid });
  }
  /* Nombres geográficos oficiales del Gobierno de BC (sin población) */
  for (const f of J.bcgnis) {
    const g = objeto(J.bcgnis_campos, f);
    const t = POR_GN[g.tipo];
    if (!t) continue; /* ciudades, pueblos y municipios (ya tienen página) y lugares antiguos (Former Locality) */
    agrega({ n: g.nombre, t, m: g.csd, mx: g.x, my: g.y, lat: g.lat, lon: g.lon, id: `bcgnis-${g.id}` });
  }
  /* Ancla estable de cada lugar dentro de la página de su subdivisión (/<subdivisión>#lugar-<nombre>) */
  for (const o of comunidades) {
    const hermanos = (porCodigo.get(o.m).comunidades ||= []);
    const base = `lugar-${slug(o.n) || String(o.id).toLowerCase()}`;
    let ancla = base;
    for (let k = 2; hermanos.some((h) => h.ancla === ancla); k++) ancla = `${base}-${k}`;
    o.ancla = ancla;
    hermanos.push(o);
  }

  return {
    meta: { consultado: J.consultado, anioEstimaciones: ANIO },
    regiones: Object.fromEntries(Object.entries(J.er).map(([k, v]) => [k, v.split(" / ")[0]])),
    mapa,
    items: [...items, ...comunidades],
    porCodigo,
    epa: J.epa,
    cmhc: J.cmhc,
    provincia: J.provincia,
    distritosCenso: J.distritos_censo,
    estRD: est,
    escuelas: J.escuelas.filas.map((f) => objeto(J.escuelas.campos, f)),
    hospitales: J.hospitales.map((f) => objeto(J.hospitales_campos, f)),
    abms: { municipios: J.municipios.length, areas: J.areas_electorales.length, distritos: J.distritos.length },
  };
}

/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales y lugares designados); Gobierno de Columbia Británica: BC Geographical Names y límites legales",
  poblacion: "Censo 2021",
  regiones: "8 regiones económicas",
  regionEtiqueta: "Región económica",
  subregion: "Distrito regional",
  tipoEtiqueta: "Tipo de localidad",
  ejemplo: "Kelowna",
  extendido: true,
  notaFichas: "Las demás localidades tienen, por ahora, una página con información básica: clasificación oficial, distrito regional, población del Censo 2021, empleo de su región, escuelas, hospital más cercano y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const n = (g) => L.items.filter((r) => TIPOS[r.t].grupo === g).length;
    return `<p>Investiga las localidades de Columbia Británica antes de decidir dónde vivir, trabajar o estudiar. El directorio reúne <strong>${miles(n("municipio") + n("rural") + n("indigena"))} subdivisiones censales</strong> del Censo 2021, que cubren toda la provincia, y <strong>${miles(n("comunidad"))} comunidades y lugares</strong> con nombre oficial que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Municipios</strong> (ciudades, municipios de distrito, pueblos y villas): tienen su propio gobierno local.</li>
        <li><strong>Áreas electorales</strong>: el territorio rural no incorporado de cada distrito regional, que actúa como su gobierno local.</li>
        <li><strong>Tierras de Primeras Naciones</strong>: reservas y otras tierras con su clasificación oficial en el censo. Se respetan sus nombres oficiales.</li>
        <li><strong>Comunidades y lugares no incorporados</strong>: no son municipios; aparecen dentro de la subdivisión censal en la que están.</li>
      </ul>`;
  },
  nota: (L) => `Total: ${miles(L.items.length)} localidades. Las regiones son las 8 regiones económicas oficiales de Statistics Canada (2021) y los distritos regionales, los ${miles(L.abms.distritos - 1)} de la provincia más el Stikine (región no incorporada) y Northern Rockies (municipio regional). No hay un inventario oficial completo de asentamientos informales o históricos: solo se incluyen lugares registrados en fuentes oficiales. La lista del Ministerio de Vivienda y Asuntos Municipales (6 de agosto de 2026) cuenta 161 municipios porque incluye el ${IGD_NOMBRE}, que el Censo 2021 clasifica como distrito de gobierno indígena: aquí aparece entre las tierras de las Primeras Naciones («Sechelt (Part)», en dos partes). El District of Okanagan Falls se incorpora el 6 de noviembre de 2026; mientras las fuentes oficiales de límites y población no lo incluyan, Okanagan Falls figura como comunidad del área electoral Okanagan-Similkameen D.`,
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.perfil, esc)}; ${fuente(FUENTES.dpl, esc)}; ${fuente(FUENTES.nombres, esc)}; ${fuente(FUENTES.abms, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
function filaCmhc(L, archivo, centro, hoja_) {
  const t = (L.cmhc[archivo] && L.cmhc[archivo].hojas[hoja_]) || [];
  return t.find((f) => f[0] === centro) || null;
}
const DIAS = (n) => (n === 1 ? "1 km" : `${miles(Math.round(n))} km`);
/* 1234.5 → «1,234.5» (formato del sitio: coma de miles y punto decimal, como en el censo) */
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };

/* Hora local según el comunicado oficial del 2-3-2026 (2026AG0013-000209): BC usa la hora del Pacífico (PCT, UTC−7)
   todo el año; el noreste (Peace River y las Montañas Rocosas del norte) sigue con la hora estándar de la montaña
   (UTC−7, la misma), salvo Fort Ware (Kwadacha), que usa la del Pacífico; el sureste (East Kootenay y la región de
   Golden) sigue a Alberta, que desde el 18-6-2026 usa UTC−6 todo el año: el distrito regional de East Kootenay lo
   adoptó el 14-8-2026 y el pueblo de Golden el 22-9-2026 (base de datos horaria IANA, comentarios de Columbia
   Británica, con las actas citadas). Cada gobierno local puede cambiar su práctica. */
/* Lista de municipios del Ministerio de Vivienda y Asuntos Municipales (6-8-2026): 161, porque incluye este distrito,
   que el Censo 2021 clasifica como «Indian Government District» (dos partes: Sechelt (Part) en qathet y en Sunshine Coast) */
const IGD_NOMBRE = "shíshálh Nation Government District";
/* Okanagan Falls (lugar no incorporado del área electoral D de Okanagan-Similkameen) se incorpora el 6-11-2026 */
const OKANAGAN_FALLS_AREA = "5907047";
const SURESTE = new Set(["5939007", "5939011"]); /* Golden y el área electoral A de Columbia-Shuswap (región de Golden) */
function zonaHoraria(r) {
  const pct = "Hora del Pacífico (PCT), UTC−7 todo el año";
  if (r.cd === "5901" || SURESTE.has(r.c))
    return "Hora de Alberta, UTC−6 todo el año: una hora más que el resto de BC. <small class=\"cd-fact__period\">El sureste (East Kootenay y la región de Golden) sigue a Alberta, según el Gobierno de BC; desde 2026 Alberta no cambia la hora, y el distrito regional de East Kootenay (14 de agosto de 2026) y el pueblo de Golden (22 de septiembre de 2026) adoptaron UTC−6 todo el año. Cada gobierno local puede cambiar su práctica.</small>";
  if (r.c === "5955807") return `${pct}. <small class="cd-fact__period">Fort Ware (Kwadacha) usa la hora del Pacífico, a diferencia de otras comunidades del noreste.</small>`;
  if (r.cd === "5955" || r.cd === "5959")
    return "Hora estándar de la montaña (UTC−7) todo el año, que coincide con la hora del Pacífico del resto de BC. <small class=\"cd-fact__period\">Así lo indica el Gobierno de BC para el noreste (Peace River y las Montañas Rocosas del norte); cada gobierno local puede cambiar su práctica.</small>";
  return pct;
}

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const grupo = tipo.grupo;
  const region = nombreRegion(L.regiones[r.r]);
  const epa = L.epa[EPA_GEO[r.r]];
  const consultado = fechaEs(L.meta.consultado);
  const f = r.ficha ? FICHAS[r.s] : null;
  const denom = `${tipo.es} (${tipo.en})`;
  const nombre = r.n;

  const titulo = r.ficha ? `${nombre}, Columbia Británica: guía para inmigrantes y recién llegados` : `${nombre}, Columbia Británica: información básica`;
  const que = grupo === "municipio" ? "un municipio" : grupo === "rural" ? "un área electoral (territorio rural) del distrito regional" : "una subdivisión censal de tierras de Primeras Naciones";
  const descripcion = r.ficha
    ? `${r.nBase ? `${nombre}, en Columbia Británica,` : `${nombre} (Columbia Británica)`} en datos: población, empleo, alquileres, escuelas, hospitales, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} ${grupo === "rural" ? r.distrito : `de Columbia Británica (${tipo.es}, ${tipo.en})`}. Clasificación oficial, distrito regional, población del Censo 2021 y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  const datos = [
    fila("Clasificación oficial", `${esc(denom)} <small class="cd-fact__period">Tipo de subdivisión censal: ${esc(tipo.censo)}${r.legal ? ` · Nombre legal: ${esc(r.legal)}` : ""}${r.n !== r.censoNombre ? ` · En el Censo 2021: ${esc(r.censoNombre)}` : ""}</small>`),
    fila(r.cd === "5959" ? "Área geográfica" : r.cd === "5957" ? "Región" : "Distrito regional", esc(r.distrito)),
    fila("Región económica", esc(region)),
    r.cma ? fila("Área metropolitana o aglomeración", `${esc(r.cma)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Población", pob),
    r.est ? fila(`Población estimada, ${esc(L.meta.anioEstimaciones)}`, `${miles(r.est.v)} <small class="cd-fact__period">Estimación de BC Stats al 1 de julio de ${esc(L.meta.anioEstimaciones)} (no es un censo)</small>`) : "",
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    fila("Zona horaria", zonaHoraria(r)),
  ].filter(Boolean).join("\n          ");

  /* --- Comunidades y lugares dentro de la subdivisión --- */
  const lista = (r.comunidades || []).slice().sort((x, y) => x.n.localeCompare(y.n, "es"));
  const porTipo = {};
  for (const x of lista) (porTipo[x.t] ||= []).push(x);
  const comunidades = lista.length
    ? `<p>Dentro de ${esc(nombre)} hay ${miles(lista.length)} ${lista.length === 1 ? "comunidad o lugar con nombre oficial" : "comunidades y lugares con nombre oficial"}. No son municipios: forman parte de ${esc(nombre)}.</p>
      ${Object.entries(porTipo)
        .map(([t, xs]) => `<h3>${esc(TIPOS[t].plural.replace(/^./, (m) => m.toUpperCase()))} (${xs.length})</h3>
      <p class="cd-loc-comunidades">${xs.map((x) => `<span class="cd-loc-lugar" id="${x.ancla}">${esc(x.n)}${typeof x.p === "number" ? ` <small>(${miles(x.p)} hab., Censo 2021)</small>` : ""}</span>`).join(" · ")}</p>`)
        .join("\n      ")}
      <p class="cd-indicator__src">Fuentes: ${fuente(FUENTES.dpl, esc)}; ${fuente(FUENTES.nombres, esc)}. Cada lugar se ubicó en la subdivisión censal que contiene sus coordenadas oficiales.</p>`
    : "";

  /* --- Empleo (región económica) --- */
  const empleo = empleoRegional({
    epa,
    nombre,
    nombreEpa: (EPA_GEO[r.r] || "").replace(", British Columbia", "").replace(/-/g, "–"),
    nota: r.r === "5960" || r.r === "5970" ? " (Statistics Canada publica North Coast y Nechako juntas)" : "",
    esc,
    consultado,
    fuentes: FUENTES,
  });
  const busqueda = r.ficha
    ? [{ label: `Job Bank — Empleos en ${f.nombre.replace(/ \(.*\)$/, "")}`, href: `https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=${encodeURIComponent(f.nombre.replace(/ \(.*\)$/, "")).replace(/%20/g, "+")}%2C+BC` }, ...RECURSOS.empleo.slice(1)]
    : RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = "";
  if (f) {
    const [archivo, centro, etiqueta] = f.cmhc;
    const alquiler = filaCmhc(L, archivo, centro, "Table 1.1.2");
    const vacancia = filaCmhc(L, archivo, centro, "Table 1.1.1");
    if (alquiler && vacancia) vivienda = viviendaCmhc({ cmhc: { alquiler, vacancia }, centro: etiqueta, esc, fuenteCmhc: FUENTES.cmhc });
  }
  if (!vivienda) vivienda = `<p>${NO_DISPONIBLE}: CMHC no publica alquileres para esta localidad en su encuesta anual. Consulta los centros urbanos de la provincia en la <a href="/canada-en-datos/british-columbia#vivienda">guía de Columbia Británica</a>.</p>`;
  vivienda += r.alquiler
    ? `\n      <div class="cd-indicators">
        <div class="cd-indicator">
          <p class="cd-indicator__label">Costo mensual mediano de la vivienda de los hogares que alquilan</p>
          <p class="cd-indicator__value">$${miles(r.alquiler)} al mes</p>
          <p class="cd-indicator__src">Censo 2021: dato histórico (refleja 2021, no los alquileres actuales). Incluye alquiler y servicios como electricidad, calefacción y agua. Fuente: ${fuente(FUENTES.perfil, esc)}.</p>
        </div>
      </div>`
    : "";
  vivienda += `\n      <p>El aumento máximo de alquiler permitido para 2027 es de 2.2%, y solo se puede subir una vez cada 12 meses con al menos tres meses de aviso. Antes de alquilar, conoce tus derechos:</p>
      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas (registro del Ministerio de Educación) --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c);
  let escuelas;
  if (escs.length) {
    const pub = escs.filter((e) => e.SCHOOL_CATEGORY === "Public School").length;
    const ind = escs.filter((e) => e.SCHOOL_CATEGORY === "Independent School").length;
    const otras = escs.length - pub - ind;
    const distritos = new Map();
    for (const e of escs) if (e.SCHOOL_CATEGORY === "Public School" && e.DISTRICT_NAME) distritos.set(`${e.DISTRICT_NUMBER}|${e.DISTRICT_NAME}`, (distritos.get(`${e.DISTRICT_NUMBER}|${e.DISTRICT_NAME}`) || 0) + 1);
    const franco = escs.filter((e) => e.FRANCOPHONE_PROGRAM_OFFERED === "YES").length;
    const inmersion = escs.filter((e) => e.EARLY_FRENCH_IMMERSION_OFFERED === "YES" || e.LATE_FRENCH_IMMERSION_OFFERED === "YES").length;
    escuelas = `<p>El registro del Ministerio de Educación de BC ubica ${miles(escs.length)} ${escs.length === 1 ? "escuela" : "escuelas"} de kindergarten a grado 12 en ${esc(nombre)}: ${miles(pub)} ${pub === 1 ? "pública" : "públicas"}${ind ? ` y ${miles(ind)} ${ind === 1 ? "independiente (privada)" : "independientes (privadas)"}` : ""}${otras ? `, y ${miles(otras)} de otro tipo` : ""}.</p>
      ${distritos.size ? `<h3>Distritos escolares con escuelas públicas en ${esc(nombre)}</h3>
      <ul class="cd-list-items">
        ${[...distritos.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => { const [num, nom] = k.split("|"); return `<li>Distrito escolar n.º ${esc(num)} (${esc(nom)}): ${n} ${n === 1 ? "escuela" : "escuelas"}</li>`; }).join("\n        ")}
      </ul>` : ""}
      ${franco || inmersion ? `<p>${franco ? `${miles(franco)} ${franco === 1 ? "ofrece" : "ofrecen"} el programa francófono` : ""}${franco && inmersion ? " y " : ""}${inmersion ? `${miles(inmersion)} ${inmersion === 1 ? "ofrece" : "ofrecen"} inmersión en francés` : ""}, según el mismo registro.</p>` : ""}
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}, consultado el ${esc(consultado)}. La escuela se ubicó en la subdivisión censal que contiene su dirección; los nombres de los distritos aparecen tal como figuran en el registro. Para inscribir a tus hijos, comunícate con el distrito escolar de tu zona.</p>`;
  } else {
    escuelas = `<p>El registro del Ministerio de Educación de BC no ubica escuelas de kindergarten a grado 12 dentro de ${esc(nombre)}; las más cercanas pueden estar en una localidad vecina. Para inscribir a tus hijos, comunícate con el distrito escolar de tu zona.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}, consultado el ${esc(consultado)}.</p>`;
  }

  /* --- Salud --- */
  const hs = L.hospitales.filter((h) => h.csd === r.c).sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
  let salud;
  if (hs.length) {
    salud = `<p>Hospitales registrados por HealthLink BC en ${esc(nombre)}. En una emergencia, llama al 911. Para consejos de salud las 24 horas, llama gratis al 8-1-1.</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(h.nombre)}${h.horario && /24 hours/i.test(h.horario) ? " — urgencias abiertas las 24 horas, según el registro" : ""}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Los nombres aparecen tal como figuran en el registro. Confirma servicios y horarios antes de ir.</p>`;
  } else {
    const cerca = L.hospitales.map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
    salud = `<p>El registro de HealthLink BC no tiene hospitales dentro de ${esc(nombre)}. El hospital registrado más cercano a su punto de referencia es <strong>${esc(cerca.h.nombre)}</strong>${cerca.h.localidad ? `, en ${esc(cerca.h.localidad)}` : ""}, a unos ${DIAS(cerca.d)} en línea recta (la distancia por carretera puede ser mucho mayor). En una emergencia, llama al 911. Para consejos de salud las 24 horas, llama gratis al 8-1-1.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancia calculada con las coordenadas oficiales.</p>`;
  }

  /* --- Transporte --- */
  const transporte = f && f.transporte
    ? `<p>Información oficial de transporte público:</p>${enlaces(f.transporte, esc)}`
    : `<p>${NO_DISPONIBLE} en esta página. Consulta el sitio oficial del municipio o del distrito regional. Fuera de Metro Vancouver, el transporte público de muchas comunidades lo presta <a href="https://www.bctransit.com/" target="_blank" rel="noopener">BC Transit</a>.</p>`;

  const recien = `<p>Los servicios para recién llegados financiados por el Gobierno de BC y por el Gobierno de Canadá son gratuitos para quienes cumplen sus requisitos; cada organización indica a quién puede atender. Busca los más cercanos:</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la <a href="/canada-en-datos/british-columbia#recien-llegado">guía de primeros pasos en Columbia Británica</a>.</p>`;
  const familias = `<p>Estos son recursos provinciales y federales: se aplican en toda Columbia Británica, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia.</p>
      ${enlaces(RECURSOS.familias, esc)}
      <p>Más información en la sección de <a href="/canada-en-datos/british-columbia#beneficios">beneficios de la guía de Columbia Británica</a>.</p>`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f ? [{ label: `Sitio oficial de ${f.nombre.replace(/ \(.*\)$/, r.legal ? "" : "")}${r.legal ? ` (${r.legal})` : ""}`, href: f.web }] : []),
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
    grupo === "municipio" ? { label: "Gobierno de BC — Municipios de Columbia Británica", href: FUENTES.municipios.url } : { label: "Gobierno de BC — Distritos regionales y áreas electorales", href: FUENTES.distritos.url },
  ];
  const fuentes = [FUENTES.csd, FUENTES.perfil, FUENTES.censo, FUENTES.er, ...(r.legal ? [FUENTES.abms] : []), ...(r.est ? [FUENTES.estimaciones] : []), ...(lista.length ? [FUENTES.dpl, FUENTES.nombres] : []), ...(epa ? [FUENTES.epa, FUENTES.industrias] : []), ...(f ? [FUENTES.cmhc] : []), FUENTES.escuelas, FUENTES.hospitales, FUENTES.hora, FUENTES.horaRegiones, ...(r.t === "igd" ? [FUENTES.listaMunicipios] : []), ...(r.c === OKANAGAN_FALLS_AREA ? [FUENTES.okanaganFalls] : [])];

  const intro = {
    municipio: `${nombre} es ${tipo.es === "Ciudad" ? "una ciudad" : `un municipio clasificado como ${tipo.es.toLowerCase()}`} (${tipo.en})${r.cd === "5959" ? "" : ` en el área del ${r.distrito}`}, en la región económica ${region}.${typeof r.p === "number" ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : ""}`,
    rural: `${nombre} es un área electoral del ${r.distrito}: territorio rural no incorporado (no es un municipio), cuyo gobierno local es el distrito regional. Está en la región económica ${region}.${typeof r.p === "number" ? ` En el Censo 2021 tenía ${miles(r.p)} habitantes.` : ""}${r.c === OKANAGAN_FALLS_AREA ? " Según el Gobierno de BC, la comunidad de Okanagan Falls, dentro de esta área, se incorpora como municipio (District of Okanagan Falls) el 6 de noviembre de 2026; los datos de esta página son anteriores a ese cambio." : ""}`,
    indigena:
      r.t === "igd"
        ? `${nombre} es una de las dos partes en que el Censo 2021 de Statistics Canada divide el ${IGD_NOMBRE} (en el censo, «Sechelt», ${tipo.es.toLowerCase()} o ${tipo.en}); esta parte está en el área del ${r.distrito}, en la región económica ${region}. El censo no lo clasifica como municipio, pero la lista oficial del Ministerio de Vivienda y Asuntos Municipales lo cuenta entre los 161 municipios de la provincia. Para información sobre la comunidad, consulta directamente a la shíshálh Nation.`
        : `${nombre} figura en el Censo 2021 de Statistics Canada como ${tipo.es.toLowerCase()} (${tipo.en}), en el área del ${r.distrito} y la región económica ${region}. No es un municipio. Para información sobre la comunidad, consulta directamente a la Primera Nación correspondiente.`,
  }[grupo];
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la ciudad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Columbia Británica · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro: intro + cierre,
    datos,
    ubicacion: `Ubicación aproximada en el ${esc(r.distrito)}, región económica ${esc(region)}. Mapa elaborado con los límites de las divisiones censales de Statistics Canada (copia oficial del Gobierno de BC).`,
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
  slug: "british-columbia",
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
