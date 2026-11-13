/* Entre dos mundos, capítulo 2: «Canadá también puede convertirse en un
   infierno» (Nelson Vahos, edición de noviembre de 2026). Texto aprobado por
   el autor, privacidad (nombres ficticios), sin cifras de donaciones ni
   enlaces comerciales, ilustración editorial, columna, edición y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";" + read("js/columns.js") + ";" + read("js/ediciones.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO; globalThis.COL = COLUMNS; globalThis.ED = EDICIONES;", ctx);
const SLUG = "canada-tambien-puede-convertirse-en-un-infierno";
const IMG = `${SLUG}-portada`; /* portada aprobada el 3-11-2026: nombre nuevo para evitar la caché */
const art = ctx.A.find((a) => a.slug === SLUG);
const texto = art.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("capítulo 2 de Entre dos mundos, una sola vez, con autor, edición y fecha real", () => {
  assert.ok(art && !art.draft && art.demo === false);
  assert.equal(ctx.A.filter((a) => a.slug === SLUG || a.title === art.title).length, 1, "sin duplicados");
  assert.equal(ctx.A.filter((a) => a.id === "ART-2026-038").length, 1);
  assert.equal(art.title, "Canadá también puede convertirse en un infierno");
  assert.equal(art.dek, "El sueño de Andrés: llegó con 22 años buscando un futuro mejor, pero su familia terminó luchando para llevarlo de regreso a Colombia.");
  assert.equal(art.layout, "columna-autor");
  assert.equal(art.contentType, "Columna");
  assert.equal(art.columnName, "Entre dos mundos");
  assert.equal(art.chapter, 2);
  assert.equal(art.author.name, "Nelson Vahos");
  assert.equal(art.edition, "Noviembre 2026");
  assert.match(art.publishedAt, /^2026-11-03T\d{2}:\d{2}:00-06:00$/);
  const cap1 = ctx.A.find((a) => a.slug === "el-frio-no-pudo-apagar-mi-senal");
  assert.equal(cap1.chapter, undefined, "el capítulo 1 no se modifica");
  assert.equal(cap1.edition, "Octubre 2026");
  for (const f of [`articulo-${SLUG}.html`, `assets/${IMG}.jpg`, `assets/social/${IMG}.jpg`]) assert.ok(existsSync(join(ROOT, f)), f);
});

test("texto aprobado completo: nota editorial al inicio, cierre y firma de la columna", () => {
  assert.match(art.bodyHtml, /^\s*<p class="article-update"><em>Nota editorial: Algunos nombres de esta historia han sido modificados para proteger la identidad y privacidad de sus protagonistas\./);
  assert.match(texto, /Hay viajes que comienzan con una maleta llena de ropa/);
  for (const h of ["Una historia que llegó a nuestros micrófonos", "El día en que todo cambió", "La seguridad laboral no puede ser una formalidad", "El Canadá del que también debemos hablar", "Lo más valioso no siempre se puede enviar por dinero", "El regreso que nadie había imaginado"]) assert.ok(art.bodyHtml.includes(`<h2>${h}</h2>`), h);
  assert.match(art.bodyHtml, /<strong>un micrófono también puede convertirse en un puente entre el dolor de una familia y la solidaridad de personas que ni siquiera la conocen\.<\/strong>/);
  assert.match(art.bodyHtml, /<strong>Porque el verdadero sueño de emigrar no debería ser solamente llegar lejos, sino conseguir que la distancia nunca nos haga olvidar por quiénes emprendimos el viaje\.<\/strong>/);
  assert.match(texto, /Entre dos mundos es una columna de Nelson Vahos para El Podcast del Migrante\./);
  assert.doesNotMatch(texto, /Estado editorial|pendiente de aprobación/, "sin marcas internas de revisión");
});

test("privacidad y responsabilidad: nombres ficticios, sin culpables, sin cifras ni repatriación confirmada, sin enlaces", () => {
  assert.match(texto, /Andrés/);
  assert.match(texto, /Claudia/);
  assert.match(texto, /sería irresponsable atribuir responsabilidades sin contar con esa información/);
  assert.match(texto, /No puedo afirmar cómo terminó el proceso de repatriación, porque no contamos con esa confirmación\./);
  assert.doesNotMatch(texto, /\$\s?\d|\d\s?(dólares|pesos|CAD)/, "sin cifras de donaciones");
  assert.doesNotMatch(art.bodyHtml, /<a\s/, "sin enlaces en la historia");
  assert.deepEqual(Array.from(art.sources), []);
  assert.equal(art.sponsored, false);
});

test("portada editorial aprobada, identificada como ilustración; la anterior ya no se publica", () => {
  assert.equal(art.heroImage.background, `url('assets/${IMG}.jpg')`);
  assert.equal(art.heroImage.socialName, IMG);
  assert.equal(art.heroImage.socialLabel, "Ilustración editorial");
  for (const f of [`assets/${SLUG}.jpg`, `assets/social/${SLUG}.jpg`]) assert.ok(!existsSync(join(ROOT, f)), `${f} retirada`);
  const jpg = readFileSync(join(ROOT, `assets/${IMG}.jpg`));
  let i = 2, w = 0, h = 0;
  while (i < jpg.length) { const m = jpg[i + 1]; if (m >= 0xc0 && m <= 0xc2) { h = jpg.readUInt16BE(i + 5); w = jpg.readUInt16BE(i + 7); break; } i += 2 + jpg.readUInt16BE(i + 2); }
  assert.deepEqual([w, h], [1672, 941]);
  assert.equal(art.heroImage.aspectRatio, "1672/941");
  assert.match(art.heroImage.alt, /^Ilustración editorial:/);
  assert.match(art.heroImage.credit, /Ilustración editorial.*no corresponde a Andrés/);
});

