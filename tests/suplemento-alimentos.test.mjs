/* Noticia principal del 9-11-2026: «Canadá propone hasta $679 adicionales
   para ayudar a las familias con el costo de los alimentos» (2027 Canada
   Groceries and Essentials Benefit Supplement, Presupuesto 2026). Texto
   editorial completo, video propio de TikTok tras la introducción, imagen
   editorial como portada y vista previa, enlaces oficiales y recuadro
   publicitario separado. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "canada-suplemento-alimentos-679-presupuesto-2026";
const IMG = `assets/${SLUG}.jpg`;
const art = ctx.A.find((a) => a.slug === SLUG);
const [informativo, publicidad] = art.bodyHtml.split('<aside class="article-patrocinio"');
const texto = informativo.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const anuncio = publicidad.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const pagina = read(`articulo-${SLUG}.html`);
const OFICIALES = [
  "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit.html",
  "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit/who-eligible.html",
  "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit/get-benefit.html",
  "https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/rc151.html",
  "https://budget.canada.ca/2026/report-rapport/chap3-en.html",
];

test("publicada el 9-11-2026 como la noticia más reciente, en Finanzas, sin duplicados", () => {
  assert.ok(art && !art.draft && !art.demo);
  assert.equal(ctx.A[0].slug, SLUG);
  assert.equal(art.id, "ART-2026-042");
  assert.equal(art.contentType, "Noticia");
  assert.equal(art.category, "Finanzas");
  assert.equal(art.title, "Canadá propone hasta $679 adicionales para ayudar a las familias con el costo de los alimentos");
  assert.match(art.publishedAt, /^2026-11-09T/);
  assert.equal(new Set(ctx.A.map((a) => a.id)).size, ctx.A.length);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1);
});

test("portada: noticia principal; las anteriores se desplazan y siguen publicadas", () => {
  assert.equal(ctx.H.main.slug, SLUG);
  assert.equal(ctx.H.main.title, art.title);
  assert.equal(ctx.H.main.image, `url('${IMG}')`);
  assert.equal(ctx.H.main.date, "9 de noviembre, 2026");
  assert.deepEqual(Array.from(ctx.H.secondary, (s) => s.slug), [
    "alberta-rent-assistance-benefit-ayuda-alquiler",
    "masterclass-gratuita-ley-intrinseca-creacion-eder-campos",
    "canada-cambios-proceso-refugio-3-noviembre-2026",
    "canada-cambios-express-entry-3-noviembre-2026",
    "hector-rivero-santa-latino-canada",
  ]);
  for (const s of ctx.H.secondary) assert.ok(ctx.A.some((a) => a.slug === s.slug && !a.draft), s.slug);
  assert.ok(ctx.A.some((a) => a.slug === "canada-groceries-essentials-benefit-cgeb-2026" && !a.draft), "el CGEB sigue publicado");
});

test("texto editorial completo: montos máximos, propuesta no aprobada, pago único a inicios de 2027", () => {
  for (const f of [
    "9 de noviembre de 2026 | El Podcast del Migrante | Economía y ayudas económicas",
    "Hasta $679 CAD para una pareja con dos hijos.", "Hasta $339 CAD para una persona soltera sin hijos.",
    "no representan un pago universal", "aumento extraordinario del 50 % del beneficio correspondiente al período 2026–2027",
    "principios de 2027", "todavía es una propuesta presupuestaria", "No existe una solicitud específica abierta para recibir los $679 adicionales.",
    "pago único", "separado de los pagos trimestrales regulares",
    "No basta con tener un permiso de trabajo", "RC151", "RC66",
    "No constituyen una inscripción al suplemento extraordinario de $679.",
    "No entregues información bancaria ni documentos personales",
    "el monto no está garantizado para todas las familias",
    "Conectando latinos, construyendo futuro.",
    "Nota editorial: Información actualizada al 9 de noviembre de 2026.",
  ]) assert.ok(texto.includes(f), f);
  const h2 = [...art.bodyHtml.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.equal(h2[0], "¿Cuánto dinero adicional propone entregar Canadá?", "el video se coloca tras la introducción");
});

test("los cinco enlaces oficiales, en pestaña nueva, y fuentes", () => {
  for (const u of OFICIALES) assert.ok(informativo.includes(`<a href="${u}" target="_blank" rel="noopener">`), u);
  assert.deepEqual(JSON.parse(JSON.stringify(art.sources.map((s) => s.href))).sort(), [...OFICIALES].sort());
});

test("video propio de TikTok (enlace corto resuelto), sin descarga ni reproducción automática", () => {
  assert.equal(art.video.tiktokId, "7706353073295297813");
  assert.equal(art.video.tiktokUser, "podcastdelmigrante");
  assert.equal(art.video.position, "intro");
  assert.ok(existsSync(join(ROOT, art.video.cover)));
  assert.ok(informativo.includes('href="https://www.tiktok.com/@podcastdelmigrante/video/7706353073295297813"'), "botón «VER VIDEO EN TIKTOK»");
  assert.doesNotMatch(art.bodyHtml, /\.mp4|<iframe|autoplay/);
});

test("patrocinio separado del contenido gubernamental, promoción condicionada", () => {
  assert.ok(publicidad, "recuadro publicitario");
  assert.doesNotMatch(texto, /Toyota|gasolina/);
  assert.match(publicidad, /^ aria-label="Publicidad">/);
  for (const f of ["Publicidad", "Esta noticia llega gracias a Toyota Country Hills Calgary.", "asesores latinos", "tarjeta de gasolina de $200 CAD", "sujeta a confirmación de las condiciones de la promoción con el concesionario", "el concesionario no patrocina ese programa"]) assert.ok(anuncio.includes(f), f);
});

test("imagen de portada y vista previa para redes; SEO y sitemap", () => {
  assert.equal(art.heroImage.background, `url('${IMG}')`);
  assert.ok(existsSync(join(ROOT, IMG)) && existsSync(join(ROOT, `assets/social/${SLUG}.jpg`)));
  assert.ok(art.seo.description.length <= 160);
  assert.match(pagina, /<title>Canadá propone hasta \$679 más para alimentos: suplemento 2027<\/title>/);
  assert.ok(pagina.includes(`property="og:title" content="${art.title}"`));
  assert.ok(pagina.includes(`property="og:image" content="https://podcastdelmigrante.com/assets/social/${SLUG}.jpg"`));
  assert.ok(pagina.includes(`name="twitter:image" content="https://podcastdelmigrante.com/assets/social/${SLUG}.jpg"`));
  assert.ok(read("sitemap.xml").includes(`https://podcastdelmigrante.com/articulo-${SLUG}</loc>`));
});
