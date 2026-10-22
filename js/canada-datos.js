/*
  canada-datos.js — Datos de «Canadá en Datos»
  ======================================================================
  Módulo independiente: NO lo usa ninguna otra sección del portal.
  Lo leen js/canada-mapa.js (portada del módulo), js/canada-region.js
  (fichas) y scripts/build-canada-datos.mjs (genera las páginas
  estáticas canada-en-datos/*.html con su SEO y vistas previas).

  REGLAS EDITORIALES
  - Ninguna cifra sin fuente oficial, período de referencia y fecha de
    consulta. Mientras una cifra no esté verificada, su `value` es null y
    la página muestra «Pendiente de verificación» con la fuente de la que
    saldrá. Las pruebas (tests/canada-datos.test.mjs) fallan si un valor
    publicado no tiene fuente, período y fecha.
  - Una región solo tiene ficha propia cuando `profile` existe: las demás
    muestran información básica y «Próximamente», sin enlaces a fichas
    inexistentes.
  - Los textos describen procedimientos generales y remiten siempre a la
    página oficial; no sustituyen la información oficial vigente.

  CD_META.prototype = true → las páginas llevan noindex y el aviso de
  prototipo. Se cambia a false solo cuando la dirección autorice publicar.
*/

const CD_META = {
  prototype: true,
  title: "Canadá en Datos",
  lastReview: "2026-10-22",
  geometry: {
    name: "Natural Earth — Admin 1, escala 1:50 m (dominio público)",
    url: "https://www.naturalearthdata.com/",
    note: "Límites simplificados con fines informativos; no es un mapa oficial de límites. Proyección cónica conforme de Lambert (parámetros de Statistics Canada).",
  },
};

/* Fuentes de la información básica de las 13 regiones. */
const CD_SOURCES = {
  capitals: {
    org: "Gobierno de Canadá (Asuntos Intergubernamentales)",
    title: "Provinces and territories",
    url: "https://www.canada.ca/en/intergovernmental-affairs/services/provinces-territories.html",
    retrievedAt: "2026-10-22",
  },
  timeZones: {
    org: "IANA",
    title: "Time Zone Database (zona de la capital)",
    url: "https://www.iana.org/time-zones",
    retrievedAt: "2026-10-22",
  },
};

