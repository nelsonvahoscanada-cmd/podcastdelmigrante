/*
  Prueba de extremo a extremo (navegador) de la noticia «Gobierno de Alberta
  ofrece empleo desde casa con salario de hasta $80.375 al año»: noticia
  principal de la portada (Santa Latino pasa a la primera tarjeta), enlace al
  artículo, imagen, recuadro de cierre, botón de postulación a la oferta
  oficial, video de TikTok tras la introducción, metadatos y ausencia de
  desbordes, en computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-empleo-remoto-alberta.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "alberta-empleo-desde-casa-program-eligibility-assessor-2026";
const IMG = `assets/${SLUG}.jpg`;
const OFERTA = "https://jobpostings.alberta.ca/job/Edmonton-Program-Eligibility-Assessor/607379317/";
const TIKTOK = "7702612054762327348";
const TITULO = "Gobierno de Alberta ofrece empleo desde casa con salario de hasta $80.375 al año: solicitudes cierran el 2 de noviembre";
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
    assert.match(await hero.locator(".hero-main__dek").innerText(), /^Una convocatoria oficial abre la posibilidad de trabajar de manera remota dentro de Alberta/);
    assert.equal(await hero.locator(".demo-badge").count(), 0);
    assert.match(await hero.locator(".hero-main__media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 4);
    assert.match(tarjetas[0], /Santa Latino/, "Santa Latino pasa a la primera tarjeta");
    assert.match(tarjetas[1], /bomberos forestales/);
    assert.match(tarjetas[2], /representantes migratorios/);
    assert.match(tarjetas[3], /Alberta votó por permanecer/);
    assert.equal(tarjetas.filter((x) => x.includes("empleo desde casa")).length, 0, "sin duplicados en el bloque principal");
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    /* El titular abre el artículo (clic programático: la portada anima su fondo) */
    assert.match(await hero.locator("h1 a").getAttribute("href"), new RegExp(`articulo(-|\\.html\\?slug=)${SLUG}$`));
    await hero.locator("h1 a").evaluate((a) => a.click());
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const texto = await page.locator("main").innerText();
    for (const d of ["Program Eligibility Assessor", "$61.754 a $80.375 CAD", "lunes 2 de noviembre de 2026", "88299", "30 de junio de 2028", "Empleo en Alberta", "asistida por inteligencia artificial", "Mira el informe de Nelson Vahos", "Ver video en TikTok", "no indica que el empleador ofrezca patrocinio migratorio"]) assert.ok(texto.includes(d), d);
    /* Recuadro de cierre y botones de postulación */
    const cierre = page.locator(".article-deadline");
    assert.equal(await cierre.count(), 1);
    assert.ok(await cierre.isVisible());
    assert.match(await cierre.innerText(), /Lunes 2 de noviembre de 2026[\s\S]*Trabajo remoto solo desde Alberta\. El anuncio no garantiza la contratación ni ofrece patrocinio migratorio\./);
    const botones = page.locator("a.article-apply");
    assert.equal(await botones.count(), 2);
    for (let i = 0; i < 2; i++) {
      const b = botones.nth(i);
      assert.equal((await b.innerText()).replace("↗", "").trim(), "Postularme en el Gobierno de Alberta");
      assert.equal(await b.getAttribute("href"), OFERTA);
      assert.equal(await b.getAttribute("target"), "_blank");
      assert.match(await b.getAttribute("rel"), /noopener/);
      const caja = await b.boundingBox();
      assert.ok(caja.height >= 44, `botón táctil (${caja.height}px)`);
    }
    const colores = await botones.first().evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color]; });
    assert.deepEqual(colores, ["rgb(85, 121, 2)", "rgb(255, 255, 255)"], "verde oscuro con texto blanco");
    assert.equal(await page.locator(`main a[href="${OFERTA}"]`).count(), 3, "dos botones y la fuente oficial");
    if (SHOTS) await cierre.screenshot({ path: path.join(SHOTS, `cierre-${perfil}.png`) });
    /* Video de TikTok: tras la introducción, sin contactar a TikTok hasta pulsar */
    const video = page.locator(".article-video--tiktok");
    assert.equal(await video.count(), 1);
    assert.equal(await page.evaluate(() => { const v = document.querySelector(".article-video--tiktok"); const h = document.querySelector(".article-body h2"); return !!(v && h && v.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) && !!v.previousElementSibling && v.previousElementSibling.classList.contains("article-deadline"); }), true, "después de la introducción y del cierre, antes del primer subtítulo");
    assert.equal(await page.locator('iframe[src*="tiktok.com"]').count(), 0, "sin reproductor antes de pulsar");
    assert.equal(await page.locator(`a.article-tiktok__link[href="https://www.tiktok.com/@podcastdelmigrante/video/${TIKTOK}"]`).count(), 1, "alternativa visible");
    assert.ok(await page.locator("a.article-tiktok__link").isVisible());
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
      errores.length = 0; /* lo que pase dentro del reproductor de TikTok es de TikTok */
    }
    assert.match(await page.locator("main").innerHTML(), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://podcastdelmigrante.com/articulo-${SLUG}`);
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.match(crudo, /property="og:title" content="Gobierno de Alberta ofrece empleo desde casa/);
    assert.equal((await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).status, 200);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  const r = await fetch(`${BASE}/articulo.html?slug=${SLUG}`, { redirect: "manual" });
  assert.ok([301, 308].includes(r.status), `articulo.html?slug=… redirige (${r.status})`);
  await browser.close();
  console.log("OK empleo desde casa en Alberta: portada (principal) y artículo");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