test("columna Entre dos mundos: capítulo 1 en octubre y capítulo 2 en noviembre, en orden", () => {
  const col = ctx.COL.find((c) => c.id === "entre-dos-mundos");
  assert.deepEqual(JSON.parse(JSON.stringify(col.entries.map((e) => [e.monthLabel, e.slug, e.published]))), [
    ["Octubre 2026", "el-frio-no-pudo-apagar-mi-senal", true],
    ["Noviembre 2026", SLUG, true],
  ]);
  assert.equal(col.entries[1].title, art.title);
});

test("edición de noviembre (borrador): incluye el capítulo; la de octubre no cambia", () => {
  const nov = ctx.ED.find((e) => e.slug === "2026-11");
  assert.equal(nov.estado, "borrador");
  assert.ok(nov.secciones.some((s) => s.piezas.some((p) => p.id === "ART-2026-038")));
  const oct = ctx.ED.find((e) => e.slug === "2026-10");
  assert.equal(oct.huella, "810dd057f46b6f3fce9bcfe8c8f6799caeb0ee218d49a7631ed5a233ff1d8398", "solo cambió la portada (corrección del 9-11-2026)");
  assert.ok(!Object.keys(oct.instantanea.piezas).includes("articulo:ART-2026-038"));
});

test("portada: la noticia principal y las destacadas no cambian", () => {
  assert.equal(ctx.H.main.slug, "canada-33000-residencias-permanentes-trabajadores-2026");
  assert.deepEqual(Array.from(ctx.H.secondary, (s) => s.slug), ["canada-suplemento-alimentos-679-presupuesto-2026", "alberta-rent-assistance-benefit-ayuda-alquiler", "masterclass-gratuita-ley-intrinseca-creacion-eder-campos", "canada-cambios-proceso-refugio-3-noviembre-2026", "canada-cambios-express-entry-3-noviembre-2026"]);
});

test("SEO: título, descripción, Open Graph, Twitter, canónica y sitemap", () => {
  const h = read(`articulo-${SLUG}.html`);
  assert.match(h, /<title>Canadá también puede convertirse en un infierno \| Entre dos mundos — Nelson Vahos/);
  assert.match(h, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${IMG}\\.jpg"`));
  assert.match(h, new RegExp(`name="twitter:image" content="https://podcastdelmigrante\\.com/assets/social/${IMG}\\.jpg"`));
  assert.match(h, /name="twitter:card" content="summary_large_image"/);
  assert.match(h, new RegExp(`rel="canonical" href="https://podcastdelmigrante\\.com/articulo-${SLUG}"`));
  assert.ok(art.seo.description.length <= 160);
  assert.match(read("sitemap.xml"), new RegExp(`<loc>https://podcastdelmigrante\\.com/articulo-${SLUG}</loc>\\s*<lastmod>2026-11-03</lastmod>`));
});

/* ---------- Patrocinio de Roca Financial (3-11-2026) ---------- */
test("patrocinio de Roca Financial: recuadro aparte, después de la crónica, sin tocar el texto", () => {
  const s = art.sponsorBlock;
  assert.equal(s.sponsor, "Roca Financial");
  assert.equal(s.label, "Contenido patrocinado por Roca Financial");
  assert.equal(s.title, "Protege hoy el futuro de quienes más amas.");
  assert.equal(s.text, "La vida de un migrante está llena de sueños, esfuerzos y responsabilidades. Conocer las opciones de protección financiera y seguros de vida puede ayudarte a tomar decisiones informadas para el bienestar de tu familia.");
  assert.equal(s.ctaLabel, "Conoce Roca Financial");
  assert.equal(s.logo, undefined, "no hay logo oficial de Roca Financial en el proyecto: nombre en texto");
  assert.doesNotMatch(art.bodyHtml, /Roca|patrocin/i, "la crónica no menciona el patrocinio");
  assert.equal(art.sponsored, false, "el artículo no es contenido patrocinado");
  assert.doesNotMatch(s.title + s.text + s.note, /garantiza|cobertura de|emitimos|póliza gratis|\$\d/i, "sin promesas ni coberturas específicas");
});

test("patrocinio: enlaza a la miniweb Premium de Carlos D. Castillo dentro del sitio, con utm_* medibles", () => {
  const u = new URL(art.sponsorBlock.href, "https://podcastdelmigrante.com/");
  assert.equal(u.origin, "https://podcastdelmigrante.com");
  assert.equal(u.pathname, "/perfil-carlos-d-castillo");
  assert.ok(existsSync(join(ROOT, "perfil-carlos-d-castillo.html")));
  const biz = vm.runInNewContext(read("js/businesses.js") + ";BUSINESSES", {}).find((b) => b.slug === "carlos-d-castillo");
  assert.ok(biz && biz.published && biz.plan !== "gratuito" && /Roca Financial/.test(biz.company), "perfil Premium publicado de Roca Financial");
  assert.deepEqual(Object.fromEntries(u.searchParams), { utm_source: "podcastdelmigrante", utm_medium: "patrocinio", utm_campaign: "roca-financial", utm_content: "articulo-entre-dos-mundos-cap2" });
  assert.match(read("js/analytics.js"), /const UTM_KEYS = \["utm_source", "utm_medium", "utm_campaign", "utm_content"\];/);
  /* Solo este artículo lleva el recuadro */
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.A.filter((a) => a.sponsorBlock).map((a) => a.slug))), [SLUG]);
  assert.match(read("js/article.js"), /<div class="article-body">\$\{enlacesDefinitivos\(bodyWithVideoHtml\(article\)\)\}<\/div>\s*\$\{sponsorBlockHtml\(article\)\}/);
});
