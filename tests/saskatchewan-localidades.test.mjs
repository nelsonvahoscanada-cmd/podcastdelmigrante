/* «Explora las ciudades y pueblos de Saskatchewan»: catálogo oficial, páginas, guía y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { render } from "../scripts/build-canada-datos.mjs";
import SK from "../scripts/canada-en-datos/provincias/saskatchewan.mjs";

const { TIPOS, FICHAS } = SK;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = SK.cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("saskatchewan/"));
const csd = L.items.filter((r) => TIPOS[r.t].grupo !== "comunidad");
const lugares = L.items.filter((r) => TIPOS[r.t].grupo === "comunidad");
const porSlug = (s) => csd.find((r) => r.s === s);
const lugar = (n) => lugares.find((r) => r.n === n);
const datos = () => {
  const ctx = {};
  new Function("window", read("js/saskatchewan-localidades.js"))(ctx);
  return ctx.CD_LOCALIDADES;
};

test("criterio: las 951 subdivisiones censales del Censo 2021, que suman la población de la provincia", () => {
  assert.equal(csd.length, 951);
  const por = (t) => csd.filter((r) => r.t === t).length;
  assert.deepEqual(
    ["city", "town", "village", "resort", "rm", "northern-village", "northern-hamlet", "reserve", "settlement", "unorganized", "crown"].map(por),
    [17, 149, 251, 40, 296, 11, 11, 172, 1, 2, 1],
  );
  const grupo = (g) => csd.filter((r) => TIPOS[r.t].grupo === g).length;
  assert.deepEqual(["urbano", "rural", "norte", "indigena", "otro"].map(grupo), [457, 296, 22, 173, 3]);
  /* Sin doble conteo: solo las subdivisiones suman población; los lugares designados ya están dentro de ellas */
  assert.equal(csd.reduce((a, r) => a + (r.p || 0), 0), 1132505);
  assert.equal(L.provincia.p, 1132505);
  /* Divisiones censales con sus cifras del censo */
  for (const d of Object.values(L.divisiones)) assert.equal(csd.filter((r) => r.cd === d.id).reduce((a, r) => a + (r.p || 0), 0), d.p, d.n);
  assert.equal(Object.keys(L.divisiones).length, 18);
});

test("identificadores estables, 6 regiones económicas, división censal y coordenadas dentro de la provincia", () => {
  assert.equal(new Set(csd.map((r) => r.c)).size, 951, "código de subdivisión censal único");
  assert.deepEqual(Object.keys(L.regiones).sort(), ["4710", "4720", "4730", "4740", "4750", "4760"]);
  assert.equal(L.regiones["4760"], "Northern");
  for (const r of csd) {
    assert.match(r.c, /^47(0[1-9]|1[0-8])\d{3}$/, `${r.n}: código`);
    assert.equal(r.cd, r.c.slice(0, 4), `${r.n}: división censal según el código`);
    assert.equal(L.divisiones[r.cd].er, r.r, `${r.n}: misma región económica que su división censal`);
    assert.match(r.sup, /^División n\.º \d{1,2}$/);
    assert.ok(r.lat >= 48.99 && r.lat <= 60 && r.lon >= -110.01 && r.lon <= -101.36, `${r.n}: ${r.lat}, ${r.lon}`);
  }
  for (const r of lugares) assert.ok(r.lat >= 48.99 && r.lat <= 60 && r.lon >= -110.01 && r.lon <= -101.36, `${r.n}: ${r.lat}, ${r.lon}`);
  /* Valores conocidos (Statistics Canada, Censo 2021) */
  assert.equal(porSlug("saskatoon").p, 266141);
  assert.equal(porSlug("regina").p, 226404);
  assert.equal(porSlug("regina").cma, "Regina");
  assert.equal(porSlug("regina").r, "4710");
  assert.equal(porSlug("saskatoon").r, "4730");
  assert.equal(porSlug("la-loche").t, "northern-village");
  assert.equal(porSlug("ahtahkakoop-104").t, "reserve");
  assert.equal(porSlug("brabant-lake").t, "settlement");
});

