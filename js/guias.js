/*
  guias.js — Información útil para migrantes (páginas de categoría)
  ======================================================================
  Un "hub" editorial por categoría (Migración, y en el futuro Empleo,
  Vivienda, Educación, Finanzas, Servicios), leído por guia.html desde
  la clave de categoría (?categoria=migracion). Misma arquitectura que
  articles.js/desafio-stories.js/life-stories.js: un objeto por
  categoría, una sola plantilla (guia.html + js/guia.js).

  Cada ruta (route) es una tarjeta informativa breve — no un artículo
  completo todavía. El campo `cta` es el texto del botón tal como fue
  aprobado; por ahora ninguna ruta tiene página propia de destino
  (`href: null`), así que el CTA se muestra como texto, nunca como un
  enlace falso. Agregar la página propia de una ruta en el futuro es
  solo poner su `href` — no requiere tocar la plantilla.

  "Últimas guías de esta categoría" se alimenta automáticamente de
  ARTICLES (js/articles.js) filtrando por `category` exacto y
  `demo === false`, para no mostrar nunca contenido de demostración
  aquí. Agregar un artículo nuevo de la categoría lo hace aparecer
  solo, sin tocar esta página.
========================================================================= */

const USEFUL_GUIDES = {
  migracion: {
    slug: "migracion",
    label: "Migración",
    title: "Migración a Canadá",
    dek: "Información clara para entender tu estatus, tus documentos y los principales procesos migratorios en Canadá.",
    intro: "Cada proceso migratorio es diferente. En esta sección encontrarás información general, guías prácticas y fuentes oficiales para ayudarte a comprender mejor algunos de los principales procesos migratorios de Canadá.",
    searchPlaceholder: "Buscar permiso de trabajo, residencia permanente, estudiar, documentos…",
    routes: [
      {
        title: "Quiero venir a Canadá",
        desc: "Introducción sencilla a las diferencias entre visitar, estudiar, trabajar e inmigrar permanentemente.",
        cta: "Ver guía →",
        href: "guia-ruta.html?ruta=quiero-venir-canada",
      },
      {
        title: "Ya estoy en Canadá",
        desc: "Información organizada según la situación del usuario: visitante, estudiante, trabajador temporal o residente permanente.",
        cta: "Ver guía →",
        href: "guia-ruta.html?ruta=ya-estoy-en-canada",
      },
      {
        title: "Permisos de trabajo",
        desc: "Información general sobre permisos abiertos, permisos vinculados a empleador, condiciones, vigencia y cambios relacionados con el permiso.",
        cta: "Ver guía →",
        href: null,
      },
      {
        title: "Estudiar en Canadá",
        desc: "Información general sobre study permits, instituciones designadas, programas, condiciones para trabajar durante los estudios y otros aspectos que deben verificarse antes de estudiar.",
        cta: "Ver guía →",
        href: null,
      },
      {
        title: "Residencia permanente",
        desc: "Introducción a algunas de las principales rutas, incluyendo Express Entry, programas provinciales, patrocinio familiar y otros programas oficiales. Ninguna ruta está garantizada ni determina elegibilidad individual.",
        cta: "Ver guía →",
        href: null,
      },
      {
        title: "Documentos importantes",
        desc: "Organización y explicación general de documentos que pueden ser relevantes durante la vida migratoria en Canadá: pasaporte, permisos, Confirmation of Permanent Residence (COPR), PR card y otros documentos oficiales según corresponda.",
        cta: "Ver guía →",
        href: null,
      },
      {
        title: "Servicios para recién llegados",
        desc: "Existen servicios de asentamiento financiados por el Gobierno de Canadá para personas elegibles — la elegibilidad depende del estatus y del programa, no todos los inmigrantes tienen acceso gratuito. Desde el 1 de abril de 2026 existen límites de tiempo específicos para residentes permanentes de clase económica que acceden a servicios financiados por IRCC.",
        cta: "Encontrar servicios →",
        href: null,
        sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/changes-settlement-service-eligibility-economic-immigrants.html",
      },
      {
        title: "Fraudes y estafas migratorias",
        desc: "Nadie puede garantizar una visa, un permiso de trabajo o la residencia permanente. Verifica que tu representante esté autorizado, desconfía de solicitudes sospechosas de dinero o documentos, y confirma siempre la información directamente en fuentes oficiales.",
        cta: "Cómo protegerte →",
        href: null,
        sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/newcomers.html",
      },
    ],
    sources: [
      { label: "Immigration, Refugees and Citizenship Canada (IRCC)", href: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
      { label: "Government of Canada — Immigrate to Canada (rutas de residencia permanente)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
      { label: "Government of Canada — Work in Canada (permisos de trabajo)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit.html" },
      { label: "Government of Canada — Study in Canada (study permits)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html" },
      { label: "Government of Canada — New immigrants (servicios para recién llegados)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants.html" },
      { label: "Government of Canada — Protégete del fraude migratorio", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/newcomers.html" },
      { label: "Government of Alberta — Immigrate to Alberta", href: "https://www.alberta.ca/immigrate-to-alberta" },
    ],
    disclaimer: "El contenido de esta sección es informativo y educativo. Las políticas, requisitos y programas migratorios pueden cambiar y la situación de cada persona es diferente. Antes de tomar una decisión sobre un caso particular, verifica la información vigente en las fuentes oficiales del Gobierno de Canadá o consulta a un profesional autorizado.",
  },
};
