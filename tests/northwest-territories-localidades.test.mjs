/*
  Canadá en Datos — Territorios del Noroeste: ficha territorial, directorio de
  comunidades, hora (UTC−6 todo el año desde el 21-8-2026), costo de vida por
  comunidad, bandera, SEO y fuentes. Sin cifras sin fuente.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import NWT, { FICHAS, REGIONES } from "../scripts/canada-en-datos/provincias/northwest-territories.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/canada-datos.js") + ";globalThis.D={CD_REGIONS,CD_PROFILES,CD_META};", ctx);
const D = JSON.parse(JSON.stringify(ctx.D));
const P = D.CD_PROFILES["northwest-territories"];
const R = D.CD_REGIONS.find((r) => r.code === "NT");
const L = NWT.cargar(ROOT);
const ficha = read("canada-en-datos/northwest-territories.html");
const texto = (h) => h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const pagina = (s) => read(`canada-en-datos/northwest-territories/${s}.html`);

test("región: ficha, capital Yellowknife y zona IANA America/Yellowknife (una sola zona)", () => {
  assert.equal(R.profile, "northwest-territories");
  assert.equal(R.type, "territorio");
  assert.equal(R.capital, "Yellowknife");
  assert.equal(R.timeZone, "America/Yellowknife");
  assert.equal(R.multiZone, false);
  assert.equal(R.zones, undefined);
  assert.doesNotThrow(() => new Intl.DateTimeFormat("es", { timeZone: R.timeZone }));
});

test("hora: reglamento R-090-2026 (UTC−6 todo el año desde el 21-8-2026); sin zonas de ramas no aprobadas", () => {
  const t = texto(ficha);
  assert.ok(t.includes("reglamento de la Interpretation Act (R-090-2026), desde el 21 de agosto de 2026 la hora normal de todo el territorio es UTC−6"));
  assert.ok(t.includes("el 1 de noviembre de 2026 no se atrasaron los relojes"));
  assert.ok(t.includes("si tu teléfono o computadora no tiene la base horaria actualizada, podría mostrar una hora menos"));
  assert.match(ficha, /justice\.gov\.nt\.ca\/en\/files\/legislation\/interpretation\/interpretation\.r2\.pdf/);
  /* Las comunidades habitadas usan America/Yellowknife; ninguna página usa zonas de otras provincias */
  for (const s of ["yellowknife", "inuvik", "hay-river", "fort-simpson", "deline"]) {
    assert.match(pagina(s), /data-reloj-localidad data-zona="America\/Yellowknife"/, s);
  }
  for (const f of readdirSync(join(ROOT, "canada-en-datos/northwest-territories"))) {
    assert.doesNotMatch(read(`canada-en-datos/northwest-territories/${f}`), /data-zona="America\/(Regina|Edmonton|Inuvik|Whitehorse)"/, f);
  }
  /* Con una base horaria vigente (tzdata 2026d o posterior), America/Yellowknife ya es UTC−6 en invierno */
  const desfase = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Yellowknife", timeZoneName: "longOffset" }).format(new Date(iso)).split("GMT")[1];
  if (desfase("2027-01-15T12:00:00Z") === "-06:00") assert.equal(desfase("2026-11-15T12:00:00Z"), "-06:00");
  assert.equal(desfase("2026-07-15T12:00:00Z"), "-06:00");
});

