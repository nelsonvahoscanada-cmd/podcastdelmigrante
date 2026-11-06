/* Perfil Premium BIZ-004 «1JuanRomero1 Inc.» (solicitud SOL-20261105-G5TQ46):
   datos de la solicitud, plantilla Premium estándar con tema de color «cine»,
   correo comercial como contacto preferido («Solicitar cotización»), vCard,
   QR y fotografía original del empresario. Los demás perfiles no cambian. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/businesses.js") + ";globalThis.B = BUSINESSES; globalThis.C = BUSINESS_CATEGORIES;", ctx);
const J = JSON.parse(JSON.stringify(ctx.B.find((b) => b.slug === "1juanromero1")));
const M = "contact1juanromero1@gmail.com";
/* Ancho y alto de un JPEG (marcador SOF), sin dependencias */
function jpegSize(p) {
  const d = readFileSync(join(ROOT, p));
  for (let i = 2; i < d.length; ) {
    const m = d[i + 1], len = d.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return [d.readUInt16BE(i + 7), d.readUInt16BE(i + 5)];
    i += 2 + len;
  }
}

test("datos de la solicitud, sin inventar", () => {
  assert.equal(J.id, "BIZ-004");
  assert.equal(ctx.B.filter((b) => b.id === "BIZ-004" || b.slug === "1juanromero1").length, 1);
  assert.equal(J.name, "1JuanRomero1 Inc.");
  assert.equal(J.representative, "Juan Sebastian Vahos Alvarado");
  assert.equal(J.professionalTitle, "Fundador, Videógrafo y Editor de Video");
  assert.deepEqual([J.city, J.province], ["Calgary", "Alberta"]);
  assert.equal(J.phone, "+1 403 363 7566");
  assert.equal(J.email, M);
  assert.equal(J.instagram, "https://www.instagram.com/1juanromero1/");
  assert.equal(J.tiktok, "https://www.tiktok.com/@1juanromero1");
  assert.deepEqual(J.languages, ["es", "en"]);
  for (const k of ["whatsapp", "website", "facebook", "linkedin", "bookingUrl", "address"]) assert.equal(J[k], "", k);
  assert.equal(J.youtubeVideoId, "9rg27W1igsY", "video oficial entregado por el empresario");
  assert.equal(J.videoTitle, undefined, "sin título inventado: la plantilla usa «Conoce a …»");
  assert.equal(J.videoText, undefined);
  assert.deepEqual([J.gallery, J.testimonials, J.hours], [[], [], []]);
  assert.equal(J.plan, undefined, "Perfil Premium (sin plan gratuito)");
  assert.equal(J.category, "produccion-audiovisual");
  assert.equal(ctx.C.find((c) => c.id === J.category).label, "Producción audiovisual y contenido digital");
  assert.equal(ctx.B.filter((b) => b.category === "produccion-audiovisual").length, 1, "solo esta empresa");
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.B.filter((b) => b.slug !== J.slug).map((b) => [b.slug, b.category]))), [["tomas-velazquez", "automoviles"], ["carlos-d-castillo", "seguros-finanzas"], ["santa-latino", "eventos-celebraciones"]], "las demás conservan su categoría");
  assert.ok(J.seo.description.length <= 160);
});

test("contacto preferido: correo con «Solicitar cotización» (opcional en la plantilla)", () => {
  assert.equal(J.emailFirst, true);
  assert.equal(J.emailLabel, "Solicitar cotización");
  assert.equal(J.showEmail, true);
  for (const b of ctx.B.filter((x) => x.slug !== J.slug)) assert.ok(b.emailFirst === undefined && b.emailLabel === undefined, b.slug);
  assert.match(read("js/business-profile.js"), /label: b\.emailLabel \|\| "Enviar email"/);
  assert.match(read("js/business-profile.js"), /label: b\.emailLabel \|\| "Email"/);
  assert.match(read("js/business-profile.js"), /concat\(b\.emailFirst \? \["email"\] : \[\]\)/, "barra móvil: correo primero solo con emailFirst");
});

test("tema «cine»: solo colores sobre la plantilla estándar, sin decoraciones navideñas", () => {
  assert.equal(J.theme, "cine");
  const css = read("css/temas/cine.css");
  assert.doesNotMatch(css, /navidad|árbol|arbol|regalo|url\(/i);
  const selectores = css.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => (/\{\s*$/.test(l) || /^html.*,\s*$/.test(l)) && !/^\s*@/.test(l));
  assert.ok(selectores.length > 20);
  for (const sel of selectores) assert.match(sel, /html\[data-profile-theme="cine"\]/, sel);
  assert.match(css, /\.biz-hero__photo \{\n  \/\*[^*]*\*\/\n  aspect-ratio: auto;\n  object-fit: contain;/, "fotografía completa, sin recorte");
  assert.doesNotMatch(css.match(/\.biz-video__frame \{[^}]*\}/)[0], /aspect-ratio|object-fit|height/, "el video conserva su 16:9");
});

test("fotografía original, vCard, QR y página generada", () => {
  for (const f of [J.profileImage, J.cardImage, J.ogImage, "assets/qr/perfil-1juanromero1.svg", "assets/qr/perfil-1juanromero1.png", "assets/qr/contacto-1juanromero1.svg", "assets/qr/contacto-1juanromero1.png", "perfil-1juanromero1.html"]) assert.ok(existsSync(join(ROOT, f)), f);
  assert.deepEqual(jpegSize(J.profileImage), [630, 607], "fotografía original, sin recorte");
  assert.deepEqual(jpegSize(J.ogImage), [1200, 630]);
  const v = read("vcard/1juanromero1.vcf");
  for (const l of ["N:Vahos Alvarado;Juan Sebastian;;;", "FN:1JuanRomero1 Inc.", "ORG:1JuanRomero1 Inc.", "NOTE:Representante: Juan Sebastian Vahos Alvarado", "TEL;TYPE=WORK,VOICE:+14033637566", `EMAIL;TYPE=INTERNET,WORK:${M}`]) assert.ok(v.includes(`\r\n${l}\r\n`), l);
  const html = read("perfil-1juanromero1.html");
  assert.match(html, /data-profile-theme="cine"/);
  assert.match(html, /css\/temas\/cine\.css/);
  assert.match(html, /og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/directorio\/perfiles\/1juanromero1-og\.jpg"/);
});
