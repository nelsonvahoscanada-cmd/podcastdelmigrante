/*
  Prueba de extremo a extremo (navegador) de «Canadá en Datos».
  Solo lee páginas: no envía formularios ni toca el panel.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-canada-datos.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)

  Comprueba en computador, tableta y celular: rutas, mapa (clic, toque y
  teclado), lista accesible, panel, reloj de 12 horas con segundos,
  noticias de Alberta ordenadas, enlaces, metadatos sociales, ausencia de
  errores y de desplazamiento horizontal.
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const RELOJ = /^\d{1,2}:\d{2}:\d{2}\s?(a|p)\.\s?m\.$/;

const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && errores.push(`${r.status()} ${r.url()}`));
  const resp = await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores, resp };
}

async function sinScrollHorizontal(page) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `desplazamiento horizontal: ${sw} > ${cw}`);
}

(async () => {
  const browser = await chromium.launch();

  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada del módulo ---------- */
    let { ctx, page, errores, resp } = await abrir(browser, perfil, "/canada-en-datos");
    assert.equal(resp.status(), 200);
    assert.equal(new URL(page.url()).pathname, "/canada-en-datos/");
    assert.equal(await page.locator(".cd-region").count(), 13, "13 regiones en el mapa");
    assert.equal(await page.locator(".cd-chip").count(), 13, "13 botones en la lista");
    assert.equal(await page.locator("#cdPanelTitle").textContent(), "Alberta");
    assert.match(await page.locator(".cd-panel").textContent(), /5,101,050/, "población verificada en el panel");
    await page.waitForFunction(() => /\d:\d\d:\d\d/.test(document.querySelector("[data-reloj-hora]").textContent));
    const hora = (await page.locator("[data-reloj-hora]").textContent()).replace(/\u202f|\u00a0/g, " ");
    assert.match(hora, RELOJ, `formato del reloj: ${hora}`);
    assert.match(await page.locator("[data-reloj-fase]").textContent(), /De (día|noche)/);
    assert.ok((await page.locator("[data-reloj-fecha]").textContent()).length > 10);
    await sinScrollHorizontal(page);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `cd-portada-${perfil}.png`), fullPage: true });

    // Selección con clic o toque en el mapa (Ontario)
    if (perfil === "celular") await page.locator('.cd-region[data-code="ON"]').tap();
    else await page.locator('.cd-region[data-code="ON"]').click();
    assert.equal(await page.locator("#cdPanelTitle").textContent(), "Ontario");
    assert.equal(await page.locator('.cd-region[data-code="ON"]').getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator('.cd-chip[data-code="ON"]').getAttribute("aria-pressed"), "true");
    assert.match(await page.locator(".cd-panel").textContent(), /Toronto/);
    assert.match(await page.locator(".cd-panel").textContent(), /Ficha completa: próximamente/);
    assert.equal(await page.locator('.cd-panel a[href*="/canada-en-datos/"]').count(), 0, "sin enlaces a fichas inexistentes");
    assert.match(await page.locator(".cd-panel__note").textContent(), /más de una zona horaria/);
    assert.equal(new URL(page.url()).hash, "#ontario");

    // Lista accesible: la Isla del Príncipe Eduardo
    await page.locator('.cd-chip[data-code="PE"]').click();
    assert.equal(await page.locator("#cdPanelTitle").textContent(), "Isla del Príncipe Eduardo");
    assert.match(await page.locator("#cdAnuncio").textContent(), /Seleccionaste Isla del Príncipe Eduardo/);

    // Reloj de una zona con media hora (Terranova): el formato sigue siendo de 12 horas
    await page.locator('.cd-chip[data-code="NL"]').click();
    const horaNL = (await page.locator("[data-reloj-hora]").textContent()).replace(/\u202f|\u00a0/g, " ");
    assert.match(horaNL, RELOJ);
    if (SHOTS && perfil !== "computador") await page.screenshot({ path: path.join(SHOTS, `cd-panel-${perfil}.png`) });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Enlace directo con #hash ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/#yukon"));
    assert.equal(await page.locator("#cdPanelTitle").textContent(), "Yukón");
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Ficha de Alberta ---------- */
    ({ ctx, page, errores, resp } = await abrir(browser, perfil, "/canada-en-datos/alberta"));
    assert.equal(resp.status(), 200);
    assert.equal(await page.locator("h1").textContent(), "Alberta");
    await page.waitForFunction(() => /\d:\d\d:\d\d/.test(document.querySelector("[data-reloj-hora]").textContent));
    assert.match((await page.locator("[data-reloj-hora]").textContent()).replace(/\u202f|\u00a0/g, " "), RELOJ);
    const esperado = await page.evaluate(() =>
      new Intl.DateTimeFormat("es-CA", { timeZone: "America/Edmonton", hour: "numeric", hour12: true }).formatToParts(new Date()).find((p) => p.type === "hour").value,
    );
    assert.equal((await page.locator("[data-reloj-hora]").textContent()).split(":")[0], esperado, "hora de Edmonton");
    for (const id of ["poblacion", "economia", "empleo", "vivienda", "salud", "educacion", "inmigracion", "beneficios", "integracion", "seguridad", "recien-llegado", "noticias", "fuentes"]) {
      assert.equal(await page.locator(`#${id}`).count(), 1, `sección #${id}`);
    }
    assert.equal(await page.locator(".cd-step").count(), 8, "pasos de Recién llegado");
    assert.equal(await page.locator("#estafas li").count(), 3, "estafas de empleo, vivienda e inmigración");
    assert.match(await page.locator("#vivienda").textContent(), /\$1,914/);
    const noticias = await page.locator("#cdNews a").evaluateAll((as) => as.map((a) => ({ href: a.getAttribute("href"), fecha: a.querySelector("time").getAttribute("datetime") })));
    assert.ok(noticias.length > 0 && noticias.length <= 6, "noticias de Alberta");
    for (let i = 1; i < noticias.length; i++) assert.ok(new Date(noticias[i - 1].fecha) >= new Date(noticias[i].fecha), "orden: de la más reciente a la más antigua");
    for (const n of noticias) assert.match(n.href, /^\/articulo-[a-z0-9-]+$/);
    // Ninguna cifra inventada: los indicadores sin valor se muestran como pendientes
    assert.ok((await page.locator(".cd-indicator__value.cd-pending").count()) >= 1);
    // Enlaces externos en pestaña nueva y con rel="noopener"
    const externos = await page.locator('main a[href^="http"]').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
    assert.ok(externos);
    // Teclado: el índice lleva a la sección
    await page.locator('.cd-toc a[href="#salud"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(new URL(page.url()).hash, "#salud");
    await sinScrollHorizontal(page);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `cd-alberta-${perfil}.png`), fullPage: true });
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Teclado en el mapa (computador) ---------- */
  const { ctx, page, errores } = await abrir(browser, "computador", "/canada-en-datos/");
  await page.locator('.cd-region[data-code="AB"]').focus();
  assert.equal(await page.evaluate(() => document.activeElement.dataset.code), "AB");
  assert.equal(await page.locator('.cd-region[tabindex="0"]').count(), 1, "roving tabindex: una sola región en el orden de tabulación");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.code), "SK");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#cdPanelTitle").textContent(), "Saskatchewan");
  await page.keyboard.press("End");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.code), "NU");
  await page.keyboard.press(" ");
  assert.equal(await page.locator("#cdPanelTitle").textContent(), "Nunavut");
  await page.keyboard.press("Home");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.code), "BC");
  assert.deepEqual(errores, []);
  await ctx.close();

  /* ---------- Rutas ---------- */
  for (const [ruta, estado] of [["/canada-en-datos/ontario", 404], ["/canada-en-datos/alberta.html", 308]]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }

  await browser.close();
  console.log("OK Canadá en Datos");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
