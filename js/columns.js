/*
  columns.js — Arquitectura de columnas editoriales
  ======================================================================
  Una "columna" es una serie firmada y recurrente (a diferencia de un
  artículo suelto). Vive completamente separada del sistema de
  noticias/artículos (js/articles.js) y del HOME: una columna NUNCA
  aparece en el hero ni en "Últimas noticias" — su lugar propio es su
  propia página (columna.html) y, más adelante, un enlace editorial
  donde el cliente decida (todavía no en el menú principal, a la
  espera de aprobación visual).

  Cada columna tiene:
  - id/slug          identificador estable, usado en
                      columna.html?slug=...
  - title             nombre de la columna (ej. "Tu dinero en Canadá")
  - category          categoría editorial de la columna
  - authorId          referencia al `id` en CONTRIBUTORS (js/data.js)
  - authorName         nombre a mostrar (evita depender de un solo lugar)
  - description        bajada editorial de la columna completa
  - entries[]           programación de entregas, en orden cronológico:
      - monthLabel      mes/año de esa entrega (ej. "Septiembre 2026")
      - title           título de esa entrega
      - slug            [OPCIONAL] si existe, la entrega está publicada
                        y enlaza a articulo.html?slug=...
      - published       true solo cuando el artículo real ya existe en
                        js/articles.js

  REGLA DE ORO: una entrega con `published: false` NUNCA es clicable,
  nunca tiene slug, y nunca se muestra como si ya existiera contenido.
  Es programación editorial, no una página vacía ni un enlace falso.
  Agregar una entrega real en el futuro es: (1) crear su artículo en
  js/articles.js, (2) poner su slug aquí y cambiar published a true.
  No requiere tocar columna.html ni js/column.js.
========================================================================= */

const COLUMNS = [
  {
    id: "tu-dinero-en-canada",
    slug: "tu-dinero-en-canada",
    title: "Tu dinero en Canadá",
    category: "Finanzas",
    authorId: "carlos-castillo",
    authorName: "Carlos D. Castillo",
    description: "Una columna de educación financiera para ayudar a la comunidad inmigrante a comprender mejor el sistema financiero canadiense y tomar decisiones más informadas sobre organización, ahorro, crédito, protección, inversión y retiro.",
    entries: [
      { monthLabel: "Septiembre 2026", title: "El error financiero que muchos inmigrantes descubren demasiado tarde", slug: "el-error-financiero-inmigrantes-canada", published: true },
      { monthLabel: "Octubre 2026", title: "Llegaste a Canadá. ¿Tu dinero también?", published: false },
      { monthLabel: "Noviembre 2026", title: "Trabajas, pagas y ahorras… ¿pero realmente estás avanzando?", published: false },
      { monthLabel: "Diciembre 2026", title: "Una emergencia puede borrar años de esfuerzo", published: false },
      { monthLabel: "Enero 2027", title: "Tu TFSA puede estar abierto y seguir dormido", published: false },
      { monthLabel: "Febrero 2027", title: "El RRSP no es dinero gratis", published: false },
      { monthLabel: "Marzo 2027", title: "La casa propia comienza antes de buscar casa", published: false },
      { monthLabel: "Abril 2027", title: "Tu devolución de impuestos no es un premio", published: false },
      { monthLabel: "Mayo 2027", title: "Ahorrar no basta: tu dinero también tiene que trabajar", published: false },
      { monthLabel: "Junio 2027", title: "La inversión de moda puede ser la peor para ti", published: false },
      { monthLabel: "Julio 2027", title: "La universidad de tus hijos no se paga sola", published: false },
      { monthLabel: "Agosto 2027", title: "Canadá no pagará el retiro que imaginas", published: false },
      { monthLabel: "Septiembre 2027", title: "Tener muchas cuentas no significa tener un plan", published: false },
    ],
  },
];
