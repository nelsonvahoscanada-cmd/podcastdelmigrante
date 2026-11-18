/* «Explora las ciudades y pueblos de Nuevo Brunswick»: catálogo oficial, reforma de 2023, páginas, guía y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { render } from "../scripts/build-canada-datos.mjs";
import NB from "../scripts/canada-en-datos/provincias/new-brunswick.mjs";

const { TIPOS, FICHAS } = NB;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = NB.cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("new-brunswick/"));
const csd = L.items.filter((r) => TIPOS[r.t].grupo !== "comunidad");
const comunidades = L.items.filter((r) => TIPOS[r.t].grupo === "comunidad");
const porSlug = (s) => csd.find((r) => r.s === s);
const cuenta = (g) => csd.filter((r) => TIPOS[r.t].grupo === g).length;
const W = JSON.parse(read("scripts/canada-en-datos/nb-wds.json"));
const perfil = () => {
  const ctx = {};
  vm.runInNewContext(read("js/canada-datos.js") + ";globalThis.P = CD_PROFILES; globalThis.R = CD_REGIONS;", ctx);
  return ctx;
};

test("criterio: las 266 subdivisiones censales del Censo 2021, que suman la población de la provincia", () => {
  assert.equal(csd.length, 266);
  assert.equal(cuenta("municipio"), 104, "municipios del censo");
  assert.equal(cuenta("rural"), 142, "parroquias (territorio no incorporado en 2021)");
  assert.equal(cuenta("indigena"), 20, "reservas indígenas");
  const por = (t) => csd.filter((r) => r.t === t).length;
  assert.deepEqual([por("city"), por("town"), por("village"), por("rural-community"), por("regional"), por("parish"), por("reserve")], [8, 26, 61, 8, 1, 142, 20]);
  assert.equal(csd.reduce((a, r) => a + (r.p || 0), 0), 775610);
  assert.equal(L.provincia.p, 775610);
  /* Cada condado suma la población de sus subdivisiones */
  for (const c of L.condados) assert.equal(csd.filter((r) => r.cd === c.id).reduce((a, r) => a + (r.p || 0), 0), c.p, c.n);
});

test("regiones económicas formadas por condados completos y condados como filtro", () => {
  assert.deepEqual(Object.keys(L.regiones).sort(), ["1310", "1320", "1330", "1340", "1350"]);
  assert.equal(new Set(csd.map((r) => r.condado)).size, 15);
  const er = {};
  for (const r of csd) (er[r.cd] ||= new Set()).add(r.r);
  for (const [cd, s] of Object.entries(er)) assert.equal(s.size, 1, `condado ${cd} en una sola región`);
  assert.equal(porSlug("moncton").r, "1320");
  assert.equal(porSlug("fredericton").r, "1340");
  assert.equal(porSlug("edmundston").r, "1350");
  for (const r of csd) {
    assert.match(r.c, /^13(0[1-9]|1[0-5])\d{3}$/, `${r.n}: código`);
    assert.ok(r.lat >= 44.5 && r.lat <= 48.1 && r.lon >= -69.1 && r.lon <= -63.7, `${r.n}: ${r.lat}, ${r.lon}`);
  }
  /* Valores conocidos (Statistics Canada, Censo 2021) */
  assert.equal(porSlug("moncton").p, 79470);
  assert.equal(porSlug("saint-john").p, 69895);
  assert.equal(porSlug("fredericton").p, 63116);
  assert.equal(porSlug("dieppe").p, 28114);
});

test("reforma de 2023: 77 gobiernos locales y 12 distritos rurales; cada subdivisión indica su gobierno actual", () => {
  assert.deepEqual([L.gobiernos.locales, L.gobiernos.distritos], [77, 12]);
  assert.deepEqual(porSlug("moncton").actual, [["Moncton", "City", 99]]);
  const conActual = csd.filter((r) => r.actual.length);
  assert.ok(conActual.length >= 260, `${conActual.length} subdivisiones con gobierno actual`);
  for (const r of conActual) for (const [, , pct] of r.actual) assert.ok(pct >= 5 && pct <= 100, r.n);
  const html = PAGES["new-brunswick/moncton.html"];
  assert.match(html, /Gobierno local actual/);
  assert.match(html, /Desde el 1 de enero de 2023/);
});

test("comunidades y nombres geográficos: sin duplicados, siempre dentro de una subdivisión y sin población inventada", () => {
  assert.ok(comunidades.length > 2000, `${comunidades.length} lugares`);
  const claves = comunidades.map((c) => `${c.n.toLowerCase()}|${c.m}`);
  assert.equal(new Set(claves).size, claves.length);
  for (const c of comunidades) {
    const padre = L.porCodigo.get(c.m);
    assert.ok(padre, `${c.n}: subdivisión ${c.m}`);
    assert.notEqual(c.n.toLowerCase(), padre.n.toLowerCase());
    assert.equal(c.p, null);
  }
});

test("una página por subdivisión, URL única, homónimos resueltos y una imagen social por página", () => {
  assert.equal(paginas.length, 266);
  assert.equal(new Set(csd.map((r) => r.s)).size, 266);
  assert.equal(porSlug("moncton").t, "city");
  assert.equal(porSlug("moncton-parish").t, "parish");
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/new-brunswick")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("new-brunswick/", "")).sort());
  assert.deepEqual(readdirSync(join(ROOT, "assets/canada-en-datos/new-brunswick")).sort(), enDisco.map((f) => f.replace(".html", ".jpg")).sort());
});

