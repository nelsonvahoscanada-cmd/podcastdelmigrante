/*
  articles.js — Sistema editorial de EL PODCAST DEL MIGRANTE MAGAZINE
  ======================================================================
  FASE 2 — Ficha maestra editorial v1.0
  ----------------------------------------------------------------------
  Este archivo es el ÚNICO lugar donde vive el contenido de los
  artículos. La plantilla (articulo.html + js/article.js) NUNCA debe
  editarse para publicar una noticia nueva: publicar es agregar un
  objeto a ARTICLES.

  FLUJO FUTURO: cuando el usuario entregue "publica esta noticia" con
  texto + categoría + fotos + autor + fuentes + video + ubicación,
  el trabajo de Claude es traducir esa información a un objeto con
  esta forma y agregarlo a ARTICLES — nunca tocar diseño/plantilla.

  REGLA DE ORO (no inventar): un campo opcional ausente o `null` hace
  que su módulo correspondiente desaparezca del artículo. Ningún campo
  opcional se rellena con contenido inventado para "verse completo".

  ----------------------------------------------------------------------
  CAMPOS DE UN ARTÍCULO (los opcionales están marcados; el resto son
  mínimos indispensables):

  id                String  — identificador interno estable, formato
                              "ART-AAAA-NNN" (para futura edición
                              impresa / QR). Ej: "ART-2026-001".
  slug              String  — usado en articulo.html?slug=...
  category          String  — una de las categorías del sitio
                              (Migración, Empleo, Vivienda, Finanzas...)
  contentType       String  — uno de CONTENT_TYPES (abajo)
  title             String
  dek               String  — bajada/subtítulo
  excerpt           String  — resumen corto (listados, meta description
                              por defecto si no hay `seo.description`)
  author            Object  — { mode: "medio" | "nelson" | "colaborador",
                              name, specialty?, profileHref? }
                              specialty/profileHref solo aplican a
                              mode "colaborador".
  publishedAt       String  — ISO 8601
  updatedAt         String | null   — [OPCIONAL] si es null, no se
                              muestra "Actualizado"
  readingTimeOverride Number | null — [OPCIONAL] minutos manuales; si
                              es null se calcula desde bodyHtml
  location          Object | null   — [OPCIONAL] { country?, province?,
                              city? }. Si es null, no se muestra ubicación.
  heroImage         Object  — { background: "<css gradient o url()>",
                              credit?: String [OPCIONAL] }
  bodyHtml          String  — cuerpo completo, HTML simple (párrafos,
                              subtítulos <h2>, <blockquote>, etc.)
  video             Object | null   — [OPCIONAL] { title, placeholder:
                              true } mientras no haya embed real
  sources           Array   — [OPCIONAL] [{ label, href }]. Vacío = sin
                              módulo "Fuentes consultadas".
  correctionNote    String | null   — [OPCIONAL]
  disclaimerCategory String | null  — [OPCIONAL] clave de DISCLAIMERS
  relatedSlugs      Array   — [OPCIONAL] slugs sugeridos manualmente.
                              Si está vacío, el sistema intenta
                              relacionar automáticamente por categoría
                              (ver article.js). Nunca se inventan.
  showNewsletter    Boolean — muestra/oculta el CTA de newsletter
  sponsored         Boolean — true = "Contenido patrocinado" (se
                              identifica explícitamente, nunca se oculta)
  translationSlug   String | null   — [OPCIONAL] slug de la versión en
                              el otro idioma, si existe
  lang              String  — "es" | "en"
  seo               Object  — { title?, description?, canonicalPath }
                              canonicalPath es la ruta LIMPIA que
                              tendrá el artículo cuando exista dominio
                              y servidor con rutas reales (ej.
                              "/migracion/documentos-tramite-migratorio-alberta/").
                              HOY la página funciona vía
                              articulo.html?slug=... — canonicalPath es
                              la dirección FUTURA prevista, no una URL
                              que responda todavía. Ver nota en
                              article.js.
========================================================================= */

const CONTENT_TYPES = [
  "Noticia",
  "Reportaje",
  "Entrevista",
  "Opinión",
  "Guía",
  "Historia de migrante",
  "Contenido patrocinado",
];

/* Avisos por categoría. Solo se muestran si el artículo declara
   `disclaimerCategory` y esa clave existe aquí. Ninguna categoría sin
   entrada aquí muestra aviso — nunca se usa un disclaimer genérico
   "por si acaso". Redactados como información/educación, nunca como
   garantía de inmunidad legal. */
