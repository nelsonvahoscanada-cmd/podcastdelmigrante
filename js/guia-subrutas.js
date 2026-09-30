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
};
