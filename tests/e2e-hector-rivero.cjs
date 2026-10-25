/*
  Prueba de extremo a extremo (navegador) del episodio de Héctor Rivero,
  «Santa Latino»: noticia principal de la portada, carrusel «Podcast del
  Migrante Play», reproducción del video y artículo completo, en
  computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-hector-rivero.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
     YOUTUBE_REAL=1 además espera a que el reproductor de YouTube cargue.
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "hector-rivero-santa-latino-canada";
const VIDEO = "LxTr1Zda3dg";
const TITULO = "Héctor Rivero, el Santa Latino que convirtió su historia migratoria en esperanza para las familias de Canadá";
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
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  /* Sin desplazamiento suave: Playwright espera a que los elementos dejen de moverse */
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  return { ctx, page, errores };
}

async function sinDesborde(page, ruta) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${ruta}: desplazamiento horizontal ${sw} > ${cw}`);
}

/* Pulsa «Reproducir» y comprueba el reproductor de YouTube (sin cookies) del video */
async function reproduce(page, contenedor) {
  const boton = contenedor.locator("[data-video-play]").first();
  await boton.scrollIntoViewIfNeeded();
  await boton.click();
  const iframe = contenedor.locator("iframe").first();
  await iframe.waitFor({ state: "attached" });
  assert.match(await iframe.getAttribute("src"), new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${VIDEO}\\?autoplay=1`));
  const caja = await iframe.boundingBox();
  assert.ok(caja && caja.width > 200 && Math.abs(caja.width / caja.height - 16 / 9) < 0.05, "reproductor horizontal 16:9 (no un Short vertical)");
  if (process.env.YOUTUBE_REAL === "1") {
    const frame = await (await iframe.elementHandle()).contentFrame();
    await frame.waitForSelector("video, .ytp-cued-thumbnail-overlay, .html5-video-player", { timeout: 30000 });
  }
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada: noticia principal ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    const hero = page.locator("#heroMain");
    assert.equal((await hero.locator("h1").innerText()).trim(), TITULO);
    assert.match(await hero.locator(".hero-main__dek").innerText(), /^De Venezuela a Niagara Falls/);
    assert.equal(await hero.locator(".demo-badge").count(), 0);
    const fondo = await hero.locator(".hero-main__media").getAttribute("style");
    assert.match(fondo, new RegExp(`assets/yt/${VIDEO}\\.jpg`));
    assert.equal((await fetch(`${BASE}/assets/yt/${VIDEO}.jpg`)).status, 200);
    assert.match(await page.locator("#heroSecondary .hero-sec-card").first().innerText(), /Alberta votó por permanecer en Canadá/, "la noticia principal anterior sigue en la portada");

    /* ---------- Podcast del Migrante Play (carrusel) ---------- */
    const primera = page.locator("#videoTrack .video-card").first();
    await primera.scrollIntoViewIfNeeded();
    assert.equal((await primera.locator(".video-card__title").innerText()).trim(), "Héctor Rivero, el Santa Latino en Canadá");
    assert.equal(await primera.locator(`[data-video-id="${VIDEO}"]`).count(), 1);
    assert.equal(await primera.locator(`a[href="articulo-${SLUG}"]`).count(), 1, "«Leer el artículo»");
    assert.equal(await primera.locator(`a[href="https://www.youtube.com/watch?v=${VIDEO}"]`).count(), 1, "«Ver en YouTube»");
    assert.equal(await page.locator(`#videoTrack [data-video-id="${VIDEO}"]`).count(), 1, "sin duplicados en el carrusel");
    if (SHOTS) await page.locator("#video").screenshot({ path: path.join(SHOTS, `play-${perfil}.png`) });
    await reproduce(page, primera);
    if (SHOTS) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    }
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);

    /* El titular de la portada abre el artículo completo (una sola URL: /articulo-<slug>).
       En una página recién cargada: el reproductor creado arriba conserva el foco. */
    const portada = await ctx.newPage();
    await portada.goto(BASE + "/", { waitUntil: "networkidle" });
    await portada.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await portada.locator("#heroMain h1 a").click();
    await portada.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo completo ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    assert.equal(await page.locator("article h2, main h2").filter({ hasText: /Un viaje migratorio|El traje de Santa|Diez bicicletas|Un Santa que también|Su próximo sueño|Una historia que va más allá/ }).count(), 6);
    const texto = await page.locator("main").innerText();
    assert.match(texto, /Se trata de un sueño personal, no de una colaboración anunciada con la marca\./);
    assert.match(texto, /Las experiencias personales y aspiraciones se presentan como su testimonio\./);
    assert.equal(await page.locator('main a[href="/#video"]').count(), 1, "enlace a El Podcast del Migrante Play");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://podcastdelmigrante.com/articulo-${SLUG}`);
    /* Lo que leen Facebook y WhatsApp: el HTML del servidor, sin JavaScript */
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.match(crudo, /property="og:title" content="Héctor Rivero, el Santa Latino que convirtió/);
    assert.equal((await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).status, 200);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await reproduce(page, page.locator(`[data-video-id="${VIDEO}"]`).first().locator(".."));
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Una sola URL indexable ---------- */
  const r = await fetch(`${BASE}/articulo.html?slug=${SLUG}`, { redirect: "manual" });
  assert.ok([301, 308].includes(r.status), `articulo.html?slug=… redirige (${r.status})`);
  await browser.close();
  console.log("OK Héctor Rivero: portada, Play, video y artículo");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
