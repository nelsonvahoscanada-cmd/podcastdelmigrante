import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMonth, utcHourToLocalDate, daysOfMonth } from "../src/period.js";

const NOW = Date.parse("2026-10-06T12:00:00Z");

/* Hora local de Alberta de un instante, según la base de zonas horarias del
   entorno. A partir de noviembre de 2026 no se fija el desfase a mano: las
   versiones recientes de la base IANA mantienen a Alberta en UTC-6 todo el
   año y las anteriores vuelven a UTC-7. Lo correcto en ambos casos es que el
   mes empiece y termine a la medianoche local. */
const local = (iso) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Edmonton", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso));
const before = (iso) => new Date(Date.parse(iso) - 1).toISOString();

test("octubre 2026 en Alberta (MDT, UTC-6) → rango UTC exacto", () => {
  const p = parseMonth("2026-10", "America/Edmonton", NOW);
  assert.equal(p.start, "2026-10-01T06:00:00.000Z");
  /* 1 de noviembre aún es MDT (el cambio es el 1 de nov a las 2:00) */
  assert.equal(p.end, "2026-11-01T06:00:00.000Z");
});

test("noviembre 2026 termina a la medianoche local (UTC-7 o UTC-6 según la base de zonas)", () => {
  const p = parseMonth("2026-11", "America/Edmonton", NOW);
  assert.equal(p.start, "2026-11-01T06:00:00.000Z");
  assert.match(p.end, /^2026-12-01T0[67]:00:00\.000Z$/);
  assert.equal(local(p.end), "2026-12-01 00:00");
  assert.equal(local(before(p.end)), "2026-11-30 23:59");
});

test("marzo 2026 cruza el cambio a horario de verano", () => {
  const p = parseMonth("2026-03", "America/Edmonton", NOW);
  assert.equal(p.start, "2026-03-01T07:00:00.000Z");
  assert.equal(p.end, "2026-04-01T06:00:00.000Z");
});

test("diciembre pasa al año siguiente", () => {
  const p = parseMonth("2026-12", "America/Edmonton", NOW);
  assert.match(p.end, /^2027-01-01T0[67]:00:00\.000Z$/);
  assert.equal(local(p.start), "2026-12-01 00:00");
  assert.equal(local(p.end), "2027-01-01 00:00");
  assert.equal(local(before(p.end)), "2026-12-31 23:59");
});

test("el formato coincide con received_at (comparación de texto válida)", () => {
  const p = parseMonth("2026-10", "America/Edmonton", NOW);
  const stored = "2026-10-05T23:42:16.866Z";
  assert.ok(stored >= p.start && stored < p.end);
  assert.ok(!("2026-10-01T05:59:59.999Z" >= p.start), "30 sep 23:59 en Alberta queda fuera");
  assert.ok("2026-10-01T06:00:00.000Z" >= p.start, "1 oct 00:00 en Alberta queda dentro");
});

test("rechaza meses inválidos o fuera de rango", () => {
  for (const v of ["", "2026-13", "2026-1", "26-10", "2026-10-01", "2024-12", "2030-01", "2026-10' OR 1=1"]) {
    assert.equal(parseMonth(v, "America/Edmonton", NOW), null, v);
  }
});

test("hora UTC → día local de Alberta", () => {
  assert.equal(utcHourToLocalDate("2026-10-06T05", "America/Edmonton"), "2026-10-05");
  assert.equal(utcHourToLocalDate("2026-10-06T06", "America/Edmonton"), "2026-10-06");
});

test("días del mes", () => {
  assert.equal(daysOfMonth(2026, 10).length, 31);
  assert.equal(daysOfMonth(2028, 2).length, 29);
  assert.equal(daysOfMonth(2026, 10)[0], "2026-10-01");
});
