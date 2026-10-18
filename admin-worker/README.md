# Panel privado de Perfiles Empresariales

El Podcast del Migrante / eRadio Global Corp.

Panel para consultar, por empresa (`business_id`) y por mes, las visitas e
interacciones de los Perfiles Empresariales Premium, y para generar el reporte
mensual del cliente (imprimible o en PDF).

## Arquitectura

```
Perfiles → /api/events → Worker podcastdelmigrante-analytics (NO SE TOCA) → D1 (events)
                                                                             ▲ solo SELECT
admin.podcastdelmigrante.com → Cloudflare Access → Worker podcastdelmigrante-admin (este)
```

- **Un solo Worker para todas las empresas.** Todo se filtra por `business_id`.
  Una empresa nueva (BIZ-003, BIZ-004…) aparece sola en cuanto tiene eventos o
  está en `js/businesses.js`.
- **Misma base D1.** Este Worker solo ejecuta `SELECT` con parámetros y devuelve
  conteos agregados. No escribe, no borra y no expone filas individuales.
- **Meses en hora de Alberta** (`America/Edmonton`, con horario de verano).
  `received_at` (ISO UTC con `Z`) se compara contra el rango UTC exacto del mes.

| Ruta | Qué hace |
|---|---|
| `/` | Panel: empresa + mes |
| `/report?business_id=BIZ-002&month=2026-10` | Reporte del cliente → «Descargar PDF» |
| `/api/businesses` | Empresas con eventos registrados |
| `/api/stats?business_id=…&month=AAAA-MM` | Agregados de una empresa en un mes |
| `/solicitudes` | Solicitudes del Directorio: revisión, historial y eliminación de datos |
| `POST /api/solicitudes/SOL-…/estado` | Cambio de estado (queda en el historial) |
| `POST /api/solicitudes/SOL-…/eliminacion` | Pedido de eliminación: `programar`, `cancelar` o `ejecutar` (con el número SOL-… como confirmación) |
| `GET /api/eliminaciones` · `POST /api/eliminaciones/N/pasos` | Registro de eliminaciones y pasos manuales (Gmail, respuesta) |

## Seguridad

1. **Cloudflare Access** protege todo `admin.podcastdelmigrante.com` (solo los correos autorizados).
2. El Worker **vuelve a verificar** en cada petición el JWT de Access (firma RS256,
   `aud`, emisor, vencimiento) y que el correo esté en `ADMIN_EMAILS`. Si falta
   cualquier configuración, **niega todo** (403).
3. `run_worker_first = true`: ni siquiera el HTML/JS del panel se entrega sin identidad válida.
4. `workers_dev = false` y `preview_urls = false`: no hay URL alternativa sin Access.
5. Entradas validadas (`BIZ-\d{3,6}`, `AAAA-MM`, `SOL-…`), SQL fijo con `bind()`.
   Solo `GET`, salvo las rutas `POST` de solicitudes y eliminaciones, que
   exigen JSON y el mismo origen (defensa contra CSRF además de Access).
6. Respuestas con `no-store`, `noindex`, CSP estricta y `X-Frame-Options: DENY`.
7. `canViewBusiness()` en `src/auth.js` es el punto único de autorización por empresa:
   hoy solo administradores. Para dar acceso a cada empresario, la empresa permitida
   se obtendrá del correo verificado (en el servidor), nunca del parámetro de la URL.

Ningún secreto vive en este repositorio. `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` y el
`database_id` no son secretos; `ADMIN_EMAILS` se guarda como secreto del Worker.

## Lenguaje de los reportes

Visitas, clics e interacciones registradas. **Nunca** ventas, clientes ni citas
confirmadas. `booking_click` se presenta como «Clics en Agendar consulta».

## Entrega del reporte (Descargar PDF, WhatsApp y correo)

En `/report` hay tres opciones juntas. Ninguna crea enlaces públicos al reporte
ni toca métricas, D1 o R2.

- **Descargar PDF**: diálogo de impresión → «Guardar como PDF», tamaño Carta.
  Un mes completo ocupa 2 páginas. La página no tiene margen de impresión
  (`@page { margin: 0 }`), así Chrome no imprime en el pie la dirección
  interna del reporte aunque «Encabezados y pies de página» esté activado.
- **Compartir por WhatsApp**: en computadora se abre el chat del empresario
  **sin texto** y el mensaje queda copiado; se arrastra el PDF al chat y se
  pega el mensaje como comentario del archivo, así nunca sale el mensaje sin
  el reporte. En iPhone y Android se ofrece además «Compartir PDF» (menú del
  sistema con el PDF y el mensaje). En computadora no se ofrece: el menú de
  Windows/Mac no entrega el archivo de forma fiable a WhatsApp. Un enlace de
  WhatsApp **no puede adjuntar archivos** y el panel no puede comprobar qué se
  envió, así que ningún texto da el PDF por enviado o adjuntado.
