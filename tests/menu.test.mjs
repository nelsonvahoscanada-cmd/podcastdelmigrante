/* Menú principal: «Desafío 100 Empresas» destacado, una sola vez, hacia la portada del programa. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const ctx = {};
vm.runInNewContext(read("js/data.js") + ";globalThis.P = NAV_PRIMARY; globalThis.M = NAV_MORE;", ctx);
const visibles = (l) => Array.from(l).filter((i) => !i.pending);

test("menú principal: se conservan las opciones y se añade «Desafío 100 Empresas» destacado al final", () => {
  assert.deepEqual(visibles(ctx.P).map((i) => i.label), ["Inicio", "Canadá", "Migración", "Historias", "Videos", "Directorio Empresarial", "Desafío 100 Empresas"]);
  const d = ctx.P.find((i) => i.label === "Desafío 100 Empresas");
  assert.equal(d.href, "desafio-100-empresas/", "portada general del Desafío, no el Muro");
  assert.equal(d.destacado, true);
  assert.equal(ctx.P.filter((i) => i.destacado).length, 1);
});

test("sin duplicados: el Desafío ya no está en «Más» (el menú móvil une ambas listas)", () => {
  const todas = [...visibles(ctx.P), ...visibles(ctx.M)];
  assert.equal(todas.filter((i) => i.label === "Desafío 100 Empresas").length, 1);
  assert.ok(!Array.from(ctx.M).some((i) => /desafio-100-empresas/.test(i.href)));
});

test("nav.js dibuja el destacado con trofeo decorativo en el menú de computador y en el móvil", () => {
  const nav = read("js/nav.js");
  assert.match(nav, /"nav-link nav-link--destacado"/);
  assert.match(nav, /"mobile-nav-link mobile-nav-link--destacado"/);
  assert.match(nav, /<svg class="nav-trofeo" aria-hidden="true" focusable="false"/);
  const css = read("css/styles.css");
  assert.match(css, /\.nav-link--destacado:focus-visible \{ outline: 2px solid var\(--negro\)/);
  assert.match(css, /\.mobile-nav-link--destacado:focus-visible/);
});
