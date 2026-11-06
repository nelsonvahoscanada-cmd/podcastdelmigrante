/* Noticia «¿Trabajas en Canadá? Podrías recibir dinero del Gobierno para tus
   compras de mercado» (Canada Groceries and Essentials Benefit): segunda
   tarjeta pequeña junto a la principal (orden de la dirección del 2-11-2026),
   datos verificados en Canada.ca (CRA), sección y botón «cómo recibirlo»,
   video propio en TikTok, recuadro publicitario separado, SEO y sitemap. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "canada-groceries-essentials-benefit-cgeb-2026";
const IMG = `assets/${SLUG}.jpg`;
const GET = "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit/get-benefit.html";
const art = ctx.A.find((a) => a.slug === SLUG);
const [informativo, publicidad] = art.bodyHtml.split('<aside class="article-patrocinio"');
const texto = informativo.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("portada: tercera tarjeta pequeña, tras la noticia de refugio", () => {
  assert.equal(ctx.H.main.slug, "masterclass-gratuita-ley-intrinseca-creacion-eder-campos");
  assert.equal(ctx.H.secondary.length, 5);
  const t = ctx.H.secondary[3];
  assert.equal(t.slug, SLUG);
  assert.equal(t.title, art.title);
  assert.equal(t.image, `url('${IMG}')`);
  assert.equal(t.demo, false);
  assert.equal(ctx.H.secondary[2].slug, "hector-rivero-santa-latino-canada");
  const slugs = [ctx.H.main.slug, ...ctx.H.secondary.map((s) => s.slug)];
  assert.equal(new Set(slugs).size, slugs.length, "sin duplicados");
  assert.ok(ctx.A.some((a) => a.slug === "referendum-alberta-octubre-2026-inmigrantes" && !a.draft), "la que sale de las destacadas sigue publicada");
});

test("artículo único, fecha real de publicación en el Magazine (no la del video)", () => {
  assert.ok(art && !art.draft && !art.demo);
  assert.equal(ctx.A.filter((a) => /groceries|cgeb/i.test(a.slug)).length, 1, "sin duplicados");
  assert.equal(art.id, "ART-2026-034");
  assert.equal(art.contentType, "Noticia");
  assert.match(art.publishedAt, /^2026-11-02T\d{2}:\d{2}:00-06:00$/);
  for (const f of [`articulo-${SLUG}.html`, IMG, `assets/social/${SLUG}.jpg`, art.video.cover]) assert.ok(existsSync(join(ROOT, f)), f);
});

test("datos de la CRA: reemplazo del GST/HST, aumento del 25 %, montos, pagos, requisitos y empleo", () => {
  assert.match(texto, /reemplazó al crédito GST\/HST en julio de 2026/);
  assert.match(texto, /aumento del 25 %.*de 2026 a 2031/);
  assert.match(texto, /libre de impuestos/);
  assert.match(texto, /cada trimestre|cuatro veces al año/);
  for (const m of ["$679", "$890", "$234", "$60.012", "$64.232", "30 de abril"]) assert.ok(texto.includes(m), m);
  assert.match(texto, /no depende de que estés desempleado/);
  assert.match(texto, /RC151/);
  assert.match(texto, /no constituye asesoría fiscal/);
});

test("sección «¿Cómo solicitar o recibir este beneficio?» con el botón oficial y los 5 puntos", () => {
  const i = informativo.indexOf("<h2>¿Cómo solicitar o recibir este beneficio?</h2>");
  assert.ok(i > 0);
  const seccion = informativo.slice(i, informativo.indexOf("<h2>", i + 10));
  assert.match(seccion, new RegExp(`<a class="article-apply" href="${GET.replace(/[.?]/g, "\\$&")}" target="_blank" rel="noopener">CONSULTA AQUÍ CÓMO RECIBIR EL BENEFICIO</a>`));
  assert.match(seccion, /automático[\s\S]*declaración de impuestos/);
  assert.match(seccion, /No necesitas estar desempleado/);
  assert.match(seccion, /recién llegados pueden necesitar un paso adicional/i);
  assert.match(seccion, /CRA account/);
  assert.match(seccion, /No pagues a nadie por una supuesta inscripción[\s\S]*páginas que no sean oficiales/);
});

test("enlaces oficiales solo de Canada.ca en el contenido informativo", () => {
  for (const [, h] of informativo.matchAll(/href="([^"]+)"/g)) assert.match(h, /^https:\/\/www\.canada\.ca\//, h);
  for (const s of art.sources) assert.match(s.href, /^https:\/\/www\.canada\.ca\/en\/revenue-agency\//);
});

test("recuadro publicitario de Country Hills Toyota separado y sin confundirse con el beneficio", () => {
  assert.ok(publicidad, "existe el recuadro");
  assert.doesNotMatch(texto, /Toyota|gasolina/, "el contenido informativo no menciona la promoción");
  assert.match(publicidad, /Publicidad/);
  assert.match(publicidad, /atención en español/);
  assert.match(publicidad, /vehículo <strong>nuevo<\/strong>.*El Podcast del Migrante.*tarjeta de gasolina de \$200 CAD/s);
  assert.match(publicidad, /no un beneficio del Gobierno de Canadá/);
  assert.match(publicidad, /href="perfil-tomas-velazquez\.html\?utm_source=podcastdelmigrante&amp;utm_medium=patrocinio&amp;utm_campaign=country-hills-toyota&amp;utm_content=articulo-cgeb"/);
  assert.match(read("css/article.css"), /\.article-patrocinio \{/);
  assert.equal(art.sponsored, false, "el artículo es informativo; solo el recuadro es publicidad");
});

test("video de TikTok tras la introducción, sin copia local", () => {
  assert.deepEqual([art.video.tiktokId, art.video.tiktokUser, art.video.position], ["7703308267048488213", "podcastdelmigrante", "intro"]);
  assert.doesNotMatch(art.bodyHtml, /\.mp4|<video/);
});

test("SEO, Open Graph, Twitter y sitemap", () => {
  const h = read(`articulo-${SLUG}.html`);
  assert.match(h, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(h, new RegExp(`name="twitter:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(h, new RegExp(`rel="canonical" href="https://podcastdelmigrante\\.com/articulo-${SLUG}"`));
  assert.ok(art.seo.description.length <= 160, `descripción de ${art.seo.description.length} caracteres`);
  assert.match(read("sitemap.xml"), new RegExp(`<loc>https://podcastdelmigrante\\.com/articulo-${SLUG}</loc>`));
});
