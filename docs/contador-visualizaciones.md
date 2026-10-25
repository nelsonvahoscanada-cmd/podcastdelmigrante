# Contador público de visualizaciones

Noticias y guías de El Podcast del Migrante Magazine.
Documento técnico interno: `docs/` no se publica en el sitio y responde 404.

| Dato | Valor |
|---|---|
| Estado | Implementado en el PR del contador. **Inicio real de la medición: se fija solo con el primer conteo en producción** (`vistas_config.inicio`) y se anota aquí después de la activación |
| Cobertura | `contentType` «Noticia» o «Guía», publicadas (`draft` no verdadero y `demo` distinto de `true`). Hoy: **18 noticias + 8 guías = 26** |
| Fuera del contador | Entrevistas que no son Noticia, columnas, historias, miniwebs, portada |
| Infraestructura | Pages Function `/api/vistas/*` + D1 **independiente** `podcastdelmigrante-vistas` |
| No toca | `js/analytics.js`, `/api/events`, el Worker `podcastdelmigrante-analytics`, la D1 `podcastdelmigrante-analytics`, el panel (`admin-worker/`) |

---

## 1. Arquitectura

```
Página de noticia o guía (articulo-<slug>.html)
  js/article.js  → deja en la línea de fecha un hueco oculto:
                   <span class="article-views" data-vistas-id="ART-…" data-publicado="…" hidden>
  js/vistas.js   → (solo en podcastdelmigrante.com)
     1. reserva el espacio, invisible, en la misma tarea en que se dibuja la noticia (sin saltos);
     2. GET  /api/vistas/ART-…  → { id, vistas, inicio }   (caché 60 s en el borde, 30 s en el navegador);
     3. muestra «· 👁 1.248 visualizaciones [desde el 25 oct. 2026]»;
     4. tras 5 s con la pestaña visible: POST /api/vistas/ART-…  { "id": "ART-…" }
        (una vez por noticia cada 30 min en esa pestaña: sessionStorage «pdm_vistas»).
          ↓
functions/api/vistas/[id].js  →  functions/_lib/vistas.js
          ↓
D1 podcastdelmigrante-vistas (binding VISTAS_DB, SOLO en Producción)
```

**Archivos:**

| Archivo | Papel |
|---|---|
| `functions/_lib/vistas.js` | Validación, filtros, deduplicación y SQL (`leerVistas`, `registrarVista`) |
| `functions/api/vistas/[id].js` | Rutas GET y POST de la Pages Function (otros métodos: 405) |
| `functions/_lib/published-articles.js` | **Generado.** `ARTICULOS_CON_CONTADOR`: lista de identificadores permitidos |
| `scripts/build-article-pages.mjs` | Genera esa lista; misma regla `tieneContador` que `js/article.js` |
| `js/article.js` | `viewsSlotHtml()`: el hueco en `metaLineHtml()` |
| `js/vistas.js` | Cliente: reserva, lectura, presentación y registro |
| `css/article.css` | `.article-views*` (verde oscuro de la marca, contraste 5,1:1) |
| `articulo.html` | Plantilla: carga `js/vistas.js` después de `js/article.js` |
| `_routes.json` | Incluye `/api/vistas/*` (solo esa ruta ejecuta la función) |
| `db/vistas/0001_vistas.sql` | Esquema de la base |
| `tests/vistas.test.mjs`, `tests/e2e-vistas.cjs` | Pruebas |
| `privacidad.html` (3 a), `cookies.html` (tabla y apartado 3) | Información al público |

## 2. Base de datos (`db/vistas/0001_vistas.sql`)

| Tabla | Contenido |
|---|---|
| `vistas_total (article_id PK, vistas, actualizado)` | Total público por artículo |
| `vistas_dia (dia, article_id, vistas)` PK (`dia`, `article_id`) | Serie diaria en hora de Alberta, para verificar los totales y para el Centro de Inteligencia Editorial |
| `vistas_reciente (huella PK, grupo, expira)` | Anti-duplicados de vida corta. `huella` = SHA-256(sal secreta + día + IP + navegador + artículo); `grupo` = lo mismo sin el artículo, para el límite de frecuencia. Vence a los 30 min; las filas vencidas se borran en cada registro |
| `vistas_config (clave PK, valor)` | `inicio`: fecha y hora real del primer conteo (se fija una sola vez) |

