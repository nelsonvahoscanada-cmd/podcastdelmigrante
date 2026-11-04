/*
  Prueba de extremo a extremo (navegador) de la noticia «Canadá cambia el
  proceso para solicitar refugio: estas son las nuevas reglas desde el 3 de
  noviembre de 2026» (Nelson Vahos): noticia principal de la portada (las
  demás destacadas se conservan), artículo completo, ilustración editorial,
  video de TikTok tras la introducción (con TIKTOK_REAL=1 comprueba que el
  reproductor oficial carga y reproduce el video; con CHANNEL=chrome, que
  avance), recuadro publicitario separado, fuentes oficiales de IRCC,
  metadatos para compartir, contador de visitas y sección Migración, en
  computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-refugio-2026.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "canada-cambios-proceso-refugio-3-noviembre-2026";
const IMG = `assets/${SLUG}.jpg`;
const TIKTOK = "7704144243954060565";
const TITULO = "Canadá cambia el proceso para solicitar refugio: estas son las nuevas reglas desde el 3 de noviembre de 2026";
const OFICIALES = [
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/asylum-process-changes.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11/canada-modernizes-the-asylum-system-to-support-timely-decisions.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/eligibility.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/start/in-canada.html",
];
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
  /* CHANNEL=chrome usa Google Chrome (con los códecs H.264 de TikTok) */
  const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada: noticia principal ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    const hero = page.locator("#heroMain");
    assert.equal((await hero.locator("h1").innerText()).trim(), TITULO);
    assert.match(await hero.locator(".hero-main__dek").innerText(), /^El Gobierno canadiense puso en marcha un procedimiento modernizado/);
    assert.match(await hero.innerText(), /Nelson Vahos · 4 de noviembre, 2026/);
    assert.equal(await hero.locator(".demo-badge").count(), 0);
    assert.match(await hero.locator(".hero-main__media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.match(await hero.locator(".hero-main__media").getAttribute("aria-label"), /^Ilustración editorial/);
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 5, "las demás noticias destacadas se conservan");
    assert.match(tarjetas[0], /Express Entry desde el 3 de noviembre/);
    assert.match(tarjetas[1], /Santa Latino/);
    assert.match(tarjetas[2], /¿Trabajas en Canadá\?/);
    assert.match(tarjetas[3], /bomberos forestales/);
    assert.match(tarjetas[4], /representantes migratorios/);
    assert.equal(tarjetas.filter((x) => x.includes("solicitar refugio")).length, 0, "sin duplicados en el bloque principal");
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    assert.match(await hero.locator("h1 a").getAttribute("href"), new RegExp(`articulo(-|\\.html\\?slug=)${SLUG}$`));
    await hero.locator("h1 a").evaluate((a) => a.click());
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const texto = await page.locator("main").innerText();
    for (const d of ["Nelson Vahos", "Ottawa, Canadá | 4 de noviembre de 2026", "Ley C-12", "24 de junio de 2020", "14 días", "(PRRA)", "Mira el informe en video", "Fuentes oficiales", "no sustituye la asesoría legal o migratoria individualizada", "Ilustración editorial de El Podcast del Migrante", "Migración"]) assert.ok(texto.includes(d), d);
    for (const u of OFICIALES) {
      const enlaces = page.locator(`main a[href="${u}"]`);
      assert.ok((await enlaces.count()) >= 2, `${u}: en el cuerpo y en las fuentes`);
      assert.equal(await enlaces.first().getAttribute("target"), "_blank");
    }
    /* Recuadro publicitario: separado, al final del cuerpo y señalado como publicidad */
    const pub = page.locator("aside.article-patrocinio");
    assert.equal(await pub.count(), 1);
    assert.match(await pub.innerText(), /Publicidad · Reconocimiento a nuestro patrocinador[\s\S]*atención en español[\s\S]*tarjeta de gasolina de \$200 CAD[\s\S]*vehículos nuevos/i);
    assert.equal(await pub.locator('a[href*="utm_content=articulo-refugio"]').count(), 1);
    assert.equal(await page.evaluate(() => { const n = document.querySelector("aside.article-patrocinio"); const f = [...document.querySelectorAll(".article-body p")].find((p) => p.textContent.startsWith("Nota editorial")); return !!(f && n && f.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING); }), true, "después de la nota editorial");
    /* Contador de visitas: hueco presente para esta noticia */
    assert.equal(await page.locator('[data-vistas-id="ART-2026-039"]').count(), 1);
    /* Video de TikTok tras la introducción, sin contactar a TikTok hasta pulsar */
    const video = page.locator(".article-video--tiktok");
    assert.equal(await video.count(), 1);
    assert.equal(await page.evaluate(() => { const v = document.querySelector(".article-video--tiktok"); const h = document.querySelector(".article-body h2"); return !!(v && h && v.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); }), true, "antes del primer subtítulo");
    assert.equal(await page.locator('iframe[src*="tiktok.com"]').count(), 0, "sin reproductor antes de pulsar");
    const boton = page.locator(`a.article-apply[href="https://www.tiktok.com/@podcastdelmigrante/video/${TIKTOK}"]`);
    assert.equal(await boton.count(), 1);
    assert.equal((await boton.innerText()).replace("↗", "").trim(), "▶ Ver el informe en TikTok");
    assert.ok((await boton.boundingBox()).height >= 44, "botón táctil");
    assert.equal(await page.locator(`a.article-tiktok__link[href="https://www.tiktok.com/@podcastdelmigrante/video/${TIKTOK}"]`).count(), 1);
    const caja = await page.locator(".article-tiktok").boundingBox();
    assert.ok(Math.abs(caja.height / caja.width - 16 / 9) < 0.03, `formato vertical 9:16 (${caja.width}×${caja.height})`);
    if (SHOTS) await video.screenshot({ path: path.join(SHOTS, `video-${perfil}.png`) });
    assert.deepEqual(errores, [], "sin errores antes de cargar el reproductor de TikTok");
    await page.locator(".article-tiktok__play").click();
    const marco = page.locator(`.article-tiktok iframe[src^="https://www.tiktok.com/player/v1/${TIKTOK}"]`);
    assert.equal(await marco.count(), 1, "reproductor oficial al pulsar");
    if (process.env.TIKTOK_REAL) {
      const f = await (await marco.elementHandle()).contentFrame();
      await f.waitForLoadState("domcontentloaded");
      await f.waitForSelector("video", { timeout: 30000 });
      await page.waitForTimeout(3000);
      const estado = await f.evaluate(async () => {
        const v = document.querySelector("video");
        if (v.paused) { v.muted = true; await v.play().catch(() => {}); }
        const t0 = v.currentTime;
        await new Promise((r) => setTimeout(r, 3000));
        return { readyState: v.readyState, avanza: v.currentTime > t0, ancho: v.videoWidth, alto: v.videoHeight };
      });
      console.log(`  ${perfil}: reproductor de TikTok`, JSON.stringify(estado));
      if (process.env.CHANNEL) assert.ok(estado.avanza && estado.alto > estado.ancho, "el video se reproduce y es vertical");
      if (SHOTS) { await page.waitForTimeout(4000); await video.screenshot({ path: path.join(SHOTS, `video-activo-${perfil}.png`) }); }
    }
    errores.length = 0; /* lo que pase dentro del reproductor de TikTok es de TikTok */
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://podcastdelmigrante.com/articulo-${SLUG}`);
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.match(crudo, /<title>Canadá cambia el proceso de refugio desde el 3 de noviembre de 2026/);
    const social = await fetch(`${BASE}/assets/social/${SLUG}.jpg`);
    assert.equal(social.status, 200);
    assert.equal(social.headers.get("content-type"), "image/jpeg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Sección Migración ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/guia.html?categoria=migracion"));
    const orden = await page.locator("main a[href*='articulo']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.match(orden[0], new RegExp(SLUG), "primera de las últimas publicaciones de Migración");
    await sinDesborde(page, "/guia.html?categoria=migracion");
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK Refugio 2026: portada (principal), artículo, video, publicidad separada, fuentes, redes y Migración");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
