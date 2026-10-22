/* «Explora las ciudades y pueblos de Alberta»: datos oficiales, páginas y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "../scripts/build-canada-datos.mjs";
import { cargar, TIPOS, FICHAS } from "../scripts/canada-en-datos/localidades.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("alberta/"));
const fuente = JSON.parse(read("scripts/canada-en-datos/alberta-localidades.json"));
const cuenta = (t) => L.items.filter((r) => r.t === t).length;

test("los totales por tipo coinciden con las capas oficiales del Gobierno de Alberta", () => {
  for (const [t, n] of Object.entries(fuente.conteo_capas)) {
    if (t === "metis" || t === "usa") continue; /* varias partes (polígonos) por entidad: 10 para 8 asentamientos y 5 para 3 áreas */
    assert.equal(cuenta(t), n, t);
  }
  assert.equal(cuenta("metis"), 8);
  assert.equal(cuenta("usa"), 3);
  /* Totales publicados por Municipal Affairs (Population List 2025) */
  const mapl = fuente.mapl_tipos;
  assert.equal(cuenta("city"), mapl.City);
  assert.equal(cuenta("town"), mapl.Town);
  assert.equal(cuenta("village"), mapl.Village);
  assert.equal(cuenta("summer-village"), mapl["Summer Village"]);
  assert.equal(cuenta("md"), mapl["Municipal District"]);
  assert.equal(cuenta("specialized"), mapl["Specialized Municipality"]);
  assert.equal(cuenta("id"), mapl["Improvement District"]);
  assert.equal(cuenta("metis"), mapl["Metis Settlement"]);
});

test("cada localidad: tipo oficial, una de las 8 regiones económicas y coordenadas dentro de Alberta", () => {
  const regiones = Object.keys(fuente.regiones);
  assert.equal(regiones.length, 8);
  for (const r of L.items) {
    assert.ok(TIPOS[r.t], `${r.n}: tipo ${r.t}`);
    assert.ok(regiones.includes(r.r), `${r.n}: región ${r.r}`);
    assert.ok(r.lat >= 48.99 && r.lat <= 60.01 && r.lon >= -120.01 && r.lon <= -109.99, `${r.n}: ${r.lat}, ${r.lon}`);
    /* margen de 3 px: el contorno del mapa está simplificado */
    assert.ok(r.x >= -3 && r.x <= L.mapa.ancho + 3 && r.y >= -3 && r.y <= L.mapa.alto + 3, `${r.n}: fuera del mapa`);
  }
});

test("las comunidades no incorporadas no se confunden con municipios: cada una pertenece a un municipio", () => {
  for (const r of L.items.filter((x) => TIPOS[x.t].grupo === "comunidad")) {
    const m = L.porCodigo.get(r.m);
    assert.ok(m && TIPOS[m.t].grupo !== "comunidad", `${r.n} sin municipio`);
    assert.ok(!r.s, `${r.n} no debe tener página propia`);
  }
  for (const r of L.items.filter((x) => TIPOS[x.t].grupo !== "comunidad")) assert.ok(r.s, `${r.n} sin página`);
});

test("una página por municipio, con nombre de URL único y sin páginas sobrantes", () => {
  const municipios = L.items.filter((x) => x.s);
  assert.equal(paginas.length, municipios.length);
  assert.equal(new Set(municipios.map((x) => x.s)).size, municipios.length);
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/alberta")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("alberta/", "")).sort());
});

test("fichas completas indexables y en el sitemap; las básicas con noindex y fuera del sitemap", () => {
  const sitemap = read("sitemap.xml");
  for (const [k, html] of paginas) {
    const s = k.replace("alberta/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/alberta/${s}`;
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:url" content="${url}">`));
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    if (FICHAS[s]) {
      assert.doesNotMatch(html, /noindex/, s);
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${s} en el sitemap`);
    } else {
      assert.match(html, /<meta name="robots" content="noindex">/, s);
      assert.ok(!sitemap.includes(`<loc>${url}</loc>`), `${s} no debe estar en el sitemap`);
    }
  }
  assert.equal(Object.keys(FICHAS).length, 6);
});

test("sin datos vacíos ni inventados: «Dato no disponible» donde falta información", () => {
  for (const [k, html] of paginas) {
    assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object /, k);
  }
  const brooks = PAGES["alberta/brooks.html"];
  assert.match(brooks, /14,924/); /* Censo 2021 y Municipal Affairs Population List 2025 */
  assert.match(brooks, /\$1,332 al mes/); /* CMHC, Brooks CA, 2 habitaciones, octubre de 2025 */
  assert.match(brooks, /Brooks Health Centre/);
  assert.match(brooks, /id="transporte"[\s\S]*?Dato no disponible/);
  const basica = PAGES["alberta/acme.html"];
  assert.match(basica, /Dato no disponible/);
  assert.match(basica, /606/); /* población de Acme en la lista 2025 */
  /* Las áreas especiales no tienen población propia en la lista oficial */
  assert.match(PAGES["alberta/special-areas-2.html"], /Special Areas Board/);
});

test("la ficha de Alberta conserva su contenido y suma la sección del directorio", () => {
  const html = PAGES["alberta.html"];
  for (const id of ["poblacion", "economia", "empleo", "vivienda", "salud", "educacion", "inmigracion", "beneficios", "integracion", "seguridad", "recien-llegado", "noticias", "fuentes", "localidades"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Alberta<\/h2>/);
  for (const k of Object.keys(FICHAS)) assert.ok(html.includes(`href="/canada-en-datos/alberta/${k}"`), k);
  /* Los datos del directorio se cargan aparte, no en el HTML de la ficha */
  assert.ok(html.length < 120000, `ficha de Alberta: ${html.length} bytes`);
  assert.match(html, /data-src="\/js\/alberta-localidades\.js"/);
  assert.doesNotMatch(html, /<script src="\/js\/alberta-localidades\.js">/);
});

test("datos del navegador coherentes con el directorio", () => {
  const ctx = {};
  new Function("window", read("js/alberta-localidades.js"))(ctx);
  const d = ctx.AB_LOCALIDADES;
  assert.equal(d.localidades.length, L.items.length);
  for (const f of d.localidades) {
    if (f[5] === -1) assert.ok(f[7], `${f[0]} sin página`);
    else assert.ok(d.localidades[f[5]][7], `${f[0]}: su municipio no tiene página`);
  }
  assert.equal(d.localidades.filter((f) => f[8] === 1).length, 6);
});
