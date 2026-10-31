/* «Explora las ciudades y pueblos de Quebec»: catálogo oficial, estado municipal actual, páginas, guía, hora y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { render } from "../scripts/build-canada-datos.mjs";
import QC, { zona } from "../scripts/canada-en-datos/provincias/quebec.mjs";

const { TIPOS, FICHAS } = QC;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = QC.cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("quebec/"));
const csd = L.items.filter((r) => TIPOS[r.t].grupo !== "comunidad");
const lugares = L.items.filter((r) => TIPOS[r.t].grupo === "comunidad");
const porSlug = (s) => csd.find((r) => r.s === s);
const lugar = (n) => lugares.find((r) => r.n === n);
const datos = () => {
  const ctx = {};
  new Function("window", read("js/quebec-localidades.js"))(ctx);
  return ctx.CD_LOCALIDADES;
};

test("criterio: las 1,282 subdivisiones censales del Censo 2021, que suman la población de la provincia; las MRC no se cuentan como localidades", () => {
  assert.equal(csd.length, 1282);
  const por = (t) => csd.filter((r) => r.t === t).length;
  assert.deepEqual(
    ["ville", "municipalite", "paroisse", "canton", "cantons-unis", "village", "village-nordique", "village-cri", "village-naskapi", "gouvernement-regional", "reserve", "etablissement", "terre-crie", "terre-inuite", "terre-naskapie", "tno"].map(por),
    [229, 652, 139, 42, 2, 43, 14, 8, 1, 1, 27, 5, 9, 13, 1, 96],
  );
  /* Sin doble conteo: solo las subdivisiones suman población; los lugares designados ya están dentro de ellas */
  assert.equal(csd.reduce((a, r) => a + (r.p || 0), 0), 8501833);
  assert.equal(L.provincia.p, 8501833);
  for (const d of Object.values(L.divisiones)) assert.equal(csd.filter((r) => r.cd === d.id).reduce((a, r) => a + (r.p || 0), 0), d.p, d.n);
  /* 98 MRC y territorios equivalentes: son el filtro, no localidades */
  assert.equal(Object.keys(L.divisiones).length, 98);
  assert.ok(!L.items.some((r) => /^MRC /.test(r.n)), "ninguna MRC aparece como localidad");
  /* Ocho subdivisiones sin población publicada en el censo (enumeración incompleta): «Dato no disponible», no cero */
  assert.deepEqual(csd.filter((r) => r.p == null).map((r) => r.censoNombre).sort(), ["Akwesasne", "Doncaster", "Kahnawake", "Kanesatake", "Lac-Rapide", "Listuguj", "Pakuashipi", "Romaine 2"]);
});

test("17 regiones (la de su división censal), códigos estables y coordenadas dentro de la provincia", () => {
  assert.equal(new Set(csd.map((r) => r.c)).size, 1282);
  assert.equal(Object.keys(L.regiones).length, 17);
  assert.equal(L.regiones["2475"], "Saguenay–Lac-Saint-Jean");
  const dentro = (r) => r.lat >= 44.9 && r.lat <= 62.6 && r.lon >= -79.8 && r.lon <= -57;
  for (const r of csd) {
    assert.match(r.c, /^24\d{5}$/, `${r.n}: código`);
    assert.equal(r.cd, r.c.slice(0, 4));
    assert.equal(L.divisiones[r.cd].er, r.r, `${r.n}: región de su división censal`);
    assert.ok(dentro(r), `${r.n}: ${r.lat}, ${r.lon}`);
  }
  for (const r of lugares) assert.ok(dentro(r), `${r.n}: ${r.lat}, ${r.lon}`);
  assert.equal(porSlug("montreal").p, 1762949);
  assert.equal(porSlug("montreal").r, "2440");
  assert.equal(porSlug("quebec").p, 549459);
  assert.equal(porSlug("gatineau").cma, "Ottawa - Gatineau (partie du Québec / Quebec part)");
});