test("lugares designados y nombres geográficos: sin duplicados, siempre dentro de una subdivisión y sin población inventada", () => {
  assert.equal(lugares.length, 2254);
  const claves = lugares.map((c) => `${c.n.toLowerCase()}|${c.m}`);
  assert.equal(new Set(claves).size, claves.length, "sin repetidos en la misma subdivisión");
  const nombresCsd = new Set(csd.map((r) => r.censoNombre.toLowerCase()));
  for (const c of lugares) {
    const padre = L.porCodigo.get(c.m);
    assert.ok(padre, `${c.n}: subdivisión ${c.m}`);
    assert.notEqual(c.n.toLowerCase(), padre.censoNombre.toLowerCase(), `${c.n} no repite su subdivisión`);
    if (c.t === "reserva-nombre" || c.t === "nombre-municipal") assert.ok(!nombresCsd.has(c.n.toLowerCase()), `${c.n} ya es una subdivisión censal`);
    /* Solo los lugares designados (Statistics Canada) tienen población, y es del Censo 2021; los nombres geográficos
       (CGNDB), aunque sean del mismo tipo (p. ej., una aldea organizada que no es lugar designado), no tienen cifra */
    if (String(c.id).startsWith("cgn-")) assert.equal(c.p, null, `${c.n}: sin población inventada`);
    else assert.equal(typeof c.p, "number", `${c.n}: población del censo`);
  }
  const por = (t) => lugares.filter((c) => c.t === t).length;
  assert.equal(lugares.filter((c) => !String(c.id).startsWith("cgn-")).length, 197, "198 lugares designados; Gravelbourg (antiguo centro de población) coincide con el pueblo");
  assert.equal(por("municipio-disuelto"), 40);
  assert.equal(por("barrio"), 146);
  assert.equal(por("reserva-nombre"), 654);
  /* Un lugar designado y su nombre geográfico (a menos de 5 km) se muestran una sola vez */
  assert.equal(lugares.filter((c) => c.n === "Kylemore").length, 1);
  assert.equal(lugar("Kylemore").t, "aldea-organizada");
  assert.equal(lugar("Beaver Creek").p, 111);
  assert.equal(L.porCodigo.get(lugar("Beaver Creek").m).s, "corman-park-no-344");
  assert.equal(L.porCodigo.get(lugar("Albert Park").m).s, "regina", "barrio de Regina");
  assert.equal(L.porCodigo.get(lugar("Uranium City").m).s, "division-no-18-unorganized");
});

test("variantes de búsqueda: nombres legales, otras escrituras de las reservas y municipios rurales sin «No.»", () => {
  assert.ok(porSlug("katepwa").alias.includes("District of Katepwa"));
  assert.ok(porSlug("lakeland-no-521").alias.includes("The District of Lakeland No. 521"));
  assert.ok(porSlug("moose-jaw-no-161").alias.includes("Moose Jaw 161"));
  assert.ok(porSlug("beardy-s-and-okemasis-96-and-97a").alias.includes("Beardy's & Okemasis 96 & 97-A"), "misma reserva escrita como en la CGNDB");
  assert.ok(!lugares.some((c) => c.n === "Beardy's & Okemasis 96 & 97-A"), "y no se repite como lugar");
  assert.ok(porSlug("lloydminster").alias.includes("Lloydminster (Part)"));
});

test("una página por subdivisión, URL única, ciudades partidas y homónimos resueltos, una imagen social por página", () => {
  assert.equal(paginas.length, 951);
  assert.equal(new Set(csd.map((r) => r.s)).size, 951);
  assert.equal(porSlug("lloydminster").n, "Lloydminster (parte de Saskatchewan)");
  assert.equal(porSlug("flin-flon").n, "Flin Flon (parte de Saskatchewan)");
  assert.equal(porSlug("north-battleford").t, "city");
  assert.equal(porSlug("north-battleford-crown-colony").t, "crown");
  assert.equal(porSlug("north-battleford-crown-colony").n, "North Battleford (colonia de la Corona)");
  assert.equal(porSlug("north-battleford-no-437").t, "rm");
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/saskatchewan")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("saskatchewan/", "")).sort());
  assert.deepEqual(readdirSync(join(ROOT, "assets/canada-en-datos/saskatchewan")).sort(), enDisco.map((f) => f.replace(".html", ".jpg")).sort());
});

