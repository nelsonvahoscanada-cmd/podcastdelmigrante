/*
  guia-rutas.js — Páginas de ruta dentro de una categoría de
  "Información útil para migrantes"
  ======================================================================
  Un nivel más profundo que guia.html: cada tarjeta de "ruta" dentro de
  una categoría (ej. "Quiero venir a Canadá" dentro de Migración) puede
  tener su propia página dedicada, leída por guia-ruta.html vía
  ?ruta=slug. Misma arquitectura que el resto del sitio: un objeto por
  ruta, una sola plantilla reutilizable para todas las rutas futuras
  de cualquier categoría.

  Todas las afirmaciones migratorias de este archivo están verificadas
  contra páginas oficiales de IRCC/Government of Canada (ver `sources`
  de cada ruta) — no se inventan requisitos, tiempos, costos ni
  probabilidades de aprobación.
========================================================================= */

const GUIA_RUTAS = {
  "quiero-venir-canada": {
    slug: "quiero-venir-canada",
    parentCategoria: "migracion",
    parentLabel: "Migración",
    title: "Quiero venir a Canadá",
    dek: "Empieza por definir para qué quieres venir.",
    intro: "No existe una sola forma de venir a Canadá. El documento, permiso o programa que debes revisar depende principalmente de lo que quieres hacer en el país y de tu situación particular. Utiliza esta guía como punto de partida y verifica siempre los requisitos vigentes en las fuentes oficiales.",
    paths: [
      {
        title: "Quiero visitar Canadá",
        body: `
          <p>Dependiendo de tu situación, para viajar a Canadá como visitante puedes necesitar una <strong>visitor visa</strong> (también llamada temporary resident visa) o una <strong>Electronic Travel Authorization (eTA)</strong>. Cuál de las dos te corresponde depende principalmente de tu nacionalidad y del documento de viaje que tengas.</p>
          <p>Es importante tener claro que una visitor visa o una eTA te permiten viajar y solicitar la entrada a Canadá, pero <strong>no garantizan la admisión</strong> — la decisión final la toma un oficial en el punto de entrada. Además, una eTA por sí sola <strong>no te autoriza a trabajar ni a estudiar</strong> en Canadá.</p>
        `,
        cta: "Revisar requisitos para visitar →",
        href: "guia-ruta.html?subruta=quiero-visitar-canada",
        sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html",
      },
      {
        title: "Quiero estudiar en Canadá",
        body: `
          <p>Para estudiar en Canadá generalmente necesitas un <strong>study permit</strong>, además de una carta de aceptación de una <strong>Designated Learning Institution (DLI)</strong> — una institución autorizada por el gobierno para recibir estudiantes internacionales — y demostrar que cuentas con los fondos necesarios, entre otros requisitos.</p>
          <p>Existe una excepción importante: si tu programa de estudios dura <strong>seis meses o menos</strong> y no forma parte de un programa más largo, puedes estar exento de solicitar un study permit, siempre que cumplas las condiciones oficiales. Los programas de <strong>más de seis meses</strong> normalmente sí requieren study permit.</p>
        `,
        cta: "Conocer cómo estudiar en Canadá →",
        href: null,
        sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/eligibility/study-without-permit.html",
      },
      {
        title: "Quiero trabajar en Canadá",
        body: `
          <p>Existen dos grandes tipos de permiso de trabajo: el <strong>employer-specific work permit</strong>, vinculado a un empleador, ocupación y ubicación específicos, y el <strong>open work permit</strong>, que permite trabajar para la mayoría de empleadores en Canadá.</p>
          <p>Un employer-specific work permit normalmente requiere una <strong>oferta de trabajo</strong> de un empleador canadiense. El open work permit <strong>no está disponible para cualquier persona</strong> — su elegibilidad depende de circunstancias específicas (por ejemplo, ciertos programas, situaciones familiares o etapas de un trámite migratorio), no es una opción general de entrada.</p>
        `,
        cta: "Explorar permisos de trabajo →",
        href: null,
        sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/employer-specific.html",
      },
      {
        title: "Quiero vivir permanentemente en Canadá",
        body: `
          <p>Existen distintas rutas oficiales hacia la residencia permanente, entre ellas <strong>Express Entry</strong> (para trabajadores calificados), los <strong>Provincial Nominee Programs</strong> (nominación por una provincia o territorio), el <strong>family sponsorship</strong> (patrocinio familiar) y otros programas oficiales.</p>
          <p>Cada ruta tiene sus propios requisitos y criterios de elegibilidad. Ninguna de estas opciones está garantizada — la elegibilidad se evalúa de forma individual según tu situación particular.</p>
        `,
        cta: "Explorar residencia permanente →",
        href: null,
        sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html",
      },
    ],
    toolCallout: {
      title: "¿Todavía no sabes qué camino corresponde a tu situación?",
      desc: "IRCC ofrece una herramienta oficial (Come to Canada) que hace algunas preguntas sobre tu situación y, según tus respuestas, indica qué programas podrías explorar y los pasos a seguir. Es una herramienta de referencia — no toma la decisión migratoria por ti.",
      cta: "Explorar programas oficiales de Canadá →",
      href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/come-canada-tool.html",
    },
    beforePaying: {
      title: "Antes de pagarle a alguien, revisa esto",
      tips: [
        "Define claramente para qué quieres venir.",
        "Consulta primero Canada.ca/IRCC.",
        "Revisa los requisitos actuales del programa.",
        "Nunca asumas que una oferta, visa o residencia está garantizada.",
        "Si utilizas representación pagada, verifica que el representante esté autorizado.",
      ],
    },
    sources: [
      { label: "Immigration, Refugees and Citizenship Canada (IRCC)", href: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
      { label: "Government of Canada — Visit Canada (visitor visa / eTA)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html" },
      { label: "Government of Canada — Who can study without a study permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/eligibility/study-without-permit.html" },
      { label: "Government of Canada — Employer-specific work permits", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/employer-specific.html" },
      { label: "Government of Canada — Open work permits", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/open-work-permit.html" },
      { label: "Government of Canada — Immigrate to Canada (rutas de residencia permanente)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
      { label: "Government of Canada — Come to Canada tool", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/come-canada-tool.html" },
      { label: "Government of Canada — Protégete del fraude migratorio", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/newcomers.html" },
    ],
    disclaimer: "El contenido de esta sección es informativo y educativo. Las políticas, requisitos y programas migratorios pueden cambiar y la situación de cada persona es diferente. Antes de tomar una decisión sobre un caso particular, verifica la información vigente en las fuentes oficiales del Gobierno de Canadá o consulta a un profesional autorizado.",
  },
};
