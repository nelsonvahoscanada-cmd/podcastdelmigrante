/*
  Pruebas de las páginas estáticas de artículos (vistas previas al compartir).
  Ejecutar:  node --test tests/*.test.mjs
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const ORIGIN = "https://podcastdelmigrante.com";

const ctx = vm.createContext({});
vm.runInContext(read("js/articles.js") + ";globalThis.A = ARTICLES;", ctx);
const ARTICLES = JSON.parse(JSON.stringify(ctx.A)).filter((a) => !a.draft);

function meta(html, attr, key) {
  const re = new RegExp(`<meta[^>]*\\b${attr}="${key.replace(/[:.]/g, "\\$&")}"[^>]*>`, "g");
  const tags = html.match(re) || [];
  return tags.map((t) => (t.match(/\bcontent="([^"]*)"/) || [])[1]);
}
const one = (html, attr, key) => {
  const v = meta(html, attr, key);
  assert.equal(v.length, 1, `${key} debe aparecer una vez (aparece ${v.length})`);
  return v[0];
};
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const plain = (t) => String(t || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

function jpegSize(path) {
  const b = readFileSync(new URL(path, ROOT));
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

test("hay al menos cinco artículos publicados para verificar", () => {
  assert.ok(ARTICLES.length >= 5);
});

const template = read("articulo.html");
const usedImages = new Map();

for (const a of ARTICLES) {
  test(`metadatos sociales en el HTML: ${a.slug}`, () => {
    const file = `articulo-${a.slug}.html`;
    assert.ok(existsSync(new URL(file, ROOT)), `falta ${file}`);
    const html = read(file);
    const url = `${ORIGIN}/articulo-${a.slug}`;   /* URL pública sin .html (sin redirecciones en Cloudflare Pages) */

    assert.match(html, new RegExp(`data-article-slug="${a.slug}"`));
    assert.equal(unescape(one(html, "property", "og:title")), plain(a.title), "og:title = titular exacto");
    assert.equal(unescape(one(html, "name", "twitter:title")), plain(a.title));
    const desc = unescape(one(html, "property", "og:description"));
    assert.equal(desc, plain((a.seo && a.seo.description) || a.excerpt));
    assert.ok(desc.length >= 50 && desc.length <= 300, "descripción breve");
    assert.equal(unescape(one(html, "name", "twitter:description")), desc);
    assert.equal(one(html, "property", "og:type"), "article");
    assert.equal(one(html, "name", "twitter:card"), "summary_large_image");
    assert.equal(one(html, "property", "og:url"), url);
    const canon = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*>/g)];
    assert.equal(canon.length, 1, "un solo canonical");
    assert.match(canon[0][0], new RegExp(`href="${url.replace(/\./g, "\\.")}"`));
    for (const k of ["og:title", "og:description", "og:image", "og:url", "og:type"]) assert.equal(meta(html, "property", k).length, 1, `${k} no duplicado`);
    for (const k of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) assert.equal(meta(html, "name", k).length, 1, `${k} no duplicado`);

    const img = one(html, "property", "og:image");
    assert.equal(one(html, "name", "twitter:image"), img);
    assert.ok(img.startsWith(ORIGIN + "/assets/"), "imagen absoluta en el dominio oficial");
    const local = img.slice(ORIGIN.length + 1);
    assert.ok(existsSync(new URL(local, ROOT)), `la imagen ${local} existe`);

    const hero = ((a.heroImage && a.heroImage.background) || "").match(/url\(['"]?([^'")]+)/);
    if (hero) {
      assert.equal(local, `assets/social/${a.slug}.jpg`, "usa la versión social de SU propia foto");
      assert.deepEqual(jpegSize(local), [1200, 630]);
      assert.equal(one(html, "property", "og:image:width"), "1200");
      assert.equal(one(html, "property", "og:image:height"), "630");
      assert.ok(!usedImages.has(local), `imagen repetida con ${usedImages.get(local)}`);
      usedImages.set(local, a.slug);
    } else {
      assert.equal(local, "assets/logo.png", "sin foto principal: logotipo del Magazine");
    }

    /* El cuerpo es idéntico a la plantilla: mismo diseño */
    assert.equal(html.slice(html.indexOf("</head>")), template.slice(template.indexOf("</head>")));
    /* Nada de dominios ajenos ni rutas locales en los metadatos */
    for (const v of [...html.matchAll(/(?:content|href)="(https?:\/\/[^"]*)"/g)].map((m) => m[1])) {
      assert.ok(!/share\.google|localhost|github\.io|pages\.dev|workers\.dev/.test(v), v);
    }
  });
}

test("los botones de compartir y copiar usan la URL pública del artículo", () => {
  const js = read("js/article.js");
  assert.match(js, /return SITE_ORIGIN \+ "\/" \+ articlePath\(article\);/);
  assert.match(js, /function shareHtml\(article\) \{\s*const url = canonicalUrl\(article\);/);
  assert.doesNotMatch(js, /SITE_ORIGIN \+ "\/articulo\.html\?slug="/);
});
