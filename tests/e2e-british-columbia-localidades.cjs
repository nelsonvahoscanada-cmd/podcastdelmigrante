/*
  Prueba de extremo a extremo (navegador) de la guía de Columbia Británica:
  ficha provincial, directorio extendido (búsqueda con variantes, filtros
  combinados, orden y «Restablecer»), mapa con agrupación de puntos, fichas
  de localidad y «Compartir esta guía», en computador, tableta y celular.
  Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-british-columbia-localidades.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SITE = "https://podcastdelmigrante.com";
const SHOTS = process.env.SHOTS || "";
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
  // «Copiar enlace»: copia la URL y lo confirma en un mensaje accesible
  assert.equal(await caja.locator("[data-share-estado]").getAttribute("role"), "status");
  await caja.locator("[data-share-copiar]").click();
  await page.waitForFunction(() => /Enlace copiado|Copia este enlace/.test(document.querySelector("[data-share-estado]").textContent));
  const copiado = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  if (copiado !== null) assert.equal(copiado, url, "portapapeles");
  // «Compartir esta guía»: sin Web Share API (Chromium de escritorio) lleva a los enlaces de redes
  await page.evaluate(() => { try { delete Navigator.prototype.share; } catch (e) {} });
  await caja.locator("[data-share-nativo]").click();
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains("cd-share__red--whatsapp")), true, "el foco va a los enlaces de redes");
  // Con Web Share API: se llama con la URL de la página
  await page.evaluate(() => { window.__compartido = null; navigator.share = (d) => { window.__compartido = d; return Promise.resolve(); }; });
  await caja.locator("[data-share-nativo]").click();
  assert.equal(await page.evaluate(() => window.__compartido && window.__compartido.url), url);
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* ---------- Guía de Columbia Británica: directorio ---------- */
    let { ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/british-columbia");
    assert.equal(await page.evaluate(() => typeof window.CD_LOCALIDADES), "undefined", "datos cargados antes de tiempo");
    assert.equal(await page.locator("h1").first().textContent(), "Columbia Británica");
    assert.equal(await page.locator("#localidades h2").textContent(), "Explora las ciudades y pueblos de Columbia Británica");
    for (const id of ["poblacion", "geografia", "economia", "empleo", "inmigracion", "vivienda", "salud", "educacion", "licencias", "beneficios", "integracion", "seguridad", "ciudades", "recien-llegado", "fuentes"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    assert.match(await page.locator("#geografia").textContent(), /UTC−7/);
    await compartir(page, "/canada-en-datos/british-columbia", "/assets/canada-en-datos/social-british-columbia.jpg");
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `bc-guia-${perfil}.png`) });
    await page.locator("#localidades").scrollIntoViewIfNeeded();
    const t0 = Date.now();
    await page.waitForFunction(() => !document.getElementById("cdLocBuscar").disabled);
    const msCarga = Date.now() - t0;
    const total = await page.evaluate(() => window.CD_LOCALIDADES.localidades.length);
    assert.ok(total > 2000, `${total} localidades`);
    assert.equal(await page.locator("#cdLocLista li").count(), 40, "listado por tandas");
    assert.match(await page.locator("#cdLocLista li").first().textContent(), /Vancouver[\s\S]*Ficha completa/);
    /* Mapa: con todas las localidades se agrupan los puntos (no miles de marcadores) */
    const grupos = await page.locator(".cd-loc__grupo").count();
    const marcadores = await page.locator("#cdLocMapa circle").count();
    assert.ok(grupos > 20, `${grupos} grupos`);
    assert.ok(marcadores < 600, `${marcadores} círculos en el mapa (de ${total} localidades)`);
    /* 1-2. Búsqueda por nombre completo, parcial, sin mayúsculas ni acentos, y por variante */
    await page.locator("#cdLocBuscar").fill("KELOW");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length < 10);
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), "/canada-en-datos/british-columbia/kelowna");
    await page.locator("#cdLocBuscar").fill("queen charlotte");
    await page.waitForFunction(() => /Daajing Giids/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), "/canada-en-datos/british-columbia/daajing-giids");
    /* El distrito de gobierno indígena se encuentra por su nombre oficial (shíshálh), con o sin acentos */
    await page.locator("#cdLocBuscar").fill("shishalh");
    await page.waitForFunction(() => document.querySelectorAll("#cdLocLista li").length === 2);
    assert.match(await page.locator("#cdLocLista").textContent(), /Sechelt \(Part\)/);
    /* Una comunidad no incorporada lleva al lugar resaltado dentro de su subdivisión, y el mapa la muestra */
    await page.locator("#cdLocBuscar").fill("bamfield");
    await page.waitForFunction(() => /Bamfield/.test(document.querySelector("#cdLocLista").textContent));
    assert.equal(await page.locator("#cdLocLista li a").first().getAttribute("href"), "/canada-en-datos/british-columbia/alberni-clayoquot-a#lugar-bamfield");
    assert.match(await page.locator("#cdLocLista .cd-loc__item-tipo").first().textContent(), /está en Alberni-Clayoquot A \(área electoral\) · Alberni-Clayoquot · región Vancouver Island and Coast/);
    await page.locator(".cd-loc__punto").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta").textContent(), /Bamfield[\s\S]*está en Alberni-Clayoquot A \(área electoral\)[\s\S]*Ver dónde está: Alberni-Clayoquot A/);
    assert.equal(await page.locator("#cdLocTarjeta a").getAttribute("href"), "/canada-en-datos/british-columbia/alberni-clayoquot-a#lugar-bamfield");
    await page.locator("#cdLocTarjeta .cd-loc__cerrar").click();

    /* Todo el catálogo: cada una de las localidades y lugares aparece al buscar su nombre, con su enlace y su subdivisión */
    const catalogo = await page.evaluate(() => {
      const D = window.CD_LOCALIDADES;
      const [buscar, tipo, mas, lista] = ["cdLocBuscar", "cdLocTipo", "cdLocMas", "cdLocLista"].map((id) => document.getElementById(id));
      const base = "/canada-en-datos/british-columbia/";
      const fallos = [];
      let comunidades = 0;
      for (const f of D.localidades) {
        buscar.value = f[0];
        tipo.dispatchEvent(new Event("change")); /* filtra al instante (sin la espera de la escritura) */
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
          if (!f[11] || !texto.includes(`está en ${m[0]}`) || !texto.includes(`región ${D.regiones[f[2]]}`)) fallos.push(`sin subdivisión o región: ${f[0]}`);
        }
      }
      buscar.value = "";
      tipo.dispatchEvent(new Event("change"));
      return { total: D.localidades.length, comunidades, fallos };
    });
    assert.deepEqual(catalogo.fallos, [], catalogo.fallos.slice(0, 10).join("; "));
    assert.equal(catalogo.total, 2378);
    assert.equal(catalogo.comunidades, 1627);
    console.log(`  ${perfil}: ${catalogo.total} búsquedas por nombre correctas (${catalogo.comunidades} lugares sin página propia, con su subdivisión)`);

    /* Filtros por tipo y por región económica: el número mostrado coincide con los datos oficiales */
    const opciones = await page.evaluate(() => ({
      tipos: [...document.querySelectorAll("#cdLocTipo option")].map((o) => o.value).filter(Boolean),
      regiones: [...document.querySelectorAll("#cdLocRegion option")].map((o) => o.value).filter(Boolean),
    }));
    assert.ok(opciones.tipos.length >= 20 && opciones.regiones.length === 8, JSON.stringify(opciones));
    let filtrosProbados = 0;
    for (const [sel, valores] of [["#cdLocTipo", opciones.tipos], ["#cdLocRegion", opciones.regiones]]) {
      for (const v of valores) {
        await page.locator(sel).selectOption(v);
        const esperado = await page.evaluate(([sel, v]) => {
          const D = window.CD_LOCALIDADES;
          return D.localidades.filter((f) => (sel === "#cdLocRegion" ? String(f[2]) === v : v.startsWith("grupo:") ? D.tipos[f[1]][2] === v.slice(6) : f[1] === v)).length;
        }, [sel, v]);
        assert.ok(esperado > 0, `${sel}=${v} sin localidades`);
        filtrosProbados++;
        assert.match(await page.locator("#cdLocEstado").textContent(), new RegExp(`^${esperado.toLocaleString("en-US")} localidad(es)? encontradas? de 2,378\\.$`), `${sel}=${v}`);
      }
      await page.locator(sel).selectOption("");
    }
    console.log(`  ${perfil}: ${filtrosProbados} opciones de tipo y región con el conteo correcto`);
    /* 3-5. Filtros por tipo y por región económica, combinados */
    await page.locator("#cdLocBuscar").fill("");
    await page.locator("#cdLocTipo").selectOption("city");
    await page.locator("#cdLocRegion").selectOption("5980");
    await page.waitForTimeout(300);
    let nombres = await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents();
    assert.ok(nombres.some((x) => x.startsWith("Fort St. John")), "Fort St. John es ciudad del Northeast");
    assert.ok(nombres.every((x) => !/Vancouver|Kelowna/.test(x)));
    assert.match(await page.locator("#cdLocEstado").textContent(), /^\d+ localidad(es)? encontradas? de [\d,]+\.$/);
    /* Distrito regional + población + orden */
    await page.locator("#cdLocTipo").selectOption("");
    await page.locator("#cdLocRegion").selectOption("");
    await page.locator("#cdLocSub").selectOption("Capital");
    await page.locator("#cdLocPob").selectOption("10000-99999");
    await page.locator("#cdLocOrden").selectOption("az");
    await page.waitForTimeout(300);
    nombres = await page.locator("#cdLocLista .cd-loc__item-nombre").allTextContents();
    assert.ok(nombres.length >= 3 && nombres.includes("Langford") && !nombres.some((x) => x.startsWith("Saanich")), nombres.join(", "));
    assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b, "es")), "orden alfabético");
    /* Con pocos resultados, el mapa se acerca y muestra los puntos sueltos */
    assert.equal(await page.locator(".cd-loc__punto").count(), nombres.length, "mapa y listado coinciden");
    /* Restablecer */
    await page.locator("#cdLocReset").click();
    await page.waitForTimeout(300);
    assert.match(await page.locator("#cdLocEstado").textContent(), new RegExp(`^${total.toLocaleString("en-US")} localidades encontradas`));
    for (const id of ["#cdLocTipo", "#cdLocRegion", "#cdLocSub", "#cdLocPob", "#cdLocOrden"]) assert.equal(await page.locator(id).inputValue(), "", id);
    /* 8. Mapa: un grupo acerca la vista; un punto abre su tarjeta con el enlace a la ficha */
    const vb0 = await page.locator("#cdLocMapa svg").getAttribute("viewBox");
    await page.locator(".cd-loc__grupo").first().dispatchEvent("click");
    assert.notEqual(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0, "el grupo acerca el mapa");
    await page.locator('.cd-loc__zoom button[data-z="all"]').click();
    assert.equal(await page.locator("#cdLocMapa svg").getAttribute("viewBox"), vb0);
    await page.locator(".cd-loc__punto.es-ficha").first().dispatchEvent("click");
    assert.match(await page.locator("#cdLocTarjeta a").getAttribute("href"), /^\/canada-en-datos\/british-columbia\/[a-z0-9-]+$/);
    if (SHOTS) await page.locator("#localidades").screenshot({ path: path.join(SHOTS, `bc-directorio-${perfil}.png`) });
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`  ${perfil}: directorio listo en ${msCarga} ms, ${grupos} grupos y ${marcadores} círculos en el mapa`);

    /* ---------- 6. Ficha completa: Vancouver ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/british-columbia/vancouver"));
    assert.equal(await page.locator("h1").textContent(), "Vancouver");
    assert.equal(await page.locator('meta[name="robots"]').count(), 0, "las fichas completas se indexan");
    assert.match(await page.locator(".cd-breadcrumb").textContent(), /Canadá en Datos\s*›\s*Columbia Británica\s*›\s*Vancouver/);
    for (const id of ["resumen", "ubicacion", "comunidades", "economia-empleo", "vivienda", "educacion", "salud", "transporte", "recien-llegados", "familias", "enlaces"]) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    const resumen = await page.locator("#resumen").textContent();
    assert.match(resumen, /662,248/);
    assert.match(resumen, /740,454/);
    assert.match(resumen, /Metro Vancouver Regional District/);
    assert.match(resumen, /UTC−7/);
    assert.match(await page.locator("#vivienda").textContent(), /\$2,647 al mes/);
    assert.match(await page.locator("#educacion").textContent(), /Distrito escolar n\.º 39/);
    assert.match(await page.locator("#salud").textContent(), /Vancouver General Hospital/);
    assert.equal(await page.locator('#transporte a[href="https://www.translink.ca/"]').count(), 1);
    const externos = await page.locator('main a[href^="http"]:not([href^="https://podcastdelmigrante.com"])').evaluateAll((as) => as.every((a) => a.target === "_blank" && /noopener/.test(a.rel)));
    assert.ok(externos, "enlaces externos en pestaña nueva");
    await compartir(page, "/canada-en-datos/british-columbia/vancouver", "/assets/canada-en-datos/british-columbia/vancouver.jpg");
    await sinScrollHorizontal(page);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `bc-vancouver-${perfil}.png`), fullPage: true });
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Páginas básicas: área electoral y reserva ---------- */
    for (const [ruta, h1, texto] of [
      ["/canada-en-datos/british-columbia/alberni-clayoquot-a", "Alberni-Clayoquot A", /área electoral/],
      ["/canada-en-datos/british-columbia/alert-bay-indian-reserve", "Alert Bay (reserva indígena)", /reserva indígena \(Indian Reserve\)/],
      ["/canada-en-datos/british-columbia/cranbrook", "Cranbrook", /hora de la montaña/],
    ]) {
      ({ ctx, page, errores } = await abrir(browser, perfil, ruta));
      assert.equal(await page.locator("h1").textContent(), h1);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
      assert.match(await page.locator("main").textContent(), texto);
      assert.ok((await page.locator(".cd-pending").count()) >= 1, "«Dato no disponible» donde no hay información");
      assert.match(await page.locator("#salud").textContent(), /HealthLink BC/);
      await compartir(page, ruta, `/assets/canada-en-datos/british-columbia/${ruta.split("/").pop()}.jpg`);
      await sinScrollHorizontal(page);
      if (SHOTS && ruta.endsWith("alberni-clayoquot-a")) await page.screenshot({ path: path.join(SHOTS, `bc-area-electoral-${perfil}.png`), fullPage: true });
      assert.deepEqual(errores, []);
      await ctx.close();
    }

    /* ---------- Lugar sin página propia: se abre resaltado y visible en la página de su subdivisión ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/british-columbia/alberni-clayoquot-a#lugar-bamfield"));
    const lugar = page.locator(":target");
    assert.equal(await lugar.getAttribute("id"), "lugar-bamfield");
    assert.match(await lugar.textContent(), /^Bamfield/);
    assert.equal(await lugar.evaluate((e) => getComputedStyle(e).fontWeight), "700", "resaltado");
    await page.waitForFunction(() => { const r = document.querySelector(":target").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    assert.match(await page.locator("#comunidades").textContent(), /forman parte de Alberni-Clayoquot A/);
    assert.deepEqual(errores, []);
    await ctx.close();

    /* ---------- Reloj antes y después del 1 de noviembre de 2026 (fecha simulada en el navegador) ---------- */
    if (perfil === "computador") {
      /* [instante UTC, Victoria (PCT, UTC−7 siempre), sureste (Cranbrook, hora de la montaña), Edmonton (Alberta)] */
      for (const [utc, victoria, sureste, alberta] of [
        ["2026-10-31T18:00:00Z", "11:00", "12:00", "12:00"],
        ["2026-11-02T18:00:00Z", "11:00", "11:00", "11:00"],
        ["2027-01-15T18:00:00Z", "11:00", "11:00", "11:00"],
        ["2027-03-15T18:00:00Z", "11:00", "12:00", "12:00"],
        ["2027-07-01T18:00:00Z", "11:00", "12:00", "12:00"],
      ]) {
        for (const [ruta, esperado, zona] of [["/canada-en-datos/british-columbia", victoria, sureste], ["/canada-en-datos/alberta", alberta, null]]) {
          const c = await browser.newContext({ ...PERFILES.computador, locale: "es-CA" });
          const pg = await c.newPage();
          await pg.clock.setFixedTime(new Date(utc));
          await pg.goto(BASE + ruta, { waitUntil: "networkidle" });
          await pg.waitForFunction(() => /\d/.test(document.querySelector("[data-reloj-hora]").textContent));
          assert.match(await pg.locator("[data-reloj-hora]").textContent(), new RegExp(`^${esperado}:00`), `${ruta} ${utc}`);
          if (zona) {
            await pg.waitForFunction(() => /\d/.test(document.querySelector('[data-zona="America/Edmonton"] [data-zona-hora]').textContent));
            assert.match(await pg.locator('[data-zona="America/Edmonton"] [data-zona-hora]').textContent(), new RegExp(`^${zona}`), `sureste ${utc}`);
          }
          await c.close();
        }
      }
      /* Portada: el reloj de BC al elegir la provincia en el mapa, después del 1 de noviembre */
      const c = await browser.newContext({ ...PERFILES.computador, locale: "es-CA" });
      const pg = await c.newPage();
      await pg.clock.setFixedTime(new Date("2026-11-02T18:00:00Z"));
      await pg.goto(BASE + "/canada-en-datos/", { waitUntil: "networkidle" });
      await pg.locator('path[data-code="BC"]').dispatchEvent("click");
      await pg.waitForFunction(() => /^11:00/.test(document.querySelector("#cdClock [data-reloj-hora]").textContent));
      await c.close();
      console.log("  reloj: Victoria UTC−7 antes y después del 1-11-2026; sureste y Alberta con hora de la montaña (UTC−6 en verano, UTC−7 en invierno)");
    }

    /* ---------- 13. Portada de Canadá en Datos: BC enlazada y con hora correcta ---------- */
    ({ ctx, page, errores } = await abrir(browser, perfil, "/canada-en-datos/"));
    assert.equal(await page.locator('a[href="/canada-en-datos/british-columbia"]').count() >= 0, true);
    await page.locator('path[data-code="BC"]').dispatchEvent("click");
    await page.waitForFunction(() => document.querySelector('a[href="/canada-en-datos/british-columbia"]'));
    await sinScrollHorizontal(page);
    assert.deepEqual(errores, []);
    await ctx.close();
    console.log(`ok ${perfil}`);
  }

  /* ---------- Rutas limpias y redirecciones ---------- */
  for (const [ruta, estado] of [
    ["/canada-en-datos/british-columbia", 200],
    ["/canada-en-datos/british-columbia/vancouver", 200],
    ["/canada-en-datos/british-columbia/vancouver.html", 308],
    ["/canada-en-datos/british-columbia/no-existe", 404],
    ["/canada-en-datos/alberta/brooks", 200],
    ["/canada-en-datos/ontario/toronto", 200],
  ]) {
    const r = await fetch(BASE + ruta, { redirect: "manual" });
    assert.equal(r.status, estado, ruta);
  }
  await browser.close();
  console.log("OK Columbia Británica: guía, directorio, mapa, fichas y compartir");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
