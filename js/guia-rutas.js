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
        href: "guia-ruta.html?subruta=quiero-estudiar-canada",
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
        href: "guia-ruta.html?ruta=residencia-permanente",
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
          href: "guia-ruta.html?subruta=estoy-como-visitante",
          sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay.html",
        },
        {
          num: "02",
          title: "Estoy como estudiante",
          desc: "Revisa la vigencia y condiciones de tu study permit, qué ocurre cuando se acerca su vencimiento y qué debes considerar si necesitas extenderlo o cambiar tu situación.",
          cta: "Revisar mi situación como estudiante →",
          href: "guia-ruta.html?subruta=estoy-como-estudiante",
          sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit.html",
        },
        {
          num: "03",
          title: "Estoy como trabajador temporal",
          desc: "Revisa las condiciones y fecha de vencimiento de tu work permit y qué opciones oficiales debes consultar antes de que expire.",
          cta: "Revisar mi situación como trabajador →",
          href: "guia-ruta.html?subruta=estoy-como-trabajador-temporal",
          sourceHref: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend-permit.html",
        },
        {
          num: "04",
          title: "Soy residente permanente",
          desc: "Encuentra información sobre tu estatus de residente permanente, PR card, servicios para recién llegados y otros documentos importantes para establecerte en Canadá.",
          cta: "Revisar información para residentes permanentes →",
          href: "guia-ruta.html?subruta=soy-residente-permanente",
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

  "permisos-de-trabajo": {
    slug: "permisos-de-trabajo",
    parentCategoria: "migracion",
    parentLabel: "Migración",
    title: "Permisos de trabajo en Canadá",
    dek: "Entiende los principales tipos de permisos de trabajo, sus condiciones y qué revisar antes de solicitar, extender o cambiar tu autorización para trabajar en Canadá.",
    intro: "La mayoría de los ciudadanos extranjeros necesitan autorización para trabajar en Canadá, aunque existen determinadas excepciones. El tipo de permiso y los requisitos dependen de la situación de cada persona y del trabajo que realizará. Esta guía es educativa — no evalúa tu elegibilidad migratoria individual.",

    situationQuestion: {
      title: "Empieza por identificar tu situación",
      cards: [
        { num: "01", title: "Necesito un permiso para trabajar", desc: "Determina si tu actividad requiere un work permit o si podría existir una excepción aplicable.", cta: "Comprobar si necesito un work permit →", href: "guia-ruta.html?subruta=necesito-permiso-trabajo" },
        { num: "02", title: "Employer-specific work permit", desc: "Permiso vinculado a un empleador, ocupación y condiciones específicas.", cta: "Revisar employer-specific work permits →", href: "guia-ruta.html?subruta=employer-specific-work-permit" },
        { num: "03", title: "Open work permit", desc: "Permite trabajar para distintos empleadores, solo en situaciones específicas establecidas por IRCC.", cta: "Comprobar elegibilidad para open work permit →", href: "guia-ruta.html?subruta=open-work-permit" },
        { num: "04", title: "LMIA: qué significa", desc: "Qué es una Labour Market Impact Assessment y cuándo puede ser necesaria.", cta: "Información oficial sobre LMIA →", href: "guia-ruta.html?subruta=que-es-lmia" },
        { num: "05", title: "Mi permiso está por vencer", desc: "Qué revisar y cuándo actuar antes de la fecha de vencimiento.", cta: "Revisar extensión de work permit →", href: "guia-ruta.html?subruta=permiso-trabajo-por-vencer" },
        { num: "06", title: "Quiero cambiar de empleador", desc: "Qué cambia según el tipo de permiso que tengas.", cta: "Revisar cómo cambiar de empleador →", href: "guia-ruta.html?subruta=cambiar-de-empleador" },
        { num: "07", title: "Mi permiso ya venció", desc: "Qué significa la restauración de estatus y sus límites.", cta: "Revisar restauración de estatus →", href: "guia-ruta.html?subruta=permiso-trabajo-vencio" },
        { num: "08", title: "Derechos y protección del trabajador", desc: "Tus derechos laborales y qué hacer si sufres o estás en riesgo de abuso.", cta: "Ayuda para trabajadores vulnerables →", href: "guia-ruta.html?subruta=derechos-trabajador" },
      ],
    },

    infoSections: [
      {
        heading: "¿Desde dónde se solicita un work permit?",
        bodyHtml: `
          <p>Dependiendo de tu situación, un work permit puede solicitarse:</p>
          <ul>
            <li><strong>Desde fuera de Canadá.</strong></li>
            <li><strong>Desde dentro de Canadá</strong>, cuando se cumplen los requisitos aplicables.</li>
            <li><strong>En un puerto de entrada (port of entry)</strong> — solamente cuando se cumplen los requisitos específicos de IRCC.</li>
          </ul>
          <p>No cualquier visitante o trabajador puede simplemente ir a la frontera para obtener un permiso: IRCC establece condiciones específicas para las solicitudes en un port of entry y excluye diversas situaciones (por ejemplo, el Post-Graduation Work Permit ya no puede solicitarse en un port of entry).</p>
        `,
        cta: { label: "Revisar dónde puedo solicitar mi permiso →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/work-permit/eligibility.html" },
      },
      {
        heading: "¿Mi familia también puede trabajar o estudiar?",
        bodyHtml: `<p>Que tengas un work permit no significa automáticamente que tu cónyuge o hijos reciban autorización para trabajar o estudiar. Dependiendo de tu situación, determinados familiares pueden ser elegibles para visitor status, study permit u open work permit.</p>`,
        cta: { label: "Revisar opciones para familiares →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/need-permit/studying-family.html" },
      },
      {
        heading: "Sigue explorando",
        bodyHtml: `
          <p>Esta ruta se conecta con otras secciones de Migración:</p>
          <ul>
            <li><a href="guia-ruta.html?subruta=estoy-como-trabajador-temporal">Ya estoy en Canadá → Estoy como trabajador temporal</a> (dentro del Magazine).</li>
            <li><a href="guia-ruta.html?ruta=estudiar-en-canada">Estudiar en Canadá</a> (dentro del Magazine).</li>
            <li><a href="guia-ruta.html?ruta=residencia-permanente">Residencia permanente</a> (dentro del Magazine).</li>
            <li><a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/newcomers.html" target="_blank" rel="noopener">Fraudes y estafas migratorias</a> — página oficial de IRCC (esta ruta todavía no tiene su propia página dentro del Magazine).</li>
            <li><a href="https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/newcomer-services.html" target="_blank" rel="noopener">Servicios para recién llegados</a> — página oficial de IRCC (esta ruta todavía no tiene su propia página dentro del Magazine).</li>
          </ul>
        `,
      },
    ],

    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "estudiar-en-canada": {
    slug: "estudiar-en-canada",
    parentCategoria: "migracion",
    parentLabel: "Migración",
    title: "Estudiar en Canadá",
    dek: "Entiende qué debes revisar antes de elegir una institución, solicitar un permiso de estudios, trabajar mientras estudias y planear qué hacer después de graduarte.",
    intro: "Estudiar en Canadá implica mucho más que recibir una carta de aceptación. Antes de pagar matrícula o tomar una decisión, conviene verificar que la institución y el programa correspondan a tus objetivos y conocer los requisitos migratorios aplicables. Esta guía es educativa y práctica — no vende estudios ni recomienda instituciones.",

    situationQuestion: {
      title: "¿En qué etapa estás?",
      cards: [
        { num: "01", title: "Quiero estudiar en Canadá", desc: "Qué es un DLI y si tu caso requiere study permit.", cta: "Comprobar si necesito study permit →", href: "guia-ruta.html?subruta=quiero-estudiar-canada" },
        { num: "02", title: "Elegir institución y programa", desc: "Qué verificar antes de pagar matrícula.", cta: "Ver checklist antes de elegir →", href: "guia-ruta.html?subruta=elegir-institucion-programa" },
        { num: "03", title: "Solicitar el study permit", desc: "Desde dónde se solicita y qué documentos pueden formar parte del proceso.", cta: "Revisar cómo solicitar →", href: "guia-ruta.html?subruta=solicitar-study-permit" },
        { num: "04", title: "PAL / TAL y documentos", desc: "Qué es la carta de atestación provincial o territorial y sus excepciones vigentes.", cta: "Comprobar si necesito PAL/TAL →", href: "guia-ruta.html?subruta=pal-tal-documentos" },
        { num: "05", title: "Trabajar mientras estudio", desc: "Trabajo dentro y fuera del campus, y las reglas actuales para co-op/internships.", cta: "Comprobar si puedo trabajar →", href: "guia-ruta.html?subruta=trabajar-mientras-estudio" },
        { num: "06", title: "Mi study permit está por vencer", desc: "Extensión, maintained status y qué pasa si ya venció.", cta: "Revisar extensión →", href: "guia-ruta.html?subruta=study-permit-por-vencer" },
        { num: "07", title: "Terminé mis estudios / PGWP", desc: "Elegibilidad para el Post-Graduation Work Permit y cuándo vence tu study permit.", cta: "Comprobar elegibilidad para PGWP →", href: "guia-ruta.html?subruta=termine-estudios-pgwp" },
        { num: "08", title: "Mi familia viene conmigo", desc: "Qué pueden y no pueden hacer tu pareja e hijos.", cta: "Revisar opciones familiares →", href: "guia-ruta.html?subruta=mi-familia-viene-conmigo" },
      ],
    },

    checklist: {
      title: "Antes de pagar, verifica",
      items: [
        "¿La institución aparece en el listado oficial DLI?",
        "¿El programa específico puede ser elegible para PGWP si ese es tu objetivo?",
        "¿Entiendes el costo completo del programa?",
        "¿Conoces los requisitos de fondos?",
        "¿Necesitas PAL/TAL?",
        "¿Sabes cuáles son realmente tus derechos para trabajar?",
        "¿La persona que te asesora en inmigración está autorizada?",
      ],
      note: "Una admisión a una institución educativa no es garantía de aprobación de un study permit, permiso de trabajo o residencia permanente.",
    },

    infoSections: [
      {
        heading: "Estudiar no garantiza residencia permanente",
        bodyHtml: `<p>La educación canadiense puede formar parte del perfil migratorio de una persona, pero completar estudios en Canadá no concede automáticamente residencia permanente.</p>`,
        cta: { label: "Explorar residencia permanente →", href: "guia-ruta.html?ruta=residencia-permanente" },
      },
      {
        heading: "Sigue explorando",
        bodyHtml: `
          <p>Esta ruta se conecta con otras secciones de Migración:</p>
          <ul>
            <li><a href="guia-ruta.html?subruta=quiero-estudiar-canada">Quiero venir a Canadá → Quiero estudiar</a> (dentro del Magazine).</li>
            <li><a href="guia-ruta.html?ruta=ya-estoy-en-canada">Ya estoy en Canadá → Estoy como estudiante</a> (dentro del Magazine).</li>
            <li><a href="guia-ruta.html?ruta=permisos-de-trabajo">Permisos de trabajo</a> (dentro del Magazine).</li>
            <li><a href="guia-ruta.html?ruta=residencia-permanente">Residencia permanente</a> (dentro del Magazine).</li>
            <li><a href="https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/newcomer-services.html" target="_blank" rel="noopener">Servicios para recién llegados</a> — página oficial de IRCC (esta ruta todavía no tiene su propia página dentro del Magazine).</li>
            <li><a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/newcomers.html" target="_blank" rel="noopener">Fraudes y estafas migratorias</a> — página oficial de IRCC (esta ruta todavía no tiene su propia página dentro del Magazine).</li>
          </ul>
        `,
      },
    ],

    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },

  "residencia-permanente": {
    slug: "residencia-permanente",
    parentCategoria: "migracion",
    parentLabel: "Migración",
    title: "Residencia permanente en Canadá",
    dek: "Conoce las principales vías para obtener la residencia permanente y empieza por identificar cuál podría corresponder a tu situación.",
    intro: "No existe una única vía para obtener la residencia permanente en Canadá. Las opciones pueden depender de factores como tu experiencia laboral, estudios, edad, conocimiento de inglés o francés, provincia donde deseas establecerte, experiencia previa en Canadá, oferta de empleo, vínculos familiares y otros requisitos establecidos por cada programa. Esta guía busca ayudarte a entender las principales rutas y dirigirte siempre a las fuentes oficiales para revisar los requisitos vigentes.",

    situationQuestion: {
      title: "¿Qué camino quieres explorar?",
      cards: [
        {
          num: "01",
          title: "Express Entry",
          desc: "Sistema federal que administra solicitudes de trabajadores calificados a través de Canadian Experience Class, Federal Skilled Worker Program y Federal Skilled Trades Program.",
          cta: "Conocer Express Entry →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
        },
        {
          num: "02",
          title: "Provincial Nominee Program (PNP)",
          desc: "Las provincias y territorios pueden nominar candidatos que cumplan con sus necesidades económicas y los requisitos de sus programas migratorios. Los requisitos, categorías y períodos de apertura varían según la provincia o territorio.",
          cta: "Explorar programas provinciales →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html",
        },
        {
          num: "03",
          title: "Tengo experiencia laboral en Canadá",
          desc: "La experiencia laboral obtenida legalmente en Canadá puede ser relevante para determinadas vías, especialmente Canadian Experience Class (CEC) — aunque haber trabajado en Canadá no te hace automáticamente elegible.",
          cta: "Revisar opciones con experiencia canadiense →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/canadian-experience-class.html",
        },
        {
          num: "04",
          title: "Estudié en Canadá",
          desc: "Haber estudiado en Canadá puede formar parte del camino migratorio de algunas personas, pero graduarse no otorga automáticamente la residencia permanente. La experiencia laboral posterior y otros factores pueden ser relevantes.",
          cta: "Revisar opciones después de estudiar →",
          href: "guia-ruta.html?ruta=estudiar-en-canada",
        },
        {
          num: "05",
          title: "Programas regionales y comunitarios",
          desc: "Además de Express Entry y los programas provinciales, existen vías regionales y comunitarias para candidatos que cumplen requisitos específicos, como el Atlantic Immigration Program, el Rural Community Immigration Pilot y el Francophone Community Immigration Pilot.",
          cta: "Explorar programas regionales →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots.html",
        },
        {
          num: "06",
          title: "Patrocinio familiar",
          desc: "Los ciudadanos canadienses y residentes permanentes que cumplen determinados requisitos pueden patrocinar a ciertos familiares elegibles para obtener la residencia permanente — no cualquier familiar puede ser patrocinado.",
          cta: "Conocer el patrocinio familiar →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html",
        },
      ],
    },

    infoSections: [
      {
        heading: "Entrar a Express Entry no significa que ya tengas residencia permanente",
        variant: "callout",
        bodyHtml: `
          <p>Express Entry funciona mediante un sistema de perfiles y selección. De forma simplificada:</p>
          <ol>
            <li>Revisas si eres elegible para uno de los programas administrados por Express Entry.</li>
            <li>Si eres elegible, puedes crear y enviar un perfil.</li>
            <li>Los perfiles elegibles ingresan al pool y reciben una puntuación bajo el Comprehensive Ranking System (CRS).</li>
            <li>IRCC realiza rondas de invitaciones.</li>
            <li>Si recibes una Invitation to Apply (ITA), puedes presentar una solicitud de residencia permanente.</li>
            <li>IRCC revisa la solicitud y toma una decisión.</li>
          </ol>
          <p><strong>Crear un perfil o ingresar al pool no garantiza recibir una Invitation to Apply.</strong></p>
        `,
      },
      {
        heading: "¿De qué depende mi elegibilidad?",
        bodyHtml: `
          <ul>
            <li>Experiencia laboral.</li>
            <li>Educación.</li>
            <li>Inglés o francés.</li>
            <li>Edad.</li>
            <li>Experiencia canadiense.</li>
            <li>Provincia o territorio.</li>
            <li>Oferta laboral, cuando corresponda.</li>
            <li>Composición familiar.</li>
            <li>Admisibilidad.</li>
            <li>Programa migratorio específico.</li>
          </ul>
          <p>Cada programa utiliza criterios diferentes. No existe una fórmula única que determine la elegibilidad para todas las vías de residencia permanente.</p>
        `,
      },
      {
        heading: "¿No sabes qué programa podría aplicar a tu situación?",
        bodyHtml: `
          <p>IRCC ofrece herramientas oficiales que pueden ayudarte a explorar programas de inmigración según tu situación.</p>
          <div class="guia-cta-row">
            <a class="btn" href="https://ircc.canada.ca/explore-programs/" target="_blank" rel="noopener">Explorar programas oficiales →</a>
            <a class="btn-outline" href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html" target="_blank" rel="noopener">Revisar Express Entry →</a>
          </div>
        `,
      },
    ],

    beforePaying: {
      title: "Antes de pagarle a alguien, identifica primero el programa",
      tips: [
        "Identifica el nombre exacto del programa migratorio.",
        "Revisa el programa en Canada.ca.",
        "Confirma que actualmente esté abierto y que cumplas los requisitos.",
        "Verifica cualquier representante migratorio que estés considerando contratar.",
        "Desconfía de quien garantice una residencia permanente o una aprobación.",
      ],
    },

    sources: [
      { label: "IRCC — Live in Canada permanently", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
      { label: "IRCC — Express Entry", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html" },
      { label: "IRCC — Explore immigration programs", href: "https://ircc.canada.ca/explore-programs/" },
      { label: "IRCC — Canadian Experience Class", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/canadian-experience-class.html" },
      { label: "IRCC — Rural and Francophone Community Immigration Pilots", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots.html" },
      { label: "IRCC — Atlantic Immigration Program", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html" },
      { label: "IRCC — Family sponsorship", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html" },
    ],

    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Los programas, requisitos, cupos, criterios y procedimientos migratorios pueden cambiar. Verifica siempre la información vigente directamente con Immigration, Refugees and Citizenship Canada (IRCC), la provincia o territorio correspondiente, o consulta a un profesional autorizado.",
  },
};
