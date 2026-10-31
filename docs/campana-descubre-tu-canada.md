# Campaña «Descubre tu Canadá» — Canadá en Datos

Documento técnico interno. `docs/` no se publica en el sitio y responde 404.
Estado: **PR en borrador, sin publicar.** Fecha: 31-10-2026.

> Tu próxima oportunidad puede estar en una ciudad que todavía no conoces.
> El Podcast del Migrante — Conectando latinos, construyendo futuro.

La campaña da visibilidad a una herramienta que ya existe. No promete empleo,
vivienda ni residencia: ofrece información y enlaces a recursos oficiales.

---

## 1. Módulo de la portada

| | |
|---|---|
| Ubicación | Tercera sección de la portada: después del hero (noticia principal y secundarias) y de «Últimas noticias»; antes de «Información útil para migrantes» |
| Por qué ahí | No toca el hero ni el orden editorial; es lo primero que aparece al terminar de leer las noticias. En el celular (390 px) empieza a unos 2,450 px del inicio (unas tres pantallas) |
| Alternativa (si se prefiere más arriba) | Justo después del hero (a unos 1,470 px en el celular), antes de «Últimas noticias». No cambia el orden de las noticias, pero baja «Últimas noticias» unos 1,300 px en el celular. Es un cambio de una línea |
| Botón | «Explorar Canadá en Datos» → `/canada-en-datos/` (ruta real) |
| Archivos | `index.html` (sección), `css/styles.css` (estilos `.descubre*`), `js/descubre-canada.js`, `js/canada-datos-disponibles.js` (generado), `assets/canada-en-datos/descubre-mapa.svg` (generado) |
| Peso | 35 KB en total (mapa SVG 31 KB con carga diferida, 2 scripts de 1-2 KB). Sin dependencias nuevas, sin animaciones |

### Detección automática de las provincias publicadas

La fuente única es `CD_REGIONS` en `js/canada-datos.js`: una región está
publicada cuando tiene `profile` (su ficha). Es la misma regla que ya pinta el
mapa de `/canada-en-datos/` y genera las páginas de cada provincia.

`node scripts/build-canada-datos.mjs` (el mismo paso que se ejecuta al publicar
una provincia) escribe, a partir de `CD_REGIONS`:

- `js/canada-datos-disponibles.js` → `window.CD_DISPONIBLES` con las 13 regiones,
  el total, las disponibles y la URL de cada guía (o `null`);
- `assets/canada-en-datos/descubre-mapa.svg` → el mapa del módulo, con las
  regiones publicadas en verde.

`js/descubre-canada.js` lee esos datos y escribe el contador («7 de 13
provincias y territorios ya disponibles»), los enlaces a las guías publicadas
y la línea «Próximamente», sin enlaces. En el HTML de la portada no hay ningún
número ni nombre de provincia escrito a mano (lo comprueba una prueba).

Al publicar Nueva Escocia, Nuevo Brunswick, Terranova y Labrador, Yukón,
Territorios del Noroeste o Nunavut no hay que editar el módulo: al regenerar,
la región pasa sola a «disponible». Si alguien olvida regenerar, las pruebas
unitarias fallan (los archivos generados deben coincidir con `CD_REGIONS`).
Sin JavaScript, el módulo muestra el botón principal y el mapa.

### Mejoras pequeñas en `/canada-en-datos/`

- Línea nueva bajo la introducción, calculada al generar: «**7 de 13** provincias y
  territorios con guía completa. Cómo empezar: elige una región en el mapa o
  en la lista; en las que tienen guía, abre la ficha y busca tu ciudad o
  localidad.»
- No se rediseñó nada ni se tocaron las fichas provinciales: las regiones sin
  guía siguen mostrando «Ficha completa: próximamente», sin enlaces.

---

## 2. Compartir en redes y medición con UTM

### Metadatos de `/canada-en-datos/` (revisados)

- `og:title`/`twitter:title`: «Canadá en Datos: provincias y territorios de Canadá — El Podcast del Migrante».
- `og:description`/`twitter:description` (nueva): «Herramienta gratuita y en español para
  descubrir Canadá: mapa de las 10 provincias y los 3 territorios, ciudades y
  localidades, hora local e información oficial para inmigrantes. Guías
  completas: …» (la lista sale de `CD_REGIONS`).
