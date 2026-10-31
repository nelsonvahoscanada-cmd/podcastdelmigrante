/* Episodio de Héctor Rivero («Santa Latino»): noticia principal, artículo
   completo, Podcast del Migrante Play, imagen social y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO; globalThis.V = VIDEOS;", ctx);
const SLUG = "hector-rivero-santa-latino-canada";
const VIDEO = "LxTr1Zda3dg";
const URL_ART = `https://podcastdelmigrante.com/articulo-${SLUG}`;
const art = ctx.A.find((a) => a.slug === SLUG);

test("artículo: noticia completa con su estructura periodística y sin afirmaciones inventadas", () => {
  assert.ok(art, "artículo publicado en js/articles.js");
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1, "una sola URL");
  assert.equal(art.title, "Héctor Rivero, el Santa Latino que convirtió su historia migratoria en esperanza para las familias de Canadá");
  assert.match(art.dek, /^De Venezuela a Niagara Falls, pasando por Panamá y Estados Unidos/);
  assert.equal(art.contentType, "Noticia");
  assert.equal(art.demo, false);
  assert.ok(!art.draft);
  const h2 = [...art.bodyHtml.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.deepEqual(h2, [
    "Un viaje migratorio marcado por la fe y la perseverancia",
    "El traje de Santa que comenzó a cambiar su vida",
    "Diez bicicletas y una Navidad inolvidable en Niagara Falls",
    "Un Santa que también es emprendedor",
    "Su próximo sueño: aparecer en un comercial de Coca-Cola",
    "Una historia que va más allá de la Navidad",
  ]);
  assert.match(art.bodyHtml, /Se trata de un sueño personal, no de una colaboración anunciada con la marca\./, "Coca-Cola: aspiración, no colaboración");
  assert.match(art.bodyHtml, /Las experiencias personales y aspiraciones se presentan como su testimonio\./, "fuente: su testimonio");
  assert.match(art.bodyHtml, /Según cuenta, también consiguió reunir aproximadamente diez bicicletas/);
  assert.match(art.bodyHtml, /<a href="https:\/\/youtu\.be\/LxTr1Zda3dg" target="_blank" rel="noopener">/);
  assert.match(art.bodyHtml, /<a href="\/#video">El Podcast del Migrante Play<\/a>/, "enlace interno a Play");
  assert.doesNotMatch(art.bodyHtml, /<blockquote|«[^»]{20,}»/, "sin citas textuales inventadas");
  assert.equal(art.video.youtubeId, VIDEO);
});

test("portada: Santa Latino pasa a la primera tarjeta secundaria tras la noticia de empleo; nada se borra", () => {
  assert.equal(ctx.H.main.slug, "alberta-empleo-desde-casa-program-eligibility-assessor-2026");
  const santa = ctx.H.secondary[0];
  assert.equal(santa.slug, SLUG);
  assert.equal(santa.title, art.title);
  assert.equal(santa.image, `url('assets/yt/${VIDEO}.jpg')`);
  assert.equal(santa.demo, false);
  assert.ok(santa.alt.length > 40, "texto alternativo");
  assert.ok(ctx.H.secondary.some((x) => x.slug === "referendum-alberta-octubre-2026-inmigrantes"), "la noticia principal anterior sigue entre las secundarias");
  assert.equal(ctx.H.secondary.length, 4);
  for (const s of ["referendum-alberta-octubre-2026-inmigrantes", "rocky-ridge-athletic-park-calgary", "alberta-energy-rebate-plazo-octubre"]) {
    assert.ok(ctx.A.some((a) => a.slug === s && !a.draft), `${s}: sigue publicado`);
  }
});

test("Podcast del Migrante Play: primer episodio del carrusel, sin duplicados, con su artículo", () => {
  const publicados = ctx.V.filter((v) => v.published);
  assert.equal(publicados[0].videoId, VIDEO);
  assert.equal(publicados[0].title, "Héctor Rivero, el Santa Latino en Canadá");
  assert.equal(publicados[0].articleSlug, SLUG);
  assert.equal(ctx.V.filter((v) => v.videoId === VIDEO).length, 1, "sin registros duplicados");
  assert.match(read("js/video-cover.js"), /"LxTr1Zda3dg": \["\/assets\/yt\/LxTr1Zda3dg\.jpg", 1280, 720\]/, "miniatura oficial local");
  assert.ok(existsSync(join(ROOT, `assets/yt/${VIDEO}.jpg`)));
});

test("página del artículo: canonical, Open Graph, Twitter, imagen social propia y sitemap", () => {
  const html = read(`articulo-${SLUG}.html`);
  assert.match(html, new RegExp(`<link id="canonicalLink" rel="canonical" href="${URL_ART}">`));
  assert.match(html, new RegExp(`property="og:url" content="${URL_ART}"`));
  assert.match(html, /property="og:type" content="article"/);
  assert.match(html, /property="og:title" content="Héctor Rivero, el Santa Latino que convirtió su historia migratoria en esperanza para las familias de Canadá"/);
  assert.match(html, /property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/social\/hector-rivero-santa-latino-canada\.jpg"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /property="article:published_time" content="2026-10-\d\dT/);
  assert.match(html, /<title>Héctor Rivero, el Santa Latino en Canadá: de Venezuela a Niagara Falls<\/title>/);
  assert.ok(art.seo.description.length <= 160, "metadescripción de hasta 160 caracteres");
  assert.doesNotMatch(html, /name="robots" content="noindex"/);
  const jpg = readFileSync(join(ROOT, `assets/social/${SLUG}.jpg`));
  assert.equal(jpg.readUInt16BE(0), 0xffd8, "JPEG");
  assert.ok(jpg.length < 300 * 1024, "menos de 300 KB");
  const sitemap = read("sitemap.xml");
  assert.equal(sitemap.split(`<loc>${URL_ART}</loc>`).length - 1, 1, "una vez en el sitemap");
});
