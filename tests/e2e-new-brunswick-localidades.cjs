/*
  Prueba de extremo a extremo (navegador) de la guía de Nuevo Brunswick:
  ficha provincial (NBPNP con idiomas y estado), directorio extendido
  (búsqueda, filtros por tipo, región económica y condado, «Restablecer»),
  mapa, fichas de localidad con su gobierno local actual (reforma de 2023),
  «Compartir esta guía» y la portada de Canadá en Datos con Nuevo Brunswick
  disponible, en iPhone SE, iPhone 13, iPhone 14 Pro Max, tableta y
  computador. Solo lee páginas: /api/* y sendBeacon se responden localmente
  (no se registra ninguna visita).

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-new-brunswick-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/new-brunswick";
const PERFILES = {
  "iPhone SE": devices["iPhone SE"],
  "iPhone 13": devices["iPhone 13"],
  "iPhone 14 Pro Max": devices["iPhone 14 Pro Max"],
  tableta: devices["iPad Mini"],
  computador: { viewport: { width: 1440, height: 900 } },
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
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
async function sinScrollHorizontal(page, donde) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${donde}: desplazamiento horizontal ${sw} > ${cw}`);
}
const meta = (page, prop) => page.locator(`meta[property="${prop}"], meta[name="${prop}"]`).first().getAttribute("content");
async function social(page, ruta, imagen) {
  const url = SITE + ruta;
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), url, `${ruta}: canonical`);
  assert.equal(await meta(page, "og:url"), url);
  assert.equal(await meta(page, "og:image"), SITE + imagen);
  assert.equal(await meta(page, "twitter:card"), "summary_large_image");
  const img = await fetch(BASE + imagen);
  assert.equal(img.status, 200, imagen);
  assert.equal(await page.locator("[data-cd-share]").getAttribute("data-url"), url, "comparte su URL permanente");
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Guía provincial ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, GUIA);
    assert.equal(await page.locator("h1").first().textContent(), "Nuevo Brunswick");
    for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    const inm = await page.locator("#inmigracion").textContent();
    for (const t of ["CLB 4", "CLB 7", "NCLC 5", "CLB 5", "Strategic Initiative", "Inmigración del Atlántico", "4 de mayo de 2026", "resto de 2026", "no acepta solicitudes directas"]) assert.ok(inm.includes(t), `inmigración: ${t}`);
    assert.match(await page.locator("#empleo").textContent(), /\$15\.90/);
    assert.match(await page.locator("#geografia").textContent(), /77 gobiernos locales[^.]*12 distritos rurales/);
    await social(page, GUIA, "/assets/canada-en-datos/social-new-brunswick.jpg");
    await sinScrollHorizontal(page, `${perfil} guía`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `nb-guia-${perfil.replace(/\s+/g, "-")}.png`) });

    /* ---------- Directorio ---------- */
    /* Los datos se cargan cuando el buscador se acerca a la pantalla (js/canada-directorio.js) */
    await page.locator("#cdLoc").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled, null, { timeout: 30000 });
    const total = await page.evaluate(() => window.CD_LOCALIDADES.localidades.length);
    assert.ok(total > 2300, `${total} localidades`);
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Moncton[\s\S]*Ficha completa/);
    assert.ok((await page.locator("#cdLocMapa svg").count()) >= 1, "mapa del directorio");
    await page.locator("#cdLocBuscar").fill("shediac");
    await page.waitForFunction(() => /Shediac/.test(document.querySelector("#cdLocLista").textContent) && document.querySelectorAll("#cdLocLista li").length < 15);
    await page.locator("#cdLocBuscar").fill("grand falls");
    await page.waitForFunction(() => /Grand Falls/.test(document.querySelector("#cdLocLista").textContent));
    await page.locator("#cdLocBuscar").fill("");
    await page.locator("#cdLocRegion").selectOption("1350");
    await page.waitForFunction(() => /Edmundston/.test(document.querySelector("#cdLocLista li").textContent));
    await page.locator("#cdLocSub").selectOption("Madawaska");
    await page.locator("#cdLocTipo").selectOption("city");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length === 1);
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), `${GUIA}/edmundston`);
    await page.locator("#cdLocReset").click();
    for (const id of ["#cdLocBuscar", "#cdLocTipo", "#cdLocRegion", "#cdLocSub", "#cdLocPob", "#cdLocOrden"]) assert.equal(await page.locator(id).inputValue(), "", id);
    await sinScrollHorizontal(page, `${perfil} directorio`);
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `nb-directorio-${perfil.replace(/\s+/g, "-")}.png`) });
    assert.deepEqual(errores, [], `${perfil} guía: ${errores.join(" | ")}`);
    await ctx.close();

    /* ---------- Ficha completa: Moncton ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/moncton`));
    const m = await page.locator("main").textContent();
    for (const t of ["Gobierno local actual", "79,470", "Moncton–Richibucto", "$1,465 al mes", "The Moncton Hospital", "Codiac Transpo"]) assert.ok(m.includes(t), `Moncton: ${t}`);
    assert.equal(await page.locator('meta[name="robots"]').count(), 0, "ficha completa indexable");
    await social(page, `${GUIA}/moncton`, "/assets/canada-en-datos/new-brunswick/moncton.jpg");
    await sinScrollHorizontal(page, `${perfil} Moncton`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `nb-moncton-${perfil.replace(/\s+/g, "-")}.png`) });
    assert.deepEqual(errores, [], `${perfil} Moncton: ${errores.join(" | ")}`);
    await ctx.close();

    /* ---------- Página básica: parroquia ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/moncton-parish`));
    const p = await page.locator("main").textContent();
    assert.ok(p.includes("Parroquia") && p.includes("Gobierno local actual") && p.includes("Dato no disponible"), "parroquia: datos básicos y reforma de 2023");
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
    await sinScrollHorizontal(page, `${perfil} parroquia`);
    assert.deepEqual(errores, [], `${perfil} parroquia: ${errores.join(" | ")}`);
    await ctx.close();

    /* ---------- Portada de Canadá en Datos: Nuevo Brunswick «Ya disponible» ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    assert.match(await page.locator(".cd-lead").first().textContent(), /Nuevo Brunswick/);
    assert.equal(await page.locator('path.cd-region--ficha[data-code="NB"], .cd-region--ficha[data-code="NB"]').count() >= 1, true, "NB marcado como ficha disponible");
    await page.locator('path[data-code="NB"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('a[href="/canada-en-datos/new-brunswick"]'));
    await sinScrollHorizontal(page, `${perfil} portada`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `nb-portada-${perfil.replace(/\s+/g, "-")}.png`) });
    assert.deepEqual(errores, [], `${perfil} portada: ${errores.join(" | ")}`);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones; las demás provincias siguen igual ---------- */
  for (const [ruta, estado] of [
    [GUIA, 200],
    [`${GUIA}/moncton`, 200],
    [`${GUIA}/moncton-parish`, 200],
    [`${GUIA}/moncton.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/prince-edward-island/charlottetown", 200],
    ["/canada-en-datos/alberta/brooks", 200],
    ["/canada-en-datos/yukon", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Nuevo Brunswick: guía, NBPNP, directorio, mapa, fichas, reforma de 2023 y portada");
})().catch((e) => { console.error(e); process.exit(1); });