test("estado municipal actual (répertoire del MAMH): fusiones y cambios de nombre posteriores al Censo 2021", () => {
  const fusion = (s) => porSlug(s).fusion;
  for (const s of ["la-pocatiere", "sainte-anne-de-la-pocatiere", "saint-onesime-d-ixworth"]) assert.equal(fusion(s).nombre, "La Pocatière", s);
  for (const s of ["hebertville", "hebertville-station", "saint-bruno"]) assert.equal(fusion(s).nombre, "Hébertville", s);
  assert.equal(fusion("saint-guy").nombre, "Lac-des-Aigles");
  assert.equal(fusion("saint-guy").constitucion, "2024-07-31");
  assert.match(PAGES["quebec/saint-guy.html"], /Desde el 31 de julio de 2024, forma parte de Lac-des-Aigles \(ville\)/);
  assert.match(PAGES["quebec/saint-guy.html"], /Las cifras de esta página son las del Censo 2021, antes del cambio/);
  /* Nombre actual con el del censo como variante de búsqueda */
  assert.equal(porSlug("mont-blanc").censoNombre, "Saint-Faustin--Lac-Carré");
  assert.ok(porSlug("mont-blanc").alias.includes("Saint-Faustin--Lac-Carré"));
  assert.equal(porSlug("dollard-des-ormeaux").n, "Dollard-des-Ormeaux");
  /* La población oficial actual se muestra aparte y no reemplaza la del censo */
  const mtl = PAGES["quebec/montreal.html"];
  assert.match(mtl, /<dt>Población<\/dt><dd>1,762,949 /);
  assert.match(mtl, /<dt>Población oficial actual<\/dt><dd>1,913,561 /);
  assert.doesNotMatch(PAGES["quebec/saint-guy.html"], /Población oficial actual/, "sin cifra actual de un municipio que ya no existe");
});

test("lugares designados y nombres geográficos: sin duplicados, siempre dentro de una subdivisión y sin población inventada", () => {
  assert.equal(lugares.length, 5443);
  const claves = lugares.map((c) => `${c.n.toLowerCase()}|${c.m}`);
  assert.equal(new Set(claves).size, claves.length);
  for (const c of lugares) {
    const padre = L.porCodigo.get(c.m);
    assert.ok(padre, `${c.n}: subdivisión ${c.m}`);
    assert.notEqual(c.n.toLowerCase(), padre.censoNombre.toLowerCase());
    if (String(c.id).startsWith("cgn-")) assert.equal(c.p, null, `${c.n}: sin población inventada`);
    else assert.equal(typeof c.p, "number", `${c.n}: población del censo`);
  }
  assert.equal(lugares.filter((c) => !String(c.id).startsWith("cgn-")).length, 52, "120 lugares designados; los demás coinciden con su subdivisión");
  assert.equal(lugar("Le Plateau-Mont-Royal").t, "arrondissement");
  assert.equal(L.porCodigo.get(lugar("Le Plateau-Mont-Royal").m).s, "montreal");
  assert.equal(L.porCodigo.get(lugar("Chicoutimi").m).s, "saguenay");
  assert.equal(lugar("Hull").t, "sector");
  /* Estaciones de metro, de tren y del REM, pistas de esquí y parques industriales no son localidades */
  assert.ok(!lugares.some((c) => /Station|Ski|Industrial/.test(c.t)));
  assert.ok(!lugar("Berri-UQAM"), "estación de metro excluida");
});

test("una página por subdivisión, URL única, homónimos resueltos, una imagen social por página", () => {
  assert.equal(paginas.length, 1282);
  assert.equal(new Set(csd.map((r) => r.s)).size, 1282);
  assert.equal(porSlug("waswanipi").t, "village-cri");
  assert.equal(porSlug("waswanipi-terre-reservee-crie").t, "terre-crie");
  assert.equal(porSlug("kuujjuaq").t, "village-nordique");
  assert.equal(porSlug("clermont").t, "ville");
  assert.equal(porSlug("clermont-canton").t, "canton");
  /* Mismo nombre y mismo tipo en MRC distintas: se distinguen por la MRC */
  const d = datos();
  const nombres = d.localidades.filter((f) => f[7]).map((f) => f[0]);
  assert.ok(nombres.includes("Saint-Elzéar (municipio, Bonaventure)") && nombres.includes("Saint-Elzéar (municipio, La Nouvelle-Beauce)"));
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/quebec")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("quebec/", "")).sort());
  assert.deepEqual(readdirSync(join(ROOT, "assets/canada-en-datos/quebec")).sort(), enDisco.map((f) => f.replace(".html", ".jpg")).sort());
});

