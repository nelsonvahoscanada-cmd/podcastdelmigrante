/*
  data.js — Contenido de EL PODCAST DEL MIGRANTE MAGAZINE
  ---------------------------------------------------------
  IMPORTANTE: Todo el contenido de este archivo es DEMOSTRATIVO,
  usado únicamente para visualizar la arquitectura y el diseño
  de la Fase 1. Ningún titular, cifra o cita representa una
  noticia real. Antes de publicar, reemplazar por contenido
  editorial verificado.

  Esta separación de datos existe para que crecer a cientos de
  artículos no implique tocar los componentes visuales.
*/

const SITE = {
  name: "El Podcast del Migrante Magazine",
  brand: "El Podcast del Migrante",
  publisher: "eRadio Global Corp.",
  domain: "podcastdelmigrante.com",
  tagline: "Información real para la vida real de los migrantes en Canadá",
};

const EDITION = {
  number: 1,
  monthLabel: "Octubre",
  year: 2026,
  headline: "Nuestra primera edición sigue creciendo: cada semana se suman nuevas historias, columnas y videos.",
  cta: "Ver edición",
};

const BREAKING = [
  "Servicio de Ciudadanía e Inmigración amplía horarios de atención en Alberta",
  "Nueva guía práctica para arrendar vivienda por primera vez en Canadá",
  "Feria de empleo para nuevos residentes se realizará este mes en Calgary",
];

const NAV_PRIMARY = [
  { label: "Inicio", href: "index.html#inicio" },
  { label: "Canadá", href: "index.html#" },
  { label: "Migración", href: "index.html#" },
  { label: "Empleo", href: "index.html#" },
  { label: "Comunidad", href: "index.html#" },
  { label: "Historias", href: "index.html#historias" },
  { label: "Videos", href: "index.html#video" },
];

const NAV_MORE = [
  { label: "Educación", href: "index.html#" },
  { label: "Emprendimiento", href: "index.html#" },
  { label: "Vivienda", href: "index.html#" },
  { label: "Finanzas", href: "index.html#" },
  { label: "Cultura", href: "index.html#" },
  { label: "Opinión", href: "index.html#" },
  { label: "Entrevistas", href: "index.html#video" },
  { label: "Desafío 100 Empresas", href: "index.html#desafio" },
  { label: "Podcast del Migrante", href: "index.html#video" },
  { label: "Ediciones", href: "index.html#edicion" },
  { label: "Archivo", href: "index.html#" },
  { label: "Puntos de distribución", href: "index.html#distribution" },
  { label: "Nuestros colaboradores", href: "index.html#contributors" },
];

const HERO = {
  main: {
    category: "Migración",
    title: "Llegar a Canadá: los documentos que conviene tener organizados desde el primer día",
    dek: "Una guía práctica para proteger y organizar la documentación que puede acompañarte durante tus primeros trámites y tu nueva vida en Canadá.",
    author: "Redacción El Podcast del Migrante",
    date: "18 de septiembre, 2026",
    image: "url('assets/llegar-canada-documentos-migrante.jpg')",
    aspectRatio: "16/9",
    alt: "Familia migrante organizando documentos durante sus primeros pasos en Canadá",
    demo: false,
    slug: "llegar-canada-documentos-primer-dia",
  },
  secondary: [
    {
      category: "Empleo",
      title: "Certificaciones cortas que pueden ayudarte a prepararte para trabajar en Alberta",
      date: "18 de septiembre",
      image: "url('assets/certificaciones-trabajo-alberta.jpg')",
      aspectRatio: "16/9",
      alt: "Trabajador en Alberta junto a elementos de capacitación y seguridad laboral",
      demo: false,
      slug: "certificaciones-trabajo-alberta",
    },
    {
      category: "Vivienda",
      title: "Tu primer arriendo en Alberta: qué revisar antes de firmar el contrato",
      date: "18 de septiembre",
      image: "url('assets/primer-arriendo-alberta.jpg')",
      aspectRatio: "16/9",
      alt: "Mujer llegando a una vivienda en Alberta junto a contrato de arrendamiento y llaves.",
      demo: false,
      slug: "primer-arriendo-alberta",
    },
    {
      category: "Comunidad",
      title: "100 empresarios, 100 historias: el emprendimiento latino que está construyendo comunidad en Calgary",
      date: "18 de septiembre",
      image: "url('assets/100-empresarios-100-historias-calgary.jpg')",
      aspectRatio: "16/9",
      alt: "Jornada de entrevistas de Desafío 100 Empresas en Calgary.",
      demo: false,
      slug: "100-empresarios-100-historias-calgary",
    },
  ],
};

