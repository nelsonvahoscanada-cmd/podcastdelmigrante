/*
  Pruebas de las ediciones mensuales (scripts/build-ediciones.mjs).
  Las ediciones de ejemplo de este archivo son solo datos de prueba: no
  representan ninguna selección editorial.
  node --test tests/ediciones.test.mjs
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { cargar, validar, congelar, huellaDe, render, retiradas, paginaEdicion, periodoTexto, fechaTexto } from "../scripts/build-ediciones.mjs";
import { publicFiles } from "../scripts/build-public.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const { ediciones, fuentes } = cargar();

/* Edición de ejemplo (solo para pruebas) con piezas reales del sitio */
function ejemplo(extra = {}) {
  return {
    numero: 1,
    slug: "2026-10",
    periodo: { anio: 2026, mes: 10 },
    estado: "borrador",
    publicadaEn: null,
    titulo: "Edición de prueba",
    bajada: "Bajada de prueba.",
    portada: { imagen: "/assets/logo.png", alt: "Portada de prueba", ancho: 500, alto: 500 },
    editorial: { titulo: "Editorial de prueba", autor: "Redacción", html: "<p>Texto del editorial.</p>" },
    secciones: [
      { titulo: "Noticias", piezas: [{ tipo: "articulo", id: "ART-2026-029" }, { tipo: "articulo", id: "ART-2026-031" }] },
      { titulo: "Historias y videos", piezas: [{ tipo: "historia", slug: "historia-andrea-diaz-primer-trabajo-canada" }, { tipo: "video", videoId: "LxTr1Zda3dg" }] },
    ],
    instantanea: null,
    huella: null,
    ...extra,
  };
}
function publicada(extra = {}) {
  const ed = ejemplo({ estado: "publicada", publicadaEn: "2026-11-03T09:00:00-07:00", ...extra });
  return congelar(ed, fuentes, { fecha: "2026-11-03T16:00:00.000Z" });
}

test("hoy: EDICIONES está vacía y es válida; la selección de octubre la define la dirección editorial", () => {
  assert.deepEqual(ediciones, []);
  assert.deepEqual(validar(ediciones), []);
});

test("las páginas generadas están al día y el sitemap no cambia mientras no haya ediciones publicadas", () => {
  const files = render(ediciones);
  assert.deepEqual(Object.keys(files).sort(), ["magazine/ediciones/index.html", "sitemap.xml"]);
  for (const [nombre, html] of Object.entries(files)) assert.equal(read(nombre), html, `${nombre} desactualizado`);
  assert.doesNotMatch(read("sitemap.xml"), /magazine/);
  assert.deepEqual(readdirSync(join(ROOT, "magazine")), ["ediciones"], "solo la hemeroteca: ninguna edición ni /magazine/ vigente");
  execFileSync("node", ["scripts/build-ediciones.mjs", "--check"], { cwd: ROOT, stdio: "pipe" });
});

