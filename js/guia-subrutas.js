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
};
