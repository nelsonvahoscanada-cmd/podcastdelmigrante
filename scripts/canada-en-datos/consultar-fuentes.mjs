#!/usr/bin/env node
/*
  consultar-fuentes.mjs — Verificación de páginas oficiales para «Canadá en Datos»
  ======================================================================
  Herramienta de verificación (no forma parte del sitio).
  - paginas: descarga páginas oficiales (alberta.ca, canada.ca, IRCC…) e
    imprime solo las líneas que coinciden con lo que hay que verificar
    (cifras, plazos, requisitos), con la fecha de actualización publicada.
  - enlaces: comprueba la respuesta HTTP de todos los enlaces de
    js/canada-datos.js y de los enlaces candidatos.
  - cmhc: lista las descargas de las tablas del Rental Market Survey.
  Las cifras de Statistics Canada se consultan con consultar-statcan.py.

  Uso: node scripts/canada-en-datos/consultar-fuentes.mjs [paginas|enlaces|cmhc ...]
*/
import { readFileSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PodcastDelMigrante-verificacion/1.0)", "Accept-Language": "en-CA,en;q=0.9" };

function texto(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<(br|\/p|\/li|\/h\d|\/tr|\/div|\/dt|\/dd)[^>]*>/gi, "\n")
    .replace(/<t[dh][^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$").replace(/&rsquo;|&#8217;/g, "'").replace(/&ndash;|&#8211;/g, "–").replace(/&mdash;|&#8212;/g, "—")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/* url, expresión de las líneas que interesan, máximo de líneas */
const PAGINAS = [
  ["https://www.alberta.ca/minimum-wage", /minimum wage|\$\s?\d|effective|per hour/i, 40],
  ["https://www.alberta.ca/aaip-updates", /nominat|allocation|2026|expression/i, 45],
  ["https://www.alberta.ca/alberta-advantage-immigration-program", /nominat|stream|pathway|permanent|fee|IRCC|representative|fraud/i, 40],
  ["https://www.alberta.ca/ahcip-moving-to-alberta", /month|eligib|coverage|register|residen|apply|document/i, 40],
  ["https://www.alberta.ca/ahcip-temporary-residents", /permit|eligib|month|coverage|visitor|student|worker|document|12/i, 45],
  ["https://www.alberta.ca/get-id-card", /citizen|lawful|resid|\$|fee|registry|valid/i, 30],
  ["https://www.alberta.ca/alberta-child-and-family-benefit", /\$|eligib|tax|automatic|CRA|resident|instal/i, 45],
  ["https://www.alberta.ca/albertas-school-system", /register|enrol|school board|age|kindergarten|grade|free|tuition|francophone/i, 30],
  ["https://www.alberta.ca/common-problems-landlords-and-tenants", /deposit|rent|scam|fraud|notice|RTDRS|lease/i, 30],
  ["https://www.alberta.ca/employment-standards", /minimum|overtime|vacation|holiday|pay|rights|complaint/i, 30],
  ["https://www.canada.ca/en/employment-social-development/services/sin/temporary-residents.html", /expire|9|apply|document|free|permit/i, 30],
  ["https://www.canada.ca/en/employment-social-development/services/sin.html", /apply|online|mail|person|free|third/i, 20],
  ["https://ircc.canada.ca/english/newcomers/services/index.asp", /eligib|temporary|permanent|April|limit|Quebec|province/i, 30],
  ["https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud.html", /fraud|scam|pay|representative|guarantee|job/i, 30],
  ["https://www.antifraudcentre-centrefraudeantifraude.ca/index-eng.htm", /report|fraud|scam|call|1-888/i, 20],
  ["https://economicdashboard.alberta.ca/", /industr|energy|GDP|employment|sector/i, 20],
];

const CANDIDATOS = [
  "https://www.alberta.ca/employment-standards",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/protect-fraud.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative.html",
  "https://www.antifraudcentre-centrefraudeantifraude.ca/index-eng.htm",
  "https://www.alberta.ca/post-secondary-institutions",
  "https://www.alberta.ca/apprenticeship-and-industry-training",
  "https://tradesecrets.alberta.ca/",
  "https://www.alberta.ca/foreign-qualification-recognition",
  "https://www.alberta.ca/language-training-programs",
  "https://www.alberta.ca/settlement-and-integration",
  "https://www.alberta.ca/occupational-health-and-safety",
  "https://www.canada.ca/en/financial-consumer-agency/services/banking/opening-bank-account.html",
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/new-life-canada/find-job.html",
  "https://www.alberta.ca/residential-tenancy-dispute-resolution-service",
  "https://www.alberta.ca/tenancies-act-overview",
  "https://www.alberta.ca/k-to-12-education",
  "https://www.alberta.ca/alberta-supports",
  "https://www.alberta.ca/income-support",
  "https://www.alberta.ca/alberta-adult-health-benefit",
  "https://www.alberta.ca/child-care-subsidy",
  "https://www.alberta.ca/alberta-child-health-benefit",
];

async function paginas() {
  for (const [url, re, max] of PAGINAS) {
    console.log(`\n=== PÁGINA ${url} ===`);
    try {
      const r = await fetch(url, { headers: UA, redirect: "follow" });
      const html = await r.text();
      const mod = html.match(/(?:Updated|Last updated|Date modified|dateModified)[^<\n]{0,60}/i);
      console.log(`HTTP ${r.status} · ${r.url}${mod ? ` · ${mod[0].replace(/\s+/g, " ").trim()}` : ""}`);
      const lineas = texto(html);
      const titulo = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
      if (titulo) console.log(`Título: ${titulo.trim()}`);
      const elegidas = lineas.filter((l) => re.test(l) && l.length > 12).slice(0, max);
      for (const l of elegidas) console.log("  · " + l.slice(0, 400));
    } catch (e) {
      console.log(`ERROR ${url}: ${e.message}`);
    }
  }
}

async function enlaces() {
  const datos = readFileSync(new URL("../../js/canada-datos.js", import.meta.url), "utf8");
  const urls = [...new Set([...datos.matchAll(/https:\/\/[^"'\s]+/g)].map((m) => m[0]))];
  console.log(`\n=== ENLACES (${urls.length} del módulo + ${CANDIDATOS.length} candidatos) ===`);
  for (const url of [...urls, ...CANDIDATOS]) {
    try {
      let r = await fetch(url, { method: "GET", headers: UA, redirect: "follow" });
      const titulo = ((await r.text()).match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
      console.log(`${r.status} ${url}${r.url !== url ? ` → ${r.url}` : ""} · ${titulo.replace(/\s+/g, " ").trim().slice(0, 90)}`);
    } catch (e) {
      console.log(`ERR ${url}: ${e.message}`);
    }
  }
}

async function cmhc() {
  const url = "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables";
  console.log(`\n=== CMHC ${url} ===`);
  try {
    const html = await (await fetch(url, { headers: UA })).text();
    const refs = [...new Set([...html.matchAll(/(?:href|data-[a-z-]+)="([^"]*(?:xlsx|xls|csv|assets\.cmhc|\/sites\/cmhc\/)[^"]*)"/gi)].map((m) => new URL(m[1].replace(/&amp;/g, "&"), url).href))];
    console.log(refs.join("\n") || "(sin descargas en el HTML)");
  } catch (e) {
    console.log(`ERROR CMHC: ${e.message}`);
  }
}

const modos = process.argv.slice(2);
if (!modos.length || modos.includes("paginas")) await paginas();
if (!modos.length || modos.includes("enlaces")) await enlaces();
if (!modos.length || modos.includes("cmhc")) await cmhc();
