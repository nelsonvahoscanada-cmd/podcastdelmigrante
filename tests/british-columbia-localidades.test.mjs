/* «Explora las ciudades y pueblos de Columbia Británica»: catálogo oficial, páginas y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { render } from "../scripts/build-canada-datos.mjs";
import BC from "../scripts/canada-en-datos/provincias/british-columbia.mjs";

const { TIPOS, FICHAS } = BC;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = BC.cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("british-columbia/"));
const csd = L.items.filter((r) => TIPOS[r.t].grupo !== "comunidad");
const comunidades = L.items.filter((r) => TIPOS[r.t].grupo === "comunidad");
const porSlug = (s) => csd.find((r) => r.s === s);
const cuenta = (g) => csd.filter((r) => TIPOS[r.t].grupo === g).length;

test("criterio: las 751 subdivisiones censales del Censo 2021, sin dejar fuera las pequeñas", () => {
  assert.equal(csd.length, 751);
  assert.equal(cuenta("municipio"), 160, "municipios incorporados");
  assert.equal(cuenta("rural"), 160, "áreas electorales de distritos regionales");
  assert.equal(cuenta("indigena"), 431, "tierras de Primeras Naciones");
  const por = (t) => csd.filter((r) => r.t === t).length;
  assert.deepEqual([por("city"), por("district"), por("town"), por("village"), por("island"), por("regional")], [52, 49, 14, 43, 1, 1]);
  assert.deepEqual([por("reserve"), por("settlement"), por("igd"), por("nisgaa"), por("tsawwassen"), por("tlaamin")], [423, 3, 2, 1, 1, 1]);
  /* La suma de las 751 da la población de la provincia en el Censo 2021 */
  assert.equal(csd.reduce((a, r) => a + (r.p || 0), 0), 5000879);
  assert.equal(Number(L.provincia["Population and dwelling counts (13): Population, 2021 [1]"]), 5000879);
});

test("identificadores estables, clasificación, región económica, distrito regional y coordenadas dentro de BC", () => {
  assert.equal(new Set(csd.map((r) => r.c)).size, 751, "código de subdivisión censal único");
  assert.equal(new Set(csd.map((r) => r.r)).size, 8, "8 regiones económicas");
  assert.equal(new Set(csd.map((r) => r.cd)).size, 29, "27 distritos regionales, Stikine y Northern Rockies");
  for (const r of csd) {
    assert.match(r.c, /^59\d{5}$/, `${r.n}: código`);
    assert.match(r.r, /^59[1-8]0$/, `${r.n}: región ${r.r}`);
    assert.ok(r.distrito && r.sup, `${r.n}: distrito`);
    assert.ok(r.lat >= 48.2 && r.lat <= 60.01 && r.lon >= -139.1 && r.lon <= -114, `${r.n}: ${r.lat}, ${r.lon}`);
  }
  /* Valores conocidos (Statistics Canada, Censo 2021) */
  assert.equal(porSlug("vancouver").p, 662248);
  assert.equal(porSlug("surrey").p, 568322);
  assert.equal(porSlug("vancouver").est.v, 740454, "BC Stats, 1 de julio de 2025");
  /* Nombres oficiales vigentes, con el del censo como variante de búsqueda */
  assert.equal(porSlug("daajing-giids").alias[0], "Queen Charlotte");
  assert.ok(porSlug("100-mile-house") && porSlug("sun-peaks"));
  /* Todos los municipios con su nombre legal y su estimación de BC Stats */
  for (const r of csd.filter((x) => TIPOS[x.t].grupo === "municipio")) {
    assert.ok(r.legal, `${r.n}: nombre legal (ABMS)`);
    assert.ok(r.est && r.est.v > 0, `${r.n}: estimación de BC Stats`);
  }
});

