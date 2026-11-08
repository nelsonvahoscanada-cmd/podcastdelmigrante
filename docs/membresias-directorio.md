# Directorio Empresarial — invitaciones y membresías

Sistema de invitaciones individuales para el Directorio Empresarial. Funciona
sobre el registro existente (`registra-tu-empresa` → `/registro/enviar`) y
el panel privado (`admin.podcastdelmigrante.com`, protegido con Cloudflare
Access).

## 1. Modalidades (internas)

| Código | Nombre | Precio | Quién la otorga |
|---|---|---|---|
| `FREE` | Ficha gratuita | $0 CAD | Formulario público o invitación |
| `PREMIUM_PAID` | Premium pagada | $24.99 CAD al mes + impuestos aplicables | Formulario público o invitación. **No hay pasarela de pagos**: es una solicitud y el cobro se acuerda por separado (ver `planes-y-pagos-directorio.md`) |
| `PREMIUM_GIFT` | Premium de cortesía | $0 CAD, sin mensualidad y sin vencimiento | **Solo** el administrador, con una invitación individual |

En público solo aparecen dos opciones (planes-directorio, «Haz visible tu
negocio en Canadá»): **Gratis $0** («Registrar mi empresa GRATIS») y **Premium $24.99
CAD/mes + impuestos** («Conoce Premium»; dirá «Elegir Premium» cuando exista
el cobro en línea). La cortesía nunca se muestra en público.

Una cortesía **nunca** se convierte sola en suscripción pagada: no hay fecha de
vencimiento (`expires_at` queda vacío) y ningún proceso automático la cambia.

## 2. Puesta en marcha (una sola vez)

Las invitaciones necesitan tres tablas nuevas en la base D1
`podcastdelmigrante-directorio` (migración `db/directorio/0005_membresias.sql`,
solo `CREATE TABLE/INDEX IF NOT EXISTS`; no toca tablas ni filas existentes).

Opción A, desde el panel: **Invitaciones → «Preparar tablas»** (pide
confirmación). Opción B, con Wrangler:

    npx wrangler d1 execute podcastdelmigrante-directorio --remote --file=db/directorio/0005_membresias.sql

Mientras las tablas no existan, todo falla cerrado: `/registro/invitacion`
responde 503, un formulario con código se rechaza (503) y el panel no deja
crear invitaciones. El registro normal (sin invitación) sigue igual.

## 3. Crear y entregar una invitación

1. Panel → **Invitaciones** → «Nueva invitación»: tipo, negocio, contacto.
2. «Generar invitación» (con confirmación). El enlace se muestra **una sola
   vez**: `https://podcastdelmigrante.com/invitacion#c=CÓDIGO`.
3. «Copiar invitación» y enviarlo **personalmente** (el panel no envía correos
   ni mensajes a terceros).
4. Si se pierde: «Renovar enlace» (el anterior deja de funcionar). Para
   anularla: «Revocar».

Seguridad del código: 24 bytes aleatorios (32 caracteres); en D1 solo se
guarda su huella SHA-256; va después de `#`, así que no llega al servidor al
abrir la página, ni a la analítica, ni al Referer; la página lo borra de la
barra de direcciones al leerlo y lo comprueba con un POST. Nada se confía a la
URL: el servidor vuelve a validarlo al enviar el formulario.

## 4. Lo que vive el invitado

1. Abre el enlace → página `/invitacion` (sin indexar). Cortesía: «¡Bienvenido a
   Premium!», «Tu membresía: $0 CAD», sin cobros automáticos, sin vencimiento
   programado, nota de vigencia.
2. «Activar mi membresía» → formulario de registro con el plan fijado y un
   aviso. El código queda solo en `sessionStorage` de esa pestaña.
3. Al enviar, el servidor, en **una sola transacción D1**: guarda la solicitud,
   crea la membresía (`en_revision`) y marca la invitación `usada`. Un segundo
   uso, un envío simultáneo o un código revocado se rechazan (409) y no queda
   ninguna solicitud ni imagen del envío rechazado.
4. La solicitud entra a **Solicitudes** como cualquier otra (aviso interno con
   la etiqueta «PREMIUM DE CORTESÍA»). **Nada se publica**: la miniweb se
   prepara y publica a mano con un Pull Request, como siempre.

## 5. Gestionar membresías (panel → Invitaciones)

| Acción | De → a | Notas |
|---|---|---|
| Activar | En revisión → Activa | Pide el BIZ-id y el slug de la miniweb **ya publicada**; fija la fecha de activación |
| Suspender | Activa → Suspendida | |
| Reactivar | Suspendida → Activa | Conserva la fecha de activación original |
| Retirar cortesía / Retirar | En revisión, Activa o Suspendida → Retirada | Pide la transición propuesta: ficha gratuita o Premium pagada. **No borra** datos, fotografías, historial ni estadísticas y **no crea cobros** |

Cada acción exige confirmación y queda en `membership_events` con el correo del
administrador. Suspender o retirar **no despublica** la miniweb por sí solo: el
cambio en el sitio (quitar funciones Premium, pasar a ficha gratuita) se hace a
mano con un Pull Request, después de hablar con el empresario.

Estadísticas por miniweb (mes elegido): visitas al perfil, clics totales
(mismo criterio que la pestaña Estadísticas), WhatsApp y llamadas, leídos de la
base de analítica existente. Los escaneos de QR no se distinguen todavía: los
códigos apuntan a la misma URL del perfil sin UTM.

## 6. Archivos

- `js/directorio/membresias-core.js` — modalidades, esquema, códigos (solo servidor; no se publica en `dist/`).
- `db/directorio/0005_membresias.sql` — migración.
- `functions/registro/invitacion.js` — comprobación pública de una invitación.
- `functions/registro/enviar.js` — canje dentro del registro.
- `invitacion.html`, `js/directorio/invitacion.js`, `css/invitacion.css` — página pública.
- `admin-worker/src/membresias.js`, `admin-worker/public/invitaciones.html`, `admin-worker/public/js/invitaciones.js` — panel.
- Pruebas: `tests/membresias.test.mjs`, `admin-worker/test/membresias.test.js`, `tests/e2e-invitacion.cjs`.

## 7. Reversión

Quitar el código (revertir el PR) deja las tablas sin uso. Para borrarlas,
**después de exportar una copia**:

    npx wrangler d1 export podcastdelmigrante-directorio --remote --output=respaldo.sql
    DROP TABLE membership_events; DROP TABLE business_memberships; DROP TABLE business_invitations;
