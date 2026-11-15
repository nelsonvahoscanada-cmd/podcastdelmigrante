/*
  Prueba de extremo a extremo de la miniweb institucional de Nelson Vahos
  (/perfil-nelson-vahos) en computador, tableta y celular, con y sin
  JavaScript, y de que las cuatro miniwebs Premium y el directorio no cambian.
  Las estadísticas se capturan en el navegador (evento DOM «pdm:analytics»);
  /api/* y sendBeacon se responden localmente: no se envían visitas reales.
  Los enlaces externos no se abren (se bloquean las salidas de la red local).

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-nelson-vahos.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
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
const CARGOS = ["Fundador y Director General de eRadio Global Corp.", "Fundador y Director de El Podcast del Migrante"];
const CITA = "«El frío no pudo apagar mi señal. Solamente me enseñó a transmitir con un propósito diferente».";

async function abrir(browser, perfil, ruta, js = true) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton", javaScriptEnabled: js });
  await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  await ctx.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
  if (js) {
    await ctx.addInitScript(() => {
      navigator.sendBeacon = () => true;
      window.__eventos = [];
      document.addEventListener("pdm:analytics", (e) => window.__eventos.push(e.detail));
    });
  }
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  const res = await page.goto(BASE + ruta, { waitUntil: js ? "networkidle" : "load" });
  return { ctx, page, errores, res };
}
async function sinDesborde(page, donde) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${donde}: desplazamiento horizontal ${sw} > ${cw}`);
}
const visible = (page) => page.evaluate(() => document.getElementById("bizRoot").innerText.replace(/\s+/g, " ").trim());

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Sin JavaScript: todo el contenido en el HTML ---------- */
    let { ctx, page, errores, res } = await abrir(browser, perfil, "/perfil-nelson-vahos", false);
    assert.equal(res.status(), 200);
    const sinJs = await visible(page);
    for (const t of ["Nelson Vahos", ...CARGOS, "Conectando latinos, construyendo futuro", "Alberta, Canadá", "Sobre Nelson", "William Vinasco Ch.", CITA, "Proyectos", "Sitio oficial en desarrollo.", "Desafío 100 Empresas", "Trayectoria", "Contacto profesional", "eRadioGlobal@gmail.com"]) {
      assert.ok(sinJs.includes(t), `${perfil} sin JavaScript: «${t}»`);
    }
    assert.ok(!/Cargando perfil/.test(sinJs));
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("#bizJsonLd").count(), 1);
    await ctx.close();

    /* ---------- Con JavaScript: el mismo contenido, sin duplicados ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/perfil-nelson-vahos"));
    assert.equal(await page.getAttribute("html", "data-profile-theme"), "institucional");
    assert.equal(await page.locator('link[href="css/temas/institucional.css"]').count(), 1);
    assert.equal(await visible(page), sinJs, `${perfil}: con JavaScript, el mismo texto que sin JavaScript`);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1);
    assert.equal((await page.locator("h1.biz-name").textContent()).trim(), "Nelson Vahos");
    assert.deepEqual((await page.$$eval(".biz-roles__item", (l) => l.map((x) => x.textContent.trim()))), CARGOS);
    assert.equal((await page.locator(".biz-label").first().textContent()).trim(), "Perfil institucional");
    assert.equal(await page.title(), "Nelson Vahos | Fundador de eRadio Global Corp. y El Podcast del Migrante");
    /* Fotografía original (completa, 3:4) cargada */
    const foto = await page.locator(".biz-hero__photo").evaluate((img) => [img.complete && img.naturalWidth, img.naturalHeight, img.getAttribute("src"), img.getAttribute("alt")]);
    assert.deepEqual(foto, [960, 1280, "assets/directorio/perfiles/nelson-vahos.jpg", "Nelson Vahos"]);
    /* Proyectos: tres tarjetas en su orden, con enlaces oficiales */
    assert.deepEqual(await page.$$eval(".biz-project__name", (n) => n.map((x) => x.textContent.trim())), ["eRadio Global Corp.", "El Podcast del Migrante", "Desafío 100 Empresas"]);
    const hrefs = await page.$$eval("a[data-track]", (as) => as.map((a) => [a.getAttribute("data-track"), a.getAttribute("data-track-target"), a.getAttribute("href")]));
    const has = (track, target, href) => assert.ok(hrefs.some(([a, b, c]) => a === track && b === target && c === href), `${perfil}: falta ${track}/${target} → ${href}`);
    has("website_click", "project-eradio-global", "https://eradioglobal.com/");
    has("website_click", "project-podcast-del-migrante", "https://podcastdelmigrante.com/");
    has("website_click", "project-desafio-100-empresas", "/desafio-100-empresas/");
    has("email_click", "email-final", "mailto:eRadioGlobal@gmail.com");
    has("vcard_download", "vcard-connect", "vcard/nelson-vahos.vcf");
    has("qr_profile_download", "qr-profile", "assets/qr/perfil-nelson-vahos.png");
    assert.ok(!hrefs.some(([, , h]) => /^(tel:|https:\/\/wa\.me)/.test(h)), "sin teléfono ni WhatsApp");
    assert.equal(await page.locator("main a[href*='instagram.com']").count(), 0, "sin Instagram en la miniweb");
    assert.ok(hrefs.filter(([, , h]) => /^mailto:/.test(h)).every(([, , h]) => h === "mailto:eRadioGlobal@gmail.com"), "solo el correo público");
    /* El enlace interno del Desafío existe */
    assert.equal((await page.request.get(`${BASE}/desafio-100-empresas/`)).status(), 200);
    /* QR (cargados al desplazarse) y vCard */
    const qr = page.locator(".biz-qr__code");
    assert.equal(await qr.count(), 2);
    for (let i = 0; i < 2; i++) {
      await qr.nth(i).scrollIntoViewIfNeeded();
      await page.waitForFunction((n) => { const im = document.querySelectorAll(".biz-qr__code")[n]; return im.complete && im.naturalWidth > 0; }, i);
    }
    for (const u of ["assets/qr/perfil-nelson-vahos.svg", "assets/qr/contacto-nelson-vahos.svg", "assets/qr/perfil-nelson-vahos.png", "assets/qr/contacto-nelson-vahos.png", "assets/directorio/perfiles/nelson-vahos-og.jpg"]) {
      assert.equal((await page.request.get(`${BASE}/${u}`)).status(), 200, u);
    }
    const vcf = await page.request.get(`${BASE}/vcard/nelson-vahos.vcf`);
    assert.equal(vcf.status(), 200);
    const tarjeta = await vcf.text();
    assert.match(tarjeta, /FN:Nelson Vahos/);
    assert.doesNotMatch(tarjeta, /^TEL/m);
    /* Correo del bloque final visible y legible */
    const correo = page.locator(".biz-contact__email");
    await correo.scrollIntoViewIfNeeded();
    assert.ok(await correo.isVisible());
    assert.equal((await correo.innerText()).trim(), "Correo: eRadioGlobal@gmail.com");
    /* Estadísticas: BIZ-005, sin salir de la página */
    const view = (await page.evaluate(() => window.__eventos)).find((e) => e.event === "profile_view");
    assert.ok(view && view.business_id === "BIZ-005" && view.business === "nelson-vahos", `${perfil}: profile_view`);
    await page.locator("a[data-track-target='project-eradio-global']").evaluate((a) => { a.addEventListener("click", (e) => e.preventDefault(), { once: true }); a.click(); });
    const clic = (await page.evaluate(() => window.__eventos)).find((e) => e.event === "website_click");
    assert.ok(clic && clic.business_id === "BIZ-005", `${perfil}: website_click medido`);
    /* Contraste (AA): nombre y cargos sobre la banda negra */
    const contraste = await page.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const fondo = "rgb(11, 11, 11)";
      return { nombre: ratio(getComputedStyle(document.querySelector(".biz-name")).color, fondo), cargo: ratio(getComputedStyle(document.querySelector(".biz-roles__item")).color, fondo), correo: ratio(getComputedStyle(document.querySelector(".biz-contact__email")).color, fondo) };
    });
    assert.ok(contraste.nombre >= 7 && contraste.cargo >= 4.5 && contraste.correo >= 4.5, JSON.stringify(contraste));
    await sinDesborde(page, `${perfil} perfil-nelson-vahos`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `nelson-vahos-${perfil}.png`), fullPage: true });
    assert.deepEqual(errores, [], `${perfil}: ${errores.join(" | ")}`);
    await ctx.close();

    /* ---------- Independiente: no aparece en el directorio ni en los planes ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/quien-puede-ayudarte"));
    await page.waitForSelector(".biz-card");
    assert.deepEqual(await page.$$eval(".biz-card__name", (n) => n.map((x) => x.textContent.trim())), ["Tomás Velázquez", "Carlos D. Castillo", "Santa Latino", "1JuanRomero1 Inc."]);
    assert.ok(!(await page.content()).includes("nelson-vahos"));
    assert.deepEqual(errores, []);
    await ctx.close();
    ({ ctx, page, errores } = await abrir(browser, perfil, "/planes-directorio"));
    assert.ok(!(await page.content()).includes("nelson-vahos"));
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Las cuatro miniwebs Premium siguen como siempre ---------- */
    for (const [ruta, nombre, tema] of [["/perfil-tomas-velazquez", "Tomás Velázquez", null], ["/perfil-carlos-d-castillo", "Carlos D. Castillo", null], ["/perfil-santa-latino", "Santa Latino", "navidad"], ["/perfil-1juanromero1", "1JuanRomero1 Inc.", "cine"]]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, ruta));
      assert.equal(await page.getAttribute("html", "data-profile-theme"), tema, ruta);
      assert.equal((await page.locator("h1.biz-name").textContent()).trim(), nombre);
      assert.equal(await page.locator(".biz-roles, .biz-projects, .biz-timeline").count(), 0, `${ruta}: sin secciones institucionales`);
      assert.equal((await page.locator(".biz-label").first().textContent()).trim(), "Perfil empresarial");
      assert.equal(await page.locator('link[href="css/temas/institucional.css"]').count(), 0);
      await sinDesborde(page, ruta);
      assert.deepEqual(errores, [], `${ruta}: ${errores.join(" | ")}`);
      await ctx.close();
    }
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK miniweb institucional de Nelson Vahos");
})().catch((e) => { console.error(e); process.exit(1); });
