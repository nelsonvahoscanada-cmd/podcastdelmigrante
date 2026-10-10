# Directorio Empresarial — solicitudes: puesta en marcha

Flujo: **formulario → `/registro/enviar` (Pages Function) → D1 + R2 → correos
(Resend) → panel privado → aprobación del empresario → Pull Request manual →
perfil publicado.** Nada se publica automáticamente.

El formulario está **cerrado por defecto**. Solo se abre cuando la variable
`REGISTRO_ABIERTO` vale exactamente `1` **y** toda la configuración de esta
guía está completa. En cualquier otro caso muestra «El formulario no está
disponible por el momento» y **no acepta envíos** (falla cerrado: nunca
muestra un éxito falso).

Todo cabe en los planes gratuitos (Pages, D1, R2, Turnstile, Resend Free:
100 correos/día, 3 000/mes). No se activa ningún servicio de pago.

---

## 1. Base de datos D1 (privada)

```
npx wrangler d1 create podcastdelmigrante-directorio
npx wrangler d1 execute podcastdelmigrante-directorio --remote --file=db/directorio/0001_solicitudes.sql
```

Copiar el **Database ID** que devuelve el primer comando.

## 2. Bucket R2 privado para las imágenes

```
npx wrangler r2 bucket create podcastdelmigrante-directorio
```

**No** activar «Public access» ni dominio público: las imágenes solo se ven
desde el panel (Cloudflare Access).

## 3. Turnstile (anti-spam, gratis)

Cloudflare → **Turnstile → Add widget**
- Hostnames: `podcastdelmigrante.com` (y `www.` si se usa) y el dominio
  `*.pages.dev` del proyecto si se quieren probar vistas previas.
- Modo: *Managed*.
- Copiar la **Site Key** (pública) y la **Secret Key** (secreta).

## 4. Resend (correos) — remitente verificado

1. Crear cuenta gratuita en resend.com.
2. **Domains → Add domain** → usar un **subdominio de envío**, p. ej.
   `correo.podcastdelmigrante.com` (ya verificado), para no tocar el correo existente del
   dominio raíz.
3. Resend muestra registros DNS (SPF/`TXT`, DKIM/`TXT` y, si aplica, `MX` del
   subdominio de rebote). Añadirlos en Cloudflare DNS **tal cual** y esperar a
   que el dominio aparezca como *Verified*. **No modificar los MX del
   dominio raíz.** Este es el único cambio de DNS del proyecto y lo hace el
   administrador.
4. **API Keys → Create** con permiso *Sending access* restringido a ese dominio.

El remitente (`MAIL_FROM`) **debe** pertenecer al dominio verificado, p. ej.
`El Podcast del Migrante <solicitudes@correo.podcastdelmigrante.com>`.
No se envía «desde» Gmail: el aviso interno llega **a**
podcastdelmigrante@gmail.com y las respuestas del solicitante van a esa
dirección mediante `reply_to`.

## 5. Proyecto de Cloudflare Pages

**Settings → Bindings** (Producción, y Vista previa si se desea probar):

| Tipo | Nombre de la variable | Recurso |
|---|---|---|
| D1 database | `DIRECTORIO_DB` | `podcastdelmigrante-directorio` |
| R2 bucket | `SOLICITUDES` | `podcastdelmigrante-directorio` |

**Settings → Variables and Secrets**:

| Nombre | Tipo | Valor |
|---|---|---|
| `RESEND_API_KEY` | Secreto | clave de Resend |
| `TURNSTILE_SECRET_KEY` | Secreto | Secret Key de Turnstile |
| `IP_HASH_SALT` | Secreto | texto aleatorio largo (p. ej. `openssl rand -hex 32`) |
| `TURNSTILE_SITE_KEY` | Texto | Site Key de Turnstile |
| `MAIL_FROM` | Texto | `El Podcast del Migrante <solicitudes@correo.podcastdelmigrante.com>` |
| `MAIL_INTERNAL_TO` | Texto | `podcastdelmigrante@gmail.com` |
| `MAIL_REPLY_TO` | Texto (opcional) | dirección a la que responde el solicitante (por defecto `MAIL_INTERNAL_TO`) |
| `PANEL_URL` | Texto (opcional) | `https://admin.podcastdelmigrante.com` |
| `REGISTRO_ABIERTO` | Texto | **interruptor**: `1` abre el formulario; sin la variable, vacía o con cualquier otro valor, queda cerrado |

Los cambios de variables y bindings se aplican en el **siguiente despliegue**
(Deployments → Retry deployment). Las claves nunca están en el repositorio ni
en archivos JavaScript públicos; `/registro/config` solo entrega la Site Key,
que es pública por diseño, y solo cuando el formulario está abierto.

