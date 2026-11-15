/*
  Miniweb institucional de Nelson Vahos (/perfil-nelson-vahos)
  - Biografía aprobada, palabra por palabra, en el HTML inicial (sin JavaScript).
  - Independiente: no aparece en «Quién puede ayudarte» ni en «Planes del
    Directorio»; sí en el sitemap, en la lista de estadísticas y en las rutas válidas.
  - Funciones Premium: QR del perfil, QR de contacto, vCard, SEO, JSON-LD, canónica.
  - Objetivo: patrocinios, publicidad y alianzas comerciales. WhatsApp
    (+1 402 427 2741, con mensaje predefinido) es la acción principal; el
    mismo número sirve para llamadas y se ve en el contacto. TikTok
    @podcastdelmigrante en redes. Sin Instagram de eRadio Global;
    eradioglobal.com se presenta como sitio oficial en desarrollo.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const SITE = "https://podcastdelmigrante.com";
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/businesses.js") + ";globalThis.B = BUSINESSES;", ctx);
const ALL = JSON.parse(JSON.stringify(ctx.B));
const N = ALL.find((b) => b.slug === "nelson-vahos");
const HTML = read("perfil-nelson-vahos.html");
const MAIN = HTML.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
const texto = (h) =>
  h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, " ");
const T = texto(MAIN).replace(/\s+/g, " ");

/* Biografía aprobada (texto visible, sin el formato de negritas y cursivas) */
const BIOGRAFIA = [
  "Nelson Vahos es un comunicador colombiano, emprendedor y fundador de proyectos de comunicación digital en Canadá. Desde Alberta, dirige eRadio Global Corp. y El Podcast del Migrante, iniciativas orientadas a informar, conectar y fortalecer a la comunidad latina.",
  "Su trayectoria comenzó en la radio colombiana, donde tuvo la oportunidad de trabajar junto a William Vinasco Ch., una figura reconocida de la radiodifusión nacional. Durante esa etapa adquirió experiencia en comunicación, entrevistas y producción de contenidos.",
  "En diciembre de 2011 comenzaron las transmisiones de eRadio Global, un proyecto que con el tiempo evolucionó hacia nuevas iniciativas de comunicación y medios digitales.",
  "Su llegada a Canadá representó una nueva etapa personal y profesional. Como muchos migrantes, enfrentó el desafío de comenzar nuevamente, adaptarse a otro idioma y trabajar en sectores diferentes a los de su trayectoria anterior, incluida la construcción.",
  "Esa experiencia le permitió comprender de cerca las dificultades, oportunidades y aspiraciones de quienes construyen una nueva vida lejos de su país de origen.",
  "Hoy, a través de El Podcast del Migrante, comparte noticias, entrevistas e información de utilidad para la comunidad latina en Canadá. También escribe la columna Entre dos mundos en el Magazine digital.",
  "Además, lidera Desafío 100 Empresas, una iniciativa que busca dar visibilidad a las historias de empresarios y emprendedores, comenzando en Calgary, mediante entrevistas gratuitas.",
  "Su trabajo reúne comunicación, tecnología, emprendimiento y experiencia migratoria bajo una misma visión:",
  "«Conectando latinos, construyendo futuro».",
];
const CITA = "«El frío no pudo apagar mi señal. Solamente me enseñó a transmitir con un propósito diferente».";
const CARGOS = ["Fundador y Director General de eRadio Global Corp.", "Fundador y Director de El Podcast del Migrante"];

test("registro BIZ-005: único, publicado, institucional y fuera del directorio", () => {
  assert.ok(N, "existe la ficha");
  assert.equal(N.id, "BIZ-005");
  assert.equal(ALL.filter((b) => b.id === "BIZ-005" || b.slug === "nelson-vahos").length, 1);
  assert.equal(N.published, true);
  assert.equal(N.directory, false);
  assert.equal(N.institutional, true);
  assert.equal(N.theme, "institucional");
  assert.equal(N.name, "Nelson Vahos");
  assert.deepEqual(N.roles.map((r) => r.title), CARGOS);
  assert.equal(N.tagline, "Conectando latinos, construyendo futuro");
  assert.deepEqual([N.city, N.province, N.country], ["", "Alberta", "Canadá"]);
  assert.deepEqual(N.languages, ["es"]);
  assert.ok(N.seo.description.length <= 160);
});

