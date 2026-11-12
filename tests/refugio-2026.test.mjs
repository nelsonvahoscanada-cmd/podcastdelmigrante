/* Noticia «Canadá cambia el proceso para solicitar refugio: estas son las nuevas
   reglas desde el 3 de noviembre de 2026» (Nelson Vahos): noticia principal de
   la portada (orden de la dirección del 4-11-2026), texto completo con sus
   fechas, advertencias y enlaces oficiales de IRCC, video propio en TikTok,
   ilustración editorial y recuadro de Country Hills Toyota separado. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "canada-cambios-proceso-refugio-3-noviembre-2026";
const IMG = `assets/${SLUG}.jpg`;
const TIKTOK = "7704144243954060565";
const OFICIALES = [
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/asylum-process-changes.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11/canada-modernizes-the-asylum-system-to-support-timely-decisions.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/eligibility.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/start/in-canada.html",
];
const art = ctx.A.find((a) => a.slug === SLUG);
const [periodistico, publicidad] = art.bodyHtml.split('<aside class="article-patrocinio"');
const texto = (h) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("portada: cuarta tarjeta (tras el suplemento, el alquiler en Alberta y la masterclass; principal: 33.000 residencias, 11-11-2026) con su ilustración; las demás en su orden", () => {
  assert.equal(ctx.H.main.slug, "canada-33000-residencias-permanentes-trabajadores-2026");
  const t = ctx.H.secondary[3];
  assert.equal(t.slug, SLUG);
  assert.equal(t.title, art.title);
  assert.equal(t.image, `url('${IMG}')`);
  assert.equal(t.category, "Migración");
  assert.equal(t.demo, false);
  assert.match(t.alt, /^Ilustración editorial/);
  assert.deepEqual(Array.from(ctx.H.secondary, (s) => s.slug), [
    "canada-suplemento-alimentos-679-presupuesto-2026",
    "alberta-rent-assistance-benefit-ayuda-alquiler",
    "masterclass-gratuita-ley-intrinseca-creacion-eder-campos",
    "canada-cambios-proceso-refugio-3-noviembre-2026",
    "canada-cambios-express-entry-3-noviembre-2026",
  ]);
});

test("artículo: Migración, Nelson Vahos, 4 de noviembre de 2026, una sola URL, imágenes optimizadas", () => {
  assert.ok(art && !art.draft && art.demo === false);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG).length, 1);
  assert.equal(new Set(ctx.A.map((a) => a.id)).size, ctx.A.length, "identificadores únicos");
  assert.equal(art.id, "ART-2026-039");
  assert.equal(art.category, "Migración");
  assert.equal(art.contentType, "Noticia");
  assert.deepEqual({ ...art.author }, { mode: "colaborador", name: "Nelson Vahos" });
  assert.match(art.publishedAt, /^2026-11-04T/);
  assert.equal(ctx.A.filter((a) => a.category === "Migración" && !a.draft && a.demo === false)[0].slug, SLUG, "encabeza la sección Migración");
  assert.match(art.heroImage.alt, /^Ilustración editorial/);
  assert.match(art.heroImage.credit, /^Ilustración editorial de El Podcast del Migrante\. .*ilustrativos/);
  for (const [f, max] of [[IMG, 450e3], [`assets/social/${SLUG}.jpg`, 300e3], [`assets/${SLUG}-video.jpg`, 150e3]]) {
    assert.ok(existsSync(join(ROOT, f)), f);
    assert.ok(readFileSync(join(ROOT, f)).length < max, `${f} optimizada`);
  }
  assert.ok(existsSync(join(ROOT, `articulo-${SLUG}.html`)));
});

test("texto completo: títulos, fechas, advertencias y excepciones", () => {
  const t = texto(periodistico);
  for (const h of ["¿Qué cambió desde el 3 de noviembre de 2026?", "Atención: también existen nuevas restricciones para solicitar refugio", "Primera restricción: el plazo de un año", "Segunda restricción: ingreso desde Estados Unidos entre pasos fronterizos oficiales", "¿Existen excepciones?", "¿Qué ocurre si comenzaste tu solicitud antes del 3 de noviembre?", "¿Qué deben hacer las personas que están considerando solicitar refugio?", "El Podcast del Migrante te mantiene informado", "Mira el informe en video", "Fuentes oficiales"]) assert.ok(periodistico.includes(`>${h}</h`), h);
  for (const f of ["Ottawa, Canadá | 4 de noviembre de 2026", "martes 3 de noviembre de 2026", "26 de marzo de 2026", "Ley C-12", "3 de junio de 2025", "24 de junio de 2020", "más de un año", "14 días", "Acuerdo de Tercer País Seguro", "menores de edad no acompañados", "evaluación de riesgo previa a la expulsión (PRRA)", "no una alternativa automática para prolongar una estadía temporal en Canadá", "abogado o consultor de inmigración canadiense autorizado", "Nelson Vahos | El Podcast del Migrante Magazine", "Nota editorial: Este contenido es informativo y no sustituye la asesoría legal o migratoria individualizada."]) assert.ok(t.includes(f), f);
  assert.equal((periodistico.match(/<li>/g) || []).length, 6 + 3 + 4, "6 cambios, 3 pasos y 4 fuentes");
});

test("enlaces oficiales de IRCC en el cuerpo y en las fuentes; video de TikTok", () => {
  for (const u of OFICIALES) {
    assert.ok(periodistico.includes(`href="${u}" target="_blank" rel="noopener"`), u);
    assert.ok(art.sources.some((s) => s.href === u), u);
  }
  assert.equal(art.sources.length, 4);
  assert.equal(art.video.tiktokId, TIKTOK);
  assert.equal(art.video.tiktokUser, "podcastdelmigrante");
  assert.equal(art.video.cover, `assets/${SLUG}-video.jpg`);
  assert.equal(art.video.position, "intro");
  assert.ok(periodistico.includes(`href="https://www.tiktok.com/@podcastdelmigrante/video/${TIKTOK}"`), "enlace definitivo del video");
  assert.ok(!art.bodyHtml.includes("vt.tiktok.com"), "sin el enlace corto");
});

test("patrocinio de Country Hills Toyota separado del contenido periodístico y con sus condiciones vigentes", () => {
  assert.ok(publicidad, "recuadro publicitario presente");
  assert.equal((art.bodyHtml.match(/article-patrocinio"/g) || []).length, 1);
  assert.ok(art.bodyHtml.trim().endsWith("</aside>"), "al final, después de la nota editorial");
  assert.doesNotMatch(periodistico, /Toyota|gasolina|Tomás Velázquez/i, "el texto periodístico no menciona al patrocinador");
  const p = texto(publicidad);
  assert.match(publicidad, /aria-label="Publicidad"/);
  assert.match(p, /Publicidad · Reconocimiento a nuestro patrocinador/);
  assert.match(p, /atención en español/);
  assert.match(p, /vehículo nuevo y mencionar a El Podcast del Migrante, recibes una tarjeta de gasolina de \$200 CAD/);
  assert.match(p, /exclusivamente a la compra de vehículos nuevos/);
  assert.match(p, /sin relación con el proceso de refugio ni con el Gobierno de Canadá/);
  assert.match(publicidad, /href="perfil-tomas-velazquez\.html\?utm_source=podcastdelmigrante&amp;utm_medium=patrocinio&amp;utm_campaign=country-hills-toyota&amp;utm_content=articulo-refugio"/);
  assert.equal(art.sponsored, false, "la noticia no es contenido patrocinado");
});

test("SEO, redes, contador de visitas y sitemap", () => {
  assert.ok(art.seo.description.length >= 120 && art.seo.description.length <= 160, `descripción de ${art.seo.description.length} caracteres`);
  assert.equal(art.seo.canonicalPath, `/migracion/${SLUG}/`);
  const h = read(`articulo-${SLUG}.html`);
  assert.match(h, new RegExp(`<link id="canonicalLink" rel="canonical" href="https://podcastdelmigrante\\.com/articulo-${SLUG}">`));
  assert.match(h, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
  assert.match(h, /property="og:image:width" content="1200"/);
  assert.match(h, /name="twitter:card" content="summary_large_image"/);
  assert.match(h, /property="og:type" content="article"/);
  assert.match(read("functions/_lib/published-articles.js"), /"ART-2026-039"/);
  assert.match(read("functions/_lib/published-articles.js"), new RegExp(`"${SLUG}"`));
  assert.match(read("sitemap.xml"), new RegExp(`<loc>https://podcastdelmigrante\\.com/articulo-${SLUG}</loc>\\s*<lastmod>2026-11-04</lastmod>`));
});
