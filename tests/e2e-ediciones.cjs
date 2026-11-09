/*
  Prueba de extremo a extremo de las ediciones mensuales: Edición 01
  (octubre de 2026) publicada. En computador, tableta y celular:
  hemeroteca, /magazine/2026-10/ (11 piezas, enlaces, imágenes, editorial,
  portada y metadatos para redes), /magazine/ vigente, ningún borrador
  público y el bloque de edición de la portada del sitio. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-ediciones.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SITE = "https://podcastdelmigrante.com";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  celular: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};

async function imagenesCargadas(page) {
  await page.evaluate(() => document.querySelectorAll("img").forEach((i) => (i.loading = "eager")));
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30000 });
  return page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src));
}

(async () => {
  const browser = await chromium.launch();
  for (const [perfil, opts] of Object.entries(PERFILES)) {
    const ctx = await browser.newContext({ ...opts, locale: "es-CA" });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("response", (r) => r.status() >= 400 && !/\/magazine\/2026-11\/$/.test(new URL(r.url()).pathname) && errores.push(`${r.status()} ${r.url()}`));

    /* Hemeroteca */
    let r = await page.goto(BASE + "/magazine/ediciones/", { waitUntil: "networkidle" });
    assert.equal(r.status(), 200);
    assert.equal(await page.locator("h1").textContent(), "Ediciones");
    assert.equal(await page.locator('meta[name="robots"]').count(), 0, "la hemeroteca con ediciones se indexa");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${SITE}/magazine/ediciones/`);
    assert.equal(await page.locator(".hem-ed").count(), 1);
    assert.equal(await page.locator(".hem-ed a").getAttribute("href"), "/magazine/2026-10/");
    assert.deepEqual(await imagenesCargadas(page), []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "hemeroteca sin desplazamiento horizontal");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `hemeroteca-${perfil}.png`), fullPage: true });

    /* Edición 01 */
    r = await page.goto(BASE + "/magazine/2026-10/", { waitUntil: "networkidle" });
    assert.equal(r.status(), 200);
    assert.equal(await page.locator('meta[name="robots"]').count(), 0);
    assert.equal(await page.locator(".ed-borrador").count(), 0, "sin aviso de borrador");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${SITE}/magazine/2026-10/`);
    assert.match(await page.locator("h1").textContent(), /Nace una nueva voz para los migrantes en Canadá/);
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), `${SITE}/assets/ediciones/2026-10/magazine-portada-octubre-2026-social.jpg`);
    assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute("content"), "1200");
    assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute("content"), "630");
    assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute("content"), `${SITE}/assets/ediciones/2026-10/magazine-portada-octubre-2026-social.jpg`);
    assert.equal(await page.locator(".ed-portada img").getAttribute("src"), "/assets/ediciones/2026-10/magazine-portada-octubre-2026.webp");
    assert.match(await page.locator(".ed-editorial").textContent(), /Nelson Vahos, director[\s\S]*Esto apenas empieza\./);
    assert.equal(await page.locator(".ed-seccion").count(), 4);
    const enlaces = await page.locator(".ed-pieza__enlace").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.equal(enlaces.length, 11);
    assert.deepEqual(await imagenesCargadas(page), [], "portada e imágenes de las 11 piezas");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "edición sin desplazamiento horizontal");
    if (perfil === "computador") {
      for (const href of enlaces) {
        assert.match(href, /^\/articulo-[a-z0-9-]+$/, href);
        assert.equal((await page.request.get(BASE + href)).status(), 200, href);
      }
    }
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `edicion-01-${perfil}.png`), fullPage: true });

    /* Vigente y borradores */
    r = await page.goto(BASE + "/magazine/", { waitUntil: "networkidle" });
    assert.equal(r.status(), 200);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${SITE}/magazine/2026-10/`);
    assert.equal((await page.request.get(BASE + "/magazine/2026-11/")).status(), 404, "noviembre no es público");

    /* Bloque de edición de la portada del sitio */
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const bloque = page.locator("#edicion");
    await bloque.scrollIntoViewIfNeeded();
    assert.doesNotMatch(await bloque.textContent(), /Portada en preparación/);
    assert.equal(await bloque.locator(".edition-cover").getAttribute("href"), "/magazine/2026-10/");
    await page.waitForFunction(() => { const i = document.querySelector("#edicion .edition-cover img"); return i && i.complete && i.naturalWidth > 0; });
    assert.equal(await bloque.locator(".edition-title").textContent(), "Nace una nueva voz para los migrantes en Canadá");
    assert.equal(await bloque.locator(".btn", { hasText: "Ver edición" }).getAttribute("href"), "/magazine/2026-10/");
    assert.equal(await bloque.locator(".btn-outline", { hasText: "Archivo de ediciones" }).getAttribute("href"), "/magazine/ediciones/");
    assert.equal(await bloque.locator(".edition-month.is-active").getAttribute("href"), "/magazine/2026-10/");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "portada sin desplazamiento horizontal");
    if (SHOTS) await bloque.screenshot({ path: path.join(SHOTS, `bloque-edicion-${perfil}.png`) });

    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK ediciones: Edición 01 publicada, hemeroteca, /magazine/ vigente, sin borradores públicos y bloque de la portada");
})().catch((e) => { console.error(e); process.exit(1); });
