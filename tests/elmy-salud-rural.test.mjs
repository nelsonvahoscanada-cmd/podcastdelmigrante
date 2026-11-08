/* Artículo de Elmy Castillo «Rural vs Urban Healthcare: A High-Level Review»:
   traducción al español (principal) y original en inglés enlazados; cifras no
   confirmadas señaladas; recursos oficiales de Alberta y aviso 811 / 911. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";" + read("js/data.js") + ";globalThis.A = ARTICLES; globalThis.H = HERO; globalThis.C = CONTRIBUTORS;", ctx);
const ES = "salud-rural-urbana-alberta-atencion-medica";
const EN = "rural-vs-urban-healthcare-high-level-review";
const es = ctx.A.find((a) => a.slug === ES);
const en = ctx.A.find((a) => a.slug === EN);
const txt = (a) => a.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/ ([.,:;])/g, "$1");

test("dos versiones enlazadas, sin duplicados, autora y perfil existentes", () => {
  assert.ok(es && en && !es.draft && !en.draft);
  assert.equal(ctx.A.filter((a) => [ES, EN].includes(a.slug)).length, 2);
  assert.deepEqual([es.lang, en.lang, es.translationSlug, en.translationSlug], ["es", "en", EN, ES]);
  assert.equal(es.title, "Salud en Canadá: ¿es más difícil recibir atención médica en las comunidades rurales?");
  assert.equal(es.dek, "La escasez de médicos de familia, las distancias y los cierres temporales de emergencias afectan especialmente a las comunidades rurales de Alberta. Conoce las diferencias y los recursos disponibles.");
  assert.equal(en.title, "Rural vs Urban Healthcare: A High-Level Review");
  assert.equal(es.category, "Salud");
  const elmy = ctx.C.find((c) => c.id === "elmy-castillo");
  for (const a of [es, en]) { assert.equal(a.author.authorId, "elmy-castillo"); assert.equal(a.author.name, elmy.name); }
  assert.equal(elmy.photo, "assets/elmy-castillo-avatar.jpg", "fotografía existente, sin cambios");
  assert.match(es.publishedAt, /^2026-11-0[23]T\d{2}:\d{2}:00-06:00$/);
  for (const s of [ES, EN]) for (const f of [`articulo-${s}.html`, `assets/${s}.jpg`, `assets/social/${s}.jpg`]) assert.ok(existsSync(join(ROOT, f)), f);
});

test("el original en inglés se conserva íntegro y la traducción mantiene sus cifras", () => {
  const t = txt(en);
  for (const f of ["Many Canadians interact with the healthcare system every day.", "approximately 18% of Canadians live in rural areas, only 8% of physicians practise in these communities", "approximately 77% of rural residents are attached to a primary care provider", "Studies have found that rural primary care providers (PCPs) make specialist referrals less frequently", "temporary rural emergency department closures", "Local governments have introduced incentive packages", "knowing what resources are available and how to use them can make a meaningful difference."]) assert.ok(t.includes(f), f);
  const e = txt(es);
  for (const f of ["18 %", "8 %", "77 %", "8 puntos porcentuales", "Health Link 811", "cierres temporales"]) assert.ok(e.includes(f), f);
  assert.match(e, /Título original: «Rural vs Urban Healthcare: A High-Level Review»/);
});

test("cifras no confirmadas señaladas con los datos oficiales disponibles", () => {
  for (const a of [es, en]) {
    const t = txt(a);
    assert.match(t, /84[,.]2 ?%/);
    assert.match(t, /82[,.]5 ?%/);
    assert.match(t, /77 ?%/);
  }
  assert.match(txt(es), /no hemos podido confirmar en una fuente oficial el dato del 77 %/);
  assert.match(txt(en), /We could not confirm the 77% figure in an official source/);
});

test("recursos de salud en Alberta con enlaces oficiales y aviso 811 / 911", () => {
  assert.match(es.bodyHtml, /<h2>Recursos de salud que debes conocer en Alberta<\/h2>/);
  for (const u of ["https://www.primarycarealberta.ca/page14176.aspx", "https://albertafindaprovider.ca/", "https://www.albertahealthservices.ca/waittimes/waittimes.aspx"]) assert.ok(es.bodyHtml.includes(`href="${u}" target="_blank" rel="noopener"`), u);
  assert.match(txt(es), /el 811 ofrece orientación sanitaria, pero no reemplaza los servicios de emergencia\. Ante una emergencia médica, llama al 911\./);
  assert.match(txt(en), /811 provides health advice but does not replace emergency services\. In a medical emergency, call 911\./);
});

test("no toca la portada destacada; SEO, redes y sitemap", () => {
  assert.equal(ctx.H.main.slug, "alberta-rent-assistance-benefit-ayuda-alquiler");
  assert.deepEqual(Array.from(ctx.H.secondary, (s) => s.slug), ["masterclass-gratuita-ley-intrinseca-creacion-eder-campos", "canada-cambios-proceso-refugio-3-noviembre-2026", "canada-cambios-express-entry-3-noviembre-2026", "hector-rivero-santa-latino-canada", "canada-groceries-essentials-benefit-cgeb-2026"]);
  for (const s of [ES, EN]) {
    const h = read(`articulo-${s}.html`);
    assert.match(h, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${s}\\.jpg"`));
    assert.match(h, new RegExp(`rel="canonical" href="https://podcastdelmigrante\\.com/articulo-${s}"`));
    assert.match(read("sitemap.xml"), new RegExp(`<loc>https://podcastdelmigrante\\.com/articulo-${s}</loc>`));
  }
  assert.ok(es.seo.description.length <= 160 && en.seo.description.length <= 160);
  assert.match(read("js/article.js"), /article\.translationSlug \|\| article\.slug\)\}">ES<\/a>/, "el botón ES de la versión inglesa lleva a la traducción");
});
