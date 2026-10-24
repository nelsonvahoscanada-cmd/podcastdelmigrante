#!/usr/bin/env node
/*
  consultar-ontario.mjs — Verificación de páginas oficiales de Ontario para «Canadá en Datos»
  ======================================================================
  Herramienta de verificación (no forma parte del sitio). Misma idea que
  consultar-fuentes.mjs (Alberta):
  - paginas: descarga páginas oficiales (ontario.ca, canada.ca, IRCC,
    Job Bank, municipios…) e imprime solo las líneas que coinciden con lo
    que hay que verificar, la fecha de actualización publicada y, si se
    indica, los enlaces de la página que coinciden con un patrón (para
    encontrar la dirección exacta de una página oficial).
  - enlaces: comprueba la respuesta HTTP de todos los enlaces de Ontario
    en js/canada-datos.js.
  Las tablas de Statistics Canada y CMHC se consultan con
  consultar-ontario.py.

  Uso: node scripts/canada-en-datos/consultar-ontario.mjs [paginas|ronda2|enlaces] [filtro]
*/
import { readFileSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PodcastDelMigrante-verificacion/1.0)", "Accept-Language": "en-CA,en;q=0.9" };

function texto(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<(br|\/p|\/li|\/h\d|\/tr|\/div|\/dt|\/dd)[^>]*>/gi, "\n")
    .replace(/<t[dh][^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$").replace(/&rsquo;|&#8217;|&#39;/g, "'").replace(/&ndash;|&#8211;/g, "–").replace(/&mdash;|&#8212;/g, "—").replace(/&quot;/g, '"')
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/* [url, expresión de las líneas que interesan, máximo de líneas, expresión de enlaces a listar (opcional)] */
export const PAGINAS = [
  /* Información general */
  ["https://www.ontario.ca/page/about-ontario", /square kilomet|km|population|capital|largest|lakes|border|language|French|province/i, 40, /ontario\.ca\/page\/(about|ontario-fact|demograph|population)/i],
  ["https://www.ontario.ca/page/ontario-demographic-quarterly", /population|July|October|2026|grew|increase|non-permanent|immigra/i, 40, /demographic-quarterly/i],
  ["https://www.ontario.ca/page/ontario-fact-sheet", /population|GDP|employment|unemployment|%|\$|billion|2025|2026|sector|manufactur|financ/i, 50, /fact-sheet|economic/i],
  ["https://www.ontario.ca/laws/statute/90t09", /standard time|daylight|90th|meridian|eastern|central|hour/i, 30],
  ["https://www.ontario.ca/page/french-language-services", /French|francophone|services|designated|region|act/i, 25],
  /* Inmigración */
  ["https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp", /stream|nominat|Express Entry|invitation|expression|employer|job offer|paus|clos|open|2026|allocation|fee|\$/i, 60, /oinp|nominee|immigra/i],
  ["https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates", /2026|stream|draw|invitation|nominat|allocation|paus|chang|new|clos/i, 60, /oinp|nominee|updates/i],
  ["https://www.ontario.ca/page/oinp-employer-job-offer-foreign-worker-stream", /job offer|full-time|permanent|wage|NOC|TEER|experience|eligib|paus/i, 30],
  ["https://www.ontario.ca/page/oinp-express-entry-human-capital-priorities-stream", /Express Entry|CRS|notification|interest|eligib|paus|NOC|TEER/i, 30],
  ["https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html", /Express Entry|program|Federal Skilled|Canadian Experience|Trades|provincial|invitation|profile/i, 25],
  ["https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html", /nominat|province|Express Entry|paper|apply|Quebec/i, 25],
  ["https://www.ontario.ca/page/work-your-profession-or-trade-ontario", /regulat|licen|credential|bridg|assess|profession|trade|certif/i, 30, /bridg|credential|regulat|fairness|professional/i],
  ["https://www.fairnesscommissioner.ca/", /regulat|profession|fair|registration|credential/i, 15],
  ["https://www.ontario.ca/page/newcomer-services", /settle|newcomer|language|ESL|FSL|service|free|employ/i, 25, /newcomer|settle|language|bridg/i],
  ["https://211ontario.ca/", /211|free|confidential|community|social|services|24/i, 15],
  /* Empleo */
  ["https://www.ontario.ca/document/your-guide-employment-standards-act-0/minimum-wage", /\$\d|minimum wage|effective|October|student|homeworker|guide|per hour|per day/i, 40],
  ["https://www.ontario.ca/page/minimum-wage-ontario", /\$\d|minimum wage|effective|October|2026|increase|announce/i, 30],
  ["https://www.jobbank.gc.ca/trend-analysis/job-market-reports/ontario/environmental-scan", /unemployment|%|\$|wage|employment|sector|manufactur|health|construction|financ|technolog|2025|2026|immigra|population/i, 60],
  ["https://www.ontario.ca/page/employment-ontario", /job|training|apprentice|free|employment|service|Better Jobs|Second Career/i, 25, /employment-ontario|apprentice|skilled|job/i],
  ["https://www.skilledtradesontario.ca/", /trade|apprentice|certif|compulsory|voluntary|exam|registration/i, 25],
  ["https://www.ontario.ca/document/your-guide-employment-standards-act-0", /overtime|44|vacation|public holiday|termination|rest|break|hours|complaint|rights/i, 35],
  ["https://www.ontario.ca/page/starting-business-ontario", /business|register|licen|permit|tax|HST|small business|centre|ServiceOntario/i, 25, /business|enterprise/i],
  /* Vivienda */
  ["https://www.ontario.ca/page/renting-ontario-your-rights", /deposit|last month|key|rent increase|guideline|standard lease|Landlord and Tenant Board|notice|12 months|90 days|discriminat|maintenance/i, 50],
  ["https://www.ontario.ca/page/residential-rent-increase-guideline", /guideline|2026|2027|%|percent|exempt|November 15, 2018|occupied/i, 30],
  ["https://www.ontario.ca/page/guide-ontarios-standard-lease", /standard lease|written|tenancy|21 days|landlord|tenant|form/i, 20],
  ["https://tribunalsontario.ca/ltb/", /landlord|tenant|application|board|dispute|eviction/i, 15],
  /* Salud */
  ["https://www.ontario.ca/page/apply-ohip-and-get-health-card", /eligib|permanent|work permit|student|citizen|wait|3 months|three|153|212|document|ServiceOntario|physically present|6 months/i, 50],
  ["https://www.ontario.ca/page/what-ohip-covers", /cover|doctor|hospital|eye|dental|prescription|physio|not covered|ambulance/i, 30],
  ["https://health811.ontario.ca/", /811|free|nurse|24|health|advice|French/i, 15],
  ["https://www.ontario.ca/page/find-family-doctor-or-nurse-practitioner", /Health Care Connect|family doctor|register|wait|nurse/i, 20],
  /* Educación */
  ["https://www.ontario.ca/page/education-ontario", /school|kindergarten|grade|age|board|French|Catholic|free|publicly funded|enrol|register/i, 35, /school|education|enrol|french/i],
  ["https://www.ontario.ca/page/going-college-or-university", /college|university|OSAP|apply|public|program|apprentice/i, 25, /college|university|osap|international/i],
  ["https://www.ontario.ca/page/osap-ontario-student-assistance-program", /eligib|citizen|permanent|protected|grant|loan|international/i, 25],
  ["https://www.ontario.ca/page/study-ontario-international-students", /international|study permit|attestation|cap|college|university|work/i, 30, /international|study/i],
  /* Licencias */
  ["https://www.ontario.ca/page/get-g-drivers-licence-new-drivers", /G1|G2|G\b|road test|knowledge test|12 months|age|16|DriveTest/i, 30],
  ["https://www.ontario.ca/page/exchange-foreign-drivers-licence", /60 days|exchange|reciprocal|country|experience|letter of authentication|road test|knowledge/i, 35, /foreign|exchange|licence/i],
  /* Familia */
  ["https://www.ontario.ca/page/ontario-child-benefit", /\$\d|per child|maximum|July|2026|eligib|income|Canada Child Benefit|automatic|tax return/i, 35],
  ["https://www.ontario.ca/page/find-and-pay-child-care", /\$|child care|\$10|fee|licensed|subsid|CWELCC|reduction/i, 30, /child-care/i],
  ["https://www.ontario.ca/page/ontario-trillium-benefit", /\$|eligib|monthly|tax return|energy|property|sales/i, 25],
  /* Seguridad */
  ["https://www.ontario.ca/page/ontario-alert-system", /alert|emergency|Alert Ready|wireless|broadcast/i, 15],
  /* Ciudades */
  ["https://www.toronto.ca/business-economy/", /econom|sector|financ|technolog|film|life sciences|manufactur|tourism|business/i, 25, /business-economy|industry|sector/i],
  ["https://investottawa.ca/", /sector|technolog|government|life sciences|defence|aerospace|cleantech|innovation/i, 20],
  ["https://www.hamilton.ca/build-invest-grow", /sector|manufactur|steel|health|agri|food|life sciences|port|logistics|goods movement/i, 25, /invest|economic|sector/i],
  ["https://www.ledc.com/", /sector|manufactur|health|food|technolog|digital|automotive|insurance/i, 20],
  ["https://www.waterlooedc.ca/", /sector|technolog|manufactur|automotive|insurance|financ|innovation|universit/i, 20],
  ["https://www.mississauga.ca/business-and-economic-development/", /sector|life sciences|financ|aerospace|manufactur|technolog|head office|airport/i, 25, /economic|sector|business/i],
  ["https://www.brampton.ca/EN/Business/Economic-Development/Pages/Welcome.aspx", /sector|manufactur|logistics|food|technolog|health|innovation|advanced/i, 25, /economic|sector|business/i],
  ["https://www.choosewindsoressex.com/", /sector|automotive|manufactur|agri|logistics|border|Detroit|bridge|tourism/i, 20],
];


/* Segunda ronda: direcciones corregidas y fuentes complementarias */
export const RONDA2 = [
  ["https://www.ontario.ca/page/ontario-workforce-priority-stream", /TEER|job offer|experience|language|CLB|NCLC|education|wage|median|employer|revenue|rural|expression|invitation|Express Entry|physician|fee|\$|full-time|permanent/i, 70],
  ["https://www.ontario.ca/page/regional-economic-development-through-immigration-redi-initiative", /REDI|communit|2027|nomination|partner|job offer/i, 25],
  ["https://www.ontario.ca/page/residential-rent-increases", /guideline|2027|2026|2025|%|exempt|November 15, 2018|90 days|12 months|above/i, 40],
  ["https://tribunalsontario.ca/documents/ltb/Brochures/Information%20for%20New%20Tenants.html", /deposit|last month|key|interest|damage|receipt|lease/i, 30],
  ["https://tribunalsontario.ca/documents/ltb/Brochures/A%20Guide%20to%20the%20Residential%20Tenancies%20Act.html", /deposit|last month|key|interest|damage|receipt|security/i, 30],
  ["https://www.ontario.ca/page/exchange-out-province-drivers-licence", /60 days|exchange|agreement|country|experience|12 months|authentication|road test|knowledge|translat|G1|G2/i, 45, /drivetest|exchange|licence/i],
  ["https://www.drivetest.ca/licences/licence-exchanges/licence_exchange.html", /60 days|exchange|agreement|country|experience|12 months|authentication|road test|July 1, 2026/i, 40],
  ["https://www.ontario.ca/page/newcomers", /settle|language|bridg|English|French|free|Global Experience|program|newcomer/i, 30, /newcomer|settle|language|bridg|global-experience|regulated/i],
  ["https://www.ontario.ca/page/ontarios-population-labour-market-economy-and-trade-fact-sheet", /./, 120],
  ["https://data.iana.org/time-zones/tzdb/northamerica", /Ontario|Atikokan|Thunder Bay|Rainy River|Kenora|Nipigon|Toronto|Winnipeg.*Ontario|90° ?W|Pickle Lake|Coral Harbour/i, 40],
  ["https://www.alertready.ca/", /alert|emergency|wireless|television|radio|province/i, 15],
  ["https://www.ontario.ca/page/canada-ontario-early-years-and-child-care-agreement", /\$|per day|fee|2025|2026|average|reduc|cap|licensed/i, 30],
  ["https://www.ontario.ca/page/ontario-works", /financial|eligib|apply|employment|help|income/i, 15],
  ["https://www.ontario.ca/page/business-and-economy", /business|register|start|small|centre|tax|licen/i, 25, /small-business|enterprise|start|register|business-registry/i],
  ["https://www.ontario.ca/page/skilled-trades", /trade|apprentice|compulsory|certif|wage|Skilled Trades Ontario/i, 25],
  ["https://www.ontario.ca/page/apprenticeship-ontario", /apprentice|sponsor|employer|classroom|in-school|certif|exam|grant/i, 25],
  ["https://www.ontario.ca/page/better-jobs-ontario", /\$|28,000|tuition|eligib|laid off|training|living/i, 20],
  ["https://www.ontario.ca/page/your-childs-education-parent-guide-our-school-system", /school board|public|Catholic|French|English|age|kindergarten|free|grade|register|enrol|4 |6 /i, 35],
  ["https://www.ontario.ca/page/french-second-language-programs", /French|immersion|core|extended/i, 12],
  /* Ciudades: sectores y sitios oficiales */
  ["https://www.toronto.ca/business-economy/industry-sector-support/", /sector|financ|technolog|film|life sciences|manufactur|tourism|food|fashion|music|creative/i, 30],
  ["https://investinhamilton.ca/", /sector|manufactur|agri|food|life sciences|health|goods movement|logistics|creative|technology|port|steel/i, 25, /sector|industr/i],
  ["https://www.ledc.com/", /sector|manufactur|health|food|technolog|digital|automotive|insurance|life sciences/i, 25, /sector|industr|manufactur|tech|health/i],
  ["https://www.waterlooedc.ca/", /sector|technolog|manufactur|automotive|insurance|financ|innovation|universit|cleantech|health/i, 25, /sector|industr|technolog|manufactur/i],
  ["https://www.mississauga.ca/services-and-programs/business/", /sector|life sciences|financ|aerospace|manufactur|technolog|logistics|Invest Mississauga|Economic Development/i, 25, /invest|economic|sector/i],
  ["https://investbrampton.ca/", /sector|manufactur|food|technolog|health|life sciences|innovation|logistics|defence|space/i, 25, /sector|industr/i],
  ["https://www.investottawa.ca/", /sector|technolog|government|life sciences|defence|aerospace|cleantech|telecom|software|cyber/i, 25, /sector|industr/i],
  ["https://www.investwindsoressex.com/", /sector|automotive|manufactur|agri|logistics|border|Detroit|bridge|tourism|EV|battery/i, 25, /sector|industr/i],
  ["https://www.mississauga.ca/services-and-programs/business/economic-development-division/", /sector|life sciences|financ|aerospace|manufactur|technolog|logistics|ICT|head office|airport/i, 25, /invest|sector/i],
  ["https://www.toronto.ca/", /City of Toronto/i, 3],
  ["https://ottawa.ca/en", /City of Ottawa/i, 3],
  ["https://www.hamilton.ca/", /City of Hamilton/i, 3],
  ["https://london.ca/", /City of London/i, 3],
  ["https://www.kitchener.ca/", /City of Kitchener/i, 3],
  ["https://www.waterloo.ca/", /City of Waterloo/i, 3],
  ["https://www.mississauga.ca/", /City of Mississauga/i, 3],
  ["https://www.brampton.ca/", /City of Brampton|Brampton/i, 3],
  ["https://www.citywindsor.ca/", /City of Windsor|Windsor/i, 3],
];

async function paginas(filtro, lista = PAGINAS) {
  for (const [url, re, max, reEnlaces] of lista) {
    if (filtro && !url.includes(filtro)) continue;
    console.log(`\n=== PÁGINA ${url} ===`);
    try {
      const r = await fetch(url, { headers: UA, redirect: "follow" });
      const html = await r.text();
      const mod = html.match(/(?:Updated|Last updated|Date modified|dateModified|Published)[^<\n]{0,60}/i);
      console.log(`HTTP ${r.status} · ${r.url}${mod ? ` · ${mod[0].replace(/\s+/g, " ").trim()}` : ""}`);
      const titulo = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
      if (titulo) console.log(`Título: ${titulo.replace(/\s+/g, " ").trim()}`);
      for (const l of texto(html).filter((l) => re.test(l) && l.length > 12).slice(0, max)) console.log("  · " + l.slice(0, 450));
      if (reEnlaces) {
        const vistos = new Set();
        for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
          const href = new URL(m[1].replace(/&amp;/g, "&"), r.url).href;
          const txt = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if ((reEnlaces.test(href) || reEnlaces.test(txt)) && !vistos.has(href)) {
            vistos.add(href);
            if (vistos.size <= 25) console.log(`  → ${txt.slice(0, 90)} | ${href}`);
          }
        }
      }
    } catch (e) {
      console.log(`ERROR ${url}: ${e.message}`);
    }
  }
}

async function enlaces() {
  const datos = readFileSync(new URL("../../js/canada-datos.js", import.meta.url), "utf8");
  const ini = datos.indexOf("  ontario: {");
  const urls = [...new Set([...datos.slice(ini > 0 ? ini : 0).matchAll(/https:\/\/[^"'\s]+/g)].map((m) => m[0]))];
  console.log(`\n=== ENLACES DE ONTARIO (${urls.length}) ===`);
  for (const url of urls) {
    try {
      const r = await fetch(url, { method: "GET", headers: UA, redirect: "follow" });
      const titulo = ((await r.text()).match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
      console.log(`${r.status} ${url}${r.url !== url ? ` → ${r.url}` : ""} · ${titulo.replace(/\s+/g, " ").trim().slice(0, 90)}`);
    } catch (e) {
      console.log(`ERR ${url}: ${e.message}`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith("consultar-ontario.mjs")) {
  const [modo = "paginas", filtro] = process.argv.slice(2);
  if (modo === "paginas") await paginas(filtro);
  if (modo === "ronda2") await paginas(filtro, RONDA2);
  if (modo === "enlaces") await enlaces();
}
