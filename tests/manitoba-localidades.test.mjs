/* «Explora las ciudades y pueblos de Manitoba»: catálogo oficial, páginas, guía, hora y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { render } from "../scripts/build-canada-datos.mjs";
import MB from "../scripts/canada-en-datos/provincias/manitoba.mjs";

const { TIPOS, FICHAS } = MB;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = MB.cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("manitoba/"));
const csd = L.items.filter((r) => TIPOS[r.t].grupo !== "comunidad");
const lugares = L.items.filter((r) => TIPOS[r.t].grupo === "comunidad");
const porSlug = (s) => csd.find((r) => r.s === s);
const lugar = (n) => lugares.find((r) => r.n === n);
const datos = () => {
  const ctx = {};
  new Function("window", read("js/manitoba-localidades.js"))(ctx);
  return ctx.CD_LOCALIDADES;
};

test("criterio: las 239 subdivisiones censales del Censo 2021, que suman la población de la provincia, y los 137 municipios oficiales", () => {
  assert.equal(csd.length, 239);
  const por = (t) => csd.filter((r) => r.t === t).length;
  assert.deepEqual(["city", "town", "village", "municipality", "lgd", "rm", "reserve", "settlement", "unorganized"].map(por), [10, 25, 2, 37, 2, 62, 88, 3, 10]);
  /* 137 municipios según el Municipal Officials Directory: el municipio rural de Mountain son dos subdivisiones censales */
  const municipales = csd.filter((r) => ["urbano", "municipio", "rural"].includes(TIPOS[r.t].grupo));
  assert.equal(municipales.length, 138);
  assert.deepEqual(municipales.filter((r) => /^Mountain \(/.test(r.censoNombre)).map((r) => r.s).sort(), ["mountain-north", "mountain-south"]);
  assert.equal(municipales.length - 1, 137);
  /* Sin doble conteo: solo las subdivisiones suman población; los lugares designados ya están dentro de ellas */
  assert.equal(csd.reduce((a, r) => a + (r.p || 0), 0), 1342153);
  assert.equal(L.provincia.p, 1342153);
  for (const d of Object.values(L.divisiones)) assert.equal(csd.filter((r) => r.cd === d.id).reduce((a, r) => a + (r.p || 0), 0), d.p, d.n);
  assert.equal(Object.keys(L.divisiones).length, 23);
});

test("identificadores estables, 8 regiones económicas (la de su división censal) y coordenadas dentro de la provincia", () => {
  assert.equal(new Set(csd.map((r) => r.c)).size, 239);
  assert.deepEqual(Object.keys(L.regiones).sort(), ["4610", "4620", "4630", "4640", "4650", "4660", "4670", "4680"]);
  assert.equal(L.regiones["4610"], "Sureste (Southeast)");
  const dentro = (r) => r.lat >= 48.99 && r.lat <= 60 && r.lon >= -102.06 && r.lon <= -88.9;
  for (const r of csd) {
    assert.match(r.c, /^46(0[1-9]|1\d|2[0-3])\d{3}$/, `${r.n}: código`);
    assert.equal(r.cd, r.c.slice(0, 4));
    assert.equal(L.divisiones[r.cd].er, r.r, `${r.n}: región económica de su división censal`);
    assert.match(r.sup, /^División n\.º \d{1,2}$/);
    assert.ok(dentro(r), `${r.n}: ${r.lat}, ${r.lon}`);
  }
  for (const r of lugares) assert.ok(dentro(r), `${r.n}: ${r.lat}, ${r.lon}`);
  assert.equal(porSlug("winnipeg").p, 749607);
  assert.equal(porSlug("winnipeg").cma, "Winnipeg");
  assert.equal(porSlug("winnipeg").r, "4650");
  assert.equal(porSlug("brandon").p, 51313);
  assert.equal(porSlug("winnipeg-beach").r, "4660", "Winnipeg Beach en Interlake, aunque su punto caiga en el lago");
  assert.equal(porSlug("rhineland").t, "municipality");
  assert.equal(porSlug("pinawa").t, "lgd");
  assert.equal(porSlug("south-indian-lake").t, "settlement");
  assert.equal(porSlug("peguis-1b").t, "reserve");
});

