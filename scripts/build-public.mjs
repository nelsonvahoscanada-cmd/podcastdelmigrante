/*
  scripts/build-public.mjs — Carpeta pública del sitio (dist/) para Cloudflare Pages
  ===================================================================================
  Copia a dist/ SOLO lo que forma parte del sitio, según una LISTA DE
  PERMITIDOS. Nada de docs/, db/, admin-worker/, scripts/, tests/, functions/,
  .github/ ni archivos de configuración: no existen en el sitio publicado, se
  pida la URL que se pida (doble barra, caracteres codificados, etc.).

  Cloudflare Pages (Settings → Build):
    Build command            node scripts/build-public.mjs
    Build output directory   dist
  Las Functions (/registro/*, /articulo) NO se copian: Pages las compila desde
  la carpeta functions/ de la raíz del proyecto. _routes.json sí se copia
  (Pages lo lee desde la carpeta de salida).

  Uso local:
    node scripts/build-public.mjs              genera dist/
    node scripts/build-public.mjs --out=DIR    genera en otra carpeta (pruebas)

  Al terminar VERIFICA la carpeta y falla (código 1) si:
    - aparece un archivo fuera de la lista de permitidos;
    - algún archivo contiene marcas de borrador ([PENDIENTE], [VERIFICAR]…),
      SQL, configuración interna o formatos de clave secreta;
    - una página o un script hace referencia a un archivo del repositorio que
      no se copió (la lista dejaría el sitio roto);
    - falta una URL del sitemap.

  Para publicar un tipo de archivo o una carpeta nueva hay que añadirlo aquí a
  propósito: lo que no está en la lista no se publica.
*/
import { readdirSync, lstatSync, mkdirSync, copyFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, extname, relative, sep, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Archivos sueltos de la raíz */
const ROOT_FILES = ["_routes.json", "_headers", "_redirects", "robots.txt", "sitemap.xml", "favicon.ico"];
/* Páginas de la raíz: index.html, articulo-….html, perfil-….html, 404.html… */
const ROOT_PAGE = /^[a-z0-9][a-z0-9-]*\.html$/;
/* Carpetas públicas y los tipos de archivo que se publican de cada una */
const MEDIA = ["png", "jpg", "jpeg", "webp", "avif", "gif", "svg", "ico"];
const DIRS = {
  assets: [...MEDIA, "pdf", "woff2", "woff"],
  css: ["css"],
  js: ["js"],
  vcard: ["vcf"],
  "guia-carlos": ["html", ...MEDIA],
  "canada-en-datos": ["html"], /* Canadá en Datos: páginas generadas por scripts/build-canada-datos.mjs */
  "desafio-100-empresas": ["html"], /* Desafío 100 Empresas: páginas generadas por scripts/build-desafio.mjs */
};
/* Material de origen dentro de carpetas públicas que el sitio no usa
   (p. ej. fotos originales en alta resolución de clientes). */
const EXCLUDE_DIRS = ["assets/originals"];
/* Licencias que deben acompañar a las tipografías (OFL) */
const LICENSE_FILE = /^LICENSE[-A-Za-z0-9]*\.txt$/;

/* Contenido que nunca debe publicarse */
const FORBIDDEN = [
  [/\[(PENDIENTE|VERIFICAR|PENDING|VERIFY)\b/, "marca de borrador"],
  [/\bCREATE (TABLE|INDEX)\b/, "SQL"],
  [/\bdatabase_id\b|\bkeep_vars\b|\bADMIN_EMAILS\b/, "configuración interna"],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/, "formato de clave de Resend"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "clave privada"],
  [/\b(CLOUDFLARE_API_TOKEN|RESEND_API_KEY|TURNSTILE_SECRET_KEY|IP_HASH_SALT)\s*[=:]\s*["']?[A-Za-z0-9_-]{8,}/, "secreto con valor"],
];
const TEXT_EXT = new Set(["html", "css", "js", "svg", "vcf", "txt", "json", "xml"]);

const toPosix = (p) => p.split(sep).join("/");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue; /* nada oculto: .env, .dev.vars, .git… */
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue; /* sin enlaces que salgan del proyecto */
    if (st.isDirectory()) out.push(...walk(p));
    else if (st.isFile()) out.push(p);
  }
  return out;
}

/* Lista de archivos públicos (rutas relativas, con «/») */
export function publicFiles(root = ROOT) {
  const files = [];
  for (const name of readdirSync(root)) {
    const p = join(root, name);
    const st = lstatSync(p);
    if (!st.isFile()) continue;
    if (ROOT_FILES.includes(name) || ROOT_PAGE.test(name)) files.push(name);
  }
  for (const [dir, exts] of Object.entries(DIRS)) {
    const base = join(root, dir);
    if (!existsSync(base)) continue;
    for (const f of walk(base)) {
      const rel = toPosix(relative(root, f));
      if (EXCLUDE_DIRS.some((d) => rel.startsWith(d + "/"))) continue;
      const name = posix.basename(rel);
      const ext = extname(name).slice(1).toLowerCase();
      if (exts.includes(ext) || (dir === "assets" && LICENSE_FILE.test(name))) files.push(rel);
    }
  }
  return files.sort();
}

/* ---------- Verificación de la carpeta generada ---------- */
function isAllowed(rel) {
  const parts = rel.split("/");
  if (parts.some((s) => s.startsWith("."))) return false;
  if (parts.length === 1) return ROOT_FILES.includes(rel) || ROOT_PAGE.test(rel);
  const exts = DIRS[parts[0]];
  if (!exts || EXCLUDE_DIRS.some((d) => rel.startsWith(d + "/"))) return false;
  const name = parts[parts.length - 1];
  return exts.includes(extname(name).slice(1).toLowerCase()) || (parts[0] === "assets" && LICENSE_FILE.test(name));
}

/* Referencias locales de un archivo (sin consultas ni anclas) */
function localRefs(rel, text) {
  const refs = [];
  const add = (u, base) => {
    u = u.trim();
    if (!u || /^(?:[a-z]+:|\/\/|#|data:)/i.test(u) || u.includes("${") || u.includes("{{")) return;
    u = u.split("#")[0].split("?")[0];
    if (!u) return;
    try {
      u = decodeURI(u);
    } catch (e) {
      /* se deja tal cual */
    }
    refs.push(u.startsWith("/") ? posix.normalize(u.slice(1)) : posix.normalize(posix.join(posix.dirname(base), u)));
  };
  if (rel.endsWith(".html")) {
    for (const m of text.matchAll(/\s(?:href|src|poster|data-src)\s*=\s*["']([^"']+)["']/gi)) add(m[1], rel);
    for (const m of text.matchAll(/\ssrcset\s*=\s*["']([^"']+)["']/gi)) for (const part of m[1].split(",")) add(part.trim().split(/\s+/)[0], rel);
  }
  if (rel.endsWith(".css") || rel.endsWith(".html")) {
    for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(m[1], rel);
  }
  if (rel.endsWith(".js")) {
    /* Rutas de archivos dentro de cadenas de los scripts (se resuelven desde la raíz del sitio) */
    for (const m of text.matchAll(/["'`]\/?((?:assets|css|js|vcard|guia-carlos)\/[^"'`\s)]+)["'`]/g)) add("/" + m[1], rel);
  }
  return refs;
}

/* Resuelve como Cloudflare Pages: «x» → x.html, «dir/» → dir/index.html */
function resolves(rel, has) {
  if (rel === "." || rel === "") return has("index.html");
  if (has(rel)) return true;
  const clean = rel.replace(/\/$/, "");
  return has(clean + ".html") || has(clean + "/index.html");
}

export function verify(outDir, root = ROOT) {
  const problems = [];
  const files = walk(outDir).map((f) => toPosix(relative(outDir, f)));
  const inOut = new Set(files);
  const has = (p) => inOut.has(p);
  const inRepo = (p) => existsSync(join(root, ...p.split("/")));
  for (const rel of files) {
    if (!isAllowed(rel)) problems.push(`no permitido: ${rel}`);
    const ext = extname(rel).slice(1).toLowerCase();
    if (!TEXT_EXT.has(ext)) continue;
    const text = readFileSync(join(outDir, ...rel.split("/")), "utf8");
    for (const [re, label] of FORBIDDEN) if (re.test(text)) problems.push(`${label} en ${rel}`);
    for (const ref of localRefs(rel, text)) {
      if (ref.startsWith("..")) continue;
      /* Solo cuenta lo que existe en el repositorio y no se copió: así se
         detecta una lista de permitidos incompleta, no enlaces ya rotos. */
      if (!resolves(ref, has) && (inRepo(ref) || inRepo(ref + ".html"))) problems.push(`falta ${ref} (usado en ${rel})`);
    }
  }
  if (has("sitemap.xml")) {
    const xml = readFileSync(join(outDir, "sitemap.xml"), "utf8");
    for (const m of xml.matchAll(/<loc>\s*https?:\/\/[^/<]+\/?([^<]*?)\s*<\/loc>/g)) {
      const path = decodeURI(m[1]).split("?")[0];
      if (!resolves(path, has)) problems.push(`sitemap: no existe /${path}`);
    }
  }
  if (!has("index.html")) problems.push("falta index.html");
  if (!has("_routes.json")) problems.push("falta _routes.json (las Functions se ejecutarían en todas las rutas)");
  return { files, problems };
}

export function build(outDir, root = ROOT) {
  rmSync(outDir, { recursive: true, force: true });
  const files = publicFiles(root);
  for (const rel of files) {
    const dest = join(outDir, ...rel.split("/"));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(root, ...rel.split("/")), dest);
  }
  return verify(outDir, root);
}

/* ---------- Línea de comandos ---------- */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  const outDir = outArg ? outArg.slice(6) : join(ROOT, "dist");
  const { files, problems } = build(outDir);
  if (problems.length) {
    console.error(`dist/: ${problems.length} problema(s). No se debe publicar:\n  - ` + problems.join("\n  - "));
    process.exit(1);
  }
  const bytes = files.reduce((n, f) => n + lstatSync(join(outDir, ...f.split("/"))).size, 0);
  console.log(`dist/ lista: ${files.length} archivos públicos (${(bytes / 1048576).toFixed(1)} MB) en ${outDir}`);
}
