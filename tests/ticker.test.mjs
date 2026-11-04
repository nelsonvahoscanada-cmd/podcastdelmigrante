/* Barra «Última hora» de la portada: automática a partir de ARTICLES (la misma
   fuente que «Últimas noticias» y el archivo), sin lista manual. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const N = createRequire(import.meta.url)(join(ROOT, "js/noticias.js"));
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";globalThis.A = ARTICLES;", ctx);
const A = Array.from(ctx.A);
const AHORA = Date.parse("2026-11-04T12:00:00-07:00");
const base = { contentType: "Noticia", demo: false, lang: "es", title: "Prueba" };

test("hoy: las 5 noticias publicadas más recientes, la de refugio primero, con sus enlaces", () => {
  const t = N.ticker(A, AHORA);
  assert.deepEqual(t.map((a) => a.slug), [
    "canada-cambios-proceso-refugio-3-noviembre-2026",
    "salud-rural-urbana-alberta-atencion-medica",
    "canada-groceries-essentials-benefit-cgeb-2026",
    "canada-cambios-express-entry-3-noviembre-2026",
    "alberta-empleo-desde-casa-program-eligibility-assessor-2026",
  ]);
  for (const a of t) assert.match(read(`articulo-${a.slug}.html`), /<link id="canonicalLink" rel="canonical"/, `${a.slug}: la página del artículo existe`);
  assert.equal(N.EN_TICKER, 5);
});

test("una noticia nueva entra primera y la sexta más antigua sale, sin tocar la barra", () => {
  const nueva = { ...base, id: "ART-2026-999", slug: "nueva", publishedAt: "2026-11-04T11:00:00-07:00" };
  const antes = N.ticker(A, AHORA).map((a) => a.slug);
  const despues = N.ticker([...A, nueva], AHORA).map((a) => a.slug);
  assert.equal(despues[0], "nueva");
  assert.deepEqual(despues.slice(1), antes.slice(0, 4));
  assert.ok(!despues.includes(antes[4]), "la más antigua deja la barra");
  assert.equal(despues.length, 5);
});

test("solo publicadas: sin borradores, programadas, retiradas, demos, columnas ni otros idiomas", () => {
  const extra = [
    { ...base, id: "ART-X-1", slug: "borrador", draft: true, publishedAt: "2026-11-04T11:00:00-07:00" },
    { ...base, id: "ART-X-2", slug: "programada", publishedAt: "2026-11-05T09:00:00-07:00" },
    { ...base, id: "ART-X-3", slug: "retirada", retirada: true, publishedAt: "2026-11-04T11:00:00-07:00" },
    { ...base, id: "ART-X-4", slug: "demo", demo: true, publishedAt: "2026-11-04T11:00:00-07:00" },
    { ...base, id: "ART-X-5", slug: "columna", contentType: "Columna", publishedAt: "2026-11-04T11:00:00-07:00" },
    { ...base, id: "ART-X-6", slug: "ingles", lang: "en", publishedAt: "2026-11-04T11:00:00-07:00" },
    { ...base, id: "ART-X-7", slug: "sin-fecha", publishedAt: null },
  ];
  const t = N.ticker([...A, ...extra], AHORA).map((a) => a.slug);
  for (const e of extra) assert.ok(!t.includes(e.slug), e.slug);
  /* La programada aparece sola cuando llega su hora */
  assert.equal(N.ticker([...A, ...extra], Date.parse("2026-11-05T09:00:00-07:00"))[0].slug, "programada");
});

test("empates de fecha: orden estable por identificador y slug; menos de 5 noticias: solo las disponibles", () => {
  const f = "2026-11-04T10:00:00-07:00";
  const lista = [
    { ...base, id: "ART-2026-100", slug: "b", publishedAt: f },
    { ...base, id: "ART-2026-101", slug: "a", publishedAt: f },
    { ...base, id: "ART-2026-101", slug: "c", publishedAt: f },
  ];
  const orden = N.ticker(lista, AHORA).map((a) => a.slug);
  assert.deepEqual(orden, ["a", "c", "b"]);
  assert.deepEqual(N.ticker(lista.slice().reverse(), AHORA).map((a) => a.slug), orden, "mismo orden con otra posición en ARTICLES");
  assert.equal(N.ticker(lista, AHORA).length, 3);
  assert.equal(N.ticker([], AHORA).length, 0);
});

test("sin lista manual: la barra no tiene titulares escritos en el código", () => {
  assert.doesNotMatch(read("js/data.js"), /const BREAKING\b/);
  assert.doesNotMatch(read("js/main.js"), /BREAKING/);
  assert.match(read("js/main.js"), /PDM_NOTICIAS\.ticker\(ARTICLES\)/);
  const html = read("index.html");
  assert.match(html, /<nav class="breaking__viewport" aria-labelledby="breakingLabel">\s*<div class="breaking__track" id="breakingTrack"><\/div>\s*<\/nav>/);
  /* noticias.js se carga antes que main.js */
  assert.ok(html.search(/src="js\/noticias\.js[?"]/) < html.search(/src="js\/main\.js[?"]/));
});

test("caché: la portada pide de nuevo los scripts de noticias en cuanto cambian (versión por contenido)", () => {
  const html = read("index.html");
  for (const f of ["js/data.js", "js/articles.js", "js/noticias.js", "js/main.js"]) {
    const v = createHash("sha256").update(readFileSync(join(ROOT, f))).digest("hex").slice(0, 10);
    assert.ok(html.includes(`<script src="${f}?v=${v}"></script>`), `${f} con la versión de su contenido`);
  }
  assert.match(read("scripts/build-article-pages.mjs"), /expected\.set\("index\.html", portada\)/, "la mantiene el generador de artículos (y su --check en CI)");
});
