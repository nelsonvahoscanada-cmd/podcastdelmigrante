/* Noticia «Alberta busca bomberos forestales para 2027»: segunda posición de
   la portada (Santa Latino sigue primero y protegido), datos de la oferta
   oficial, ilustración identificada como IA, imagen social y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "alberta-bomberos-forestales-2027";
const URL_ART = `https://podcastdelmigrante.com/articulo-${SLUG}`;
const IMG = "assets/alberta-bomberos-forestales-2027.jpg";
const art = ctx.A.find((a) => a.slug === SLUG);

test("portada: Santa Latino sigue primero y la noticia de Alberta es la segunda, sin duplicados", () => {
  assert.equal(ctx.H.main.slug, "hector-rivero-santa-latino-canada", "Santa Latino permanece como destacado principal hasta que la dirección editorial autorice otra entrevista");
  assert.equal(ctx.H.secondary[0].slug, SLUG);
  assert.equal(ctx.H.secondary[0].title, art.title);
  assert.equal(ctx.H.secondary[0].image, `url('${IMG}')`);
  assert.equal(ctx.H.secondary[0].demo, false);
  const slugs = [ctx.H.main.slug, ...ctx.H.secondary.map((s) => s.slug)];
  assert.equal(new Set(slugs).size, slugs.length, "ninguna noticia aparece dos veces en el bloque principal");
  assert.deepEqual(Array.from(ctx.H.secondary.slice(1), (s) => s.slug), [
    "multas-representantes-migratorios-canada-2026",
    "referendum-alberta-octubre-2026-inmigrantes",
    "alberta-energy-rebate-plazo-octubre",
  ], "las demás destacadas conservan su orden");
  for (const s of ["premios-impacto-inmigrante-alberta-2026", "subvenciones-etnoculturales-antirracismo-alberta"]) {
    assert.ok(ctx.A.some((a) => a.slug === s && !a.draft), `${s}: la noticia que sale de las destacadas sigue publicada`);
  }
});

test("artículo: datos de la oferta oficial, sin promesas de patrocinio ni requisitos inventados", () => {
  assert.ok(art && !art.draft);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1, "una sola URL");
  assert.equal(art.title, "Alberta busca bomberos forestales para 2027 con salarios de hasta $31,02 por hora: convocatoria abierta");
  assert.equal(art.category, "Empleo en Alberta");
  assert.equal(art.contentType, "Noticia");
  const texto = art.dek + art.bodyHtml;
  for (const dato of ["$24,52", "$31,02", "30 de noviembre de 2026", "36,25 horas", "Wildfire Crew Member", "clase 5", "18 años", "marzo y abril de 2027", "23 de octubre de 2026"]) {
    assert.ok(texto.includes(dato), dato);
  }
  assert.match(art.bodyHtml, /La oferta no anuncia patrocinio migratorio ni garantiza la contratación de trabajadores extranjeros\./);
  assert.match(art.bodyHtml, /autorización legal para trabajar en Canadá/);
  const fuentes = Array.from(art.sources, (f) => f.href);
  assert.ok(fuentes.includes("https://jobpostings.alberta.ca/job/Various-Wildfire-Crew-Member/606646017/"), "oferta oficial en «Fuentes consultadas»");
  assert.ok(fuentes.includes("https://www.alberta.ca/alberta-wildfire-recruitment"), "reclutamiento oficial en «Fuentes consultadas»");
  assert.doesNotMatch(art.bodyHtml, /Fuentes oficiales|jobpostings\.alberta\.ca/, "las fuentes no se repiten en el cuerpo");
});

test("imagen: ilustración propia identificada como IA, completa en la vista previa social", () => {
  assert.equal(art.heroImage.background, `url('${IMG}')`);
  assert.match(art.heroImage.credit, /inteligencia artificial/);
  assert.match(art.heroImage.credit, /No es una fotografía/);
  assert.match(art.heroImage.alt, /^Ilustración editorial creada con inteligencia artificial/);
  assert.equal(art.heroImage.socialArea, "0% 100%", "sin recortes que oculten el titular");
  const foto = readFileSync(join(ROOT, IMG));
  assert.equal(foto.readUInt16BE(0), 0xffd8, "JPEG");
  assert.ok(foto.length < 400 * 1024);
  const social = readFileSync(join(ROOT, `assets/social/${SLUG}.jpg`));
  assert.equal(social.readUInt16BE(0), 0xffd8);
  assert.ok(social.length < 300 * 1024);
});

test("página: canonical, Open Graph, Twitter, metadescripción y una entrada en el sitemap", () => {
  const html = read(`articulo-${SLUG}.html`);
  assert.match(html, new RegExp(`<link id="canonicalLink" rel="canonical" href="${URL_ART}">`));
  assert.match(html, new RegExp(`property="og:url" content="${URL_ART}"`));
  assert.match(html, /property="og:title" content="Alberta busca bomberos forestales para 2027 con salarios de hasta \$31,02 por hora: convocatoria abierta"/);
  assert.match(html, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /property="article:published_time" content="2026-\d\d-\d\dT/);
  assert.ok(art.seo.description.length <= 160);
  assert.doesNotMatch(html, /name="robots" content="noindex"/);
  assert.ok(existsSync(join(ROOT, `articulo-${SLUG}.html`)));
  assert.equal(read("sitemap.xml").split(`<loc>${URL_ART}</loc>`).length - 1, 1);
});