/*
  Una entrada por provincia o territorio.
  code        clave del trazo del mapa (abreviatura postal)
  timeZone    zona IANA de la CAPITAL (el reloj muestra la hora de la capital)
  multiZone   true si la región tiene más de una zona horaria
  coords      coordenadas aproximadas de la capital (solo para el cálculo
              de día/noche; no se muestran)
  profile     slug de la ficha completa; null = «Próximamente»
*/
const CD_REGIONS = [
  { code: "BC", slug: "columbia-britanica", name: "Columbia Británica", type: "provincia", capital: "Victoria", timeZone: "America/Vancouver", multiZone: true, coords: [48.43, -123.37], profile: null },
  { code: "AB", slug: "alberta", name: "Alberta", type: "provincia", capital: "Edmonton", timeZone: "America/Edmonton", multiZone: false, coords: [53.55, -113.49], profile: "alberta" },
  { code: "SK", slug: "saskatchewan", name: "Saskatchewan", type: "provincia", capital: "Regina", timeZone: "America/Regina", multiZone: true, coords: [50.45, -104.62], profile: null },
  { code: "MB", slug: "manitoba", name: "Manitoba", type: "provincia", capital: "Winnipeg", timeZone: "America/Winnipeg", multiZone: false, coords: [49.9, -97.14], profile: null },
  { code: "ON", slug: "ontario", name: "Ontario", type: "provincia", capital: "Toronto", timeZone: "America/Toronto", multiZone: true, coords: [43.65, -79.38], profile: null },
  { code: "QC", slug: "quebec", name: "Quebec", type: "provincia", capital: "Ciudad de Quebec", timeZone: "America/Toronto", multiZone: true, coords: [46.81, -71.21], profile: null },
  { code: "NB", slug: "nuevo-brunswick", name: "Nuevo Brunswick", type: "provincia", capital: "Fredericton", timeZone: "America/Moncton", multiZone: false, coords: [45.96, -66.64], profile: null },
  { code: "NS", slug: "nueva-escocia", name: "Nueva Escocia", type: "provincia", capital: "Halifax", timeZone: "America/Halifax", multiZone: false, coords: [44.65, -63.58], profile: null },
  { code: "PE", slug: "isla-del-principe-eduardo", name: "Isla del Príncipe Eduardo", type: "provincia", capital: "Charlottetown", timeZone: "America/Halifax", multiZone: false, coords: [46.24, -63.13], profile: null },
  { code: "NL", slug: "terranova-y-labrador", name: "Terranova y Labrador", type: "provincia", capital: "St. John's", timeZone: "America/St_Johns", multiZone: true, coords: [47.56, -52.71], profile: null },
  { code: "YT", slug: "yukon", name: "Yukón", type: "territorio", capital: "Whitehorse", timeZone: "America/Whitehorse", multiZone: false, coords: [60.72, -135.06], profile: null },
  { code: "NT", slug: "territorios-del-noroeste", name: "Territorios del Noroeste", type: "territorio", capital: "Yellowknife", timeZone: "America/Yellowknife", multiZone: false, coords: [62.45, -114.37], profile: null },
  { code: "NU", slug: "nunavut", name: "Nunavut", type: "territorio", capital: "Iqaluit", timeZone: "America/Iqaluit", multiZone: true, coords: [63.75, -68.52], profile: null },
];

