/* TEMPORAL: diagnóstico de la tarjeta del fundador (#fundador) en producción.
   Escenarios por dispositivo (iPhone 13, iPhone SE, escritorio):
   - «prod-limpio»: navegador sin caché, producción real;
   - «prod-css-anterior»: el HTML actual de producción con la hoja css/styles.css
     del PR #128 (lo que ve quien la tiene guardada en la caché del navegador);
   - «vista-aprobada»: la vista previa aprobada del PR #129.
   Mide la foto y la tarjeta reales. Sin estadísticas: /api/* y sendBeacon locales. */
const { chromium, devices } = require("playwright");
const fs = require("fs");
const OUT = "/tmp/out";
const PROD = "https://podcastdelmigrante.com", VISTA = "https://claude-fundador-tarjeta.podcastdelmigrante.pages.dev";
const VIEJA = fs.readFileSync(__dirname + "/styles-pr128.css", "utf8");
const DISP = [["iphone-13", devices["iPhone 13"]], ["iphone-se", devices["iPhone SE"]], ["escritorio", { viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 }]];
(async () => {
  const b = await chromium.launch();
  const filas = [];
  for (const [esc, base, cssVieja] of [["prod-limpio", PROD, false], ["prod-css-anterior", PROD, true]]) {
    for (const [n, p] of DISP) {
      const c = await b.newContext({ ...p, reducedMotion: "reduce" });
      await c.addInitScript(() => { navigator.sendBeacon = () => true; });
      await c.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
      if (cssVieja) await c.route(/\/css\/styles\.css$/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: VIEJA }));
      const pg = await c.newPage();
      await pg.goto(base + "/", { waitUntil: "networkidle" });
      const s = pg.locator("#fundador"); await s.scrollIntoViewIfNeeded();
      await pg.waitForFunction(() => { const i = document.querySelector(".fundador__foto"); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
      await pg.evaluate(() => document.querySelectorAll("header, .site-header, .breaking").forEach((h) => (h.style.visibility = "hidden")));
      await s.screenshot({ path: `${OUT}/${esc}-${n}.png` });
      const m = await pg.evaluate(() => {
        const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const x = e.getBoundingClientRect(); return { w: Math.round(x.width), h: Math.round(x.height), x: Math.round(x.left), y: Math.round(x.top) }; };
        const t = document.querySelector(".fundador"); const cs = t && getComputedStyle(t);
        return { vw: innerWidth, tarjeta: r(".fundador"), marco: r(".fundador__media"), foto: r(".fundador__foto"), nombre: r(".fundador__nombre"), fondo: cs && cs.backgroundColor, cols: cs && cs.gridTemplateColumns, css: [...document.styleSheets].map((x) => x.href || "inline").filter((h) => /styles\.css/.test(h)) };
      });
      filas.push({ escenario: esc, dispositivo: n, ...m });
      await c.close();
    }
  }
  fs.writeFileSync(`${OUT}/medidas.json`, JSON.stringify(filas, null, 1));
  for (const f of filas) console.log(`${f.escenario.padEnd(18)} ${f.dispositivo.padEnd(11)} vw=${f.vw} tarjeta=${f.tarjeta && f.tarjeta.w + "x" + f.tarjeta.h} marco-foto=${f.marco && f.marco.w + "x" + f.marco.h} fondo=${f.fondo} columnas=${f.cols} nombre-junto-a-foto=${f.nombre && f.marco ? f.nombre.x >= f.marco.x + f.marco.w : "?"}`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
