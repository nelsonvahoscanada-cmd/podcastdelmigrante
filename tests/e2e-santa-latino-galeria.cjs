/*
  Prueba de extremo a extremo: galería de Santa Latino (/perfil-santa-latino)
  en iPhone SE, iPhone 13, iPhone 14 Pro Max, tableta y computador:
  - la fotografía junto al árbol ya no aparece; en su lugar, las dos del
    evento navideño, una al lado de la otra (dos columnas también en el
    celular), del mismo tamaño, 4:5 con recorte (object-fit: cover), con
    separación y el marco dorado del tema, sin desbordar la pantalla;
  - la foto principal y la imagen para compartir no cambian.
  Solo lee la página: /api/* y sendBeacon se responden localmente.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-santa-latino-galeria.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const FOTOS = ["assets/directorio/perfiles/santa-latino-evento-escenario.jpg", "assets/directorio/perfiles/santa-latino-evento-regalos.jpg"];
const PERFILES = {
  "iPhone SE": devices["iPhone SE"],
  "iPhone 13": devices["iPhone 13"],
  "iPhone 14 Pro Max": devices["iPhone 14 Pro Max"],
  tableta: devices["iPad Mini"],
  computador: { viewport: { width: 1440, height: 900 } },
};

(async () => {
  const browser = await chromium.launch();
  for (const [nombre, perfil] of Object.entries(PERFILES)) {
    const ctx = await browser.newContext({ ...perfil, locale: "es-CA" });
    await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
    await ctx.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
    await ctx.addInitScript(() => { navigator.sendBeacon = () => true; });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
    await page.goto(BASE + "/perfil-santa-latino", { waitUntil: "networkidle" });

    /* Sin cambios: foto principal e imagen para compartir */
    assert.equal(await page.getAttribute(".biz-hero__photo", "src"), "assets/directorio/perfiles/santa-latino-principal-navidad.jpg");
    assert.equal(await page.getAttribute('meta[property="og:image"]', "content"), "https://podcastdelmigrante.com/assets/directorio/perfiles/santa-latino-og-navidad.jpg");

    /* Galería: las dos fotografías nuevas, sin la anterior */
    const gal = page.locator(".biz-gallery");
    await gal.scrollIntoViewIfNeeded();
    const imgs = gal.locator("img");
    assert.deepEqual(await imgs.evaluateAll((l) => l.map((i) => i.getAttribute("src"))), FOTOS);
    assert.equal(await page.locator('img[src*="santa-latino-navidad-grupo"]').count(), 0, "foto junto al árbol retirada");
    await page.waitForFunction(() => [...document.querySelectorAll(".biz-gallery img")].every((i) => i.complete && i.naturalWidth > 0));

    const m = await imgs.evaluateAll((l) => l.map((i) => { const r = i.getBoundingClientRect(), c = getComputedStyle(i); return { x: r.x, y: r.y, w: r.width, h: r.height, derecha: r.right, fit: c.objectFit, borde: c.borderTopColor }; }));
    const vw = await page.evaluate(() => document.documentElement.clientWidth);
    const [a, b] = m;
    assert.ok(Math.abs(a.y - b.y) < 1, `${nombre}: en la misma fila`);
    assert.ok(b.x > a.x + a.w, `${nombre}: una al lado de la otra`);
    assert.ok(b.x - (a.x + a.w) >= 16, `${nombre}: separación ${b.x - (a.x + a.w)} px`);
    assert.ok(Math.abs(a.w - b.w) < 1 && Math.abs(a.h - b.h) < 1, `${nombre}: mismo tamaño (${a.w}×${a.h} y ${b.w}×${b.h})`);
    for (const f of m) {
      assert.ok(Math.abs(f.w / f.h - 4 / 5) < 0.02, `${nombre}: 4:5 (${f.w}×${f.h})`);
      assert.equal(f.fit, "cover", `${nombre}: recorte sin deformar`);
      assert.equal(f.borde, "rgb(217, 178, 92)", `${nombre}: marco dorado`);
      assert.ok(f.x >= 0 && f.derecha <= vw + 0.5, `${nombre}: dentro de la pantalla`);
    }
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.ok(sw <= cw + 1, `${nombre}: sin desplazamiento horizontal`);
    if (SHOTS) await gal.screenshot({ path: path.join(SHOTS, `santa-galeria-${nombre.replace(/\s+/g, "-")}.png`) });

    assert.deepEqual(errores, [], `${nombre}: ${errores.join(" | ")}`);
    await ctx.close();
    console.log(`ok ${nombre}: dos fotografías de ${Math.round(a.w)}×${Math.round(a.h)} px, separación ${Math.round(b.x - a.x - a.w)} px`);
  }
  await browser.close();
  console.log("OK galería de Santa Latino: dos fotografías lado a lado");
})().catch((e) => { console.error(e); process.exit(1); });
