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
*/

import { verifyAccess, localDevIdentity, canViewBusiness } from "./auth.js";
import { parseMonth, DEFAULT_TIMEZONE } from "./period.js";
import { listBusinesses, businessStats, BUSINESS_ID_RE } from "./stats.js";

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

    if (request.method !== "GET" && request.method !== "HEAD") return deny(405, "Método no permitido");
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

    if (url.pathname.startsWith("/api/")) return deny(404, "No encontrado");

    /* Archivos del panel (public/). Pasan por aquí gracias a run_worker_first,
       así que ningún archivo se sirve sin identidad verificada. */
    return withSecurity(await env.ASSETS.fetch(request));
  },
};