test("comunidades y lugares no incorporados: sin duplicados y siempre dentro de una subdivisión", () => {
  assert.ok(comunidades.length > 1500, `${comunidades.length} comunidades`);
  const claves = comunidades.map((c) => `${c.n.toLowerCase()}|${c.m}`);
  assert.equal(new Set(claves).size, claves.length, "sin repetidos en la misma subdivisión");
  for (const c of comunidades) {
    const padre = L.porCodigo.get(c.m);
    assert.ok(padre, `${c.n}: subdivisión ${c.m}`);
    assert.notEqual(c.n.toLowerCase(), padre.n.toLowerCase(), `${c.n} no repite su subdivisión`);
  }
  /* Ningún lugar «antiguo» (Former Locality) ni municipio repetido como comunidad */
  assert.ok(!comunidades.some((c) => /former/i.test(TIPOS[c.t].en)));
  /* Lugares designados de Statistics Canada con su población del Censo 2021 */
  const bamfield = comunidades.find((c) => c.n === "Bamfield");
  assert.equal(bamfield.p, 201);
  assert.equal(L.porCodigo.get(bamfield.m).n, "Alberni-Clayoquot A");
  assert.ok(!comunidades.some((c) => /\x92/.test(c.n)), "apóstrofos corregidos");
});

test("una página por subdivisión, URL única, una imagen social por página y sin sobrantes", () => {
  assert.equal(paginas.length, 751);
  assert.equal(new Set(csd.map((r) => r.s)).size, 751);
  /* Homónimos: el más poblado conserva la URL corta */
  assert.equal(porSlug("langley").t, "district");
  assert.equal(porSlug("langley-city").t, "city");
  assert.equal(porSlug("north-vancouver").t, "district");
  assert.equal(porSlug("north-vancouver-city").t, "city");
  assert.equal(porSlug("alert-bay").t, "village");
  assert.equal(porSlug("alert-bay-indian-reserve").t, "reserve");
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/british-columbia")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("british-columbia/", "")).sort());
  assert.deepEqual(readdirSync(join(ROOT, "assets/canada-en-datos/british-columbia")).sort(), enDisco.map((f) => f.replace(".html", ".jpg")).sort());
});

