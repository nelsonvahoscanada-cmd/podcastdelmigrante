/*
  Prueba de extremo a extremo (navegador) de la noticia principal del
  9-11-2026 «Canadá propone hasta $679 adicionales para ayudar a las familias
  con el costo de los alimentos»: portada, artículo completo, video de TikTok
  tras la introducción (sin cargar TikTok al abrir), enlaces oficiales,
  patrocinio separado, imagen y metadatos para compartir, en computador,
  tableta y celular. Solo lee páginas; no se conecta a TikTok ni a Canada.ca.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-suplemento-alimentos.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "canada-suplemento-alimentos-679-presupuesto-2026";
const VIDEO_URL = "https://www.tiktok.com/@podcastdelmigrante/video/7706353073295297813";
const OFICIALES = [
  "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit.html",
  "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit/who-eligible.html",
  "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit/get-benefit.html",
  "https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/rc151.html",
  "https://budget.canada.ca/2026/report-rapport/chap3-en.html",
];
const IMG = `assets/${SLUG}.jpg`;
const TITULO = "Canadá propone hasta $679 adicionales para ayudar a las familias con el costo de los alimentos";
const PERFILES = { computador: { viewport: { width: 1440, height: 900 } }, tableta: { ...devices["iPad Mini"] }, celular: { ...devices["iPhone 13"] } };

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" });
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

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    /* Desde el 11-11-2026 es la primera tarjeta destacada (principal: 33.000 residencias) */
    assert.match(await page.locator("#heroMain h1").innerText(), /^Canadá acelera 33\.000 residencias permanentes/);
    const hero = page.locator("#heroSecondary .hero-sec-card").first();
    assert.ok((await hero.innerText()).includes(TITULO));
    assert.match(await hero.innerText(), /9 de noviembre/);
    assert.match(await hero.locator(".hero-sec-card__media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 5);
    assert.match(tarjetas[1], /pagar el alquiler/);
    assert.match(tarjetas[2], /masterclass gratuita/);
    assert.equal(tarjetas.filter((x) => x.includes("$679")).length, 1, "sin duplicados");
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await hero.locator(`a[href*="${SLUG}"]`).first().evaluate((a) => a.click());
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo ---------- */
    let ex;
    ({ ctx, page, errores, externos: ex } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const texto = await page.locator("main").innerText();
    for (const d of ["Hasta $679 CAD para una pareja con dos hijos.", "Hasta $339 CAD para una persona soltera sin hijos.", "todavía es una propuesta presupuestaria", "principios de 2027", "pago único", "No existe una solicitud específica abierta", "RC151", "No constituyen una inscripción al suplemento extraordinario de $679.", "Nota editorial", "Finanzas"]) assert.ok(texto.includes(d), d);
    /* Video: tras la introducción, justo antes de «¿Cuánto dinero adicional…?», sin cargar TikTok al abrir */
    const orden = await page.evaluate(() => {
      const v = document.querySelector(".article-video--tiktok"), h = [...document.querySelectorAll(".article-body h2")].find((x) => x.textContent.includes("¿Cuánto dinero adicional"));
      return !!(v && h && v.nextElementSibling === h);
    });
    assert.ok(orden, "video inmediatamente antes de «¿Cuánto dinero adicional propone entregar Canadá?»");
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
    assert.match(await page.locator(".article-tiktok iframe").getAttribute("src"), /tiktok\.com\/player\/v1\/7706353073295297813\?/);
    errores.length = 0;
    /* Enlaces oficiales, en pestaña nueva */
    for (const u of OFICIALES) {
      const a = page.locator(`.article-body a[href="${u}"]`);
      assert.ok((await a.count()) >= 1, u);
      assert.equal(await a.first().getAttribute("target"), "_blank");
    }
    /* Patrocinio separado y señalado como publicidad */
    const pub = page.locator("aside.article-patrocinio");
    assert.equal(await pub.count(), 1);
    assert.match(await pub.innerText(), /Publicidad/i);
    assert.match(await pub.innerText(), /sujeta a confirmación de las condiciones/);
    if (SHOTS) await pub.screenshot({ path: path.join(SHOTS, `publicidad-${perfil}.png`) });
    /* Imagen principal y metadatos */
    assert.match(await page.locator(".article-hero-media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, /<title>Canadá propone hasta \$679 más para alimentos: suplemento 2027<\/title>/);
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.match(crudo, /property="og:title" content="Canadá propone hasta \$679 adicionales/);
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
  console.log("OK suplemento de alimentos: portada (principal), artículo, video de TikTok, enlaces oficiales, patrocinio, imagen y redes");
})().catch((e) => { console.error(e); process.exit(1); });
