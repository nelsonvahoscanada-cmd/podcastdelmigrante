/* Columna «Trabajas, pagas y ahorras… ¿pero realmente estás avanzando?» de
   Carlos D. Castillo (Tu dinero en Canadá, noviembre de 2026) y nuevo retrato
   circular del autor (mismo archivo y tamaño que el anterior). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";" + read("js/columns.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO; globalThis.C = CONTRIBUTORS; globalThis.COL = COLUMNS;", ctx);
const SLUG = "trabajas-pagas-ahorras-realmente-avanzando";
const art = ctx.A.find((a) => a.slug === SLUG);
const texto = art.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("columna publicada una sola vez, con autor, categoría y fecha real del Magazine", () => {
  assert.ok(art && !art.draft && !art.demo);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG || a.title === art.title).length, 1, "sin duplicados");
  assert.equal(art.contentType, "Columna");
  assert.equal(art.columnName, "Tu dinero en Canadá");
  assert.equal(art.category, "Educación Financiera");
  assert.equal(art.author.name, "Carlos D. Castillo");
  assert.equal(art.author.authorId, "carlos-castillo");
  assert.equal(art.author.specialty, "Estratega en arquitectura financiera y asesor licenciado en seguros de vida y salud en Canadá");
  assert.equal(art.dek, "Muchos inmigrantes trabajan duro para establecerse en Canadá, pero sin una estrategia clara para administrar sus ingresos, ese esfuerzo no siempre se convierte en estabilidad financiera.");
  assert.match(art.publishedAt, /^2026-11-02T\d{2}:\d{2}:00-06:00$/, "fecha de publicación, no la del correo (31-10)");
  for (const f of [`articulo-${SLUG}.html`, `assets/${SLUG}.jpg`, `assets/social/${SLUG}.jpg`]) assert.ok(existsSync(join(ROOT, f)), f);
});

test("texto original completo, de «El salario llega a la cuenta» a «sino que también construya el futuro»", () => {
  assert.match(texto, /^\s*El salario llega a la cuenta\./);
  assert.match(texto, /sino que también construya el futuro\./);
  for (const frase of ["¿realmente estamos avanzando o simplemente estamos manteniendo el movimiento?", "Un flujo de caja no es solamente una lista de gastos", "el fondo de emergencia debe mantenerse separado, accesible y protegido", "estamos utilizando ingresos futuros para financiar el presente", "Recuerde: una proyección no es una garantía."]) assert.ok(texto.includes(frase), frase);
});

test("bloque de la calculadora: título, descripción, botón externo seguro y advertencia", () => {
  assert.match(art.bodyHtml, /<h2 class="article-highlight__title">Calcula cómo podría crecer tu dinero<\/h2>/);
  assert.match(art.bodyHtml, /Explora distintos escenarios modificando tu inversión inicial, aportes mensuales, plazo y tasa de rendimiento estimada\./);
  assert.match(art.bodyHtml, /<a class="article-apply" href="https:\/\/carlosdcastillo\.com\/calculadora\.html" target="_blank" rel="noopener noreferrer">UTILIZA GRATIS LA CALCULADORA<\/a>/);
  assert.match(texto, /Las proyecciones no garantizan resultados futuros\./);
});

test("columna «Tu dinero en Canadá»: entrega de noviembre publicada; la de septiembre se conserva", () => {
  const col = ctx.COL.find((c) => c.id === "tu-dinero-en-canada");
  const nov = col.entries.find((e) => e.monthLabel === "Noviembre 2026");
  assert.deepEqual([nov.slug, nov.published], [SLUG, true]);
  const sep = col.entries.find((e) => e.monthLabel === "Septiembre 2026");
  assert.deepEqual([sep.slug, sep.published], ["el-error-financiero-inmigrantes-canada", true]);
  assert.ok(existsSync(join(ROOT, "articulo-el-error-financiero-inmigrantes-canada.html")));
});

test("portada: la noticia principal y las destacadas aprobadas no cambian", () => {
  assert.equal(ctx.H.main.slug, "canada-cambios-express-entry-3-noviembre-2026");
  assert.deepEqual(Array.from(ctx.H.secondary, (s) => s.slug), ["hector-rivero-santa-latino-canada", "canada-groceries-essentials-benefit-cgeb-2026", "alberta-bomberos-forestales-2027", "multas-representantes-migratorios-canada-2026"]);
});

test("retrato circular del autor: mismo archivo y mismo tamaño (300 × 300), JPEG optimizado", () => {
  const carlos = ctx.C.find((c) => c.id === "carlos-castillo");
  assert.equal(carlos.photo, "assets/carlos-castillo-avatar.jpg");
  const b = readFileSync(join(ROOT, carlos.photo));
  assert.deepEqual([b[0], b[1]], [0xff, 0xd8], "JPEG");
  const dims = execFileSync("python3", ["-c", "from PIL import Image;import sys;print(*Image.open(sys.argv[1]).size)", join(ROOT, carlos.photo)], { encoding: "utf8" }).trim();
  assert.equal(dims, "300 300");
  assert.ok(b.length < 40 * 1024, `${b.length} bytes`);
});

test("SEO y redes", () => {
  const h = read(`articulo-${SLUG}.html`);
  assert.match(h, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(h, new RegExp(`rel="canonical" href="https://podcastdelmigrante\\.com/articulo-${SLUG}"`));
  assert.match(h, /property="og:title" content="Trabajas, pagas y ahorras… ¿pero realmente estás avanzando\?"/);
  assert.ok(art.seo.description.length <= 160);
});
