/*
  Prueba de extremo a extremo: las noticias se leen sin JavaScript y el
  JavaScript no las duplica ni las cambia (Soft 404 de Search Console,
  noviembre de 2026).

  Para cada noticia publicada, en computador y celular:
  - sin JavaScript: título, titular, texto completo y NewsArticle en el HTML;
  - con JavaScript: el artículo dibujado es idéntico al del HTML (salvo el
    contador de visualizaciones y las marcas de los botones de video, que
    agregan los scripts), un solo titular, un solo cuerpo, sin errores;
  - con un catálogo (js/articles.js) que no trae la noticia, como una copia
    antigua en la caché de Google, o si js/articles.js no carga: el
    artículo sigue completo y nunca aparece «no encontrado».
  Las estadísticas no se tocan: /api/* y sendBeacon se responden localmente.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-noticias-html.cjs   (BASE=http://127.0.0.1:8890)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const ctxA = {};
vm.runInNewContext(fs.readFileSync("js/articles.js", "utf8") + ";globalThis.A = ARTICLES;", ctxA);
const PUBLICADAS = ctxA.A.filter((a) => !a.draft).map((a) => a.slug);
const SOFT404 = ["canada-cambios-proceso-refugio-3-noviembre-2026", "salud-rural-urbana-alberta-atencion-medica"];

/* innerHTML del artículo sin las marcas que agregan los scripts al iniciar */
const limpio = (e) => {
  const c = e.cloneNode(true);
  c.querySelectorAll(".article-views").forEach((x) => x.remove());
  c.querySelectorAll("*").forEach((x) => [...x.attributes].forEach((a) => /^data-[a-z-]*bound$/.test(a.name) && x.removeAttribute(a.name)));
  return c.innerHTML.replace(/\s+/g, " ").trim();
};

async function contexto(browser, perfil, extra = {}) {
  const c = await browser.newContext({ ...perfil, locale: "es-CA", timezoneId: "America/Edmonton", ...extra });
  if (extra.javaScriptEnabled !== false) await c.addInitScript(() => { navigator.sendBeacon = () => true; });
  await c.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
  await c.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  return c;
}

(async () => {
  assert.ok(PUBLICADAS.length >= 40);
  const browser = await chromium.launch();
  for (const [nombre, perfil] of [["computador", { viewport: { width: 1440, height: 900 } }], ["celular", devices["iPhone 13"]]]) {
    const sin = await contexto(browser, perfil, { javaScriptEnabled: false });
    const con = await contexto(browser, perfil);
    for (const slug of PUBLICADAS) {
      const u = `${BASE}/articulo-${slug}`;
      const p1 = await sin.newPage();
      const r = await p1.goto(u, { waitUntil: "load" });
      assert.equal(r.status(), 200, `${slug}: estado`);
      const html = await p1.$eval("#articleRoot", limpio);
      const s = await p1.evaluate(() => ({ h1: document.querySelectorAll("#articleRoot h1").length, palabras: document.getElementById("articleRoot").innerText.split(/\s+/).length, ld: document.querySelectorAll("#articleJsonLd").length, cargando: document.body.innerText.includes("Cargando artículo") }));
      assert.equal(s.h1, 1, `${slug}: titular sin JavaScript`);
      assert.ok(s.palabras > 150, `${slug}: texto sin JavaScript (${s.palabras} palabras)`);
      assert.equal(s.ld, 1, `${slug}: NewsArticle en el HTML`);
      assert.equal(s.cargando, false, `${slug}: sin «Cargando artículo…»`);
      await p1.close();

      const p2 = await con.newPage();
      const errores = [];
      p2.on("pageerror", (e) => errores.push(e.message));
      await p2.goto(u, { waitUntil: "networkidle" });
      const d = await p2.evaluate(() => ({ h1: document.querySelectorAll("h1").length, cuerpos: document.querySelectorAll(".article-body").length, raices: document.querySelectorAll("#articleRoot").length, ld: document.querySelectorAll('script[type="application/ld+json"]').length, titulo: document.title }));
      assert.equal(await p2.$eval("#articleRoot", limpio), html, `${slug}: con JavaScript, el mismo artículo (sin cambios ni duplicados)`);
      assert.deepEqual([d.h1, d.cuerpos, d.raices], [1, 1, 1], `${slug}: un titular, un cuerpo`);
      assert.doesNotMatch(d.titulo, /no encontrad/i, slug);
      assert.deepEqual(errores, [], `${slug}: errores de JavaScript`);
      await p2.close();
    }
    await sin.close(); await con.close();
    console.log(`ok ${nombre}: ${PUBLICADAS.length} noticias legibles sin JavaScript e idénticas con JavaScript`);
  }

  /* Catálogo sin la noticia o que aún la tenía como borrador (copia antigua
     en caché), o que no carga: el artículo sigue completo, sin errores y con
     sus botones activos (copiar enlace, video) */
  for (const [caso, accion] of [
    ["catálogo antiguo sin la noticia", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "const ARTICLES = [];" })],
    ["catálogo antiguo con la noticia como borrador", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: `const ARTICLES = ${JSON.stringify(SOFT404.map((slug) => ({ slug, draft: true, title: "x", columnName: "x" })))};` })],
    ["js/articles.js no carga", (r) => r.abort()],
  ]) {
    const c = await contexto(browser, devices["Pixel 5"]);
    await c.route(/\/js\/articles\.js/, accion);
    for (const slug of SOFT404) {
      const p = await c.newPage();
      const errores = [];
      p.on("pageerror", (e) => errores.push(e.message));
      await p.goto(`${BASE}/articulo-${slug}`, { waitUntil: "networkidle" });
      const d = await p.evaluate(() => ({ titulo: document.title, nf: /no encontrad/i.test(document.title + document.body.innerText), palabras: document.getElementById("articleRoot").innerText.split(/\s+/).length }));
      assert.equal(d.nf, false, `${slug} (${caso}): nunca «no encontrado»`);
      assert.ok(d.palabras > 500, `${slug} (${caso}): el artículo sigue completo (${d.palabras} palabras)`);
      assert.deepEqual(errores, [], `${slug} (${caso}): sin errores de JavaScript`);
      const copiar = p.locator("#copyLinkBtn");
      if (await copiar.count()) {
        await copiar.click();
        await p.waitForFunction(() => /copiado/i.test(document.getElementById("copyLinkLabel").textContent), null, { timeout: 3000 });
      }
      const play = p.locator(".article-tiktok__play, [data-video-play]").first();
      if (await play.count()) {
        await play.scrollIntoViewIfNeeded();
        await play.click();
        await p.waitForSelector(".article-tiktok iframe, .article-video iframe", { state: "attached", timeout: 3000 });
      }
      await p.close();
    }
    await c.close();
    console.log(`ok ${caso}: las noticias señaladas como Soft 404 siguen completas, sin errores y con sus botones activos`);
  }
  await browser.close();
  console.log("OK noticias: HTML completo sin JavaScript, sin duplicados con JavaScript y sin «no encontrado»");
})().catch((e) => { console.error(e); process.exit(1); });
