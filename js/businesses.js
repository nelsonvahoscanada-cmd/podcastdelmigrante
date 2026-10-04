/*
  businesses.js — "Quién puede ayudarte" (directorio de perfiles empresariales)
  ======================================================================
  UNA plantilla (business-profile.html + js/business-profile.js) y UN
  directorio (quien-puede-ayudarte.html + js/business-directory.js)
  leen este archivo. Agregar el siguiente negocio/profesional es agregar
  un objeto a BUSINESSES — no se crea ningún HTML nuevo (ver el final de
  este comentario).

  REGLA DE ORO (la misma del resto del sitio): un campo vacío ("" / []/
  null) NO se muestra, y su botón o sección tampoco. Nunca se rellenan
  datos que el profesional no haya confirmado: sin teléfono no hay botón
  de llamar, sin video no hay sección de video, sin servicios activos no
  hay sección de servicios.

  SEGURIDAD: este archivo es PÚBLICO. Aquí solo van datos profesionales
  autorizados para publicarse. Nunca claves, tokens, credenciales ni
  datos privados de clientes.

  CAMPOS
    id, slug            identificadores (slug = business-profile.html?slug=...)
    published           true = aparece en el directorio y su perfil abre
    featured            true = se ordena primero en el directorio
    foundingProfile     marca interna de perfil piloto/fundador (no se
                        muestra públicamente)
    name, shortName     nombre completo / nombre corto para frases
                        ("Conoce a Tomás")
    professionalTitle, company
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
    profileImage        foto del PERFIL (vertical 4:5)
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

  CÓMO AGREGAR EL SIGUIENTE NEGOCIO (ej. Carlos D. Castillo)
    1. Copiar el objeto de Tomás al final de BUSINESSES.
    2. Cambiar id, slug, nombre, categoría (usar un id existente de
       BUSINESS_CATEGORIES), ciudad/provincia y contactos reales.
    3. Dejar vacío ("" o []) todo lo no confirmado.
    Listo: aparece solo en el directorio y su perfil abre en
    business-profile.html?slug=su-slug.
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
];

const BUSINESSES = [
  {
    id: "BIZ-001",
    slug: "tomas-velazquez",
    published: true,
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

    phone: "",                /* PENDIENTE — vacío = botón "Llamar" oculto */
    whatsapp: "",             /* PENDIENTE — vacío = botón "WhatsApp" oculto */
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

    seo: {
      title: "Tomás Velázquez | Vehículos en Calgary | El Podcast del Migrante",
      description: "Conoce el perfil profesional de Tomás Velázquez en Calgary, sus datos de contacto, ubicación y recursos para quienes buscan vehículo.",
    },
  },
  {
    id: "BIZ-002",
    slug: "carlos-d-castillo",
    published: true,
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

    youtubeVideoId: "",
    videoText: "",

    heroLayout: "wide",                                   /* imagen 5:4 con skyline de Calgary, sin recortar */
    profileImage: "assets/carlos-d-castillo.jpg",
    cardImage: "assets/carlos-d-castillo-card.jpg",       /* directorio: rostro y hombros */
    ogImage: "assets/carlos-d-castillo-og.jpg",
    coverImage: "",
    gallery: [],
    hours: [],

    disclaimer: "La experiencia, la afiliación y las provincias de servicio indicadas en este perfil fueron suministradas por el profesional. La información es general y no constituye asesoría financiera, tributaria ni legal; ninguna estrategia garantiza rendimiento, ahorro fiscal, aprobación ni un resultado financiero determinado.",

    seo: {
      title: "Carlos D. Castillo | Seguros de vida y salud en Calgary | El Podcast del Migrante",
      description: "Perfil empresarial de Carlos D. Castillo en Calgary: seguros de vida y salud, protección familiar y estrategias de ahorro y patrimonio. Atención en español e inglés con cita previa.",
    },
  },
];
