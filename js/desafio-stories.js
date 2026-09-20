/*
  desafio-stories.js — Desafío 100 Empresas (historias reales)
  ======================================================================
  Reemplaza las tarjetas demo del módulo Desafío 100 Empresas en el
  HOME. Cada historia es un objeto independiente del sistema de
  noticias/artículos (js/articles.js) y de las columnas (js/columns.js)
  — Carlos D. Castillo puede aparecer aquí como empresario entrevistado
  y, por separado, como colaborador/columnista; son dos roles y dos
  piezas de contenido distintas por diseño.

  Cada historia:
  - slug            usado en historia.html?slug=...
  - empresario       nombre del protagonista
  - empresa          [OPCIONAL] nombre del negocio, si aplica
  - area             [OPCIONAL] área/categoría del negocio o la charla
  - cardTitle         titular mostrado en la tarjeta del HOME
  - cardDescription   descripción corta para la tarjeta
  - pageTitle         título completo de la página interna
  - bodyHtml          historia editorial completa
  - guest             [OPCIONAL] datos del invitado para el recuadro
                      "Invitado" (name, company, area)
  - image             { alt }. La miniatura en sí NUNCA se guarda como
                      archivo propio — se deriva siempre de `videoId`
                      (miniatura oficial de YouTube,
                      https://img.youtube.com/vi/<id>/hqdefault.jpg),
                      así cada tarjeta muestra exclusivamente el video
                      que le corresponde y nunca queda cruzada ni
                      reutilizada entre empresarios.
  - videoId           ID de YouTube
  - videoStart         [OPCIONAL] segundo de inicio (del parámetro &t=)
  - disclaimer         [OPCIONAL] aviso editorial específico de esta
                      historia. Si no existe, no se muestra ningún aviso.
  - sponsor            [OPCIONAL] { role, note } — reconocimiento de
                      patrocinio, SIEMPRE en un bloque visualmente
                      diferenciado del cuerpo editorial, nunca mezclado
                      con la narrativa de la historia.
  - seo.canonicalPath  ruta limpia prevista (mismo criterio que en
                      articles.js: hoy la página funciona vía
                      historia.html?slug=..., esta es la ruta futura).
========================================================================= */

