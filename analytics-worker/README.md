# podcastdelmigrante-analytics (Worker de estadísticas)

`js/analytics.js` → `POST /api/events` → este Worker → D1 `podcastdelmigrante-analytics`
(tabla `events`) → panel (`admin-worker`, solo lectura).

El Worker **solo inserta** filas: no borra ni modifica eventos existentes.

## Agregar una empresa Premium
Añadir `"BIZ-xxx": "slug"` en `BUSINESSES` (`src/worker.js`) con el mismo id y
slug de `js/businesses.js`, y desplegar. Sin esa línea, los eventos del perfil se
rechazan (`business_not_allowed`) y **no se guardan** (no se pueden recuperar
después). `tests/analytics-worker.test.mjs` falla si `BUSINESSES` no coincide con
los perfiles Premium publicados.

## Desplegar
```
cd analytics-worker && npx wrangler deploy
```
La ruta `podcastdelmigrante.com/api/events*` vive en Cloudflare y no cambia.

## Volver atrás
Cloudflare → Workers → podcastdelmigrante-analytics → Deployments → versión
anterior → «Deploy», o:
```
npx wrangler rollback <version_id>
```
Versiones: `fd9f4025-2cf5-40b3-ad03-c37f116e3963` = original del 2026-10-05
(solo BIZ-001 y BIZ-002; idéntica al primer commit de esta carpeta).

## Comprobaciones (solo lectura)
```
npx wrangler d1 execute podcastdelmigrante-analytics --remote --command \
  "SELECT business_id, business_slug, COUNT(*) FROM events GROUP BY 1,2"
curl https://podcastdelmigrante.com/api/events/health
```
