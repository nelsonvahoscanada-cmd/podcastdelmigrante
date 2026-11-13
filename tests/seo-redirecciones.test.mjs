/*
  SEO: enlaces internos sin redirecciones, canónicas definitivas y 404
  reales en las plantillas (auditoría de Search Console, noviembre 2026).

  - Las páginas públicas enlazan a la URL final (sin .html): Cloudflare
    Pages redirige x.html → /x con un 308 que Google registra como
    «Página con redirección». Excepciones, fuera de alcance: Canadá en
    Datos (cabecera copiada de 404.html; sus páginas no se regeneraron) y
    la propia 404.html.
  - Las canónicas que arma el JavaScript (guías, rutas, historias) y la del
    registro de empresas apuntan a la URL final con respuesta 200.
  - Las plantillas responden 404 real cuando el parámetro no existe
    (functions/_middleware.js + functions/_lib/rutas-validas.js), y siguen
    funcionando con un parámetro válido. Las redirecciones antiguas
    (/articulo?slug=…, x.html → /x) se conservan.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { onRequest } from "../functions/_middleware.js";
import { RUTAS_VALIDAS } from "../functions/_lib/rutas-validas.js";
import { rutasValidas, archivo } from "../scripts/build-rutas-validas.mjs";
import { enlacesDefinitivos } from "../scripts/enlaces-definitivos.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");

function ctx(path, method = "GET", assets = async () => new Response("<h1>Página no encontrada</h1>", { status: 200 })) {
  let nextCalled = false;
  return {
    request: new Request("https://podcastdelmigrante.com" + path, { method }),
    env: { ASSETS: { fetch: assets } },
    next: async () => { nextCalled = true; return new Response("plantilla", { status: 200 }); },
    get nextCalled() { return nextCalled; },
  };
}

/* Páginas HTML públicas (las que copia scripts/build-public.mjs) */
function paginas(dir = ROOT, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const rel = p.slice(ROOT.length);
    if (/^(\.|node_modules|tests|scripts|docs|db|admin-worker|analytics-worker|functions|assets)/.test(rel)) continue;
    if (statSync(p).isDirectory()) paginas(p, out);
    else if (f.endsWith(".html")) out.push(rel);
  }
  return out;
}

test("rutas válidas de las plantillas: al día con los datos (si falla: node scripts/build-rutas-validas.mjs)", () => {
  assert.equal(read("functions/_lib/rutas-validas.js"), archivo(rutasValidas()));
  assert.ok(RUTAS_VALIDAS.articulo.slug.includes("canada-33000-residencias-permanentes-trabajadores-2026"));
  assert.deepEqual(RUTAS_VALIDAS.guia.categoria, ["migracion"]);
  assert.ok(RUTAS_VALIDAS["guia-ruta"].ruta.includes("quiero-venir-canada"));
  assert.ok(RUTAS_VALIDAS["guia-ruta"].subruta.includes("quiero-visitar-canada"));
  assert.ok(RUTAS_VALIDAS.historia.slug.includes("desafio-carlos-castillo-proteccion-familiar"));
  assert.ok(RUTAS_VALIDAS["historia-vida"].slug.includes("historia-diana-pineda-radio-canada"));
  assert.ok(RUTAS_VALIDAS.columna.slug.includes("entre-dos-mundos"));
  assert.ok(RUTAS_VALIDAS.colaborador.id.includes("carlos-castillo"));
  assert.ok(RUTAS_VALIDAS["business-profile"].slug.includes("santa-latino"));
});

test("plantillas con parámetro válido: se sirven como antes (sin 404 ni redirección)", async () => {
  for (const p of [
    "/guia?categoria=migracion", "/guia.html?categoria=migracion",
    "/guia-ruta?ruta=quiero-venir-canada", "/guia-ruta?subruta=quiero-visitar-canada",
    "/historia?slug=desafio-carlos-castillo-proteccion-familiar", "/historia.html?slug=desafio-carlos-castillo-proteccion-familiar",
    "/historia-vida?slug=historia-diana-pineda-radio-canada", "/columna?slug=entre-dos-mundos",
    "/colaborador?id=carlos-castillo", "/business-profile?slug=santa-latino",
    "/guia?categoria=migracion&utm_source=facebook",
  ]) {
    const c = ctx(p);
    const r = await onRequest(c);
    assert.equal(r.status, 200, p);
    assert.equal(c.nextCalled, true, p);
  }
});

