/* «Explora las ciudades y pueblos de Nueva Escocia»: catálogo oficial, municipios vigentes, Dartmouth y Sydney, páginas, guía y SEO. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { render } from "../scripts/build-canada-datos.mjs";
import NS from "../scripts/canada-en-datos/provincias/nova-scotia.mjs";

const { TIPOS, FICHAS } = NS;
const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const L = NS.cargar(ROOT);
const PAGES = render();
const paginas = Object.entries(PAGES).filter(([k]) => k.startsWith("nova-scotia/"));
const csd = L.items.filter((r) => TIPOS[r.t].grupo !== "comunidad");
const comunidades = L.items.filter((r) => TIPOS[r.t].grupo === "comunidad");
const porSlug = (s) => L.items.find((r) => r.s === s);
const cuenta = (g) => csd.filter((r) => TIPOS[r.t].grupo === g).length;
const W = JSON.parse(read("scripts/canada-en-datos/ns-wds.json"));
const perfil = () => {
  const ctx = {};
  vm.runInNewContext(read("js/canada-datos.js") + ";globalThis.P = CD_PROFILES; globalThis.R = CD_REGIONS;", ctx);
  return ctx;
};
const FICHAS_ESPERADAS = ["amherst", "bridgewater", "cape-breton", "dartmouth", "halifax", "kentville", "new-glasgow", "sydney", "truro", "yarmouth"];

test("criterio: las 95 subdivisiones censales del Censo 2021, que suman la población de la provincia", () => {
  assert.equal(csd.length, 95);
  assert.equal(cuenta("municipio"), 40, "municipios del censo");
  assert.equal(cuenta("condado"), 28, "subdivisiones de los municipios de condado");
  assert.equal(cuenta("indigena"), 27, "reservas indígenas");
  const por = (t) => csd.filter((r) => r.t === t).length;
  assert.deepEqual([por("regional"), por("regional-rm"), por("town"), por("district"), por("county-subd"), por("reserve")], [3, 1, 25, 11, 28, 27]);
  assert.equal(csd.reduce((a, r) => a + (r.p || 0), 0), 969383);
  assert.equal(L.provincia.p, 969383);
  /* Cada condado suma la población de sus subdivisiones */
  for (const c of L.condados) assert.equal(csd.filter((r) => r.cd === c.id).reduce((a, r) => a + (r.p || 0), 0), c.p, c.n);
});

test("regiones económicas formadas por condados completos (comprobado con los límites oficiales) y condados como filtro", () => {
  assert.deepEqual(Object.keys(L.regiones).sort(), ["1210", "1220", "1230", "1240", "1250"]);
  assert.equal(new Set(csd.map((r) => r.condado)).size, 18);
  const er = {};
  for (const r of csd) (er[r.cd] ||= new Set()).add(r.r);
  for (const [cd, s] of Object.entries(er)) assert.equal(s.size, 1, `condado ${cd} en una sola región`);
  assert.equal(porSlug("halifax").r, "1250");
  assert.equal(porSlug("cape-breton").r, "1210");
  assert.equal(porSlug("truro").r, "1220");
  assert.equal(porSlug("kentville").r, "1230");
  assert.equal(porSlug("yarmouth").r, "1240");
  for (const r of csd) {
    assert.match(r.c, /^12(0[1-9]|1[0-8])\d{3}$/, `${r.n}: código`);
    assert.ok(r.lat >= 43.3 && r.lat <= 47.1 && r.lon >= -66.5 && r.lon <= -59.6, `${r.n}: ${r.lat}, ${r.lon}`);
  }
  /* Valores conocidos (Statistics Canada, Censo 2021) */
  assert.equal(porSlug("halifax").p, 439819);
  assert.equal(porSlug("cape-breton").p, 93694);
  assert.equal(porSlug("truro").p, 12954);
  assert.equal(porSlug("new-glasgow").p, 9471);
  assert.equal(porSlug("amherst").p, 9404);
  assert.equal(porSlug("bridgewater").p, 8790);
  assert.equal(porSlug("yarmouth").p, 6829);
  assert.equal(porSlug("kentville").p, 6630);
});

