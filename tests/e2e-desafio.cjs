/*
  Prueba de extremo a extremo (navegador) de /desafio-100-empresas/.
  Solo lee páginas; no contacta a YouTube (se bloquea todo dominio externo).

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-desafio.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const { DATOS, resumen } = require("../js/desafio-datos.js");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const R = resumen("calgary");
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};
const andrea = DATOS.episodios.find((e) => e.ep === 37);
const wenfer = DATOS.episodios.find((e) => e.ep === 11);
const carlos = DATOS.episodios.find((e) => e.ep === 3);
const RUTAS = {
  programa: "/desafio-100-empresas/",
  calgary: "/desafio-100-empresas/calgary/",
  entrevistas: "/desafio-100-empresas/calgary/entrevistas",
  andrea: `/desafio-100-empresas/calgary/${andrea.slug}`,
  wenfer: `/desafio-100-empresas/calgary/${wenfer.slug}`,
  carlos: `/desafio-100-empresas/calgary/${carlos.slug}`,
  muro: "/desafio-100-empresas/calgary/muro",
};
const OTRAS_SECCIONES = ["/", "/noticias", "/canada-en-datos/", "/canada-en-datos/alberta", "/canada-en-datos/alberta/brooks", "/perfil-carlos-d-castillo.html", "/historia.html?slug=desafio-andrea-diaz-posada-familia-separada"];

async function abrir(browser, perfil, ruta) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA" });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => r.abort());
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/net::ERR_FAILED|ERR_BLOCKED|status of 405/.test(m.text()) && errores.push(m.text()));
  /* /api/events (analítica) es una Function: no corre al servir dist/ estática */
  page.on("response", (r) => r.status() >= 400 && r.url().startsWith(BASE) && !r.url().includes("/api/events") && errores.push(`${r.status()} ${r.url()}`));
  const resp = await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  assert.equal(resp.status(), 200, ruta);
  return { ctx, page, errores };
}

