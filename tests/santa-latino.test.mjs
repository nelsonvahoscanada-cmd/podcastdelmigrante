/*
  Perfil Premium de Santa Latino (BIZ-003): ficha, imágenes, página
  estática, vCard, QR, tema «navidad» aislado y perfiles existentes intactos.
  node --test tests/santa-latino.test.mjs
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const ctx = vm.createContext({});
vm.runInContext(read("js/businesses.js") + ";globalThis.B = BUSINESSES; globalThis.C = BUSINESS_CATEGORIES;", ctx);
const ALL = JSON.parse(JSON.stringify(ctx.B));
const S = ALL.find((b) => b.slug === "santa-latino");

/* Ancho y alto de un JPEG, y si lleva datos EXIF (APP1) */
function jpegInfo(path) {
  const buf = readFileSync(new URL(path, ROOT));
  assert.equal(buf.readUInt16BE(0), 0xffd8, `${path} es JPEG`);
  let i = 2, exif = false, size = null;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xe1 && buf.toString("latin1", i + 4, i + 8) === "Exif") exif = true;
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { size = { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) }; break; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { ...size, exif, bytes: buf.length };
}

test("BIZ-003 y el slug santa-latino son únicos", () => {
  assert.ok(S, "existe la ficha");
  assert.equal(S.id, "BIZ-003");
  assert.equal(ALL.filter((b) => b.id === "BIZ-003").length, 1);
  assert.equal(ALL.filter((b) => b.slug === "santa-latino").length, 1);
  assert.deepEqual(ALL.map((b) => b.id), ["BIZ-001", "BIZ-002", "BIZ-003"]);
});

test("identidad: «Santa Latino» es el nombre principal y Héctor Rivero el representante", () => {
  assert.equal(S.name, "Santa Latino");
  assert.equal(S.shortName, "Santa Latino");
  assert.equal(S.representative, "Héctor Rivero");
  assert.equal(S.company, "");
  assert.equal(S.tagline, "La magia de la Navidad llega hasta ti.");
  assert.equal(S.professionalTitle, "Personaje navideño para eventos y celebraciones");
  assert.deepEqual([S.city, S.province, S.country], ["Niagara Falls", "Ontario", "Canadá"]);
  assert.deepEqual(S.languages, ["es", "en"]);
  assert.match(S.availability, /sujeto a disponibilidad/);
  assert.equal(S.published, true);
  assert.equal(S.plan, undefined, "Perfil Premium (miniweb), no ficha gratuita");
  assert.equal(S.category, "eventos-celebraciones");
});

test("contacto público exacto; el correo privado no se publica", () => {
  assert.equal(S.phone, "+1 289 696 5721");
  assert.equal(S.whatsapp, "12896965721");
  assert.equal(S.instagram, "https://www.instagram.com/latinsantaon/");
  assert.equal(S.tiktok, "https://www.tiktok.com/@santalatino_");
  assert.equal(S.email, "");
  assert.equal(S.website, "");
  const record = JSON.stringify(S);
  assert.doesNotMatch(record, /@(?!santalatino_)[a-z0-9.-]+\.[a-z]{2,}/i, "ningún correo en la ficha");
});

test("servicios indicados, sin precios, horarios, paquetes ni testimonios inventados", () => {
  assert.deepEqual(S.services.filter((s) => s.active).map((s) => s.label), [
    "Visitas de Santa a hogares",
    "Fiestas infantiles y celebraciones familiares",
    "Fotografías y encuentros con Santa",
    "Eventos privados y empresariales",
    "Participación en actividades comunitarias",
    "Presentaciones navideñas en español e inglés",
  ]);
  assert.doesNotMatch(JSON.stringify(S), /\$\s?\d|CAD|precio|paquete|garantiza/i);
  assert.deepEqual(S.hours, []);
  assert.deepEqual(S.testimonials, []);
});

