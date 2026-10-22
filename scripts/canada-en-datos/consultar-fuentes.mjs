#!/usr/bin/env node
/*
  consultar-fuentes.mjs — Consulta directa de fuentes oficiales para «Canadá en Datos»
  ======================================================================
  Herramienta de verificación (no forma parte del sitio). Consulta:
  - la API oficial de Statistics Canada (Web Data Service, WDS): elige cada
    serie por el NOMBRE de sus miembros en los metadatos de la tabla y
    muestra la serie elegida, el período y la fecha de publicación;
  - páginas oficiales de alberta.ca y CMHC (texto, para leer cifras y
    condiciones tal como están publicadas).
  Imprime todo en la salida para que quede registrado y se pueda auditar.

  Uso: node scripts/canada-en-datos/consultar-fuentes.mjs [statcan|paginas|cmhc ...]
*/

const WDS = "https://www150.statcan.gc.ca/t1/wds/rest";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; PodcastDelMigrante-verificacion/1.0)" };

async function post(path, body) {
  const r = await fetch(`${WDS}/${path}`, { method: "POST", headers: { ...UA, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

/* Cada consulta: tabla y, por dimensión, una expresión que debe coincidir con el nombre del miembro. */
const CONSULTAS = [
  { clave: "population", pid: 17100009, n: 2, dims: { Geography: /^Alberta$/ } },
  { clave: "censusPopulation2021", pid: 98100001, n: 1, dims: { Geography: /^Alberta$/, "Population and dwelling counts": /^Population, 2021$/ } },
  { clave: "unemploymentRate", pid: 14100287, n: 2, dims: { Geography: /^Alberta$/, "Labour force characteristics": /^Unemployment rate$/, Gender: /^Total - Gender$/, "Age group": /^15 years and over$/, Statistics: /^Estimate$/, "Data type": /^Seasonally adjusted$/ } },
  { clave: "averageHourlyWage", pid: 14100064, n: 2, dims: { Geography: /^Alberta$/, Wages: /^Average hourly wage rate$/, "Type of work": /^Both full- and part-time employees$/, "North American Industry Classification System (NAICS)": /^Total employees, all industries$/, Gender: /^Total - Gender$/, "Age group": /^15 years and over$/ } },
  { clave: "medianHourlyWage", pid: 14100064, n: 2, dims: { Geography: /^Alberta$/, Wages: /^Median hourly wage rate$/, "Type of work": /^Both full- and part-time employees$/, "North American Industry Classification System (NAICS)": /^Total employees, all industries$/, Gender: /^Total - Gender$/, "Age group": /^15 years and over$/ } },
  { clave: "gdp", pid: 36100222, n: 2, dims: { Geography: /^Alberta$/, Prices: /^Current prices$/, Estimates: /^Gross domestic product at market prices$/ } },
  { clave: "crimeSeverity", pid: 35100026, n: 2, dims: { Geography: /^Alberta/, Statistics: /^Crime severity index$/ } },
];

async function statcan() {
  for (const c of CONSULTAS) {
    console.log(`\n=== ${c.clave} — tabla ${c.pid} ===`);
    try {
      const [meta] = await post("getCubeMetadata", [{ productId: c.pid }]);
      if (meta.status !== "SUCCESS") throw new Error(JSON.stringify(meta).slice(0, 300));
      const m = meta.object;
      console.log(`Título: ${m.cubeTitleEn}`);
      console.log(`Publicación: ${m.releaseTime} · Frecuencia: ${m.frequencyCode} · Período: ${m.cubeStartDate} a ${m.cubeEndDate}`);
      const coord = [];
      const elegidos = [];
      for (const dim of m.dimension) {
        const nombre = dim.dimensionNameEn;
        const re = c.dims[nombre];
        let miembro = re ? dim.member.find((x) => re.test(x.memberNameEn)) : dim.member.find((x) => x.memberId === 1);
        if (!miembro) {
          console.log(`  ¡Sin coincidencia en «${nombre}»! Miembros: ${dim.member.slice(0, 60).map((x) => `${x.memberId}=${x.memberNameEn}`).join(" | ")}`);
          throw new Error(`dimensión ${nombre}`);
        }
        coord.push(miembro.memberId);
        elegidos.push(`${nombre} = ${miembro.memberNameEn}`);
      }
      while (coord.length < 10) coord.push(0);
      console.log(`Serie: ${elegidos.join(" · ")}`);
      const [datos] = await post("getDataFromCubePidCoordAndLatestNPeriods", [{ productId: c.pid, coordinate: coord.join("."), latestN: c.n }]);
      if (datos.status !== "SUCCESS") throw new Error(JSON.stringify(datos).slice(0, 300));
      const o = datos.object;
      console.log(`Vector: v${o.vectorId} · Coordenada: ${o.coordinate}`);
      for (const p of o.vectorDataPoint) {
        console.log(`  ${p.refPer} → ${p.value} (escala ${p.scalarFactorCode}, decimales ${p.decimals}, estado ${p.statusCode}, símbolo ${p.symbolCode}, publicado ${p.releaseTime})`);
      }
      console.log(`RESULTADO ${JSON.stringify({ clave: c.clave, pid: c.pid, vector: o.vectorId, serie: elegidos, puntos: o.vectorDataPoint.map((p) => ({ refPer: p.refPer, value: p.value, scalar: p.scalarFactorCode, released: p.releaseTime })) })}`);
    } catch (e) {
      console.log(`ERROR ${c.clave}: ${e.message}`);
    }
  }
}

function texto(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/li|\/h\d|\/tr|\/div)[^>]*>/gi, "\n")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$").replace(/&rsquo;|&#8217;/g, "'").replace(/&ndash;|&#8211;/g, "–")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

const PAGINAS = [
  "https://www.alberta.ca/minimum-wage",
  "https://www.alberta.ca/aaip-updates",
  "https://www.alberta.ca/alberta-advantage-immigration-program",
  "https://www.alberta.ca/ahcip-moving-to-alberta",
  "https://www.alberta.ca/ahcip-temporary-residents",
  "https://www.alberta.ca/get-id-card",
  "https://www.alberta.ca/alberta-child-and-family-benefit",
  "https://www.alberta.ca/albertas-school-system",
  "https://www.canada.ca/en/employment-social-development/services/sin/temporary-residents.html",
  "https://ircc.canada.ca/english/newcomers/services/index.asp",
];

async function paginas(lista = PAGINAS, max = 9000) {
  for (const url of lista) {
    console.log(`\n=== PÁGINA ${url} ===`);
    try {
      const r = await fetch(url, { headers: UA, redirect: "follow" });
      const html = await r.text();
      const mod = html.match(/(?:Updated|Last updated|Date modified)[^<]{0,60}/i);
      console.log(`HTTP ${r.status} · URL final ${r.url}${mod ? ` · ${mod[0].trim()}` : ""}`);
      const t = texto(html);
      console.log(t.slice(0, max));
      if (t.length > max) console.log(`[… ${t.length - max} caracteres más]`);
    } catch (e) {
      console.log(`ERROR ${url}: ${e.message}`);
    }
  }
}

async function cmhc() {
  const url = "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables";
  console.log(`\n=== CMHC ${url} ===`);
  try {
    const r = await fetch(url, { headers: UA });
    const html = await r.text();
    console.log(`HTTP ${r.status}`);
    const enlaces = [...html.matchAll(/href="([^"]+\.xlsx[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => `${texto(m[2]).replace(/\n/g, " ")} → ${new URL(m[1], url).href}`);
    console.log(enlaces.join("\n") || "(sin enlaces .xlsx)");
    console.log(texto(html).slice(0, 4000));
  } catch (e) {
    console.log(`ERROR CMHC: ${e.message}`);
  }
}

const modos = process.argv.slice(2);
const todos = modos.length === 0;
if (todos || modos.includes("statcan")) await statcan();
if (todos || modos.includes("paginas")) await paginas();
if (todos || modos.includes("cmhc")) await cmhc();
