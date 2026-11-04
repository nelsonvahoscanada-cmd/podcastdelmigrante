# Directorio Empresarial — planes Gratuito y Premium, y cobros

Página pública: **https://podcastdelmigrante.com/planes-directorio**
(`planes-directorio.html`). Formulario: `registra-tu-empresa.html`, que acepta
`?plan=gratuito` o `?plan=premium` para dejar el plan preseleccionado.

## 1. Qué está activo hoy (4 de noviembre de 2026)

Precio Premium: **$25 CAD al mes + impuestos aplicables** (antes $24.99).
Invitaciones individuales (gratuita, Premium pagada y Premium de cortesía):
ver `membresias-directorio.md`.

| Pieza | Estado |
|---|---|
| Página de planes con comparación, preguntas frecuentes y llamadas a la acción | Publicada |
| Registro **Gratuito** por el formulario existente (D1 + R2 + Turnstile + correos) | Operativo si `/registro/config` responde `ready:true` |
| Solicitud **Premium** por el mismo formulario | Operativa, pero es solo una **solicitud**: no hay cobro en línea |
| Cobro recurrente de $25 CAD/mes | **No existe**: no hay Stripe ni otro procesador configurado |

Cómo se distinguen las solicitudes, sin migración de base de datos:
- La información privada de cada solicitud (`notes` en D1) empieza con
  `Plan solicitado: Plan Gratuito ($0 CAD).` o
  `Plan solicitado: Plan Premium ($25 CAD al mes + impuestos aplicables).`
  El panel la muestra en «Información adicional (privada)».
- El asunto del aviso interno lleva `[GRATUITO]` o `[PREMIUM]`, y el
  historial de la solicitud («recibida») nombra el plan.
- Una solicitud sin plan (formulario antiguo en caché) se trata como Premium.

Reglas del plan Gratuito, en `js/directorio/solicitud-core.js`, que aplican igual el navegador y el servidor:
- **Obligatorios:** plan, nombre, categoría, ciudad y provincia, descripción de hasta 200 caracteres, **teléfono**, correo privado, imagen y consentimientos.
- **Descartados:** el servidor ignora los campos exclusivos de Premium, como redes, web, WhatsApp, servicios o información adicional.
- **Imágenes:** rechaza fotografías adicionales; el plan incluye una sola imagen.
- **Consentimiento:** la versión vigente es `directorio-2026-11-v4`. El texto distingue «publicación después de nuestra revisión» (Gratuito) de «solo después de mi aprobación final» (Premium).

## 2. Publicar una ficha gratuita aprobada

1. En el panel, revisa la solicitud. La línea «Plan solicitado: Plan Gratuito» lo identifica.
2. Añade al final de `BUSINESSES`, en `js/businesses.js`, solo estos campos:
   `id`, `slug`, `published: true`, `plan: "gratuito"`, `name`, `category`, `city`, `province`, `country`, `shortDescription` (≤ 200 caracteres), `phone`, `profileImage` y, si es un logotipo, `profileImageKind: "logo"`.
3. Guarda la imagen en `assets/directorio/perfiles/`.
4. La ficha **no** genera miniweb: `scripts/build-profile-pages.mjs` la omite.
5. El directorio la muestra como tarjeta con un botón «Llamar» y una invitación discreta a conocer Premium. Las tarjetas gratuitas aparecen después de los Perfiles Premium.
6. Abre un Pull Request y, cuando se publique, marca la solicitud como *publicada* en el panel.

## 3. Activar cobros recurrentes reales (pendiente de autorización)

Nada de esto se ha hecho. Requiere crear cuentas y aceptar contratos, que son decisiones de la dirección.

**Antes de cobrar, la dirección debe definir y publicar** (no se inventaron):
- duración y renovación de la suscripción (mensual, renovación automática);
- política de cancelación (cómo, con cuánta anticipación, efecto en el perfil publicado);
- política de reembolsos;
- qué ocurre con la miniweb si el pago falla o se cancela;
- impuestos aplicables (GST/HST según la provincia del cliente) y si eRadio Global Corp. está registrada para cobrarlos (número de GST/HST);
- términos del servicio Premium (añadirlos a `terminos.html`) y revisión jurídica.

**Camino más corto recomendado: Stripe Billing con Payment Links**, sin código de pagos en el sitio:
1. Crear la cuenta de Stripe de eRadio Global Corp. y completar la verificación del negocio y la cuenta bancaria en CAD.
2. **Products** → «Perfil Empresarial Premium», precio **recurrente** de 25 CAD al mes.
3. Activar **Stripe Tax** o configurar las tasas de GST/HST. Requiere el número de registro de impuestos.
4. Crear un **Payment Link** para ese precio:
   - recoger dirección de facturación (para el impuesto) y correo;
   - activar el **Customer Portal** para que el cliente cancele o cambie su tarjeta.
5. Flujo operativo inicial:
   1. el equipo revisa la solicitud Premium;
   2. envía el Payment Link al cliente;
   3. publica la miniweb cuando Stripe confirma el primer pago.
6. Cuando el volumen lo justifique, automatizar con una Pages Function `/pagos/webhook`:
   - verifica la firma con `STRIPE_WEBHOOK_SECRET`;
   - guarda `checkout.session.completed`, `invoice.paid` y `customer.subscription.deleted` en una tabla nueva `memberships` (migración `0005`), enlazada por `business_id`.
7. Solo entonces cambiar los textos de la página. Hoy dicen «Todavía no hay pago en línea» y «Enviar el formulario es una solicitud, no un pago». Deben pasar a anunciar el pago en línea, después de comprobar un cobro real de extremo a extremo.

Nunca se piden ni se guardan datos de tarjetas en el sitio: el pago ocurre en Stripe.

## 4. Pruebas

- `tests/planes-directorio.test.mjs`: precio $25 (antes $24.99), sin anuncio de pago habilitado, reglas del plan Gratuito, Function y directorio.
- `tests/e2e-planes-directorio.cjs`: página de planes, navegación y formulario en computador, tableta y celular.
- `tests/e2e-registro.cjs`: envío real contra D1 y R2 locales, con Turnstile y Resend simulados.
