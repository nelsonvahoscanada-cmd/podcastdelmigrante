/*
  Canadá en Datos — Yukón: ficha territorial, directorio de comunidades, hora
  (UTC−7 todo el año desde 2020, zona America/Whitehorse), escuelas oficiales,
  bandera, SEO y fuentes. Sin cifras sin fuente.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import Yukon, { FICHAS, REGIONES } from "../scripts/canada-en-datos/provincias/yukon.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/canada-datos.js") + ";globalThis.D={CD_REGIONS,CD_PROFILES,CD_META};", ctx);
const D = JSON.parse(JSON.stringify(ctx.D));
const P = D.CD_PROFILES.yukon;
const R = D.CD_REGIONS.find((r) => r.code === "YT");
const L = Yukon.cargar(ROOT);
const ficha = read("canada-en-datos/yukon.html");
const texto = (h) => h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const pagina = (s) => read(`canada-en-datos/yukon/${s}.html`);

test("región: ficha, capital Whitehorse y zona IANA America/Whitehorse (una sola zona)", () => {
  assert.equal(R.profile, "yukon");
  assert.equal(R.slug, "yukon");
  assert.equal(R.type, "territorio");
  assert.equal(R.capital, "Whitehorse");
  assert.equal(R.timeZone, "America/Whitehorse");
  assert.equal(R.multiZone, false);
  assert.equal(R.zones, undefined);
});

test("hora: UTC−7 todo el año (America/Whitehorse), en invierno y en verano; sin zonas de otras provincias", () => {
  const desfase = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Whitehorse", timeZoneName: "longOffset" }).format(new Date(iso)).split("GMT")[1];
  for (const iso of ["2021-01-15T12:00:00Z", "2026-07-15T12:00:00Z", "2026-11-15T12:00:00Z", "2027-01-15T12:00:00Z", "2027-03-20T12:00:00Z"]) assert.equal(desfase(iso), "-07:00", iso);
  const t = texto(ficha);
  assert.ok(t.includes("desde el 1 de noviembre de 2020, la hora normal del territorio es UTC−7 todo el año, sin cambio de hora"));
  assert.match(ficha, /github\.com\/eggert\/tz\/blob\/main\/northamerica/);
  /* Las comunidades habitadas usan America/Whitehorse; ninguna página usa zonas de otras provincias ni de ramas pendientes */
  for (const s of ["whitehorse", "dawson-city", "watson-lake", "haines-junction", "old-crow"]) {
    assert.match(pagina(s), /data-reloj-localidad data-zona="America\/Whitehorse"/, s);
  }
  for (const f of readdirSync(join(ROOT, "canada-en-datos/yukon"))) {
    assert.doesNotMatch(read(`canada-en-datos/yukon/${f}`), /data-zona="America\/(Regina|Edmonton|Vancouver|Yellowknife|Dawson|Phoenix)"/, f);
  }
});

