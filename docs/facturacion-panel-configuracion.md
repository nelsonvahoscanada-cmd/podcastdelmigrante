# Panel «Suscripciones y Facturación»: lista de configuración manual (PRUEBAS)

Este panel depende del núcleo de pagos (PR «Pagos: núcleo de Checkout, suscripciones y webhooks»). Primero se fusiona ese PR y después este.

Todo es **modo de prueba**:

- El panel de producción (`admin.podcastdelmigrante.com`) **no** recibe ningún binding nuevo. Su sección «Facturación» muestra «no disponible» (503).
- El panel de pruebas es un Worker separado, `podcastdelmigrante-admin-pruebas`. Solo ve la base `podcastdelmigrante-directorio-test`.

> **Nunca pegues claves en el chat, en el repositorio ni en capturas.** Cada secreto se escribe solo en el campo de Cloudflare indicado abajo.

## 0. Estado actual (ya hecho)

| Pieza | Estado |
|---|---|
| Base D1 `podcastdelmigrante-directorio-test` (ID `b5dc23a4-7c79-4e96-99a7-abf97456d92d`) | Creada, con las 9 migraciones aplicadas y verificadas: 15 tablas, 18 índices, 3 triggers y 5 perfiles protegidos |
| Bases de producción (`podcastdelmigrante-directorio`, `-analytics`, `-vistas`) | Sin cambios |
| Plazo de entrega | **10 días hábiles**. Es configurable en el panel y no se cambia a 3 sin su aprobación |

## 1. Stripe (cuenta existente de eRadio Global Corp., **Test mode**)

Sigue `docs/pagos-configuracion-pruebas.md`, paso 2: producto de 24.99 CAD mensual, portal del cliente, correos, recuperación y clave restringida.

Para el panel, la clave restringida de prueba `rk_test_…` necesita estos permisos, además de los ya listados:

| Recurso | Permiso | Para qué |
|---|---|---|
| Subscriptions | **Write** | Cancelar al final del período y anular la cancelación |
| Charges | Read | Leer la comisión real del cargo |
| Balance transactions | Read | Leer la comisión real (`fee`) |
| Refunds | Write | Devolución del primer pago |

Puede ser la misma clave `rk_test_…` del sitio o una segunda clave de prueba, por ejemplo «panel-facturacion-test». **Nunca** una clave `sk_live_` ni `rk_live_`: el panel las rechaza.

## 2. Dominio y Cloudflare Access del panel de pruebas

1. **Zero Trust → Access → Applications → Add an application → Self-hosted.**
   - Nombre: «Panel de pruebas — facturación».
   - Dominio: `admin-pruebas.podcastdelmigrante.com`.
   - Política: *Allow*, solo los correos del equipo que administra la facturación.
2. Copia el **Application Audience (AUD) Tag** de esa aplicación. No es secreto, pero es distinto del AUD del panel de producción.

## 3. Publicar el Worker de pruebas

Desde tu terminal, con tu sesión de Wrangler, en la carpeta `admin-worker/`:

    npx wrangler deploy --env pruebas

- Crea el Worker `podcastdelmigrante-admin-pruebas` en el dominio `admin-pruebas.podcastdelmigrante.com`.
- Programa la conciliación diaria a las 09:17 UTC.
- Bindings: solo `DIRECTORIO_DB` y `PAGOS_DB`, ambos apuntando a la base de **pruebas**.
- `wrangler` mostrará dos avisos: «r2_buckets» y «DB» no están en `env.pruebas`. Son intencionales: así el panel de pruebas no puede leer las estadísticas ni las imágenes reales.

**No ejecutes** `npx wrangler deploy` sin `--env pruebas`: eso publicaría el panel de producción, y publicar producción requiere su autorización.

## 4. Variables y secretos del Worker de pruebas

Ruta: **Workers & Pages → `podcastdelmigrante-admin-pruebas` → Settings → Variables and Secrets.**

