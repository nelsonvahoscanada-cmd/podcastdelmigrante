/*
  period.js — Convierte un mes de Alberta ("2026-10") en el rango UTC exacto
  que se usa para filtrar events.received_at.

  received_at se guarda como ISO 8601 UTC con milisegundos y "Z"
  (ej. "2026-10-05T23:42:16.866Z"). Date.toISOString() produce exactamente
  ese formato, así que la comparación de texto en SQL es correcta:
      received_at >= start  AND  received_at < end
  Los meses se cuentan en hora local de America/Edmonton (incluye el cambio
  de horario de verano).
*/

export const DEFAULT_TIMEZONE = "America/Edmonton";

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MIN_YEAR = 2025;

/* Diferencia (ms) entre la hora local de `timeZone` y UTC en el instante `ms`. */
function tzOffsetMs(ms, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const v = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
  const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second);
  return asUtc - (ms - (ms % 1000));
}

/* Instante UTC de la medianoche local del día 1 de (year, month). */
function localMonthStartUtc(year, month, timeZone) {
  const guess = Date.UTC(year, month - 1, 1);
  let utc = guess - tzOffsetMs(guess, timeZone);
  /* segunda pasada por si el offset cambia entre la estimación y el resultado */
  utc = guess - tzOffsetMs(utc, timeZone);
  return utc;
}

/* Devuelve { month, year, monthNumber, start, end, timeZone } o null si el
   texto no es un mes válido dentro del rango permitido. */
export function parseMonth(value, timeZone = DEFAULT_TIMEZONE, now = Date.now()) {
  const m = MONTH_RE.exec(String(value || ""));
  if (!m) return null;
  const year = Number(m[1]);
  const monthNumber = Number(m[2]);
  const maxYear = new Date(now).getUTCFullYear() + 1;
  if (year < MIN_YEAR || year > maxYear) return null;

  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return {
    month: m[0],
    year,
    monthNumber,
    timeZone,
    start: new Date(localMonthStartUtc(year, monthNumber, timeZone)).toISOString(),
    end: new Date(localMonthStartUtc(nextYear, nextMonth, timeZone)).toISOString(),
  };
}

/* "2026-10-06T05:00" (hora UTC truncada) → fecha local "2026-10-05". */
export function utcHourToLocalDate(utcHour, timeZone = DEFAULT_TIMEZONE) {
  const d = new Date(utcHour + ":00:00.000Z");
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/* Todas las fechas locales del mes, para que la serie diaria incluya los días en 0. */
export function daysOfMonth(year, monthNumber) {
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mm = String(monthNumber).padStart(2, "0");
  return Array.from({ length: count }, (_, i) => `${year}-${mm}-${String(i + 1).padStart(2, "0")}`);
}
