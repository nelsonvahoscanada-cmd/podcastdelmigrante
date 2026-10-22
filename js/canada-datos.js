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
  Indicador:
    { label, value, format, decimals, unit, refPeriod, retrievedAt, reviewedAt,
      cadence, source: { org, title, url }, note }
  - value null = pendiente de verificación (no se inventa ninguna cifra);
    `pending` explica qué falta.
  - format: "numero" | "moneda" | "porcentaje" | "indice".
  - refPeriod: período al que corresponde la cifra (no la fecha de consulta).
  - retrievedAt: fecha en que se consultó la fuente oficial; reviewedAt:
    fecha de la revisión editorial.
  - note: aclaración metodológica (qué mide exactamente la cifra).
  Verificación: las cifras se leyeron directamente en la publicación oficial
  (archivo o página original), no en resúmenes de buscadores.
*/
const CD_PROFILES = {
  alberta: {
    code: "AB",
    seo: {
      title: "Alberta en datos: guía para inmigrantes y recién llegados",
      description: "Alberta en datos: población, empleo, salarios, alquileres, salud, educación, inmigración, beneficios y primeros pasos para recién llegados, con cifras y enlaces oficiales.",
    },
    intro:
      "Alberta es una de las provincias de las Praderas canadienses. Su capital es Edmonton y su ciudad más poblada es Calgary. Limita con Columbia Británica, Saskatchewan, los Territorios del Noroeste y el estado de Montana, en Estados Unidos. Usa la hora de la montaña y cambia al horario de verano.",
    summary: ["population", "unemploymentRate", "averageWage"],
    indicators: {
      population: {
        label: "Población (estimación)",
        value: 5101050, format: "numero", unit: "habitantes",
        refPeriod: "1 de julio de 2026", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Trimestral",
        source: { org: "Gobierno de Alberta (Treasury Board and Finance), con datos de Statistics Canada", title: "Quarterly Population Report — Second Quarter 2026 (23 de septiembre de 2026)", url: "https://open.alberta.ca/publications/quarterly-population-report" },
        note: "Estimación de población, no censo. Creció 1.52% en un año (76,419 personas más que el 1 de julio de 2025).",
      },
      nonPermanentResidents: {
        label: "Residentes no permanentes (estimación)",
        value: 279500, format: "numero", unit: "personas (cifra aproximada)",
        refPeriod: "1 de julio de 2026", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Trimestral",
        source: { org: "Gobierno de Alberta (Treasury Board and Finance), con datos de Statistics Canada", title: "Quarterly Population Report — Second Quarter 2026", url: "https://open.alberta.ca/publications/quarterly-population-report" },
        note: "Personas con permiso de trabajo o de estudio, sus familiares y solicitantes de asilo. Según el informe, son poco menos de 279,500 personas, el 5.6% de la población.",
      },
      censusPopulation: {
        label: "Población según el Censo 2021",
        value: null, format: "numero", unit: "habitantes", refPeriod: null, retrievedAt: null, reviewedAt: null, cadence: "Cada 5 años",
        source: { org: "Statistics Canada", title: "Censo 2021 — Población y viviendas (tabla 98-10-0001-01)", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000101" },
        pending: "El sitio de Statistics Canada no estuvo disponible durante la verificación.",
      },
      unemploymentRate: {
        label: "Tasa de desempleo (promedio anual)",
        value: 7.2, format: "porcentaje", decimals: 1, unit: "%",
        refPeriod: "Año 2025", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual",
        source: { org: "Job Bank (Gobierno de Canadá)", title: "Economic Scan – Alberta: 2026", url: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/alberta/environmental-scan" },
        note: "Promedio de 2025 (Encuesta de Población Activa). La tasa mensual más reciente se agregará cuando pueda verificarse en Statistics Canada.",
      },
      averageWage: {
        label: "Salario promedio por hora",
        value: 37.35, format: "moneda", decimals: 2, unit: "por hora",
        refPeriod: "Año 2025", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual",
        source: { org: "Job Bank (Gobierno de Canadá)", title: "Economic Scan – Alberta: 2026", url: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/alberta/environmental-scan" },
        note: "Es un PROMEDIO de todos los empleados, no una mediana: los salarios altos lo elevan. Los salarios por ocupación están en Job Bank.",
      },
      medianWage: {
        label: "Salario mediano por hora",
        value: null, format: "moneda", decimals: 2, unit: "por hora", refPeriod: null, retrievedAt: null, reviewedAt: null, cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 14-10-0064-01 — Salarios de los empleados por industria, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410006401" },
        pending: "El sitio de Statistics Canada no estuvo disponible durante la verificación.",
      },
      minimumWage: {
        label: "Salario mínimo general",
        value: 15, format: "moneda", decimals: 0, unit: "por hora",
        refPeriod: "Vigente al 22 de octubre de 2026", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Cuando cambia",
        source: { org: "Gobierno de Alberta", title: "Employment standards rules – Minimum wage", url: "https://www.alberta.ca/minimum-wage" },
        note: "Para estudiantes menores de 18 años, el mínimo es $13 por hora en las primeras 28 horas semanales durante el período escolar, con restricciones.",
      },
      gdp: {
        label: "Producto interno bruto",
        value: null, format: "moneda", unit: "millones de $", refPeriod: null, retrievedAt: null, reviewedAt: null, cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 36-10-0222-01 — PIB provincial y territorial, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610022201" },
        pending: "El sitio de Statistics Canada no estuvo disponible durante la verificación. El presupuesto de Alberta solo publica previsiones de crecimiento, no el valor oficial.",
      },
      rentCalgary: {
        label: "Alquiler promedio, 2 habitaciones — Calgary",
        value: 1914, format: "moneda", unit: "al mes",
        refPeriod: "Octubre de 2025", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual (octubre)",
        source: { org: "CMHC", title: "Rental Market Survey 2025 — Calgary, tabla 1.1.2", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
        note: "Apartamentos privados de alquiler (edificios construidos para alquilar), área metropolitana de Calgary. No incluye condominios ni casas alquiladas.",
      },
      rentEdmonton: {
        label: "Alquiler promedio, 2 habitaciones — Edmonton",
        value: 1603, format: "moneda", unit: "al mes",
        refPeriod: "Octubre de 2025", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual (octubre)",
        source: { org: "CMHC", title: "Rental Market Survey 2025 — Edmonton, tabla 1.1.2", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
        note: "Apartamentos privados de alquiler (edificios construidos para alquilar), área metropolitana de Edmonton. No incluye condominios ni casas alquiladas.",
      },
      vacancyCalgary: {
        label: "Desocupación de alquileres — Calgary",
        value: 5.0, format: "porcentaje", decimals: 1, unit: "%",
        refPeriod: "Octubre de 2025", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual (octubre)",
        source: { org: "CMHC", title: "Rental Market Survey 2025 — Calgary, tabla 1.1.1", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
        note: "Porcentaje de apartamentos privados de alquiler desocupados, todas las habitaciones, área metropolitana de Calgary. Era 4.8% en octubre de 2024; según CMHC, el cambio no es estadísticamente significativo.",
      },
      vacancyEdmonton: {
        label: "Desocupación de alquileres — Edmonton",
        value: 3.8, format: "porcentaje", decimals: 1, unit: "%",
        refPeriod: "Octubre de 2025", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual (octubre)",
        source: { org: "CMHC", title: "Rental Market Survey 2025 — Edmonton, tabla 1.1.1", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
        note: "Porcentaje de apartamentos privados de alquiler desocupados, todas las habitaciones, área metropolitana de Edmonton. Subió desde 3.1% en octubre de 2024 (aumento estadísticamente significativo, según CMHC).",
      },
      aaipNominations: {
        label: "Nominaciones del AAIP asignadas para 2026",
        value: 6603, format: "numero", unit: "nominaciones",
        refPeriod: "Año 2026 (actualizado el 10 de agosto de 2026)", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual",
        source: { org: "Gobierno de Alberta", title: "Alberta Advantage Immigration Program – Updates", url: "https://www.alberta.ca/aaip-updates" },
        note: "Es el máximo de certificados de nominación provincial que el AAIP puede emitir en 2026, asignado por IRCC. No es el número de personas que reciben la residencia permanente.",
      },
      crimeSeverity: {
        label: "Índice de gravedad del delito",
        value: 95.63, format: "indice", decimals: 2, unit: "puntos",
        refPeriod: "Año 2024", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual",
        source: { org: "Gobierno de Alberta (Alberta Justice), con datos de Statistics Canada", title: "Report on crime and justice statistics, 2020-2021 to 2024-2025", url: "https://open.alberta.ca/publications/report-on-crime-and-justice-statistics" },
        note: "Mide el volumen y la gravedad de los delitos reportados a la policía (base: Canadá 2006 = 100). En 2024 bajó desde 104.87; el promedio de Canadá fue 77.89. Statistics Canada ya publicó los datos de 2025: se actualizarán cuando puedan verificarse.",
      },
    },
    sections: [
      {
        id: "poblacion", title: "Población",
        text: [
          "Alberta tenía 5,101,050 habitantes el 1 de julio de 2026, según la estimación oficial. En el último año fue la provincia que más creció en proporción: 1.52%, sobre todo por la migración internacional y la llegada de personas de otras provincias.",
          "Las estimaciones de población no son el censo: se calculan cada trimestre a partir del último censo y de los nacimientos, las defunciones y las migraciones.",
        ],
        indicators: ["population", "nonPermanentResidents", "censusPopulation"],
        links: [
          { label: "Gobierno de Alberta — Informe trimestral de población", href: "https://open.alberta.ca/publications/quarterly-population-report" },
          { label: "Gobierno de Alberta — Estadísticas demográficas", href: "https://www.alberta.ca/demographic-statistics" },
        ],
      },
      {
        id: "economia", title: "Economía y principales industrias",
        text: [
          "La economía de Alberta tiene un peso importante del sector energético: según Job Bank, en 2025 la provincia produjo más de 4 millones de barriles de petróleo al día, la mayoría de las arenas petrolíferas. En ese año la construcción sumó 12,800 empleos y el turismo tuvo un fuerte crecimiento.",
        ],
        indicators: ["gdp"],
        links: [
          { label: "Job Bank — Panorama económico de Alberta 2026", href: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/alberta/environmental-scan" },
          { label: "Gobierno de Alberta — Perspectivas económicas", href: "https://www.alberta.ca/economic-outlook" },
        ],
      },
      {
        id: "empleo", title: "Empleo, salarios y derechos laborales",
        text: [
          "En 2025 el desempleo promedio en Alberta fue de 7.2%, por encima del promedio de Canadá (6.8%), según Job Bank: la población activa creció más rápido que la oferta de empleo. Entre los inmigrantes establecidos (landed immigrants) la tasa también fue de 7.2%.",
          "Las normas laborales de Alberta (Employment Standards) fijan el salario mínimo, las horas extra, los días festivos, las vacaciones y las causas de despido. Si tu empleador no las cumple, puedes presentar una queja o un aviso anónimo ante el Gobierno de Alberta.",
        ],
        items: [
          "Busca empleo en Job Bank y en el portal ALIS del Gobierno de Alberta, que también tiene guías para preparar una hoja de vida (résumé) al estilo canadiense.",
          "Si tu profesión u oficio está regulado en Canadá, revisa cómo se reconocen tus estudios y tu experiencia del extranjero.",
          "Ningún empleador legítimo te cobra por darte un empleo.",
        ],
        indicators: ["unemploymentRate", "averageWage", "medianWage", "minimumWage"],
        links: [
          { label: "Job Bank — Panorama económico y salarios de Alberta", href: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/alberta/environmental-scan" },
          { label: "ALIS — Carreras, formación y búsqueda de empleo en Alberta", href: "https://alis.alberta.ca/" },
          { label: "Gobierno de Alberta — Normas laborales (Employment Standards)", href: "https://www.alberta.ca/employment-standards" },
          { label: "Gobierno de Alberta — Reconocimiento de calificaciones extranjeras", href: "https://www.alberta.ca/foreign-qualification-recognition" },
          { label: "Gobierno de Alberta — Alberta Supports", href: "https://www.alberta.ca/alberta-supports" },
        ],
      },
      {
        id: "vivienda", title: "Vivienda y derechos del inquilino",
        text: [
          "En octubre de 2025, el alquiler promedio de un apartamento de 2 habitaciones era de $1,914 al mes en Calgary y de $1,603 en Edmonton, según CMHC. La desocupación subió en Edmonton, de 3.1% a 3.8%, y en Calgary se mantuvo alrededor del 5%.",
          "La Residential Tenancies Act protege a la mayoría de los inquilinos. El contrato puede ser escrito, verbal o implícito, pero conviene tenerlo por escrito. El propietario solo puede subir el alquiler una vez cada 365 días y debe avisarlo por escrito; la ley no fija un límite al monto del aumento. No puedes retener el alquiler aunque el propietario no cumpla: los desacuerdos se resuelven ante el servicio de disputas de alquiler (RTDRS) o en los tribunales.",
        ],
        items: [
          "No pagues depósitos ni alquiler por adelantado sin haber visto la vivienda y comprobado que quien la ofrece es el propietario o su representante.",
          "Desconfía de alquileres muy por debajo del precio de la zona o de quien dice estar fuera del país y pide pagos por transferencia.",
        ],
        indicators: ["rentCalgary", "rentEdmonton", "vacancyCalgary", "vacancyEdmonton"],
        links: [
          { label: "Gobierno de Alberta — Problemas comunes entre inquilinos y propietarios", href: "https://www.alberta.ca/common-problems-landlords-and-tenants" },
          { label: "Gobierno de Alberta — Guía de la Residential Tenancies Act", href: "https://open.alberta.ca/publications/rta-handbook-for-landlords-and-tenants" },
          { label: "Gobierno de Alberta — Servicio de resolución de disputas de alquiler (RTDRS)", href: "https://www.alberta.ca/residential-tenancy-dispute-resolution-service" },
          { label: "CMHC — Datos del mercado de alquiler", href: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
        ],
      },
      {
        id: "salud", title: "Salud y AHCIP",
        text: [
          "El Alberta Health Care Insurance Plan (AHCIP) cubre los servicios médicos necesarios de los residentes elegibles. La inscripción se hace en una oficina de registro (registry agent) y no tiene costo. Los requisitos cambian según tu situación:",
        ],
        items: [
          "Residentes permanentes y quienes llegan del extranjero para quedarse: inscríbete dentro de los 3 meses siguientes a establecer tu residencia en Alberta; en algunos casos la cobertura empieza desde esa fecha.",
          "Quienes se mudan desde otra provincia: la cobertura empieza el primer día del tercer mes después de establecer la residencia; mientras tanto, mantén la de tu provincia anterior.",
          "Trabajadores temporales: debes tener la intención de vivir en Alberta al menos 12 meses y un permiso de trabajo para un empleador de Alberta (o abierto) con al menos 6 meses de vigencia. La cobertura vence el mismo día que tu permiso.",
          "Estudiantes internacionales: necesitas un permiso de estudios para Alberta y una carta de tu institución que confirme que estudias a tiempo completo.",
          "Hijos: un niño ciudadano, residente permanente o con permiso de estudios puede tener cobertura aunque sus padres no la tengan.",
          "No todos los permisos dan derecho a AHCIP. Hasta que tengas cobertura, el Gobierno de Alberta recomienda un seguro médico privado.",
        ],
        indicators: [],
        links: [
          { label: "Gobierno de Alberta — AHCIP", href: "https://www.alberta.ca/ahcip" },
          { label: "Gobierno de Alberta — Cobertura si te mudas a Alberta", href: "https://www.alberta.ca/ahcip-moving-to-alberta" },
          { label: "Gobierno de Alberta — Cobertura para residentes temporales", href: "https://www.alberta.ca/ahcip-temporary-residents" },
          { label: "Health Link 811 — Consejos de salud las 24 horas", href: "https://www.primarycarealberta.ca/page14176.aspx" },
        ],
        alert: "Health Link 811 es la línea gratuita de consejos de salud de Alberta, atendida por personal de enfermería las 24 horas. En una emergencia, llama al 911.",
      },
      {
        id: "educacion", title: "Educación, universidades y oficios",
        text: [
          "La educación escolar de Alberta va de Kindergarten (alrededor de los 5 años) a Grade 12. Para inscribir a tus hijos, comunícate con el distrito escolar (school board) de tu zona: te dirá qué escuela te corresponde y qué documentos llevar. También hay escuelas francófonas para familias elegibles.",
          "Después de la secundaria, Alberta tiene universidades, colleges e institutos politécnicos públicos. Los oficios (electricista, soldador, carpintero, entre otros) se aprenden con un programa de aprendizaje (apprenticeship) que combina trabajo pagado y formación.",
        ],
        indicators: [],
        links: [
          { label: "Gobierno de Alberta — El sistema escolar de Alberta", href: "https://www.alberta.ca/albertas-school-system" },
          { label: "Gobierno de Alberta — Educación francófona", href: "https://www.alberta.ca/francophone-education" },
          { label: "Gobierno de Alberta — Instituciones postsecundarias", href: "https://www.alberta.ca/post-secondary-institutions" },
          { label: "Tradesecrets — Aprendizaje de oficios en Alberta", href: "https://tradesecrets.alberta.ca/" },
        ],
      },
      {
        id: "inmigracion", title: "Inmigración provincial (AAIP)",
        text: [
          "El Alberta Advantage Immigration Program (AAIP) es el programa de inmigración económica de Alberta: nomina personas para la residencia permanente. Lo administran los gobiernos de Alberta y de Canadá, y la decisión final sobre la residencia permanente la toma IRCC.",
          "Para 2026, IRCC le asignó al AAIP 6,603 nominaciones. Es un cupo de certificados de nominación, no el número de personas que reciben la residencia.",
        ],
        items: [
          "Vías para trabajadores: Alberta Opportunity Stream, Tourism and Hospitality Stream, Rural Renewal Stream y Alberta Express Entry Stream, este último con vías dedicadas a salud, tecnología y policía. La mayoría exige una oferta de empleo de Alberta.",
          "Vías para emprendedores: Rural Entrepreneur, Graduate Entrepreneur, Foreign Graduate Entrepreneur y Farm Stream.",
          "Para las vías de trabajadores se presenta primero una Expresión de Interés (Worker Expression of Interest). Desde el 7 de abril de 2026 cuesta $135.",
          "Las vías y los requisitos cambian con frecuencia: revisa siempre la página oficial y sus actualizaciones.",
        ],
        indicators: ["aaipNominations"],
        links: [
          { label: "Gobierno de Alberta — Alberta Advantage Immigration Program", href: "https://www.alberta.ca/alberta-advantage-immigration-program" },
          { label: "Gobierno de Alberta — Novedades del AAIP", href: "https://www.alberta.ca/aaip-updates" },
          { label: "IRCC — Cómo usar un representante de inmigración autorizado", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative.html" },
        ],
      },
      {
        id: "beneficios", title: "Beneficios familiares y ayudas",
        text: [
          "La Canada Child Benefit (CCB) es un pago federal para familias con hijos menores de 18 años. Para solicitarla necesitas un número de seguro social (SIN), y quienes acaban de llegar deben completar un formulario adicional sobre su estatus. Hay que presentar la declaración de impuestos cada año.",
          "El Alberta Child and Family Benefit (ACFB) es un beneficio provincial, libre de impuestos, para familias de ingresos bajos y medios. No requiere una solicitud aparte: se evalúa automáticamente al presentar la declaración de impuestos si calificas para la CCB. Lo paga la Agencia de Ingresos de Canadá (CRA) en 4 cuotas al año. Si te mudas a Alberta, puedes recibirlo desde el mes siguiente a hacerte residente.",
          "La elegibilidad para estos programas depende de tu estatus migratorio, tus ingresos y tu residencia: no todos los recién llegados tienen derecho a los mismos programas.",
        ],
        indicators: [],
        links: [
          { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
          { label: "Gobierno de Alberta — Alberta Child and Family Benefit", href: "https://www.alberta.ca/alberta-child-and-family-benefit" },
          { label: "Gobierno de Alberta — Alberta Child Health Benefit", href: "https://www.alberta.ca/alberta-child-health-benefit" },
          { label: "Gobierno de Alberta — Subsidio de cuidado infantil", href: "https://www.alberta.ca/child-care-subsidy-program" },
          { label: "Gobierno de Alberta — Income Support", href: "https://www.alberta.ca/income-support" },
        ],
      },
      {
        id: "integracion", title: "Asentamiento e integración",
        text: [
          "El Gobierno de Canadá financia servicios gratuitos de asentamiento: orientación, clases de inglés (LINC) o francés (CLIC), ayuda para buscar empleo y apoyo para la vida diaria.",
          "No todos los recién llegados pueden usarlos. Según IRCC, son para residentes permanentes (incluidos los refugiados reasentados), personas con la residencia aprobada en principio y algunos residentes temporales de ciertos programas de empleo. Desde el 1 de abril de 2026, los residentes permanentes de categoría económica solo pueden usarlos durante un tiempo limitado.",
          "Alberta también tiene sus propios programas. 211 Alberta es un servicio gratuito y confidencial que orienta sobre ayudas comunitarias y sociales: llama al 211.",
        ],
        indicators: [],
        links: [
          { label: "IRCC — Encuentra servicios gratuitos para recién llegados", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
          { label: "211 Alberta — Encuentra ayuda", href: "https://ab.211.ca/find-help/" },
          { label: "El Podcast del Migrante — Servicios gratuitos para trabajadores temporales en Alberta", href: "/articulo-servicios-gratuitos-trabajadores-temporales-alberta" },
        ],
      },
      {
        id: "seguridad", title: "Seguridad, emergencias y fraudes",
        text: [
          "En una emergencia, llama al 911.",
          "Alberta Emergency Alert avisa de situaciones que ponen en riesgo la vida, como incendios forestales, inundaciones o tornados. Las alertas son gratuitas y no requieren suscripción.",
          "El índice de gravedad del delito de Alberta bajó de 104.87 en 2023 a 95.63 en 2024, aunque sigue por encima del promedio de Canadá (77.89).",
        ],
        indicators: ["crimeSeverity"],
        links: [
          { label: "Gobierno de Alberta — Alertas de emergencia", href: "https://www.alberta.ca/about-emergency-alerts" },
          { label: "IRCC — Protégete del fraude migratorio", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud.html" },
          { label: "Gobierno de Alberta — Informe de estadísticas de delitos y justicia", href: "https://open.alberta.ca/publications/report-on-crime-and-justice-statistics" },
        ],
      },
    ],
    newcomer: [
      { title: "Obtén tu número de seguro social (SIN), si te corresponde", text: "Lo necesitas para trabajar y recibir beneficios. Se solicita gratis a Service Canada, en línea, por correo o en persona, con un permiso que te autorice a trabajar. Si tienes estatus temporal, tu SIN empieza con 9 y vence con tu permiso.", warning: "No uses sitios de terceros que cobran por tramitarlo.", link: { label: "Service Canada — SIN para residentes temporales", href: "https://www.canada.ca/en/employment-social-development/services/sin/temporary-residents.html" } },
      { title: "Inscríbete en el seguro de salud (AHCIP), si cumples los requisitos", text: "Hazlo en una oficina de registro (registry agent) dentro de los 3 meses siguientes a establecer tu residencia. Los trabajadores temporales y los estudiantes tienen requisitos propios.", warning: "Mientras no tengas cobertura, considera un seguro médico privado.", link: { label: "Gobierno de Alberta — AHCIP", href: "https://www.alberta.ca/ahcip" } },
      { title: "Tramita tu identificación o tu licencia de conducir", text: "Se tramitan en una oficina de registro. Debes demostrar que vives en Alberta (por ejemplo, con una factura o un estado de cuenta) y que puedes estar legalmente en Canadá; no necesitas ser ciudadano. La tarjeta llega por correo en un máximo de 21 días.", warning: "Los documentos que no estén en inglés necesitan una traducción de un traductor aprobado.", link: { label: "Gobierno de Alberta — Tarjeta de identificación", href: "https://www.alberta.ca/get-id-card" } },
      { title: "Abre una cuenta bancaria", text: "Necesitarás una cuenta para recibir tu salario y los beneficios. La Agencia de Consumo en Materia Financiera de Canadá explica qué identificación te pueden pedir y tus derechos al abrirla.", link: { label: "Gobierno de Canadá — Abrir una cuenta bancaria", href: "https://www.canada.ca/en/financial-consumer-agency/services/banking/opening-bank-account.html" } },
      { title: "Encuentra vivienda y conoce tus derechos como inquilino", text: "Antes de firmar, revisa la guía oficial de la Residential Tenancies Act. El alquiler solo puede subir una vez cada 365 días, con aviso por escrito.", warning: "Nunca pagues un depósito sin ver la vivienda y comprobar quién la alquila.", link: { label: "Gobierno de Alberta — Inquilinos y propietarios", href: "https://www.alberta.ca/common-problems-landlords-and-tenants" } },
      { title: "Inscribe a tus hijos en la escuela", text: "Comunícate con el distrito escolar de tu zona para saber qué escuela te corresponde y qué documentos llevar.", link: { label: "Gobierno de Alberta — Sistema escolar", href: "https://www.alberta.ca/albertas-school-system" } },
      { title: "Busca servicios de asentamiento y clases de idioma", text: "Hay orientación, clases de inglés o francés y apoyo para el empleo sin costo, si cumples los requisitos de elegibilidad.", link: { label: "IRCC — Servicios para recién llegados", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" } },
      { title: "Busca empleo y prepara una hoja de vida canadiense", text: "ALIS, del Gobierno de Alberta, explica cómo preparar una hoja de vida (résumé) al estilo canadiense y cómo buscar empleo; Job Bank publica ofertas y salarios por ocupación.", warning: "Ningún empleador legítimo te cobra por una oferta de empleo.", link: { label: "ALIS — Buscar empleo en Alberta", href: "https://alis.alberta.ca/" } },
    ],
    scams: [
      { title: "Estafas de empleo", text: "Ofertas que piden pagar por el puesto, por una evaluación de impacto en el mercado laboral (LMIA) o por «asegurar» una visa; sueldos muy altos por poco trabajo; entrevistas solo por chat." },
      { title: "Estafas de vivienda", text: "Anuncios con precios muy por debajo de la zona, propietarios que «están fuera del país» y piden transferencias, o presión para pagar antes de ver la vivienda o firmar un contrato." },
      { title: "Estafas de inmigración", text: "Llamadas o mensajes que dicen ser de IRCC o de la policía y exigen pagos inmediatos, o asesores que garantizan resultados. Si pagas a alguien para que te ayude con un trámite migratorio, debe ser un representante autorizado: un consultor regulado, un abogado o un notario de Quebec." },
    ],
    news: { province: "Alberta", category: "Alberta", limit: 6 },
  },
};
