/*
  Prueba de extremo a extremo (navegador) de la noticia «El Podcast del
  Migrante invita a una masterclass gratuita sobre crecimiento personal y toma
  de decisiones» (5-11-2026): noticia principal de la portada, artículo
  completo, imagen promocional, botón «INSCRÍBETE GRATIS» (pestaña nueva,
  rel="noopener noreferrer", sin formularios propios) y metadatos para
  compartir con la imagen del artículo, en computador, tableta y celular.
  Solo lee páginas; no abre la página externa de inscripción.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-masterclass-eder-campos.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const SLUG = "masterclass-gratuita-ley-intrinseca-creacion-eder-campos";
const IMG = "assets/masterclass-ley-intrinseca-creacion-eder-campos.jpg";
const SOCIAL = `assets/social/${SLUG}.jpg`;
const INSCRIPCION = "https://eder.aikanreboot.com/masterclass/";
const TITULO = "El Podcast del Migrante invita a una masterclass gratuita sobre crecimiento personal y toma de decisiones";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" });
  /* Nunca salir hacia la página externa del evento */
  await ctx.route((u) => !u.href.startsWith(BASE) && u.hostname === "eder.aikanreboot.com", (r) => r.abort());
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
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Portada: noticia principal destacada ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/");
    /* Desde el 11-11-2026: tercera tarjeta destacada, tras el suplemento y el alquiler */
    assert.match(await page.locator("#heroMain h1").innerText(), /^Canadá acelera 33\.000 residencias permanentes/);
    const hero = page.locator("#heroSecondary .hero-sec-card").nth(2);
    assert.equal((await hero.locator("h2").innerText()).trim(), TITULO);
    assert.equal(await hero.locator(".demo-badge").count(), 0);
    const media = hero.locator(".hero-sec-card__media");
    assert.match(await media.getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.ok(await media.isVisible());
    assert.equal((await fetch(`${BASE}/${IMG}`)).status, 200);
    const tarjetas = await page.locator("#heroSecondary .hero-sec-card").evaluateAll((cs) => cs.map((c) => c.innerText));
    assert.equal(tarjetas.length, 5, "las demás noticias destacadas se conservan");
    assert.match(tarjetas[3], /solicitar refugio/);
    assert.equal(tarjetas.filter((x) => x.includes("masterclass")).length, 1, "sin duplicados en el bloque principal");
    if (SHOTS) await page.locator("#inicio").screenshot({ path: path.join(SHOTS, `portada-${perfil}.png`) });
    await sinDesborde(page, "/");
    assert.deepEqual(errores, []);
    assert.match(await hero.locator("h2 a").getAttribute("href"), new RegExp(`articulo(-|\\.html\\?slug=)${SLUG}$`));
    await hero.locator("h2 a").evaluate((a) => a.click());
    await page.waitForURL(new RegExp(`/articulo-${SLUG}$`));
    await ctx.close();

    /* ---------- Artículo ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `/articulo-${SLUG}`));
    assert.equal((await page.locator("h1").first().innerText()).trim(), TITULO);
    const texto = await page.locator("main").innerText();
    for (const d of ["Redacción El Podcast del Migrante", "Calgary, Alberta — 5 de noviembre de 2026.", "Un espacio para reflexionar y aprender",
      "Una oportunidad para la comunidad migrante", "¿Cuándo y cómo participar?", "Eder Campos, PhD, doctor en Filología",
      "Miércoles 11 de noviembre de 2026", "7:30 p. m., hora de Calgary", "Virtual, por Zoom", "La conferencia es una iniciativa de Eder Campos",
      "El Podcast del Migrante participa en la difusión de esta invitación gratuita."]) assert.ok(texto.includes(d), d);
    /* Imagen principal: la promocional del evento, cargada y con texto alternativo */
    const mediaArt = page.locator(".article-hero-media");
    assert.match(await mediaArt.getAttribute("style"), new RegExp(IMG.replace(/\./g, "\\.")));
    assert.match((await mediaArt.getAttribute("aria-label")) || "", /Eder Campos/);
    assert.ok(await mediaArt.isVisible());
    /* Botón de inscripción: visible, enlazado y seguro */
    const boton = page.locator("a.article-apply", { hasText: "INSCRÍBETE GRATIS" });
    assert.equal(await boton.count(), 1);
    await boton.scrollIntoViewIfNeeded();
    assert.ok(await boton.isVisible());
    assert.equal(await boton.getAttribute("href"), INSCRIPCION);
    assert.equal(await boton.getAttribute("target"), "_blank");
    assert.equal(await boton.getAttribute("rel"), "noopener noreferrer");
    const caja = await boton.boundingBox();
    assert.ok(caja.height >= 40 && caja.width >= 120, `tamaño táctil ${caja.width}x${caja.height}`);
    if (SHOTS) await boton.screenshot({ path: path.join(SHOTS, `boton-${perfil}.png`) });
    /* El clic abre una pestaña nueva hacia la página oficial (bloqueada aquí) y la noticia sigue abierta */
    const [nueva] = await Promise.all([ctx.waitForEvent("page"), boton.click()]);
    assert.equal(await nueva.evaluate(() => window.opener), null, "sin acceso a la ventana de origen");
    await nueva.close();
    assert.match(page.url(), new RegExp(`/articulo-${SLUG}$`));
    /* Sin recopilar datos desde el portal */
    assert.equal(await page.locator(".article-body form, .article-body input, .article-body iframe").count(), 0);
    /* Metadatos para compartir: imagen del artículo, no la genérica */
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://podcastdelmigrante.com/articulo-${SLUG}`);
    const crudo = await (await fetch(`${BASE}/articulo-${SLUG}`)).text();
    assert.match(crudo, /<title>Masterclass gratuita «Ley Intrínseca de Creación» con Eder Campos<\/title>/);
    assert.match(crudo, new RegExp(`property="og:image" content="https://podcastdelmigrante\\.com/${SOCIAL.replace(/\./g, "\\.")}"`));
    assert.match(crudo, new RegExp(`name="twitter:image" content="https://podcastdelmigrante\\.com/${SOCIAL.replace(/\./g, "\\.")}"`));
    assert.match(crudo, /property="og:title" content="El Podcast del Migrante invita a una masterclass gratuita/);
    assert.match(crudo, /name="description" content="Masterclass gratuita de Eder Campos, PhD/);
    assert.doesNotMatch(crudo, /og:image" content="[^"]*logo/);
    const social = await fetch(`${BASE}/${SOCIAL}`);
    assert.equal(social.status, 200);
    assert.equal(social.headers.get("content-type"), "image/jpeg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `articulo-${perfil}.png`), fullPage: true });
    await sinDesborde(page, `/articulo-${SLUG}`);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }
  await browser.close();
  console.log("OK masterclass: portada (principal), artículo, imagen, botón de inscripción y vista previa para redes");
})().catch((e) => { console.error(e); process.exit(1); });