test("fichas completas indexables y en el sitemap; las básicas con noindex; metadatos y compartir con la URL pública", () => {
  const sitemap = read("sitemap.xml");
  assert.deepEqual(Object.keys(FICHAS).sort(), ["lloydminster", "moose-jaw", "north-battleford", "prince-albert", "regina", "saskatoon", "swift-current", "yorkton"]);
  for (const [k, html] of paginas) {
    const s = k.replace("saskatchewan/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/saskatchewan/${s}`;
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `${s}: canonical`);
    assert.ok(html.includes(`<meta property="og:url" content="${url}">`), `${s}: og:url`);
    assert.ok(html.includes(`<meta property="og:image" content="https://podcastdelmigrante.com/assets/canada-en-datos/saskatchewan/${s}.jpg">`), `${s}: imagen`);
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
    assert.ok(html.includes(`data-cd-share data-url="${url}"`), `${s}: comparte su propia URL`);
    assert.ok(html.includes('<html lang="es">'));
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
  assert.ok(sitemap.includes("<loc>https://podcastdelmigrante.com/canada-en-datos/saskatchewan</loc>"));
});

test("sin datos vacíos ni inventados; datos regionales y provinciales presentados como tales", () => {
  for (const [k, html] of paginas) {
    assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object /, k);
    assert.match(html, /UTC−[56]/, k);
    assert.match(html, /se publican por región económica, no por localidad/, `${k}: el empleo se presenta como dato regional`);
    assert.match(html, /8-1-1/, k);
  }
  const re = PAGES["saskatchewan/regina.html"];
  assert.match(re, /226,404/);
  assert.match(re, /\$1,474 al mes/, "CMHC, ciudad de Regina (zonas 1 a 7), 2 habitaciones, octubre de 2025");
  assert.match(re, /Regina General Hospital/);
  assert.match(re, /Pasqua Hospital/);
  assert.match(re, /href="https:\/\/www\.regina\.ca\/transportation-roads-parking\/transit\/"/);
  assert.match(re, /id="lugar-albert-park"/);
  const sa = PAGES["saskatchewan/saskatoon.html"];
  assert.match(sa, /266,141/);
  assert.match(sa, /\$1,545 al mes/);
  assert.match(sa, /Royal University Hospital/);
  /* Básicas: sin alquileres de otra localidad ni cifras atribuidas a la localidad */
  const rm = PAGES["saskatchewan/corman-park-no-344.html"];
  assert.match(rm, /municipio rural \(Rural Municipality\)/);
  assert.match(rm, /Dato no disponible/);
  assert.doesNotMatch(rm, /CMHC, octubre de 2025, para/, "las páginas básicas no muestran alquileres de otra localidad");
  assert.match(rm, /ya está incluida en la de Corman Park No\. 344/, "la población de los lugares designados no se suma");
  assert.match(rm, /Beaver Creek <small>\(111 hab\., Censo 2021\)<\/small>/);
  assert.match(PAGES["saskatchewan/prince-albert.html"], /región Prince Albert y Northern \(Statistics Canada publica juntas las regiones Prince Albert y Northern\)/);
  /* Fichas ampliadas: alquiler de CMHC de su aglomeración, hospital, agencias de asentamiento y servicios municipales */
  for (const [s, alquiler, hospital, agencia] of [
    ["prince-albert", "$1,245 al mes", "Victoria Hospital", "Prince Albert Multicultural Council"],
    ["moose-jaw", "$1,336 al mes", "Dr. F.H. Wigmore Regional Hospital", "Moose Jaw Multicultural Council"],
    ["swift-current", "$1,011 al mes", "Cypress Regional Hospital", "Southwest Newcomer Welcome Centre"],
    ["yorkton", "$1,224 al mes", "Yorkton Regional Health Centre", "East Central Newcomer Welcome Centre"],
    ["north-battleford", "$1,166 al mes", "Battlefords Union Hospital", "Battlefords Immigration Resource Center"],
    ["lloydminster", "$1,353 al mes", "Lloydminster Hospital", "Lloydminster Learning Council Association"],
  ]) {
    const h = PAGES[`saskatchewan/${s}.html`];
    for (const t of [alquiler, hospital, agencia, 'id="servicios"', "Servicios municipales"]) assert.ok(h.includes(t), `${s}: ${t}`);
    assert.doesNotMatch(h, /noindex/, s);
  }
  assert.match(PAGES["saskatchewan/lloydminster.html"], /la parte de Saskatchewan de la aglomeración de Lloydminster/);
  assert.match(PAGES["saskatchewan/north-battleford.html"], /Saskatchewan Hospital North Battleford \(salud mental\)/);
  assert.match(PAGES["saskatchewan/north-battleford-no-437.html"], /el más cercano[^<]*<strong>Battlefords Union Hospital<\/strong>/, "el hospital especializado no cuenta como el más cercano");
  const reserva = PAGES["saskatchewan/ahtahkakoop-104.html"];
  assert.match(reserva, /reserva indígena \(Indian Reserve\)/);
  assert.match(reserva, /No es un municipio/);
  assert.match(PAGES["saskatchewan/north-battleford-crown-colony.html"], /Es distinta de la ciudad de North Battleford/);
  /* Hora: toda la provincia UTC−6; nota para Lloydminster y para la zona de Flin Flon */
  assert.match(PAGES["saskatchewan/lloydminster.html"], /La Time Act, 2026, que entra en vigor el 30 de octubre de 2026, fija UTC−6 en toda Saskatchewan e incluye expresamente a Lloydminster/);
  assert.doesNotMatch(read("js/canada-datos.js") + Object.values(PAGES).filter((h) => h.includes("Time Act")).join(""), /vigente desde el 30 de octubre|en vigor desde el 30 de octubre/, "la Time Act no se presenta como vigente antes del 30-10-2026");
  assert.match(PAGES["saskatchewan/creighton.html"], /En la práctica, esta zona sigue la hora de Flin Flon \(Manitoba\), UTC−5, que Manitoba mantendrá todo el año a partir del 31 de octubre de 2026/);
  assert.match(PAGES["saskatchewan/moose-jaw.html"], /Hora central \(CST\), UTC−6 todo el año/);
});

