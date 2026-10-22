#!/usr/bin/env node
/* consultar-pistas.mjs — Herramienta temporal de verificación: lista enlaces y
   orígenes de datos de páginas oficiales (no forma parte del sitio). */
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PodcastDelMigrante-verificacion/1.0)" };
const PAGINAS = [
  ["https://www.alberta.ca/demographic-statistics", /population|report|quarter|census|xlsx|pdf/i],
  ["https://economicdashboard.alberta.ca/", /dashboard|gdp|crime|population/i],
  ["https://economicdashboard.alberta.ca/dashboard/unemployment-rate/", /json|api|csv|data|\.js/i],
  ["https://www.alberta.ca/economic-outlook", /gdp|outlook|pdf|xlsx|budget/i],
];
for (const [url, re] of PAGINAS) {
  console.log(`\n=== ${url} ===`);
  try {
    const r = await fetch(url, { headers: UA });
    const html = await r.text();
    console.log(`HTTP ${r.status} · ${html.length} bytes`);
    const refs = [...new Set([...html.matchAll(/(?:href|src|data-url|data-src)="([^"]+)"/gi)].map((m) => m[1].replace(/&amp;/g, "&")))].filter((u) => re.test(u));
    for (const u of refs.slice(0, 80)) console.log("  " + u);
    const sueltos = [...new Set([...html.matchAll(/["'](https?:\/\/[^"']+?(?:\.json|\.csv|\/api\/[^"']*))["']/gi)].map((m) => m[1]))];
    for (const u of sueltos.slice(0, 30)) console.log("  [dato] " + u);
  } catch (e) {
    console.log(`ERROR ${e.message}`);
  }
}
