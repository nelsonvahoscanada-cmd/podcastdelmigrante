/*
  Prueba de extremo a extremo (navegador) de la guía de Saskatchewan: ficha
  provincial, directorio extendido (búsqueda sin acentos y con variantes,
  filtros por tipo, región económica, división censal y población,
  combinados, orden y «Restablecer»), mapa con agrupación de puntos, fichas
  de localidad, reloj (UTC−6 todo el año y la zona de Creighton), detalles
  dorados y «Compartir esta guía», en computador, tableta y celular. Solo
  lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-saskatchewan-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/saskatchewan";
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
    /* ---------- Guía de Saskatchewan: directorio ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, GUIA);
    assert.equal(await page.evaluate(() => typeof window.CD_LOCALIDADES), "undefined", "datos cargados antes de tiempo");
    assert.equal(await page.locator("h1").first().textContent(), "Saskatchewan");
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las ciudades y pueblos de Saskatchewan");
    for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#geografia").textContent(), /UTC−6/);
    assert.match(await page.locator("#empleo").textContent(), /\$15\.70/);
    /* Detalles dorados (bandera provincial: verde y dorado) solo en Saskatchewan */
    const franja = await page.evaluate(() => getComputedStyle(document.querySelector("main.cd"), "::before").backgroundImage);
    assert.match(franja, /rgb\(242, 194, 48\)/, "franja verde y dorada");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("main.cd")).getPropertyValue("--cd-acento").trim()), "#f2c230");
    await compartir(page, GUIA, "/assets/canada-en-datos/social-saskatchewan.jpg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `sk-guia-${perfil}.png`) });
    /* Los datos se cargan cuando el buscador se acerca a la pantalla (en el celular, la sección es más larga) */
    await page.locator("#cdLoc").scrollIntoViewIfNeeded();
    const t0 = Date.now();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const msCarga = Date.now() - t0;
    const total = await page.evaluate(() => window.CD_LOCALIDADES.localidades.length);
    assert.equal(total, 3205);
    assert.equal(await page.locator("#cdLocLista li").count(), 40, "listado por tandas");
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Saskatoon[\s\S]*Ficha completa/);
    /* Mapa: con todas las localidades se agrupan los puntos */
    const grupos = await page.locator(".cd-loc__grupo").count();
    const marcadores = await page.locator("#cdLocMapa circle").count();
    assert.ok(grupos > 20, `${grupos} grupos`);
    assert.ok(marcadores < 800, `${marcadores} círculos en el mapa (de ${total} localidades)`);
    /* Búsqueda por nombre parcial, en mayúsculas, sin acentos y con variantes */
    await page.locator("#cdLocBuscar").fill("SASKATO");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length < 10);
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), `${GUIA}/saskatoon`);
    await page.locator("#cdLocBuscar").fill("ile a la crosse");
    await page.waitForFunction(() => /Île-à-la-Crosse/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/ile-a-la-crosse"]`).count(), 1, "sin acentos");
    await page.locator("#cdLocBuscar").fill("moose jaw 161");
    await page.waitForFunction(() => /Moose Jaw No\. 161/.test(document.querySelector("#cdLocLista").textContent));
    await page.locator("#cdLocBuscar").fill("district of katepwa");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/saskatchewan/katepwa"]'));
    await page.locator("#cdLocBuscar").fill("lloydminster");
    await page.waitForFunction(() => /Lloydminster \(parte de Saskatchewan\)/.test(document.querySelector("#cdLocLista").textContent));
    /* Nombres parecidos: la ciudad, la colonia de la Corona y el municipio rural de North Battleford */
    await page.locator("#cdLocBuscar").fill("north battleford");
    await page.waitForFunction(() => /colonia de la Corona/.test(document.querySelector("#cdLocLista").textContent));
    for (const s of ["north-battleford", "north-battleford-crown-colony", "north-battleford-no-437"]) assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/${s}"]`).count(), 1, s);
    /* Un lugar sin página propia lleva a su subdivisión con el lugar resaltado, y el mapa lo muestra */
    await page.locator("#cdLocBuscar").fill("uranium city");
    await page.waitForFunction(() => /Uranium City/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), `${GUIA}/division-no-18-unorganized#lugar-uranium-city`);
    assert.match(await page.locator("#cdLocLista .cd-loc__item-tipo").first().textContent(), /está en Division No\. 18, Unorganized \(territorio no organizado\) · División n\.º 18/);
    assert.match(await page.locator("#cdLocLista").textContent(), /91/, "población del lugar designado (Censo 2021)");
    await page.locator(".cd-loc__punto").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta").textContent(), /Uranium City[\s\S]*está en Division No\. 18, Unorganized/);
    assert.equal(await page.locator("#cdLocTarjeta a").getAttribute("href"), `${GUIA}/division-no-18-unorganized#lugar-uranium-city`);
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
    assert.equal(catalogo.total, 3205);
    assert.equal(catalogo.comunidades, 2254);
    console.log(`  ${perfil}: ${catalogo.total} búsquedas por nombre correctas (${catalogo.comunidades} lugares sin página propia, con su subdivisión y división censal)`);

    /* Cada opción de tipo, región económica y división censal: el número mostrado coincide con los datos oficiales */
    const opciones = await page.evaluate(() => ({
      tipos: [...document.querySelectorAll("#cdLocTipo option")].map((o) => o.value).filter(Boolean),
      regiones: [...document.querySelectorAll("#cdLocRegion option")].map((o) => o.value).filter(Boolean),
      divisiones: [...document.querySelectorAll("#cdLocSub option")].map((o) => o.value).filter(Boolean),
    }));
    assert.ok(opciones.tipos.length >= 25, JSON.stringify(opciones.tipos));
    assert.deepEqual(opciones.regiones.slice().sort(), ["4710", "4720", "4730", "4740", "4750", "4760"], "las 6 regiones económicas oficiales");
    assert.equal(opciones.divisiones.length, 18);
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
        assert.match(await page.locator("#cdLocEstado").textContent(), new RegExp(`^${esperado.toLocaleString("en-US")} localidad(es)? encontradas? de 3,205\\.$`), `${sel}=${v}`);
      }
      await page.locator(sel).selectOption("");
    }
    console.log(`  ${perfil}: ${filtrosProbados} opciones de tipo, región y división censal con el conteo correcto`);
    /* Filtros combinados: ciudades de la división censal 11 */
    await page.locator("#cdLocTipo").selectOption("city");
    await page.locator("#cdLocSub").selectOption("División n.º 11");
    await page.locator("#cdLocOrden").selectOption("az");
    await page.waitForTimeout(300);
    let nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres, ["Martensville", "Saskatoon", "Warman"]);
    assert.equal(await page.locator(".cd-loc__punto").count(), nombres.length, "mapa y listado coinciden");
    /* Región + población + orden */
    await page.locator("#cdLocTipo").selectOption("");
    await page.locator("#cdLocSub").selectOption("");
    await page.locator("#cdLocRegion").selectOption("4720");
    await page.locator("#cdLocPob").selectOption("10000-99999");
    await page.waitForTimeout(300);
    nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres, ["Moose Jaw", "Swift Current"]);
    /* Población de 100,000 o más */
    await page.locator("#cdLocRegion").selectOption("");
    await page.locator("#cdLocPob").selectOption("100000-");
    await page.waitForTimeout(300);
    nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres, ["Regina", "Saskatoon"]);
    /* Orden por población (de mayor a menor) */
    await page.locator("#cdLocPob").selectOption("");
    await page.locator("#cdLocOrden").selectOption("pob-");
    await page.waitForTimeout(300);
    const primeros = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).slice(0, 4).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(primeros, ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw"]);
    /* Restablecer */
    await page.locator("#cdLocTipo").selectOption("rm");
    await page.locator("#cdLocReset").click();
    await page.waitForTimeout(300);
    assert.match(await page.locator("#cdLocEstado").textContent(), /^3,205 localidades encontradas/);
    for (const id of ["#cdLocBuscar", "#cdLocTipo", "#cdLocRegion", "#cdLocSub", "#cdLocPob", "#cdLocOrden"]) assert.equal(await page.locator(id).inputValue(), "", id);
    /* Mapa: un grupo acerca la vista; «Toda la provincia» vuelve; un punto abre su tarjeta */
    const vb0 = await page.locator("#cdLocMapa svg").getAttribute("viewBox");
    await page.locator(".cd-loc__grupo").first().dispatchEvent("click");
    assert.notEqual(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0, "el grupo acerca el mapa");
    await page.locator('.cd-loc__zoom button[data-z="all"]').click();
    assert.equal(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0);
    await page.locator(".cd-loc__punto.es-ficha").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta a").getAttribute("href"), /^\/canada-en-datos\/saskatchewan\/(regina|saskatoon)$/);
    /* Teclado: el buscador se alcanza con Tab y filtra al escribir */
    await page.locator("#cdLocTarjeta .cd-loc__cerrar").click();
    await page.locator("#cdLocBuscar").focus();
    await page.keyboard.type("humboldt");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length <= 3);
    await page.keyboard.press("Tab");
    assert.notEqual(await page.evaluate(() => document.activeElement.id), "cdLocBuscar", "el foco avanza con Tab");
    await page.locator("#cdLocReset").click();
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `sk-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`  ${perfil}: directorio listo en ${msCarga} ms, ${grupos} grupos y ${marcadores} círculos en el mapa`);

    /* ---------- Fichas completas: Regina y Saskatoon ---------- */
    for (const [s, pob, alquiler, hospital, transporte, web] of [
      ["regina", "226,404", "$1,474 al mes", "Regina General Hospital", "https://www.regina.ca/transportation-roads-parking/transit/", "https://www.regina.ca/"],
      ["saskatoon", "266,141", "$1,545 al mes", "Royal University Hospital", "https://saskatoontransit.ca/", "https://www.saskatoon.ca/"],
    ]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/${s}`));
      assert.equal(await page.locator("h1").textContent(), s[0].toUpperCase() + s.slice(1));
      assert.equal(await page.locator('meta[name="robots"]').count(), 0, "las fichas completas se indexan");
      assert.match(await page.locator(".cd-breadcrumb").textContent(), new RegExp(`Canadá en Datos\\s*›\\s*Saskatchewan\\s*›\\s*${s[0].toUpperCase() + s.slice(1)}`));
      for (const id of ["resumen", "ubicacion", "comunidades", "economia-empleo", "vivienda", "educacion", "salud", "transporte", "recien-llegados", "familias", "enlaces"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
      const resumen = await page.locator("#resumen").textContent();
      assert.ok(resumen.includes(pob), pob);
      assert.match(resumen, /UTC−6/);
      assert.ok((await page.locator("#vivienda").textContent()).includes(alquiler), alquiler);
      assert.ok((await page.locator("#salud").textContent()).includes(hospital), hospital);
      assert.equal(await page.locator(`#transporte a[href="${transporte}"]`).count(), 1);
      assert.equal(await page.locator(`#enlaces a[href="${web}"]`).count(), 1);
      const externos = await page.locator('main a[href^="http"]:not([href^="https://podcastdelmigrante.com"])').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
      assert.ok(externos, "enlaces externos en pestaña nueva");
      await compartir(page, `${GUIA}/${s}`, `/assets/canada-en-datos/saskatchewan/${s}.jpg`);
      await sinScrollHorizontal(page);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `sk-${s}-${perfil}.png`), fullPage: perfil !== "computador" ? false : true });
      assert.deepEqual(errores, []);
      await ctx.close();
    }

    /* ---------- Páginas básicas: municipio rural, reserva, villa del norte y ciudad partida ---------- */
    for (const [ruta, h1, texto] of [
      [`${GUIA}/corman-park-no-344`, "Corman Park No. 344", /municipio rural \(Rural Municipality\)/],
      [`${GUIA}/ahtahkakoop-104`, "Ahtahkakoop 104", /reserva indígena \(Indian Reserve\)/],
      [`${GUIA}/la-loche`, "La Loche", /villa del norte \(Northern Village\)/],
      [`${GUIA}/lloydminster`, "Lloydminster (parte de Saskatchewan)", /esta página trata solo de la parte de Saskatchewan/],
    ]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, ruta));
      assert.equal(await page.locator("h1").textContent(), h1);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
      assert.match(await page.locator("main").textContent(), texto);
      assert.ok((await page.locator(".cd-pending").count()) >= 1, "«Dato no disponible» donde no hay información");
      assert.match(await page.locator("#salud").textContent(), /8-1-1/);
      assert.match(await page.locator("#economia-empleo").textContent(), /se publican por región económica, no por localidad/);
      await compartir(page, ruta, `/assets/canada-en-datos/saskatchewan/${ruta.split("/").pop()}.jpg`);
      await sinScrollHorizontal(page);
      if (SHOTS && ruta.endsWith("corman-park-no-344")) await page.screenshot({ path: path.join(SHOTS, `sk-municipio-rural-${perfil}.png`), fullPage: perfil === "computador" });
      assert.deepEqual(errores, []);
      await ctx.close();
    }

    /* ---------- Lugar sin página propia: resaltado y visible en la página de su subdivisión ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/division-no-18-unorganized#lugar-uranium-city`));
    const lugar = page.locator(":target");
    assert.equal(await lugar.getAttribute("id"), "lugar-uranium-city");
    assert.match(await lugar.textContent(), /^Uranium City/);
    assert.equal(await lugar.evaluate((e) => getComputedStyle(e).fontWeight), "700", "resaltado");
    await page.waitForFunction(() => { const r = document.querySelector(":target").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    assert.match(await page.locator("#comunidades").textContent(), /forman parte de Division No\. 18, Unorganized/);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Reloj: UTC−6 todo el año en Regina y UTC−5 en la zona de Creighton (fecha simulada) ---------- */
    if (perfil === "computador") {
      for (const utc of ["2026-10-31T18:00:00Z", "2026-11-02T18:00:00Z", "2027-01-15T18:00:00Z", "2027-03-15T18:00:00Z", "2027-07-01T18:00:00Z"]) {
        const c = await browser.newContext({ ...PERFILES.computador, locale: "es-CA" });
        const pg = await c.newPage();
        await pg.clock.setFixedTime(new Date(utc));
        await pg.goto(BASE + GUIA, { waitUntil: "networkidle" });
        await pg.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-hora]").textContent) && /\d/.test(document.querySelector("[data-zona-hora]").textContent));
        assert.equal((await pg.locator("[data-reloj-hora]").textContent()).replace(/\s/g, " "), "12:00:00p. m.".replace(/\s/g, " "), `${utc}: Regina`);
        assert.match(await pg.locator("[data-zona-hora]").textContent(), /^1:00/, `${utc}: zona de Creighton`);
        await c.close();
      }
      console.log("  reloj: Regina a UTC−6 y la zona de Creighton a UTC−5, antes y después del 1-11-2026 y en verano");
    }

    /* ---------- Portada de Canadá en Datos: Saskatchewan enlazada al elegirla en el mapa ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    await page.locator('path[data-code="SK"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('a[href="/canada-en-datos/saskatchewan"]'));
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones ---------- */
  for (const [ruta, estado] of [
    [GUIA, 200],
    [`${GUIA}/regina`, 200],
    [`${GUIA}/division-no-18-unorganized`, 200],
    [`${GUIA}/regina.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/alberta/brooks", 200],
    ["/canada-en-datos/ontario/toronto", 200],
    ["/canada-en-datos/british-columbia/vancouver", 200],
    ["/canada-en-datos/prince-edward-island/charlottetown", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Saskatchewan: guía, directorio, mapa, fichas, reloj, colores y compartir");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
