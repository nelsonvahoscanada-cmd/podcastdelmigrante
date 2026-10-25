/*
  desafio-datos.js — Desafío 100 Empresas: fuente única de datos
  ======================================================================
  programas → ediciones → historias → episodios y participantes.
  Todas las cifras de /desafio-100-empresas/ salen de aquí con resumen():
  nunca se escriben a mano. Las páginas se generan con
  scripts/build-desafio.mjs y las pruebas están en
  tests/desafio-datos.test.mjs.

  - Edición: ciudad donde se organiza (los participantes pueden ser de
    otras localidades: cada uno conserva su ciudad real), meta de 100
    historias, estado ("en-curso", "completada", "en-preparacion"),
    conteo.estado ("provisional" | "verificado") y grabadas (número
    comprobable o null: si es null, no se muestra).
  - Historia: una historia empresarial única; es lo que cuenta el
    contador. Una empresa con varios episodios o una entrevista grupal
    cuenta una vez. verificar: true = posible duplicado en revisión.
  - Episodio: un video. Solo cuenta si visibilidad === "publico"
    (verificada en la pestaña pública de videos del canal). slug fija la
    URL (no cambia aunque se corrija un nombre). portadaPropia: el portal
    muestra su portada editorial en lugar de la miniatura de YouTube.
  - Participante: una persona del Muro del Legado. muro: número de
    registro (null si aún no tiene). businessSlug: perfil del Directorio
    (perfil-<slug>.html), solo si existe y está autorizado.
  - confirmar: campos pendientes de confirmación por el equipo editorial.
    Se muestran tal como figuran en las fuentes públicas; no se inventan.
  Sin correos, teléfonos ni direcciones: el contacto vive solo en el
  perfil del Directorio de quien lo autorice.
  Se carga en el navegador (window.PDM_DESAFIO) y en Node (pruebas).
*/
(function (raiz) {
  "use strict";

  const DATOS = {
    "programas": [
      {
        "id": "desafio-100-empresas",
        "nombre": "Desafío 100 Empresas",
        "lema": "100 empresarios. 100 historias. Un legado.",
        "inscripcion": "https://forms.gle/ZxDpuzUuEbr3LjjS6"
      }
    ],
    "ediciones": [
      {
        "id": "calgary",
        "programa": "desafio-100-empresas",
        "nombre": "Desafío 100 Empresas — Calgary",
        "numero": 1,
        "provincia": "Alberta",
        "meta": 100,
        "estado": "en-curso",
        "nota": "Calgary identifica dónde comenzó la edición; participan empresarios de otras localidades con su ciudad real.",
        "conteo": {
          "estado": "provisional",
          "motivo": "Falta confirmar si EP 17 (Juan Acosta) y EP 33 (Cristina Acosta) son una o dos historias empresariales, y verificar los registros marcados con «confirmar»."
        },
        "grabadas": null,
        "verificacion": {
          "fecha": "2026-10-23",
          "metodo": "Lista pública de videos del canal @ElPodcastDelMigranteOficial y lista oficial «Desafío 100 Empresas» (36 videos)."
        },
        "ciudad": "Calgary"
      }
    ],
    "historias": [
      {
        "edicion": "calgary",
        "id": "retryvive-counselling",
        "empresa": "Retryvive Counselling",
        "ciudad": "Calgary",
        "episodios": [
          1
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "cs-consulting-canada",
        "empresa": "CS Consulting Canada",
        "ciudad": "Calgary",
        "episodios": [
          2
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "roca-financial-group",
        "empresa": "Roca Financial Group",
        "ciudad": "Calgary",
        "episodios": [
          3
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "la-costenita-latin-market-food",
        "empresa": "La Costeñita Latin Market Food",
        "ciudad": "Airdrie",
        "episodios": [
          4
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "peluqueria-infantil",
        "empresa": "Peluquería Infantil",
        "ciudad": "Calgary",
        "episodios": [
          5
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "diana-cardona-marca-personal",
        "empresa": "Diana Cardona | Marca Personal",
        "ciudad": "Calgary",
        "episodios": [
          6
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "universidad-de-cosmetica-natural",
        "empresa": "Universidad de Cosmética Natural",
        "ciudad": "Airdrie",
        "episodios": [
          7
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "electrician-guy",
        "empresa": "Electrician Guy",
        "ciudad": "Calgary",
        "episodios": [
          8
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "holy-tastes-latin-food",
        "empresa": "Holy Tastes Latin Food",
        "ciudad": "Calgary",
        "episodios": [
          9
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "grooming-by-sandy",
        "empresa": "Grooming by Sandy",
        "ciudad": "Calgary",
        "episodios": [
          10
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "wenfer-group",
        "empresa": "WenFer Group",
        "ciudad": "Calgary",
        "episodios": [
          11,
          28
        ],
        "estado": "publicada",
        "verificar": false,
        "nota": "EP 11 (Fernando Corona y Wendy) y EP 28 (Wendy Montoya Aguirre): misma empresa, una historia."
      },
      {
        "edicion": "calgary",
        "id": "vittalia-wellness",
        "empresa": "Vittalia Wellness",
        "ciudad": "Calgary",
        "episodios": [
          12
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "llanofrut",
        "empresa": "Llanofrut",
        "ciudad": "Calgary",
        "episodios": [
          13
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "duo-creative-labs",
        "empresa": "Duo Creative Labs",
        "ciudad": "Calgary",
        "episodios": [
          14
        ],
        "estado": "publicada",
        "nota": "Entrevista grupal (Claudia y Carlos Briceño): una historia. El Muro solo registra a Carlos Briceño; falta confirmar si se añade a Claudia."
      },
      {
        "edicion": "calgary",
        "id": "sterna-global-immigration-inc",
        "empresa": "Sterna Global Immigration Inc",
        "ciudad": "Calgary",
        "episodios": [
          15
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "corral-rustic-furniture",
        "empresa": "Corral Rustic Furniture",
        "ciudad": "Okotoks",
        "episodios": [
          16
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "expert-mortgage-consulting",
        "empresa": "Expert Mortgage & Consulting",
        "ciudad": "Calgary",
        "episodios": [
          17,
          33
        ],
        "estado": "publicada",
        "verificar": true,
        "nota": "EP 17 (Juan Acosta) y EP 33 (Cristina Acosta Mortgage Team): misma correduría. Cuenta como una historia hasta que se confirme si son negocios independientes."
      },
      {
        "edicion": "calgary",
        "id": "maxi-foods",
        "empresa": "Maxi Foods",
        "ciudad": "Airdrie",
        "episodios": [
          18
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "servi-auto-inc",
        "empresa": "Servi Auto Inc",
        "ciudad": "Calgary",
        "episodios": [
          19
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "angeles-celestiales-floral-art",
        "empresa": "Ángeles Celestiales Floral Art",
        "ciudad": "Calgary",
        "episodios": [
          20
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "zion-property-care-ltd",
        "empresa": "Zion Property Care Ltd",
        "ciudad": "Calgary",
        "episodios": [
          21
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "sandra-castro-realtor",
        "empresa": "Sandra Castro Realtor",
        "ciudad": "Calgary",
        "episodios": [
          22
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "adriana-fern-psychology",
        "empresa": "Adriana Fern Psychology",
        "ciudad": "Calgary",
        "episodios": [
          23
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "n-w-financial-group-company-inc",
        "empresa": "N&W Financial Group Company Inc",
        "ciudad": "Calgary",
        "episodios": [
          24
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "yb-insurance-broker",
        "empresa": "YB Insurance Broker",
        "ciudad": "Calgary",
        "episodios": [
          25
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "it4calgary",
        "empresa": "It4Calgary",
        "ciudad": "Calgary",
        "episodios": [
          27
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "aikan-reboot",
        "empresa": "Aikan Reboot",
        "ciudad": "Calgary",
        "episodios": [
          29
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "gc-equipment-ltd",
        "empresa": "GC Equipment Ltd",
        "ciudad": "Calgary",
        "episodios": [
          30
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "athletica-gymnastics",
        "empresa": "Athletica Gymnastics",
        "ciudad": "Calgary",
        "episodios": [
          31
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "bg-accounting-services-ltd",
        "empresa": "BG Accounting Services Ltd",
        "ciudad": "Calgary",
        "episodios": [
          32
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "mis-finanzas-con-yenny",
        "empresa": "Mis Finanzas con Yenny",
        "ciudad": "Calgary",
        "episodios": [
          34
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "nj-accounting-consultants-inc",
        "empresa": "NJ Accounting Consultants Inc.",
        "ciudad": "Calgary",
        "episodios": [
          35
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "diego-orjuela-realtor-property-manager",
        "empresa": "Diego Orjuela — Realtor® · Property Manager",
        "ciudad": "Calgary",
        "episodios": [
          36
        ],
        "estado": "publicada"
      },
      {
        "edicion": "calgary",
        "id": "andrea-paola-diaz-posada",
        "empresa": null,
        "ciudad": "Brooks",
        "episodios": [
          37
        ],
        "estado": "publicada",
        "confirmar": [
          "empresa"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-anta-cleaning-services",
        "empresa": "Anta Cleaning Services",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-aquatech-cleaner-services",
        "empresa": "Aquatech Cleaner Services",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-eco-doors",
        "empresa": "Eco Doors",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-image360-calgary-north",
        "empresa": "Image360 Calgary North",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-j-m-painting",
        "empresa": "J.M Painting",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-jackelines-hair-studio",
        "empresa": "Jackelines Hair Studio",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-jahlions-ltd",
        "empresa": "JahLions Ltd",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-mh-aesthetics-clinic",
        "empresa": "MH Aesthetics Clinic",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-nemapaetza-emparepastreats",
        "empresa": "Nemapaetza — Emparepastreats",
        "ciudad": "Winnipeg",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-please",
        "empresa": "PLEASE",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-punto-latino",
        "empresa": "Punto Latino",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-variaciones-de-comidas",
        "empresa": "Variaciones de Comidas",
        "ciudad": "Calgary",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      },
      {
        "edicion": "calgary",
        "id": "pendiente-wonder-picnics-and-events",
        "empresa": "Wonder Picnics and Events",
        "ciudad": "Winnipeg",
        "episodios": [],
        "estado": "pendiente",
        "confirmar": [
          "estado"
        ]
      }
    ],
    "episodios": [
      {
        "edicion": "calgary",
        "ep": 1,
        "historia": "retryvive-counselling",
        "persona": "Dunia Rodríguez",
        "empresa": "Retryvive Counselling",
        "ciudad": "Calgary",
        "categoria": "salud",
        "categoriaTexto": "Salud y Bienestar",
        "titulo": "Enfrentó graves desafíos de salud en Canadá y decidió ayudar a otros",
        "videoId": "_yazppIXYVk",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "frase": "Rendirse no era una opción.",
        "confirmar": [
          "persona"
        ],
        "slug": "ep-01-dunia-rodriguez"
      },
      {
        "edicion": "calgary",
        "ep": 2,
        "historia": "cs-consulting-canada",
        "persona": "Carmen Helena Montoya Sánchez",
        "empresa": "CS Consulting Canada",
        "ciudad": "Calgary",
        "categoria": "inmigracion",
        "categoriaTexto": "Inmigración",
        "titulo": "Encontró demasiada información falsa sobre inmigración y decidió prepararse para ayudar.",
        "videoId": "Lfx5p_SLl-4",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "frase": "La información falsa la impulsó a prepararse.",
        "slug": "ep-02-carmen-helena-montoya-sanchez"
      },
      {
        "edicion": "calgary",
        "ep": 3,
        "historia": "roca-financial-group",
        "persona": "Carlos D. Castillo",
        "empresa": "Roca Financial Group",
        "ciudad": "Calgary",
        "categoria": "finanzas",
        "categoriaTexto": "Finanzas",
        "titulo": "¿Qué pasaría con tu familia si mañana faltaras?",
        "videoId": "xJaXI3r83sA",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "storySlug": "desafio-carlos-castillo-proteccion-familiar",
        "resumen": "Carlos D. Castillo conversa sobre planificación financiera, seguros de vida y la importancia de proteger a quienes dependen de nosotros.",
        "slug": "ep-03-carlos-d-castillo"
      },
      {
        "edicion": "calgary",
        "ep": 4,
        "historia": "la-costenita-latin-market-food",
        "persona": "Hugo Raúl Morales Vega",
        "empresa": "La Costeñita Latin Market Food",
        "ciudad": "Airdrie",
        "categoria": "alimentos",
        "categoriaTexto": "Alimentos y Comunidad",
        "titulo": "Abrió su negocio para ayudar a otros emprendedores latinos",
        "videoId": "kS9Ff6J8i_s",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "frase": "No quiere crecer solo.",
        "slug": "ep-04-hugo-raul-morales-vega"
      },
      {
        "edicion": "calgary",
        "ep": 5,
        "historia": "peluqueria-infantil",
        "persona": "Milena Bolaños",
        "empresa": "Peluquería Infantil",
        "ciudad": "Calgary",
        "categoria": "belleza",
        "categoriaTexto": "Belleza y Comunidad",
        "titulo": "Tiene su empresa lista, pero aún no puede operar en Canadá",
        "videoId": "tLNUf_SkAD0",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "frase": "Su sueño sigue en pausa.",
        "confirmar": [
          "empresa"
        ],
        "slug": "ep-05-milena-bolanos"
      },
      {
        "edicion": "calgary",
        "ep": 6,
        "historia": "diana-cardona-marca-personal",
        "persona": "Diana Cardona",
        "empresa": "Diana Cardona | Marca Personal",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Servicios Profesionales",
        "titulo": "Diana Cardona: Cómo crear ingresos reales en Canadá con tu marca personal",
        "videoId": "gwpQ2rkEdP8",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-06-diana-cardona"
      },
      {
        "edicion": "calgary",
        "ep": 7,
        "historia": "universidad-de-cosmetica-natural",
        "persona": "Catherin Torres",
        "empresa": "Universidad de Cosmética Natural",
        "ciudad": "Airdrie",
        "categoria": "belleza",
        "categoriaTexto": "Belleza y Cosmética",
        "titulo": "Catherin Torres: Cómo crear tu propia marca cosmética desde cero",
        "videoId": "9qVEidoolTw",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-07-catherin-torres"
      },
      {
        "edicion": "calgary",
        "ep": 8,
        "historia": "electrician-guy",
        "persona": "Gabriel Herrera Paniagua",
        "empresa": "Electrician Guy",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Servicios Profesionales",
        "titulo": "Llegó a Canadá por amor y construyó una empresa exitosa",
        "videoId": "3c0OuB52TE8",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "slug": "ep-08-gabriel-herrera-paniagua"
      },
      {
        "edicion": "calgary",
        "ep": 9,
        "historia": "holy-tastes-latin-food",
        "persona": "Fabiola Andrea Rueda Moreno",
        "empresa": "Holy Tastes Latin Food",
        "ciudad": "Calgary",
        "categoria": "alimentos",
        "categoriaTexto": "Alimentos y Comunidad",
        "titulo": "Fabiola Rueda: Arepas rellenas de queso hechas con amor latino",
        "videoId": "UloNyWGYEXo",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "storySlug": "desafio-fabiola-rueda-arepas",
        "resumen": "Tradición, gastronomía y emprendimiento se encuentran en la historia de Fabiola Rueda, quien convierte sabores latinos en oportunidades para familias emprendedoras.",
        "slug": "ep-09-fabiola-andrea-rueda-moreno"
      },
      {
        "edicion": "calgary",
        "ep": 10,
        "historia": "grooming-by-sandy",
        "persona": "Sandra Constanza Noreña Báez",
        "empresa": "Grooming by Sandy",
        "ciudad": "Calgary",
        "categoria": "belleza",
        "categoriaTexto": "Belleza y Bienestar",
        "titulo": "Sandra Noreña: El spa de perros donde cada mascota es tratada con amor",
        "videoId": "IKbrXrukwFY",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-10-sandra-constanza-norena-baez"
      },
      {
        "edicion": "calgary",
        "ep": 11,
        "historia": "wenfer-group",
        "persona": "Fernando Corona & Wendy",
        "empresa": "WenFer Group",
        "ciudad": "Calgary",
        "categoria": "finanzas",
        "categoriaTexto": "Finanzas",
        "titulo": "Quebraron un restaurante y cambiaron su vida financiera",
        "videoId": "o1Mv1p-gwF0",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "slug": "ep-11-fernando-corona-wendy"
      },
      {
        "edicion": "calgary",
        "ep": 12,
        "historia": "vittalia-wellness",
        "persona": "Abraham Ortega",
        "empresa": "Vittalia Wellness",
        "ciudad": "Calgary",
        "categoria": "salud",
        "categoriaTexto": "Salud y Bienestar",
        "titulo": "Abraham: terapias, sanación espiritual y una empresa que nació para crecer",
        "videoId": "t7aT3SD94Xg",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-12-abraham-ortega"
      },
      {
        "edicion": "calgary",
        "ep": 13,
        "historia": "llanofrut",
        "persona": "Deicy Hernández",
        "empresa": "Llanofrut",
        "ciudad": "Calgary",
        "categoria": "alimentos",
        "categoriaTexto": "Alimentos y Comunidad",
        "titulo": "De la depresión a crear una de las marcas de lácteos más queridas de Calgary",
        "videoId": "PchTJA6UO-A",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-13-deicy-hernandez"
      },
      {
        "edicion": "calgary",
        "ep": 14,
        "historia": "duo-creative-labs",
        "persona": "Claudia & Carlos Briceño",
        "empresa": "Duo Creative Labs",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Servicios Profesionales",
        "titulo": "De la construcción a la inteligencia artificial: lo apostaron todo en Canadá",
        "videoId": "vuMEr5384LI",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-14-claudia-carlos-briceno"
      },
      {
        "edicion": "calgary",
        "ep": 15,
        "historia": "sterna-global-immigration-inc",
        "persona": "Gina Marcela Salinas Gutiérrez",
        "empresa": "Sterna Global Immigration Inc",
        "ciudad": "Calgary",
        "categoria": "inmigracion",
        "categoriaTexto": "Inmigración",
        "titulo": "La consultora de inmigración que abrió sus puertas a los nuevos inmigrantes",
        "videoId": "bDhX_XW2bE0",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "storySlug": "desafio-gina-salinas-sterna-global-immigration",
        "resumen": "De abogada en Colombia a reconstruir su carrera profesional en Canadá. Una historia de servicio, resiliencia y compromiso con la comunidad inmigrante.",
        "slug": "ep-15-gina-marcela-salinas-gutierrez"
      },
      {
        "edicion": "calgary",
        "ep": 16,
        "historia": "corral-rustic-furniture",
        "persona": "Francisco Muñoz Corral",
        "empresa": "Corral Rustic Furniture",
        "ciudad": "Okotoks",
        "categoria": "servicios",
        "categoriaTexto": "Servicios Profesionales",
        "titulo": "De carpintero inmigrante a empresario: 20 años después apuesta TODO por su sueño",
        "videoId": "V-63cO73c_M",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "confirmar": [
          "empresa"
        ],
        "slug": "ep-16-francisco-munoz-corral"
      },
      {
        "edicion": "calgary",
        "ep": 17,
        "historia": "expert-mortgage-consulting",
        "persona": "Juan Acosta",
        "empresa": "Mortgage Broker — Expert Mortgage & Consulting",
        "ciudad": "Calgary",
        "categoria": "finanzas",
        "categoriaTexto": "Finanzas",
        "titulo": "Llegó a Canadá y se reinventó: hoy ayuda a latinos a comprar su casa",
        "videoId": "PkCDFyf0JP8",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "slug": "ep-17-juan-acosta"
      },
      {
        "edicion": "calgary",
        "ep": 18,
        "historia": "maxi-foods",
        "persona": "Vladimir González",
        "empresa": "Maxi Foods",
        "ciudad": "Airdrie",
        "categoria": "alimentos",
        "categoriaTexto": "Alimentos y Comunidad",
        "titulo": "De ingeniero a vender tortillas: Canadá lo golpeó, pero NO se rindió",
        "videoId": "xuQYHWBNQL0",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-18-vladimir-gonzalez"
      },
      {
        "edicion": "calgary",
        "ep": 19,
        "historia": "servi-auto-inc",
        "persona": "Josue Martinez",
        "empresa": "Servi Auto Inc",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Servicios Profesionales",
        "titulo": "De limpiar baños a tener su negocio de mecánica en Canadá",
        "videoId": "nwt8pWOOb0s",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-19-josue-martinez"
      },
      {
        "edicion": "calgary",
        "ep": 20,
        "historia": "angeles-celestiales-floral-art",
        "persona": "Kelly Bibiana Granada Bustamante",
        "empresa": "Ángeles Celestiales Floral Art",
        "ciudad": "Calgary",
        "categoria": "comunidad",
        "categoriaTexto": "Comunidad",
        "titulo": "De la violencia en Colombia a cumplir su sueño en Canadá",
        "videoId": "MnpUWRQYq_E",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "confirmar": [
          "persona"
        ],
        "slug": "ep-20-kelly-bibiana-granada-bustamante"
      },
      {
        "edicion": "calgary",
        "ep": 21,
        "historia": "zion-property-care-ltd",
        "persona": "Andrea Rodríguez",
        "empresa": "Zion Property Care Ltd",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Servicios Profesionales",
        "titulo": "De limpiar para sobrevivir a crear su propia empresa en Canadá",
        "videoId": "3SS15stPu54",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "slug": "ep-21-andrea-rodriguez"
      },
      {
        "edicion": "calgary",
        "ep": 22,
        "historia": "sandra-castro-realtor",
        "persona": "Sandra Castro",
        "empresa": "Sandra Castro Realtor",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Bienes Raíces",
        "titulo": "Llegó sola con su hija y hoy lidera su propio Brokerage en Calgary",
        "videoId": "67KtzrySWDg",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "slug": "ep-22-sandra-castro"
      },
      {
        "edicion": "calgary",
        "ep": 23,
        "historia": "adriana-fern-psychology",
        "persona": "Adriana Fernández",
        "empresa": "Adriana Fern Psychology",
        "ciudad": "Calgary",
        "categoria": "salud",
        "categoriaTexto": "Salud y Bienestar",
        "titulo": "Llegó a Canadá a los 10 años y hoy es psicóloga en Alberta",
        "videoId": "rrn41wwfGMw",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "slug": "ep-23-adriana-fernandez"
      },
      {
        "edicion": "calgary",
        "ep": 24,
        "historia": "n-w-financial-group-company-inc",
        "persona": "Nayibe Lamilla Fajardo",
        "empresa": "N&W Financial Group Company Inc",
        "ciudad": "Calgary",
        "categoria": "finanzas",
        "categoriaTexto": "Finanzas",
        "titulo": "Llegó a Calgary con $15 y hoy tiene su propia empresa",
        "videoId": "EpPAtFbOTJ8",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "slug": "ep-24-nayibe-lamilla-fajardo"
      },
      {
        "edicion": "calgary",
        "ep": 25,
        "historia": "yb-insurance-broker",
        "persona": "Yasmin Bedoya",
        "empresa": "YB Insurance Broker",
        "ciudad": "Calgary",
        "categoria": "finanzas",
        "categoriaTexto": "Finanzas",
        "titulo": "Llegó sin inglés y terminó educando familias sobre dinero en Canadá",
        "videoId": "Zpct8mCCsvQ",
        "visibilidad": "publico",
        "portadaPropia": true,
        "provincia": "Alberta",
        "slug": "ep-25-yasmin-bedoya"
      },
      {
        "edicion": "calgary",
        "ep": 27,
        "historia": "it4calgary",
        "persona": "Joel Hernández Rodríguez",
        "empresa": "It4Calgary",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Telecomunicaciones",
        "titulo": "De Cuba a Calgary: llegó por su familia y emprendió en telecomunicaciones",
        "videoId": "ewVZd0D9J8E",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-27-joel-hernandez-rodriguez"
      },
      {
        "edicion": "calgary",
        "ep": 28,
        "historia": "wenfer-group",
        "persona": "Wendy Montoya Aguirre",
        "empresa": "WenFerGroup",
        "ciudad": "Calgary",
        "categoria": "finanzas",
        "categoriaTexto": "Finanzas",
        "titulo": "Llegó sin inglés, empezó desde cero y hoy educa familias sobre finanzas",
        "videoId": "U43mi0VUrQQ",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-28-wendy-montoya-aguirre"
      },
      {
        "edicion": "calgary",
        "ep": 29,
        "historia": "aikan-reboot",
        "persona": "Verónica Durán Novelo",
        "empresa": "Aikan Reboot",
        "ciudad": "Calgary",
        "categoria": "salud",
        "categoriaTexto": "Salud y Bienestar",
        "titulo": "De México a Canadá: se reinventó y convirtió su vocación holística en empresa",
        "videoId": "2RcMF0Uiz2Y",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "storySlug": "desafio-veronica-duran-novelo",
        "resumen": "Verónica comparte su experiencia migratoria, la importancia de la familia y cómo retomó su vocación para emprender en el ámbito del acompañamiento holístico.",
        "slug": "ep-29-veronica-duran-novelo"
      },
      {
        "edicion": "calgary",
        "ep": 30,
        "historia": "gc-equipment-ltd",
        "persona": "Mario De Matteis Solís",
        "empresa": "GC Equipment Ltd",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Construcción",
        "titulo": "Dominaba el 80% del asfalto en Yucatán y empezó de cero en Canadá",
        "videoId": "0rFRBV7wYqM",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "storySlug": "desafio-mario-de-matteiz-gc-equipment",
        "resumen": "Después de desarrollar importantes proyectos industriales en México, Mario emigró a Canadá y comenzó trabajando en jardinería. Hoy dirige GC Equipment en Calgary, donde coordina un equipo de trabajadores latinos.",
        "slug": "ep-30-mario-de-matteis-solis"
      },
      {
        "edicion": "calgary",
        "ep": 31,
        "historia": "athletica-gymnastics",
        "persona": "Cynthya Bringss",
        "empresa": "Athletica Gymnastics",
        "ciudad": "Calgary",
        "categoria": "comunidad",
        "categoriaTexto": "Comunidad",
        "titulo": "Llegó sin inglés, hizo voluntariado y terminó creando su propia academia en Canadá",
        "videoId": "R9thQCujWNU",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-31-cynthya-bringss"
      },
      {
        "edicion": "calgary",
        "ep": 32,
        "historia": "bg-accounting-services-ltd",
        "persona": "Viviana Gallego",
        "empresa": "BG Accounting Services Ltd",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Contabilidad",
        "titulo": "De Colombia a Canadá: convirtió la resiliencia en una empresa contable",
        "videoId": "8UYFajH0uPE",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "confirmar": [
          "persona"
        ],
        "slug": "ep-32-viviana-gallego"
      },
      {
        "edicion": "calgary",
        "ep": 33,
        "historia": "expert-mortgage-consulting",
        "persona": "Cristina Acosta",
        "empresa": "Cristina Acosta Mortgage Team",
        "ciudad": "Calgary",
        "categoria": "finanzas",
        "categoriaTexto": "Finanzas · Hipotecas",
        "titulo": "Llegó a Canadá sin inglés y arrepentida… hoy ha ayudado a más de 800 familias",
        "videoId": "m3gEVvWqwPc",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-33-cristina-acosta"
      },
      {
        "edicion": "calgary",
        "ep": 34,
        "historia": "mis-finanzas-con-yenny",
        "persona": "Yenny J. Suárez",
        "empresa": "Mis Finanzas con Yenny",
        "ciudad": "Calgary",
        "categoria": "finanzas",
        "categoriaTexto": "Finanzas",
        "titulo": "De Colombia a España y Canadá: los errores financieros que le enseñaron a invertir",
        "videoId": "TQ02VLtx9lU",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "confirmar": [
          "persona",
          "empresa"
        ],
        "slug": "ep-34-yenny-j-suarez"
      },
      {
        "edicion": "calgary",
        "ep": 35,
        "historia": "nj-accounting-consultants-inc",
        "persona": "Maritza Corso",
        "empresa": "NJ Accounting Consultants Inc.",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Contabilidad · Impuestos",
        "titulo": "Llegó a Canadá con 5 maletas y $25… 22 años después, esta es su historia",
        "videoId": "It-VuNDZI1o",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "confirmar": [
          "persona"
        ],
        "slug": "ep-35-maritza-corso"
      },
      {
        "edicion": "calgary",
        "ep": 36,
        "historia": "diego-orjuela-realtor-property-manager",
        "persona": "Diego Orjuela",
        "empresa": "Diego Orjuela — Realtor® · Property Manager",
        "ciudad": "Calgary",
        "categoria": "servicios",
        "categoriaTexto": "Bienes Raíces",
        "titulo": "Lo perdió casi todo en EE. UU. y empezó de cero en Canadá con 8 maletas",
        "videoId": "ipgUwcu3BwA",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "slug": "ep-36-diego-orjuela"
      },
      {
        "edicion": "calgary",
        "ep": 37,
        "historia": "andrea-paola-diaz-posada",
        "persona": "Andrea Paola Díaz Posada",
        "empresa": null,
        "ciudad": "Brooks",
        "categoria": "moda",
        "categoriaTexto": "Moda y emprendimiento",
        "titulo": "¿Cuánto estarías dispuesto a sacrificar por darle un mejor futuro a tu familia?",
        "videoId": "3tOZfCwZWN8",
        "visibilidad": "publico",
        "portadaPropia": false,
        "provincia": "Alberta",
        "storySlug": "desafio-andrea-diaz-posada-familia-separada",
        "resumen": "Andrea Paola Díaz Posada relata cómo enfrentó la separación de su esposo, el reencuentro de sus hijas con su padre y el desafío de comenzar una nueva vida en Brooks, Alberta.",
        "confirmar": [
          "empresa"
        ],
        "slug": "ep-37-andrea-paola-diaz-posada"
      }
    ],
    "participantes": [
      {
        "edicion": "calgary",
        "muro": "001",
        "nombre": "Duniaska Rodríguez Hernández",
        "empresa": "Retryvive Counselling",
        "ciudad": "Calgary",
        "historia": "retryvive-counselling",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "002",
        "nombre": "Carmen Helena Montoya Sánchez",
        "empresa": "CS Consulting Canada",
        "ciudad": "Calgary",
        "historia": "cs-consulting-canada",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "003",
        "nombre": "Carlos D. Castillo",
        "empresa": "Roca Financial Group Ltd",
        "ciudad": "Calgary",
        "historia": "roca-financial-group",
        "businessSlug": "carlos-d-castillo",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "004",
        "nombre": "Hugo Raúl Morales Vega",
        "empresa": "La Costeñita Latin Market Food",
        "ciudad": "Airdrie",
        "historia": "la-costenita-latin-market-food",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "005",
        "nombre": "Milena Bolaños",
        "empresa": "Milena Children Stylist",
        "ciudad": "Calgary",
        "historia": "peluqueria-infantil",
        "provincia": "Alberta",
        "confirmar": [
          "empresa"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "006",
        "nombre": "Jerica",
        "empresa": "Jackelines Hair Studio",
        "ciudad": "Calgary",
        "historia": "pendiente-jackelines-hair-studio",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "007",
        "nombre": "Jorge Navas",
        "empresa": "Aquatech Cleaner Services",
        "ciudad": "Calgary",
        "historia": "pendiente-aquatech-cleaner-services",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "008",
        "nombre": "Abraham Ortega",
        "empresa": "Vittalia Wellness",
        "ciudad": "Calgary",
        "historia": "vittalia-wellness",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "009",
        "nombre": "María Acosta",
        "empresa": "Eco Doors",
        "ciudad": "Calgary",
        "historia": "pendiente-eco-doors",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "010",
        "nombre": "Fabiola Andrea Rueda Moreno",
        "empresa": "Holy Tastes Latin Food",
        "ciudad": "Calgary",
        "historia": "holy-tastes-latin-food",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "011",
        "nombre": "Gabriel Herrera Paniagua",
        "empresa": "Electrician Guy",
        "ciudad": "Calgary",
        "historia": "electrician-guy",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "012",
        "nombre": "Francisco Muñoz Corral",
        "empresa": "Corral Woodworking",
        "ciudad": "Okotoks",
        "historia": "corral-rustic-furniture",
        "provincia": "Alberta",
        "confirmar": [
          "empresa"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "013",
        "nombre": "Deicy Hernández",
        "empresa": "Llanofrut",
        "ciudad": "Calgary",
        "historia": "llanofrut",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "014",
        "nombre": "Ana María",
        "empresa": "Variaciones de Comidas",
        "ciudad": "Calgary",
        "historia": "pendiente-variaciones-de-comidas",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "015",
        "nombre": "Diana Cardona",
        "empresa": "Diana Cardona | Marca Personal",
        "ciudad": "Calgary",
        "historia": "diana-cardona-marca-personal",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "016",
        "nombre": "Catherin Torres",
        "empresa": "Universidad de Cosmética Natural",
        "ciudad": "Airdrie",
        "historia": "universidad-de-cosmetica-natural",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "017",
        "nombre": "Diana Bernal",
        "empresa": "Punto Latino",
        "ciudad": "Calgary",
        "historia": "pendiente-punto-latino",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "018",
        "nombre": "Juan Acosta",
        "empresa": "Mortgage Broker",
        "ciudad": "Calgary",
        "historia": "expert-mortgage-consulting",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "019",
        "nombre": "Carlos Briceño",
        "empresa": "Duo Creative Labs",
        "ciudad": "Calgary",
        "historia": "duo-creative-labs",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "020",
        "nombre": "Vladimir González",
        "empresa": "Maxi Foods",
        "ciudad": "Airdrie",
        "historia": "maxi-foods",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "021",
        "nombre": "Sandra Constanza Noreña Báez",
        "empresa": "Grooming by Sandy",
        "ciudad": "Calgary",
        "historia": "grooming-by-sandy",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "022",
        "nombre": "Fernando Corona",
        "empresa": "WenFer",
        "ciudad": "Calgary",
        "historia": "wenfer-group",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "023",
        "nombre": "Yasmin Bedoya",
        "empresa": "YB Insurance Broker",
        "ciudad": "Calgary",
        "historia": "yb-insurance-broker",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "024",
        "nombre": "Cynthya Bringss",
        "empresa": "Athletica Gymnastics",
        "ciudad": "Calgary",
        "historia": "athletica-gymnastics",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "025",
        "nombre": "Gina Marcela Salinas Gutiérrez",
        "empresa": "Sterna Global Immigration Inc",
        "ciudad": "Calgary",
        "historia": "sterna-global-immigration-inc",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "026",
        "nombre": "Josue Martinez",
        "empresa": "Servi Auto Inc",
        "ciudad": "Calgary",
        "historia": "servi-auto-inc",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "027",
        "nombre": "Kelly Bibiana Granada Bustamante",
        "empresa": "Ángeles Celestiales Floral Art",
        "ciudad": "Calgary",
        "historia": "angeles-celestiales-floral-art",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "028",
        "nombre": "Bibiana Gallego",
        "empresa": "BG Accounting Services Ltd",
        "ciudad": "Calgary",
        "historia": "bg-accounting-services-ltd",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "029",
        "nombre": "Vladimir Iglesias",
        "empresa": "Image360 Calgary North",
        "ciudad": "Calgary",
        "historia": "pendiente-image360-calgary-north",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "030",
        "nombre": "Andrea Rodriguez",
        "empresa": "Zion Property Care Ltd",
        "ciudad": "Calgary",
        "historia": "zion-property-care-ltd",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "031",
        "nombre": "Adriana Fernandez",
        "empresa": "Adriana Fern Psychology",
        "ciudad": "Calgary",
        "historia": "adriana-fern-psychology",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "032",
        "nombre": "Gloria Patricia Aristizabal",
        "empresa": "MH Aesthetics Clinic",
        "ciudad": "Calgary",
        "historia": "pendiente-mh-aesthetics-clinic",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "033",
        "nombre": "Sandra Castro",
        "empresa": "Sandra Castro Realtor",
        "ciudad": "Calgary",
        "historia": "sandra-castro-realtor",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "034",
        "nombre": "Jhony A. Muñoz",
        "empresa": "J.M Painting",
        "ciudad": "Calgary",
        "historia": "pendiente-j-m-painting",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "035",
        "nombre": "Joel Hernandez",
        "empresa": "It4Calgary",
        "ciudad": "Calgary",
        "historia": "it4calgary",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "036",
        "nombre": "Wendy Montoya Aguirre",
        "empresa": "WenFerGroup",
        "ciudad": "Calgary",
        "historia": "wenfer-group",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "037",
        "nombre": "Nayibe Lamilla Fajardo",
        "empresa": "N&W Financial Group Company Inc",
        "ciudad": "Calgary",
        "historia": "n-w-financial-group-company-inc",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "038",
        "nombre": "Verónica Durán Novelo",
        "empresa": "Aikan Reboot",
        "ciudad": "Calgary",
        "historia": "aikan-reboot",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "039",
        "nombre": "Mario Alberto De Matteis Solís",
        "empresa": "GC Equipment Ltd",
        "ciudad": "Calgary",
        "historia": "gc-equipment-ltd",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "040",
        "nombre": "Joan Sebastián Delgado Villarraga",
        "empresa": "JahLions Ltd",
        "ciudad": "Calgary",
        "historia": "pendiente-jahlions-ltd",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "041",
        "nombre": "Tatiana Jimenez",
        "empresa": "Anta Cleaning Services",
        "ciudad": "Calgary",
        "historia": "pendiente-anta-cleaning-services",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "042",
        "nombre": "Cristina Acosta",
        "empresa": "Cristina Acosta Mortgage Team",
        "ciudad": "Calgary",
        "historia": "expert-mortgage-consulting",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "043",
        "nombre": "Diego Orjuela Ramos",
        "empresa": "Diego Orjuela — Realtor® · Property Manager",
        "ciudad": "Calgary",
        "historia": "diego-orjuela-realtor-property-manager",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "044",
        "nombre": "Lesdy Johana Perilla Ruiz",
        "empresa": "Wonder Picnics and Events",
        "ciudad": "Winnipeg",
        "historia": "pendiente-wonder-picnics-and-events",
        "provincia": "Manitoba"
      },
      {
        "edicion": "calgary",
        "muro": "045",
        "nombre": "Juan Sebastián Izquierdo García",
        "empresa": "PLEASE",
        "ciudad": "Calgary",
        "historia": "pendiente-please",
        "provincia": "Alberta"
      },
      {
        "edicion": "calgary",
        "muro": "046",
        "nombre": "Maritza Korzo",
        "empresa": "NJ Accounting Consultants Inc.",
        "ciudad": "Calgary",
        "historia": "nj-accounting-consultants-inc",
        "provincia": "Alberta",
        "confirmar": [
          "nombre"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "047",
        "nombre": "Yenny J. Suárez",
        "empresa": "Mis Finanzas con Yenny",
        "ciudad": "Calgary",
        "historia": "mis-finanzas-con-yenny",
        "provincia": "Alberta",
        "confirmar": [
          "nombre",
          "empresa"
        ]
      },
      {
        "edicion": "calgary",
        "muro": "048",
        "nombre": "Marcela Galindo",
        "empresa": "Nemapaetza — Emparepastreats",
        "ciudad": "Winnipeg",
        "historia": "pendiente-nemapaetza-emparepastreats",
        "provincia": "Manitoba"
      },
      {
        "edicion": "calgary",
        "muro": null,
        "nombre": "Andrea Paola Díaz Posada",
        "empresa": null,
        "ciudad": "Brooks",
        "historia": "andrea-paola-diaz-posada",
        "provincia": "Alberta",
        "confirmar": [
          "numeroMuro",
          "empresa"
        ]
      }
    ]
  };

  function resumen(edicionId) {
    const edicion = DATOS.ediciones.find((e) => e.id === edicionId);
    if (!edicion) throw new Error("Edición desconocida: " + edicionId);
    const enEdicion = (x) => x.edicion === edicionId;
    const historias = DATOS.historias.filter(enEdicion);
    const eps = DATOS.episodios.filter((e) => enEdicion(e) && e.visibilidad === "publico");
    const publicadas = historias.filter((h) => h.estado === "publicada" && eps.some((e) => e.historia === h.id));
    return {
      meta: edicion.meta,
      historiasPublicadas: publicadas.length,
      episodiosPublicados: eps.length,
      historiasPendientes: historias.filter((h) => h.estado === "pendiente").length,
      participantes: DATOS.participantes.filter(enEdicion).length,
      enVerificacion: publicadas.filter((h) => h.verificar).length,
      grabadas: edicion.grabadas,
    };
  }

  const api = { DATOS, resumen };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.PDM_DESAFIO = api;
})(typeof window !== "undefined" ? window : globalThis);
