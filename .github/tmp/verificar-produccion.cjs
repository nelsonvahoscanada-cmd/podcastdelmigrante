/* Verificación en producción del ajuste «Artículo del Magazine».
   No genera visitas: navegador automatizado (navigator.webdriver = true, el
   contador no envía nada) y además se ABORTA cualquier POST a /api/vistas. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const BASE = "https://podcastdelmigrante.com";
const INICIO = "2026-10-26T03:17:04.778Z";
const ARTS = {
  "ART-2026-029": "/articulo-hector-rivero-santa-latino-canada",
  "ART-2026-030": "/articulo-alberta-bomberos-forestales-2027",
  "ART-2026-011": "/articulo-plan-dental-canada-cdcp",
  "ART-2026-028": "/articulo-referendum-alberta-octubre-2026-inmigrantes",
};
const totales = async () => {
  const o = {};
  for (const id of Object.keys(ARTS)) o[id] = await (await fetch(`${BASE}/api/vistas/${id}`, { cache: "no-store" })).json();
  return o;
};
(async () => {
  const antes = await totales();
  console.log("ANTES " + JSON.stringify(antes));
  for (const id of Object.keys(ARTS)) assert.equal(antes[id].inicio, INICIO, "inicio real en producción");
  const browser = await chromium.launch();
  let posts = 0;
  const perfiles = { computador: { viewport: { width: 1440, height: 900 } }, celular: { ...devices["iPhone 13"] } };
  for (const [perfil, opts] of Object.entries(perfiles)) {
    for (const [id, ruta] of Object.entries(ARTS)) {
      const ctx = await browser.newContext({ ...opts, locale: "es-CA", timezoneId: "America/Edmonton" });
      await ctx.route("**/api/vistas/**", (r) => (r.request().method() === "POST" ? (posts++, r.abort()) : r.continue()));
      const page = await ctx.newPage();
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      await page.goto(BASE + ruta, { waitUntil: "networkidle" });
      const c = page.locator(".article-meta .article-views");
      await c.waitFor({ state: "visible", timeout: 10000 });
      const meta = await page.locator(".article-meta").innerText();
      assert.match(meta, / · Artículo del Magazine · /, `${perfil} ${id}: ${meta}`);
      assert.equal(await c.locator(".article-views__n").count(), 0, `${perfil} ${id}: sin cifra`);
      const ic = await c.locator("svg").evaluate((e) => { const b = e.getBoundingClientRect(); return [b.width, b.height, e.getAttribute("aria-hidden"), getComputedStyle(e).color]; });
      assert.ok(ic[0] >= 12 && ic[0] <= 20 && ic[1] <= 20, `${perfil} ${id}: ícono pequeño ${ic}`);
      assert.equal(ic[2], "true");
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      assert.ok(sw <= cw + 1, `${perfil} ${id}: sin desplazamiento horizontal`);
      assert.deepEqual(errores, [], `${perfil} ${id}`);
      if (id === "ART-2026-029") {
        const box = await page.locator(".article-eyebrow-row").first().boundingBox();
        const vp = page.viewportSize();
        await page.screenshot({ path: `shots/prod-${perfil}.png`, clip: { x: 0, y: Math.max(0, box.y - 16), width: vp.width, height: Math.min(vp.height, perfil === "computador" ? 480 : 820) } });
      }
      console.log(`ok ${perfil} ${id}: «Artículo del Magazine», ícono ${ic[0]}×${ic[1]} ${ic[3]}`);
      await ctx.close();
    }
    /* Pieza nueva: se simula en el navegador solo el «inicio» anterior a su
       publicación; la cifra es la real que envía el servidor. */
    const ctx = await browser.newContext({ ...opts, locale: "es-CA", timezoneId: "America/Edmonton" });
    let real = null;
    await ctx.route("**/api/vistas/**", async (r) => {
      if (r.request().method() === "POST") { posts++; return r.abort(); }
      const resp = await r.fetch(); const d = await resp.json(); real = d.vistas;
      await r.fulfill({ response: resp, json: { ...d, inicio: "2026-10-25T06:00:00.000Z" } });
    });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTS["ART-2026-030"], { waitUntil: "networkidle" });
    await page.locator(".article-views__n").waitFor({ state: "visible" });
    assert.equal(await page.locator(".article-views__n").innerText(), String(real), "cifra real del servidor");
    const vp = page.viewportSize(); const box = await page.locator(".article-eyebrow-row").first().boundingBox();
    await page.screenshot({ path: `shots/prod-nueva-${perfil}.png`, clip: { x: 0, y: Math.max(0, box.y - 16), width: vp.width, height: Math.min(vp.height, perfil === "computador" ? 480 : 820) } });
    console.log(`ok ${perfil} pieza nueva (simulada): muestra la cifra real ${real}`);
    await ctx.close();
  }
  await browser.close();
  /* El cliente publicado sigue registrando en todas las piezas */
  const js = await (await fetch(`${BASE}/js/vistas.js`, { cache: "no-store" })).text();
  assert.match(js, /mostrar\(datos\);\n\s+esperarVisible\(\);/, "registro tras mostrar, en todas las piezas");
  assert.match(js, /method: "POST"/);
  assert.equal(js, fs.readFileSync("js/vistas.js", "utf8"), "vistas.js en producción = main");
  for (const f of ["js/analytics.js", "js/businesses.js", "js/article.js"]) {
    const prod = await (await fetch(`${BASE}/${f}`, { cache: "no-store" })).text();
    assert.equal(prod, fs.readFileSync(f, "utf8"), `${f} intacto en producción`);
  }
  console.log("ok vistas.js registra en todas las piezas; analytics.js, businesses.js y article.js idénticos a main");
  const despues = await totales();
  console.log("DESPUES " + JSON.stringify(despues));
  assert.equal(posts, 0, "la verificación no envió ningún POST");
  for (const id of Object.keys(ARTS)) assert.ok(despues[id].vistas >= antes[id].vistas, `${id}: ningún total disminuyó`);
  console.log("OK producción (0 POST enviados)");
})().catch((e) => { console.error(e); process.exit(1); });