/*
  Indicador: { label, value, unit, refPeriod, retrievedAt, cadence, source }
  value null = pendiente de verificación (no se inventa ninguna cifra).
  source.url apunta a la tabla o página oficial de la que saldrá el dato.
*/
const CD_PROFILES = {
  alberta: {
    code: "AB",
    seo: {
      title: "Alberta en datos: guía para inmigrantes y recién llegados",
      description: "Alberta en datos: capital, hora local, población, empleo, vivienda, salud, educación, inmigración, beneficios y primeros pasos para recién llegados, con enlaces a fuentes oficiales.",
    },
    intro:
      "Alberta es una de las provincias de las Praderas canadienses. Su capital es Edmonton y su ciudad más poblada es Calgary. Limita con Columbia Británica, Saskatchewan, los Territorios del Noroeste y el estado de Montana, en Estados Unidos. Usa la hora de la montaña y cambia al horario de verano.",
    summary: ["population", "unemploymentRate", "averageWage"],
    indicators: {
      population: {
        label: "Población",
        value: null, unit: "personas", refPeriod: null, retrievedAt: null, cadence: "Trimestral",
        source: { org: "Statistics Canada", title: "Tabla 17-10-0009-01 — Estimaciones de población, trimestrales", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901" },
      },
      unemploymentRate: {
        label: "Tasa de desempleo",
        value: null, unit: "%", refPeriod: null, retrievedAt: null, cadence: "Mensual",
        source: { org: "Statistics Canada", title: "Tabla 14-10-0287-01 — Encuesta de Población Activa, por provincia", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410028701" },
      },
      averageWage: {
        label: "Salario promedio por hora",
        value: null, unit: "$ por hora", refPeriod: null, retrievedAt: null, cadence: "Anual",
        source: { org: "Job Bank (Gobierno de Canadá)", title: "Informes del mercado laboral de Alberta", url: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/alberta/environmental-scan" },
      },
      minimumWage: {
        label: "Salario mínimo general",
        value: null, unit: "$ por hora", refPeriod: null, retrievedAt: null, cadence: "Cuando cambia",
        source: { org: "Gobierno de Alberta", title: "Employment standards rules — Minimum wage", url: "https://www.alberta.ca/minimum-wage" },
      },
      gdp: {
        label: "Producto interno bruto",
        value: null, unit: "millones de $", refPeriod: null, retrievedAt: null, cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 36-10-0222-01 — PIB provincial y territorial, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610022201" },
      },
      rentTwoBedroom: {
        label: "Alquiler promedio, 2 habitaciones (Calgary y Edmonton)",
        value: null, unit: "$ al mes", refPeriod: null, retrievedAt: null, cadence: "Anual",
        source: { org: "CMHC", title: "Rental Market Survey — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
      },
      vacancyRate: {
        label: "Tasa de desocupación de alquileres",
        value: null, unit: "%", refPeriod: null, retrievedAt: null, cadence: "Anual",
        source: { org: "CMHC", title: "Rental Market Survey — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
      },
      aaipNominations: {
        label: "Nominaciones AAIP asignadas en el año",
        value: null, unit: "nominaciones", refPeriod: null, retrievedAt: null, cadence: "Anual",
        source: { org: "Gobierno de Alberta", title: "AAIP updates", url: "https://www.alberta.ca/aaip-updates" },
      },
      crimeSeverity: {
        label: "Índice de gravedad del delito",
        value: null, unit: "índice", refPeriod: null, retrievedAt: null, cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 35-10-0026-01 — Índice de gravedad del delito", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3510002601" },
      },
    },
    sections: [
      {
        id: "poblacion", title: "Población",
        text: ["Las estimaciones oficiales de población de cada provincia las publica Statistics Canada cada trimestre."],
        indicators: ["population"],
        links: [{ label: "Statistics Canada — Estimaciones de población (tabla 17-10-0009-01)", href: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901" }],
      },
      {
        id: "economia", title: "Economía",
        text: ["El Gobierno de Alberta reúne los principales indicadores económicos de la provincia en su tablero económico, y Statistics Canada publica el producto interno bruto de cada provincia."],
        indicators: ["gdp"],
        links: [
          { label: "Gobierno de Alberta — Alberta Economic Dashboard", href: "https://economicdashboard.alberta.ca/dashboard/employment/" },
          { label: "Statistics Canada — PIB provincial y territorial (tabla 36-10-0222-01)", href: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610022201" },
        ],
      },
      {
        id: "empleo", title: "Empleo",
        text: [
          "Job Bank, del Gobierno de Canadá, publica salarios y perspectivas por ocupación para Alberta. El portal ALIS del Gobierno de Alberta ofrece orientación sobre carreras, formación y búsqueda de empleo.",
          "Las normas laborales de la provincia, incluido el salario mínimo, están en la página oficial de Employment Standards.",
        ],
        indicators: ["unemploymentRate", "averageWage", "minimumWage"],
        links: [
          { label: "Job Bank — Informes del mercado laboral de Alberta", href: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/alberta/environmental-scan" },
          { label: "ALIS — Carreras, formación y empleo en Alberta", href: "https://alis.alberta.ca/" },
          { label: "Gobierno de Alberta — Normas laborales y salario mínimo", href: "https://www.alberta.ca/minimum-wage" },
        ],
      },
      {
        id: "vivienda", title: "Vivienda",
        text: [
          "La Residential Tenancies Act regula la mayoría de los alquileres residenciales en Alberta y establece los derechos y obligaciones de inquilinos y propietarios. Los desacuerdos pueden llevarse al servicio de resolución de disputas de alquiler (RTDRS) o a los tribunales.",
          "CMHC publica cada año los alquileres promedio y las tasas de desocupación por ciudad.",
        ],
        indicators: ["rentTwoBedroom", "vacancyRate"],
        links: [
          { label: "Gobierno de Alberta — Guía de la Residential Tenancies Act", href: "https://open.alberta.ca/publications/rta-handbook-for-landlords-and-tenants" },
          { label: "Gobierno de Alberta — Problemas comunes entre inquilinos y propietarios", href: "https://www.alberta.ca/common-problems-landlords-and-tenants" },
          { label: "CMHC — Datos del mercado de alquiler", href: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market" },
        ],
      },
      {
        id: "salud", title: "Salud",
        text: [
          "El Alberta Health Care Insurance Plan (AHCIP) cubre los servicios médicos necesarios de los residentes elegibles. La inscripción se hace en una oficina de registro (registry agent) y no tiene costo. Quienes se mudan a Alberta deben inscribirse dentro de los tres meses siguientes a establecer su residencia. Las personas con estatus temporal tienen reglas propias: consúltalas en la página oficial.",
          "Health Link 811 es la línea gratuita de consejos de salud, atendida por personal de enfermería las 24 horas. En una emergencia, llama al 911.",
        ],
        indicators: [],
        links: [
          { label: "Gobierno de Alberta — AHCIP", href: "https://www.alberta.ca/ahcip" },
          { label: "Gobierno de Alberta — Cobertura de salud si te mudas a Alberta", href: "https://www.alberta.ca/ahcip-moving-to-alberta" },
          { label: "Gobierno de Alberta — Cobertura para residentes temporales", href: "https://www.alberta.ca/ahcip-temporary-residents" },
          { label: "Alberta Health Services — Health Link 811", href: "https://www.albertahealthservices.ca/info/page12630.aspx" },
        ],
      },
      {
        id: "educacion", title: "Educación",
        text: ["Para inscribir a tus hijos en la escuela, comunícate con el distrito escolar (school board) de tu zona: te indicará la escuela que corresponde y los documentos que debes presentar. Alberta también tiene escuelas francófonas para familias elegibles."],
        indicators: [],
        links: [
          { label: "Gobierno de Alberta — El sistema escolar de Alberta", href: "https://www.alberta.ca/albertas-school-system" },
          { label: "Gobierno de Alberta — Educación francófona", href: "https://www.alberta.ca/francophone-education" },
        ],
      },
      {
        id: "inmigracion", title: "Inmigración",
        text: [
          "El Alberta Advantage Immigration Program (AAIP) es el programa de nominación provincial de Alberta: selecciona candidatos para la residencia permanente. La decisión final sobre la residencia permanente la toma el Gobierno de Canadá (IRCC).",
          "Las vías y los requisitos del AAIP cambian con frecuencia. Consulta siempre las páginas oficiales y desconfía de quien prometa resultados.",
        ],
        indicators: ["aaipNominations"],
        links: [
          { label: "Gobierno de Alberta — Alberta Advantage Immigration Program", href: "https://www.alberta.ca/alberta-advantage-immigration-program" },
          { label: "Gobierno de Alberta — Novedades del AAIP", href: "https://www.alberta.ca/aaip-updates" },
          { label: "IRCC — Inmigración y ciudadanía", href: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
        ],
      },
      {
        id: "beneficios", title: "Beneficios familiares",
        text: [
          "La Canada Child Benefit (CCB) es un pago federal para familias con hijos menores de 18 años. Para solicitarla necesitas un número de seguro social (SIN), y quienes acaban de llegar deben completar un formulario adicional sobre su estatus. Para seguir recibiéndola hay que presentar la declaración de impuestos cada año.",
          "El Alberta Child and Family Benefit (ACFB) es un beneficio provincial para familias de ingresos bajos y medios. No requiere una solicitud aparte: se evalúa al presentar la declaración de impuestos, y lo paga la Agencia de Ingresos de Canadá (CRA).",
        ],
        indicators: [],
        links: [
          { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
          { label: "Gobierno de Alberta — Alberta Child and Family Benefit", href: "https://www.alberta.ca/alberta-child-and-family-benefit" },
        ],
      },
      {
        id: "integracion", title: "Integración",
        text: [
          "El Gobierno de Canadá financia servicios gratuitos para recién llegados: orientación, clases de idioma, búsqueda de empleo y apoyo para la vida diaria. Su buscador muestra las organizaciones más cercanas.",
          "211 Alberta es un servicio gratuito y confidencial que orienta sobre programas comunitarios y sociales. Puedes llamar al 211.",
        ],
        indicators: [],
        links: [
          { label: "IRCC — Encuentra servicios gratuitos para recién llegados", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
          { label: "211 Alberta — Encuentra ayuda", href: "https://ab.211.ca/find-help/" },
          { label: "El Podcast del Migrante — Servicios gratuitos para trabajadores temporales en Alberta", href: "/articulo-servicios-gratuitos-trabajadores-temporales-alberta" },
        ],
      },
      {
        id: "seguridad", title: "Seguridad",
        text: [
          "En una emergencia, llama al 911.",
          "Alberta Emergency Alert avisa de situaciones que ponen en riesgo la vida, como incendios forestales, inundaciones o tornados. Las alertas son gratuitas, no requieren suscripción y llegan por televisión, radio, la aplicación oficial y los teléfonos compatibles.",
        ],
        indicators: ["crimeSeverity"],
        links: [
          { label: "Gobierno de Alberta — Alertas de emergencia", href: "https://www.alberta.ca/about-emergency-alerts" },
          { label: "Statistics Canada — Índice de gravedad del delito (tabla 35-10-0026-01)", href: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3510002601" },
        ],
      },
    ],
    newcomer: [
      { title: "Solicita tu número de seguro social (SIN)", text: "Lo necesitas para trabajar y para recibir beneficios. Se solicita gratis a Service Canada, en línea, por correo o en persona. No uses sitios de terceros.", link: { label: "Service Canada — SIN", href: "https://www.canada.ca/en/employment-social-development/services/sin.html" } },
      { title: "Inscríbete en el seguro de salud (AHCIP)", text: "Hazlo en una oficina de registro (registry agent) dentro de los tres meses siguientes a establecer tu residencia. Revisa las reglas para residentes temporales.", link: { label: "Gobierno de Alberta — AHCIP", href: "https://www.alberta.ca/ahcip" } },
      { title: "Consigue una identificación de Alberta", text: "La tarjeta de identificación o la licencia de conducir se tramitan en una oficina de registro. No necesitas ser ciudadano canadiense.", link: { label: "Gobierno de Alberta — Tarjeta de identificación", href: "https://www.alberta.ca/get-id-card" } },
      { title: "Conoce tus derechos como inquilino", text: "Antes de firmar un contrato, revisa la guía oficial de la Residential Tenancies Act.", link: { label: "Gobierno de Alberta — Guía de alquiler", href: "https://open.alberta.ca/publications/rta-handbook-for-landlords-and-tenants" } },
      { title: "Inscribe a tus hijos en la escuela", text: "Comunícate con el distrito escolar de tu zona para saber qué escuela te corresponde y qué documentos llevar.", link: { label: "Gobierno de Alberta — Sistema escolar", href: "https://www.alberta.ca/albertas-school-system" } },
      { title: "Solicita los beneficios para tu familia", text: "Si tienes hijos, solicita la Canada Child Benefit y presenta tu declaración de impuestos cada año: así también se evalúa el beneficio provincial (ACFB).", link: { label: "CRA — Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" } },
      { title: "Busca servicios gratuitos para recién llegados", text: "Orientación, idioma y empleo, sin costo. Consulta si cumples los requisitos.", link: { label: "IRCC — Servicios para recién llegados", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" } },
      { title: "Prepárate para buscar empleo", text: "Revisa salarios y perspectivas por ocupación y orientación sobre carreras y formación.", link: { label: "ALIS — Carreras y empleo en Alberta", href: "https://alis.alberta.ca/" } },
    ],
    news: { province: "Alberta", category: "Alberta", limit: 6 },
  },
};
