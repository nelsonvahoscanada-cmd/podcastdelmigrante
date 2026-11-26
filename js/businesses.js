/*
  businesses.js — "Quién puede ayudarte" (directorio de perfiles empresariales)
  ======================================================================
  UNA plantilla (business-profile.html + js/business-profile.js) y UN
  directorio (quien-puede-ayudarte.html + js/business-directory.js)
  leen este archivo. Agregar el siguiente negocio/profesional es agregar
  un objeto a BUSINESSES y ejecutar el generador de su página para
  compartir (ver el final de este comentario).

  REGLA DE ORO (la misma del resto del sitio): un campo vacío ("" / []/
  null) NO se muestra, y su botón o sección tampoco. Nunca se rellenan
  datos que el profesional no haya confirmado: sin teléfono no hay botón
  de llamar, sin video no hay sección de video, sin servicios activos no
  hay sección de servicios.

  SEGURIDAD: este archivo es PÚBLICO. Aquí solo van datos profesionales
  autorizados para publicarse. Nunca claves, tokens, credenciales ni
  datos privados de clientes.

  CAMPOS
    id, slug            identificadores (slug = perfil-<slug>.html; solo
                        minúsculas, números y guiones)
    published           true = aparece en el directorio y su perfil abre
    updatedAt           [RECOMENDADO] fecha real de la última modificación
                        del registro ("AAAA-MM-DD"). Se usa como <lastmod>
                        del sitemap y dateModified de los datos
                        estructurados. ACTUALIZARLA cada vez que se cambie el
                        registro; nunca inventarla. Sin ella no se publica
                        ninguna fecha.
    plan                [OPCIONAL] "gratuito" = ficha del plan Gratuito: SIN
                        miniweb ni página propia; se muestra solo como
                        tarjeta en el directorio con imagen (profileImage
                        o cardImage; profileImageKind "logo" si es un
                        logotipo), nombre, categoría, ciudad y provincia,
                        shortDescription (≤ 200) y phone. Sin este campo
                        el registro es un Perfil Premium (miniweb).
    featured            true = se ordena primero en el directorio
    foundingProfile     marca interna de perfil piloto/fundador (no se
                        muestra públicamente)
    name, shortName     nombre completo / nombre corto para frases
                        ("Conoce a Tomás")
    professionalTitle, company
    representative      [OPCIONAL] persona que representa a un negocio o
                        personaje comercial cuyo nombre (name) es la marca.
                        Se muestra «Representante: <nombre>» en el perfil;
                        los datos para Google pasan a ser de la
                        organización (con la persona como representante) y
                        la vCard se guarda con el nombre principal y la
                        persona como representante. Sin este campo nada
                        cambia.
    tagline             [OPCIONAL] frase destacada bajo el nombre
    theme               [OPCIONAL] tema visual propio del perfil (ej.
                        "navidad" → css/temas/navidad.css, que solo aplica a
                        ese perfil). Sin este campo, diseño estándar.
    professionalTitleAlt  [OPCIONAL] cargo en otro idioma (ej. inglés)
    brandName, brandLogo  [OPCIONAL] marca profesional y su logo
    affiliation         [OPCIONAL] afiliación indicada por el profesional
    card                [OPCIONAL] { title } versión corta del cargo para
                        la tarjeta del directorio
    category            id de categoría (ver BUSINESS_CATEGORIES)
    city, province, country, address, postalCode
    languages           ["es", "en", "fr"] — SOLO idiomas confirmados;
                        vacío = no se muestra nada de idiomas
    serviceAreas        [OPCIONAL] provincias donde el profesional indica
                        prestar servicios; también cuentan en el filtro
                        "Provincia" del directorio
    availability        [OPCIONAL] texto de disponibilidad (ej. "con cita")
    shortDescription    texto breve (tarjeta del directorio)
    longDescription     texto largo opcional del perfil (texto o lista de
                        párrafos)
    quote               [OPCIONAL] frase/filosofía del profesional
    callToAction        { title, text } bloque principal del perfil
    services            [{ id, label, description?, active }] — solo se
                        muestran los activos; activar = poner active: true
    serviceGroups       [OPCIONAL] [{ title, items: [...] }] servicios
                        agrupados por categoría (se muestran tal cual)
    servicesNote        [OPCIONAL] nota prudente bajo los servicios
    testimonials        [{ text, author, authorized }] — SOLO testimonios
                        reales y autorizados (authorized: true). Vacío =
                        la sección no existe. Nunca inventar.
    disclaimer          [OPCIONAL] aviso propio del perfil (se suma al
                        aviso general)
    phone, whatsapp     texto/número reales; vacío = botón oculto
                        (whatsapp: solo dígitos con código de país, ej.
                        "14035551234"; phone: formato libre, ej.
                        "+1 403 555 1234")
    email, website, inventoryUrl, inventoryLabel
    bookingUrl, bookingLabel  calendario de citas; si existe, es la
                        acción PRINCIPAL del perfil ("Agenda una consulta")
    mapUrl              enlace de Google Maps; si está vacío se genera
                        desde la dirección
    instagram, tiktok, facebook, linkedin
                        URLs completas OFICIALES; vacío = no se muestra.
                        Aparecen con icono junto a los datos del perfil y
                        en el bloque final "¿Quieres hablar con ...?".
    youtubeVideoId      ID del video (YouTube no listado). Vacío = sin
                        sección de video
    videoText           texto bajo "Conoce a ..."
    videoTitle          [OPCIONAL] título propio de la sección del video
                        (sin él: "Conoce a <shortName>")
    videoLinkLabel      [OPCIONAL] texto de un enlace alternativo para ver
                        el video en YouTube, bajo el reproductor
    videoPlacement      [OPCIONAL] "after-cta" = el video va justo después
                        del bloque comercial (callToAction), antes de la
                        biografía. Sin el campo: después de la trayectoria.
    profileImage        foto del PERFIL (vertical 4:5)
    profileImageKind    [OPCIONAL] "logo" = la imagen es un logotipo: se
                        muestra completa (sin recortar) sobre fondo blanco.
                        Sin este campo se trata como fotografía.
    heroLayout          [OPCIONAL] "wide" = imagen horizontal completa
                        (ej. 5:4 con fondo de marca), sin recortar
    cardImage           [OPCIONAL] recorte cuadrado rostro+hombros para la
                        tarjeta del directorio (si falta, usa profileImage)
    ogImage             [OPCIONAL] imagen al compartir en redes (cuadrada
                        recomendada; si falta, usa profileImage)
    coverImage, gallery, hours
    PARA CAMBIAR UNA FOTO: reemplazar el archivo en assets/ conservando el
    mismo nombre, o apuntar estos campos a un archivo nuevo. No se toca
    ninguna plantilla.
    seo                 { title, description }
    connect             [OPCIONAL] sección "Conecta con ..." con dos QR
                        (piloto: solo Tomás). Sin este campo la sección
                        no existe.
                          profileQr: true   QR "Visita mi perfil" →
                                            perfil-<slug>.html
                          contactCard: { givenName, familyName,
                                         middleName? }
                                            QR "Guarda mi contacto" →
                                            vcard/<slug>.vcf, con nombre,
                                            cargo, empresa, phone, email,
                                            website y dirección de ESTE
                                            registro (nunca otros datos;
                                            sin address solo van ciudad,
                                            provincia y país)
                        Archivos (no se editan a mano):
                          node scripts/build-profile-pages.mjs
                              → vcard/<slug>.vcf
                          python3 scripts/build-qr-images.py
                              → assets/qr/perfil-<slug>.svg/.png y
                                assets/qr/contacto-<slug>.svg/.png
                          contactCard.note / contactCard.url [OPCIONAL]
                                            nota y enlace de la vCard
                                            (sin website ni representante)
                          profileQrCaption  [OPCIONAL] texto bajo el QR del
                                            perfil (por defecto «Escanea y
                                            conoce mis servicios»)

  MINIWEB INSTITUCIONAL (ej. Nelson Vahos): mismas funciones Premium (página
  propia, SEO, datos estructurados, QR, vCard y estadísticas). Campos
  opcionales; sin ellos ningún perfil cambia:
    directory: false    no aparece en «Quién puede ayudarte» (tarjetas,
                        filtros, datos estructurados ni fecha del
                        directorio) ni se exige en «Planes del Directorio».
                        Conserva su URL /perfil-<slug> en el sitemap.
    institutional: true textos de presentación institucional: «Perfil
                        institucional», «Contacto profesional», sin el
                        aviso de servicios del Directorio.
    roles               [{ title, organization?, url?, sameAs?, founder? }] cargos
                        completos, uno por línea en la portada; en Google,
                        jobTitle y worksFor (cada organización con su
                        sitio y redes oficiales).
    aboutTitle          título de la sección de la biografía.
    longDescription     admite **negrita** y *cursiva* (texto aprobado).
    quoteRaw: true      la cita se muestra tal cual (con sus comillas).
    projects            [{ id, name, logo?, kicker?, text, url, label,
                        note?, links: [{ network, href }] }] una tarjeta
                        por proyecto (logo opcional).
    projectsTitle, timelineTitle  títulos de esas secciones.
    timeline            [{ date?, text }] hitos confirmados; sin fecha no
                        se inventa ninguna.
    Sin ciudad (city: ""), la ubicación se muestra como «Provincia, País».
    founder: true (en un cargo)  la organización declara a la persona como
                        fundadora en los datos estructurados.
    profileImageWidth, profileImageHeight  dimensiones reales de la foto
                        principal (atributos width/height).
  Contacto (opcionales, sirven a cualquier perfil):
    whatsappMessage     mensaje predefinido del enlace wa.me (?text=…).
    whatsappLabel, phoneLabel  texto de los botones de WhatsApp y llamada
                        (la barra fija del celular sigue con «WhatsApp» y
                        «Llamar»).
    showPhone: true     muestra el número en el bloque final de contacto.
    connect.contactCard.socialProfiles  [{ type, url }] → X-SOCIALPROFILE
                        en la vCard (ej. whatsapp, tiktok).

  FICHA GRATUITA (solicitud con «Plan solicitado: Plan Gratuito»)
    Solo estos campos: id, slug, published: true, plan: "gratuito",
    name, category, city, province, country, shortDescription, phone,
    profileImage (y profileImageKind: "logo" si corresponde). El
    generador de perfiles la omite: no se crea perfil-<slug>.html.

  DESDE UNA SOLICITUD DEL FORMULARIO (registra-tu-empresa.html)
    Panel privado → Solicitudes → (aprobada) → «Preparar publicación»:
    entrega la ficha lista para pegar aquí y la imagen. Luego:
      node scripts/build-profile-pages.mjs && python3 scripts/build-qr-images.py
    y Pull Request. Ver docs/directorio-solicitudes.md.

  CÓMO AGREGAR EL SIGUIENTE NEGOCIO (ej. Carlos D. Castillo)
    1. Copiar el objeto de Tomás al final de BUSINESSES.
    2. Cambiar id, slug, nombre, categoría (usar un id existente de
       BUSINESS_CATEGORIES), ciudad/provincia y contactos reales.
    3. Dejar vacío ("" o []) todo lo no confirmado.
    4. Ejecutar  node scripts/build-profile-pages.mjs  y subir el
       perfil-su-slug.html que crea. Esa es la URL para compartir: lleva
       en el HTML el nombre, la descripción (seo) y la foto (ogImage) del
       profesional, que es lo que leen WhatsApp, Facebook e iMessage.
       (Si se olvida, el chequeo de GitHub "Perfiles: vistas previas"
       falla.) Repetirlo también al cambiar seo, ogImage o el slug.
    Listo: aparece solo en el directorio y su perfil abre en
    perfil-su-slug.html (business-profile.html?slug=su-slug sigue
    funcionando y lleva a la misma página).
========================================================================= */