- Imagen 1200 × 630 (`social-canada-en-datos.jpg`), regenerada con «Canadá en
  Datos · Descubre tu Canadá» y «Herramienta gratuita y en español, con datos
  oficiales para inmigrantes». `twitter:card` = `summary_large_image`.
- `og:url` y `canonical` = `https://podcastdelmigrante.com/canada-en-datos/`.
  Por eso los enlaces con `?utm_…` no crean páginas duplicadas en los buscadores.

### Enlaces listos para usar

Formato: `https://podcastdelmigrante.com/canada-en-datos/?utm_source=<red>&utm_medium=<medio>&utm_campaign=descubre-tu-canada&utm_content=<pieza>`

| Canal | Enlace |
|---|---|
| TikTok (biografía) | `https://podcastdelmigrante.com/canada-en-datos/?utm_source=tiktok&utm_medium=social&utm_campaign=descubre-tu-canada&utm_content=bio` |
| TikTok (video) | `…?utm_source=tiktok&utm_medium=social&utm_campaign=descubre-tu-canada&utm_content=video-AAAAMMDD` |
| Facebook (publicación) | `…?utm_source=facebook&utm_medium=social&utm_campaign=descubre-tu-canada&utm_content=post-AAAAMMDD` |
| WhatsApp (mensaje o estado) | `…?utm_source=whatsapp&utm_medium=mensaje&utm_campaign=descubre-tu-canada&utm_content=difusion` |
| Transmisión en vivo | `…?utm_source=live&utm_medium=podcast&utm_campaign=descubre-tu-canada&utm_content=ep-NN` |
| Magazine digital | `…?utm_source=magazine&utm_medium=edicion&utm_campaign=descubre-tu-canada&utm_content=AAAA-MM` |
| Provincia concreta | Igual, cambiando la ruta: `/canada-en-datos/quebec?utm_source=…` |

Reglas: todo en minúsculas y sin espacios, nunca datos personales en los
parámetros, y nunca UTM en enlaces internos del sitio (el botón de la portada
no lleva UTM). Las redirecciones del sitio conservan los parámetros
(`functions/_middleware.js`).

Textos sugeridos para compartir:
- «¿En qué ciudad de Canadá está tu próxima oportunidad? Explora provincias y
  ciudades, con empleo, vivienda, clima y servicios. Gratis y en español.»
- «Descubre tu Canadá: 7 provincias ya disponibles en Canadá en Datos.» (el
  número debe revisarse antes de publicar cada pieza).

**Importante:** hoy estos UTM **no se registran en ningún lado** para Canadá en
Datos (ver la sección 4). Sirven desde ya para el día en que se active la
medición, y las redes muestran sus propios clics.

---

## 3. Propuesta: Canadá en Datos dentro de las noticias (no implementada)

Pendiente de aprobación editorial. No se agregó a ningún artículo.

**Texto:** «¿Quieres conocer mejor esta provincia? Explora sus ciudades,
recursos de empleo, vivienda y servicios en Canadá en Datos.» Botón: «Explorar
la provincia».

**Criterios propuestos (se aplican solos con los datos que ya tiene cada artículo):**
1. Solo para `contentType` «Noticia» o «Guía» publicadas (no columnas,
   entrevistas, historias de vida ni contenido de patrocinadores).
2. Solo si la categoría es Empleo, Empleo en Alberta, Vivienda, Finanzas,
   Migración, Inmigración, Educación, Salud, «Canadá» o una provincia (p. ej.,
   «Alberta»). Quedan fuera, por ahora, «Comunidad» y las demás.
3. Destino: si `location.province` tiene guía publicada (según
   `CD_DISPONIBLES`), el botón lleva a esa provincia; si el artículo es
   nacional (`province: null`) o la provincia no tiene guía, lleva a
   `/canada-en-datos/` con el texto «Explorar Canadá en Datos», sin sugerir que
   la provincia ya está disponible.
4. Ubicación: un solo recuadro al final del cuerpo, antes de «Fuentes» y de las
   noticias relacionadas; nunca dentro del texto, en el hero ni junto a
   llamados a la acción del propio artículo (p. ej., «Postularme…»).
5. Exclusión manual: un campo `canadaEnDatos: false` en `js/articles.js` para
   casos sensibles.

Con los artículos de hoy (32 en `js/articles.js`): 28 noticias y guías
publicadas; con estos criterios, 24 mostrarían el recuadro: 12 hacia la guía de
Alberta y 12 (nacionales) hacia la portada de Canadá en Datos.

