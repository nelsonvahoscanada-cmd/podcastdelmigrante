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
  "ya-estoy-en-canada": {
    slug: "ya-estoy-en-canada",
    parentCategoria: "migracion",
    parentLabel: "Migración",
    title: "Ya estoy en Canadá",
    dek: "Identifica tu situación actual y revisa qué debes tener en cuenta para mantener tus documentos y estatus en orden.",
    intro: "Si ya estás en Canadá, los pasos que debes revisar dependen principalmente de tu situación migratoria actual. Utiliza esta guía para identificar el punto de partida que corresponde a tu caso y acceder a información oficial.",

    situationQuestion: {
      title: "¿Cuál es tu situación actual?",
      cards: [
        {
          num: "01",
          title: "Estoy como visitante",
          desc: "Revisa cuánto tiempo estás autorizado a permanecer, cómo solicitar una extensión y qué debes hacer si tu estatus está próximo a vencer.",
          cta: "Revisar mi situación como visitante →",
          href: null,
          sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay.html",
        },
        {
          num: "02",
          title: "Estoy como estudiante",
          desc: "Revisa la vigencia y condiciones de tu study permit, qué ocurre cuando se acerca su vencimiento y qué debes considerar si necesitas extenderlo o cambiar tu situación.",
          cta: "Revisar mi situación como estudiante →",
          href: null,
          sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit.html",
        },
        {
          num: "03",
          title: "Estoy como trabajador temporal",
          desc: "Revisa las condiciones y fecha de vencimiento de tu work permit y qué opciones oficiales debes consultar antes de que expire.",
          cta: "Revisar mi situación como trabajador →",
          href: null,
          sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend-permit.html",
        },
        {
          num: "04",
          title: "Soy residente permanente",
          desc: "Encuentra información sobre tu estatus de residente permanente, PR card, servicios para recién llegados y otros documentos importantes para establecerte en Canadá.",
          cta: "Revisar información para residentes permanentes →",
          href: null,
          sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants.html",
        },
      ],
    },

    infoSections: [
      {
        heading: "Tu visa y tu estatus en Canadá no son necesariamente lo mismo",
        variant: "callout",
        bodyHtml: `<p>El documento que usaste para viajar a Canadá y el estatus o autorización que tienes para permanecer, estudiar o trabajar no son necesariamente lo mismo. Revisa el documento que corresponda a tu situación (visitor visa, study permit, work permit o visitor record) y las condiciones que aparecen en él, en lugar de asumir que todos funcionan de la misma manera.</p>`,
      },
      {
        heading: "No esperes a que tu documento expire para revisar qué debes hacer",
        bodyHtml: `
          <p>Quienes necesiten extender o cambiar determinadas condiciones de su estancia deben revisar y presentar la solicitud correspondiente antes de que expire su estatus actual, cuando las reglas aplicables así lo permitan.</p>
          <p>IRCC contempla situaciones en las que una persona que presentó correctamente una solicitud antes del vencimiento puede permanecer legalmente en Canadá mientras se procesa. Sin embargo, los derechos para continuar estudiando o trabajando dependen de la solicitud específica y de las condiciones aplicables — no siempre es correcto decir simplemente "si aplicas antes puedes seguir trabajando".</p>
        `,
        cta: { label: "Consultar extensión o cambio de condiciones en IRCC →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay.html" },
      },
      {
        heading: "¿Qué pasa si mi estatus ya venció?",
        variant: "warning",
        bodyHtml: `
          <p>Perder el estatus no significa que todas las personas tengan automáticamente la misma solución.</p>
          <p>En determinadas circunstancias, una persona puede ser elegible para solicitar la restauración de su estatus (restoration of status). La regla general de IRCC contempla solicitudes dentro de los 90 días de haber perdido el estatus, siempre que se cumplan las condiciones aplicables — la aprobación no está garantizada.</p>
          <p><strong>Si tu permiso o estatus ya venció, no asumas que puedes continuar trabajando o estudiando. Revisa inmediatamente las reglas correspondientes a tu situación.</strong></p>
        `,
        cta: { label: "Consultar restauración de estatus →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/restoration-status.html" },
      },
      {
        heading: "¿Necesitas ayuda para establecerte en Canadá?",
        bodyHtml: `
          <p>Canadá financia servicios de asentamiento para personas elegibles, que pueden incluir orientación para empleo, idioma, educación, comunidad y otras necesidades de establecimiento. La elegibilidad depende del estatus y del programa — no todos los inmigrantes o residentes temporales tienen acceso gratuito.</p>
          <p>Desde el 1 de abril de 2026 existen límites de tiempo para el acceso de residentes permanentes de clase económica a determinados servicios de asentamiento financiados federalmente. La elegibilidad debe verificarse directamente con IRCC.</p>
        `,
        cta: { label: "Buscar servicios para recién llegados →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/newcomer-services.html" },
      },
    ],

    checklist: {
      title: "Checklist — si ya estás en Canadá",
      items: [
        "Identifiqué cuál es mi estatus actual.",
        "Revisé la fecha de vencimiento de mi permiso o estadía autorizada.",
        "Conozco las condiciones que aparecen en mi documento.",
        "Sé si necesito extender o cambiar alguna condición.",
        "No estoy asumiendo que una solicitud me autoriza automáticamente a trabajar o estudiar.",
        "Tengo organizados mis documentos migratorios.",
        "Sé dónde consultar información oficial si mi situación cambia.",
      ],
      note: "Este checklist es orientativo y no sustituye los requisitos oficiales aplicables a cada persona.",
    },

    sources: [
      { label: "IRCC — Extend or change your stay in Canada (visitantes)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay.html" },
      { label: "IRCC — Visitor record", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay/about.html" },
      { label: "IRCC — Extend your study permit or restore your status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit.html" },
      { label: "IRCC — Extend your work permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend-permit.html" },
      { label: "IRCC — Restoration of temporary resident status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/restoration-status.html" },
      { label: "IRCC — Permanent resident cards and status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants.html" },
      { label: "IRCC — Find free newcomer services near you", href: "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/newcomer-services.html" },
    ],

    disclaimer: "El contenido de esta sección es informativo y educativo. Las políticas, requisitos y programas migratorios pueden cambiar y la situación de cada persona es diferente. Antes de tomar una decisión sobre un caso particular, verifica la información vigente en las fuentes oficiales del Gobierno de Canadá o consulta a un profesional autorizado.",
  },
};