test("la guía provincial: secciones, cifras verificadas, filtros y directorio extendido", () => {
  const html = PAGES["saskatchewan.html"];
  for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Saskatchewan<\/h2>/);
  assert.match(html, /Compartir esta guía/);
  assert.match(html, /data-cd-share data-url="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/saskatchewan"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/saskatchewan">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-saskatchewan\.jpg">/);
  for (const id of ["cdLocBuscar", "cdLocTipo", "cdLocRegion", "cdLocSub", "cdLocPob", "cdLocOrden", "cdLocReset"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<label for="cdLocSub">División censal/);
  assert.match(html, /data-src="\/js\/saskatchewan-localidades\.js"/);
  assert.match(html, /Total: 3,205 localidades/);
  /* Cifras con fuente oficial */
  for (const re of [/1,278,402/, /1,132,505/, /\$15\.70/, /\$18\.15/, /5\.4%/, /\$33\.39/, /\$1,473/, /\$1,548/, /6%/, /UTC−6/, /8-1-1/, /187,885/, /773,789/, /94\.5%/, /Time Act, 2026/, /90 días/]) assert.match(html, re, String(re));
  assert.match(html, /<th scope="row">Saskatoon \(área metropolitana\)<\/th><td>\$1,548<\/td><td>3\.3%<\/td>/);
  assert.match(html, /<th scope="row">Saskatoon<\/th><td>11<\/td><td>Saskatoon–Biggar<\/td><td>266,141<\/td>/);
  /* Sin promesas de empleo ni de inmigración */
  assert.doesNotMatch(html, /garantizad[oa]s? (un )?empleo|empleo asegurado|garantiza(mos)? (la|tu) (nominación|residencia)/i);
  assert.match(html, /no garantiza una nominación/);
  for (const k of Object.keys(FICHAS)) assert.ok(html.includes(`href="/canada-en-datos/saskatchewan/${k}"`), k);
  /* Identidad visual: la misma de El Podcast del Migrante que Alberta (verde, negro y blanco), sin paleta propia */
  assert.match(html, /<body data-cd-region="saskatchewan">/);
  assert.match(PAGES["saskatchewan/regina.html"], /data-cd-provincia="saskatchewan"/);
  const css = read("css/canada-datos.css");
  assert.doesNotMatch(css, /saskatchewan|data-cd-region=|data-cd-provincia=/i, "ninguna regla de estilo propia de una provincia");
  assert.doesNotMatch(css, /#f2c230|#f8ebbf/i, "sin dorado");
  assert.equal((css.match(/--cd-acento:/g) || []).length, 1, "un solo acento para todas las provincias");
  const hojas = (h) => [...h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hojas(html), hojas(PAGES["alberta.html"]), "mismas hojas de estilo que Alberta");
  assert.deepEqual(hojas(PAGES["saskatchewan/regina.html"]), hojas(PAGES["alberta/calgary.html"] || PAGES[Object.keys(PAGES).find((k) => k.startsWith("alberta/"))]));
});

test("reloj: Saskatchewan usa America/Regina (UTC−6 todo el año) y la zona de Creighton se muestra aparte", () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read("js/canada-datos.js") + ";globalThis.R=CD_REGIONS;globalThis.P=CD_PROFILES;", ctx);
  const sk = ctx.R.find((r) => r.code === "SK");
  assert.equal(sk.profile, "saskatchewan");
  assert.equal(sk.timeZone, "America/Regina");
  assert.equal(sk.multiZone, true);
  assert.equal(sk.zones.length, 1);
  assert.equal(sk.zones[0].timeZone, "America/Atikokan");
  assert.match(sk.zones[0].label, /Creighton/);
  assert.equal(ctx.P.saskatchewan.code, "SK");
  for (const fecha of ["2026-10-31T18:00:00Z", "2026-11-02T18:00:00Z", "2027-01-15T18:00:00Z", "2027-03-15T18:00:00Z", "2027-07-01T18:00:00Z"]) {
    const h = new Intl.DateTimeFormat("en-CA", { timeZone: sk.timeZone, hour: "numeric", hour12: false }).format(new Date(fecha));
    assert.equal(Number(h), 12, `${fecha}: 18:00 UTC son las 12:00 en Regina todo el año`);
    const c = new Intl.DateTimeFormat("en-CA", { timeZone: sk.zones[0].timeZone, hour: "numeric", hour12: false }).format(new Date(fecha));
    assert.equal(Number(c), 13, `${fecha}: UTC−5 en la zona de Creighton`);
  }
});

