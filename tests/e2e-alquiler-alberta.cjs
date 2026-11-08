/*
  Prueba de extremo a extremo (navegador) de la noticia principal del
  8-11-2026 «¿Vives en Alberta y no te alcanza para pagar el alquiler? …»:
  portada, artículo completo, video de TikTok antes de «¿Quiénes pueden
  solicitar esta ayuda?» (sin cargar TikTok al abrir), enlaces oficiales,
  imagen y metadatos para compartir, en computador, tableta y celular.
  Solo lee páginas; no se conecta a TikTok ni a Alberta.ca.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-alquiler-alberta.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "alberta-rent-assistance-benefit-ayuda-alquiler";
const IMG = `assets/${SLUG}.jpg`;
const TITULO = "¿Vives en Alberta y no te alcanza para pagar el alquiler? Conoce la ayuda mensual que ofrece el Gobierno";
const PERFILES = { computador: { viewport: { width: 1440, height: 900 } }, tableta: { ...devices["iPad Mini"] }, celular: { ...devices["iPhone 13"] } };

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" });
  const externos = [];
  await ctx.route((u) => /tiktok|alberta\.ca/.test(u.hostname), (r) => { externos.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores, externos };
}
async function sinDesborde(page, ruta) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${ruta}: desplazamiento horizontal ${sw} > ${cw}`);
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    const hero = page.locator("#heroMain");
    assert.equal((await hero.locator("h1").innerText()).trim(), TITULO);
    assert.match(await hero.innerText(), /El Podcast del Migrante · 8 de noviembre, 2026/);
    assert.match(await hero.locator(".hero-main__media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 5);
    assert.match(tarjetas[0], /masterclass gratuita/);
    assert.equal(tarjetas.filter((x) => x.includes("alquiler")).length, 0, "sin duplicados");
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await hero.locator("h1 a").evaluate((a) => a.click());
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo ---------- */
    let ex;
    ({ ctx, page, errores, externos: ex } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const texto = await page.locator("main").innerText();
    for (const d of ["Rent Assistance Benefit", "¿Quiénes pueden solicitar esta ayuda?", "Temporary Rent Assistance Benefit", "Paso 3. Solicitar el formulario correspondiente.", "1-877-644-9992", "Nota editorial", "Vivienda"]) assert.ok(texto.includes(d), d);
    /* Video: justo antes de «¿Quiénes pueden solicitar esta ayuda?», sin cargar TikTok al abrir */
    const orden = await page.evaluate(() => {
      const v = document.querySelector(".article-video--tiktok"), h = [...document.querySelectorAll(".article-body h2")].find((x) => x.textContent.includes("¿Quiénes pueden"));
      return !!(v && h && v.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING && v.nextElementSibling === h);
    });
    assert.ok(orden, "video inmediatamente antes de «¿Quiénes pueden solicitar esta ayuda?»");
    assert.equal(await page.locator(".article-tiktok iframe").count(), 0, "sin reproductor ni autoplay al abrir");
    assert.equal(ex.filter((u) => /tiktok/.test(u)).length, 0, "no contacta a TikTok al abrir");
    assert.equal(await page.locator('.article-tiktok__link').getAttribute("href"), "https://www.tiktok.com/@podcastdelmigrante/video/7705912617230945557");
    const play = page.locator(".article-tiktok__play"); await play.scrollIntoViewIfNeeded();
    assert.ok(await play.isVisible());
    const box = await page.locator(".article-tiktok").boundingBox();
    assert.ok(box.width <= page.viewportSize().width && box.height > 200, "reproductor adaptable " + JSON.stringify(box));
    if (SHOTS) await page.locator(".article-video--tiktok").screenshot({ path: path.join(SHOTS, `video-${perfil}.png`) });
    await play.click();
    assert.match(await page.locator(".article-tiktok iframe").getAttribute("src"), /tiktok\.com\/player\/v1\/7705912617230945557\?/);
    errores.length = 0;
    /* Enlaces oficiales */
    const fh = page.locator('a.article-apply[href="https://findhousing.alberta.ca/"]');
    assert.equal(await fh.count(), 1);
    assert.equal(await fh.getAttribute("target"), "_blank");
    assert.ok((await page.locator('main a[href="https://www.alberta.ca/rent-assistance"]').count()) >= 2);
    /* Imagen principal y metadatos */
    assert.match(await page.locator(".article-hero-media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, /<title>Ayuda para pagar el alquiler en Alberta: Rent Assistance Benefit<\/title>/);
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.match(crudo, /property="og:title" content="¿Vives en Alberta y no te alcanza para pagar el alquiler\?/);
    assert.equal((await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).headers.get("content-type"), "image/jpeg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* La sección «Vivienda» del menú aún está pendiente (sin página propia):
       la noticia queda en la categoría Vivienda del artículo y del listado. */
    ({ ctx, page } = await abrir(browser, perfil, "/noticias.html"));
    const enlaces = await page.locator("main a[href*='articulo']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.ok(enlaces.some((h) => h.includes(SLUG)), "aparece en el listado de noticias");
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK alquiler en Alberta: portada (principal), artículo, video de TikTok, enlaces oficiales, imagen y redes");
})().catch((e) => { console.error(e); process.exit(1); });
