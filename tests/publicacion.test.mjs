/*
  Carpeta pública dist/ (scripts/build-public.mjs): solo se publica la lista de
  permitidos y la verificación detecta borradores, configuración interna,
  secretos y archivos que faltarían en el sitio.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, publicFiles } from "../scripts/build-public.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), "pdm-dist-"));

test("el sitio real genera una dist/ limpia, sin problemas", () => {
  const out = tmp();
  try {
    const { files, problems } = build(out);
    assert.deepEqual(problems, []);
    const top = new Set(files.map((f) => f.split("/")[0]).filter((f) => !f.includes(".")));
    assert.deepEqual([...top].sort(), ["assets", "canada-en-datos", "css", "desafio-100-empresas", "guia-carlos", "js", "vcard"]);
    for (const dir of ["admin-worker", "db", "docs", "functions", "scripts", "tests", ".github", ".git", "assets/originals"]) {
      assert.equal(existsSync(join(out, dir)), false, `${dir} no se publica`);
    }
    for (const f of ["CNAME", "LICENSE", ".gitignore", "README.md"]) assert.equal(existsSync(join(out, f)), false, `${f} no se publica`);
    assert.ok(files.every((f) => !/\.(md|sql|toml|mjs|py|cjs|yml|yaml)$/.test(f)), "sin documentos, SQL, configuración ni scripts");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("se publican todas las páginas de la raíz, _routes.json, robots y sitemap", () => {
  const files = new Set(publicFiles());
  const pages = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  assert.ok(pages.length >= 29);
  for (const p of pages) assert.ok(files.has(p), p);
  for (const f of ["_routes.json", "robots.txt", "sitemap.xml", "guia-carlos/index.html", "js/directorio/solicitud-core.js"]) assert.ok(files.has(f), f);
});

test("ningún borrador legal ni documento interno llega a dist/", () => {
  const out = tmp();
  try {
    build(out);
    const all = [];
    const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : all.push(join(d, e.name))));
    walk(out);
    for (const f of all) {
      if (!/\.(html|css|js|txt|svg|xml|json|vcf)$/.test(f)) continue;
      const text = readFileSync(f, "utf8");
      assert.doesNotMatch(text, /\[(PENDIENTE|VERIFICAR|PENDING|VERIFY)\b/, f);
      assert.doesNotMatch(text, /Política de privacidad — BORRADOR|CUESTIONARIO/, f);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("los borradores legales y las auditorías no están en este repositorio público", () => {
  for (const p of ["docs/legal", "docs/auditoria-legal-accesibilidad-2026-10.md"]) {
    assert.equal(existsSync(join(ROOT, p)), false, `${p} pertenece al repositorio privado podcastdelmigrante-interno`);
  }
});

/* ---------- La verificación detecta errores (sitio de juguete) ---------- */
function fakeSite(files) {
  const root = tmp();
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}
const BASE = {
  "index.html": '<link rel="stylesheet" href="css/a.css"><script src="js/a.js"></script><img src="assets/x.png">',
  "_routes.json": '{"version":1,"include":["/registro/*"],"exclude":[]}',
  "css/a.css": "body{background:url(../assets/x.png)}",
  "js/a.js": 'const img = "assets/x.png";',
  "assets/x.png": "png",
};

test("verificación: un sitio correcto pasa y lo interno queda fuera", () => {
  const root = fakeSite(Object.assign({}, BASE, {
    "docs/legal/borrador.md": "[PENDIENTE: fecha]",
    "db/x.sql": "CREATE TABLE t (id INT);",
    ".dev.vars": "RESEND_API_KEY=re_abcdefghij_klmnopqrst",
    "assets/notas.md": "interno",
    "js/.oculto.js": "x",
  }));
  const out = join(root, "dist");
  const { files, problems } = build(out, root);
  assert.deepEqual(problems, []);
  assert.deepEqual(files, ["_routes.json", "assets/x.png", "css/a.css", "index.html", "js/a.js"]);
});

test("verificación: detecta marcas de borrador, SQL, configuración y secretos en archivos públicos", () => {
  for (const [file, text, expected] of [
    ["colaborador.html", "<p>[PENDIENTE: dato]</p>", /marca de borrador/],
    ["js/b.js", "// CREATE TABLE x", /SQL/],
    ["js/c.js", 'database_id = "123"', /configuración interna/],
    ["js/d.js", 'const k = "re_abcdefgh12_ijklmnop34";', /clave de Resend/],
    ["css/e.css", "/* RESEND_API_KEY=abcdefghijk */", /secreto con valor/],
  ]) {
    const root = fakeSite(Object.assign({}, BASE, { [file]: text }));
    const { problems } = build(join(root, "dist"), root);
    assert.ok(problems.some((p) => expected.test(p)), `${file}: ${problems.join(" | ")}`);
  }
});

test("verificación: avisa si una página usa un archivo del repositorio que no se publicaría", () => {
  const root = fakeSite(Object.assign({}, BASE, {
    "index.html": BASE["index.html"] + '<a href="docs/guia.pdf">Guía</a><img src="/assets/originals/y.jpg">',
    "docs/guia.pdf": "pdf",
    "assets/originals/y.jpg": "jpg",
  }));
  const { problems } = build(join(root, "dist"), root);
  assert.ok(problems.some((p) => p.includes("falta docs/guia.pdf")), problems.join(" | "));
  assert.ok(problems.some((p) => p.includes("falta assets/originals/y.jpg")), problems.join(" | "));
});

test("verificación: sin _routes.json o con una URL del sitemap inexistente, falla", () => {
  const sinRoutes = Object.assign({}, BASE);
  delete sinRoutes["_routes.json"];
  let root = fakeSite(sinRoutes);
  assert.ok(build(join(root, "dist"), root).problems.some((p) => /_routes\.json/.test(p)));
  root = fakeSite(Object.assign({}, BASE, { "sitemap.xml": "<urlset><url><loc>https://podcastdelmigrante.com/no-existe</loc></url><url><loc>https://podcastdelmigrante.com/</loc></url></urlset>" }));
  const { problems } = build(join(root, "dist"), root);
  assert.deepEqual(problems, ["sitemap: no existe /no-existe"]);
});

test("verificación: no sigue enlaces simbólicos (no puede sacar archivos de fuera)", () => {
  const root = fakeSite(BASE);
  mkdirSync(join(root, "secreto"));
  writeFileSync(join(root, "secreto", "clave.png"), "x");
  symlinkSync(join(root, "secreto"), join(root, "assets", "enlace"));
  const { files } = build(join(root, "dist"), root);
  assert.ok(files.every((f) => !f.startsWith("assets/enlace")));
});