test("28 fichas completas (las 20 pedidas y 8 regionales) indexables y en el sitemap; las básicas con noindex", () => {
  const sitemap = read("sitemap.xml");
  const pedidas = ["montreal", "quebec", "laval", "gatineau", "longueuil", "sherbrooke", "saguenay", "levis", "trois-rivieres", "terrebonne", "saint-jean-sur-richelieu", "repentigny", "brossard", "drummondville", "saint-jerome", "granby", "rimouski", "victoriaville", "rouyn-noranda", "val-d-or"];
  for (const s of pedidas) assert.ok(FICHAS[s], s);
  assert.deepEqual(Object.keys(FICHAS).filter((s) => !pedidas.includes(s)).sort(), ["alma", "chibougamau", "gaspe", "joliette", "riviere-du-loup", "saint-hyacinthe", "sept-iles", "shawinigan"]);
  /* Las 17 regiones administrativas tienen al menos una ficha */
  assert.equal(new Set(Object.keys(FICHAS).map((s) => porSlug(s).r)).size, 17);
  for (const [k, html] of paginas) {
    const s = k.replace("quebec/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/quebec/${s}`;
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `${s}: canonical`);
    assert.ok(html.includes(`<meta property="og:image" content="https://podcastdelmigrante.com/assets/canada-en-datos/quebec/${s}.jpg">`), `${s}: imagen`);
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
  assert.ok(sitemap.includes("<loc>https://podcastdelmigrante.com/canada-en-datos/quebec</loc>"));
});

test("sin datos vacíos ni inventados; fichas con alquiler de CMHC, hospital, organismos de integración y servicios", () => {
  for (const [k, html] of paginas) {
    assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object |&amp;amp;/, k);
    assert.match(html, /<dt>Hora legal<\/dt>/, k);
    assert.match(html, /se publican por región económica, no por localidad|Dato no disponible/, k);
    assert.match(html, /811/, `${k}: Info-Santé`);
  }
  for (const [s, alquiler, hospital] of [
    ["montreal", "$1,346 al mes", "Hôpital général juif"],
    ["quebec", "$1,277 al mes", "Hôpital de l&#39;Enfant-Jésus|Hôpital de l'Enfant-Jésus"],
    ["gatineau", "$1,460 al mes", "Hôpital de Hull"],
    ["sherbrooke", "$1,062 al mes", "Hôtel-Dieu de Sherbrooke"],
    ["saguenay", "$985 al mes", "Hôpital de Chicoutimi"],
    ["trois-rivieres", "$1,016 al mes", "Trois-Rivières"],
    ["val-d-or", "$1,071 al mes", "Hôpital de Val-d&#39;Or|Hôpital de Val-d'Or"],
    ["gaspe", "$919 al mes", "Hôtel-Dieu de Gaspé"],
  ]) {
    const h = PAGES[`quebec/${s}.html`];
    for (const t of [alquiler, 'id="recien-llegados"', "data-reloj-localidad", "Accompagnement Québec", "https://www.quebec.ca/en/immigration/partners"]) assert.ok(h.includes(t), `${s}: ${t}`);
    assert.match(h, new RegExp(hospital), `${s}: hospital`);
  }
  /* Sin encuesta de CMHC: «Dato no disponible», nunca el promedio provincial */
  for (const s of ["saint-jean-sur-richelieu", "chibougamau"]) {
    const h = PAGES[`quebec/${s}.html`];
    assert.match(h, /Dato no disponible<\/span>: esta página no muestra alquileres de CMHC/, s);
    assert.match(h, /no indica, en octubre de 2026, organismos asociados con oficina en/, s);
  }
  /* Básicas: sin reloj en vivo ni alquileres de otra localidad */
  const b = PAGES["quebec/saint-elzear.html"];
  assert.doesNotMatch(b, /data-reloj-localidad|Encuesta de alquileres de CMHC, octubre de 2025, para/);
  assert.match(PAGES["quebec/kahnawake.html"], /No es un municipio/);
  /* Escuelas con los acentos corregidos (la base ODEF trae «?»); el nombre irrecuperable no se muestra */
  const todo = paginas.map(([, h]) => h).join("");
  assert.doesNotMatch(todo, /S\?vigny|Ch\?teauguay|\?table|\?cole/);
});