- No hay columnas de IP, navegador, cookies ni identificadores persistentes.
- Cada visualización contada escribe unas 3 filas.
- La lectura pública es una sola consulta de dos subconsultas por clave primaria.

## 3. Reglas de conteo

Se suma **1** solo si se cumplen **todas** estas condiciones:

1. **Pieza válida:** el identificador `ART-AAAA-NNN` está en `ARTICULOS_CON_CONTADOR` (noticias y guías publicadas). Otro identificador → 404, sin escritura.
2. **Dominio oficial:** `podcastdelmigrante.com`. Las vistas previas (`*.pages.dev`) y otros dominios → 403. Además:
   - el navegador ni siquiera consulta fuera del dominio oficial;
   - la base solo está vinculada al entorno de Producción.
3. **Petición del propio sitio:** `Origin` igual al del sitio; `Sec-Fetch-Site: same-origin` si el navegador lo envía; `Content-Type: application/json`; cuerpo de 256 bytes como máximo, con `{"id": <el mismo identificador>}`.
4. **Persona, no robot:**
   - el User-Agent debe empezar por `Mozilla/` y no coincidir con la lista de robots (Googlebot, Bingbot, `facebookexternalhit`, WhatsApp, LinkedInBot, Twitterbot, HeadlessChrome, curl, python…);
   - Cloudflare no debe marcarlo como robot verificado (`cf.verifiedBotCategory`);
   - en el navegador: `navigator.webdriver` falso.

   Los navegadores integrados de Facebook, Instagram, TikTok y LinkedIn **sí** cuentan.
5. **Atención real:** 5 segundos con la pestaña visible. El tiempo en segundo plano no cuenta, y las páginas pre-renderizadas esperan a mostrarse.
6. **Sin duplicados:**
   - en el navegador, una vez por noticia cada 30 min (`sessionStorage`);
   - en el servidor, una vez por huella (navegador + IP + artículo + día) cada 30 min.
7. **Límite de frecuencia:** como máximo 20 piezas distintas por navegador cada 30 min (429).
8. **Nadie fija el valor:** el servidor solo hace `vistas = vistas + 1` e ignora cualquier número enviado.

**Presentación:**
- miles con punto («1.248»); singular «1 visualización»;
- las piezas publicadas antes del `inicio` muestran «… desde el [fecha de inicio]»;
- si el servicio no responde, no se muestra nada y la noticia se lee igual.

## 4. Limitaciones conocidas (declaradas al público en la Política de privacidad)

- Son **visualizaciones**, no personas únicas ni lecturas completas. Sin cuentas ni identificación persistente, la deduplicación es **aproximada**:
  - la misma persona vuelve a contar tras 30 minutos, desde otro navegador o dispositivo, o al cambiar el día;
  - varias personas tras la misma IP y con el mismo navegador pueden contarse como una dentro de esos 30 minutos.
- No cuenta a quien bloquea JavaScript ni a quien sale antes de 5 segundos.
- No cuenta las vistas previas de enlaces de las redes, que son robots.
- La lista de robots no es exhaustiva. Un ataque con muchas IP y navegadores distintos puede inflar cifras: se puede **detectar** con picos en `vistas_dia`, pero no impedir del todo.
- Las visualizaciones que ocurran mientras el servicio esté caído no se recuperan.
- La cifra mostrada puede tardar hasta 60 segundos en reflejar las últimas visitas (caché).
- **No hay cifras anteriores al inicio:** las páginas de noticias nunca registraron visitas antes de este contador.
- Las huellas vencidas se eliminan con el siguiente registro. Sin tráfico, una huella vencida puede quedar hasta la siguiente visita a cualquier noticia (no contiene la IP).

