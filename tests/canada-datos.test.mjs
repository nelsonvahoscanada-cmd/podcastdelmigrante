/*
  Canadá en Datos — pruebas del módulo (sin navegador).
  La prueba de navegador está en tests/e2e-canada-datos.cjs.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { render, loadData, formatoValor } from "../scripts/build-canada-datos.mjs";
import { build } from "../scripts/build-public.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const D = loadData();
const PAGES = render();
const reloj = createRequire(import.meta.url)("../js/canada-reloj.js");

function jpegSize(path) {
  const b = readFileSync(path);
  for (let i = 2; i < b.length; ) {
    const len = b.readUInt16BE(i + 2);
    if (b[i + 1] >= 0xc0 && b[i + 1] <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}
const meta = (html, prop) => (html.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`)) || [])[1];

test("las páginas generadas están al día (node scripts/build-canada-datos.mjs)", () => {
  for (const [name, html] of Object.entries(PAGES)) {
    assert.equal(read(`canada-en-datos/${name}`), html, `canada-en-datos/${name} desactualizado`);
  }
  const sobrantes = readdirSync(join(ROOT, "canada-en-datos")).filter((f) => !PAGES[f]);
  assert.deepEqual(sobrantes, []);
});

test("13 regiones: 10 provincias y 3 territorios, con capital, zona horaria válida y geometría", () => {
  const geo = JSON.parse(read("scripts/canada-en-datos/mapa-canada.json"));
  assert.equal(D.CD_REGIONS.length, 13);
  assert.equal(D.CD_REGIONS.filter((r) => r.type === "provincia").length, 10);
  assert.equal(D.CD_REGIONS.filter((r) => r.type === "territorio").length, 3);
  assert.equal(new Set(D.CD_REGIONS.map((r) => r.code)).size, 13);
  assert.equal(new Set(D.CD_REGIONS.map((r) => r.slug)).size, 13);
  assert.deepEqual(Object.keys(geo.paths).sort(), D.CD_REGIONS.map((r) => r.code).sort());
  assert.match(geo._fuente, /Natural Earth/);
  for (const r of D.CD_REGIONS) {
    assert.ok(r.capital, r.code);
    assert.doesNotThrow(() => new Intl.DateTimeFormat("es-CA", { timeZone: r.timeZone }), r.timeZone);
    assert.ok(r.coords[0] > 40 && r.coords[0] < 84 && r.coords[1] < -50 && r.coords[1] > -142, `coordenadas de ${r.capital}`);
  }
  const ab = D.CD_REGIONS.find((r) => r.code === "AB");
  assert.equal(ab.capital, "Edmonton");
  assert.equal(ab.timeZone, "America/Edmonton");
});

test("ninguna cifra sin fuente oficial, período de referencia y fecha de consulta", () => {
  for (const [slug, perfil] of Object.entries(D.CD_PROFILES)) {
    for (const [k, ind] of Object.entries(perfil.indicators)) {
      assert.match(ind.source.url, /^https:\/\//, `${slug}.${k}: fuente`);
      assert.ok(ind.source.org && ind.source.title && ind.label && ind.cadence, `${slug}.${k}`);
      assert.ok(["numero", "moneda", "porcentaje", "indice"].includes(ind.format), `${slug}.${k}: formato`);
      if (ind.value !== null) {
        assert.equal(typeof ind.value, "number", `${slug}.${k}: valor numérico`);
        assert.ok(ind.refPeriod, `${slug}.${k}: período de referencia`);
        assert.ok(ind.unit, `${slug}.${k}: unidad`);
        assert.match(ind.retrievedAt || "", /^\d{4}-\d{2}-\d{2}$/, `${slug}.${k}: fecha de consulta`);
        assert.match(ind.reviewedAt || "", /^\d{4}-\d{2}-\d{2}$/, `${slug}.${k}: fecha de revisión`);
        assert.ok(ind.note, `${slug}.${k}: aclaración de qué mide la cifra`);
      } else {
        assert.ok(ind.pending, `${slug}.${k}: debe explicar por qué sigue pendiente`);
      }
    }
    for (const k of perfil.summary) assert.ok(perfil.indicators[k], `${slug}: resumen ${k}`);
    for (const s of perfil.sections) for (const k of s.indicators) assert.ok(perfil.indicators[k], `${slug}: ${s.id}.${k}`);
  }
  for (const f of Object.values(D.CD_SOURCES)) assert.match(f.retrievedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test("Alberta: ficha completa con todas las secciones y «Recién llegado»", () => {
  const ab = D.CD_PROFILES.alberta;
  const ids = ab.sections.map((s) => s.id);
  for (const id of ["poblacion", "economia", "empleo", "vivienda", "salud", "educacion", "inmigracion", "beneficios", "integracion", "seguridad"]) assert.ok(ids.includes(id), id);
  assert.equal(ab.newcomer.length, 8, "ocho pasos de «Recién llegado»");
  assert.ok(ab.scams.length >= 3, "orientación sobre estafas de empleo, vivienda e inmigración");
  // Estimación y censo se distinguen; la cifra del AAIP explica qué mide
  assert.match(ab.indicators.population.label, /estimaci/i);
  assert.match(ab.indicators.censusPopulation.label, /censo/i);
  assert.match(ab.indicators.aaipNominations.note, /no es el número de personas/i);
  assert.match(ab.indicators.averageWage.note, /promedio/i);
  for (const p of ab.newcomer) assert.match(p.link.href, /^(https:\/\/|\/)/);
  for (const s of ab.sections) for (const l of s.links) assert.match(l.href, /^(https:\/\/|\/articulo-)/, l.href);
});

test("solo las regiones con ficha tienen página; las demás no enlazan a fichas inexistentes", () => {
  const conFicha = D.CD_REGIONS.filter((r) => r.profile).map((r) => `${r.profile}.html`);
  assert.deepEqual(Object.keys(PAGES).sort(), ["index.html", ...conFicha].sort());
  const indice = PAGES["index.html"];
  for (const m of indice.matchAll(/href="\/canada-en-datos\/([a-z-]+)"/g)) assert.ok(PAGES[`${m[1]}.html`], `enlace a ficha inexistente: ${m[1]}`);
  const mapa = read("js/canada-mapa.js");
  assert.match(mapa, /r\.profile/, "el panel solo enlaza cuando hay ficha");
});

test("SEO y vistas previas: canónica, og/twitter, imagen 1200×630 y JSON-LD en el HTML", () => {
  const esperadas = { "index.html": "https://podcastdelmigrante.com/canada-en-datos/", "alberta.html": "https://podcastdelmigrante.com/canada-en-datos/alberta" };
  for (const [name, url] of Object.entries(esperadas)) {
    const html = PAGES[name];
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    assert.equal(meta(html, "og:url"), url);
    assert.ok(meta(html, "og:title") && meta(html, "og:description") && meta(html, "twitter:title"));
    assert.equal(meta(html, "twitter:card"), "summary_large_image");
    const img = meta(html, "og:image");
    assert.match(img, /^https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-[a-z-]+\.jpg$/);
    const local = join(ROOT, img.replace("https://podcastdelmigrante.com/", ""));
    assert.ok(existsSync(local), img);
    assert.deepEqual(jpegSize(local), [1200, 630]);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(ld.url, url);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${name}: un solo h1`);
  }
});

test("prototipo: noindex y aviso mientras no se autorice la publicación", () => {
  if (!D.CD_META.prototype) return;
  for (const html of Object.values(PAGES)) {
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.match(html, /Prototipo en revisión editorial/);
  }
});

test("rutas absolutas (páginas en subcarpeta), tipografías locales y footer legal completo", () => {
  for (const [name, html] of Object.entries(PAGES)) {
    const relativas = [...html.matchAll(/(?:href|src)="(?!https?:|mailto:|#|\/)([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(relativas, [], `rutas relativas en ${name}`);
    assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
    assert.match(html, /window\.PDM_SITE_ROOT_LINKS = true/);
    for (const legal of ["/politica-editorial", "/privacidad", "/cookies", "/terminos", "/publicidad", "/derechos-de-autor", "/correcciones"]) {
      assert.ok(html.includes(`href="${legal}"`), `${name}: ${legal}`);
    }
  }
});

test("formato numérico del portal: igual en la página generada y en el navegador", () => {
  assert.equal(formatoValor({ value: 5101050, format: "numero" }), "5,101,050");
  assert.equal(formatoValor({ value: 7.2, format: "porcentaje", decimals: 1 }), "7.2%");
  assert.equal(formatoValor({ value: 37.35, format: "moneda", decimals: 2 }), "$37.35");
  assert.equal(formatoValor({ value: 1914, format: "moneda" }), "$1,914");
  assert.equal(formatoValor({ value: 95.63, format: "indice", decimals: 2 }), "95.63");
  const fuente = read("js/canada-mapa.js");
  const cuerpo = (src) => src.slice(src.indexOf("function formatoValor"), src.indexOf("}", src.indexOf('return ind.format === "porcentaje"')) + 1).replace(/\s+/g, " ");
  assert.equal(cuerpo(fuente), cuerpo(read("scripts/build-canada-datos.mjs")), "js/canada-mapa.js y el generador deben formatear igual");
});

test("reloj: 12 horas con segundos y día/noche por la salida y puesta del sol", () => {
  const p = reloj.partes(new Date("2026-10-22T20:05:09Z"), "America/Edmonton");
  assert.equal(`${p.hora}:${p.minutos}:${p.segundos}`, "2:05:09");
  assert.match(p.periodo, /p\.\s?m\./);
  assert.match(p.fecha, /^Jueves, 22 de octubre de 2026$/);
  const edm = [53.55, -113.49];
  assert.equal(reloj.esDeDia(new Date("2026-10-22T13:00:00Z"), ...edm), false, "7:00 a. m. en Edmonton: todavía de noche");
  assert.equal(reloj.esDeDia(new Date("2026-10-22T16:00:00Z"), ...edm), true, "10:00 a. m.: de día");
  assert.equal(reloj.esDeDia(new Date("2026-06-21T03:30:00Z"), ...edm), true, "9:30 p. m. en junio: todavía de día");
  assert.equal(reloj.esDeDia(new Date("2026-12-21T02:00:00Z"), ...edm), false, "7:00 p. m. en diciembre: de noche");
  assert.deepEqual(reloj.sol(new Date("2026-06-21T18:00:00Z"), 82.5, -62.3), { polar: "dia" }, "sol de medianoche en el Ártico");
  const nl = reloj.partes(new Date("2026-10-22T20:05:09Z"), "America/St_Johns");
  assert.equal(`${nl.hora}:${nl.minutos}`, "5:35", "Terranova: media hora");
});

test("aislamiento: el menú «Canadá» sigue oculto y ninguna otra página enlaza al módulo", () => {
  const ctx = vm.createContext({});
  vm.runInContext(read("js/data.js") + ";globalThis.N=NAV_PRIMARY;", ctx);
  const canada = ctx.N.find((i) => i.label === "Canadá");
  assert.equal(canada.pending, true, "«Canadá» debe seguir oculto hasta autorizar la publicación");
  const paginas = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  for (const f of paginas) assert.doesNotMatch(read(f), /canada-en-datos/, f);
  assert.doesNotMatch(read("sitemap.xml"), /canada-en-datos/, "fuera del sitemap mientras sea prototipo");
});

test("la carpeta pública incluye el módulo y sigue limpia", () => {
  const out = mkdtempSync(join(tmpdir(), "pdm-cd-"));
  try {
    const { files, problems } = build(out);
    assert.deepEqual(problems, []);
    for (const f of ["canada-en-datos/index.html", "canada-en-datos/alberta.html", "css/canada-datos.css", "js/canada-datos.js", "js/canada-mapa.js", "js/canada-reloj.js", "js/canada-region.js", "assets/canada-en-datos/social-alberta.jpg"]) {
      assert.ok(files.includes(f), f);
    }
    assert.ok(!files.some((f) => f.startsWith("scripts/")), "la geometría y los generadores no se publican");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
