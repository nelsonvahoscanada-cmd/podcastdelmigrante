/*
  Prueba de extremo a extremo (navegador) de la guía de los Territorios del
  Noroeste: ficha territorial con bandera, reloj de Yellowknife (zona IANA
  America/Yellowknife), directorio de comunidades (búsqueda con nombres
  anteriores y sin diacríticos, filtro por región, lugares sin página
  propia), mapa, fichas completas, páginas básicas, costo de vida por
  comunidad, identidad visual igual a Alberta, «Compartir esta guía» y
  navegación mapa ↔ Territorios del Noroeste ↔ Alberta, en computador,
  tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-northwest-territories-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/northwest-territories";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE }).catch(() => {});
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && errores.push(`${r.status()} ${r.url()}`));
  const resp = await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  return { ctx, page, errores, resp };
}

async function sinScrollHorizontal(page) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `desplazamiento horizontal: ${sw} > ${cw}`);
}
const meta = (page, prop) => page.locator(`meta[property="${prop}"], meta[name="${prop}"]`).first().getAttribute("content");

/* Metadatos sociales propios y bloque «Compartir esta guía» de una página */
async function compartir(page, ruta, imagen) {
  const url = SITE + ruta;
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), url, `${ruta}: canonical`);
  assert.equal(await meta(page, "og:url"), url);
  assert.equal(await meta(page, "og:image"), SITE + imagen, `${ruta}: imagen propia`);
  assert.equal(await meta(page, "twitter:card"), "summary_large_image");
  assert.ok((await meta(page, "og:title")).length > 10 && (await meta(page, "og:description")).length > 40);
  const img = await fetch(BASE + imagen);
  assert.equal(img.status, 200, imagen);
  assert.equal(img.headers.get("content-type"), "image/jpeg");

  const caja = page.locator("[data-cd-share]");
  assert.equal(await caja.count(), 1);
  assert.equal(await caja.getAttribute("data-url"), url, "comparte la URL permanente de esta página");
  for (const [red, patron] of [["whatsapp", /^https:\/\/wa\.me\/\?text=/], ["facebook", /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/], ["x", /^https:\/\/twitter\.com\/intent\/tweet\?/], ["correo", /^mailto:\?subject=/]]) {
    const href = await caja.locator(`.cd-share__red--${red}`).getAttribute("href");
    assert.match(href, patron, red);
    assert.ok(decodeURIComponent(href).includes(url), `${red}: incluye ${url}`);
  }
  assert.equal(await caja.locator("[data-share-estado]").getAttribute("role"), "status");
  /* Lejos de los 12 px en los que el encabezado del sitio cambia de tamaño (js/nav.js): justo en ese umbral
     el encabezado alterna entre grande y compacto y la página no queda quieta para hacer clic */
  await caja.evaluate((e) => window.scrollTo(0, Math.max(120, e.getBoundingClientRect().top + window.scrollY - 120)));
  await caja.locator("[data-share-copiar]").click();
  await page.waitForFunction(() => /Enlace copiado|Copia este enlace/.test(document.querySelector("[data-share-estado]").textContent));
  const copiado = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  if (copiado !== null) assert.equal(copiado, url, "portapapeles");
  await page.evaluate(() => { try { delete Navigator.prototype.share; } catch (e) {} });
  await caja.locator("[data-share-nativo]").click();
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains("cd-share__red--whatsapp")), true, "el foco va a los enlaces de redes");
  await page.evaluate(() => { window.__compartido = null; navigator.share = (d) => { window.__compartido = d; return Promise.resolve(); }; });
  await caja.locator("[data-share-nativo]").click();
  assert.equal(await page.evaluate(() => window.__compartido && window.__compartido.url), url);
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Guía de los Territorios del Noroeste ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, GUIA);
    assert.equal((await page.locator("h1").first().textContent()).trim(), "Territorios del Noroeste");
    const bandera = page.locator("h1 img.cd-flag");
    assert.equal(await bandera.getAttribute("src"), "/assets/canada-en-datos/bandera-northwest-territories.svg");
    assert.match(await bandera.getAttribute("alt"), /^Bandera de los Territorios del Noroeste/);
    await page.waitForFunction(() => { const i = document.querySelector("h1 img.cd-flag"); return i && i.complete && i.naturalWidth > 0; });
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las comunidades de los Territorios del Noroeste");
    for (const id of ["poblacion", "idiomas", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "transporte", "beneficios", "integracion", "seguridad", "vida", "ciudades", "localidades", "recien-llegado", "estafas", "noticias", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#inmigracion").textContent(), /Northwest Territories Nominee Program, NTNP/);
    assert.match(await page.locator("#inmigracion").textContent(), /¿Qué es federal y qué es territorial\?/);
    assert.match(await page.locator("#empleo").textContent(), /\$17\.20/);
    assert.match(await page.locator("#geografia").textContent(), /R-090-2026[\s\S]*UTC−6/);
    assert.match(await page.locator("#vivienda").textContent(), /\$2,109/);
    /* Indicadores con fuente y fecha */
    const indicadores = await page.locator(".cd-indicator").evaluateAll((ds) => ds.map((d) => d.textContent));
    assert.ok(indicadores.length >= 10);
    for (const t of indicadores.filter((x) => /\d/.test(x))) assert.match(t, /Fuente|Statistics Canada|Job Bank|Gobierno|CMHC/, t.slice(0, 80));
    /* Reloj de la capital: zona IANA America/Yellowknife, con la hora que da el navegador para esa zona */
    await page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    assert.equal(await page.locator(".cd-zone").count(), 0, "una sola zona horaria");
    const reloj = await page.evaluate(() => {
      /* CD_REGIONS es una constante global de js/canada-datos.js (no una propiedad de window) */
      const r = CD_REGIONS.find((x) => x.code === "NT");
      const t = document.querySelector("#cdClock [data-reloj-hora]");
      return { zona: r.timeZone, hora: t ? t.textContent.trim() : "" };
    });
    assert.equal(reloj.zona, "America/Yellowknife");
    const horaZona = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Yellowknife", hour: "numeric", hour12: true }).formatToParts(new Date()).find((x) => x.type === "hour").value);
    assert.equal(Number(reloj.hora.split(":")[0]), horaZona, `reloj: ${reloj.hora}`);
    /* Identidad visual: la misma que Alberta */
    const estilo = (pg) => pg.evaluate(() => ({
      acento: getComputedStyle(document.querySelector("main.cd")).getPropertyValue("--cd-acento").trim(),
      reloj: getComputedStyle(document.querySelector(".cd-clock")).backgroundColor,
      h1: getComputedStyle(document.querySelector("h1")).color,
      fondo: getComputedStyle(document.body).backgroundColor,
    }));
    const nt = await estilo(page);
    const ab = await abrir(browser, perfil, "/canada-en-datos/alberta");
    await ab.page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    assert.deepEqual(nt, await estilo(ab.page), "Territorios del Noroeste y Alberta con los mismos colores");
    assert.equal(await ab.page.locator("h1 img.cd-flag").count(), 0, "Alberta sin cambios: sin bandera");
    assert.deepEqual(ab.errores, []);
    await ab.ctx.close();
    await compartir(page, GUIA, "/assets/canada-en-datos/social-northwest-territories.jpg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `nt-guia-${perfil}.png`), fullPage: true });
    await sinScrollHorizontal(page);

    /* ---------- Directorio de comunidades ---------- */
    await page.locator("#cdLoc").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const D = await page.evaluate(() => ({ n: window.CD_LOCALIDADES.localidades.length, conPagina: window.CD_LOCALIDADES.localidades.filter((f) => f[7]).length }));
    assert.equal(D.conPagina, 41);
    assert.ok(D.n > 41);
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Yellowknife[\s\S]*Ficha completa/);
    assert.ok((await page.locator("#cdLocMapa .cd-loc__punto, #cdLocMapa circle").count()) > 20, "puntos en el mapa");
    /* Nombres anteriores y sin diacríticos → nombre oficial */
    for (const [q, s] of [["fort franklin", "deline"], ["deline", "deline"], ["rae-edzo", "behchoko"], ["snowdrift", "lutselk-e"], ["holman", "ulukhaktok"]]) {
      await page.locator("#cdLocBuscar").fill(q);
      await page.waitForFunction((s) => document.querySelector(`#cdLocLista a[href$="/northwest-territories/${s}"]`), s);
    }
    /* Lugar sin página propia: Ndilǫ, dentro de Yellowknife */
    await page.locator("#cdLocBuscar").fill("ndilo");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href^="/canada-en-datos/northwest-territories/yellowknife#lugar-ndilo"]'));
    await page.locator("#cdLocBuscar").fill("");
    /* Filtro por región (Beaufort Delta): solo comunidades de esa región */
    await page.locator("#cdLocRegion").selectOption({ label: "Beaufort Delta (región 1)" });
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/northwest-territories/inuvik"]'));
    const bd = await page.locator("#cdLocLista li a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.ok(bd.every((h) => !/\/(yellowknife|hay-river|fort-smith)(#|$)/.test(h)), "solo Beaufort Delta");
    await page.locator("#cdLocRegion").selectOption("");
    await page.locator("#cdLocPob").selectOption("10000-");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length === 1);
    await page.locator("#cdLocPob").selectOption("");
    assert.match(await page.locator("#noticias").textContent(), /Todavía no hemos publicado noticias sobre los Territorios del Noroeste[\s\S]*Últimas noticias/);
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `nt-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Fichas completas y páginas básicas, con reloj America/Yellowknife ---------- */
    for (const s of ["yellowknife", "hay-river", "inuvik", "fort-smith", "paulatuk"]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/${s}`));
      assert.equal(await page.locator("[data-reloj-localidad]").getAttribute("data-zona"), "America/Yellowknife", s);
      await page.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-hora]").textContent));
      assert.match(await page.locator(".cd-panel").textContent(), /UTC−6 todo el año/);
      assert.match(await page.locator(".cd-panel").textContent(), /Emergencias\s*911/);
      if (s === "yellowknife") {
        assert.equal((await page.locator("h1").textContent()).trim(), "Yellowknife");
        assert.match(await page.locator(".cd-panel").textContent(), /20,340/);
        assert.match(await page.locator("#vivienda").textContent(), /Alquiler promedio, 2 habitaciones\s*\$2,109 al mes/);
        assert.match(await page.locator("#vivienda").textContent(), /Índice de precios al consumidor de Yellowknife/);
        assert.match(await page.locator("#ubicacion").textContent(), /Temperatura media de enero\s*−25\.5 °C/);
        assert.match(await page.locator("#educacion").textContent(), /École Allain St-Cyr/);
        assert.match(await page.locator("#salud").textContent(), /Stanton Territorial Hospital/);
        await compartir(page, `${GUIA}/yellowknife`, "/assets/canada-en-datos/northwest-territories/yellowknife.jpg");
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `nt-yellowknife-${perfil}.png`), fullPage: true });
      }
      if (s === "paulatuk") {
        assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
        assert.match(await page.locator("#vivienda").textContent(), /185 a 190/);
      }
      await sinScrollHorizontal(page);
      assert.deepEqual(errores, [], s);
      await ctx.close();
    }
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/reliance`));
    assert.equal(await page.locator("[data-reloj-localidad]").count(), 0, "sin reloj donde no hay población");
    assert.match(await page.locator(".cd-panel").textContent(), /0/);
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Navegación: mapa → Territorios del Noroeste → mapa → Alberta ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    await page.locator('path[data-code="NT"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('#cdPanel a[href="/canada-en-datos/northwest-territories"]'));
    assert.match(await page.locator("#cdPanel").textContent(), /Yellowknife/);
    await page.locator('#cdPanel a[href="/canada-en-datos/northwest-territories"]').click();
    await page.waitForURL(/\/canada-en-datos\/northwest-territories$/);
    await page.locator('.cd-breadcrumb a[href="/canada-en-datos/"]').click();
    await page.waitForURL(/\/canada-en-datos\/$/);
    /* Las regiones sin ficha no aparecen como completas */
    await page.locator('path[data-code="NS"]').dispatchEvent("click");
    await page.waitForFunction(() => /Próximamente/i.test(document.querySelector("#cdPanel").textContent));
    assert.equal(await page.locator('#cdPanel a[href^="/canada-en-datos/"]').count(), 0, "Nueva Escocia sin enlace a ficha");
    await page.locator('path[data-code="AB"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('#cdPanel a[href="/canada-en-datos/alberta"]'));
    await page.locator('#cdPanel a[href="/canada-en-datos/alberta"]').click();
    await page.waitForURL(/\/canada-en-datos\/alberta$/);
    assert.equal((await page.locator("h1").first().textContent()).trim(), "Alberta");
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones ---------- */
  for (const [ruta, estado] of [
    [GUIA, 200],
    [`${GUIA}/yellowknife`, 200],
    [`${GUIA}/deline`, 200],
    [`${GUIA}/beaufort-delta-zona-no-organizada`, 200],
    [`${GUIA}/yellowknife.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/nunavut/iqaluit", 200],
    ["/canada-en-datos/alberta/brooks", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Territorios del Noroeste: guía con bandera y reloj America/Yellowknife, directorio, fichas, costo de vida, identidad visual de Alberta, compartir y navegación");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