test("municipios vigentes: 49 según los límites oficiales; cada subdivisión indica el suyo y las reservas ninguno", () => {
  assert.equal(L.municipios.total, 49);
  assert.deepEqual(L.municipios.tipos, { Town: 25, "Municipal District": 11, "Regional Municipality": 4, "Municipal County": 9 });
  assert.equal(L.municipios.villas, 21);
  assert.deepEqual(porSlug("halifax").actual, [["Halifax Regional Municipality", "Regional Municipality", 99]]);
  assert.deepEqual(porSlug("kings-subd-a").actual.map((x) => x[0]), ["Municipality of the County of Kings"]);
  assert.deepEqual(porSlug("kings-subd-a").villas, ["Aylesford", "Cornwallis Square", "Greenwood", "Kingston"]);
  for (const r of csd.filter((x) => x.t !== "reserve")) {
    assert.equal(r.actual.length, 1, `${r.n}: un municipio`);
    assert.ok(r.actual[0][2] >= 20, r.n);
  }
  for (const r of csd.filter((x) => x.t === "reserve")) assert.deepEqual(r.actual, [], `${r.n}: las reservas no son parte de un municipio`);
  assert.match(PAGES["nova-scotia/kings-subd-a.html"], /Municipality of the County of Kings \(municipio de condado\)/);
  assert.match(PAGES["nova-scotia/millbrook-27.html"], /No corresponde <small class="cd-fact__period">Las reservas indígenas no forman parte de ningún municipio/);
  assert.doesNotMatch(PAGES["nova-scotia/millbrook-27.html"], /Town of Truro \(pueblo\)/);
});

test("comunidades y nombres geográficos: sin duplicados, siempre dentro de una subdivisión y sin población inventada", () => {
  assert.ok(comunidades.length > 2500, `${comunidades.length} lugares`);
  const claves = comunidades.map((c) => `${c.n.toLowerCase()}|${c.m}`);
  assert.equal(new Set(claves).size, claves.length);
  for (const c of comunidades) {
    const padre = L.porCodigo.get(c.m);
    assert.ok(padre, `${c.n}: subdivisión ${c.m}`);
    assert.notEqual(c.n.toLowerCase(), padre.n.toLowerCase());
    assert.equal(c.p, null);
  }
  /* Las villas registradas en la CGNDB aparecen como nombre geográfico (Chester no se repite: es también el nombre de su municipio de distrito) */
  assert.equal(comunidades.filter((c) => c.t === "villa").length, 20);
  assert.ok(porSlug("chester").comunidades.every((c) => c.n !== "Chester"));
});

test("Dartmouth y Sydney: ficha propia dentro de su municipio regional, sin cifras de población inventadas", () => {
  const d = porSlug("dartmouth"), s = porSlug("sydney");
  assert.equal(d.m, "1209034");
  assert.equal(s.m, "1217030");
  assert.ok(d.ficha && s.ficha);
  const hd = PAGES["nova-scotia/dartmouth.html"], hs = PAGES["nova-scotia/sydney.html"];
  assert.match(hd, /forma parte de Halifax, municipio regional/);
  assert.match(hd, /Dato no disponible<\/span> <small class="cd-fact__period">Dartmouth no es una subdivisión censal ni un centro de población propio/);
  assert.match(hd, /\$1,661 al mes/, "CMHC, zonas 5 a 7 (Dartmouth), 2 habitaciones");
  assert.match(hd, /Dartmouth General Hospital/);
  assert.match(hs, /30,960 <small class="cd-fact__period">Centro de población «Cape Breton - Sydney», Censo 2021/);
  assert.equal(W.centros.datos["Cape Breton - Sydney"].p, 30960);
  assert.match(hs, /\$1,191 al mes/, "CMHC, Sydney City, 2 habitaciones");
  assert.match(hs, /Cape Breton Regional Hospital/);
  /* Las páginas de Halifax y de Cape Breton enlazan a sus comunidades con ficha */
  assert.match(PAGES["nova-scotia/halifax.html"], /href="\/canada-en-datos\/nova-scotia\/dartmouth"/);
  assert.match(PAGES["nova-scotia/cape-breton.html"], /href="\/canada-en-datos\/nova-scotia\/sydney"/);
  /* Escuelas ubicadas con los límites oficiales de comunidad (NSCAF) */
  assert.ok(L.escuelas.filter((e) => e.comunidad === "DARTMOUTH").length >= 20);
  assert.ok(L.escuelas.filter((e) => e.comunidad === "SYDNEY").length >= 5);
});

