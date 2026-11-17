/*
  Prueba de extremo a extremo: video comercial del Perfil Empresarial
  Premium en la miniweb de Nelson Vahos (/perfil-nelson-vahos).
  En iPhone SE, iPhone 13, iPhone 14 Pro Max, tableta y computador: sección
  justo después de la propuesta comercial (antes de «Sobre Nelson»), con título y precio, portada local (sin contactar a YouTube al abrir),
  reproductor 16:9 dentro de la pantalla y, al pulsar, el reproductor oficial
  de YouTube (youtube-nocookie) con el video ZlUEYjQpEpE.
  Con REAL=1 deja salir solo a YouTube y comprueba que el video empieza a
  reproducirse (currentTime > 0). Las estadísticas no se tocan: /api/* y
  sendBeacon se responden localmente.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-nelson-video.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta>, REAL=1 opcionales)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const REAL = process.env.REAL === "1";
const ID = "ZlUEYjQpEpE";
const TITULO = "Conoce el Perfil Empresarial Premium de El Podcast del Migrante";
const YT = /(^|\.)(youtube-nocookie\.com|youtube\.com|ytimg\.com|googlevideo\.com|ggpht\.com|gstatic\.com|google\.com|doubleclick\.net)$/;
const PERFILES = {
  "iPhone SE": devices["iPhone SE"],
  "iPhone 13": devices["iPhone 13"],
  "iPhone 14 Pro Max": devices["iPhone 14 Pro Max"],
  tableta: devices["iPad Mini"],
  computador: { viewport: { width: 1440, height: 900 } },
};

(async () => {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const resultados = [];
  for (const [nombre, perfil] of Object.entries(PERFILES)) {
    const ctx = await browser.newContext({ ...perfil, locale: "es-CA", timezoneId: "America/Edmonton" });
    const externos = [];
    await ctx.route((u) => !u.href.startsWith(BASE), (r) => {
      const h = new URL(r.request().url()).hostname;
      externos.push(h);
      return REAL && YT.test(h) ? r.continue() : r.abort();
    });
    await ctx.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
    await ctx.addInitScript(() => { navigator.sendBeacon = () => true; });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
    await page.goto(BASE + "/perfil-nelson-vahos", { waitUntil: "networkidle" });

    /* Sección, texto y portada local */
    const sec = page.locator(".biz-video");
    assert.equal(await sec.count(), 1, `${nombre}: una sección de video`);
    assert.equal((await sec.locator(".biz-h2").textContent()).trim(), TITULO);
    assert.match(await sec.textContent(), /\$24\.99 CAD al mes más impuestos aplicables/);
    const orden = await page.evaluate(() => [...document.querySelectorAll("main .biz-actions, main .biz-section")].map((e) => [...e.classList].find((c) => /^biz-(actions|cta|video|about|projects|timeline|contact)$/.test(c))).filter(Boolean));
    assert.deepEqual(orden.slice(0, 6), ["biz-actions", "biz-cta", "biz-video", "biz-about", "biz-projects", "biz-timeline"], `${nombre}: video justo después de la propuesta comercial (${orden.join(", ")})`);
    assert.equal(await sec.locator("iframe").count(), 0, `${nombre}: el reproductor no se carga hasta pulsar`);
    assert.deepEqual(externos.filter((h) => YT.test(h)), [], `${nombre}: no se contacta a YouTube al abrir (otros: ${[...new Set(externos)].join(", ")})`);
    const portada = await sec.locator(".biz-video__thumb").evaluate((e) => getComputedStyle(e).backgroundImage);
    assert.match(portada, new RegExp(`/assets/yt/${ID}\\.jpg`), `${nombre}: portada local del video`);
    assert.equal((await fetch(`${BASE}/assets/yt/${ID}.jpg`)).status, 200);
    await sec.scrollIntoViewIfNeeded();
    const vw = await page.evaluate(() => document.documentElement.clientWidth);
    const caja = await page.locator(".biz-video__frame").boundingBox();
    assert.ok(caja.x >= 0 && caja.x + caja.width <= vw + 0.5, `${nombre}: reproductor dentro de la pantalla`);
    assert.ok(Math.abs(caja.width / caja.height - 16 / 9) < 0.03, `${nombre}: 16:9 (${caja.width}×${caja.height})`);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.ok(sw <= cw + 1, `${nombre}: sin desplazamiento horizontal`);
    if (SHOTS) await sec.screenshot({ path: path.join(SHOTS, `nelson-video-${nombre.replace(/\s+/g, "-")}.png`) });

    /* Al pulsar: reproductor oficial de YouTube con el video */
    await page.locator("#bizVideoPlay").click();
    const iframe = sec.locator("iframe");
    await iframe.waitFor();
    assert.match(await iframe.getAttribute("src"), new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${ID}\\?autoplay=1`), `${nombre}: reproductor de YouTube`);
    const fb = await iframe.boundingBox();
    assert.ok(Math.abs(fb.width / fb.height - 16 / 9) < 0.03 && fb.x + fb.width <= vw + 0.5, `${nombre}: reproductor 16:9 dentro de la pantalla`);
    let estado = "reproductor insertado";
    if (REAL) {
      const frame = page.frameLocator(".biz-video iframe");
      await frame.locator("video").waitFor({ state: "attached", timeout: 30000 });
      const handle = await (await iframe.elementHandle()).contentFrame();
      let tiempo = 0;
      for (let i = 0; i < 30 && tiempo <= 0; i++) {
        tiempo = await handle.evaluate(() => { const v = document.querySelector("video"); if (v && v.paused) v.play().catch(() => {}); return v ? v.currentTime : 0; });
        if (tiempo <= 0) await page.waitForTimeout(1000);
      }
      const titulo = await handle.evaluate(() => (document.querySelector(".ytp-title-link") || {}).textContent || "");
      assert.ok(tiempo > 0, `${nombre}: el video se reproduce (currentTime ${tiempo})`);
      estado = `reproduciendo (${tiempo.toFixed(1)} s)${titulo ? ` «${titulo.trim()}»` : ""}`;
      if (SHOTS) await page.locator(".biz-video__frame").screenshot({ path: path.join(SHOTS, `nelson-video-${nombre.replace(/\s+/g, "-")}-reproduciendo.png`) });
    }
    assert.deepEqual(errores, [], `${nombre}: ${errores.join(" | ")}`);
    resultados.push(`ok ${nombre}: ${estado}`);
    console.log(resultados[resultados.length - 1]);
    await ctx.close();
  }
  await browser.close();
  console.log("OK video del Perfil Empresarial Premium en la miniweb de Nelson Vahos");
})().catch((e) => { console.error(e); process.exit(1); });
