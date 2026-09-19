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
                              name, specialty?, profileHref?, authorId? }
                              specialty/profileHref/authorId solo aplican a
                              mode "colaborador". authorId referencia el
                              `id` del colaborador en CONTRIBUTORS
                              (js/data.js), para uso futuro (listar sus
                              demás artículos) sin romper nada hoy.
  columnName        String | null   — [OPCIONAL] nombre de la columna
                              editorial recurrente (ej. "Tu dinero en
                              Canadá"), si el artículo pertenece a una.
  freeGuide         Object | null   — [OPCIONAL] { title, description }
                              para promocionar un recurso descargable
                              propio del autor/colaborador. Mientras no
                              exista una URL real, se muestra como
                              "Disponible próximamente" — nunca un botón
                              o QR que no funcione.
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
  "Columna",
  "Contenido patrocinado",
];

/* Avisos por categoría. Solo se muestran si el artículo declara
   `disclaimerCategory` y esa clave existe aquí. Ninguna categoría sin
   entrada aquí muestra aviso — nunca se usa un disclaimer genérico
   "por si acaso". Redactados como información/educación, nunca como
   garantía de inmunidad legal. */
const DISCLAIMERS = {
  "Migración": "Este contenido tiene fines informativos y educativos. Los requisitos y las políticas migratorias pueden cambiar, y la situación de cada persona es diferente. Para decisiones sobre un caso particular, consulta fuentes oficiales o a un profesional autorizado.",
  "Finanzas": "Este artículo tiene fines educativos y ofrece información general. No constituye asesoría financiera, fiscal, legal, de seguros o de inversión personalizada. La elegibilidad, las reglas fiscales y la disponibilidad o conveniencia de productos dependen de las circunstancias personales y pueden cambiar. Verifica la información actual y consulta profesionales calificados cuando corresponda.",
  "Salud": "Este contenido tiene fines informativos y educativos, no reemplaza una consulta médica. Ante cualquier síntoma o duda de salud, consulta a un profesional de la salud calificado.",
  "Legal": "Este contenido tiene fines informativos y educativos, no constituye asesoría legal. Cada situación es distinta — consulta con un abogado o profesional autorizado para tu caso particular.",
  "Vivienda": "Esta guía ofrece información general sobre arrendamientos residenciales en Alberta y no constituye asesoría legal. Las reglas pueden variar según el tipo de vivienda o la situación particular. Para información actualizada y casos específicos, consulta Government of Alberta, la Residential Tenancies Act o un profesional calificado.",
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
    id: "ART-2026-006",
    slug: "llegaste-canada-tu-dinero-tambien",
    category: "Finanzas",
    contentType: "Columna",
    columnName: "Tu dinero en Canadá",
    title: "Llegaste a Canadá. ¿Tu dinero también?",
    dek: "Empezar una nueva vida en Canadá también significa aprender un nuevo sistema financiero. Organizar ingresos, gastos, crédito, ahorro, protección e inversión desde el comienzo puede ayudarte a construir una base más sólida para tus próximos años.",
    excerpt: "Organizar ingresos, gastos, crédito, ahorro, protección e inversión desde el comienzo puede ayudarte a construir una base más sólida para tus próximos años en Canadá.",
    author: {
      mode: "colaborador",
      name: "Carlos D. Castillo",
      specialty: "Educación Financiera",
      profileHref: "index.html#contributors",
      authorId: "carlos-castillo",
    },
    publishedAt: "2026-09-18T08:00:00-06:00",
    updatedAt: null,
    readingTimeOverride: null,
    location: null,
    demo: false,
    heroImage: {
      background: "url('assets/llegaste-canada-tu-dinero-tambien.jpg')",
      aspectRatio: "16/9",
      alt: "Carlos D. Castillo presenta la columna Tu dinero en Canadá en El Podcast del Migrante Magazine.",
    },
    bodyHtml: `
      <h2>Llegar también significa reorganizar tus finanzas</h2>
      <p>Cuando llegas a Canadá, las prioridades parecen multiplicarse: encontrar vivienda, conseguir trabajo, organizar documentos, adaptarte al idioma, entender el transporte y comenzar a construir una nueva rutina.</p>
      <p>Pero existe otra adaptación que muchas veces ocurre silenciosamente: la financiera.</p>
      <p>Puedes comenzar a recibir ingresos en dólares canadienses y abrir una cuenta bancaria, pero eso no significa automáticamente que tengas un plan.</p>
      <p>Canadá tiene herramientas, cuentas, beneficios y reglas que posiblemente sean diferentes a las que conocías en tu país de origen. Por eso, antes de pensar en inversiones o productos financieros, conviene comenzar por algo mucho más sencillo: entender dónde estás.</p>

      <h2>1. ¿Sabes realmente cuánto cuesta tu nueva vida?</h2>
      <p>Tu salario no cuenta toda la historia.</p>
      <p>Lo importante es saber cuánto dinero entra realmente al hogar y cuánto necesitas para vivienda, alimentación, transporte, servicios, seguros, cuidado infantil, deudas y otros gastos.</p>
      <p>Un presupuesto te permite visualizar esa realidad. No debería verse como un castigo ni como una lista de cosas que ya no puedes comprar. Es una herramienta para saber qué puedes hacer con el dinero que tienes.</p>
      <p>La Financial Consumer Agency of Canada recomienda elaborar un presupuesto que permita comparar ingresos, gastos y ahorro y utilizar esa información para establecer objetivos financieros.</p>
      <p>Antes de preguntarte cuánto puedes invertir, pregúntate: <em>¿Cuánto me cuesta realmente vivir cada mes?</em></p>

      <h2>2. Construye una reserva antes de necesitarla</h2>
      <p>Una reparación del automóvil, una reducción inesperada de horas laborales o una emergencia familiar pueden cambiar rápidamente las finanzas de un hogar. Ahí aparece el fondo de emergencia.</p>
      <p>No tiene que construirse de un día para otro. Lo importante es comenzar con una cantidad que puedas sostener y mantener ese dinero disponible para verdaderas emergencias.</p>
      <p>La orientación de la Financial Consumer Agency of Canada utiliza como referencia eventual aproximadamente tres a seis meses de gastos regulares, aunque reconoce que construir esa reserva requiere tiempo.</p>
      <p>Primero estabilidad. Después crecimiento. Antes de invertir a largo plazo, conviene comprender cuánto cuesta realmente sostener la vida en Canadá.</p>

      <h2>3. Aprende a utilizar el crédito, no a depender de él</h2>
      <p>Para muchos recién llegados, el sistema de crédito canadiense es una experiencia completamente nueva.</p>
      <p>Una tarjeta de crédito puede ser útil para comenzar a establecer historial, pero el límite disponible no es una extensión de tu salario.</p>
      <p>Pagar puntualmente, comprender las tasas de interés y revisar la información que aparece en tus reportes son hábitos importantes.</p>
      <p>Una idea central de la guía que acompaña esta columna es: <em>"Utiliza el crédito para construir historial, no para esconder un presupuesto que no alcanza."</em></p>
      <p>También conviene revisar periódicamente los reportes de crédito y solicitar correcciones cuando existan errores.</p>

      <h2>4. No abras una cuenta solamente porque escuchaste sus siglas</h2>
      <p>Con el tiempo comenzarás a escuchar términos como TFSA, RRSP, FHSA, RESP. Son herramientas importantes, pero no todas tienen el mismo propósito.</p>
      <p>Una cuenta registrada tampoco es necesariamente una inversión por sí misma. Es una estructura dentro de la cual pueden mantenerse determinados activos o inversiones, según las reglas aplicables.</p>
      <p>Antes de realizar aportes conviene confirmar elegibilidad, espacio disponible, objetivo, plazo y necesidad de liquidez.</p>
      <p>Antes de abrir algo porque un amigo te dijo que "es buenísimo", hazte dos preguntas: <em>¿Para qué necesito este dinero? ¿Cuándo podría necesitar utilizarlo?</em></p>

      <h2>5. Tu relación con la CRA también forma parte de tus finanzas</h2>
      <p>Los impuestos no deberían aparecer en tu vida solamente cuando llega la temporada de presentar la declaración.</p>
      <p>Organizar tus comprobantes, conservar documentación y mantener actualizada la información correspondiente puede ayudarte a evitar problemas y comprender mejor los beneficios y créditos para los que eventualmente puedas ser elegible.</p>
      <p>La situación tributaria de cada persona puede ser diferente, especialmente cuando existen ingresos o activos fuera de Canadá. Por eso no conviene asumir.</p>
      <p>Cuando existan bienes o ingresos extranjeros que puedan generar obligaciones adicionales, conviene buscar orientación tributaria profesional.</p>

      <h2>6. Protege lo que estás comenzando a construir</h2>
      <p>Para muchas familias inmigrantes, uno de sus activos económicos más importantes es algo que no aparece en una cuenta bancaria: su capacidad de trabajar y producir ingresos.</p>
      <p>Por eso una estrategia financiera no debería mirar solamente cuánto ahorras o cuánto puedes invertir. También debería preguntarse: ¿Qué ocurriría si durante varios meses no pudiera trabajar? ¿Quién depende de mis ingresos? ¿Qué beneficios tengo a través de mi empleador? ¿Qué deudas tendría que seguir pagando mi familia? ¿Qué protección tengo actualmente?</p>
      <p>Una revisión financiera puede incluir beneficios laborales, reserva de emergencia, seguro de vida y protección frente a discapacidad o enfermedad, siempre de acuerdo con las necesidades reales de cada hogar.</p>

      <h2>No necesitas resolverlo todo hoy</h2>
      <p>Uno de los errores más comunes al comenzar una nueva vida financiera es intentar hacerlo todo al mismo tiempo: abrir cuentas, invertir, comprar casa, construir crédito, ahorrar para los hijos, pensar en el retiro, proteger a la familia.</p>
      <p>Todo es importante, pero no todo tiene que suceder hoy. Por eso resulta más útil construir una ruta.</p>
      <p>Una estrategia sencilla puede organizar prioridades en períodos de 30, 60 y 90 días: primero documentos, gastos, crédito y beneficios; después reserva de emergencia y protección; posteriormente objetivos y cuentas registradas.</p>

      <h2>Tu dinero también está comenzando una nueva vida</h2>
      <p>Migrar no significa solamente cambiar de país. En muchos casos significa reconstruir una carrera, establecer nuevas relaciones, comenzar un historial de crédito, aprender otro sistema tributario y redefinir los objetivos financieros de una familia.</p>
      <p>No necesitas convertirte en experto financiero para comenzar. Necesitas hacer preguntas. Entender antes de firmar. Organizar antes de invertir. Y construir un plan que tenga sentido para tu realidad.</p>

      <blockquote>Tener muchas cuentas no significa tener un plan. Un verdadero plan comienza cuando puedes explicar qué estás haciendo con tu dinero, por qué lo estás haciendo y hacia dónde quieres llegar.</blockquote>
    `,
    video: null,
    freeGuide: {
      title: "Bienvenido a Canadá — Sus primeros pasos financieros",
      description: "Complementa esta primera entrega de Tu dinero en Canadá con una guía práctica preparada por Carlos D. Castillo.",
    },
    sources: [
      { label: "Financial Consumer Agency of Canada — Making a budget", href: "https://www.canada.ca/en/financial-consumer-agency/services/make-budget.html" },
      { label: "Financial Consumer Agency of Canada — Setting up an emergency fund", href: "https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/setting-up-emergency-funds.html" },
      { label: "Canada Revenue Agency — Newcomers to Canada", href: "https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/newcomers-canada-immigrants.html" },
      { label: "Canada Revenue Agency — Tax-Free Savings Account (TFSA)", href: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html" },
      { label: "Canada Revenue Agency — First Home Savings Account (FHSA)", href: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html" },
    ],
    correctionNote: null,
    disclaimerCategory: "Finanzas",
    relatedSlugs: [],
    showNewsletter: true,
    sponsored: false,
    translationSlug: null,
    lang: "es",
    seo: {
      canonicalPath: "/finanzas/llegaste-canada-tu-dinero-tambien/",
    },
  },
  {
    id: "ART-2026-005",
    slug: "100-empresarios-100-historias-calgary",
    category: "Comunidad",
    contentType: "Historia de migrante",
    title: "100 empresarios, 100 historias: el emprendimiento latino que está construyendo comunidad en Calgary",
    dek: "Detrás de cada negocio hay una historia de migración, sacrificio y nuevos comienzos. Desafío 100 Empresas nació para documentar esas historias y mostrar el rostro humano del emprendimiento latino en Calgary.",
    excerpt: "Desafío 100 Empresas documenta las historias detrás del emprendimiento latino en Calgary — el rostro humano detrás de cada negocio.",
    author: { mode: "medio", name: "Redacción El Podcast del Migrante" },
    publishedAt: "2026-09-18T08:00:00-06:00",
    updatedAt: null,
    readingTimeOverride: null,
    location: { country: "Canadá", province: "Alberta", city: "Calgary" },
    demo: false,
    heroImage: {
      background: "url('assets/100-empresarios-100-historias-calgary.jpg')",
      aspectRatio: "16/9",
      alt: "Jornada de entrevistas de Desafío 100 Empresas en Calgary.",
    },
    bodyHtml: `
      <p>Detrás de la puerta de un restaurante, una oficina, una peluquería, una tienda o una empresa de servicios existe algo que normalmente no aparece en un anuncio: la historia de la persona que decidió construirlo.</p>
      <p>Para muchos emprendedores inmigrantes, comenzar un negocio en Canadá también significa comenzar nuevamente.</p>
      <p>Aprender cómo funciona otro mercado, construir una nueva red de contactos, encontrar los primeros clientes, adaptarse a otra cultura empresarial y convertir años de experiencia —o una idea completamente nueva— en una empresa capaz de crecer.</p>
      <p>En Calgary, esas historias forman parte de una ciudad profundamente marcada por la inmigración.</p>
      <p>Datos del Censo de 2021 publicados por The City of Calgary muestran que aproximadamente un tercio de la población de la ciudad era inmigrante.</p>
      <p>El dato ayuda a entender el contexto de una ciudad donde personas procedentes de diferentes lugares del mundo participan en la construcción de su vida económica y comunitaria.</p>
      <p>Pero las estadísticas cuentan solamente una parte de la historia. Detrás de cada número hay personas. Y precisamente ahí comienza Desafío 100 Empresas.</p>

      <h2>Una cámara frente al empresario, no frente al producto</h2>
      <p>Desafío 100 Empresas nació con una idea sencilla: entrevistar a 100 empresarios latinos y contar la historia que existe detrás de sus negocios.</p>
      <p>La participación de los empresarios en las entrevistas del proyecto no tiene costo.</p>
      <p>El objetivo principal no es producir un comercial tradicional.</p>
      <p>La conversación busca conocer primero a la persona: ¿De dónde viene? ¿Cómo comenzó? ¿Qué tuvo que superar? ¿Por qué decidió emprender? ¿Qué aprendió? ¿Quién estuvo a su lado? ¿Y qué sueña construir ahora?</p>
      <p>Porque una empresa puede tener un nombre comercial, un logotipo y productos. Pero detrás de todo eso siempre existe una historia humana.</p>

      <h2>Historias diferentes, un punto en común</h2>
      <p>Las primeras entrevistas del proyecto muestran precisamente esa diversidad.</p>
      <p>Entre las historias documentadas se encuentran empresarios y profesionales de sectores como salud y bienestar, inmigración, finanzas, alimentos, servicios profesionales y otros emprendimientos.</p>
      <p>Cada recorrido es diferente. Algunos llegaron a Canadá con experiencia profesional previa. Otros tuvieron que reconstruir completamente su camino. Algunos encontraron oportunidades rápidamente. Otros necesitaron años para desarrollar una nueva red, entender el mercado o transformar una dificultad en una oportunidad empresarial.</p>
      <p>No buscamos presentar una única fórmula para alcanzar el éxito. Buscamos documentar los caminos.</p>

      <h2>Historias que construyen comunidad</h2>
      <ul>
        <li><strong>Dunia Rodríguez — Retryvive Counselling.</strong> Una historia vinculada a la resiliencia y al acompañamiento en salud y bienestar.</li>
        <li><strong>Carmen Helena Montoya — CS Consultin Canada.</strong> Una conversación alrededor de inmigración, información y servicio a la comunidad.</li>
        <li><strong>Carlos D. Castillo — Roca Financial Group.</strong> Una historia relacionada con protección financiera y construcción de futuro familiar.</li>
        <li><strong>Hugo R. Morales — La Costenita Latin Market Food.</strong> Emprendimiento relacionado con alimentos y con la apertura de espacios para productos de otros emprendedores latinos.</li>
        <li><strong>Milena Bolaños — Peluquería Infantil.</strong> Una historia de emprendimiento, adaptación y construcción de un servicio enfocado en familias y niños.</li>
      </ul>
      <p>Sterna Global Immigration es patrocinador oficial de Desafío 100 Empresas y ha facilitado espacio para las jornadas de grabación del proyecto.</p>

      <h2>El emprendimiento inmigrante en Canadá</h2>
      <p>El fenómeno que documenta el proyecto también forma parte de una realidad económica más amplia.</p>
      <p>Statistics Canada informó que durante el primer trimestre de 2024, el 23.7% de los negocios del sector privado en Canadá eran mayoritariamente propiedad de inmigrantes.</p>
      <p>Esta cifra corresponde a negocios privados de todo Canadá mayoritariamente propiedad de inmigrantes en general — no representa específicamente al emprendimiento latino ni a la ciudad de Calgary. El objetivo de incluirla es mostrar que el emprendimiento inmigrante forma parte del panorama empresarial canadiense.</p>

      <h2>Más que empresas</h2>
      <p>Cuando una persona construye un negocio también puede comenzar a construir relaciones alrededor de él: clientes, proveedores, colaboradores, profesionales, otros emprendedores, familias, comunidades.</p>
      <p>Por eso Desafío 100 Empresas no pretende construir un ranking de empresarios ni escoger quién tiene la historia "más exitosa".</p>
      <p>Las 100 historias forman parte del proyecto. La intención es conservarlas, producirlas y convertirlas en un archivo audiovisual y editorial sobre una generación de emprendedores latinos que está construyendo parte de su historia en Canadá.</p>

      <h2>Del video al papel y del papel al video</h2>
      <p>Las historias de Desafío 100 Empresas forman también parte del ecosistema de El Podcast del Migrante.</p>
      <p>Las entrevistas pueden vivir en video. Sus protagonistas pueden aparecer en redes. Sus historias pueden convertirse en artículos.</p>
      <p>Y el Magazine permitirá conectar la publicación impresa con contenido audiovisual mediante códigos QR cuando los videos correspondientes estén publicados y exista una URL real.</p>
      <p>El concepto es sencillo: papel → video → redes, y también: redes → historia → Magazine.</p>

      <h2>100 historias</h2>
      <p>El proyecto tiene una meta clara: documentar 100 historias empresariales.</p>
      <p>No seleccionar únicamente unas pocas. No convertirlo en una competencia.</p>
      <p>Las historias, con sus diferencias, dificultades y aprendizajes, son precisamente el corazón del proyecto. Cada entrevista agrega una pieza a un archivo mayor sobre emprendimiento, migración y comunidad.</p>

      <p>Calgary seguirá cambiando. Nuevas personas llegarán. Nuevos negocios abrirán. Algunos proyectos crecerán y otros tendrán que reinventarse.</p>
      <p>Pero existe algo que merece conservarse: las historias de quienes decidieron intentarlo.</p>

      <blockquote>Detrás de cada empresa hay una persona. Y detrás de cada persona que decidió comenzar de nuevo en Canadá, hay una historia que merece ser contada.</blockquote>
    `,
    video: null,
    sources: [
      { label: "The City of Calgary — Federal Census Data (2021 Census)", href: "https://www.calgary.ca/content/dam/www/csps/cns/documents/federal-census-data.pdf" },
      { label: "Statistics Canada — One in four private sector businesses are owned by immigrants: How are they doing?", href: "https://www.statcan.gc.ca/o1/en/plus/6128-one-four-private-sector-businesses-are-owned-immigrants-how-are-they-doing" },
    ],
    correctionNote: null,
    disclaimerCategory: null,
    relatedSlugs: [],
    showNewsletter: true,
    sponsored: false,
    translationSlug: null,
    lang: "es",
    seo: {
      canonicalPath: "/comunidad/100-empresarios-100-historias-calgary/",
    },
  },
  {
    id: "ART-2026-004",
    slug: "primer-arriendo-alberta",
    category: "Vivienda",
    contentType: "Guía",
    title: "Tu primer arriendo en Alberta: qué revisar antes de firmar el contrato",
    dek: "El precio mensual no es lo único importante. Antes de entregar un depósito o firmar un acuerdo, revisa qué incluye la renta, las responsabilidades de cada parte, las condiciones del depósito y el estado real de la vivienda.",
    excerpt: "Antes de entregar un depósito o firmar un acuerdo, revisa qué incluye la renta, las responsabilidades de cada parte, las condiciones del depósito y el estado real de la vivienda.",
    author: { mode: "medio", name: "Redacción El Podcast del Migrante" },
    publishedAt: "2026-09-18T08:00:00-06:00",
    updatedAt: null,
    readingTimeOverride: null,
    location: null,
    demo: false,
    heroImage: {
      background: "url('assets/primer-arriendo-alberta.jpg')",
      aspectRatio: "16/9",
      alt: "Mujer llegando a una vivienda en Alberta junto a contrato de arrendamiento y llaves.",
    },
    bodyHtml: `
      <p>Encontrar una vivienda puede convertirse en una de las primeras grandes decisiones después de llegar a Alberta. Cuando aparece un lugar que parece adecuado, las ganas de asegurar el arriendo rápidamente pueden llevar a pasar por alto detalles importantes.</p>
      <p>En Alberta, un acuerdo de arrendamiento residencial puede ser escrito, verbal o implícito. Sin embargo, tener un acuerdo por escrito proporciona evidencia de lo acordado si posteriormente surge una disputa.</p>
      <p>Además, un contrato de arrendamiento no puede eliminar derechos que la Residential Tenancies Act (RTA) concede al inquilino.</p>

      <h2>1. Lee qué estás aceptando</h2>
      <p>Un contrato escrito debería dejar claramente establecidos aspectos como quiénes son las partes, la propiedad que se arrienda, la duración del contrato, el monto del alquiler, cuándo y cómo debe pagarse y quién puede vivir en la propiedad.</p>
      <p>También conviene revisar cuidadosamente qué ocurre con servicios públicos, electrodomésticos, muebles, estacionamiento, mascotas, invitados, mantenimiento, reparaciones, seguros y cargos adicionales.</p>
      <p>No te limites a preguntar: <em>"¿Cuánto cuesta al mes?"</em> Pregunta también: <em>"¿Qué está incluido en ese precio?"</em></p>

      <h2>2. Atención al depósito de seguridad</h2>
      <p>En Alberta, el depósito de seguridad —también conocido como damage deposit— no puede superar el equivalente a un mes de renta en el momento en que comienza el arrendamiento.</p>
      <p>Además, el depósito no puede aumentarse posteriormente simplemente porque aumente el alquiler.</p>
      <p>Conserva el comprobante correspondiente al depósito y la documentación relacionada con el pago.</p>

      <h2>3. Haz la inspección de entrada</h2>
      <p>Este punto merece especial atención.</p>
      <p>En Alberta existen requisitos relacionados con los informes de inspección al entrar y al salir de una vivienda.</p>
      <p>El informe permite documentar las condiciones del inmueble y puede ser importante posteriormente para determinar si un daño ya existía antes de comenzar el arrendamiento.</p>
      <p>No hagas la inspección apresuradamente. Revisa paredes, pisos, puertas, ventanas, electrodomésticos y cualquier daño visible.</p>
      <p>Conserva tu copia del informe y, como medida práctica adicional, guarda fotografías fechadas del estado de la propiedad.</p>

      <h2>4. Diferencia daño de desgaste normal</h2>
      <p>Vivir normalmente en una propiedad produce cierto deterioro con el tiempo.</p>
      <p>Al terminar el arrendamiento pueden existir circunstancias que permitan deducciones del depósito de seguridad, pero las reglas de Alberta distinguen los daños del desgaste normal producido por el uso razonable de una vivienda.</p>
      <p>Por eso la inspección inicial y la documentación del estado de la propiedad son tan importantes.</p>

      <h2>5. Averigua quién paga los servicios</h2>
      <p>Antes de firmar, verifica claramente quién paga electricidad, gas, agua, internet u otros servicios aplicables.</p>
      <p>También revisa si estacionamiento, muebles o electrodomésticos están incluidos y si existen otros costos adicionales.</p>
      <p>Una vivienda aparentemente más barata puede terminar costando más si varios gastos importantes no están incluidos.</p>

      <h2>6. Entiende qué tipo de arrendamiento estás firmando</h2>
      <p>No todos los contratos funcionan igual. Puede existir un arrendamiento por un período determinado o un arrendamiento periódico.</p>
      <p>Esta diferencia puede ser importante cuando llegue el momento de terminar el contrato, porque los requisitos de aviso pueden depender del tipo de arrendamiento y de quién lo termina.</p>
      <p>No esperes hasta el día que quieras mudarte para descubrir esas condiciones.</p>

      <h2>7. Guarda todo</h2>
      <p>Crea una carpeta digital específica para tu vivienda. Guarda allí:</p>
      <ul>
        <li>Contrato de arrendamiento</li>
        <li>Recibos</li>
        <li>Comprobante del depósito</li>
        <li>Informes de inspección</li>
        <li>Fotografías</li>
        <li>Comunicaciones importantes</li>
        <li>Documentos relacionados con reparaciones</li>
        <li>Comprobantes de pagos</li>
      </ul>
      <p>Al finalizar el arrendamiento también puede ser importante proporcionar al propietario una dirección de reenvío por escrito para los asuntos relacionados con la devolución del depósito.</p>

      <h2>Cuando llegue el momento de salir</h2>
      <p>La inspección de salida vuelve a ser fundamental.</p>
      <p>Las reglas de Alberta establecen procedimientos y plazos relacionados con la devolución del depósito de seguridad y con cualquier deducción que corresponda.</p>
      <p>Si no existen deducciones, el depósito y el interés que corresponda deben devolverse dentro del plazo establecido por la normativa provincial.</p>
      <p>Cuando existen deducciones, existen reglas específicas sobre estados de cuenta, estimaciones y plazos.</p>
      <p>Por eso la documentación que comenzó el día que recibiste las llaves puede seguir siendo importante hasta después de entregarlas.</p>

      <h2>Una vivienda no se elige solamente por las fotos</h2>
      <p>Ubicación, precio y apariencia importan.</p>
      <p>Pero antes de firmar también necesitas saber exactamente qué estás pagando, qué obligaciones estás aceptando y qué documentos debes conservar.</p>

      <blockquote>Tu primer hogar en Alberta comienza mucho antes de desempacar: comienza entendiendo lo que estás firmando.</blockquote>
    `,
    video: null,
    sources: [
      { label: "Government of Alberta — Starting a tenancy", href: "https://www.alberta.ca/starting-a-tenancy" },
      { label: "Government of Alberta — During a tenancy", href: "https://www.alberta.ca/during-a-tenancy" },
      { label: "Government of Alberta — Ending a tenancy", href: "https://www.alberta.ca/ending-a-tenancy" },
      { label: "Government of Alberta — Information for landlords and tenants", href: "https://www.alberta.ca/information-for-landlords-and-tenants" },
      { label: "Government of Alberta — Inspection reports (guide)", href: "https://www.alberta.ca/system/files/custom_downloaded_images/sa-inspection-reports.pdf" },
    ],
    correctionNote: null,
    disclaimerCategory: "Vivienda",
    relatedSlugs: [],
    showNewsletter: true,
    sponsored: false,
    translationSlug: null,
    lang: "es",
    seo: {
      canonicalPath: "/vivienda/primer-arriendo-alberta/",
    },
  },
  {
    id: "ART-2026-003",
    slug: "certificaciones-trabajo-alberta",
    category: "Empleo",
    contentType: "Guía",
    title: "Certificaciones cortas que pueden ayudarte a prepararte para trabajar en Alberta",
    dek: "Desde seguridad laboral hasta primeros auxilios y manipulación de alimentos, algunas capacitaciones pueden fortalecer tu perfil para determinados empleos. La clave es elegirlas según el trabajo que realmente buscas.",
    excerpt: "Desde seguridad laboral hasta primeros auxilios y manipulación de alimentos, algunas capacitaciones pueden fortalecer tu perfil para determinados empleos.",
    author: { mode: "medio", name: "Redacción El Podcast del Migrante" },
    publishedAt: "2026-09-18T08:00:00-06:00",
    updatedAt: null,
    readingTimeOverride: null,
    location: null,
    demo: false,
    heroImage: {
      background: "url('assets/certificaciones-trabajo-alberta.jpg')",
      aspectRatio: "16/9",
      alt: "Trabajador en Alberta junto a elementos de capacitación y seguridad laboral",
    },
    bodyHtml: `
      <p>Para muchos recién llegados, una de las primeras preguntas es: ¿qué curso puedo hacer para conseguir trabajo?</p>
      <p>La respuesta depende del sector.</p>
      <p>En Alberta, algunas profesiones y oficios están regulados y requieren certificaciones o licencias específicas, mientras que otras ocupaciones no tienen esos mismos requisitos.</p>
      <p>Por eso, antes de pagar por cualquier capacitación, revisa las ofertas laborales del área que te interesa y determina qué formación aparece repetidamente entre los requisitos.</p>

      <h2>No colecciones certificados: empieza por el empleo que buscas</h2>
      <p>Una certificación corta puede complementar tu perfil, pero no todas las capacitaciones sirven para todos los trabajos.</p>
      <p>La estrategia debe comenzar identificando el sector, el puesto y los requisitos solicitados por los empleadores.</p>

      <h2>1. WHMIS</h2>
      <p>El Workplace Hazardous Materials Information System (WHMIS) forma parte de la capacitación de seguridad relacionada con productos peligrosos en los lugares de trabajo.</p>
      <p>Puede aparecer en sectores industriales, manufactura, construcción, mantenimiento y otros trabajos donde existen productos o materiales peligrosos.</p>
      <p>Alberta incluye WHMIS entre los ejemplos de cursos cortos que pueden ser necesarios para determinados empleos.</p>
      <p>Pero tener WHMIS por sí solo no convierte automáticamente a alguien en candidato para cualquier trabajo industrial. Debe entenderse como una capacitación relacionada con determinados riesgos y lugares de trabajo.</p>

      <h2>2. Workplace First Aid</h2>
      <p>Primeros auxilios en el lugar de trabajo puede ser otra capacitación valiosa.</p>
      <p>En Alberta, los empleadores deben garantizar los servicios de primeros auxilios correspondientes a las características de sus lugares de trabajo, y quienes prestan esos servicios deben contar con capacitación apropiada.</p>
      <p>Los certificados de Workplace First Aid aprobados pueden tener una vigencia de hasta tres años.</p>
      <p>Dependiendo del empleo, contar con esta formación puede complementar el perfil de un trabajador.</p>

      <h2>3. H2S Alive</h2>
      <p>Quienes buscan oportunidades en determinados ambientes industriales pueden encontrarse con el término H2S Alive.</p>
      <p>Alberta incluye H2S Alive entre los ejemplos de cursos cortos relacionados con requisitos específicos de empleo.</p>
      <p>La necesidad concreta dependerá del puesto y del lugar de trabajo.</p>
      <p>Antes de inscribirte, confirma que la capacitación solicitada por el empleador corresponde exactamente al curso que piensas realizar.</p>

      <h2>4. Fall Protection y Confined Space</h2>
      <p>Trabajos relacionados con construcción, mantenimiento e industria pueden involucrar riesgos de caída o actividades en espacios confinados.</p>
      <p>Fall Protection y Confined Space aparecen entre los ejemplos de capacitaciones cortas identificadas por Alberta para desarrollar habilidades específicas relacionadas con determinados trabajos.</p>
      <p>Aquí nuevamente la regla es sencilla: primero identifica el empleo y después la certificación.</p>

      <h2>5. Transportation of Dangerous Goods (TDG)</h2>
      <p>TDG puede resultar relevante para trabajos que involucren el manejo o transporte de mercancías peligrosas.</p>
      <p>También aparece entre los ejemplos de capacitación corta que Alberta identifica dentro de sus recursos de preparación laboral.</p>
      <p>No todos los trabajadores necesitan TDG, por lo que conviene confirmar los requisitos del puesto antes de invertir tiempo o dinero.</p>

      <h2>6. Food Safety</h2>
      <p>Para quienes buscan empleo en restaurantes, cocinas, cafeterías, servicios de alimentación o actividades relacionadas, la capacitación en seguridad alimentaria puede ser relevante.</p>
      <p>Alberta mantiene información oficial sobre cursos de seguridad alimentaria reconocidos para determinados requisitos provinciales.</p>
      <p>Esto significa que no conviene escoger simplemente el primer curso que aparezca en internet.</p>
      <p>Verifica que la capacitación sea reconocida cuando el puesto o la regulación lo requieran.</p>

      <h2>¿Y si ya tienes profesión o experiencia de otro país?</h2>
      <p>Un curso corto no necesariamente reemplaza tus estudios o experiencia anteriores.</p>
      <p>Para ocupaciones reguladas, puede ser necesario realizar un proceso formal de reconocimiento de credenciales.</p>
      <p>Para ocupaciones no reguladas, el proceso puede ser diferente.</p>
      <p>Alberta ofrece recursos para que los recién llegados comprendan cómo evaluar y presentar sus cualificaciones obtenidas fuera de Canadá.</p>
      <p>La experiencia que traes contigo sigue teniendo valor. El objetivo es entender cómo conectarla con los requisitos del mercado laboral de Alberta.</p>

      <h2>Puede haber apoyo para capacitarte</h2>
      <p>Algunos programas de capacitación laboral pueden ser gratuitos o estar financiados, dependiendo de la situación de la persona, los requisitos de elegibilidad y el programa disponible.</p>
      <p>Antes de pagar por una capacitación, vale la pena investigar qué opciones de apoyo existen y verificar siempre los requisitos vigentes.</p>

      <h2>La estrategia correcta</h2>
      <p>No necesitas llenar tu currículum con veinte certificados.</p>
      <p>Una estrategia más inteligente puede ser:</p>
      <p>Define el trabajo → revisa ofertas reales → identifica requisitos repetidos → verifica quién reconoce la capacitación → realiza únicamente los cursos que realmente aporten a tu objetivo.</p>
      <p>También es importante destacar claramente en el resumé la capacitación y las habilidades relacionadas con el trabajo que buscas.</p>

      <blockquote>Un certificado no garantiza un empleo. Pero la capacitación correcta, para el trabajo correcto, puede ayudarte a llegar mejor preparado.</blockquote>
    `,
    video: null,
    sources: [
      { label: "ALIS — Government of Alberta — Take an exposure course to gain job-specific skills", href: "https://alis.alberta.ca/explore-education-and-training/take-an-exposure-course-to-gain-job-specific-skills/" },
      { label: "ALIS — Government of Alberta — Do you need a specific licence or certification to work in Alberta?", href: "https://alis.alberta.ca/tools-and-resources/questions-and-answers/how-do-i-find-out-if-i-need-a-specific-licence-or-certification-to-work-in-alberta/" },
      { label: "Government of Alberta — First aid training", href: "https://www.alberta.ca/first-aid-training" },
      { label: "Government of Alberta — Recognized food safety courses in Alberta", href: "https://www.alberta.ca/system/files/custom_downloaded_images/health-recognized-food-safety-courses-alberta.pdf" },
      { label: "ALIS — Government of Alberta — Assess and upgrade your foreign qualifications", href: "https://alis.alberta.ca/tools-and-resources/resources-for-newcomers/assess-and-upgrade-your-foreign-qualifications/" },
      { label: "ALIS — Government of Alberta — Newcomer's guide to working in Alberta", href: "https://alis.alberta.ca/tools-and-resources/resources-for-newcomers/newcomers-guide-to-working-in-alberta/" },
    ],
    correctionNote: null,
    disclaimerCategory: null,
    relatedSlugs: [],
    showNewsletter: true,
    sponsored: false,
    translationSlug: null,
    lang: "es",
    seo: {
      canonicalPath: "/empleo/certificaciones-trabajo-alberta/",
    },
  },
  {
    id: "ART-2026-002",
    slug: "llegar-canada-documentos-primer-dia",
    category: "Migración",
    contentType: "Guía",
    title: "Llegar a Canadá: los documentos que conviene tener organizados desde el primer día",
    dek: "Una guía práctica para proteger y organizar la documentación que puede acompañarte durante tus primeros trámites y tu nueva vida en Canadá.",
    excerpt: "Una guía práctica para proteger y organizar la documentación que puede acompañarte durante tus primeros trámites y tu nueva vida en Canadá.",
    author: { mode: "medio", name: "Redacción El Podcast del Migrante" },
    publishedAt: "2026-09-18T08:00:00-06:00",
    updatedAt: null,
    readingTimeOverride: null,
    location: null,
    demo: false,
    heroImage: {
      background: "url('assets/llegar-canada-documentos-migrante.jpg')",
      aspectRatio: "16/9",
      alt: "Familia migrante organizando documentos durante sus primeros pasos en Canadá",
    },
    bodyHtml: `
      <p>Llegar a Canadá implica mucho más que bajar del avión con una maleta. Durante las primeras semanas comienzan trámites relacionados con trabajo, identificación, salud, vivienda, educación y servicios gubernamentales.</p>
      <p>Y hay algo que puede hacer una enorme diferencia: tener los documentos importantes organizados desde el comienzo.</p>
      <p>El Gobierno de Canadá recomienda que quienes llegan para establecerse lleven consigo sus documentos oficiales y los de los familiares que inmigran con ellos. También recomienda que los documentos importantes que no estén en inglés o francés sean traducidos para facilitar su utilización en Canadá.</p>

      <h2>1. Pasaporte y documentos migratorios</h2>
      <p>El pasaporte continúa siendo uno de los documentos fundamentales de identificación.</p>
      <p>Dependiendo de la situación de cada persona, también pueden ser esenciales documentos como el permiso de trabajo, permiso de estudio, visitor record, Confirmation of Permanent Residence (COPR) o tarjeta de residente permanente.</p>
      <p>Es importante distinguir entre los documentos utilizados para viajar o entrar a Canadá y aquellos que sirven para demostrar el estatus migratorio de una persona dentro del país.</p>
      <p>Por eso conviene conservar cuidadosamente todos los documentos entregados por las autoridades migratorias.</p>

      <h2>2. Certificados de nacimiento, matrimonio y otros documentos civiles</h2>
      <p>Los documentos civiles pueden volver a ser necesarios incluso mucho tiempo después de haber llegado.</p>
      <p>Entre ellos pueden encontrarse certificados de nacimiento, matrimonio, divorcio o separación, adopción y documentos de cambio legal de nombre, cuando correspondan.</p>
      <p>Una buena práctica es mantener los originales protegidos y disponer también de copias digitales organizadas.</p>

      <h2>3. Diplomas, certificados y antecedentes académicos</h2>
      <p>No dejes atrás tu historia profesional.</p>
      <p>Diplomas universitarios, certificados técnicos y transcripciones académicas pueden resultar importantes posteriormente para estudiar, buscar empleo, obtener reconocimiento profesional o realizar una evaluación de credenciales.</p>
      <p>Dependiendo del programa migratorio, Canadá puede solicitar una Educational Credential Assessment (ECA) para determinar la equivalencia canadiense de estudios realizados en el extranjero.</p>
      <p>Incluso cuando estos documentos no sean necesarios inmediatamente, vale la pena conservarlos completos.</p>

      <h2>4. Registros médicos y de vacunación</h2>
      <p>La documentación médica también merece un lugar en esa carpeta.</p>
      <p>Entre los documentos que puede ser útil conservar se encuentran registros de vacunación y documentación médica relevante, como recetas, resultados de pruebas, información sobre alergias y registros dentales.</p>
      <p>Esto puede ser especialmente útil para familias con niños, personas que requieren medicamentos o quienes necesitan continuar tratamientos.</p>

      <h2>5. El SIN: importante, pero también confidencial</h2>
      <p>Quienes estén legalmente autorizados para trabajar necesitarán obtener su Social Insurance Number (SIN).</p>
      <p>El SIN es un número personal de nueve dígitos utilizado, entre otras cosas, para trabajar legalmente en Canadá y acceder a determinados programas y beneficios gubernamentales.</p>
      <p>Pero hay una segunda parte igualmente importante: protegerlo.</p>
      <p>El Gobierno de Canadá recomienda mantener el SIN seguro y proporcionarlo únicamente cuando exista una razón legítima para hacerlo.</p>

      <h2>6. Si vas a establecerte en Alberta</h2>
      <p>Para obtener por primera vez una licencia de conducir o una tarjeta de identificación de Alberta, pueden solicitarse documentos que permitan demostrar identidad, residencia en Alberta y derecho legal a permanecer en Canadá.</p>
      <p>La documentación también es fundamental para solicitar la cobertura provincial de salud cuando la persona cumple los requisitos correspondientes.</p>
      <p>Esto demuestra por qué conservar documentos de estatus, identidad y residencia no es simplemente una recomendación administrativa.</p>

      <h2>Crea tu carpeta de llegada</h2>
      <p>Una forma sencilla de organizarse es crear desde el comienzo una carpeta física y otra digital.</p>
      <p>Puedes organizarla por categorías:</p>
      <ul>
        <li>Identificación y pasaportes</li>
        <li>Documentos migratorios</li>
        <li>Documentos civiles</li>
        <li>Educación y experiencia profesional</li>
        <li>Salud y vacunación</li>
        <li>Documentos obtenidos posteriormente en Canadá</li>
      </ul>
      <p>Los documentos originales especialmente sensibles deben mantenerse protegidos y utilizarse únicamente cuando sean necesarios para un trámite específico.</p>

      <h2>Un pequeño hábito que puede ahorrar grandes problemas</h2>
      <p>Emigrar significa comenzar muchos procesos al mismo tiempo.</p>
      <p>Trabajo, vivienda, escuela, salud, bancos y trámites gubernamentales pueden terminar solicitando documentación diferente.</p>
      <p>Organizar los documentos desde el principio no garantiza que el camino migratorio sea sencillo, pero sí puede evitar búsquedas de último minuto, pérdida de información y retrasos innecesarios.</p>

      <blockquote>Tu nueva vida también comienza poniendo en orden tu historia.</blockquote>
    `,
    video: null,
    sources: [
      { label: "Immigration, Refugees and Citizenship Canada — Preparing to enter Canada / Crossing the border", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/border-crossing.html" },
      { label: "Immigration, Refugees and Citizenship Canada — Common supporting documents", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/common-supporting-documents.html" },
      { label: "Government of Canada / Service Canada — Social Insurance Number, required documents", href: "https://www.canada.ca/en/employment-social-development/services/sin/required-documents.html" },
      { label: "Government of Alberta — Identification card requirements", href: "https://www.alberta.ca/id-requirements-for-identification-cards" },
      { label: "Government of Alberta — Alberta health cards (AHCIP)", href: "https://www.alberta.ca/health-cards" },
    ],
    correctionNote: null,
    disclaimerCategory: "Migración",
    relatedSlugs: [],
    showNewsletter: true,
    sponsored: false,
    translationSlug: null,
    lang: "es",
    seo: {
      canonicalPath: "/migracion/llegar-canada-documentos-primer-dia/",
    },
  },
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
