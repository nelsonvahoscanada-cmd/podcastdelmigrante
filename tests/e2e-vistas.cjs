/*
  Prueba de extremo a extremo (navegador) del contador público de
  visualizaciones, contra Pages local con la Function y una D1 LOCAL:

  1. node scripts/build-public.mjs --out=<dir>/dist
  2. En <dir>: functions → enlace a ./functions del repositorio y un
     wrangler.toml de pruebas con la D1 local VISTAS_DB y las variables
     VISTAS_PRUEBAS_LOCAL="1" y VISTAS_SAL (ver docs/contador-visualizaciones.md)
  3. npx wrangler d1 execute vistas-local --local --file db/vistas/0001_vistas.sql
  4. npx wrangler pages dev --port 8891
  5. BASE=http://127.0.0.1:8891 VISTAS_SQLITE=<dir>/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<archivo>.sqlite \
       node tests/e2e-vistas.cjs   (SHOTS=<carpeta> opcional)
     VISTAS_SQLITE es la copia LOCAL de la base: la prueba la lee (solo
     lectura) para comprobar qué contó el servidor.

  Comprueba: dónde y cómo se ve el contador (computador, tableta, celular),
  la regla de 5 segundos visibles, que una recarga no vuelve a contar, que
  el servidor descarta duplicados y robots, que las piezas sin contador y la
  portada no lo piden, y que si el servicio falla la noticia se lee igual.
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const { DatabaseSync } = require("node:sqlite");

const BASE = process.env.BASE || "http://127.0.0.1:8891";
const DB = process.env.VISTAS_SQLITE ? new DatabaseSync(process.env.VISTAS_SQLITE, { readOnly: true }) : null;
/* Total que guardó el servidor para un artículo (base local de pruebas) */
const total = (id) => (DB ? (DB.prepare("SELECT vistas FROM vistas_total WHERE article_id = ?").get(id) || { vistas: 0 }).vistas : null);
const SHOTS = process.env.SHOTS || "";
const HECTOR = "/articulo-hector-rivero-santa-latino-canada";
const GUIA = "/articulo-plan-dental-canada-cdcp";
const SIN_CONTADOR = ["/articulo-diana-cardona-emprendimiento-digital-canada", "/articulo-el-frio-no-pudo-apagar-mi-senal", "/articulo-el-error-financiero-inmigrantes-canada"];
const PERFILES = {
  /* Chrome de escritorio normal: el de pruebas se anuncia como «HeadlessChrome» y el servidor lo trata como robot. */
  computador: { viewport: { width: 1440, height: 900 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};
/* Playwright marca navigator.webdriver = true y el contador no cuenta navegadores automatizados. */
const COMO_PERSONA = () => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });

