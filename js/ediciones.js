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
                          alt, ancho, alto } imagen original de la portada
                          (vertical). [OPCIONAL] social: { imagen, alt, ancho,
                          alto } versión horizontal (1200 × 630) para
                          compartir en redes; sin ella se usa la portada.
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

const EDICIONES = [
  {
    "numero": 1,
    "slug": "2026-10",
    "periodo": {
      "anio": 2026,
      "mes": 10
    },
    "estado": "publicada",
    "publicadaEn": "2026-11-02T17:23:00-06:00",
    "titulo": "Nace una nueva voz para los migrantes en Canadá",
    "bajada": "Edición inaugural: una selección retrospectiva de lo que publicamos en octubre de 2026, con historias, entrevistas y la información que cambió la vida de los migrantes en Canadá.",
    "portada": {
      "imagen": "/assets/ediciones/2026-10/portada.jpg",
      "alt": "Portada de la Edición 01 de El Podcast del Migrante Magazine, octubre de 2026: «Nace una nueva voz para los migrantes en Canadá», con el logotipo y cinco titulares de la edición.",
      "ancho": 1200,
      "alto": 1600,
      "social": {
        "imagen": "/assets/ediciones/2026-10/portada-social.jpg",
        "alt": "Edición 01 de El Podcast del Migrante Magazine, octubre de 2026: «Nace una nueva voz para los migrantes en Canadá».",
        "ancho": 1200,
        "alto": 630
      }
    },
    "editorial": {
      "titulo": "Nace una nueva voz para los migrantes en Canadá",
      "autor": "Nelson Vahos, director",
      "html": "<p>Octubre de 2026 marca el comienzo de El Podcast del Migrante Magazine. Nacimos de una convicción sencilla: quienes llegamos a Canadá merecemos información clara, en nuestro idioma, y también historias que nos recuerden que no estamos solos.</p><p>Esta primera edición reúne lo que fuimos durante este mes. Abre con mi columna, «El frío no pudo apagar mi señal», un relato sobre empezar de cero que explica por qué existe este proyecto. Le siguen las historias de Héctor Rivero, Diana Cardona y el Dr. Eddy Valverde Narvaez, y el reconocimiento de Alberta a inmigrantes que transforman sus comunidades.</p><p>También explicamos lo que cambió para quienes planean su futuro aquí: los nuevos puntos de Express Entry, las multas contra representantes que actúan sin autorización y el debate sobre los niveles de inmigración. Cerramos con Alberta: el resultado del referéndum, tus derechos con la luz y el gas en invierno, y una convocatoria de empleo para 2027.</p><p>Esta edición es una selección retrospectiva: reúne piezas que publicamos a lo largo de octubre y que siguen disponibles en sus enlaces originales, con sus fechas de entonces. No reescribimos su contenido; la presentamos tal como la cerramos, para que quede en nuestra hemeroteca.</p><p>Gracias por leernos. Esto apenas empieza.</p>"
    },
    "secciones": [
      {
        "titulo": "La voz que nace",
        "piezas": [
          {
            "tipo": "articulo",
            "id": "ART-2026-016"
          }
        ]
      },
      {
        "titulo": "Historias que inspiran",
        "piezas": [
          {
            "tipo": "articulo",
            "id": "ART-2026-029"
          },
          {
            "tipo": "articulo",
            "id": "ART-2026-024"
          },
          {
            "tipo": "articulo",
            "id": "ART-2026-017"
          },
          {
            "tipo": "articulo",
            "id": "ART-2026-021"
          }
        ]
      },
      {
        "titulo": "Migración: lo que cambió",
        "piezas": [
          {
            "tipo": "articulo",
            "id": "ART-2026-027"
          },
          {
            "tipo": "articulo",
            "id": "ART-2026-031"
          },
          {
            "tipo": "articulo",
            "id": "ART-2026-015"
          }
        ]
      },
      {
        "titulo": "Vivir en Alberta",
        "piezas": [
          {
            "tipo": "articulo",
            "id": "ART-2026-028"
          },
          {
            "tipo": "articulo",
            "id": "ART-2026-025"
          },
          {
            "tipo": "articulo",
            "id": "ART-2026-030"
          }
        ]
      }
    ],
    "instantanea": {
      "congeladaEn": "2026-11-02T23:23:34.010Z",
      "piezas": {
        "articulo:ART-2026-016": {
          "tipo": "articulo",
          "titulo": "El frío no pudo apagar mi señal",
          "bajada": "De la radio en Colombia a comenzar desde cero en Canadá: una historia de refugio, humildad y reconstrucción",
          "categoria": "Comunidad",
          "fecha": "2026-10-04T08:00:00-06:00",
          "url": "/articulo-el-frio-no-pudo-apagar-mi-senal",
          "imagen": "/assets/social/el-frio-no-pudo-apagar-mi-senal.jpg"
        },
        "articulo:ART-2026-029": {
          "tipo": "articulo",
          "titulo": "Héctor Rivero, el Santa Latino que convirtió su historia migratoria en esperanza para las familias de Canadá",
          "bajada": "De Venezuela a Niagara Falls, pasando por Panamá y Estados Unidos, Héctor Rivero transformó una tradición familiar en un proyecto que lleva alegría a niños, inmigrantes y comunidades latinas. Ahora comparte su historia en El Podcast del Migrante.",
          "categoria": "Comunidad",
          "fecha": "2026-10-24T23:03:00-06:00",
          "url": "/articulo-hector-rivero-santa-latino-canada",
          "imagen": "/assets/social/hector-rivero-santa-latino-canada.jpg"
        },
        "articulo:ART-2026-024": {
          "tipo": "articulo",
          "titulo": "De limpiar casas en Canadá a facturar más de US$9.000 al mes: las estrategias digitales de Diana Cardona",
          "bajada": "En El Podcast del Migrante, la emprendedora colombiana compartió cómo transformó su experiencia migratoria en diferentes fuentes de ingresos, desde la reventa de productos hasta el marketing de afiliados y la creación de contenido para marcas.",
          "categoria": "Finanzas",
          "fecha": "2026-10-15T08:00:00-06:00",
          "url": "/articulo-diana-cardona-emprendimiento-digital-canada",
          "imagen": "/assets/social/diana-cardona-emprendimiento-digital-canada.jpg"
        },
        "articulo:ART-2026-017": {
          "tipo": "articulo",
          "titulo": "El Dr. Eddy Valverde Narvaez, médico de familia latino, llega a Brooks: lo que debes saber si aún buscas doctor en Alberta",
          "bajada": "El Podcast del Migrante conversó con el Dr. Eddy Valverde Narvaez sobre su historia, el sistema de salud en Canadá y la atención a pacientes. Si todavía no tienes médico de familia, te explicamos cómo buscar uno con las herramientas oficiales de Alberta.",
          "categoria": "Salud",
          "fecha": "2026-10-12T12:00:00-06:00",
          "url": "/articulo-medico-familia-latino-brooks-alberta",
          "imagen": "/assets/social/medico-familia-latino-brooks-alberta.jpg"
        },
        "articulo:ART-2026-021": {
          "tipo": "articulo",
          "titulo": "Alberta reconoce a 20 inmigrantes por su impacto en la provincia",
          "bajada": "Los Alberta Immigrant Impact Awards 2026 premiaron a personas nacidas fuera de Canadá que han contribuido a sus comunidades en ocho categorías, desde el arte y el deporte hasta el emprendimiento.",
          "categoria": "Migración",
          "fecha": "2026-10-12T12:00:00-06:00",
          "url": "/articulo-premios-impacto-inmigrante-alberta-2026",
          "imagen": "/assets/social/premios-impacto-inmigrante-alberta-2026.jpg"
        },
        "articulo:ART-2026-027": {
          "tipo": "articulo",
          "titulo": "Canadá cambia Express Entry: nuevos puntos por experiencia laboral y ofertas de empleo desde noviembre",
          "bajada": "Desde el 3 de noviembre de 2026, Express Entry dará puntos adicionales a quienes tengan experiencia laboral canadiense o una oferta de empleo válida en ocupaciones de salarios altos, y ya no exigirá la LMIA para esas ofertas. Te explicamos los cambios y qué hacer antes de esa fecha.",
          "categoria": "Migración",
          "fecha": "2026-10-19T05:00:00-06:00",
          "url": "/articulo-express-entry-nuevos-puntos-noviembre-2026",
          "imagen": "/assets/social/express-entry-nuevos-puntos-noviembre-2026.jpg"
        },
        "articulo:ART-2026-031": {
          "tipo": "articulo",
          "titulo": "Canadá activa multas de hasta $1,5 millones contra representantes migratorios que incumplan la ley",
          "bajada": "El Gobierno canadiense puso en vigor nuevas sanciones contra quienes cobran por asesoría migratoria sin autorización o participan deliberadamente en prácticas engañosas. Las medidas también alcanzan a profesionales autorizados que incumplan las normas.",
          "categoria": "Inmigración",
          "fecha": "2026-10-29T10:00:00-06:00",
          "url": "/articulo-multas-representantes-migratorios-canada-2026",
          "imagen": "/assets/social/multas-representantes-migratorios-canada-2026.jpg"
        },
        "articulo:ART-2026-015": {
          "tipo": "articulo",
          "titulo": "Carney plantea cuándo Canadá podría volver a aumentar la inmigración de forma controlada",
          "bajada": "El primer ministro Mark Carney afirmó que Canadá debe comenzar a plantearse cuándo retomar un crecimiento controlado de la población. Sus declaraciones llegan antes de la presentación del próximo plan federal de niveles migratorios.",
          "categoria": "Migración",
          "fecha": "2026-10-01T08:00:00-06:00",
          "url": "/articulo-carney-aumento-controlado-inmigracion-canada",
          "imagen": "/assets/social/carney-aumento-controlado-inmigracion-canada.jpg"
        },
        "articulo:ART-2026-028": {
          "tipo": "articulo",
          "titulo": "Alberta votó por permanecer en Canadá: cerca del 75 % rechazó iniciar el proceso separatista",
          "bajada": "Los resultados oficiales del referéndum del 19 de octubre confirman una amplia ventaja para la permanencia en Canadá. Te explicamos las cifras de las diez preguntas y qué significan para los inmigrantes.",
          "categoria": "Alberta",
          "fecha": "2026-10-20T05:00:00-06:00",
          "url": "/articulo-referendum-alberta-octubre-2026-inmigrantes",
          "imagen": "/assets/social/referendum-alberta-octubre-2026-inmigrantes.jpg"
        },
        "articulo:ART-2026-025": {
          "tipo": "articulo",
          "titulo": "Alberta activa sus reglas de invierno: desde hoy no pueden cortarte por completo la luz en casa",
          "bajada": "Desde este 15 de octubre y hasta el 15 de abril, las empresas no pueden desconectar por completo la electricidad de los hogares. Desde el 1 de noviembre, la protección se extiende al gas natural. Te explicamos qué cubre, qué no y a quién pedir ayuda.",
          "categoria": "Alberta",
          "fecha": "2026-10-15T06:00:00-06:00",
          "url": "/articulo-reglas-invierno-electricidad-gas-alberta",
          "imagen": "/assets/social/reglas-invierno-electricidad-gas-alberta.jpg"
        },
        "articulo:ART-2026-030": {
          "tipo": "articulo",
          "titulo": "Alberta busca bomberos forestales para 2027 con salarios de hasta $31,02 por hora: convocatoria abierta",
          "bajada": "El Gobierno de Alberta mantiene abierta una convocatoria para contratar bomberos forestales durante la temporada de 2027. La oferta contempla salarios base de $24,52 a $31,02 CAD por hora y tiene como fecha límite de postulación el 30 de noviembre de 2026.",
          "categoria": "Empleo en Alberta",
          "fecha": "2026-10-25T08:05:00-06:00",
          "url": "/articulo-alberta-bomberos-forestales-2027",
          "imagen": "/assets/social/alberta-bomberos-forestales-2027.jpg"
        }
      }
    },
    "huella": "d434c15a58b85e15188dc3eb39d7c6294cc4a1b360769b1d778519f50b11e2a2"
  },
  {
    "numero": 2,
    "slug": "2026-11",
    "periodo": {
      "anio": 2026,
      "mes": 11
    },
    "estado": "borrador",
    "publicadaEn": null,
    "titulo": "Edición 02 · Noviembre 2026 (en preparación)",
    "bajada": "",
    "portada": null,
    "editorial": null,
    "secciones": [
      {
        "titulo": "Entre dos mundos",
        "piezas": [
          {
            "tipo": "articulo",
            "id": "ART-2026-038"
          }
        ]
      }
    ],
    "instantanea": null,
    "huella": null
  }
];
