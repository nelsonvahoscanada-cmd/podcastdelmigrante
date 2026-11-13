/* Noticia principal del 11-11-2026: «Canadá acelera 33.000 residencias
   permanentes: 15.100 trabajadores ya fueron beneficiados. ¿Quiénes
   califican?» (In-Canada Workers Initiative, IRCC). Portada, texto con las
   cifras verificadas, video de TikTok antes de «¿Quiénes pueden beneficiarse
   realmente?», fuentes oficiales, HTML legible sin JavaScript (contenido y
   NewsArticle en la página), SEO, imagen social y sitemap. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "canada-33000-residencias-permanentes-trabajadores-2026";
const IMG = `assets/${SLUG}.jpg`;
const URL_ART = `https://podcastdelmigrante.com/articulo-${SLUG}`;
const TITULO = "Canadá acelera 33.000 residencias permanentes: 15.100 trabajadores ya fueron beneficiados. ¿Quiénes califican?";
const TIKTOK = "https://www.tiktok.com/@podcastdelmigrante/video/7707075782757190933";
const art = ctx.A.find((a) => a.slug === SLUG);
const texto = art.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const pagina = read(`articulo-${SLUG}.html`);
const IRCC = {
  comunicado: "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/04/filling-labour-gaps-in-smaller-communities-by-accelerating-permanent-residence-for-33000-workers.html",
  estadisticas: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/reports-statistics/statistics-open-data/immigration-stats/permanent-residents.html",
  comite: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/transparency/committees/cow-may-28-2026/33k-ongoing-one-time-initiative-temporary-resident-permanent-resident-transition.html",
  estado: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html",
  general: "https://www.canada.ca/en/services/immigration-citizenship.html",
  representantes: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/choose/authorized.html",
};

test("publicada el 11-11-2026 como la noticia más reciente, en Inmigración, sin duplicados", () => {
  assert.ok(art && !art.draft && !art.demo);
  assert.equal(ctx.A[0].slug, SLUG);
  assert.equal(art.id, "ART-2026-043");
  assert.equal(art.title, TITULO);
  assert.equal(art.category, "Inmigración");
  assert.equal(art.contentType, "Noticia");
  assert.match(art.publishedAt, /^2026-11-11T/);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1);
  assert.equal(new Set(ctx.A.map((a) => a.id)).size, ctx.A.length, "id único");
});

test("portada: noticia principal; la anterior principal pasa a la primera tarjeta y nada se borra", () => {
  assert.equal(ctx.H.main.slug, SLUG);
  assert.equal(ctx.H.main.title, TITULO);
  assert.equal(ctx.H.main.category, "Inmigración");
  assert.equal(ctx.H.main.date, "11 de noviembre, 2026");
  assert.equal(ctx.H.main.image, `url('${IMG}')`);
  assert.ok(ctx.H.main.alt.length > 40, "texto alternativo");
  assert.equal(ctx.H.secondary[0].slug, "canada-suplemento-alimentos-679-presupuesto-2026");
  assert.equal(ctx.H.secondary.length, 5);
  const slugs = [ctx.H.main.slug, ...ctx.H.secondary.map((s) => s.slug)];
  assert.equal(new Set(slugs).size, slugs.length, "sin duplicados");
  for (const s of [...slugs, "hector-rivero-santa-latino-canada"]) assert.ok(ctx.A.some((a) => a.slug === s && !a.draft), `${s}: sigue publicada`);
});

test("cifras verificadas con IRCC: 33.000 en 2026-2027, 15.100 hasta agosto de 2026, programas y sin convocatoria nueva", () => {
  for (const f of [
    "In-Canada Workers Initiative", "hasta 33.000 trabajadores temporales", "al menos 20.000 trabajadores",
    "15.100 trabajadores obtuvieron la residencia permanente entre enero y agosto de 2026",
    "página actualizada el 20 de octubre de 2026", "3.600 trabajadores admitidos",
    "Provincial Nominee Program (PNP)", "Atlantic Immigration Program (AIP)", "Rural Community Immigration Pilot (RCIP)",
    "Francophone Community Immigration Pilot (FCIP)", "Home Care Worker Immigration Pilots", "Agri-Food Pilot",
    "no existe una convocatoria general nueva", "no necesitan realizar una gestión adicional",
    "No está regalando 33.000 residencias ni abrió una inscripción general para reclamarlas.",
    "Nota editorial: información verificada el 11 de noviembre de 2026",
  ]) assert.ok(texto.includes(f), f);
});

test("sin promesas: ni residencias gratuitas, ni aprobación automática, ni inscripciones inexistentes", () => {
  assert.doesNotMatch(texto, /residencias? (gratis|gratuitas?)|inscr[ií]bete (aquí|ya)|reg[ií]strate (aquí|ya)|aprobaci[oó]n garantizada (para|de) todos|cupos? disponibles?/i);
  assert.match(texto, /no significa que el Gobierno esté regalando residencias/);
  assert.match(texto, /no debe interpretar esta iniciativa como una aprobación automática ni como una nueva vía de inscripción/);
  assert.match(texto, /no garantiza ser beneficiario/);
  assert.match(texto, /Desconfía de cualquier persona que asegure tener una inscripción especial/);
  const hrefs = [...art.bodyHtml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const h of hrefs) assert.match(h, /^https:\/\/(www\.canada\.ca\/|www\.tiktok\.com\/@podcastdelmigrante\/|www\.podcastdelmigrante\.com$)/, `enlace permitido: ${h}`);
});

test("fuentes oficiales de IRCC enlazadas en el texto y en la lista de fuentes", () => {
  const hrefs = new Set([...art.bodyHtml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]));
  for (const [k, u] of Object.entries(IRCC)) assert.ok(hrefs.has(u), `${k}: ${u}`);
  const fuentes = art.sources.map((s) => s.href);
  for (const k of ["comunicado", "estadisticas", "comite", "estado", "representantes"]) assert.ok(fuentes.includes(IRCC[k]), k);
  for (const m of art.bodyHtml.matchAll(/<a [^>]*href="https:\/\/www\.(canada\.ca|tiktok\.com)[^"]*"[^>]*>/g)) {
    assert.match(m[0], /target="_blank"/, m[0]);
    assert.match(m[0], /rel="noopener[^"]*"/, m[0]);
  }
});

test("video de TikTok: reproductor existente, antes de «¿Quiénes pueden beneficiarse realmente?», sin descargarlo", () => {
  assert.equal(art.video.tiktokId, "7707075782757190933");
  assert.equal(art.video.tiktokUser, "podcastdelmigrante");
  assert.equal(art.video.position, "antes-de");
  assert.equal(art.video.beforeHeading, "¿Quiénes pueden beneficiarse realmente?");
  assert.ok(!art.video.youtubeId && !/\.mp4/i.test(JSON.stringify(art.video)), "sin video descargado");
  const v = pagina.indexOf('class="article-video article-video--tiktok"');
  const h = pagina.indexOf("<h2>¿Quiénes pueden beneficiarse realmente?</h2>");
  const anterior = pagina.indexOf("<h2>Ya hay resultados: 15.100 nuevos residentes permanentes</h2>");
  assert.ok(anterior > 0 && anterior < v && v < h, "entre «Ya hay resultados…» y «¿Quiénes pueden beneficiarse realmente?»");
  assert.equal(pagina.split("article-video--tiktok").length - 1, 1, "un solo reproductor");
  const bloque = pagina.slice(v, h);
  assert.match(bloque, new RegExp(`href="${TIKTOK.replace(/[.?]/g, "\\$&")}"`), "enlace alternativo «abrir en TikTok»");
  assert.doesNotMatch(bloque, /<iframe/, "el reproductor solo se carga al tocar (sin autoplay)");
  assert.match(pagina, new RegExp(`<a class="article-apply" href="${TIKTOK.replace(/[.?]/g, "\\$&")}"[^>]*target="_blank"`));
});

test("HTML sin JavaScript: contenido completo, NewsArticle y scripts versionados", () => {
  assert.match(pagina, new RegExp(`<article class="[^"]*" id="articleRoot" data-prerendered="${SLUG}"`));
  assert.match(pagina, new RegExp(`<h1[^>]*>${TITULO.replace(/[.?¿]/g, "\\$&")}</h1>`));
  for (const f of ["15.100 trabajadores obtuvieron la residencia permanente", "¿Cómo puedo solicitar una de estas 33.000 residencias?", "Cuidado con las falsas promesas", "Nota editorial"]) assert.ok(pagina.includes(f), f);
  assert.match(pagina, /No es un anuncio oficial del Gobierno de Canadá/, "crédito de la ilustración");
  const m = pagina.match(/<script type="application\/ld\+json" id="articleJsonLd">([\s\S]*?)<\/script>/);
  assert.ok(m, "NewsArticle en el HTML");
  const ld = JSON.parse(m[1]);
  assert.equal(ld["@type"], "NewsArticle");
  assert.equal(ld.headline, TITULO);
  assert.equal(ld.datePublished, art.publishedAt);
  assert.equal(ld.mainEntityOfPage["@id"], URL_ART);
  assert.equal(ld.image, `https://podcastdelmigrante.com/${IMG}`);
  assert.doesNotMatch(pagina, /noindex/);
  for (const s of ["data", "articles", "article", "vistas"]) assert.match(pagina, new RegExp(`<script src="js/${s}\\.js\\?v=[0-9a-f]{10}"`), s);
});

test("SEO: título, descripción, canónica, Open Graph, Twitter, imagen social 1200×630 y sitemap", () => {
  assert.equal(art.seo.fullTitle, "Canadá acelera 33.000 residencias permanentes: requisitos y beneficiarios");
  assert.equal(art.seo.description, "IRCC confirma que 15.100 trabajadores ya obtuvieron residencia permanente mediante la iniciativa de 33.000. Conoce quiénes califican y evita engaños.");
  assert.ok(art.seo.description.length <= 160);
  assert.match(pagina, /<title>Canadá acelera 33\.000 residencias permanentes: requisitos y beneficiarios<\/title>/);
  assert.match(pagina, new RegExp(`<link id="canonicalLink" rel="canonical" href="${URL_ART}">`));
  assert.match(pagina, new RegExp(`property="og:url" content="${URL_ART}"`));
  assert.match(pagina, /property="og:type" content="article"/);
  assert.match(pagina, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(pagina, /property="og:image:width" content="1200"/);
  assert.match(pagina, /property="og:image:height" content="630"/);
  assert.match(pagina, new RegExp(`name="twitter:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  const b = readFileSync(join(ROOT, `assets/social/${SLUG}.jpg`));
  let i = 2, dims = null;
  while (i < b.length) {
    const marca = b[i + 1], largo = b.readUInt16BE(i + 2);
    if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) { dims = `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`; break; }
    i += 2 + largo;
  }
  assert.equal(dims, "1200x630");
  assert.ok(existsSync(join(ROOT, IMG)));
  const sitemap = read("sitemap.xml");
  assert.match(sitemap, new RegExp(`<loc>${URL_ART}</loc>\\s*<lastmod>2026-11-11</lastmod>`));
  assert.equal(sitemap.split(`<loc>${URL_ART}</loc>`).length - 1, 1);
});

test("todas las noticias publicadas llevan su contenido en el HTML (como esta)", () => {
  for (const a of ctx.A.filter((x) => !x.draft)) {
    const h = read(`articulo-${a.slug}.html`);
    assert.match(h, /data-prerendered=/, a.slug);
    assert.match(h, /id="articleJsonLd"/, a.slug);
  }
});