**¿Por qué está cerrado?** Workers & Pages → el proyecto → último despliegue de
Producción → *Functions → Real-time logs*, y recargar `/registro/config`. La
línea «Registro de empresas cerrado — …» indica si es el interruptor o qué
**nombres** faltan (nunca muestra valores). Una `TURNSTILE_SITE_KEY` que no
tenga forma de Site Key (p. ej. el nombre del widget) también lo mantiene
cerrado.

**Abrir / cerrar:** poner `REGISTRO_ABIERTO` en `1` (o `0`) en Producción y
volver a desplegar.

## 6. Panel privado (`admin-worker/`)

1. En `admin-worker/wrangler.toml` reemplazar los dos marcadores por los
   Database ID reales (no son secretos):
   `PEGAR_AQUI_EL_DATABASE_ID` → `podcastdelmigrante-analytics` (estadísticas,
   el mismo de siempre) y `PEGAR_AQUI_EL_DATABASE_ID_DEL_DIRECTORIO` →
   `podcastdelmigrante-directorio`. El bucket `podcastdelmigrante-directorio`
   ya está declarado. Sin los ID, `wrangler deploy` falla sin cambiar nada.
2. Comprobar que `ACCESS_TEAM_DOMAIN` y `ACCESS_AUD` existen en Workers & Pages
   → `podcastdelmigrante-admin` → Settings → Variables and Secrets. Ya no van
   en `wrangler.toml`: `keep_vars = true` los conserva en cada despliegue.
3. Desde `admin-worker/`: `npx wrangler deploy --dry-run` (revisar que liste
   `DB`, `DIRECTORIO_DB` y `SOLICITUDES`) y luego `npx wrangler deploy`.
   Cloudflare Access, `ADMIN_EMAILS` y las estadísticas no cambian.
4. Abrir `https://admin.podcastdelmigrante.com/solicitudes`.

## 7. Prueba en producción (una vez)

0. Poner `REGISTRO_ABIERTO=1` en Producción y volver a desplegar.
   `/registro/config` debe responder `"ready":true` con la Site Key.
1. Enviar una solicitud de prueba real desde el celular.
2. Comprobar: pantalla con número `SOL-AAAAMMDD-XXXXXX`; correo interno
   «Nueva solicitud empresarial — … — SOL-…» con la imagen adjunta; correo de
   confirmación al solicitante (revisar también la carpeta de spam).
3. En el panel: la solicitud aparece como *pendiente*, con vista previa.
4. Marcarla *rechazada* o *duplicada* para que no quede abierta.

Si un correo falla, la solicitud **no se pierde**: queda guardada y el panel
muestra el estado del correo (`internal_email_status`,
`confirmation_email_status`) y el error.

## 8. Publicar un perfil aprobado

1. Panel → solicitud → *en revisión* → enviar la vista previa al empresario.
2. Con su aprobación: marcar «El empresario aprobó la vista previa» → *aprobada*.
3. **Preparar publicación** → copiar la ficha y descargar la imagen.
4. En una rama: guardar la imagen en `assets/directorio/perfiles/`, pegar la
   ficha en `js/businesses.js` con el siguiente `BIZ-id`, y ejecutar
   `node scripts/build-profile-pages.mjs && python3 scripts/build-qr-images.py`
   (genera la página estática, la vista previa para redes y los QR).
5. Pull Request → revisar la vista previa de Cloudflare → fusionar.
6. En el panel: *publicada* con el BIZ-id y el slug.

El correo privado del solicitante nunca se incluye en la ficha pública.

## 9. Protecciones incluidas

- Validación y saneamiento en el servidor (mismas reglas que el navegador:
  `js/directorio/solicitud-core.js`).
- Turnstile + campo trampa (honeypot).
- Límite: 5 solicitudes por hora por IP (guardada solo como huella SHA-256
  con sal) y 3 por día por correo.
- Sin duplicados: clave de idempotencia por envío y detección de una solicitud
  abierta con el mismo correo y nombre.
- Imágenes: JPG/PNG/WebP comprobados por su contenido (no por la extensión),
  máx. 5 MB, 300–8000 px; el navegador las redimensiona y elimina los datos
  EXIF (ubicación) antes de enviarlas.
- Consentimientos guardados con versión y fecha (`directorio-2026-10`).

## 10. Suscripciones futuras

No hay pagos ni Stripe. El esquema está listo para añadir, en una migración
`0002_…sql`, tablas `memberships` / `payments` que referencien
`business_applications.business_id`, sin cambiar el flujo actual.

## Pruebas

```
node --no-warnings --test tests/*.test.mjs             # Function, correos, validación (D1/R2 simulados)
node --no-warnings --test admin-worker/test/*.test.js  # panel
node tests/e2e-registro.cjs                            # navegador (ver instrucciones en el archivo)
```
