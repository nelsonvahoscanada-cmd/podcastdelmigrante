/*
  Prueba de extremo a extremo (navegador) de la guía de Manitoba: ficha
  provincial, directorio extendido (búsqueda sin acentos y con variantes,
  filtros por tipo, región económica, división censal y población,
  combinados, orden y «Restablecer»), mapa con agrupación de puntos, las 13
  fichas completas (con reloj en vivo), páginas básicas, reloj (UTC−5 todo el
  año), identidad visual igual a Alberta y «Compartir esta guía», en
  computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-manitoba-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/manitoba";
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
    /* ---------- Guía de Manitoba: directorio ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, GUIA);
    assert.equal(await page.evaluate(() => typeof window.CD_LOCALIDADES), "undefined", "datos cargados antes de tiempo");
    assert.equal(await page.locator("h1").first().textContent(), "Manitoba");
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las ciudades y pueblos de Manitoba");
    for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#geografia").textContent(), /UTC−5/);
    assert.match(await page.locator("#empleo").textContent(), /\$16\.40/);
    /* Identidad visual: la misma que Alberta (verde, negro y blanco). Se comparan los estilos calculados */
    const estilo = (pg) => pg.evaluate(() => {
      const main = document.querySelector("main.cd");
      const seg = document.querySelector(".cd-clock__sec");
      const kicker = document.querySelector(".cd-kicker");
      return {
        acento: getComputedStyle(main).getPropertyValue("--cd-acento").trim(),
        franja: getComputedStyle(main, "::before").content,
        segundos: seg && getComputedStyle(seg).color,
        reloj: getComputedStyle(document.querySelector(".cd-clock")).backgroundColor,
        kicker: getComputedStyle(kicker, "::before").backgroundColor,
        indicador: (() => { const e = document.querySelector(".cd-indicator"); return e && getComputedStyle(e).borderLeftColor; })(),
        h1: getComputedStyle(document.querySelector("h1")).color,
        fondo: getComputedStyle(document.body).backgroundColor,
      };
    });
    await page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    const mb = await estilo(page);
    const ab = await abrir(browser, perfil, "/canada-en-datos/alberta");
    await ab.page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    assert.deepEqual(mb, await estilo(ab.page), "Manitoba y Alberta con los mismos colores");
    await ab.ctx.close();
    assert.equal(mb.franja, "none", "sin franja propia bajo el encabezado");
    assert.ok(!/242, 194, 48/.test(JSON.stringify(mb)), "sin dorado");
    assert.equal(mb.segundos, "rgb(141, 198, 63)", "segundos del reloj en el verde de la identidad (#8DC63F, sobre negro)");
    await compartir(page, GUIA, "/assets/canada-en-datos/social-manitoba.jpg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `mb-guia-${perfil}.png`) });
    /* Los datos se cargan cuando el buscador se acerca a la pantalla (en el celular, la sección es más larga) */
    await page.locator("#cdLoc").scrollIntoViewIfNeeded();
    const t0 = Date.now();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const msCarga = Date.now() - t0;
    const total = await page.evaluate(() => window.CD_LOCALIDADES.localidades.length);
    assert.equal(total, 2062);
    assert.equal(await page.locator("#cdLocLista li").count(), 40, "listado por tandas");
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Winnipeg[\s\S]*Ficha completa/);
    /* Mapa: con todas las localidades se agrupan los puntos */
    const grupos = await page.locator(".cd-loc__grupo").count();
    const marcadores = await page.locator("#cdLocMapa circle").count();
    assert.ok(grupos > 20, `${grupos} grupos`);
    assert.ok(marcadores < 800, `${marcadores} círculos en el mapa (de ${total} localidades)`);
    /* Búsqueda por nombre parcial, en mayúsculas, sin acentos y con variantes */
    await page.locator("#cdLocBuscar").fill("WINNIP");
    await page.waitForFunction(() => /Winnipeg/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/winnipeg"]`).count(), 1);
    await page.locator("#cdLocBuscar").fill("tache");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/manitoba/tache"]'));
    assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/tache"]`).count(), 1, "sin acentos");
    await page.locator("#cdLocBuscar").fill("sainte anne");
    await page.waitForFunction(() => /Ste\. Anne \(pueblo\)/.test(document.querySelector("#cdLocLista").textContent));
    await page.locator("#cdLocBuscar").fill("flin flon");
    await page.waitForFunction(() => /Flin Flon \(parte de Manitoba\)/.test(document.querySelector("#cdLocLista").textContent));
    /* Nombres parecidos: la ciudad y el municipio rural de Portage la Prairie */
    await page.locator("#cdLocBuscar").fill("portage la prairie");
    await page.waitForFunction(() => /Portage la Prairie \(municipio rural\)/.test(document.querySelector("#cdLocLista").textContent));
    for (const s of ["portage-la-prairie", "portage-la-prairie-rural-municipality"]) assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/${s}"]`).count(), 1, s);
    /* Un lugar sin página propia lleva a su subdivisión con el lugar resaltado, y el mapa lo muestra */
    await page.locator("#cdLocBuscar").fill("grunthal");
    await page.waitForFunction(() => /Grunthal/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), `${GUIA}/hanover#lugar-grunthal`);
    assert.match(await page.locator("#cdLocLista .cd-loc__item-tipo").first().textContent(), /está en Hanover \(municipio rural\) · División n\.º 2/);
    assert.match(await page.locator("#cdLocLista").textContent(), /1,782/, "población del lugar designado (Censo 2021)");
    await page.locator(".cd-loc__punto").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta").textContent(), /Grunthal[\s\S]*está en Hanover/);
    assert.equal(await page.locator("#cdLocTarjeta a").getAttribute("href"), `${GUIA}/hanover#lugar-grunthal`);
    await page.locator("#cdLocTarjeta .cd-loc__cerrar").click();
    /* Sin resultados: mensaje claro */
    await page.locator("#cdLocBuscar").fill("zzzz no existe");
    await page.waitForFunction(() => /^No encontramos localidades con esos criterios/.test(document.getElementById("cdLocEstado").textContent));
    assert.equal(await page.locator("#cdLocLista li").count(), 0);
    await page.locator("#cdLocBuscar").fill("");

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
          if (!f[11] || !texto.includes(`está en ${m[0]}`) || !texto.includes(` · ${f[9]} · `)) fallos.push(`sin subdivisión o división censal: ${f[0]}`);
        }
      }
      buscar.value = "";
      tipo.dispatchEvent(new Event("change"));
      return { total: D.localidades.length, comunidades, fallos };
    }, GUIA);
    assert.deepEqual(catalogo.fallos, [], catalogo.fallos.slice(0, 10).join("; "));
    assert.equal(catalogo.total, 2062);
    assert.equal(catalogo.comunidades, 1823);
    console.log(`  ${perfil}: ${catalogo.total} búsquedas por nombre correctas (${catalogo.comunidades} lugares sin página propia, con su subdivisión y división censal)`);

    /* Cada opción de tipo, región económica y división censal: el número mostrado coincide con los datos oficiales */
    const opciones = await page.evaluate(() => ({
      tipos: [...document.querySelectorAll("#cdLocTipo option")].map((o) => o.value).filter(Boolean),
      regiones: [...document.querySelectorAll("#cdLocRegion option")].map((o) => o.value).filter(Boolean),
      divisiones: [...document.querySelectorAll("#cdLocSub option")].map((o) => o.value).filter(Boolean),
    }));
    assert.ok(opciones.tipos.length >= 25, JSON.stringify(opciones.tipos));
    assert.deepEqual(opciones.regiones.slice().sort(), ["4610", "4620", "4630", "4640", "4650", "4660", "4670", "4680"], "las 8 regiones económicas oficiales");
    assert.equal(opciones.divisiones.length, 23);
    let filtrosProbados = 0;
    for (const [sel, valores] of [["#cdLocTipo", opciones.tipos], ["#cdLocRegion", opciones.regiones], ["#cdLocSub", opciones.divisiones]]) {
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
        assert.match(await page.locator("#cdLocEstado").textContent(), new RegExp(`^${esperado.toLocaleString("en-US")} localidad(es)? encontradas? de 2,062\\.$`), `${sel}=${v}`);
      }
      await page.locator(sel).selectOption("");
    }
    console.log(`  ${perfil}: ${filtrosProbados} opciones de tipo, región y división censal con el conteo correcto`);
    /* Filtros combinados: ciudades de la división censal 3 */
    await page.locator("#cdLocTipo").selectOption("city");
    await page.locator("#cdLocSub").selectOption("División n.º 3");
    await page.locator("#cdLocOrden").selectOption("az");
    await page.waitForTimeout(300);
    let nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres, ["Morden", "Winkler"]);
    assert.equal(await page.locator(".cd-loc__punto").count(), nombres.length, "mapa y listado coinciden");
    /* Región + población + orden */
    await page.locator("#cdLocTipo").selectOption("");
    await page.locator("#cdLocSub").selectOption("");
    await page.locator("#cdLocRegion").selectOption("4610");
    await page.locator("#cdLocPob").selectOption("10000-99999");
    await page.waitForTimeout(300);
    nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres.slice().sort(), ["Hanover", "Springfield", "Steinbach", "Taché"]);
    /* Población de 100,000 o más */
    await page.locator("#cdLocRegion").selectOption("");
    await page.locator("#cdLocPob").selectOption("100000-");
    await page.waitForTimeout(300);
    nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres, ["Winnipeg"]);
    /* Orden por población (de mayor a menor) */
    await page.locator("#cdLocPob").selectOption("");
    await page.locator("#cdLocOrden").selectOption("pob-");
    await page.waitForTimeout(300);
    const primeros = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).slice(0, 4).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(primeros, ["Winnipeg", "Brandon", "Steinbach", "Hanover"]);
    /* Restablecer */
    await page.locator("#cdLocTipo").selectOption("rm");
    await page.locator("#cdLocReset").click();
    await page.waitForTimeout(300);
    assert.match(await page.locator("#cdLocEstado").textContent(), /^2,062 localidades encontradas/);
    for (const id of ["#cdLocBuscar", "#cdLocTipo", "#cdLocRegion", "#cdLocSub", "#cdLocPob", "#cdLocOrden"]) assert.equal(await page.locator(id).inputValue(), "", id);
    /* Mapa: un grupo acerca la vista; «Toda la provincia» vuelve; un punto abre su tarjeta */
    const vb0 = await page.locator("#cdLocMapa svg").getAttribute("viewBox");
    await page.locator(".cd-loc__grupo").first().dispatchEvent("click");
    assert.notEqual(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0, "el grupo acerca el mapa");
    await page.locator('.cd-loc__zoom button[data-z="all"]').click();
    assert.equal(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0);
    await page.locator(".cd-loc__punto.es-ficha").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta a").getAttribute("href"), /^\/canada-en-datos\/manitoba\/[a-z-]+$/);
    /* Teclado: el buscador se alcanza con Tab y filtra al escribir */
    await page.locator("#cdLocTarjeta .cd-loc__cerrar").click();
    await page.locator("#cdLocBuscar").focus();
    await page.keyboard.type("neepawa");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length <= 3);
    await page.keyboard.press("Tab");
    assert.notEqual(await page.evaluate(() => document.activeElement.id), "cdLocBuscar", "el foco avanza con Tab");
    await page.locator("#cdLocReset").click();
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `mb-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`  ${perfil}: directorio listo en ${msCarga} ms, ${grupos} grupos y ${marcadores} círculos en el mapa`);

    /* ---------- Fichas completas: las diez ciudades y tres pueblos ---------- */
    for (const [s, h1, pob, alquiler, hospital, web, agencia] of [
      ["winnipeg", "Winnipeg", "749,607", "$1,571 al mes", "Health Sciences Centre (HSC)", "https://www.winnipeg.ca/", "Manitoba Start"],
      ["brandon", "Brandon", "51,313", "$1,086 al mes", "Brandon Regional Health Centre", "https://www.brandon.ca/", "Westman Immigrant Services"],
      ["steinbach", "Steinbach", "17,806", "$1,004 al mes", "Bethesda Regional Health Centre", "https://www.steinbach.ca/", "Eastman Immigrant Services"],
      ["thompson", "Thompson (ciudad)", "13,035", "$1,133 al mes", "Thompson General Hospital", "https://www.thompson.ca/", "North West Regional Immigrant Services"],
      ["portage-la-prairie", "Portage la Prairie (ciudad)", "13,270", "$1,261 al mes", "Portage District General Hospital", "https://www.city-plap.com/", "Portage Learning and Literacy Centre"],
      ["winkler", "Winkler", "13,745", "$1,046 al mes", "Boundary Trails Health Centre", "https://www.cityofwinkler.ca/", "Regional Connections Immigrant Services"],
      ["selkirk", "Selkirk", "10,504", "$1,513 al mes", "Selkirk Regional Health Centre", "https://www.myselkirk.ca/", "Manitoba Start"],
      ["morden", "Morden", "9,929", "$1,046 al mes", "Boundary Trails Health Centre", "https://morden.ca/", "Regional Connections Immigrant Services"],
      ["dauphin", "Dauphin (ciudad)", "8,368", null, "Dauphin Regional Health Centre", "https://www.dauphin.ca/", "Immigrate Parkland"],
      ["flin-flon", "Flin Flon (parte de Manitoba)", "4,940", null, "Flin Flon General Hospital", "https://cityofflinflon.ca/", "North West Regional Immigrant Services"],
      ["the-pas", "The Pas", "5,639", null, "St. Anthony's General Hospital", "https://townofthepas.ca/", "North West Regional Immigrant Services"],
      ["swan-river", "Swan River", "4,049", null, "Swan Valley Health Centre", "https://www.swanrivermanitoba.ca/", "North West Regional Immigrant Services"],
      ["neepawa", "Neepawa", "5,685", null, "Neepawa Health Centre", "https://www.neepawa.ca/", "Neepawa and Area Immigrant Settlement Services"],
    ]) {
      /* En tableta y celular se recorren cuatro, para acortar la prueba */
      if (perfil !== "computador" && !["winnipeg", "brandon", "winkler", "the-pas"].includes(s)) continue;
      ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/${s}`));
      assert.equal(await page.locator("h1").textContent(), h1);
      assert.equal(await page.locator('meta[name="robots"]').count(), 0, "las fichas completas se indexan");
      for (const id of ["resumen", "ubicacion", "economia-empleo", "vivienda", "educacion", "salud", "transporte", "servicios", "recien-llegados", "familias", "enlaces"]) assert.equal(await page.locator(`#${id}`).count(), s === "morden" && id === "servicios" ? 0 : 1, `${s}: ${id}`);
      assert.ok((await page.locator("#recien-llegados").textContent()).includes(agencia), agencia);
      assert.match(await page.locator("#economia-empleo").textContent(), /se publican por región económica, no por localidad/);
      const resumen = await page.locator("#resumen").textContent();
      assert.ok(resumen.includes(pob), pob);
      assert.match(resumen, /UTC−5 todo el año/);
      const vivienda = await page.locator("#vivienda").textContent();
      if (alquiler) assert.ok(vivienda.includes(alquiler), alquiler);
      else assert.match(vivienda, /Dato no disponible: esta página no muestra alquileres de CMHC/, "sin promedios provinciales");
      assert.ok((await page.locator("#salud").textContent()).includes(hospital), hospital);
      assert.match(await page.locator("#salud").textContent(), /1-888-315-9257/);
      assert.equal(await page.locator(`#enlaces a[href="${web}"]`).count(), 1, web);
      /* Reloj local en vivo, con el mismo diseño que la guía provincial */
      await page.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-localidad] [data-reloj-hora]").textContent));
      assert.equal(await page.locator("[data-reloj-localidad]").getAttribute("data-zona"), "America/Atikokan");
      const externos = await page.locator('main a[href^="http"]:not([href^="https://podcastdelmigrante.com"])').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
      assert.ok(externos, "enlaces externos en pestaña nueva");
      await compartir(page, `${GUIA}/${s}`, `/assets/canada-en-datos/manitoba/${s}.jpg`);
      await sinScrollHorizontal(page);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `mb-${s}-${perfil}.png`), fullPage: perfil === "computador" });
      assert.deepEqual(errores, []);
      await ctx.close();
    }

    /* ---------- Páginas básicas: municipio rural, municipio, reserva y territorio no organizado ---------- */
    for (const [ruta, h1, texto] of [
      [`${GUIA}/hanover`, "Hanover", /municipio rural \(Rural Municipality\)/],
      [`${GUIA}/rhineland`, "Rhineland", /un municipio \(Municipality\)/],
      [`${GUIA}/peguis-1b`, "Peguis 1B", /reserva indígena \(Indian Reserve\)/],
      [`${GUIA}/division-no-22-unorganized`, "Division No. 22, Unorganized", /territorio no organizado/],
    ]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, ruta));
      assert.equal(await page.locator("h1").textContent(), h1);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
      assert.match(await page.locator("main").textContent(), texto);
      assert.ok((await page.locator(".cd-pending").count()) >= 1, "«Dato no disponible» donde no hay información");
      assert.match(await page.locator("#salud").textContent(), /1-888-315-9257/);
      assert.equal(await page.locator("[data-reloj-localidad]").count(), 0, "el reloj en vivo es solo para las fichas completas");
      await compartir(page, ruta, `/assets/canada-en-datos/manitoba/${ruta.split("/").pop()}.jpg`);
      await sinScrollHorizontal(page);
      if (SHOTS && ruta.endsWith("hanover")) await page.screenshot({ path: path.join(SHOTS, `mb-municipio-rural-${perfil}.png`), fullPage: perfil === "computador" });
      assert.deepEqual(errores, []);
      await ctx.close();
    }

    /* ---------- Lugar sin página propia: resaltado en la página de su subdivisión ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/division-no-22-unorganized#lugar-cross-lake`));
    const lugar = page.locator(":target");
    assert.equal(await lugar.getAttribute("id"), "lugar-cross-lake");
    assert.match(await lugar.textContent(), /^Cross Lake/);
    assert.equal(await lugar.evaluate((e) => getComputedStyle(e).fontWeight), "700", "resaltado");
    await page.waitForFunction(() => { const r = document.querySelector(":target").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Reloj: UTC−5 todo el año en Winnipeg, en la guía y en una ficha (fecha simulada) ---------- */
    if (perfil === "computador") {
      for (const utc of ["2026-10-30T18:00:00Z", "2026-11-02T18:00:00Z", "2027-01-15T18:00:00Z", "2027-03-15T18:00:00Z", "2027-07-01T18:00:00Z"]) {
        for (const ruta of [GUIA, `${GUIA}/brandon`]) {
          const c = await browser.newContext({ ...PERFILES.computador, locale: "es-CA" });
          const pg = await c.newPage();
          await pg.clock.setFixedTime(new Date(utc));
          await pg.goto(BASE + ruta, { waitUntil: "networkidle" });
          await pg.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-hora]").textContent));
          assert.equal((await pg.locator("[data-reloj-hora]").textContent()).replace(/\s/g, " "), "1:00:00p. m.".replace(/\s/g, " "), `${utc}: ${ruta}`);
          await c.close();
        }
      }
      console.log("  reloj: Manitoba a UTC−5 antes y después del 1-11-2026, en invierno y en verano (guía y fichas)");
    }

    /* ---------- Portada de Canadá en Datos: Manitoba enlazada al elegirla en el mapa ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    await page.locator('path[data-code="MB"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('a[href="/canada-en-datos/manitoba"]'));
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones ---------- */
  for (const [ruta, estado] of [
    [GUIA, 200],
    [`${GUIA}/winnipeg`, 200],
    [`${GUIA}/division-no-22-unorganized`, 200],
    [`${GUIA}/winnipeg.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/saskatchewan/regina", 200],
    ["/canada-en-datos/alberta/brooks", 200],
    ["/canada-en-datos/ontario/toronto", 200],
    ["/canada-en-datos/british-columbia/vancouver", 200],
    ["/canada-en-datos/prince-edward-island/charlottetown", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Manitoba: guía, directorio, mapa, 13 fichas con reloj, páginas básicas, identidad visual de Alberta y compartir");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
