/*
  Prueba de extremo a extremo (navegador) de «Explora las ciudades y
  pueblos de Alberta». Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-alberta-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && errores.push(`${r.status()} ${r.url()}`));
  const resp = await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores, resp };
}

async function sinScrollHorizontal(page) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `desplazamiento horizontal: ${sw} > ${cw}`);
}
const meta = (page, prop) => page.locator(`meta[property="${prop}"], meta[name="${prop}"]`).first().getAttribute("content");

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Directorio en la ficha de Alberta ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/alberta");
    // Carga diferida: los datos no se piden hasta llegar a la sección
    assert.equal(await page.evaluate(() => typeof window.AB_LOCALIDADES), "undefined", "datos cargados antes de tiempo");
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las ciudades y pueblos de Alberta");
    assert.equal(await page.locator('.cd-toc a[href="#localidades"]').count(), 1);
    // La ficha de Alberta conserva sus secciones y estadísticas
    for (const id of ["poblacion", "empleo", "vivienda", "recien-llegado", "noticias", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#vivienda").textContent(), /\$1,914/);
    await page.locator("#localidades").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const total = await page.evaluate(() => window.AB_LOCALIDADES.localidades.length);
    assert.ok(total > 1500, `localidades: ${total}`);
    assert.match(await page.locator("#cdLocEstado").textContent(), /localidades encontradas/);
    assert.equal(await page.locator("#cdLocLista li").count(), 40, "primer bloque del listado");
    assert.equal(await page.locator(".cd-loc__punto").count(), total, "un punto por localidad");
    assert.equal(await page.locator(".cd-loc__region").count(), 8, "8 regiones económicas");
    // Fichas completas primero
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Ficha completa/);

    // Buscador sin acentos ni mayúsculas
    await page.locator("#cdLocBuscar").fill("BROOKS");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length < 40);
    const brooks = page.locator("#cdLocLista li", { hasText: "Ficha completa" }).first();
    assert.match(await brooks.textContent(), /Brooks/);
    assert.equal(await brooks.locator("a").getAttribute("href"), "/canada-en-datos/alberta/brooks");

    // Filtro por tipo: hamlets (no son municipios: muestran a qué municipio pertenecen)
    await page.locator("#cdLocBuscar").fill("");
    await page.locator("#cdLocTipo").selectOption("hamlet");
    await page.waitForFunction(() => /^4\d\d hamlet|localidades encontradas/.test(document.getElementById("cdLocEstado").textContent));
    const hamlet = page.locator("#cdLocLista li").first();
    assert.match(await hamlet.textContent(), /Hamlet \(Hamlet\) · pertenece a /);
    assert.match(await hamlet.locator("a").getAttribute("href"), /^\/canada-en-datos\/alberta\/[a-z0-9-]+$/);
    assert.match(await hamlet.locator("a").textContent(), /.+/);

    // Filtro por región económica
    await page.locator("#cdLocTipo").selectOption("city");
    await page.locator("#cdLocRegion").selectOption("4810");
    await page.waitForTimeout(200);
    const nombres = await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents();
    for (const n of ["Brooks", "Lethbridge", "Medicine Hat"]) assert.ok(nombres.some((x) => x.startsWith(n)), `${n} en Lethbridge–Medicine Hat`);
    assert.ok(!nombres.some((x) => x.startsWith("Calgary")), "Calgary no está en esa región");
    assert.equal(await page.locator(".cd-loc__punto").count(), nombres.length, "mapa y listado coinciden");
    assert.equal(await page.locator(".cd-loc__region.es-activa").count(), 1);

    // Mapa: tocar un punto abre la tarjeta con su enlace
    const punto = page.locator(".cd-loc__punto.es-ficha").first();
    if (perfil === "celular") await punto.tap({ force: true });
    else await punto.click({ force: true });
    assert.equal(await page.locator("#cdLocTarjeta").isVisible(), true);
    assert.match(await page.locator("#cdLocTarjeta a").getAttribute("href"), /^\/canada-en-datos\/alberta\//);
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `loc-directorio-${perfil}.png`) });

    // Sin resultados
    await page.locator("#cdLocRegion").selectOption("");
    await page.locator("#cdLocTipo").selectOption("");
    await page.locator("#cdLocBuscar").fill("zzzz");
    await page.waitForFunction(() => /No encontramos/.test(document.getElementById("cdLocEstado").textContent));
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Ficha completa ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/alberta/brooks"));
    assert.equal(await page.locator("h1").textContent(), "Brooks");
    assert.equal(await page.locator('meta[name="robots"]').count(), 0, "las fichas completas se indexan");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://podcastdelmigrante.com/canada-en-datos/alberta/brooks");
    assert.equal(await meta(page, "og:url"), "https://podcastdelmigrante.com/canada-en-datos/alberta/brooks");
    for (const id of ["resumen", "ubicacion", "comunidades", "economia-empleo", "vivienda", "educacion", "salud", "transporte", "recien-llegados", "enlaces"].filter((x) => x !== "comunidades")) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    const resumen = await page.locator("#resumen").textContent();
    assert.match(resumen, /Ciudad\s+City/);
    assert.match(resumen, /14,924/);
    assert.match(await page.locator("#vivienda").textContent(), /\$1,332 al mes/);
    assert.match(await page.locator("#salud").textContent(), /Brooks Health Centre/);
    assert.match(await page.locator("#transporte").textContent(), /Dato no disponible/);
    assert.match(await page.locator("#economia-empleo").textContent(), /Lethbridge–Medicine Hat/);
    const externos = await page.locator('main a[href^="http"]').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
    assert.ok(externos, "enlaces externos en pestaña nueva");
    assert.match(await page.locator("#navPrimary").textContent(), /Canadá/);
    await sinScrollHorizontal(page);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `loc-brooks-${perfil}.png`), fullPage: true });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Página básica (noindex) con sus comunidades ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/alberta/county-of-newell"));
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
    assert.match(await page.locator(".cd-kicker").textContent(), /Información básica/);
    assert.match(await page.locator("#comunidades").textContent(), /comunidades no incorporadas/);
    assert.ok((await page.locator(".cd-pending").count()) >= 1, "«Dato no disponible» donde no hay información");
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Teclado y accesibilidad (computador) ---------- */
  const { ctx, page, errores } = await abrir(browser, "computador", "/canada-en-datos/alberta#localidades");
  await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
  await page.locator("#cdLocBuscar").focus();
  await page.keyboard.type("red deer");
  await page.waitForTimeout(250);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const foco = await page.evaluate(() => document.activeElement.getAttribute("href"));
  assert.match(foco, /^\/canada-en-datos\/alberta\/red-deer/);
  for (const id of ["cdLocBuscar", "cdLocTipo", "cdLocRegion"]) assert.equal(await page.locator(`label[for="${id}"]`).count(), 1, `etiqueta de ${id}`);
  assert.equal(await page.locator("#cdLocEstado").getAttribute("aria-live"), "polite");
  // «Mostrar más» y el foco continúa en el siguiente elemento
  await page.locator("#cdLocBuscar").fill("");
  await page.waitForTimeout(250);
  await page.locator("#cdLocMas").click();
  assert.equal(await page.locator("#cdLocLista li").count(), 80);
  assert.deepEqual(errores, []);
  await ctx.close();

  /* ---------- Rutas ---------- */
  for (const [ruta, estado] of [["/canada-en-datos/alberta", 200], ["/canada-en-datos/alberta/calgary", 200], ["/canada-en-datos/alberta/no-existe", 404]]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Alberta: ciudades y pueblos");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
