/*
  life-stories.js — Historias de vida
  ======================================================================
  Historias de vida de migrantes, producidas por El Podcast del
  Migrante. Completamente independientes de:
  - js/articles.js (noticias/artículos)
  - js/desafio-stories.js (Desafío 100 Empresas — entrevistas a
    empresarios, con módulo de patrocinio y disclaimer)

  Esta colección no lleva patrocinio ni disclaimer porque no
  corresponde a este tipo de contenido — no se debe inventar ninguno.

  Cada historia:
  - slug              usado en historia-vida.html?slug=...
  - protagonista       nombre de la persona
  - akaName            [OPCIONAL] nombre con el que también se le conoce
  - title              título editorial completo
  - cardDescription    descripción breve para la tarjeta del HOME,
                       derivada únicamente de la información autorizada
                       (nunca se inventan detalles biográficos)
  - bodyHtml           relato — solo el texto base autorizado,
                       con ajustes mínimos de puntuación cuando se
                       indique explícitamente
  - videoId            ID de YouTube
  - videoStart          segundo de inicio (del parámetro &t=)
  - seo.canonicalPath   ruta limpia prevista (mismo criterio que en
                       articles.js / desafio-stories.js)
========================================================================= */

const LIFE_STORIES_COLLECTION = "Historias de vida";

const LIFE_STORIES = [
  {
    slug: "historia-andrea-diaz-primer-trabajo-canada",
    protagonista: "Andrea Díaz",
    title: "Mi primer trabajo en Canadá: era para una oficina en un ancianato… ¡y acabé trabajando en la cocina!",
    cardDescription: "Andrea Díaz cuenta la historia de su primer trabajo en Canadá — y el contraste entre lo que esperaba y lo que finalmente vivió.",
    bodyHtml: `
      <p>Esta es la historia de Andrea Díaz sobre su primer trabajo en Canadá: un puesto que comenzó como un rol de oficina en un ancianato y terminó siendo, en la práctica, un trabajo en la cocina.</p>
      <p>Andrea comparte esa experiencia en video — el contraste entre lo que esperaba al llegar y lo que finalmente vivió en su primer empleo.</p>
    `,
    videoId: "oqfNbzC_OLA",
    videoStart: 47,
    seo: { canonicalPath: "/historias-de-vida/historia-andrea-diaz-primer-trabajo-canada/" },
  },
  {
    slug: "historia-diana-pineda-radio-canada",
    protagonista: "Diana Pineda",
    akaName: "La Pinedita",
    title: "De una cabina de radio en FM a una nueva vida en Canadá",
    cardDescription: "Diana Pineda, conocida en la radio colombiana como \"La Pinedita\", nos relata cómo fue ese cambio de vida.",
    bodyHtml: `
      <p>Diana Pineda, más conocida en las emisoras de radio en Colombia como "La Pinedita", nos relata cómo fue ese cambio de vida.</p>
      <p>Después de pertenecer al mundo de las comunicaciones, donde manejaba todo a la perfección, le toca migrar a un país como Canadá, enfrentándose a la inclemencia del clima y al aprendizaje del idioma inglés.</p>
      <p>Aquí está su historia.</p>
    `,
    videoId: "6YdTsBzG2gs",
    videoStart: 15,
    seo: { canonicalPath: "/historias-de-vida/historia-diana-pineda-radio-canada/" },
  },
  {
    slug: "historia-teresa-jimenez-comercio-canada",
    protagonista: "Teresa Jiménez",
    title: "De vender en la calle a triunfar en Canadá: mi pasión por el comercio ambulante",
    cardDescription: "Teresa Jiménez comparte su recorrido desde sus comienzos vendiendo en la calle hasta desarrollar su camino como empresaria en Canadá.",
    bodyHtml: `
      <p>Teresa Jiménez comparte su recorrido desde sus comienzos vendiendo en la calle hasta desarrollar su camino como empresaria en Canadá.</p>
      <p>Su historia habla de comercio, trabajo, adaptación, desafíos y aprendizajes durante el proceso de construir una nueva vida en otro país.</p>
      <p>Esta historia busca mostrar cómo una experiencia que comenzó desde el comercio ambulante terminó convirtiéndose en parte de su camino de emprendimiento en Canadá.</p>
    `,
    videoId: "UsWWtkmnszw",
    videoStart: 2,
    seo: { canonicalPath: "/historias-de-vida/historia-teresa-jimenez-comercio-canada/" },
  },
];
