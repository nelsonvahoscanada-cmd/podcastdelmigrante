/* «Explora las ciudades y pueblos de Isla del Príncipe Eduardo»: catálogo oficial, páginas, guía y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { render } from "../scripts/build-canada-datos.mjs";
import PEI from "../scripts/canada-en-datos/provincias/prince-edward-island.mjs";

const { TIPOS, FICHAS } = PEI;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = PEI.cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("prince-edward-island/"));
const csd = L.items.filter((r) => TIPOS[r.t].grupo !== "comunidad");
const comunidades = L.items.filter((r) => TIPOS[r.t].grupo === "comunidad");
const porSlug = (s) => csd.find((r) => r.s === s);
const cuenta = (g) => csd.filter((r) => TIPOS[r.t].grupo === g).length;
const datos = () => {
  const ctx = {};
  new Function("window", read("js/prince-edward-island-localidades.js"))(ctx);
  return ctx.CD_LOCALIDADES;
};

test("criterio: las 98 subdivisiones censales del Censo 2021, que suman la población de la provincia", () => {
  assert.equal(csd.length, 98);
  assert.equal(cuenta("municipio"), 59, "municipios incorporados");
  assert.equal(cuenta("rural"), 35, "distritos de bomberos (territorio no incorporado)");
  assert.equal(cuenta("indigena"), 4, "reservas indígenas");
  const por = (t) => csd.filter((r) => r.t === t).length;
  assert.deepEqual([por("city"), por("town"), por("rural"), por("resort"), por("no-incorporado"), por("reserve")], [2, 10, 46, 1, 35, 4]);
  assert.equal(csd.reduce((a, r) => a + (r.p || 0), 0), 154331);
  /* Condados (divisiones censales) con sus cifras del censo */
  const condado = (n) => csd.filter((r) => r.condado === n).reduce((a, r) => a + (r.p || 0), 0);
  assert.deepEqual([condado("Kings"), condado("Queens"), condado("Prince")], [18327, 89770, 46234]);
});

test("identificadores estables, una sola región económica, condado y coordenadas dentro de la isla", () => {
  assert.equal(new Set(csd.map((r) => r.c)).size, 98, "código de subdivisión censal único");
  assert.deepEqual([...new Set(csd.map((r) => r.r))], ["1110"], "toda la provincia es la región económica 1110");
  assert.deepEqual([...new Set(csd.map((r) => r.condado))].sort(), ["Kings", "Prince", "Queens"]);
  for (const r of csd) {
    assert.match(r.c, /^110[123]\d{3}$/, `${r.n}: código`);
    assert.equal(r.cd, r.c.slice(0, 4), `${r.n}: condado según el código`);
    assert.ok(r.lat >= 45.9 && r.lat <= 47.1 && r.lon >= -64.5 && r.lon <= -61.9, `${r.n}: ${r.lat}, ${r.lon}`);
  }
  /* Valores conocidos (Statistics Canada, Censo 2021) */
  assert.equal(porSlug("charlottetown").p, 38809);
  assert.equal(porSlug("summerside").p, 16001);
  assert.equal(porSlug("charlottetown").cma, "Charlottetown");
  assert.equal(porSlug("summerside").cma, "Summerside");
  assert.equal(porSlug("lennox-island-1").t, "reserve");
});

test("comunidades y nombres históricos: sin duplicados y siempre dentro de una subdivisión", () => {
  assert.equal(comunidades.length, 629);
  const claves = comunidades.map((c) => `${c.n.toLowerCase()}|${c.m}`);
  assert.equal(new Set(claves).size, claves.length, "sin repetidos en la misma subdivisión");
  for (const c of comunidades) {
    const padre = L.porCodigo.get(c.m);
    assert.ok(padre, `${c.n}: subdivisión ${c.m}`);
    assert.notEqual(c.n.toLowerCase(), padre.n.toLowerCase(), `${c.n} no repite su subdivisión`);
    assert.equal(c.p, null, `${c.n}: sin población inventada`);
  }
  const por = (t) => comunidades.filter((c) => c.t === t).length;
  assert.equal(por("lot"), 67, "los 67 lotes");
  assert.equal(por("localidad"), 511);
  assert.ok(comunidades.some((c) => c.n === "Brighton" && c.m === porSlug("charlottetown").c));
});

test("una página por subdivisión, URL única, homónimos resueltos y una imagen social por página", () => {
  assert.equal(paginas.length, 98);
  assert.equal(new Set(csd.map((r) => r.s)).size, 98);
  /* El municipio conserva la URL corta; el distrito de bomberos homónimo lleva el tipo */
  assert.equal(porSlug("souris").t, "town");
  assert.equal(porSlug("souris-fire-district").t, "no-incorporado");
  assert.equal(porSlug("north-rustico").t, "town");
  assert.equal(porSlug("miscouche").t, "rural");
  assert.equal(porSlug("miscouche-fire-district").t, "no-incorporado");
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/prince-edward-island")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("prince-edward-island/", "")).sort());
  assert.deepEqual(readdirSync(join(ROOT, "assets/canada-en-datos/prince-edward-island")).sort(), enDisco.map((f) => f.replace(".html", ".jpg")).sort());
});

