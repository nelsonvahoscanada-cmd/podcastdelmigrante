/*
  Prueba de extremo a extremo: «Últimas noticias» de la portada (#latestList).
  En celular (iPhone SE, iPhone 13, iPhone 14 Pro Max): foto a la izquierda de
  tamaño uniforme y, a la derecha, categoría, titular y fecha agrupados; titulares
  legibles (sin columnas estrechas), filas dentro de la pantalla y sin
  desplazamiento horizontal. En tableta y computador se conserva el diseño de
  una línea (foto, categoría, titular y fecha). Mide las cajas reales.
  Las estadísticas no se tocan: /api/* y sendBeacon se responden localmente.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-ultimas-noticias-movil.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const PERFILES = {
  "iPhone SE": devices["iPhone SE"],
  "iPhone 13": devices["iPhone 13"],
  "iPhone 14 Pro Max": devices["iPhone 14 Pro Max"],
  tableta: devices["iPad Mini"],
  computador: { viewport: { width: 1440, height: 900 } },
};

(async () => {
  const browser = await chromium.launch();
  for (const [nombre, perfil] of Object.entries(PERFILES)) {
    const ctx = await browser.newContext({ ...perfil, locale: "es-CA", timezoneId: "America/Edmonton", reducedMotion: "reduce" });
    await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
    await ctx.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
    await ctx.addInitScript(() => { navigator.sendBeacon = () => true; });
    const page = await ctx.newPage();
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForSelector("#latestList .latest-row");
    await page.locator("#latestList").scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => {
      const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
      return {
        vw: document.documentElement.clientWidth,
        sw: document.documentElement.scrollWidth,
        filas: [...document.querySelectorAll("#latestList .latest-row")].map((f) => ({
          href: f.getAttribute("href"),
          fila: r(f),
          foto: f.querySelector(".latest-row__thumb") && r(f.querySelector(".latest-row__thumb")),
          fondo: f.querySelector(".latest-row__thumb") && f.querySelector(".latest-row__thumb").style.backgroundImage,
          tag: r(f.querySelector(".tag")),
          titulo: r(f.querySelector(".latest-row__title")),
          fecha: r(f.querySelector(".latest-row__time")),
          textoFecha: f.querySelector("time").textContent.trim(),
        })),
      };
    });
    assert.equal(m.filas.length, 5, `${nombre}: cinco noticias`);
    for (const f of m.filas) {
      assert.match(f.href, /^articulo-/, `${nombre}: enlace a la noticia`);
      assert.ok(f.textoFecha.length > 5, `${nombre}: fecha visible`);
      assert.ok(f.fila.l >= 0 && f.fila.r <= m.vw + 0.5 && f.titulo.r <= m.vw + 0.5 && f.fecha.r <= m.vw + 0.5, `${nombre}: fila dentro de la pantalla`);
      if (f.foto) assert.match(f.fondo, /url\(/, `${nombre}: fotografía real`);
    }
    if (m.vw < 760) {
      /* Celular: foto a la izquierda; categoría, titular y fecha apilados a la derecha */
      assert.ok(m.sw <= m.vw + 1, `${nombre}: sin desplazamiento horizontal (${m.sw} > ${m.vw})`);
      const tamanos = new Set(m.filas.filter((f) => f.foto).map((f) => `${Math.round(f.foto.w)}x${Math.round(f.foto.h)}`));
      assert.deepEqual([...tamanos], ["76x76"], `${nombre}: fotos de tamaño uniforme`);
      for (const f of m.filas) {
        const x = f.foto ? f.foto.r : f.fila.l;
        assert.ok(f.tag.l >= x && f.titulo.l >= x && f.fecha.l >= x, `${nombre}: texto a la derecha de la foto`);
        assert.ok(Math.abs(f.tag.l - f.titulo.l) < 1 && Math.abs(f.titulo.l - f.fecha.l) < 1, `${nombre}: categoría, titular y fecha alineados`);
        assert.ok(f.tag.b <= f.titulo.t + 1 && f.titulo.b <= f.fecha.t + 1, `${nombre}: categoría → titular → fecha`);
        assert.ok(f.titulo.w >= 190, `${nombre}: titular legible (${Math.round(f.titulo.w)} px de ancho)`);
        assert.ok(f.fila.l >= 12, `${nombre}: margen lateral`);
      }
    } else {
      /* Tableta y computador: diseño de siempre, en una línea */
      for (const f of m.filas) {
        assert.ok(Math.abs(f.foto.w - 52) < 1, `${nombre}: foto de 52 px`);
        assert.ok(f.tag.l > f.foto.r && f.titulo.l > f.tag.r && f.fecha.l > f.titulo.r, `${nombre}: foto, categoría, titular y fecha en una línea`);
      }
    }
    /* El archivo (/noticias) no cambia: mismo diseño de una línea */
    if (nombre === "iPhone 13") {
      const p2 = await ctx.newPage();
      await p2.goto(BASE + "/noticias", { waitUntil: "networkidle" });
      await p2.waitForSelector("#archivoLista .latest-row");
      const a = await p2.evaluate(() => { const f = document.querySelector("#archivoLista .latest-row--img"); return { cols: getComputedStyle(f).gridTemplateColumns.split(" ").length, foto: f.querySelector(".latest-row__thumb").getBoundingClientRect().width }; });
      assert.deepEqual(a, { cols: 4, foto: 40 }, "archivo /noticias sin cambios");
      await p2.close();
    }
    if (SHOTS) await page.locator("#latestList").locator("xpath=..").screenshot({ path: path.join(SHOTS, `ultimas-${nombre.replace(/\s+/g, "-").toLowerCase()}.png`) });
    assert.deepEqual(errores, [], `${nombre}: ${errores.join(" | ")}`);
    await ctx.close();
    console.log(`ok ${nombre}`);
  }
  await browser.close();
  console.log("OK «Últimas noticias»: celular con foto a la izquierda y texto agrupado; tableta y computador sin cambios");
})().catch((e) => { console.error(e); process.exit(1); });
