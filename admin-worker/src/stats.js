/*
  stats.js — Consultas de SOLO LECTURA sobre la tabla events.

  Reglas:
  - SQL fijo; los valores del usuario entran solo por bind() (?1, ?2...).
  - Se devuelven únicamente agregados (conteos). Nunca filas individuales.
  - Nada aquí escribe, borra ni modifica D1.
  - Todo se filtra por business_id: funciona igual para BIZ-001, BIZ-002 y
    cualquier perfil futuro, sin configuración por empresa.
*/

import { daysOfMonth, utcHourToLocalDate } from "./period.js";

export const BUSINESS_ID_RE = /^BIZ-\d{3,6}$/;

/* Empresas con eventos registrados (descubrimiento automático). */
export async function listBusinesses(db) {
  const { results } = await db
    .prepare(
      `SELECT business_id, business_slug, COUNT(*) AS events,
              MIN(received_at) AS first_seen, MAX(received_at) AS last_seen
         FROM events
        GROUP BY business_id, business_slug
        ORDER BY business_id`
    )
    .all();
  return results.filter((r) => BUSINESS_ID_RE.test(r.business_id));
}

/* Estadísticas de UNA empresa en UN período. */
export async function businessStats(db, businessId, period) {
  const args = [businessId, period.start, period.end];
  const where = "business_id = ?1 AND received_at >= ?2 AND received_at < ?3";

  const [byEvent, sources, devices, hours, slugs] = await db.batch([
    db.prepare(`SELECT event, COUNT(*) AS n FROM events WHERE ${where} GROUP BY event ORDER BY n DESC`).bind(...args),
    /* Fuentes y dispositivos se calculan sobre las visitas al perfil. */
    db
      .prepare(
        `SELECT COALESCE(NULLIF(TRIM(utm_source), ''), '') AS utm_source,
                COALESCE(NULLIF(TRIM(referrer_host), ''), '') AS referrer_host,
                COUNT(*) AS n
           FROM events WHERE ${where} AND event = 'profile_view'
          GROUP BY 1, 2 ORDER BY n DESC`
      )
      .bind(...args),
    db
      .prepare(
        `SELECT COALESCE(NULLIF(TRIM(device_type), ''), 'desconocido') AS device, COUNT(*) AS n
           FROM events WHERE ${where} AND event = 'profile_view'
          GROUP BY 1 ORDER BY n DESC`
      )
      .bind(...args),
    /* Por hora UTC; se convierte a día local en JS (Alberta cambia de horario). */
    db
      .prepare(
        `SELECT substr(received_at, 1, 13) AS hour,
                SUM(CASE WHEN event = 'profile_view' THEN 1 ELSE 0 END) AS views,
                SUM(CASE WHEN substr(event, -6) = '_click' THEN 1 ELSE 0 END) AS clicks
           FROM events WHERE ${where}
          GROUP BY 1`
      )
      .bind(...args),
    db.prepare(`SELECT DISTINCT business_slug FROM events WHERE ${where}`).bind(...args),
  ]);

  const events = {};
  for (const r of byEvent.results) events[r.event] = r.n;

  return {
    business_id: businessId,
    business_slugs: slugs.results.map((r) => r.business_slug),
    period: { month: period.month, timezone: period.timeZone, start_utc: period.start, end_utc: period.end },
    events,
    total_events: byEvent.results.reduce((s, r) => s + r.n, 0),
    sources: groupSources(sources.results),
    devices: devices.results.map((r) => ({ device: r.device, n: r.n })),
    daily: dailySeries(hours.results, period),
    generated_at: new Date().toISOString(),
  };
}

/* utm_source si existe; si no, el dominio de origen; si no, "directo". */
function groupSources(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = r.utm_source
      ? `utm:${r.utm_source.toLowerCase()}`
      : r.referrer_host
        ? `ref:${r.referrer_host.toLowerCase().replace(/^www\./, "")}`
        : "direct";
    map.set(key, (map.get(key) || 0) + r.n);
  }
  return [...map.entries()]
    .map(([key, n]) => {
      const [type, ...rest] = key.split(":");
      return { type: type === "direct" ? "direct" : type === "utm" ? "utm_source" : "referrer", source: rest.join(":"), n };
    })
    .sort((a, b) => b.n - a.n);
}

function dailySeries(hourRows, period) {
  const days = new Map(daysOfMonth(period.year, period.monthNumber).map((d) => [d, { date: d, views: 0, clicks: 0 }]));
  for (const r of hourRows) {
    const day = days.get(utcHourToLocalDate(r.hour, period.timeZone));
    if (!day) continue;
    day.views += r.views;
    day.clicks += r.clicks;
  }
  return [...days.values()];
}
