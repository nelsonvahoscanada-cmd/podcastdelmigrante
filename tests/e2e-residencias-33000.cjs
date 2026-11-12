/*
  Prueba de extremo a extremo (navegador) de la noticia principal del
  11-11-2026 «Canadá acelera 33.000 residencias permanentes: 15.100
  trabajadores ya fueron beneficiados. ¿Quiénes califican?»: portada,
  artículo con y sin JavaScript, video de TikTok antes de «¿Quiénes pueden
  beneficiarse realmente?» (sin cargar TikTok al abrir), enlaces oficiales,
  imagen y metadatos para compartir, en computador, tableta y celular. Solo
  lee páginas; no se conecta a TikTok ni a Canada.ca.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-residencias-33000.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "canada-33000-residencias-permanentes-trabajadores-2026";
const VIDEO_ID = "7707075782757190933";
const VIDEO_URL = `https://www.tiktok.com/@podcastdelmigrante/video/${VIDEO_ID}`;
const IMG = `assets/${SLUG}.jpg`;
const TITULO = "Canadá acelera 33.000 residencias permanentes: 15.100 trabajadores ya fueron beneficiados. ¿Quiénes califican?";
const SUBTITULO = "¿Quiénes pueden beneficiarse realmente?";
const OFICIALES = [
  "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/04/filling-labour-gaps-in-smaller-communities-by-accelerating-permanent-residence-for-33000-workers.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/reports-statistics/statistics-open-data/immigration-stats/permanent-residents.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/transparency/committees/cow-may-28-2026/33k-ongoing-one-time-initiative-temporary-resident-permanent-resident-transition.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html",
  "https://www.canada.ca/en/services/immigration-citizenship.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/choose/authorized.html",
];
const DATOS = ["15.100 trabajadores obtuvieron la residencia permanente entre enero y agosto de 2026", "no existe una convocatoria general nueva", "Agri-Food Pilot", "Cuidado con las falsas promesas", "Nota editorial", "Inmigración"];
const PERFILES = { computador: { viewport: { width: 1440, height: 900 } }, tableta: { ...devices["iPad Mini"] }, celular: { ...devices["iPhone 13"] } };

async function abrir(browser, perfil, ruta, js = true) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton", javaScriptEnabled: js });
  const externos = [];
  await ctx.route((u) => /tiktok|canada\.ca/.test(u.hostname), (r) => { externos.push(r.request().url()); r.abort(); });
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
const videoAntesDelSubtitulo = (page) => page.evaluate((sub) => {
  const v = document.querySelector(".article-video--tiktok"), h = [...document.querySelectorAll(".article-body h2")].find((x) => x.textContent.trim() === sub);
  return !!(v && h && v.nextElementSibling === h);
}, SUBTITULO);

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada: noticia principal ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    const hero = page.locator("#heroMain");
    assert.equal((await hero.locator("h1").innerText()).trim(), TITULO);
    assert.match(await hero.innerText(), /11 de noviembre, 2026/);
    assert.match(await hero.locator(".hero-main__media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 5);
    assert.match(tarjetas[0], /\$679/, "la anterior principal pasa a la primera tarjeta");
    assert.equal(tarjetas.filter((x) => x.includes("33.000")).length, 0, "sin duplicados");
    const hb = await hero.boundingBox();
    assert.ok(hb.y < 900 && hb.height > 200, "titular principal visible arriba " + JSON.stringify(hb));
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await hero.locator("h1 a").evaluate((a) => a.click());
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo sin JavaScript (buscadores y asistentes) ---------- */
    let ex;
    ({ ctx, page } = await abrir(browser, perfil, `/articulo-${SLUG}`, false));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    let texto = await page.locator("main").innerText();
    for (const d of DATOS) assert.ok(texto.includes(d), `sin JS: ${d}`);
    assert.ok(await videoAntesDelSubtitulo(page), "sin JS: video antes del subtítulo");
    assert.equal(await page.locator(".article-tiktok__link").getAttribute("href"), VIDEO_URL, "sin JS: enlace «abrir en TikTok»");
    const ld = JSON.parse(await page.locator("#articleJsonLd").textContent());
    assert.equal(ld["@type"], "NewsArticle");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-sin-js-${perfil}.png`), fullPage: true });
    await sinDesborde(page, "sin JS");
    await ctx.close();

    /* ---------- Artículo con JavaScript ---------- */
    ({ ctx, page, errores, externos: ex } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    texto = await page.locator("main").innerText();
    for (const d of DATOS) assert.ok(texto.includes(d), d);
    assert.equal(await page.locator("#articleJsonLd").count(), 1, "un solo NewsArticle");
    assert.ok(await videoAntesDelSubtitulo(page), `video inmediatamente antes de «${SUBTITULO}»`);
    assert.equal(await page.locator(".article-video--tiktok").count(), 1, "un solo reproductor");
    assert.equal(await page.locator(".article-tiktok iframe").count(), 0, "sin reproductor ni autoplay al abrir");
    assert.equal(ex.filter((u) => /tiktok/.test(u)).length, 0, "no contacta a TikTok al abrir");
    assert.equal(await page.locator(".article-tiktok__link").getAttribute("href"), VIDEO_URL);
    const boton = page.locator(`a.article-apply[href="${VIDEO_URL}"]`);
    assert.equal((await boton.innerText()).trim(), "VER VIDEO EN TIKTOK");
    assert.equal(await boton.getAttribute("target"), "_blank");
    const play = page.locator(".article-tiktok__play"); await play.scrollIntoViewIfNeeded();
    assert.ok(await play.isVisible());
    const box = await page.locator(".article-tiktok").boundingBox();
    assert.ok(box.width <= page.viewportSize().width && box.height > 200, "reproductor adaptable " + JSON.stringify(box));
    if (SHOTS) await page.locator(".article-video--tiktok").screenshot({ path: path.join(SHOTS, `video-${perfil}.png`) });
    await play.click();
    assert.match(await page.locator(".article-tiktok iframe").getAttribute("src"), new RegExp(`tiktok\\.com/player/v1/${VIDEO_ID}\\?`));
    errores.length = 0;
    for (const u of OFICIALES) {
      const a = page.locator(`.article-body a[href="${u}"]`);
      assert.ok((await a.count()) >= 1, u);
      assert.equal(await a.first().getAttribute("target"), "_blank");
    }
    assert.match(await page.locator(".article-hero-media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.match(texto, /No es un anuncio oficial del Gobierno de Canadá/);
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, /<title>Canadá acelera 33\.000 residencias permanentes: requisitos y beneficiarios<\/title>/);
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.equal((await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).headers.get("content-type"), "image/jpeg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();

    ({ ctx, page } = await abrir(browser, perfil, "/noticias.html"));
    const enlaces = await page.locator("main a[href*='articulo']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.ok(enlaces.some((h) => h.includes(SLUG)), "aparece en el listado de noticias");
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK 33.000 residencias: portada (principal), artículo con y sin JS, video de TikTok, enlaces oficiales, imagen y redes");
})().catch((e) => { console.error(e); process.exit(1); });
