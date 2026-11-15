/*
  Prueba de extremo a extremo: presentación del fundador en la portada
  (#fundador) en computador, tableta y celular, con y sin JavaScript.
  - Después de las noticias y de «Dónde encontrar el Magazine»; antes de
    «Socios y patrocinadores».
  - Foto cargada, nombre, cargo, texto y botón «Conoce al fundador» con
    enlace HTML a /perfil-nelson-vahos, que abre la miniweb.
  - Foco visible con teclado, sin desbordes ni errores de JavaScript.
  - Con la hoja anterior (PR #128) en la caché del navegador, la tarjeta
    mantiene sus medidas: la portada pide css/styles.css?v=<huella>.
  - Pie de página: enlace «Fundador» (una vez, en «El medio») en páginas de
    cada tipo, con y sin JavaScript; abre la miniweb.
  Las estadísticas no se tocan: /api/* y sendBeacon se responden localmente.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-fundador-portada.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
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
  "celular pequeño": { ...devices["iPhone SE"] },
  "celular grande": { ...devices["iPhone 14 Pro Max"] },
};
/* Páginas de cada tipo que comparten el pie (plantillas y generadas) */
const PIE = ["/", "/noticias", "/articulo-canada-33000-residencias-permanentes-trabajadores-2026", "/desafio-100-empresas/", "/magazine/", "/perfil-santa-latino", "/publicidad", "/colaborador-carlos-castillo"];
/* css/styles.css del PR #128 (tarjeta negra con foto grande): simula la hoja
   anterior guardada en la caché del navegador */