const DESAFIO_STORIES = [
  {
    slug: "desafio-carlos-castillo-proteccion-familiar",
    empresario: "Carlos D. Castillo",
    empresa: "Roca Financial Group",
    area: "Protección financiera y seguros de vida",
    cardTitle: "¿Qué pasaría con tu familia si mañana faltaras?",
    cardDescription: "Carlos D. Castillo conversa sobre planificación financiera, seguros de vida y la importancia de proteger a quienes dependen de nosotros.",
    pageTitle: "¿Qué pasaría con tu familia si mañana faltaras? | Carlos D. Castillo",
    bodyHtml: `
      <p>En este episodio del Desafío 100 Empresas en Calgary, conversamos con Carlos D. Castillo, representante de Roca Financial Group, sobre la importancia de planificar el futuro y conocer las herramientas disponibles para proteger financieramente a nuestras familias en Canadá.</p>
      <p>Carlos explica por qué el seguro de vida no debería verse solamente como un gasto, sino como una decisión de responsabilidad y prevención. También habla de cómo, según las necesidades, la edad, la situación familiar y el tipo de cobertura, pueden existir alternativas que se ajusten a diferentes presupuestos.</p>
      <p>Esta conversación busca crear conciencia sobre una realidad que muchas familias evitan discutir: migrar, trabajar y construir patrimonio es importante, pero también lo es tener un plan para proteger a quienes dependen de nosotros.</p>
    `,
    guest: { name: "Carlos D. Castillo", company: "Roca Financial Group", area: "Protección financiera y seguros de vida" },
    image: { alt: "Miniatura del video de Carlos D. Castillo en Desafío 100 Empresas." },
    videoId: "xJaXI3r83sA",
    videoStart: 19,
    disclaimer: "Este episodio tiene fines informativos y educativos. Las necesidades y condiciones de cada persona son diferentes. Antes de adquirir un producto financiero o de seguros, es importante recibir asesoría individual y revisar cuidadosamente la cobertura, los costos, las exclusiones y las condiciones aplicables.",
    sponsor: null,
    seo: { canonicalPath: "/desafio-100-empresas/desafio-carlos-castillo-proteccion-familiar/" },
  },
  {
    slug: "desafio-gina-salinas-sterna-global-immigration",
    empresario: "Gina Marcela Salinas Gutierrez",
    empresa: "Sterna Global Immigration Inc.",
    area: "Senior Consultant - CEO",
    cardTitle: "La consultora de inmigración que abrió sus puertas a los nuevos inmigrantes",
    cardDescription: "De abogada en Colombia a reconstruir su carrera profesional en Canadá. Una historia de servicio, resiliencia y compromiso con la comunidad inmigrante.",
    pageTitle: "La consultora de inmigración que abrió sus puertas a los nuevos inmigrantes",
    bodyHtml: `
      <p>Fue una abogada exitosa en Colombia. Al llegar a Canadá tuvo que comenzar una nueva etapa, adaptarse a otro sistema y reconstruir su camino profesional. Hoy es consultora de inmigración regulada y está muy cerca de graduarse nuevamente como abogada.</p>
      <p>Pero lo que realmente distingue su historia es su enorme vocación de ayuda.</p>
      <p>A pesar de haber vivido experiencias difíciles y de que algunas personas no siempre respondieron de la mejor manera a su generosidad, ella continúa apoyando a nuevos inmigrantes, orientando familias y acompañando casos humanitarios de personas que llegaron a Canadá buscando seguridad, estabilidad y una nueva oportunidad.</p>
      <p>Su trabajo no se limita a completar procesos.</p>
      <p>También escucha, orienta y acompaña a quienes muchas veces llegan sin conocer el sistema, sin dominar el idioma y sin saber a quién acudir.</p>
      <h2>En esta entrevista hablamos sobre:</h2>
      <ul>
        <li>Su trayectoria como abogada en Colombia.</li>
        <li>El reto de volver a construir una carrera profesional en Canadá.</li>
        <li>Su preparación como consultora de inmigración regulada.</li>
        <li>El camino para graduarse nuevamente como abogada.</li>
        <li>La importancia de acompañar con empatía a los nuevos inmigrantes.</li>
        <li>Los casos humanitarios que ha apoyado dentro de la comunidad latina.</li>
        <li>Cómo continuar ayudando incluso después de haber vivido decepciones.</li>
        <li>La responsabilidad de orientar a familias en momentos de incertidumbre.</li>
        <li>La diferencia entre prestar un servicio y realmente comprometerse con una comunidad.</li>
        <li>El valor de creer en proyectos que buscan generar impacto colectivo.</li>
      </ul>
      <p>Este episodio es un reconocimiento a quienes utilizan su conocimiento, sus espacios y sus recursos para ayudar a construir una comunidad inmigrante más informada, unida y fuerte.</p>
    `,
    guest: { name: "Gina Marcela Salinas Gutierrez", company: "Sterna Global Immigration Inc.", area: "Senior Consultant - CEO" },
    image: { alt: "Miniatura del video de Gina Marcela Salinas Gutierrez en Desafío 100 Empresas." },
    videoId: "bDhX_XW2bE0",
    videoStart: 636,
    disclaimer: "Este contenido tiene fines informativos y educativos y no constituye asesoría migratoria individual. Cada situación migratoria es diferente y las normas, requisitos y programas pueden cambiar. Para tu caso particular, consulta con un consultor de inmigración regulado o un profesional autorizado.",
    sponsor: {
      role: "Patrocinadora oficial de Desafío 100 Empresas",
      note: "Sterna Global Immigration Inc. apoya el proyecto y facilita la locación profesional utilizada para las grabaciones, para que cada empresario inscrito pueda grabar su episodio, compartir su historia y mostrar su empresa sin ningún costo. Su respaldo demuestra que una empresa también puede crecer mientras abre puertas para que otros avancen.",
    },
    seo: { canonicalPath: "/desafio-100-empresas/desafio-gina-salinas-sterna-global-immigration/" },
  },
  {
    slug: "desafio-fabiola-rueda-arepas",
    empresario: "Fabiola Rueda",
    empresa: null,
    area: null,
    cardTitle: "Arepas rellenas de queso hechas con amor latino",
    cardDescription: "Tradición, gastronomía y emprendimiento se encuentran en la historia de Fabiola Rueda, quien convierte sabores latinos en oportunidades para familias emprendedoras.",
    pageTitle: "Fabiola Rueda: Arepas rellenas de queso hechas con amor latino",
    bodyHtml: `
      <p>Su propuesta combina sabor, tradición y comunidad.</p>
      <p>Cada producto representa el trabajo de personas que han encontrado en la gastronomía una manera de salir adelante, compartir sus raíces y acercar a otras familias a los sabores que hacen parte de nuestra identidad.</p>
      <p>Fabiola no solamente vende arepas.</p>
      <p>También ayuda a promover productos hechos por manos latinas, generando oportunidades y fortaleciendo una red de familias emprendedoras que trabajan con dedicación y mucho amor.</p>
      <h2>En esta conversación hablamos sobre:</h2>
      <ul>
        <li>Cómo convertir una receta tradicional en una oportunidad de negocio.</li>
        <li>La elaboración y distribución de arepas rellenas de queso.</li>
        <li>La importancia de mantener vivos los sabores latinos en Canadá.</li>
        <li>El trabajo conjunto con otras familias emprendedoras.</li>
        <li>Los retos de producir, distribuir y dar a conocer alimentos.</li>
        <li>Cómo la gastronomía puede unir culturas y comunidades.</li>
        <li>La importancia de apoyar los productos hechos por latinos.</li>
        <li>El valor de emprender con propósito, identidad y amor por lo que se hace.</li>
      </ul>
      <p>La historia de Fabiola demuestra que detrás de cada alimento hay mucho más que una receta.</p>
      <p>Hay familias, esfuerzo, recuerdos, sueños y personas que decidieron transformar sus habilidades en una fuente de ingresos y crecimiento.</p>
      <p>Este episodio es una invitación a valorar el trabajo de quienes llevan nuestros sabores a nuevos lugares y a recordar que, cuando compramos productos latinos, también estamos apoyando a familias y emprendimientos de nuestra comunidad.</p>
    `,
    guest: { name: "Fabiola Rueda", company: null, area: null },
    image: { alt: "Miniatura del video de Fabiola Rueda en Desafío 100 Empresas." },
    videoId: "UloNyWGYEXo",
    videoStart: 59,
    disclaimer: null,
    sponsor: null,
    seo: { canonicalPath: "/desafio-100-empresas/desafio-fabiola-rueda-arepas/" },
  },
];

/* Bloque reutilizable "Sobre el proyecto", compartido por las tres
   páginas de historia. El CTA de participación queda preparado
   estructuralmente pero SIN enlace — todavía no existe una URL real
   y aprobada de registro. */
const DESAFIO_PROJECT_INFO = {
  title: "Sobre el proyecto",
  bodyHtml: `
    <p>Desafío 100 Empresas es una iniciativa original creada por Nelson Vahos, CEO de eRadio Global Corp., para documentar las historias, enseñanzas y aportes de 100 empresarios latinos en Calgary.</p>
    <p>Durante 90 días conoceremos sus experiencias, obstáculos, sacrificios y aprendizajes.</p>
    <p>Las 100 historias también quedarán plasmadas en el libro <em>"100 Historias, 100 Lecciones, Un Legado"</em>.</p>
    <p>Porque detrás de cada empresa existe una historia que puede orientar, inspirar y transformar la vida de otras personas.</p>
  `,
  participateTitle: "¿Tienes una empresa o emprendimiento en Calgary?",
  participateCta: "Participa",
  participateStatus: "Formulario de registro — disponible próximamente",
};