const DISCLAIMERS = {
  "Migración": "Este contenido tiene fines informativos y educativos. Los procesos migratorios cambian con frecuencia y dependen del caso particular de cada persona — consulta siempre con un asesor o representante autorizado antes de tomar decisiones.",
  "Finanzas": "Este contenido tiene fines informativos y educativos, no constituye asesoría financiera personalizada. Antes de tomar decisiones sobre créditos, seguros o inversiones, consulta con un profesional autorizado.",
  "Salud": "Este contenido tiene fines informativos y educativos, no reemplaza una consulta médica. Ante cualquier síntoma o duda de salud, consulta a un profesional de la salud calificado.",
  "Legal": "Este contenido tiene fines informativos y educativos, no constituye asesoría legal. Cada situación es distinta — consulta con un abogado o profesional autorizado para tu caso particular.",
};

/* =========================================================
   ARTÍCULOS
   ---------------------------------------------------------
   Por ahora, un único artículo DEMOSTRATIVO (punto 23 de la
   Fase 2), enlazado desde la noticia principal del HOME para
   probar el recorrido real. Su contenido es ilustrativo: no
   describe hechos, cifras ni declaraciones reales.
========================================================= */
const ARTICLES = [
  {
    id: "ART-2026-001",
    slug: "documentos-tramite-migratorio-alberta",
    category: "Migración",
    contentType: "Guía",
    title: "Los cinco documentos que más retrasan un trámite migratorio, según asesores en Alberta",
    dek: "Asesores de inmigración identifican los errores más comunes que alargan meses un proceso que podría resolverse en semanas.",
    excerpt: "Una guía práctica sobre los documentos que con más frecuencia retrasan un trámite migratorio, y cómo evitar los errores más comunes.",
    author: { mode: "medio", name: "El Podcast del Migrante Magazine" },
    publishedAt: "2026-09-12T08:00:00-06:00",
    updatedAt: null,
    readingTimeOverride: null,
    location: { country: "Canadá", province: "Alberta", city: "Brooks" },
    heroImage: {
      background: "linear-gradient(135deg, #1c1c1c, #3a3a3a)",
    },
    bodyHtml: `
      <p>Antes de enviar cualquier solicitud, vale la pena revisar con calma los documentos que la acompañan. En la práctica, la mayoría de los retrasos no vienen de un caso complicado, sino de detalles pequeños que se pasan por alto en el momento de armar la carpeta.</p>
      <h2>Documentos vigentes, no solo válidos</h2>
      <p>Una identificación puede seguir siendo "válida" y aun así generar dudas si su fecha de vencimiento queda demasiado cerca de la fecha en que se espera una respuesta. Revisar la vigencia con margen suficiente evita tener que reenviar todo un paquete de documentos.</p>
      <h2>Traducciones certificadas, no traducciones libres</h2>
      <p>Un documento en un idioma distinto al requerido casi siempre necesita una traducción certificada, no una traducción hecha por un familiar o amigo, por bien intencionada que sea. Confirmar este requisito antes de armar la solicitud ahorra semanas.</p>
      <h2>Comprobantes de domicilio consistentes</h2>
      <p>Cuando los comprobantes de domicilio muestran direcciones distintas entre sí, o no coinciden con lo declarado en el formulario, es habitual que se pida una aclaración adicional — lo que suma tiempo de espera.</p>
      <h2>Formularios firmados en el lugar correcto</h2>
      <p>Una firma faltante o ubicada en el campo equivocado sigue siendo, en la práctica, uno de los motivos más simples y más frecuentes de devolución de una solicitud.</p>
      <p>Ninguno de estos puntos reemplaza la revisión de un asesor o representante autorizado para el caso particular de cada persona, pero sí ayuda a llegar mejor preparado a esa conversación.</p>
    `,
    video: {
      title: "Resumen en video de esta guía",
      placeholder: true,
    },
    sources: [
      { label: "Fuente demostrativa — enlace de ejemplo, no una cita real", href: "#" },
    ],
    correctionNote: null,
    disclaimerCategory: "Migración",
    relatedSlugs: [],
    showNewsletter: true,
    sponsored: false,
    translationSlug: null,
    lang: "es",
    seo: {
      canonicalPath: "/migracion/documentos-tramite-migratorio-alberta/",
    },
  },
];
