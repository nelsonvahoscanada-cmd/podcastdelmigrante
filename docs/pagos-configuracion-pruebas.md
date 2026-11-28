# Pagos del Perfil Premium — configuración del entorno de PRUEBAS

Esta guía acompaña al núcleo de pagos (PR «Pagos: núcleo de Checkout, suscripciones y webhooks»).

- **Todo es modo de prueba.** El código rechaza las claves y los eventos de modo real (`LIVE_MODE_ALLOWED = false` en `functions/_lib/stripe.js`). Activar cobros reales exige un Pull Request autorizado expresamente.
- **Nunca compartas claves** por chat, correo ni capturas. Las pegas tú directamente en Cloudflare.

## Qué quedó listo en el código

| Pieza | Archivo |
|---|---|
| Migración de facturación (solo tablas nuevas, con bloqueo de cobros a cortesías y perfiles protegidos en la base de datos) | `db/directorio/0006_facturacion.sql` |
| Cliente de Stripe sin SDK y verificación de firma de los webhooks | `functions/_lib/stripe.js` |
| Núcleo: enlace individual, Checkout, webhook idempotente, orden de eventos, gracia, devolución y conciliación | `functions/_lib/pagos.js` |
| Configuración e interruptor (cerrado por defecto) | `functions/_lib/pagos-env.js` |
| Endpoints | `functions/pagos/enlace.js`, `checkout.js`, `webhook.js` y `estado.js` |
| Páginas | `pago.html` (condiciones antes del pago) y `pago-confirmado.html` (confirmación), sin indexar |
| Pruebas | `tests/pagos.test.mjs` (SQLite real y Stripe simulado, sin red) |

**En producción no cambia nada.** No existen el binding `PAGOS_DB` ni las claves, así que `/pagos/*` responde 503 («El pago en línea todavía no está disponible»). La base de producción no se toca.

## Lo que configuras tú (en este orden)

### 1. Base D1 de pruebas, independiente

En Cloudflare → D1 → **Create database**: `podcastdelmigrante-directorio-test`.

Después aplica las migraciones **en esa base**, desde una terminal con Wrangler y la sesión de tu cuenta:

    for f in db/directorio/000*.sql; do npx wrangler d1 execute podcastdelmigrante-directorio-test --remote --file="$f"; done

Comprobación: la consola de D1 de la base de pruebas debe mostrar las tablas `billing_*` y 5 filas en `billing_protected`. **No ejecutes este comando sobre `podcastdelmigrante-directorio`**, que es la base de producción.

### 2. Stripe en modo de prueba (cuenta existente de eRadio Global Corp.)

No crees otra cuenta. Activa **Test mode** (o un *Sandbox*) en el panel de Stripe.

1. **Producto:** Product catalog → «Perfil Empresarial Premium» → Price **recurrente mensual de 24.99 CAD**, *Exclusive of tax*. Copia el `price_…`. No es secreto.
2. **Impuestos:** **no actives Stripe Tax todavía.** El código no pide el cálculo de impuestos hasta que confirmen sus obligaciones fiscales.
3. **Portal del cliente:** Settings → Billing → Customer portal.
   - Activa: actualizar método de pago, ver historial de facturas y cancelar suscripciones **al final del período de facturación**.
   - Desactiva: cambio de plan y de cantidad.
   - Activa el **enlace de inicio de sesión** del portal y copia la URL (`https://billing.stripe.com/p/login/test_…`). Es pública, no secreta.
4. **Correos al cliente:** Settings → Customer emails. Activa los recibos de pagos exitosos, los avisos de pago fallido con el enlace para actualizar la tarjeta y los reembolsos.
5. **Recuperación:** Settings → Billing → Revenue recovery.
   - Activa **Smart Retries**, con una ventana mayor que la gracia de 7 días (por ejemplo, 2 semanas).
   - Al agotar los reintentos: **cancel the subscription**. El perfil no se borra, porque el sitio nunca despublica por impago.
