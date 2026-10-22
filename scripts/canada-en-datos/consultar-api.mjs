#!/usr/bin/env node
/* consultar-api.mjs — Herramienta temporal de verificación (no forma parte del sitio).
   Consulta la API de datos económicos del Gobierno de Alberta
   (api.economicdata.alberta.ca, que republica tablas de Statistics Canada)
   y el catálogo de datos abiertos de Alberta (open.alberta.ca). */
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PodcastDelMigrante-verificacion/1.0)" };
const get = async (u) => { const r = await fetch(u, { headers: UA }); return { status: r.status, text: await r.text(), url: r.url }; };

async function api(url, n = 4) {
  console.log(`\n--- API ${url}`);
  try {
    const { status, text } = await get(url);
    let datos;
    try { datos = JSON.parse(text); } catch { console.log(`HTTP ${status} (no JSON): ${text.slice(0, 200)}`); return; }
    const filas = Array.isArray(datos) ? datos : datos.data || datos.records || datos.value || [];
    console.log(`HTTP ${status} · ${filas.length} filas · claves: ${filas[0] ? Object.keys(filas[0]).join(", ") : "(vacío)"}`);
    const clavesFecha = filas[0] ? Object.keys(filas[0]).filter((k) => /date|ref|period|year|time/i.test(k)) : [];
    const orden = clavesFecha.length ? [...filas].sort((a, b) => String(a[clavesFecha[0]]).localeCompare(String(b[clavesFecha[0]]))) : filas;
    for (const f of orden.slice(-n)) console.log("  " + JSON.stringify(f));
  } catch (e) { console.log(`ERROR ${e.message}`); }
}

async function descubrir(pagina) {
  console.log(`\n=== Página ${pagina}`);
  const { status, text } = await get(pagina);
  console.log(`HTTP ${status}`);
  const urls = [...new Set([...text.matchAll(/https:\/\/api\.economicdata\.alberta\.ca\/data\?[^"'<\s]+/g)].map((m) => m[0].replace(/&amp;/g, "&")))];
  const enlaces = [...new Set([...text.matchAll(/href="(\/(?:dashboard|topics)\/[^"#?]+)"/g)].map((m) => m[1]))];
  if (enlaces.length) console.log("  Enlaces: " + enlaces.join(" "));
  return urls;
}

async function ckan(id) {
  const url = `https://open.alberta.ca/api/3/action/package_show?id=${id}`;
  console.log(`\n=== CKAN ${url}`);
  try {
    const { status, text } = await get(url);
    const j = JSON.parse(text);
    const p = j.result;
    console.log(`HTTP ${status} · ${p.title} · modificado ${p.metadata_modified}`);
    for (const r of p.resources || []) console.log(`  recurso: ${r.name} · ${r.format} · ${r.last_modified || r.created} · ${r.url}`);
    return p.resources || [];
  } catch (e) { console.log(`ERROR ${e.message}`); return []; }
}

// 1) Desempleo mensual (tabla 14-10-0287 de Statistics Canada, vía el Gobierno de Alberta)
await api("https://api.economicdata.alberta.ca/data?table=UnemploymentRates_14100287&characteristic=unemployment%20rate&geoname=alberta&sex=both%20sexes&age=15%20years%20and%20over", 6);
// 2) Descubrir las consultas del PIB, población, salarios y delitos en el tablero
const paginas = ["https://economicdashboard.alberta.ca/topics/gdp/", "https://economicdashboard.alberta.ca/dashboard/", "https://economicdashboard.alberta.ca/dashboard/average-weekly-earnings/"];
const vistas = new Set();
for (const p of paginas) for (const u of await descubrir(p)) vistas.add(u);
const extra = new Set();
for (const p of ["https://economicdashboard.alberta.ca/dashboard/population/", "https://economicdashboard.alberta.ca/dashboard/gdp/", "https://economicdashboard.alberta.ca/dashboard/real-gdp/", "https://economicdashboard.alberta.ca/dashboard/gross-domestic-product-gdp/", "https://economicdashboard.alberta.ca/dashboard/population-growth/", "https://economicdashboard.alberta.ca/dashboard/crime-severity-index/", "https://economicdashboard.alberta.ca/dashboard/rental-vacancy-rates/"]) {
  try { for (const u of await descubrir(p)) extra.add(u); } catch (e) { console.log(e.message); }
}
for (const u of [...vistas, ...extra].filter((u) => /gdp|popul|crime|earn|wage|vacan|rent/i.test(u)).slice(0, 14)) await api(u, 4);
// 3) Estimaciones de población del Gobierno de Alberta (datos abiertos)
await ckan("alberta-population-estimates-data-tables");
await ckan("quarterly-population-report");
