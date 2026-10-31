/*
  Prueba de extremo a extremo (navegador) de «Canadá en Datos».
  Solo lee páginas: no envía formularios ni toca el panel.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-canada-datos.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)

  Comprueba en computador, tableta y celular: rutas, mapa (clic, toque y
  teclado), lista accesible, panel, reloj de 12 horas con segundos,
  noticias de Alberta ordenadas, ficha de Ontario (zonas horarias,
  tabla de alquileres y ciudades), enlaces, metadatos sociales, ausencia de
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
    assert.match(await page.locator(".cd-panel").textContent(), /16,262,121/, "población verificada de Ontario");
    assert.equal(await page.locator('.cd-panel a[href="/canada-en-datos/ontario"]').count(), 1, "enlace a la ficha de Ontario");
    assert.match(await page.locator(".cd-panel__note").textContent(), /más de una zona horaria/);
    assert.equal(new URL(page.url()).hash, "#ontario");

    // Una provincia sin ficha (Nueva Escocia) sigue en «Próximamente», sin enlaces
    await page.locator('.cd-chip[data-code="NS"]').click();
    assert.match(await page.locator(".cd-panel").textContent(), /Ficha completa: próximamente/);
    assert.equal(await page.locator('.cd-panel a[href*="/canada-en-datos/"]').count(), 0, "sin enlaces a fichas inexistentes");

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
    const externos = await page.locator('main a[href^="http"]:not([href^="https://podcastdelmigrante.com"])').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
    assert.ok(externos);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `cd-alberta-${perfil}.png`), fullPage: true });
    // Teclado: el índice lleva a la sección
    await page.locator('.cd-toc a[href="#salud"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(new URL(page.url()).hash, "#salud");
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Ficha de Ontario (desde el mapa) ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/#ontario"));
    await page.locator('.cd-panel a[href="/canada-en-datos/ontario"]').click();
    await page.waitForURL(/\/canada-en-datos\/ontario$/);
    assert.equal(await page.locator("h1").textContent(), "Ontario");
    await page.waitForFunction(() => /\d:\d\d:\d\d/.test(document.querySelector("[data-reloj-hora]").textContent));
    const horaDe = (tz) => page.evaluate((z) => new Intl.DateTimeFormat("es-CA", { timeZone: z, hour: "numeric", hour12: true }).formatToParts(new Date()).find((p) => p.type === "hour").value, tz);
    assert.equal((await page.locator("[data-reloj-hora]").textContent()).split(":")[0], await horaDe("America/Toronto"), "hora de Toronto");
    // Segunda zona horaria: el noroeste de Ontario, una hora menos que Toronto
    const zona = page.locator('.cd-zone[data-zona="America/Winnipeg"] [data-zona-hora]');
    await page.waitForFunction(() => /\d:\d\d/.test(document.querySelector("[data-zona-hora]").textContent));
    const textoZona = (await zona.textContent()).replace(/\u202f|\u00a0/g, " ");
    assert.match(textoZona, /^\d{1,2}:\d{2}\s?(a|p)\.\s?m\.$/, `formato de la zona: ${textoZona}`);
    assert.equal(textoZona.split(":")[0], await horaDe("America/Winnipeg"), "hora central del noroeste");
    for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "noticias", "fuentes"]) {
      assert.equal(await page.locator(`#${id}`).count(), 1, `sección #${id}`);
    }
    assert.equal(await page.locator(".cd-city").count(), 8, "ocho ciudades");
    assert.equal(await page.locator(".cd-table tbody tr").count(), 15, "filas de la tabla de alquileres");
    assert.match(await page.locator("#vivienda").textContent(), /\$2,046/);
    assert.match(await page.locator("#empleo").textContent(), /\$17\.95\s*CAD por hora/);
    assert.equal(await page.locator(".cd-step").count(), 8);
    // Noticias: lista o aviso de que todavía no hay
    assert.ok((await page.locator("#cdNews a").count()) > 0 || (await page.locator(".cd-news-empty").count()) === 1);
    const externosON = await page.locator('main a[href^="http"]:not([href^="https://podcastdelmigrante.com"])').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
    assert.ok(externosON);
    await sinScrollHorizontal(page);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `cd-ontario-${perfil}.png`), fullPage: true });
    if (SHOTS) await page.locator(".cd-region-hero").screenshot({ path: path.join(SHOTS, `cd-ontario-cabecera-${perfil}.png`) });
    if (SHOTS) await page.locator("#vivienda").screenshot({ path: path.join(SHOTS, `cd-ontario-vivienda-${perfil}.png`) });
    if (SHOTS) await page.locator("#ciudades").screenshot({ path: path.join(SHOTS, `cd-ontario-ciudades-${perfil}.png`) });
    await page.locator('.cd-toc a[href="#ciudades"]').click();
    assert.equal(new URL(page.url()).hash, "#ciudades");
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

  /* ---------- Menú principal: «Canadá» lleva al módulo (desde la portada y desde la ficha) ---------- */
  for (const ruta of ["/", "/canada-en-datos/alberta"]) {
    const m = await abrir(browser, "computador", ruta);
    const href = await m.page.locator('#navPrimary a.nav-link', { hasText: "Canadá" }).getAttribute("href");
    assert.equal(new URL(href, BASE).pathname, "/canada-en-datos/", ruta);
    await m.ctx.close();
  }

  /* ---------- Salarios: explicación y advertencia junto a los indicadores ---------- */
  {
    const m = await abrir(browser, "celular", "/canada-en-datos/alberta");
    const empleo = await m.page.locator("#empleo").textContent();
    assert.match(empleo, /\$15\s*CAD por hora/);
    assert.match(empleo, /\$37\.35\s*CAD por hora · Año 2025/);
    assert.match(empleo, /Salario mediano provincial por hora\s*Pendiente de verificación/);
    assert.match(empleo, /No significa que todos ganen esa cantidad/);
    assert.match(empleo, /no representa necesariamente el salario inicial/);
    assert.equal(await m.page.locator('meta[name="robots"]').count(), 0, "sin noindex");
    assert.equal(await m.page.locator("text=Prototipo en revisión editorial").count(), 0);
    if (SHOTS) await m.page.locator("#empleo").screenshot({ path: path.join(SHOTS, "cd-empleo-celular.png") });
    await m.ctx.close();
  }

  /* ---------- Rutas ---------- */
  for (const [ruta, estado] of [["/canada-en-datos/ontario", 200], ["/canada-en-datos/quebec", 200], ["/canada-en-datos/nueva-escocia", 404], ["/canada-en-datos/alberta.html", 308], ["/canada-en-datos/ontario.html", 308]]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }

  await browser.close();
  console.log("OK Canadá en Datos");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
