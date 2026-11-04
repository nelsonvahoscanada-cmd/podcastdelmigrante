/* Auditoría visual y de accesibilidad (solo lectura) de Nunavut frente a Alberta. */
const { chromium, devices } = require("playwright");
const fs = require("node:fs");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = "https://podcastdelmigrante.com";
const OUT = process.env.OUT || "/tmp/out";
const PAGS = {
  "nu-guia": "/canada-en-datos/nunavut", "nu-iqaluit": "/canada-en-datos/nunavut/iqaluit", "nu-rankin": "/canada-en-datos/nunavut/rankin-inlet",
  "nu-kinngait": "/canada-en-datos/nunavut/kinngait", "nu-grise": "/canada-en-datos/nunavut/grise-fiord", "ab-guia": "/canada-en-datos/alberta", "ab-calgary": "/canada-en-datos/alberta/calgary",
};
const PERF = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
  pequeno: { ...devices["Galaxy S8"] },
};
const res = { paginas: {}, axe: {} };
(async () => {
  const b = await chromium.launch();
  for (const [perfil, opc] of Object.entries(PERF)) {
    const ctx = await b.newContext({ ...opc, locale: "es-CA", timezoneId: "America/Edmonton" });
    await ctx.route(/\/api\/(vistas|events)/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"vistas":0}' }));
    for (const [clave, ruta] of Object.entries(PAGS)) {
      if (perfil === "pequeno" && !clave.startsWith("nu-")) continue;
      const p = await ctx.newPage(); const err = []; const pesos = { total: 0, n: 0 };
      p.on("pageerror", (e) => err.push("js: " + e.message));
      p.on("console", (m) => m.type() === "error" && err.push("consola: " + m.text().slice(0, 150)));
      p.on("response", async (x) => { if (x.status() >= 400) err.push(x.status() + " " + x.url()); try { const h = await x.headerValue("content-length"); if (h) { pesos.total += +h; pesos.n++; } } catch {} });
      const t0 = Date.now();
      const resp = await p.goto(BASE + ruta, { waitUntil: "networkidle", timeout: 90000 });
      const t = Date.now() - t0;
      await p.waitForTimeout(1200);
      const info = await p.evaluate(() => {
        const de = document.documentElement;
        const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
        const anchos = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > de.clientWidth + 1 && vis(e) && getComputedStyle(e).position !== "fixed"; }).slice(0, 8).map((e) => e.tagName + "." + [...e.classList].join(".") + " " + Math.round(e.getBoundingClientRect().right));
        const peq = [...document.querySelectorAll("main a, main button, main select, main input")].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return (r.height < 24 || r.width < 24) && getComputedStyle(e).display !== "inline"; }).map((e) => (e.textContent || e.getAttribute("aria-label") || e.name || "").trim().slice(0, 30) + ` ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
        const letra = [...document.querySelectorAll("main *")].filter((e) => vis(e) && e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => e.tagName + "." + [...e.classList].join(".") + " " + getComputedStyle(e).fontSize);
        const relojes = [...document.querySelectorAll("#cdClock, [data-zona-hora], [data-reloj-localidad]")].map((e) => (e.getAttribute("data-zona") || e.id || "") + ": " + e.textContent.trim().replace(/\s+/g, " ").slice(0, 80));
        const imgs = [...document.images].map((i) => ({ src: i.currentSrc.replace(location.origin, "").slice(0, 70), nat: i.naturalWidth + "x" + i.naturalHeight, vis: Math.round(i.getBoundingClientRect().width) + "x" + Math.round(i.getBoundingClientRect().height), alt: i.alt.slice(0, 50), lazy: i.loading }));
        const mapa = document.querySelector("#cdLocMapa"); const lista = document.querySelectorAll("#cdLocLista > li");
        const tarjetas = [...document.querySelectorAll(".cd-stat, .cd-card, .cd-indicador, .cd-kpi")].length;
        const estado = (document.querySelector("#cdLocEstado") || {}).textContent;
        const noticias = (document.querySelector("#noticias") || {}).innerText;
        return { titulo: document.title, h1: document.querySelector("h1")?.textContent.trim(), sw: de.scrollWidth, cw: de.clientWidth, alto: de.scrollHeight, anchos, peq: peq.slice(0, 15), npeq: peq.length, letra: [...new Set(letra)].slice(0, 12), nletra: letra.length, relojes, imgs, mapa: mapa ? { paths: mapa.querySelectorAll("path").length, circulos: mapa.querySelectorAll("circle").length, alto: Math.round(mapa.getBoundingClientRect().height), ancho: Math.round(mapa.getBoundingClientRect().width) } : null, lista: lista.length, tarjetas, estado, noticias: noticias && noticias.slice(0, 200), secciones: [...document.querySelectorAll("main section[id]")].map((s) => s.id + ":" + Math.round(s.getBoundingClientRect().height)) };
      });
      const metricas = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; const r = performance.getEntriesByType("resource"); return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), transfer: Math.round((n.transferSize + r.reduce((a, x) => a + (x.transferSize || 0), 0)) / 1024) + " KB", recursos: r.length }; });
      res.paginas[`${perfil} ${clave}`] = { estado: resp.status(), ms: t, metricas, err, ...info };
      /* Capturas: primera pantalla, mapa y directorio */
      const dir = `${OUT}/capturas`; fs.mkdirSync(dir, { recursive: true });
      if (clave.startsWith("nu-") || perfil !== "pequeno") {
        await p.screenshot({ path: `${dir}/${perfil}-${clave}-inicio.png` });
        if (clave.endsWith("guia")) {
          for (const sel of ["#localidades", "#ciudades", "#poblacion", "#recien-llegado"]) {
            const el = p.locator(sel); if (await el.count()) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await el.screenshot({ path: `${dir}/${perfil}-${clave}-${sel.slice(1)}.png` }).catch(() => {}); }
          }
        }
      }
      /* Interacciones del directorio en la guía */
      if (clave === "nu-guia") {
        const i = {};
        await p.fill("#cdLocBuscar", "igloolik"); await p.waitForTimeout(600); i.igloolik = await p.locator("#cdLocLista > li").count();
        await p.fill("#cdLocBuscar", "iqaluit"); await p.waitForTimeout(600); i.iqaluit = (await p.locator("#cdLocLista > li").allTextContents()).map((x) => x.replace(/\s+/g, " ").trim().slice(0, 90));
        await p.fill("#cdLocBuscar", "xyz"); await p.waitForTimeout(600); i.vacio = (await p.locator("#cdLocEstado").textContent()).trim();
        await p.fill("#cdLocBuscar", ""); await p.selectOption("#cdLocPob", { index: 1 }).catch(() => {}); await p.waitForTimeout(600); i.pob1 = { opcion: await p.locator("#cdLocPob option").nth(1).textContent(), estado: (await p.locator("#cdLocEstado").textContent()).trim() };
        i.opcionesPob = await p.locator("#cdLocPob option").allTextContents();
        i.opcionesRegionEco = await p.locator("#cdLocRegion option").allTextContents().catch(() => []);
        i.opcionesSub = await p.locator("#cdLocSub option").allTextContents().catch(() => []);
        await p.click("#cdLocReset").catch(() => {}); await p.waitForTimeout(400);
        i.inicial = (await p.locator("#cdLocEstado").textContent()).trim();
        res.paginas[`${perfil} ${clave}`].directorio = i;
      }
      if (perfil === "computador" || perfil === "celular") {
        await p.addScriptTag({ content: AXE });
        const ax = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ej: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " — " + (n.failureSummary || "").split("\n").slice(1, 2).join(" ").slice(0, 160)) })); });
        res.axe[`${perfil} ${clave}`] = ax;
      }
      await p.close();
    }
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(`${OUT}/visual.json`, JSON.stringify(res, null, 1));
  for (const [k, v] of Object.entries(res.paginas)) console.log(k, v.estado, v.ms + "ms", v.metricas.transfer, "desborde:", v.sw > v.cw + 1, "errores:", v.err.length, "toques<24:", v.npeq, "letra<13:", v.nletra);
  for (const [k, v] of Object.entries(res.axe)) console.log("axe", k, v.map((x) => `${x.id}(${x.impact}) x${x.n}`).join(", ") || "sin infracciones");
})();
