/*
  Prueba de extremo a extremo (navegador) de la noticia «Canadá cambia Express
  Entry desde el 3 de noviembre: algunos inmigrantes podrán obtener hasta 150
  puntos»: noticia principal de la portada (las 4 destacadas siguen en su
  orden), enlace al artículo, imagen aprobada, video de TikTok tras la
  introducción y botón «▶ Ver la noticia en TikTok», fuentes oficiales de IRCC,
  metadatos, sección Migración y ausencia de desbordes, en computador, tableta
  y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-express-entry-150.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "canada-cambios-express-entry-3-noviembre-2026";
const IMG = `assets/${SLUG}.jpg`;
const COMUNICADO = "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/10/canada-refocusing-express-entry-on-top-talent-that-drives-economic-growth.html";
const CAMBIOS = "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/changes.html";
const TIKTOK = "7703729347294661908";
const TITULO = "Canadá cambia Express Entry desde el 3 de noviembre: algunos inmigrantes podrán obtener hasta 150 puntos";
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
  const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada: primera noticia destacada ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    const hero = page.locator("#heroMain");
    assert.equal((await hero.locator("h1").innerText()).trim(), TITULO);
    assert.match(await hero.locator(".hero-main__dek").innerText(), /^El Gobierno federal modificará el sistema de puntuación/);
    assert.match(await hero.innerText(), /2 de noviembre, 2026/);
    assert.equal(await hero.locator(".demo-badge").count(), 0);
    assert.match(await hero.locator(".hero-main__media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 4);
    assert.match(tarjetas[0], /Santa Latino/);
    assert.match(tarjetas[1], /bomberos forestales/);
    assert.match(tarjetas[2], /representantes migratorios/);
    assert.match(tarjetas[3], /Alberta votó por permanecer/);
    assert.equal(tarjetas.filter((x) => x.includes("Express Entry desde el 3")).length, 0, "sin duplicados en el bloque principal");
    /* La portada de la Edición 01 sigue en su bloque */
    assert.equal(await page.locator('#edicion img[src="/assets/ediciones/2026-10/portada.jpg"]').count(), 1);
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
    for (const d of ["martes 3 de noviembre de 2026", "150 puntos para candidatos sin cónyuge acompañante", "140 puntos para quienes tengan cónyuge", "no se acumulan entre sí", "no significa que cualquier oferta laboral otorgue puntos", "hasta dos semanas", "pausará temporalmente las rondas de invitaciones", "no garantiza una invitación", "no constituye asesoría migratoria individual", "Mira la noticia en video", "Migración"]) assert.ok(texto.includes(d), d);
    for (const u of [COMUNICADO, CAMBIOS]) {
      const enlaces = page.locator(`main a[href="${u}"]`);
      assert.ok((await enlaces.count()) >= 2, `${u}: en el cuerpo y en las fuentes`);
      assert.equal(await enlaces.first().getAttribute("target"), "_blank");
    }
    /* Video de TikTok tras la introducción, sin contactar a TikTok hasta pulsar */
    const video = page.locator(".article-video--tiktok");
    assert.equal(await video.count(), 1);
    assert.equal(await page.evaluate(() => { const v = document.querySelector(".article-video--tiktok"); const h = document.querySelector(".article-body h2"); return !!(v && h && v.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); }), true, "antes del primer subtítulo");
    assert.equal(await page.locator('iframe[src*="tiktok.com"]').count(), 0, "sin reproductor antes de pulsar");
    const boton = page.locator(`a.article-apply[href="https://www.tiktok.com/@podcastdelmigrante/video/${TIKTOK}"]`);
    assert.equal(await boton.count(), 1);
    assert.equal((await boton.innerText()).replace("↗", "").trim(), "▶ Ver la noticia en TikTok");
    assert.equal(await boton.getAttribute("target"), "_blank");
    assert.ok((await boton.boundingBox()).height >= 44, "botón táctil");
    assert.equal(await page.locator(`a.article-tiktok__link[href="https://www.tiktok.com/@podcastdelmigrante/video/${TIKTOK}"]`).count(), 1);
    const caja = await page.locator(".article-tiktok").boundingBox();
    assert.ok(Math.abs(caja.height / caja.width - 16 / 9) < 0.03, `formato vertical 9:16 (${caja.width}×${caja.height})`);
    if (SHOTS) await video.screenshot({ path: path.join(SHOTS, `video-${perfil}.png`) });
    assert.deepEqual(errores, [], "sin errores antes de cargar el reproductor de TikTok");
    await page.locator(".article-tiktok__play").click();
    assert.equal(await page.locator(`.article-tiktok iframe[src^="https://www.tiktok.com/player/v1/${TIKTOK}"]`).count(), 1, "reproductor oficial al pulsar");
    errores.length = 0; /* lo que pase dentro del reproductor de TikTok es de TikTok */
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://podcastdelmigrante.com/articulo-${SLUG}`);
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.match(crudo, /<title>Canadá cambia Express Entry desde el 3 de noviembre de 2026/);
    assert.equal((await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).status, 200);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Sección Migración ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/guia.html?categoria=migracion"));
    const enlace = page.locator(`main a[href*="${SLUG}"]`).first();
    assert.equal(await enlace.count(), 1, "aparece en Migración");
    const orden = await page.locator("main a[href*='articulo']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.match(orden[0], new RegExp(SLUG), "primera de las últimas publicaciones de Migración");
    await sinDesborde(page, "/guia.html?categoria=migracion");
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK Express Entry 150 puntos: portada (principal), artículo, video, fuentes y Migración");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