test("lugares designados y nombres geográficos: sin duplicados, siempre dentro de una subdivisión y sin población inventada", () => {
  assert.equal(lugares.length, 1823);
  const claves = lugares.map((c) => `${c.n.toLowerCase()}|${c.m}`);
  assert.equal(new Set(claves).size, claves.length);
  const nombresCsd = new Set(csd.map((r) => r.censoNombre.toLowerCase()));
  for (const c of lugares) {
    const padre = L.porCodigo.get(c.m);
    assert.ok(padre, `${c.n}: subdivisión ${c.m}`);
    assert.notEqual(c.n.toLowerCase(), padre.censoNombre.toLowerCase());
    if (c.t === "reserva-nombre" || c.t === "nombre-municipal") assert.ok(!nombresCsd.has(c.n.toLowerCase()), `${c.n} ya es una subdivisión censal`);
    if (String(c.id).startsWith("cgn-")) assert.equal(c.p, null, `${c.n}: sin población inventada`);
    else assert.equal(typeof c.p, "number", `${c.n}: población del censo`);
  }
  assert.equal(lugares.filter((c) => !String(c.id).startsWith("cgn-")).length, 137, "148 lugares designados; 11 coinciden con el nombre de su subdivisión");
  assert.equal(lugar("Grunthal").t, "lud");
  assert.equal(lugar("Grunthal").p, 1782);
  assert.equal(L.porCodigo.get(lugar("Grunthal").m).s, "hanover");
  assert.equal(lugar("Cross Lake").t, "comunidad-norte");
  assert.equal(L.porCodigo.get(lugar("Cross Lake").m).s, "division-no-22-unorganized");
  assert.equal(lugar("Killarney").t, "municipio-disuelto");
  assert.equal(L.porCodigo.get(lugar("Osborne Village").m).s, "winnipeg", "barrio de Winnipeg");
});

test("una página por subdivisión, URL única, homónimos y partes resueltos, una imagen social por página", () => {
  assert.equal(paginas.length, 239);
  assert.equal(new Set(csd.map((r) => r.s)).size, 239);
  assert.equal(porSlug("flin-flon").n, "Flin Flon (parte de Manitoba)");
  assert.equal(porSlug("portage-la-prairie").t, "city");
  assert.equal(porSlug("portage-la-prairie-rural-municipality").t, "rm");
  assert.equal(porSlug("thompson").t, "city");
  assert.equal(porSlug("thompson-rural-municipality").t, "rm");
  assert.equal(porSlug("gambler-63-division-15").n, "Gambler 63 (parte en la División n.º 15)");
  assert.equal(porSlug("gambler-63-division-16").n, "Gambler 63 (parte en la División n.º 16)");
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/manitoba")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("manitoba/", "")).sort());
  assert.deepEqual(readdirSync(join(ROOT, "assets/canada-en-datos/manitoba")).sort(), enDisco.map((f) => f.replace(".html", ".jpg")).sort());
});

