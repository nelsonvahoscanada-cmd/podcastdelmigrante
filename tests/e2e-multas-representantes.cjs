/*
  Prueba de extremo a extremo (navegador) de la noticia «Canadá activa multas
  de hasta $1,5 millones contra representantes migratorios»: tarjeta
  secundaria junto a la principal (Santa Latino sigue primero y bomberos de
  Alberta conserva su tarjeta), enlace al artículo, imagen, fuente de IRCC,
  metadatos y ausencia de desbordes, en computador, tableta y celular.
  Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-multas-representantes.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "multas-representantes-migratorios-canada-2026";
const IMG = "assets/multas-representantes-migratorios-canada-2026.jpg";
const IRCC = "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/10/new-penalties-for-fraudulent-and-unauthorized-immigration-and-citizenship-representatives.html";
const TITULO = "Canadá activa multas de hasta $1,5 millones contra representantes migratorios que incumplan la ley";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  return { ctx, page, errores };
}

async function sinDesborde(page, ruta) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${ruta}: desplazamiento horizontal ${sw} > ${cw}`);
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada: Santa Latino principal, bomberos y luego IRCC ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    assert.match(await page.locator("#heroMain h1").innerText(), /^Héctor Rivero, el Santa Latino/, "Santa Latino sigue primero");
    assert.match(await page.locator("#heroMain").innerHTML(), /assets\/yt\/LxTr1Zda3dg\.jpg/, "imagen de Santa Latino intacta");
    assert.equal(await page.locator('#heroMain a[href*="hector-rivero-santa-latino-canada"]').count() >= 1, true, "enlace de Santa Latino intacto");
    assert.match(await page.locator("#heroSecondary .hero-sec-card").first().innerText(), /bomberos forestales/, "bomberos conserva la primera tarjeta");
    const segunda = page.locator("#heroSecondary .hero-sec-card").nth(1);
    assert.equal((await segunda.locator("h3, h2, .hero-sec-card__title").first().innerText()).trim(), TITULO);
    const enlace = segunda.locator(`a[href*="${SLUG}"]`).first();
    assert.equal(await enlace.count(), 1, "la tarjeta enlaza al artículo");
    assert.match(await segunda.innerHTML(), new RegExp(IMG.replace(/\./g, "\\.")), "usa la miniatura nueva");
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    assert.equal(await page.locator(`#heroMain a[href*="${SLUG}"], #heroSecondary a[href*="${SLUG}"]`).count() >= 1, true);
    const enHero = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(enHero.filter((t) => t.includes("representantes migratorios")).length, 1, "sin duplicados en el bloque principal");
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await enlace.click();
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const texto = await page.locator("main").innerText();
    for (const d of ["$5.000 CAD", "$15.000 CAD", "$1.500.000 CAD", "28 de octubre de 2026", "30 días", "CICC", "no son reales", "Inmigración", "Mira el informe de Nelson Vahos", "Ver video en TikTok"]) assert.ok(texto.includes(d), d);
    assert.equal(await page.locator(`main a[href="${IRCC}"]`).count() >= 1, true, "fuente oficial de IRCC");
    /* Video de TikTok: tras la introducción, sin contactar a TikTok hasta pulsar */
    const video = page.locator(".article-video--tiktok");
    assert.equal(await video.count(), 1);
    assert.equal(await page.evaluate(() => { const v = document.querySelector(".article-video--tiktok"); const h = document.querySelector(".article-body h2"); return !!(v && h && v.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) && !!v.previousElementSibling && v.previousElementSibling.tagName === "P"; }), true, "antes del primer subtítulo, después de la introducción");
    assert.equal(await page.locator('iframe[src*="tiktok.com"]').count(), 0, "sin reproductor antes de pulsar");
    assert.equal(await page.locator(`a.article-tiktok__link[href="https://www.tiktok.com/@podcastdelmigrante/video/7702249778343628052"]`).count(), 1, "alternativa visible");
    assert.ok(await page.locator("a.article-tiktok__link").isVisible());
    const caja = await page.locator(".article-tiktok").boundingBox();
    assert.ok(Math.abs(caja.height / caja.width - 16 / 9) < 0.03, `formato vertical 9:16 (${caja.width}×${caja.height})`);
    const fuentesDespues = await page.evaluate(() => { const v = document.querySelector(".article-video--tiktok"); const f = document.querySelector(".article-sources"); return !!(f && v.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING); });
    assert.ok(fuentesDespues, "las fuentes de IRCC quedan debajo del video");
    if (SHOTS) await video.screenshot({ path: path.join(SHOTS, `video-${perfil}.png`) });
    await page.locator(".article-tiktok__play").click();
    const marco = page.locator('.article-tiktok iframe[src^="https://www.tiktok.com/player/v1/7702249778343628052"]');
    assert.equal(await marco.count(), 1, "reproductor oficial al pulsar");
    if (process.env.TIKTOK_REAL) {
      const f = await (await marco.elementHandle()).contentFrame();
      await f.waitForLoadState("domcontentloaded");
      await f.waitForSelector("video", { timeout: 30000 });
      console.log(`  ${perfil}: reproductor de TikTok cargado con <video>`);
      if (SHOTS) { await page.waitForTimeout(4000); await page.locator(".article-video--tiktok").screenshot({ path: path.join(SHOTS, `video-activo-${perfil}.png`) }); }
    }
    assert.match(await page.locator("main").innerHTML(), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://podcastdelmigrante.com/articulo-${SLUG}`);
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.match(crudo, /property="og:title" content="Canadá activa multas de hasta \$1,5 millones/);
    assert.equal((await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).status, 200);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`) });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  const r = await fetch(`${BASE}/articulo.html?slug=${SLUG}`, { redirect: "manual" });
  assert.ok([301, 308].includes(r.status), `articulo.html?slug=… redirige (${r.status})`);
  await browser.close();
  console.log("OK multas a representantes migratorios: portada (tarjeta secundaria) y artículo");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
