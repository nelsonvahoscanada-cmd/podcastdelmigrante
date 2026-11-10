/* Noticia principal del 8-11-2026: «¿Vives en Alberta y no te alcanza para
   pagar el alquiler? …» (Rent Assistance Benefit). Texto editorial completo,
   video propio de TikTok antes de «¿Quiénes pueden solicitar esta ayuda?»,
   imagen editorial como portada y vista previa, enlaces oficiales. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "alberta-rent-assistance-benefit-ayuda-alquiler";
const IMG = `assets/${SLUG}.jpg`;
const art = ctx.A.find((a) => a.slug === SLUG);
const texto = art.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const pagina = read(`articulo-${SLUG}.html`);

test("publicada el 8-11-2026 (segunda más reciente, tras la del 9-11-2026), en Vivienda", () => {
  assert.ok(art && !art.draft);
  assert.equal(ctx.A[1].slug, SLUG);
  assert.equal(art.id, "ART-2026-041");
  assert.equal(art.contentType, "Noticia");
  assert.equal(art.category, "Vivienda");
  assert.equal(art.title, "¿Vives en Alberta y no te alcanza para pagar el alquiler? Conoce la ayuda mensual que ofrece el Gobierno");
  assert.match(art.publishedAt, /^2026-11-08T/);
  assert.equal(new Set(ctx.A.map((a) => a.id)).size, ctx.A.length);
});

test("portada: primera tarjeta destacada (principal: suplemento de alimentos, 9-11-2026); las anteriores siguen publicadas", () => {
  assert.equal(ctx.H.main.slug, "canada-suplemento-alimentos-679-presupuesto-2026");
  assert.equal(ctx.H.secondary[0].slug, SLUG);
  assert.equal(ctx.H.secondary[0].title, art.title);
  assert.equal(ctx.H.secondary[0].image, `url('${IMG}')`);
  assert.equal(ctx.H.secondary[0].date, "8 de noviembre");
  assert.equal(ctx.H.secondary[1].slug, "masterclass-gratuita-ley-intrinseca-creacion-eder-campos");
  for (const s of ctx.H.secondary) assert.ok(ctx.A.some((a) => a.slug === s.slug && !a.draft), s.slug);
  assert.ok(ctx.A.some((a) => a.slug === "alberta-bomberos-forestales-2027" && !a.draft), "bomberos sigue publicada");
});

test("texto editorial completo, sin montos inventados ni aprobación automática", () => {
  for (const f of [
    "8 de noviembre de 2026 | El Podcast del Migrante | Vivienda y ayudas económicas",
    "Rent Assistance Benefit", "Canada-Alberta Housing Benefit",
    "¿Quiénes pueden solicitar esta ayuda?", "Personas evacuadas de Ucrania que cumplan las condiciones específicas del programa CUAET.",
    "pertenecer a una de estas categorías no significa que la ayuda sea automática",
    "No existe un monto único para todos los beneficiarios.",
    "El programa no establece un número máximo de renovaciones anuales",
    "Temporary Rent Assistance Benefit", "Calgary, Edmonton, Fort McMurray, Grande Prairie, Lethbridge, Medicine Hat y Red Deer",
    "Su duración máxima es de dos años, con una revisión de elegibilidad después del primero.",
    "Paso 1. Consultar las opciones disponibles.", "Paso 2. Identificar el proveedor de vivienda de tu comunidad.", "Paso 3. Solicitar el formulario correspondiente.",
    "No es necesario pagar a intermediarios", "cumplir los requisitos no garantiza recibir el subsidio inmediatamente",
    "1-877-644-9992", "780-644-9992", "de 8:15 a. m. a 4:30 p. m.",
    "Conectando latinos, construyendo futuro.",
    "Fuente: Gobierno de Alberta, página oficial Rent Assistance , consultada el 8 de noviembre de 2026.",
    "Nota editorial: Esta publicación tiene fines informativos.",
  ]) assert.ok(texto.includes(f), f);
  assert.doesNotMatch(texto, /\$\s?\d/, "sin montos de subsidio");
  const h2 = [...art.bodyHtml.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.equal(h2[0], "¿Quiénes pueden solicitar esta ayuda?", "el video se coloca antes del primer subtítulo");
});

test("enlaces oficiales y botón a Find Housing en pestaña nueva", () => {
  assert.ok(art.bodyHtml.includes('<a class="article-apply" href="https://findhousing.alberta.ca/" target="_blank" rel="noopener noreferrer">'));
  assert.ok(art.bodyHtml.includes('href="https://www.alberta.ca/rent-assistance"'));
  assert.deepEqual(JSON.parse(JSON.stringify(art.sources.map((s) => s.href))), ["https://www.alberta.ca/rent-assistance", "https://findhousing.alberta.ca/"]);
});

test("video propio de TikTok (enlace corto resuelto), sin descarga, antes del primer subtítulo", () => {
  assert.equal(art.video.tiktokId, "7705912617230945557");
  assert.equal(art.video.tiktokUser, "podcastdelmigrante");
  assert.equal(art.video.position, "intro");
  assert.ok(existsSync(join(ROOT, art.video.cover)));
  assert.doesNotMatch(read("js/articles.js").slice(0, 20000), /\.mp4/);
});

test("imagen de portada y vista previa para redes con la imagen de la noticia", () => {
  assert.equal(art.heroImage.background, `url('${IMG}')`);
  assert.ok(existsSync(join(ROOT, IMG)) && existsSync(join(ROOT, `assets/social/${SLUG}.jpg`)));
  assert.ok(art.seo.description.length <= 160);
  assert.match(pagina, /<title>Ayuda para pagar el alquiler en Alberta: Rent Assistance Benefit<\/title>/);
  assert.ok(pagina.includes(`property="og:image" content="https://podcastdelmigrante.com/assets/social/${SLUG}.jpg"`));
  assert.ok(pagina.includes(`name="twitter:image" content="https://podcastdelmigrante.com/assets/social/${SLUG}.jpg"`));
  assert.ok(pagina.includes('property="article:published_time" content="2026-11-08') || pagina.includes("2026-11-08"));
  assert.ok(read("sitemap.xml").includes(`https://podcastdelmigrante.com/articulo-${SLUG}</loc>`));
});
