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
  prototype: false,
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
  zones       otras zonas horarias de la región (además de la de la capital),
              con su reloj en la ficha: { label, timeZone, note }
*/
const CD_REGIONS = [
  { code: "BC", slug: "columbia-britanica", name: "Columbia Británica", type: "provincia", capital: "Victoria", timeZone: "America/Vancouver", multiZone: true, coords: [48.43, -123.37], profile: null },
  { code: "AB", slug: "alberta", name: "Alberta", type: "provincia", capital: "Edmonton", timeZone: "America/Edmonton", multiZone: false, coords: [53.55, -113.49], profile: "alberta" },
  { code: "SK", slug: "saskatchewan", name: "Saskatchewan", type: "provincia", capital: "Regina", timeZone: "America/Regina", multiZone: true, coords: [50.45, -104.62], profile: null },
  { code: "MB", slug: "manitoba", name: "Manitoba", type: "provincia", capital: "Winnipeg", timeZone: "America/Winnipeg", multiZone: false, coords: [49.9, -97.14], profile: null },
  { code: "ON", slug: "ontario", name: "Ontario", type: "provincia", capital: "Toronto", timeZone: "America/Toronto", multiZone: true, coords: [43.65, -79.38], profile: "ontario",
    zones: [{ label: "Noroeste de Ontario", timeZone: "America/Winnipeg", note: "Hora central: en general, al oeste de los 90° O (gran parte de los distritos de Kenora, Rainy River y Thunder Bay)" }] },
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
    summary: ["population", "unemploymentRate", "minimumWage"],
    /* Directorio «Explora las ciudades y pueblos de Alberta» (scripts/canada-en-datos/localidades.mjs) */
    localidades: true,
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
        label: "Salario promedio provincial por hora",
        value: 37.35, format: "moneda", decimals: 2, unit: "CAD por hora",
        refPeriod: "Año 2025", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Anual",
        source: { org: "Job Bank (Gobierno de Canadá)", title: "Economic Scan – Alberta: 2026", url: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/alberta/environmental-scan" },
        note: "Promedio de 2025 de las remuneraciones por hora de las personas asalariadas de Alberta, según Job Bank. Es una media estadística: no es un salario inicial, una oferta laboral ni una referencia para recién llegados. Los salarios por ocupación están en Job Bank.",
      },
      medianWage: {
        label: "Salario mediano provincial por hora",
        value: null, format: "moneda", decimals: 2, unit: "CAD por hora", refPeriod: null, retrievedAt: null, reviewedAt: null, cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 14-10-0064-01 — Salarios de los empleados por industria, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410006401" },
        pending: "El sitio de Statistics Canada no estuvo disponible durante la verificación.",
      },
      minimumWage: {
        label: "Salario mínimo general",
        value: 15, format: "moneda", decimals: 0, unit: "CAD por hora",
        refPeriod: "Vigente al 22 de octubre de 2026", retrievedAt: "2026-10-22", reviewedAt: "2026-10-22", cadence: "Cuando cambia",
        source: { org: "Gobierno de Alberta", title: "Employment standards rules – Minimum wage", url: "https://www.alberta.ca/minimum-wage" },
        note: "Es la remuneración mínima legal general, con algunas excepciones. Por ejemplo, para estudiantes menores de 18 años el mínimo es $13 por hora en las primeras 28 horas semanales durante el período escolar.",
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
        indicators: ["minimumWage", "averageWage", "medianWage", "unemploymentRate"],
        explainer: {
          title: "Cómo leer estos salarios",
          text: "El salario mínimo es la remuneración mínima legal general que debe pagar un empleador, con algunas excepciones. El salario promedio es una media estadística de las remuneraciones de distintos trabajadores. No significa que todos ganen esa cantidad. Los salarios más altos pueden elevar el promedio. El salario mediano representa el punto central de la distribución: la mitad de los trabajadores del grupo medido gana más y la otra mitad gana menos.",
          warning: "El salario promedio provincial no representa necesariamente el salario inicial ni garantiza cuánto ganará una persona. Los ingresos varían según ocupación, experiencia, ciudad y sector económico.",
        },
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
          "El Alberta Advantage Immigration Program (AAIP) es el programa de inmigración económica de Alberta: puede nominar para la residencia permanente a personas que cumplan los requisitos de alguna de sus vías. Una nominación no garantiza la residencia. Lo administran los gobiernos de Alberta y de Canadá, y la decisión final sobre la residencia permanente la toma IRCC.",
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
          "La Canada Child Benefit (CCB) es un pago federal para familias elegibles con hijos menores de 18 años; la elegibilidad depende, entre otros requisitos, de la residencia y el estatus en Canadá. Para solicitarla necesitas un número de seguro social (SIN), y quienes acaban de llegar deben completar un formulario adicional sobre su estatus. Hay que presentar la declaración de impuestos cada año.",
          "El Alberta Child and Family Benefit (ACFB) es un beneficio provincial, libre de impuestos, para familias de ingresos bajos y medios que cumplen los requisitos. No requiere una solicitud aparte: se evalúa automáticamente al presentar la declaración de impuestos si calificas para la CCB. Lo paga la Agencia de Ingresos de Canadá (CRA) en 4 cuotas al año. Si te mudas a Alberta y cumples los requisitos, puedes recibirlo desde el mes siguiente a hacerte residente.",
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
  ontario: {
    code: "ON",
    /* Revisión propia de la ficha (si falta, se usa CD_META.lastReview) */
    lastReview: "2026-10-24",
    seo: {
      title: "Ontario en datos: guía para inmigrantes y recién llegados",
      description: "Ontario en datos: población, empleo, salario mínimo, alquileres por ciudad, OHIP, educación, inmigración (OINP), beneficios y primeros pasos para recién llegados, con cifras y enlaces oficiales.",
    },
    intro:
      "Ontario es la provincia más poblada de Canadá. Su capital es Toronto, la ciudad más grande del país, y en su territorio está Ottawa, la capital nacional. Limita con Quebec, Manitoba, la bahía de Hudson y la bahía de James, y al sur con los Grandes Lagos, el río San Lorenzo y Estados Unidos. Tiene dos zonas horarias y cambia al horario de verano.",
    summary: ["population", "unemploymentRate", "minimumWage"],
    indicators: {
      population: {
        label: "Población (estimación)",
        value: 16262121, format: "numero", unit: "habitantes",
        refPeriod: "1 de julio de 2026", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Trimestral",
        source: { org: "Statistics Canada", title: "Tabla 17-10-0009-01 — Estimaciones de población, trimestrales", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901" },
        note: "Estimación de población, no censo. El 1 de abril de 2026 la estimación era de 16,244,194 habitantes.",
      },
      censusPopulation: {
        label: "Población según el Censo 2021",
        value: 14223942, format: "numero", unit: "habitantes",
        refPeriod: "Censo 2021", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Cada 5 años",
        source: { org: "Statistics Canada", title: "Censo 2021 — Población y viviendas (tabla 98-10-0001-01)", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000101" },
        note: "Cifra del censo de 2021: 5.8% más que en 2016 (13,448,494). Es un dato histórico; la estimación de 2026 es la cifra actual.",
      },
      landArea: {
        label: "Superficie terrestre",
        value: 892411.76, format: "numero", decimals: 2, unit: "km²",
        refPeriod: "Censo 2021", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Cada 5 años",
        source: { org: "Statistics Canada", title: "Censo 2021 — Población y viviendas (tabla 98-10-0001-01)", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000101" },
        note: "Solo tierra firme: no incluye lagos ni ríos. Con ellos, el Gobierno de Ontario indica más de 1 millón de km². La densidad en 2021 era de 15.9 habitantes por km².",
      },
      gdp: {
        label: "Producto interno bruto",
        value: 1197020, format: "moneda", unit: "millones de $",
        refPeriod: "Año 2024", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 36-10-0222-01 — PIB provincial y territorial, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610022201" },
        note: "PIB a precios de mercado, en dólares corrientes (sin ajustar por inflación). En 2023 fue de $1,138,592 millones.",
      },
      unemploymentRate: {
        label: "Tasa de desempleo (mensual)",
        value: 7.0, format: "porcentaje", decimals: 1, unit: "%",
        refPeriod: "Septiembre de 2026", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Mensual",
        source: { org: "Statistics Canada", title: "Tabla 14-10-0287-01 — Encuesta de Población Activa, mensual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410028701" },
        note: "Personas de 15 años o más, cifra desestacionalizada. Fue de 6.9% en agosto de 2026. En septiembre, la tasa de participación fue de 64.6% y la de empleo, de 60.1%.",
      },
      unemploymentAnnual: {
        label: "Tasa de desempleo (promedio anual)",
        value: 7.7, format: "porcentaje", decimals: 1, unit: "%",
        refPeriod: "Año 2025", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Anual",
        source: { org: "Job Bank (Gobierno de Canadá)", title: "Economic Scan – Ontario: 2026", url: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/ontario/environmental-scan" },
        note: "Promedio de 2025 (Encuesta de Población Activa). Subió desde 7.0% en 2024, según Job Bank.",
      },
      averageWage: {
        label: "Salario promedio provincial por hora",
        value: 37.72, format: "moneda", decimals: 2, unit: "CAD por hora",
        refPeriod: "Año 2025", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 14-10-0064-01 — Salarios de los empleados por industria, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410006401" },
        note: "Promedio de 2025 de todas las personas asalariadas de Ontario (tiempo completo y parcial, todas las industrias). Es una media estadística: no es un salario inicial, una oferta laboral ni una referencia para recién llegados.",
      },
      medianWage: {
        label: "Salario mediano provincial por hora",
        value: 31.25, format: "moneda", decimals: 2, unit: "CAD por hora",
        refPeriod: "Año 2025", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 14-10-0064-01 — Salarios de los empleados por industria, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410006401" },
        note: "La mitad de las personas asalariadas de Ontario ganó más de esta cifra en 2025 y la otra mitad, menos (tiempo completo y parcial, todas las industrias).",
      },
      minimumWage: {
        label: "Salario mínimo general",
        value: 17.95, format: "moneda", decimals: 2, unit: "CAD por hora",
        refPeriod: "Vigente desde el 1 de octubre de 2026", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Anual (1 de octubre)",
        source: { org: "Gobierno de Ontario", title: "Your guide to the Employment Standards Act – Minimum wage", url: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/minimum-wage" },
        note: "Antes era de $17.60. Se ajusta cada 1 de octubre según la inflación. Hay mínimos distintos para estudiantes menores de 18 años ($16.90) y para quienes trabajan desde su casa para un empleador ($19.70).",
      },
      rentToronto: {
        label: "Alquiler promedio, 2 habitaciones — Toronto",
        value: 2046, format: "moneda", unit: "al mes",
        refPeriod: "Octubre de 2025", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Anual (octubre)",
        source: { org: "CMHC", title: "Rental Market Survey 2025 — Toronto, tabla 1.1.2", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
        note: "Apartamentos privados de alquiler (edificios construidos para alquilar), área metropolitana de Toronto. No incluye condominios ni casas alquiladas.",
      },
      vacancyToronto: {
        label: "Desocupación de alquileres — Toronto",
        value: 3.0, format: "porcentaje", decimals: 1, unit: "%",
        refPeriod: "Octubre de 2025", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Anual (octubre)",
        source: { org: "CMHC", title: "Rental Market Survey 2025 — Toronto, tabla 1.1.1", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
        note: "Porcentaje de apartamentos privados de alquiler desocupados, todas las habitaciones, área metropolitana de Toronto. Era de 2.5% en octubre de 2024.",
      },
      rentGuideline: {
        label: "Tope legal de aumento del alquiler para 2027",
        value: 1.9, format: "porcentaje", decimals: 1, unit: "%",
        refPeriod: "Aumentos entre el 1 de enero y el 31 de diciembre de 2027", retrievedAt: "2026-10-23", reviewedAt: "2026-10-24", cadence: "Anual",
        source: { org: "Gobierno de Ontario", title: "Residential rent increases", url: "https://www.ontario.ca/page/residential-rent-increases" },
        note: "Máximo que se puede subir el alquiler sin autorización del Landlord and Tenant Board para la mayoría de las viviendas. No se aplica a las unidades ocupadas por primera vez después del 15 de noviembre de 2018. Por ley, el tope nunca supera el 2.5%.",
      },
      crimeSeverity: {
        label: "Índice de gravedad del delito",
        value: 57.17, format: "indice", decimals: 2, unit: "puntos",
        refPeriod: "Año 2025", retrievedAt: "2026-10-24", reviewedAt: "2026-10-24", cadence: "Anual",
        source: { org: "Statistics Canada", title: "Tabla 35-10-0026-01 — Índice de gravedad del delito, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3510002601" },
        note: "Mide el volumen y la gravedad de los delitos reportados a la policía (base: Canadá 2006 = 100). En 2024 era de 60.95.",
      },
    },
    sections: [
      {
        id: "poblacion", title: "Población",
        text: [
          "Ontario tenía 16,262,121 habitantes el 1 de julio de 2026, según la estimación de Statistics Canada. Según el Ministerio de Finanzas de Ontario, en 2025 vivía en la provincia el 39.0% de la población de Canadá, y más del 85% de sus habitantes vive en centros urbanos.",
          "En el Censo 2021, el 30.0% de la población de Ontario había nacido fuera de Canadá. Ontario tiene la mayor población indígena de Canadá y 133 comunidades de Primeras Naciones.",
          "Las estimaciones de población no son el censo: se calculan cada trimestre a partir del último censo y de los nacimientos, las defunciones y las migraciones.",
        ],
        indicators: ["population", "censusPopulation"],
        links: [
          { label: "Statistics Canada — Estimaciones de población trimestrales", href: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901" },
          { label: "Gobierno de Ontario — Población, empleo, economía y comercio (fact sheet)", href: "https://www.ontario.ca/page/ontarios-population-labour-market-economy-and-trade-fact-sheet" },
        ],
      },
      {
        id: "geografia", title: "Geografía, idiomas, hora y clima",
        text: [
          "Ontario es la segunda provincia más grande de Canadá. Tiene más de 250,000 lagos y limita al sur con los Grandes Lagos y el río San Lorenzo. La mayoría de la población vive en el sur; el norte es extenso y poco poblado.",
          "El inglés es el idioma oficial de Ontario. La ley garantiza servicios del gobierno provincial en francés en las regiones designadas, donde vive cerca del 80% de la población francófona.",
          "La mayor parte de la provincia usa la hora del Este. El noroeste, en general al oeste del meridiano de 90° O (gran parte de los distritos de Kenora, Rainy River y Thunder Bay), usa la hora central. La provincia cambia al horario de verano en marzo y vuelve a la hora estándar en noviembre.",
          "El clima varía mucho de sur a norte: los inviernos son fríos y con nieve, más largos y extremos en el norte, y los veranos pueden ser calurosos y húmedos en el sur. Para el pronóstico y las alertas meteorológicas, consulta el servicio oficial de Medio Ambiente y Cambio Climático Canadá.",
        ],
        indicators: ["landArea"],
        links: [
          { label: "Gobierno de Ontario — Acerca de Ontario", href: "https://www.ontario.ca/page/about-ontario" },
          { label: "Gobierno de Ontario — Servicios del gobierno en francés", href: "https://www.ontario.ca/page/government-services-french" },
          { label: "Gobierno de Canadá — Pronóstico del tiempo", href: "https://weather.gc.ca/" },
        ],
      },
      {
        id: "economia", title: "Economía y principales industrias",
        text: [
          "Ontario es la mayor economía provincial de Canadá: su PIB fue de $1,197,020 millones en 2024, según Statistics Canada. Según el Ministerio de Finanzas de Ontario, los servicios representaron el 79.0% del PIB en 2024 y la producción de bienes, el 21.0%. La manufactura, incluida la fabricación de vehículos y autopartes, sigue siendo clave: según el Gobierno de Ontario, la provincia es la segunda jurisdicción productora de vehículos de Norteamérica.",
          "Estados Unidos es su principal mercado de exportación (71.7% de las exportaciones en 2025, según el Ministerio de Finanzas de Ontario). Según Job Bank, la economía real creció alrededor de 0.8% en 2025 y las perspectivas para 2026 prevén un crecimiento mínimo del empleo.",
        ],
        indicators: ["gdp"],
        links: [
          { label: "Job Bank — Panorama económico de Ontario 2026", href: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/ontario/environmental-scan" },
          { label: "Gobierno de Ontario — Población, empleo, economía y comercio (fact sheet)", href: "https://www.ontario.ca/page/ontarios-population-labour-market-economy-and-trade-fact-sheet" },
          { label: "Gobierno de Ontario — Negocios y economía", href: "https://www.ontario.ca/page/business-and-economy" },
        ],
      },
      {
        id: "empleo", title: "Empleo, salarios y derechos laborales",
        text: [
          "En septiembre de 2026 el desempleo en Ontario fue de 7.0%, según Statistics Canada. En 2025 el promedio anual fue de 7.7%, más alto que en 2024: según Job Bank, el empleo creció 1.0%, pero menos que la población activa. Ese año el empleo bajó en la producción de bienes y subió en los servicios. Las pequeñas empresas son el 97.9% de las empresas de la provincia.",
          "Las ocupaciones con más oportunidades cambian según la región y el momento. Job Bank publica las perspectivas de empleo por ocupación y región de Ontario; consúltalas antes de tomar decisiones, porque son estimaciones y no garantizan un empleo.",
          "La Ley de Normas de Empleo (Employment Standards Act) fija el salario mínimo, las horas extra, los días festivos, las vacaciones y el aviso de despido. Tu empleador no puede pedirte que renuncies a estos derechos, aunque lo aceptes por escrito. Si no los cumple, puedes presentar una queja ante el Ministerio de Trabajo de Ontario.",
        ],
        items: [
          "Salario mínimo desde el 1 de octubre de 2026: $17.95 por hora (general); $16.90 para estudiantes menores de 18 años que trabajan hasta 28 horas por semana durante el período escolar, o en vacaciones; $19.70 para quienes trabajan desde su casa para un empleador. Los guías de caza, pesca y naturaleza tienen tarifas propias por jornada: consulta la guía oficial.",
          "Employment Ontario tiene más de 700 oficinas con ayuda gratuita para buscar empleo, preparar tu hoja de vida (résumé) y encontrar formación.",
          "Better Jobs Ontario puede cubrir hasta $28,000 de formación de un año o menos (o $35,000 si dura más de un año y hasta dos), y hasta $500 por semana para gastos de vida, a personas que cumplen los requisitos (en general, quienes perdieron su empleo).",
          "Los oficios (más de 140 en Ontario) se aprenden con un programa de aprendizaje (apprenticeship) que combina trabajo pagado y formación. Algunos oficios exigen un certificado de Skilled Trades Ontario para trabajar.",
          "Si tu profesión está regulada en Ontario (por ejemplo, medicina, enfermería, ingeniería o docencia), necesitas la licencia del organismo regulador antes de ejercer.",
          "Para emprender, el Gobierno de Ontario explica cómo registrar tu negocio y tiene centros de asesoría para pequeñas empresas.",
          "Ningún empleador legítimo te cobra por darte un empleo.",
        ],
        indicators: ["minimumWage", "averageWage", "medianWage", "unemploymentRate", "unemploymentAnnual"],
        explainer: {
          title: "Cómo leer estos salarios",
          text: "El salario mínimo es la remuneración mínima legal general que debe pagar un empleador, con algunas excepciones. El salario promedio es una media estadística de las remuneraciones de distintos trabajadores. No significa que todos ganen esa cantidad. Los salarios más altos pueden elevar el promedio. El salario mediano representa el punto central de la distribución: la mitad de los trabajadores del grupo medido gana más y la otra mitad gana menos.",
          warning: "El salario promedio provincial no representa necesariamente el salario inicial ni garantiza cuánto ganará una persona. Los ingresos varían según ocupación, experiencia, ciudad y sector económico.",
        },
        links: [
          { label: "Gobierno de Ontario — Guía de la Ley de Normas de Empleo", href: "https://www.ontario.ca/document/your-guide-employment-standards-act-0" },
          { label: "Gobierno de Ontario — Salario mínimo", href: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/minimum-wage" },
          { label: "Gobierno de Ontario — Employment Ontario", href: "https://www.ontario.ca/page/employment-ontario" },
          { label: "Gobierno de Ontario — Better Jobs Ontario", href: "https://www.ontario.ca/page/better-jobs-ontario" },
          { label: "Gobierno de Ontario — Aprendizaje de oficios", href: "https://www.ontario.ca/page/apprenticeship-ontario" },
          { label: "Skilled Trades Ontario", href: "https://www.skilledtradesontario.ca/" },
          { label: "Gobierno de Ontario — Ejercer tu profesión u oficio", href: "https://www.ontario.ca/page/work-your-profession-or-trade" },
          { label: "Gobierno de Ontario — Centros de asesoría para pequeñas empresas", href: "https://www.ontario.ca/page/ontario-small-business-advisory-centre-locations" },
          { label: "Job Bank — Panorama del mercado laboral de Ontario", href: "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/ontario/environmental-scan" },
        ],
      },
      {
        id: "inmigracion", title: "Inmigración: OINP y vías federales",
        text: [
          "El Ontario Immigrant Nominee Program (OINP) es el programa provincial de inmigración económica: puede nominar a personas para la residencia permanente. La nominación no garantiza la residencia: la decisión final la toma el Gobierno de Canadá (IRCC).",
          "El OINP cambió en 2026. Desde el 25 de junio de 2026 se cerraron sus vías anteriores y se creó una sola vía para trabajadores: Ontario Workforce Priority. Según el Gobierno de Ontario (actualización del 20 de octubre de 2026), es la única vía abierta; todas las demás están cerradas.",
          "Ontario Workforce Priority no es una solicitud abierta: requiere una oferta de empleo de un empleador registrado y aprobado en el portal del OINP, una Expresión de Interés del trabajador y una invitación del programa. Solo con esa invitación se puede presentar la solicitud, dentro del plazo indicado. Los requisitos de experiencia e idioma dependen del nivel TEER de la ocupación.",
          "Express Entry es un sistema federal, no provincial: gestiona las solicitudes de la Experiencia Canadiense (CEC), el Programa Federal de Trabajadores Calificados y el de Oficios Calificados. Una nominación provincial vinculada a Express Entry suma 600 puntos, pero tampoco garantiza la residencia.",
        ],
        items: [
          "Trabajadores: la vía Ontario Workforce Priority exige una oferta de empleo de un empleador registrado en el OINP, experiencia laboral según el nivel TEER y una prueba de idioma aprobada. El portal de Expresiones de Interés abrió el 4 de agosto de 2026.",
          "Estudiantes: las antiguas vías para graduados de maestría y doctorado están cerradas. Los recién graduados en Ontario pueden calificar en Workforce Priority con menos experiencia si tienen una oferta de empleo que cumpla los requisitos.",
          "Comunidades fuera del Gran Toronto: la iniciativa REDI (Regional Economic Development through Immigration) se relanzó el 14 de octubre de 2026 y estará vigente hasta finales de 2027.",
          "Las vías y los requisitos cambian con frecuencia: revisa siempre la página oficial y sus actualizaciones.",
        ],
        alert: "Ninguna vía del OINP se puede solicitar directamente sin una invitación. Desconfía de quien te prometa una nominación o te cobre por «reservar» un cupo.",
        links: [
          { label: "Gobierno de Ontario — Ontario Immigrant Nominee Program (OINP)", href: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp" },
          { label: "Gobierno de Ontario — Vía Ontario Workforce Priority", href: "https://www.ontario.ca/page/ontario-workforce-priority-stream" },
          { label: "Gobierno de Ontario — Novedades del OINP en 2026", href: "https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates" },
          { label: "Gobierno de Ontario — Iniciativa REDI", href: "https://www.ontario.ca/page/regional-economic-development-through-immigration-redi-initiative" },
          { label: "IRCC — Express Entry", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html" },
          { label: "IRCC — Programa de Nominación Provincial", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html" },
          { label: "IRCC — Cómo usar un representante de inmigración autorizado", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative.html" },
        ],
        indicators: [],
      },
      {
        id: "vivienda", title: "Vivienda y derechos del inquilino",
        text: [
          "En octubre de 2025, el alquiler promedio de un apartamento de 2 habitaciones era de $2,046 al mes en el área metropolitana de Toronto, según CMHC. La tabla compara las principales áreas de Ontario con la misma encuesta y el mismo tipo de vivienda.",
          "La Residential Tenancies Act protege a la mayoría de los inquilinos. El propietario debe usar el contrato estándar de Ontario; si no te lo entrega dentro de los 21 días siguientes a pedirlo por escrito, puedes retener un mes de alquiler. Solo puede subir el alquiler una vez cada 12 meses, con aviso por escrito de al menos 90 días en el formulario oficial, y sin superar el tope anual en la mayoría de las viviendas. Solo el Landlord and Tenant Board (LTB) puede ordenar un desalojo.",
          "El LTB explica que el propietario puede pedir un depósito de alquiler de hasta un mes (o una semana, si pagas por semana), que solo puede usarse para el último período de alquiler y no para reparar daños. Cada año debe pagarte intereses sobre ese depósito.",
        ],
        items: [
          "No pagues depósitos ni alquiler por adelantado sin haber visto la vivienda y comprobado que quien la ofrece es el propietario o su representante.",
          "Pide siempre recibo de los pagos: el propietario debe dártelo sin costo si lo pides.",
          "Si tienes un conflicto con el propietario, el Landlord and Tenant Board resuelve las disputas. Para ayuda comunitaria y de vivienda, llama al 211.",
        ],
        indicators: ["rentToronto", "vacancyToronto", "rentGuideline"],
        table: {
          caption: "Alquiler promedio de 2 habitaciones y desocupación, octubre de 2025",
          headers: ["Área (CMHC)", "Alquiler promedio, 2 habitaciones", "Desocupación (todas las habitaciones)"],
          rows: [
            ["Toronto (área metropolitana)", "$2,046", "3.0%"],
            ["Ciudad de Toronto", "$2,055", "2.8%"],
            ["Mississauga", "$2,005", "3.9%"],
            ["Brampton", "$2,032", "4.4%"],
            ["Ottawa (parte de Ontario)", "$1,926", "3.0%"],
            ["Kitchener-Cambridge-Waterloo", "$1,832", "4.1%"],
            ["Guelph", "$1,802", "3.1%"],
            ["Kingston", "$1,764", "2.4%"],
            ["Barrie", "$1,755", "4.3%"],
            ["Oshawa", "$1,754", "3.7%"],
            ["Hamilton", "$1,656", "3.6%"],
            ["London", "$1,651", "4.0%"],
            ["St. Catharines-Niagara", "$1,527", "3.9%"],
            ["Thunder Bay", "$1,495", "4.0%"],
            ["Windsor", "$1,454", "3.7%"],
          ],
          note: "Apartamentos privados de alquiler (edificios construidos para alquilar); no incluye condominios ni casas alquiladas. Salvo indicación, cada fila es el área metropolitana (CMA). Ciudad de Toronto, Mississauga y Brampton son zonas de CMHC dentro del área metropolitana de Toronto. CMHC asigna a cada cifra una calificación de confiabilidad, que se puede consultar en sus tablas.",
          source: { org: "CMHC", title: "Rental Market Survey 2025, tablas 1.1.1 y 1.1.2 de cada centro", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
          refPeriod: "octubre de 2025",
          retrievedAt: "2026-10-23",
        },
        links: [
          { label: "Gobierno de Ontario — Alquilar en Ontario: tus derechos", href: "https://www.ontario.ca/page/renting-ontario-your-rights" },
          { label: "Gobierno de Ontario — Aumentos de alquiler", href: "https://www.ontario.ca/page/residential-rent-increases" },
          { label: "Gobierno de Ontario — Contrato de alquiler estándar", href: "https://www.ontario.ca/page/guide-ontarios-standard-lease" },
          { label: "Landlord and Tenant Board (LTB)", href: "https://tribunalsontario.ca/ltb/" },
          { label: "LTB — Información para nuevos inquilinos", href: "https://tribunalsontario.ca/documents/ltb/Brochures/Information%20for%20New%20Tenants.html" },
          { label: "CMHC — Datos del mercado de alquiler", href: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
        ],
      },
      {
        id: "salud", title: "Salud y OHIP",
        text: [
          "El Ontario Health Insurance Plan (OHIP) cubre los servicios de salud necesarios de los residentes elegibles: consultas médicas, atención en hospitales, análisis de laboratorio y ambulancia, entre otros. No cubre los medicamentos recetados fuera del hospital, salvo programas específicos. Ontario no tiene período de espera para OHIP.",
          "La solicitud se hace en persona en ServiceOntario, con tres documentos originales: uno que pruebe tu estatus en Canadá, uno de tu residencia en Ontario y uno de identidad. Debes estar físicamente en Ontario al menos 153 días en cada período de 12 meses.",
        ],
        items: [
          "Pueden calificar: ciudadanos canadienses, residentes permanentes y algunos solicitantes de residencia permanente que cumplan los requisitos.",
          "Trabajadores con permiso de trabajo: debes trabajar a tiempo completo para un empleador de Ontario durante al menos 6 meses; tu cónyuge y tus dependientes pueden calificar.",
          "Estudiantes internacionales: en general no tienen OHIP. En las universidades públicas están cubiertos por el plan UHIP; si estudias en otra institución, pregunta qué seguro médico debes tener.",
          "Para encontrar un médico de familia o una enfermera practicante, inscríbete en Health Care Connect. La inscripción no garantiza que te asignen uno de inmediato.",
          "Hasta que tengas cobertura, considera un seguro médico privado.",
        ],
        alert: "Health811 es el servicio gratuito de consejos de salud de Ontario, atendido por personal de enfermería las 24 horas: llama al 811. En una emergencia, llama al 911.",
        indicators: [],
        links: [
          { label: "Gobierno de Ontario — Solicitar OHIP y la tarjeta de salud", href: "https://www.ontario.ca/page/apply-ohip-and-get-health-card" },
          { label: "Gobierno de Ontario — Qué cubre OHIP", href: "https://www.ontario.ca/page/what-ohip-covers" },
          { label: "Gobierno de Ontario — Encontrar un médico de familia", href: "https://www.ontario.ca/page/find-family-doctor-or-nurse-practitioner" },
          { label: "Health811", href: "https://health811.ontario.ca/" },
        ],
      },
      {
        id: "educacion", title: "Educación, colleges y universidades",
        text: [
          "La escuela pública es gratuita para el aprendizaje obligatorio. Ontario tiene 72 consejos escolares: públicos y católicos, en inglés y en francés. Los niños pueden empezar el kindergarten el año en que cumplen 4 años, y la escolaridad es obligatoria desde los 6. Para inscribir a tus hijos, comunícate con el consejo escolar (school board) de tu zona. Las escuelas en francés son para familias con derecho a la educación en francés.",
          "Después de la secundaria, Ontario tiene universidades y colleges públicos. El Ontario Student Assistance Program (OSAP) ofrece becas y préstamos a estudiantes que cumplen sus requisitos de elegibilidad.",
          "Estudiantes internacionales: desde el 1 de enero de 2026, la mayoría necesita una carta de atestación provincial (PAL) para solicitar el permiso de estudios. Consulta las condiciones de trabajo de tu permiso antes de aceptar un empleo.",
        ],
        indicators: [],
        links: [
          { label: "Gobierno de Ontario — Guía del sistema escolar para padres", href: "https://www.ontario.ca/page/your-childs-education-parent-guide-our-school-system" },
          { label: "Gobierno de Ontario — Colleges, universidades e institutos indígenas", href: "https://www.ontario.ca/page/learn-about-colleges-universities-and-indigenous-institutes-ontario" },
          { label: "Gobierno de Ontario — Estudiar en Ontario (estudiantes internacionales)", href: "https://www.ontario.ca/page/study-ontario-international-students" },
          { label: "Gobierno de Ontario — OSAP", href: "https://www.ontario.ca/page/osap-ontario-student-assistance-program" },
          { label: "CICIC — Evaluación de credenciales extranjeras", href: "https://www.cicic.ca/" },
        ],
      },
      {
        id: "licencias", title: "Licencia de conducir",
        text: [
          "Si llegas con una licencia válida de otro país o provincia, puedes usarla en Ontario durante 60 días. Después necesitas una licencia de Ontario.",
          "Las licencias de las provincias canadienses y de algunos países con acuerdo se pueden canjear directamente. Si tu país no tiene acuerdo, desde el 1 de julio de 2026 puedes recibir crédito por hasta un año de experiencia con tu licencia original y una carta de autenticación; debes aprobar el examen de la vista, el de conocimientos y el práctico G2, y esperar 12 meses para el examen G. Los documentos en otro idioma necesitan una traducción certificada.",
          "Quienes nunca han conducido siguen el sistema gradual G1, G2 y G desde los 16 años; el proceso completo dura unos 20 meses.",
        ],
        indicators: [],
        links: [
          { label: "Gobierno de Ontario — Canjear una licencia de otra provincia o país", href: "https://www.ontario.ca/page/exchange-out-province-drivers-licence" },
          { label: "Gobierno de Ontario — Licencia G para conductores nuevos", href: "https://www.ontario.ca/page/get-g-drivers-licence-new-drivers" },
        ],
      },
      {
        id: "beneficios", title: "Beneficios familiares y ayudas",
        text: [
          "La Canada Child Benefit (CCB) es un pago federal para familias elegibles con hijos menores de 18 años; la elegibilidad depende, entre otros requisitos, de la residencia y el estatus en Canadá. Hay que presentar la declaración de impuestos cada año.",
          "El Ontario Child Benefit es un beneficio provincial de hasta $1,760 al año por hijo, que se paga cada mes junto con la CCB. No requiere una solicitud aparte: se calcula automáticamente con tu declaración de impuestos y depende de los ingresos familiares.",
          "El Ontario Trillium Benefit combina tres créditos provinciales (energía, impuesto a la propiedad e impuesto a las ventas) para personas de ingresos bajos y medios. También se solicita con la declaración de impuestos.",
          "Cuidado infantil: en los centros inscritos en el programa Canada-Wide Early Learning and Child Care, el costo para menores de 6 años es de $22 al día como máximo, sin hacer ninguna solicitud aparte.",
          "La elegibilidad para estos programas depende de tu estatus migratorio, tus ingresos y tu residencia: no todos los recién llegados tienen derecho a los mismos programas.",
        ],
        indicators: [],
        links: [
          { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
          { label: "Gobierno de Ontario — Ontario Child Benefit", href: "https://www.ontario.ca/page/ontario-child-benefit" },
          { label: "Gobierno de Ontario — Ontario Trillium Benefit", href: "https://www.ontario.ca/page/ontario-trillium-benefit" },
          { label: "Gobierno de Ontario — Encontrar y pagar cuidado infantil", href: "https://www.ontario.ca/page/find-and-pay-child-care" },
          { label: "Gobierno de Ontario — Ontario Works", href: "https://www.ontario.ca/page/ontario-works" },
        ],
      },
      {
        id: "integracion", title: "Asentamiento e integración",
        text: [
          "El Gobierno de Canadá financia servicios gratuitos de asentamiento: orientación, clases de inglés o francés, ayuda para buscar empleo y apoyo para la vida diaria. No todos los recién llegados pueden usarlos: según IRCC, son principalmente para residentes permanentes y algunos residentes temporales de ciertos programas.",
          "Ontario tiene sus propios programas: servicios de asentamiento, clases de idiomas para adultos y programas de transición (bridge training) para ejercer tu profesión. La Oficina del Comisionado de Equidad (Fairness Commissioner) vigila que los organismos reguladores evalúen las credenciales de forma justa.",
          "211 Ontario es un servicio gratuito y confidencial que orienta sobre ayudas comunitarias y sociales: llama al 211.",
        ],
        indicators: [],
        links: [
          { label: "Gobierno de Ontario — Recién llegados a Ontario", href: "https://www.ontario.ca/page/newcomers" },
          { label: "IRCC — Encuentra servicios gratuitos para recién llegados", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
          { label: "Comisionado de Equidad de Ontario", href: "https://www.fairnesscommissioner.ca/" },
          { label: "211 Ontario — Encuentra ayuda", href: "https://211ontario.ca/" },
        ],
      },
      {
        id: "seguridad", title: "Seguridad, emergencias y fraudes",
        text: [
          "En una emergencia, llama al 911.",
          "Alert Ready es el sistema nacional de alertas de emergencia: en Ontario envía avisos por televisión, radio y teléfonos celulares compatibles cuando hay un peligro para la vida, como tornados, inundaciones o incendios. No requiere suscripción.",
          "El índice de gravedad del delito de Ontario bajó de 60.95 en 2024 a 57.17 en 2025, según Statistics Canada.",
        ],
        indicators: ["crimeSeverity"],
        links: [
          { label: "Alert Ready — Alertas de emergencia", href: "https://www.alertready.ca/" },
          { label: "IRCC — Protégete del fraude migratorio", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud.html" },
        ],
      },
      {
        id: "ciudades", title: "Principales ciudades",
        text: [
          "Una mirada rápida a ocho ciudades de Ontario. Los sectores destacados son los que cada ciudad o su agencia oficial de desarrollo económico presenta en su sitio web; no son una lista de empleos disponibles.",
        ],
        cities: [
          { id: "toronto", name: "Toronto", region: "Capital provincial · Gran Toronto", population: { value: 7108874, refPeriod: "área metropolitana, 2025" }, text: "La ciudad más grande de Canadá y su capital financiera, con una economía diversificada.", sectors: ["servicios financieros", "tecnología", "cine y televisión", "ciencias de la vida", "alimentos y bebidas", "música", "turismo", "moda", "economía verde"], sectorsSource: "Sectores según la Ciudad de Toronto (Industry sector support).", links: [{ label: "Ciudad de Toronto", href: "https://www.toronto.ca/" }, { label: "Toronto — Apoyo a sectores económicos", href: "https://www.toronto.ca/business-economy/industry-sector-support/" }] },
          { id: "ottawa", name: "Ottawa", region: "Capital de Canadá · Este de Ontario", population: { value: 1325788, refPeriod: "parte de Ontario del área metropolitana, 2025" }, text: "Sede del Gobierno de Canadá, en el límite con Quebec. Además del empleo público, tiene un sector tecnológico importante.", sectors: ["defensa e innovación", "tecnología y software", "ciberseguridad"], sectorsSource: "Sectores según Invest Ottawa, agencia de desarrollo económico de la ciudad.", links: [{ label: "Ciudad de Ottawa", href: "https://ottawa.ca/en" }, { label: "Invest Ottawa", href: "https://www.investottawa.ca/" }] },
          { id: "hamilton", name: "Hamilton", region: "Extremo oeste del lago Ontario", population: { value: 871143, refPeriod: "área metropolitana, 2025" }, text: "Ciudad a orillas del lago Ontario, con una economía que combina la manufactura con la salud, la agroindustria y los servicios.", sectors: ["manufactura", "ciencias de la vida", "agroindustria y alimentos", "transporte de mercancías", "finanzas y seguros", "tecnologías de la información y medios digitales", "turismo", "industrias creativas"], sectorsSource: "Sectores según Invest in Hamilton, del Ayuntamiento de Hamilton.", links: [{ label: "Ciudad de Hamilton", href: "https://www.hamilton.ca/" }, { label: "Invest in Hamilton", href: "https://investinhamilton.ca/" }] },
          { id: "london", name: "London", region: "Suroeste de Ontario", population: { value: 633002, refPeriod: "área metropolitana, 2025" }, text: "Centro regional del suroeste de Ontario, entre Toronto y Windsor.", sectors: ["manufactura avanzada", "tecnología e industrias creativas", "salud y ciencias de la vida"], sectorsSource: "Sectores según la London Economic Development Corporation.", links: [{ label: "Ciudad de London", href: "https://london.ca/" }, { label: "London Economic Development Corporation", href: "https://www.ledc.com/" }] },
          { id: "kitchener-waterloo", name: "Kitchener-Waterloo", region: "Región de Waterloo", population: { value: 701568, refPeriod: "área metropolitana de Kitchener-Cambridge-Waterloo, 2025" }, text: "Dos ciudades vecinas que, con Cambridge, forman el área metropolitana de Kitchener-Cambridge-Waterloo, conocida por su sector tecnológico.", sectors: ["tecnología", "manufactura", "automotriz"], sectorsSource: "Sectores según la Waterloo Economic Development Corporation.", links: [{ label: "Ciudad de Kitchener", href: "https://www.kitchener.ca/" }, { label: "Ciudad de Waterloo", href: "https://www.waterloo.ca/" }, { label: "Waterloo EDC", href: "https://www.waterlooedc.ca/" }] },
          { id: "mississauga", name: "Mississauga", region: "Región de Peel · Gran Toronto", text: "Ciudad vecina de Toronto, donde está el Aeropuerto Internacional Pearson. Forma parte del área metropolitana de Toronto.", sectors: ["manufactura avanzada", "servicios financieros", "tecnologías de la información y la comunicación", "ciencias de la vida", "logística inteligente"], sectorsSource: "Sectores según la División de Desarrollo Económico de la Ciudad de Mississauga.", links: [{ label: "Ciudad de Mississauga", href: "https://www.mississauga.ca/" }, { label: "Mississauga — Desarrollo económico", href: "https://www.mississauga.ca/services-and-programs/business/economic-development-division/" }] },
          { id: "brampton", name: "Brampton", region: "Región de Peel · Gran Toronto", text: "Ciudad de la región de Peel, al noroeste de Toronto. Forma parte del área metropolitana de Toronto.", sectors: ["manufactura avanzada", "alimentos y bebidas", "salud y ciencias de la vida", "innovación y tecnología", "logística"], sectorsSource: "Sectores según Invest Brampton, de la Ciudad de Brampton.", links: [{ label: "Ciudad de Brampton", href: "https://www.brampton.ca/" }, { label: "Invest Brampton", href: "https://investbrampton.ca/" }] },
          { id: "windsor", name: "Windsor", region: "Frontera con Detroit (Michigan)", text: "Ciudad fronteriza frente a Detroit, con cruces directos hacia Estados Unidos. Su economía está ligada a la industria automotriz; allí está NextStar Energy, la primera planta de baterías a gran escala de Canadá.", sectors: ["manufactura avanzada", "vehículos conectados", "transporte y logística", "agricultura", "tecnologías de la información", "ciencias de la vida", "tecnología limpia"], sectorsSource: "Sectores según Invest WindsorEssex, agencia de desarrollo económico de Windsor y el condado de Essex.", links: [{ label: "Ciudad de Windsor", href: "https://www.citywindsor.ca/" }, { label: "Invest WindsorEssex", href: "https://www.investwindsoressex.com/" }] },
        ],
        citiesNote: "Población: estimación por área metropolitana (CMA) de 2025, según el Gobierno de Ontario (Ministerio de Finanzas, «Ontario’s population, labour market, economy and trade fact sheet», actualizada el 22 de abril de 2026; consultada el 23 de octubre de 2026). Mississauga y Brampton están dentro del área metropolitana de Toronto, y Windsor no figura en esa publicación: por eso no se muestra su población.",
        indicators: [],
        links: [
          { label: "Gobierno de Ontario — Población, empleo, economía y comercio (fact sheet)", href: "https://www.ontario.ca/page/ontarios-population-labour-market-economy-and-trade-fact-sheet" },
        ],
      },
    ],
    newcomer: [
      { title: "Obtén tu número de seguro social (SIN), si te corresponde", text: "Lo necesitas para trabajar y recibir beneficios. Se solicita gratis a Service Canada, en línea, por correo o en persona, con un permiso que te autorice a trabajar. Si tienes estatus temporal, tu SIN empieza con 9 y vence con tu permiso.", warning: "No uses sitios de terceros que cobran por tramitarlo.", link: { label: "Service Canada — SIN para residentes temporales", href: "https://www.canada.ca/en/employment-social-development/services/sin/temporary-residents.html" } },
      { title: "Solicita OHIP, si cumples los requisitos", text: "Hazlo en persona en ServiceOntario con tres documentos originales: estatus en Canadá, residencia en Ontario e identidad. Los trabajadores temporales necesitan un empleo de tiempo completo de al menos 6 meses con un empleador de Ontario.", warning: "Mientras no tengas cobertura, considera un seguro médico privado.", link: { label: "Gobierno de Ontario — Solicitar OHIP", href: "https://www.ontario.ca/page/apply-ohip-and-get-health-card" } },
      { title: "Canjea tu licencia de conducir", text: "Puedes conducir con tu licencia válida durante 60 días. Revisa si tu país tiene acuerdo de canje con Ontario o qué exámenes debes presentar.", warning: "Los documentos en otro idioma necesitan una traducción certificada.", link: { label: "Gobierno de Ontario — Canje de licencias", href: "https://www.ontario.ca/page/exchange-out-province-drivers-licence" } },
      { title: "Abre una cuenta bancaria", text: "Necesitarás una cuenta para recibir tu salario y los beneficios. La Agencia de Consumo en Materia Financiera de Canadá explica qué identificación te pueden pedir y tus derechos al abrirla.", link: { label: "Gobierno de Canadá — Abrir una cuenta bancaria", href: "https://www.canada.ca/en/financial-consumer-agency/services/banking/opening-bank-account.html" } },
      { title: "Encuentra vivienda y conoce tus derechos como inquilino", text: "El contrato debe ser el estándar de Ontario, y el depósito no puede superar un mes de alquiler. El alquiler solo puede subir una vez cada 12 meses, con 90 días de aviso por escrito.", warning: "Nunca pagues un depósito sin ver la vivienda y comprobar quién la alquila.", link: { label: "Gobierno de Ontario — Alquilar en Ontario", href: "https://www.ontario.ca/page/renting-ontario-your-rights" } },
      { title: "Inscribe a tus hijos en la escuela", text: "Comunícate con el consejo escolar (school board) de tu zona para saber qué escuela te corresponde y qué documentos llevar. La escuela pública es gratuita.", link: { label: "Gobierno de Ontario — Sistema escolar", href: "https://www.ontario.ca/page/your-childs-education-parent-guide-our-school-system" } },
      { title: "Busca servicios de asentamiento y clases de idioma", text: "Hay orientación, clases de inglés o francés y apoyo para el empleo sin costo, si cumples los requisitos de elegibilidad.", link: { label: "Gobierno de Ontario — Recién llegados", href: "https://www.ontario.ca/page/newcomers" } },
      { title: "Busca empleo con ayuda gratuita", text: "Employment Ontario ayuda sin costo a buscar empleo, preparar tu hoja de vida (résumé) y encontrar formación; Job Bank publica ofertas y salarios por ocupación.", warning: "Ningún empleador legítimo te cobra por una oferta de empleo.", link: { label: "Gobierno de Ontario — Employment Ontario", href: "https://www.ontario.ca/page/employment-ontario" } },
    ],
    scams: [
      { title: "Estafas de empleo", text: "Ofertas que piden pagar por el puesto, por una evaluación de impacto en el mercado laboral (LMIA) o por «asegurar» una visa; sueldos muy altos por poco trabajo; entrevistas solo por chat." },
      { title: "Estafas de vivienda", text: "Anuncios con precios muy por debajo de la zona, propietarios que «están fuera del país» y piden transferencias, o presión para pagar antes de ver la vivienda o firmar el contrato estándar." },
      { title: "Estafas de inmigración", text: "Llamadas o mensajes que dicen ser de IRCC o de la policía y exigen pagos inmediatos, o asesores que garantizan una nominación del OINP. Si pagas a alguien para que te ayude con un trámite migratorio, debe ser un representante autorizado: un consultor regulado, un abogado o un notario de Quebec." },
    ],
    news: { province: "Ontario", category: "Ontario", limit: 6 },
  },
};
