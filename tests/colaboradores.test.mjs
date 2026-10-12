/*
  Colaboradores editoriales: cada uno tiene su perfil público
  colaborador-<id>.html con vista previa para redes (Open Graph y
  Twitter Card) e imagen social 1200 × 630. Son perfiles editoriales,
  separados de las miniwebs empresariales.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const ctx = vm.createContext({});
vm.runInContext(read("js/data.js") + ";globalThis.C = CONTRIBUTORS;", ctx);
const CONTRIBUTORS = ctx.C;

function jpegSize(path) {
  const buf = readFileSync(new URL(path, ROOT));
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
const meta = (html, prop) => (html.match(new RegExp(`<meta[^>]*(?:property|name)="${prop}"[^>]*content="([^"]*)"`)) || [])[1];

test("las páginas de colaboradores están al día", () => {
  execFileSync(process.execPath, ["scripts/build-contributor-pages.mjs", "--check"], { cwd: new URL(".", ROOT) });
});

test("cada colaborador tiene perfil público con vista previa e imagen 1200 × 630", () => {
  assert.ok(CONTRIBUTORS.length >= 2);
  for (const c of CONTRIBUTORS) {
    const file = `colaborador-${c.id}.html`;
    assert.ok(existsSync(new URL(file, ROOT)), file);
    assert.equal(c.link, `colaborador-${c.id}`, `${c.id}: enlace «Ver perfil»`);
    const html = read(file);
    const url = `https://podcastdelmigrante.com/colaborador-${c.id}`;
    assert.match(html, new RegExp(`data-contributor-id="${c.id}"`));
    assert.equal(meta(html, "og:url"), url);
    assert.match(html, new RegExp(`<link id="canonicalLink" rel="canonical" href="${url}">`));
    assert.equal(meta(html, "og:image"), `https://podcastdelmigrante.com/assets/social/colaborador-${c.id}.jpg`);
    assert.equal(meta(html, "twitter:image"), meta(html, "og:image"));
    assert.equal(meta(html, "twitter:card"), "summary_large_image");
    assert.equal(meta(html, "og:image:width"), "1200");
    assert.equal(meta(html, "og:image:height"), "630");
    assert.ok(meta(html, "og:title").startsWith(c.name), "og:title");
    assert.ok(meta(html, "og:description").length > 40, "og:description");
    assert.deepEqual(jpegSize(`assets/social/colaborador-${c.id}.jpg`), [1200, 630]);
  }
});

test("Elmy Castillo: perfil completo en inglés, credenciales confirmadas y entrevista", () => {
  const e = CONTRIBUTORS.find((c) => c.id === "elmy-castillo");
  assert.ok(e);
  assert.equal(e.lang, "en");
  assert.equal(e.specialty, "Rural Health Correspondent | Health Education & Interviews");
  assert.equal(e.organization, "eRadio Global | El Podcast del Migrante Magazine");
  assert.match(e.longBio, /^In 2025, Elmy Castillo earned a degree in Honours Physiology from the University of Alberta/);
  assert.match(e.longBio, /Rural Health Correspondent for the County of Newell, Alberta with eRadio Global/);
  assert.match(e.longBio, /preparing her medical school applications, including the Cumming School of Medicine/);
  assert.equal(e.en, undefined, "sin presentación en inglés duplicada");
  const text = [e.specialty, e.bio, e.longBio, e.roleLabel, e.shareSpecialty, e.shareDescription].join(" ");
  assert.doesNotMatch(text, /licensed physician|medical student|admitted to medical|\bMD\b|\bDr\.? Elmy/i);
  assert.doesNotMatch(text, /[áéíóúñ]|Colaborador|Salud|Entrevista/i, "textos del perfil en inglés");
  assert.deepEqual(JSON.parse(JSON.stringify(e.interviews.map((i) => [i.youtubeId, i.lang, i.relatedArticleSlug]))), [["z2Ih590xSP4", "en", "medico-familia-latino-brooks-alberta"]]);
  for (const f of [e.photo, e.photoLarge]) assert.ok(existsSync(new URL(f, ROOT)), f);
  const html = read("colaborador-elmy-castillo.html");
  assert.match(html, /<html lang="en"/);
  assert.equal(meta(html, "og:locale"), "en_CA");
  assert.equal(meta(html, "og:title"), "Elmy Castillo — Rural Health Correspondent | El Podcast del Migrante Magazine");
  assert.equal(meta(html, "description"), e.shareDescription);
  // Carlos sigue igual, en español
  const carlos = read("colaborador-carlos-castillo.html");
  assert.match(carlos, /<html lang="es"/);
  assert.equal(meta(carlos, "og:locale"), "es_CA");
});

test("el perfil en inglés muestra sus botones y títulos en inglés", () => {
  const js = read("js/colaborador.js");
  for (const label of ["Interviews", "Watch Interview", "Share Profile", "Copy Link", "Link copied: "]) assert.ok(js.includes(`"${label}"`), label);
});

test("los colaboradores no se mezclan con las miniwebs empresariales", () => {
  const ctx2 = vm.createContext({});
  vm.runInContext(read("js/businesses.js") + ";globalThis.B = BUSINESSES;", ctx2);
  const bizSlugs = new Set(ctx2.B.map((b) => b.slug));
  for (const c of CONTRIBUTORS) assert.ok(!c.link.startsWith("perfil-") && !bizSlugs.has(c.id), c.id);
});