test("fichas completas indexables y en el sitemap; las básicas con noindex; metadatos y compartir con la URL pública", () => {
  const sitemap = read("sitemap.xml");
  assert.deepEqual(Object.keys(FICHAS).sort(), ["bathurst", "campbellton", "dieppe", "edmundston", "fredericton", "miramichi", "moncton", "riverview", "saint-john"]);
  for (const [k, html] of paginas) {
    const s = k.replace("new-brunswick/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/new-brunswick/${s}`;
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:image" content="https://podcastdelmigrante.com/assets/canada-en-datos/new-brunswick/${s}.jpg">`));
    assert.match(html, new RegExp(`data-cd-share data-url="${url}"`));
    assert.doesNotMatch(html, /pages\.dev/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    if (FICHAS[s]) {
      assert.doesNotMatch(html, /noindex/, s);
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${s} en el sitemap`);
    } else {
      assert.match(html, /<meta name="robots" content="noindex">/, s);
      assert.ok(!sitemap.includes(`<loc>${url}</loc>`), s);
    }
  }
  assert.ok(sitemap.includes("<loc>https://podcastdelmigrante.com/canada-en-datos/new-brunswick</loc>"));
});

test("sin datos vacíos ni inventados; empleo regional, alquileres de CMHC, escuelas y hospitales oficiales", () => {
  for (const [k, html] of paginas) {
    assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object /, k);
    assert.match(html, /Hora del Atlántico: UTC−4 en invierno \(AST\) y UTC−3 con el horario de verano \(ADT\)/, k);
    assert.match(html, /región económica, no por localidad/, `${k}: empleo de su región`);
  }
  const m = PAGES["new-brunswick/moncton.html"];
  assert.match(m, /79,470/);
  assert.match(m, /\$1,465 al mes/, "CMHC, ciudad de Moncton, 2 habitaciones, octubre de 2025");
  assert.match(m, /6\.6%/, "desempleo 2025 de Moncton–Richibucto");
  assert.match(m, /The Moncton Hospital/);
  assert.match(m, /codiactranspo\.ca/);
  assert.match(PAGES["new-brunswick/fredericton.html"], /\$1,413 al mes/);
  assert.match(PAGES["new-brunswick/saint-john.html"], /\$1,286 al mes/);
  assert.match(PAGES["new-brunswick/dieppe.html"], /\$1,441 al mes/);
  const parroquia = PAGES["new-brunswick/moncton-parish.html"];
  assert.match(parroquia, /parroquia \(Parish\)/);
  assert.match(parroquia, /Dato no disponible/);
  assert.doesNotMatch(parroquia, /CMHC[^<]*al mes/, "las páginas básicas no muestran alquileres de otra localidad");
  assert.equal(L.escuelas.length, 295);
  assert.equal(L.escuelas.filter((e) => e.sector === "Francophone").length, 89);
  assert.equal(L.hospitales.length, 23);
});

test("la guía provincial: secciones, cifras verificadas con fuente, NBPNP con idiomas y estado, y directorio extendido", () => {
  const html = PAGES["new-brunswick.html"];
  for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Nuevo Brunswick<\/h2>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/new-brunswick">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-new-brunswick\.jpg">/);
  assert.match(html, /<label for="cdLocSub">Condado/);
  assert.match(html, /data-src="\/js\/new-brunswick-localidades\.js"/);
  /* Cifras de Statistics Canada = las del servicio oficial de datos guardado en el repositorio */
  const P = W.provincia;
  assert.equal(P.poblacion.series.total.at(-1)[1], 883522);
  assert.equal(P.epa_mensual.series["Unemployment rate"].at(-1)[1], 7.4);
  assert.equal(P.salarios.series["Average hourly wage rate"].at(-1)[1], 31.27);
  for (const re of [/883,522/, /775,610/, /\$15\.90/, /\$23\.85/, /7\.4%/, /\$1,453/, /15%/, /UTC−4/, /8-1-1/, /1-833-354-2300/, /34\.0%/, /2,450/, /77 gobiernos locales/, /12 distritos rurales/]) assert.match(html, re, String(re));
  /* Inmigración: vías, idioma mínimo y estado con fecha */
  for (const re of [/CLB 4/, /CLB 7/, /NCLC 5/, /CLB 5/, /4 de mayo de 2026/, /3 de febrero de 2026/, /resto de 2026/, /14 de octubre de 2026/, /hasta finales de 2027/, /no acepta solicitudes directas/, /IELTS General Training/, /TEF Canada/, /TCF Canada/]) assert.match(html, re, String(re));
  assert.doesNotMatch(html, /Critical Worker Pilot[^.]*abierta/i, "el piloto de trabajadores críticos no se presenta como abierto");
  /* Cada indicador publicado tiene fuente, período y fecha de consulta */
  const { P: perfiles, R } = perfil();
  const nb = perfiles["new-brunswick"];
  for (const [k, ind] of Object.entries(nb.indicators)) {
    assert.ok(ind.value != null && ind.source && ind.source.url && ind.refPeriod && ind.retrievedAt, k);
  }
  assert.equal(R.find((r) => r.code === "NB").profile, "new-brunswick");
});

test("portada de Canadá en Datos: Nuevo Brunswick «Ya disponible», sin tocar las demás regiones", () => {
  const idx = PAGES["index.html"];
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="NB"/);
  assert.match(idx, /aria-label="Nuevo Brunswick \(ficha disponible\)"/);
  for (const code of ["AB", "ON", "BC", "PE", "SK", "MB", "QC", "NU", "NT", "YT"]) assert.match(idx, new RegExp(`class="cd-region cd-region--ficha" data-code="${code}"`), code);
  for (const code of ["NS", "NL"]) assert.match(idx, new RegExp(`class="cd-region" data-code="${code}"`), code);
  assert.match(read("js/canada-datos-disponibles.js"), /new-brunswick/);
});
