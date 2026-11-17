/*
  Prueba de extremo a extremo: noticia principal del 16-11-2026 «¿Recién
  llegado a Canadá? Podrías recibir ayudas económicas sin haber declarado
  impuestos» (CGEB y CCB). Portada (principal), artículo con y sin
  JavaScript, enlaces oficiales visibles a RC151 y RC66, tabla legible,
  sin video, sin desbordes en iPhone SE, iPhone 13, iPhone 14 Pro Max y
  computador. Las estadísticas no se tocan: /api/* y sendBeacon se responden
  localmente y no se sale a internet.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-cra-recien-llegados.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "recien-llegados-canada-beneficios-cra-cgeb-ccb";
const IMG = `assets/${SLUG}.jpg`;
const TITULO = "🇨🇦 ¿Recién llegado a Canadá? Podrías recibir ayudas económicas sin haber declarado impuestos";
const CRA = "https://www.canada.ca/en/revenue-agency/services/";
const RC151 = `${CRA}forms-publications/forms/rc151.html`;
const RC66 = `${CRA}forms-publications/forms/rc66.html`;
const PERFILES = {
  "iPhone SE": devices["iPhone SE"],
  "iPhone 13": devices["iPhone 13"],
  "iPhone 14 Pro Max": devices["iPhone 14 Pro Max"],
  computador: { viewport: { width: 1440, height: 900 } },
};

async function abrir(browser, perfil, ruta, js = true) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], javaScriptEnabled: js, locale: "es-CA", timezoneId: "America/Edmonton", reducedMotion: "reduce" });
  await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  await ctx.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
  await ctx.addInitScript(() => { navigator.sendBeacon = () => true; });
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
    /* ---------- Portada: noticia principal ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    const hero = page.locator("#heroMain");
    assert.equal((await hero.locator("h1").innerText()).trim(), TITULO);
    assert.match(await hero.innerText(), /16 de noviembre, 2026/);
    assert.match(await hero.innerText(), /Economía e inmigración/);
    assert.match(await hero.locator(".hero-main__media").getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 5);
    assert.match(tarjetas[0], /33\.000 residencias/, "la anterior principal pasa a la primera tarjeta");
    assert.equal(tarjetas.filter((x) => x.includes("Recién llegado")).length, 0, "sin duplicados");
    const hb = await hero.boundingBox();
    assert.ok(hb.y < 900 && hb.height > 200, "titular principal visible arriba " + JSON.stringify(hb));
    assert.equal(await page.locator("#latestList .latest-row").count(), 5, "«Últimas noticias» intacta");
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil.replace(/\s+/g, "-")}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await hero.locator("h1 a").evaluate((a) => a.click());
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const texto = await page.locator("main").innerText();
    for (const d of ["Canada Groceries and Essentials Benefit", "Canada Child Benefit", "$8,157 CAD", "$6,883 CAD", "18 meses", "RC151", "RC66", "Aviso legal", "Economía e inmigración"]) assert.ok(texto.includes(d), d);
    for (const u of [RC151, RC66]) {
      const a = page.locator(`main .article-body a[href="${u}"]`).first();
      assert.ok(await a.isVisible(), `${u}: visible`);
      const b = await a.boundingBox();
      assert.ok(b && b.width > 20 && b.height >= 12, `${u}: se puede tocar`);
      assert.match((await a.innerText()).replace(/\s+/g, ""), /canada\.ca/, `${u}: dirección escrita`);
    }
    assert.equal(await page.locator(".article-video, iframe").count(), 0, "sin video inventado");
    const tabla = await page.locator(".article-body table").evaluate((t) => { const r = t.getBoundingClientRect(); return { r: r.right, w: document.documentElement.clientWidth }; });
    assert.ok(tabla.r <= tabla.w + 1, `tabla dentro de la pantalla (${tabla.r} > ${tabla.w})`);
    await sinDesborde(page, `/articulo-${SLUG}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil.replace(/\s+/g, "-")}.png`) });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Sin JavaScript (WhatsApp, Facebook y buscadores) ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`, false));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    for (const u of [RC151, RC66]) assert.ok(await page.locator(`a[href="${u}"]`).count() >= 1, `${u} sin JS`);
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), `https://podcastdelmigrante.com/assets/social/${SLUG}.jpg`);
    assert.equal((await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).status, 200);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK beneficios de la CRA: portada (principal), artículo con y sin JS, RC151 y RC66 visibles, sin video, imagen y redes");
})().catch((e) => { console.error(e); process.exit(1); });
