/*
  Prueba de extremo a extremo (navegador) de la barra «Última hora» de la
  portada: las 5 noticias publicadas más recientes de ARTICLES, enlazadas a su
  artículo, en movimiento continuo, sin duplicados para lectores de pantalla ni
  para el teclado, con pausa al pasar el puntero y estática con movimiento
  reducido, en computador, tableta y celular. Comprueba además que la barra
  se actualiza sola cuando cambia la lista de artículos publicados (se simula
  una noticia nueva y una programada respondiendo js/articles.js con una
  versión ampliada). Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-ticker.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const PRIMERA = "masterclass-gratuita-ley-intrinseca-creacion-eder-campos";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};

async function abrir(browser, perfil, opciones = {}) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton", reducedMotion: opciones.reducido ? "reduce" : "no-preference" });
  if (opciones.articulos) await ctx.route(/\/js\/articles\.js(\?|$)/, opciones.articulos);
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  return { ctx, page, errores };
}

/* Lo que la barra muestra, separado en la lista visible para todos y la copia decorativa */
const leer = (page) =>
  page.evaluate(() => {
    const [principal, copia] = document.querySelectorAll("#breakingTrack .breaking__list");
    const items = (ul) => (ul ? [...ul.querySelectorAll("a")].map((a) => ({ titulo: a.textContent.trim(), href: a.getAttribute("href"), tab: a.tabIndex })) : null);
    return { principal: items(principal), copia: items(copia), copiaOculta: copia ? copia.getAttribute("aria-hidden") : null, animacion: getComputedStyle(document.getElementById("breakingTrack")).animationName };
  });

(async () => {
  const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Las 5 más recientes, con sus enlaces ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil);
    const esperado = await page.evaluate(() => {
      const ahora = Date.now();
      return ARTICLES.filter((a) => a.contentType === "Noticia" && a.demo === false && !a.draft && a.retirada !== true && (a.lang || "es") === "es" && Date.parse(a.publishedAt) <= ahora)
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, 5)
        .map((a) => ({ titulo: a.title, href: "articulo-" + a.slug }));
    });
    const b = await leer(page);
    assert.equal(b.principal.length, 5, "cinco titulares");
    assert.deepEqual(b.principal.map(({ titulo, href }) => ({ titulo, href })), esperado, "las 5 publicadas más recientes, en orden");
    assert.equal(b.principal[0].href, `articulo-${PRIMERA}`, "la noticia de la masterclass, primera");
    assert.equal(new Set(b.principal.map((x) => x.href)).size, 5, "sin titulares repetidos");
    assert.deepEqual(b.copia.map((x) => x.href), b.principal.map((x) => x.href), "la copia del bucle repite la misma lista, una vez");
    assert.equal(b.copiaOculta, "true", "copia oculta a lectores de pantalla");
    assert.ok(b.copia.every((x) => x.tab === -1) && b.principal.every((x) => x.tab === 0), "solo la lista principal en el orden del teclado");
    assert.equal(b.animacion, "scroll-left", "movimiento horizontal");
    assert.doesNotMatch(await page.locator(".breaking").innerText(), /Servicio de Ciudadanía|Feria de empleo|Nueva guía práctica para arrendar/, "sin los titulares antiguos");
    /* Cada enlace abre su artículo (página estática existente) */
    for (const x of b.principal) assert.equal((await fetch(`${BASE}/${x.href}`)).status, 200, x.href);
    /* El movimiento avanza y se detiene al pasar el puntero (para leer y pulsar) */
    const pos = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById("breakingTrack")).transform).m41);
    const p0 = await pos();
    await page.waitForTimeout(700);
    assert.ok((await pos()) < p0, "se desplaza hacia la izquierda");
    if (perfil === "computador") {
      await page.locator(".breaking__viewport").hover();
      const q0 = await pos();
      await page.waitForTimeout(500);
      assert.equal(await pos(), q0, "pausa al pasar el puntero");
    }
    /* Teclado: el primer titular recibe el foco, queda visible y se abre con Intro */
    await page.locator(".breaking__list:not([aria-hidden]) a").first().focus();
    const caja = await page.locator(".breaking__list:not([aria-hidden]) a").first().boundingBox();
    const vista = await page.locator(".breaking__viewport").boundingBox();
    assert.ok(caja.x >= vista.x - 1 && caja.x + 10 <= vista.x + vista.width, "el titular con foco queda a la vista");
    if (SHOTS) await page.locator(".breaking").screenshot({ path: path.join(SHOTS, `ticker-${perfil}.png`) });
    await Promise.all([page.waitForURL(new RegExp(`/articulo-${PRIMERA}$`)), page.keyboard.press("Enter")]);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Toque (celular) o clic sobre un titular en movimiento ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil));
    const segundo = page.locator(".breaking__list:not([aria-hidden]) a").nth(1);
    const destino = await segundo.getAttribute("href");
    await page.locator(".breaking__viewport").hover();
    await Promise.all([page.waitForURL(new RegExp(`/${destino}$`)), segundo.click()]);
    await ctx.close();

    /* ---------- Movimiento reducido: una sola lista, sin animación y desplazable ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, { reducido: true }));
    const r = await leer(page);
    assert.equal(r.principal.length, 5);
    assert.equal(r.copia, null, "sin copia");
    assert.equal(r.animacion, "none");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".breaking__viewport")).overflowX), "auto");
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Se actualiza sola al cambiar los artículos publicados ---------- */
    const ampliar = async (route) => {
      const r = await route.fetch();
      const original = await r.text();
      const ahora = Date.now();
      const iso = (ms) => new Date(ms).toISOString();
      const extra = `;ARTICLES.unshift(
        { id: "ART-2099-001", slug: "${PRIMERA}", contentType: "Noticia", demo: false, lang: "es", title: "Prueba: noticia nueva publicada", publishedAt: "${iso(ahora - 60000)}" },
        { id: "ART-2099-002", slug: "programada-prueba", contentType: "Noticia", demo: false, lang: "es", title: "Prueba: noticia programada", publishedAt: "${iso(ahora + 86400000)}" },
        { id: "ART-2099-003", slug: "borrador-prueba", contentType: "Noticia", demo: false, draft: true, lang: "es", title: "Prueba: borrador", publishedAt: "${iso(ahora - 30000)}" });`;
      await route.fulfill({ response: r, body: original + extra });
    };
    ({ ctx, page, errores } = await abrir(browser, perfil, { articulos: ampliar }));
    const u = await leer(page);
    assert.equal(u.principal.length, 5, "sigue con cinco");
    assert.equal(u.principal[0].titulo, "Prueba: noticia nueva publicada", "la nueva entra primera");
    assert.deepEqual(u.principal.slice(1).map((x) => x.titulo), esperado.slice(0, 4).map((x) => x.titulo), "las demás bajan un lugar");
    assert.ok(!u.principal.some((x) => x.titulo === esperado[4].titulo), "la quinta anterior sale de la barra");
    assert.ok(!u.principal.some((x) => /programada|borrador/.test(x.titulo)), "sin programadas ni borradores");
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK barra «Última hora»: 5 noticias automáticas, enlaces, movimiento, teclado, movimiento reducido y actualización sola");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