async function abrir(browser, perfil, ruta, { persona = true, ua, init } = {}) {
  const opts = { ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" };
  if (ua) opts.userAgent = ua;
  const ctx = await browser.newContext(opts);
  if (persona) await ctx.addInitScript(COMO_PERSONA);
  if (init) await ctx.addInitScript(init);
  /* Desplazamientos ocurridos DESPUÉS de que aparece el contador: los que
     provoca el propio contador (la página ya tenía su propio desplazamiento
     al dibujarse con JavaScript, ajeno a este cambio). */
  await ctx.addInitScript(() => {
    window.__shifts = [];
    window.__tContador = null;
    /* Solo cuentan los desplazamientos de elementos del artículo (lo que el
       contador podría empujar). El pie y la cabecera del sitio se mueven al
       dibujarse la página con JavaScript desde antes de este cambio. */
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      const enArticulo = e.sources.some((x) => x.node && x.node.closest && x.node.closest("#articleRoot"));
      if (!e.hadRecentInput && enArticulo) window.__shifts.push([e.startTime, e.value]);
    })).observe({ type: "layout-shift", buffered: true });
    /* Momento en que la cifra real reemplaza al espacio reservado */
    new MutationObserver((ms) => {
      for (const m of ms) {
        const e = m.target;
        if (e.classList && e.classList.contains("article-views") && !e.hidden && !e.classList.contains("article-views--reserva") && window.__tContador === null) window.__tContador = performance.now();
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
  });
  const page = await ctx.newPage();
  const errores = [];
  const posts = [];
  const gets = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => {
    if (!r.url().includes("/api/vistas/")) return r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`);
    if (r.request().method() === "GET") gets.push(r.status());
  });
  /* Los POST van con keepalive: Playwright no entrega su cuerpo, así que se
     captura la petición y su código; lo que sumó el servidor se lee en la
     base local (VISTAS_SQLITE). */
  page.on("request", (q) => {
    if (!q.url().includes("/api/vistas/") || q.method() !== "POST") return;
    const p = { t: Date.now(), status: null };
    posts.push(p);
    q.response().then((r) => { if (r) p.status = r.status(); }).catch(() => {});
  });
  const t0 = Date.now();
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores, posts, gets, t0 };
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));


(async () => {
  const browser = await chromium.launch();
  const UA_FIJO = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 prueba-vistas";

  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Se ve bajo el título, junto a la fecha ---------- */
    const antes = total("ART-2026-029");
    const { ctx, page, errores, posts, t0 } = await abrir(browser, perfil, HECTOR);
    const contador = page.locator(".article-meta .article-views");
    await contador.waitFor({ state: "visible", timeout: 5000 });
    const meta = await page.locator(".article-meta").innerText();
    /* Publicada antes de la activación: «Artículo del Magazine», sin cifra */
    assert.match(meta, /^\d{1,2} de \w+ de 2026 · Artículo del Magazine · \d+ min de lectura$/, meta);
    assert.equal(await contador.locator(".article-views__n").count(), 0, "no muestra la cifra");
    assert.equal(await contador.locator("svg[aria-hidden='true']").count(), 1, "ícono decorativo oculto para lectores de pantalla");
    assert.equal(await contador.evaluate((e) => getComputedStyle(e).whiteSpace), "nowrap");
    const color = await contador.locator("svg").evaluate((e) => getComputedStyle(e).color);
    assert.equal(color, "rgb(85, 121, 2)", "verde oscuro de la marca (contraste 5,1:1)");
    assert.equal(await page.locator("h1").first().innerText().then((t) => t.startsWith("Héctor Rivero")), true);

    /* ---------- Cuenta a los 5 s visibles, una sola vez ---------- */
    await esperar(7000);
    assert.equal(posts.length, 1, `${perfil}: una visualización registrada`);
    assert.ok(posts[0].t - t0 >= 5000, `${perfil}: no antes de 5 s (${posts[0].t - t0} ms)`);
    assert.equal(posts[0].status, 200);
    if (DB) assert.equal(total("ART-2026-029"), antes + 1, `${perfil}: el servidor sumó 1`);

    /* Recarga inmediata: el navegador ni siquiera lo vuelve a enviar */
    await page.reload({ waitUntil: "networkidle" });
    await esperar(6500);
    assert.equal(posts.length, 1, `${perfil}: la recarga no suma`);
    if (DB) assert.equal(total("ART-2026-029"), antes + 1);

    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.ok(sw <= cw + 1, `${perfil}: sin desplazamiento horizontal`);
    const cls = await page.evaluate(() => window.__shifts.filter(([t]) => window.__tContador !== null && t >= window.__tContador - 1).reduce((a, [, v]) => a + v, 0));
    assert.ok(await page.evaluate(() => window.__tContador !== null), "el contador apareció");
    assert.ok(cls < 0.01, `${perfil}: el contador no desplaza la página (CLS posterior ${cls.toFixed(4)})`);
    if (SHOTS) {
      const box = await page.locator(".article-eyebrow-row").first().boundingBox();
      const vp = page.viewportSize();
      await page.screenshot({ path: path.join(SHOTS, `contador-${perfil}.png`), clip: { x: 0, y: Math.max(0, box.y - 16), width: vp.width, height: Math.min(vp.height, perfil === "computador" ? 480 : 820) } });
    }
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- El servidor descarta duplicados aunque se borre el navegador ---------- */
  const guiaAntes = total("ART-2026-011");
  for (const suma of [1, 0]) {
    const s = await abrir(browser, "computador", GUIA, { ua: UA_FIJO });
    await s.page.locator(".article-views").waitFor({ state: "visible" });
    await esperar(6500);
    assert.equal(s.posts.length, 1, "el navegador nuevo lo envía");
    assert.equal(s.posts[0].status, 200);
    await s.ctx.close();
    if (DB) assert.equal(total("ART-2026-011") - guiaAntes, 1, suma ? "guía: primera visita cuenta" : "mismo navegador en otra pestaña: el servidor no suma");
  }
  console.log("ok guía y deduplicación en el servidor");

  /* ---------- Regla por la hora exacta de activación (vistas_config.inicio) ----------
     Bomberos se publicó el 25 oct. 2026 a las 08:05 de Alberta (14:05 UTC), el
     mismo día de la activación real (21:17:04 de Alberta). Se prueba el borde
     cambiando solo el «inicio» de la respuesta en el navegador; la cifra es la
     que envía el servidor y la base no se toca. */
  {
    const BOMBEROS = "/articulo-alberta-bomberos-forestales-2027";
    const casos = [
      ["2026-10-26T03:17:04.778Z", "magazine", "activación real (21:17 del mismo día): anterior"],
      ["2026-10-25T14:05:00.001Z", "magazine", "publicada 1 ms antes de la activación: anterior"],
      ["2026-10-25T14:05:00.000Z", "cifra", "publicada en el instante de la activación: nueva"],
      ["2026-10-25T06:00:00.000Z", "cifra", "activación a medianoche del mismo día: nueva"],
    ];
    for (const perfil of ["computador", "celular"]) {
      for (const [inicio, espera, nombre] of casos) {
        let real = null;
        /* Navegador automatizado (webdriver): esta parte no registra visitas. */
        const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" });
        await ctx.route("**/api/vistas/**", async (r) => {
          if (r.request().method() !== "GET") return r.continue();
          const resp = await r.fetch();
          const d = await resp.json();
          real = d.vistas;
          await r.fulfill({ response: resp, json: { ...d, inicio } });
        });
        const page = await ctx.newPage();
        await page.goto(BASE + BOMBEROS, { waitUntil: "networkidle" });
        const c = page.locator(".article-meta .article-views");
        await c.waitFor({ state: "visible", timeout: 5000 });
        const meta = await page.locator(".article-meta").innerText();
        if (espera === "magazine") {
          assert.match(meta, / · Artículo del Magazine · /, `${perfil}: ${nombre}`);
          assert.equal(await c.locator(".article-views__n").count(), 0);
        } else {
          assert.equal(await c.locator(".article-views__n").innerText(), String(real), `${perfil}: ${nombre}: cifra real del servidor`);
          assert.match(meta, new RegExp(` · ${real} visualizaci(ón|ones) · `), `${perfil}: ${nombre}`);
          assert.doesNotMatch(meta, /desde el|Magazine/);
        }
        const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        assert.ok(sw <= cw + 1, `${perfil}: sin desplazamiento horizontal`);
        if (SHOTS && inicio.endsWith("06:00:00.000Z")) {
          const box = await page.locator(".article-eyebrow-row").first().boundingBox();
          const vp = page.viewportSize();
          await page.screenshot({ path: path.join(SHOTS, `contador-nueva-${perfil}.png`), clip: { x: 0, y: Math.max(0, box.y - 16), width: vp.width, height: Math.min(vp.height, perfil === "computador" ? 480 : 820) } });
        }
        await ctx.close();
      }
    }
  }
  console.log("ok regla por hora exacta (mismo día)");

  /* ---------- Pestaña oculta: no cuenta ---------- */
  {
    const oculto = () => {
      Object.defineProperty(Document.prototype, "visibilityState", { get: () => "hidden" });
      Object.defineProperty(Document.prototype, "hidden", { get: () => true });
    };
    const s = await abrir(browser, "celular", "/articulo-alberta-bomberos-forestales-2027", { init: oculto });
    await esperar(7000);
    assert.equal(s.posts.length, 0, "pestaña en segundo plano");
    await s.ctx.close();
  }
  console.log("ok pestaña oculta");

  /* ---------- Robots y navegadores automatizados ---------- */
  {
    const antes = total("ART-2026-028");
    const s = await abrir(browser, "computador", "/articulo-referendum-alberta-octubre-2026-inmigrantes", { ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" });
    await esperar(6500);
    assert.equal(s.posts.length, 1);
    if (DB) assert.equal(total("ART-2026-028"), antes, "robot conocido: el servidor no suma");
    await s.ctx.close();
    const a = await abrir(browser, "computador", "/articulo-referendum-alberta-octubre-2026-inmigrantes", { persona: false });
    await esperar(6500);
    assert.equal(a.posts.length, 0, "navegador automatizado (navigator.webdriver)");
    if (DB) assert.equal(total("ART-2026-028"), antes);
    await a.ctx.close();
  }
  console.log("ok robots");

  /* ---------- Piezas sin contador y portada ---------- */
  for (const ruta of [...SIN_CONTADOR, "/"]) {
    const s = await abrir(browser, "celular", ruta);
    await esperar(ruta === "/" ? 1500 : 6000);
    assert.equal(s.gets.length + s.posts.length, 0, `${ruta}: no consulta el contador`);
    assert.equal(await s.page.locator(".article-views").count(), 0, ruta);
    if (ruta === "/") assert.match(await s.page.locator("#heroMain h1").innerText(), /^Héctor Rivero, el Santa Latino/);
    assert.deepEqual(s.errores, []);
    await s.ctx.close();
  }
  console.log("ok sin contador en entrevistas, columnas y portada");

  /* ---------- Servicio caído: la noticia se lee igual ---------- */
  for (const modo of ["abort", 503]) {
    const ctx = await browser.newContext({ ...PERFILES.celular });
    await ctx.addInitScript(COMO_PERSONA);
    await ctx.route("**/api/vistas/**", (r) => (modo === "abort" ? r.abort() : r.fulfill({ status: 503, body: "{}" })));
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto(BASE + HECTOR, { waitUntil: "networkidle" });
    await esperar(1000);
    assert.equal(await page.locator(".article-views").isVisible(), false, "sin cifra");
    assert.match(await page.locator(".article-meta").innerText(), /^\d{1,2} de \w+ de 2026 · \d+ min de lectura$/);
    assert.ok((await page.locator(".article-body").innerText()).length > 1000, "el texto completo se muestra");
    assert.deepEqual(errores, []);
    await ctx.close();
  }
  console.log("ok servicio caído");

  await browser.close();
  console.log("OK contador de visualizaciones");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
