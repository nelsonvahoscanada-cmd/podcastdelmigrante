/*
  Prueba de extremo a extremo de Entre dos mundos, capítulo 2 («Canadá también
  puede convertirse en un infierno», Nelson Vahos): cabecera de la columna con
  el capítulo, nota editorial, ilustración, ficha del autor, archivo de la
  columna, archivo cronológico, bloque de la columna en la portada y noticia
  principal sin cambios, en computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-entre-dos-mundos-cap2.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "canada-tambien-puede-convertirse-en-un-infierno";
const CAP1 = "el-frio-no-pudo-apagar-mi-senal";
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
  return { ctx, page, errores };
}
async function sinDesborde(page, ruta) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${ruta}: desplazamiento horizontal ${sw} > ${cw}`);
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Artículo ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`);
    assert.equal((await page.locator("h1").first().textContent()).trim(), "Canadá también puede convertirse en un infierno");
    assert.match(await page.locator(".article-dek").textContent(), /^El sueño de Andrés: llegó con 22 años/);
    assert.equal((await page.locator(".column-masthead__name").textContent()).trim(), "Entre dos mundos");
    assert.equal(await page.locator(".column-masthead__name").getAttribute("href"), "columna.html?slug=entre-dos-mundos");
    assert.equal((await page.locator(".column-masthead__chapter").textContent()).trim(), "Capítulo 2");
    assert.equal((await page.locator(".column-masthead__by").textContent()).trim(), "Por Nelson Vahos");
    assert.match(await page.locator(".article-meta").textContent(), /Noviembre 2026/);
    const t = (await page.locator(".article-body").textContent()).replace(/\s+/g, " ");
    assert.match(t, /^\s*Nota editorial: Algunos nombres de esta historia han sido modificados/);
    assert.match(t, /es la posibilidad de volver a vernos\./);
    assert.equal(await page.locator(".article-body a").count(), 0, "sin enlaces en la historia");
    assert.match(await page.locator(".article-hero-media").getAttribute("style"), new RegExp(`assets/${SLUG}\\.jpg`), "ilustración principal");
    assert.match(await page.locator(".article-hero-media").getAttribute("aria-label"), /^Ilustración editorial:/);
    assert.match((await page.locator("main").textContent()).replace(/\s+/g, " "), /Ilustración editorial de El Podcast del Migrante/);
    const ok = await page.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return i.naturalWidth; }, `assets/${SLUG}.jpg`);
    assert.equal(ok, 1600);
    assert.match(await page.locator(".article-author-card").textContent(), /Nelson Vahos/);
    assert.equal(await page.locator(".article-author-card a.btn").getAttribute("href"), "columna.html?slug=entre-dos-mundos");
    /* Lo que leen Facebook y WhatsApp: el HTML servido, sin ejecutar JavaScript */
    assert.ok((await (await page.request.get(`${BASE}/articulo-${SLUG}`)).text()).includes(`property="og:image" content="https://podcastdelmigrante.com/assets/social/${SLUG}.jpg"`));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Capítulo 1 sin cambios en su cabecera ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${CAP1}`));
    assert.equal(await page.locator(".column-masthead__chapter").count(), 0);
    assert.equal((await page.locator("h1").first().textContent()).trim(), "El frío no pudo apagar mi señal");
    await ctx.close();

    /* ---------- Archivo de la columna ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/columna.html?slug=entre-dos-mundos"));
    const filas = await page.locator(".column-entry--published").evaluateAll((as) => as.map((a) => [a.getAttribute("href"), a.textContent.replace(/\s+/g, " ").trim()]));
    assert.equal(filas.length, 2);
    assert.match(filas[0][0], new RegExp(`slug=${CAP1}$`));
    assert.match(filas[1][0], new RegExp(`slug=${SLUG}$`));
    assert.match(filas[1][1], /Noviembre 2026 Canadá también puede convertirse en un infierno/);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `columna-${perfil}.png`), fullPage: true });
    await sinDesborde(page, "/columna");
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Archivo cronológico ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/noticias"));
    assert.equal(await page.locator(`#archivoLista a[href="articulo-${SLUG}"]`).count(), 1, "en el archivo cronológico");
    await ctx.close();

    /* ---------- Portada: noticia principal intacta; bloque de la columna ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/"));
    assert.match(await page.locator("#heroMain h1").innerText(), /^Canadá cambia Express Entry desde el 3 de noviembre/);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 4);
    assert.match(tarjetas[1], /¿Trabajas en Canadá\?/);
    const bloque = page.locator("#columnFeature");
    await bloque.scrollIntoViewIfNeeded();
    assert.equal((await bloque.locator(".column-banner__title a").textContent()).trim(), "Canadá también puede convertirse en un infierno");
    if (SHOTS) await bloque.screenshot({ path: path.join(SHOTS, `portada-columna-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK Entre dos mundos, capítulo 2: artículo, columna, archivo y portada");
})().catch((e) => { console.error(e); process.exit(1); });
