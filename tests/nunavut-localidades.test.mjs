/*
  Canadá en Datos — Nunavut: ficha territorial, directorio de comunidades,
  zonas horarias por comunidad, bandera, SEO y fuentes. Sin cifras sin fuente.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import Nunavut, { ZONAS, FICHAS } from "../scripts/canada-en-datos/provincias/nunavut.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/canada-datos.js") + ";globalThis.D={CD_REGIONS,CD_PROFILES,CD_META};", ctx);
const D = JSON.parse(JSON.stringify(ctx.D));
const P = D.CD_PROFILES.nunavut;
const R = D.CD_REGIONS.find((r) => r.code === "NU");
const L = Nunavut.cargar(ROOT);
const ficha = read("canada-en-datos/nunavut.html");
const texto = (h) => h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ");

test("región: Nunavut tiene ficha, capital Iqaluit y tres zonas horarias además de la de la capital", () => {
  assert.equal(R.profile, "nunavut");
  assert.equal(R.type, "territorio");
  assert.equal(R.capital, "Iqaluit");
  assert.equal(R.timeZone, "America/Iqaluit");
  assert.equal(R.multiZone, true);
  assert.deepEqual(R.zones.map((z) => z.timeZone), ["America/Rankin_Inlet", "America/Cambridge_Bay", "America/Atikokan"]);
  for (const z of R.zones) assert.doesNotThrow(() => new Intl.DateTimeFormat("es", { timeZone: z.timeZone }));
});

test("indicadores: cada cifra con fuente oficial, período, consulta y revisión; ninguna pendiente", () => {
  const esperados = { population: 43091, censusPopulation: 36858, medianAge: 27.6, inuit: 84.3, inuktut: 70.0, gdp: 5668, unemploymentRate: 11.0, unemploymentAnnual: 10.3, minimumWage: 20.17 };
  for (const [k, v] of Object.entries(esperados)) assert.equal(P.indicators[k].value, v, k);
  for (const [k, ind] of Object.entries(P.indicators)) {
    assert.ok(ind.value != null, k);
    assert.ok(ind.source && ind.source.org && /^https:\/\//.test(ind.source.url), k);
    assert.ok(ind.refPeriod && ind.retrievedAt === "2026-11-04" && ind.reviewedAt, k);
  }
  assert.match(P.indicators.unemploymentRate.note, /promedio móvil de tres meses/);
  assert.match(P.indicators.minimumWage.refPeriod, /1 de septiembre de 2026/);
});

test("contenido para migrantes: sin PNP, Express Entry, vivienda sin cifras inventadas, transporte sin carreteras", () => {
  const t = texto(ficha);
  for (const frase of [
    "Quebec y Nunavut son las únicas jurisdicciones sin programa propio",
    "No existe ninguna carretera que conecte Nunavut con el resto de Canadá",
    "CMHC no publica alquileres de Nunavut",
    "Nunavut 3000",
    "Nutrition North Canada",
    "inuktut (que incluye el inuktitut y el inuinnaqtun), el inglés y el francés",
    "formulario de nueva cobertura (A-508)",
    "Qikiqtani General Hospital",
    "Nunavut Arctic College",
    "isla Southampton (Coral Harbour) usa la hora del Este todo el año",
    "La API de normales de Environment Canada no publica las de Iqaluit",
  ]) assert.ok(t.includes(frase), frase);
  assert.doesNotMatch(t, /programa de nominados de Nunavut (abierto|vigente)|garantiza(mos)? (tu |la )?(residencia|empleo)/i);
  assert.doesNotMatch(t, /alquiler promedio[^.]*\$\d/i, "sin alquiler promedio inventado");
});

test("bandera oficial: SVG de dominio público, con texto alternativo y crédito enlazado", () => {
  assert.ok(existsSync(join(ROOT, "assets/canada-en-datos/bandera-nunavut.svg")));
  assert.match(read("assets/canada-en-datos/bandera-nunavut.svg"), /<title>Flag of Nunavut<\/title>/);
  assert.match(ficha, /<img class="cd-flag" src="\/assets\/canada-en-datos\/bandera-nunavut\.svg" alt="Bandera de Nunavut: [^"]+" width="64" height="36">Nunavut<\/h1>/);
  assert.match(ficha, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Flag_of_Nunavut\.svg"[^>]*>Bandera de Nunavut\. Archivo de Wikimedia Commons, de dominio público\.<\/a>/);
  /* Las demás fichas no muestran bandera */
  for (const p of ["alberta", "quebec"]) assert.doesNotMatch(read(`canada-en-datos/${p}.html`), /cd-flag/);
});

