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
  monthLabel: "Septiembre",
  year: 2026,
  headline: "Lo que todo migrante necesita saber antes de terminar el año",
  cta: "Ver edición",
};

const BREAKING = [
  "Servicio de Ciudadanía e Inmigración amplía horarios de atención en Alberta — demo",
  "Nueva guía práctica para arrendar vivienda por primera vez en Canadá — demo",
  "Feria de empleo para nuevos residentes se realizará este mes en Calgary — demo",
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
    title: "Los cinco documentos que más retrasan un trámite migratorio, según asesores en Alberta",
    dek: "Asesores de inmigración identifican los errores más comunes que alargan meses un proceso que podría resolverse en semanas.",
    author: "Redacción El Podcast del Migrante",
    date: "12 de septiembre, 2026",
    image: "linear-gradient(135deg, #1c1c1c, #3a3a3a)",
    slug: "documentos-tramite-migratorio-alberta",
  },
  secondary: [
    {
      category: "Empleo",
      title: "Cinco certificaciones que abren puertas laborales rápido para recién llegados",
      date: "11 de septiembre",
      image: "linear-gradient(135deg, #232323, #4a4a4a)",
    },
    {
      category: "Vivienda",
      title: "Qué revisar antes de firmar tu primer contrato de arrendamiento",
      date: "10 de septiembre",
      image: "linear-gradient(135deg, #202020, #454545)",
    },
    {
      category: "Comunidad",
      title: "La red de comerciantes latinos que está creciendo en Brooks",
      date: "9 de septiembre",
      image: "linear-gradient(135deg, #1e1e1e, #424242)",
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
    title: "De ingeniera en Bogotá a supervisora de planta en Brooks: la historia de Marcela",
    excerpt: "Ocho años después de llegar sin hablar inglés, hoy lidera un equipo de doce personas. Esto es lo que aprendió en el camino.",
    image: "linear-gradient(135deg, #262626, #4d4d4d)",
  },
  {
    title: "Lo que nadie le contó a Andrés sobre el primer invierno canadiense",
    excerpt: "Una historia sobre frío, comunidad y la llamada que le cambió la perspectiva sobre pedir ayuda.",
    image: "linear-gradient(135deg, #202020, #464646)",
  },
  {
    title: "La cocina que conecta: cómo una familia venezolana construyó negocio y comunidad",
    excerpt: "Empezaron vendiendo arepas los domingos. Hoy surten a tres restaurantes en la región.",
    image: "linear-gradient(135deg, #1f1f1f, #454545)",
  },
];

const VIDEOS = [
  { tag: "Podcast del Migrante", title: "3 realidades que todo migrante en Canadá debe conocer" },
  { tag: "Entrevistas", title: "Entrevista: reconstruir una carrera profesional desde cero" },
  { tag: "Desafío 100 Empresas", title: "El emprendimiento que nació en un garaje de Calgary" },
  { tag: "Historias", title: "Documental corto: dos años, una nueva vida" },
  { tag: "Especiales", title: "Especial: guía completa de impuestos para nuevos residentes" },
];

const DESAFIO_100 = [
  { name: "Diana Restrepo", company: "Sabores del Sur Catering", headline: "De cocinar para amigos a surtir eventos corporativos en Calgary" },
  { name: "Julián Torres", company: "Torres Auto Detailing", headline: "Un servicio móvil de detallado que nació con un solo cliente" },
  { name: "Fernanda León", company: "León Digital Studio", headline: "Diseño gráfico para pequeños negocios latinos en las praderas" },
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

/* Meses de 2026: solo septiembre está activo (Edición 01, primer número).
   Los demás aparecen deshabilitados — no representan ediciones publicadas. */
const EDITION_MONTHS = [
  { label: "Ene", active: false },
  { label: "Feb", active: false },
  { label: "Mar", active: false },
  { label: "Abr", active: false },
  { label: "May", active: false },
  { label: "Jun", active: false },
  { label: "Jul", active: false },
  { label: "Ago", active: false },
  { label: "Sep", active: true },
  { label: "Oct", active: false },
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
   - name, specialty, bio
   - articlesNote: relación con los artículos que escribe
   - link: enlace a su perfil interno (futura página propia)
   - website: enlace externo/profesional (opcional)

   Carlos D. Castillo es un colaborador real aportado por el
   cliente — no se le atribuye biografía ni logros inventados,
   solo su nombre y especialidad confirmados.
========================================================= */
const CONTRIBUTORS = [
  {
    id: "carlos-castillo",
    photo: null,
    name: "Carlos D. Castillo",
    specialty: "Seguros y Finanzas",
    bio: "Perfil profesional — próximamente.",
    articlesNote: "Colabora con artículos de la sección Finanzas.",
    link: "#",
    website: "",
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
const DISTRIBUTION_POINTS = [
  { city: "Calgary", name: "Tienda demo — Calgary Centro", address: "Calle Demo 123, Calgary, AB", website: "#" },
  { city: "Calgary", name: "Café demo — Calgary Norte", address: "Avenida Demo 456, Calgary, AB", website: "" },
  { city: "Brooks", name: "Mercado demo — Brooks", address: "Calle Demo 789, Brooks, AB", website: "#" },
  { city: "Airdrie", name: "Panadería demo — Airdrie", address: "Calle Demo 321, Airdrie, AB", website: "" },
  { city: "Red Deer", name: "Restaurante demo — Red Deer", address: "Avenida Demo 654, Red Deer, AB", website: "#" },
];