| Tipo | Nombre | Valor | Dónde se obtiene |
|---|---|---|---|
| Variable (texto) | `ACCESS_TEAM_DOMAIN` | p. ej. `https://eradio.cloudflareaccess.com` | Zero Trust → Settings → Team domain |
| Variable (texto) | `ACCESS_AUD` | AUD de la aplicación del paso 2 | Zero Trust → Access → Applications |
| Variable (texto) | `PAGOS_SITE_ORIGIN` | `https://<rama>.podcastdelmigrante.pages.dev` | La vista previa del sitio donde está `/pago` (se la doy al abrir el PR) |
| Variable (texto) | `STRIPE_PRICE_ID` | `price_…` de prueba | Stripe (Test) → Product catalog |
| Ya definida | `PAGOS_MODO` | `test` | Viene en `wrangler.toml`; no la cambies |
| **Secreto** | `ADMIN_EMAILS` | correos con acceso al panel, separados por comas | Tú |
| **Secreto** | `BILLING_ADMIN_EMAILS` | correos que pueden hacer acciones financieras | Tú. Sin este secreto, el panel es de solo lectura |
| **Secreto** | `STRIPE_SECRET_KEY` | `rk_test_…` del paso 1 | Stripe (Test) → Developers → API keys |

Los secretos también pueden cargarse desde la terminal, que pide el valor sin mostrarlo:

    npx wrangler secret put STRIPE_SECRET_KEY --env pruebas

Qué **no** definir:

- `ALLOW_LOCAL_DEV`, que es solo para desarrollo local;
- ningún binding a `podcastdelmigrante-directorio` de producción;
- `STRIPE_AUTOMATIC_TAX`.

## 5. Sitio (Cloudflare Pages, entorno **Preview**)

Igual que en `docs/pagos-configuracion-pruebas.md`, paso 3: `PAGOS_DB` → base de pruebas, claves de prueba, `PAGOS_MODO=test` y `PAGOS_ABIERTOS=1`, **solo en Preview**.

El webhook de prueba de Stripe apunta a la vista previa del sitio, no al panel.

## 6. Comprobación

Entra en `https://admin-pruebas.podcastdelmigrante.com/facturacion`:

1. Arriba debe decir «MODO DE PRUEBA».
2. Si aparece «Facturación no disponible», el recuadro dice el **nombre** de lo que falta, nunca su valor.
3. Si las acciones salen deshabilitadas, falta tu correo en `BILLING_ADMIN_EMAILS`.
4. En **Workers → podcastdelmigrante-admin-pruebas → Logs**, la conciliación diaria deja la línea «Conciliación diaria {…}».

Cuando esté listo, dime «configurado», **sin pegar valores**. Entonces recorro el flujo completo con tarjetas de prueba:

- enlace → Checkout → webhook;
- comisión real;
- renovación con *Test Clock*;
- rechazo y gracia;
- cancelación;
- devolución;
- exportación.

## Qué hace el panel

| Función | Detalle |
|---|---|
| Enlace individual de pago | Se genera desde «Solicitudes pendientes de pago». Se muestra **una vez** y vence según el parámetro configurado. Generar uno nuevo revoca el anterior. Dos clics simultáneos dejan un solo enlace |
| Copiar enlace | Botón «Copiar enlace». El panel no envía nada a nadie |
| Indicadores | MRR, ingresos sin impuestos, impuestos aparte, total cobrado, comisión real de Stripe y neto después de comisiones y devoluciones |
| Separación | Premium de pago, cortesías permanentes, fundadores e institucionales. Las cortesías y los protegidos (BIZ-001 a BIZ-005) **nunca** suman al MRR ni se cobran |
| Estados financieros | Al día, pendiente de pago, en gracia (con los días restantes), gracia vencida, cancela al final, cancelada |
| Acciones con confirmación | Cancelar al final del período y anular la cancelación. Devolver el 100 % del primer pago dentro de 30 días: exige motivo y escribir el identificador `MEM-…`, y cancela la suscripción |
| Filtros | Negocio, estado financiero, fechas y período facturado |
| Historial y exportación | Facturas con enlace a la factura de Stripe; CSV de facturas, suscripciones y resumen, protegido contra fórmulas |
| Conciliación | Diaria (Cron) y manual. Compara con Stripe, completa comisiones pendientes y vence los enlaces caducados |
| Parámetros | Plazo de entrega (1–30 días hábiles; hoy 10), gracia (0–30 días) y vigencia del enlace (1–30 días). Cada cambio queda en la auditoría como «anterior → nuevo» |
| Auditoría | Cada acción registra quién la hizo, cuándo y sobre qué objeto |

## Vuelta atrás

| Situación | Qué hacer |
|---|---|
| Apagar el panel de pruebas | Workers → `podcastdelmigrante-admin-pruebas` → Settings → Domains: quitar el dominio, o borrar el Worker. Producción no se ve afectada |
| Revertir el código | Revertir el PR. El panel de producción no usa nada de esto |