## 5. Integración automática de noticias y guías futuras

Publicar una noticia o guía nueva no requiere configuración:
1. Se añade la entrada en `js/articles.js` (con su `id` `ART-AAAA-NNN`, `contentType` «Noticia» o «Guía»).
2. `node scripts/build-article-pages.mjs` (paso habitual) genera su página y la añade a `ARTICULOS_CON_CONTADOR`. El chequeo «Artículos: vistas previas» de GitHub falla si se olvida.
3. Al publicarse, la Function la acepta y la página muestra el contador desde 0.

El generador falla si una pieza con contador no tiene un `id` válido o si un `id` está repetido.

## 6. Configuración en Cloudflare (una sola vez, la hace el titular)

**No escribas el valor del secreto en el chat ni en ningún archivo.**

1. **Crear la base**
   - Cloudflare → *Storage & Databases* → *D1 SQL Database* → **Create**.
   - Nombre: `podcastdelmigrante-vistas`. Ubicación: automática.
   - **No** usar `podcastdelmigrante-analytics` ni `podcastdelmigrante-directorio`.
2. **Crear las tablas**
   - En la base nueva → *Console*.
   - Pegar el contenido completo de `db/vistas/0001_vistas.sql` → **Execute**.
   - Comprobar en *Tables* que existen `vistas_total`, `vistas_dia`, `vistas_reciente` y `vistas_config`.
3. **Vincular la base al sitio, solo en Producción**
   - *Workers & Pages* → proyecto **podcastdelmigrante** (Pages) → *Settings* → *Bindings* → con el selector de entorno en **Production** → **Add** → *D1 database*.
   - Variable name: `VISTAS_DB`. D1 database: `podcastdelmigrante-vistas` → *Save*.
   - **No** añadirla en *Preview*.
4. **Crear la sal secreta, solo en Producción**
   - Mismo proyecto → *Settings* → *Variables and Secrets* → entorno **Production** → **Add**.
   - Type: **Secret**. Name: `VISTAS_SAL`.
   - Value: una cadena aleatoria larga (40 caracteres o más), por ejemplo generada por un gestor de contraseñas. No hace falta guardarla en otro lugar.
   - *Save*.
5. **Aplicar**
   - Los cambios de vínculos y variables se aplican en el **siguiente despliegue de producción**.
   - Si la configuración se hace después de publicar el código: *Deployments* → último despliegue de producción → **Retry deployment**.

Todo esto entra en el plan gratuito de Cloudflare (D1 y Pages Functions). No activa servicios de pago.

## 7. Verificación después de activar

1. `https://podcastdelmigrante.com/api/vistas/ART-2026-029` responde 200 con `{"id":"ART-2026-029","vistas":N,"inicio":…}`.
2. Abrir una noticia en el celular, esperar más de 5 segundos y, en la consola de D1, ejecutar `SELECT * FROM vistas_total;`: debe sumar 1.
3. En una vista previa (`*.pages.dev`), la noticia no muestra contador y no aparecen filas nuevas.
4. Anotar en este documento la fecha real de inicio (`SELECT valor FROM vistas_config WHERE clave = 'inicio';`).

## 8. Respaldo y recuperación

- **Time Travel de D1** (automático): restauración a cualquier minuto de los últimos 7 días (plan gratuito) o 30 días (plan de pago). D1 → base → *Time Travel*.
- **Reconstrucción:** `vistas_total` se puede recalcular desde la serie diaria:
  ```sql
  SELECT article_id, SUM(vistas) FROM vistas_dia GROUP BY article_id;
  ```
- **Exportación periódica:** pendiente, dentro de la prioridad general de copias de seguridad (revisión del 25-10-2026).
  - Hasta entonces, una copia manual: consola de D1, `SELECT * FROM vistas_dia;` y descargar el resultado.
- **Corregir una cifra** (por ejemplo, tras detectar abuso): `UPDATE vistas_total SET vistas = ? WHERE article_id = ?;` en la consola. Dejar constancia aquí de la fecha, el artículo, el valor anterior, el nuevo y el motivo.