test("hora legal: Loi sur le temps légal (este de 63° O, Minganie, Îles-de-la-Madeleine y Listuguj) y el anuncio del 28-10-2026", () => {
  const z = (s) => zona(porSlug(s)).timeZone;
  assert.equal(z("montreal"), "America/Toronto");
  assert.equal(z("natashquan"), "America/Toronto", "MRC de Minganie, aunque esté al este de 63° O");
  assert.equal(z("aguanish"), "America/Toronto");
  for (const s of ["blanc-sablon", "bonne-esperance", "saint-augustin", "gros-mecatina", "cote-nord-du-golfe-du-saint-laurent", "petit-mecatina"]) assert.equal(z(s), "America/Blanc-Sablon", s);
  for (const s of ["les-iles-de-la-madeleine", "grosse-ile", "listuguj"]) assert.equal(z(s), "America/Halifax", s);
  assert.equal(csd.filter((r) => zona(r).timeZone === "America/Toronto").length, 1270);
  const h = (tz, iso) => Number(new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date(iso)));
  /* 18:00 UTC: antes y después del 1-11-2026 */
  assert.equal(h("America/Toronto", "2026-10-30T18:00:00Z"), 14);
  assert.equal(h("America/Toronto", "2026-11-02T18:00:00Z"), 13, "el 1 de noviembre de 2026 los relojes se atrasan");
  assert.equal(h("America/Blanc-Sablon", "2026-10-30T18:00:00Z"), 14);
  assert.equal(h("America/Blanc-Sablon", "2027-01-15T18:00:00Z"), 14, "sin cambio de hora");
  assert.equal(h("America/Halifax", "2027-01-15T18:00:00Z"), 14);
  assert.equal(h("America/Halifax", "2027-07-01T18:00:00Z"), 15);
  assert.match(PAGES["quebec/montreal.html"], /data-reloj-localidad data-zona="America\/Toronto"/);
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read("js/canada-datos.js") + ";globalThis.R=CD_REGIONS;", ctx);
  const qc = ctx.R.find((r) => r.code === "QC");
  assert.equal(qc.profile, "quebec");
  assert.deepEqual(Array.from(qc.zones, (x) => x.timeZone), ["America/Halifax", "America/Blanc-Sablon"]);
  const guia = PAGES["quebec.html"];
  assert.match(guia, /28 de octubre de 2026/);
  assert.match(guia, /el 1 de noviembre de 2026 a las 2:00 los relojes se atrasan una hora/);
});