test("fichas completas indexables y en el sitemap; las básicas con noindex; metadatos y compartir con la URL pública", () => {
  const sitemap = read("sitemap.xml");
  assert.deepEqual(Object.keys(FICHAS).sort(), ["charlottetown", "cornwall", "stratford", "summerside"]);
  for (const [k, html] of paginas) {
    const s = k.replace("prince-edward-island/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/prince-edward-island/${s}`;
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:url" content="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:image" content="https://podcastdelmigrante.com/assets/canada-en-datos/prince-edward-island/${s}.jpg">`));
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html, new RegExp(`data-cd-share data-url="${url}"`), `${s}: comparte su propia URL`);
    assert.doesNotMatch(html, /pages\.dev/, `${s}: sin direcciones de prueba`);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    if (FICHAS[s]) {
      assert.doesNotMatch(html, /noindex/, s);
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${s} en el sitemap`);
    } else {
      assert.match(html, /<meta name="robots" content="noindex">/, s);
      assert.ok(!sitemap.includes(`<loc>${url}</loc>`), `${s} no debe estar en el sitemap`);
    }
  }
  assert.ok(sitemap.includes("<loc>https://podcastdelmigrante.com/canada-en-datos/prince-edward-island</loc>"));
});

test("sin datos vacíos ni inventados; datos provinciales presentados como provinciales", () => {
  for (const [k, html] of paginas) {
    assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object /, k);
    assert.match(html, /Hora del Atlántico: UTC−4 en invierno \(AST\) y UTC−3 con el horario de verano \(ADT\)/, k);
    assert.match(html, /toda la provincia es una sola región económica/, `${k}: el empleo se presenta como dato provincial`);
  }
  const ch = PAGES["prince-edward-island/charlottetown.html"];
  assert.match(ch, /38,809/);
  assert.match(ch, /\$1,331 al mes/, "CMHC, zona 1 (centro), 2 habitaciones, octubre de 2025");
  assert.match(ch, /href="https:\/\/www\.t3transit\.ca\/"/);
  assert.match(ch, /Queen Elizabeth Hospital/);
  assert.match(ch, /id="lugar-brighton"/);
  assert.match(PAGES["prince-edward-island/summerside.html"], /\$1,263 al mes/);
  assert.match(PAGES["prince-edward-island/summerside.html"], /Prince County Hospital/);
  const fd = PAGES["prince-edward-island/souris-fire-district.html"];
  assert.match(fd, /<h1>Souris \(distrito de bomberos\)<\/h1>/);
  assert.match(fd, /Fire District, tipo «FD»/);
  assert.match(fd, /Dato no disponible/);
  assert.doesNotMatch(fd, /CMHC[^<]*al mes/, "las páginas básicas no muestran alquileres de otra localidad");
  assert.match(fd, /Transit PEI/);
  const reserva = PAGES["prince-edward-island/lennox-island-1.html"];
  assert.match(reserva, /reserva indígena \(Indian Reserve\)/);
  assert.match(reserva, /No es un municipio/);
});

test("la guía provincial: secciones, cifras verificadas, condados en lugar de regiones y directorio extendido", () => {
  const html = PAGES["prince-edward-island.html"];
  for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Isla del Príncipe Eduardo<\/h2>/);
  assert.match(html, /Compartir esta guía/);
  assert.match(html, /data-cd-share data-url="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/prince-edward-island"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/prince-edward-island">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-prince-edward-island\.jpg">/);
  for (const id of ["cdLocBuscar", "cdLocTipo", "cdLocRegion", "cdLocSub", "cdLocPob", "cdLocOrden", "cdLocReset"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<label for="cdLocSub">Condado/);
  assert.match(html, /una sola región económica/);
  assert.match(html, /data-src="\/js\/prince-edward-island-localidades\.js"/);
  /* Cifras con fuente oficial */
  for (const re of [/182,989/, /154,331/, /\$17\.30/, /\$17\.60/, /7\.3%/, /\$1,300/, /15%/, /UTC−4/, /8-1-1/, /1-855-563-2101/, /12\.7%/]) assert.match(html, re, String(re));
  assert.match(html, /<th scope="row">Charlottetown \(aglomeración\)<\/th><td>\$1,300<\/td><td>1\.6%<\/td>/);
  assert.match(html, /<th scope="row">Charlottetown<\/th><td>Ciudad<\/td><td>Queens<\/td><td>38,809<\/td>/);
  /* Sin promesas de empleo ni de inmigración */
  assert.doesNotMatch(html, /garantizad[oa]s? (un )?empleo|empleo asegurado|garantiza(mos)? (la|tu) (nominación|residencia)/i);
  assert.match(html, /no garantiza una nominación/);
  for (const k of Object.keys(FICHAS)) assert.ok(html.includes(`href="/canada-en-datos/prince-edward-island/${k}"`), k);
});

test("reloj: PEI usa America/Halifax (hora del Atlántico con horario de verano)", () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read("js/canada-datos.js") + ";globalThis.R=CD_REGIONS;globalThis.P=CD_PROFILES;", ctx);
  const pe = ctx.R.find((r) => r.code === "PE");
  assert.equal(pe.profile, "prince-edward-island");
  assert.equal(pe.timeZone, "America/Halifax");
  assert.equal(pe.multiZone, false);
  assert.equal(ctx.P["prince-edward-island"].code, "PE");
  for (const [fecha, hora] of [["2026-10-31T12:00:00Z", 9], ["2026-11-02T12:00:00Z", 8], ["2027-01-15T12:00:00Z", 8], ["2027-03-15T12:00:00Z", 9], ["2027-07-01T12:00:00Z", 9]]) {
    const h = new Intl.DateTimeFormat("en-CA", { timeZone: pe.timeZone, hour: "numeric", hour12: false }).format(new Date(fecha));
    assert.equal(Number(h), hora, `${fecha}: 12:00 UTC son las ${hora}:00 en Charlottetown`);
  }
});

test("datos del navegador: directorio extendido, condado como filtro y las demás provincias sin cambios", () => {
  const d = datos();
  assert.equal(d.provincia.slug, "prince-edward-island");
  assert.equal(d.provincia.extendido, true);
  assert.equal(d.provincia.subregion, "Condado");
  assert.deepEqual(Object.keys(d.regiones), ["1110"]);
  assert.equal(d.localidades.length, 727);
  assert.equal(d.localidades.filter((f) => f[7]).length, 98);
  assert.equal(d.localidades.filter((f) => f[8] === 1).length, 4);
  assert.deepEqual([...new Set(d.localidades.map((f) => f[9]))].sort(), ["Kings", "Prince", "Queens"]);
  const nombres = d.localidades.filter((f) => f[7]).map((f) => f[0]);
  assert.equal(new Set(nombres).size, nombres.length, "nombres únicos entre las páginas");
  assert.ok(nombres.includes("Souris (pueblo)") && nombres.includes("Souris (distrito de bomberos)"));
  for (const p of ["alberta", "ontario"]) {
    const c = {};
    new Function("window", read(`js/${p}-localidades.js`))(c);
    assert.equal(c.CD_LOCALIDADES.provincia.extendido, undefined, `${p}: sin directorio extendido`);
  }
  const bc = {};
  new Function("window", read("js/british-columbia-localidades.js"))(bc);
  assert.equal(bc.CD_LOCALIDADES.localidades.length, 2378, "BC sin cambios");
});

test("cada lugar sin página propia tiene un ancla única y existente en la página de su subdivisión", () => {
  const d = datos();
  assert.deepEqual(d.campos.slice(-2), ["alias", "ancla"]);
  const lugares = d.localidades.filter((f) => f[5] !== -1);
  assert.equal(lugares.length, 629);
  const vistas = new Set();
  const cache = new Map();
  for (const f of lugares) {
    const sub = d.localidades[f[5]];
    assert.ok(sub[7], `${f[0]}: su subdivisión tiene página`);
    assert.match(f[11], /^lugar-[a-z0-9-]+$/, f[0]);
    const clave = `${sub[7]}#${f[11]}`;
    assert.ok(!vistas.has(clave), `ancla repetida: ${clave}`);
    vistas.add(clave);
    if (!cache.has(sub[7])) cache.set(sub[7], read(`canada-en-datos/prince-edward-island/${sub[7]}.html`));
    const html = cache.get(sub[7]);
    const i = html.indexOf(`id="${f[11]}"`);
    assert.ok(i > 0 && html.indexOf(`id="${f[11]}"`, i + 1) === -1, `${clave}: el ancla está una sola vez`);
    assert.ok(html.slice(i, i + 300).includes(`>${f[0].replace(/&/g, "&amp;").replace(/'/g, "&#39;")}`), `${clave}: el ancla rodea el nombre ${f[0]}`);
  }
  assert.ok(d.localidades.filter((f) => f[5] === -1).every((f) => f[11] === ""));
});

test("portada de Canadá en Datos: PEI marcada como ficha disponible, sin tocar las demás regiones", () => {
  const idx = read("canada-en-datos/index.html");
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="PE"/);
  assert.match(idx, /aria-label="Isla del Príncipe Eduardo \(ficha disponible\)"/);
  for (const code of ["AB", "ON", "BC", "SK"]) assert.match(idx, new RegExp(`class="cd-region cd-region--ficha" data-code="${code}"`), code);
  for (const code of ["NS", "NB", "NL", "QC", "MB", "YT", "NT", "NU"]) assert.match(idx, new RegExp(`class="cd-region" data-code="${code}"`), code);
});
