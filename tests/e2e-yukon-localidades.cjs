/*
  Prueba de extremo a extremo (navegador) de la guía de Yukón: ficha
  territorial con bandera, reloj de Whitehorse (zona IANA America/Whitehorse,
  UTC−7 todo el año), directorio de comunidades (búsqueda con nombres del
  censo y sin acentos, filtros, lugares sin página propia), mapa, fichas
  completas, páginas básicas, escuelas, identidad visual igual a Alberta,
  «Compartir esta guía» y navegación mapa ↔ Yukón ↔ Territorios del Noroeste
  ↔ Alberta, en computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-yukon-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/yukon";
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
    /* ---------- Guía de Yukón ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, GUIA);
    assert.equal((await page.locator("h1").first().textContent()).trim(), "Yukón");
    const bandera = page.locator("h1 img.cd-flag");
    assert.equal(await bandera.getAttribute("src"), "/assets/canada-en-datos/bandera-yukon.svg");
    assert.match(await bandera.getAttribute("alt"), /^Bandera de Yukón/);
    await page.waitForFunction(() => { const i = document.querySelector("h1 img.cd-flag"); return i && i.complete && i.naturalWidth > 0; });
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las comunidades de Yukón");
    for (const id of ["poblacion", "idiomas", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "transporte", "beneficios", "integracion", "seguridad", "vida", "ciudades", "localidades", "recien-llegado", "estafas", "noticias", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#inmigracion").textContent(), /Yukon Nominee Program, YNP/);
    assert.match(await page.locator("#inmigracion").textContent(), /282 nominaciones/);
    assert.match(await page.locator("#inmigracion").textContent(), /¿Qué es federal y qué es territorial\?/);
    assert.match(await page.locator("#empleo").textContent(), /\$18\.51/);
    assert.match(await page.locator("#geografia").textContent(), /UTC−7 todo el año[\s\S]*America\/Whitehorse/);
    assert.match(await page.locator("#vivienda").textContent(), /Dato no disponible/);
    assert.match(await page.locator("#salud").textContent(), /no es automática/);
    /* Indicadores con fuente y fecha */
    const indicadores = await page.locator(".cd-indicator").evaluateAll((ds) => ds.map((d) => d.textContent));
    assert.ok(indicadores.length >= 10);
    for (const t of indicadores.filter((x) => /\d/.test(x))) assert.match(t, /Fuente[\s\S]*Consultado el/, t.slice(0, 80));
    assert.equal(await page.locator(".cd-pending").count(), 0, "sin indicadores pendientes");
    /* Reloj de la capital: zona IANA America/Whitehorse (UTC−7), con la hora que da el navegador para esa zona */
    await page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    assert.equal(await page.locator(".cd-zone").count(), 0, "una sola zona horaria");
    const reloj = await page.evaluate(() => {
      const r = CD_REGIONS.find((x) => x.code === "YT");
      const t = document.querySelector("#cdClock [data-reloj-hora]");
      const desfase = new Intl.DateTimeFormat("en-CA", { timeZone: r.timeZone, timeZoneName: "longOffset" }).format(new Date()).split("GMT")[1];
      return { zona: r.timeZone, hora: t ? t.textContent.trim() : "", desfase };
    });
    assert.equal(reloj.zona, "America/Whitehorse");
    assert.equal(reloj.desfase, "-07:00", "el navegador calcula UTC−7 para Whitehorse");
    const horaUtc7 = new Date(Date.now() - 7 * 3600 * 1000).getUTCHours() % 12 || 12;
    assert.equal(Number(reloj.hora.split(":")[0]), horaUtc7, `reloj: ${reloj.hora}`);
    /* Identidad visual: la misma que Alberta */
    const estilo = (pg) => pg.evaluate(() => ({
      acento: getComputedStyle(document.querySelector("main.cd")).getPropertyValue("--cd-acento").trim(),
      reloj: getComputedStyle(document.querySelector(".cd-clock")).backgroundColor,
      h1: getComputedStyle(document.querySelector("h1")).color,
      fondo: getComputedStyle(document.body).backgroundColor,
    }));
    const yt = await estilo(page);
    const ab = await abrir(browser, perfil, "/canada-en-datos/alberta");
    await ab.page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    assert.deepEqual(yt, await estilo(ab.page), "Yukón y Alberta con los mismos colores");
    assert.equal(await ab.page.locator("h1 img.cd-flag").count(), 0, "Alberta sin cambios: sin bandera");
    assert.deepEqual(ab.errores, []);
    await ab.ctx.close();
    await compartir(page, GUIA, "/assets/canada-en-datos/social-yukon.jpg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `yt-guia-${perfil}.png`), fullPage: true });
    await sinScrollHorizontal(page);

    /* ---------- Directorio de comunidades ---------- */
    await page.locator("#cdLoc").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const D = await page.evaluate(() => ({ n: window.CD_LOCALIDADES.localidades.length, conPagina: window.CD_LOCALIDADES.localidades.filter((f) => f[7]).length }));
    assert.equal(D.conPagina, 35);
    assert.ok(D.n > 35);
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Whitehorse[\s\S]*Ficha completa/);
    assert.ok((await page.locator("#cdLocMapa .cd-loc__punto, #cdLocMapa circle").count()) > 20, "puntos en el mapa");
    /* Nombre del censo, nombre alternativo y búsqueda sin acentos */
    for (const [q, s] of [["dawson", "dawson-city"], ["city of dawson", "dawson-city"], ["mount lorne", "mt-lorne"], ["old crow", "old-crow"], ["watson", "watson-lake"]]) {
      await page.locator("#cdLocBuscar").fill(q);
      await page.waitForFunction((s) => document.querySelector(`#cdLocLista a[href$="/yukon/${s}"]`), s);
    }
    /* Lugar sin página propia: Riverdale, dentro de Whitehorse */
    await page.locator("#cdLocBuscar").fill("riverdale");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href^="/canada-en-datos/yukon/whitehorse#lugar-riverdale"]'));
    await page.locator("#cdLocBuscar").fill("");
    /* Filtro por población: 10,000 o más → solo Whitehorse */
    await page.locator("#cdLocPob").selectOption("10000-");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length === 1);
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Whitehorse/);
    await page.locator("#cdLocPob").selectOption("");
    assert.match(await page.locator("#noticias").textContent(), /Todavía no hemos publicado noticias sobre Yukón[\s\S]*Últimas noticias/);
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `yt-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Fichas completas y páginas básicas, con reloj America/Whitehorse ---------- */
    for (const s of ["whitehorse", "dawson-city", "watson-lake", "haines-junction", "old-crow"]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/${s}`));
      assert.equal(await page.locator("[data-reloj-localidad]").getAttribute("data-zona"), "America/Whitehorse", s);
      await page.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-hora]").textContent));
      assert.match(await page.locator(".cd-panel").textContent(), /UTC−7 todo el año/);
      assert.match(await page.locator(".cd-panel").textContent(), /Emergencias\s*911/);
      if (s === "whitehorse") {
        assert.equal((await page.locator("h1").textContent()).trim(), "Whitehorse");
        assert.match(await page.locator(".cd-panel").textContent(), /28,201/);
        assert.match(await page.locator("#vivienda").textContent(), /Alquiler promedio de CMHC en Whitehorse: Dato no disponible/);
        assert.match(await page.locator("#vivienda").textContent(), /Índice de precios al consumidor de Whitehorse\s*\+6\.1%/);
        assert.match(await page.locator("#ubicacion").textContent(), /Temperatura media de enero\s*−15\.0 °C/);
        assert.match(await page.locator("#educacion").textContent(), /École Émilie-Tremblay/);
        assert.match(await page.locator("#salud").textContent(), /Whitehorse General Hospital/);
        assert.match(await page.locator("#transporte").textContent(), /Whitehorse Transit/);
        await compartir(page, `${GUIA}/whitehorse`, "/assets/canada-en-datos/yukon/whitehorse.jpg");
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `yt-whitehorse-${perfil}.png`), fullPage: true });
      }
      if (s === "dawson-city") {
        assert.match(await page.locator(".cd-panel").textContent(), /Nombre en el Censo 2021\s*Dawson/);
        assert.match(await page.locator("#salud").textContent(), /Dawson City Community Hospital/);
        assert.match(await page.locator("#educacion").textContent(), /Robert Service School/);
      }
      if (s === "old-crow") {
        assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
        assert.match(await page.locator("#ubicacion").textContent(), /−28\.7 °C/);
        assert.match(await page.locator("#educacion").textContent(), /Chief Zzeh Gittlit School/);
      }
      await sinScrollHorizontal(page);
      assert.deepEqual(errores, [], s);
      await ctx.close();
    }
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/kloo-lake`));
    assert.equal(await page.locator("[data-reloj-localidad]").count(), 0, "sin reloj donde no hay población");
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Navegación: mapa → Yukón → mapa → Territorios del Noroeste → mapa → Alberta ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    await page.locator('path[data-code="YT"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('#cdPanel a[href="/canada-en-datos/yukon"]'));
    assert.match(await page.locator("#cdPanel").textContent(), /Whitehorse/);
    await page.locator('#cdPanel a[href="/canada-en-datos/yukon"]').click();
    await page.waitForURL(/\/canada-en-datos\/yukon$/);
    await page.locator('.cd-breadcrumb a[href="/canada-en-datos/"]').click();
    await page.waitForURL(/\/canada-en-datos\/$/);
    await page.locator('path[data-code="NT"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('#cdPanel a[href="/canada-en-datos/northwest-territories"]'));
    await page.locator('#cdPanel a[href="/canada-en-datos/northwest-territories"]').click();
    await page.waitForURL(/\/canada-en-datos\/northwest-territories$/);
    assert.equal((await page.locator("h1").first().textContent()).trim(), "Territorios del Noroeste");
    assert.equal(await page.evaluate(() => CD_REGIONS.find((x) => x.code === "NT").timeZone), "America/Yellowknife", "NWT sin cambios");
    await page.locator('.cd-breadcrumb a[href="/canada-en-datos/"]').click();
    await page.waitForURL(/\/canada-en-datos\/$/);
    /* Las regiones sin ficha siguen sin ficha */
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
    [`${GUIA}/whitehorse`, 200],
    [`${GUIA}/dawson-city`, 200],
    [`${GUIA}/yukon-zona-no-organizada`, 200],
    [`${GUIA}/whitehorse.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/northwest-territories/yellowknife", 200],
    ["/canada-en-datos/nunavut/iqaluit", 200],
    ["/canada-en-datos/alberta/brooks", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Yukón: guía con bandera y reloj America/Whitehorse (UTC−7), directorio, fichas, escuelas, identidad visual de Alberta, compartir y navegación");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
