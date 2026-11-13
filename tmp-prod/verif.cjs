/* TEMPORAL: verificación en producción (computador y celular) de noticias,
   guías, historias, directorio y miniwebs Premium; canónicas; Canadá en
   Datos, Magazine, sitemap y robots.txt intactos. Solo lectura. */
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const B = "https://podcastdelmigrante.com";
const out = []; const fallos = [];
const ok = (m) => { out.push("OK " + m); console.log("OK " + m); };
const mal = (m) => { out.push("FALLO " + m); fallos.push(m); console.log("FALLO " + m); };
const PAGINAS = [
  ["/noticias", "/noticias"],
  ["/articulo-canada-33000-residencias-permanentes-trabajadores-2026", "/articulo-canada-33000-residencias-permanentes-trabajadores-2026"],
  ["/articulo-canada-suplemento-alimentos-679-presupuesto-2026", "/articulo-canada-suplemento-alimentos-679-presupuesto-2026"],
  ["/articulo-salud-rural-urbana-alberta-atencion-medica", "/articulo-salud-rural-urbana-alberta-atencion-medica"],
  ["/guia?categoria=migracion", "/guia?categoria=migracion"],
  ["/guia-ruta?ruta=quiero-venir-canada", "/guia-ruta?ruta=quiero-venir-canada"],
  ["/guia-ruta?subruta=quiero-visitar-canada", "/guia-ruta?subruta=quiero-visitar-canada"],
  ["/historia?slug=desafio-carlos-castillo-proteccion-familiar", "/historia?slug=desafio-carlos-castillo-proteccion-familiar"],
  ["/historia-vida?slug=historia-diana-pineda-radio-canada", "/historia-vida?slug=historia-diana-pineda-radio-canada"],
  ["/quien-puede-ayudarte", "/quien-puede-ayudarte"],
  ["/perfil-santa-latino", "/perfil-santa-latino"],
  ["/perfil-carlos-d-castillo", "/perfil-carlos-d-castillo"],
  ["/perfil-tomas-velazquez", "/perfil-tomas-velazquez"],
  ["/perfil-1juanromero1", "/perfil-1juanromero1"],
  ["/registra-tu-empresa", "/registra-tu-empresa"],
  ["/", "/"],
];
(async () => {
  const b = await chromium.launch();
  for (const [nombre, perfil] of [["computador", { viewport: { width: 1440, height: 900 } }], ["celular", devices["iPhone 13"]]]) {
    const c = await b.newContext({ ...perfil, locale: "es-CA" });
    for (const [p, canon] of PAGINAS) {
      const pg = await c.newPage(); const errores = [];
      pg.on("pageerror", (e) => errores.push(e.message));
      pg.on("response", (r) => r.status() >= 400 && r.url().startsWith(B) && !r.url().includes("/api/") && errores.push(`${r.status()} ${r.url()}`));
      try {
        const r = await pg.goto(B + p, { waitUntil: "networkidle", timeout: 60000 });
        assert.equal(r.status(), 200, "estado");
        const can = await pg.$eval('link[rel="canonical"]', (l) => l.href);
        assert.equal(can, B + canon, "canónica");
        const t = await pg.title(); assert.doesNotMatch(t, /no encontrad/i, "título");
        const [sw, cw] = await pg.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        assert.ok(sw <= cw + 1, `desborde ${sw}>${cw}`);
        const h1 = (await pg.locator("h1").first().innerText().catch(() => "")).trim();
        assert.ok(h1.length > 3, "h1 visible");
        assert.deepEqual(errores, [], "errores");
        if (nombre === "celular") await pg.screenshot({ path: `/tmp/out/${p.replace(/[^a-z0-9]+/gi, "_") || "portada"}-celular.png` });
        ok(`${nombre} ${p}: 200, canónica ${canon}, «${h1.slice(0, 50)}»`);
      } catch (e) { mal(`${nombre} ${p}: ${e.message.split("\n")[0]}`); }
      await pg.close();
    }
    await c.close();
  }
  await b.close();

  /* Intactos: producción == archivos del repositorio en main */
  const sha = (x) => crypto.createHash("sha256").update(x).digest("hex");
  const limpiar = (h) => h.replace(/<script[^>]*cdn-cgi[\s\S]*?<\/script>/g, "").replace(/<script[^>]*beacon\.min\.js[\s\S]*?<\/script>/g, "");
  const MUESTRA = [
    ["/robots.txt", "robots.txt"], ["/sitemap.xml", "sitemap.xml"],
    ["/canada-en-datos/", "canada-en-datos/index.html"], ["/canada-en-datos/alberta", "canada-en-datos/alberta.html"],
    ["/canada-en-datos/alberta/brooks", "canada-en-datos/alberta/brooks.html"], ["/canada-en-datos/northwest-territories/north-slave-zona-no-organizada", "canada-en-datos/northwest-territories/north-slave-zona-no-organizada.html"],
    ["/canada-en-datos/quebec/montreal", "canada-en-datos/quebec/montreal.html"], ["/canada-en-datos/ontario/markham", "canada-en-datos/ontario/markham.html"],
    ["/magazine/", "magazine/index.html"], ["/magazine/2026-10/", "magazine/2026-10/index.html"], ["/magazine/ediciones/", "magazine/ediciones/index.html"],
    ["/js/articles.js", "js/articles.js"], ["/js/businesses.js", "js/businesses.js"], ["/js/canada-datos.js", "js/canada-datos.js"],
  ];
  for (const [u, f] of MUESTRA) {
    const r = await fetch(B + u); const prod = await r.text(); const repo = fs.readFileSync(f, "utf8");
    if (r.status === 200 && (prod === repo || limpiar(prod) === limpiar(repo))) ok(`intacto ${u}: idéntico a ${f} (${sha(repo).slice(0, 12)})`);
    else mal(`${u}: ${r.status}, difiere de ${f}`);
  }
  const ni = (await (await fetch(B + "/canada-en-datos/northwest-territories/north-slave-zona-no-organizada")).text()).includes('<meta name="robots" content="noindex">');
  ni ? ok("Canadá en Datos: página básica conserva noindex") : mal("noindex ausente");
  const xr = (await fetch(B + "/canada-en-datos/alberta")).headers.get("x-robots-tag");
  xr ? mal("X-Robots-Tag inesperado: " + xr) : ok("sin X-Robots-Tag en Canadá en Datos");
  fs.writeFileSync("/tmp/out/verif.txt", out.join("\n"));
  if (fallos.length) process.exit(1);
})().catch((e) => { console.error(e); fs.writeFileSync("/tmp/out/verif.txt", out.join("\n") + "\nERROR " + e.message); process.exit(1); });
