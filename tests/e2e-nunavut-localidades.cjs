/*
  Prueba de extremo a extremo (navegador) de la guía de Nunavut: ficha
  territorial con bandera, tres zonas horarias, directorio de comunidades
  (búsqueda con nombres anteriores, filtro por región, lugares sin página
  propia), mapa, fichas con reloj de su zona, páginas básicas sin reloj
  cuando la zona no está identificada, identidad visual igual a Alberta,
  «Compartir esta guía» y navegación mapa ↔ Nunavut ↔ Alberta, en
  computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-nunavut-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/nunavut";
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
    /* ---------- Guía de Nunavut ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, GUIA);
    assert.equal((await page.locator("h1").first().textContent()).trim(), "Nunavut");
    const bandera = page.locator("h1 img.cd-flag");
    assert.equal(await bandera.getAttribute("src"), "/assets/canada-en-datos/bandera-nunavut.svg");
    assert.match(await bandera.getAttribute("alt"), /^Bandera de Nunavut/);
    await page.waitForFunction(() => { const i = document.querySelector("h1 img.cd-flag"); return i && i.complete && i.naturalWidth > 0; });
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las comunidades de Nunavut");
    for (const id of ["poblacion", "idiomas", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "transporte", "vida", "ciudades", "localidades", "recien-llegado", "estafas", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#inmigracion").textContent(), /Quebec y Nunavut son las únicas jurisdicciones sin programa propio/);
    assert.match(await page.locator("#transporte").textContent(), /No existe ninguna carretera que conecte Nunavut con el resto de Canadá/);
    assert.match(await page.locator("#empleo").textContent(), /\$20\.17/);
    /* Reloj de la capital y de las otras tres zonas, cada una con su hora */
    await page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    assert.match(await page.locator(".cd-panel__note").textContent(), /más de una zona horaria: el reloj muestra la hora de Iqaluit/);
    const zonas = await page.locator(".cd-zone").evaluateAll((ps) => ps.map((p) => [p.dataset.zona, p.querySelector("[data-zona-hora]").textContent.trim()]));
    assert.deepEqual(zonas.map((z) => z[0]), ["America/Rankin_Inlet", "America/Cambridge_Bay", "America/Atikokan"]);
    for (const [z, h] of zonas) {
      /* Misma hora (formato de 12 horas de la página) que la zona IANA calculada aquí */
      const hora = Number(new Intl.DateTimeFormat("en-CA", { timeZone: z, hour: "numeric", hour12: true }).formatToParts(new Date()).find((x) => x.type === "hour").value);
      assert.ok(h && h !== "—", z);
      assert.equal(Number(h.split(":")[0]), hora, `${z}: ${h}`);
    }
    /* Identidad visual: la misma que Alberta */
    const estilo = (pg) => pg.evaluate(() => ({
      acento: getComputedStyle(document.querySelector("main.cd")).getPropertyValue("--cd-acento").trim(),
      reloj: getComputedStyle(document.querySelector(".cd-clock")).backgroundColor,
      h1: getComputedStyle(document.querySelector("h1")).color,
      fondo: getComputedStyle(document.body).backgroundColor,
    }));
    const nu = await estilo(page);
    const ab = await abrir(browser, perfil, "/canada-en-datos/alberta");
    await ab.page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    assert.deepEqual(nu, await estilo(ab.page), "Nunavut y Alberta con los mismos colores");
    assert.equal(await ab.page.locator("h1 img.cd-flag").count(), 0, "Alberta sin cambios: sin bandera");
    await ab.ctx.close();
    await compartir(page, GUIA, "/assets/canada-en-datos/social-nunavut.jpg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `nu-guia-${perfil}.png`), fullPage: true });
    await sinScrollHorizontal(page);

    /* ---------- Directorio de comunidades ---------- */
    await page.locator("#cdLoc").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const D = await page.evaluate(() => ({ n: window.CD_LOCALIDADES.localidades.length, conPagina: window.CD_LOCALIDADES.localidades.filter((f) => f[7]).length }));
    assert.equal(D.conPagina, 31);
    assert.ok(D.n > 31);
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Iqaluit[\s\S]*Ficha completa/);
    assert.ok((await page.locator("#cdLocMapa .cd-loc__punto, #cdLocMapa circle").count()) > 20, "puntos en el mapa");
    /* Nombre anterior (Censo 2021) → nombre vigente */
    await page.locator("#cdLocBuscar").fill("cape dorset");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/nunavut/kinngait"]'));
    await page.locator("#cdLocBuscar").fill("hall beach");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/nunavut/sanirajak"]'));
    await page.locator("#cdLocBuscar").fill("repulse bay");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/nunavut/naujaat"]'));
    /* Lugar sin página propia: barrio de Apex, dentro de Iqaluit */
    await page.locator("#cdLocBuscar").fill("apex");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href="/canada-en-datos/nunavut/iqaluit#lugar-apex"]'));
    await page.locator("#cdLocBuscar").fill("");
    /* Filtro por región (Kivalliq): solo comunidades de esa región; la descripción nombra la región, no «región Nunavut» */
    assert.equal(await page.locator("#cdLocSub").count(), 0, "sin filtro duplicado de subregión");
    await page.locator("#cdLocRegion").selectOption({ label: "Kivalliq" });
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/nunavut/rankin-inlet"]'));
    const kiv = await page.locator("#cdLocLista li a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.ok(kiv.every((h) => !/\/(iqaluit|cambridge-bay|pangnirtung)(#|$)/.test(h)), "solo Kivalliq");
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /región Kivalliq/);
    assert.doesNotMatch(await page.locator("#cdLocLista").textContent(), /región Nunavut/);
    await page.locator("#cdLocRegion").selectOption("");
    /* Rangos de población de Nunavut: «2,000 o más» devuelve las comunidades grandes */
    await page.locator("#cdLocPob").selectOption("2000-");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length === 5);
    await page.locator("#cdLocPob").selectOption("");
    /* Recuadro de las islas del sur en el mapa, con Sanikiluaq dentro */
    const marco = await page.evaluate(() => {
      const r = document.querySelector("#cdLocMapa rect.cd-loc__marco");
      if (!r) return null;
      const b = r.getBoundingClientRect();
      return { w: b.width, h: b.height, titulo: r.querySelector("title").textContent };
    });
    assert.ok(marco && marco.w > 10 && marco.h > 5, "recuadro visible");
    assert.match(marco.titulo, /Islas Belcher/);
    /* Noticias: texto propio y enlaces cuando todavía no hay publicaciones */
    assert.match(await page.locator("#noticias").textContent(), /Todavía no hemos publicado noticias sobre Nunavut[\s\S]*Últimas noticias/);
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `nu-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Fichas con reloj de su zona y páginas básicas ---------- */
    for (const [s, zona] of [["iqaluit", "America/Iqaluit"], ["rankin-inlet", "America/Rankin_Inlet"], ["cambridge-bay", "America/Cambridge_Bay"], ["resolute", "America/Resolute"], ["coral-harbour", "America/Atikokan"]]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/${s}`));
      assert.equal(await page.locator("[data-reloj-localidad]").getAttribute("data-zona"), zona, s);
      await page.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-hora]").textContent));
      if (s === "iqaluit") {
        assert.equal((await page.locator("h1").textContent()).trim(), "Iqaluit");
        assert.match(await page.locator(".cd-panel").textContent(), /7,429/);
        assert.match(await page.locator(".cd-panel").textContent(), /Emergencias: policía \(RCMP\)\s*867-979-1111/);
        assert.match(await page.locator("#educacion").textContent(), /Nakasuk School[\s\S]*Nanook School/);
        assert.match(await page.locator("#ubicacion").textContent(), /Temperatura media de enero\s*−26\.0 °C/);
        assert.match(await page.locator("#vivienda").textContent(), /Índice de precios al consumidor de Iqaluit/);
        assert.match(await page.locator("#transporte").textContent(), /Canadian North/);
        await compartir(page, `${GUIA}/iqaluit`, "/assets/canada-en-datos/nunavut/iqaluit.jpg");
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `nu-iqaluit-${perfil}.png`), fullPage: true });
      }
      await sinScrollHorizontal(page);
      assert.deepEqual(errores, [], s);
      await ctx.close();
    }
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/kinngait`));
    assert.equal(await page.locator("[data-reloj-localidad]").count(), 0, "sin reloj si la zona no está identificada");
    assert.match(await page.locator(".cd-panel").textContent(), /Cape Dorset[\s\S]*Nunavut tiene tres zonas horarias/);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Navegación: mapa → Nunavut → mapa → Alberta ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    await page.locator('path[data-code="NU"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('#cdPanel a[href="/canada-en-datos/nunavut"]'));
    await page.locator('#cdPanel a[href="/canada-en-datos/nunavut"]').click();
    await page.waitForURL(/\/canada-en-datos\/nunavut$/);
    await page.locator('.cd-breadcrumb a[href="/canada-en-datos/"]').click();
    await page.waitForURL(/\/canada-en-datos\/$/);
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
    [`${GUIA}/iqaluit`, 200],
    [`${GUIA}/qikiqtaaluk-unorganized`, 200],
    [`${GUIA}/iqaluit.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/quebec/montreal", 200],
    ["/canada-en-datos/alberta/brooks", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Nunavut: guía con bandera y tres zonas, directorio, fichas con reloj de su zona, páginas básicas, identidad visual de Alberta, compartir y navegación");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
