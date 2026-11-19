/*
  Prueba de extremo a extremo: oferta del Perfil Empresarial Premium bajo el
  video de la miniweb de Nelson Vahos (/perfil-nelson-vahos), en iPhone SE,
  iPhone 13, iPhone 14 Pro Max, tableta y computador:
  - el bloque está dentro de la sección del video, después del reproductor;
  - beneficios, precio ($24.99 CAD al mes + impuestos aplicables) y aclaración;
  - botón verde «Quiero mi Perfil Empresarial Premium», fácil de tocar, que
    abre WhatsApp (+1 402 427 2741) con su mensaje precargado;
  - el clic emite el evento whatsapp_click con target «premium-cta» (el mismo
    sistema de medición). El evento se captura en la página y NO se envía:
    sendBeacon queda anulado y /api/* se responde localmente.
  - los botones de publicidad y patrocinios conservan su propio mensaje.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-nelson-premium.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const MSG = "Hola, vi el Perfil Empresarial Premium de El Podcast del Migrante y quiero información para registrar mi negocio por $24.99 CAD mensuales.";
const WA = `https://wa.me/14024272741?text=${encodeURIComponent(MSG)}`;
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
    const salidas = [];
    await ctx.route((u) => !u.href.startsWith(BASE), (r) => { salidas.push(r.request().url()); return r.abort(); });
    const api = [];
    await ctx.route(/\/api\//, (r) => { api.push(r.request().url()); return r.fulfill({ status: 204, body: "" }); });
    /* Los eventos se guardan en la página; sendBeacon no envía nada */
    await ctx.addInitScript(() => { window.__eventos = []; navigator.sendBeacon = (u, d) => { try { window.__eventos.push(JSON.parse(d)); } catch (e) {} return true; }; });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
    await page.goto(BASE + "/perfil-nelson-vahos", { waitUntil: "networkidle" });

    /* Ubicación: dentro de la sección del video, después del reproductor */
    const bloque = page.locator(".biz-video .biz-premium");
    assert.equal(await bloque.count(), 1, `${nombre}: un bloque Premium dentro del video`);
    assert.ok(await page.evaluate(() => { const v = document.querySelector("#bizVideoFrame"), p = document.querySelector(".biz-premium"); return !!(v.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING); }), "debajo del reproductor");
    const texto = (await bloque.textContent()).replace(/\s+/g, " ");
    for (const t of ["Miniweb personalizada", "Fotografías", "video de presentación", "WhatsApp", "redes sociales", "Dos códigos QR", "vCard", "Estadísticas", "$24.99 CAD al mes", "+ impuestos aplicables", "no garantiza clientes, visitas ni posicionamiento en buscadores"]) assert.ok(texto.includes(t), `${nombre}: ${t}`);
    assert.equal(await bloque.locator(".biz-premium__beneficios li").count(), 8);

    /* Botón: verde, visible, fácil de tocar y con el enlace correcto */
    const btn = bloque.locator("a.biz-premium__btn");
    await btn.scrollIntoViewIfNeeded();
    assert.equal((await btn.textContent()).trim(), "Quiero mi Perfil Empresarial Premium");
    assert.equal(await btn.getAttribute("href"), WA);
    assert.equal(await btn.getAttribute("target"), "_blank");
    assert.match(await btn.getAttribute("rel"), /noopener/);
    const estilo = await btn.evaluate((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { fondo: s.backgroundColor, alto: r.height, ancho: r.width, padre: e.parentElement.getBoundingClientRect().width, derecha: r.right, vw: document.documentElement.clientWidth }; });
    assert.equal(estilo.fondo, "rgb(111, 154, 3)", `${nombre}: botón verde de la marca`);
    assert.ok(estilo.alto >= 44, `${nombre}: altura táctil ${estilo.alto}`);
    assert.ok(estilo.derecha <= estilo.vw + 0.5, `${nombre}: dentro de la pantalla`);
    if (estilo.vw < 720) assert.ok(Math.abs(estilo.ancho - estilo.padre) < 2, `${nombre}: a todo el ancho en el celular`);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.ok(sw <= cw + 1, `${nombre}: sin desplazamiento horizontal`);
    if (SHOTS) await page.locator(".biz-video").screenshot({ path: path.join(SHOTS, `premium-${nombre.replace(/\s+/g, "-")}.png`) });

    /* Medición: el clic emite whatsapp_click / premium-cta (capturado, no enviado) */
    const antes = await page.evaluate(() => window.__eventos.length);
    const nueva = ctx.waitForEvent("page").catch(() => null);
    await btn.click();
    const pop = await nueva;
    if (pop) await pop.close().catch(() => {});
    await page.waitForFunction((n) => window.__eventos.length > n, antes);
    const ev = (await page.evaluate(() => window.__eventos)).slice(antes);
    assert.ok(ev.some((e) => e.event === "whatsapp_click" && e.target === "premium-cta" && e.business_id === "BIZ-005"), `${nombre}: evento medido ${JSON.stringify(ev)}`);
    assert.ok(salidas.every((u) => !/\/api\/|cdn-cgi\/rum/.test(u)), "ningún envío de estadísticas fuera de la página (solo en esta rama temporal: cargar el script de Cloudflare no es un envío)");

    /* Publicidad y patrocinios: sus botones conservan su propio mensaje */
    const otros = await page.locator('main a[href^="https://wa.me/"]:not(.biz-premium__btn)').evaluateAll((as) => as.map((a) => decodeURIComponent(a.getAttribute("href"))));
    assert.ok(otros.length >= 2 && otros.every((h) => /publicidad, patrocinios o una posible alianza comercial/.test(h)), `${nombre}: contactos comerciales separados`);

    assert.deepEqual(errores, [], `${nombre}: ${errores.join(" | ")}`);
    await ctx.close();
    console.log(`ok ${nombre}: botón ${Math.round(estilo.ancho)}×${Math.round(estilo.alto)} px; evento whatsapp_click/premium-cta capturado sin enviar`);
  }
  await browser.close();
  console.log("OK Perfil Empresarial Premium: beneficios, precio, botón de WhatsApp, aclaración y medición");
})().catch((e) => { console.error(e); process.exit(1); });
