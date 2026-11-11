# Visibilidad del Directorio Empresarial en buscadores (Fase 1)

Documento interno (la carpeta `docs/` no se publica: responde 404).

## Qué hace el sitio

- **Miniwebs Premium (`/perfil-<slug>`).** El HTML inicial trae el contenido
  del perfil: nombre, cargo, ciudad, descripción, servicios activos, contactos
  y enlaces oficiales. También trae sus datos estructurados (JSON-LD,
  schema.org). Lo genera `scripts/build-profile-pages.mjs` con las mismas
  funciones que usa el navegador (`js/business-profile.js` → `contentHtml` y
  `structuredData`), así que el diseño no cambia. Con JavaScript, la página
  solo activa los botones, el video y la medición.
- **Directorio (`/quien-puede-ayudarte`).** El HTML inicial trae las tarjetas
  de todas las empresas publicadas (Premium y gratuitas) y un JSON-LD
  `CollectionPage` + `ItemList`. Los filtros siguen funcionando con
  JavaScript.
- **URL canónicas.** Son las direcciones limpias, sin `.html`. Cloudflare
  Pages redirige con 308 las que terminan en `.html`, así que los enlaces
  compartidos y los QR impresos siguen funcionando.
- **`sitemap.xml`.** Incluye el bloque «directorio-empresarial» con el
  directorio y cada miniweb publicada, y `<lastmod>` = `updatedAt` del
  registro.
  - No se incluyen borradores (`published: false`) ni fichas gratuitas, que
    no tienen página propia.
  - Una empresa retirada (borrada o `published: false`) desaparece del
    sitemap, del directorio y de su página al volver a ejecutar el generador.
- **`robots.txt`.** Permite todo salvo las carpetas internas. No tiene reglas
  por agente: la política sobre GPTBot y el entrenamiento de IA no se tocó.

## Reglas de los datos estructurados

- Solo datos del registro que el perfil ya publica.
- Nunca reseñas, puntuaciones, horarios, precios, certificaciones ni
  direcciones que no estén en el perfil.
- **Servicios:** solo los activos (`services` con `active: true`) y los de
  `serviceGroups`, tal como los entregó el profesional.
- **Provincias de servicio:** solo las de `serviceAreas`.
- **Con `representative`:** la entidad principal es la organización, y la
  persona figura como su representante.
- **`updatedAt`:** fecha real de la última modificación del registro.
  Actualízala cada vez que cambie el registro. Sin ella no se publica ninguna
  fecha. El generador rechaza las fechas inválidas o futuras.

Las pruebas automatizadas que lo verifican son
`tests/directorio-visibilidad.test.mjs` y `tests/e2e-directorio-visibilidad.cjs`.

## Comprobaciones manuales del propietario

Desde el repositorio no se puede ver ni comprobar nada de esto.

### Cloudflare (panel de podcastdelmigrante.com)

1. **AI Crawl Control** (o «Bots → AI bots», según la versión del panel):
   confirma que **OAI-SearchBot** (búsqueda de ChatGPT) figura como
   *permitido*. No cambies GPTBot (entrenamiento) sin una decisión editorial.
2. **Security → Bots:** si Bot Fight Mode o Super Bot Fight Mode están
   activos, confirma que los **bots verificados** (Googlebot, Bingbot,
   OAI-SearchBot) no reciben desafíos. No desactives la protección general.
3. **Security → WAF → reglas personalizadas y límites de tasa:** ninguna
   regla debe bloquear ni desafiar `/perfil-*`, `/quien-puede-ayudarte`,
   `/sitemap.xml` ni `/robots.txt`.
4. **Robots.txt administrado / Content Signals:** si está activo, abre
   `https://podcastdelmigrante.com/robots.txt` y comprueba qué añade
   Cloudflare antes de las reglas del sitio.
5. **Caching → Configuration → Crawler Hints:** opcional. Avisa a Bing y a
   otros buscadores (IndexNow) cuando cambia una página.
6. **AI Crawl Control → registro:** a los 7 y a los 30 días, revisa si hay
   visitas reales de OAI-SearchBot y Bingbot a los perfiles. Es la única
   comprobación real del acceso.
7. **Cloudflare Access:** debe proteger solo `admin.podcastdelmigrante.com`,
   nunca el dominio público.

### Google Search Console

1. Verifica la propiedad de `podcastdelmigrante.com` (por DNS, en
   Cloudflare).
2. **Sitemaps:** envía `https://podcastdelmigrante.com/sitemap.xml`.
3. **Inspección de URL:** pide la indexación del directorio y de las cuatro
   miniwebs. En «Ver página rastreada», comprueba que el HTML trae el
   contenido y el JSON-LD.
4. Pasa cada perfil por la **Prueba de resultados enriquecidos**. Se
   esperan breadcrumbs; ProfilePage puede no mostrar resultados enriquecidos
   y eso es normal.

### Bing Webmaster Tools

1. Agrega el sitio (puedes importarlo desde Search Console).
2. Envía el sitemap.
3. Usa la **Inspección de URL** con una miniweb.
4. Opcional: activa IndexNow o confía en Crawler Hints de Cloudflare.

## Qué no se promete

No se garantizan posiciones, recomendaciones ni apariciones en ChatGPT,
Google, Bing ni en ningún otro buscador. Cada plataforma decide qué muestra.
