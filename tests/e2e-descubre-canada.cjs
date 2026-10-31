/*
  Prueba de extremo a extremo del módulo «Descubre tu Canadá» de la portada
  (campaña de Canadá en Datos), en computador, tableta y celular:
  textos, contador y regiones calculados desde js/canada-datos-disponibles.js,
  recorrido completo (portada → Canadá en Datos → provincia → localidad →
  ficha → enlace oficial), hero y noticias en el mismo orden que sin el
  módulo, accesibilidad y peso. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-descubre-canada.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  celular: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};

async function abrir(browser, perfil, ruta, { sinModulo = false } = {}) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
  if (sinModulo) {
    /* La misma portada sin el módulo: para comparar el orden del hero y de las noticias */
    await ctx.route((u) => u.pathname === "/" || u.pathname === "/index.html", async (r) => {
      const res = await r.fetch();
      const html = (await res.text())
        .replace(/  <!-- ================= DESCUBRE TU CANADÁ[\s\S]*?<\/section>\n\n/, "")
        .replace('\n<script src="js/canada-datos-disponibles.js"></script>\n<script src="js/descubre-canada.js"></script>', "");
      await r.fulfill({ response: res, body: html });
    });
  }
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const pesos = {};
  page.on("response", async (r) => {
    const u = new URL(r.url());
    if (/descubre|canada-datos-disponibles/.test(u.pathname)) pesos[u.pathname] = (await r.body().catch(() => Buffer.alloc(0))).length;
  });
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores, pesos };
}

