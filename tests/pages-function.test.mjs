/*
  Pruebas de functions/_middleware.js (Cloudflare Pages Function):
  /articulo?slug=X  →  301 /articulo-X
  Ejecutar:  node --test tests/*.test.mjs
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { onRequest } from "../functions/_middleware.js";

const ROOT = new URL("../", import.meta.url);

/* Contexto de Pages simulado. ASSETS responde 200 a TODO, como Cloudflare
   Pages sin 404.html: la función no debe fiarse de él. */
function ctx(path, method = "GET") {
  let nextCalled = false;
  return {
    request: new Request("https://podcastdelmigrante.com" + path, { method }),
    env: {
      ASSETS: {
        fetch: async (req) => {
          const p = new URL(req.url).pathname.replace(/^\//, "");
          return new Response(null, { status: 200 });
        },
      },
    },
    next: async () => { nextCalled = true; return new Response("plantilla", { status: 200 }); },
    get nextCalled() { return nextCalled; },
  };
}

test("/articulo?slug=X → 301 a la página propia de la noticia", async () => {
  const c = ctx("/articulo?slug=ayuda-pagar-arriendo-alberta");
  const r = await onRequest(c);
  assert.equal(r.status, 301);
  assert.equal(r.headers.get("Location"), "/articulo-ayuda-pagar-arriendo-alberta");
});

test("/articulo.html?slug=X también redirige y conserva UTM", async () => {
  const r = await onRequest(ctx("/articulo.html?slug=plan-dental-canada-cdcp&utm_source=facebook&utm_medium=social"));
  assert.equal(r.status, 301);
  assert.equal(r.headers.get("Location"), "/articulo-plan-dental-canada-cdcp?utm_source=facebook&utm_medium=social");
});

test("slug inexistente o no válido → plantilla sin redirección", async () => {
  for (const p of ["/articulo?slug=no-existe-esta-noticia", "/articulo?slug=../../etc", "/articulo?slug=", "/articulo"]) {
    const c = ctx(p);
    const r = await onRequest(c);
    assert.equal(r.status, 200, p);
    assert.equal(c.nextCalled, true, p);
  }
});

test("otras rutas y métodos no se tocan", async () => {
  for (const [p, m] of [["/index.html", "GET"], ["/api/events?slug=x", "POST"], ["/perfil-tomas-velazquez", "GET"], ["/articulo?slug=plan-dental-canada-cdcp", "POST"]]) {
    const c = ctx(p, m);
    await onRequest(c);
    assert.equal(c.nextCalled, true, p);
  }
});

test("la lista de publicados coincide con las páginas generadas", async () => {
  const { PUBLISHED_ARTICLES } = await import("../functions/_lib/published-articles.js");
  assert.ok(PUBLISHED_ARTICLES.size >= 5);
  for (const slug of PUBLISHED_ARTICLES) assert.ok(existsSync(new URL(`articulo-${slug}.html`, ROOT)), slug);
});

test("_routes.json limita las funciones a la plantilla de artículos, al registro y a las carpetas internas", () => {
  const routes = JSON.parse(readFileSync(new URL("_routes.json", ROOT), "utf8"));
  assert.equal(routes.version, 1);
  assert.deepEqual([...routes.include].sort(), ["/articulo", "/articulo.html", "/articulo/", "/registro/*", "/admin-worker/*", "/db/*", "/docs/*", "/tests/*", "/scripts/*", "/functions/*", "/.github/*"].sort());
});

test("carpetas internas del repositorio → 404 (no forman parte del sitio)", async () => {
  for (const p of ["/admin-worker/wrangler.toml", "/admin-worker/src/auth.js", "/db/directorio/0001_solicitudes.sql", "/docs/directorio-solicitudes.md", "/tests/solicitud.test.mjs", "/scripts/build-qr-images.py", "/functions/registro/enviar.js", "/.github/workflows/registro-empresas.yml", "/docs"]) {
    const c = ctx(p);
    const r = await onRequest(c);
    assert.equal(r.status, 404, p);
    assert.equal(c.nextCalled, false, p);
    assert.equal(r.headers.get("X-Robots-Tag"), "noindex");
  }
  for (const p of ["/js/directorio/solicitud-core.js", "/assets/logo.png", "/registro/config", "/documentos", "/dbx"]) {
    const c = ctx(p);
    await onRequest(c);
    assert.equal(c.nextCalled, true, `${p} sigue sirviéndose`);
  }
});
