/*
  Prueba de extremo a extremo del Perfil Premium de Santa Latino (BIZ-003)
  en computador, tableta y celular, y de que Tomás y Carlos no cambian.
  Las estadísticas se capturan en el navegador (evento DOM «pdm:analytics»)
  y /api/events y /api/vistas se simulan: no se envían visitas reales.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-santa-latino.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
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

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
  await ctx.route(/\/api\/(events|vistas)/, (r) => r.fulfill({ status: 204, body: "" }));
  await ctx.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: "window.turnstile={render(){return 'w1';},getResponse(){return '';},isExpired(){return false;},reset(){}};" }));
  await ctx.route("**/registro/config", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ready: true, turnstileSiteKey: "1x00000000000000000000AA" }) }));
  await ctx.addInitScript(() => {
    window.__eventos = [];
    document.addEventListener("pdm:analytics", (e) => window.__eventos.push(e.detail));
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores };
}
async function sinDesborde(page, donde) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${donde}: desplazamiento horizontal ${sw} > ${cw}`);
}
const jsonLd = (page) => page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)));

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    let { ctx, page, errores } = await abrir(browser, perfil, "/perfil-santa-latino");
    /* Identidad */
    assert.equal(await page.getAttribute("html", "data-profile-theme"), "navidad");
    assert.equal((await page.locator("h1.biz-name").textContent()).trim(), "Santa Latino");
    assert.equal((await page.locator(".biz-tagline").textContent()).trim(), "La magia de la Navidad llega hasta ti.");
    assert.equal((await page.locator(".biz-representative").textContent()).trim(), "Representante: Héctor Rivero");
    assert.equal(await page.locator(".biz-company").count(), 0);
    assert.equal(await page.title(), "Santa Latino | Santa Claus para eventos en Niagara Falls, Ontario | El Podcast del Migrante");
    /* Fotografías cargadas */
    for (const sel of [".biz-hero__photo", ".biz-gallery img"]) {
      const ok = await page.locator(sel).first().evaluate((img) => img.complete && img.naturalWidth > 0);
      assert.ok(ok, `${perfil}: ${sel} cargada`);
    }
    assert.equal(await page.getAttribute(".biz-hero__photo", "alt"), "Santa Latino");
    /* Botones y enlaces (con sus eventos de medición sin cambios) */
    const hrefs = await page.$$eval("a[data-track]", (as) => as.map((a) => [a.getAttribute("data-track"), a.getAttribute("data-track-target"), a.getAttribute("href")]));
    const has = (track, target, href) => assert.ok(hrefs.some(([a, b, c]) => a === track && b === target && c === href), `${perfil}: falta ${track}/${target} → ${href}`);
    has("whatsapp_click", "whatsapp", "https://wa.me/12896965721");
    has("phone_click", "phone", "tel:+12896965721");
    has("instagram_click", "instagram-hero", "https://www.instagram.com/latinsantaon/");
    has("instagram_click", "instagram-final", "https://www.instagram.com/latinsantaon/");
    has("video_click", "profile-video-youtube", "https://www.youtube.com/watch?v=LxTr1Zda3dg");
    has("tiktok_click", "tiktok-hero", "https://www.tiktok.com/@santalatino_");
    has("whatsapp_click", "whatsapp-final", "https://wa.me/12896965721");
    has("vcard_download", "vcard-connect", "vcard/santa-latino.vcf");
    has("qr_profile_download", "qr-profile", "assets/qr/perfil-santa-latino.png");
    has("email_click", "email", "mailto:santalatinoon@gmail.com");
    has("email_click", "email-final", "mailto:santalatinoon@gmail.com");
    has("email_click", "email-text", "mailto:santalatinoon@gmail.com");
    assert.ok(hrefs.filter(([, , h]) => /^mailto:/.test(h)).every(([, , h]) => h === "mailto:santalatinoon@gmail.com"), "solo el correo oficial");
    const correo = page.locator(".biz-contact__email");
    await correo.scrollIntoViewIfNeeded();
    assert.ok(await correo.isVisible(), `${perfil}: correo visible`);
    assert.equal((await correo.innerText()).trim(), "Correo: santalatinoon@gmail.com");
    /* Servicios */
    assert.equal(await page.locator(".biz-service").count(), 6);
    /* QR y vCard responden */
    for (const u of ["assets/qr/perfil-santa-latino.svg", "assets/qr/contacto-santa-latino.svg", "assets/qr/perfil-santa-latino.png", "vcard/santa-latino.vcf"]) {
      const r = await page.request.get(`${BASE}/${u}`);
      assert.equal(r.status(), 200, u);
    }
    assert.ok(await page.locator(".biz-qr__code").first().evaluate((img) => img.complete && img.naturalWidth > 0));
    /* Datos estructurados: organización con su representante, sin contradicciones */
    const [ld] = await jsonLd(page);
    assert.equal(ld["@type"], "ProfilePage");
    assert.equal(ld.mainEntity["@type"], "Organization");
    assert.equal(ld.mainEntity.name, "Santa Latino");
    assert.deepEqual(ld.mainEntity.employee, { "@type": "Person", name: "Héctor Rivero", jobTitle: "Representante" });
    assert.equal(ld.mainEntity.email, "santalatinoon@gmail.com");
    assert.deepEqual(ld.mainEntity.sameAs, ["https://www.instagram.com/latinsantaon/", "https://www.tiktok.com/@santalatino_"]);
    assert.ok(!(await page.content()).includes("instagram.com/santalatino_"), "sin el enlace antiguo de Instagram");
    /* Entrevista: sección, texto, 16:9, carga diferida (sin iframe hasta pulsar) y reproductor oficial */
    assert.equal((await page.locator(".biz-video .biz-h2").textContent()).trim(), "Santa Latino en El Podcast del Migrante");
    assert.match(await page.locator(".biz-video").textContent(), /Conoce la historia de Héctor Rivero, el hombre detrás de Santa Latino, en esta entrevista especial de El Podcast del Migrante\./);
    assert.equal(await page.locator(".biz-video iframe").count(), 0, "el reproductor no se carga hasta pulsar");
    const caja = await page.locator(".biz-video__frame").boundingBox();
    assert.ok(Math.abs(caja.width / caja.height - 16 / 9) < 0.03, `16:9 (${caja.width}×${caja.height})`);
    assert.ok(caja.x >= 0 && caja.x + caja.width <= (await page.evaluate(() => document.documentElement.clientWidth)) + 1, "el reproductor cabe en la pantalla");
    await page.route(/youtube-nocookie\.com/, (r) => r.fulfill({ contentType: "text/html", body: "<html><body>reproductor</body></html>" }));
    await page.click("#bizVideoPlay");
    const src = await page.locator(".biz-video iframe").getAttribute("src");
    assert.match(src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/LxTr1Zda3dg\?autoplay=1/);
    assert.ok((await page.evaluate(() => window.__eventos)).some((e) => e.event === "video_click" && e.business_id === "BIZ-003"), "video_click medido");
    assert.equal(ld.mainEntity.address.addressLocality, "Niagara Falls");
    /* Estadísticas: mismo evento e identificadores que el resto de perfiles */
    const ev = await page.evaluate(() => window.__eventos);
    const view = ev.find((e) => e.event === "profile_view");
    assert.ok(view, `${perfil}: profile_view`);
    assert.equal(view.business, "santa-latino");
    assert.equal(view.business_id, "BIZ-003");
    await page.locator("a[data-track='whatsapp_click']").first().evaluate((a) => { a.addEventListener("click", (e) => e.preventDefault(), { once: true }); a.click(); });
    const wa = (await page.evaluate(() => window.__eventos)).find((e) => e.event === "whatsapp_click");
    assert.ok(wa && wa.business_id === "BIZ-003", `${perfil}: whatsapp_click medido`);
    /* Contraste mínimo del título y el botón principal (AA) */
    const contraste = await page.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      return { titulo: ratio(getComputedStyle(document.querySelector(".biz-name")).color, "rgb(18, 56, 38)"), boton: ratio(getComputedStyle(document.querySelector(".biz-actions .biz-btn--primary")).color, "rgb(217, 178, 92)") };
    });
    assert.ok(contraste.titulo >= 7 && contraste.boton >= 4.5, JSON.stringify(contraste));
    await sinDesborde(page, `${perfil} perfil-santa-latino`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `santa-latino-${perfil}.png`), fullPage: true });
    assert.deepEqual(errores, [], `${perfil}: ${errores.join(" | ")}`);
    await ctx.close();

    /* Enlace antiguo business-profile.html?slug=santa-latino: mismo tema */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/business-profile.html?slug=santa-latino"));
    assert.equal(await page.getAttribute("html", "data-profile-theme"), "navidad");
    assert.equal(await page.locator('link[href="css/temas/navidad.css"]').count(), 1);
    assert.equal((await page.locator("h1.biz-name").textContent()).trim(), "Santa Latino");
    assert.deepEqual(errores, []);
    await ctx.close();

    /* «Explorar empresas» (portada) → directorio: vista general con TODOS los Premium */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/"));
    await page.locator("a.biz-showcase__btn", { hasText: "Explorar empresas" }).click();
    await page.waitForURL(/quien-puede-ayudarte/);
    await page.waitForSelector(".biz-card");
    const nombres = () => page.$$eval(".biz-card__name", (n) => n.map((x) => x.textContent.trim()));
    assert.deepEqual(await nombres(), ["Tomás Velázquez", "Carlos D. Castillo", "Santa Latino", "1JuanRomero1 Inc."], `${perfil}: vista general`);
    assert.deepEqual([await page.inputValue("#fCategory"), await page.inputValue("#fProvince"), await page.inputValue("#fCity")], ["", "", ""], "sin filtros al abrir");
    assert.equal(await page.locator(".biz-card", { hasText: "Santa Latino" }).count(), 1, "sin duplicados");
    assert.equal(await page.getAttribute("html", "data-profile-theme"), null, "el directorio no lleva el tema");
    /* Búsquedas: por provincia y ciudad */
    await page.selectOption("#fProvince", "Ontario");
    assert.ok((await page.$$eval("#fCity option", (o) => o.map((x) => x.value))).includes("Niagara Falls"));
    /* Carlos también aparece en Ontario: indica prestar servicios allí (serviceAreas) */
    assert.deepEqual(await nombres(), ["Carlos D. Castillo", "Santa Latino"]);
    await page.selectOption("#fCity", "Niagara Falls");
    assert.deepEqual(await nombres(), ["Santa Latino"]);
    await page.selectOption("#fProvince", "Alberta");
    await page.selectOption("#fCity", "Calgary");
    assert.deepEqual(await nombres(), ["Tomás Velázquez", "Carlos D. Castillo", "1JuanRomero1 Inc."], "Calgary: los anteriores y 1JuanRomero1 (BIZ-004)");
    /* Categoría «Eventos y celebraciones» */
    await page.selectOption("#fProvince", "");
    await page.selectOption("#fCategory", "eventos-celebraciones");
    assert.deepEqual(await nombres(), ["Santa Latino", "1JuanRomero1 Inc."]);
    assert.equal(await page.locator(".biz-card", { hasText: "Santa Latino" }).locator(".biz-card__title").first().textContent().then((t) => t.trim()), "Personaje navideño para eventos y celebraciones");
    await sinDesborde(page, `${perfil} directorio`);
    /* La tarjeta abre la miniweb publicada */
    const enlace = page.locator(".biz-card", { hasText: "Santa Latino" }).locator("a[href='perfil-santa-latino.html']").first();
    await enlace.click();
    await page.waitForURL(/perfil-santa-latino/);
    await page.waitForSelector("h1.biz-name");
    assert.equal((await page.locator("h1.biz-name").textContent()).trim(), "Santa Latino");
    assert.deepEqual(errores, []);
    await ctx.close();

    /* Formulario de registro: la categoría nueva aparece y las existentes siguen */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/registra-tu-empresa"));
    const opciones = await page.$$eval("#fCategory option", (o) => o.map((x) => x.value).filter(Boolean));
    assert.deepEqual(opciones, ["automoviles", "seguros-finanzas", "vivienda", "empleo", "salud", "servicios-hogar", "eventos-celebraciones", "otra"]);
    await ctx.close();

    /* Perfiles existentes: sin tema y con su estructura de siempre */
    for (const [ruta, nombre, empresa] of [["/perfil-tomas-velazquez", "Tomás Velázquez", "Country Hills Toyota"], ["/perfil-carlos-d-castillo", "Carlos D. Castillo", "Roca Financial Group Ltd."]]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, ruta));
      assert.equal(await page.getAttribute("html", "data-profile-theme"), null);
      assert.equal(await page.locator('link[href*="css/temas/"]').count(), 0);
      assert.equal((await page.locator("h1.biz-name").textContent()).trim(), nombre);
      assert.equal((await page.locator(".biz-company").textContent()).trim(), empresa);
      assert.equal(await page.locator(".biz-representative, .biz-tagline").count(), 0);
      const [p] = await jsonLd(page);
      assert.equal(p.mainEntity["@type"], "Person");
      assert.equal(p.mainEntity.name, nombre);
      const bg = await page.evaluate(() => getComputedStyle(document.getElementById("main")).backgroundImage);
      assert.equal(bg, "none", `${ruta}: sin fondo navideño`);
      assert.deepEqual(errores, []);
      await ctx.close();
    }
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK Santa Latino: perfil, enlaces, QR, vCard, SEO, estadísticas y perfiles existentes");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
