/*
  Prueba de extremo a extremo (navegador) de la noticia «Alberta busca
  bomberos forestales para 2027»: segunda posición de la portada (Santa
  Latino sigue primero), enlace al artículo, imagen, metadatos y ausencia de
  desbordes, en computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-alberta-bomberos.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "alberta-bomberos-forestales-2027";
const IMG = "assets/alberta-bomberos-forestales-2027.jpg";
const TITULO = "Alberta busca bomberos forestales para 2027 con salarios de hasta $31,02 por hora: convocatoria abierta";
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
    /* ---------- Portada: 1.º Santa Latino, 2.º Alberta ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    assert.match(await page.locator("#heroMain h1").innerText(), /^Héctor Rivero, el Santa Latino/, "Santa Latino sigue primero");
    const segunda = page.locator("#heroSecondary .hero-sec-card").first();
    assert.equal((await segunda.locator("h3, h2, .hero-sec-card__title").first().innerText()).trim(), TITULO);
    const enlace = segunda.locator(`a[href*="${SLUG}"]`).first();
    assert.equal(await enlace.count(), 1, "la tarjeta enlaza al artículo");
    assert.match(await segunda.innerHTML(), new RegExp(IMG.replace(/\./g, "\\.")), "usa la miniatura nueva");
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    assert.equal(await page.locator(`#heroMain a[href*="${SLUG}"], #heroSecondary a[href*="${SLUG}"]`).count() >= 1, true);
    const enHero = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(enHero.filter((t) => t.includes("bomberos forestales")).length, 1, "sin duplicados en el bloque principal");
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
    for (const d of ["$24,52", "$31,02", "30 de noviembre de 2026", "La oferta no anuncia patrocinio migratorio", "No es una fotografía"]) assert.ok(texto.includes(d), d);
    assert.equal(await page.locator('main a[href="https://jobpostings.alberta.ca/job/Various-Wildfire-Crew-Member/606646017/"]').count() >= 1, true);
    assert.equal(await page.locator('main a[href="https://www.alberta.ca/alberta-wildfire-recruitment"]').count() >= 1, true);
    assert.match(await page.locator("main").innerHTML(), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://podcastdelmigrante.com/articulo-${SLUG}`);
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.match(crudo, /property="og:title" content="Alberta busca bomberos forestales para 2027/);
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
  console.log("OK Alberta bomberos forestales: portada (2.ª posición) y artículo");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
