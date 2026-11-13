/*
  Prueba de extremo a extremo de «Socios y patrocinadores» en la portada:
  solo el logo oficial de Country Hills Toyota, completo y centrado, con
  enlace a la miniweb de Tomás Velázquez (con UTM de patrocinio, medidos
  en profile_view); sin espacios vacíos ni «próximamente»; sin imágenes
  rotas; computador, tableta y celular. Solo lee páginas: /api/events se
  intercepta y no llega a ningún servidor.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-patrocinadores.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const DESTINO = "perfil-tomas-velazquez?utm_source=podcastdelmigrante&utm_medium=patrocinio&utm_campaign=country-hills-toyota&utm_content=logo-portada";
const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  celular: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};

(async () => {
  const browser = await chromium.launch();
  for (const [perfil, opts] of Object.entries(PERFILES)) {
    const ctx = await browser.newContext({ ...opts, locale: "es-CA" });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    /* Recorre la página para cargar las imágenes diferidas */
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
    const row = page.locator("#sponsorRow");
    await row.scrollIntoViewIfNeeded();
    const seccion = page.locator("section", { has: row });
    assert.equal(await seccion.locator("h2").textContent(), "Socios y patrocinadores");
    assert.doesNotMatch(await seccion.textContent(), /próximamente|espacio disponible|espacios comerciales/i, "sin espacios vacíos ni «próximamente»");
    /* Un solo patrocinador, con su logo oficial */
    assert.equal(await row.locator(".sponsor-logo").count(), 1);
    assert.equal(await row.locator(".sponsor-card").count(), 0);
    const img = row.locator(".sponsor-logo img");
    assert.equal(await img.getAttribute("src"), "assets/patrocinadores/country-hills-toyota.png");
    assert.equal(await img.getAttribute("alt"), "Country Hills Toyota");
    /* El logo enlaza a la miniweb de Tomás Velázquez (misma pestaña, con UTM de patrocinio) */
    const enlace = row.locator(".sponsor-logo a");
    assert.equal(await row.locator("a").count(), 1);
    assert.equal(await enlace.getAttribute("href"), DESTINO);
    assert.equal(await enlace.getAttribute("target"), null);
    assert.equal(await enlace.getAttribute("rel"), null);
    assert.match(await enlace.getAttribute("aria-label"), /Tomás Velázquez/);
    await page.waitForFunction(() => { const i = document.querySelector("#sponsorRow img"); return i.complete && i.naturalWidth > 0; });
    const g = await page.evaluate(() => {
      const i = document.querySelector("#sponsorRow img"), r = i.getBoundingClientRect();
      const s = document.querySelector("#sponsorRow").getBoundingClientRect();
      const st = getComputedStyle(i);
      return { nw: i.naturalWidth, nh: i.naturalHeight, w: r.width, h: r.height, izq: r.left - s.left, der: s.right - r.right, filtro: st.filter, sombra: st.boxShadow, opacidad: st.opacity, transform: st.transform, anim: st.animationName };
    });
    assert.deepEqual([g.nw, g.nh], [1200, 600], "archivo original completo");
    assert.ok(Math.abs(g.w / g.h - 2) < 0.01, `${perfil}: sin deformar (${g.w}×${g.h})`);
    assert.ok(Math.abs(g.izq - g.der) <= 2, `${perfil}: centrado (${g.izq} / ${g.der})`);
    assert.ok(g.w <= 600, `${perfil}: no se amplía más de la mitad de su resolución (${g.w})`);
    assert.ok(g.w >= Math.min(320, opts.viewport.width - 60), `${perfil}: tamaño suficiente (${g.w})`);
    assert.deepEqual([g.filtro, g.sombra, g.opacidad, g.transform, g.anim], ["none", "none", "1", "none", "none"], "sin efectos");
    /* Ninguna imagen rota en la portada */
    const rotas = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src")));
    assert.deepEqual(rotas, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "sin desplazamiento horizontal");
    if (SHOTS) {
      await page.evaluate(() => { document.getElementById("siteHeader").style.position = "static"; });
      await seccion.screenshot({ path: path.join(SHOTS, `patrocinadores-${perfil}.png`) });
    }
    /* Clic (o toque) en el logo: abre la miniweb y la visita queda medida con los UTM */
    const eventos = [];
    await ctx.route(/\/api\/events/, (r) => { try { eventos.push(JSON.parse(r.request().postData() || "{}")); } catch (e) {} r.fulfill({ status: 204, body: "" }); });
    await Promise.all([page.waitForURL(/\/perfil-tomas-velazquez/), opts.hasTouch ? enlace.tap() : enlace.click()]);
    await page.waitForLoadState("networkidle");
    assert.match(await page.locator("h1").first().textContent(), /Tomás Velázquez/);
    await page.waitForTimeout(500);
    const vista = eventos.find((e) => e.event === "profile_view");
    assert.ok(vista, `${perfil}: se registra profile_view (${JSON.stringify(eventos)})`);
    assert.deepEqual([vista.business, vista.utm_source, vista.utm_medium, vista.utm_campaign, vista.utm_content], ["tomas-velazquez", "podcastdelmigrante", "patrocinio", "country-hills-toyota", "logo-portada"]);
    assert.deepEqual(errores, []);
    console.log(`ok ${perfil}: logo ${Math.round(g.w)}×${Math.round(g.h)} px, centrado, enlaza a la miniweb y mide la visita`);
    await ctx.close();
  }
  await browser.close();
  console.log("OK patrocinadores: solo Country Hills Toyota, completo, centrado y enlazado a la miniweb de Tomás Velázquez");
})().catch((e) => { console.error(e); process.exit(1); });
