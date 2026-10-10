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
- Envío automático por email y PDF generado en servidor (Browser Rendering).
- Acceso propio por empresario (tabla `business_access`, vía `canViewBusiness`).
- Comparación entre meses, tendencias y exportación CSV (`businessStats` ya acepta cualquier período).