test("fichas completas indexables y en el sitemap; las básicas con noindex; metadatos y compartir con la URL pública", () => {
  const sitemap = read("sitemap.xml");
  assert.equal(Object.keys(FICHAS).length, 15);
  for (const [k, html] of paginas) {
    const s = k.replace("british-columbia/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/british-columbia/${s}`;
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:url" content="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:image" content="https://podcastdelmigrante.com/assets/canada-en-datos/british-columbia/${s}.jpg">`));
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
});

test("sin datos vacíos ni inventados; datos regionales presentados como regionales", () => {
  for (const [k, html] of paginas) assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object /, k);
  const van = PAGES["british-columbia/vancouver.html"];
  assert.match(van, /662,248/);
  assert.match(van, /740,454/);
  assert.match(van, /\$2,647 al mes/, "CMHC, ciudad de Vancouver, 2 habitaciones, octubre de 2025");
  assert.match(van, /href="https:\/\/www\.translink\.ca\/"/);
  assert.match(van, /región Lower Mainland–Southwest/);
  assert.match(van, /Hora del Pacífico \(PCT\), UTC−7 todo el año/);
  const area = PAGES["british-columbia/alberni-clayoquot-a.html"];
  assert.match(area, /área electoral/);
  assert.match(area, /Bamfield/);
  assert.match(area, /Dato no disponible/);
  assert.doesNotMatch(area, /CMHC[^<]*al mes/, "las páginas básicas no muestran alquileres de otra ciudad");
  assert.match(area, /1,619\.77 km²/, "superficie con decimales del censo");
  const reserva = PAGES["british-columbia/ahahswinis-1.html"];
  assert.match(reserva, /reserva indígena \(Indian Reserve\)/);
  assert.match(reserva, /No es un municipio/);
  /* Zona horaria: matiz del sureste (East Kootenay) */
  assert.match(PAGES["british-columbia/cranbrook.html"], /Hora de Alberta, UTC−6 todo el año: una hora más que el resto de BC/);
});

test("la guía provincial: secciones, hora del Pacífico, BC PNP, tabla de alquileres y directorio extendido", () => {
  const html = PAGES["british-columbia.html"];
  for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Columbia Británica<\/h2>/);
  assert.match(html, /Compartir esta guía/);
  assert.match(html, /data-cd-share data-url="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/british-columbia"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-british-columbia\.jpg">/);
  for (const id of ["cdLocBuscar", "cdLocTipo", "cdLocRegion", "cdLocSub", "cdLocPob", "cdLocOrden", "cdLocReset"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /data-src="\/js\/british-columbia-localidades\.js"/);
  assert.doesNotMatch(html, /<script src="\/js\/british-columbia-localidades\.js">/, "carga diferida");
  assert.match(html, /UTC−7/);
  assert.match(html, /6,254 nominaciones/);
  assert.match(html, /\$18\.25/);
  assert.match(html, /<th scope="row">Vancouver \(área metropolitana\)<\/th><td>\$2,363<\/td><td>3\.7%<\/td>/);
  assert.doesNotMatch(html, /garantizad[oa]s? (un )?empleo|empleo asegurado/i);
  for (const k of Object.keys(FICHAS)) assert.ok(html.includes(`href="/canada-en-datos/british-columbia/${k}"`), k);
});

test("reloj: BC usa UTC−7 todo el año (no «America/Vancouver», que aún aplicaría el cambio de noviembre)", () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read("js/canada-datos.js") + ";globalThis.R=CD_REGIONS;", ctx);
  const bc = ctx.R.find((r) => r.code === "BC");
  assert.equal(bc.profile, "british-columbia");
  assert.equal(bc.timeZone, "America/Whitehorse");
  for (const fecha of ["2026-07-15T12:00:00Z", "2026-11-15T12:00:00Z", "2027-01-15T12:00:00Z"]) {
    const h = new Intl.DateTimeFormat("en-CA", { timeZone: bc.timeZone, hour: "numeric", hour12: false }).format(new Date(fecha));
    assert.equal(Number(h), 5, `${fecha}: 12:00 UTC son las 5:00 en BC`);
  }
});

test("datos del navegador: directorio extendido con variantes de nombre, y Alberta y Ontario sin cambios", () => {
  const ctx = {};
  new Function("window", read("js/british-columbia-localidades.js"))(ctx);
  const d = ctx.CD_LOCALIDADES;
  assert.equal(d.provincia.slug, "british-columbia");
  assert.equal(d.provincia.extendido, true);
  assert.equal(d.localidades.length, L.items.length);
  assert.equal(d.localidades.filter((f) => f[7]).length, 751);
  assert.equal(d.localidades.filter((f) => f[8] === 1).length, 15);
  assert.ok(d.localidades.some((f) => f[0] === "Daajing Giids" && /Queen Charlotte/.test(f[10])));
  const nombres = d.localidades.filter((f) => f[7]).map((f) => f[0]);
  assert.equal(new Set(nombres).size, nombres.length, "nombres únicos entre las páginas");
  for (const p of ["alberta", "ontario"]) {
    const c = {};
    new Function("window", read(`js/${p}-localidades.js`))(c);
    assert.equal(c.CD_LOCALIDADES.provincia.extendido, undefined, `${p}: sin directorio extendido`);
    assert.equal(c.CD_LOCALIDADES.campos.length, 10);
    assert.doesNotMatch(PAGES[`${p}.html`], /cdLocSub|cdLocReset/);
  }
});

