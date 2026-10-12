# Publicación en Cloudflare Pages: solo la carpeta `dist/`

Hasta ahora Cloudflare Pages publicaba **la raíz del repositorio** (`.`), así
que todo archivo del repositorio tenía una URL: borradores (`docs/`),
migraciones (`db/`), configuración del panel (`admin-worker/`), pruebas y
scripts. El bloqueo por rutas (`functions/_middleware.js` + `_routes.json`)
se podía esquivar con variantes de la URL (`//docs/…`, `/%64ocs/…`,
`/docs%2F…`).

La solución es publicar una carpeta generada, `dist/`, que solo contiene la
**lista de permitidos** de `scripts/build-public.mjs`:

| Se publica | No se publica |
|---|---|
| Páginas `*.html` de la raíz (incluida `404.html`) | `docs/`, `db/`, `admin-worker/`, `functions/` (código), `scripts/`, `tests/`, `.github/` |
| `assets/` (imágenes, PDF, tipografías y sus licencias) | `assets/originals/` (originales que el sitio no usa) |
| `css/`, `js/`, `vcard/`, `guia-carlos/` | Cualquier `.md`, `.sql`, `.toml`, `.py`, `.mjs`, `.yml`, archivos ocultos, `CNAME`, `LICENSE` |
| `_routes.json`, `robots.txt`, `sitemap.xml` | Todo lo que no esté en la lista |

El script **falla** (y Pages no publica) si encuentra en `dist/`:
- marcas de borrador (`[PENDIENTE]`, `[VERIFICAR]`…);
- SQL o configuración interna;
- formatos de clave secreta;
- una referencia a un archivo que no se copió;
- una URL del sitemap que no existe.

**Las Functions no cambian.** Pages las compila desde la carpeta
`functions/` de la raíz del proyecto, no desde la carpeta de salida, y lee
`_routes.json` desde `dist/`. Así siguen funcionando `/registro/*` y
`/articulo`.

## Cambios en Cloudflare Pages (los hace el administrador)

Workers & Pages → `podcastdelmigrante` → Settings → **Build** → Build
configuration → Edit:

| Campo | Antes | Después |
|---|---|---|
| Framework preset | None | None |
| Build command | *(vacío)* | `node scripts/build-public.mjs` |
| Build output directory | `/` o `.` | `dist` |
| Root directory | *(vacío)* | *(vacío, sin cambios)* |

No se toca nada más: ni variables, ni secretos, ni bindings, ni dominios.

### Orden seguro

1. **Fusionar primero el PR que trae `scripts/build-public.mjs`.**
   - Con la configuración actual no cambia nada visible, porque Pages
     todavía publica la raíz.
2. **Cambiar la configuración de Build** como en la tabla.
   - No dispara un despliegue por sí solo.
3. **Deployments → último despliegue de Production → Retry deployment.**
   - En el registro de la compilación debe verse
     `dist/ lista: N archivos públicos`.
   - Si el script falla, Pages **no** reemplaza la versión publicada.
4. **Comprobar:**
   - deben responder 404 (o, sin `404.html`, la portada, nunca el archivo):
     - `https://podcastdelmigrante.com/docs/legal/01-privacidad.md`
     - `https://podcastdelmigrante.com//docs/legal/01-privacidad.md`
     - `https://podcastdelmigrante.com/%64ocs/legal/01-privacidad.md`
     - `https://podcastdelmigrante.com/admin-worker/wrangler.toml`
   - deben funcionar con normalidad:
     - la portada, una noticia y una miniweb;
     - `/articulo?slug=…` (301);
     - `/registro/config`.

### Volver atrás

Cualquiera de estas dos opciones (inmediatas):
- **Deployments** → despliegue anterior → *Rollback to this deployment*.
- Devolver Build command a vacío y Build output directory a `/`, y volver a
  desplegar.

## Añadir algo nuevo al sitio

Si una página nueva usa un tipo de archivo o una carpeta que no está en la
lista, el script lo indica («falta …») y la compilación falla. Hay que
añadirlo a propósito en `scripts/build-public.mjs`.

Prueba local:
```
node scripts/build-public.mjs
```