test("una página por subdivisión y por comunidad con ficha, URL única, homónimos resueltos y una imagen social por página", () => {
  assert.equal(paginas.length, 97);
  assert.equal(new Set(L.items.filter((r) => r.s).map((r) => r.s)).size, 97);
  /* Homónimos: el pueblo conserva el nombre corto */
  assert.equal(porSlug("yarmouth").t, "town");
  assert.equal(porSlug("yarmouth-municipal-district").t, "district");
  assert.equal(porSlug("lunenburg").t, "town");
  assert.equal(porSlug("digby").t, "town");
  assert.equal(porSlug("shelburne").t, "town");
  assert.equal(porSlug("bear-river-part-6-digby").t, "reserve");
  assert.equal(porSlug("bear-river-part-6-annapolis").t, "reserve");
  const enDisco = readdirSync(join(ROOT, "canada-en-datos/nova-scotia")).sort();
  assert.deepEqual(enDisco, paginas.map(([k]) => k.replace("nova-scotia/", "")).sort());
  assert.deepEqual(readdirSync(join(ROOT, "assets/canada-en-datos/nova-scotia")).sort(), enDisco.map((f) => f.replace(".html", ".jpg")).sort());
});

test("fichas completas indexables y en el sitemap; las básicas con noindex; metadatos y compartir con la URL pública", () => {
  const sitemap = read("sitemap.xml");
  assert.deepEqual(Object.keys(FICHAS).sort(), FICHAS_ESPERADAS);
  for (const [k, html] of paginas) {
    const s = k.replace("nova-scotia/", "").replace(".html", "");
    const url = `https://podcastdelmigrante.com/canada-en-datos/nova-scotia/${s}`;
    assert.match(html, new RegExp(`<link rel="canonical" href="${url}">`));
    assert.match(html, new RegExp(`<meta property="og:image" content="https://podcastdelmigrante.com/assets/canada-en-datos/nova-scotia/${s}.jpg">`));
    assert.match(html, new RegExp(`data-cd-share data-url="${url}"`));
    assert.doesNotMatch(html, /pages\.dev/);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(ld.url, url);
    if (FICHAS[s]) {
      assert.doesNotMatch(html, /noindex/, s);
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${s} en el sitemap`);
      assert.equal(ld.about["@type"], "City", s);
    } else {
      assert.match(html, /<meta name="robots" content="noindex">/, s);
      assert.ok(!sitemap.includes(`<loc>${url}</loc>`), s);
    }
  }
  assert.ok(sitemap.includes("<loc>https://podcastdelmigrante.com/canada-en-datos/nova-scotia</loc>"));
});

test("sin datos vacíos ni inventados; empleo regional, alquileres de CMHC, escuelas y hospitales oficiales", () => {
  for (const [k, html] of paginas) {
    assert.doesNotMatch(html, /undefined|NaN|\bnull\b|\[object /, k);
    assert.match(html, /Hora del Atlántico: UTC−4 en invierno \(AST\) y UTC−3 con el horario de verano \(ADT\)/, k);
    assert.match(html, /región económica, no por localidad/, `${k}: empleo de su región`);
  }
  const h = PAGES["nova-scotia/halifax.html"];
  assert.match(h, /439,819/);
  assert.match(h, /\$1,833 al mes/, "CMHC, municipio regional de Halifax (zonas 1 a 10), 2 habitaciones");
  assert.match(h, /5\.6%/, "desempleo 2025 de la región de Halifax");
  assert.match(h, /QEII - Halifax Infirmary Site/);
  assert.match(h, /halifax\.ca\/transportation\/halifax-transit/);
  assert.match(PAGES["nova-scotia/truro.html"], /\$1,254 al mes/);
  assert.match(PAGES["nova-scotia/new-glasgow.html"], /\$1,077 al mes/);
  assert.match(PAGES["nova-scotia/kentville.html"], /\$1,127 al mes/);
  assert.match(PAGES["nova-scotia/cape-breton.html"], /\$1,140 al mes/);
  assert.match(PAGES["nova-scotia/cape-breton.html"], /10\.1%/, "desempleo 2025 de la región de Cape Breton");
  /* Sin cifras de CMHC: «Dato no disponible», sin alquileres de otra localidad */
  for (const s of ["amherst", "bridgewater", "yarmouth"]) {
    assert.match(PAGES[`nova-scotia/${s}.html`], /Dato no disponible<\/span>: CMHC no publica alquileres/, s);
    assert.doesNotMatch(PAGES[`nova-scotia/${s}.html`], /Encuesta de alquileres de CMHC, octubre de 2025, para apartamentos/, s);
  }
  const subd = PAGES["nova-scotia/colchester-subd-a.html"];
  assert.match(subd, /Subdivision of County Municipality/);
  assert.match(subd, /Dato no disponible/);
  assert.equal(L.escuelas.length, 367);
  assert.equal(L.hospitales.length, 48);
  assert.ok(L.escuelas.every((e) => e.csd && e.nombre && e.centro));
});

test("la guía provincial: secciones, cifras verificadas con fuente, NSNP con idiomas y estado, y directorio extendido", () => {
  const html = PAGES["nova-scotia.html"];
  for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<h2 id="localidades-titulo">Explora las ciudades y pueblos de Nueva Escocia<\/h2>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/canada-en-datos\/nova-scotia">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/canada-en-datos\/social-nova-scotia\.jpg">/);
  assert.match(html, /<img class="cd-flag" src="\/assets\/canada-en-datos\/bandera-nova-scotia\.svg"/);
  assert.match(html, /<label for="cdLocSub">Condado/);
  assert.match(html, /data-src="\/js\/nova-scotia-localidades\.js"/);
  /* Cifras de Statistics Canada = las del servicio oficial de datos guardado en el repositorio */
  const P = W.provincia;
  assert.equal(P.poblacion.series.total.at(-1)[1], 1103419);
  assert.equal(P.epa_mensual.series["Unemployment rate"].at(-1)[1], 6.2);
  assert.equal(P.salarios.series["Average hourly wage rate"].at(-1)[1], 32.39);
  assert.equal(P.pib.series.corrientes.at(-1)[1], 69929);
  for (const re of [/1,103,419/, /969,383/, /\$17\.00/, /6\.2%/, /\$1,826/, /14%/, /UTC−4/, /8-1-1/, /1-866-770-7763/, /89\.3%/, /2,915/, /49 municipios/, /21 villas/, /5% por año/, /31 de diciembre de 2027/, /\$127\.08/, /\$255/, /\$400 por hogar/]) assert.match(html, re, String(re));
  /* Inmigración: las cuatro vías del NSNP, idioma mínimo, estado y pausas, con fecha */
  for (const re of [/18 de febrero de 2026/, /Skilled Worker/, /Nova Scotia Graduate/, /Nova Scotia: Express Entry/, /Entrepreneur/, /CLB 4/, /CLB 5/, /CLB 7/, /17 de abril de 2024/, /NOC 62020/, /1 de septiembre de 2026/, /\$1,000/, /\$2,000/, /6,696 candidatos/, /12 meses/, /Occupations in Demand no tiene ocupaciones abiertas/, /solo por invitación/]) assert.match(html, re, String(re));
  assert.doesNotMatch(html, /Occupations in Demand[^.]*recibe EOI/, "el subcriterio sin ocupaciones no se presenta como abierto");
  /* Cada indicador publicado tiene fuente, período y fecha de consulta */
  const { P: perfiles, R } = perfil();
  const ns = perfiles["nova-scotia"];
  for (const [k, ind] of Object.entries(ns.indicators)) {
    assert.ok(ind.value != null && ind.source && ind.source.url && ind.refPeriod && ind.retrievedAt, k);
  }
  assert.equal(R.find((r) => r.code === "NS").profile, "nova-scotia");
});

test("bandera: archivo de dominio público de Wikimedia Commons, sin scripts", () => {
  const svg = read("assets/canada-en-datos/bandera-nova-scotia.svg");
  assert.match(svg, /^<svg /);
  assert.doesNotMatch(svg, /<script|on[a-z]+=|href="http/i);
  const { P: perfiles } = perfil();
  assert.equal(perfiles["nova-scotia"].flag.href, "https://commons.wikimedia.org/wiki/File:Flag_of_Nova_Scotia.svg");
});

test("portada de Canadá en Datos: Nueva Escocia «Ya disponible», sin tocar las demás regiones", () => {
  const idx = PAGES["index.html"];
  assert.match(idx, /class="cd-region cd-region--ficha" data-code="NS"/);
  assert.match(idx, /aria-label="Nueva Escocia \(ficha disponible\)"/);
  for (const code of ["AB", "ON", "BC", "PE", "SK", "MB", "QC", "NU", "NT", "YT", "NB"]) assert.match(idx, new RegExp(`class="cd-region cd-region--ficha" data-code="${code}"`), code);
  assert.match(idx, /class="cd-region" data-code="NL"/);
  assert.match(read("js/canada-datos-disponibles.js"), /nova-scotia/);
});
