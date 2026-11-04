/* Noticia «Canadá cambia Express Entry desde el 3 de noviembre: algunos
   inmigrantes podrán obtener hasta 150 puntos»: noticia principal de la
   portada (orden de la dirección editorial del 2-11-2026), datos verificados
   con IRCC, video propio en TikTok, imagen aprobada, SEO y sección Migración. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";" + read("js/guias.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "canada-cambios-express-entry-3-noviembre-2026";
const IMG = "assets/canada-cambios-express-entry-3-noviembre-2026.jpg";
const COMUNICADO = "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/10/canada-refocusing-express-entry-on-top-talent-that-drives-economic-growth.html";
const CAMBIOS = "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/changes.html";
const art = ctx.A.find((a) => a.slug === SLUG);
const texto = art.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("portada: deja la noticia principal (refugio, 4-11-2026) y pasa a la primera tarjeta, con su imagen; las demás en su orden", () => {
  assert.equal(ctx.H.main.slug, "canada-cambios-proceso-refugio-3-noviembre-2026");
  const t = ctx.H.secondary[0];
  assert.equal(t.slug, SLUG);
  assert.equal(t.title, art.title);
  assert.equal(t.image, `url('${IMG}')`);
  assert.equal(t.demo, false);
  assert.deepEqual(Array.from(ctx.H.secondary, (s) => s.slug), [
    SLUG,
    "hector-rivero-santa-latino-canada",
    "canada-groceries-essentials-benefit-cgeb-2026",
    "alberta-bomberos-forestales-2027",
    "multas-representantes-migratorios-canada-2026",
  ]);
});

test("artículo: sección Migración, fecha del 2 de noviembre en Alberta, una sola URL", () => {
  assert.ok(art && !art.draft && !art.demo);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1);
  assert.equal(art.id, "ART-2026-033");
  assert.equal(art.category, "Migración");
  assert.equal(art.contentType, "Noticia");
  assert.match(art.publishedAt, /^2026-11-02T\d{2}:\d{2}:00-06:00$/);
  assert.equal(ctx.A.filter((a) => a.category === "Migración" && !a.draft && a.demo === false)[1].slug, SLUG, "segunda de la sección Migración, tras la noticia de refugio");
  assert.ok(existsSync(join(ROOT, `articulo-${SLUG}.html`)));
  assert.ok(existsSync(join(ROOT, IMG)));
  assert.ok(existsSync(join(ROOT, `assets/social/${SLUG}.jpg`)));
});

test("datos verificados con IRCC: fecha, máximos condicionados, sin suma, LMIA, pausa y sin garantías", () => {
  assert.match(texto, /martes 3 de noviembre de 2026/);
  assert.match(texto, /150 puntos para candidatos sin cónyuge acompañante/);
  assert.match(texto, /140 puntos para quienes tengan cónyuge o pareja acompañante/);
  assert.match(texto, /no corresponde a todos los solicitantes/);
  assert.match(texto, /50 puntos: .*1,3 veces/);
  assert.match(texto, /70 puntos: .*1,5 veces/);
  assert.match(texto, /100 puntos: .*el doble/);
  assert.match(texto, /no se acumulan entre sí .* puntuación más alta/);
  assert.match(texto, /no significa que cualquier oferta laboral otorgue puntos/);
  assert.match(texto, /Tener una LMIA tampoco otorgará automáticamente puntos/);
  assert.match(texto, /hasta dos semanas/);
  assert.match(texto, /pausará temporalmente las rondas de invitaciones/);
  assert.match(texto, /no garantiza una invitación ni la aprobación/);
  assert.match(texto, /no constituye asesoría migratoria individual/);
});

test("fuentes oficiales de IRCC en el cuerpo y en la lista de fuentes", () => {
  for (const u of [COMUNICADO, CAMBIOS]) {
    assert.ok(art.bodyHtml.includes(`href="${u}"`), u);
    assert.ok(art.sources.some((s) => s.href === u), u);
  }
  for (const s of art.sources) assert.match(s.href, /^https:\/\/www\.canada\.ca\//, "solo fuentes oficiales");
});

test("video propio de TikTok después de la introducción, sin copia local, con botón de respaldo", () => {
  assert.equal(art.video.tiktokId, "7703729347294661908");
  assert.equal(art.video.tiktokUser, "podcastdelmigrante");
  assert.equal(art.video.position, "intro");
  assert.ok(existsSync(join(ROOT, art.video.cover)));
  assert.match(art.bodyHtml, /href="https:\/\/www\.tiktok\.com\/@podcastdelmigrante\/video\/7703729347294661908"[^>]*>▶ Ver la noticia en TikTok</);
  assert.doesNotMatch(art.bodyHtml, /\.mp4|<video/);
});

test("SEO y redes: título, descripción, Open Graph y Twitter con la imagen aprobada", () => {
  assert.equal(art.seo.fullTitle, "Canadá cambia Express Entry desde el 3 de noviembre de 2026");
  assert.equal(art.seo.description, "Canadá modifica Express Entry: hasta 150 puntos por experiencia laboral, nuevas reglas para ofertas de empleo y cambios en la LMIA.");
  const h = read(`articulo-${SLUG}.html`);
  assert.match(h, /<title>Canadá cambia Express Entry desde el 3 de noviembre de 2026/);
  assert.match(h, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(h, new RegExp(`name="twitter:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(h, /name="twitter:card" content="summary_large_image"/);
  assert.match(read("sitemap.xml"), new RegExp(`<loc>https://podcastdelmigrante\\.com/articulo-${SLUG}</loc>\\s*<lastmod>2026-11-02</lastmod>`));
  assert.match(h, new RegExp(`rel="canonical" href="https://podcastdelmigrante\\.com/articulo-${SLUG}"`));
});

test("no toca las ediciones mensuales ni la portada de la Edición 01", () => {
  assert.match(read("index.html"), /<img src="\/assets\/ediciones\/2026-10\/portada\.jpg"/);
  assert.doesNotMatch(read("js/ediciones.js"), new RegExp(SLUG));
});
