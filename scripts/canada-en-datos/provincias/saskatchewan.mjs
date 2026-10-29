/*
  provincias/saskatchewan.mjs — Directorio de localidades de Saskatchewan
  ========================================================================
  Criterio de inclusión (documentado en el repositorio interno):
  - Una página por cada subdivisión censal (CSD) de Saskatchewan en el Censo
    2021 de Statistics Canada: 951 en total, que cubren toda la provincia y
    tienen un código estable de 7 dígitos (la suma de su población es la de
    la provincia, 1,132,505):
      · 457 municipios urbanos (ciudades, pueblos, villas y villas turísticas);
      · 296 municipios rurales (RM);
      · 22 municipios del norte (villas y aldeas del norte);
      · 173 tierras de Primeras Naciones con su clasificación censal
        (reservas indígenas y un asentamiento indígena);
      · 3 subdivisiones sin gobierno municipal propio (territorio no
        organizado de la división 18, el Parque Nacional Prince Albert y la
        «colonia de la Corona» de North Battleford).
  - Sin página propia, dentro del directorio y de la página de su CSD:
      · los lugares designados (DPL) del Censo 2021 —aldeas organizadas,
        municipios disueltos, asentamientos del norte y otros—, con su
        población del censo, que ya está incluida en la de su CSD;
      · los nombres oficiales de lugares poblados y de reservas de la Base
        de datos de nombres geográficos de Canadá (CGNDB), ubicados en su
        CSD por sus coordenadas oficiales.
    Un nombre que ya es una CSD o un lugar designado no se repite.
  - Las 18 divisiones censales («Division No. 1» a «Division No. 18») son
    el filtro «División censal»; las 6 regiones económicas de Statistics
    Canada, el filtro «Región económica».
  No se promete cobertura de asentamientos sin nombre oficial registrado.

  Datos (scripts/canada-en-datos/):
    sk-localidades.json   obtener-sk-localidades.py + compactar-sk.py

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";

const PROV = "Saskatchewan";

/* ---------- Clasificación oficial ----------
   Tipos de subdivisión censal (código en `censo`), de lugar designado
   (en `dpl`) y de nombre geográfico de la CGNDB (en `gn`). Los nombres
   oficiales se dejan en inglés junto al equivalente en español. */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "urbano", plural: "ciudades", censo: "CY" },
  town: { es: "Pueblo", en: "Town", grupo: "urbano", plural: "pueblos (towns)", censo: "T" },
  village: { es: "Villa", en: "Village", grupo: "urbano", plural: "villas (villages)", censo: "VL" },
  resort: { es: "Villa turística", en: "Resort Village", grupo: "urbano", plural: "villas turísticas (resort villages)", censo: "RV" },
  rm: { es: "Municipio rural", en: "Rural Municipality", grupo: "rural", plural: "municipios rurales (rural municipalities)", censo: "RM" },
  "northern-village": { es: "Villa del norte", en: "Northern Village", grupo: "norte", plural: "villas del norte (northern villages)", censo: "NV" },
  "northern-hamlet": { es: "Aldea del norte", en: "Northern Hamlet", grupo: "norte", plural: "aldeas del norte (northern hamlets)", censo: "NH" },
  reserve: { es: "Reserva indígena", en: "Indian Reserve", grupo: "indigena", plural: "reservas indígenas (Indian reserves)", censo: "IRI" },
  settlement: { es: "Asentamiento indígena", en: "Indian Settlement", grupo: "indigena", plural: "asentamientos indígenas (Indian settlements)", censo: "S-É" },
  unorganized: { es: "Territorio no organizado", en: "Unorganized", grupo: "otro", plural: "territorios no organizados (unorganized)", censo: "NO" },
  crown: { es: "Colonia de la Corona", en: "Crown Colony", grupo: "otro", plural: "colonias de la Corona (crown colonies)", censo: "CN" },
  "aldea-organizada": { es: "Aldea organizada", en: "Organized Hamlet", grupo: "comunidad", plural: "aldeas organizadas (organized hamlets)", dpl: "OHM" },
  "municipio-disuelto": { es: "Municipio disuelto", en: "Dissolved municipality", grupo: "comunidad", plural: "municipios disueltos (dissolved municipalities)", dpl: "DMU" },
  "asentamiento-norte": { es: "Asentamiento del norte", en: "Northern Settlement", grupo: "comunidad", plural: "asentamientos del norte (northern settlements)", dpl: "NS" },
  "subdivision-agrupada": { es: "Subdivisión agrupada", en: "Cluster subdivision", grupo: "comunidad", plural: "subdivisiones agrupadas (cluster subdivisions)", dpl: "CS" },
  "subdivision-turistica": { es: "Subdivisión turística", en: "Resort subdivision", grupo: "comunidad", plural: "subdivisiones turísticas (resort subdivisions)", dpl: "RS" },
  "antiguo-centro": { es: "Antiguo centro de población", en: "Retired population centre", grupo: "comunidad", plural: "antiguos centros de población (Statistics Canada)", dpl: "RPC" },
  aldea: { es: "Aldea", en: "Hamlet", grupo: "comunidad", plural: "aldeas (hamlets)", gn: "Hamlet" },
  localidad: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades (localities)", gn: "Locality" },
  "punto-ferroviario": { es: "Punto ferroviario", en: "Railway Point", grupo: "comunidad", plural: "puntos ferroviarios (railway points)", gn: "Railway Point" },
  barrio: { es: "Comunidad urbana (barrio)", en: "Urban Community", grupo: "comunidad", plural: "comunidades urbanas (barrios)", gn: "Urban Community" },
  "zona-industrial": { es: "Zona industrial", en: "Industrial Park", grupo: "comunidad", plural: "zonas industriales", gn: "Industrial Park" },
  "oficina-correos": { es: "Lugar con oficina de correos (nombre histórico)", en: "Post Office", grupo: "comunidad", plural: "lugares con nombre de oficina de correos", gn: "Post Office" },
  embarcadero: { es: "Embarcadero", en: "Landing", grupo: "comunidad", plural: "embarcaderos (landings)", gn: "Landing" },
  "nombre-municipal": { es: "Nombre geográfico de villa o aldea", en: "Village or Northern Hamlet (geographical name)", grupo: "comunidad", plural: "nombres registrados como villa o aldea del norte que no son subdivisiones censales" },
  "reserva-nombre": { es: "Reserva indígena (nombre geográfico)", en: "Indian Reserve", grupo: "comunidad", plural: "reservas registradas como nombre geográfico", gn: "Indian Reserve" },
};
export const GRUPOS = {
  urbano: "Municipios urbanos",
  rural: "Municipios rurales",
  norte: "Municipios del norte",
  indigena: "Tierras de Primeras Naciones (clasificación del censo)",
  otro: "Territorio sin municipio propio",
  comunidad: "Comunidades, aldeas y lugares (sin municipio propio)",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "comunidad";
const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
const POR_DPL = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.dpl).map(([k, v]) => [v.dpl, k]));
const POR_GN = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k]));
POR_GN["Industrial Area"] = "zona-industrial";
POR_GN["Organized Hamlet"] = "aldea-organizada";
POR_GN["Northern Settlement"] = "asentamiento-norte";
/* Nombres geográficos de municipios: si coinciden con una subdivisión censal no se repiten */
const GN_MUNICIPAL = new Set(["City", "Town", "Village", "Resort Village", "Northern Village", "Northern Hamlet", "District Municipality"]);

