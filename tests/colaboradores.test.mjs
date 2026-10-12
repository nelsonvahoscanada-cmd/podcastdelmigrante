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

test("Elmy Castillo: credenciales confirmadas, inglés y entrevista", () => {
  const e = CONTRIBUTORS.find((c) => c.id === "elmy-castillo");
  assert.ok(e);
  assert.equal(e.specialty, "Colaboradora — Salud y Entrevistas en Inglés");
  assert.match(e.longBio, /Universidad de Alberta en 2025 con una licenciatura con honores en Fisiología/);
  assert.match(e.longBio, /maestría en Salud de Precisión en la Universidad de Calgary/);
  assert.doesNotMatch(e.longBio + e.en.longBio + e.shareDescription, /médic[oa] titulad|estudiante de medicina|medical (student|doctor)|\bMD\b/i);
  assert.ok(e.en && /Master's in Precision Health at the University of Calgary/.test(e.en.longBio));
  assert.deepEqual(JSON.parse(JSON.stringify(e.interviews.map((i) => [i.youtubeId, i.lang, i.relatedArticleSlug]))), [["z2Ih590xSP4", "en", "medico-familia-latino-brooks-alberta"]]);
  for (const f of [e.photo, e.photoLarge]) assert.ok(existsSync(new URL(f, ROOT)), f);
});

test("los colaboradores no se mezclan con las miniwebs empresariales", () => {
  const ctx2 = vm.createContext({});
  vm.runInContext(read("js/businesses.js") + ";globalThis.B = BUSINESSES;", ctx2);
  const bizSlugs = new Set(ctx2.B.map((b) => b.slug));
  for (const c of CONTRIBUTORS) assert.ok(!c.link.startsWith("perfil-") && !bizSlugs.has(c.id), c.id);
});
