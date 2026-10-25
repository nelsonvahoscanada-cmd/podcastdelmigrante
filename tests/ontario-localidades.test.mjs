/* «Explora las ciudades y pueblos de Ontario»: datos oficiales, páginas y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "../scripts/build-canada-datos.mjs";
import Ontario from "../scripts/canada-en-datos/provincias/ontario.mjs";

const { TIPOS, FICHAS } = Ontario;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = Ontario.cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("ontario/"));
const porSlug = (s) => L.items.find((r) => r.s === s);

test("criterio: los 414 municipios locales de la lista oficial (173 de nivel único y 241 de nivel inferior)", () => {
  assert.equal(L.items.length, 414);
  assert.equal(L.items.filter((r) => TIPOS[r.t].grupo === "unico").length, 173);
  assert.equal(L.items.filter((r) => TIPOS[r.t].grupo === "inferior").length, 241);
  /* Condados, regiones y distritos no son localidades: solo «área geográfica» */
  assert.ok(!L.items.some((r) => /^(County|Region|District|United Counties) of/i.test(r.nombre)), "sin municipios de nivel superior");
});

test("cada municipio: censo 2021 con código único, región económica de Ontario y coordenadas dentro de la provincia", () => {
  assert.equal(new Set(L.items.map((r) => r.c)).size, 414);
  const regiones = new Set(L.items.map((r) => r.r));
  assert.equal(regiones.size, 11);
  for (const r of L.items) {
    assert.ok(TIPOS[r.t], `${r.n}: tipo ${r.t}`);
    assert.match(r.c, /^35\d{5}$/, `${r.n}: código del censo`);
    assert.match(r.r, /^35\d\d$/, `${r.n}: región ${r.r}`);
    assert.ok(Number.isInteger(r.p) && r.p > 0, `${r.n}: población`);
    assert.ok(r.lio.lat >= 41.6 && r.lio.lat <= 57 && r.lio.lon >= -95.2 && r.lio.lon <= -74.3, `${r.n}: ${r.lio.lat}, ${r.lio.lon}`);
  }
  /* Valores conocidos: Statistics Canada, Censo de 2021 */
  assert.equal(porSlug("toronto").p, 2794356);
  assert.equal(porSlug("ottawa").p, 1017449);
  /* Burlington está en Halton (3524), pero el SGC lo asigna a Hamilton–Niagara Peninsula (3550) */
  assert.equal(porSlug("burlington").r, "3550");
  assert.ok(L.items.some((r) => r.censoNombre === "Tarbutt and Tarbutt Additional"));
  assert.equal(L.items.reduce((a, r) => a + r.p, 0), 14134681);
});

test("una página por municipio, nombre de URL único, una imagen social por página y sin sobrantes", () => {
  assert.equal(paginas.length, 414);
  assert.equal(new Set(L.items.map((r) => r.s)).size, 414);
  assert.ok(porSlug("hamilton") && porSlug("hamilton-township"), "la ciudad y el cantón de Hamilton no se confunden");
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/ontario")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("ontario/", "")).sort());
  assert.deepEqual(readdirSync(join(ROOT, "assets/canada-en-datos/ontario")).sort(), enDisco.map((f) => f.replace(".html", ".jpg")).sort());
});

test("fichas completas indexables y en el sitemap; las básicas con noindex y fuera del sitemap", () => {
  const sitemap = read("sitemap.xml");
  assert.equal(Object.keys(FICHAS).length, 16);
  for (const [k, html] of paginas) {
    const s = k.replace("ontario/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/ontario/${s}`;
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:url" content="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:image" content="https://podcastdelmigrante.com/assets/canada-en-datos/ontario/${s}.jpg">`));
    assert.match(html, new RegExp(`data-cd-share data-url="${url}"`), `${s}: comparte su propia URL`);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    if (FICHAS[s]) {
      assert.doesNotMatch(html, /noindex/, s);
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${s} en el sitemap`);
    } else {
      assert.match(html, /<meta name="robots" content="noindex">/, s);
      assert.ok(!sitemap.includes(`<loc>${url}</loc>`), `${s} no debe estar en el sitemap`);
    }
  }
});

test("sin datos vacíos ni inventados; estadísticas regionales presentadas como regionales", () => {
  for (const [k, html] of paginas) assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object /, k);
  const toronto = PAGES["ontario/toronto.html"];
  assert.match(toronto, /2,794,356/);
  assert.match(toronto, /\$2,055 al mes/); /* CMHC, Toronto CMA, 2 habitaciones, octubre de 2025 */
  assert.match(toronto, /Toronto DSB/);
  assert.match(toronto, /href="https:\/\/www\.ttc\.ca\/"/);
  assert.match(toronto, /región Toronto/);
  const basica = PAGES["ontario/hamilton-township.html"];
  assert.match(basica, /Dato no disponible/);
  assert.match(basica, /Northumberland/);
  assert.doesNotMatch(basica, /CMHC[^<]*al mes/, "las páginas básicas no muestran alquileres de otra ciudad");
});

test("la ficha de Ontario conserva su contenido y suma el directorio", () => {
  const html = PAGES["ontario.html"];
  for (const id of ["poblacion", "empleo", "inmigracion", "vivienda", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Ontario<\/h2>/);
  for (const k of Object.keys(FICHAS)) assert.ok(html.includes(`href="/canada-en-datos/ontario/${k}"`), k);
  assert.match(html, /data-src="\/js\/ontario-localidades\.js"/);
  assert.doesNotMatch(html, /<script src="\/js\/ontario-localidades\.js">/);
});

test("datos del navegador coherentes con el directorio", () => {
  const ctx = {};
  new Function("window", read("js/ontario-localidades.js"))(ctx);
  const d = ctx.CD_LOCALIDADES;
  assert.equal(d.provincia.slug, "ontario");
  assert.equal(d.localidades.length, 414);
  assert.ok(d.localidades.every((f) => f[7]), "todas con página");
  assert.equal(d.localidades.filter((f) => f[8] === 1).length, 16);
});

test("enlaces oficiales: los que ya no respondían se reemplazan o se retiran", () => {
  const { reemplazos } = JSON.parse(read("scripts/canada-en-datos/ontario-enlaces.json"));
  const todo = paginas.map(([, h]) => h).join("\n");
  for (const [viejo, nuevo] of Object.entries(reemplazos)) {
    assert.ok(!todo.includes(`href="${viejo}"`), `sigue publicado: ${viejo}`);
    if (nuevo) assert.match(nuevo, /^https:\/\//, `${viejo}: reemplazo con https`);
  }
  assert.match(PAGES["ontario/fort-frances.html"], /href="https:\/\/www\.fortfrances\.ca\/"/);
  assert.doesNotMatch(PAGES["ontario/machar.html"], /Sitio oficial de Machar/);
});