/* Regiones económicas 2021 → fila de la Encuesta de Población Activa
   (Statistics Canada publica Prince Albert y Northern juntas). */
const EPA_GEO = {
  4710: "Regina-Moose Mountain, Saskatchewan",
  4720: "Swift Current-Moose Jaw, Saskatchewan",
  4730: "Saskatoon-Biggar, Saskatchewan",
  4740: "Yorkton-Melville, Saskatchewan",
  4750: "Prince Albert and Northern, Saskatchewan",
  4760: "Prince Albert and Northern, Saskatchewan",
};
const EPA_ES = {
  "Regina-Moose Mountain, Saskatchewan": "Regina–Moose Mountain",
  "Swift Current-Moose Jaw, Saskatchewan": "Swift Current–Moose Jaw",
  "Saskatoon-Biggar, Saskatchewan": "Saskatoon–Biggar",
  "Yorkton-Melville, Saskatchewan": "Yorkton–Melville",
  "Prince Albert and Northern, Saskatchewan": "Prince Albert y Northern",
};

/* Código de subdivisión → nombre visible, URL y variantes de búsqueda. Lloydminster y Flin Flon son ciudades
   partidas por el límite provincial: la subdivisión censal es solo la parte de Saskatchewan. La colonia de la
   Corona de North Battleford comparte nombre con la ciudad. */
const NOMBRE_VISIBLE = {
  4717029: ["Lloydminster (parte de Saskatchewan)", "lloydminster", ["Lloydminster"]],
  4718052: ["Flin Flon (parte de Saskatchewan)", "flin-flon", ["Flin Flon"]],
  4716027: ["North Battleford (colonia de la Corona)", "north-battleford-crown-colony", []],
};

/* ---------- Fichas completas ----------
   Regina (capital), Saskatoon (la ciudad más poblada) y las seis ciudades con encuesta de alquileres de CMHC
   en su aglomeración: Prince Albert, Moose Jaw, Swift Current, Yorkton, North Battleford y la parte de
   Saskatchewan de Lloydminster. Agencias de asentamiento: lista del Gobierno de Saskatchewan (Settlement
   Services, consultada el 29-10-2026). Enlaces comprobados antes de publicar. */
