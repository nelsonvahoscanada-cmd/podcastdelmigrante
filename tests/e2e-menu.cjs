/*
  Prueba de extremo a extremo del menú principal con «Desafío 100 Empresas»
  destacado: computador (varios anchos), tableta y celular, en páginas de
  distintas secciones. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-menu.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const DESTINO = /\/desafio-100-empresas\/?$/;
const PAGINAS = ["/", "/articulo-hector-rivero-santa-latino-canada", "/canada-en-datos/alberta", "/desafio-100-empresas/calgary/muro", "/noticias", "/esta-pagina-no-existe"];
const EXISTENTES = ["Inicio", "Canadá", "Migración", "Historias", "Videos", "Directorio Empresarial"];

async function abrir(browser, opts, ruta) {
  const ctx = await browser.newContext({ ...opts, locale: "es-CA" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(BASE + ruta, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#navPrimary a", { state: "attached" });
  return { ctx, page, errores };
}

(async () => {
  const browser = await chromium.launch();

  /* ---------- Computador: el botón cabe junto a las demás opciones ---------- */
  for (const ancho of [1080, 1280, 1440]) {
    for (const ruta of PAGINAS) {
      const { ctx, page, errores } = await abrir(browser, { viewport: { width: ancho, height: 900 } }, ruta);
      const textos = await page.locator("#navPrimary a").allInnerTexts();
      assert.deepEqual(textos.map((t) => t.trim()), [...EXISTENTES, "Desafío 100 Empresas"], `${ancho} ${ruta}`);
      const boton = page.locator("#navPrimary a.nav-link--destacado");
      assert.equal(await boton.count(), 1);
      assert.equal(await boton.locator("svg.nav-trofeo[aria-hidden='true']").count(), 1, "trofeo decorativo");
      assert.match(await boton.evaluate((a) => a.href), DESTINO, "lleva a la portada del Desafío");
      const estilo = await boton.evaluate((e) => { const s = getComputedStyle(e); return [s.backgroundColor, s.color]; });
      assert.deepEqual(estilo, ["rgb(85, 121, 2)", "rgb(255, 255, 255)"], "verde de la marca con texto blanco (5,1:1)");
      /* Trofeo discreto (18 px), a la izquierda del texto, en la misma línea, a 6 px, y botón alineado con el menú */
      const g = await boton.evaluate((a) => {
        const svg = a.querySelector("svg").getBoundingClientRect();
        const r = document.createRange(); r.selectNodeContents(a); r.setStartAfter(a.querySelector("svg"));
        const txt = r.getBoundingClientRect(), btn = a.getBoundingClientRect();
        const otro = document.querySelector("#navPrimary a:not(.nav-link--destacado)").getBoundingClientRect();
        return { w: svg.width, h: svg.height, sep: txt.left - svg.right, dy: Math.abs((svg.top + svg.height / 2) - (txt.top + txt.height / 2)), lineas: Math.round(txt.height / parseFloat(getComputedStyle(a).lineHeight || 20)), alto: btn.height, dc: Math.abs((btn.top + btn.height / 2) - (otro.top + otro.height / 2)) };
      });
      assert.deepEqual([g.w, g.h], [18, 18], `${ancho} ${ruta}: trofeo de 18 px`);
      assert.ok(g.sep >= 5.5 && g.sep <= 8.5, `${ancho} ${ruta}: separación ${g.sep}`);
      assert.ok(g.dy <= 2, `${ancho} ${ruta}: trofeo centrado con el texto (${g.dy})`);
      assert.ok(g.alto <= 40, `${ancho} ${ruta}: botón compacto (${g.alto})`);
      assert.ok(g.dc <= 2, `${ancho} ${ruta}: alineado con las demás opciones (${g.dc})`);
      /* Nada se sale ni queda oculto: todos los enlaces y «Más» dentro de la fila */
      const fila = await page.locator(".nav-row__inner").boundingBox();
      for (const sel of ["#navPrimary a", "#navMoreBtn"]) {
        for (const b of await page.locator(sel).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, r.top, r.height]; }))) {
          assert.ok(b[0] >= fila.x - 1 && b[1] <= fila.x + fila.width + 1, `${ancho} ${ruta}: ${sel} dentro de la fila`);
          assert.ok(b[3] > 0 && b[2] < fila.y + fila.height, `${ancho} ${ruta}: ${sel} visible en una sola línea`);
        }
      }
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      assert.ok(sw <= cw + 1, `${ancho} ${ruta}: sin desplazamiento horizontal`);
      /* «Más» ya no repite el Desafío */
      assert.equal(await page.locator("#navMoreMenu a", { hasText: "Desafío 100 Empresas" }).count(), 0);
      assert.deepEqual(errores, [], `${ancho} ${ruta}`);
      if (SHOTS && ruta === "/" ) await page.locator(".site-header").screenshot({ path: path.join(SHOTS, `menu-${ancho}.png`) });
      await ctx.close();
    }
    console.log(`ok computador ${ancho}px`);
  }

  /* ---------- Teclado: se llega con Tab, tiene foco visible y abre el Desafío ---------- */
  {
    const { ctx, page } = await abrir(browser, { viewport: { width: 1280, height: 900 } }, "/");
    let enfocado = false;
    for (let i = 0; i < 40 && !enfocado; i++) {
      await page.keyboard.press("Tab");
      enfocado = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("nav-link--destacado"));
    }
    assert.ok(enfocado, "alcanzable con Tab");
    const [estilo, grosor] = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.outlineWidth]; });
    assert.equal(estilo, "solid", "foco visible");
    assert.equal(grosor, "2px");
    if (SHOTS) await page.locator(".nav-row").screenshot({ path: path.join(SHOTS, "menu-foco.png") });
    await Promise.all([page.waitForURL(DESTINO), page.keyboard.press("Enter")]);
    assert.match(await page.locator("h1").first().innerText(), /100 empresarios/);
    await ctx.close();
    console.log("ok teclado");
  }

  /* ---------- Hoja de estilos antigua en caché: el trofeo no debe crecer ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route("**/css/styles.css", async (route) => {
      const r = await route.fetch();
      const css = (await r.text()).replace(/\.(mobile-)?nav-(trofeo|link--destacado)[^{]*\{[^}]*\}/g, "");
      await route.fulfill({ response: r, body: css });
    });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#navPrimary svg.nav-trofeo");
    const [w, h] = await page.locator("#navPrimary svg.nav-trofeo").evaluate((e) => { const b = e.getBoundingClientRect(); return [b.width, b.height]; });
    assert.deepEqual([w, h], [18, 18], "sin la hoja nueva el trofeo sigue en 18 px");
    await ctx.close();
    console.log("ok hoja en caché");
  }

  /* ---------- Tableta y celular: menú desplegable con la opción una sola vez ---------- */
  for (const [nombre, dispositivo] of [["tableta", devices["iPad Mini"]], ["celular", devices["iPhone 13"]]]) {
    for (const ruta of ["/", "/canada-en-datos/alberta", "/articulo-hector-rivero-santa-latino-canada"]) {
      const { ctx, page, errores } = await abrir(browser, { ...dispositivo }, ruta);
      assert.equal(await page.locator(".nav-row").isVisible(), false, "la fila de escritorio no se muestra");
      await page.locator("#navToggle").click();
      await page.locator("#mobileNav.is-open").waitFor();
      const opcion = page.locator("#mobileNavList a", { hasText: "Desafío 100 Empresas" });
      assert.equal(await opcion.count(), 1, `${nombre} ${ruta}: una sola vez`);
      assert.ok(await opcion.evaluate((e) => e.classList.contains("mobile-nav-link--destacado")));
      assert.equal(await opcion.locator("svg.nav-trofeo").count(), 1);
      const m = await opcion.evaluate((a) => { const v = a.querySelector("svg").getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(a); r.setStartAfter(a.querySelector("svg")); const t = r.getBoundingClientRect(); return [v.width, v.height, t.left - v.right, Math.abs((v.top + v.height / 2) - (t.top + t.height / 2))]; });
      assert.deepEqual(m.slice(0, 2), [17, 17], `${nombre}: trofeo de 17 px`);
      assert.ok(m[2] >= 5.5 && m[2] <= 8.5 && m[3] <= 2, `${nombre}: separación ${m[2]}, centrado ${m[3]}`);
      for (const t of EXISTENTES) assert.equal(await page.locator("#mobileNavList a", { hasText: t }).first().isVisible(), true, `${nombre}: ${t}`);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      assert.ok(sw <= cw + 1, `${nombre} ${ruta}: sin desplazamiento horizontal`);
      if (SHOTS && ruta === "/") await page.screenshot({ path: path.join(SHOTS, `menu-${nombre}.png`) });
      await Promise.all([page.waitForURL(DESTINO), opcion.click()]);
      assert.deepEqual(errores, [], `${nombre} ${ruta}`);
      await ctx.close();
    }
    console.log(`ok ${nombre}`);
  }

  await browser.close();
  console.log("OK menú con Desafío 100 Empresas");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
