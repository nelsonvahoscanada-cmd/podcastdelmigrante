/* Noticia principal del 16-11-2026: «¿Recién llegado a Canadá? Podrías
   recibir ayudas económicas sin haber declarado impuestos» (CGEB y CCB,
   CRA). Portada, texto completo con los dos beneficios, enlaces oficiales
   visibles a RC151 y RC66, sin video inventado, HTML legible sin JavaScript,
   SEO, Open Graph, imagen social y sitemap. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "recien-llegados-canada-beneficios-cra-cgeb-ccb";
const IMG = `assets/${SLUG}.jpg`;
const URL_ART = `https://podcastdelmigrante.com/articulo-${SLUG}`;
const TITULO = "🇨🇦 ¿Recién llegado a Canadá? Podrías recibir ayudas económicas sin haber declarado impuestos";
const art = ctx.A.find((a) => a.slug === SLUG);
const texto = art.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const pagina = read(`articulo-${SLUG}.html`);
const CRA = "https://www.canada.ca/en/revenue-agency/services/";
const OFICIALES = {
  recienLlegados: `${CRA}tax/international-non-residents/individuals-leaving-entering-canada-non-residents/newcomers-canada-immigrants.html`,
  rc151: `${CRA}forms-publications/forms/rc151.html`,
  rc66: `${CRA}forms-publications/forms/rc66.html`,
  cgeb: `${CRA}child-family-benefits/canada-groceries-essentials-benefit/get-benefit.html`,
  ccbQuien: `${CRA}child-family-benefits/canada-child-benefit/who-apply.html`,
  ccbComo: `${CRA}child-family-benefits/canada-child-benefit/how-apply.html`,
  ccbMonto: `${CRA}child-family-benefits/canada-child-benefit/how-much.html`,
};

test("publicada el 16-11-2026 como la noticia más reciente, en Economía e inmigración, sin duplicados", () => {
  assert.ok(art && !art.draft && !art.demo);
  assert.equal(ctx.A[0].slug, SLUG);
  assert.equal(art.id, "ART-2026-044");
  assert.equal(art.title, TITULO);
  assert.equal(art.category, "Economía e inmigración");
  assert.equal(art.contentType, "Noticia");
  assert.match(art.publishedAt, /^2026-11-16T/);
  assert.equal(art.prerender, true);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1);
  assert.equal(new Set(ctx.A.map((a) => a.id)).size, ctx.A.length, "id único");
});

test("portada: noticia principal; la anterior principal pasa a la primera tarjeta y nada se borra", () => {
  assert.equal(ctx.H.main.slug, SLUG);
  assert.equal(ctx.H.main.category, "Economía e inmigración");
  assert.equal(ctx.H.main.date, "16 de noviembre, 2026");
  assert.equal(ctx.H.main.image, `url('${IMG}')`);
  assert.ok(ctx.H.main.alt.length > 40, "texto alternativo");
  assert.equal(ctx.H.secondary[0].slug, "canada-33000-residencias-permanentes-trabajadores-2026");
  assert.equal(ctx.H.secondary.length, 5);
  const slugs = [ctx.H.main.slug, ...ctx.H.secondary.map((s) => s.slug)];
  assert.equal(new Set(slugs).size, slugs.length, "sin duplicados");
  assert.ok(!slugs.includes("canada-cambios-express-entry-3-noviembre-2026"), "Express Entry sale del bloque");
  for (const s of [...slugs, "canada-cambios-express-entry-3-noviembre-2026"]) assert.ok(ctx.A.some((a) => a.slug === s && !a.draft), `${s}: sigue publicada`);
});

test("conserva los dos beneficios: CGEB y CCB, con sus requisitos y montos tal como figuran en el artículo", () => {
  for (const f of [
    "Canada Groceries and Essentials Benefit (CGEB)", "Canada Child Benefit (CCB)",
    "reemplazó en julio de 2026 al antiguo GST/HST credit", "No es necesario tener hijos para ser elegible.",
    "Solamente se requiere una solicitud por hogar.",
    "$8,157 CAD", "$679.75 CAD", "$6,883 CAD", "$573.58 CAD", "$38,237 CAD",
    "son máximos posibles, no pagos garantizados",
    "Haber vivido en Canadá durante los 18 meses anteriores.",
    "no necesariamente puede solicitar inmediatamente el Canada Child Benefit",
    "estos beneficios no son automáticos para todos los inmigrantes",
    "Aviso legal: este contenido es informativo.",
  ]) assert.ok(texto.includes(f), f);
  assert.match(art.bodyHtml, /<table[\s\S]*<caption>/, "tabla de montos con título");
});

test("enlaces oficiales visibles y funcionales (RC151, RC66 y páginas de la CRA); ningún otro destino", () => {
  for (const [k, u] of Object.entries(OFICIALES)) {
    assert.ok(art.bodyHtml.includes(`href="${u}"`), `${k}: enlace en el texto`);
    assert.ok(art.sources.some((s) => s.href === u), `${k}: en las fuentes`);
    assert.ok(pagina.includes(`href="${u}"`), `${k}: en el HTML sin JavaScript`);
  }
  const hrefs = [...art.bodyHtml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const h of hrefs) assert.ok(h.startsWith(CRA), `solo enlaces oficiales de la CRA: ${h}`);
  assert.match(texto, /formulario RC151: https:\/\/ ?www\.canada\.ca/, "la dirección del RC151 se ve escrita");
  assert.match(texto, /formulario RC66: https:\/\/ ?www\.canada\.ca/, "la dirección del RC66 se ve escrita");
});

test("sin video inventado: queda preparado para incorporarlo después", () => {
  assert.equal(art.video, null);
  assert.doesNotMatch(art.bodyHtml, /tiktok|youtube|youtu\.be/i);
});

test("portada propia (no imita documentos oficiales), imagen social 1200×630 y crédito aclaratorio", () => {
  for (const f of [IMG, `assets/social/${SLUG}.jpg`]) assert.ok(existsSync(join(ROOT, f)), f);
  assert.match(art.heroImage.credit, /no es una imagen oficial del Gobierno de Canadá/);
  assert.equal(art.heroImage.aspectRatio, "1672/941");
});

test("SEO, Open Graph y Twitter para WhatsApp y Facebook; NewsArticle y sitemap", () => {
  assert.ok(art.seo.description.length <= 160);
  assert.match(pagina, /<title>¿Recién llegado a Canadá\? Ayudas económicas de la CRA: CGEB y CCB<\/title>/);
  assert.ok(pagina.includes(`rel="canonical" href="${URL_ART}"`));
  assert.ok(pagina.includes(`property="og:url" content="${URL_ART}"`));
  assert.ok(pagina.includes(`property="og:image" content="https://podcastdelmigrante.com/assets/social/${SLUG}.jpg"`));
  assert.match(pagina, /property="og:image:width" content="1200"/);
  assert.match(pagina, /property="og:image:height" content="630"/);
  assert.match(pagina, /property="og:type" content="article"/);
  assert.match(pagina, /name="twitter:card" content="summary_large_image"/);
  assert.match(pagina, /"@type":"NewsArticle"/);
  assert.match(pagina, /"datePublished":"2026-11-16T09:00:00-06:00"/);
  assert.ok(read("sitemap.xml").includes(`<loc>${URL_ART}</loc>`));
});