test("indicadores: cada cifra con fuente oficial, período, consulta y revisión; ninguna pendiente", () => {
  const esperados = { population: 50356, censusPopulation: 40232, medianAge: 38.0, indigenous: 22.3, immigrants: 13.6, newImmigrants: 759, landArea: 472345.4, gdp: 4666, unemploymentRate: 5.3, unemploymentAnnual: 4.2, averageWeeklyEarnings: 1538.93, minimumWage: 18.51, cpiWhitehorse: 6.1 };
  assert.deepEqual(Object.keys(P.indicators).sort(), Object.keys(esperados).sort());
  for (const [k, v] of Object.entries(esperados)) assert.equal(P.indicators[k].value, v, k);
  for (const [k, ind] of Object.entries(P.indicators)) {
    assert.ok(ind.value != null, k);
    assert.ok(ind.source && ind.source.org && /^https:\/\//.test(ind.source.url), k);
    assert.ok(ind.refPeriod && ind.retrievedAt === "2026-11-11" && ind.reviewedAt && ind.unit, k);
  }
  assert.match(P.indicators.unemploymentRate.note, /promedio móvil de tres meses/);
  assert.match(P.indicators.minimumWage.refPeriod, /1 de abril de 2026/);
  assert.match(P.indicators.minimumWage.note, /\$17\.94/);
  assert.match(P.indicators.cpiWhitehorse.note, /164\.4 a 174\.4/);
});

test("secciones A–J: información general, población, economía, vivienda, inmigración, educación, salud, costo de vida, clima y vida diaria", () => {
  const ids = P.sections.map((x) => x.id);
  for (const id of ["poblacion", "idiomas", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "transporte", "beneficios", "integracion", "seguridad", "vida", "ciudades"]) assert.ok(ids.includes(id), id);
  for (const s of P.sections) assert.ok(s.links.length >= 2 && s.links.every((l) => /^(https:\/\/|\/canada-en-datos\/)/.test(l.href)), s.id);
  const t = texto(ficha);
  for (const frase of [
    "Su capital, Whitehorse, concentra cerca de siete de cada diez habitantes",
    "Yukon Nominee Program, YNP",
    "La residencia permanente la otorga siempre el Gobierno de Canadá (IRCC)",
    "IRCC asignó al YNP un máximo de 282 nominaciones para 2026",
    "ambos ya cerraron",
    "Los empleadores no pueden cobrarte por nominarte",
    "patrimonio neto de al menos $500,000",
    "Alquiler en Whitehorse: Dato no disponible",
    "en las demás comunidades es de $110,000",
    "la cobertura no es automática: hay que inscribirse en persona",
    "Los nuevos residentes esperan 3 meses",
    "quienes tienen permiso de estudios o visa de turista, no",
    "la temperatura media de enero es de −15.0 °C",
    "cierre de la mina Eagle Gold en 2024",
    "no significan que haya vacantes para tu ocupación",
    "No se pueden enviar mensajes de texto, correos ni videollamadas al 9-1-1",
    "867-668-9911",
    "las licencias de México y de los países de América Latina no están en esa lista",
    "$80.50 al mes por hijo",
    "Yukon University",
  ]) assert.ok(t.includes(frase), frase);
  assert.doesNotMatch(t, /garantiza(mos)? (tu |la )?(residencia|empleo|nominación)/i);
  assert.doesNotMatch(t, /escasez de (médicos|enfermeras|trabajadores) en (Whitehorse|Yukón)/i, "sin afirmaciones de escasez sin fuente");
  assert.doesNotMatch(t, /\$10 al día/, "sin la tarifa de guarderías, no verificada");
});

test("inmigración: distingue lo federal de lo territorial y advierte contra estafas", () => {
  const s = P.sections.find((x) => x.id === "inmigracion");
  assert.match(s.explainer.title, /federal y qué es territorial/);
  assert.match(s.explainer.warning, /Nadie puede garantizarte una nominación/);
  assert.ok(s.links.some((l) => l.href === "https://yukon.ca/en/yukon-nominee-program"));
  assert.equal(P.scams.length, 3);
});

test("bandera oficial: SVG de dominio público, sin código, con texto alternativo y crédito enlazado", () => {
  const svg = read("assets/canada-en-datos/bandera-yukon.svg");
  assert.match(svg, /^<svg /);
  assert.doesNotMatch(svg, /<script|onload=|javascript:/i);
  assert.match(ficha, /<img class="cd-flag" src="\/assets\/canada-en-datos\/bandera-yukon\.svg" alt="Bandera de Yukón: [^"]+" width="64" height="36">Yukón<\/h1>/);
  assert.match(ficha, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Flag_of_Yukon\.svg"/);
});

test("directorio: 35 subdivisiones censales con página, una región y nombres sin repetir", () => {
  const conPagina = L.items.filter((r) => r.s);
  assert.equal(conPagina.length, 35);
  assert.deepEqual(Object.keys(REGIONES), ["6001"]);
  assert.equal(conPagina.filter((r) => r.t === "no-organizado").length, 5);
  assert.deepEqual(readdirSync(join(ROOT, "canada-en-datos/yukon")).sort(), conPagina.map((r) => `${r.s}.html`).sort());
  const dc = L.items.find((r) => r.s === "dawson-city");
  assert.equal(dc.n, "Dawson City");
  assert.equal(dc.censoNombre, "Dawson");
  assert.equal(dc.p, 1577);
  assert.equal(L.items.find((r) => r.s === "whitehorse").p, 28201);
  /* Nombres repetidos en el censo, con URL distinta */
  assert.ok(L.items.some((r) => r.s === "carcross") && L.items.some((r) => r.s === "carcross-4"));
  assert.ok(L.items.some((r) => r.s === "teslin") && L.items.some((r) => r.s === "teslin-tierras-de-teslin"));
  assert.equal(L.hospitales.length, 3);
  assert.ok(L.items.some((r) => r.n === "Riverdale" && r.m === "6001009"), "Riverdale, dentro de Whitehorse");
  assert.match(ficha, /<h2 id="localidades-titulo">Explora las comunidades de Yukón<\/h2>/);
  assert.match(ficha, /<a href="#localidades">Comunidades<\/a>/);
});

test("buscador: los datos del directorio incluyen los nombres alternativos (Dawson, Mount Lorne)", () => {
  const js = read("js/yukon-localidades.js");
  assert.match(js, /Dawson City/);
  assert.match(js, /"Dawson\|City of Dawson"/);
  assert.match(js, /Mount Lorne/);
});

test("clima, vivienda y salud por comunidad, con fuente y período; «Dato no disponible» donde no hay cifra", () => {
  const wh = texto(pagina("whitehorse"));
  assert.ok(wh.includes("Temperatura media de enero −15.0 °C"));
  assert.ok(wh.includes("Normales climáticas 1991-2020, estación Whitehorse"));
  assert.match(wh, /Alquiler promedio de CMHC en Whitehorse: Dato no disponible/);
  assert.ok(wh.includes("Índice de precios al consumidor de Whitehorse +6.1%"));
  assert.ok(wh.includes("Whitehorse General Hospital (hospital)"));
  assert.ok(wh.includes("en Whitehorse va de $59,000 al año (estudio) a $102,500"));
  const oc = texto(pagina("old-crow"));
  assert.ok(oc.includes("Temperatura media de enero −28.7 °C"));
  assert.match(oc, /Dato no disponible ?: no hay una serie oficial de alquileres para Old Crow/);
  assert.ok(oc.includes("en las comunidades fuera de Whitehorse es de $110,000 al año"));
  /* Sin estación ni hospital: no se inventa; se da el más cercano con la distancia */
  const tg = texto(pagina("tagish"));
  assert.doesNotMatch(tg, /Normales climáticas 1991-2020, estación/);
  assert.match(tg, /el hospital más cercano, Whitehorse General Hospital , a unos \d+ km/);
  /* Sin población: no hay reloj ni emergencias */
  assert.doesNotMatch(pagina("kloo-lake"), /data-reloj-localidad/);
});

test("escuelas: lista oficial del Gobierno de Yukón por comunidad, con su sistema escolar", () => {
  assert.equal(L.escuelas.length, 31);
  assert.equal(L.escuelas.filter((e) => e.csd === "6001009").length, 16);
  assert.ok(L.escuelas.some((e) => e.nombre === "J.V. Clark School" && e.csd === "6001022"), "J.V. Clark en Mayo");
  assert.ok(L.escuelas.some((e) => e.nombre === "École Émilie-Tremblay" && /francophone/.test(e.sistema)));
  const dc = texto(pagina("dawson-city"));
  assert.ok(dc.includes("Robert Service School"));
  assert.ok(dc.includes("Programme en français de Dawson"));
  /* Comunidad sin escuela: se indica la más cercana */
  assert.match(texto(pagina("tagish")), /La escuela más cercana está en /);
});

test("fichas completas indexables (Whitehorse, Dawson City, Watson Lake, Haines Junction); las básicas con noindex; sitemap", () => {
  assert.deepEqual(Object.keys(FICHAS), ["whitehorse", "dawson-city", "watson-lake", "haines-junction"]);
  for (const s of Object.keys(FICHAS)) assert.doesNotMatch(pagina(s), /name="robots" content="noindex"/, s);
  assert.match(pagina("carmacks"), /name="robots" content="noindex"/);
  const sm = read("sitemap.xml");
  for (const u of ["canada-en-datos/yukon", "canada-en-datos/yukon/whitehorse", "canada-en-datos/yukon/dawson-city", "canada-en-datos/yukon/watson-lake", "canada-en-datos/yukon/haines-junction"]) assert.match(sm, new RegExp(`<loc>https://podcastdelmigrante\\.com/${u}</loc>`), u);
  assert.doesNotMatch(sm, /canada-en-datos\/yukon\/carmacks/);
});

test("SEO y redes: título, descripción, canónica, imagen social 1200×630 y JSON-LD", () => {
  assert.match(ficha, /<title>Yukón en datos: guía para inmigrantes — El Podcast del Migrante<\/title>/);
  assert.match(ficha, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/yukon">/);
  assert.match(ficha, /property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-yukon\.jpg"/);
  assert.match(ficha, /name="twitter:card" content="summary_large_image"/);
  const jpg = readFileSync(join(ROOT, "assets/canada-en-datos/social-yukon.jpg"));
  assert.equal(jpg[0], 0xff);
  for (const s of Object.keys(FICHAS)) {
    assert.ok(existsSync(join(ROOT, `assets/canada-en-datos/yukon/${s}.jpg`)), s);
    assert.match(pagina(s), new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/canada-en-datos/yukon/${s}\\.jpg"`), s);
  }
  const ld = JSON.parse(ficha.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.about.name, "Yukón");
  assert.ok(P.seo.description.length <= 200);
});

test("portada de Canadá en Datos y «Descubre tu Canadá»: Yukón disponible; las regiones sin ficha siguen sin enlace", () => {
  const idx = read("canada-en-datos/index.html");
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="YT"/);
  for (const code of ["NT", "NU", "AB", "BC"]) assert.match(idx, new RegExp(`class="cd-region cd-region--ficha" data-code="${code}"`), code);
  for (const code of ["NS", "NB", "NL"]) assert.match(idx, new RegExp(`class="cd-region" data-code="${code}"`), code);
  assert.match(read("js/canada-datos-disponibles.js"), /yukon/);
  for (const r of D.CD_REGIONS.filter((x) => !x.profile)) assert.ok(!existsSync(join(ROOT, `canada-en-datos/${r.slug}.html`)), r.code);
});

test("los demás territorios no cambian: NWT sigue con America/Yellowknife y Alberta con America/Edmonton", () => {
  assert.equal(D.CD_REGIONS.find((r) => r.code === "NT").timeZone, "America/Yellowknife");
  assert.equal(D.CD_REGIONS.find((r) => r.code === "AB").timeZone, "America/Edmonton");
  assert.equal(D.CD_PROFILES["northwest-territories"].lastReview, "2026-11-10");
});
