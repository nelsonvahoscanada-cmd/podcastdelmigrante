import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMonth, utcHourToLocalDate, daysOfMonth } from "../src/period.js";

const NOW = Date.parse("2026-10-06T12:00:00Z");

test("octubre 2026 en Alberta (MDT, UTC-6) → rango UTC exacto", () => {
  const p = parseMonth("2026-10", "America/Edmonton", NOW);
  assert.equal(p.start, "2026-10-01T06:00:00.000Z");
  /* 1 de noviembre aún es MDT (el cambio es el 1 de nov a las 2:00) */
  assert.equal(p.end, "2026-11-01T06:00:00.000Z");
});

test("noviembre 2026 termina en MST (UTC-7)", () => {
  const p = parseMonth("2026-11", "America/Edmonton", NOW);
  assert.equal(p.start, "2026-11-01T06:00:00.000Z");
  assert.equal(p.end, "2026-12-01T07:00:00.000Z");
});

test("marzo 2026 cruza el cambio a horario de verano", () => {
  const p = parseMonth("2026-03", "America/Edmonton", NOW);
  assert.equal(p.start, "2026-03-01T07:00:00.000Z");
  assert.equal(p.end, "2026-04-01T06:00:00.000Z");
});

test("diciembre pasa al año siguiente", () => {
  const p = parseMonth("2026-12", "America/Edmonton", NOW);
  assert.equal(p.end, "2027-01-01T07:00:00.000Z");
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