## 9. Cómo revertir

De menor a mayor alcance:

1. **Apagar el contador sin desplegar código:** quitar el vínculo `VISTAS_DB` en *Settings → Bindings* (Production) y hacer *Retry deployment*.
   - La Function responde 503 y las páginas no muestran contador.
   - Las noticias siguen funcionando.
   - Los datos quedan intactos en D1.
2. **Volver a la versión anterior del sitio:** *Workers & Pages* → podcastdelmigrante → *Deployments* → despliegue de producción anterior → **Rollback to this deployment**. Es inmediato y no borra datos.
3. **Revertir el código:** PR con `git revert` del commit del contador en `main`.
4. **Datos:** la base es independiente; borrarla (D1 → base → *Delete*) no afecta a nada más.

Las estadísticas de las miniwebs (`/api/events`, `podcastdelmigrante-analytics`) y el panel no dependen de nada de esto.

## 10. Pruebas

| Prueba | Qué comprueba |
|---|---|
| `tests/vistas.test.mjs` (14 pruebas, D1 simulada con SQLite) | Cobertura exacta 18 + 8; regla igual en generador y cliente; el HTML de las redes sin cambios; conteo y fecha de inicio; 30 minutos; vistas previas, dominios e identificadores inexistentes; robots y navegadores de apps; manipulación (origen, tipo, tamaño, cuerpo, número enviado, métodos); límite de frecuencia; privacidad (sin IP ni navegador guardados, vencimiento de huellas); día de Alberta; fallos de D1 y de configuración; las rutas de la Function |
| `tests/e2e-vistas.cjs` (Pages local + D1 local) | Computador, tableta y celular: posición y formato; ícono oculto a lectores de pantalla; color; 5 s visibles; recarga sin suma; el servidor sumó 1 (lectura de la base local); sin desplazamientos (CLS posterior al contador < 0,01) ni desborde; guía; deduplicación en el servidor con el navegador borrado; pestaña oculta; Googlebot; `navigator.webdriver`; sin contador en entrevistas, columnas ni portada (y Santa Latino sigue primero); servicio caído o con error 503 |
| `tests/pages-function.test.mjs` | `_routes.json` incluye `/api/vistas/*` |

Cómo ejecutar la prueba en navegador, en local:
1. `node scripts/build-public.mjs --out=<dir>/dist`.
2. En `<dir>`:
   - un enlace `functions` → `functions/` del repositorio;
   - un `wrangler.toml` de pruebas con `pages_build_output_dir = "./dist"`, la D1 local `VISTAS_DB` y `[vars] VISTAS_PRUEBAS_LOCAL = "1"`, `VISTAS_SAL = "<cualquier texto>"`.
3. `npx wrangler d1 execute <nombre> --local --file db/vistas/0001_vistas.sql`.
4. `npx wrangler pages dev --port 8891`.
5. `BASE=http://127.0.0.1:8891 VISTAS_SQLITE=<dir>/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<archivo>.sqlite node tests/e2e-vistas.cjs`.

`VISTAS_PRUEBAS_LOCAL` solo habilita `127.0.0.1` y `localhost`, que no existen en Cloudflare; **nunca** se configura en producción.

## 11. Integración con el Centro de Inteligencia Editorial

- `vistas_dia` da la serie diaria por artículo en hora de Alberta: vistas por día, semana, mes, año, rankings, y comparaciones por categoría, tipo o autor (uniendo `article_id` con `js/articles.js`).
- El panel (`admin-worker`) podrá leerla añadiendo un segundo vínculo de **solo lectura** a `podcastdelmigrante-vistas`, como ya hace con `DIRECTORIO_DB`, y consultas agregadas con el mismo patrón de `admin-worker/src/stats.js`. No hay que migrar datos.
- Las métricas más ricas (tiempo activo, profundidad de lectura, fuentes de tráfico, reproducciones) son fases posteriores del Centro y no cambian el contador público.
