/*
  Prueba de extremo a extremo de la página comercial del Directorio
  Empresarial (planes Gratuito y Premium) en computador, tableta y celular:
  contenido y precios, botones hacia el formulario con el plan elegido,
  navegación desde la portada y el directorio, formulario adaptado al plan,
  y que las miniwebs Premium existentes sigan abriendo. Solo lee páginas
  (no envía el formulario: eso lo cubre tests/e2e-registro.cjs).

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-planes-directorio.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};
const FAKE_TURNSTILE = "window.turnstile={render(){return 'w1';},getResponse(){return '';},isExpired(){return false;},reset(){}};";

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" });
  await ctx.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }));
  await ctx.route("**/registro/config", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ready: true, turnstileSiteKey: "1x00000000000000000000AA" }) }));
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && !/\/registro\/config$/.test(r.url()) && errores.push(`${r.status()} ${r.url()}`));
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
    /* ---------- Página de planes ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/planes-directorio");
    assert.equal((await page.locator("h1").textContent()).trim(), "Haz crecer tu negocio en Canadá");
    assert.match(await page.locator(".reg-hero__lead").textContent(), /Comienza gratis o destaca tu negocio con un Perfil Premium\./);
    const tarjetas = page.locator(".pl-card");
    assert.equal(await tarjetas.count(), 2);
    assert.match((await tarjetas.nth(0).textContent()).replace(/\s+/g, " "), /Gratis.*\$0 CAD.*Crear ficha gratis/);
    assert.equal((await page.locator("#planesTitle").textContent()).trim(), "Haz visible tu negocio en Canadá");
    /* «Conocer Premium» lleva a la comparación (sin pasarela de pagos no hay «Elegir Premium») */
    assert.equal((await tarjetas.nth(1).locator("a.pl-card__cta").textContent()).trim(), "Conocer Premium");
    await tarjetas.nth(1).locator("a.pl-card__cta").click();
    await page.waitForFunction(() => location.hash === "#comparar");
    assert.match((await tarjetas.nth(1).textContent()).replace(/\s+/g, " "), /Premium.*\$25 CAD\/mes \+ impuestos aplicables/);
    assert.match(await tarjetas.nth(1).textContent(), /Todavía no hay pago en línea/);
    assert.equal(await page.locator("table.pl-table tbody tr").count(), 14);
    /* Preguntas frecuentes: se abren y cierran */
    const faq = page.locator(".pl-faq__item").first();
    await faq.locator("summary").click();
    assert.equal(await faq.evaluate((d) => d.open), true);
    assert.equal(await page.locator(".pl-faq__item").count(), 6);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `planes-${perfil}.png`), fullPage: true });
    await sinDesborde(page, "/planes-directorio");
    assert.deepEqual(errores, []);

    /* Botón gratuito → formulario con el plan Gratuito elegido */
    await page.locator(".pl-card").nth(0).locator("a.pl-card__cta").click();
    await page.waitForURL(/registra-tu-empresa\?plan=gratuito#solicitud$/);
    await page.waitForFunction(() => document.querySelector("[name=plan][value=gratuito]").checked);
    for (const id of ["#fRepresentative", "#fServices", "#fWhatsapp", "#fWebsite", "#fInstagram", "#fExtraImages", "#fNotes"]) assert.ok(await page.isHidden(id), `${id} oculto en Gratuito`);
    assert.ok(await page.isVisible("#fPhone"));
    assert.equal(await page.getAttribute("#fSummary", "maxlength"), "200");
    assert.equal((await page.locator("#summaryMax").textContent()).trim(), "200");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `formulario-gratuito-${perfil}.png`), fullPage: true });
    /* Cambiar a Premium muestra todos los campos */
    await page.check("[name=plan][value=premium]");
    for (const id of ["#fRepresentative", "#fServices", "#fWhatsapp", "#fExtraImages", "#fNotes"]) assert.ok(await page.isVisible(id), `${id} visible en Premium`);
    assert.equal(await page.getAttribute("#fSummary", "maxlength"), "300");
    assert.match(await page.locator("[data-plan-text=premium].intake-hint").first().textContent(), /no se realiza ningún cobro en línea/);
    await sinDesborde(page, "/registra-tu-empresa");
    await ctx.close();

    /* Botón Premium → formulario con Premium elegido */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/planes-directorio"));
    await page.locator(".reg-hero a[href*=\"plan=premium\"]").click();
    await page.waitForURL(/registra-tu-empresa\?plan=premium#solicitud$/);
    await page.waitForFunction(() => document.querySelector("[name=plan][value=premium]").checked);
    await ctx.close();

    /* Formulario sin plan: no deja enviar sin elegirlo */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/registra-tu-empresa"));
    if (await page.locator("#intakeForm [type=submit]").isEnabled()) {
      await page.click("#intakeForm [type=submit]");
      await page.waitForSelector("#err-plan");
      assert.equal((await page.locator("#err-plan").textContent()).trim(), "Elige el plan Gratuito o Premium.");
    }
    await ctx.close();

    /* ---------- Navegación ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/"));
    assert.equal(await page.locator('#quien-puede-ayudarte a[href="planes-directorio"]').count(), 1, "la portada enlaza a los planes");
    await ctx.close();
    ({ ctx, page, errores } = await abrir(browser, perfil, "/quien-puede-ayudarte"));
    assert.ok((await page.locator('a[href="planes-directorio"]').count()) >= 2, "el directorio enlaza a los planes");
    assert.ok((await page.locator(".biz-card").count()) >= 2, "los perfiles publicados siguen en el directorio");
    assert.equal(await page.locator(".biz-card--free").count(), 0, "todavía no hay fichas gratuitas publicadas");
    await sinDesborde(page, "/quien-puede-ayudarte");
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Miniwebs Premium existentes intactas ---------- */
    for (const p of ["perfil-tomas-velazquez", "perfil-carlos-d-castillo"]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, `/${p}`));
      assert.ok((await page.locator("h1").count()) >= 1, p);
      assert.doesNotMatch(await page.locator("main").textContent(), /No encontramos/, p);
      await ctx.close();
    }
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK planes del Directorio: página, botones, formulario por plan, navegación y miniwebs");
})().catch((e) => { console.error(e); process.exit(1); });
