/*
  Comprobaciones del sitio público (sin navegador):
  - ningún enlace visible del pie de página apunta a «#»;
  - la columna Legal muestra los siete documentos legales publicados;
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

test("pie de página: columna Legal con los siete documentos legales, sin enlaces ocultos", () => {
  for (const p of ["politica-editorial.html", "privacidad.html", "cookies.html", "terminos.html", "publicidad.html", "derechos-de-autor.html", "correcciones.html"]) assert.ok(existsSync(new URL(p, ROOT)), p);
  for (const f of PAGES) {
    const footer = footerOf(read(f));
    assert.match(footer, /<div class="footer-col">\s*<h2 class="footer-col__title">Legal<\/h2>/, f);
    assert.match(footer, /<a href="(\/?)politica-editorial"( aria-current="page")?>Aviso legal y política editorial<\/a>\s*<a href="\1privacidad"( aria-current="page")?>Política de privacidad<\/a>\s*<a href="\1cookies"( aria-current="page")?>Política de cookies<\/a>\s*<a href="\1terminos"( aria-current="page")?>Términos y condiciones<\/a>\s*<a href="\1publicidad"( aria-current="page")?>Publicidad y contenido patrocinado<\/a>\s*<a href="\1derechos-de-autor"( aria-current="page")?>Derechos de autor<\/a>\s*<a href="\1correcciones"( aria-current="page")?>Correcciones<\/a>\s*<\/div>/, f);
    assert.doesNotMatch(footer.slice(footer.indexOf(">Legal<")), /hidden>/, `${f}: enlaces legales ocultos`);
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

test("Aviso legal y política editorial: identificación, IA, transparencia y sin afirmaciones no aprobadas", () => {
  const html = read("politica-editorial.html");
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/politica-editorial">/);
  assert.match(html, /Documento pendiente de revisión jurídica profesional/);
  assert.match(html, /eRadio Global Corp\., empresa registrada en Alberta y a nivel federal en Canadá/);
  assert.match(html, /mailto:podcastdelmigrante@gmail\.com/);
  assert.match(html, /Práctica vigente/);
  assert.match(html, /En preparación/);
  assert.match(html, /La IA no es una fuente de información/);
  assert.match(html, /revisión y aprobación editorial humana/);
  assert.match(html, /no es un proveedor de asesoría migratoria/);
  assert.match(html, /Transparencia sobre vínculos profesionales/);
  assert.match(html, /Contenido patrocinado/);
  assert.match(html, /id="correcciones"/);
  // Desafío 100 Empresas: texto aprobado (gratuito, sin garantías e independiente de Premium y publicidad)
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  assert.match(main, /id="desafio-100-empresas"/);
  assert.match(main, /no cobramos a los empresarios por participar ni por aparecer en el programa[\s\S]*href="#desafio-100-empresas"/);
  assert.match(main, /completamente gratuita<\/strong>\. No cobramos a los empresarios/);
  assert.match(main, /independiente de los servicios comerciales de publicidad y de los Perfiles Empresariales Premium/);
  // Sin domicilios, números de registro, plazos ni la afirmación permanente de que no hay patrocinios
  assert.doesNotMatch(main, /no publicamos contenido patrocinado|domicilio|número de registro|\d+\s*(días|horas)/i);
  for (const p of ["privacidad.html", "cookies.html", "terminos.html"]) {
    assert.match(read(p), /<a href="\/politica-editorial">Aviso legal y política editorial<\/a>/, p);
  }
});

test("Política de publicidad: Desafío gratuito, aliado de producción vigente, representantes autorizados y sin datos no aprobados", () => {
  const html = read("publicidad.html");
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/publicidad">/);
  assert.match(main, /Documento pendiente de revisión jurídica profesional/);
  assert.match(main, /eRadio Global Corp\./);
  assert.match(main, /completamente gratuitas para los empresarios/);
  assert.match(main, /no requiere contratar ningún servicio comercial/);
  assert.match(main, /Country Hills Toyota<\/strong> facilita las instalaciones/);
  assert.match(main, /menciona y le otorga créditos durante el podcast/);
  assert.match(main, /prometa o garantice resultados migratorios/);
  assert.match(main, /Chambre des notaires du Québec/);
  assert.match(main, /College of Immigration and Citizenship Consultants/);
  assert.match(main, /no convierte todo el artículo en contenido patrocinado/);
  // Sin nombrar colaboraciones anteriores, sin precios ni contratos, sin afirmar que solo existen RCIC y abogados
  assert.doesNotMatch(main, /Sterna|\$\s?\d|tarifa|precio de|solo (los )?(RCIC|abogados)/i);
  for (const p of ["politica-editorial.html", "terminos.html"]) {
    assert.match(read(p), /<a href="\/publicidad">Política de publicidad y contenido patrocinado<\/a>/, p);
  }
});

test("Derechos de autor: protección según la ley, autorizaciones del Desafío como licencia, libro en preparación y sin datos no aprobados", () => {
  const html = read("derechos-de-autor.html");
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/derechos-de-autor">/);
  assert.match(main, /Documento pendiente de revisión jurídica profesional/);
  assert.match(main, /cuando cumplen los requisitos de la legislación canadiense/);
  assert.match(main, /No todos los materiales tienen automáticamente esa protección/);
  assert.match(main, /No afirmamos que esos materiales tengan automáticamente protección de derecho de autor/);
  assert.match(main, /firman una autorización escrita/);
  assert.match(main, /Licencia de uso, no transferencia de titularidad/);
  assert.match(main, /No la presentamos como una transferencia total de los derechos de autor/);
  assert.match(main, /pendientes de revisión profesional/);
  assert.match(main, /El libro está en preparación: todavía no es una publicación disponible/);
  assert.match(main, /título provisional/);
  assert.match(main, /completamente gratuitas para los empresarios/);
  assert.match(main, /fair dealing/);
  // Sin registro de marcas, cesiones totales ni plazos obligatorios
  assert.doesNotMatch(main, /marca registrada|®|™|cedieron (la totalidad|todos)|\d+\s*(días|horas)/i);
  for (const [p, href] of [["terminos.html", "/derechos-de-autor"], ["politica-editorial.html", "/derechos-de-autor"], ["publicidad.html", "/derechos-de-autor#entrevistas"]]) {
    assert.match(read(p), new RegExp(`<a href="${href}">Política de derechos de autor y uso de contenidos<\\/a>`), p);
  }
});

test("Correcciones: responsable, funcionalidad vs. aplicación, réplica prudente, sin plazos nuevos", () => {
  const html = read("correcciones.html");
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  assert.match(html, /<link rel="canonical" href="https:\/\/podcastdelmigrante\.com\/correcciones">/);
  assert.match(main, /Documento pendiente de revisión jurídica profesional/);
  assert.match(main, /Dirección Editorial de El Podcast del Migrante Magazine/);
  assert.match(main, /Procuraremos confirmar la recepción/);
  assert.match(main, /Funcionalidad disponible\.<\/strong> Nuestro sistema de publicación de noticias permite mostrar una <strong>nota de corrección visible/);
  assert.match(main, /Aplicación editorial/);
  assert.match(main, /descripción, publicar un comentario fijado[\s\S]*nueva publicación/);
  assert.match(main, /vía editorial<\/strong> para recibir y evaluar/);
  assert.match(main, /no sustituye ni limita los derechos o procedimientos que la ley pueda prever/);
  assert.match(main, /excepcionales<\/strong>, que se evalúan <strong>caso por caso/);
  assert.match(main, /sistema privado/);
  // Sin plazos propios, sin afirmar correcciones previas ni negar categóricamente derechos legales
  assert.doesNotMatch(main, /\d+\s*(días|horas)|hemos publicado notas|No existe en Canadá un derecho/i);
  // La política editorial ya no presenta la nota de corrección como futura
  const ed = read("politica-editorial.html");
  assert.doesNotMatch(ed, /En preparación\.<\/strong> Una nota de corrección visible/);
  assert.match(ed, /Funcionalidad disponible\.<\/strong> Nuestro sistema de publicación de noticias permite mostrar una nota de corrección visible/);
  assert.doesNotMatch(ed, /En preparación\.<\/strong> Indicar la fecha de actualización/);
  assert.match(ed, /Funcionalidad disponible\.<\/strong> Nuestro sistema de publicación de noticias permite indicar la fecha de actualización/);
  for (const p of ["politica-editorial.html", "terminos.html", "derechos-de-autor.html", "privacidad.html"]) {
    assert.match(read(p), /<a href="\/correcciones">Política de correcciones y derecho de réplica<\/a>/, p);
  }
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