test("datos del navegador: directorio extendido, división censal como filtro y las demás provincias sin cambios", () => {
  const d = datos();
  assert.equal(d.provincia.slug, "saskatchewan");
  assert.equal(d.provincia.extendido, true);
  assert.equal(d.provincia.subregion, "División censal");
  assert.deepEqual(Object.keys(d.regiones).sort(), ["4710", "4720", "4730", "4740", "4750", "4760"]);
  assert.equal(d.localidades.length, 3205);
  assert.equal(d.localidades.filter((f) => f[7]).length, 951);
  assert.equal(d.localidades.filter((f) => f[8] === 1).length, 8);
  assert.equal(new Set(d.localidades.map((f) => f[9])).size, 18);
  const nombres = d.localidades.filter((f) => f[7]).map((f) => f[0]);
  assert.equal(new Set(nombres).size, nombres.length, "nombres únicos entre las páginas");
  for (const p of ["alberta", "ontario"]) {
    const c = {};
    new Function("window", read(`js/${p}-localidades.js`))(c);
    assert.equal(c.CD_LOCALIDADES.provincia.extendido, undefined, `${p}: sin directorio extendido`);
  }
  const bc = {};
  new Function("window", read("js/british-columbia-localidades.js"))(bc);
  assert.equal(bc.CD_LOCALIDADES.localidades.length, 2378, "BC sin cambios");
  const pe = {};
  new Function("window", read("js/prince-edward-island-localidades.js"))(pe);
  assert.equal(pe.CD_LOCALIDADES.localidades.length, 727, "PEI sin cambios");
});

test("cada lugar sin página propia tiene un ancla única y existente en la página de su subdivisión", () => {
  const d = datos();
  assert.deepEqual(d.campos.slice(-2), ["alias", "ancla"]);
  const sinPagina = d.localidades.filter((f) => f[5] !== -1);
  assert.equal(sinPagina.length, 2254);
  const vistas = new Set();
  const cache = new Map();
  for (const f of sinPagina) {
    const sub = d.localidades[f[5]];
    assert.ok(sub[7], `${f[0]}: su subdivisión tiene página`);
    assert.match(f[11], /^lugar-[a-z0-9-]+$/, f[0]);
    const clave = `${sub[7]}#${f[11]}`;
    assert.ok(!vistas.has(clave), `ancla repetida: ${clave}`);
    vistas.add(clave);
    if (!cache.has(sub[7])) cache.set(sub[7], read(`canada-en-datos/saskatchewan/${sub[7]}.html`));
    const html = cache.get(sub[7]);
    const i = html.indexOf(`id="${f[11]}"`);
    assert.ok(i > 0 && html.indexOf(`id="${f[11]}"`, i + 1) === -1, `${clave}: el ancla está una sola vez`);
    assert.ok(html.slice(i, i + 300).includes(`>${f[0].replace(/&/g, "&amp;").replace(/'/g, "&#39;")}`), `${clave}: el ancla rodea el nombre ${f[0]}`);
  }
  assert.ok(d.localidades.filter((f) => f[5] === -1).every((f) => f[11] === ""));
});

test("portada de Canadá en Datos: Saskatchewan marcada como ficha disponible, sin tocar las demás regiones", () => {
  const idx = read("canada-en-datos/index.html");
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="SK"/);
  assert.match(idx, /aria-label="Saskatchewan \(ficha disponible\)"/);
  for (const code of ["AB", "ON", "BC", "PE", "MB"]) assert.match(idx, new RegExp(`class="cd-region cd-region--ficha" data-code="${code}"`), code);
  for (const code of ["NS", "NB", "NL", "QC", "YT", "NT", "NU"]) assert.match(idx, new RegExp(`class="cd-region" data-code="${code}"`), code);
});
