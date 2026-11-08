/* Noticia «El Podcast del Migrante invita a una masterclass gratuita sobre
   crecimiento personal y toma de decisiones» (5-11-2026): noticia principal de
   la portada, texto aprobado íntegro, botón «INSCRÍBETE GRATIS» hacia la página
   oficial del evento (sin formulario propio), imagen promocional y vista previa
   para redes con la imagen del artículo. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO;", ctx);
const SLUG = "masterclass-gratuita-ley-intrinseca-creacion-eder-campos";
const IMG = "assets/masterclass-ley-intrinseca-creacion-eder-campos.jpg";
const SOCIAL = `assets/social/${SLUG}.jpg`;
const URL_INSCRIPCION = "https://eder.aikanreboot.com/masterclass/";
const art = ctx.A.find((a) => a.slug === SLUG);
const texto = art.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const pagina = read(`articulo-${SLUG}.html`);

test("publicada como noticia (segunda más reciente), con título y autoría de la redacción", () => {
  assert.ok(art && !art.draft);
  assert.equal(ctx.A[1].slug, SLUG, "segunda más reciente, tras la del alquiler (8-11-2026)");
  assert.equal(art.contentType, "Noticia");
  assert.equal(art.title, "El Podcast del Migrante invita a una masterclass gratuita sobre crecimiento personal y toma de decisiones");
  assert.equal(art.author.name, "Redacción El Podcast del Migrante");
  assert.equal(new Set(ctx.A.map((a) => a.id)).size, ctx.A.length, "id único");
});

test("portada: primera tarjeta destacada (tras la noticia del alquiler, 8-11-2026) con su imagen y texto alternativo", () => {
  const t = ctx.H.secondary[0];
  assert.equal(t.slug, SLUG);
  assert.equal(t.title, art.title);
  assert.equal(t.image, `url('${IMG}')`);
  assert.equal(t.demo, false);
  assert.match(t.alt, /Ley Intrínseca de Creación/);
  assert.equal(ctx.H.secondary.length, 5);
});

test("texto aprobado completo: secciones, datos del evento y nota editorial", () => {
  for (const frase of [
    "Calgary, Alberta — 5 de noviembre de 2026.",
    "Enfrentar nuevos desafíos, adaptarse a un país diferente",
    "El Podcast del Migrante invita a su comunidad a participar en la masterclass gratuita «Ley Intrínseca de Creación»",
    "Un espacio para reflexionar y aprender",
    "Una oportunidad para la comunidad migrante",
    "¿Cuándo y cómo participar?",
    "Eder Campos, PhD, doctor en Filología",
    "Miércoles 11 de noviembre de 2026",
    "7:30 p. m., hora de Calgary",
    "Virtual, por Zoom",
    "La conferencia es una iniciativa de Eder Campos",
    "recibirán por correo electrónico la confirmación y su enlace personal de acceso",
    "El Podcast del Migrante participa en la difusión de esta invitación gratuita.",
  ]) assert.ok(texto.includes(frase), frase);
});

test("botón «INSCRÍBETE GRATIS» hacia la página oficial, en pestaña nueva y seguro", () => {
  const botones = [...art.bodyHtml.matchAll(/<a class="article-apply" href="([^"]+)" target="_blank" rel="noopener noreferrer">INSCRÍBETE GRATIS<\/a>/g)];
  assert.equal(botones.length, 1);
  assert.equal(botones[0][1], URL_INSCRIPCION);
  for (const a of art.bodyHtml.match(/<a [^>]*>/g)) {
    assert.match(a, /href="https:\/\//, "solo enlaces https");
    assert.match(a, /rel="noopener noreferrer"/, a);
  }
  assert.doesNotMatch(art.bodyHtml, /<form|<input|<iframe|<script/i, "sin recopilar datos desde el portal");
});

test("enfoque periodístico: el Podcast invita, no organiza; sin términos esotéricos ni promesas", () => {
  assert.doesNotMatch(texto, /magia|mágic|esoter|hechiz|milagr|garantiza|riqueza|abundancia/i);
  assert.doesNotMatch(texto, /(El Podcast del Migrante|Podcast) (organiza|presenta la masterclass|realiza)/i);
  assert.match(texto, /iniciativa de Eder Campos/);
});

test("SEO y vista previa para redes: imagen del artículo, no la genérica", () => {
  assert.ok(art.seo.description.length <= 160);
  assert.match(pagina, new RegExp(`<title>${art.seo.fullTitle}</title>`));
  assert.ok(pagina.includes(`property="og:image" content="https://podcastdelmigrante.com/${SOCIAL}"`));
  assert.ok(pagina.includes(`name="twitter:image" content="https://podcastdelmigrante.com/${SOCIAL}"`));
  assert.ok(pagina.includes('property="og:image:width" content="1200"'));
  assert.ok(pagina.includes('property="og:image:height" content="630"'));
  assert.ok(existsSync(join(ROOT, SOCIAL)) && existsSync(join(ROOT, IMG)));
  assert.ok(read("sitemap.xml").includes(`https://podcastdelmigrante.com/articulo-${SLUG}</loc>`));
});
