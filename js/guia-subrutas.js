/*
  guia-subrutas.js — Subguías dentro de una ruta
  ======================================================================
  Un nivel más profundo que guia-rutas.js: Migración → Quiero venir a
  Canadá → Quiero visitar Canadá. Misma plantilla técnica
  (guia-ruta.html/guia-ruta.js), leída por ?subruta=slug — así no hace
  falta un archivo HTML nuevo por cada subguía futura (Estudiar,
  Trabajar, Residencia permanente seguirán el mismo patrón).

  Todas las afirmaciones migratorias están verificadas contra páginas
  oficiales de IRCC/Government of Canada (ver `sources`) — no se
  inventan montos, listas cerradas de países, tiempos ni probabilidades
  de aprobación.
========================================================================= */

const GUIA_SUBRUTAS = {
  "quiero-visitar-canada": {
    slug: "quiero-visitar-canada",
    parentRuta: "quiero-venir-canada",
    parentRutaLabel: "Quiero venir a Canadá",
    title: "Quiero visitar Canadá",
    dek: "Antes de comprar un boleto, identifica qué documento necesitas y qué debes demostrar para entrar como visitante.",
    intro: "Viajar a Canadá como visitante no funciona igual para todas las personas. Dependiendo de tu nacionalidad, documento de viaje y forma de entrada, puedes necesitar una visa de visitante o una autorización electrónica de viaje (eTA). Además, tener uno de estos documentos no garantiza la entrada a Canadá.",

    sections: [
      {
        heading: "1. ¿Necesito visa o eTA?",
        bodyHtml: `
          <p>Dependiendo de tu situación, puede requerirse una <strong>visitor visa</strong> (Temporary Resident Visa) o una <strong>Electronic Travel Authorization (eTA)</strong>.</p>
          <p>El documento que necesitas depende de factores como tu nacionalidad, tu documento de viaje y cómo viajarás a Canadá. Estas reglas pueden cambiar, así que no existe una lista fija de países que se mantenga siempre igual — lo correcto es verificarlo directamente para tu caso.</p>
        `,
        cta: { label: "Comprobar qué documento necesito →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/come-canada-tool-visit.html" },
      },
      {
        heading: "2. Requisitos básicos para visitar Canadá",
        bodyHtml: `
          <p>Según IRCC, entre los requisitos básicos para visitar Canadá pueden encontrarse:</p>
          <ul>
            <li>Tener un documento de viaje válido, como un pasaporte.</li>
            <li>Cumplir los requisitos de salud.</li>
            <li>No tener determinadas condenas penales o problemas migratorios que puedan causar inadmisibilidad.</li>
            <li>Demostrar que existen razones o vínculos que apoyen tu regreso al país de residencia.</li>
            <li>Convencer al oficial de que abandonarás Canadá al terminar la estadía autorizada.</li>
            <li>Disponer de dinero suficiente para la visita.</li>
          </ul>
          <p>IRCC no establece una cantidad única de dinero que sirva para todos los visitantes. Lo necesario depende, entre otros factores, de la duración del viaje y del alojamiento.</p>
        `,
      },
      {
        heading: "3. Documentos que pueden ayudarte a preparar tu solicitud",
        bodyHtml: `
          <p>Los documentos exactos dependen de tu situación y del propósito del viaje. Pueden existir documentos relacionados con:</p>
          <ul>
            <li>Propósito del viaje.</li>
            <li>Situación laboral o económica.</li>
            <li>Fondos disponibles.</li>
            <li>Alojamiento.</li>
            <li>Itinerario.</li>
            <li>Vínculos con tu país de residencia.</li>
            <li>Carta de invitación, cuando corresponda.</li>
          </ul>
          <p>Esta lista no es universal ni garantiza que entregar determinado documento produzca una aprobación. IRCC reconoce, por ejemplo, cartas de invitación, pruebas laborales y pruebas financieras entre los documentos de respaldo que pueden resultar pertinentes según la solicitud.</p>
        `,
        cta: { label: "Consultar documentos oficiales →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/letter-invitation.html" },
      },
      {
        heading: "4. ¿Cuánto tiempo puedo permanecer en Canadá?",
        bodyHtml: `
          <p>La mayoría de los visitantes puede permanecer hasta seis meses, pero el oficial de servicios fronterizos puede autorizar un período menor o mayor dependiendo de las circunstancias y el propósito de la visita.</p>
          <p>Es importante entender una diferencia fundamental: <strong>la fecha de vencimiento de una visitor visa no indica necesariamente hasta cuándo puedes permanecer en Canadá</strong>. Esa fecha se relaciona con el uso del documento para viajar y entrar; la duración autorizada de tu estadía se determina al entrar y puede constar en el sello de tu pasaporte o en un visitor record.</p>
        `,
      },
      {
        heading: "5. ¿Puedo extender mi estadía?",
        bodyHtml: `
          <p>Si quieres permanecer en Canadá más tiempo del autorizado, puedes solicitar un <strong>visitor record</strong>.</p>
          <p><strong>Un visitor record no es una visa.</strong> Sirve para extender o documentar tu estadía autorizada como visitante, pero no garantiza que puedas salir de Canadá y volver a entrar.</p>
          <p>IRCC recomienda solicitar la extensión al menos 30 días antes de que termine tu estadía autorizada.</p>
        `,
        cta: { label: "Consultar cómo extender mi estadía →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay/about.html" },
      },
    ],

    callouts: [
      {
        title: "Una visa o eTA no garantiza la entrada",
        bodyHtml: `<p>Una visitor visa o una eTA permite viajar hacia Canadá cuando corresponde, pero la decisión de admisión se toma en el punto de entrada. El oficial debe determinar que cumples los requisitos para ingresar. IRCC confirma expresamente que una eTA no garantiza la entrada.</p>`,
      },
      {
        title: "No confundas visitar con trabajar",
        bodyHtml: `<p>Ser visitante no significa automáticamente tener autorización para trabajar en Canadá. Una eTA tampoco concede por sí misma autorización para trabajar o estudiar — la mayoría de las personas necesita el permiso correspondiente. (Esa información pertenece a la guía "Quiero trabajar en Canadá".)</p>`,
      },
    ],

    checklist: {
      title: "Checklist antes de viajar",
      items: [
        "Verifiqué si necesito visitor visa o eTA.",
        "Mi pasaporte/documento de viaje está vigente.",
        "Tengo claro el propósito de mi visita.",
        "Organicé los documentos relevantes para mi situación.",
        "Puedo explicar cómo financiaré mi estadía.",
        "Conozco las condiciones de mi visita.",
        "Sé cuánto tiempo estoy autorizado a permanecer.",
      ],
      note: "Este checklist es orientativo y no sustituye los requisitos oficiales.",
    },

    sources: [
      { label: "Immigration, Refugees and Citizenship Canada (IRCC) — Visit Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html" },
      { label: "IRCC — Come to Canada tool: ¿necesitas visa o eTA?", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/come-canada-tool-visit.html" },
      { label: "IRCC — Visitor visa (elegibilidad y requisitos)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/visitor-visa.html" },
      { label: "IRCC — Electronic Travel Authorization (eTA): About the process", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta/about.html" },
      { label: "IRCC — Letter of invitation for visitors to Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/letter-invitation.html" },
      { label: "IRCC — Visitor record / Extend your stay", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay/about.html" },
    ],

    disclaimer: "El contenido de esta sección es informativo y educativo. Las políticas, requisitos y programas migratorios pueden cambiar y la situación de cada persona es diferente. Antes de tomar una decisión sobre un caso particular, verifica la información vigente en las fuentes oficiales del Gobierno de Canadá o consulta a un profesional autorizado.",
  },

  /* ---------------------------------------------------------------
     Las cuatro subguías de "Ya estoy en Canadá" comparten el mismo
     bloque de cierre (toolCallout "¿No estás seguro..." + disclaimer
     "Información general") y el mismo breadcrumb de tres niveles
     (Migración → Ya estoy en Canadá → situación), habilitado aquí
     mediante parentCategoria/parentCategoriaLabel.
  --------------------------------------------------------------- */

  "estoy-como-visitante": {
    slug: "estoy-como-visitante",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "ya-estoy-en-canada",
    parentRutaLabel: "Ya estoy en Canadá",
    title: "Estoy como visitante en Canadá",
    dek: "Revisa cuánto tiempo puedes permanecer, qué hacer si necesitas quedarte más tiempo y qué opciones requieren un permiso diferente.",
    intro: "Esta guía te ayuda a identificar qué debes revisar según tu situación actual como visitante en Canadá — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "1. ¿Hasta cuándo puedo permanecer en Canadá?",
        bodyHtml: `
          <p>La visa de visitante y el estatus autorizado dentro de Canadá no son necesariamente lo mismo.</p>
          <p>La mayoría de los visitantes pueden permanecer hasta seis meses, pero un oficial fronterizo puede autorizar un período diferente según las circunstancias de la entrada. Revisa el sello de tu pasaporte, tu visitor record u otra documentación correspondiente a tu entrada para confirmar tu fecha real.</p>
          <p>No asumas que "seis meses" aplica de la misma manera para todos los visitantes.</p>
        `,
      },
      {
        heading: "2. Quiero quedarme más tiempo",
        bodyHtml: `
          <p>Un visitor record puede utilizarse para documentar o extender tu estadía autorizada como visitante, cuando corresponde.</p>
          <p><strong>Un visitor record no es una visa.</strong></p>
          <p>IRCC recomienda solicitar la extensión al menos 30 días antes de que termine tu estadía autorizada.</p>
        `,
        cta: { label: "Revisar cómo extender mi estadía →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay.html" },
      },
      {
        heading: "3. Quiero trabajar en Canadá",
        bodyHtml: `
          <p>Estar en Canadá como visitante no autoriza automáticamente a trabajar. Conseguir una oferta de trabajo no significa simplemente "cambiar de visitante a trabajador" — normalmente se requiere solicitar el permiso correspondiente.</p>
          <p>La política temporal que permitía a determinados visitantes solicitar un work permit desde dentro de Canadá terminó el 28 de agosto de 2024.</p>
        `,
        cta: { label: "Revisar opciones para trabajar →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit.html" },
      },
      {
        heading: "4. Quiero estudiar en Canadá",
        bodyHtml: `
          <p>Determinados estudios de corta duración (seis meses o menos) pueden realizarse sin study permit cuando se cumplen las condiciones aplicables, mientras que otros programas requieren permiso de estudios. No se debe generalizar sin revisar tu caso.</p>
        `,
        cta: { label: "Revisar opciones para estudiar →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/eligibility/study-without-permit.html" },
      },
      {
        heading: "5. Mi estatus está por vencer",
        bodyHtml: `
          <p>Identifica la fecha real hasta la cual estás autorizado a permanecer en Canadá y revisa tus opciones antes del vencimiento.</p>
          <p><strong>La fecha de vencimiento de una visitor visa no necesariamente indica hasta cuándo puedes permanecer en Canadá.</strong></p>
        `,
      },
      {
        heading: "6. Mi estatus ya venció",
        bodyHtml: `
          <p>En determinadas circunstancias, una persona puede ser elegible para solicitar la restauración de su estatus, generalmente dentro de los 90 días posteriores a haberlo perdido.</p>
          <p><strong>La restauración no es automática ni está garantizada.</strong></p>
        `,
        cta: { label: "Revisar información sobre restauración →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/restoration-status.html" },
      },
    ],
    callouts: [],
    toolCallout: {
      title: "¿No estás seguro de cuál es tu situación?",
      desc: "Antes de tomar una decisión migratoria, identifica qué documento tienes actualmente, su fecha de vencimiento y las condiciones que aparecen en él.",
      cta: "Consultar información oficial de IRCC →",
      href: "https://www.canada.ca/en/immigration-refugees-citizenship.html",
    },
    sources: [
      { label: "IRCC — Visit Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html" },
      { label: "IRCC — Extend or change your stay in Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay.html" },
      { label: "IRCC — Visitor record", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/extend-stay/about.html" },
      { label: "IRCC — Fin de la política temporal de work permit para visitantes (28 de agosto de 2024)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/ends-tpp-allowing-visitors-apply-work-permits-within-country.html" },
      { label: "IRCC — Who can study without a study permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/eligibility/study-without-permit.html" },
      { label: "IRCC — Restoration of temporary resident status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/restoration-status.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "estoy-como-estudiante": {
    slug: "estoy-como-estudiante",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "ya-estoy-en-canada",
    parentRutaLabel: "Ya estoy en Canadá",
    title: "Estoy estudiando en Canadá",
    dek: "Revisa tu permiso de estudios, sus condiciones y los pasos que pueden corresponder antes y después de terminar tus estudios.",
    intro: "Esta guía te ayuda a identificar qué debes revisar según tu situación actual como estudiante en Canadá — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "1. Revisa tu study permit",
        bodyHtml: `
          <p>Revisa directamente en tu documento:</p>
          <ul>
            <li>La fecha de vencimiento.</li>
            <li>La institución y el programa autorizados.</li>
            <li>Las condiciones impresas en el permiso.</li>
            <li>Las condiciones relacionadas con trabajo, cuando correspondan.</li>
          </ul>
        `,
      },
      {
        heading: "2. Mi permiso de estudios está por vencer",
        bodyHtml: `<p>Si necesitas continuar estudiando, revisa los requisitos para extender tu study permit antes de su vencimiento.</p>`,
        cta: { label: "Revisar extensión del study permit →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit.html" },
      },
      {
        heading: "3. Quiero trabajar mientras estudio",
        bodyHtml: `<p>La autorización para trabajar depende de que tú y tu programa cumplan las condiciones establecidas por IRCC — no existe una regla genérica de horas que aplique igual a todos los casos sin verificar la normativa vigente.</p>`,
        cta: { label: "Revisar condiciones para trabajar como estudiante →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html" },
      },
      {
        heading: "4. Estoy terminando mis estudios",
        bodyHtml: `
          <p>El Post-Graduation Work Permit (PGWP) permite a determinados graduados trabajar en Canadá después de sus estudios.</p>
          <p><strong>Graduarse de una institución canadiense no significa automáticamente ser elegible para un PGWP.</strong></p>
        `,
        cta: { label: "Revisar elegibilidad para PGWP →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html" },
      },
      {
        heading: "5. Quiero quedarme en Canadá después de estudiar",
        bodyHtml: `<p>Estudiar en Canadá no garantiza la residencia permanente. Pueden existir programas federales o provinciales para los cuales una persona llegue a ser elegible dependiendo de su perfil.</p>`,
        cta: { label: "Explorar caminos hacia residencia permanente →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
      },
    ],
    callouts: [],
    toolCallout: {
      title: "¿No estás seguro de cuál es tu situación?",
      desc: "Antes de tomar una decisión migratoria, identifica qué documento tienes actualmente, su fecha de vencimiento y las condiciones que aparecen en él.",
      cta: "Consultar información oficial de IRCC →",
      href: "https://www.canada.ca/en/immigration-refugees-citizenship.html",
    },
    sources: [
      { label: "IRCC — Study in Canada (study permit)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html" },
      { label: "IRCC — Extend your study permit or restore your status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit.html" },
      { label: "IRCC — Work off campus as an international student", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html" },
      { label: "IRCC — Work in Canada after you graduate (PGWP)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html" },
      { label: "IRCC — Immigrate to Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "estoy-como-trabajador-temporal": {
    slug: "estoy-como-trabajador-temporal",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "ya-estoy-en-canada",
    parentRutaLabel: "Ya estoy en Canadá",
    title: "Estoy trabajando temporalmente en Canadá",
    dek: "Revisa las condiciones de tu permiso de trabajo, su vencimiento y las opciones que podrían corresponder a tu situación.",
    intro: "Esta guía te ayuda a identificar qué debes revisar según tu situación actual como trabajador temporal en Canadá — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "1. ¿Qué tipo de work permit tengo?",
        bodyHtml: `
          <p>Existen dos grandes tipos: el <strong>employer-specific work permit</strong>, vinculado a un empleador, ocupación y ubicación específicos, y el <strong>open work permit</strong>, que permite trabajar para la mayoría de empleadores.</p>
          <p>Un open work permit solamente está disponible en situaciones específicas establecidas por IRCC — no es una opción general.</p>
        `,
      },
      {
        heading: "2. Mi work permit está por vencer",
        bodyHtml: `<p>Actuar antes del vencimiento es importante: revisa los requisitos para extender o cambiar las condiciones de tu permiso con anticipación.</p>`,
        cta: { label: "Revisar cómo extender o cambiar las condiciones de mi permiso →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend-permit.html" },
      },
      {
        heading: "3. Quiero cambiar de empleador",
        bodyHtml: `<p>Tener un employer-specific work permit normalmente significa que existen condiciones relacionadas con tu empleador. No asumas que puedes comenzar inmediatamente con un nuevo empleador sin revisar las reglas aplicables.</p>`,
        cta: { label: "Revisar las reglas para cambiar de empleador →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend/change-jobs-employers.html" },
      },
      {
        heading: "4. Presenté una solicitud antes de que venciera mi permiso",
        bodyHtml: `
          <p>Determinadas personas que presentan una solicitud elegible antes de que expire su estatus pueden permanecer legalmente en Canadá mientras se procesa (maintained status).</p>
          <p>Sin embargo, si puedes continuar trabajando y bajo qué condiciones depende de la solicitud y de tu situación concreta. <strong>No es correcto asumir simplemente "presenté la solicitud, entonces puedo seguir trabajando".</strong></p>
        `,
      },
      {
        heading: "5. Quiero estudiar",
        bodyHtml: `<p>Tener un work permit no significa automáticamente que cualquier programa de estudios pueda realizarse sin study permit. Revisa la información oficial antes de asumirlo.</p>`,
      },
      {
        heading: "6. Quiero quedarme permanentemente",
        bodyHtml: `<p>Dependiendo de tu elegibilidad, puedes explorar opciones como Express Entry, Provincial Nominee Programs u otros programas económicos aplicables. Ninguna de estas opciones promete elegibilidad ni residencia permanente garantizada.</p>`,
        cta: { label: "Explorar residencia permanente →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
      },
    ],
    callouts: [],
    toolCallout: {
      title: "¿No estás seguro de cuál es tu situación?",
      desc: "Antes de tomar una decisión migratoria, identifica qué documento tienes actualmente, su fecha de vencimiento y las condiciones que aparecen en él.",
      cta: "Consultar información oficial de IRCC →",
      href: "https://www.canada.ca/en/immigration-refugees-citizenship.html",
    },
    sources: [
      { label: "IRCC — Employer-specific work permits", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/employer-specific.html" },
      { label: "IRCC — Open work permits", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/open-work-permit.html" },
      { label: "IRCC — Extend your work permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend-permit.html" },
      { label: "IRCC — Changing jobs or employers", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend/change-jobs-employers.html" },
      { label: "IRCC — Who can study without a study permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/eligibility/study-without-permit.html" },
      { label: "IRCC — Immigrate to Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "soy-residente-permanente": {
    slug: "soy-residente-permanente",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "ya-estoy-en-canada",
    parentRutaLabel: "Ya estoy en Canadá",
    title: "Soy residente permanente de Canadá",
    dek: "Encuentra información esencial sobre tu estatus, PR card, obligaciones de residencia y próximos pasos para establecerte en Canadá.",
    intro: "Esta guía te ayuda a identificar qué debes revisar según tu situación actual como residente permanente en Canadá — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "1. Mi estatus de residente permanente",
        bodyHtml: `
          <p>Tu <strong>estatus de residente permanente</strong> y tu <strong>PR card</strong> son cosas diferentes: el estatus es tu condición migratoria; la tarjeta es un documento de identificación y viaje.</p>
          <p>Que tu PR card venza no significa automáticamente que perdiste tu estatus de residente permanente.</p>
        `,
      },
      {
        heading: "2. Mi PR card está por vencer o venció",
        bodyHtml: `<p>La tarjeta sirve como documento de viaje/evidencia de tu estatus, pero tu estatus de residente permanente y la vigencia de la tarjeta son conceptos diferentes.</p>`,
        cta: { label: "Revisar renovación de PR card →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/permanent-residents/card/apply.html" },
      },
      {
        heading: "3. Voy a viajar fuera de Canadá",
        bodyHtml: `<p>Si vas a regresar a Canadá sin una PR card válida, es posible que necesites un Permanent Resident Travel Document (PRTD), cuando corresponda a tu situación.</p>`,
        cta: { label: "Revisar documentos para regresar a Canadá →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/pr-travel-document.html" },
      },
      {
        heading: "4. Obligación de residencia",
        bodyHtml: `<p>Mantener tu estatus de residente permanente está relacionado con cumplir la residency obligation establecida por IRCC. No existen excepciones ni cálculos que puedan improvisarse — revisa siempre la información vigente directamente con IRCC para tu caso.</p>`,
        cta: { label: "Revisar obligación de residencia →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/permanent-residents/status.html" },
      },
      {
        heading: "5. Servicios para recién llegados",
        bodyHtml: `<p>Existen settlement services, apoyo de empleo, idioma y otros recursos disponibles según tu elegibilidad. La sección "Servicios para recién llegados" de esta misma guía de Migración reunirá esta información — mientras tanto, puedes consultar directamente la herramienta oficial de IRCC.</p>`,
        cta: { label: "Buscar servicios para recién llegados →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/newcomer-services.html" },
      },
      {
        heading: "6. Ciudadanía canadiense",
        bodyHtml: `<p>Ser residente permanente puede ser una etapa previa para quienes posteriormente cumplan los requisitos de ciudadanía, pero no garantiza automáticamente ser elegible.</p>`,
        cta: { label: "Revisar requisitos de ciudadanía →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/become-canadian-citizen/eligibility.html" },
      },
    ],
    callouts: [],
    toolCallout: {
      title: "¿No estás seguro de cuál es tu situación?",
      desc: "Antes de tomar una decisión migratoria, identifica qué documento tienes actualmente, su fecha de vencimiento y las condiciones que aparecen en él.",
      cta: "Consultar información oficial de IRCC →",
      href: "https://www.canada.ca/en/immigration-refugees-citizenship.html",
    },
    sources: [
      { label: "IRCC — Understand permanent resident status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/permanent-residents/status.html" },
      { label: "IRCC — Apply, renew or replace a PR card", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/permanent-residents/card/apply.html" },
      { label: "IRCC — Permanent resident travel document (PRTD)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/pr-travel-document.html" },
      { label: "IRCC — Find free newcomer services near you", href: "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/newcomer-services.html" },
      { label: "IRCC — Canadian citizenship eligibility", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/become-canadian-citizen/eligibility.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  /* ---------------------------------------------------------------
     Las ocho subguías de "Permisos de trabajo" (Ruta 03). Todas
     comparten breadcrumb Migración → Permisos de trabajo → [subguía]
     y el mismo aviso "Información general".
  --------------------------------------------------------------- */

  "necesito-permiso-trabajo": {
    slug: "necesito-permiso-trabajo",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "permisos-de-trabajo",
    parentRutaLabel: "Permisos de trabajo",
    title: "¿Necesito un permiso para trabajar en Canadá?",
    dek: "La mayoría de los ciudadanos extranjeros necesitan un work permit, aunque existen determinadas excepciones.",
    intro: "Esta guía te ayuda a identificar qué debes revisar antes de trabajar en Canadá — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "La mayoría necesita un work permit",
        bodyHtml: `
          <p>La mayoría de los ciudadanos extranjeros necesitan un work permit para trabajar legalmente en Canadá. Sin embargo, existen determinadas actividades y situaciones para las cuales puede existir una exención.</p>
          <p>No existe una lista simplificada que garantice que alguien está automáticamente exento — cada situación debe verificarse.</p>
          <p><strong>Tener una oferta de trabajo no significa automáticamente tener autorización para trabajar.</strong></p>
        `,
      },
      {
        heading: "Debes determinar",
        bodyHtml: `
          <ul>
            <li>Si necesitas un work permit.</li>
            <li>Qué tipo de permiso corresponde a tu situación.</li>
            <li>Si puedes solicitarlo desde fuera o desde dentro de Canadá.</li>
            <li>Si existe una excepción aplicable a tu caso.</li>
          </ul>
        `,
        cta: { label: "Comprobar si necesito un work permit →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/work-without-permit.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Who can work without a work permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/work-without-permit.html" },
      { label: "IRCC — Work in Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "employer-specific-work-permit": {
    slug: "employer-specific-work-permit",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "permisos-de-trabajo",
    parentRutaLabel: "Permisos de trabajo",
    title: "Permiso de trabajo vinculado a un empleador",
    dek: "Un employer-specific work permit permite trabajar según las condiciones indicadas en el permiso.",
    intro: "Esta guía te ayuda a identificar qué debes revisar sobre tu employer-specific work permit — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "Revisa en tu permiso",
        bodyHtml: `
          <ul>
            <li>Empleador.</li>
            <li>Ocupación, cuando corresponda.</li>
            <li>Lugar de trabajo, cuando corresponda.</li>
            <li>Fecha de vencimiento.</li>
            <li>Condiciones.</li>
            <li>Remarks / observaciones.</li>
          </ul>
          <p><strong>Debes respetar las condiciones que aparecen en tu permiso.</strong></p>
          <p>Para solicitar este tipo de permiso generalmente se requiere una oferta de trabajo, y el empleador debe completar determinados pasos.</p>
        `,
      },
      {
        heading: "¿Siempre se necesita LMIA?",
        bodyHtml: `<p><strong>No.</strong> Algunos empleos requieren una Labour Market Impact Assessment (LMIA) y otros pueden estar exentos. La LMIA no debe presentarse como un requisito universal.</p>`,
        cta: { label: "Revisar employer-specific work permits →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/employer-specific.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Employer-specific work permits", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/employer-specific.html" },
      { label: "IRCC — Hire a temporary foreign worker (LMIA)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/hire-temporary-foreign.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "open-work-permit": {
    slug: "open-work-permit",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "permisos-de-trabajo",
    parentRutaLabel: "Permisos de trabajo",
    title: "Open work permit",
    dek: "Un open work permit permite trabajar para distintos empleadores en Canadá, sujeto a las restricciones y condiciones aplicables.",
    intro: "Esta guía te ayuda a identificar qué debes revisar sobre el open work permit — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "No cualquier persona puede solicitarlo",
        bodyHtml: `
          <p><strong>No cualquier persona puede solicitar un open work permit.</strong> Solo está disponible en situaciones específicas establecidas por IRCC, por ejemplo:</p>
          <ul>
            <li>Determinados graduados elegibles para PGWP.</li>
            <li>Determinados cónyuges o parejas elegibles.</li>
            <li>Determinados solicitantes de residencia permanente.</li>
            <li>Refugiados, solicitantes de refugio o personas protegidas en situaciones aplicables.</li>
            <li>Trabajadores vulnerables elegibles.</li>
            <li>Participantes elegibles de determinados programas.</li>
          </ul>
          <p>Pertenecer a una de estas categorías no garantiza automáticamente la elegibilidad. Algunos open work permits pueden además contener restricciones sobre el tipo o lugar de trabajo.</p>
        `,
        cta: { label: "Comprobar elegibilidad para open work permit →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/open-work-permit.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Open work permits", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/open-work-permit.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "que-es-lmia": {
    slug: "que-es-lmia",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "permisos-de-trabajo",
    parentRutaLabel: "Permisos de trabajo",
    title: "¿Qué es una LMIA?",
    dek: "Labour Market Impact Assessment — qué es, cuándo se necesita y cómo protegerte de estafas relacionadas.",
    intro: "Esta guía educativa explica qué es una LMIA en lenguaje sencillo — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "¿Qué es una Labour Market Impact Assessment (LMIA)?",
        bodyHtml: `
          <p>Una LMIA es una evaluación que puede ser necesaria para que determinados empleadores puedan contratar a un trabajador extranjero.</p>
          <p>Normalmente es <strong>el empleador</strong>, no el trabajador, quien realiza el proceso correspondiente para obtener la LMIA cuando es requerida.</p>
        `,
        cta: { label: "Información oficial sobre LMIA →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/hire-temporary-foreign.html" },
      },
      {
        heading: "Trabajo que requiere LMIA",
        bodyHtml: `<p>El empleador debe obtener la documentación correspondiente antes de que el trabajador pueda utilizarla para una solicitud de work permit.</p>`,
      },
      {
        heading: "Trabajo exento de LMIA",
        bodyHtml: `<p>Algunas contrataciones pueden realizarse bajo programas o exenciones aplicables, pero esto no significa necesariamente que el trabajador esté exento de obtener un work permit.</p>`,
      },
    ],
    callouts: [
      {
        title: "⚠️ Cuidado con las estafas",
        bodyHtml: `<p>Una LMIA o una oferta de empleo nunca debe interpretarse por sí sola como garantía de aprobación de un work permit o residencia permanente. Desconfía de cualquier precio de "venta de LMIA" y de intermediarios privados que la ofrezcan como un producto a la venta.</p>`,
      },
    ],
    sources: [
      { label: "IRCC — Hire a temporary foreign worker (LMIA)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/hire-temporary-foreign.html" },
      { label: "IRCC — Protégete del fraude migratorio", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud/newcomers.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "permiso-trabajo-por-vencer": {
    slug: "permiso-trabajo-por-vencer",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "permisos-de-trabajo",
    parentRutaLabel: "Permisos de trabajo",
    title: "Mi work permit está por vencer",
    dek: "Qué revisar y cuándo actuar antes de que expire tu permiso de trabajo.",
    intro: "Esta guía te ayuda a identificar qué debes revisar antes de que venza tu work permit — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "Actúa antes del vencimiento",
        bodyHtml: `<p>Si necesitas extender tu permiso o cambiar determinadas condiciones, revisa tus opciones antes de la fecha de vencimiento. IRCC actualmente recomienda presentar una solicitud para extender o cambiar condiciones al menos 30 días antes de que expire el permiso.</p>`,
        cta: { label: "Revisar extensión de work permit →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend-permit.html" },
      },
      {
        heading: "Presenté mi solicitud antes de que venciera",
        bodyHtml: `
          <p>Si presentas una solicitud elegible para extender o cambiar tu work permit antes de que expire, puedes mantener estatus legal mientras IRCC decide la solicitud (maintained status).</p>
          <p>Respecto al trabajo, <strong>no es correcto simplificar diciendo "aplicaste antes de vencer = puedes trabajar donde quieras".</strong> IRCC señala que una persona que continúa trabajando bajo maintained status normalmente debe respetar las condiciones correspondientes de su permiso anterior mientras se procesa la solicitud, salvo que exista otra autorización aplicable.</p>
        `,
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Extend your work permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend-permit.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "cambiar-de-empleador": {
    slug: "cambiar-de-empleador",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "permisos-de-trabajo",
    parentRutaLabel: "Permisos de trabajo",
    title: "Quiero cambiar de empleador",
    dek: "Lo que debes revisar depende del tipo de permiso de trabajo que tengas.",
    intro: "Esta guía te ayuda a identificar qué debes revisar antes de cambiar de empleador — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "Tengo un open work permit",
        bodyHtml: `<p>Un titular de open work permit válido generalmente puede cambiar de empleador mientras respete las restricciones de su propio permiso.</p>`,
      },
      {
        heading: "Tengo un employer-specific work permit",
        bodyHtml: `<p>Generalmente deberás solicitar un nuevo work permit si quieres cambiar de empleador o de empleo.</p>`,
        cta: { label: "Revisar las reglas para cambiar de empleador →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend/change-jobs-employers.html" },
      },
      {
        heading: "¿Tengo que esperar hasta recibir el nuevo permiso?",
        bodyHtml: `
          <p>IRCC mantiene un proceso mediante el cual determinados trabajadores elegibles que ya están en Canadá y solicitaron un nuevo employer-specific work permit pueden pedir autorización para comenzar el nuevo empleo mientras se procesa su solicitud.</p>
          <p><strong>Presentar la nueva solicitud por sí solo no significa automáticamente que puedas empezar inmediatamente con el nuevo empleador.</strong> Debes cumplir los requisitos y, cuando corresponda, solicitar y recibir la autorización de IRCC antes de comenzar el nuevo empleo.</p>
        `,
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Changing jobs or employers", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/extend/change-jobs-employers.html" },
      { label: "IRCC — Open work permits", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/open-work-permit.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "permiso-trabajo-vencio": {
    slug: "permiso-trabajo-vencio",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "permisos-de-trabajo",
    parentRutaLabel: "Permisos de trabajo",
    title: "Mi work permit ya venció",
    dek: "Qué significa la restauración de estatus y qué no debes asumir mientras la solicitas.",
    intro: "Esta guía te ayuda a identificar qué debes revisar si tu work permit ya venció — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "Si perdiste tu estatus, debes dejar de trabajar",
        bodyHtml: `
          <p><strong>Si perdiste tu estatus y autorización de trabajo, debes dejar de trabajar.</strong></p>
          <p>Determinadas personas pueden ser elegibles para solicitar la restauración de su estatus y un nuevo work permit. Como regla general, IRCC establece un período de 90 días para solicitar la restauración cuando se cumplen los requisitos, aunque pueden existir medidas o excepciones específicas.</p>
        `,
        cta: { label: "Revisar restauración de estatus →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/restoration-status.html" },
      },
    ],
    callouts: [
      {
        title: "Restauración ≠ maintained status",
        bodyHtml: `<p>Solicitar restauración no significa que puedas seguir trabajando mientras esperas. La aprobación no está garantizada.</p>`,
      },
    ],
    sources: [
      { label: "IRCC — Restoration of temporary resident status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/restoration-status.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  "derechos-trabajador": {
    slug: "derechos-trabajador",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "permisos-de-trabajo",
    parentRutaLabel: "Permisos de trabajo",
    title: "Tus derechos como trabajador temporal en Canadá",
    dek: "Los trabajadores extranjeros tienen derechos laborales y existen mecanismos de protección.",
    intro: "Esta guía educativa explica mecanismos oficiales de protección — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "¿Estás sufriendo abuso o estás en riesgo?",
        bodyHtml: `
          <p>IRCC dispone de un <strong>Open Work Permit for Vulnerable Workers</strong> para determinadas personas elegibles que están en Canadá y sufren, o están en riesgo de sufrir, abuso relacionado con su empleo. Esto no promete elegibilidad automática.</p>
          <p>Pueden existir formas de abuso:</p>
          <ul>
            <li>Físico.</li>
            <li>Sexual.</li>
            <li>Financiero.</li>
            <li>Psicológico.</li>
            <li>Amenazas o represalias.</li>
            <li>Determinadas condiciones laborales o de vivienda abusivas.</li>
          </ul>
          <p><strong>Si estás en peligro inmediato, llama al 911.</strong></p>
        `,
        cta: { label: "Ayuda para trabajadores vulnerables →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/special-instructions/vulnerable-workers/eligibility.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Open work permit for vulnerable workers", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/special-instructions/vulnerable-workers/eligibility.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria o legal. Las reglas, programas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC) o consulta a un profesional autorizado.",
  },

  /* ---------------------------------------------------------------
     Las ocho subguías de "Estudiar en Canadá" (Ruta 04). Todas
     comparten breadcrumb Migración → Estudiar en Canadá → [subguía]
     y el aviso "Información general" (versión que menciona también
     asesoría académica/financiera, tal como fue aprobada para esta
     ruta).
  --------------------------------------------------------------- */

  "quiero-estudiar-canada": {
    slug: "quiero-estudiar-canada",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "estudiar-en-canada",
    parentRutaLabel: "Estudiar en Canadá",
    title: "Quiero estudiar en Canadá",
    dek: "La mayoría de los ciudadanos extranjeros necesita un study permit para estudiar en Canadá, aunque existen determinadas excepciones.",
    intro: "Esta guía te ayuda a identificar qué debes revisar antes de estudiar en Canadá — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "¿Qué es un DLI?",
        bodyHtml: `
          <p>Un <strong>Designated Learning Institution (DLI)</strong> es una institución autorizada por una provincia o territorio para recibir estudiantes internacionales.</p>
          <p><strong>Antes de pagar una matrícula, verifica la institución.</strong></p>
        `,
        cta: { label: "Buscar una institución DLI →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html" },
      },
      {
        heading: "¿Todos los estudios requieren study permit?",
        bodyHtml: `<p>Existen determinadas excepciones, incluidos algunos programas de corta duración cuando se cumplen las condiciones aplicables. No cualquier curso de menos de seis meses está automáticamente exento — deben revisarse también las demás condiciones.</p>`,
        cta: { label: "Comprobar si necesito study permit →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/eligibility/study-without-permit.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Study in Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html" },
      { label: "IRCC — Designated Learning Institutions list", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html" },
      { label: "IRCC — Who can study without a study permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/eligibility/study-without-permit.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },

  "elegir-institucion-programa": {
    slug: "elegir-institucion-programa",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "estudiar-en-canada",
    parentRutaLabel: "Estudiar en Canadá",
    title: "Antes de elegir una escuela, college o universidad",
    dek: "Qué verificar antes de pagar matrícula.",
    intro: "Esta guía educativa no recomienda instituciones específicas — te ayuda a identificar qué debes verificar por tu cuenta.",
    sections: [
      {
        heading: "Antes de pagar, verifica",
        bodyHtml: `
          <ul>
            <li>Que la institución sea DLI.</li>
            <li>El programa exacto.</li>
            <li>Duración.</li>
            <li>Requisitos de admisión.</li>
            <li>Costos de matrícula.</li>
            <li>Ciudad/provincia.</li>
            <li>Costos aproximados de vida.</li>
            <li>Condiciones migratorias aplicables.</li>
            <li>Si el programa puede ser elegible para PGWP, si ese es uno de tus objetivos.</li>
          </ul>
        `,
        cta: { label: "Buscar DLI →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html" },
      },
    ],
    callouts: [
      {
        title: "⚠️ DLI no significa automáticamente PGWP",
        bodyHtml: `<p>Que una institución sea un Designated Learning Institution no significa que todos sus programas hagan elegible al graduado para un Post-Graduation Work Permit. IRCC señala que la elegibilidad para PGWP depende de varios requisitos y recomienda comprobar el programa antes de presentar la solicitud de study permit.</p>`,
      },
    ],
    sources: [
      { label: "IRCC — Designated Learning Institutions list", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html" },
      { label: "IRCC — Work in Canada after you graduate (PGWP)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },

  "solicitar-study-permit": {
    slug: "solicitar-study-permit",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "estudiar-en-canada",
    parentRutaLabel: "Estudiar en Canadá",
    title: "Solicitar un permiso de estudios",
    dek: "Desde dónde se solicita y qué documentos pueden formar parte del proceso.",
    intro: "Esta guía te ayuda a identificar qué debes revisar antes de solicitar tu study permit — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "¿Desde dónde se solicita?",
        bodyHtml: `<p>Generalmente, el study permit debe solicitarse antes de viajar a Canadá. Existen situaciones específicas en las que determinadas personas pueden solicitar desde Canadá o, en ciertos casos, en un puerto de entrada. <strong>No cualquier visitante puede simplemente cambiar a estudiante dentro de Canadá</strong> — solo determinadas personas pueden hacerlo.</p>`,
      },
      {
        heading: "Documentos que pueden formar parte del proceso",
        bodyHtml: `
          <p>Como orientación, no como checklist universal, pueden incluir:</p>
          <ul>
            <li>Letter of Acceptance (LOA).</li>
            <li>Pasaporte/documento de viaje.</li>
            <li>Prueba de fondos.</li>
            <li>PAL/TAL, cuando corresponda.</li>
            <li>Documentos familiares, cuando corresponda.</li>
            <li>Biometría, cuando corresponda.</li>
            <li>Examen médico, cuando corresponda.</li>
            <li>Otros documentos solicitados por IRCC.</li>
          </ul>
          <p><strong>Los requisitos pueden variar según el caso y el lugar desde donde se solicita.</strong></p>
        `,
      },
      {
        heading: "Demostrar fondos",
        bodyHtml: `<p>IRCC exige demostrar capacidad financiera para cubrir, según corresponda: matrícula, gastos de vida, familiares acompañantes y transporte de regreso. Los montos pueden cambiar — consulta siempre la cifra vigente directamente con IRCC.</p>`,
        cta: { label: "Consultar montos actuales de prueba de fondos →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Study permit", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },

  "pal-tal-documentos": {
    slug: "pal-tal-documentos",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "estudiar-en-canada",
    parentRutaLabel: "Estudiar en Canadá",
    title: "¿Qué es una PAL o TAL?",
    dek: "Provincial Attestation Letter / Territorial Attestation Letter — qué es y sus excepciones vigentes.",
    intro: "Esta guía educativa explica el PAL/TAL en lenguaje sencillo — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "PAL — Provincial Attestation Letter / TAL — Territorial Attestation Letter",
        bodyHtml: `
          <p>Es una carta de la provincia o territorio correspondiente que confirma que existe espacio dentro de la asignación aplicable para estudiantes internacionales. Normalmente se obtiene mediante la institución educativa correspondiente.</p>
          <p><strong>No todos los solicitantes necesitan PAL/TAL. Las reglas tienen excepciones.</strong></p>
          <p>Desde el 1 de enero de 2026, quienes solicitan estudiar en determinados programas públicos de maestría o doctorado conducentes a grado están entre las categorías que pueden estar exentas del PAL/TAL — pero esta no es la única excepción existente.</p>
        `,
        cta: { label: "Comprobar si necesito PAL/TAL →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/provincial-attestation-letter.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Provincial or territorial attestation letter", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/provincial-attestation-letter.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },

  "trabajar-mientras-estudio": {
    slug: "trabajar-mientras-estudio",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "estudiar-en-canada",
    parentRutaLabel: "Estudiar en Canadá",
    title: "¿Puedo trabajar mientras estudio?",
    dek: "Depende de las condiciones de tu study permit y de que cumplas los requisitos establecidos por IRCC.",
    intro: "Esta guía te ayuda a identificar qué debes revisar sobre trabajar mientras estudias — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "Trabajo dentro del campus",
        bodyHtml: `<p>Determinados estudiantes elegibles pueden trabajar on-campus sin un work permit adicional cuando cumplen las condiciones establecidas por IRCC.</p>`,
      },
      {
        heading: "Trabajo fuera del campus",
        bodyHtml: `
          <p>Los estudiantes que cumplen actualmente las condiciones establecidas por IRCC pueden trabajar hasta <strong>24 horas por semana durante los períodos académicos regulares</strong>. Pueden existir reglas diferentes durante breaks académicos programados.</p>
          <p>Esto no es una autorización universal para todos los estudiantes: deben cumplirse condiciones como estar matriculado y cumplir los requisitos correspondientes del programa y permiso.</p>
        `,
        cta: { label: "Comprobar si puedo trabajar off-campus →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html" },
      },
      {
        heading: "¿Mi programa incluye co-op o prácticas?",
        bodyHtml: `
          <p>IRCC indica que, desde el 1 de abril de 2026, los estudiantes internacionales postsecundarios ya no necesitan un co-op work permit separado para determinados student work placements, como co-op placements o internships, sujeto a los requisitos aplicables — su propio study permit cubre ese trabajo.</p>
          <p>Las personas que ya tienen un co-op work permit pueden seguir utilizándolo durante su vigencia. Esta regla no debe extrapolarse a todas las prácticas o situaciones sin verificar los requisitos oficiales.</p>
        `,
        cta: { label: "Revisar reglas actuales para co-op e internships →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/simplifying-co-op-work-permit-requirement-post-secondary-international-students.html" },
      },
    ],
    callouts: [
      {
        title: "Tu study permit debe permitirte trabajar",
        bodyHtml: `<p>Revisa las condiciones impresas en tu permiso y verifica tu elegibilidad antes de asumir que puedes trabajar.</p>`,
      },
    ],
    sources: [
      { label: "IRCC — Work on campus", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-on-campus.html" },
      { label: "IRCC — Work off campus", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html" },
      { label: "IRCC — Simplifying the co-op work permit requirement (abril 2026)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/simplifying-co-op-work-permit-requirement-post-secondary-international-students.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },

  "study-permit-por-vencer": {
    slug: "study-permit-por-vencer",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "estudiar-en-canada",
    parentRutaLabel: "Estudiar en Canadá",
    title: "Mi permiso de estudios está por vencer",
    dek: "Qué revisar antes del vencimiento, y qué pasa si ya venció.",
    intro: "Esta guía te ayuda a identificar qué debes revisar sobre tu study permit — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "Antes del vencimiento",
        bodyHtml: `<p>Si necesitas continuar estudiando, debes revisar y solicitar la extensión de tu study permit antes de su vencimiento. IRCC recomienda solicitar la extensión al menos 30 días antes del vencimiento.</p>`,
        cta: { label: "Extender mi study permit →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit.html" },
      },
      {
        heading: "Presenté mi solicitud antes de que venciera",
        bodyHtml: `
          <p>Cuando se cumplen las condiciones y la solicitud se presenta antes de que expire el permiso, la persona puede permanecer legalmente en Canadá mientras IRCC procesa la solicitud (maintained status).</p>
          <p>IRCC indica que, para una extensión en la misma institución y bajo las condiciones aplicables, puedes continuar estudiando bajo las condiciones del permiso vigente mientras se toma una decisión, siempre que permanezcas en Canadá. Las reglas para cambios de institución no deben simplificarse de la misma manera.</p>
        `,
      },
      {
        heading: "¿Qué pasa si mi study permit ya venció?",
        bodyHtml: `
          <p>Si perdiste tu estatus de estudiante, <strong>debes dejar de estudiar</strong>.</p>
          <p>Puede existir la posibilidad de solicitar restauración cuando se cumplen los requisitos, pero <strong>solicitar restauración no autoriza a continuar estudiando mientras se espera la decisión</strong>. IRCC indica que puedes permanecer en Canadá mientras se procesa la solicitud de restauración, pero no puedes estudiar hasta que tu estatus haya sido restaurado y tengas el nuevo study permit.</p>
        `,
        cta: { label: "Revisar restauración de estatus →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/restoration-status.html" },
      },
      {
        heading: "Quiero cambiar de institución",
        bodyHtml: `<p>Para cambios de DLI postsecundario, existen requisitos específicos vigentes: puede ser necesario obtener un nuevo study permit antes de comenzar en la nueva institución, salvo determinadas excepciones. IRCC señala que un estudiante que cambia de escuela postsecundaria debe seguir instrucciones específicas y normalmente no puede comenzar en el nuevo DLI hasta que se apruebe el permiso correspondiente, salvo situaciones determinadas.</p>`,
        cta: { label: "Revisar cómo cambiar de DLI →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/change-schools.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Extend your study permit or restore your status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit.html" },
      { label: "IRCC — Restoration of temporary resident status", href: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/restoration-status.html" },
      { label: "IRCC — Changing your school or program", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/change-schools.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },

  "termine-estudios-pgwp": {
    slug: "termine-estudios-pgwp",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "estudiar-en-canada",
    parentRutaLabel: "Estudiar en Canadá",
    title: "Terminé mis estudios: ¿qué sigue?",
    dek: "Elegibilidad para el Post-Graduation Work Permit y cuándo vence realmente tu study permit.",
    intro: "Esta guía te ayuda a identificar qué debes revisar después de graduarte — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "Post-Graduation Work Permit (PGWP)",
        bodyHtml: `
          <p>Algunos graduados de instituciones y programas elegibles pueden solicitar un Post-Graduation Work Permit.</p>
          <p><strong>Graduarse en Canadá no garantiza un PGWP.</strong> La elegibilidad puede depender de la institución, el programa, la duración, la modalidad/condiciones de estudio, la fecha de solicitud, requisitos de idioma cuando correspondan, requisitos relacionados con el campo de estudio cuando correspondan, y demás requisitos vigentes.</p>
        `,
        cta: { label: "Comprobar elegibilidad para PGWP →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html" },
      },
      {
        heading: "¿Cuándo termina realmente mi study permit?",
        bodyHtml: `<p>Si terminas tus estudios antes de la fecha impresa en el permiso, el permiso puede dejar de ser válido 90 días después de completar los estudios o en la fecha impresa — lo que ocurra primero.</p>`,
      },
      {
        heading: "Sigue explorando",
        bodyHtml: `
          <ul>
            <li><a href="guia-ruta.html?ruta=permisos-de-trabajo">Permisos de trabajo →</a> (dentro del Magazine).</li>
            <li><a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" target="_blank" rel="noopener">Residencia permanente →</a> — página oficial de IRCC (esta ruta todavía no tiene su propia página dentro del Magazine).</li>
          </ul>
        `,
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Work in Canada after you graduate (PGWP)", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html" },
      { label: "IRCC — Immigrate to Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },

  "mi-familia-viene-conmigo": {
    slug: "mi-familia-viene-conmigo",
    parentCategoria: "migracion",
    parentCategoriaLabel: "Migración",
    parentRuta: "estudiar-en-canada",
    parentRutaLabel: "Estudiar en Canadá",
    title: "Estudiar en Canadá con tu familia",
    dek: "Qué pueden y no pueden hacer tu pareja e hijos.",
    intro: "Esta guía te ayuda a identificar qué debes revisar sobre tu familia — no reemplaza la información oficial de tu propio caso.",
    sections: [
      {
        heading: "Cónyuge o pareja",
        bodyHtml: `
          <p>Un estudiante puede viajar con determinados familiares cuando cumplen los requisitos correspondientes, pero <strong>tener un study permit no significa automáticamente que tu pareja pueda trabajar en Canadá</strong>.</p>
          <p>Determinadas parejas de estudiantes internacionales pueden ser elegibles para un open work permit bajo categorías específicas. Desde el 21 de enero de 2025, entre las categorías elegibles se encuentran parejas de estudiantes en programas de maestría de 16 meses o más, programas doctorales, además de otras categorías o programas profesionales elegibles establecidos por IRCC. <strong>No todos los cónyuges de estudiantes reciben open work permit.</strong></p>
        `,
        cta: { label: "Comprobar elegibilidad de mi pareja →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/help-your-spouse-common-law-partner-work-canada.html" },
      },
      {
        heading: "Hijos",
        bodyHtml: `<p>Las reglas para que los hijos menores estudien dependen de su situación y documentación particular.</p>`,
        cta: { label: "Revisar opciones para hijos menores →", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/minor-children-travelling-canada.html" },
      },
    ],
    callouts: [],
    sources: [
      { label: "IRCC — Help your spouse or common-law partner work in Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/help-your-spouse-common-law-partner-work-canada.html" },
      { label: "IRCC — Minor children travelling to Canada", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/minor-children-travelling-canada.html" },
    ],
    disclaimerHeading: "Información general",
    disclaimer: "Esta guía tiene fines informativos y no constituye asesoría migratoria, legal, académica o financiera. Las reglas y requisitos pueden cambiar y cada caso puede tener condiciones diferentes. Verifica siempre la información vigente con Immigration, Refugees and Citizenship Canada (IRCC), la institución correspondiente o un profesional autorizado cuando sea necesario.",
  },
};
