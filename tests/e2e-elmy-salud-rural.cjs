/*
  Prueba de extremo a extremo del artículo de Elmy Castillo (salud rural vs
  urbana): versión en español y original en inglés, botones ES/EN entre ambas,
  recursos oficiales, aviso 811/911, perfil de la autora, archivo
  cronológico y bloque principal de la portada sin cambios, en computador,
  tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-elmy-salud-rural.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const ES = "salud-rural-urbana-alberta-atencion-medica";
const EN = "rural-vs-urban-healthcare-high-level-review";
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
    /* ---------- Español ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, `/articulo-${ES}`);
    assert.equal((await page.locator("h1").first().innerText()).trim(), "Salud en Canadá: ¿es más difícil recibir atención médica en las comunidades rurales?");
    const t = (await page.locator("main").textContent()).replace(/\s+/g, " ");
    for (const d of ["Elmy Castillo", "Rural vs Urban Healthcare: A High-Level Review", "Recursos de salud que debes conocer en Alberta", "no hemos podido confirmar en una fuente oficial el dato del 77 %", "Ante una emergencia médica, llama al 911"]) assert.ok(t.includes(d), d);
    for (const u of ["https://www.primarycarealberta.ca/page14176.aspx", "https://albertafindaprovider.ca/", "https://www.albertahealthservices.ca/waittimes/waittimes.aspx"]) {
      const a = page.locator(`main a[href="${u}"]`).first();
      assert.equal(await a.getAttribute("target"), "_blank", u);
    }
    assert.match(await page.locator(".lang-toggle a.lang-pill").getAttribute("href"), new RegExp(`slug=${EN}$`), "EN lleva al original");
    assert.equal(await page.locator('a[href="colaborador.html?id=elmy-castillo"]').count() >= 1, true, "enlace al perfil de la autora");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `es-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${ES}`);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Inglés ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${EN}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), "Rural vs Urban Healthcare: A High-Level Review");
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.match(await page.locator(".lang-toggle a.lang-pill").getAttribute("href"), new RegExp(`slug=${ES}$`), "ES lleva a la traducción");
    await sinDesborde(page, `/articulo-${EN}`);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Perfil de la autora, archivo y portada ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/colaborador-elmy-castillo"));
    assert.ok((await page.locator(`a[href*="${ES}"], a[href*="${EN}"]`).count()) >= 1, "el artículo aparece en el perfil de la autora");
    assert.equal(await page.locator('img[src="assets/elmy-castillo-avatar.jpg"]').count() >= 1, true, "fotografía existente");
    await ctx.close();
    ({ ctx, page, errores } = await abrir(browser, perfil, "/noticias"));
    assert.equal(await page.locator(`#archivoLista a[href="articulo-${ES}"]`).count(), 1, "en el archivo cronológico");
    assert.equal(await page.locator(`#archivoLista a[href="articulo-${EN}"]`).count(), 0, "el original en inglés no se duplica en el archivo");
    await ctx.close();
    ({ ctx, page, errores } = await abrir(browser, perfil, "/"));
    assert.match(await page.locator("#heroMain h1").innerText(), /^Canadá acelera 33\.000 residencias permanentes/);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.match(tarjetas[4], /Express Entry desde el 3 de noviembre/);
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK artículo de Elmy Castillo: español, inglés, recursos, perfil, archivo y portada sin cambios");
})().catch((e) => { console.error(e); process.exit(1); });