test("13 fichas completas indexables y en el sitemap; las básicas con noindex; metadatos con la URL pública", () => {
  const sitemap = read("sitemap.xml");
  assert.deepEqual(Object.keys(FICHAS).sort(), ["brandon", "dauphin", "flin-flon", "morden", "neepawa", "portage-la-prairie", "selkirk", "steinbach", "swan-river", "the-pas", "thompson", "winkler", "winnipeg"]);
  for (const [k, html] of paginas) {
    const s = k.replace("manitoba/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/manitoba/${s}`;
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `${s}: canonical`);
    assert.ok(html.includes(`<meta property="og:url" content="${url}">`), `${s}: og:url`);
    assert.ok(html.includes(`<meta property="og:image" content="https://podcastdelmigrante.com/assets/canada-en-datos/manitoba/${s}.jpg">`), `${s}: imagen`);
    assert.ok(html.includes(`data-cd-share data-url="${url}"`), `${s}: comparte su propia URL`);
    assert.doesNotMatch(html, /pages\.dev/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    if (FICHAS[s]) {
      assert.doesNotMatch(html, /noindex/, s);
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${s} en el sitemap`);
    } else {
      assert.match(html, /<meta name="robots" content="noindex">/, s);
      assert.ok(!sitemap.includes(`<loc>${url}</loc>`), `${s} no debe estar en el sitemap`);
    }
  }
  assert.ok(sitemap.includes("<loc>https://podcastdelmigrante.com/canada-en-datos/manitoba</loc>"));
});

test("sin datos vacíos ni inventados; datos regionales presentados como tales; fichas con alquiler, hospital, agencias y servicios", () => {
  for (const [k, html] of paginas) {
    assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object |&amp;amp;/, k);
    assert.match(html, /Manitoba Standard Time\), UTC−5 todo el año/, k);
    assert.match(html, /se publican por región económica, no por localidad/, k);
    assert.match(html, /1-888-315-9257/, `${k}: Health Links`);
  }
  for (const [s, alquiler, hospital, agencia] of [
    ["winnipeg", "$1,571 al mes", "Health Sciences Centre (HSC)", "Manitoba Start"],
    ["brandon", "$1,086 al mes", "Brandon Regional Health Centre", "Westman Immigrant Services"],
    ["steinbach", "$1,004 al mes", "Bethesda Regional Health Centre", "Eastman Immigrant Services"],
    ["thompson", "$1,133 al mes", "Thompson General Hospital", "North West Regional Immigrant Services"],
    ["portage-la-prairie", "$1,261 al mes", "Portage District General Hospital", "Portage Learning and Literacy Centre"],
    ["winkler", "$1,046 al mes", "Boundary Trails Health Centre", "Regional Connections Immigrant Services"],
    ["morden", "$1,046 al mes", "Boundary Trails Health Centre", "Regional Connections Immigrant Services"],
    ["selkirk", "$1,513 al mes", "Selkirk Regional Health Centre", "Manitoba Start"],
  ]) {
    const h = PAGES[`manitoba/${s}.html`];
    for (const t of [alquiler, hospital, agencia, 'id="recien-llegados"', 'data-reloj-localidad']) assert.ok(h.includes(t), `${s}: ${t}`);
  }
  /* Sin encuesta de CMHC: «Dato no disponible», nunca el promedio provincial */
  for (const s of ["dauphin", "flin-flon", "the-pas", "swan-river", "neepawa"]) {
    const h = PAGES[`manitoba/${s}.html`];
    assert.match(h, /Dato no disponible<\/span>: esta página no muestra alquileres de CMHC/, s);
    assert.doesNotMatch(h, /Encuesta de alquileres de CMHC, octubre de 2025, para/, s);
  }
  assert.match(PAGES["manitoba/dauphin.html"], /Dauphin Regional Health Centre/);
  assert.match(PAGES["manitoba/the-pas.html"], /St\. Anthony&#39;s General Hospital|St\. Anthony's General Hospital/);
  assert.match(PAGES["manitoba/neepawa.html"], /Neepawa and Area Immigrant Settlement Services/);
  assert.match(PAGES["manitoba/flin-flon.html"], /Creighton y Denare Beach usan en la práctica la misma hora/);
  assert.match(PAGES["manitoba/stanley.html"], /Boundary Trails Health Centre/, "el hospital regional de la zona aunque no esté en la base ODHF");
  /* Básicas: sin alquileres de otra localidad; población de los lugares designados no se suma */
  const rm = PAGES["manitoba/hanover.html"];
  assert.match(rm, /municipio rural \(Rural Municipality\)/);
  assert.doesNotMatch(rm, /Encuesta de alquileres de CMHC, octubre de 2025, para/);
  assert.match(rm, /ya está incluida en la de Hanover/);
  assert.match(rm, /Grunthal <small>\(1,782 hab\., Censo 2021\)<\/small>/);
  assert.doesNotMatch(rm, /data-reloj-localidad/, "el reloj en vivo es solo para las fichas completas");
  assert.match(PAGES["manitoba/mountain-south.html"], /El censo divide el municipio rural de Mountain en dos subdivisiones/);
  assert.match(PAGES["manitoba/peguis-1b.html"], /No es un municipio/);
  /* Escuelas francesas con los acentos corregidos (la base ODEF trae «?») */
  assert.match(PAGES["manitoba/winnipeg.html"], /COLLÈGE LOUIS-RIEL/);
  assert.doesNotMatch(Object.values(PAGES).filter((h, i) => Object.keys(PAGES)[i].startsWith("manitoba/")).join(""), /COLL\?GE|\?COLE/);
});

test("la guía provincial: secciones, cifras verificadas, directorio extendido e identidad común", () => {
  const html = PAGES["manitoba.html"];
  for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Manitoba<\/h2>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/manitoba">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-manitoba\.jpg">/);
  for (const id of ["cdLocBuscar", "cdLocTipo", "cdLocRegion", "cdLocSub", "cdLocPob", "cdLocOrden", "cdLocReset"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /data-src="\/js\/manitoba-localidades\.js"/);
  assert.match(html, /Total: 2,062 localidades/);
  for (const re of [/1,517,379/, /1,342,153/, /\$16\.40/, /\$18\.15/, /5\.9%/, /\$31\.63/, /\$1,571/, /\$1,086/, /7%/, /UTC−5/, /1-888-315-9257/, /137 municipios/, /45 comunidades/, /3\.0%/, /\$10 al día/, /Manitoba Standard Time/, /1965/]) assert.match(html, re, String(re));
  assert.match(html, /<th scope="row">Winnipeg \(área metropolitana\)<\/th><td>\$1,571<\/td><td>2\.8%<\/td>/);
  assert.match(html, /<th scope="row">Winnipeg<\/th><td>11<\/td><td>Winnipeg<\/td><td>749,607<\/td>/);
  assert.doesNotMatch(html, /garantizad[oa]s? (un )?empleo|empleo asegurado|garantiza(mos)? (la|tu) (nominación|residencia)/i);
  assert.match(html, /no garantiza una invitación ni una nominación/);
  assert.doesNotMatch(html, /CST y CDT|hora central con horario de verano/i, "Manitoba ya no cambia la hora");
  for (const k of Object.keys(FICHAS)) assert.ok(html.includes(`href="/canada-en-datos/manitoba/${k}"`), k);
  assert.match(html, /<body data-cd-region="manitoba">/);
  const css = read("css/canada-datos.css");
  assert.doesNotMatch(css, /manitoba|data-cd-region=|data-cd-provincia=/i, "ninguna regla de estilo propia de una provincia");
  const hojas = (h) => [...h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hojas(html), hojas(PAGES["alberta.html"]), "mismas hojas de estilo que Alberta");
  assert.deepEqual(hojas(PAGES["manitoba/winnipeg.html"]), hojas(PAGES["saskatchewan/regina.html"]));
});

test("reloj: Manitoba usa UTC−5 todo el año (America/Atikokan), antes y después del 1-11-2026, también en las fichas", () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read("js/canada-datos.js") + ";globalThis.R=CD_REGIONS;globalThis.P=CD_PROFILES;", ctx);
  const mb = ctx.R.find((r) => r.code === "MB");
  assert.equal(mb.profile, "manitoba");
  assert.equal(mb.timeZone, "America/Atikokan");
  assert.equal(mb.multiZone, false);
  assert.equal(ctx.P.manitoba.code, "MB");
  for (const fecha of ["2026-10-30T18:00:00Z", "2026-11-02T18:00:00Z", "2027-01-15T18:00:00Z", "2027-03-15T18:00:00Z", "2027-07-01T18:00:00Z"]) {
    const h = new Intl.DateTimeFormat("en-CA", { timeZone: mb.timeZone, hour: "numeric", hour12: false }).format(new Date(fecha));
    assert.equal(Number(h), 13, `${fecha}: 18:00 UTC son las 13:00 en Winnipeg todo el año`);
  }
  assert.match(PAGES["manitoba/winnipeg.html"], /data-reloj-localidad data-zona="America\/Atikokan"/);
  assert.match(PAGES["manitoba/winnipeg.html"], /<script src="\/js\/canada-reloj-localidad\.js"><\/script>/);
  /* Las demás provincias no cargan el reloj de localidad */
  assert.doesNotMatch(PAGES["saskatchewan/regina.html"], /canada-reloj-localidad|data-reloj-localidad/);
  const ab = Object.keys(PAGES).find((k) => k.startsWith("alberta/"));
  assert.doesNotMatch(PAGES[ab], /canada-reloj-localidad|data-reloj-localidad/);
});

test("datos del navegador: directorio extendido, división censal como filtro y las demás provincias sin cambios", () => {
  const d = datos();
  assert.equal(d.provincia.slug, "manitoba");
  assert.equal(d.provincia.extendido, true);
  assert.equal(d.provincia.subregion, "División censal");
  assert.deepEqual(Object.keys(d.regiones).sort(), ["4610", "4620", "4630", "4640", "4650", "4660", "4670", "4680"]);
  assert.equal(d.localidades.length, 2062);
  assert.equal(d.localidades.filter((f) => f[7]).length, 239);
  assert.equal(d.localidades.filter((f) => f[8] === 1).length, 13);
  assert.equal(new Set(d.localidades.map((f) => f[9])).size, 23);
  const nombres = d.localidades.filter((f) => f[7]).map((f) => f[0]);
  assert.equal(new Set(nombres).size, nombres.length, "nombres únicos entre las páginas");
  const sk = {};
  new Function("window", read("js/saskatchewan-localidades.js"))(sk);
  assert.equal(sk.CD_LOCALIDADES.localidades.length, 3205, "Saskatchewan sin cambios");
  const bc = {};
  new Function("window", read("js/british-columbia-localidades.js"))(bc);
  assert.equal(bc.CD_LOCALIDADES.localidades.length, 2378, "BC sin cambios");
  const pe = {};
  new Function("window", read("js/prince-edward-island-localidades.js"))(pe);
  assert.equal(pe.CD_LOCALIDADES.localidades.length, 727, "PEI sin cambios");
});

test("cada lugar sin página propia tiene un ancla única y existente en la página de su subdivisión", () => {
  const d = datos();
  const sinPagina = d.localidades.filter((f) => f[5] !== -1);
  assert.equal(sinPagina.length, 1823);
  const vistas = new Set();
  const cache = new Map();
  for (const f of sinPagina) {
    const sub = d.localidades[f[5]];
    assert.ok(sub[7]);
    assert.match(f[11], /^lugar-[a-z0-9-]+$/, f[0]);
    const clave = `${sub[7]}#${f[11]}`;
    assert.ok(!vistas.has(clave), `ancla repetida: ${clave}`);
    vistas.add(clave);
    if (!cache.has(sub[7])) cache.set(sub[7], read(`canada-en-datos/manitoba/${sub[7]}.html`));
    const html = cache.get(sub[7]);
    const i = html.indexOf(`id="${f[11]}"`);
    assert.ok(i > 0 && html.indexOf(`id="${f[11]}"`, i + 1) === -1, `${clave}: el ancla está una sola vez`);
  }
});

test("portada de Canadá en Datos: Manitoba marcada como ficha disponible, sin tocar las demás regiones", () => {
  const idx = read("canada-en-datos/index.html");
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="MB"/);
  assert.match(idx, /aria-label="Manitoba \(ficha disponible\)"/);
  for (const code of ["AB", "ON", "BC", "PE", "SK"]) assert.match(idx, new RegExp(`class="cd-region cd-region--ficha" data-code="${code}"`), code);
  for (const code of ["NS", "NB", "NL", "QC", "YT", "NT", "NU"]) assert.match(idx, new RegExp(`class="cd-region" data-code="${code}"`), code);
});
