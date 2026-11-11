/*
  Directorio Empresarial — visibilidad para buscadores (Fase 1)
  - Cada miniweb publicada trae su contenido esencial en el HTML inicial
    (sin JavaScript) y sus datos estructurados (JSON-LD) válidos.
  - URL canónicas limpias (/perfil-<slug>, /quien-puede-ayudarte).
  - El directorio trae nombres, categorías y enlaces en el HTML.
  - sitemap.xml: directorio y miniwebs publicadas, con fechas reales; sin
    borradores, fichas gratuitas sin página ni duplicados.
  - Nada privado: solo datos del registro público js/businesses.js.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const SITE = "https://podcastdelmigrante.com";
const read = (p) => readFileSync(join(ROOT, p), "utf8");

function runtime(root = ROOT) {
  const ctx = vm.createContext({ document: { addEventListener() {} }, console });
  ctx.window = ctx;
  for (const f of ["js/businesses.js", "js/video-cover.js", "js/business-profile.js", "js/business-directory.js"]) vm.runInContext(readFileSync(join(root, f), "utf8"), ctx);
  vm.runInContext("globalThis.__B = BUSINESSES; globalThis.__C = BUSINESS_CATEGORIES;", ctx);
  return ctx;
}
const RT = runtime();
const ALL = JSON.parse(JSON.stringify(RT.__B)).filter((b) => b.published);
const PREMIUM = ALL.filter((b) => b.plan !== "gratuito");
const CATEGORY = Object.fromEntries(RT.__C.map((c) => [c.id, c.label]));

/* Texto visible sin JavaScript: sin <script>, sin etiquetas, entidades básicas */
const sinJs = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
const main = (html) => html.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
const jsonLd = (html, id) => {
  const m = html.match(new RegExp(`<script type="application/ld\\+json" id="${id}">([\\s\\S]*?)</script>`));
  assert.ok(m, `falta el JSON-LD ${id}`);
  return JSON.parse(m[1]);
};

test("hay cuatro miniwebs Premium publicadas, cada una con su página", () => {
  assert.deepEqual(PREMIUM.map((b) => b.slug), ["tomas-velazquez", "carlos-d-castillo", "santa-latino", "1juanromero1"]);
  for (const b of PREMIUM) assert.ok(existsSync(join(ROOT, `perfil-${b.slug}.html`)), b.slug);
});

test("HTML sin JavaScript: nombre, descripción, ciudad, servicios y contactos de cada miniweb", () => {
  for (const b of PREMIUM) {
    const html = read(`perfil-${b.slug}.html`);
    const t = sinJs(main(html));
    assert.doesNotMatch(t, /Cargando perfil/, b.slug);
    assert.match(html, new RegExp(`id="bizRoot" data-prerendered="${b.slug}"`), b.slug);
    assert.equal((main(html).match(/<h1 class="biz-name">/g) || []).length, 1, `${b.slug}: un solo h1`);
    assert.ok(t.includes(b.name), `${b.slug}: nombre`);
    assert.ok(t.includes(`${b.city}, ${b.province}`), `${b.slug}: ciudad y provincia`);
    /* Descripción: la llamada a la acción o la descripción larga, tal como las muestra el perfil */
    const desc = [].concat(b.longDescription || []).filter(Boolean)[0] || (b.callToAction && b.callToAction.text);
    assert.ok(desc && t.includes(desc), `${b.slug}: descripción`);
    for (const s of (b.services || []).filter((x) => x.active)) assert.ok(t.includes(s.label), `${b.slug}: servicio ${s.label}`);
    for (const g of b.serviceGroups || []) for (const i of g.items) assert.ok(t.includes(i), `${b.slug}: servicio ${i}`);
    /* Los servicios inactivos no se publican */
    for (const s of (b.services || []).filter((x) => !x.active)) assert.ok(!t.includes(s.label) || [b.callToAction?.text, ...[].concat(b.longDescription || [])].some((x) => x && x.includes(s.label)), `${b.slug}: servicio inactivo ${s.label}`);
    if (b.phone) assert.match(main(html), new RegExp(`href="tel:${b.phone.replace(/[^\d+]/g, "").replace("+", "\\+")}"`), `${b.slug}: teléfono`);
    if (b.email) assert.ok(main(html).includes(`href="mailto:${b.email}"`), `${b.slug}: correo`);
    /* El contenido es exactamente el que dibuja el navegador (mismo diseño, sin duplicados) */
    assert.ok(html.includes(`data-prerendered="${b.slug}">${RT.PDMBizProfile.contentHtml(RT.__B.find((x) => x.id === b.id))}</div>`), `${b.slug}: igual al de js/business-profile.js`);
  }
});

