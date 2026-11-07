# podcastdelmigrante-analytics (Worker de estadísticas)

```
js/businesses.js ──(scripts/build-profile-pages.mjs)──▶ negocios-premium.json (público, en el sitio)
                                                              │ lo lee el Worker (caché)
miniweb → js/analytics.js → POST /api/events → este Worker ───┘ → D1 podcastdelmigrante-analytics (events)
                                                                        │
                                                    panel (admin-worker, solo lectura) ◀┘
```

El Worker **solo inserta** filas: no borra ni modifica eventos existentes.

## Incorporar una empresa Premium (sin tocar el Worker)
1. Añadir el registro en `js/businesses.js` con `id` (`BIZ-005`…), `slug` y
   `published: true` (sin `plan: "gratuito"`).
2. `node scripts/build-profile-pages.mjs` (genera la miniweb, la vCard y
   `negocios-premium.json`). CI falla si el archivo no está al día (`--check`).
3. Fusionar el PR: al publicarse el sitio, el Worker acepta la empresa en
   ≤ 5 minutos (caché), **sin desplegarlo**.
4. El panel la muestra sola en cuanto recibe su primer evento (descubre las
   empresas a partir de la tabla `events`).

Un perfil en borrador (`published: false`) o del plan Gratuito no figura en la
lista y sus eventos se rechazan.

## Seguridad
- La lista sale del repositorio (revisión por PR); un visitante no puede
  añadir empresas. El evento debe traer un `business_id` de la lista y, si
  manda `business`, el slug que le corresponde (`business_mismatch` si no).
- La lista solo contiene `business_id` y `slug`, que ya son públicos.
- Entradas con formato no válido se ignoran (`BIZ-\d{3,6}`, slug
  `^[a-z0-9]+(-[a-z0-9]+)*$`).
- Costo: como mucho una lectura de la lista por minuto y por instancia (caché
  de 60 s en Cloudflare); los ids inventados no generan más lecturas.
- Si la lista no se puede leer se usa la última leída o, si no hay ninguna,
  `FALLBACK_BUSINESSES` (BIZ-001…BIZ-004). Nunca se acepta un id desconocido.

## Desplegar (solo si cambia el código del Worker)
```
cd analytics-worker && npx wrangler deploy
```
La ruta `podcastdelmigrante.com/api/events*` vive en Cloudflare y no cambia.

## Volver atrás
Cloudflare → Workers → podcastdelmigrante-analytics → Deployments → versión
anterior → «Deploy», o `npx wrangler rollback <version_id>`.

| Versión | Contenido |
|---|---|
| `fd9f4025-2cf5-40b3-ad03-c37f116e3963` | original (2026-10-05): solo BIZ-001 y BIZ-002 |
| `4253142c-8533-4ff7-aece-a642dc40849b` | lista fija BIZ-001…BIZ-004 + eventos vCard/QR (2026-11-07) |

Volver a `4253142c` es seguro en cualquier momento: no depende de
`negocios-premium.json` (pero las empresas nuevas no se aceptarían).

## Comprobaciones (solo lectura)
```
curl https://podcastdelmigrante.com/negocios-premium.json
curl https://podcastdelmigrante.com/api/events/health
npx wrangler d1 execute podcastdelmigrante-analytics --remote --command \
  "SELECT business_id, business_slug, COUNT(*) FROM events GROUP BY 1,2"
```