async function comunes(page, ruta) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${ruta}: desplazamiento horizontal ${sw} > ${cw}`);
  assert.equal(await page.locator("h1").count(), 1, `${ruta}: un solo h1`);
  assert.ok(await page.locator("#siteHeader").count(), `${ruta}: cabecera del portal`);
  assert.ok(await page.locator("footer.site-footer").count(), `${ruta}: pie del portal`);
  const texto = await page.locator("body").innerText();
  assert.doesNotMatch(texto, /90 d[ií]as|tres meses|3 meses|sin plazo fijo/i, `${ruta}: promesa de plazo`);
  assert.doesNotMatch(texto, /patrocinador(a)? oficial/i, `${ruta}: patrocinio vigente`);
  const html = await page.content();
  const correos = [...html.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((m) => m[0]).filter((c) => c !== "podcastdelmigrante@gmail.com" && !/\.(png|jpg|svg|webp)$/.test(c));
  assert.deepEqual(correos, [], `${ruta}: correos`);
  assert.doesNotMatch(texto, /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/, `${ruta}: teléfono`);
  /* Tipografías y verde del portal */
  const estilo = await page.evaluate(() => {
    const h1 = getComputedStyle(document.querySelector("h1"));
    return { fuente: h1.fontFamily, verde: getComputedStyle(document.documentElement).getPropertyValue("--verde").trim() };
  });
  assert.match(estilo.fuente, /Fraunces/, `${ruta}: Fraunces`);
  assert.equal(estilo.verde, "#6f9a03");
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    for (const [nombre, ruta] of Object.entries(RUTAS)) {
      const { ctx, page, errores } = await abrir(browser, perfil, ruta);
      await comunes(page, ruta);

      if (nombre === "programa" || nombre === "calgary") {
        assert.match(await page.locator("h1").innerText(), /100 empresarios\. 100 historias\. Un legado\./);
        assert.equal((await page.locator('[data-dz-cifra="historias"]').innerText()).replace(/\s+/g, " ").trim(), `${R.historiasPublicadas} / ${R.meta}`);
        if (DATOS.ediciones[0].conteo.estado === "provisional") assert.match(await page.locator(".dz-contador").innerText(), /provisional/i);
      }
      if (nombre === "programa" || nombre === "calgary") {
        /* Inscripción: el botón abre el formulario oficial de Google en una pestaña nueva (no se envía nada) */
        const FORM = DATOS.programas[0].inscripcion;
        const boton = page.locator("a[data-dz-inscripcion]").first();
        await boton.scrollIntoViewIfNeeded();
        assert.ok(await boton.isVisible(), `${ruta}: botón de inscripción visible`);
        assert.match(await boton.innerText(), /Quiero participar en el Desafío 100 Empresas/);
        assert.equal(await boton.getAttribute("href"), FORM);
        assert.equal(await boton.getAttribute("target"), "_blank");
        const pedidas = [];
        ctx.on("request", (q) => pedidas.push(q.url()));
        const [popup] = await Promise.all([ctx.waitForEvent("page"), boton.click()]);
        await page.waitForTimeout(400);
        assert.ok(pedidas.includes(FORM), `${ruta}: la pestaña nueva pide ${FORM}`);
        if (process.env.FORMULARIO_REAL === "1") {
          await popup.waitForURL(/^https:\/\/docs\.google\.com\/forms\//, { timeout: 30000 });
          assert.match(popup.url(), /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/viewform/, `${ruta}: formulario de Google`);
        }
        await popup.close();
      }
      if (nombre === "calgary") {
        assert.equal(await page.locator(".dz-mosaico i.pub").count(), R.historiasPublicadas);
        assert.equal(await page.locator(".dz-mosaico i").count(), 100);
      }
      if (nombre === "entrevistas") {
        const tarjetas = page.locator("#dzRejilla .desafio-card");
        assert.equal(await tarjetas.count(), R.episodiosPublicados);
        await page.locator('[data-dz-categoria="moda"]').click();
        assert.equal(await page.locator("#dzRejilla .desafio-card:visible").count(), 1, "filtro Moda: Andrea");
        await page.locator('[data-dz-categoria="todas"]').click();
        assert.equal(await page.locator("#dzRejilla .desafio-card:visible").count(), R.episodiosPublicados);
      }
      if (nombre === "andrea") {
        const t = await page.locator("main").innerText();
        assert.match(t, /Brooks, Alberta/);
        assert.match(t, /Calgary · Primera edición/);
        assert.equal(await page.locator(`[data-video-id="${andrea.videoId}"]`).count(), 1);
        assert.equal(await page.locator("iframe").count(), 0, "sin reproductor antes de pulsar");
        await page.locator("[data-video-play]").click();
        assert.match(await page.locator("iframe").getAttribute("src"), new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${andrea.videoId}`));
      }
      if (nombre === "wenfer") {
        assert.equal(await page.locator(".dz-video .dz-portada").count(), 1, "portada propia (sin la miniatura con Sterna)");
        assert.match(await page.locator(".dz-ficha").innerText(), /2 episodios.*cuenta como 1/s);
      }
      if (nombre === "carlos") {
        const href = await page.locator('a[href="/perfil-carlos-d-castillo.html"]').first().getAttribute("href");
        assert.equal((await page.request.get(BASE + href)).status(), 200);
        assert.equal(await page.locator("blockquote.dz-frase").count(), 0, "con historia editorial no se repite la frase");
      }
      if (nombre === "muro") {
        const tarjetas = page.locator("#dzMuro .dz-persona");
        assert.equal(await tarjetas.count(), R.participantes);
        /* En todos los tamaños: nombre, empresa y ciudad visibles */
        for (const sel of [".dz-persona__nombre", ".dz-persona__empresa", ".dz-lugar"]) assert.ok(await tarjetas.first().locator(sel).isVisible(), sel);
        await page.fill("#dzBuscarMuro", "winnipeg");
        assert.equal(await page.locator("#dzMuro .dz-persona:visible").count(), DATOS.participantes.filter((p) => p.ciudad === "Winnipeg").length);
        await page.fill("#dzBuscarMuro", "brooks");
        assert.match(await page.locator("#dzMuro .dz-persona:visible").innerText(), /Andrea Paola Díaz Posada/);
        await page.fill("#dzBuscarMuro", "");
        await page.locator('[data-dz-estado="confirmado"]').click();
        assert.equal(await page.locator("#dzMuro .dz-persona:visible").count(), DATOS.participantes.filter((p) => DATOS.historias.find((h) => h.id === p.historia).estado === "pendiente").length);
        await page.locator('[data-dz-estado="todos"]').click();
      }
      if (SHOTS && ["computador", "celular"].includes(perfil) || (SHOTS && perfil === "tableta" && nombre === "calgary")) {
        await page.reload({ waitUntil: "networkidle" });
        await page.evaluate(async () => {
          document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
          await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(SHOTS, `desafio-${nombre}-${perfil}.png`), fullPage: true });
      }
      assert.deepEqual(errores, [], `${perfil} ${ruta}`);
      await ctx.close();
    }
    console.log(`ok ${perfil}`);
  }

  /* Todos los enlaces internos de la sección responden 200 */
  const { ctx, page } = await abrir(browser, "computador", RUTAS.programa);
  const vistos = new Set();
  const pendientes = Object.values(RUTAS);
  for (const e of DATOS.episodios) pendientes.push(`/desafio-100-empresas/calgary/${e.slug}`);
  const internos = new Set();
  for (const ruta of [...new Set(pendientes)]) {
    const html = await (await page.request.get(BASE + ruta)).text();
    for (const [, href] of html.matchAll(/href="(\/[^"#]*)"/g)) internos.add(href);
    vistos.add(ruta);
  }
  for (const href of internos) {
    const st = (await page.request.get(BASE + href, { maxRedirects: 2 })).status();
    assert.equal(st, 200, `enlace roto: ${href}`);
  }
  await ctx.close();
  console.log(`ok enlaces (${internos.size} enlaces internos en ${vistos.size} páginas)`);

  /* Las demás secciones del portal siguen funcionando */
  for (const ruta of OTRAS_SECCIONES) {
    const { ctx: c2, page: p2, errores } = await abrir(browser, "celular", ruta);
    assert.deepEqual(errores, [], ruta);
    await c2.close();
  }
  console.log(`ok otras secciones (${OTRAS_SECCIONES.length})`);
  await browser.close();
  console.log("OK Desafío 100 Empresas");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