const LATEST = [
  { category: "Canadá", title: "Cambios en el requisito de fondos de manutención para 2027", time: "Hace 2 horas" },
  { category: "Finanzas", title: "Cómo construir historial crediticio sin tarjeta previa en Canadá", time: "Hace 4 horas" },
  { category: "Educación", title: "Programas de idiomas gratuitos disponibles este otoño en Alberta", time: "Hace 6 horas" },
  { category: "Empleo", title: "Sectores con mayor demanda de mano de obra en las praderas canadienses", time: "Hoy, 8:10 a.m." },
  { category: "Migración", title: "Diferencias entre permiso de trabajo abierto y cerrado, explicadas", time: "Ayer" },
  { category: "Comunidad", title: "Directorio de iglesias y centros comunitarios en español en Brooks", time: "Ayer" },
];

const USEFUL_INFO = [
  { title: "Migración", desc: "Trámites, permisos y rutas de residencia explicados sin lenguaje técnico." },
  { title: "Empleo", desc: "Dónde buscar trabajo, cómo validar experiencia y qué esperar del primer contrato." },
  { title: "Vivienda", desc: "Cómo rentar, qué son los derechos del arrendatario y errores que salen caros." },
  { title: "Educación", desc: "Escuelas, cursos de idioma y equivalencias de estudios para adultos y menores." },
  { title: "Finanzas", desc: "Cuentas bancarias, crédito, impuestos y envío de dinero al país de origen." },
  { title: "Servicios", desc: "Salud, transporte, identificación y trámites de la vida diaria en Canadá." },
];

const STORIES = [
  {
    title: "Mi primer trabajo en Canadá: era para una oficina en un ancianato… ¡y acabé trabajando en la cocina!",
    excerpt: "Andrea Díaz cuenta la historia de su primer trabajo en Canadá — y el contraste entre lo que esperaba y lo que finalmente vivió.",
    videoId: "oqfNbzC_OLA",
    href: "historia-vida.html?slug=historia-andrea-diaz-primer-trabajo-canada",
    demo: false,
  },
  {
    title: "De una cabina de radio en FM a una nueva vida en Canadá",
    excerpt: "Diana Pineda, conocida en la radio colombiana como \"La Pinedita\", nos relata cómo fue ese cambio de vida.",
    videoId: "6YdTsBzG2gs",
    href: "historia-vida.html?slug=historia-diana-pineda-radio-canada",
    demo: false,
  },
  {
    title: "De vender en la calle a triunfar en Canadá: mi pasión por el comercio ambulante",
    excerpt: "Teresa Jiménez comparte su recorrido desde sus comienzos vendiendo en la calle hasta desarrollar su camino como empresaria en Canadá.",
    videoId: "UsWWtkmnszw",
    href: "historia-vida.html?slug=historia-teresa-jimenez-comercio-canada",
    demo: false,
  },
];

const VIDEOS = [
  { tag: "Podcast del Migrante", title: "3 realidades que todo migrante en Canadá debe conocer" },
  { tag: "Entrevistas", title: "Entrevista: reconstruir una carrera profesional desde cero" },
  { tag: "Desafío 100 Empresas", title: "El emprendimiento que nació en un garaje de Calgary" },
  { tag: "Historias", title: "Documental corto: dos años, una nueva vida" },
  { tag: "Especiales", title: "Especial: guía completa de impuestos para nuevos residentes" },
];

const MOST_READ = [
  "Los cinco documentos que más retrasan un trámite migratorio",
  "Cómo construir historial crediticio sin tarjeta previa en Canadá",
  "Qué revisar antes de firmar tu primer contrato de arrendamiento",
  "Diferencias entre permiso de trabajo abierto y cerrado, explicadas",
  "Sectores con mayor demanda de mano de obra en las praderas canadienses",
];

const SPONSORS = [
  { kind: "Patrocinador principal", name: "Espacio disponible" },
  { kind: "Socio del medio", name: "Espacio disponible" },
  { kind: "Patrocinado", name: "Espacio disponible" },
];

/* Meses de 2026: solo octubre está activo (Edición 01, primera
   edición oficial). Los demás aparecen deshabilitados — no
   representan ediciones publicadas. */
const EDITION_MONTHS = [
  { label: "Ene", active: false },
  { label: "Feb", active: false },
  { label: "Mar", active: false },
  { label: "Abr", active: false },
  { label: "May", active: false },
  { label: "Jun", active: false },
  { label: "Jul", active: false },
  { label: "Ago", active: false },
  { label: "Sep", active: false },
  { label: "Oct", active: true },
  { label: "Nov", active: false },
  { label: "Dic", active: false },
];

