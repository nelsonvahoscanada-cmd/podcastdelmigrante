/*
  ediciones.js — Ediciones mensuales de EL PODCAST DEL MIGRANTE MAGAZINE
  ======================================================================
  Fuente única de las ediciones (revista mensual de contenido
  seleccionado). Las noticias diarias NO dependen de este archivo: siguen
  saliendo de ARTICLES (js/articles.js) con su orden y sus URL.

  Una edición NO copia artículos: los referencia por su identificador
  estable (`ART-AAAA-NNN`), por el slug de una historia o por el id de un
  video. El texto sigue viviendo en su archivo de origen.

  Páginas que genera scripts/build-ediciones.mjs:
    /magazine/ediciones/   hemeroteca (solo ediciones publicadas)
    /magazine/AAAA-MM/     cada edición publicada (ruta permanente)
    /magazine/             la edición vigente (la última publicada), con
                           canonical a su ruta permanente

  ESTADOS
    "borrador"   nunca se genera ninguna página pública, no aparece en la
                 hemeroteca ni en el sitemap. Para revisarla:
                 node scripts/build-ediciones.mjs --borradores=/tmp/vista
                 (escribe una vista previa FUERA del sitio).
    "publicada"  solo con autorización expresa de la dirección editorial.
                 Antes de publicar se «congela»:
                 node scripts/build-ediciones.mjs --congelar=AAAA-MM
                 que guarda en `instantanea` el titular, la bajada, la
                 imagen, la fecha y la URL de cada pieza TAL COMO ESTÁN ESE
                 DÍA, y en `huella` un SHA-256 de toda la edición. La página
                 se arma solo con esos datos: si mañana cambia un artículo,
                 la edición publicada no cambia. Si alguien modifica una
                 edición publicada por error, la huella deja de coincidir y
                 las pruebas fallan. Una corrección intencional se hace con
                 --congelar=AAAA-MM --correccion="motivo", que queda
                 registrada en `correcciones` y se muestra en la página.
                 Una edición publicada no se puede retirar por accidente:
                 si su página existe y la edición desaparece o vuelve a
                 borrador, la verificación falla.

  CAMPOS
  numero        Number  — 1, 2, 3… (único y consecutivo).
  slug          String  — "AAAA-MM" del período (ruta /magazine/AAAA-MM/).
  periodo       Object  — { anio, mes } PERÍODO EDITORIAL que cubre la
                          edición (p. ej., octubre de 2026). No es la fecha
                          de publicación.
  estado        String  — "borrador" | "publicada".
  publicadaEn   String | null — FECHA REAL DE PUBLICACIÓN, ISO 8601 con
                          zona (p. ej., "2026-11-03T09:00:00-07:00"). null
                          mientras sea borrador.
  titulo        String  — titular de la edición.
  bajada        String  — una o dos frases.
  portada       Object  — { imagen: "/assets/ediciones/AAAA-MM/portada.jpg",
                          alt, ancho, alto } imagen original de la portada.
  editorial     Object  — { titulo, autor, html } texto del editorial
                          (HTML simple: <p>, <strong>, <em>, <a>).
  secciones     Array   — [{ titulo, piezas: [...] }] en el orden del índice.
                          Cada pieza es una referencia:
                            { tipo: "articulo", id: "ART-2026-029" }
                            { tipo: "historia", slug: "historia-…" }
                            { tipo: "video", videoId: "…" }
  instantanea   Object | null — la escribe --congelar. No editar a mano.
  huella        String | null — la escribe --congelar. No editar a mano.
  correcciones  Array   — [OPCIONAL] [{ fecha, nota }] las agrega
                          --correccion; se muestran en la edición.

  REGLA: la selección, la portada y el editorial de cada edición los
  define y aprueba la dirección editorial. Ninguna edición se publica sin
  su autorización.
========================================================================= */

const EDICIONES = [];