test("plantillas sin parámetro o con un valor inexistente: 404 real con la página 404.html", async () => {
  for (const p of [
    "/guia", "/guia?categoria=no-existe", "/guia?categoria=constructor", "/guia.html?categoria=no-existe",
    "/guia-ruta", "/guia-ruta?ruta=no-existe", "/guia-ruta?subruta=no-existe", "/guia-ruta?ruta=quiero-venir-canada&subruta=no-existe",
    "/historia", "/historia?slug=no-existe", "/historia-vida?slug=no-existe", "/columna", "/columna?slug=no-existe",
    "/colaborador", "/colaborador?id=no-existe", "/business-profile", "/business-profile?slug=no-existe", "/business-profile.html?slug=x",
    "/articulo?slug=no-existe", "/articulo/",
  ]) {
    const c = ctx(p);
    const r = await onRequest(c);
    assert.equal(r.status, 404, p);
    assert.equal(c.nextCalled, false, p);
    assert.match(await r.text(), /Página no encontrada/, p);
    assert.equal(r.headers.get("Cache-Control"), "no-store");
  }
  /* HEAD: mismo estado, sin cuerpo; sin ASSETS: texto simple */
  const h = await onRequest(ctx("/guia", "HEAD"));
  assert.equal(h.status, 404);
  assert.equal(await h.text(), "");
  const sinAssets = await onRequest(ctx("/columna", "GET", async () => { throw new Error("sin ASSETS"); }));
  assert.equal(sinAssets.status, 404);
  assert.equal(await sinAssets.text(), "Página no encontrada");
});

test("redirecciones antiguas conservadas y páginas propias intactas", async () => {
  const r = await onRequest(ctx("/articulo.html?slug=plan-dental-canada-cdcp&utm_source=x"));
  assert.equal(r.status, 301);
  assert.equal(r.headers.get("Location"), "/articulo-plan-dental-canada-cdcp?utm_source=x");
  /* Un borrador sigue mostrando «próximamente» en la plantilla */
  const ctxA = {};
  const vm = await import("node:vm");
  vm.runInNewContext(read("js/articles.js") + ";globalThis.A = ARTICLES;", ctxA);
  const borrador = ctxA.A.find((a) => a.draft);
  if (borrador) {
    const c = ctx("/articulo?slug=" + borrador.slug);
    assert.equal((await onRequest(c)).status, 200);
    assert.equal(c.nextCalled, true);
  }
  /* Páginas estáticas con nombre parecido no pasan por la función */
  const routes = JSON.parse(read("_routes.json")).include;
  for (const p of ["/colaborador-carlos-castillo", "/perfil-santa-latino", "/guia-carlos/*", "/historias"]) assert.ok(!routes.includes(p), p);
  for (const p of ["/colaborador-carlos-castillo", "/perfil-santa-latino"]) {
    const c = ctx(p);
    await onRequest(c);
    assert.equal(c.nextCalled, true, p);
  }
});

test("páginas públicas: ningún enlace interno a una URL con .html (salvo Canadá en Datos y 404.html)", () => {
  const malas = [];
  for (const f of paginas()) {
    if (f === "404.html" || f.startsWith("canada-en-datos/")) continue;
    const h = read(f);
    if (enlacesDefinitivos(h) !== h) malas.push(f);
    if (/href="[^"]*articulo\.html\?slug=/.test(h)) malas.push(f + " (articulo.html?slug=)");
  }
  assert.deepEqual(malas, []);
});

test("JavaScript: enlaces y canónicas a la URL definitiva", () => {
  for (const f of ["js/main.js", "js/article.js", "js/colaborador.js", "js/column.js", "js/guia.js", "js/guia-ruta.js", "js/guia-rutas.js", "js/guia-subrutas.js", "js/guias.js", "js/data.js", "js/desafio-story.js", "js/life-story.js"]) {
    const codigo = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(codigo, /(href=|href: *|= *|\+ *)["'`]\/?(articulo|guia|guia-ruta|historia|historia-vida|columna|index|perfil-[a-z0-9-]+)\.html/, f);
  }
  assert.match(read("js/guia.js"), /"https:\/\/podcastdelmigrante\.com\/guia\?categoria="/);
  assert.match(read("js/guia-ruta.js"), /"https:\/\/podcastdelmigrante\.com\/guia-ruta\?subruta="/);
  assert.match(read("js/guia-ruta.js"), /"https:\/\/podcastdelmigrante\.com\/guia-ruta\?ruta="/);
  assert.match(read("js/desafio-story.js"), /SITE_ORIGIN \+ "\/historia\?slug="/);
  assert.match(read("js/life-story.js"), /SITE_ORIGIN \+ "\/historia-vida\?slug="/);
  assert.match(read("js/nav.js"), /function urlArticulo\(slug\)/);
});

test("registro de empresas: canónica y og:url sin .html", () => {
  const h = read("registra-tu-empresa.html");
  assert.match(h, /rel="canonical" href="https:\/\/podcastdelmigrante\.com\/registra-tu-empresa"/);
  assert.match(h, /property="og:url" content="https:\/\/podcastdelmigrante\.com\/registra-tu-empresa"/);
});

test("sitemap: solo URL definitivas (sin .html ni parámetros)", () => {
  const locs = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 100);
  for (const u of locs) {
    assert.doesNotMatch(u, /\.html$|\?/, u);
    assert.match(u, /^https:\/\/podcastdelmigrante\.com\//, u);
  }
});

test("Canadá en Datos: sin cambios en su indexación (4.081 páginas básicas con noindex)", () => {
  let noindex = 0;
  for (const f of paginas()) if (f.startsWith("canada-en-datos/") && read(f).includes('<meta name="robots" content="noindex">')) noindex++;
  assert.equal(noindex, 4081);
});
