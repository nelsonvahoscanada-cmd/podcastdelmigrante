/*
  Prueba de extremo a extremo (navegador) de «Últimas noticias» y del
  archivo de noticias. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-noticias.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
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
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && errores.push(`${r.status()} ${r.url()}`));
  const resp = await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores, resp };
}

async function sinScrollHorizontal(page) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `desplazamiento horizontal: ${sw} > ${cw}`);
}

const filas = (page, sel) =>
  page.locator(`${sel} .latest-row`).evaluateAll((as) => as.map((a) => ({ href: a.getAttribute("href"), fecha: a.querySelector("time").getAttribute("datetime"), titulo: a.querySelector(".latest-row__title").textContent })));

function ordenadas(lista) {
  for (let i = 1; i < lista.length; i++) assert.ok(Date.parse(lista[i - 1].fecha) >= Date.parse(lista[i].fecha), "orden por fecha");
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    const portada = await filas(page, "#latestList");
    assert.equal(portada.length, 5, "5 noticias en la portada");
    ordenadas(portada);
    const heroHref = await page.locator("#heroMain a").first().getAttribute("href");
    assert.ok(!portada.some((f) => f.href === heroHref), "sin repetir la noticia principal");
    const ver = page.getByRole("link", { name: "Ver todas las noticias" });
    assert.equal(await ver.count(), 1);
    await ver.scrollIntoViewIfNeeded();
    if (SHOTS) await page.locator("#latestList").locator("xpath=..").screenshot({ path: path.join(SHOTS, `noticias-portada-${perfil}.png`) });
    await sinScrollHorizontal(page);
    await Promise.all([page.waitForURL(/\/noticias$/), ver.click()]);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Archivo: página 1 ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/noticias"));
    assert.equal(await page.locator("h1").textContent(), "Todas las noticias");
    const p1 = await filas(page, "#archivoLista");
    assert.equal(p1.length, 12, "12 por página");
    ordenadas(p1);
    for (const f of portada) assert.ok(p1.some((g) => g.titulo === f.titulo), "las de la portada también están en el archivo");
    for (const f of p1) assert.match(f.href, /^articulo-[a-z0-9-]+$/);
    assert.equal(await page.locator('.news-pager a[aria-current="page"]').textContent(), "1");
    assert.match(await page.locator("#navPrimary").textContent(), /Canadá/);
    await sinScrollHorizontal(page);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `noticias-archivo-${perfil}.png`), fullPage: true });

    /* Siguiente → página 2 */
    await Promise.all([page.waitForURL(/pagina=2$/), page.locator('.news-pager a[rel="next"]').click()]);
    const p2 = await filas(page, "#archivoLista");
    assert.ok(p2.length >= 1 && p2.length <= 12);
    assert.ok(Date.parse(p1[p1.length - 1].fecha) >= Date.parse(p2[0].fecha), "la página 2 sigue a la 1");
    assert.ok(!p2.some((f) => p1.some((g) => g.href === f.href)), "sin duplicados entre páginas");
    assert.match(await page.title(), /página 2/);
    assert.equal(await page.locator("#canonicalLink").getAttribute("href"), "https://podcastdelmigrante.com/noticias?pagina=2");
    assert.deepEqual(errores, []);
    await ctx.close();

    /* Página inexistente → primera, con la dirección limpia */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/noticias?pagina=99"));
    assert.equal((await filas(page, "#archivoLista")).length, 12);
    assert.equal(new URL(page.url()).search, "");
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Enlaces permanentes: cada noticia del archivo responde 200 con su SEO ---------- */
  const { ctx, page } = await abrir(browser, "computador", "/noticias");
  const enlaces = [];
  for (const sel of ["/noticias", "/noticias?pagina=2"]) {
    await page.goto(BASE + sel, { waitUntil: "networkidle" });
    enlaces.push(...(await filas(page, "#archivoLista")).map((f) => f.href));
  }
  for (const href of enlaces) {
    const r = await fetch(`${BASE}/${href}`);
    assert.equal(r.status, 200, href);
    const html = await r.text();
    assert.match(html, /property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/[^"]+"/, href);
    assert.ok(html.includes(`rel="canonical" href="https://podcastdelmigrante.com/${href}"`), href);
  }
  await ctx.close();
  await browser.close();
  console.log(`OK noticias (${enlaces.length} enlaces permanentes)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