/* =========================================================
   FASE 1.4 — Nuestros colaboradores
   ---------------------------------------------------------
   Reconocimiento editorial a especialistas que aportan
   artículos y contenido al Magazine. NO son patrocinadores:
   este directorio se mantiene completamente separado de
   SPONSORS, tanto en datos como en diseño.

   Regla de negocio: este array se renderiza tal cual — si
   tiene 1 colaborador se muestra 1, si tiene 10 se muestran
   10. Nunca se completa el grid con tarjetas ficticias o
   placeholders; agregar un colaborador real es agregar un
   objeto aquí.

   Cada colaborador tiene un `id` estable. Cuando exista la
   plantilla de artículo (Fase 2), cada artículo podrá incluir
   un campo `authorId` que haga referencia a este `id`, y el
   nombre del autor podrá enlazar directamente a su perfil sin
   tocar esta estructura de datos.

   Campos soportados por colaborador (algunos opcionales,
   quedan listos para cuando haya información real):
   - photo: URL de fotografía profesional (si no hay, se
     muestran iniciales)
   - name, specialty, bio, longBio (bio extendida, reservada
     para una futura página de perfil — no se muestra todavía
     en la tarjeta compacta)
   - organization: empresa/entidad del colaborador (opcional)
   - columnName: columna editorial recurrente que firma (opcional)
   - licensedIn: jurisdicciones donde tiene licencia, si aplica (opcional)
   - brandLogo: { src, alt } — logo oficial de la marca profesional
     del colaborador (distinto del logo de El Podcast del Migrante),
     usado como identificación secundaria — nunca reemplaza su foto
     (opcional)
   - link: enlace de "Ver perfil" — la página de perfil interno
     (colaborador.html?id=...) una vez que existe
   - website: enlace externo/profesional adicional, se muestra como
     una segunda línea EN LA TARJETA cuando existe (opcional, se deja
     vacío si no se quiere ese segundo enlace visible en la tarjeta)
   - professionalSite: sitio profesional externo, usado únicamente
     por el botón "Visitar sitio profesional" dentro del perfil
     interno — nunca en la tarjeta de la HOME (opcional)
   - articlesNote: relación con los artículos que escribe

   Carlos D. Castillo es el primer colaborador editorial real
   del Magazine — firma la columna mensual "Tu dinero en
   Canadá". Sus datos fueron aportados directamente por el
   cliente; no se le atribuye ninguna credencial, premio o cifra
   que no haya sido confirmada explícitamente.
========================================================= */
const CONTRIBUTORS = [
  {
    id: "carlos-castillo",
    photo: "assets/carlos-castillo-avatar.jpg",
    name: "Carlos D. Castillo",
    specialty: "Colaborador — Educación Financiera",
    organization: "Roca Financial Group",
    columnName: "Tu dinero en Canadá",
    bio: "Educación, protección y arquitectura financiera.",
    longBio: "Carlos D. Castillo desarrolla contenido de educación financiera enfocado en ayudar a familias y migrantes a comprender mejor la organización financiera, la protección y las herramientas disponibles en Canadá. Su trayectoria en seguros comenzó en Colombia en 1994 y cuenta con más de una década de experiencia en la industria de seguros en Canadá.",
    licensedIn: "Alberta, British Columbia, Ontario y Saskatchewan.",
    brandLogo: { src: "assets/carlos-castillo-logo.png", alt: "Carlos Castillo" },
    articlesNote: "Firma la columna mensual Tu dinero en Canadá.",
    link: "colaborador.html?id=carlos-castillo",
    website: "",
    professionalSite: "https://www.CarlosDCastillo.com",
  },
];

/* =========================================================
   FASE 1.4 — Dónde encontrar el Magazine
   ---------------------------------------------------------
   Directorio de puntos de distribución impresa, organizado
   por ciudad. Para agregar una ciudad nueva (p. ej. Edmonton)
   basta con añadir objetos con esa `city` — el listado de
   ciudades y la cuadrícula se generan automáticamente a
   partir de estos datos, sin tocar HTML ni CSS.

   Todos los establecimientos listados son DEMO — nombres y
   direcciones ficticios, sin representar negocios reales.
========================================================= */

/* Ciudades del directorio — independientes de los puntos reales,
   para que las pestañas de ciudad sigan existiendo aunque todavía
   no haya establecimientos cargados para ninguna de ellas. Agregar
   una ciudad nueva (ej. Edmonton) es solo añadirla aquí. */
const DISTRIBUTION_CITIES = ["Calgary", "Brooks", "Airdrie", "Red Deer"];

/* Sin establecimientos reales todavía para la Edición #1 — Octubre
   2026. NO agregar negocios ni direcciones ficticias: cuando existan
   puntos de distribución reales, se agregan aquí como
   { city, name, address, website }. */
const DISTRIBUTION_POINTS = [];
