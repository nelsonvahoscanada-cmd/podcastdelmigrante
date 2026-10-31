/* Noticia «Gobierno de Alberta ofrece empleo desde casa con salario de hasta
   $80.375 al año»: noticia principal de la portada (Santa Latino pasa a la
   primera tarjeta secundaria), datos de la convocatoria oficial 88299
   (verificada el 30-10-2026), botón de postulación, video de TikTok, imagen
   y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "alberta-empleo-desde-casa-program-eligibility-assessor-2026";
const URL_ART = `https://podcastdelmigrante.com/articulo-${SLUG}`;
const IMG = `assets/${SLUG}.jpg`;
const OFERTA = "https://jobpostings.alberta.ca/job/Edmonton-Program-Eligibility-Assessor/607379317/";
const art = ctx.A.find((a) => a.slug === SLUG);

test("portada: noticia principal; Santa Latino pasa a la primera tarjeta y el orden sigue, sin borrar nada", () => {
  assert.equal(ctx.H.main.slug, SLUG);
  assert.equal(ctx.H.main.title, art.title);
  assert.equal(ctx.H.main.dek, art.dek);
  assert.equal(ctx.H.main.image, `url('${IMG}')`);
  assert.equal(ctx.H.main.demo, false);
  assert.deepEqual(Array.from(ctx.H.secondary, (s) => s.slug), [
    "hector-rivero-santa-latino-canada",
    "alberta-bomberos-forestales-2027",
    "multas-representantes-migratorios-canada-2026",
    "referendum-alberta-octubre-2026-inmigrantes",
  ]);
  assert.equal(ctx.H.secondary[0].image, "url('assets/yt/LxTr1Zda3dg.jpg')", "Santa Latino conserva su imagen");
  const sale = ctx.A.find((a) => a.slug === "alberta-energy-rebate-plazo-octubre");
  assert.ok(sale && !sale.draft, "la noticia que sale de las destacadas sigue publicada");
  assert.ok(existsSync(join(ROOT, "articulo-alberta-energy-rebate-plazo-octubre.html")), "y conserva su URL");
});

test("artículo: datos de la convocatoria oficial, sin promesas de contratación ni de patrocinio", () => {
  assert.ok(art && !art.draft && !art.demo);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1);
  assert.equal(art.id, "ART-2026-032");
  assert.equal(art.category, "Empleo en Alberta");
  assert.equal(art.contentType, "Noticia");
  assert.match(art.publishedAt, /^2026-10-30T/);
  const texto = art.dek + art.bodyHtml;
  for (const dato of ["Program Eligibility Assessor", "Assisted Living and Social Services", "$61.754 a $80.375 CAD", "$2.366,06 a $3.079,52", "lunes 2 de noviembre de 2026", "ADAP", "AISH", "diploma de dos años", "un año por un año", "36,25 horas semanales", "8:15 a. m. a 4:30 p. m.", "30 de junio de 2028", "88299", "antecedentes penales", "IQAS", "dentro de Alberta", "no indica que el empleador ofrezca patrocinio migratorio", "no garantiza contrataciones"]) {
    assert.ok(texto.includes(dato), dato);
  }
  assert.match(art.bodyHtml, /el anuncio exige un conocimiento amplio/, "el anuncio exige (no solo valora) esos conocimientos");
  assert.doesNotMatch(texto, /(?<!no )garantiza(mos)? (tu|la) (contratación|visa|residencia)|patrocinio garantizado/i, "solo negaciones de garantía");
  assert.deepEqual(Array.from(art.sources, (f) => f.href), [OFERTA], "fuente oficial al final");
});

test("postulación: recuadro de cierre y botón «Postularme en el Gobierno de Alberta» a la oferta oficial", () => {
  const botones = art.bodyHtml.match(/<a class="article-apply" href="([^"]+)" target="_blank" rel="noopener">Postularme en el Gobierno de Alberta<\/a>/g) || [];
  assert.equal(botones.length, 2, "uno junto al cierre y otro en «¿Cómo postularse?»");
  for (const b of botones) assert.ok(b.includes(`href="${OFERTA}"`));
  assert.match(art.bodyHtml, /class="article-deadline"[\s\S]*Lunes 2 de noviembre de 2026[\s\S]*Trabajo remoto solo desde Alberta\. El anuncio no garantiza la contratación ni ofrece patrocinio migratorio\./);
  assert.ok(art.bodyHtml.indexOf("article-deadline") < art.bodyHtml.indexOf("<h2"), "el cierre se ve antes del desarrollo");
  const css = read("css/article.css");
  assert.match(css, /\.article-body a\.article-apply \{[^}]*background: var\(--verde-oscuro\); color: var\(--blanco\)/, "botón verde con texto blanco (contraste AA)");
});

test("imagen: ilustración de la noticia, identificada como asistida por IA y completa al compartir", () => {
  assert.equal(art.heroImage.background, `url('${IMG}')`);
  assert.match(art.heroImage.credit, /asistida por inteligencia artificial/);
  assert.match(art.heroImage.credit, /no es una imagen ni una captura oficial del Gobierno de Alberta/);
  assert.equal(art.heroImage.socialArea, "0% 100%");
  assert.equal(art.heroImage.socialLabel, "Ilustración editorial asistida por IA");
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
  assert.match(html, /property="og:title" content="Gobierno de Alberta ofrece empleo desde casa con salario de hasta \$80\.375 al año: solicitudes cierran el 2 de noviembre"/);
  assert.match(html, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(html, new RegExp(`name="twitter:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /property="article:published_time" content="2026-10-30T/);
  assert.ok(art.seo.description.length <= 160);
  assert.ok(art.seo.fullTitle.length <= 70);
  assert.match(art.seo.description, /2 de noviembre/);
  assert.doesNotMatch(html, /name="robots" content="noindex"/);
  assert.equal(read("sitemap.xml").split(`<loc>${URL_ART}</loc>`).length - 1, 1);
  assert.ok(read("functions/_lib/published-articles.js").includes(`"${SLUG}"`));
});

test("video: TikTok propio tras la introducción, con portada local, sin alojar el video", () => {
  assert.deepEqual({ ...art.video }, {
    tiktokId: "7702612054762327348",
    tiktokUser: "podcastdelmigrante",
    title: "Informe de Nelson Vahos: el Gobierno de Alberta ofrece empleo desde casa con salario de hasta $80.375 al año",
    heading: "🎥 Mira el informe de Nelson Vahos",
    cover: `assets/${SLUG}-video.jpg`,
    position: "intro",
  });
  const portada = readFileSync(join(ROOT, art.video.cover));
  assert.equal(portada.readUInt16BE(0), 0xffd8);
  assert.ok(portada.length < 150 * 1024);
  assert.doesNotMatch(art.bodyHtml, /tiktok/i, "el video no se copia en el cuerpo");
});
