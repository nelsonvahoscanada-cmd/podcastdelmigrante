/*
  Prueba de extremo a extremo (navegador) de la noticia del Canada Groceries
  and Essentials Benefit: SEGUNDA tarjeta pequeña junto a la noticia
  principal (que no cambia), artículo con la sección y el botón «CONSULTA AQUÍ
  CÓMO RECIBIR EL BENEFICIO», video de TikTok tras la introducción, recuadro
  publicitario separado con enlace a la miniweb, fuentes de la CRA, metadatos
  y ausencia de desbordes, en computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-cgeb.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "canada-groceries-essentials-benefit-cgeb-2026";
const IMG = `assets/${SLUG}.jpg`;
const TIKTOK = "7703308267048488213";
const TITULO = "¿Trabajas en Canadá? Podrías recibir dinero del Gobierno para tus compras de mercado";
const GET = "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-groceries-essentials-benefit/get-benefit.html";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  return { ctx, page, errores };
}

async function sinDesborde(page, ruta) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${ruta}: desplazamiento horizontal ${sw} > ${cw}`);
}

(async () => {
  const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada: segunda tarjeta pequeña; la principal no cambia ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    assert.match(await page.locator("#heroMain h1").innerText(), /^El Podcast del Migrante invita a una masterclass gratuita/, "noticia principal: masterclass");
    const tarjetas = page.locator("#heroSecondary .hero-sec-card");
    assert.equal(await tarjetas.count(), 5);
    const textos = await tarjetas.evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.match(textos[0], /solicitar refugio/);
    assert.match(textos[1], /Express Entry desde el 3 de noviembre/);
    assert.match(textos[2], /Santa Latino/);
    assert.match(textos[3], /¿Trabajas en Canadá\? Podrías recibir dinero del Gobierno/, "cuarta tarjeta pequeña");
    assert.match(textos[3], /2 de noviembre/);
    assert.match(textos[4], /bomberos forestales/);
    assert.equal(await page.locator(`#heroMain a[href*="${SLUG}"]`).count(), 0, "no es el titular grande");
    const t2 = tarjetas.nth(3);
    assert.match(await t2.innerHTML(), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    /* Visualmente: en el grupo de tarjetas, debajo de la primera */
    const [c1, c2] = [await tarjetas.nth(2).boundingBox(), await t2.boundingBox()];
    assert.ok(c2.y > c1.y, "la segunda tarjeta va debajo de la primera");
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    await t2.locator(`a[href*="${SLUG}"]`).first().evaluate((a) => a.click());
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const texto = await page.locator("main").innerText();
    for (const d of ["reemplazó al crédito GST/HST en julio de 2026", "aumento del 25 %", "$679", "$890", "$234", "no depende de que estés desempleado", "RC151", "Mira la noticia en video"]) assert.ok(texto.includes(d), d);
    /* Sección y botón «cómo recibirlo» */
    const h2 = page.locator("h2", { hasText: "¿Cómo solicitar o recibir este beneficio?" });
    assert.equal(await h2.count(), 1);
    assert.ok(await h2.isVisible());
    const boton = page.locator(`a.article-apply[href="${GET}"]`);
    assert.equal(await boton.count(), 1);
    assert.equal((await boton.innerText()).replace("↗", "").trim(), "CONSULTA AQUÍ CÓMO RECIBIR EL BENEFICIO");
    assert.equal(await boton.getAttribute("target"), "_blank");
    assert.ok((await boton.boundingBox()).height >= 44, "botón táctil");
    if (SHOTS) await page.locator(".article-body").screenshot({ path: path.join(SHOTS, `articulo-cuerpo-${perfil}.png`) }).catch(() => {});
    /* Video */
    assert.equal(await page.locator(".article-video--tiktok").count(), 1);
    assert.equal(await page.locator('iframe[src*="tiktok.com"]').count(), 0, "sin reproductor antes de pulsar");
    assert.equal(await page.locator(`a.article-tiktok__link[href="https://www.tiktok.com/@podcastdelmigrante/video/${TIKTOK}"]`).count(), 1, "enlace visible al video");
    /* Recuadro publicitario */
    const pub = page.locator("aside.article-patrocinio");
    assert.equal(await pub.count(), 1);
    assert.match(await pub.innerText(), /PUBLICIDAD[\s\S]*Country Hills Toyota[\s\S]*atención en español[\s\S]*tarjeta de gasolina de \$200 CAD[\s\S]*no un beneficio del Gobierno de Canadá/i);
    assert.match(await pub.locator("a").getAttribute("href"), /^perfil-tomas-velazquez\.html\?utm_source=podcastdelmigrante&utm_medium=patrocinio&utm_campaign=country-hills-toyota&utm_content=articulo-cgeb$/);
    if (SHOTS) await pub.screenshot({ path: path.join(SHOTS, `publicidad-${perfil}.png`) });
    assert.deepEqual(errores, [], "sin errores antes de cargar el reproductor de TikTok");
    await page.locator(".article-tiktok__play").click();
    assert.equal(await page.locator(`.article-tiktok iframe[src^="https://www.tiktok.com/player/v1/${TIKTOK}"]`).count(), 1, "reproductor oficial al pulsar");
    errores.length = 0;
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/assets/social/${SLUG}\\.jpg"`));
    assert.equal((await fetch(`${BASE}/assets/social/${SLUG}.jpg`)).status, 200);
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK CGEB: segunda tarjeta junto a la principal, artículo, botón oficial, video y publicidad separada");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