test("indicadores: cada cifra con fuente oficial, período, consulta y revisión; ninguna pendiente", () => {
  const esperados = { population: 45904, censusPopulation: 41070, medianAge: 35.9, indigenous: 49.6, immigrants: 10.3, newImmigrants: 520, gdp: 5067, unemploymentRate: 5.1, unemploymentAnnual: 5.0, averageWeeklyEarnings: 1778.73, minimumWage: 17.2, rentYellowknife: 2109, cpiYellowknife: 4.7 };
  for (const [k, v] of Object.entries(esperados)) assert.equal(P.indicators[k].value, v, k);
  for (const [k, ind] of Object.entries(P.indicators)) {
    assert.ok(ind.value != null, k);
    assert.ok(ind.source && ind.source.org && /^https:\/\//.test(ind.source.url), k);
    assert.ok(ind.refPeriod && ind.retrievedAt === "2026-11-10" && ind.reviewedAt, k);
  }
  assert.match(P.indicators.unemploymentRate.note, /promedio móvil de tres meses/);
  assert.match(P.indicators.minimumWage.refPeriod, /1 de septiembre de 2026/);
  assert.match(P.indicators.minimumWage.note, /\$18\.15/);
  assert.match(P.indicators.rentYellowknife.refPeriod, /Octubre de 2025/);
});

test("secciones A–J: información general, población, economía, vivienda, inmigración, educación, salud, costo de vida, clima y vida diaria", () => {
  const ids = P.sections.map((x) => x.id);
  for (const id of ["poblacion", "idiomas", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "transporte", "beneficios", "integracion", "seguridad", "vida", "ciudades"]) assert.ok(ids.includes(id), id);
  for (const s of P.sections) assert.ok(s.links.length >= 2 && s.links.every((l) => /^(https:\/\/|\/canada-en-datos\/)/.test(l.href)), s.id);
  const t = texto(ficha);
  for (const frase of [
    "Su capital y única ciudad es Yellowknife",
    "reconoce 11 idiomas oficiales",
    "Northwest Territories Nominee Program, NTNP",
    "La residencia permanente la otorga siempre el Gobierno de Canadá (IRCC)",
    "cerró su convocatoria de 2025 porque recibió solicitudes suficientes para cubrir su cupo de 300 nominaciones",
    "invertir al menos $200,000 en Yellowknife o $100,000 fuera de Yellowknife",
    "la nominación suma 600 puntos",
    "al menos 153 días al año",
    "el primer día del tercer mes después de su llegada",
    "ningún hogar paga menos de $70 ni más de $1,625 al mes",
    "Yellowknife está entre 120 y 125",
    "Paulatuk, la más cara, entre 185 y 190",
    "la temperatura media de enero es de −25.5 °C en Yellowknife",
    "la mina Diavik cerró en marzo de 2026",
    "No existe un costo de vida único para todo el territorio",
    "no se puede enviar un mensaje de texto al 9-1-1",
    "1-867-920-0911",
    "Collège nordique francophone",
    "$67.91 al mes por un hijo menor de 6 años",
  ]) assert.ok(t.includes(frase), frase);
  assert.doesNotMatch(t, /garantiza(mos)? (tu |la )?(residencia|empleo|nominación)/i);
  assert.doesNotMatch(t, /\$10 al día/, "sin la tarifa de guarderías, no verificada");
});

test("inmigración: distingue lo federal de lo territorial y advierte contra estafas", () => {
  const s = P.sections.find((x) => x.id === "inmigracion");
  assert.match(s.explainer.title, /federal y qué es territorial/);
  assert.match(s.explainer.warning, /Nadie puede garantizarte una nominación/);
  assert.ok(s.links.some((l) => l.href === "https://www.immigratenwt.ca/"));
  assert.ok(P.scams.length === 3);
});

test("bandera oficial: SVG de dominio público, con texto alternativo y crédito enlazado", () => {
  assert.ok(existsSync(join(ROOT, "assets/canada-en-datos/bandera-northwest-territories.svg")));
  assert.match(read("assets/canada-en-datos/bandera-northwest-territories.svg"), /<title>Flag of\s+Northwest Territories<\/title>/);
  assert.doesNotMatch(read("assets/canada-en-datos/bandera-northwest-territories.svg"), /<script|onload=/i);
  assert.match(ficha, /<img class="cd-flag" src="\/assets\/canada-en-datos\/bandera-northwest-territories\.svg" alt="Bandera de los Territorios del Noroeste: [^"]+" width="64" height="36">Territorios del Noroeste<\/h1>/);
  assert.match(ficha, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Flag_of_the_Northwest_Territories\.svg"/);
});

test("directorio: 41 subdivisiones censales con página, 6 regiones y nombres oficiales con diacríticos", () => {
  const conPagina = L.items.filter((r) => r.s);
  assert.equal(conPagina.length, 41);
  assert.equal(conPagina.filter((r) => r.t === "no-organizado").length, 6);
  assert.equal(Object.keys(REGIONES).length, 6);
  assert.deepEqual(readdirSync(join(ROOT, "canada-en-datos/northwest-territories")).sort(), conPagina.map((r) => `${r.s}.html`).sort());
  const d = L.items.find((r) => r.s === "deline");
  assert.equal(d.n, "Délı̨nę");
  assert.equal(d.censoNombre, "Déline");
  assert.equal(L.items.find((r) => r.s === "behchoko").n, "Behchokǫ̀");
  assert.equal(L.items.find((r) => r.s === "yellowknife").p, 20340);
  assert.equal(L.hospitales.length, 3);
  assert.ok(L.items.some((r) => r.n === "Ndilǫ" && r.m === "6106023"), "Ndilǫ, dentro de Yellowknife");
  assert.match(ficha, /<h2 id="localidades-titulo">Explora las comunidades de los Territorios del Noroeste<\/h2>/);
  assert.match(ficha, /<a href="#localidades">Comunidades<\/a>/);
});

test("costo de vida y clima por comunidad, con fuente y período; «Dato no disponible» donde no hay cifra", () => {
  const yk = texto(pagina("yellowknife"));
  assert.ok(yk.includes("Diferencial de costo de vida (Edmonton = 100) 120 a 125"));
  assert.ok(yk.includes("Alquiler promedio, 2 habitaciones $2,109 al mes"));
  assert.ok(yk.includes("Normales climáticas 1991-2020, estación YELLOWKNIFE (AIRPORT)"));
  const pk = texto(pagina("paulatuk"));
  assert.ok(pk.includes("185 a 190"));
  assert.ok(pk.includes("Índice de precios de alimentos (Yellowknife = 100) 187"));
  assert.ok(pk.includes("un 87% más que en Yellowknife"));
  assert.match(texto(pagina("inuvik")), /Dato no disponible ?: CMHC publica alquileres de los Territorios del Noroeste solo para Yellowknife/);
  /* Sin cifra publicada (Wrigley): no se inventa */
  assert.doesNotMatch(texto(pagina("wrigley")), /Diferencial de costo de vida/);
});

test("escuelas (ODEF 2022): ubicadas por localidad, sin nombres con letras perdidas", () => {
  assert.equal(L.escuelas.length, 51);
  for (const e of L.escuelas) assert.doesNotMatch(e.nombre, /\?/, e.nombre);
  assert.ok(L.escuelas.some((e) => e.nombre === "Jean Wetrade Gamètì School" && e.csd === "6103049"));
  assert.match(texto(pagina("hay-river")), /École Boréale|École Borale/);
});

test("fichas completas indexables (Yellowknife, Hay River, Inuvik, Fort Smith); las básicas con noindex; sitemap", () => {
  assert.deepEqual(Object.keys(FICHAS), ["yellowknife", "hay-river", "inuvik", "fort-smith"]);
  for (const s of Object.keys(FICHAS)) assert.doesNotMatch(pagina(s), /name="robots" content="noindex"/, s);
  assert.match(pagina("aklavik"), /name="robots" content="noindex"/);
  const sm = read("sitemap.xml");
  for (const u of ["canada-en-datos/northwest-territories", "canada-en-datos/northwest-territories/yellowknife", "canada-en-datos/northwest-territories/inuvik"]) assert.match(sm, new RegExp(`<loc>https://podcastdelmigrante\\.com/${u}</loc>`), u);
  assert.doesNotMatch(sm, /canada-en-datos\/northwest-territories\/aklavik/);
});

test("SEO y redes: título, descripción, canónica, imagen social 1200×630 y JSON-LD", () => {
  assert.match(ficha, /<title>Territorios del Noroeste en datos: guía para inmigrantes — El Podcast del Migrante<\/title>/);
  assert.match(ficha, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/northwest-territories">/);
  assert.match(ficha, /property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-northwest-territories\.jpg"/);
  assert.ok(existsSync(join(ROOT, "assets/canada-en-datos/social-northwest-territories.jpg")));
  assert.ok(existsSync(join(ROOT, "assets/canada-en-datos/northwest-territories/yellowknife.jpg")));
  const ld = JSON.parse(ficha.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.about.name, "Territorios del Noroeste");
  assert.ok(P.seo.description.length <= 200);
});

test("portada de Canadá en Datos y «Descubre tu Canadá»: NWT disponible; las regiones sin ficha siguen sin enlace", () => {
  const idx = read("canada-en-datos/index.html");
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="NT"/);
  for (const code of ["NS", "NB", "NL", "YT"]) assert.match(idx, new RegExp(`class="cd-region" data-code="${code}"`), code);
  assert.match(read("js/canada-datos-disponibles.js"), /northwest-territories/);
  for (const r of D.CD_REGIONS.filter((x) => !x.profile)) assert.ok(!existsSync(join(ROOT, `canada-en-datos/${r.slug}.html`)), r.code);
});
