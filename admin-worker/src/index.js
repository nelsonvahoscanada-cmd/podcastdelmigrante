/*
  podcastdelmigrante-admin — Panel privado y reportes mensuales de los
  Perfiles Empresariales ("Quién puede ayudarte").

  Worker SEPARADO del que recibe eventos (podcastdelmigrante-analytics, que
  no se toca). Este Worker solo LEE agregados de la misma base D1.

  Rutas (todas exigen identidad verificada; denegado por defecto):
    GET /                          panel (public/index.html)
    GET /report?business_id&month  reporte imprimible (public/report.html)
    GET /api/businesses            empresas con eventos registrados
    GET /api/stats?business_id=BIZ-002&month=2026-10
    GET  /solicitudes                          solicitudes del directorio (public/solicitudes.html)
    GET  /api/solicitudes?status=pendiente     lista
    GET  /api/solicitudes/SOL-…                detalle (incluye el correo privado)
    GET  /api/solicitudes/SOL-…/imagen         imagen privada (R2)
    GET  /api/solicitudes/SOL-…/paquete        ficha para publicar con un Pull Request
    POST /api/solicitudes/SOL-…/estado         cambio de estado (JSON, mismo origen)
*/

import { verifyAccess, localDevIdentity, canViewBusiness } from "./auth.js";
import { parseMonth, DEFAULT_TIMEZONE } from "./period.js";
import { listBusinesses, businessStats, BUSINESS_ID_RE } from "./stats.js";
import { listApplications, getApplication, applicationImage, updateApplication, publicationPackage } from "./solicitudes.js";

const SITE_ORIGIN = "https://podcastdelmigrante.com";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": [
    "default-src 'self'",
    `script-src 'self' ${SITE_ORIGIN}`,
    `img-src 'self' ${SITE_ORIGIN} data:`,
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; "),
};

function withSecurity(response) {
  const res = new Response(response.body, response);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

function json(data, status = 200) {
  return withSecurity(
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } })
  );
}

const deny = (status, error) => json({ error }, status);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const isStatusChange = request.method === "POST" && /^\/api\/solicitudes\/[^/]+\/estado$/.test(url.pathname);
    if (request.method !== "GET" && request.method !== "HEAD" && !isStatusChange) return deny(405, "Método no permitido");
    if (url.pathname === "/robots.txt") {
      return withSecurity(new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } }));
    }

    let identity = null;
    try {
      identity = localDevIdentity(request, env) || (await verifyAccess(request, env));
    } catch {
      identity = null;
    }
    if (!identity) return deny(403, "Acceso restringido");

    if (url.pathname === "/api/businesses") {
      return json({ businesses: await listBusinesses(env.DB) });
    }

    if (url.pathname === "/api/stats") {
      const businessId = url.searchParams.get("business_id") || "";
      if (!BUSINESS_ID_RE.test(businessId)) return deny(400, "business_id inválido");
      const period = parseMonth(url.searchParams.get("month"), env.REPORT_TIMEZONE || DEFAULT_TIMEZONE);
      if (!period) return deny(400, "Mes inválido (formato AAAA-MM)");
      if (!canViewBusiness(identity, businessId)) return deny(403, "Sin permiso para esta empresa");
      return json(await businessStats(env.DB, businessId, period));
    }

    /* ---------- Solicitudes del directorio ---------- */
    if (url.pathname === "/api/solicitudes" || url.pathname.startsWith("/api/solicitudes/")) {
      if (!env.DIRECTORIO_DB || !env.SOLICITUDES) return deny(503, "Falta configurar DIRECTORIO_DB y SOLICITUDES en wrangler.toml");
      if (url.pathname === "/api/solicitudes") {
        return json(await listApplications(env.DIRECTORIO_DB, url.searchParams.get("status") || ""));
      }
      const m = url.pathname.match(/^\/api\/solicitudes\/([^/]+)(?:\/(imagen|paquete|estado))?$/);
      if (!m) return deny(404, "No encontrado");
      const [, id, action] = m;
      if (action === "imagen") {
        const img = await applicationImage(env, id);
        return img ? withSecurity(img) : deny(404, "Imagen no encontrada");
      }
      if (action === "estado") {
        /* Defensa contra CSRF además de Access: mismo origen y JSON */
        const origin = request.headers.get("Origin");
        if (origin && origin !== url.origin) return deny(403, "Origen no permitido");
        if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return deny(415, "Se espera JSON");
        const input = await request.json().catch(() => null);
        if (!input || typeof input !== "object") return deny(400, "JSON inválido");
        const out = await updateApplication(env.DIRECTORIO_DB, id, input, identity);
        return out.ok ? json({ application: out.row }) : deny(out.status, out.error);
      }
      const row = await getApplication(env.DIRECTORIO_DB, id);
      if (!row) return deny(404, "Solicitud no encontrada");
      if (action === "paquete") return json(publicationPackage(row));
      return json({ application: row });
    }

    if (url.pathname.startsWith("/api/")) return deny(404, "No encontrado");

    /* Archivos del panel (public/). Pasan por aquí gracias a run_worker_first,
       así que ningún archivo se sirve sin identidad verificada. */
    return withSecurity(await env.ASSETS.fetch(request));
  },
};
