/*
  Prueba de extremo a extremo (navegador) de «Explora las ciudades y
  pueblos de Ontario» y del bloque «Compartir esta guía» (Alberta y
  Ontario). Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-ontario-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE }).catch(() => {});
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  const resp = await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores, resp };
}

async function sinScrollHorizontal(page) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `desplazamiento horizontal: ${sw} > ${cw}`);
}
const meta = (page, prop) => page.locator(`meta[property="${prop}"], meta[name="${prop}"]`).first().getAttribute("content");

/* Metadatos sociales propios y bloque «Compartir esta guía» de una página */
async function compartir(page, ruta, imagen) {
  const url = SITE + ruta;
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), url, `${ruta}: canonical`);
  assert.equal(await meta(page, "og:url"), url);
  assert.equal(await meta(page, "og:image"), SITE + imagen, `${ruta}: imagen propia`);
  assert.equal(await meta(page, "twitter:card"), "summary_large_image");
  assert.ok((await meta(page, "og:title")).length > 10 && (await meta(page, "og:description")).length > 40);
  const img = await fetch(BASE + imagen);
  assert.equal(img.status, 200, imagen);
  assert.equal(img.headers.get("content-type"), "image/jpeg");

  const caja = page.locator("[data-cd-share]");
  assert.equal(await caja.count(), 1);
  assert.equal(await caja.getAttribute("data-url"), url, "comparte la URL permanente de esta página");
  for (const [red, patron] of [["whatsapp", /^https:\/\/wa\.me\/\?text=/], ["facebook", /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/], ["x", /^https:\/\/twitter\.com\/intent\/tweet\?/], ["correo", /^mailto:\?subject=/]]) {
    const href = await caja.locator(`.cd-share__red--${red}`).getAttribute("href");
    assert.match(href, patron, red);
    assert.ok(decodeURIComponent(href).includes(url), `${red}: incluye ${url}`);
  }
  // «Copiar enlace»: copia la URL y lo confirma en un mensaje accesible
  assert.equal(await caja.locator("[data-share-estado]").getAttribute("role"), "status");
  await caja.locator("[data-share-copiar]").click();
  await page.waitForFunction(() => /Enlace copiado|Copia este enlace/.test(document.querySelector("[data-share-estado]").textContent));
  const copiado = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  if (copiado !== null) assert.equal(copiado, url, "portapapeles");
  // «Compartir esta guía»: sin Web Share API (Chromium de escritorio) lleva a los enlaces de redes
  await page.evaluate(() => { try { delete Navigator.prototype.share; } catch (e) {} });
  await caja.locator("[data-share-nativo]").click();
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains("cd-share__red--whatsapp")), true, "el foco va a los enlaces de redes");
  // Con Web Share API: se llama con la URL de la página
  await page.evaluate(() => { window.__compartido = null; navigator.share = (d) => { window.__compartido = d; return Promise.resolve(); }; });
  await caja.locator("[data-share-nativo]").click();
  assert.equal(await page.evaluate(() => window.__compartido && window.__compartido.url), url);
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Ficha de Ontario: directorio ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/ontario");
    assert.equal(await page.evaluate(() => typeof window.CD_LOCALIDADES), "undefined", "datos cargados antes de tiempo");
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las ciudades y pueblos de Ontario");
    for (const id of ["poblacion", "empleo", "inmigracion", "vivienda", "ciudades", "recien-llegado", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    await compartir(page, "/canada-en-datos/ontario", "/assets/canada-en-datos/social-ontario.jpg");
    await page.locator("#localidades").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    assert.equal(await page.evaluate(() => window.CD_LOCALIDADES.localidades.length), 414);
    assert.equal(await page.locator("#cdLocLista li").count(), 40);
    assert.equal(await page.locator(".cd-loc__punto").count(), 414, "un punto por municipio");
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Toronto[\s\S]*Ficha completa/);
    // Buscador sin acentos ni mayúsculas
    await page.locator("#cdLocBuscar").fill("MISSISS");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length < 5);
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), "/canada-en-datos/ontario/mississauga");
    // Filtros: nivel y región económica
    await page.locator("#cdLocBuscar").fill("");
    await page.locator("#cdLocTipo").selectOption("grupo:unico");
    await page.locator("#cdLocRegion").selectOption("3595");
    await page.waitForTimeout(250);
    const nombres = await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents();
    assert.ok(nombres.some((x) => x.startsWith("Thunder Bay")), "Thunder Bay en Northwest");
    assert.ok(!nombres.some((x) => x.startsWith("Toronto")), "Toronto no está en Northwest");
    assert.equal(await page.locator(".cd-loc__punto").count(), nombres.length, "mapa y listado coinciden");
    // Mapa: tocar un punto abre la tarjeta con su enlace
    const punto = page.locator(".cd-loc__punto.es-ficha").first();
    if (perfil === "celular") await punto.tap({ force: true });
    else await punto.click({ force: true });
    assert.match(await page.locator("#cdLocTarjeta a").getAttribute("href"), /^\/canada-en-datos\/ontario\/[a-z-]+$/);
    // Las tarjetas de «Principales ciudades» llevan a sus fichas
    assert.equal(await page.locator('#ciudad-toronto a[href="/canada-en-datos/ontario/toronto"]').count(), 1);
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `on-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Ficha completa: Toronto ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/ontario/toronto"));
    assert.equal(await page.locator("h1").textContent(), "Toronto");
    assert.equal(await page.locator('meta[name="robots"]').count(), 0, "las fichas completas se indexan");
    assert.match(await page.locator(".cd-breadcrumb").textContent(), /Canadá en Datos\s*›\s*Ontario\s*›\s*Toronto/);
    assert.equal(await page.locator('.cd-breadcrumb a[href="/canada-en-datos/ontario"]').count(), 1);
    for (const id of ["resumen", "ubicacion", "comunidades", "economia-empleo", "vivienda", "educacion", "salud", "transporte", "recien-llegados", "familias", "enlaces"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    const resumen = await page.locator("#resumen").textContent();
    assert.match(resumen, /2,794,356/);
    assert.match(resumen, /nivel único/i);
    assert.match(await page.locator("#vivienda").textContent(), /\$2,055 al mes/);
    assert.match(await page.locator("#educacion").textContent(), /Toronto DSB/);
    assert.match(await page.locator("#salud").textContent(), /Sunnybrook/);
    assert.equal(await page.locator('#transporte a[href="https://www.ttc.ca/"]').count(), 1);
    assert.match(await page.locator("#economia-empleo").textContent(), /región Toronto/);
    const externos = await page.locator('main a[href^="http"]:not([href^="https://podcastdelmigrante.com"])').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
    assert.ok(externos, "enlaces externos en pestaña nueva");
    await compartir(page, "/canada-en-datos/ontario/toronto", "/assets/canada-en-datos/ontario/toronto.jpg");
    await sinScrollHorizontal(page);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `on-toronto-${perfil}.png`), fullPage: true });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Página básica (noindex) ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/ontario/hamilton-township"));
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
    assert.match(await page.locator(".cd-kicker").textContent(), /Información básica/);
    assert.match(await page.locator("#resumen").textContent(), /Northumberland/);
    assert.ok((await page.locator(".cd-pending").count()) >= 1, "«Dato no disponible» donde no hay información");
    await compartir(page, "/canada-en-datos/ontario/hamilton-township", "/assets/canada-en-datos/ontario/hamilton-township.jpg");
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Alberta: ficha provincial y de localidad con «Compartir» ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/alberta"));
    await compartir(page, "/canada-en-datos/alberta", "/assets/canada-en-datos/social-alberta.jpg");
    assert.deepEqual(errores, []);
    await ctx.close();
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/alberta/brooks"));
    await compartir(page, "/canada-en-datos/alberta/brooks", "/assets/canada-en-datos/alberta/brooks.jpg");
    assert.match(await page.locator("#resumen").textContent(), /14,924/, "contenido de Alberta intacto");
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones ---------- */
  for (const [ruta, estado] of [
    ["/canada-en-datos/ontario", 200],
    ["/canada-en-datos/ontario/toronto", 200],
    ["/canada-en-datos/ontario/ottawa", 200],
    ["/canada-en-datos/ontario/toronto.html", 308],
    ["/canada-en-datos/ontario/no-existe", 404],
    ["/canada-en-datos/alberta/brooks", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Ontario: ciudades y pueblos; compartir");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
