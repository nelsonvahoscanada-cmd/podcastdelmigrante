/*
  Prueba de extremo a extremo (navegador): Directorio Empresarial legible
  por buscadores, sin cambiar el funcionamiento.
  - Con JavaScript DESACTIVADO: cada miniweb muestra su nombre, ciudad,
    descripción, servicios y contactos; el directorio, nombres, categorías
    y enlaces.
  - Con JavaScript: el perfil no se dibuja dos veces, un solo JSON-LD, un
    solo profile_view, barra de contacto, video, filtros del directorio.
  - Direcciones: /perfil-<slug>.html y /quien-puede-ayudarte.html redirigen
    a la dirección limpia; business-profile.html?slug= sigue funcionando.
  En computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-directorio-visibilidad.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
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
const MINIWEBS = {
  "tomas-velazquez": { nombre: "Tomás Velázquez", lugar: "Calgary, Alberta", textos: ["Asesor de ventas automotrices", "Country Hills Toyota", "¿Buscas vehículo en Calgary?", "20 Freeport Landing NE"], tel: "tel:+15878948527" },
  "carlos-d-castillo": { nombre: "Carlos D. Castillo", lugar: "Calgary, Alberta", textos: ["Seguros de vida", "TFSA", "Planificación para el retiro", "Atención con cita previa"], tel: "tel:+14039184019" },
  "santa-latino": { nombre: "Santa Latino", lugar: "Niagara Falls, Ontario", textos: ["Visitas de Santa a hogares", "Eventos privados y empresariales", "Representante: Héctor Rivero", "santalatinoon@gmail.com"], tel: "tel:+12896965721" },
  "1juanromero1": { nombre: "1JuanRomero1 Inc.", lugar: "Calgary, Alberta", textos: ["Edición profesional de video", "Animación", "Contenido con inteligencia artificial", "contact1juanromero1@gmail.com"], tel: "tel:+14033637566" },
};

async function contexto(browser, perfil, js) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", javaScriptEnabled: js });
  await ctx.route(/youtube(-nocookie)?\.com|ytimg\.com/, (r) => r.fulfill({ status: 204, body: "" }));
  return ctx;
}
async function sinScroll(page, cual) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${cual}: desplazamiento horizontal ${sw} > ${cw}`);
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Sin JavaScript: lo que ve un rastreador que no ejecuta JS ---------- */
    let ctx = await contexto(browser, perfil, false);
    let page = await ctx.newPage();
    for (const [slug, m] of Object.entries(MINIWEBS)) {
      const r = await page.goto(`${BASE}/perfil-${slug}`, { waitUntil: "load" });
      assert.equal(r.status(), 200, slug);
      const t = await page.locator("main").innerText();
      assert.doesNotMatch(t, /Cargando perfil/, slug);
      assert.equal((await page.locator("h1").innerText()).trim(), m.nombre, slug);
      assert.ok(t.includes(m.lugar), `${slug}: ${m.lugar}`);
      for (const x of m.textos) assert.ok(t.includes(x), `${slug}: ${x}`);
      assert.equal(await page.locator(`main a[href="${m.tel}"]`).first().count(), 1, `${slug}: teléfono`);
      assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1, `${slug}: JSON-LD en el HTML`);
      if (SHOTS && perfil === "celular") await page.screenshot({ path: path.join(SHOTS, `sinjs-${slug}-${perfil}.png`), fullPage: true });
    }
    await page.goto(`${BASE}/quien-puede-ayudarte`, { waitUntil: "load" });
    const dir = await page.locator("#bizResults").innerText();
    for (const [slug, m] of Object.entries(MINIWEBS)) {
      assert.ok(dir.includes(m.nombre), `directorio: ${m.nombre}`);
      assert.equal(await page.locator(`#bizResults a[href="perfil-${slug}"]`).count(), 1, `directorio: enlace a ${slug}`);
    }
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `sinjs-directorio-${perfil}.png`), fullPage: true });
    await ctx.close();

    /* ---------- Con JavaScript: mismo funcionamiento, sin duplicados ---------- */
    ctx = await contexto(browser, perfil, true);
    for (const [slug, m] of Object.entries(MINIWEBS)) {
      page = await ctx.newPage();
      const errores = [];
      const eventos = [];
      page.on("pageerror", (e) => errores.push(e.message));
      page.on("console", (x) => x.type() === "error" && errores.push(x.text()));
      await page.route(/\/api\/events/, (r) => { try { eventos.push(JSON.parse(r.request().postData() || "{}")); } catch (e) {} r.fulfill({ status: 204, body: "" }); });
      await page.route(/\/api\/vistas/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"vistas":0}' }));
      await page.goto(`${BASE}/perfil-${slug}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.PDM && window.PDM.analytics);
      await page.waitForTimeout(300);
      assert.equal(await page.locator("h1.biz-name").count(), 1, `${slug}: un solo h1`);
      assert.equal(await page.locator(".biz-hero").count(), 1, `${slug}: un solo encabezado`);
      assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1, `${slug}: un solo JSON-LD`);
      assert.equal(eventos.filter((e) => e.event === "profile_view").length, 1, `${slug}: un profile_view`);
      assert.equal(eventos[0].business, slug);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://podcastdelmigrante.com/perfil-${slug}`);
      /* Botones de contacto con medición, como antes */
      const tel = page.locator(`main a[href="${m.tel}"]`).first();
      assert.equal(await tel.getAttribute("data-track"), "phone_click");
      if (perfil === "celular") assert.ok(await page.locator(".biz-sticky").count() === 1, `${slug}: barra de contacto`);
      /* El video sigue cargándose solo al pulsar */
      if (await page.locator("#bizVideoPlay").count()) {
        assert.equal(await page.locator("#bizVideoFrame iframe").count(), 0);
        await page.locator("#bizVideoPlay").click();
        await page.waitForSelector("#bizVideoFrame iframe");
        assert.ok(eventos.some((e) => e.event === "video_click"), `${slug}: video_click`);
      }
      await sinScroll(page, slug);
      assert.deepEqual(errores, [], slug);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `js-${slug}-${perfil}.png`), fullPage: true });
      await page.close();
    }

    /* Directorio: filtros y enlaces */
    page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto(`${BASE}/quien-puede-ayudarte`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll("#fCategory option").length > 1);
    assert.equal(await page.locator("#bizResults .biz-card").count(), 4);
    await page.locator("#fCategory").selectOption("automoviles");
    assert.equal(await page.locator("#bizResults .biz-card").count(), 1);
    await page.locator("#fCategory").selectOption("");
    await page.locator("#fProvince").selectOption("Ontario");
    assert.deepEqual(await page.locator("#bizResults .biz-card__name").allInnerTexts(), ["Carlos D. Castillo", "Santa Latino"]);
    await page.locator("#fProvince").selectOption("");
    assert.equal(await page.locator("#bizResults .biz-card").count(), 4);
    await page.locator('#bizResults a[href="perfil-santa-latino"]').click();
    await page.waitForURL(/\/perfil-santa-latino$/);
    assert.equal((await page.locator("h1").innerText()).trim(), "Santa Latino");
    await page.locator("a.biz-back").click();
    await page.waitForURL(/\/quien-puede-ayudarte$/);
    await sinScroll(page, "directorio");
    assert.deepEqual(errores, []);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `js-directorio-${perfil}.png`), fullPage: true });
    await page.close();
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Direcciones antiguas: siguen funcionando ---------- */
  for (const [ruta, destino] of [["/perfil-tomas-velazquez.html", "/perfil-tomas-velazquez"], ["/quien-puede-ayudarte.html", "/quien-puede-ayudarte"]]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, 308, ruta);
    assert.equal(new URL(r.headers.get("location"), BASE).pathname, destino, ruta);
  }
  const ctx = await contexto(browser, "computador", true);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/business-profile.html?slug=carlos-d-castillo&utm_source=prueba`, { waitUntil: "networkidle" });
  assert.equal((await page.locator("h1").innerText()).trim(), "Carlos D. Castillo");
  assert.match(page.url(), /\/perfil-carlos-d-castillo\?utm_source=prueba$/, "la barra de direcciones pasa a la URL del perfil");
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1, "JSON-LD añadido por la plantilla");
  await ctx.close();

  /* ---------- Sitemap y robots.txt servidos ---------- */
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  for (const slug of Object.keys(MINIWEBS)) assert.match(sm, new RegExp(`<loc>https://podcastdelmigrante\\.com/perfil-${slug}</loc>`));
  assert.match(sm, /<loc>https:\/\/podcastdelmigrante\.com\/quien-puede-ayudarte<\/loc>/);
  const robots = await (await fetch(BASE + "/robots.txt")).text();
  assert.match(robots, /User-agent: \*\nAllow: \//);
  await browser.close();
  console.log("OK Directorio Empresarial: legible sin JavaScript, mismo funcionamiento con JavaScript, direcciones y sitemap");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