const ASENTAMIENTO = { label: "Gobierno de Saskatchewan — Agencias de asentamiento (Regional Newcomer Gateways) por ciudad", href: "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/language-training-and-settlement-services/settlement-services" };
export const FICHAS = {
  regina: {
    nombre: "Regina",
    web: "https://www.regina.ca/",
    cmhc: ["regina", "Regina City (Zones 1-7)", "Regina CMA", "la ciudad de Regina (zonas 1 a 7 de CMHC)"],
    transporte: [{ label: "Regina Transit — Rutas, horarios y tarifas", href: "https://www.regina.ca/transportation-roads-parking/transit/" }],
    agencias: ["Regina Open Door Society", "RIWC Regina Immigrant Women Centre", "International Women of Saskatoon (oficina de Regina)"],
    agenciasEnlaces: [{ label: "Regina Open Door Society", href: "https://rods.sk.ca/" }, { label: "RIWC Regina Immigrant Women Centre", href: "https://reginaiwc.ca/" }],
  },
  saskatoon: {
    nombre: "Saskatoon",
    web: "https://www.saskatoon.ca/",
    cmhc: ["saskatoon", "Saskatoon City (Zones 1-7)", "Saskatoon CMA", "la ciudad de Saskatoon (zonas 1 a 7 de CMHC)"],
    transporte: [{ label: "Saskatoon Transit — Rutas, horarios y tarifas", href: "https://saskatoontransit.ca/" }],
    agencias: ["Saskatoon Open Door Society", "International Women of Saskatoon"],
    agenciasEnlaces: [{ label: "Saskatoon Open Door Society", href: "https://sods.sk.ca/" }],
  },
  "prince-albert": {
    nombre: "Prince Albert",
    web: "https://www.citypa.ca/",
    cmhc: ["saskatchewan", "Prince Albert CA", "Prince Albert CA", "la aglomeración de Prince Albert"],
    transporte: [{ label: "Ciudad de Prince Albert — Prince Albert Transit (rutas, horarios y tarifas)", href: "https://www.citypa.ca/parking-streets-and-transportation/transit/" }],
    agencias: ["Prince Albert Multicultural Council", "YWCA Prince Albert"],
    agenciasEnlaces: [{ label: "Prince Albert Multicultural Council", href: "https://www.pamcsk.com/" }],
    servicios: [
      { label: "Basura y reciclaje", href: "https://www.citypa.ca/living-in-our-community/garbage-and-recycling/" },
      { label: "Agua y alcantarillado (pago de la factura)", href: "https://www.citypa.ca/living-in-our-community/water-and-sewer-services/" },
      { label: "Impuesto a la propiedad", href: "https://www.citypa.ca/living-in-our-community/property-taxes/" },
      { label: "Reportar un problema", href: "https://www.citypa.ca/city-hall/report-a-concern/" },
      { label: "Directorio de contactos", href: "https://www.citypa.ca/contacts-directory/" },
    ],
  },
  "moose-jaw": {
    nombre: "Moose Jaw",
    web: "https://moosejaw.ca/",
    cmhc: ["saskatchewan", "Moose Jaw CA", "Moose Jaw CA", "la aglomeración de Moose Jaw"],
    transporte: [{ label: "Ciudad de Moose Jaw — Transporte público (horarios)", href: "https://moosejaw.ca/transit/" }],
    agencias: ["Moose Jaw Multicultural Council"],
    agenciasEnlaces: [
      { label: "Moose Jaw Multicultural Council", href: "https://mjmcinc.ca/" },
      { label: "Ciudad de Moose Jaw — Guía para inmigrantes: asentamiento, empleo, vivienda, salud y educación", href: "https://moosejaw.ca/immigration-immigration-and-settlement-services/" },
    ],
    servicios: [
      { label: "Servicios públicos (agua y alcantarillado)", href: "https://moosejaw.ca/utilities/" },
      { label: "Pagar impuestos y servicios en línea", href: "https://moosejaw.ca/pay-utilities/" },
      { label: "Basura y reciclaje", href: "https://moosejaw.ca/letstalktrash/" },
      { label: "Reportar un problema", href: "https://moosejaw.ca/report-an-issue/" },
      { label: "Contacto", href: "https://moosejaw.ca/contact-us/" },
    ],
  },
  "swift-current": {
    nombre: "Swift Current",
    web: "https://www.swiftcurrent.ca/",
    cmhc: ["saskatchewan", "Swift Current CA", "Swift Current CA", "la aglomeración de Swift Current"],
    transporte: [{ label: "Ciudad de Swift Current — Swift Transit", href: "https://www.swiftcurrent.ca/divisions/engineering-infrastructure/transportation-services/swift-transit" }],
    agencias: ["Southwest Newcomer Welcome Centre"],
    agenciasEnlaces: [{ label: "Southwest Newcomer Welcome Centre", href: "https://www.newcomerwelcomecentre.com/" }],
    escuelas: [{ label: "Great Plains College — Campus de Swift Current", href: "https://www.greatplainscollege.ca/contact-us/swift-current" }],
    servicios: [
      { label: "Facturación de servicios públicos (agua y electricidad)", href: "https://www.swiftcurrent.ca/divisions/corporate-services/financial-services/utility-billing" },
      { label: "Impuesto a la propiedad", href: "https://www.swiftcurrent.ca/divisions/corporate-services/financial-services/taxation" },
      { label: "Consultar o reportar un problema", href: "https://www.swiftcurrent.ca/i-want-to/inquire-or-report" },
      { label: "Contacto", href: "https://www.swiftcurrent.ca/about-us/contact-us" },
    ],
  },
  yorkton: {
    nombre: "Yorkton",
    web: "https://www.yorkton.ca/",
    cmhc: ["saskatchewan", "Yorkton CA", "Yorkton CA", "la aglomeración de Yorkton"],
    transporte: [{ label: "Ciudad de Yorkton — Yorkton Transit y Access Transit", href: "https://www.yorkton.ca/living-in-yorkton/transit/" }],
    transporteNota: "Según la ciudad, Yorkton Transit está cambiando a un servicio a pedido: en lugar de rutas y horarios fijos, se reservará el viaje por aplicación, en línea o por teléfono.",
    agencias: ["East Central Newcomer Welcome Centre"],
    agenciasEnlaces: [{ label: "East Central Newcomer Welcome Centre", href: "https://eastcentralnewcomercentre.ca" }],
    servicios: [
      { label: "Basura, reciclaje y orgánicos", href: "https://www.yorkton.ca/living-in-yorkton/garbage-recycling-and-organics/" },
      { label: "Agua y alcantarillado", href: "https://www.yorkton.ca/living-in-yorkton/water-and-sewer-services/" },
      { label: "Impuesto a la propiedad", href: "https://www.yorkton.ca/our-government/property-taxes/" },
      { label: "Reportar un problema", href: "https://forms.yorkton.ca/General/Report-a-Concern" },
      { label: "Directorio de contactos", href: "https://www.yorkton.ca/contacts-directory/" },
    ],
  },
  "north-battleford": {
    nombre: "North Battleford",
    web: "https://www.cityofnb.ca/",
    cmhc: ["saskatchewan", "North Battleford CA", "North Battleford CA", "la aglomeración de North Battleford"],
    transporte: [],
    transporteNota: "No encontramos información sobre transporte público en el sitio de la ciudad; consulta en la ciudad si hay servicio de autobús.",
    agencias: ["Battlefords Immigration Resource Center"],
    agenciasEnlaces: [],
    servicios: [
      { label: "Vivienda, propiedad y servicios públicos", href: "https://www.cityofnb.ca/home-property-utilities/" },
      { label: "Basura y reciclaje", href: "https://www.cityofnb.ca/home-property-utilities/garbage-and-recycling/" },
      { label: "Impuesto a la propiedad", href: "https://www.cityofnb.ca/home-property-utilities/property-taxes/" },
      { label: "Solicitudes de servicio", href: "https://www.cityofnb.ca/home-property-utilities/service-requests/" },
      { label: "Contacto", href: "https://www.cityofnb.ca/our-city-government/contact-us/" },
    ],
  },
  lloydminster: {
    nombre: "Lloydminster (parte de Saskatchewan)",
    web: "https://www.lloydminster.ca/",
    cmhc: ["saskatchewan", "Lloydminster CA (Sask Part)", "Lloydminster CA (Sask Part)", "la parte de Saskatchewan de la aglomeración de Lloydminster"],
    transporte: [{ label: "Ciudad de Lloydminster — Calles, aceras y transporte", href: "https://www.lloydminster.ca/home-property-utilities/roads-sidewalks-and-transportation/" }],
    transporteNota: "La ciudad, que se extiende a ambos lados del límite con Alberta, publica la información de transporte en su sitio.",
    agencias: ["Lloydminster Learning Council Association"],
    agenciasEnlaces: [],
    escuelas: [{ label: "Lakeland College — Campus de Lloydminster (lado de Alberta)", href: "https://www.lakelandcollege.ca/about/campuses/lloydminster.html" }],
    servicios: [
      { label: "Servicios públicos y facturación", href: "https://www.lloydminster.ca/home-property-utilities/utilities-and-billing/" },
      { label: "Basura y reciclaje", href: "https://www.lloydminster.ca/home-property-utilities/garbage-and-recycling/" },
      { label: "Impuesto a la propiedad", href: "https://www.lloydminster.ca/home-property-utilities/property-taxes/" },
      { label: "Salud y bienestar", href: "https://www.lloydminster.ca/home-property-utilities/health-care-and-wellness/" },
      { label: "Reportar un problema", href: "https://www.lloydminster.ca/home-property-utilities/report-a-concern/" },
      { label: "Contacto", href: "https://www.lloydminster.ca/council-administration/contact-us/" },
    ],
  },
};

