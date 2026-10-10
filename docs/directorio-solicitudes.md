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
npx wrangler d1 execute podcastdelmigrante-directorio --remote --file=db/directorio/0002_historial.sql
npx wrangler d1 execute podcastdelmigrante-directorio --remote --file=db/directorio/0003_eliminaciones.sql
```

Copiar el **Database ID** que devuelve el primer comando. Las migraciones
también se pueden pegar en Cloudflare → D1 → la base → **Console**. Ninguna
borra ni modifica datos (`CREATE … IF NOT EXISTS`): repetirlas no tiene efecto.

| Migración | Crea | Necesaria para |
|---|---|---|
| `0001_solicitudes.sql` | tabla `business_applications` | guardar las solicitudes |
| `0002_historial.sql` | tabla `application_events` | el historial de acciones del panel |
| `0003_eliminaciones.sql` | tabla `deletion_requests` | los pedidos de eliminación de datos |

Comprobar en la Console:
`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('business_applications','application_events','deletion_requests');`
→ deben aparecer las tres.

Sin `0002`, las solicitudes se siguen recibiendo, pero el panel no deja
cambiar estados (avisa «Falta aplicar la migración…» y no guarda nada a medias).
Sin `0003`, el panel no permite registrar ni ejecutar eliminaciones (lo avisa).

**Antes de cualquier migración en producción**, copia de seguridad:
`npx wrangler d1 export podcastdelmigrante-directorio --remote --output=respaldo-AAAAMMDD.sql`
(guardarla cifrada y fuera del repositorio) y anotar el punto de restauración:
`npx wrangler d1 time-travel info podcastdelmigrante-directorio`.

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
| `TURNSTILE_HOSTNAMES` | Texto (opcional) | dominios aceptados para el token de Turnstile, separados por comas. Por defecto `podcastdelmigrante.com,www.podcastdelmigrante.com`. Solo en **Preview**, para probar en una vista previa: añadir su dominio `….pages.dev` |
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

1. `admin-worker/wrangler.toml` ya declara los Database ID reales (no son
   secretos) de `podcastdelmigrante-analytics` (estadísticas, sin cambios) y
   `podcastdelmigrante-directorio`, y el bucket `podcastdelmigrante-directorio`.
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
- Turnstile: además del token, se comprueba que se resolvió en el dominio
  oficial (`TURNSTILE_HOSTNAMES`); un token obtenido en otro sitio se rechaza.
- Aviso de privacidad en el formulario (responsable, datos, fines,
  proveedores Cloudflare, Resend y Gmail, tratamiento fuera de Canadá y
  derechos). Consentimientos guardados con versión y fecha
  (`directorio-2026-10-v2`; cambiar `CONSENT_VERSION` en
  `functions/registro/enviar.js` cada vez que cambie ese texto).
- Historial que no se edita (`application_events`): «recibida» (formulario),
  resultado de los correos (sistema) y cada cambio de estado o revisión con el
  correo verificado del administrador y la fecha. El cambio y su registro se
  guardan juntos (todo o nada). El historial no copia datos de contacto.
- Panel: Cloudflare Access + verificación del JWT y de `ADMIN_EMAILS` en el
  Worker en **cada** petición, incluidas las imágenes privadas (sin enlaces
  públicos) y los archivos del propio panel.
- Fallos de servicios externos: si Turnstile no responde, se rechaza con un
  mensaje claro (503) y no se guarda nada; si Resend falla, la solicitud se
  guarda igual y el panel la marca «Correo con error».

## 10. Pedidos de eliminación de datos

Cuando una persona pide eliminar sus datos (a podcastdelmigrante@gmail.com o
por otro canal), se tramita desde el panel → la solicitud → **Eliminación de
datos**. Referencia interna: responder dentro de 45 días.

1. **Registrar el pedido** (paso 1): fecha y canal. No borra nada y se puede
   **cancelar** con un motivo. Mientras esté abierto, la solicitud no se puede
   aprobar ni publicar.
2. Si el perfil **ya está publicado**: retirarlo antes del sitio con un Pull
   Request (quitar la ficha de `js/businesses.js`, su imagen y regenerar las
   páginas). Ojo: el repositorio es público y su historial conserva la versión
   anterior.
3. **Eliminar definitivamente** (paso 2): escribir el número `SOL-…` exacto y
   confirmar. Se borran la imagen en R2 (primero; si falla no se toca D1), el
   historial y la solicitud en D1 (en una sola transacción).
4. **Gmail**: buscar el número `SOL-…`, borrar los correos del caso y vaciar
   la papelera. Marcar «Correos en Gmail» en el registro de eliminaciones.
5. **Responder** a la persona confirmando la eliminación y marcar «Respuesta a
   la persona».

El **registro de eliminaciones** (tabla `deletion_requests`) conserva solo el
número de solicitud, una huella SHA-256 del correo, fechas, canal y quién hizo
cada paso, para acreditar la gestión. Quedan fuera del alcance del panel, y
se vencen solos: el Time Travel de D1, los registros de envío de Resend y las
copias de seguridad (ver `docs/directorio-conservacion-propuesta.md`).

## 11. Suscripciones futuras

No hay pagos ni Stripe. El esquema está listo para añadir, en una migración
nueva (`0004_…sql`), tablas `memberships` / `payments` que referencien
`business_applications.business_id`, sin cambiar el flujo actual.

## Pruebas

```
node --no-warnings --test tests/*.test.mjs             # Function, correos, validación (D1/R2 simulados)
node --no-warnings --test admin-worker/test/*.test.js  # panel
node tests/e2e-registro.cjs                            # navegador (ver instrucciones en el archivo)
```