const HOJA_ANTERIOR = require("node:fs").readFileSync(require("node:path").join(__dirname, "fixtures-styles-pr128.css"), "utf8");
const TEXTO = "Impulsando la información, la comunicación y las alianzas empresariales para conectar y fortalecer a la comunidad latina en Canadá.";

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    for (const js of [false, true]) {
      const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton", javaScriptEnabled: js, reducedMotion: "reduce" });
      await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
      await ctx.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
      if (js) await ctx.addInitScript(() => { navigator.sendBeacon = () => true; });
      const page = await ctx.newPage();
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
      const res = await page.goto(BASE + "/", { waitUntil: js ? "networkidle" : "load" });
      assert.equal(res.status(), 200);
      const donde = `${perfil} ${js ? "con" : "sin"} JavaScript`;

      /* Orden de las secciones */
      const ids = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id || (s.querySelector(".section-title") || {}).textContent || s.className));
      const i = ids.indexOf("fundador");
      assert.ok(i > ids.indexOf("distribution") && i > ids.indexOf("historias") && ids.indexOf("distribution") > 0, `${donde}: orden ${ids.join(" > ")}`);
      assert.ok(String(ids[i + 1]).includes("Socios y patrocinadores"), `${donde}: antes de patrocinadores`);

      /* Contenido */
      const s = page.locator("#fundador");
      await s.scrollIntoViewIfNeeded();
      assert.ok(await s.isVisible());
      assert.equal((await s.locator("h2").textContent()).trim(), "Quién está detrás de El Podcast del Migrante");
      assert.equal((await s.locator("h3.fundador__nombre").textContent()).trim(), "Nelson Vahos");
      assert.equal((await s.locator(".fundador__cargo").textContent()).trim(), "Fundador de eRadio Global Corp. y El Podcast del Migrante");
      assert.equal((await s.locator(".fundador__desc").textContent()).trim(), TEXTO);
      const btn = s.locator("a.fundador__btn");
      assert.equal(await btn.getAttribute("href"), "/perfil-nelson-vahos");
      assert.equal((await btn.innerText()).replace(/\s+/g, " ").trim(), "Conoce al fundador →");
      await page.waitForFunction(() => { const i = document.querySelector(".fundador__foto"); return i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 });
      assert.equal(await s.locator(".fundador__foto").getAttribute("alt"), "Nelson Vahos, fundador de eRadio Global Corp. y El Podcast del Migrante");
      const caja = await btn.boundingBox();
      assert.ok(caja.height >= 44, `${donde}: botón táctil (${caja.height}px)`);
      /* Tarjeta compacta: foto cuadrada pequeña junto al nombre, sin deformar, dentro de la pantalla */
      const g = await page.evaluate(() => {
        const r = (e) => e.getBoundingClientRect();
        const t = document.querySelector(".fundador"), m = document.querySelector(".fundador__media"), n = document.querySelector(".fundador__nombre"), i = document.querySelector(".fundador__foto");
        const cs = getComputedStyle(i);
        return { vw: document.documentElement.clientWidth, t: r(t), m: r(m), n: r(n), fit: cs.objectFit, fondo: getComputedStyle(t).backgroundColor, borde: getComputedStyle(t).borderTopWidth };
      });
      assert.ok(Math.abs(g.m.width - g.m.height) < 1, `${donde}: foto cuadrada (${g.m.width}×${g.m.height})`);
      assert.ok(g.m.width <= (g.vw < 720 ? 100 : 150), `${donde}: foto compacta (${g.m.width}px)`);
      assert.equal(g.fit, "cover", "sin deformar");
      assert.ok(g.n.left >= g.m.right && g.n.top < g.m.bottom, `${donde}: nombre junto a la foto`);
      assert.ok(g.t.left >= 8 && g.t.right <= g.vw - 8, `${donde}: tarjeta dentro de la pantalla con margen`);
      assert.ok(g.t.height < (g.vw < 720 ? 360 : 260), `${donde}: tarjeta compacta (${Math.round(g.t.height)}px)`);
      assert.equal(g.fondo, "rgb(255, 255, 255)");
      assert.equal(g.borde, "1px");
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      /* A 320 px, «Últimas noticias» y «Video» ya desbordan en main (fuera de este
         cambio); ahí se comprueba que la sección del fundador quepa entera */
      if (cw >= 375) assert.ok(sw <= cw + 1, `${donde}: desplazamiento horizontal ${sw} > ${cw}`);
      const sec = await s.evaluate((e) => [e.scrollWidth, e.clientWidth, Math.round(e.getBoundingClientRect().right)]);
      assert.ok(sec[0] <= sec[1] + 1 && sec[2] <= cw, `${donde}: la sección del fundador cabe en la pantalla (${sec.join("/")})`);
      if (SHOTS) await s.screenshot({ path: path.join(SHOTS, `fundador-${perfil}-${js ? "js" : "sinjs"}.png`) });

      /* Teclado: foco visible en el botón */
      if (perfil === "computador") {
        await btn.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        assert.equal(await btn.evaluate((a) => a === document.activeElement), true, `${donde}: el botón recibe el foco con Tab`);
        const foco = await btn.evaluate((a) => { const c = getComputedStyle(a); return c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0; });
        assert.ok(foco, `${donde}: foco visible`);
      }

      /* El botón abre la miniweb */
      await Promise.all([page.waitForURL(/\/perfil-nelson-vahos$/, { waitUntil: "commit" }), btn.click()]);
      await page.waitForSelector("h1.biz-name");
      assert.equal((await page.locator("h1.biz-name").textContent()).trim(), "Nelson Vahos", `${donde}: abre la miniweb`);
      assert.deepEqual(errores, [], `${donde}: ${errores.join(" | ")}`);
      await ctx.close();
    }
    /* Hoja anterior en la caché del navegador (css/styles.css sin versión, del
       PR #128): la portada pide la hoja con versión y la tarjeta conserva sus
       medidas aprobadas */
    {
      const ctx = await browser.newContext({ ...PERFILES[perfil], reducedMotion: "reduce" });
      await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
      await ctx.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
      await ctx.addInitScript(() => { navigator.sendBeacon = () => true; });
      await ctx.route(/\/css\/styles\.css$/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: HOJA_ANTERIOR }));
      const page = await ctx.newPage();
      await page.goto(BASE + "/", { waitUntil: "networkidle" });
      await page.locator("#fundador").scrollIntoViewIfNeeded();
      const m = await page.evaluate(() => {
        const r = (sel) => document.querySelector(sel).getBoundingClientRect();
        return { vw: document.documentElement.clientWidth, href: document.querySelector('link[href*="css/styles.css"]').getAttribute("href"), marco: r(".fundador__media"), nombre: r(".fundador__nombre"), tarjeta: r(".fundador"), fondo: getComputedStyle(document.querySelector(".fundador")).backgroundColor };
      });
      assert.match(m.href, /^css\/styles\.css\?v=[0-9a-f]{10}$/, `${perfil}: hoja con versión`);
      assert.ok(Math.abs(m.marco.width - m.marco.height) < 1 && m.marco.width <= (m.vw < 720 ? 100 : 150), `${perfil} con hoja anterior en caché: foto ${m.marco.width}×${m.marco.height}`);
      assert.ok(m.nombre.left >= m.marco.right, `${perfil} con hoja anterior en caché: nombre junto a la foto`);
      assert.equal(m.fondo, "rgb(255, 255, 255)");
      await ctx.close();
    }

    /* Pie de página: «Fundador» una vez en «El medio», con HTML (sin JavaScript) y con JavaScript */
    for (const js of [false, true]) {
      const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton", javaScriptEnabled: js, reducedMotion: "reduce" });
      await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
      await ctx.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
      if (js) await ctx.addInitScript(() => { navigator.sendBeacon = () => true; });
      const page = await ctx.newPage();
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      for (const ruta of PIE) {
        const r = await page.goto(BASE + ruta, { waitUntil: js ? "networkidle" : "load" });
        assert.equal(r.status(), 200, ruta);
        const medio = page.locator(".site-footer .footer-col", { has: page.locator(".footer-col__title", { hasText: "El medio" }) });
        const enlaces = await medio.locator("a:not([hidden])").evaluateAll((as) => as.map((a) => [a.textContent.trim(), a.getAttribute("href")]));
        assert.deepEqual(enlaces.map(([t]) => t), ["Ediciones", "Colaboradores", "Puntos de distribución", "Fundador", "Publicidad", "Contacto"], `${ruta}: columna «El medio»`);
        assert.equal(await page.locator('.site-footer a[href="/perfil-nelson-vahos"]').count(), 1, `${ruta}: un solo enlace en el pie`);
        const f = medio.locator('a[href="/perfil-nelson-vahos"]');
        await f.scrollIntoViewIfNeeded();
        assert.ok(await f.isVisible(), `${ruta}: visible`);
        await Promise.all([page.waitForURL(/\/perfil-nelson-vahos$/, { waitUntil: "commit" }), f.click()]);
        await page.waitForSelector("h1.biz-name");
      }
      assert.deepEqual(errores, [], `${perfil} pie: ${errores.join(" | ")}`);
      await ctx.close();
    }
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK portada: presentación del fundador con enlace a /perfil-nelson-vahos");
})().catch((e) => { console.error(e); process.exit(1); });
