/*
  Comprobaciones del sitio público (sin navegador):
  - ningún enlace visible del pie de página apunta a «#»;
  - la columna Legal permanece oculta hasta publicar las páginas aprobadas;
  - ninguna página pública carga Google Fonts (tipografías locales);
  - la página 404 existe, no se indexa y usa rutas desde la raíz;
  - el menú oculta las secciones sin página propia.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const PAGES = readdirSync(ROOT).filter((f) => f.endsWith(".html"));

function footerOf(html) {
  const m = html.match(/<footer[\s\S]*?<\/footer>/);
  return m ? m[0] : "";
}

/* Quita los elementos con el atributo hidden (y su contenido) */
function visibleHtml(html) {
  let out = html;
  for (;;) {
    const next = out.replace(/<(div|a)\b[^>]*\shidden\b[^>]*>(?:(?!<\1\b)[\s\S])*?<\/\1>/, "");
    if (next === out) return out;
    out = next;
  }
}

test("pie de página: sin enlaces visibles a «#» en ninguna página", () => {
  assert.ok(PAGES.length >= 29, "se esperaban las páginas del sitio");
  for (const f of PAGES) {
    const footer = footerOf(read(f));
    assert.ok(footer, `${f}: sin pie de página`);
    const dead = [...visibleHtml(footer).matchAll(/<a\b[^>]*href="(?:index\.html)?#"[^>]*>([^<]*)</g)].map((m) => m[1]);
    assert.deepEqual(dead, [], `${f}: enlaces muertos visibles`);
  }
});

test("pie de página: la columna Legal sigue oculta (sin páginas legales publicadas)", () => {
  for (const f of PAGES) {
    const footer = footerOf(read(f));
    assert.match(footer, /<div class="footer-col" hidden>\s*<h2 class="footer-col__title">Legal<\/h2>/, f);
  }
});

test("tipografías locales: ninguna página pública carga Google Fonts", () => {
  for (const f of [...PAGES, "guia-carlos/index.html"]) {
    assert.doesNotMatch(read(f), /fonts\.(googleapis|gstatic)\.com/, f);
  }
  for (const font of ["fraunces-latin-opsz-normal.woff2", "public-sans-latin-wght-normal.woff2", "LICENSE-Fraunces-OFL.txt", "LICENSE-PublicSans-OFL.txt"]) {
    assert.ok(existsSync(new URL("assets/fonts/" + font, ROOT)), font);
  }
});

test("página 404: existe, no se indexa y sus rutas parten de la raíz", () => {
  const html = read("404.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<h1[^>]*>No encontramos esta página<\/h1>/);
  const relative = [...html.matchAll(/(?:href|src)="(?!https?:|mailto:|#|\/)([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(relative, [], "rutas relativas en 404.html");
  assert.match(html, /window\.PDM_SITE_ROOT_LINKS = true/);
});

test("menú: oculta las secciones sin página propia y no deja enlaces a «#»", () => {
  const ctx = vm.createContext({});
  vm.runInContext(read("js/data.js") + ";globalThis.N = [...NAV_PRIMARY, ...NAV_MORE];", ctx);
  const visible = ctx.N.filter((i) => !i.pending);
  assert.ok(visible.length >= 8);
  for (const i of visible) assert.doesNotMatch(i.href, /#$/, `${i.label} apunta a «#»`);
  assert.equal(ctx.N.find((i) => i.label === "Migración").href, "guia.html?categoria=migracion");
  assert.match(read("js/nav.js"), /filter\(visible\)/);
});