const ordenPortada = (page) => page.evaluate(() => ({
  hero: [...document.querySelectorAll("#heroMain a[href], #heroSecondary a[href]")].map((a) => a.getAttribute("href")),
  ultimas: [...document.querySelectorAll("#latestList a[href]")].map((a) => a.getAttribute("href")),
}));

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada: módulo, contador y regiones desde los datos generados ---------- */
    let { ctx, page, errores, pesos } = await abrir(browser, perfil, "/");
    const datos = await page.evaluate(() => window.CD_DISPONIBLES);
    assert.ok(datos && datos.regiones.length === 13, "datos de disponibilidad cargados");
    const disp = datos.regiones.filter((r) => r.url);
    const modulo = page.locator("#descubre-tu-canada");
    await modulo.scrollIntoViewIfNeeded();
    assert.equal(await modulo.locator("h2").textContent(), "¿En qué ciudad de Canadá está tu próxima oportunidad?");
    assert.equal(await modulo.locator(".descubre__kicker").textContent(), "Descubre tu Canadá");
    const boton = modulo.locator(".descubre__btn");
    assert.equal(await boton.getAttribute("href"), "/canada-en-datos/");
    assert.equal((await boton.textContent()).trim(), "Explorar Canadá en Datos");
    assert.equal(await page.locator("#descubreConteo").textContent(), `${disp.length} de 13 provincias y territorios ya disponibles`);
    const enlaces = await page.locator("#descubreLista a").evaluateAll((as) => as.map((a) => [a.textContent, a.getAttribute("href")]));
    assert.deepEqual(enlaces, disp.map((r) => [r.name, r.url]));
    const proximas = await page.locator("#descubreProximas").textContent();
    for (const r of datos.regiones.filter((x) => !x.url)) assert.ok(proximas.includes(r.name), r.name);
    assert.equal(await page.locator("#descubreProximas a").count(), 0, "las regiones no publicadas no tienen enlace");
    /* Cada enlace del módulo lleva a una página que existe */
    for (const [, href] of [["", "/canada-en-datos/"], ...enlaces]) {
      const r = await page.request.get(BASE + href);
      assert.equal(r.status(), 200, href);
    }
    /* Mapa: imagen ligera con texto alternativo, en verde las regiones disponibles */
    const img = modulo.locator(".descubre__mapa img");
    assert.ok((await img.getAttribute("alt")).length > 20);
    await page.waitForFunction(() => document.querySelector(".descubre__mapa img").complete && document.querySelector(".descubre__mapa img").naturalWidth > 0);
    /* Ubicación: después de «Últimas noticias» y antes de «Información útil» */
    const orden = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id || s.className));
    const i = orden.indexOf("descubre-tu-canada");
    assert.equal(orden[0], "inicio");
    assert.equal(i, 2, "tercera sección: después del hero y de «Últimas noticias»");
    assert.match(orden[3], /useful-section/);
    /* Accesibilidad básica: un solo h2 y un h3, contraste, objetivos táctiles, foco con teclado */
    assert.equal(await modulo.locator("h2").count(), 1);
    assert.equal(await page.locator("#descubreTitulo").count(), 1);
    assert.equal(await modulo.getAttribute("aria-labelledby"), "descubreTitulo");
    const est = await page.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const fondo = getComputedStyle(document.querySelector(".descubre__panel")).backgroundColor;
      const c = (sel) => ratio(getComputedStyle(document.querySelector(sel)).color, fondo);
      const btn = document.querySelector(".descubre__btn"), bs = getComputedStyle(btn);
      return { titulo: c(".descubre__titulo"), sub: c(".descubre__sub"), apoyo: c(".descubre__apoyo"), conteo: c(".descubre__conteo"), pasos: c(".descubre__pasos"), proximas: c(".descubre__proximas"), pronto: c(".descubre__pronto"), boton: ratio(bs.color, bs.backgroundColor), altoBoton: btn.getBoundingClientRect().height, altoRegion: Math.min(...[...document.querySelectorAll("#descubreLista a")].map((a) => a.getBoundingClientRect().height)), fuenteTitulo: getComputedStyle(document.querySelector(".descubre__titulo")).fontFamily };
    });
    for (const k of ["titulo", "sub", "apoyo", "conteo", "pasos", "proximas", "pronto", "boton"]) assert.ok(est[k] >= 4.5, `${perfil}: contraste ${k} ${est[k].toFixed(2)}`);
    assert.ok(est.altoBoton >= 44 && est.altoRegion >= 40, `${perfil}: objetivos táctiles ${est.altoBoton} ${est.altoRegion}`);
    assert.match(est.fuenteTitulo, /Fraunces/);
    await boton.focus();
    assert.equal(await page.evaluate(() => document.activeElement.className), "descubre__btn");
    assert.equal(await boton.evaluate((a) => getComputedStyle(a).outlineStyle), "solid", "foco visible");
    /* Sin desbordes, sin errores y poco peso */
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "sin desplazamiento horizontal");
    const peso = Object.values(pesos).reduce((a, b) => a + b, 0);
    assert.ok(peso < 45000, `${perfil}: el módulo pesa ${peso} bytes`);
    if (SHOTS) {
      await page.evaluate(() => { document.getElementById("siteHeader").style.position = "static"; });
      await modulo.screenshot({ path: path.join(SHOTS, `descubre-${perfil}.png`) });
    }
    /* El hero y las noticias, en el mismo orden que la portada sin el módulo */
    const con = await ordenPortada(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    ({ ctx, page } = await abrir(browser, perfil, "/", { sinModulo: true }));
    assert.equal(await page.locator("#descubre-tu-canada").count(), 0);
    const sin = await ordenPortada(page);
    assert.ok(con.hero.length > 0 && con.ultimas.length > 0);
    assert.deepEqual(con, sin, "hero y noticias sin cambios");
    await ctx.close();
    console.log(`  ${perfil}: módulo en la 3.ª sección, ${disp.length}/13 disponibles, ${Object.keys(pesos).length} archivos (${peso} bytes), hero (${con.hero.length}) y noticias (${con.ultimas.length}) en el mismo orden`);

    /* ---------- Recorrido: portada → Canadá en Datos → Quebec → Montreal → ficha → enlace oficial ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/"));
    await page.locator(".descubre__btn").click();
    await page.waitForURL(/\/canada-en-datos\/$/);
    assert.match(await page.locator(".cd-como").textContent(), new RegExp(`^${disp.length} de 13 provincias y territorios con guía completa\\. Cómo empezar`));
    await page.locator('.cd-chip[data-code="QC"]').click();
    const guia = page.locator('.cd-panel a[href="/canada-en-datos/quebec"]').first();
    await guia.click();
    await page.waitForURL(/\/canada-en-datos\/quebec$/);
    await page.waitForLoadState("networkidle");
    await page.locator("#cdLocBuscar").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled, null, { timeout: 60000 });
    await page.locator("#cdLocBuscar").fill("montreal");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/quebec/montreal"]'));
    await page.locator('#cdLocLista a[href$="/quebec/montreal"]').first().click();
    await page.waitForURL(/\/canada-en-datos\/quebec\/montreal$/);
    assert.equal(await page.locator("h1").textContent(), "Montréal");
    assert.equal(await page.locator('#enlaces a[href="https://montreal.ca/"]').count(), 1, "enlace oficial");
    /* Una provincia sin guía: sin enlace a una página inexistente */
    await page.goto(BASE + "/canada-en-datos/", { waitUntil: "networkidle" });
    await page.locator('.cd-chip[data-code="NS"]').click();
    assert.match(await page.locator(".cd-panel").textContent(), /Ficha completa: próximamente/);
    assert.equal(await page.locator('.cd-panel a[href*="/canada-en-datos/"]').count(), 0);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `descubre-canada-en-datos-${perfil}.png`) });
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK Descubre tu Canadá: módulo, disponibilidad automática, recorrido completo, orden de noticias, accesibilidad y peso");
})().catch((e) => { console.error(e); process.exit(1); });