/* Hospitales (Statistics Canada, ODHF 2020): nombre de la base → nombre oficial. Solo los principales
   hospitales de las ciudades y del norte, todos en la lista de la Saskatchewan Health Authority (octubre de
   2026); la base mezcla clínicas, centros de salud y hospitales ya reemplazados (p. ej., el Moose Jaw Union
   Hospital). El nuevo Weyburn General Hospital recibe pacientes desde el 1 de noviembre de 2026. */
const HOSPITALES = {
  "regina general hospital": "Regina General Hospital",
  "pasqua hospital": "Pasqua Hospital",
  "royal university hospital (ruh)": "Royal University Hospital",
  "st. paul's hospital": "St. Paul's Hospital",
  "saskatoon city hospital": "Saskatoon City Hospital",
  "jim pattison children's hospital": "Jim Pattison Children's Hospital",
  "dr. f.h. wigmore regional hospital": "Dr. F.H. Wigmore Regional Hospital",
  "cypress regional hospital": "Cypress Regional Hospital",
  "victoria hospital": "Victoria Hospital",
  "battlefords union hospital": "Battlefords Union Hospital",
  "yorkton regional health centre": "Yorkton Regional Health Centre",
  "st. joseph's hospital": "St. Joseph's Hospital (Estevan)",
  "weyburn general hospital": "Weyburn General Hospital",
  "lloydminster hospital": "Lloydminster Hospital",
  "melfort hospital": "Melfort Hospital",
  "nipawin hospital": "Nipawin Hospital",
  "meadow lake hospital": "Meadow Lake Hospital",
  "la loche health centre": "La Loche Health Centre and Hospital",
  "saskatchewan hospital": "Saskatchewan Hospital North Battleford (salud mental)",
};
/* Hospitales especializados: se listan en su localidad, pero no cuentan como «el más cercano» para las demás */
const SOLO_LOCAL = new Set(["Saskatchewan Hospital North Battleford (salud mental)"]);

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales, divisiones censales, regiones económicas y lugares designados", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  dpl: { org: "Statistics Canada", title: "Tabla 98-10-0012-01 — Población de los lugares designados, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810001201" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Saskatchewan", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0393-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039301" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0392-01 — Empleo por industria y región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039201" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Statistics Canada", title: "Open Database of Educational Facilities (ODEF), versión 2.1 (2022)", url: "https://www.statcan.gc.ca/en/lode/databases/odef" },
  hospitales: { org: "Statistics Canada", title: "Open Database of Healthcare Facilities (ODHF), versión 1.1 (2020)", url: "https://www.statcan.gc.ca/en/lode/databases/odhf" },
  hora: { org: "IANA", title: "Base de datos de zonas horarias (America/Regina): hora central, UTC−6 todo el año", url: "https://www.iana.org/time-zones" },
  leyHora: { org: "Asamblea Legislativa de Saskatchewan", title: "Proyecto de ley 58 — The Time Act, 2026 (entra en vigor el 30 de octubre de 2026, decreto OC 438/2026)", url: "https://docs.legassembly.sk.ca/legdocs/Bills/30L2S/Bill30-58.pdf" },
};
const RECURSOS = {
  empleo: [
    { label: "SaskJobs — Ofertas de empleo en Saskatchewan", href: "https://www.saskjobs.ca/" },
    { label: "Job Bank — Buscar empleo en Saskatchewan", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Saskatchewan" },
  ],
  escuelas: [
    { label: "Gobierno de Saskatchewan — Educación preescolar a grado 12 y divisiones escolares", href: "https://www.saskatchewan.ca/residents/education-and-learning/prek-12-education-early-learning-and-schools" },
  ],
  salud: [
    { label: "eHealth Saskatchewan — Solicitar la tarjeta de salud", href: "https://www.ehealthsask.ca/residents/health-cards/apply-for-a-health-card" },
    { label: "Gobierno de Saskatchewan — HealthLine 811", href: "https://www.saskatchewan.ca/residents/health/accessing-health-care-services/healthline" },
    { label: "Saskatchewan Health Authority", href: "https://www.saskhealthauthority.ca/" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
  ],
  familias: [
    { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
  ],
  vivienda: [
    { label: "Gobierno de Saskatchewan — Alquiler de vivienda (derechos de inquilinos y propietarios)", href: "https://www.saskatchewan.ca/residents/housing-and-renting/renting-and-leasing" },
  ],
};

/* ---------- Utilidades ---------- */
/* Variantes de escritura para el buscador: sin apóstrofo, sin punto, sin guiones (Île-à-la-Crosse → Île à la Crosse),
   con «Saint», con «and» en lugar de «&» y sin «No.» en los municipios rurales (Moose Jaw No. 161 → Moose Jaw 161).
   No son nombres oficiales. */
const variantes = (n) =>
  [...new Set([n.replace(/['’]/g, ""), n.replace(/['’]/g, " "), n.replace(/\./g, ""), n.replace(/-/g, " "), n.replace(/\bSt\.\s*/g, "Saint "), n.replace(/&/g, "and"), n.replace(/\bNo\.\s*/g, "")])].filter((v) => v !== n);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
/* Números de una reserva («96 & 97-A» → «96,97a»): sirven para reconocer la misma reserva escrita de otra forma */
const numeros = (s) => (s.toLowerCase().replace(/(\d+)\s*-\s*([a-z])\b/g, "$1$2").match(/\d+[a-z]?\b/g) || []).sort().join(",");
const objeto = (campos, fila_) => Object.fromEntries(campos.map((c, i) => [c, fila_[i]]));
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
function km(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
/* «Division No.  1» → «División n.º 1» */
const division = (n) => n.replace(/^Division No\.\s+(\d+)$/, "División n.º $1");

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
  const J = JSON.parse(readFileSync(join(base, "sk-localidades.json"), "utf8"));
  const censo = (v) => Object.fromEntries(J.censo_campos.map((k, i) => [k, num(v[i])]));
  const csd = J.csd.map((f) => objeto(J.csd_campos, f));
  const divisiones = Object.fromEntries(J.divisiones.map(([id, n, er, v]) => [id, { id, n: division(n), er, ...censo(v) }]));

  /* Encuadre del mapa (metros, EPSG:3347) */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (geo, fn) => (geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates).forEach((p) => p.forEach((q) => q.forEach(([x, y]) => fn(x, y))));
  for (const g of Object.values(J.cd_geo)) recorre(g, (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))));
  const ANCHO = 600, MARGEN = 6;
  const escala = (ANCHO - 2 * MARGEN) / (x1 - x0);
  const alto = Math.ceil((y1 - y0) * escala + 2 * MARGEN);
  const a = (x, y) => [Math.round(((x - x0) * escala + MARGEN) * 10) / 10, Math.round(((y1 - y) * escala + MARGEN) * 10) / 10];
  const mapa = { ancho: ANCHO, alto, regiones: J.divisiones.map(([id, n, er]) => ({ r: er, n: division(n), d: trazo(J.cd_geo[id], a) })) };

  /* --- Subdivisiones censales: una página cada una --- */
  const items = [];
  for (const c of csd) {
    const t = POR_CENSO[c.tipo];
    if (!t) throw new Error(`Tipo de subdivisión censal sin clasificar: ${c.tipo} (${c.nombre})`);
    const dv = divisiones[c.cd];
    if (!dv) throw new Error(`Subdivisión sin división censal: ${c.nombre}`);
    if (dv.er !== c.er) throw new Error(`${c.nombre}: región económica distinta de la de su división censal`);
    const d = censo(c.censo);
    const [xx, yy] = a(c.x, c.y);
    const [visible, s, extra] = NOMBRE_VISIBLE[c.id] || [c.nombre, null, []];
    items.push({
      c: c.id,
      n: visible,
      censoNombre: c.nombre,
      sFija: s,
      alias: [...new Set([...variantes(c.nombre), ...extra, ...(visible !== c.nombre ? [c.nombre] : [])])],
      t,
      r: c.er,
      cd: c.cd,
      sup: dv.n,
      division: dv.n,
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
    });
  }

  /* Nombres de URL: el nombre; si se repite, el municipio urbano conserva el corto y el otro lleva el tipo en inglés */
  const PRIORIDAD = { urbano: 0, norte: 1, rural: 2, indigena: 3, otro: 4 };
  const porSlug = new Map();
  for (const r of items) {
    const k = r.sFija || slug(r.n);
    (porSlug.get(k) || porSlug.set(k, []).get(k)).push(r);
  }
  for (const [k, grupo] of porSlug) {
    grupo.sort((m, n) => PRIORIDAD[TIPOS[m.t].grupo] - PRIORIDAD[TIPOS[n.t].grupo] || (n.p || 0) - (m.p || 0));
    grupo.forEach((r, i) => (r.s = i === 0 ? k : `${k}-${slug(TIPOS[r.t].en)}`));
  }
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error("Nombres de URL repetidos en Saskatchewan");
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r || r.t !== "city") throw new Error(`Ficha completa sin ciudad: ${k}`);
    if (FICHAS[k].nombre !== r.n) throw new Error(`Nombre de la ficha distinto del de la localidad: ${k}`);
    r.ficha = true;
  }

  /* --- Lugares designados, comunidades y nombres geográficos (sin página propia) --- */
  const nombresCsd = new Set(items.flatMap((r) => [norm(r.censoNombre), ...r.alias.map(norm)]));
  const comunidades = [];
  const vistos = new Set();
  const agrega = (o) => {
    const padre = porCodigo.get(o.m);
    if (!padre) throw new Error(`${o.n}: subdivisión ${o.m} inexistente`);
    const k = `${norm(o.n)}|${o.m}`;
    if (vistos.has(k) || norm(o.n) === norm(padre.censoNombre) || norm(o.n) === norm(padre.n)) return false;
    vistos.add(k);
    const [xx, yy] = a(o.mx, o.my);
    comunidades.push({ n: o.n, alias: variantes(o.n), t: o.t, m: o.m, r: padre.r, sup: padre.sup, x: xx, y: yy, lat: o.lat, lon: o.lon, p: o.p ?? null, p16: o.p16 ?? null, id: o.id });
    return true;
  };

  /* 1. Lugares designados de Statistics Canada (con población del Censo 2021, incluida en la de su subdivisión) */
  const designados = [];
  for (const f of J.dpl) {
    const d = objeto(J.dpl_campos, f);
    const t = POR_DPL[d.tipo];
    if (!t) throw new Error(`Tipo de lugar designado sin clasificar: ${d.tipo} (${d.nombre})`);
    const v = censo(d.censo);
    if (agrega({ n: d.nombre, t, m: d.csd, mx: d.x, my: d.y, lat: d.lat, lon: d.lon, p: v.p, p16: v.p16, id: d.uid })) designados.push({ n: norm(d.nombre), lat: d.lat, lon: d.lon });
  }

  /* 2. Nombres geográficos oficiales (CGNDB, sin población) */
  const ORDEN_GN = ["Indian Reserve", "Northern Settlement", "Organized Hamlet", "Hamlet", "Urban Community", "Locality", "Railway Point", "Industrial Park", "Industrial Area", "Landing", "Post Office"];
  const cgn = J.cgn.map((f) => objeto(J.cgn_campos, f));
  cgn.sort((x, y) => (ORDEN_GN.indexOf(x.tipo) + 1 || 99) - (ORDEN_GN.indexOf(y.tipo) + 1 || 99));
  for (const g of cgn) {
    const padre = porCodigo.get(g.csd);
    let t = POR_GN[g.tipo];
    if (GN_MUNICIPAL.has(g.tipo)) {
      /* Ciudades, pueblos y villas que ya son una subdivisión censal; el nombre legal de un municipio
         («The District of Lakeland No. 521», «District of Katepwa») se añade a sus variantes de búsqueda */
      if (nombresCsd.has(norm(g.nombre))) continue;
      const legal = g.nombre.match(/^(?:The )?District of (.+)$/);
      if (legal && norm(padre.censoNombre) === norm(legal[1])) {
        padre.alias.push(g.nombre);
        continue;
      }
      t = "nombre-municipal";
    }
    if (!t) throw new Error(`Tipo de nombre geográfico sin clasificar: ${g.tipo} (${g.nombre})`);
    if (t === "reserva-nombre") {
      if (nombresCsd.has(norm(g.nombre))) continue;
      /* La misma reserva escrita de otra forma que su subdivisión censal («Beardy's & Okemasis 96 & 97-A») */
      if (padre.t === "reserve" && numeros(g.nombre) && numeros(g.nombre) === numeros(padre.censoNombre)) {
        padre.alias.push(g.nombre);
        continue;
      }
    }
    /* El mismo lugar ya registrado como lugar designado (a menos de 5 km) */
    if (designados.some((d) => d.n === norm(g.nombre) && km(d, g) < 5)) continue;
    agrega({ n: g.nombre, t, m: g.csd, mx: g.x, my: g.y, lat: g.lat, lon: g.lon, id: `cgn-${g.id}` });
  }
  for (const r of items) r.alias = [...new Set(r.alias)].filter((v) => v !== r.n);

  /* Ancla estable de cada lugar dentro de la página de su subdivisión (/<subdivisión>#lugar-<nombre>) */
  for (const o of comunidades) {
    const hermanos = (porCodigo.get(o.m).comunidades ||= []);
    const b = `lugar-${slug(o.n) || String(o.id).toLowerCase()}`;
    let ancla = b;
    for (let k = 2; hermanos.some((h) => h.ancla === ancla); k++) ancla = `${b}-${k}`;
    o.ancla = ancla;
    hermanos.push(o);
  }

  const hospitales = [];
  for (const f of J.salud) {
    const h = objeto(J.salud_campos, f);
    const nombre = HOSPITALES[h.nombre];
    if (nombre && !hospitales.some((x) => x.nombre === nombre)) hospitales.push({ ...h, nombre });
  }
  if (hospitales.length !== Object.keys(HOSPITALES).length) throw new Error("Faltan hospitales de la lista en la base ODHF");

  return {
    meta: { consultado: J.consultado },
    regiones: Object.fromEntries(Object.entries(J.er).map(([k, v]) => [k, v.split(" / ")[0]])),
    mapa,
    items: [...items, ...comunidades],
    porCodigo,
    epa: J.epa,
    cmhc: J.cmhc,
    provincia: censo(J.provincia),
    divisiones,
    escuelas: J.escuelas.map((f) => objeto(J.escuelas_campos, f)),
    hospitales,
  };
}