const BUSINESS_CATEGORIES = [
  { id: "automoviles", label: "Automóviles" },
  /* Las demás se habilitan automáticamente en cuanto exista al menos un
     negocio publicado en la categoría. */
  { id: "seguros-finanzas", label: "Seguros y protección financiera" },
  { id: "vivienda", label: "Vivienda" },
  { id: "empleo", label: "Empleo" },
  { id: "salud", label: "Salud" },
  { id: "servicios-hogar", label: "Servicios del hogar" },
  { id: "eventos-celebraciones", label: "Eventos y celebraciones" },
  { id: "produccion-audiovisual", label: "Producción audiovisual y contenido digital" },
];

const BUSINESSES = [
  {
    id: "BIZ-001",
    slug: "tomas-velazquez",
    published: true,
    updatedAt: "2026-10-07",       /* última modificación real del registro (historial de git) */
    featured: false,
    foundingProfile: true,

    name: "Tomás Velázquez",
    shortName: "Tomás",
    professionalTitle: "Asesor de ventas automotrices",
    company: "Country Hills Toyota",
    category: "automoviles",

    city: "Calgary",
    province: "Alberta",
    country: "Canadá",
    address: "20 Freeport Landing NE",
    postalCode: "T3J 5H6",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=20%20Freeport%20Landing%20NE%2C%20Calgary%2C%20AB%20T3J%205H6",

    languages: [],            /* "Atención en español" se muestra solo cuando se confirme */
    shortDescription: "Perfil profesional, datos de contacto y recursos para quienes buscan vehículo en Calgary.",
    longDescription: "",
    callToAction: {
      title: "¿Buscas vehículo en Calgary?",
      text: "Conoce a Tomás Velázquez y encuentra en un solo lugar su información profesional, formas de contacto y recursos para comenzar tu búsqueda de vehículo en Calgary.",
    },

    /* Servicios: NINGUNO confirmado todavía. Para activar uno, poner
       active: true. Mientras todos estén en false, la sección no aparece. */
    services: [
      { id: "nuevos", label: "Vehículos nuevos", description: "", active: false },
      { id: "usados", label: "Vehículos usados", description: "", active: false },
      { id: "trade-in", label: "Trade-in", description: "", active: false },
      { id: "orientacion", label: "Orientación durante el proceso de compra", description: "", active: false },
      { id: "espanol", label: "Atención en español", description: "", active: false },
    ],

    phone: "+1 (587) 894-8527",
    whatsapp: "15878948527",
    email: "tomasvl1977@gmail.com",
    website: "https://www.chtoyota.com/",
    inventoryUrl: "https://www.chtoyota.com/",
    inventoryLabel: "Ver vehículos",
    bookingUrl: "",

    instagram: "https://www.instagram.com/77_automotiveco/",
    tiktok: "https://www.tiktok.com/@tomasvelasqueztoyota",
    facebook: "",
    linkedin: "",

    youtubeVideoId: "EEqjez0MuAY",   /* video oficial (YouTube NO LISTADO) creado para esta ficha */
    videoText: "Conoce a Tomás Velázquez y descubre cómo puede orientarte durante tu búsqueda de vehículo en Calgary.",

    profileImage: "assets/tomas-velazquez.jpg",           /* hero del perfil (vertical 4:5) */
    cardImage: "assets/tomas-velazquez-card.jpg",         /* directorio: rostro y hombros */
    ogImage: "assets/tomas-velazquez-og.jpg",             /* al compartir en redes */
    coverImage: "",
    gallery: [],
    hours: [],                /* PENDIENTE — ej. [{ day: "Lunes a viernes", time: "9:00 – 18:00" }] */

    /* Piloto: sección "Conecta con Tomás" (QR del perfil + QR de contacto) */
    connect: {
      profileQr: true,
      contactCard: { givenName: "Tomás", familyName: "Velázquez" },
    },

    seo: {
      title: "Tomás Velázquez | Vehículos en Calgary | El Podcast del Migrante",
      description: "Conoce el perfil profesional de Tomás Velázquez en Calgary, sus datos de contacto, ubicación y recursos para quienes buscan vehículo.",
    },
  },
  {
    id: "BIZ-002",
    slug: "carlos-d-castillo",
    published: true,
    updatedAt: "2026-10-07",       /* última modificación real del registro (historial de git) */
    featured: false,
    foundingProfile: true,

    name: "Carlos D. Castillo",
    shortName: "Carlos",
    professionalTitle: "Asesor de Seguros de Vida y Salud | Estrategias de Protección y Patrimonio",
    professionalTitleAlt: "Life & Health Insurance Advisor | Wealth & Insurance Strategies",
    company: "Roca Financial Group Ltd.",
    brandName: "Carlos D. Castillo – Wealth & Insurance Strategies",
    brandLogo: "assets/carlos-d-castillo-logo.jpg",
    affiliation: "Greatway Financial",   /* afiliación indicada por el profesional */
    category: "seguros-finanzas",
    card: { title: "Asesor de Seguros de Vida y Salud" },

    city: "Calgary",
    province: "Alberta",
    country: "Canadá",
    address: "",              /* sin dirección pública: atención con cita */
    postalCode: "",
    mapUrl: "",

    languages: ["es", "en"],
    /* Provincias donde Carlos INDICA estar autorizado para prestar servicios
       (información suministrada por él; no se amplía ni se interpreta). */
    serviceAreas: ["Alberta", "British Columbia", "Saskatchewan", "Ontario"],
    availability: "Atención con cita previa, presencial o virtual.",

    shortDescription: "Seguros de vida y salud, protección familiar y estrategias de ahorro y patrimonio en Calgary.",
    longDescription: [
      "De acuerdo con la información suministrada por Carlos, cuenta con experiencia en la industria de seguros desde 1994 y una trayectoria profesional desarrollada entre Colombia, Estados Unidos y Canadá.",
      "Carlos es colombiano y llegó a Canadá en 2008. Su experiencia como inmigrante forma parte de su enfoque de acompañamiento a personas y familias que están construyendo su vida financiera en Canadá.",
    ],
    quote: "Quiero que cada cliente entienda qué está haciendo, por qué lo está haciendo y cómo esa decisión encaja dentro de su futuro financiero en Canadá.",
    callToAction: {
      title: "Protección hoy. Estrategia para mañana.",
      text: "Carlos ayuda a familias, inmigrantes, profesionales y empresarios en Canadá a comprender herramientas de protección, seguros y acumulación patrimonial y a desarrollar estrategias alineadas con sus objetivos.",
    },

    services: [],
    /* Servicios suministrados por Carlos. Ninguno se presenta como garantía
       de rendimiento, ahorro fiscal, aprobación ni resultado financiero. */
    serviceGroups: [
      {
        title: "Protección personal y familiar",
        items: [
          "Seguros de vida",
          "Term Life Insurance",
          "Permanent Life Insurance",
          "Universal Life Insurance",
          "Participating Whole Life Insurance",
          "Critical Illness Insurance y otras soluciones de protección",
          "Análisis de necesidades financieras y de seguros",
          "Revisión de pólizas existentes",
        ],
      },
      {
        title: "Ahorro y acumulación patrimonial",
        items: [
          "TFSA",
          "RRSP",
          "FHSA",
          "RESP",
          "Soluciones de inversión dentro del alcance de sus licencias",
          "Estrategias de acumulación patrimonial",
          "Planificación para el retiro",
        ],
      },
      {
        title: "Empresarios y patrimonio",
        items: [
          "Seguros para empresarios y propietarios de corporaciones",
          "Corporate-Owned Life Insurance",
          "Estrategias orientadas a planificación sucesoria",
          "Estrategias de transferencia patrimonial",
        ],
      },
    ],
    servicesNote: "Cuando una estrategia requiere asesoría tributaria, contable o legal, Carlos trabaja de manera coordinada con los profesionales correspondientes del cliente.",

    /* Sin testimonios autorizados todavía: la sección NO se muestra. */
    testimonials: [],

    phone: "+1 403 918 4019",
    whatsapp: "14039184019",
    email: "advice@carlosdar.io",
    website: "https://carlosdcastillo.com/",
    inventoryUrl: "",
    inventoryLabel: "",
    bookingUrl: "https://link.carlosdcastillo.com/widget/booking/lQX2qvrteyfJherfQb8r",
    bookingLabel: "Agenda una consulta",

    instagram: "https://www.instagram.com/carlosdariocastillogarcia/",
    tiktok: "https://www.tiktok.com/@carlos.dcastillo",
    facebook: "https://www.facebook.com/CarlosDCastilloSegurosyalgomas",
    linkedin: "https://www.linkedin.com/company/carlos-d-castillo-wealth-and-insurance-strategies/",

    /* Video PROVISIONAL: entrevista de Desafío 100 Empresas. Para cambiarlo
       por el video específico del perfil, reemplazar solo este ID. */
    youtubeVideoId: "xJaXI3r83sA",
    videoText: "Entrevista realizada en Desafío 100 Empresas.",

    heroLayout: "wide",                                   /* imagen 5:4 con skyline de Calgary, sin recortar */
    profileImage: "assets/carlos-d-castillo.jpg",
    cardImage: "assets/carlos-d-castillo-card.jpg",       /* directorio: rostro y hombros */
    ogImage: "assets/carlos-d-castillo-og.jpg",
    coverImage: "",
    gallery: [],
    hours: [],

    /* Sección "Conecta con Carlos" (QR del perfil + QR de contacto) */
    connect: {
      profileQr: true,
      contactCard: { givenName: "Carlos", middleName: "D.", familyName: "Castillo" },
    },

    disclaimer: "La experiencia, la afiliación y las provincias de servicio indicadas en este perfil fueron suministradas por el profesional. La información es general y no constituye asesoría financiera, tributaria ni legal; ninguna estrategia garantiza rendimiento, ahorro fiscal, aprobación ni un resultado financiero determinado.",

    seo: {
      title: "Carlos D. Castillo | Seguros de vida y salud en Calgary | El Podcast del Migrante",
      description: "Perfil empresarial de Carlos D. Castillo en Calgary: seguros de vida y salud, protección familiar y estrategias de ahorro y patrimonio. Atención en español e inglés con cita previa.",
    },
  },
  {
    /* SOL-20261105-CRD9C2 · invitación INV-20261104-GXQCJP (Premium de
       cortesía). Datos e imágenes entregados por el representante. */
    id: "BIZ-003",
    slug: "santa-latino",
    published: true,
    updatedAt: "2026-11-26",       /* última modificación real del registro (historial de git) */
    featured: false,
    foundingProfile: false,

    name: "Santa Latino",
    shortName: "Santa Latino",
    representative: "Héctor Rivero",
    tagline: "La magia de la Navidad llega hasta ti.",
    theme: "navidad",
    professionalTitle: "Personaje navideño para eventos y celebraciones",
    company: "",
    category: "eventos-celebraciones",

    city: "Niagara Falls",
    province: "Ontario",
    country: "Canadá",
    address: "",              /* sin dirección pública */
    postalCode: "",
    mapUrl: "",

    languages: ["es", "en"],
    availability: "Desde Niagara Falls, Ontario, a celebraciones y eventos en distintas ciudades de Canadá, sujeto a disponibilidad.",

    shortDescription: "Santa Claus latino para hogares, fiestas, empresas y comunidades en Canadá, en español e inglés.",
    longDescription: [
      "Santa Latino lleva la alegría y la magia de la Navidad a familias, empresas y comunidades. Con años de experiencia representando a Santa Claus, ofrece encuentros cercanos y memorables, llenos de sonrisas, ilusión y espíritu navideño.",
      "Desde Niagara Falls, Ontario, participa en celebraciones y eventos en diferentes lugares de Canadá, ofreciendo experiencias en español e inglés.",
    ],

    /* Servicios indicados por el representante. Sin precios, horarios ni
       paquetes: se acuerdan directamente con él. */
    services: [
      { id: "hogares", label: "Visitas de Santa a hogares", description: "", active: true },
      { id: "fiestas", label: "Fiestas infantiles y celebraciones familiares", description: "", active: true },
      { id: "fotos", label: "Fotografías y encuentros con Santa", description: "", active: true },
      { id: "empresas", label: "Eventos privados y empresariales", description: "", active: true },
      { id: "comunidad", label: "Participación en actividades comunitarias", description: "", active: true },
      { id: "bilingue", label: "Presentaciones navideñas en español e inglés", description: "", active: true },
    ],

    testimonials: [],

    phone: "+1 289 968 6235",
    whatsapp: "12896965721",
    email: "santalatinoon@gmail.com", /* correo oficial autorizado (6-11-2026) */
    showEmail: true,          /* muestra la dirección como texto en el bloque de contacto */
    website: "",
    inventoryUrl: "",
    bookingUrl: "",

    instagram: "https://www.instagram.com/latinsantaon/",
    tiktok: "https://www.tiktok.com/@santalatino_",
    facebook: "",
    linkedin: "",

    /* Entrevista de El Podcast del Migrante (la misma del artículo
       «Héctor Rivero, Santa Latino»). */
    youtubeVideoId: "LxTr1Zda3dg",
    videoTitle: "Santa Latino en El Podcast del Migrante",
    videoText: "Conoce la historia de Héctor Rivero, el hombre detrás de Santa Latino, en esta entrevista especial de El Podcast del Migrante.",
    videoLinkLabel: "Ver entrevista en YouTube",

    profileImage: "assets/directorio/perfiles/santa-latino-principal-navidad.jpg",   /* retrato 4:5: fotografía navideña (fondo de madera), la misma de ogImage */
    cardImage: "assets/directorio/perfiles/santa-latino-card.jpg",    /* directorio */
    ogImage: "assets/directorio/perfiles/santa-latino-og-navidad.jpg",   /* al compartir: fotografía navideña 1200 × 630 (nuevo nombre para renovar la caché de WhatsApp y Facebook) */
    coverImage: "",
    gallery: [
      /* Dos fotografías de un evento navideño comunitario, una al lado de la
         otra (css/temas/navidad.css). Reemplazan la fotografía junto al árbol. */
      { src: "assets/directorio/perfiles/santa-latino-evento-escenario.jpg", alt: "Santa Latino en el escenario de una celebración navideña, junto a niños con suéteres navideños" },
      { src: "assets/directorio/perfiles/santa-latino-evento-regalos.jpg", alt: "Santa Latino entrega regalos a niños en el escenario de una celebración navideña comunitaria" },
    ],
    hours: [],

    connect: {
      profileQr: true,
      contactCard: { givenName: "Héctor", familyName: "Rivero" },
    },

    seo: {
      title: "Santa Latino | Santa Claus para eventos en Niagara Falls, Ontario | El Podcast del Migrante",
      description: "Santa Latino lleva la magia de la Navidad a hogares, fiestas, empresas y comunidades en Canadá. Experiencias en español e inglés desde Niagara Falls, Ontario.",
    },
  },
{
    /* BIZ-004 — 1JuanRomero1 Inc. (solicitud SOL-20261105-G5TQ46).
       Membresía: Premium de cortesía permanente ya registrada en el panel
       administrativo (la activa la dirección manualmente tras publicar); este
       archivo no crea membresías ni cobros. Se publica solo tras la
       aprobación del empresario y la autorización de la dirección. Datos y
       fotografía entregados por el empresario; sin videos ni enlaces
       inventados. */
    id: "BIZ-004",
    slug: "1juanromero1",
    published: true,
    updatedAt: "2026-11-15",       /* última modificación real del registro (historial de git) */
    featured: false,
    foundingProfile: false,

    name: "1JuanRomero1 Inc.",
    shortName: "1JuanRomero1",
    representative: "Juan Sebastián Vahos Alvarado",
    theme: "cine",
    professionalTitle: "Fundador, Videógrafo y Editor de Video",
    company: "",
    category: "produccion-audiovisual",

    city: "Calgary",
    province: "Alberta",
    country: "Canadá",
    address: "",              /* sin dirección pública */
    postalCode: "",
    mapUrl: "",

    languages: ["es", "en"],
    availability: "Servicios presenciales y remotos para clientes en Canadá y otros países.",

    shortDescription: "Producción audiovisual y contenido digital: edición profesional, videos para redes sociales, eventos, videografía, animación, efectos visuales e IA.",
    longDescription: [
      "Empresa de producción audiovisual y creación de contenido digital especializada en edición profesional, videos para redes sociales, eventos, videografía, animación, efectos visuales e inteligencia artificial.",
      "Servicios en español e inglés, presenciales y remotos, para clientes en Canadá y otros países.",
    ],

    /* Servicios indicados en la solicitud. Sin precios ni paquetes. */
    services: [
      { id: "edicion", label: "Edición profesional de video", description: "", active: true },
      { id: "redes", label: "Videos para redes sociales", description: "", active: true },
      { id: "eventos", label: "Videos de eventos", description: "", active: true },
      { id: "videografia", label: "Videografía", description: "", active: true },
      { id: "animacion", label: "Animación", description: "", active: true },
      { id: "vfx", label: "Efectos visuales", description: "", active: true },
      { id: "ia", label: "Contenido con inteligencia artificial", description: "", active: true },
    ],

    testimonials: [],

    phone: "+1 403 363 7566",
    whatsapp: "",
    email: "contact1juanromero1@gmail.com", /* correo comercial autorizado para publicarse */
    showEmail: true,
    emailFirst: true,         /* medio de contacto preferido: primer botón */
    emailLabel: "Solicitar cotización",
    website: "",
    inventoryUrl: "",
    bookingUrl: "",

    instagram: "https://www.instagram.com/1juanromero1/",
    tiktok: "https://www.tiktok.com/@1juanromero1",
    facebook: "",
    linkedin: "",

    /* Video oficial entregado por el empresario (canal propio): portada local
       neutra (js/video-cover.js), sin autoplay al abrir la página. */
    youtubeVideoId: "9rg27W1igsY",
    videoLinkLabel: "Ver en YouTube",

    /* Portafolio profesional (enlace externo, sin iframe) */
    portfolio: {
      title: "Mi portafolio profesional",
      text: "Explora mis proyectos de producción audiovisual, edición de video y creación de contenido. Conoce mi trabajo y descubre cómo puedo ayudarte a llevar tus ideas al siguiente nivel.",
      label: "Ver portafolio completo",
      url: "https://ytjobs.co/talent/profile/91099",
    },

    profileImage: "assets/directorio/perfiles/1juanromero1.jpg",      /* fotografía original, sin recortes */
    cardImage: "assets/directorio/perfiles/1juanromero1-card.jpg",    /* directorio */
    ogImage: "assets/directorio/perfiles/1juanromero1-og.jpg",        /* al compartir (foto completa sobre fondo oscuro) */
    coverImage: "",
    gallery: [],
    hours: [],

    connect: {
      profileQr: true,
      contactCard: { givenName: "Juan Sebastián", familyName: "Vahos Alvarado" },
    },

    seo: {
      title: "1JuanRomero1 Inc. | Producción audiovisual y edición de video en Calgary, Alberta | El Podcast del Migrante",
      description: "Edición de video, contenido para redes, eventos, videografía, animación, efectos visuales e IA, en español e inglés. Presencial y remoto desde Calgary.",
    },
  },
  /* ================================================================
     BIZ-005 — Nelson Vahos (miniweb institucional, fuera del Directorio)
     Aprobado por Nelson Vahos: identidad, biografía (texto literal),
     fotografía original (chaqueta amarilla y micrófono RØDE, solo
     recortes y optimización), correo público y enlaces. Diciembre de
     2011 = inicio de las transmisiones de eRadio Global (no es la
     constitución legal de eRadio Global Corp.). Sin teléfonos, WhatsApp
     ni datos personales adicionales; sin Instagram de eRadio Global hasta
     confirmar su vigencia.
     ================================================================ */
  {
    id: "BIZ-005",
    slug: "nelson-vahos",
    published: true,
    updatedAt: "2026-11-15",       /* fecha real de publicación del registro */
    featured: false,
    foundingProfile: false,
    directory: false,              /* no aparece en «Quién puede ayudarte» ni en «Planes del Directorio» */
    institutional: true,

    name: "Nelson Vahos",
    shortName: "Nelson",
    theme: "institucional",
    roles: [
      {
        title: "Fundador y Director General de eRadio Global Corp.",
        founder: true,
        organization: "eRadio Global Corp.",
        url: "https://eradioglobal.com/",
        sameAs: ["https://facebook.com/eradioglobal", "https://youtube.com/@eradioglobal4291"],
      },
      {
        title: "Fundador y Director de El Podcast del Migrante",
        founder: true,
        organization: "El Podcast del Migrante",
        url: "https://podcastdelmigrante.com/",
        sameAs: ["https://www.youtube.com/@ElPodcastDelMigranteOficial", "https://www.tiktok.com/@podcastdelmigrante"],
      },
    ],
    tagline: "Conectando latinos, construyendo futuro",
    professionalTitle: "Fundador y Director General",   /* vCard (TITLE) */
    company: "eRadio Global Corp.",                     /* vCard (ORG) */
    category: "institucional",
    city: "",
    province: "Alberta",
    country: "Canadá",
    address: "",
    postalCode: "",
    mapUrl: "",
    languages: ["es"],

    shortDescription: "Nelson Vahos, comunicador colombiano en Alberta, Canadá. Fundador y Director General de eRadio Global Corp. y Fundador y Director de El Podcast del Migrante.",
    /* Biografía aprobada: texto literal, sin cambios de redacción */
    aboutTitle: "Sobre Nelson",
    longDescription: [
      "Nelson Vahos es un comunicador colombiano, emprendedor y fundador de proyectos de comunicación digital en Canadá. Desde Alberta, dirige eRadio Global Corp. y El Podcast del Migrante, iniciativas orientadas a informar, conectar y fortalecer a la comunidad latina.",
      "Su trayectoria comenzó en la radio colombiana, donde tuvo la oportunidad de trabajar junto a William Vinasco Ch., una figura reconocida de la radiodifusión nacional. Durante esa etapa adquirió experiencia en comunicación, entrevistas y producción de contenidos.",
      "En diciembre de 2011 comenzaron las transmisiones de **eRadio Global**, un proyecto que con el tiempo evolucionó hacia nuevas iniciativas de comunicación y medios digitales.",
      "Su llegada a Canadá representó una nueva etapa personal y profesional. Como muchos migrantes, enfrentó el desafío de comenzar nuevamente, adaptarse a otro idioma y trabajar en sectores diferentes a los de su trayectoria anterior, incluida la construcción.",
      "Esa experiencia le permitió comprender de cerca las dificultades, oportunidades y aspiraciones de quienes construyen una nueva vida lejos de su país de origen.",
      "Hoy, a través de **El Podcast del Migrante**, comparte noticias, entrevistas e información de utilidad para la comunidad latina en Canadá. También escribe la columna *Entre dos mundos* en el Magazine digital.",
      "Además, lidera **Desafío 100 Empresas**, una iniciativa que busca dar visibilidad a las historias de empresarios y emprendedores, comenzando en Calgary, mediante entrevistas gratuitas.",
      "Su trabajo reúne comunicación, tecnología, emprendimiento y experiencia migratoria bajo una misma visión:",
      "**«Conectando latinos, construyendo futuro».**",
    ],
    quote: "«El frío no pudo apagar mi señal. Solamente me enseñó a transmitir con un propósito diferente».",
    quoteRaw: true,

    projectsTitle: "Proyectos",
    projects: [
      {
        id: "eradio-global",
        name: "eRadio Global Corp.",
        kicker: "Transmisiones desde diciembre de 2011",
        text: "En diciembre de 2011 comenzaron las transmisiones de eRadio Global, un proyecto que con el tiempo evolucionó hacia nuevas iniciativas de comunicación y medios digitales.",
        url: "https://eradioglobal.com/",
        label: "Visitar eradioglobal.com",
        note: "Sitio oficial en desarrollo.",
        links: [
          { network: "facebook", href: "https://facebook.com/eradioglobal" },
          { network: "youtube", href: "https://youtube.com/@eradioglobal4291" },
        ],
      },
      {
        id: "podcast-del-migrante",
        name: "El Podcast del Migrante",
        logo: "assets/logo.png",
        kicker: "Medio informativo para la comunidad latina en Canadá",
        text: "Noticias, entrevistas e información de utilidad para la comunidad latina en Canadá, y la columna *Entre dos mundos* en el Magazine digital.",
        url: "https://podcastdelmigrante.com/",
        label: "Visitar podcastdelmigrante.com",
        links: [
          { network: "youtube", href: "https://www.youtube.com/@ElPodcastDelMigranteOficial" },
          { network: "tiktok", href: "https://www.tiktok.com/@podcastdelmigrante" },
        ],
      },
      {
        id: "desafio-100-empresas",
        name: "Desafío 100 Empresas",
        kicker: "100 empresarios. 100 historias. Un legado.",
        text: "Una iniciativa que busca dar visibilidad a las historias de empresarios y emprendedores, comenzando en Calgary, mediante entrevistas gratuitas, con la meta de llegar a 100 entrevistas.",
        url: "/desafio-100-empresas/",
        label: "Conocer el Desafío",
      },
    ],

    timelineTitle: "Trayectoria",
    timeline: [
      { text: "Radio colombiana: trabaja junto a William Vinasco Ch. y adquiere experiencia en comunicación, entrevistas y producción de contenidos." },
      { date: "Diciembre de 2011", text: "Comienzan las transmisiones de **eRadio Global**." },
      { text: "Llegada a Canadá: una nueva etapa personal y profesional." },
      { text: "Hoy: dirige **eRadio Global Corp.** y **El Podcast del Migrante**, escribe la columna *Entre dos mundos* y lidera **Desafío 100 Empresas**." },
    ],

    /* Objetivo de la miniweb: patrocinios, publicidad y alianzas comerciales.
       WhatsApp es la llamada a la acción principal (también en la barra fija
       del celular); el mismo número sirve para llamadas. */
    callToAction: {
      title: "Patrocinios, publicidad y alianzas comerciales",
      text: "¿Quieres que tu marca llegue a la comunidad latina en Canadá? Conversemos sobre patrocinios, publicidad y alianzas comerciales con El Podcast del Migrante y eRadio Global Corp.",
    },
    phone: "+1 402 427 2741",
    whatsapp: "+1 402 427 2741",
    whatsappMessage: "Hola Nelson, encontré tu perfil en El Podcast del Migrante y me gustaría conversar contigo sobre publicidad, patrocinios o una posible alianza comercial.",
    whatsappLabel: "Contactar por WhatsApp",
    phoneLabel: "Llamar a Nelson",
    showPhone: true,               /* número visible en el contacto profesional */
    email: "eRadioGlobal@gmail.com",
    showEmail: true,
    emailLabel: "Enviar correo",
    website: "",                   /* eradioglobal.com está en desarrollo: se enlaza en su tarjeta, no como sitio web del perfil */
    inventoryUrl: "",
    bookingUrl: "",
    instagram: "",
    tiktok: "https://www.tiktok.com/@podcastdelmigrante",   /* @podcastdelmigrante */
    facebook: "",
    linkedin: "",
    /* Video comercial entregado por Nelson Vahos (17-11-2026): presenta el
       Perfil Empresarial Premium. Portada local (js/video-cover.js); YouTube
       solo se carga al pulsar reproducir. */
    youtubeVideoId: "ZlUEYjQpEpE",
    videoTitle: "Conoce el Perfil Empresarial Premium de El Podcast del Migrante",
    videoText: "Descubre las ventajas de tener tu propia miniweb empresarial Premium por $24.99 CAD al mes más impuestos aplicables.",
    videoLinkLabel: "Ver en YouTube",
    videoPlacement: "after-cta",   /* justo después de «Patrocinios, publicidad y alianzas comerciales», antes de «Sobre Nelson» */
    /* Oferta del Perfil Empresarial Premium bajo el video (solo informativa: sin pagos en línea).
       Beneficios según la página oficial de planes; precio igual al de registra-tu-empresa. */
    premiumOffer: {
      title: "Lo que incluye el Perfil Empresarial Premium",
      intro: "Tu negocio, con su propia miniweb en El Podcast del Migrante, lista para compartir con tus clientes:",
      benefits: [
        "Miniweb personalizada para tu negocio",
        "Fotografías de tu negocio, según la plantilla",
        "Tu video de presentación, si nos lo proporcionas",
        "Botón directo a WhatsApp, además de llamada y correo",
        "Enlaces a tus redes sociales oficiales",
        "Dos códigos QR: tu miniweb y tu contacto",
        "Tarjeta digital vCard para guardar tu contacto",
        "Estadísticas de las visitas y los clics de tu perfil",
      ],
      price: "$24.99 CAD al mes",
      priceDetail: "+ impuestos aplicables",
      ctaLabel: "Quiero mi Perfil Empresarial Premium",
      whatsappMessage: "Hola, vi el Perfil Empresarial Premium de El Podcast del Migrante y quiero información para registrar mi negocio por $24.99 CAD mensuales.",
      note: "El servicio facilita tu presencia digital, pero no garantiza clientes, visitas ni posicionamiento en buscadores.",
    },

    profileImage: "assets/directorio/perfiles/nelson-vahos.jpg",    /* fotografía original aprobada, solo redimensionada */
    profileImageWidth: 960,
    profileImageHeight: 1280,
    ogImage: "assets/directorio/perfiles/nelson-vahos-og.jpg",      /* recorte 1200 × 630 para redes */
    coverImage: "",
    gallery: [],
    hours: [],

    connect: {
      profileQr: true,
      profileQrCaption: "Escanea y conoce mi perfil",
      contactCard: {
        givenName: "Nelson",
        familyName: "Vahos",
        note: "Fundador y Director de El Podcast del Migrante. Conectando latinos, construyendo futuro.",
        url: "https://podcastdelmigrante.com/perfil-nelson-vahos",
        socialProfiles: [
          { type: "whatsapp", url: "https://wa.me/14024272741" },
          { type: "tiktok", url: "https://www.tiktok.com/@podcastdelmigrante" },
        ],
      },
    },

    seo: {
      title: "Nelson Vahos | Fundador de eRadio Global Corp. y El Podcast del Migrante",
      description: "Nelson Vahos, fundador de eRadio Global Corp. y El Podcast del Migrante. Patrocinios, publicidad y alianzas para llegar a la comunidad latina en Canadá.",
    },
  },
];