6. **Clave restringida de prueba:** Developers → API keys → **Create restricted key**, llamada «pagos-sitio-test», con estos permisos:

   | Recurso | Permiso |
   |---|---|
   | Checkout Sessions | Write |
   | Customers | Read |
   | Subscriptions | Write (devolución con cancelación inmediata) |
   | Invoices | Read |
   | Refunds | Write |
   | Charges y PaymentIntents | Read |
   | Todo lo demás | None |

   Copia la clave `rk_test_…` **solo** para pegarla en el paso 3.

### 3. Cloudflare Pages: entorno **Preview** únicamente

Workers & Pages → el proyecto del sitio → Settings → *Variables and Secrets* y *Bindings*, eligiendo **Preview**, nunca *Production*:

| Tipo | Nombre | Valor |
|---|---|---|
| Binding D1 | `PAGOS_DB` | `podcastdelmigrante-directorio-test` |
| Secreto | `STRIPE_SECRET_KEY` | la clave `rk_test_…` del paso 2.6 |
| Secreto | `STRIPE_WEBHOOK_SECRET` | el `whsec_…` del paso 4 |
| Variable | `STRIPE_PRICE_ID` | el `price_…` del paso 2.1 |
| Variable | `PAGOS_MODO` | `test` |
| Variable | `PAGOS_ABIERTOS` | `1` |
| Variable | `STRIPE_PORTAL_LOGIN_URL` | la URL del paso 2.3 |

**No definas `STRIPE_AUTOMATIC_TAX`.** Si falta algo, los registros de Functions indican solo el **nombre**, nunca el valor.

### 4. Webhook de prueba

Stripe (Test mode) → Developers → Webhooks → **Add endpoint**.

- **URL:** `https://<rama>.podcastdelmigrante.pages.dev/pagos/webhook`. Usa la URL de la vista previa del PR; te la doy al abrirlo.
- **Eventos:**
  - `checkout.session.completed` y `checkout.session.expired`;
  - `customer.subscription.created`, `customer.subscription.updated` y `customer.subscription.deleted`;
  - `invoice.finalized`, `invoice.paid`, `invoice.payment_failed` e `invoice.payment_action_required`;
  - `charge.refunded`, `charge.dispute.created` y `charge.dispute.closed`.
- **Versión de la API:** `2025-01-27.acacia`. Es la misma que fija el código (`STRIPE_API_VERSION` en `functions/_lib/stripe.js`); el webhook y la API deben usar siempre la misma. Cambiarla exige un PR que revise las expansiones y las pruebas.
- **Payload:** *Snapshot*.
- **Secreto:** copia el *Signing secret* (`whsec_…`) y pégalo como secreto `STRIPE_WEBHOOK_SECRET` en el entorno Preview.

### 5. Avísame cuando esté listo

Basta con decirme «configurado», **sin pegar ningún valor**. Entonces ejecuto la verificación en la vista previa: enlace de prueba, Checkout con las tarjetas de prueba de Stripe, webhook, renovación con *Test Clock*, pago rechazado, cancelación y devolución.

## Tarjetas de prueba de Stripe

| Caso | Tarjeta |
|---|---|
| Pago aprobado | `4242 4242 4242 4242` |
| Requiere autenticación (3-D Secure) | `4000 0025 0000 3155` |
| Rechazada (fondos insuficientes) | `4000 0000 0000 9995` |
| Se aprueba al contratar y falla en la renovación | `4000 0000 0000 0341` |

En todas: fecha futura, cualquier CVC y cualquier código postal canadiense.

## Recuperación y vuelta atrás

| Situación | Qué hacer |
|---|---|
| Fallo en la vista previa | Borra `PAGOS_ABIERTOS` en Preview. `/pagos/*` queda cerrado al instante, sin desplegar. |
| Revertir el código | Revertir el PR. Las tablas nuevas quedan sin uso y no afectan al registro, las invitaciones ni las cortesías. |
| Rehacer la base de pruebas | Ver la reversión comentada al final de `0006_facturacion.sql`. **Solo en la base de pruebas.** |
| Webhook caído | Stripe reintenta durante días. La conciliación (`conciliar()`, diaria en el panel de pruebas y también manual) corrige lo que falte usando la API como fuente de verdad. |
