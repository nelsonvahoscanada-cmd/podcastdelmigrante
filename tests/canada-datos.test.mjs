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
const TODAS = render();
/* Portada y fichas de provincia; las páginas de localidades se prueban en alberta-localidades.test.mjs y ontario-localidades.test.mjs */
const PAGES = Object.fromEntries(Object.entries(TODAS).filter(([k]) => !k.startsWith("/") && !k.includes("/")));
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
  for (const [name, html] of Object.entries(TODAS)) {
    const ruta = name.startsWith("/") ? name.slice(1) : `canada-en-datos/${name}`;
    assert.equal(read(ruta), html, `${ruta} desactualizado`);
  }
  const sobrantes = readdirSync(join(ROOT, "canada-en-datos")).filter((f) => !PAGES[f] && !["alberta", "ontario", "british-columbia", "prince-edward-island", "saskatchewan", "manitoba", "quebec"].includes(f));
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

test("Ontario: ficha completa con secciones, ciudades, tabla de alquileres y zonas horarias", () => {
  const on = D.CD_PROFILES.ontario;
  const region = D.CD_REGIONS.find((r) => r.code === "ON");
  assert.equal(region.profile, "ontario");
  assert.equal(region.capital, "Toronto");
  assert.equal(region.timeZone, "America/Toronto");
  assert.deepEqual(region.zones.map((z) => z.timeZone), ["America/Winnipeg"], "el noroeste usa la hora central");
  const ids = on.sections.map((s) => s.id);
  for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades"]) assert.ok(ids.includes(id), id);
  assert.equal(on.newcomer.length, 8, "ocho pasos de «Recién llegado»");
  assert.ok(on.scams.length >= 3);
  assert.match(on.indicators.population.label, /estimaci/i);
  assert.match(on.indicators.censusPopulation.label, /censo/i);
  for (const s of on.sections) for (const l of s.links) assert.match(l.href, /^(https:\/\/|\/articulo-)/, l.href);
  for (const p of on.newcomer) assert.match(p.link.href, /^https:\/\//);

  const html = PAGES["ontario.html"];
  // Zonas horarias: la capital y el noroeste
  assert.match(html, /data-tz="America\/Toronto"|America\/Toronto/);
  assert.match(html, /<p class="cd-zone" data-zona="America\/Winnipeg"><span class="cd-zone__label">Noroeste de Ontario<\/span>/);
  // Ciudades pedidas, dentro de la página (sin miniportales)
  const ciudades = on.sections.find((s) => s.id === "ciudades").cities;
  assert.deepEqual(ciudades.map((c) => c.name), ["Toronto", "Ottawa", "Hamilton", "London", "Kitchener-Waterloo", "Mississauga", "Brampton", "Windsor"]);
  for (const c of ciudades) {
    assert.ok(html.includes(`id="ciudad-${c.id}"`), c.name);
    assert.ok(c.sectors.length && c.sectorsSource && c.links.length, c.name);
    for (const l of c.links) assert.match(l.href, /^(https:\/\/|\/canada-en-datos\/ontario\/[a-z-]+$)/, l.href);
  }
  /* Cada tarjeta de ciudad enlaza a su ficha de localidad (canada-en-datos/ontario/<ciudad>), que existe */
  for (const c of ciudades) {
    const internos = c.links.filter((l) => l.href.startsWith("/canada-en-datos/ontario/"));
    assert.ok(internos.length >= 1, `${c.name}: enlace a su ficha`);
    for (const l of internos) assert.ok(TODAS[`${l.href.replace("/canada-en-datos/", "")}.html`], l.href);
  }
  // Tabla de alquileres: una sola encuesta (CMHC, octubre de 2025), con fuente y período
  const tabla = on.sections.find((s) => s.id === "vivienda").table;
  assert.equal(tabla.source.org, "CMHC");
  assert.equal(tabla.refPeriod, "octubre de 2025");
  for (const fila of tabla.rows) {
    assert.equal(fila.length, tabla.headers.length);
    assert.match(fila[1], /^\$\d,\d{3}$/, fila[0]);
    assert.match(fila[2], /^\d\.\d%$/, fila[0]);
  }
  assert.ok(tabla.rows.some((f) => f[0].startsWith("Toronto") && f[1] === "$2,046"));
  assert.match(html, /<th scope="row">Windsor<\/th><td>\$1,454<\/td><td>3\.7%<\/td>/);
  assert.match(html, /Fuente: <a href="https:\/\/www\.cmhc-schl\.gc\.ca\/[^"]+"[^>]*>CMHC — Rental Market Survey 2025[^<]*<\/a>\. Período: octubre de 2025; consultado el 23 de octubre de 2026\./);
  // Salario mínimo con su fecha y las excepciones
  assert.equal(on.indicators.minimumWage.value, 17.95);
  assert.match(on.indicators.minimumWage.refPeriod, /1 de octubre de 2026/);
  assert.match(on.indicators.minimumWage.note, /\$16\.90/);
  // Inmigración: lo provincial y lo federal, sin presentar vías cerradas como disponibles
  const inm = html.slice(html.indexOf('id="inmigracion"'), html.indexOf('id="vivienda"'));
  assert.match(inm, /Ontario Workforce Priority/);
  assert.match(inm, /todas las demás están cerradas/);
  assert.match(inm, /invitación/);
  assert.match(inm, /Express Entry es un sistema federal/);
  assert.doesNotMatch(inm, /Human Capital Priorities|Employer Job Offer|Masters Graduate|PhD Graduate|Entrepreneur Stream/i, "vías cerradas no se presentan");
  // Empleo: sin promesas
  assert.doesNotMatch(html, /garantizad[oa]s? (un )?empleo|empleo asegurado|consigue trabajo en/i);
});

test("Alberta no cambia con las extensiones de Ontario (zonas, tablas y ciudades)", () => {
  const ab = PAGES["alberta.html"];
  assert.doesNotMatch(ab, /cd-zones|cd-table|cd-cities/);
  assert.match(ab, /Última revisión: 22 de octubre de 2026/);
  assert.match(PAGES["index.html"], /Ya están disponibles las fichas completas de Columbia Británica, Alberta, Saskatchewan, Manitoba, Ontario, Quebec y Isla del Príncipe Eduardo/);
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
  const esperadas = { "index.html": "https://podcastdelmigrante.com/canada-en-datos/", "alberta.html": "https://podcastdelmigrante.com/canada-en-datos/alberta", "ontario.html": "https://podcastdelmigrante.com/canada-en-datos/ontario" };
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

test("publicado: sin noindex ni aviso de prototipo", () => {
  assert.equal(D.CD_META.prototype, false);
  for (const html of Object.values(PAGES)) {
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /Prototipo en revisión editorial/);
  }
});

test("salarios: mínimo, promedio y mediano con explicación y advertencia textuales", () => {
  const ind = D.CD_PROFILES.alberta.indicators;
  assert.equal(ind.minimumWage.value, 15);
  assert.equal(ind.averageWage.value, 37.35);
  assert.equal(ind.averageWage.refPeriod, "Año 2025");
  assert.equal(ind.medianWage.value, null, "el mediano solo se publica con fuente oficial verificada");
  for (const k of ["minimumWage", "averageWage", "medianWage"]) assert.equal(ind[k].unit, "CAD por hora");
  const html = Object.entries(PAGES).find(([n]) => /alberta/.test(n))[1];
  const empleo = html.slice(html.indexOf('id="empleo"'), html.indexOf('id="vivienda"'));
  assert.match(empleo, /\$15<\/p>\s*<p class="cd-indicator__unit">CAD por hora · Vigente/);
  assert.match(empleo, /\$37\.35<\/p>\s*<p class="cd-indicator__unit">CAD por hora · Año 2025/);
  assert.match(empleo, /Salario mediano provincial por hora<\/p>\s*<p class="cd-indicator__value cd-pending">Pendiente de verificación/);
  const textual = [
    "El salario mínimo es la remuneración mínima legal general que debe pagar un empleador, con algunas excepciones. El salario promedio es una media estadística de las remuneraciones de distintos trabajadores. No significa que todos ganen esa cantidad. Los salarios más altos pueden elevar el promedio. El salario mediano representa el punto central de la distribución: la mitad de los trabajadores del grupo medido gana más y la otra mitad gana menos.",
    "El salario promedio provincial no representa necesariamente el salario inicial ni garantiza cuánto ganará una persona. Los ingresos varían según ocupación, experiencia, ciudad y sector económico.",
  ];
  for (const t of textual) assert.ok(empleo.includes(t), t.slice(0, 40));
  // El promedio no aparece en el resumen del panel como referencia rápida
  assert.ok(!D.CD_PROFILES.alberta.summary.includes("averageWage"));
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

test("publicación: menú «Canadá» activo, sitemap con las dos páginas y sin enlaces a fichas inexistentes", () => {
  const ctx = vm.createContext({});
  vm.runInContext(read("js/data.js") + ";globalThis.N=NAV_PRIMARY;", ctx);
  const canada = ctx.N.find((i) => i.label === "Canadá");
  assert.ok(!canada.pending, "«Canadá» visible en el menú");
  assert.equal(canada.href, "canada-en-datos/");
  const sitemap = read("sitemap.xml");
  assert.match(sitemap, /<loc>https:\/\/podcastdelmigrante\.com\/canada-en-datos\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/podcastdelmigrante\.com\/canada-en-datos\/alberta<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/podcastdelmigrante\.com\/canada-en-datos\/ontario<\/loc>/);
  // Solo las regiones con ficha generada enlazan a ella
  const fichas = new Set(readdirSync(join(ROOT, "canada-en-datos")).filter((f) => f.endsWith(".html") && f !== "index.html").map((f) => f.replace(/\.html$/, "")));
  for (const r of D.CD_REGIONS) assert.equal(Boolean(r.profile), fichas.has(r.profile || r.slug), r.name);
  const portada = read("canada-en-datos/index.html");
  for (const [, destino] of portada.matchAll(/href="\/canada-en-datos\/([a-z-]+)"/g)) assert.ok(fichas.has(destino), destino);
  // Fuera del módulo, solo el menú (data.js), el sitemap y el módulo «Descubre tu Canadá» de la portada lo enlazan
  for (const f of readdirSync(ROOT).filter((f) => f.endsWith(".html") && f !== "index.html")) assert.doesNotMatch(read(f), /canada-en-datos/, f);
  const enPortada = [...read("index.html").matchAll(/canada-en-datos[^"]*/g)].map((m) => m[0]);
  assert.deepEqual(enPortada, ["canada-en-datos/", "canada-en-datos/descubre-mapa.svg"]);
});

test("la carpeta pública incluye el módulo y sigue limpia", () => {
  const out = mkdtempSync(join(tmpdir(), "pdm-cd-"));
  try {
    const { files, problems } = build(out);
    assert.deepEqual(problems, []);
    for (const f of ["canada-en-datos/index.html", "canada-en-datos/alberta.html", "css/canada-datos.css", "js/canada-datos.js", "js/canada-mapa.js", "js/canada-reloj.js", "js/canada-region.js", "assets/canada-en-datos/social-alberta.jpg", "canada-en-datos/ontario.html", "assets/canada-en-datos/social-ontario.jpg"]) {
      assert.ok(files.includes(f), f);
    }
    assert.ok(!files.some((f) => f.startsWith("scripts/")), "la geometría y los generadores no se publican");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("compartir: cada página comparte su URL permanente y tiene una imagen social propia que existe", () => {
  for (const [k, html] of Object.entries(TODAS)) {
    if (k.startsWith("/") || !k.endsWith(".html")) continue;
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
    assert.ok(canonical, `${k}: canonical`);
    assert.equal(meta(html, "og:url"), canonical, `${k}: og:url`);
    assert.equal(meta(html, "twitter:card"), "summary_large_image", k);
    const img = meta(html, "og:image");
    assert.match(img, /^https:\/\/podcastdelmigrante\.com\/assets\//, `${k}: og:image absoluta`);
    assert.ok(existsSync(join(ROOT, img.replace("https://podcastdelmigrante.com/", ""))), `${k}: ${img} existe`);
    if (k === "index.html") continue;
    assert.equal((html.match(/data-cd-share data-url="([^"]+)"/) || [])[1], canonical, `${k}: «Compartir» usa la URL de la página`);
    assert.match(html, /data-share-copiar/);
    assert.match(html, /data-share-estado role="status"/);
  }
});

test("sitemap.xml: XML bien formado, URL únicas y absolutas, fichas provinciales incluidas", () => {
  const xml = read("sitemap.xml");
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<\/urlset>\s*$/);
  /* Cada etiqueta abierta se cierra en orden (sin atributos ni contenido mixto en un sitemap) */
  const pila = [];
  for (const [, cierre, nombre] of xml.replace(/<\?xml[^>]*\?>/, "").replace(/<!--[\s\S]*?-->/g, "").matchAll(/<(\/?)([a-z:]+)[^>]*>/g)) {
    if (cierre) assert.equal(pila.pop(), nombre, `etiqueta </${nombre}> sin abrir`);
    else pila.push(nombre);
  }
  assert.deepEqual(pila, [], "etiquetas sin cerrar");
  const bloques = xml.match(/<url>[\s\S]*?<\/url>/g);
  const locs = bloques.map((b) => (b.match(/<loc>([^<]+)<\/loc>/) || [])[1]);
  assert.ok(locs.every((l) => /^https:\/\/podcastdelmigrante\.com\//.test(l)), "cada <url> con <loc> absoluto");
  assert.equal(new Set(locs).size, locs.length, "sin URL repetidas");
  for (const p of ["canada-en-datos/", "canada-en-datos/alberta", "canada-en-datos/ontario"]) assert.ok(locs.includes(`https://podcastdelmigrante.com/${p}`), p);
});

test("imágenes sociales: una propia por página (provincia o localidad)", () => {
  const usos = new Map();
  for (const [k, html] of Object.entries(TODAS)) {
    if (k.startsWith("/") || !k.endsWith(".html")) continue;
    const img = meta(html, "og:image");
    usos.set(img, [...(usos.get(img) || []), k]);
  }
  for (const [img, ks] of usos) assert.equal(ks.length, 1, `${img} repetida en ${ks.join(", ")}`);
  assert.equal(meta(TODAS["alberta.html"], "og:image"), "https://podcastdelmigrante.com/assets/canada-en-datos/social-alberta.jpg");
  assert.equal(meta(TODAS["ontario.html"], "og:image"), "https://podcastdelmigrante.com/assets/canada-en-datos/social-ontario.jpg");
});
