/* Verificación extra en producción: TikTok real al tocar, imagen social, sitemap, enlaces oficiales. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const BASE = "https://podcastdelmigrante.com";
const SLUG = "canada-33000-residencias-permanentes-trabajadores-2026";
const out = [];
const ok = (m) => { out.push("OK " + m); console.log("OK " + m); };
(async () => {
  const b = await chromium.launch();
  for (const [n, perfil] of [["celular", devices["iPhone 13"]], ["computador", { viewport: { width: 1440, height: 900 } }]]) {
    const c = await b.newContext({ ...perfil, locale: "es-CA" });
    await c.route("**/api/vistas/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "ART-2026-043", vistas: 1, visible: true }) }));
    const p = await c.newPage();
    const errores = []; p.on("pageerror", (e) => errores.push(e.message));
    await p.goto(`${BASE}/articulo-${SLUG}`, { waitUntil: "networkidle" });
    const play = p.locator(".article-tiktok__play"); await play.scrollIntoViewIfNeeded(); await play.click();
    const ifr = p.locator(".article-tiktok iframe"); await ifr.waitFor({ timeout: 20000 });
    const src = await ifr.getAttribute("src"); assert.match(src, /tiktok\.com\/player\/v1\/7707075782757190933/);
    const frame = await (await ifr.elementHandle()).contentFrame();
    let cargado = false; for (let i = 0; i < 30 && !cargado; i++) { await p.waitForTimeout(1000); try { cargado = (await frame.evaluate(() => document.readyState)) === "complete" && frame.url().includes("tiktok.com"); } catch (e) {} }
    assert.ok(cargado, "el reproductor de TikTok carga al tocar");
    await p.screenshot({ path: `/tmp/out/tiktok-${n}.png` });
    const [sw, cw] = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.ok(sw <= cw + 1, `desborde ${sw}>${cw}`);
    assert.deepEqual(errores, []);
    ok(`${n}: TikTok carga al tocar (${frame.url().slice(0, 70)}), sin desborde, sin errores`);
    await c.close();
  }
  await b.close();
  const img = Buffer.from(await (await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).arrayBuffer());
  let i = 2, dims = null; while (i < img.length) { const m = img[i + 1], l = img.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { dims = `${img.readUInt16BE(i + 7)}x${img.readUInt16BE(i + 5)}`; break; } i += 2 + l; }
  assert.equal(dims, "1200x630"); ok("imagen social 1200x630");
  require("fs").writeFileSync("/tmp/out/social.jpg", img);
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  assert.match(sm, new RegExp(`<loc>${BASE}/articulo-${SLUG}</loc>`)); ok("sitemap");
  const h = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
  assert.match(h, /id="articleJsonLd"/); assert.match(h, /data-prerendered=/); assert.match(h, /<link id="canonicalLink" rel="canonical" href="https:\/\/podcastdelmigrante\.com\/articulo-canada-33000/); ok("HTML: NewsArticle, contenido sin JS, canónica");
  require("fs").writeFileSync("/tmp/out/resumen-extra.txt", out.join("\n"));
})().catch((e) => { console.error(e); require("fs").writeFileSync("/tmp/out/resumen-extra.txt", out.join("\n") + "\nFALLO " + e.message); process.exit(1); });
