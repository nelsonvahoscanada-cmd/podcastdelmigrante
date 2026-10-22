/* «Últimas noticias» en la portada y archivo de noticias (noticias.html). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (f) => readFileSync(ROOT + f, "utf8");
const N = createRequire(import.meta.url)("../js/noticias.js");

const ctx = vm.createContext({});
vm.runInContext(read("js/data.js") + ";" + read("js/articles.js") + ";globalThis.__D={ARTICLES,HERO};", ctx);
const { ARTICLES, HERO } = ctx.__D;

const art = (slug, publishedAt, extra = {}) => ({ slug, publishedAt, contentType: "Noticia", demo: false, lang: "es", title: slug, ...extra });

test("solo noticias publicadas, ordenadas por fecha de publicación (más reciente primero)", () => {
  const lista = N.publicadas([
    art("vieja", "2026-09-01T08:00:00-06:00"),
    art("borrador", "2026-12-01T08:00:00-06:00", { draft: true }),
    art("demo", "2026-12-01T08:00:00-06:00", { demo: true }),
    art("guia", "2026-12-01T08:00:00-06:00", { contentType: "Guía" }),
    art("columna", "2026-12-01T08:00:00-06:00", { contentType: "Columna" }),
    art("ingles", "2026-12-01T08:00:00-06:00", { lang: "en" }),
    art("nueva", "2026-10-20T05:00:00-06:00"),
    art("media", "2026-10-12T14:00:00-06:00"),
  ]);
  assert.deepEqual(lista.map((a) => a.slug), ["nueva", "media", "vieja"]);
});

test("portada: 5 noticias, sin repetir las del bloque principal; una noticia nueva desplaza a la más antigua", () => {
  const base = Array.from({ length: 8 }, (_, i) => art(`n${i}`, `2026-10-${String(10 + i).padStart(2, "0")}T08:00:00-06:00`));
  const hero = { main: { slug: "n7" }, secondary: [{ slug: "n6" }, { title: "sin enlace" }] };
  assert.deepEqual(N.portada(base, hero).map((a) => a.slug), ["n5", "n4", "n3", "n2", "n1"]);
  const conNueva = [...base, art("nueva", "2026-10-30T08:00:00-06:00")];
  assert.deepEqual(N.portada(conNueva, hero).map((a) => a.slug), ["nueva", "n5", "n4", "n3", "n2"]);
  // La que sale de la portada sigue en el archivo
  assert.ok(N.publicadas(conNueva).some((a) => a.slug === "n1"));
});

test("paginación del archivo: 12 por página, páginas inválidas vuelven a la 1", () => {
  const lista = Array.from({ length: 30 }, (_, i) => i);
  assert.equal(N.POR_PAGINA, 12);
  assert.deepEqual(N.pagina(lista, 1).items, lista.slice(0, 12));
  assert.deepEqual(N.pagina(lista, 3).items, lista.slice(24, 30));
  assert.equal(N.pagina(lista, 3).total, 3);
  for (const malo of [0, 4, -1, NaN, 1.5]) {
    const p = N.pagina(lista, malo);
    assert.equal(p.numero, 1);
    assert.equal(p.valida, false);
  }
  assert.deepEqual(N.pagina([], 1), { numero: 1, total: 1, valida: true, items: [] });
});

test("fecha corta e imagen se toman del artículo, sin depender de la zona horaria", () => {
  assert.equal(N.fechaCorta("2026-10-20T05:00:00-06:00"), "20 OCT 2026");
  assert.equal(N.fechaCorta("2026-01-03T23:30:00-07:00"), "3 ENE 2026");
  assert.equal(N.imagen({ heroImage: { background: "url('assets/x.jpg')" } }), "assets/x.jpg");
  assert.equal(N.imagen({ heroImage: { background: "linear-gradient(135deg, #1c1c1c, #3a3a3a)" } }), "");
});

test("datos reales: la portada muestra 5 noticias publicadas y todas existen con su página permanente", () => {
  const enPortada = N.portada(ARTICLES, HERO);
  assert.equal(enPortada.length, 5);
  const todas = N.publicadas(ARTICLES);
  assert.ok(todas.length > 5);
  for (const a of todas) assert.ok(existsSync(`${ROOT}articulo-${a.slug}.html`), a.slug);
  for (let i = 1; i < todas.length; i++) assert.ok(Date.parse(todas[i - 1].publishedAt) >= Date.parse(todas[i].publishedAt));
});

test("portada: sin lista manual, con enlace visible «Ver todas las noticias» y el script compartido", () => {
  assert.doesNotMatch(read("js/data.js"), /const LATEST\b/);
  const index = read("index.html");
  assert.match(index, /<a class="section-link" href="noticias">Ver todas las noticias<\/a>/);
  assert.ok(index.indexOf("js/articles.js") < index.indexOf("js/noticias.js") && index.indexOf("js/noticias.js") < index.indexOf("js/main.js"));
});

test("archivo: SEO propio, menú y pie del sitio, y en el sitemap", () => {
  const html = read("noticias.html");
  assert.match(html, /<title>Todas las noticias — El Podcast del Migrante Magazine<\/title>/);
  assert.match(html, /<link id="canonicalLink" rel="canonical" href="https:\/\/podcastdelmigrante\.com\/noticias">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/podcastdelmigrante\.com\/noticias">/);
  assert.match(html, /<h1 class="section-title" id="archivoTitulo">Todas las noticias<\/h1>/);
  assert.doesNotMatch(html, /noindex/);
  assert.match(html, /id="navPrimary"/);
  assert.match(html, /class="site-footer"/);
  assert.match(read("sitemap.xml"), /<loc>https:\/\/podcastdelmigrante\.com\/noticias<\/loc>/);
});
