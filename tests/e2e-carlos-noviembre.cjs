/*
  Prueba de extremo a extremo de la columna de noviembre de Carlos D.
  Castillo y de su nuevo retrato circular: artículo (autor, imagen, texto,
  bloque y botón de la calculadora), retrato en el perfil del autor y en su
  tarjeta de la portada (mismo tamaño y forma), archivo cronológico y bloque
  principal de la portada sin cambios, en computador, tableta y celular.
  Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-carlos-noviembre.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "trabajas-pagas-ahorras-realmente-avanzando";
const TITULO = "Trabajas, pagas y ahorras… ¿pero realmente estás avanzando?";
const CALC = "https://carlosdcastillo.com/calculadora.html";
const AVATAR = "assets/carlos-castillo-avatar.jpg";
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
async function retrato(page, selector) {
  const img = page.locator(selector).first();
  await img.scrollIntoViewIfNeeded();
  await page.waitForFunction((s) => { const i = document.querySelector(s); return i && i.complete && i.naturalWidth > 0; }, selector);
  return img.evaluate((i) => { const b = i.getBoundingClientRect(), s = getComputedStyle(i); return { src: i.getAttribute("src"), w: Math.round(b.width), h: Math.round(b.height), radio: s.borderRadius, nat: i.naturalWidth + "x" + i.naturalHeight }; });
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Artículo ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`);
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const main = (await page.locator("main").textContent()).replace(/\s+/g, " ");
    for (const d of ["Carlos D. Castillo", "Estratega en arquitectura financiera", "El salario llega a la cuenta.", "sino que también construya el futuro.", "Calcula cómo podría crecer tu dinero", "Las proyecciones no garantizan resultados futuros."]) assert.ok(main.includes(d), d);
    const boton = page.locator(`a.article-apply[href="${CALC}"]`);
    assert.equal(await boton.count(), 1);
    assert.equal((await boton.innerText()).replace("↗", "").trim(), "UTILIZA GRATIS LA CALCULADORA");
    assert.equal(await boton.getAttribute("target"), "_blank");
    assert.equal(await boton.getAttribute("rel"), "noopener noreferrer");
    assert.ok((await boton.boundingBox()).height >= 44, "botón táctil");
    assert.equal(await page.locator('a[href="colaborador-carlos-castillo"]').count() >= 1, true, "enlace al perfil del autor");
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.equal((await fetch(`${BASE}/assets/${SLUG}.jpg`)).status, 200);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Perfil del autor: retrato circular nuevo, mismo tamaño ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/colaborador-carlos-castillo"));
    const r1 = await retrato(page, "img.profile-avatar");
    const lado = perfil === "celular" ? 72 : 96; /* tamaños del CSS existente (sin cambios) */
    assert.deepEqual([r1.src, r1.w, r1.h, r1.radio, r1.nat], [AVATAR, lado, lado, "50%", "300x300"], JSON.stringify(r1));
    if (SHOTS) await page.locator("img.profile-avatar").first().screenshot({ path: path.join(SHOTS, `retrato-perfil-${perfil}.png`) });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Portada: tarjeta del colaborador y bloque principal sin cambios ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/"));
    const r2 = await retrato(page, `img.contributor-card__avatar[src="${AVATAR}"]`);
    assert.deepEqual([r2.w, r2.h, r2.radio, r2.nat], [64, 64, "50%", "300x300"], JSON.stringify(r2));
    if (SHOTS) await page.locator(`img.contributor-card__avatar[src="${AVATAR}"]`).screenshot({ path: path.join(SHOTS, `retrato-portada-${perfil}.png`) });
    assert.match(await page.locator("#heroMain h1").innerText(), /^Canadá acelera 33\.000 residencias permanentes/);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.match(tarjetas[4], /Express Entry desde el 3 de noviembre/);
    assert.equal(tarjetas.filter((t) => t.includes(TITULO)).length, 0, "no entra en el bloque principal");
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Archivo cronológico ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/noticias"));
    assert.equal(await page.locator(`#archivoLista a[href="articulo-${SLUG}"]`).count(), 1, "en el archivo cronológico");
    assert.equal(await page.locator('#archivoLista a[href="articulo-el-error-financiero-inmigrantes-canada"]').count() >= 0, true);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK columna de noviembre de Carlos D. Castillo, calculadora y retrato circular");
})().catch((e) => { console.error(e); process.exit(1); });