test("cada lugar sin página propia tiene un ancla única y existente en la página de su subdivisión", () => {
  const ctx = {};
  new Function("window", read("js/british-columbia-localidades.js"))(ctx);
  const d = ctx.CD_LOCALIDADES;
  assert.deepEqual(d.campos.slice(-2), ["alias", "ancla"]);
  const lugares = d.localidades.filter((f) => f[5] !== -1);
  assert.equal(lugares.length, 1627);
  const vistas = new Set();
  const paginas = new Map();
  for (const f of lugares) {
    const sub = d.localidades[f[5]];
    assert.ok(sub[7], `${f[0]}: su subdivisión tiene página`);
    assert.match(f[11], /^lugar-[a-z0-9-]+$/, f[0]);
    const clave = `${sub[7]}#${f[11]}`;
    assert.ok(!vistas.has(clave), `ancla repetida: ${clave}`);
    vistas.add(clave);
    if (!paginas.has(sub[7])) paginas.set(sub[7], read(`canada-en-datos/british-columbia/${sub[7]}.html`));
    const html = paginas.get(sub[7]);
    const i = html.indexOf(`id="${f[11]}"`);
    assert.ok(i > 0 && html.indexOf(`id="${f[11]}"`, i + 1) === -1, `${clave}: el ancla está una sola vez`);
    assert.ok(html.slice(i, i + 300).includes(`>${f[0].replace(/&/g, "&amp;").replace(/'/g, "&#39;")}`), `${clave}: el ancla rodea el nombre ${f[0]}`);
  }
  /* Las 751 subdivisiones no llevan ancla */
  assert.ok(d.localidades.filter((f) => f[5] === -1).every((f) => f[11] === ""));
});

test("161 frente a 160 municipios y hora regional: explicados con sus fuentes oficiales, sin registros inventados", () => {
  const ctx = {};
  new Function("window", read("js/british-columbia-localidades.js"))(ctx);
  const d = ctx.CD_LOCALIDADES;
  assert.equal(d.localidades.filter((f) => d.tipos[f[1]][2] === "municipio").length, 160, "160 municipios con datos del censo y límites legales");
  const igd = d.localidades.filter((f) => f[1] === "igd");
  assert.equal(igd.length, 2);
  assert.ok(igd.every((f) => f[10] === "shíshálh Nation Government District"), "se encuentra por su nombre oficial");
  assert.ok(!d.localidades.some((f) => f[7] && /okanagan-falls/.test(f[7])), "Okanagan Falls no tiene página propia hasta que las fuentes la incluyan");
  const guia = PAGES["british-columbia.html"];
  assert.match(guia, /161 municipios porque incluye el shíshálh Nation Government District/);
  assert.match(guia, /District of Okanagan Falls se incorpora el 6 de noviembre de 2026/);
  const pag = (s) => read(`canada-en-datos/british-columbia/${s}.html`);
  assert.match(pag("sechelt-part-qathet"), /lista oficial del Ministerio de Vivienda y Asuntos Municipales lo cuenta entre los 161 municipios/);
  assert.match(pag("sechelt-part-qathet"), /local_government_legal_name_and_incorporation_dates\.pdf/);
  assert.match(pag("okanagan-similkameen-d"), /District of Okanagan Falls\) el 6 de noviembre de 2026/);
  assert.match(pag("okanagan-similkameen-d"), /2026HMA0069-000747/);
  /* Hora local según el comunicado 2026AG0013-000209 */
  for (const [s, re] of [["cranbrook", /UTC−6 todo el año/], ["golden", /UTC−6 todo el año/], ["dawson-creek", /Hora estándar de la montaña \(UTC−7\) todo el año/], ["northern-rockies", /Hora estándar de la montaña \(UTC−7\) todo el año/], ["fort-ware-1", /Fort Ware \(Kwadacha\) usa la hora del Pacífico/], ["vancouver", /Hora del Pacífico \(PCT\), UTC−7 todo el año/]]) {
    assert.match(pag(s), re, s);
    assert.match(pag(s), /2026AG0013-000209/, `${s}: fuente de la hora regional`);
  }
});