Implementación prevista (cuando se apruebe): en `js/article.js`, sin tocar el
texto de los artículos, con una prueba que verifique los destinos.

---

## 4. Diagnóstico del sistema de estadísticas (solo lectura)

No se modificaron el Worker, D1 ni el panel.

| Sistema | Qué mide | Dónde | ¿Cubre Canadá en Datos? |
|---|---|---|---|
| Eventos de las miniwebs | `profile_view` y clics (WhatsApp, llamada, web, redes, video, cómo llegar…) por empresa (`business_id`), con `utm_*`, dominio de origen y tipo de dispositivo | `js/analytics.js` → `POST /api/events` → Worker `podcastdelmigrante-analytics` (fuera de este repositorio) → D1 `podcastdelmigrante-analytics`, tabla `events` | **No.** Solo se carga en las miniwebs y en el directorio |
| Contador público de visualizaciones | Vistas por noticia o guía (`ART-…`), total y serie diaria; deduplicación con huella diaria con sal (sin IP ni cookies) | `js/vistas.js` → Pages Function `/api/vistas/*` → D1 `podcastdelmigrante-vistas` | **No.** Solo noticias y guías |
| Panel privado | Reportes mensuales por empresa (solo `SELECT` agregados) y solicitudes del directorio | `admin.podcastdelmigrante.com` (Worker `podcastdelmigrante-admin`, Cloudflare Access + JWT + lista de correos) | **No** |
| Analítica general del sitio | — | No hay Google Analytics, Tag Manager ni Cloudflare Web Analytics en las páginas | — |

**Métricas pedidas y su estado actual**

| # | Métrica | Hoy | Qué haría falta |
|---|---|---|---|
| 1 | Visitas a Canadá en Datos | No se mide | Ver propuesta A o B |
| 2 | Provincias más consultadas | No se mide | Conteo por página de provincia |
| 3 | Ciudades y localidades más buscadas | No se mide | Conteo de fichas abiertas (no del texto escrito en el buscador) |
| 4 | Clics en el módulo de portada | No se mide; el botón y los enlaces ya llevan `data-descubre` | Un evento al hacer clic |
| 5 | Clics desde noticias | No existe aún el recuadro | Igual que el 4, con `data-descubre="articulo"` |
| 6 | Origen desde redes | Los UTM se preparan, pero no se guardan | Guardar `utm_source/medium/campaign` agregados |
| 7 | Celular o computador | No se mide | Tipo de dispositivo (móvil/tableta/escritorio), sin huella del navegador |

**Propuesta técnica (requiere autorización; no está en este PR)**

- **A. Cloudflare Web Analytics** (sin cookies, sin código propio): se activa
  desde el panel de Cloudflare Pages. Da visitas por página, origen y
  dispositivo para todo el sitio. Es lo más rápido para las métricas 1, 2, 6 y 7.
  No guarda consultas ni perfiles.
- **B. Conteo propio, agregado y anónimo**, con el mismo diseño que el contador
  de noticias: una Pages Function nueva (p. ej., `/api/cd/*`) y una D1 o tabla
  separada con filas **solo agregadas por día** (`dia, ruta, evento, origen,
  dispositivo, n`). Sin IP, sin cookies, sin texto del buscador, sin
  identificador del visitante. Cubre 1-7 y se puede mostrar en el panel con
  una pestaña de solo lectura.
- Recomendación: A ahora (no toca código) y B solo si se necesitan las
  métricas 3-5 en el panel.

---

## 5. Pruebas

- `tests/descubre-canada.test.mjs` (7 pruebas): textos, botón a la ruta real,
  ningún número ni provincia escritos a mano, datos generados al día,
  actualización automática (simula la publicación de Nueva Escocia),
  «Próximamente» sin enlaces, sin datos solo queda el botón, ubicación y
  secciones de la portada sin cambios.
- `tests/e2e-descubre-canada.cjs` (computador, tableta y celular): contador y
  enlaces desde los datos, páginas destino 200, recorrido portada → Canadá en
  Datos → Quebec → Montreal → enlace oficial, Nueva Escocia sin enlace, hero y
  noticias en el mismo orden que la portada sin el módulo, contraste ≥ 4.5:1,
  objetivos táctiles ≥ 40 px, foco visible con teclado, sin desplazamiento
  horizontal, sin errores, módulo < 45 KB.
