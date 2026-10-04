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
    category            id de categoría (ver BUSINESS_CATEGORIES)
    city, province, country, address, postalCode
    languages           ["es", "en", "fr"] — SOLO idiomas confirmados;
                        vacío = no se muestra nada de idiomas
    shortDescription    texto breve (tarjeta del directorio)
    longDescription     texto largo opcional del perfil
    callToAction        { title, text } bloque principal del perfil
    services            [{ id, label, description?, active }] — solo se
                        muestran los activos; activar = poner active: true
    phone, whatsapp     texto/número reales; vacío = botón oculto
                        (whatsapp: solo dígitos con código de país, ej.
                        "14035551234"; phone: formato libre, ej.
                        "+1 403 555 1234")
    email, website, inventoryUrl, inventoryLabel, bookingUrl
    mapUrl              enlace de Google Maps; si está vacío se genera
                        desde la dirección
    instagram, facebook, linkedin     URLs completas oficiales
    youtubeVideoId      ID del video (YouTube no listado). Vacío = sin
                        sección de video
    videoText           texto bajo "Conoce a ..."
    profileImage        foto del PERFIL (vertical 4:5)
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
  /* Estructura futura: se habilitan automáticamente en cuanto exista al
     menos un negocio publicado en la categoría. Hoy NO tienen negocios. */
  { id: "seguros-finanzas", label: "Seguros y finanzas" },
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

    instagram: "",
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
];
