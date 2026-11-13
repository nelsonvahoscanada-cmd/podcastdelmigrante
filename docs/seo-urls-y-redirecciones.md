# URL definitivas, redirecciones y 404 reales

Este documento recoge las correcciones de la auditoría de Search Console de noviembre de 2026. Search Console mostraba estos problemas:
- 38 URL en «Página con redirección».
- 2 URL con «Soft 404».
- 2 URL con «No encontrado (404)».

## Regla: enlazar siempre la URL final

Cloudflare Pages sirve cada página sin `.html` y redirige con un 308 la variante con extensión:
- `/index.html` → `/`
- `/guia.html?categoria=…` → `/guia?categoria=…`
- `/registra-tu-empresa.html` → `/registra-tu-empresa`

Google registra esas URL como «Página con redirección». Los enlaces del sitio deben apuntar directamente a la URL final:

| Contenido | URL que se enlaza |
|---|---|
| Portada y sus secciones | `/`, `/#historias`, `/#quien-puede-ayudarte`… |
| Noticia publicada | `/articulo-<slug>` (en JavaScript: `PDM.urlArticulo(slug)` de `js/nav.js`) |
| Noticia en borrador | `/articulo?slug=<slug>` (la plantilla muestra «próximamente») |
| Guía, ruta y subruta | `/guia?categoria=…`, `/guia-ruta?ruta=…`, `/guia-ruta?subruta=…` |
| Historias | `/historia?slug=…` (Desafío), `/historia-vida?slug=…` |
| Columna | `/columna?slug=…` |
| Colaborador | `/colaborador-<id>` (página estática) |
| Perfil empresarial | `/perfil-<slug>` |

Se aplica así:
- `scripts/enlaces-definitivos.mjs` corrige la cabecera y el pie que `build-desafio.mjs` y `build-ediciones.mjs` copian de `404.html`.
- `js/article.js` corrige, al mostrar el artículo, los enlaces internos escritos con `.html` dentro del texto (por ejemplo, los recuadros de patrocinio) y el enlace al perfil del autor. El texto de `js/articles.js` no se modifica.
- `tests/seo-redirecciones.test.mjs` falla si una página pública vuelve a enlazar una URL con `.html`.

Excepciones pendientes, que necesitan autorización:
- **Canadá en Datos** (4.193 páginas). Su cabecera y su pie siguen enlazando `/index.html`, `/guia.html?categoria=migracion` y `/quien-puede-ayudarte.html`. Corregirlo exige regenerar todas sus páginas; solo cambiarían esos tres enlaces y no su `noindex`.
- **`404.html`**: su cabecera es la que copia Canadá en Datos.

Las redirecciones antiguas se conservan:
- `/articulo?slug=X` y `/articulo.html?slug=X` → 301 a `/articulo-X`.
- `x.html` → 308 a `/x`.

Así, los enlaces ya compartidos siguen funcionando.

## Canónicas

La canónica de cada página es su URL final con respuesta 200. Nunca debe apuntar a una variante con `.html`:
- Guías y rutas: `js/guia.js` y `js/guia-ruta.js`.
- Historias: `js/desafio-story.js` y `js/life-story.js`.
- Registro de empresas: `registra-tu-empresa.html`.

## 404 reales en las plantillas (sin soft 404)

Estas plantillas se arman con JavaScript según el parámetro de la URL:
- `articulo` (`slug`)
- `guia` (`categoria`)
- `guia-ruta` (`ruta` o `subruta`)
- `historia` (`slug`)
- `historia-vida` (`slug`)
- `columna` (`slug`)
- `colaborador` (`id`)
- `business-profile` (`slug`)

Si el parámetro falta o no existe, `functions/_middleware.js` responde **404** con el contenido de `404.html`. Con un parámetro válido, la página se sirve como siempre. La lista de valores válidos está en `functions/_lib/rutas-validas.js` y la genera `scripts/build-rutas-validas.mjs`, con los mismos criterios que el JavaScript de cada plantilla.

**Al publicar contenido nuevo:**
- `node scripts/build-article-pages.mjs` (el paso de siempre al publicar una noticia) ya actualiza la lista.
- Si se agrega una guía, ruta, historia, columna, colaborador o perfil sin publicar una noticia, ejecuta `node scripts/build-rutas-validas.mjs`.
- Si la lista no está al día, fallan las comprobaciones obligatorias `test` y `articulos-vistas-previas`, y el PR no se puede fusionar. Así una página válida no puede quedar respondiendo 404.

`_routes.json` limita la función a esas rutas (con y sin `.html`). El resto del sitio sigue sirviéndose como archivo estático.