test("biografía aprobada, palabra por palabra, y la cita destacada", () => {
  const plano = N.longDescription.map((p) => p.replace(/\*\*|\*/g, ""));
  assert.deepEqual(plano, BIOGRAFIA, "registro");
  for (const p of BIOGRAFIA) assert.ok(T.includes(p), `HTML sin JavaScript: «${p.slice(0, 50)}…»`);
  assert.equal(N.quote, CITA);
  assert.ok(T.includes(CITA), "cita");
  assert.match(MAIN, /<strong>eRadio Global<\/strong>/);
  assert.match(MAIN, /<em>Entre dos mundos<\/em>/);
  /* «diciembre de 2011» es el inicio de las transmisiones, no una fecha de constitución */
  assert.doesNotMatch(T, /fundad[ao] en (diciembre de )?2011|constituid[ao]/i);
});

test("HTML sin JavaScript: portada, cargos, proyectos, trayectoria y contacto profesional", () => {
  assert.match(HTML, /id="bizRoot" data-prerendered="nelson-vahos"/);
  assert.equal((MAIN.match(/<h1 class="biz-name">/g) || []).length, 1);
  assert.ok(T.includes("Perfil institucional"));
  for (const c of CARGOS) assert.ok(MAIN.includes(`<li class="biz-roles__item">${c}</li>`), c);
  assert.ok(T.includes("Alberta, Canadá"));
  for (const t of ["Sobre Nelson", "Proyectos", "Trayectoria", "Contacto profesional", "Diciembre de 2011"]) assert.ok(T.includes(t), t);
  assert.match(MAIN, /<a class="biz-btn biz-btn--primary" href="https:\/\/eradioglobal\.com\/" target="_blank" rel="noopener"/);
  assert.ok(T.includes("Sitio oficial en desarrollo."), "eradioglobal.com no se presenta como terminado");
  assert.match(MAIN, /href="https:\/\/podcastdelmigrante\.com\/"/);
  assert.match(MAIN, /href="\/desafio-100-empresas\/"/);
  assert.ok(existsSync(join(ROOT, "desafio-100-empresas/index.html")), "enlace interno al Desafío");
  for (const u of ["https://facebook.com/eradioglobal", "https://youtube.com/@eradioglobal4291", "https://www.youtube.com/@ElPodcastDelMigranteOficial", "https://www.tiktok.com/@podcastdelmigrante"]) assert.ok(MAIN.includes(`href="${u}"`), u);
  assert.match(MAIN, /href="mailto:eRadioGlobal@gmail\.com"/);
  assert.match(MAIN, /<a class="biz-back" href="\/">← Ir a El Podcast del Migrante<\/a>/);
  assert.doesNotMatch(MAIN, /Perfil empresarial|quien-puede-ayudarte/);
});

const TEL = "tel:+14024272741";
const WA = "https://wa.me/14024272741?text=" + encodeURIComponent("Hola Nelson, encontré tu perfil en El Podcast del Migrante y me gustaría conversar contigo sobre publicidad, patrocinios o una posible alianza comercial.");
const enlaces = (re) => [...MAIN.matchAll(/<a class="([^"]*)" href="([^"]+)"[^>]*data-track="([^"]+)" data-track-target="([^"]+)">([^<]*)</g)].filter((m) => re.test(m[2])).map((m) => [m[1], m[2], m[3], m[4], m[5]]);

