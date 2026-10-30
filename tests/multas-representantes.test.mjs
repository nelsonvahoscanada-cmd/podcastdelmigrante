/* Noticia «Canadá activa multas de hasta $1,5 millones contra representantes
   migratorios»: tarjeta secundaria junto a la principal (Santa Latino sigue
   primero y bomberos de Alberta conserva la 2.ª posición), cifras del
   comunicado de IRCC del 28 de octubre de 2026, imagen propia, SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "multas-representantes-migratorios-canada-2026";
const URL_ART = `https://podcastdelmigrante.com/articulo-${SLUG}`;
const IMG = "assets/multas-representantes-migratorios-canada-2026.jpg";
const IRCC = "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/10/new-penalties-for-fraudulent-and-unauthorized-immigration-and-citizenship-representatives.html";
const art = ctx.A.find((a) => a.slug === SLUG);

test("portada: Santa Latino principal, bomberos 1.ª secundaria y la noticia de IRCC justo después", () => {
  assert.equal(ctx.H.main.slug, "hector-rivero-santa-latino-canada");
  assert.equal(ctx.H.main.image, "url('assets/yt/LxTr1Zda3dg.jpg')");
  assert.equal(ctx.H.secondary[0].slug, "alberta-bomberos-forestales-2027");
  assert.equal(ctx.H.secondary[1].slug, SLUG);
  assert.equal(ctx.H.secondary[1].title, art.title);
  assert.equal(ctx.H.secondary[1].image, `url('${IMG}')`);
  assert.equal(ctx.H.secondary[1].category, "Inmigración");
  assert.equal(ctx.H.secondary.length, 4);
});

test("artículo: texto de la redacción con las cifras y precisiones del comunicado", () => {
  assert.ok(art && !art.draft && !art.demo);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1);
  assert.equal(art.title, "Canadá activa multas de hasta $1,5 millones contra representantes migratorios que incumplan la ley");
  assert.equal(art.category, "Inmigración");
  assert.equal(art.contentType, "Noticia");
  assert.match(art.publishedAt, /^2026-10-29T/);
  const texto = art.dek + art.bodyHtml;
  for (const dato of ["28 de octubre de 2026", "$5.000 CAD", "$15.000 CAD", "$1.500.000 CAD", "no significa que cada infracción genere automáticamente esa sanción", "previsto para 2027", "30 días", "College of Immigration and Citizenship Consultants (CICC)", "Notarios de Quebec", "familiar o amigo que ayuda gratuitamente"]) {
    assert.ok(texto.includes(dato), dato);
  }
  assert.deepEqual(Array.from(art.sources, (f) => f.href), [IRCC], "fuente oficial de IRCC al final");
  assert.doesNotMatch(art.bodyHtml, /canada\.ca|Fuentes oficiales/, "las fuentes no se repiten en el cuerpo");
});

test("imagen: gráfico propio verde, negro y blanco, completo en la vista previa social", () => {
  assert.equal(art.heroImage.background, `url('${IMG}')`);
  assert.match(art.heroImage.credit, /No contiene fotografías ni representa a personas reales/);
  assert.equal(art.heroImage.socialArea, "0% 100%");
  const foto = readFileSync(join(ROOT, IMG));
  assert.equal(foto.readUInt16BE(0), 0xffd8);
  assert.ok(foto.length < 400 * 1024);
  const social = readFileSync(join(ROOT, `assets/social/${SLUG}.jpg`));
  assert.equal(social.readUInt16BE(0), 0xffd8);
  assert.ok(social.length < 300 * 1024);
});

test("página: canonical, Open Graph, Twitter, metadescripción y una entrada en el sitemap", () => {
  const html = read(`articulo-${SLUG}.html`);
  assert.match(html, new RegExp(`<link id="canonicalLink" rel="canonical" href="${URL_ART}">`));
  assert.match(html, new RegExp(`property="og:url" content="${URL_ART}"`));
  assert.match(html, /property="og:title" content="Canadá activa multas de hasta \$1,5 millones contra representantes migratorios que incumplan la ley"/);
  assert.match(html, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /property="article:published_time" content="2026-10-29T/);
  assert.ok(art.seo.description.length <= 160);
  assert.ok(art.seo.fullTitle.length <= 70);
  assert.doesNotMatch(html, /name="robots" content="noindex"/);
  assert.ok(existsSync(join(ROOT, `articulo-${SLUG}.html`)));
  assert.equal(read("sitemap.xml").split(`<loc>${URL_ART}</loc>`).length - 1, 1);
  assert.ok(read("functions/_lib/published-articles.js").includes(`"${SLUG}"`));
});