- **Enviar por correo**: si el envío directo está activado, el PDF descargado
  se adjunta y sale desde el remitente oficial (Resend). Si no lo está, se abre
  el programa de correo del administrador con el mensaje listo.

El número o correo se toma del perfil publicado (`businesses.js`) y se puede
corregir; si falta, se escribe. WhatsApp y el correo propio se abren desde una
sola pantalla con el destinatario y un mensaje breve (solo texto: **nunca** un
enlace al panel ni al reporte, que son internos). El envío directo, cuando se
active, pide además confirmar el destinatario.

### Activar el envío directo por correo (desactivado por defecto)

Workers & Pages → `podcastdelmigrante-admin` → Settings → Variables and Secrets:

| Nombre | Tipo | Valor |
|---|---|---|
| `RESEND_API_KEY` | Secreto | clave de Resend (la misma cuenta del sitio; mejor una clave nueva con permiso «Sending access») |
| `MAIL_FROM` | Texto | remitente del dominio verificado en Resend, p. ej. `El Podcast del Migrante <reportes@correo.podcastdelmigrante.com>` |
| `MAIL_REPLY_TO` | Texto (opcional) | `podcastdelmigrante@gmail.com` |
| `REPORTES_CORREO` | Texto | `1` (interruptor; sin él no se envía nada aunque existan los otros) |

Para desactivarlo, borra `REPORTES_CORREO`. El PDF admite hasta 4 MB.

## Puesta en marcha en Cloudflare (en este orden)

1. **Zero Trust** → activar (plan Free) y elegir el *team name*.
   Settings → Authentication → habilitar **One-time PIN** (y/o Google).
2. **Access → Applications → Add an application → Self-hosted**
   - Domain: `admin.podcastdelmigrante.com`
   - Policy: *Allow* → Include → **Emails** → los correos autorizados.
   - Guardar y copiar el **Application Audience (AUD) Tag**.
3. **D1** → copiar el **Database ID** de `podcastdelmigrante-analytics` y el de
   `podcastdelmigrante-directorio`, y pegarlos en `wrangler.toml` (no son secretos).
4. **Workers & Pages → podcastdelmigrante-admin → Settings → Variables and Secrets**:
   `ACCESS_TEAM_DOMAIN` y `ACCESS_AUD` (texto). No van en `wrangler.toml`:
   `keep_vars = true` hace que cada despliegue los conserve.
5. Desde `admin-worker/`:
   ```
   npm install
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put ADMIN_EMAILS   # correo1@…,correo2@…
   ```
   El deploy crea el dominio `admin.podcastdelmigrante.com`. Mientras falte
   `ADMIN_EMAILS`, el panel responde 403 (falla cerrado).
6. Probar: abrir `https://admin.podcastdelmigrante.com` → código por correo → panel.
   Comparar las cifras de un mes con una consulta manual en D1.

Este despliegue **no modifica** `podcastdelmigrante-analytics` ni los datos de D1.

### Despliegue automático desde GitHub (Workers Builds)

Desde octubre de 2026 el panel se publica sin comandos locales: Cloudflare →
Workers & Pages → `podcastdelmigrante-admin` → Settings → Builds, conectado a
`nelsonvahoscanada-cmd/podcastdelmigrante`, rama `main`.

| Campo | Valor |
|---|---|
| Root directory | `admin-worker` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy` |
| Preview builds | desactivados (`preview_urls = false`) |
| Build watch paths | `admin-worker/*` y `js/directorio/*` |

Cada cambio en esas carpetas que llega a `main` publica una versión nueva; los
cambios del sitio público (noticias, artículos, videos) no la disparan. El
despliegue conserva los secretos (`ADMIN_EMAILS`), las variables del panel
(`keep_vars`), Cloudflare Access y los datos de D1 y R2. Si una versión no
convence, Deployments → versión anterior → **Rollback**.

## Desarrollo y pruebas locales

```
npm install
npm test                                   # período/zona horaria y verificación de Access
npx wrangler d1 execute podcastdelmigrante-analytics --local --file test/fixtures/seed.sql
cp .dev.vars.example .dev.vars
npm run dev                                # http://localhost:8787 (D1 local de prueba)
```

`--local` usa una copia local vacía de D1, nunca la base de producción. El modo
local (`ALLOW_LOCAL_DEV=1`) solo funciona para conexiones desde la propia máquina.

## Futuro (no implementado)

- Reportes del mes en lote (Cron Trigger) y copia fija en una tabla `monthly_reports`.
- Envío automático por email y PDF generado en servidor (Browser Rendering): hoy el envío es manual y el PDF lo genera el navegador.
- Acceso propio por empresario (tabla `business_access`, vía `canViewBusiness`).
- Comparación entre meses, tendencias y exportación CSV (`businessStats` ya acepta cualquier período).
