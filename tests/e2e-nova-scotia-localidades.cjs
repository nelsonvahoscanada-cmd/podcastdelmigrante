/*
  Prueba de extremo a extremo (navegador) de la guía de Nueva Escocia:
  ficha provincial (NSNP con idiomas y estado, bandera), directorio
  extendido (búsqueda, filtros por tipo, región económica y condado,
  «Restablecer»), mapa, fichas de localidad con su municipio actual,
  fichas de Dartmouth y Sydney, «Compartir esta guía» y la portada de Canadá
  en Datos con Nueva Escocia disponible, en iPhone SE, iPhone 13, iPhone 14 Pro Max, tableta y
  computador. Solo lee páginas: /api/* y sendBeacon se responden localmente
  (no se registra ninguna visita).

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-nova-scotia-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/nova-scotia";
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
    assert.equal((await page.locator("h1").first().textContent()).trim(), "Nueva Escocia");
    assert.ok(await page.locator("h1 img.cd-flag").evaluate((i) => i.complete && i.naturalWidth > 0), "bandera cargada");
    for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes", "localidades"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    const inm = await page.locator("#inmigracion").textContent();
    for (const t of ["18 de febrero de 2026", "Skilled Worker", "Nova Scotia Graduate", "Nova Scotia: Express Entry", "Entrepreneur", "CLB 4", "CLB 5", "CLB 7", "17 de abril de 2024", "Inmigración del Atlántico", "$1,000", "solo por invitación"]) assert.ok(inm.includes(t), `inmigración: ${t}`);
    assert.match(await page.locator("#empleo").textContent(), /\$17\.00/);
    assert.match(await page.locator("#geografia").textContent(), /49 municipios/);
    assert.match(await page.locator("#vivienda").textContent(), /5% por año/);
    await social(page, GUIA, "/assets/canada-en-datos/social-nova-scotia.jpg");
    await sinScrollHorizontal(page, `${perfil} guía`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `ns-guia-${perfil.replace(/\s+/g, "-")}.png`) });

    /* ---------- Directorio ---------- */
    /* Los datos se cargan cuando el buscador se acerca a la pantalla (js/canada-directorio.js) */
    await page.locator("#cdLoc").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled, null, { timeout: 30000 });
    const total = await page.evaluate(() => window.CD_LOCALIDADES.localidades.length);
    assert.ok(total > 2800, `${total} localidades`);
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Ficha completa/);
    assert.ok((await page.locator("#cdLocMapa svg").count()) >= 1, "mapa del directorio");
    await page.locator("#cdLocBuscar").fill("dartmouth");
    await page.waitForFunction(() => /Dartmouth/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator('#cdLocLista a[href="/canada-en-datos/nova-scotia/dartmouth"]').count() >= 1, true, "Dartmouth con ficha");
    await page.locator("#cdLocBuscar").fill("wolfville");
    await page.waitForFunction(() => /Wolfville/.test(document.querySelector("#cdLocLista").textContent) && document.querySelectorAll("#cdLocLista li").length < 15);
    await page.locator("#cdLocBuscar").fill("");
    await page.locator("#cdLocRegion").selectOption("1210");
    await page.waitForFunction(() => /Cape Breton|Sydney/.test(document.querySelector("#cdLocLista li").textContent));
    await page.locator("#cdLocSub").selectOption("Cape Breton");
    await page.locator("#cdLocTipo").selectOption("regional");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length === 1);
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), `${GUIA}/cape-breton`);
    await page.locator("#cdLocReset").click();
    for (const id of ["#cdLocBuscar", "#cdLocTipo", "#cdLocRegion", "#cdLocSub", "#cdLocPob", "#cdLocOrden"]) assert.equal(await page.locator(id).inputValue(), "", id);
    await sinScrollHorizontal(page, `${perfil} directorio`);
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `ns-directorio-${perfil.replace(/\s+/g, "-")}.png`) });
    assert.deepEqual(errores, [], `${perfil} guía: ${errores.join(" | ")}`);
    await ctx.close();

    /* ---------- Ficha completa: Halifax ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/halifax`));
    const m = await page.locator("main").textContent();
    for (const t of ["Municipio actual", "Halifax Regional Municipality", "439,819", "$1,833 al mes", "QEII - Halifax Infirmary Site", "Halifax Transit"]) assert.ok(m.includes(t), `Halifax: ${t}`);
    assert.equal(await page.locator('meta[name="robots"]').count(), 0, "ficha completa indexable");
    await social(page, `${GUIA}/halifax`, "/assets/canada-en-datos/nova-scotia/halifax.jpg");
    await sinScrollHorizontal(page, `${perfil} Halifax`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `ns-halifax-${perfil.replace(/\s+/g, "-")}.png`) });
    assert.deepEqual(errores, [], `${perfil} Halifax: ${errores.join(" | ")}`);
    await ctx.close();

    /* ---------- Fichas de comunidad: Dartmouth y Sydney ---------- */
    for (const [s, textos] of [["dartmouth", ["Halifax Regional Municipality", "Dato no disponible", "$1,661 al mes", "Dartmouth General Hospital"]], ["sydney", ["Cape Breton Regional Municipality", "30,960", "$1,191 al mes", "Cape Breton Regional Hospital"]]]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/${s}`));
      const t = await page.locator("main").textContent();
      for (const x of textos) assert.ok(t.includes(x), `${s}: ${x}`);
      assert.equal(await page.locator('meta[name="robots"]').count(), 0, `${s} indexable`);
      await social(page, `${GUIA}/${s}`, `/assets/canada-en-datos/nova-scotia/${s}.jpg`);
      await sinScrollHorizontal(page, `${perfil} ${s}`);
      if (SHOTS && s === "dartmouth") await page.screenshot({ path: path.join(SHOTS, `ns-dartmouth-${perfil.replace(/\s+/g, "-")}.png`) });
      assert.deepEqual(errores, [], `${perfil} ${s}: ${errores.join(" | ")}`);
      await ctx.close();
    }

    /* ---------- Página básica: subdivisión de municipio de condado ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/kings-subd-a`));
    const p = await page.locator("main").textContent();
    assert.ok(p.includes("Subdivision of County Municipality") && p.includes("Municipality of the County of Kings") && p.includes("Greenwood"), "subdivisión: municipio de condado y villas");
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
    await sinScrollHorizontal(page, `${perfil} subdivisión`);
    assert.deepEqual(errores, [], `${perfil} subdivisión: ${errores.join(" | ")}`);
    await ctx.close();

    /* ---------- Portada de Canadá en Datos: Nueva Escocia «Ya disponible» ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    assert.match(await page.locator(".cd-lead").first().textContent(), /Nueva Escocia/);
    assert.equal(await page.locator('.cd-region--ficha[data-code="NS"]').count() >= 1, true, "NS marcado como ficha disponible");
    await page.locator('path[data-code="NS"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('a[href="/canada-en-datos/nova-scotia"]'));
    await sinScrollHorizontal(page, `${perfil} portada`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `ns-portada-${perfil.replace(/\s+/g, "-")}.png`) });
    assert.deepEqual(errores, [], `${perfil} portada: ${errores.join(" | ")}`);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones; las demás provincias siguen igual ---------- */
  for (const [ruta, estado] of [
    [GUIA, 200],
    [`${GUIA}/halifax`, 200],
    [`${GUIA}/dartmouth`, 200],
    [`${GUIA}/sydney`, 200],
    [`${GUIA}/yarmouth-municipal-district`, 200],
    [`${GUIA}/halifax.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/new-brunswick/moncton", 200],
    ["/canada-en-datos/prince-edward-island/charlottetown", 200],
    ["/canada-en-datos/alberta/brooks", 200],
    ["/canada-en-datos/yukon", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Nueva Escocia: guía, NSNP, bandera, directorio, mapa, fichas (Halifax, Dartmouth, Sydney), municipios actuales y portada");
})().catch((e) => { console.error(e); process.exit(1); });