test("directorio: 31 subdivisiones censales con página, 25 comunidades con gobierno municipal y nombres vigentes", () => {
  const conPagina = L.items.filter((r) => r.s);
  assert.equal(conPagina.length, 31);
  assert.equal(conPagina.filter((r) => ["city", "hamlet"].includes(r.t)).length, 25);
  assert.deepEqual(readdirSync(join(ROOT, "canada-en-datos/nunavut")).sort(), conPagina.map((r) => `${r.s}.html`).sort());
  const k = L.items.find((r) => r.s === "kinngait");
  assert.equal(k.censoNombre, "Cape Dorset");
  assert.equal(L.items.find((r) => r.s === "sanirajak").censoNombre, "Hall Beach");
  assert.equal(L.items.find((r) => r.s === "iqaluit").p, 7429);
  assert.equal(L.hospitales.length, 3);
  assert.match(ficha, /<h2 id="localidades-titulo">Explora las comunidades de Nunavut<\/h2>/);
  assert.match(ficha, /<a href="#localidades">Comunidades<\/a>/);
});

test("hora por comunidad: reloj solo donde la IANA identifica la zona; las demás piden confirmar la hora", () => {
  assert.deepEqual(Object.keys(ZONAS).sort(), ["6204003", "6204022", "6205014", "6205017", "6208073"]);
  const reloj = (s) => read(`canada-en-datos/nunavut/${s}.html`).match(/data-reloj-localidad data-zona="([^"]+)"/);
  assert.equal(reloj("iqaluit")[1], "America/Iqaluit");
  assert.equal(reloj("rankin-inlet")[1], "America/Rankin_Inlet");
  assert.equal(reloj("resolute")[1], "America/Resolute");
  assert.equal(reloj("cambridge-bay")[1], "America/Cambridge_Bay");
  assert.equal(reloj("coral-harbour")[1], "America/Atikokan");
  for (const s of ["pangnirtung", "arviat", "kugluktuk", "taloyoak"]) {
    const h = read(`canada-en-datos/nunavut/${s}.html`);
    assert.equal(reloj(s), null, s);
    assert.match(texto(h), /no identifica la zona de esta comunidad\. Nunavut tiene tres zonas horarias/, s);
  }
});

test("fichas completas indexables (Iqaluit, Rankin Inlet, Cambridge Bay); las básicas con noindex; sitemap", () => {
  assert.deepEqual(Object.keys(FICHAS), ["iqaluit", "rankin-inlet", "cambridge-bay"]);
  for (const s of Object.keys(FICHAS)) assert.doesNotMatch(read(`canada-en-datos/nunavut/${s}.html`), /name="robots" content="noindex"/, s);
  assert.match(read("canada-en-datos/nunavut/arviat.html"), /name="robots" content="noindex"/);
  const sm = read("sitemap.xml");
  for (const u of ["canada-en-datos/nunavut", "canada-en-datos/nunavut/iqaluit", "canada-en-datos/nunavut/rankin-inlet", "canada-en-datos/nunavut/cambridge-bay"]) assert.match(sm, new RegExp(`<loc>https://podcastdelmigrante\\.com/${u}</loc>`), u);
  assert.doesNotMatch(sm, /canada-en-datos\/nunavut\/arviat/);
});

test("SEO y redes: título, descripción, canónica, imagen social 1200×630 y JSON-LD", () => {
  assert.match(ficha, /<title>Nunavut en datos: guía para inmigrantes y recién llegados — El Podcast del Migrante<\/title>/);
  assert.match(ficha, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/nunavut">/);
  assert.match(ficha, /property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-nunavut\.jpg"/);
  assert.ok(existsSync(join(ROOT, "assets/canada-en-datos/social-nunavut.jpg")));
  assert.ok(existsSync(join(ROOT, "assets/canada-en-datos/nunavut/iqaluit.jpg")));
  const ld = JSON.parse(ficha.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.about.name, "Nunavut");
  assert.ok(P.seo.description.length <= 200);
});

test("portada de Canadá en Datos y módulo «Descubre tu Canadá»: Nunavut disponible sin tocar las demás regiones", () => {
  const idx = read("canada-en-datos/index.html");
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="NU"/);
  for (const code of ["NS", "NB", "NL", "YT", "NT"]) assert.match(idx, new RegExp(`class="cd-region" data-code="${code}"`), code);
  assert.match(read("js/canada-datos-disponibles.js"), /nunavut/);
});