test("fotografías originales optimizadas, sin EXIF, y la grupal en la galería", () => {
  const imgs = { profileImage: [739, 924], cardImage: [320, 320], ogImage: [739, 739] };
  for (const [k, [w, h]] of Object.entries(imgs)) {
    const info = jpegInfo(S[k]);
    assert.deepEqual([info.width, info.height], [w, h], k);
    assert.equal(info.exif, false, `${k} sin EXIF`);
    assert.ok(info.bytes < 150_000, `${k} pesa ${info.bytes} B`);
  }
  assert.equal(S.gallery.length, 1);
  const g = jpegInfo(S.gallery[0].src);
  assert.deepEqual([g.width, g.height], [900, 1200]);
  assert.equal(g.exif, false);
  assert.ok(g.bytes < 250_000);
  assert.ok(S.gallery[0].alt.length > 20, "texto alternativo descriptivo");
});

test("página estática: metadatos propios, tema solo en este perfil", () => {
  const html = read("perfil-santa-latino.html");
  assert.match(html, /<html lang="es" id="htmlRoot" data-profile-slug="santa-latino" data-profile-theme="navidad">/);
  assert.match(html, /<link rel="stylesheet" href="css\/business\.css">\n<link rel="stylesheet" href="css\/temas\/navidad\.css">/);
  assert.match(html, /<title>Santa Latino \| Santa Claus para eventos en Niagara Falls, Ontario \| El Podcast del Migrante<\/title>/);
  assert.match(html, /property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/directorio\/perfiles\/santa-latino-og\.jpg"/);
  assert.match(html, /<meta property="og:image:width" content="739">/);
  assert.match(html, /rel="canonical" href="https:\/\/podcastdelmigrante\.com\/perfil-santa-latino\.html"/);
  for (const p of ["perfil-tomas-velazquez.html", "perfil-carlos-d-castillo.html", "business-profile.html"]) {
    assert.doesNotMatch(read(p), /data-profile-theme|css\/temas\//, `${p} sin tema`);
  }
});

test("vCard: se guarda como «Santa Latino» con Héctor Rivero como representante; las demás no cambian", () => {
  const v = read("vcard/santa-latino.vcf");
  assert.match(v, /\r\nN:Rivero;Héctor;;;\r\n/);
  assert.match(v, /\r\nFN:Santa Latino\r\nORG:Santa Latino\r\nX-ABShowAs:COMPANY\r\n/);
  assert.match(v, /\r\nNOTE:Representante: Héctor Rivero\r\n/);
  assert.match(v, /\r\nTEL;TYPE=WORK,VOICE:\+12896965721\r\n/);
  assert.doesNotMatch(v, /EMAIL/);
  assert.match(read("vcard/tomas-velazquez.vcf"), /\r\nFN:Tomás Velázquez\r\nORG:Country Hills Toyota\r\n/);
  assert.match(read("vcard/carlos-d-castillo.vcf"), /\r\nFN:Carlos D\. Castillo\r\nORG:Roca Financial Group Ltd\.\r\n/);
});

test("generadores al día: páginas, vCards y QR (los existentes sin cambios)", () => {
  execFileSync("node", ["scripts/build-profile-pages.mjs", "--check"], { cwd: ROOT, stdio: "pipe" });
  for (const f of ["perfil-santa-latino.svg", "perfil-santa-latino.png", "contacto-santa-latino.svg", "contacto-santa-latino.png"]) {
    assert.ok(existsSync(new URL(`assets/qr/${f}`, ROOT)), f);
  }
  assert.match(read("assets/qr/perfil-santa-latino.svg"), /QR del perfil de Santa Latino/);
  /* Los QR de los perfiles existentes siguen apuntando a sus mismas URL
     (el --check de arriba ya exige que sus páginas y vCards estén al día) */
  for (const slug of ["tomas-velazquez", "carlos-d-castillo"]) {
    assert.ok(read(`assets/qr/perfil-${slug}.svg`).length > 0);
    assert.ok(existsSync(new URL(`assets/qr/contacto-${slug}.png`, ROOT)));
  }
});

test("tema «navidad»: todas las reglas están limitadas a este perfil y sin recursos externos", () => {
  const css = read("css/temas/navidad.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [...css.matchAll(/(^|})\s*([^{}@]+)\{/g)].map((m) => m[2].trim()).filter((s) => s && !/^(from|to|\d)/.test(s));
  assert.ok(selectors.length > 30);
  for (const sel of selectors) for (const part of sel.split(",")) assert.match(part.trim(), /^html\[data-profile-theme="navidad"\]/, part);
  assert.doesNotMatch(css, /https?:\/\/|@import/);
  /* Árbol fotográfico: WebP optimizado con transparencia en los bordes */
  const arbol = readFileSync(new URL("assets/directorio/temas/navidad-arbol.webp", ROOT));
  assert.equal(arbol.toString("latin1", 0, 4) + arbol.toString("latin1", 8, 12), "RIFFWEBP");
  assert.ok(arbol.length < 80_000, `árbol pesa ${arbol.length} B`);
  assert.match(css, /url\("\.\.\/\.\.\/assets\/directorio\/temas\/navidad-arbol\.webp"\)/);
  assert.ok(!existsSync(new URL("assets/directorio/temas/navidad-escena.svg", ROOT)), "el árbol ilustrado anterior ya no se usa");
});

test("plantilla: los campos nuevos son opcionales (los demás perfiles no los usan)", () => {
  for (const b of ALL.filter((x) => x.slug !== "santa-latino")) {
    assert.equal(b.representative, undefined, b.slug);
    assert.equal(b.theme, undefined, b.slug);
    assert.equal(b.tagline, undefined, b.slug);
  }
  const js = read("js/business-profile.js");
  assert.match(js, /b\.representative \? `<p class="biz-representative">/);
  assert.match(js, /if \(!b\.theme \|\| !\/\^\[a-z0-9-\]\+\$\/\.test\(b\.theme\)\) return;/);
});

test("categoría «Eventos y celebraciones»: nueva al final del directorio y del formulario, sin tocar las existentes", () => {
  const cats = JSON.parse(JSON.stringify(ctx.C));
  assert.deepEqual(cats.map((c) => c.id), ["automoviles", "seguros-finanzas", "vivienda", "empleo", "salud", "servicios-hogar", "eventos-celebraciones"]);
  assert.equal(cats.at(-1).label, "Eventos y celebraciones");
  const core = read("js/directorio/solicitud-core.js");
  assert.match(core, /\{ id: "servicios-hogar", label: "Servicios del hogar" \},\n  \{ id: "eventos-celebraciones", label: "Eventos y celebraciones" \},\n  \{ id: "otra", label: "Otra categoría" \},/);
  /* El formulario pide la versión nueva (la caché del navegador no sirve la lista anterior) */
  assert.match(read("registra-tu-empresa.html"), /solicitud-form\.js\?v=20261105/);
  assert.match(read("js/directorio/solicitud-form.js"), /solicitud-core\.js\?v=20261105/);
});

test("entrevista de El Podcast del Migrante: video de YouTube con título, texto y enlace alternativo", () => {
  assert.equal(S.youtubeVideoId, "LxTr1Zda3dg");
  assert.equal(S.videoTitle, "Santa Latino en El Podcast del Migrante");
  assert.equal(S.videoText, "Conoce la historia de Héctor Rivero, el hombre detrás de Santa Latino, en esta entrevista especial de El Podcast del Migrante.");
  assert.equal(S.videoLinkLabel, "Ver entrevista en YouTube");
  /* Portada local del video (sin pedir imágenes a YouTube al cargar la página) */
  assert.ok(existsSync(new URL("assets/yt/LxTr1Zda3dg.jpg", ROOT)));
  assert.match(read("js/video-cover.js"), /"LxTr1Zda3dg": \["\/assets\/yt\/LxTr1Zda3dg\.jpg"/);
  /* Los demás perfiles conservan su título de siempre («Conoce a …») */
  for (const b of ALL.filter((x) => x.slug !== "santa-latino")) {
    assert.equal(b.videoTitle, undefined, b.slug);
    assert.equal(b.videoLinkLabel, undefined, b.slug);
  }
  assert.match(read("js/business-profile.js"), /b\.videoTitle \? esc\(b\.videoTitle\) : `Conoce a \$\{esc\(b\.shortName \|\| b\.name\)\}`/);
});
