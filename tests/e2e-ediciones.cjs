/*
  Prueba de extremo a extremo de las ediciones mensuales (fase 1):
  hemeroteca /magazine/ediciones/ en computador, tableta y celular; sin
  ediciones publicadas, ni /magazine/ ni ninguna edición responde, y la
  portada no cambia. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-ediciones.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  celular: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};

(async () => {
  const browser = await chromium.launch();
  for (const [perfil, opts] of Object.entries(PERFILES)) {
    const ctx = await browser.newContext({ ...opts, locale: "es-CA" });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("response", (r) => r.status() >= 400 && !/\/magazine\/(2026-1[01]\/)?$/.test(new URL(r.url()).pathname) && errores.push(`${r.status()} ${r.url()}`));
    const r = await page.goto(BASE + "/magazine/ediciones/", { waitUntil: "networkidle" });
    assert.equal(r.status(), 200);
    assert.equal(await page.locator("h1").textContent(), "Ediciones");
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex", "vacía: no se indexa");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://podcastdelmigrante.com/magazine/ediciones/");
    assert.match(await page.locator(".hem-vacia").textContent(), /Todavía no hay ediciones publicadas/);
    assert.equal(await page.locator(".hem-ed").count(), 0);
    assert.ok(await page.locator("#siteHeader").isVisible(), "cabecera del sitio");
    assert.ok(await page.locator(".site-footer").count(), "pie del sitio");
    assert.match(await page.locator("h1").evaluate((e) => getComputedStyle(e).fontFamily), /Fraunces/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "sin desplazamiento horizontal");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `hemeroteca-${perfil}.png`), fullPage: true });
    /* Sin ediciones publicadas: ni la vigente ni ninguna edición existen */
    for (const ruta of ["/magazine/", "/magazine/2026-10/", "/magazine/2026-11/"]) {
      const resp = await page.request.get(BASE + ruta);
      assert.equal(resp.status(), 404, ruta);
    }
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  /* La portada sigue sin enlazar a las ediciones nuevas (fase 1 sin cambios visibles) */
  const p = await browser.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  assert.equal(await p.locator('a[href*="/magazine/"]').count(), 0);
  await p.close();
  await browser.close();
  console.log("OK ediciones (fase 1): hemeroteca, rutas sin ediciones publicadas y portada sin cambios");
})().catch((e) => { console.error(e); process.exit(1); });