test("la guía provincial: secciones, cifras verificadas, inmigración y francés sin promesas", () => {
  const html = PAGES["quebec.html"];
  for (const id of ["poblacion", "geografia", "frances", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Quebec<\/h2>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-quebec\.jpg">/);
  assert.match(html, /Total: 6,725 localidades/);
  for (const re of [/9,067,114/, /8,501,833/, /\$16\.60/, /\$13\.30/, /6\.0%/, /\$35\.05/, /\$1,346/, /\$1,277/, /9\.975/, /\$9\.65/, /1,122 municipios locales/, /PSTQ/, /Arrima/, /Certificat de sélection du Québec \(CSQ\)/, /Certificat d&#39;acceptation du Québec \(CAQ\)|Certificat d'acceptation du Québec \(CAQ\)/, /ministère de l&#39;Immigration et de l&#39;Intégration \(MII\)|ministère de l'Immigration et de l'Intégration \(MII\)/, /Registre québécois des consultants en immigration/, /Francisation Québec/, /40 horas/, /24 de septiembre de 2026/, /31 de octubre de 2026/]) assert.match(html, re, String(re));
  assert.match(html, /Un CSQ no es la residencia permanente/);
  assert.match(html, /No hay garantía de atención en español/);
  assert.doesNotMatch(html, /garantizad[oa]s? (un )?empleo|empleo asegurado|garantiza(mos)? (la|tu) (selección|residencia|invitación)|eres elegible|calificas para/i);
  /* Solo los buscadores del sitio y del directorio: ningún formulario de evaluación ni recomendaciones personalizadas */
  for (const f of html.match(/<form[^>]*>/g) || []) assert.match(f, /role="search"/, f);
  assert.doesNotMatch(html, /evaluador de elegibilidad|calculadora de puntos|<input[^>]+type="(number|radio|checkbox)"/i);
  for (const k of Object.keys(FICHAS)) assert.ok(html.includes(`href="/canada-en-datos/quebec/${k}"`), k);
  assert.match(html, /<body data-cd-region="quebec">/);
  const css = read("css/canada-datos.css");
  assert.doesNotMatch(css, /quebec|data-cd-region=|data-cd-provincia=/i, "ninguna regla de estilo propia de una provincia");
  const hojas = (h) => [...h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hojas(html), hojas(PAGES["alberta.html"]), "mismas hojas de estilo que Alberta");
});

test("datos del navegador: directorio extendido, MRC como filtro y las demás provincias sin cambios", () => {
  const d = datos();
  assert.equal(d.provincia.slug, "quebec");
  assert.equal(d.provincia.extendido, true);
  assert.equal(d.localidades.length, 6725);
  assert.equal(d.localidades.filter((f) => f[7]).length, 1282);
  assert.equal(d.localidades.filter((f) => f[8] === 1).length, 28);
  assert.equal(new Set(d.localidades.map((f) => f[9])).size, 98);
  const nombres = d.localidades.filter((f) => f[7]).map((f) => f[0]);
  assert.equal(new Set(nombres).size, nombres.length, "nombres únicos entre las páginas");
  for (const [arch, n] of [["saskatchewan", 3205], ["british-columbia", 2378], ["prince-edward-island", 727], ["manitoba", 2062]]) {
    const c = {};
    new Function("window", read(`js/${arch}-localidades.js`))(c);
    assert.equal(c.CD_LOCALIDADES.localidades.length, n, `${arch} sin cambios`);
  }
});

test("cada lugar sin página propia tiene un ancla única y existente en la página de su subdivisión", () => {
  const d = datos();
  const sinPagina = d.localidades.filter((f) => f[5] !== -1);
  assert.equal(sinPagina.length, 5443);
  const vistas = new Set();
  for (const f of sinPagina) {
    const sub = d.localidades[f[5]];
    assert.ok(sub[7]);
    assert.match(f[11], /^lugar-[a-z0-9-]+$/, f[0]);
    const clave = `${sub[7]}#${f[11]}`;
    assert.ok(!vistas.has(clave), `ancla repetida: ${clave}`);
    vistas.add(clave);
    const html = PAGES[`quebec/${sub[7]}.html`];
    const i = html.indexOf(`id="${f[11]}"`);
    assert.ok(i > 0 && html.indexOf(`id="${f[11]}"`, i + 1) === -1, `${clave}: el ancla está una sola vez`);
  }
});

test("portada de Canadá en Datos: Quebec marcada como ficha disponible, sin tocar las demás regiones", () => {
  const idx = read("canada-en-datos/index.html");
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="QC"/);
  for (const code of ["AB", "ON", "BC", "PE", "SK", "MB"]) assert.match(idx, new RegExp(`class="cd-region cd-region--ficha" data-code="${code}"`), code);
  for (const code of ["NS", "NB", "NL", "YT", "NT", "NU"]) assert.match(idx, new RegExp(`class="cd-region" data-code="${code}"`), code);
});