test("WhatsApp (acción principal, con mensaje predefinido) y llamada, con el mismo número", () => {
  assert.equal(N.phone, "+1 402 427 2741");
  assert.equal(N.whatsapp, "+1 402 427 2741");
  const wa = enlaces(/^https:\/\/wa\.me\//);
  assert.deepEqual(wa.map((x) => x.slice(1)), [
    [WA, "whatsapp_click", "whatsapp", "Contactar por WhatsApp"],
    [WA, "whatsapp_click", "whatsapp-final", "Contactar por WhatsApp"],
  ]);
  assert.ok(wa.every(([c]) => c === "biz-btn biz-btn--primary"), "WhatsApp es el botón principal");
  assert.match(MAIN, /<div class="biz-actions"><a class="biz-btn biz-btn--primary" href="https:\/\/wa\.me\/14024272741\?text=/, "primer botón de la portada");
  const tel = enlaces(/^tel:/);
  assert.deepEqual(tel.map((x) => x.slice(1)), [
    [TEL, "phone_click", "phone", "Llamar a Nelson"],
    [TEL, "phone_click", "phone-final", "Llamar a Nelson"],
  ]);
  assert.ok(MAIN.includes(`<p class="biz-contact__phone">Teléfono y WhatsApp: <a href="${TEL}" data-track="phone_click" data-track-target="phone-text">+1 402 427 2741</a></p>`), "número visible");
  assert.doesNotMatch(MAIN, /<form/, "sin formularios");
  /* Barra fija del celular: WhatsApp primero (la dibuja business-profile.js) */
  assert.match(read("js/business-profile.js"), /const keep = \["booking", "whatsapp", "phone", "inventory"\]/);
});

test("TikTok @podcastdelmigrante en las redes del perfil, con ícono; sin Instagram de eRadio Global", () => {
  assert.equal(N.tiktok, "https://www.tiktok.com/@podcastdelmigrante");
  for (const lugar of ["hero", "final"]) {
    assert.match(MAIN, new RegExp(`<a class="biz-social__link" href="https://www\\.tiktok\\.com/@podcastdelmigrante" target="_blank" rel="noopener" data-track="tiktok_click" data-track-target="tiktok-${lugar}"[^>]*><svg`), lugar);
  }
  assert.equal(N.instagram, "");
  assert.doesNotMatch(MAIN, /instagram\.com/i);
  /* Las redes oficiales de los proyectos se conservan */
  for (const u of ["https://facebook.com/eradioglobal", "https://youtube.com/@eradioglobal4291", "https://www.youtube.com/@ElPodcastDelMigranteOficial"]) assert.ok(MAIN.includes(`href="${u}"`), u);
});

test("patrocinios, publicidad y alianzas: bloque principal tras los botones de contacto", () => {
  assert.ok(T.includes("Patrocinios, publicidad y alianzas comerciales"));
  assert.ok(MAIN.indexOf("biz-cta") < MAIN.indexOf("biz-about"), "antes de la biografía");
  assert.doesNotMatch(T, /producci[oó]n audiovisual|edici[oó]n de video/i, "no es una página de servicios audiovisuales");
});

test("vCard: nombre, empresa, teléfono, WhatsApp, miniweb y TikTok; la dirección del QR no cambia", () => {
  const vcf = read("vcard/nelson-vahos.vcf").replace(/\r\n /g, "");
  assert.match(vcf, /^FN:Nelson Vahos\r$/m);
  assert.match(vcf, /^ORG:eRadio Global Corp\.\r$/m);
  assert.match(vcf, /^TEL;TYPE=WORK,VOICE:\+14024272741\r$/m);
  assert.match(vcf, /^X-SOCIALPROFILE;TYPE=whatsapp:https:\/\/wa\.me\/14024272741\r$/m);
  assert.match(vcf, /^X-SOCIALPROFILE;TYPE=tiktok:https:\/\/www\.tiktok\.com\/@podcastdelmigrante\r$/m);
  assert.match(vcf, /^EMAIL;TYPE=INTERNET,WORK:eRadioGlobal@gmail\.com\r$/m);
  assert.match(vcf, /^URL:https:\/\/podcastdelmigrante\.com\/perfil-nelson-vahos\r$/m);
  assert.match(vcf, /^ADR;TYPE=WORK:;;;;Alberta;;Canadá\r$/m);
  /* Los QR codifican direcciones permanentes: la vCard y el perfil */
  assert.match(read("assets/qr/contacto-nelson-vahos.svg"), /QR de contacto de Nelson Vahos/);
  assert.match(read("scripts/build-qr-images.py"), /url = f"\{SITE_ORIGIN\}\/vcard\/\{slug\}\.vcf"/);
  assert.match(read("scripts/build-qr-images.py"), /url = f"\{SITE_ORIGIN\}\/perfil-\{slug\}\.html"/);
});

test("SEO: título, descripción, canónica, Open Graph y JSON-LD (Person con sus dos organizaciones)", () => {
  assert.match(HTML, /<title>Nelson Vahos \| Fundador de eRadio Global Corp\. y El Podcast del Migrante<\/title>/);
  assert.match(HTML, new RegExp(`rel="canonical" href="${SITE}/perfil-nelson-vahos"`));
  assert.match(HTML, new RegExp(`property="og:image" content="${SITE}/assets/directorio/perfiles/nelson-vahos-og\\.jpg"`));
  assert.doesNotMatch(HTML, /noindex/i);
  const ld = JSON.parse(HTML.match(/<script type="application\/ld\+json" id="bizJsonLd">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld["@type"], "ProfilePage");
  assert.equal(ld.mainEntity["@type"], "Person");
  assert.deepEqual(ld.mainEntity.jobTitle, CARGOS);
  assert.deepEqual(ld.mainEntity.worksFor.map((o) => [o.name, o.url]), [["eRadio Global Corp.", "https://eradioglobal.com/"], ["El Podcast del Migrante", "https://podcastdelmigrante.com/"]]);
  assert.deepEqual(ld.mainEntity.workLocation.address, { "@type": "PostalAddress", addressRegion: "Alberta", addressCountry: "CA" });
  assert.deepEqual(ld.breadcrumb.itemListElement.map((x) => x.name), ["Inicio", "Nelson Vahos"], "sin el directorio en la ruta");
  assert.equal(ld.mainEntity.telephone, "+1 402 427 2741");
  assert.doesNotMatch(JSON.stringify(ld), /instagram/i);
});

test("independiente: fuera de «Quién puede ayudarte» y de «Planes del Directorio»; dentro del sitemap, estadísticas y rutas", () => {
  for (const f of ["quien-puede-ayudarte.html", "planes-directorio.html"]) assert.doesNotMatch(read(f), /nelson-vahos|Nelson Vahos/, f);
  assert.match(read("js/business-directory.js"), /b\.published && b\.directory !== false/);
  assert.match(read("sitemap.xml"), new RegExp(`<loc>${SITE}/perfil-nelson-vahos</loc>\\s*<lastmod>${N.updatedAt}</lastmod>`));
  assert.equal(JSON.parse(read("negocios-premium.json")).businesses["BIZ-005"], "nelson-vahos");
  assert.match(read("functions/_lib/rutas-validas.js"), /"nelson-vahos"/);
});

test("QR del perfil y de contacto, fotografía y recorte para redes", () => {
  for (const f of ["perfil-nelson-vahos.svg", "perfil-nelson-vahos.png", "contacto-nelson-vahos.svg", "contacto-nelson-vahos.png"]) assert.ok(existsSync(join(ROOT, "assets/qr", f)), f);
  assert.equal(N.connect.profileQrCaption, "Escanea y conoce mi perfil");
  assert.ok(MAIN.includes("Escanea y conoce mi perfil"));
  const jpg = (f) => {
    const b = readFileSync(join(ROOT, "assets/directorio/perfiles", f));
    for (let i = 2; i < b.length; ) {
      const m = b[i + 1];
      assert.notEqual(m, 0xe1, `${f}: sin EXIF`);
      if (m >= 0xc0 && m <= 0xc2) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5), b.length];
      i += 2 + b.readUInt16BE(i + 2);
    }
  };
  const [w1, h1, s1] = jpg("nelson-vahos.jpg");
  assert.deepEqual([w1, h1], [960, 1280], "portada: fotografía completa 3:4");
  assert.ok(s1 < 300_000);
  const [w2, h2, s2] = jpg("nelson-vahos-og.jpg");
  assert.deepEqual([w2, h2], [1200, 630], "redes sociales");
  assert.ok(s2 < 250_000);
  assert.ok(existsSync(join(ROOT, "css/temas/institucional.css")));
});
