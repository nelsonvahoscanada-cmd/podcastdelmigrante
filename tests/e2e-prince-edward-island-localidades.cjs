/*
  Prueba de extremo a extremo (navegador) de la guía de Isla del Príncipe
  Eduardo: ficha provincial, directorio extendido (búsqueda con variantes,
  filtros por tipo, región económica y condado, combinados, orden y
  «Restablecer»), mapa con agrupación de puntos, fichas de localidad, reloj
  de la hora del Atlántico y «Compartir esta guía», en computador, tableta y
  celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-prince-edward-island-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/prince-edward-island";
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
    /* ---------- Guía de Isla del Príncipe Eduardo: directorio ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, GUIA);
    assert.equal(await page.evaluate(() => typeof window.CD_LOCALIDADES), "undefined", "datos cargados antes de tiempo");
    assert.equal(await page.locator("h1").first().textContent(), "Isla del Príncipe Eduardo");
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las ciudades y pueblos de Isla del Príncipe Eduardo");
    for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#geografia").textContent(), /UTC−4/);
    assert.match(await page.locator("#empleo").textContent(), /\$17\.30/);
    await compartir(page, GUIA, "/assets/canada-en-datos/social-prince-edward-island.jpg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `pei-guia-${perfil}.png`) });
    await page.locator("#localidades").scrollIntoViewIfNeeded();
    const t0 = Date.now();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const msCarga = Date.now() - t0;
    const total = await page.evaluate(() => window.CD_LOCALIDADES.localidades.length);
    assert.equal(total, 727);
    assert.equal(await page.locator("#cdLocLista li").count(), 40, "listado por tandas");
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Charlottetown[\s\S]*Ficha completa/);
    /* Mapa: con todas las localidades se agrupan los puntos */
    const grupos = await page.locator(".cd-loc__grupo").count();
    const marcadores = await page.locator("#cdLocMapa circle").count();
    assert.ok(grupos > 20, `${grupos} grupos`);
    assert.ok(marcadores < 300, `${marcadores} círculos en el mapa (de ${total} localidades)`);
    /* Búsqueda por nombre parcial, en mayúsculas y sin apóstrofo */
    await page.locator("#cdLocBuscar").fill("CHARLOTT");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length < 10);
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), `${GUIA}/charlottetown`);
    await page.locator("#cdLocBuscar").fill("oleary");
    await page.waitForFunction(() => /O'Leary/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/o-leary"]`).count(), 1, "el pueblo de O'Leary, escrito sin apóstrofo");
    assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/o-leary-fire-district"]`).count(), 1, "y el distrito de bomberos homónimo");
    await page.locator("#cdLocBuscar").fill("saint peters");
    await page.waitForFunction(() => /St\. Peters Bay/.test(document.querySelector("#cdLocLista").textContent));
    /* Homónimos: el pueblo y el distrito de bomberos se distinguen por su tipo */
    await page.locator("#cdLocBuscar").fill("souris");
    await page.waitForFunction(() => /Souris \(distrito de bomberos\)/.test(document.querySelector("#cdLocLista").textContent));
    assert.match(await page.locator("#cdLocLista").textContent(), /Souris \(pueblo\)/);
    /* Un lugar sin página propia lleva a su subdivisión con el lugar resaltado, y el mapa lo muestra */
    await page.locator("#cdLocBuscar").fill("rollo bay west");
    await page.waitForFunction(() => /Rollo Bay West/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), `${GUIA}/souris-fire-district#lugar-rollo-bay-west`);
    assert.match(await page.locator("#cdLocLista .cd-loc__item-tipo").first().textContent(), /está en Souris \(distrito de bomberos\) · Kings/);
    await page.locator(".cd-loc__punto").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta").textContent(), /Rollo Bay West[\s\S]*está en Souris \(distrito de bomberos\)/);
    assert.equal(await page.locator("#cdLocTarjeta a").getAttribute("href"), `${GUIA}/souris-fire-district#lugar-rollo-bay-west`);
    await page.locator("#cdLocTarjeta .cd-loc__cerrar").click();

    /* Todo el catálogo: cada localidad y cada lugar aparece al buscar su nombre, con su enlace y su subdivisión */
    const catalogo = await page.evaluate((GUIA) => {
      const D = window.CD_LOCALIDADES;
      const [buscar, tipo, mas, lista] = ["cdLocBuscar", "cdLocTipo", "cdLocMas", "cdLocLista"].map((id) => document.getElementById(id));
      const base = GUIA + "/";
      const fallos = [];
      let comunidades = 0;
      for (const f of D.localidades) {
        buscar.value = f[0];
        tipo.dispatchEvent(new Event("change"));
        const m = f[5] === -1 ? null : D.localidades[f[5]];
        const esperado = m ? base + m[7] + (f[11] ? "#" + f[11] : "") : base + f[7];
        let a;
        for (;;) {
          a = [...lista.querySelectorAll("a")].find((x) => x.getAttribute("href") === esperado && x.querySelector(".cd-loc__item-nombre").textContent.startsWith(f[0]));
          if (a || mas.hidden) break;
          mas.click();
        }
        if (!a) fallos.push(`no aparece: ${f[0]}`);
        else if (m) {
          comunidades++;
          const texto = a.querySelector(".cd-loc__item-tipo").textContent;
          if (!f[11] || !texto.includes(`está en ${m[0]}`) || !texto.includes(` · ${f[9]} · `)) fallos.push(`sin subdivisión o condado: ${f[0]}`);
        }
      }
      buscar.value = "";
      tipo.dispatchEvent(new Event("change"));
      return { total: D.localidades.length, comunidades, fallos };
    }, GUIA);
    assert.deepEqual(catalogo.fallos, [], catalogo.fallos.slice(0, 10).join("; "));
    assert.equal(catalogo.total, 727);
    assert.equal(catalogo.comunidades, 629);
    console.log(`  ${perfil}: ${catalogo.total} búsquedas por nombre correctas (${catalogo.comunidades} lugares sin página propia, con su subdivisión y condado)`);

    /* Cada opción de tipo, región económica y condado: el número mostrado coincide con los datos oficiales */
    const opciones = await page.evaluate(() => ({
      tipos: [...document.querySelectorAll("#cdLocTipo option")].map((o) => o.value).filter(Boolean),
      regiones: [...document.querySelectorAll("#cdLocRegion option")].map((o) => o.value).filter(Boolean),
      condados: [...document.querySelectorAll("#cdLocSub option")].map((o) => o.value).filter(Boolean),
    }));
    assert.ok(opciones.tipos.length >= 15, JSON.stringify(opciones.tipos));
    assert.deepEqual(opciones.regiones, ["1110"], "una sola región económica: no se inventan otras");
    assert.deepEqual(opciones.condados, ["Kings", "Prince", "Queens"]);
    let filtrosProbados = 0;
    for (const [sel, valores] of [["#cdLocTipo", opciones.tipos], ["#cdLocRegion", opciones.regiones], ["#cdLocSub", opciones.condados]]) {
      for (const v of valores) {
        await page.locator(sel).selectOption(v);
        const esperado = await page.evaluate(([sel, v]) => {
          const D = window.CD_LOCALIDADES;
          if (sel === "#cdLocRegion") return D.localidades.filter((f) => String(f[2]) === v).length;
          if (sel === "#cdLocSub") return D.localidades.filter((f) => f[9] === v).length;
          return D.localidades.filter((f) => (v.startsWith("grupo:") ? D.tipos[f[1]][2] === v.slice(6) : f[1] === v)).length;
        }, [sel, v]);
        assert.ok(esperado > 0, `${sel}=${v} sin localidades`);
        filtrosProbados++;
        assert.match(await page.locator("#cdLocEstado").textContent(), new RegExp(`^${esperado.toLocaleString("en-US")} localidad(es)? encontradas? de 727\\.$`), `${sel}=${v}`);
      }
      await page.locator(sel).selectOption("");
    }
    console.log(`  ${perfil}: ${filtrosProbados} opciones de tipo, región y condado con el conteo correcto`);
    /* Filtros combinados: pueblos del condado de Prince */
    await page.locator("#cdLocBuscar").fill("");
    await page.locator("#cdLocTipo").selectOption("town");
    await page.locator("#cdLocSub").selectOption("Prince");
    await page.waitForTimeout(300);
    let nombres = await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents();
    for (const n of ["Kensington", "Alberton", "O'Leary", "Tignish", "Borden-Carleton"]) assert.ok(nombres.some((x) => x.startsWith(n)), `${n} es pueblo del condado de Prince`);
    assert.ok(nombres.every((x) => !/Charlottetown|Stratford|Summerside/.test(x)), nombres.join(", "));
    assert.match(await page.locator("#cdLocEstado").textContent(), /^\d+ localidad(es)? encontradas? de 727\.$/);
    /* Condado + población + orden */
    await page.locator("#cdLocTipo").selectOption("");
    await page.locator("#cdLocSub").selectOption("Queens");
    await page.locator("#cdLocPob").selectOption("10000-99999");
    await page.locator("#cdLocOrden").selectOption("az");
    await page.waitForTimeout(300);
    nombres = await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents();
    assert.deepEqual(nombres.map((x) => x.replace(/Ficha completa/, "").trim()), ["Charlottetown", "Stratford"]);
    assert.equal(await page.locator(".cd-loc__punto").count(), nombres.length, "mapa y listado coinciden");
    /* Orden por población (de mayor a menor) */
    await page.locator("#cdLocSub").selectOption("");
    await page.locator("#cdLocPob").selectOption("");
    await page.locator("#cdLocOrden").selectOption("");
    await page.waitForTimeout(300);
    const primeros = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).slice(0, 3).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(primeros, ["Charlottetown", "Summerside", "Stratford"]);
    /* Restablecer */
    await page.locator("#cdLocTipo").selectOption("rural");
    await page.locator("#cdLocReset").click();
    await page.waitForTimeout(300);
    assert.match(await page.locator("#cdLocEstado").textContent(), /^727 localidades encontradas/);
    for (const id of ["#cdLocBuscar", "#cdLocTipo", "#cdLocRegion", "#cdLocSub", "#cdLocPob", "#cdLocOrden"]) assert.equal(await page.locator(id).inputValue(), "", id);
    /* Mapa: un grupo acerca la vista; «Toda la provincia» vuelve; un punto abre su tarjeta */
    const vb0 = await page.locator("#cdLocMapa svg").getAttribute("viewBox");
    await page.locator(".cd-loc__grupo").first().dispatchEvent("click");
    assert.notEqual(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0, "el grupo acerca el mapa");
    await page.locator('.cd-loc__zoom button[data-z="all"]').click();
    assert.equal(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0);
    await page.locator(".cd-loc__punto.es-ficha").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta a").getAttribute("href"), /^\/canada-en-datos\/prince-edward-island\/[a-z0-9-]+$/);
    /* Teclado: el buscador se alcanza con Tab y filtra al escribir */
    await page.locator("#cdLocTarjeta .cd-loc__cerrar").click();
    await page.locator("#cdLocBuscar").focus();
    await page.keyboard.type("kensington");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length <= 3);
    await page.keyboard.press("Tab");
    assert.notEqual(await page.evaluate(() => document.activeElement.id), "cdLocBuscar", "el foco avanza con Tab");
    await page.locator("#cdLocReset").click();
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `pei-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`  ${perfil}: directorio listo en ${msCarga} ms, ${grupos} grupos y ${marcadores} círculos en el mapa`);

    /* ---------- Ficha completa: Charlottetown ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/charlottetown`));
    assert.equal(await page.locator("h1").textContent(), "Charlottetown");
    assert.equal(await page.locator('meta[name="robots"]').count(), 0, "las fichas completas se indexan");
    assert.match(await page.locator(".cd-breadcrumb").textContent(), /Canadá en Datos\s*›\s*Isla del Príncipe Eduardo\s*›\s*Charlottetown/);
    for (const id of ["resumen", "ubicacion", "comunidades", "economia-empleo", "vivienda", "educacion", "salud", "transporte", "recien-llegados", "familias", "enlaces"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    const resumen = await page.locator("#resumen").textContent();
    assert.match(resumen, /38,809/);
    assert.match(resumen, /Queens/);
    assert.match(resumen, /UTC−4/);
    assert.match(await page.locator("#vivienda").textContent(), /\$1,331 al mes/);
    assert.match(await page.locator("#salud").textContent(), /Queen Elizabeth Hospital/);
    assert.equal(await page.locator('#transporte a[href="https://www.t3transit.ca/"]').count(), 1);
    assert.equal(await page.locator('#enlaces a[href="https://www.charlottetown.ca/"]').count(), 1);
    const externos = await page.locator('main a[href^="http"]:not([href^="https://podcastdelmigrante.com"])').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
    assert.ok(externos, "enlaces externos en pestaña nueva");
    await compartir(page, `${GUIA}/charlottetown`, "/assets/canada-en-datos/prince-edward-island/charlottetown.jpg");
    await sinScrollHorizontal(page);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `pei-charlottetown-${perfil}.png`), fullPage: true });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Páginas básicas: distrito de bomberos, reserva y pueblo ---------- */
    for (const [ruta, h1, texto] of [
      [`${GUIA}/souris-fire-district`, "Souris (distrito de bomberos)", /distrito de bomberos \(Fire District, tipo «FD»\)/],
      [`${GUIA}/lennox-island-1`, "Lennox Island 1", /reserva indígena \(Indian Reserve\)/],
      [`${GUIA}/three-rivers`, "Three Rivers", /pueblo \(Town\) del condado de Kings/],
    ]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, ruta));
      assert.equal(await page.locator("h1").textContent(), h1);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
      assert.match(await page.locator("main").textContent(), texto);
      assert.ok((await page.locator(".cd-pending").count()) >= 1, "«Dato no disponible» donde no hay información");
      assert.match(await page.locator("#salud").textContent(), /8-1-1/);
      assert.match(await page.locator("#economia-empleo").textContent(), /toda la provincia es una sola región económica/);
      await compartir(page, ruta, `/assets/canada-en-datos/prince-edward-island/${ruta.split("/").pop()}.jpg`);
      await sinScrollHorizontal(page);
      if (SHOTS && ruta.endsWith("souris-fire-district")) await page.screenshot({ path: path.join(SHOTS, `pei-distrito-${perfil}.png`), fullPage: true });
      assert.deepEqual(errores, []);
      await ctx.close();
    }

    /* ---------- Lugar sin página propia: resaltado y visible en la página de su subdivisión ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/souris-fire-district#lugar-rollo-bay-west`));
    const lugar = page.locator(":target");
    assert.equal(await lugar.getAttribute("id"), "lugar-rollo-bay-west");
    assert.match(await lugar.textContent(), /^Rollo Bay West/);
    assert.equal(await lugar.evaluate((e) => getComputedStyle(e).fontWeight), "700", "resaltado");
    await page.waitForFunction(() => { const r = document.querySelector(":target").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    assert.match(await page.locator("#comunidades").textContent(), /forman parte de Souris \(distrito de bomberos\)/);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Reloj: hora del Atlántico antes y después del cambio de hora (fecha simulada) ---------- */
    if (perfil === "computador") {
      /* [instante UTC, hora que muestra el reloj de Charlottetown] */
      for (const [utc, esperado] of [
        ["2026-10-31T18:00:00Z", "3:00:00p. m."],
        ["2026-11-02T18:00:00Z", "2:00:00p. m."],
        ["2027-01-15T18:00:00Z", "2:00:00p. m."],
        ["2027-03-15T18:00:00Z", "3:00:00p. m."],
        ["2027-07-01T18:00:00Z", "3:00:00p. m."],
      ]) {
        const c = await browser.newContext({ ...PERFILES.computador, locale: "es-CA" });
        const pg = await c.newPage();
        await pg.clock.setFixedTime(new Date(utc));
        await pg.goto(BASE + GUIA, { waitUntil: "networkidle" });
        await pg.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-hora]").textContent));
        assert.equal((await pg.locator("[data-reloj-hora]").textContent()).replace(/\s/g, " "), esperado.replace(/\s/g, " "), `${utc}: Charlottetown`);
        await c.close();
      }
      /* Portada: PEI enlazada al elegirla en el mapa */
      const c = await browser.newContext({ ...PERFILES.computador, locale: "es-CA" });
      const pg = await c.newPage();
      await pg.goto(BASE + "/canada-en-datos/", { waitUntil: "networkidle" });
      await pg.locator('path[data-code="PE"]').dispatchEvent("click");
      await pg.waitForFunction(() => document.querySelector('a[href="/canada-en-datos/prince-edward-island"]'));
      await c.close();
      console.log("  reloj: hora del Atlántico, UTC−3 hasta el 1-11-2026 y UTC−4 después; vuelve a UTC−3 en marzo de 2027");
    }

    /* ---------- Portada de Canadá en Datos ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    await page.locator('path[data-code="PE"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('a[href="/canada-en-datos/prince-edward-island"]'));
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones ---------- */
  for (const [ruta, estado] of [
    [GUIA, 200],
    [`${GUIA}/charlottetown`, 200],
    [`${GUIA}/souris-fire-district`, 200],
    [`${GUIA}/charlottetown.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/alberta/brooks", 200],
    ["/canada-en-datos/ontario/toronto", 200],
    ["/canada-en-datos/british-columbia/vancouver", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Isla del Príncipe Eduardo: guía, directorio, mapa, fichas, reloj y compartir");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
