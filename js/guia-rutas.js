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
        cta: { label: "Buscar servicios para recién llegados →", href: "guia-ruta.html?ruta=servicios-recien-llegados" },
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
            <li><a href="guia-ruta.html?ruta=fraudes-estafas-migratorias">Fraudes y estafas migratorias</a> (dentro del Magazine).</li>
            <li><a href="guia-ruta.html?ruta=servicios-recien-llegados">Servicios para recién llegados</a> (dentro del Magazine).</li>
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
            <li><a href="guia-ruta.html?ruta=servicios-recien-llegados">Servicios para recién llegados</a> (dentro del Magazine).</li>
            <li><a href="guia-ruta.html?ruta=fraudes-estafas-migratorias">Fraudes y estafas migratorias</a> (dentro del Magazine).</li>
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

  "documentos-importantes": {
    slug: "documentos-importantes",
    parentCategoria: "migracion",
    parentLabel: "Migración",
    title: "Documentos importantes en Canadá",
    dek: "Identifica qué documentos corresponden a tu situación, revisa sus fechas y mantenlos organizados y protegidos.",
    intro: "Cuando llegas o vives en Canadá, diferentes documentos pueden demostrar tu identidad, tu estatus migratorio, tu autorización para trabajar o estudiar y otra información importante. No todas las personas necesitan los mismos documentos. Lo importante es saber cuáles corresponden a tu situación, entender qué demuestra cada uno y revisar periódicamente sus fechas y condiciones.",

    situationQuestion: {
      title: "Empieza por identificar tus documentos",
      cards: [
        {
          num: "01",
          title: "Pasaporte o documento de viaje",
          desc: "Es uno de tus principales documentos de identidad y viaje. Revisa siempre su fecha de vencimiento — su vigencia puede afectar la duración de tu work permit, study permit o visitor record, ya que IRCC normalmente no puede emitirlos más allá de la fecha de vencimiento del pasaporte.",
          cta: "Revisar mi pasaporte →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/passport-travel-document.html",
        },
        {
          num: "02",
          title: "Tu documento migratorio",
          desc: "Dependiendo de tu situación, puedes tener un work permit, study permit, visitor record, Confirmation of Permanent Residence u otro documento emitido por IRCC. Identifica exactamente cuál tienes y lee las condiciones y fechas que aparecen en él — no son el mismo documento.",
          cta: "Identificar mi documento →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay/about.html",
        },
        {
          num: "03",
          title: "Social Insurance Number (SIN)",
          desc: "Número personal y confidencial utilizado para trabajar legalmente en Canadá y acceder a determinados programas y servicios. Los residentes temporales autorizados a trabajar deben revisar que la información y fecha de vencimiento de su registro SIN correspondan a su documento migratorio vigente.",
          cta: "Información oficial sobre el SIN →",
          href: "https://www.canada.ca/en/employment-social-development/services/sin.html",
        },
        {
          num: "04",
          title: "Documentos personales y familiares",
          desc: "Dependiendo del trámite, pueden ser importantes: certificado de nacimiento, certificado de matrimonio, documentos de divorcio o separación, de adopción, de cambio legal de nombre, o relacionados con hijos o dependientes. No todos son necesarios para todas las solicitudes.",
          cta: "Ver documentos que pueden solicitar →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/common-supporting-documents.html",
        },
        {
          num: "05",
          title: "Estudios y experiencia laboral",
          desc: "Para determinados procesos puede ser necesario demostrar estudios, experiencia laboral o ambos: diplomas y títulos, transcripts, Educational Credential Assessment (ECA) cuando corresponda, contratos y cartas laborales, pay stubs, T4 o Notice of Assessment.",
          cta: "Revisar documentos de respaldo →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/common-supporting-documents.html",
        },
        {
          num: "06",
          title: "Documentos familiares",
          desc: "Si realizas trámites junto con tu pareja, hijos u otros familiares, determinados procesos pueden requerir pruebas de identidad, parentesco, custodia, matrimonio o unión de hecho.",
          cta: "Revisar documentación familiar →",
          href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/common-supporting-documents.html",
        },
      ],
    },

    infoSections: [
      {
        heading: "Tu visa y tu estatus en Canadá no son necesariamente lo mismo",
        variant: "callout",
        bodyHtml: `
          <p>Es importante distinguir entre los documentos utilizados para viajar a Canadá y los documentos que muestran las condiciones de tu estadía dentro del país. Por ejemplo:</p>
          <ul>
            <li>Una visitor visa permite viajar y solicitar entrada a Canadá, pero no determina por sí sola cuánto tiempo puedes permanecer.</li>
            <li>Una eTA es una autorización electrónica de viaje para determinados viajeros y tampoco representa por sí sola autorización para trabajar o estudiar.</li>
            <li>Un visitor record no es una visa.</li>
            <li>Un work permit establece autorización y condiciones para trabajar.</li>
            <li>Un study permit establece autorización y condiciones para estudiar.</li>
            <li>Una PR card sirve como prueba oficial del estatus de residente permanente.</li>
          </ul>
          <p><strong>Lee siempre el documento específico que corresponde a tu situación.</strong></p>
        `,
      },
      {
        heading: "Revisa estas 5 cosas",
        bodyHtml: `
          <ol>
            <li><strong>Tu nombre.</strong> Verifica que tu nombre y demás datos personales estén correctamente escritos.</li>
            <li><strong>Fecha de vencimiento.</strong> No esperes hasta el último momento para revisar cuándo vence tu pasaporte o documento migratorio.</li>
            <li><strong>Condiciones.</strong> Lee las condiciones impresas en tu work permit, study permit, visitor record u otro documento.</li>
            <li><strong>Pasaporte.</strong> Comprueba que tenga suficiente vigencia para tus próximos trámites.</li>
            <li><strong>Cambios en tu situación.</strong> Si recibes un nuevo permiso, cambias de estatus, cambias legalmente de nombre u ocurre otro cambio relevante, revisa qué registros o documentos necesitas actualizar.</li>
          </ol>
        `,
      },
      {
        heading: "No compartas tus documentos con cualquiera",
        variant: "warning",
        bodyHtml: `
          <p>Tus documentos de identidad y tu SIN contienen información personal sensible.</p>
          <ul>
            <li>Guarda los originales en un lugar seguro.</li>
            <li>Conserva copias digitales protegidas.</li>
            <li>Evita enviar documentos personales a desconocidos.</li>
            <li>Confirma quién solicita la información y para qué.</li>
            <li>Protege especialmente tu SIN.</li>
            <li>Evita publicar fotografías de permisos, pasaportes o documentos migratorios en redes sociales.</li>
          </ul>
          <p><strong>Tu SIN es confidencial. No debe utilizarse como una identificación general para cualquier situación.</strong></p>
        `,
      },
      {
        heading: "Perdí, me robaron o dañé un documento migratorio",
        bodyHtml: `
          <p>IRCC dispone de procedimientos para reemplazar determinados documentos migratorios válidos que hayan sido perdidos, robados o destruidos, entre ellos, según corresponda: visitor record, work permit, study permit, determinados documentos de residencia permanente u otros documentos migratorios.</p>
          <p>No todos los documentos pueden reemplazarse mediante el mismo procedimiento.</p>
        `,
        cta: { label: "Revisar cómo reemplazar un documento →", href: "https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=44" },
      },
      {
        heading: "No uses una lista genérica para todos los trámites",
        bodyHtml: `
          <p>Cada programa migratorio tiene sus propios requisitos. Cuando presentes una solicitud:</p>
          <ol>
            <li>Identifica exactamente el programa.</li>
            <li>Utiliza la guía oficial correspondiente.</li>
            <li>Revisa el document checklist de tu solicitud.</li>
            <li>Verifica que los documentos estén vigentes.</li>
            <li>Revisa si necesitas traducciones.</li>
            <li>Conserva una copia de lo que envías.</li>
          </ol>
          <p>IRCC genera listas de documentos según el tipo de solicitud. No asumas que una lista encontrada en redes sociales corresponde a tu caso.</p>
        `,
      },
      {
        heading: "¿Tus documentos no están en inglés o francés?",
        bodyHtml: `<p>Dependiendo de la solicitud, IRCC puede exigir traducciones de documentos que estén en otros idiomas. No existe aquí una regla universal sobre quién puede traducirlos — revisa los requisitos oficiales de tu solicitud específica.</p>`,
        cta: { label: "Revisar requisitos oficiales de documentos →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/common-supporting-documents.html" },
      },
      {
        heading: "¿Estás preparando una solicitud?",
        bodyHtml: `
          <p>Antes de enviar documentos, revisa la guía y el checklist oficial del programa migratorio específico al que estás aplicando.</p>
          <div class="guia-cta-row">
            <a class="btn" href="https://www.canada.ca/en/immigration-refugees-citizenship/services/application/common-supporting-documents.html" target="_blank" rel="noopener">Revisar documentos en IRCC →</a>
            <a class="btn-outline" href="guia.html?categoria=migracion">Volver a Migración →</a>
          </div>
        `,
      },
    ],

    checklist: {
      title: "Organiza tus documentos antes de necesitarlos",
      items: [
        "Pasaporte vigente",
        "Documento migratorio actual",
        "Copia de documentos migratorios anteriores",
        "SIN / confirmación del SIN, cuando corresponda",
        "Certificados de nacimiento",
        "Certificado de matrimonio o documentos familiares, cuando corresponda",
        "Diplomas y documentos académicos",
        "Contratos y cartas laborales",
        "Pay stubs",
        "T4 y Notices of Assessment, cuando corresponda",
        "Documentos de vivienda relevantes",
        "Correspondencia importante de IRCC",
        "Copias de solicitudes y documentos enviados en trámites importantes",
      ],
      note: "Esta lista es solamente una herramienta de organización. No significa que todos estos documentos sean obligatorios para cada persona o solicitud.",
    },

    sources: [
      { label: "IRCC — Supporting documents", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/common-supporting-documents.html" },
      { label: "IRCC — Passport and travel documents", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/passport-travel-document.html" },
      { label: "Service Canada — Social Insurance Number", href: "https://www.canada.ca/en/employment-social-development/services/sin.html" },
      { label: "Service Canada — SIN for temporary residents", href: "https://www.canada.ca/en/employment-social-development/services/sin/temporary-residents.html" },
      { label: "IRCC — Replacing lost, stolen or destroyed immigration documents", href: "https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=44" },
      { label: "IRCC — Visitor record", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay/about.html" },
    ],

    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Los documentos y requisitos dependen del estatus de cada persona, del programa y del trámite específico. Las reglas y requisitos pueden cambiar. Verifica siempre la información vigente directamente con Immigration, Refugees and Citizenship Canada (IRCC), Service Canada u otra autoridad correspondiente, o consulta a un profesional autorizado.",
  },

  "servicios-recien-llegados": {
    slug: "servicios-recien-llegados",
    parentCategoria: "migracion",
    parentLabel: "Migración",
    title: "Servicios para recién llegados a Canadá",
    dek: "Encuentra apoyo para establecerte, buscar empleo, mejorar tu inglés o francés, conectar con tu comunidad y adaptarte a tu nueva vida en Canadá.",
    intro: "Llegar a Canadá no significa que tengas que resolverlo todo solo. Existen organizaciones y programas que ayudan a personas elegibles a comprender cómo funciona su nueva comunidad, buscar empleo, mejorar sus idiomas, acceder a recursos y establecerse en Canadá. Muchos servicios de asentamiento financiados por el Gobierno de Canadá son gratuitos para las personas elegibles.",

    situationQuestion: {
      title: "¿Qué tipo de ayuda necesitas?",
      cards: [
        { num: "01", title: "Ayuda para establecerme", desc: "Organizaciones de asentamiento pueden ayudarte a entender servicios disponibles, completar tus primeros pasos en Canadá y conectarte con recursos de tu comunidad.", cta: "Ver servicios disponibles →", href: "https://www.ircc.canada.ca/english/newcomers/services/index.asp" },
        { num: "02", title: "Ayuda para encontrar trabajo", desc: "Existen servicios que pueden ayudarte con la búsqueda de empleo, preparación de résumé, entrevistas y orientación sobre el mercado laboral canadiense.", cta: "Explorar apoyo laboral →", href: "https://www.ircc.canada.ca/english/newcomers/services/index.asp" },
        { num: "03", title: "Aprender inglés o francés", desc: "Dependiendo de tu situación migratoria y elegibilidad, puedes encontrar evaluaciones de idioma, clases y otros recursos para mejorar tu inglés o francés.", cta: "Buscar apoyo de idiomas →", href: "https://www.ircc.canada.ca/english/newcomers/services/index.asp" },
        { num: "04", title: "Escuela y apoyo para mi familia", desc: "Las organizaciones para recién llegados pueden orientar a las familias sobre escuelas, servicios para niños y jóvenes y otros recursos comunitarios.", cta: "Conocer recursos familiares →", href: "https://www.ircc.canada.ca/english/newcomers/services/index.asp" },
        { num: "05", title: "Conectarme con mi comunidad", desc: "Programas comunitarios pueden ayudarte a conocer personas, entender mejor tu nueva ciudad y crear nuevas redes sociales y profesionales.", cta: "Explorar conexiones comunitarias →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/community-connections.html" },
        { num: "06", title: "Reconocimiento de estudios y profesión", desc: "Si estudiaste o ejerciste una profesión fuera de Canadá, infórmate sobre evaluación de credenciales, profesiones reguladas y los pasos que podrían corresponder a tu ocupación.", cta: "Revisar información →", href: "https://www.ircc.canada.ca/english/newcomers/services/index.asp" },
      ],
    },

    infoSections: [
      {
        heading: "Muchos servicios pueden ser gratuitos, pero la elegibilidad depende de tu situación",
        variant: "callout",
        bodyHtml: `<p>El Gobierno de Canadá financia servicios gratuitos de asentamiento para determinados recién llegados elegibles. La elegibilidad depende, entre otros factores, de tu estatus y del programa mediante el cual llegaste a Canadá — no todos los inmigrantes, trabajadores temporales, estudiantes o visitantes tienen derecho a estos servicios.</p>`,
      },
      {
        heading: "Si eres residente permanente de clase económica, revisa este cambio",
        bodyHtml: `
          <p>Desde el 1 de abril de 2026, los residentes permanentes de clase económica elegibles pueden acceder a los servicios de asentamiento financiados por IRCC durante un período de hasta 6 años desde la fecha en que obtuvieron la residencia permanente. Desde el 1 de abril de 2027, ese período será de hasta 5 años.</p>
          <p>Estas limitaciones no se aplican de la misma manera a todos los grupos de recién llegados. Por eso es importante verificar tu elegibilidad directamente con IRCC o con una organización proveedora de servicios.</p>
        `,
        cta: { label: "Revisar elegibilidad de servicios →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/newcomer-services/eligibility.html" },
      },
      {
        heading: "¿En qué pueden ayudarte?",
        bodyHtml: `
          <ul>
            <li>Orientación para establecerte en Canadá.</li>
            <li>Búsqueda de empleo.</li>
            <li>Preparación de résumé.</li>
            <li>Preparación para entrevistas.</li>
            <li>Evaluación o capacitación lingüística.</li>
            <li>Inscripción de niños en la escuela.</li>
            <li>Recursos para jóvenes.</li>
            <li>Conexión con organizaciones comunitarias.</li>
            <li>Información sobre servicios locales.</li>
            <li>Adaptación a la vida en Canadá.</li>
          </ul>
          <p>Los servicios disponibles varían según la organización y tu elegibilidad.</p>
        `,
      },
      {
        heading: "Encuentra servicios cerca de ti",
        bodyHtml: `<p>IRCC dispone de un buscador oficial que permite encontrar organizaciones y servicios para recién llegados utilizando tu ciudad, provincia, territorio o código postal.</p>`,
        cta: { label: "Buscar servicios cerca de mí →", href: "https://www.ircc.canada.ca/english/newcomers/services/index.asp" },
      },
      {
        heading: "¿Todavía estás fuera de Canadá?",
        bodyHtml: `<p>Algunas personas cuya residencia permanente ya fue aprobada pueden ser elegibles para servicios gratuitos antes de llegar a Canadá. Estos programas pueden ayudar a prepararse para la vida, el trabajo y el establecimiento antes del viaje — no están disponibles para cualquier visitante, estudiante o trabajador.</p>`,
        cta: { label: "Conocer servicios previos a la llegada →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/pre-arrival-services.html" },
      },
      {
        heading: "Apoyo para niños y jóvenes recién llegados",
        bodyHtml: `
          <p>Existen recursos que pueden ayudar a jóvenes recién llegados a:</p>
          <ul>
            <li>Adaptarse a la escuela.</li>
            <li>Practicar inglés o francés.</li>
            <li>Participar en actividades.</li>
            <li>Conocer su comunidad.</li>
            <li>Desarrollar nuevas conexiones.</li>
          </ul>
        `,
        cta: { label: "Ver recursos para jóvenes →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/youth-services.html" },
      },
      {
        heading: "¿Y si no califico para los servicios financiados por IRCC?",
        bodyHtml: `<p>No ser elegible para un servicio financiado por IRCC no significa que no exista ayuda disponible. Provincias, municipios, bibliotecas, centros comunitarios y organizaciones locales también pueden ofrecer programas y recursos — no todos son necesariamente gratuitos.</p>`,
      },
      {
        heading: "Si vives en Quebec",
        bodyHtml: `<p>Los servicios de integración en Quebec se administran de manera diferente. Consulta los recursos oficiales del Gobierno de Quebec para conocer los servicios disponibles.</p>`,
        cta: { label: "Servicios de integración en Quebec →", href: "https://www.quebec.ca/en/immigration/integration-service-for-immigrants" },
      },
    ],

    sources: [
      { label: "IRCC — Settling in Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada.html" },
      { label: "IRCC — Eligibility for newcomer services", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/newcomer-services/eligibility.html" },
      { label: "IRCC — Find free newcomer services near you", href: "https://www.ircc.canada.ca/english/newcomers/services/index.asp" },
      { label: "IRCC — Pre-arrival services", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/pre-arrival-services.html" },
      { label: "IRCC — Youth services", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/youth-services.html" },
      { label: "IRCC — Community connections", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/community-connections.html" },
    ],

    disclaimerHeading: "Información general",
    disclaimer: "El contenido de esta guía tiene fines informativos y educativos y no constituye asesoría legal ni migratoria. Los programas, requisitos, servicios y políticas pueden cambiar. Verifica siempre la información vigente directamente con Immigration, Refugees and Citizenship Canada (IRCC) u otra autoridad oficial correspondiente antes de tomar decisiones sobre tu situación migratoria.",
  },

  "fraudes-estafas-migratorias": {
    slug: "fraudes-estafas-migratorias",
    parentCategoria: "migracion",
    parentLabel: "Migración",
    title: "Fraudes y estafas migratorias",
    dek: "Aprende a reconocer señales de alerta, verificar quién te asesora y proteger tu dinero, tus documentos y tu proceso migratorio.",
    intro: "Esta guía tiene un propósito educativo y preventivo. Te ayuda a reconocer señales de alerta comunes y a verificar información oficial antes de tomar decisiones — no acusa a empresas ni personas concretas.",

    situationQuestion: {
      title: "¿Qué te preocupa?",
      cards: [
        { num: "01", title: "Me prometen una visa o residencia garantizada", desc: "Nadie puede garantizar que una solicitud de visa, permiso o residencia permanente será aprobada. Las decisiones corresponden a las autoridades migratorias de Canadá.", cta: "Reconocer señales de alerta →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud.html" },
        { num: "02", title: "Me ofrecen un trabajo \"garantizado\"", desc: "Desconfía de ofertas que prometen empleo o inmigración garantizada, especialmente cuando exigen pagos, datos personales o condiciones poco claras.", cta: "Revisar antes de pagar →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud.html" },
        { num: "03", title: "Quieren cobrarme por asesoría migratoria", desc: "Si una persona cobra por representarte o darte asesoría migratoria, verifica que esté autorizada para hacerlo en Canadá.", cta: "Verificar representante →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/learn-about-representatives.html" },
        { num: "04", title: "Recibí una llamada, correo o mensaje de IRCC", desc: "Los estafadores pueden hacerse pasar por autoridades migratorias y utilizar llamadas, correos, mensajes, redes sociales o sitios web falsos.", cta: "Aprender a identificarlos →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/internet-email-telephone.html" },
        { num: "05", title: "Me piden documentos o información falsa", desc: "Nunca presentes información falsa, documentos alterados o datos que sabes que no son correctos, aunque alguien te diga que eso ayudará a tu solicitud.", cta: "Conocer las consecuencias →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/consequences-fraud.html" },
        { num: "06", title: "Creo que fui víctima de una estafa", desc: "Si entregaste dinero, información personal o documentos a alguien sospechoso, existen canales oficiales para reportar lo ocurrido y buscar orientación.", cta: "Saber cómo reportarlo →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/report-fraud.html" },
      ],
    },

    infoSections: [
      {
        heading: "Una regla que puede protegerte",
        variant: "callout",
        bodyHtml: `
          <p><strong>Nadie puede garantizarte una visa, un permiso de trabajo o la residencia permanente en Canadá.</strong></p>
          <p>Utilizar un representante tampoco garantiza que tu solicitud sea aprobada ni le da un tratamiento especial.</p>
        `,
      },
      {
        heading: "¿Quién puede cobrar por representarte?",
        bodyHtml: `
          <p>Los representantes remunerados autorizados pueden incluir:</p>
          <ul>
            <li>Abogados y paralegales miembros en buen estado de una sociedad jurídica provincial o territorial canadiense.</li>
            <li>Notarios miembros en buen estado de la Chambre des notaires du Québec.</li>
            <li>Consultores de inmigración o ciudadanía miembros en buen estado del College of Immigration and Citizenship Consultants.</li>
          </ul>
          <p><strong>No necesitas contratar un representante para presentar una solicitud migratoria.</strong> Los formularios e instrucciones oficiales de IRCC están disponibles gratuitamente.</p>
        `,
        cta: { label: "Verificar si mi representante está autorizado →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/learn-about-representatives.html" },
      },
      {
        heading: "¿IRCC te está pidiendo dinero?",
        bodyHtml: `
          <p>Según IRCC, sus empleados no:</p>
          <ul>
            <li>Piden depósitos en cuentas bancarias personales.</li>
            <li>Solicitan transferencias mediante servicios privados de envío de dinero.</li>
            <li>Amenazan al solicitante.</li>
            <li>Ofrecen acuerdos migratorios especiales.</li>
            <li>Utilizan cuentas gratuitas como Gmail, Hotmail o Yahoo para comunicarse oficialmente.</li>
          </ul>
          <p>Los estafadores pueden manipular identificadores de llamadas o crear páginas y mensajes que parecen auténticos. No confíes solamente en el nombre o número que aparece en la pantalla.</p>
        `,
        cta: { label: "Revisar cómo se comunica IRCC →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/internet-email-telephone.html" },
      },
      {
        heading: "Antes de ingresar tus datos, revisa la dirección",
        variant: "warning",
        bodyHtml: `
          <p>Los estafadores pueden crear páginas que imitan sitios gubernamentales. Antes de proporcionar información personal o realizar un pago:</p>
          <ul>
            <li>Revisa cuidadosamente el dominio.</li>
            <li>Busca la información directamente desde Canada.ca.</li>
            <li>Evita enlaces sospechosos recibidos por mensajes o redes sociales.</li>
            <li>Recuerda que los formularios y guías oficiales de IRCC son gratuitos.</li>
          </ul>
          <p><strong>Que una página tenga un diseño profesional no significa que pertenezca al Gobierno de Canadá.</strong></p>
        `,
      },
      {
        heading: "Una oferta laboral no debe convertirse en una compra de \"residencia garantizada\"",
        bodyHtml: `<p>Una oferta de empleo por sí sola no significa que una persona tenga garantizada una visa, un permiso de trabajo o la residencia permanente. Ten cuidado con personas que venden supuestas ofertas laborales, cartas u otros documentos prometiendo aprobación migratoria — aunque no todo cobro relacionado con reclutamiento constituye automáticamente fraude, conviene mantenerse prudente y remitirse siempre a fuentes oficiales.</p>`,
      },
      {
        heading: "Tú eres responsable de lo que aparece en tu solicitud",
        variant: "warning",
        bodyHtml: `
          <p>Aunque otra persona prepare o presente tu solicitud, eres responsable de la información entregada a IRCC. Presentar documentos falsos o alterados, o proporcionar información falsa, puede tener consecuencias migratorias graves. Por ejemplo:</p>
          <ul>
            <li>Pasaportes o documentos de viaje alterados.</li>
            <li>Resultados de idioma falsos.</li>
            <li>Ofertas de empleo falsas.</li>
            <li>Cartas de aceptación falsas.</li>
            <li>Diplomas o certificados falsos.</li>
            <li>Documentos familiares falsos.</li>
            <li>Certificados policiales o documentos judiciales falsos.</li>
          </ul>
        `,
        cta: { label: "Conocer las consecuencias del fraude →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/consequences-fraud.html" },
      },
      {
        heading: "No ignores lo ocurrido",
        bodyHtml: `
          <p>La forma correcta de reportar un fraude depende del tipo de situación y de si estás dentro o fuera de Canadá. Si existe peligro inmediato o una emergencia, utiliza los servicios de emergencia correspondientes. Esta guía no sustituye asesoría jurídica individual.</p>
          <div class="guia-cta-row">
            <a class="btn" href="https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/report-fraud.html" target="_blank" rel="noopener">Reportar fraude o abuso →</a>
            <a class="btn-outline" href="https://www.antifraudcentre-centreantifraude.ca/index-eng.htm" target="_blank" rel="noopener">Canadian Anti-Fraud Centre →</a>
          </div>
        `,
      },
      {
        heading: "Antes de creer una promesa migratoria",
        bodyHtml: `
          <ul>
            <li><strong>Detente.</strong> No pagues ni entregues documentos bajo presión.</li>
            <li><strong>Verifica.</strong> Busca la información directamente en una fuente oficial.</li>
            <li><strong>Confirma.</strong> Comprueba las credenciales de cualquier persona que cobre por asesorarte o representarte.</li>
          </ul>
          <p>Una decisión de unos minutos puede proteger tus documentos, tu dinero y tu proceso migratorio.</p>
        `,
      },
    ],

    checklist: {
      title: "Señales que deberían hacerte verificar antes de continuar",
      items: [
        "\u201cTe garantizo la visa.\u201d",
        "\u201cTengo contactos dentro de inmigración.\u201d",
        "\u201cPuedo acelerar tu aprobación si pagas más.\u201d",
        "\u201cPaga a esta cuenta bancaria personal.\u201d",
        "\u201cEnvía dinero mediante una transferencia privada.\u201d",
        "\u201cPon esta información aunque no sea cierta.\u201d",
        "\u201cCompra esta oferta laboral para poder inmigrar.\u201d",
        "\u201cDebes pagar inmediatamente o perderás tu estatus.\u201d",
        "Una oferta laboral con salario extraordinario o condiciones demasiado buenas para parecer reales.",
        "Una página que intenta parecer oficial pero cuya dirección web no corresponde a un sitio oficial del Gobierno de Canadá.",
      ],
      note: "Una señal de alerta no siempre demuestra por sí sola que existe fraude, pero es motivo suficiente para detenerte y verificar.",
    },

    beforePaying: {
      title: "Haz estas verificaciones primero",
      tips: [
        "Identifica exactamente qué servicio estás pagando.",
        "Verifica las tarifas oficiales directamente en Canada.ca cuando se trate de pagos gubernamentales.",
        "Si estás pagando asesoría o representación migratoria, verifica que la persona esté autorizada.",
        "Solicita por escrito el alcance del servicio y conserva contratos y comprobantes.",
        "Nunca firmes formularios en blanco.",
        "Revisa tu solicitud antes de enviarla.",
        "Conserva copias de los documentos presentados.",
      ],
    },

    sources: [
      { label: "IRCC — Immigration and citizenship fraud and scams", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud.html" },
      { label: "IRCC — Online and telephone immigration scams", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/internet-email-telephone.html" },
      { label: "IRCC — Using an immigration and citizenship representative", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/learn-about-representatives.html" },
      { label: "IRCC — Consequences of immigration and citizenship fraud", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/consequences-fraud.html" },
      { label: "IRCC — Report fraud or abuse", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/report-fraud.html" },
      { label: "Canadian Anti-Fraud Centre", href: "https://www.antifraudcentre-centreantifraude.ca/index-eng.htm" },
    ],

    disclaimerHeading: "Información general",
    disclaimer: "El contenido de esta guía tiene fines informativos y educativos y no constituye asesoría legal ni migratoria. Los programas, requisitos, servicios y políticas pueden cambiar. Verifica siempre la información vigente directamente con Immigration, Refugees and Citizenship Canada (IRCC) u otra autoridad oficial correspondiente antes de tomar decisiones sobre tu situación migratoria.",
  },
};
