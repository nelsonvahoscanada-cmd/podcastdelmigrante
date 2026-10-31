/*
  Prueba de extremo a extremo (navegador) de la guía de Quebec: ficha
  provincial, directorio extendido (búsqueda sin acentos y con variantes,
  filtros por tipo, región, MRC y población, combinados, orden y
  «Restablecer»), mapa con agrupación de puntos, fichas completas (con reloj
  en vivo), páginas básicas, estado municipal actual, reloj (hora del Este con
  cambio de hora, y otras zonas), identidad visual igual a Alberta y
  «Compartir esta guía», en computador, tableta y celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-quebec-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
const GUIA = "/canada-en-datos/quebec";
const TOTAL = 6725;
const LUGARES = 5443;
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
    /* ---------- Guía de Quebec: directorio ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, GUIA);
    assert.equal(await page.evaluate(() => typeof window.CD_LOCALIDADES), "undefined", "datos cargados antes de tiempo");
    assert.equal(await page.locator("h1").first().textContent(), "Quebec");
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las ciudades y pueblos de Quebec");
    for (const id of ["poblacion", "geografia", "frances", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#geografia").textContent(), /Loi sur le temps légal/);
    assert.match(await page.locator("#empleo").textContent(), /\$16\.60/);
    assert.match(await page.locator("#inmigracion").textContent(), /Un CSQ no es la residencia permanente/);
    /* PEQ: cierre del período de recepción con fecha y hora, cerrado desde el 1-11-2026, sin anunciar otro */
    assert.match(await page.locator("#inmigracion").textContent(), /31 de octubre de 2026 a las 23:59, hora de Montreal[\s\S]*Desde el 1 de noviembre de 2026, ese período está cerrado[\s\S]*Esta guía no anuncia nuevos períodos de recepción/);
    assert.match(await page.locator("#frances").textContent(), /No hay garantía de atención en español/);
    /* Otras zonas de la provincia (Îles-de-la-Madeleine y Basse-Côte-Nord) con su hora */
    assert.match(await page.locator(".cd-zones").textContent(), /Îles-de-la-Madeleine[\s\S]*Blanc-Sablon/);
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
    const qc = await estilo(page);
    const ab = await abrir(browser, perfil, "/canada-en-datos/alberta");
    await ab.page.waitForFunction(() => document.querySelector(".cd-clock__sec"));
    assert.deepEqual(qc, await estilo(ab.page), "Quebec y Alberta con los mismos colores");
    await ab.ctx.close();
    assert.equal(qc.franja, "none", "sin franja propia bajo el encabezado");
    assert.ok(!/242, 194, 48/.test(JSON.stringify(qc)), "sin dorado");
    assert.equal(qc.segundos, "rgb(141, 198, 63)", "segundos del reloj en el verde de la identidad (#8DC63F, sobre negro)");
    await compartir(page, GUIA, "/assets/canada-en-datos/social-quebec.jpg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `qc-guia-${perfil}.png`) });
    /* Los datos se cargan cuando el buscador se acerca a la pantalla (en el celular, la sección es más larga) */
    await page.locator("#cdLoc").scrollIntoViewIfNeeded();
    const t0 = Date.now();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const msCarga = Date.now() - t0;
    const total = await page.evaluate(() => window.CD_LOCALIDADES.localidades.length);
    assert.equal(total, TOTAL);
    assert.equal(await page.locator("#cdLocLista li").count(), 40, "listado por tandas");
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Montréal[\s\S]*Ficha completa/);
    /* Mapa: con todas las localidades se agrupan los puntos */
    const grupos = await page.locator(".cd-loc__grupo").count();
    const marcadores = await page.locator("#cdLocMapa circle").count();
    assert.ok(grupos > 20, `${grupos} grupos`);
    assert.ok(marcadores < 1500, `${marcadores} círculos en el mapa (de ${total} localidades)`);
    /* Búsqueda por nombre parcial, en mayúsculas, sin acentos y con variantes */
    await page.locator("#cdLocBuscar").fill("MONTRE");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/quebec/montreal"]'));
    assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/montreal"]`).count(), 1);
    await page.locator("#cdLocBuscar").fill("trois rivieres");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/quebec/trois-rivieres"]'));
    await page.locator("#cdLocBuscar").fill("val d or");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/quebec/val-d-or"]'));
    /* Nombre actual y nombre del Censo 2021: Mont-Blanc (antes Saint-Faustin--Lac-Carré) */
    await page.locator("#cdLocBuscar").fill("saint-faustin");
    await page.waitForFunction(() => document.querySelector('#cdLocLista a[href$="/quebec/mont-blanc"]'));
    /* Mismo nombre y mismo tipo en dos MRC: se distinguen por la MRC */
    await page.locator("#cdLocBuscar").fill("saint-elzear");
    await page.waitForFunction(() => /Saint-Elzéar \(municipio, La Nouvelle-Beauce\)/.test(document.querySelector("#cdLocLista").textContent));
    assert.match(await page.locator("#cdLocLista").textContent(), /Saint-Elzéar \(municipio, Bonaventure\)/);
    /* La ciudad y el cantón de Clermont */
    await page.locator("#cdLocBuscar").fill("clermont");
    await page.waitForFunction(() => /Clermont \(cantón \(municipio\)\)/.test(document.querySelector("#cdLocLista").textContent));
    for (const s of ["clermont", "clermont-canton"]) assert.equal(await page.locator(`#cdLocLista li a[href="${GUIA}/${s}"]`).count(), 1, s);
    /* Un lugar sin página propia (distrito municipal de Montreal) lleva a su subdivisión con el lugar resaltado */
    await page.locator("#cdLocBuscar").fill("plateau mont royal");
    await page.waitForFunction(() => /Le Plateau-Mont-Royal/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), `${GUIA}/montreal#lugar-le-plateau-mont-royal`);
    assert.match(await page.locator("#cdLocLista .cd-loc__item-tipo").first().textContent(), /está en Montréal \(ciudad\)|está en Montréal/);
    await page.locator(".cd-loc__punto").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta").textContent(), /Le Plateau-Mont-Royal[\s\S]*está en Montréal/);
    await page.locator("#cdLocTarjeta .cd-loc__cerrar").click();
    /* Sin resultados: mensaje claro */
    await page.locator("#cdLocBuscar").fill("zzzz no existe");
    await page.waitForFunction(() => /^No encontramos localidades con esos criterios/.test(document.getElementById("cdLocEstado").textContent));
    assert.equal(await page.locator("#cdLocLista li").count(), 0);
    await page.locator("#cdLocBuscar").fill("");

    /* Todo el catálogo: cada localidad y cada lugar aparece al buscar su nombre, con su enlace y su subdivisión */
    const catalogo = await page.evaluate(([GUIA, perfil]) => {
      const D = window.CD_LOCALIDADES;
      const [buscar, tipo, mas, lista] = ["cdLocBuscar", "cdLocTipo", "cdLocMas", "cdLocLista"].map((id) => document.getElementById(id));
      const base = GUIA + "/";
      const fallos = [];
      let comunidades = 0;
      const todas = D.localidades;
      const lista_ = perfil === "computador" ? todas : todas.filter((_, i) => i % 11 === 0);
      for (const f of lista_) {
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
          if (!f[11] || !texto.includes(`está en ${m[0]}`) || (f[9] !== f[0] && !texto.includes(` · ${f[9]} · `))) fallos.push(`sin subdivisión o división censal: ${f[0]}`);
        }
      }
      buscar.value = "";
      tipo.dispatchEvent(new Event("change"));
      return { total: lista_.length, comunidades, fallos };
    }, [GUIA, perfil]);
    assert.deepEqual(catalogo.fallos, [], catalogo.fallos.slice(0, 10).join("; "));
    if (perfil === "computador") {
      assert.equal(catalogo.total, TOTAL);
      assert.equal(catalogo.comunidades, LUGARES);
    }
    console.log(`  ${perfil}: ${catalogo.total} búsquedas por nombre correctas (${catalogo.comunidades} lugares sin página propia, con su subdivisión y su MRC)`);

    /* Cada opción de tipo, región económica y división censal: el número mostrado coincide con los datos oficiales */
    const opciones = await page.evaluate(() => ({
      tipos: [...document.querySelectorAll("#cdLocTipo option")].map((o) => o.value).filter(Boolean),
      regiones: [...document.querySelectorAll("#cdLocRegion option")].map((o) => o.value).filter(Boolean),
      divisiones: [...document.querySelectorAll("#cdLocSub option")].map((o) => o.value).filter(Boolean),
    }));
    assert.ok(opciones.tipos.length >= 30, JSON.stringify(opciones.tipos));
    assert.equal(opciones.regiones.length, 17, "las 17 regiones");
    assert.equal(opciones.divisiones.length, 98, "las 98 MRC y territorios equivalentes");
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
        assert.match(await page.locator("#cdLocEstado").textContent(), new RegExp(`^${esperado.toLocaleString("en-US")} localidad(es)? encontradas? de 6,725\\.$`), `${sel}=${v}`);
      }
      await page.locator(sel).selectOption("");
    }
    console.log(`  ${perfil}: ${filtrosProbados} opciones de tipo, región y división censal con el conteo correcto`);
    /* Filtros combinados: ciudades de la MRC de Memphrémagog */
    await page.locator("#cdLocTipo").selectOption("ville");
    await page.locator("#cdLocSub").selectOption("Memphrémagog");
    await page.locator("#cdLocOrden").selectOption("az");
    await page.waitForTimeout(300);
    let nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres, ["Magog", "Stanstead (ciudad)"]);
    assert.equal(await page.locator(".cd-loc__punto").count(), nombres.length, "mapa y listado coinciden");
    /* Región + población + orden */
    await page.locator("#cdLocTipo").selectOption("");
    await page.locator("#cdLocSub").selectOption("");
    await page.locator("#cdLocRegion").selectOption("2433");
    await page.locator("#cdLocPob").selectOption("10000-99999");
    await page.waitForTimeout(300);
    nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres.slice().sort(), ["Bécancour", "Drummondville", "Victoriaville"]);
    /* Población de 100,000 o más */
    await page.locator("#cdLocRegion").selectOption("");
    await page.locator("#cdLocPob").selectOption("100000-");
    await page.waitForTimeout(300);
    nombres = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(nombres.slice().sort(), ["Gatineau", "Laval", "Longueuil", "Lévis", "Montréal", "Québec", "Saguenay", "Sherbrooke", "Terrebonne", "Trois-Rivières"].sort());
    /* Orden por población (de mayor a menor) */
    await page.locator("#cdLocPob").selectOption("");
    await page.locator("#cdLocOrden").selectOption("pob-");
    await page.waitForTimeout(300);
    const primeros = (await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents()).slice(0, 4).map((x) => x.replace(/Ficha completa/, "").trim());
    assert.deepEqual(primeros, ["Montréal", "Québec", "Laval", "Gatineau"]);
    /* Restablecer */
    await page.locator("#cdLocTipo").selectOption("paroisse");
    await page.locator("#cdLocReset").click();
    await page.waitForTimeout(300);
    assert.match(await page.locator("#cdLocEstado").textContent(), /^6,725 localidades encontradas/);
    for (const id of ["#cdLocBuscar", "#cdLocTipo", "#cdLocRegion", "#cdLocSub", "#cdLocPob", "#cdLocOrden"]) assert.equal(await page.locator(id).inputValue(), "", id);
    /* Mapa: un grupo acerca la vista; «Toda la provincia» vuelve; un punto abre su tarjeta */
    const vb0 = await page.locator("#cdLocMapa svg").getAttribute("viewBox");
    await page.locator(".cd-loc__grupo").first().dispatchEvent("click");
    assert.notEqual(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0, "el grupo acerca el mapa");
    await page.locator('.cd-loc__zoom button[data-z="all"]').click();
    assert.equal(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0);
    await page.locator(".cd-loc__punto.es-ficha").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta a").getAttribute("href"), /^\/canada-en-datos\/quebec\/[a-z-]+$/);
    /* Teclado: el buscador se alcanza con Tab y filtra al escribir */
    await page.locator("#cdLocTarjeta .cd-loc__cerrar").click();
    await page.locator("#cdLocBuscar").focus();
    await page.keyboard.type("victoriaville");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length <= 3);
    await page.keyboard.press("Tab");
    assert.notEqual(await page.evaluate(() => document.activeElement.id), "cdLocBuscar", "el foco avanza con Tab");
    await page.locator("#cdLocReset").click();
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `qc-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`  ${perfil}: directorio listo en ${msCarga} ms, ${grupos} grupos y ${marcadores} círculos en el mapa`);

    /* ---------- Fichas completas ---------- */
    for (const [s, h1, pob, alquiler, hospital, web] of [
      ["montreal", "Montréal", "1,762,949", "$1,346 al mes", "Hôpital général juif", "https://montreal.ca/"],
      ["quebec", "Québec", "549,459", "$1,277 al mes", "Hôpital de l'Enfant-Jésus", "https://www.ville.quebec.qc.ca/"],
      ["gatineau", "Gatineau", "291,041", "$1,460 al mes", "Hôpital de Hull", "https://www.gatineau.ca/"],
      ["sherbrooke", "Sherbrooke", "172,950", "$1,062 al mes", "Hôtel-Dieu de Sherbrooke", "https://www.sherbrooke.ca/"],
      ["saguenay", "Saguenay", "144,723", "$985 al mes", "Hôpital de Chicoutimi", "https://ville.saguenay.ca/"],
      ["val-d-or", "Val-d'Or", "32,752", "$1,071 al mes", "Hôpital de Val-d'Or", "https://www.ville.valdor.qc.ca/"],
      ["gaspe", "Gaspé", "15,063", "$919 al mes", "Hôtel-Dieu de Gaspé", "https://ville.gaspe.qc.ca/"],
      ["saint-jean-sur-richelieu", "Saint-Jean-sur-Richelieu", "97,873", null, "Hôpital du Haut-Richelieu", "https://sjsr.ca/"],
      ["chibougamau", "Chibougamau", "7,233", null, "Baie-James", "https://www.ville.chibougamau.qc.ca/"],
    ]) {
      /* En tableta y celular se recorren cuatro, para acortar la prueba */
      if (perfil !== "computador" && !["montreal", "quebec", "gaspe", "chibougamau"].includes(s)) continue;
      ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/${s}`));
      assert.equal(await page.locator("h1").textContent(), h1);
      assert.equal(await page.locator('meta[name="robots"]').count(), 0, "las fichas completas se indexan");
      for (const id of ["resumen", "ubicacion", "economia-empleo", "vivienda", "educacion", "salud", "transporte", "recien-llegados", "familias", "enlaces"]) assert.equal(await page.locator(`#${id}`).count(), 1, `${s}: ${id}`);
      const recien = await page.locator("#recien-llegados").textContent();
      assert.match(recien, /Accompagnement Québec/);
      assert.match(recien, s === "saint-jean-sur-richelieu" || s === "chibougamau" ? /no indica, en octubre de 2026, organismos asociados/ : /hay organismos asociados con oficina en/);
      assert.match(await page.locator("#economia-empleo").textContent(), /se publican por región económica, no por localidad/);
      const resumen = await page.locator("#resumen").textContent();
      assert.ok(resumen.includes(pob), pob);
      assert.match(resumen, /Hora del Este/);
      assert.match(resumen, /Répertoire des municipalités/);
      const vivienda = await page.locator("#vivienda").textContent();
      if (alquiler) assert.ok(vivienda.includes(alquiler), alquiler);
      else assert.match(vivienda, /Dato no disponible: esta página no muestra alquileres de CMHC/, "sin promedios provinciales");
      assert.ok((await page.locator("#salud").textContent()).includes(hospital), hospital);
      assert.match(await page.locator("#salud").textContent(), /811/);
      assert.equal(await page.locator(`#enlaces a[href="${web}"]`).count(), 1, web);
      /* Reloj local en vivo, con el mismo diseño que la guía provincial */
      await page.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-localidad] [data-reloj-hora]").textContent));
      assert.equal(await page.locator("[data-reloj-localidad]").getAttribute("data-zona"), "America/Toronto");
      const externos = await page.locator('main a[href^="http"]:not([href^="https://podcastdelmigrante.com"])').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
      assert.ok(externos, "enlaces externos en pestaña nueva");
      await compartir(page, `${GUIA}/${s}`, `/assets/canada-en-datos/quebec/${s}.jpg`);
      await sinScrollHorizontal(page);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `qc-${s}-${perfil}.png`), fullPage: perfil === "computador" });
      assert.deepEqual(errores, []);
      await ctx.close();
    }

    /* ---------- Páginas básicas: municipio rural, municipio, reserva y territorio no organizado ---------- */
    for (const [ruta, h1, texto] of [
      [`${GUIA}/saint-elzear`, "Saint-Elzéar (municipio, La Nouvelle-Beauce)", /designación oficial de municipalité/],
      [`${GUIA}/kahnawake`, "Kahnawake", /No es un municipio/],
      [`${GUIA}/kuujjuaq`, "Kuujjuaq (villa nórdica (inuit))", /villas nórdicas son los municipios de las comunidades inuit/],
      [`${GUIA}/mont-alexandre`, "Mont-Alexandre", /territorio no organizado/],
      [`${GUIA}/saint-guy`, "Saint-Guy", /forma parte de Lac-des-Aigles/],
      [`${GUIA}/blanc-sablon`, "Blanc-Sablon", /Hora del Atlántico \(UTC−4\) todo el año/],
    ]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, ruta));
      assert.equal(await page.locator("h1").textContent(), h1);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
      assert.match(await page.locator("main").textContent(), texto);
      assert.match(await page.locator("#salud").textContent(), /811/);
      assert.equal(await page.locator("[data-reloj-localidad]").count(), 0, "el reloj en vivo es solo para las fichas completas");
      await compartir(page, ruta, `/assets/canada-en-datos/quebec/${ruta.split("/").pop()}.jpg`);
      await sinScrollHorizontal(page);
      if (SHOTS && ruta.endsWith("saint-guy")) await page.screenshot({ path: path.join(SHOTS, `qc-fusion-${perfil}.png`), fullPage: perfil === "computador" });
      assert.deepEqual(errores, []);
      await ctx.close();
    }

    /* ---------- Lugar sin página propia: resaltado en la página de su subdivisión ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, `${GUIA}/montreal#lugar-le-plateau-mont-royal`));
    const lugar = page.locator(":target");
    assert.equal(await lugar.getAttribute("id"), "lugar-le-plateau-mont-royal");
    assert.match(await lugar.textContent(), /^Le Plateau-Mont-Royal/);
    assert.equal(await lugar.evaluate((e) => getComputedStyle(e).fontWeight), "700", "resaltado");
    await page.waitForFunction(() => { const r = document.querySelector(":target").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Reloj: hora del Este en Montreal, con el cambio del 1-11-2026 (fecha simulada) ---------- */
    if (perfil === "computador") {
      for (const [utc, esperado] of [["2026-10-30T18:00:00Z", "2:00:00p. m."], ["2026-11-02T18:00:00Z", "1:00:00p. m."], ["2027-01-15T18:00:00Z", "1:00:00p. m."], ["2027-03-15T18:00:00Z", "2:00:00p. m."], ["2027-07-01T18:00:00Z", "2:00:00p. m."]]) {
        for (const ruta of [GUIA, `${GUIA}/sherbrooke`]) {
          const c = await browser.newContext({ ...PERFILES.computador, locale: "es-CA" });
          const pg = await c.newPage();
          await pg.clock.setFixedTime(new Date(utc));
          await pg.goto(BASE + ruta, { waitUntil: "networkidle" });
          await pg.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-hora]").textContent));
          assert.equal((await pg.locator("[data-reloj-hora]").textContent()).replace(/\s/g, " "), esperado.replace(/\s/g, " "), `${utc}: ${ruta}`);
          await c.close();
        }
      }
      console.log("  reloj: hora del Este en Quebec antes y después del 1-11-2026, en invierno y en verano (guía y fichas)");
    }

    /* ---------- Portada de Canadá en Datos: Quebec enlazada al elegirla en el mapa ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    await page.locator('path[data-code="QC"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('a[href="/canada-en-datos/quebec"]'));
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones ---------- */
  for (const [ruta, estado] of [
    [GUIA, 200],
    [`${GUIA}/montreal`, 200],
    [`${GUIA}/mont-alexandre`, 200],
    [`${GUIA}/montreal.html`, 308],
    [`${GUIA}/no-existe`, 404],
    ["/canada-en-datos/manitoba/winnipeg", 200],
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
  console.log("OK Quebec: guía, directorio, mapa, fichas con reloj, páginas básicas, estado municipal actual, identidad visual de Alberta y compartir");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