/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales, lugares designados y divisiones censales); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá",
  poblacion: "Censo 2021",
  regiones: "6 regiones económicas",
  regionEtiqueta: "Región económica",
  subregion: "División censal",
  tipoEtiqueta: "Tipo de localidad",
  ejemplo: "Moose Jaw",
  extendido: true,
  notaFichas: "Las demás localidades tienen, por ahora, una página con información básica: clasificación oficial, división censal, población del Censo 2021, empleo de su región económica, escuelas, el principal hospital más cercano y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const n = (...g) => L.items.filter((r) => g.includes(TIPOS[r.t].grupo)).length;
    return `<p>Investiga las localidades de Saskatchewan antes de decidir dónde vivir, trabajar o estudiar. El directorio reúne <strong>${miles(n("urbano", "rural", "norte", "indigena", "otro"))} subdivisiones censales</strong> del Censo 2021, que cubren toda la provincia, y <strong>${miles(n("comunidad"))} comunidades, aldeas y lugares</strong> con nombre oficial que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Municipios urbanos</strong> (ciudades, pueblos, villas y villas turísticas) y <strong>municipios rurales</strong> (rural municipalities, «RM»): tienen su propio gobierno local. Los municipios rurales cubren el campo del sur y el centro de la provincia y se identifican por su nombre y su número (por ejemplo, Sherwood No. 159).</li>
        <li><strong>Municipios del norte</strong>: villas y aldeas del norte (northern villages y northern hamlets), en el Distrito Administrativo del Norte.</li>
        <li><strong>Tierras de Primeras Naciones</strong>: reservas y un asentamiento con su clasificación oficial en el censo. Se respetan sus nombres oficiales.</li>
        <li><strong>Territorio sin municipio propio</strong>: el territorio no organizado del norte (división censal 18), el Parque Nacional Prince Albert y la subdivisión North Battleford (colonia de la Corona), distinta de la ciudad de North Battleford.</li>
        <li><strong>Comunidades, aldeas y lugares</strong>: no son municipios; aparecen dentro de la subdivisión censal en la que están. Muchas aldeas (hamlets) están dentro de un municipio rural.</li>
      </ul>`;
  },
  nota: (L) =>
    `Total: ${miles(L.items.length)} localidades. La población de los lugares designados (aldeas organizadas, municipios disueltos, asentamientos del norte y otros) proviene del Censo 2021 y ya está incluida en la de la subdivisión censal que los contiene: no se suma. Las comunidades y lugares de la Base de datos de nombres geográficos de Canadá no tienen cifras de población propias. Statistics Canada solo considera subdivisiones censales las reservas habitadas o que podrían estarlo: las demás reservas aparecen como nombres geográficos dentro de la subdivisión que las contiene. Las regiones son las 6 regiones económicas oficiales de Statistics Canada (2021); la Encuesta de Población Activa publica juntas Prince Albert y Northern. No hay un inventario oficial completo de asentamientos sin nombre registrado.`,
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.dpl, esc)}; ${fuente(FUENTES.nombres, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
function filaCmhc(L, archivo, centro, hoja_) {
  const t = (L.cmhc[archivo] && L.cmhc[archivo].hojas[hoja_]) || [];
  return t.find((f) => f[0] === centro) || null;
}
const DIST = (n) => (n < 1.5 ? "1 km" : `${miles(Math.round(n))} km`);
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };
/* Creighton, Denare Beach y la parte de Saskatchewan de Flin Flon */
const ZONA_FLIN_FLON = new Set(["4718051", "4718049", "4718052"]);
function zonaHoraria(r) {
  if (r.c === "4717029") return "Hora central, UTC−6 todo el año. Hasta el 29 de octubre de 2026, Lloydminster sigue por su carta municipal la hora de Alberta, que desde el 18 de junio de 2026 también es UTC−6 todo el año. La Time Act, 2026, que entra en vigor el 30 de octubre de 2026, fija UTC−6 en toda Saskatchewan e incluye expresamente a Lloydminster: la hora no cambia";
  if (ZONA_FLIN_FLON.has(r.c)) return "La ley fija la hora central, UTC−6, todo el año. En la práctica, esta zona sigue la hora de Flin Flon (Manitoba), UTC−5, que Manitoba mantendrá todo el año a partir del 31 de octubre de 2026. La Time Act, 2026 (en vigor el 30 de octubre de 2026) permite declarar por reglamento zonas con opción horaria; no encontramos uno para esta zona: confirma la hora local";
  return "Hora central (CST), UTC−6 todo el año: Saskatchewan no cambia la hora en verano";
}

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const grupo = tipo.grupo;
  const region = nombreRegion(L.regiones[r.r]);
  const claveEpa = EPA_GEO[r.r];
  const epa = L.epa[claveEpa];
  const consultado = fechaEs(L.meta.consultado);
  const f = r.ficha ? FICHAS[r.s] : null;
  const denom = `${tipo.es} (${tipo.en})`;
  const nombre = r.n;

  const titulo = r.ficha ? `${nombre}, Saskatchewan: guía para inmigrantes y recién llegados` : `${nombre}, Saskatchewan: información básica`;
  const que = { urbano: "un municipio", rural: "un municipio rural", norte: "un municipio del norte", indigena: "una tierra de Primera Nación", otro: "una subdivisión censal sin municipio propio" }[grupo];
  const descripcion = r.ficha
    ? `${nombre} (Saskatchewan) en datos: población, empleo, alquileres, escuelas, hospitales, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} de la ${r.division}, Saskatchewan (${tipo.es}). Clasificación oficial, población del Censo 2021 y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  const datos = [
    fila("Clasificación oficial", `${esc(denom)} <small class="cd-fact__period">Tipo de subdivisión censal: ${esc(tipo.censo)}${r.n !== r.censoNombre ? ` · En el Censo 2021: ${esc(r.censoNombre)}` : ""}</small>`),
    fila("División censal", `${esc(r.division)} <small class="cd-fact__period">Statistics Canada, Censo 2021</small>`),
    fila("Región económica", esc(region)),
    r.cma ? fila("Área metropolitana o aglomeración", `${esc(r.cma.replace(" (Saskatchewan part / partie de la Saskatchewan)", " (parte de Saskatchewan)"))} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Población", pob),
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    r.viviendas != null ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    fila("Zona horaria", zonaHoraria(r)),
  ].filter(Boolean).join("\n          ");

  /* --- Comunidades y lugares dentro de la subdivisión --- */
  const lista = (r.comunidades || []).slice().sort((x, y) => x.n.localeCompare(y.n, "es", { numeric: true }));
  const porTipo = {};
  for (const x of lista) (porTipo[x.t] ||= []).push(x);
  const conPob = lista.some((x) => typeof x.p === "number");
  const comunidades = lista.length
    ? `<p>Dentro de ${esc(nombre)} hay ${miles(lista.length)} ${lista.length === 1 ? "lugar con nombre oficial" : "lugares con nombre oficial"} (comunidades, aldeas o lugares). No son municipios: forman parte de ${esc(nombre)}.${conPob ? ` La población de los lugares designados ya está incluida en la de ${esc(nombre)}.` : ""}</p>
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
    nombreEpa: EPA_ES[claveEpa],
    nota: r.r === "4750" || r.r === "4760" ? " (Statistics Canada publica juntas las regiones Prince Albert y Northern)" : "",
    esc,
    consultado,
    fuentes: FUENTES,
  });
  const busqueda = RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = "";
  if (f) {
    const [archivo, centro, , etiqueta] = f.cmhc;
    const alquiler = filaCmhc(L, archivo, centro, "Table 1.1.2");
    const vacancia = filaCmhc(L, archivo, centro, "Table 1.1.1");
    if (alquiler && vacancia) vivienda = viviendaCmhc({ cmhc: { alquiler, vacancia }, centro: etiqueta, esc, fuenteCmhc: FUENTES.cmhc });
  }
  if (!vivienda) vivienda = `<p>${NO_DISPONIBLE}: esta página no muestra alquileres de CMHC para ${esc(nombre)}. CMHC solo publica su encuesta anual para las áreas urbanas de 10,000 habitantes o más; consulta las cifras de Regina, Saskatoon y otras ciudades en la <a href="/canada-en-datos/saskatchewan#vivienda">guía de Saskatchewan</a>.</p>`;
  if (RECURSOS.vivienda.length) vivienda += `\n      <p>Antes de alquilar, conoce tus derechos:</p>\n      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas (ODEF 2022) --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c);
  const consultadoEscuelas = "Base ODEF v2.1 de Statistics Canada (2022)";
  let escuelas;
  if (escs.length) {
    const POST = ["University", "Junior College", "Technical and Vocational"];
    const div = escs.filter((e) => !e.tipo && e.autoridad);
    const fr = div.filter((e) => /fransaskoises/i.test(e.autoridad));
    const cat = div.filter((e) => /RCSSD/.test(e.autoridad));
    const post = escs.filter((e) => POST.includes(e.tipo));
    const otras = escs.length - div.length - post.length;
    escuelas = `<p>La ${consultadoEscuelas} ubica en ${esc(nombre)} ${[
      div.length ? `${miles(div.length)} ${div.length === 1 ? "escuela de una división escolar" : "escuelas de divisiones escolares"}${cat.length || fr.length ? ` (${[cat.length ? `${miles(cat.length)} católica${cat.length === 1 ? "" : "s"}` : "", fr.length ? `${miles(fr.length)} en francés` : ""].filter(Boolean).join(" y ")})` : ""}` : "",
      post.length ? `${miles(post.length)} ${post.length === 1 ? "centro de educación postsecundaria" : "centros de educación postsecundaria"}` : "",
      otras > 0 ? `${miles(otras)} ${otras === 1 ? "otro establecimiento" : "otros establecimientos"}` : "",
    ].filter(Boolean).join(", ")}.</p>
      <ul class="cd-list-items">
        ${escs.slice().sort((x, y) => x.nombre.localeCompare(y.nombre, "es")).map((e) => `<li>${esc(e.nombre)}${e.autoridad ? ` <small>(${esc(e.autoridad)})</small>` : ""}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. Es una base de 2022: confirma la escuela y la zona de inscripción con la división escolar que corresponde a tu dirección.</p>`;
  } else {
    escuelas = `<p>La ${consultadoEscuelas} no ubica escuelas dentro de ${esc(nombre)}; las más cercanas pueden estar en una localidad vecina. Para inscribir a tus hijos, consulta la división escolar que corresponde a tu dirección.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}.</p>`;
  }

  /* --- Salud --- */
  const hs = L.hospitales.filter((h) => h.csd === r.c);
  const llamar = "En una emergencia, llama al 911. Para consejos de salud las 24 horas, llama gratis al 8-1-1 (HealthLine).";
  let salud;
  if (hs.length) {
    salud = `<p>Principales hospitales en ${esc(nombre)} según la base de centros de salud de Statistics Canada. ${llamar}</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(h.nombre)}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Confirma servicios y horarios con la Saskatchewan Health Authority antes de ir.</p>`;
  } else {
    const cerca = L.hospitales.filter((h) => !SOLO_LOCAL.has(h.nombre)).map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
    salud = `<p>De los principales hospitales de la provincia, el más cercano al punto de referencia de ${esc(nombre)} es <strong>${esc(cerca.h.nombre)}</strong>, a unos ${DIST(cerca.d)} en línea recta (la distancia por carretera puede ser mayor). Puede haber un hospital comunitario o un centro de salud más cerca: consulta la Saskatchewan Health Authority. ${llamar}</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancia calculada con las coordenadas oficiales.</p>`;
  }

  /* --- Transporte --- */
  const transporte = f
    ? `${f.transporteNota ? `<p>${esc(f.transporteNota)}</p>` : ""}${f.transporte.length ? `<p>Información oficial de transporte:</p>${enlaces(f.transporte, esc)}` : ""}
      <p>Para manejar, la licencia de conducir y el registro y el seguro obligatorio de los vehículos se tramitan con SGI (Saskatchewan Government Insurance).</p>
      ${enlaces([{ label: "SGI — Licencias de conducir y registro de vehículos", href: "https://www.sgi.sk.ca/" }], esc)}`
    : `<p>Fuera de las ciudades con transporte urbano, en Saskatchewan se depende sobre todo del automóvil. La licencia de conducir y el registro y el seguro obligatorio de los vehículos se tramitan con SGI (Saskatchewan Government Insurance). Consulta en tu municipio si hay transporte local:</p>
      ${enlaces([{ label: "SGI — Licencias de conducir y registro de vehículos", href: "https://www.sgi.sk.ca/" }], esc)}`;

  const recien = f
    ? `<p>Según el Gobierno de Saskatchewan, en ${esc(f.nombre.replace(" (parte de Saskatchewan)", ""))} ofrece${f.agencias.length > 1 ? "n" : ""} servicios de asentamiento gratuitos ${f.agencias.map(esc).join(", ").replace(/, ([^,]*)$/, " y $1")}. Dan información, referencias y apoyo personal con un asesor, también con intérprete por teléfono si no hablas inglés; no tramitan documentos migratorios. La Assemblée communautaire fransaskoise ofrece servicios en francés en toda la provincia.</p>
      ${enlaces([...f.agenciasEnlaces, ASENTAMIENTO, ...RECURSOS.recienLlegados], esc)}
      <p>Consulta también la <a href="/canada-en-datos/saskatchewan#recien-llegado">guía de primeros pasos en Saskatchewan</a>.</p>`
    : `<p>Los servicios para recién llegados financiados por el Gobierno de Canadá son gratuitos para quienes cumplen sus requisitos; cada organización indica a quién puede atender. Busca los más cercanos:</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la <a href="/canada-en-datos/saskatchewan#recien-llegado">guía de primeros pasos en Saskatchewan</a>.</p>`;
  const servicios = f && f.servicios
    ? `<p>Servicios de la ciudad de ${esc(f.nombre.replace(" (parte de Saskatchewan)", ""))} en su sitio oficial:</p>
      ${enlaces(f.servicios.map((x) => ({ label: `Ciudad de ${f.nombre.replace(" (parte de Saskatchewan)", "")} — ${x.label}`, href: x.href })), esc)}`
    : "";
  const familias = `<p>Estos son recursos provinciales y federales: se aplican en toda la provincia, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia.</p>
      ${enlaces(RECURSOS.familias, esc)}
      <p>Más información en la sección de <a href="/canada-en-datos/saskatchewan#beneficios">beneficios de la guía de Saskatchewan</a>.</p>`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f ? [{ label: `Sitio oficial de ${f.nombre}`, href: f.web }] : []),
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, ...(lista.length ? [FUENTES.dpl, FUENTES.nombres] : []), ...(epa ? [FUENTES.epa, FUENTES.industrias] : []), ...(f ? [FUENTES.cmhc] : []), FUENTES.escuelas, FUENTES.hospitales, FUENTES.hora, ...(r.c === "4717029" || ZONA_FLIN_FLON.has(r.c) ? [FUENTES.leyHora] : [])];

  const habitantes = typeof r.p === "number" ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : "";
  const intro = {
    urbano: `${nombre} es ${tipo.es === "Ciudad" ? "una ciudad" : `un municipio urbano clasificado como ${tipo.es.toLowerCase()}`} (${tipo.en}) de la ${r.division} de Saskatchewan.${habitantes}${r.c === "4717029" || r.c === "4718052" ? " La ciudad se extiende a ambos lados del límite provincial: esta página trata solo de la parte de Saskatchewan." : ""}`,
    rural: `${nombre} es un municipio rural (Rural Municipality) de la ${r.division} de Saskatchewan: el gobierno local del campo que lo rodea. No incluye las ciudades, pueblos y villas de su territorio, que son municipios aparte.${habitantes}`,
    norte: `${nombre} es un municipio del norte de Saskatchewan, clasificado como ${tipo.es.toLowerCase()} (${tipo.en}), en la ${r.division}.${habitantes}`,
    indigena: `${nombre} figura en el Censo 2021 de Statistics Canada como ${tipo.es.toLowerCase()} (${tipo.en}), en la ${r.division}. No es un municipio. Para información sobre la comunidad, consulta directamente a la Primera Nación correspondiente.`,
    otro: `${nombre} es una subdivisión censal sin municipio propio (${tipo.es}, ${tipo.en}) de la ${r.division} de Saskatchewan.${r.t === "crown" ? " Es distinta de la ciudad de North Battleford, que tiene su propia página." : ""}${habitantes}`,
  }[grupo];
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la localidad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Saskatchewan · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro: intro + cierre,
    datos,
    ubicacion: `Ubicación aproximada en la ${esc(r.division)}. Mapa elaborado con los límites de las divisiones censales del Censo 2021 de Statistics Canada.`,
    comunidades,
    empleo,
    busqueda,
    vivienda,
    escuelas,
    escuelasEnlaces: [...(f && f.escuelas ? f.escuelas : []), ...RECURSOS.escuelas],
    salud,
    saludEnlaces: RECURSOS.salud,
    transporte,
    servicios,
    recien,
    familias,
    oficiales,
    fuentes,
    indexar: !!r.ficha,
    ciudad: tipo.grupo === "urbano",
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
  slug: "saskatchewan",
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
