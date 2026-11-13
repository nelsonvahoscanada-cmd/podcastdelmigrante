/* TEMPORAL: auditoría de solo lectura de dos noticias marcadas como Soft 404. */
const { chromium, devices } = require("playwright");
const fs = require("fs");
const B = "https://podcastdelmigrante.com";
const NOTICIAS = {
  "canada-cambios-proceso-refugio-3-noviembre-2026": "tmp-audit/articles-antes-refugio.js",
  "salud-rural-urbana-alberta-atencion-medica": "tmp-audit/articles-antes-salud.js",
};
const GOOGLEBOT = "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const out = []; const log = (m) => { out.push(m); console.log(m); };
async function contexto(b, opts = {}) {
  const c = await b.newContext({ ...devices["Pixel 5"], locale: "es-CA", ...opts });
  await c.addInitScript(() => { navigator.sendBeacon = () => true; });
  await c.route(/\/api\//, (r) => r.fulfill({ status: 204, body: "" }));
  await c.route((u) => !u.href.startsWith(B), (r) => r.abort());
  return c;
}
async function estado(pg, etiqueta) {
  const d = await pg.evaluate(() => ({
    titulo: document.title, h1: (document.querySelector("h1") || {}).textContent || "",
    canon: (document.querySelector('link[rel="canonical"]') || {}).href || "", robots: (document.querySelector('meta[name="robots"]') || {}).content || "-",
    palabras: (document.querySelector("main") || document.body).innerText.split(/\s+/).length,
    noEncontrado: /no encontrad/i.test(document.title + " " + document.body.innerText.slice(0, 2000)),
    cargando: document.body.innerText.includes("Cargando artículo"),
    fecha: (document.querySelector(".article-meta, .article-byline, time") || {}).textContent || "",
    img: !!document.querySelector(".article-hero-media, .article-hero img, .article-figure img"),
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)["@type"]; } catch (e) { return "?"; } }).join(","),
  }));
  log(`  ${etiqueta}: título «${d.titulo.slice(0, 70)}» | h1 «${d.h1.trim().slice(0, 60)}» | ${d.palabras} palabras | canónica ${d.canon.replace(B, "")} | robots ${d.robots} | imagen ${d.img} | JSON-LD ${d.ld || "-"} | «no encontrado» ${d.noEncontrado} | «Cargando» ${d.cargando} | fecha «${d.fecha.trim().replace(/\s+/g, " ").slice(0, 60)}»`);
  return d;
}
(async () => {
  const b = await chromium.launch();
  for (const [slug, viejo] of Object.entries(NOTICIAS)) {
    const u = `${B}/articulo-${slug}`;
    log(`\n=== /articulo-${slug}`);
    /* 1. HTTP real (navegador normal y agente de Googlebot) */
    for (const [n, ua] of [["navegador", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"], ["Googlebot (UA)", GOOGLEBOT]]) {
      const r = await fetch(u, { headers: { "User-Agent": ua }, redirect: "manual" });
      const h = await r.text();
      log(`  HTTP ${n}: ${r.status} | content-type ${r.headers.get("content-type")} | x-robots-tag ${r.headers.get("x-robots-tag") || "-"} | cache-control ${r.headers.get("cache-control")} | ${h.length} bytes`);
      if (n === "navegador") {
        const g = (re) => (h.match(re) || [, "-"])[1];
        log(`  HTML sin JS: <title> «${g(/<title>([^<]*)/)}» | canónica ${g(/rel="canonical" href="([^"]*)"/)} | robots ${g(/<meta name="robots" content="([^"]*)"/)} | og:title «${g(/property="og:title" content="([^"]*)"/).slice(0, 60)}» | og:image ${g(/property="og:image" content="([^"]*)"/)} | cuerpo: «${h.replace(/[\s\S]*<main[^>]*>/, "").replace(/<\/main>[\s\S]*/, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)}»`);
        const img = g(/property="og:image" content="([^"]*)"/);
        if (img !== "-") { const ri = await fetch(img); log(`  og:image: ${ri.status} ${ri.headers.get("content-type")}`); }
      }
    }
    /* 2. Renderizado actual (como lo haría Googlebot hoy) */
    let c = await contexto(b, { userAgent: GOOGLEBOT });
    let pg = await c.newPage(); const errores = [];
    pg.on("pageerror", (e) => errores.push(e.message));
    await pg.goto(u, { waitUntil: "networkidle" });
    await estado(pg, "renderizado hoy (UA Googlebot)");
    log(`  errores JS: ${errores.length ? errores.join(" | ") : "ninguno"}`);
    await pg.screenshot({ path: `/tmp/out/${slug}-hoy.png` }); await c.close();
    /* 3. Sin JavaScript */
    c = await contexto(b, { javaScriptEnabled: false }); pg = await c.newPage();
    await pg.goto(u, { waitUntil: "networkidle" }); await estado(pg, "sin JavaScript"); await c.close();
    /* 4. Simulación: js/articles.js en caché, anterior a la publicación */
    c = await contexto(b);
    await c.route(/\/js\/articles\.js/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(viejo, "utf8") }));
    pg = await c.newPage(); await pg.goto(u, { waitUntil: "networkidle" });
    await estado(pg, "con articles.js en caché de antes de publicarla");
    await pg.screenshot({ path: `/tmp/out/${slug}-cache-antigua.png` }); await c.close();
    /* 5. Simulación: articles.js no carga (fallo o límite de recursos) */
    c = await contexto(b);
    await c.route(/\/js\/articles\.js/, (r) => r.abort());
    pg = await c.newPage(); await pg.goto(u, { waitUntil: "networkidle" }).catch(() => {});
    await estado(pg, "si articles.js no carga"); await c.close();
  }
  /* 6. Enlaces internos hacia ambas noticias */
  const c = await contexto(b); 
  for (const p of ["/", "/noticias", "/guia?categoria=migracion", "/colaborador-elmy-castillo", "/articulo-rural-vs-urban-healthcare-high-level-review", "/articulo-canada-cambios-express-entry-3-noviembre-2026", "/articulo-canada-33000-residencias-permanentes-trabajadores-2026", "/articulo-plan-dental-canada-cdcp"]) {
    const pg = await c.newPage(); await pg.goto(B + p, { waitUntil: "networkidle" });
    const hrefs = await pg.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter((h) => /canada-cambios-proceso-refugio|salud-rural-urbana/.test(h)));
    const res = [];
    for (const h of [...new Set(hrefs)]) { const r = await fetch(new URL(h, B + p), { redirect: "manual" }); res.push(`${h} → ${r.status}`); }
    log(`  enlaces desde ${p}: ${res.join(" ; ") || "ninguno"}`);
    await pg.close();
  }
  await b.close();
  const sm = await (await fetch(B + "/sitemap.xml")).text();
  for (const s of Object.keys(NOTICIAS)) log(`  sitemap /articulo-${s}: ${sm.includes(`<loc>${B}/articulo-${s}</loc>`) ? "sí" : "NO"}`);
  const rb = await (await fetch(B + "/robots.txt")).text(); log(`  robots.txt bloquea /js/ o /articulo: ${/Disallow: \/(js|articulo)/.test(rb)}`);
  const a = await fetch(B + "/js/articles.js"); log(`  /js/articles.js: ${a.status} cache-control ${a.headers.get("cache-control")} etag ${a.headers.get("etag")}`);
  fs.writeFileSync("/tmp/out/auditoria.txt", out.join("\n"));
})().catch((e) => { console.error(e); fs.writeFileSync("/tmp/out/auditoria.txt", out.join("\n") + "\nERROR " + e.message); process.exit(1); });