test("URL canónicas limpias: canonical, og:url y JSON-LD coinciden", () => {
  for (const b of PREMIUM) {
    const html = read(`perfil-${b.slug}.html`);
    const url = `${SITE}/perfil-${b.slug}`;
    assert.ok(html.includes(`<link id="canonicalLink" rel="canonical" href="${url}">`), b.slug);
    assert.ok(html.includes(`<meta id="ogUrl" property="og:url" content="${url}">`), b.slug);
    const ld = jsonLd(html, "bizJsonLd");
    assert.equal(ld.url, url);
    assert.equal(ld.mainEntity.url, url);
    assert.doesNotMatch(html, /podcastdelmigrante\.com\/perfil-[a-z0-9-]+\.html/, `${b.slug}: sin URL con .html`);
  }
  const dir = read("quien-puede-ayudarte.html");
  assert.ok(dir.includes(`<link id="canonicalLink" rel="canonical" href="${SITE}/quien-puede-ayudarte">`));
  assert.ok(dir.includes(`<meta id="ogUrl" property="og:url" content="${SITE}/quien-puede-ayudarte">`));
  assert.ok(read("business-profile.html").includes(`rel="canonical" href="${SITE}/quien-puede-ayudarte"`));
});

test("JSON-LD de cada miniweb: schema.org válido y solo con datos del registro", () => {
  const PROHIBIDO = /"(review|reviews|aggregateRating|ratingValue|openingHours|openingHoursSpecification|priceRange|price|hasCredential|award)"/;
  for (const b of PREMIUM) {
    const html = read(`perfil-${b.slug}.html`);
    assert.equal((html.match(/application\/ld\+json/g) || []).length, 1, `${b.slug}: un solo bloque`);
    const raw = html.match(/id="bizJsonLd">([\s\S]*?)<\/script>/)[1];
    assert.doesNotMatch(raw, /<\//, "sin «</» dentro del script");
    assert.doesNotMatch(raw, PROHIBIDO, `${b.slug}: sin reseñas, puntuaciones, horarios, precios ni certificaciones`);
    assert.doesNotMatch(raw, /:""|:\[\]|:null/, `${b.slug}: sin campos vacíos`);
    const ld = JSON.parse(raw);
    assert.deepEqual(ld, JSON.parse(JSON.stringify(RT.PDMBizProfile.structuredData(RT.__B.find((x) => x.id === b.id)))), `${b.slug}: igual al de js/business-profile.js`);
    assert.equal(ld["@context"], "https://schema.org");
    assert.equal(ld["@type"], "ProfilePage");
    assert.equal(ld.dateModified, b.updatedAt);
    assert.deepEqual(ld.breadcrumb.itemListElement.map((x) => x.item), [`${SITE}/`, `${SITE}/quien-puede-ayudarte`, `${SITE}/perfil-${b.slug}`]);
    const e = ld.mainEntity;
    assert.equal(e["@type"], b.representative ? "Organization" : "Person");
    assert.equal(e.name, b.name);
    assert.equal(e.telephone, b.phone || undefined);
    assert.equal(e.email, b.email || undefined);
    if (b.representative) assert.deepEqual(e.employee, { "@type": "Person", name: b.representative, jobTitle: "Representante" });
    /* Servicios: solo los activos y los agrupados, tal cual */
    const permitidos = new Set([...(b.services || []).filter((s) => s.active).map((s) => s.label), ...(b.serviceGroups || []).flatMap((g) => g.items)]);
    const ofrecidos = (e.makesOffer || []).map((o) => o.itemOffered.name);
    assert.deepEqual(new Set(ofrecidos), permitidos, `${b.slug}: servicios`);
    /* Provincias de servicio: solo las indicadas */
    for (const o of e.makesOffer || []) assert.deepEqual((o.areaServed || []).map((a) => a.name), b.serviceAreas || []);
    /* Redes y sitios: solo los oficiales del registro */
    const enlaces = new Set([b.instagram, b.tiktok, b.facebook, b.linkedin, b.website].filter(Boolean));
    for (const u of e.sameAs || []) assert.ok(enlaces.has(u), `${b.slug}: ${u}`);
    /* Dirección postal completa solo si el perfil la publica */
    const txt = JSON.stringify(e);
    if (!b.address) assert.doesNotMatch(txt, /streetAddress|postalCode/, `${b.slug}: sin dirección inventada`);
    for (const u of txt.match(/https?:\/\/[^"]+/g)) assert.match(u, /^https:\/\//, u);
  }
});

test("Tomás: sin idiomas ni servicios hasta que se confirmen; concesionario con su dirección pública", () => {
  const e = jsonLd(read("perfil-tomas-velazquez.html"), "bizJsonLd").mainEntity;
  assert.equal(e.knowsLanguage, undefined);
  assert.equal(e.makesOffer, undefined);
  assert.equal(e.worksFor["@type"], "AutoDealer");
  assert.equal(e.worksFor.address.streetAddress, "20 Freeport Landing NE");
});

test("Carlos: el sitio web es el de su marca, no el de la empresa donde trabaja", () => {
  const e = jsonLd(read("perfil-carlos-d-castillo.html"), "bizJsonLd").mainEntity;
  assert.deepEqual(e.brand, { "@type": "Brand", name: "Carlos D. Castillo – Wealth & Insurance Strategies", url: "https://carlosdcastillo.com/" });
  assert.deepEqual(e.worksFor, { "@type": "Organization", name: "Roca Financial Group Ltd." });
  assert.equal(e.workLocation.address.addressLocality, "Calgary");
});

test("directorio: nombres, categorías y enlaces limpios en el HTML inicial, con ItemList", () => {
  const html = read("quien-puede-ayudarte.html");
  const t = sinJs(main(html));
  assert.match(html, /<div class="biz-results" id="bizResults" aria-live="polite" data-prerendered><!-- directorio-tarjetas -->/);
  for (const b of ALL) {
    assert.ok(t.includes(b.name), b.name);
    if (b.plan === "gratuito") assert.ok(t.includes(CATEGORY[b.category]), b.name);
    else assert.ok(html.includes(`href="perfil-${b.slug}"`), `${b.slug}: enlace limpio`);
  }
  assert.doesNotMatch(main(html), /href="perfil-[a-z0-9-]+\.html"/);
  assert.ok(html.includes(RT.PDMBizDirectory.allCardsHtml()), "igual al de js/business-directory.js");
  const ld = jsonLd(html, "bizDirJsonLd");
  assert.equal(ld["@type"], "CollectionPage");
  assert.equal(ld.url, `${SITE}/quien-puede-ayudarte`);
  assert.equal(ld.mainEntity["@type"], "ItemList");
  assert.equal(ld.mainEntity.numberOfItems, ALL.length);
  assert.deepEqual(ld.mainEntity.itemListElement.filter((x) => x.url).map((x) => x.url).sort(), PREMIUM.map((b) => `${SITE}/perfil-${b.slug}`).sort());
  assert.equal(ld.dateModified, ALL.map((b) => b.updatedAt).sort().at(-1));
});

test("sitemap: directorio y miniwebs publicadas, fechas reales, sin .html ni duplicados", () => {
  const xml = read("sitemap.xml");
  const bloque = xml.match(/<!-- directorio-empresarial: [^>]*-->([\s\S]*?)<!-- \/directorio-empresarial -->/)[1];
  const urls = [...bloque.matchAll(/<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(
    urls,
    [[`${SITE}/quien-puede-ayudarte`, ALL.map((b) => b.updatedAt).sort().at(-1)], ...PREMIUM.map((b) => [`${SITE}/perfil-${b.slug}`, b.updatedAt])]
  );
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length, "sin URL repetidas en todo el sitemap");
  assert.doesNotMatch(xml, /perfil-[a-z0-9-]+\.html|quien-puede-ayudarte\.html/);
  const hoy = new Date().toISOString().slice(0, 10);
  for (const b of ALL) {
    assert.match(b.updatedAt, /^\d{4}-\d{2}-\d{2}$/, b.id);
    assert.ok(b.updatedAt <= hoy, `${b.id}: fecha en el futuro`);
  }
});

test("borradores y fichas gratuitas: el borrador no aparece en ninguna parte; la gratuita solo como tarjeta", () => {
  const dir = mkdtempSync(join(tmpdir(), "dir-visib-"));
  for (const d of ["js", "scripts", "css", "assets"]) cpSync(join(ROOT, d), join(dir, d), { recursive: true });
  for (const f of ["business-profile.html", "quien-puede-ayudarte.html", "sitemap.xml"]) cpSync(join(ROOT, f), join(dir, f));
  const extra = `  {
    id: "BIZ-901", slug: "borrador-secreto", published: false, updatedAt: "2026-11-01",
    name: "Borrador Secreto", category: "salud", city: "Calgary", province: "Alberta", phone: "+1 403 000 0001",
    seo: { title: "Borrador Secreto", description: "No publicar" },
  },
  {
    id: "BIZ-902", slug: "panaderia-prueba", published: true, plan: "gratuito", updatedAt: "2026-11-02",
    name: "Panadería Prueba", category: "vivienda", city: "Edmonton", province: "Alberta", country: "Canadá",
    shortDescription: "Pan latino fresco.", phone: "+1 780 000 0002",
  },
];`;
  writeFileSync(join(dir, "js/businesses.js"), read("js/businesses.js").replace(/\n\];\s*$/, "\n" + extra));
  execFileSync(process.execPath, [join(dir, "scripts/build-profile-pages.mjs")], { cwd: dir, stdio: "pipe" });
  const sm = readFileSync(join(dir, "sitemap.xml"), "utf8");
  const dirHtml = readFileSync(join(dir, "quien-puede-ayudarte.html"), "utf8");
  for (const f of [sm, dirHtml]) assert.doesNotMatch(f, /Borrador Secreto|borrador-secreto/);
  assert.ok(!existsSync(join(dir, "perfil-borrador-secreto.html")));
  assert.ok(!existsSync(join(dir, "perfil-panaderia-prueba.html")));
  assert.doesNotMatch(sm, /panaderia-prueba/, "la ficha gratuita no tiene URL propia");
  assert.match(sinJs(dirHtml), /Panadería Prueba Vivienda Edmonton, Alberta Pan latino fresco\./);
  const ld = JSON.parse(dirHtml.match(/id="bizDirJsonLd">([\s\S]*?)<\/script>/)[1]);
  const free = ld.mainEntity.itemListElement.find((x) => x.name === "Panadería Prueba");
  assert.equal(free.url, undefined);
  assert.deepEqual(free.item.address, { "@type": "PostalAddress", addressLocality: "Edmonton", addressRegion: "Alberta", addressCountry: "CA" });
  /* La fecha del directorio incluye la ficha gratuita, pero no el borrador */
  assert.equal(ld.dateModified, "2026-11-08");
  assert.match(sm, /<loc>https:\/\/podcastdelmigrante\.com\/quien-puede-ayudarte<\/loc>\s*<lastmod>2026-11-08<\/lastmod>/);
});

test("fechas: una fecha inválida o futura detiene el generador (nunca se inventan)", () => {
  for (const fecha of ["2026-13-01", "ayer", "2099-01-01"]) {
    const dir = mkdtempSync(join(tmpdir(), "dir-fecha-"));
    for (const d of ["js", "scripts", "css", "assets"]) cpSync(join(ROOT, d), join(dir, d), { recursive: true });
    for (const f of ["business-profile.html", "quien-puede-ayudarte.html", "sitemap.xml"]) cpSync(join(ROOT, f), join(dir, f));
    writeFileSync(join(dir, "js/businesses.js"), read("js/businesses.js").replace('updatedAt: "2026-10-07"', `updatedAt: "${fecha}"`));
    assert.throws(() => execFileSync(process.execPath, [join(dir, "scripts/build-profile-pages.mjs")], { cwd: dir, stdio: "pipe" }), fecha);
  }
});

test("privacidad: nada del panel ni campos internos en las páginas públicas", () => {
  const paginas = [...PREMIUM.map((b) => `perfil-${b.slug}.html`), "quien-puede-ayudarte.html", "sitemap.xml"].map(read).join("\n");
  assert.doesNotMatch(paginas, /foundingProfile|SOL-\d{8}|PREMIUM_GIFT|PREMIUM_PAID|cortes[ií]a|business_applications|membership|idempotency|admin\.podcastdelmigrante\.com\/api/i);
  for (const b of PREMIUM) {
    const ld = jsonLd(read(`perfil-${b.slug}.html`), "bizJsonLd");
    assert.doesNotMatch(JSON.stringify(ld), /"plan"|"featured"|"foundingProfile"|"id":"BIZ-/);
  }
});

test("rastreadores: robots.txt no bloquea Googlebot, Bingbot ni OAI-SearchBot; GPTBot sin cambios", () => {
  const robots = read("robots.txt");
  assert.match(robots, /^User-agent: \*\nAllow: \/\n/);
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m, "no hay Disallow: / ");
  assert.doesNotMatch(robots, /Disallow: \/(perfil|quien-puede-ayudarte|sitemap|assets|css|js)/);
  assert.doesNotMatch(robots, /Googlebot|Bingbot|OAI-SearchBot|GPTBot/i, "sin reglas por agente: la política de GPTBot no se toca");
  assert.match(robots, /Sitemap: https:\/\/podcastdelmigrante\.com\/sitemap\.xml/);
  /* Los perfiles y el directorio no llevan noindex */
  for (const f of [...PREMIUM.map((b) => `perfil-${b.slug}.html`), "quien-puede-ayudarte.html"]) assert.doesNotMatch(read(f), /noindex/i, f);
});

test("compartir: los metadatos de WhatsApp y Facebook no cambian (salvo la URL limpia)", () => {
  for (const b of PREMIUM) {
    const html = read(`perfil-${b.slug}.html`);
    assert.match(html, new RegExp(`<meta id="ogImage" property="og:image" content="${SITE}/${(b.ogImage || b.profileImage).replace(/\./g, "\\.")}">`), b.slug);
    assert.match(html, /<meta property="og:image:width" content="\d+">/);
    assert.ok(html.includes(`<title>${b.seo.title}</title>`), b.slug);
  }
});

test("QR y vCard sin cambios: siguen apuntando a la dirección impresa (con .html, que redirige)", () => {
  execFileSync("python3", ["scripts/build-qr-images.py", "--check"], { cwd: ROOT, stdio: "pipe" });
  assert.match(read("scripts/build-qr-images.py"), /\{SITE_ORIGIN\}\/perfil-\{slug\}\.html/);
});
