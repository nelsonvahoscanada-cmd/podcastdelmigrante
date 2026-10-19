/*
  Comprobaciones del sitio público (sin navegador):
  - ningún enlace visible del pie de página apunta a «#»;
  - la columna Legal muestra solo los documentos publicados (privacidad, cookies y términos);
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

test("pie de página: columna Legal con privacidad, cookies y términos (el resto oculto hasta publicarse)", () => {
  for (const p of ["privacidad.html", "cookies.html", "terminos.html"]) assert.ok(existsSync(new URL(p, ROOT)), p);
  for (const f of PAGES) {
    const footer = footerOf(read(f));
    assert.match(footer, /<div class="footer-col">\s*<h2 class="footer-col__title">Legal<\/h2>/, f);
    assert.match(footer, /<a href="(\/?)privacidad"( aria-current="page")?>Política de privacidad<\/a>\s*<a href="\1cookies"( aria-current="page")?>Política de cookies<\/a>\s*<a href="\1terminos"( aria-current="page")?>Términos y condiciones<\/a>/, f);
    for (const name of ["Política editorial", "Correcciones"]) {
      assert.match(footer, new RegExp(`<a href="[^"]*" hidden>${name}</a>`), `${f}: ${name} oculto`);
    }
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

test("menú: «Directorio Empresarial» lleva a la sección del directorio en la portada", () => {
  assert.match(read("js/data.js"), /\{ label: "Directorio Empresarial", href: "index\.html#quien-puede-ayudarte" \}/);
  assert.match(read("index.html"), /<section[^>]*id="quien-puede-ayudarte"/);
});

test("columna «Entre dos mundos»: imagen institucional permanente, sin el título de la crónica", () => {
  const ctx = vm.createContext({});
  vm.runInContext(read("js/columns.js") + ";globalThis.C = COLUMNS; globalThis.html = columnBannerHtml;", ctx);
  const col = ctx.C.find((c) => c.slug === "entre-dos-mundos");
  const b = col.banner;
  assert.ok(existsSync(new URL(b.src, ROOT)) && existsSync(new URL(b.srcSmall, ROOT)), "archivos de la imagen");
  assert.equal(b.width / b.height, 3 / 2);
  assert.match(b.alt, /Nelson Vahos/);
  assert.doesNotMatch(b.alt, /frío no pudo apagar/i);
  const img = ctx.html(col, { className: "x" });
  assert.match(img, /width="1536" height="1024"/);
  assert.match(img, /loading="lazy"/);
  assert.equal(ctx.html({ slug: "sin-imagen" }), "");
  // La crónica conserva su título y su enlace
  assert.ok(col.entries.some((e) => e.slug === "el-frio-no-pudo-apagar-mi-senal" && e.title === "El frío no pudo apagar mi señal" && e.published));
  assert.ok(existsSync(new URL("articulo-el-frio-no-pudo-apagar-mi-senal.html", ROOT)));
});

test("Política de cookies: operador, contacto, enlace a privacidad y solo tecnologías reales", () => {
  const html = read("cookies.html");
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/cookies">/);
  assert.match(html, /eRadio Global Corp\./);
  assert.match(html, /Responsable de Privacidad/);
  assert.match(html, /mailto:podcastdelmigrante@gmail\.com/);
  assert.match(html, /<a href="\/privacidad">Política de privacidad<\/a>/);
  assert.match(html, /pendiente de revisión jurídica/);
  // Solo describe lo que el código usa
  assert.match(html, /pdm_utm/);
  assert.match(read("js/analytics.js"), /STORE_KEY = "pdm_utm"/);
  assert.match(html, /youtube-nocookie\.com/);
  // Sin banners ni sistemas de consentimiento en esta etapa
  assert.doesNotMatch(html, /<script[^>]*consent|cookie-banner|id="consent/i);
  assert.match(read("privacidad.html"), /<a href="\/cookies">Política de cookies<\/a>/);
});

test("Términos y condiciones: operador, aviso de revisión, descargo migratorio y sin condiciones comerciales", () => {
  const html = read("terminos.html");
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/terminos">/);
  assert.match(html, /eRadio Global Corp\./);
  assert.match(html, /mailto:podcastdelmigrante@gmail\.com/);
  assert.match(html, /pendiente de revisión jurídica/);
  assert.match(html, /no es un proveedor de asesoría migratoria/);
  assert.match(html, /no implica contratar ni pagar/);
  assert.match(html, /no pueden renunciarse/);
  assert.match(html, /<a href="\/privacidad">Política de privacidad<\/a>/);
  assert.match(html, /<a href="\/cookies">Política de cookies<\/a>/);
  // Sin anotaciones internas, precios ni cláusulas no aprobadas
  assert.doesNotMatch(html, /Pendiente:|tribunales|\$\s?\d|suscripci|renovaci|reembols|indemniz/i);
  // Enlaces cruzados desde las otras dos políticas
  assert.match(read("privacidad.html"), /<a href="\/terminos">Términos y condiciones de uso<\/a>/);
  assert.match(read("cookies.html"), /<a href="\/terminos">Términos y condiciones de uso<\/a>/);
});

test("sin herramientas de publicidad o seguimiento ni cookies propias en el sitio público", () => {
  const files = [...PAGES, ...readdirSync(new URL("js/", ROOT), { recursive: true }).filter((f) => f.endsWith(".js")).map((f) => "js/" + f)];
  for (const f of files) {
    // En las páginas solo cuenta el código (<script>), no el texto que lo explica
    const t = f.endsWith(".html") ? [...read(f).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>|<script\b[^>]*src="([^"]*)"/g)].map((m) => m[0]).join("\n") : read(f);
    assert.doesNotMatch(t, /googletagmanager\.com|google-analytics\.com|gtag\(|fbq\(|connect\.facebook\.net|hotjar|clarity\.ms/, f);
    assert.doesNotMatch(t, /document\.cookie|localStorage/, f);
  }
});