test("hemeroteca vacía: noindex, canonical, sin ediciones y con la cabecera y el pie del sitio", () => {
  const h = read("magazine/ediciones/index.html");
  assert.match(h, /<meta name="robots" content="noindex">/);
  assert.match(h, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/magazine\/ediciones\/">/);
  assert.match(h, /Todavía no hay ediciones publicadas en la hemeroteca\./);
  assert.match(h, /<h1 class="ed-titulo">Ediciones<\/h1>/);
  assert.ok(h.includes('id="siteHeader"') && h.includes('class="site-footer"'), "cabecera y pie del sitio");
  assert.match(h, /<link rel="stylesheet" href="\/css\/ediciones\.css">/);
});

test("borradores: nunca se generan en el sitio, ni en la hemeroteca ni en el sitemap", () => {
  const files = render([ejemplo()]);
  assert.deepEqual(Object.keys(files).sort(), ["magazine/ediciones/index.html", "sitemap.xml"]);
  assert.doesNotMatch(files["magazine/ediciones/index.html"], /Edición de prueba/);
  assert.doesNotMatch(files["sitemap.xml"], /magazine/);
  /* La vista previa de borradores solo se escribe fuera del proyecto */
  assert.throws(() => execFileSync("node", ["scripts/build-ediciones.mjs", "--check", `--borradores=${join(ROOT, "magazine/x")}`], { cwd: ROOT, stdio: "pipe" }));
});

test("la publicación del sitio nunca incluye borradores: solo los archivos de magazine/ que genera el script", () => {
  const pub = publicFiles(ROOT).filter((f) => f.startsWith("magazine/"));
  assert.deepEqual(pub, ["magazine/ediciones/index.html"]);
});

test("publicar exige portada, editorial, fecha con zona y edición congelada", () => {
  assert.match(validar([ejemplo({ estado: "publicada", publicadaEn: "2026-11-03T09:00:00-07:00" })]).join("\n"), /debe estar congelada/);
  assert.match(validar([ejemplo({ estado: "publicada", publicadaEn: "2026-11-03" })]).join("\n"), /ISO con zona horaria/);
  assert.match(validar([publicada({ portada: null })]).join("\n"), /falta la portada/);
  assert.match(validar([ejemplo({ publicadaEn: "2026-11-03T09:00:00-07:00" })]).join("\n"), /un borrador no tiene fecha de publicación/);
  assert.match(validar([publicada({ publicadaEn: "2026-09-30T09:00:00-07:00" })]).join("\n"), /anterior al período/);
  assert.match(validar([ejemplo({ slug: "2026-11" })]).join("\n"), /período no coincide/);
  assert.match(validar([ejemplo({ editorial: { titulo: "x", html: '<p onclick="x()">a</p>' } })]).join("\n"), /HTML no permitido/);
  assert.match(validar([ejemplo(), ejemplo({ slug: "2026-11", periodo: { anio: 2026, mes: 11 } })]).join("\n"), /número repetido/);
  assert.deepEqual(validar([publicada()]), []);
});

test("congelar: rechaza piezas inexistentes o sin publicar y no duplica el texto de los artículos", () => {
  assert.throws(() => congelar(ejemplo({ secciones: [{ titulo: "x", piezas: [{ tipo: "articulo", id: "ART-1999-999" }] }] }), fuentes), /No existe el artículo/);
  const borradorArt = fuentes.articulos.find((a) => a.draft);
  if (borradorArt) assert.throws(() => congelar(ejemplo({ secciones: [{ titulo: "x", piezas: [{ tipo: "articulo", id: borradorArt.id }] }] }), fuentes), /no está publicado/);
  const ed = publicada();
  const s = ed.instantanea.piezas["articulo:ART-2026-029"];
  assert.deepEqual(Object.keys(s).sort(), ["bajada", "categoria", "fecha", "imagen", "tipo", "titulo", "url"], "solo datos de presentación, nunca el cuerpo del artículo");
  assert.equal(s.url, "/articulo-hector-rivero-santa-latino-canada");
  assert.ok(existsSync(join(ROOT, `${s.url.slice(1)}.html`)), "el enlace apunta a la página actual del artículo");
  assert.throws(() => congelar(ed, fuentes), /ya está congelada/);
});

test("preservación: una edición publicada no cambia si después cambia el artículo, ni al publicarse la siguiente", () => {
  const ed = publicada();
  const antes = render([ed])["magazine/2026-10/index.html"];
  /* El artículo cambia de titular después de publicada la edición */
  const art = fuentes.articulos.find((a) => a.id === "ART-2026-029");
  const fuentes2 = { ...fuentes, articulos: fuentes.articulos.map((a) => (a.id === art.id ? { ...a, title: "Titular cambiado después" } : a)) };
  assert.equal(render([ed])["magazine/2026-10/index.html"], antes, "la página solo usa la instantánea");
  /* Se publica la edición 02: la 01 queda idéntica y /magazine/ pasa a la 02 */
  const nov = congelar(ejemplo({ numero: 2, slug: "2026-11", periodo: { anio: 2026, mes: 11 }, estado: "publicada", publicadaEn: "2026-12-02T09:00:00-07:00", titulo: "Edición de prueba 2" }), fuentes2, { fecha: "2026-12-02T16:00:00.000Z" });
  const files = render([ed, nov]);
  assert.equal(files["magazine/2026-10/index.html"], antes, "publicar la 02 no altera la 01");
  assert.match(files["magazine/2026-11/index.html"], /Titular cambiado después/);
  assert.match(files["magazine/index.html"], /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/magazine\/2026-11\/">/);
  assert.match(files["magazine/ediciones/index.html"], /Edición 02[\s\S]*Edición 01/);
});

test("protección: cualquier cambio en una edición publicada rompe la huella; la corrección queda registrada", () => {
  const ed = publicada();
  assert.equal(huellaDe(ed), ed.huella);
  for (const cambio of [{ titulo: "Otro" }, { publicadaEn: "2026-11-04T09:00:00-07:00" }, { secciones: ed.secciones.slice(1) }]) {
    assert.match(validar([{ ...ed, ...cambio }]).join("\n"), /huella ya no coincide/, JSON.stringify(cambio));
  }
  const tocada = JSON.parse(JSON.stringify(ed));
  tocada.instantanea.piezas["articulo:ART-2026-029"].titulo = "Editado a mano";
  assert.match(validar([tocada]).join("\n"), /huella ya no coincide/);
  const corregida = congelar({ ...ed, titulo: "Titular corregido" }, fuentes, { correccion: "Errata en el titular", fecha: "2026-11-05T16:00:00.000Z" });
  assert.deepEqual(validar([corregida]), []);
  assert.deepEqual(corregida.correcciones, [{ fecha: "2026-11-05", nota: "Errata en el titular" }]);
  assert.match(render([corregida])["magazine/2026-10/index.html"], /Correcciones[\s\S]*Errata en el titular/);
});

test("una edición publicada no puede retirarse por accidente", () => {
  const dir = mkdtempSync(join(tmpdir(), "pdm-ed-"));
  try {
    mkdirSync(join(dir, "magazine/2026-10"), { recursive: true });
    writeFileSync(join(dir, "magazine/2026-10/index.html"), "x");
    assert.deepEqual(retiradas([], dir), ["2026-10"]);
    assert.deepEqual(retiradas([{ ...publicada(), estado: "borrador" }], dir), ["2026-10"], "volver a borrador también se detecta");
    assert.deepEqual(retiradas([publicada()], dir), []);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("fechas: el período de la edición y la fecha real de publicación se muestran por separado (hora de Alberta)", () => {
  const html = render([publicada()])["magazine/2026-10/index.html"];
  assert.match(html, /Período de la edición: octubre de 2026/);
  assert.match(html, /Publicada el <time datetime="2026-11-03T09:00:00-07:00">3 de noviembre de 2026<\/time>/);
  assert.match(html, /<p class="ed-rotulo">Edición 01 · Octubre de 2026<\/p>/);
  assert.equal(periodoTexto({ anio: 2026, mes: 11 }), "noviembre de 2026");
  assert.equal(fechaTexto("2026-11-01T05:30:00Z"), "31 de octubre de 2026", "a las 23:30 del 31 en Alberta todavía es octubre");
});

test("SEO: ruta permanente, canonical, datos estructurados y enlaces a los artículos sin cambiar sus URL", () => {
  const files = render([publicada()]);
  const p = files["magazine/2026-10/index.html"];
  assert.match(p, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/magazine\/2026-10\/">/);
  assert.doesNotMatch(p, /noindex/);
  assert.match(p, /"@type":"PublicationIssue","issueNumber":"1"/);
  assert.match(p, /"datePublished":"2026-11-03T09:00:00-07:00"/);
  for (const [, href] of p.matchAll(/class="ed-pieza__enlace" href="([^"]+)"/g)) {
    if (href.startsWith("/articulo-")) assert.ok(existsSync(join(ROOT, `${href.slice(1)}.html`)), href);
  }
  assert.match(p, /href="\/historia-vida\?slug=historia-andrea-diaz-primer-trabajo-canada"/);
  assert.match(p, /href="\/articulo-hector-rivero-santa-latino-canada"/);
  /* Sin enlace a la edición siguiente: la página no depende de las demás */
  assert.doesNotMatch(p, /magazine\/2026-11/);
  const sm = files["sitemap.xml"];
  assert.match(sm, /<!-- magazine-ediciones: generado[\s\S]*<loc>https:\/\/podcastdelmigrante\.com\/magazine\/ediciones\/<\/loc>[\s\S]*<loc>https:\/\/podcastdelmigrante\.com\/magazine\/2026-10\/<\/loc>[\s\S]*<!-- \/magazine-ediciones -->\n<\/urlset>/);
  assert.doesNotMatch(sm, /<loc>https:\/\/podcastdelmigrante\.com\/magazine\/<\/loc>/, "la vigente no se indexa aparte (canonical a la permanente)");
  assert.equal(render([])["sitemap.xml"], render([], { sitemap: sm })["sitemap.xml"], "al no haber ediciones el bloque se quita sin dejar rastro");
  assert.equal(render([])["sitemap.xml"], read("sitemap.xml"));
});

test("la vista previa de un borrador lleva noindex y el aviso de borrador", () => {
  const vista = congelar(ejemplo(), fuentes);
  const comun = { cabecera: "<header></header>", pie: "<footer></footer>" };
  const html = paginaEdicion(vista, comun, { borrador: true });
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /Borrador: vista previa privada/);
  assert.match(html, /<span>Sin publicar<\/span>/);
});

test("aislamiento: la portada, las noticias y el resto del sitio no usan todavía las ediciones", () => {
  for (const f of ["index.html", "noticias.html", "404.html"]) assert.doesNotMatch(read(f), /ediciones\.js|\/magazine\//, f);
  for (const f of ["js/main.js", "js/noticias.js", "js/data.js", "js/nav.js", "js/articles.js"]) assert.doesNotMatch(read(f), /EDICIONES|\/magazine\//, f);
});
