/*
  Prueba de extremo a extremo (navegador + Pages Functions) de las
  correcciones SEO de redirecciones y soft 404:

  - Las páginas principales, ya dibujadas con JavaScript (lo que ve Google),
    enlazan a URL que responden 200 directamente: sin 301/308 ni 404.
    Excepción documentada: la cabecera y el pie de Canadá en Datos y de la
    página 404 (copiados de 404.html; fuera de alcance).
  - La canónica de guías, rutas, historias y registro es la URL final y
    responde 200.
  - Las plantillas con un parámetro inexistente responden 404 real y
    muestran la página «no encontrada» del sitio, en computador y celular;
    con un parámetro válido muestran su contenido.
  - Las redirecciones antiguas siguen funcionando.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-seo-redirecciones.cjs   (BASE=http://127.0.0.1:8890)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const http = require("node:http");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const estado = (p) => new Promise((ok) => {
  const r = http.request(BASE + p, { method: "GET" }, (s) => { s.resume(); ok([s.statusCode, s.headers.location || ""]); });
  r.on("error", () => ok([0, ""])); r.end();
});
const CHROME_404 = new Set(["/index.html", "/guia.html?categoria=migracion", "/quien-puede-ayudarte.html"]);

const PAGINAS = [
  "/", "/noticias", "/magazine/2026-10/", "/quien-puede-ayudarte", "/perfil-santa-latino", "/planes-directorio", "/registra-tu-empresa",
  "/articulo-canada-33000-residencias-permanentes-trabajadores-2026", "/articulo-salud-rural-urbana-alberta-atencion-medica",
  "/articulo-el-frio-no-pudo-apagar-mi-senal", "/articulo-canada-groceries-essentials-benefit-cgeb-2026",
  "/colaborador-carlos-castillo", "/columna?slug=entre-dos-mundos", "/guia?categoria=migracion", "/guia-ruta?ruta=quiero-venir-canada",
  "/guia-ruta?subruta=quiero-visitar-canada", "/historia?slug=desafio-carlos-castillo-proteccion-familiar",
  "/historia-vida?slug=historia-diana-pineda-radio-canada", "/desafio-100-empresas/", "/desafio-100-empresas/calgary/",
  "/desafio-100-empresas/calgary/muro", "/desafio-100-empresas/calgary/ep-03-carlos-d-castillo", "/privacidad",
];
const CANONICAS = {
  "/guia?categoria=migracion": "/guia?categoria=migracion",
  "/guia-ruta?ruta=quiero-venir-canada": "/guia-ruta?ruta=quiero-venir-canada",
  "/guia-ruta?subruta=quiero-visitar-canada": "/guia-ruta?subruta=quiero-visitar-canada",
  "/historia?slug=desafio-carlos-castillo-proteccion-familiar": "/historia?slug=desafio-carlos-castillo-proteccion-familiar",
  "/historia-vida?slug=historia-diana-pineda-radio-canada": "/historia-vida?slug=historia-diana-pineda-radio-canada",
  "/registra-tu-empresa": "/registra-tu-empresa",
};
const INEXISTENTES = ["/articulo?slug=no-existe", "/articulo", "/guia", "/guia?categoria=no-existe", "/guia-ruta?ruta=no-existe", "/guia-ruta?subruta=no-existe",
  "/historia?slug=no-existe", "/historia-vida", "/columna", "/columna?slug=no-existe", "/colaborador?id=no-existe", "/business-profile?slug=no-existe", "/no-existe-esta-pagina"];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: "es-CA" });
  await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  await ctx.route("**/api/**", (r) => r.fulfill({ status: 204, body: "" }));

  /* 1. Enlaces internos ya renderizados */
  const enlaces = new Map();
  for (const p of PAGINAS) {
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    const r = await page.goto(BASE + p, { waitUntil: "networkidle" });
    assert.equal(r.status(), 200, p);
    assert.deepEqual(errores, [], p);
    for (const h of await page.$$eval("a[href]", (as) => as.map((a) => a.href))) {
      if (!h.startsWith(BASE)) continue;
      const u = h.slice(BASE.length).split("#")[0] || "/";
      if (!enlaces.has(u)) enlaces.set(u, new Set());
      enlaces.get(u).add(p);
    }
    if (CANONICAS[p]) {
      const c = await page.$eval('link[rel="canonical"]', (l) => l.href);
      assert.equal(c, SITE + CANONICAS[p], `canónica de ${p}`);
      assert.equal((await estado(CANONICAS[p]))[0], 200, `la canónica de ${p} responde 200`);
    }
    await page.close();
  }
  const malos = [];
  for (const [u, desde] of enlaces) {
    const [s, loc] = await estado(u);
    if (s === 200) continue;
    if (CHROME_404.has(u) && [...desde].every((d) => d === "/guia" || d.startsWith("/canada-en-datos"))) continue;
    malos.push(`${s} ${u} ${loc} ← ${[...desde].slice(0, 3).join(", ")}`);
  }
  assert.deepEqual(malos, [], "enlaces internos con redirección o error");
  console.log(`ok ${enlaces.size} enlaces internos renderizados responden 200 sin redirección`);

  /* 2. 404 reales con la página del sitio, en computador y celular */
  for (const [nombre, perfil] of [["computador", { viewport: { width: 1440, height: 900 } }], ["celular", devices["iPhone 13"]]]) {
    const c = await browser.newContext({ ...perfil, locale: "es-CA" });
    await c.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
    for (const p of INEXISTENTES) {
      const page = await c.newPage();
      const r = await page.goto(BASE + p, { waitUntil: "networkidle" });
      assert.equal(r.status(), 404, p);
      assert.match(await page.title(), /no encontrada/i, p);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      assert.ok(sw <= cw + 1, `${p}: sin desplazamiento horizontal en ${nombre}`);
      await page.close();
    }
    await c.close();
    console.log(`ok ${nombre}: ${INEXISTENTES.length} URL inexistentes → 404 con la página del sitio`);
  }

  /* 3. Redirecciones antiguas conservadas */
  for (const [desde, hacia] of [
    ["/articulo?slug=plan-dental-canada-cdcp", "/articulo-plan-dental-canada-cdcp"],
    ["/articulo.html?slug=plan-dental-canada-cdcp", "/articulo-plan-dental-canada-cdcp"],
    ["/guia.html?categoria=migracion", "/guia?categoria=migracion"],
    ["/registra-tu-empresa.html", "/registra-tu-empresa"],
    ["/index.html", "/"],
  ]) {
    const [s, loc] = await estado(desde);
    assert.ok([301, 308].includes(s), `${desde}: ${s}`);
    assert.equal(new URL(loc, BASE).pathname + new URL(loc, BASE).search, hacia, desde);
  }
  console.log("ok redirecciones antiguas conservadas");
  await browser.close();
  console.log("OK SEO: enlaces sin redirecciones, canónicas definitivas y 404 reales");
})().catch((e) => { console.error(e); process.exit(1); });
