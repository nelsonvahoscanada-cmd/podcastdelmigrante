/*
  Pruebas del contador público de visualizaciones:
  functions/_lib/vistas.js (GET/POST /api/vistas/ART-…) con D1 simulada
  (SQLite de Node con db/vistas), la lista generada de artículos con
  contador y su integración en las páginas.
  Ejecutar:  node --test tests/*.test.mjs
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
import { ARTICULOS_CON_CONTADOR } from "../functions/_lib/published-articles.js";
import { leerVistas, registrarVista, esRobot, diaAlberta, LIMITE_POR_VENTANA, VENTANA_MS } from "../functions/_lib/vistas.js";
import { onRequest, onRequestGet, onRequestPost } from "../functions/api/vistas/[id].js";
import { fakeD1 } from "./helpers/fake-cloudflare.mjs";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const ctx = {};
vm.runInNewContext(read("js/articles.js") + ";globalThis.A = ARTICLES;", ctx);
const ARTS = Array.from(ctx.A);

const SITIO = "https://podcastdelmigrante.com";
const HECTOR = "ART-2026-029";
const CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const T0 = Date.parse("2026-10-26T16:00:00Z");

function entorno(extra = {}) {
  return { VISTAS_DB: fakeD1({ base: "vistas" }), VISTAS_SAL: "sal-de-prueba", ...extra };
}
function post(id, { host = "podcastdelmigrante.com", origin, ua = CHROME, ip = "203.0.113.7", body, type = "application/json", headers = {}, cf } = {}) {
  const url = `https://${host}/api/vistas/${id}`;
  const h = { "Content-Type": type, "User-Agent": ua, "CF-Connecting-IP": ip, ...headers };
  if (origin !== null) h.Origin = origin || `https://${host}`;
  const req = new Request(url, { method: "POST", headers: h, body: body !== undefined ? body : JSON.stringify({ id }) });
  if (cf) Object.defineProperty(req, "cf", { value: cf });
  return req;
}
const get = (id, host = "podcastdelmigrante.com") => new Request(`https://${host}/api/vistas/${id}`);
const filas = (env, sql) => env.VISTAS_DB._db.prepare(sql).all();
async function total(env, id = HECTOR) {
  const r = await leerVistas(get(id), env, id);
  return (await r.json()).vistas;
}

/* ---------- Cobertura ---------- */
test("lista generada: las 18 noticias y 8 guías publicadas, y nada más", () => {
  const esperados = ARTS.filter((a) => ["Noticia", "Guía"].includes(a.contentType) && !a.draft && a.demo !== true).map((a) => a.id);
  assert.deepEqual([...ARTICULOS_CON_CONTADOR].sort(), [...esperados].sort());
  assert.equal(ARTS.filter((a) => a.contentType === "Noticia" && ARTICULOS_CON_CONTADOR.has(a.id)).length, 18);
  assert.equal(ARTS.filter((a) => a.contentType === "Guía" && ARTICULOS_CON_CONTADOR.has(a.id)).length, 8);
  assert.ok(ARTICULOS_CON_CONTADOR.has(HECTOR), "la entrevista de Héctor Rivero, clasificada como Noticia");
  for (const a of ARTS.filter((x) => !["Noticia", "Guía"].includes(x.contentType))) assert.ok(!ARTICULOS_CON_CONTADOR.has(a.id), `${a.id} (${a.contentType}) sin contador`);
});

test("misma regla en el generador y en js/article.js; el hueco y el script están en todas las páginas con contador", () => {
  assert.match(read("scripts/build-article-pages.mjs"), /const TIPOS_CON_CONTADOR = \["Noticia", "Guía"\];/);
  assert.match(read("js/article.js"), /const TIPOS_CON_CONTADOR = \["Noticia", "Guía"\];/);
  assert.match(read("articulo.html"), /<script src="js\/article\.js"><\/script>\n<script src="js\/vistas\.js"><\/script>/);
  const paginas = readdirSync(new URL(".", ROOT)).filter((f) => /^articulo-.+\.html$/.test(f));
  assert.equal(paginas.length, 30);
  for (const f of paginas) assert.match(read(f), /<script src="js\/vistas\.js"><\/script>/, f);
});

test("el contador no se dibuja en el HTML que leen Facebook y WhatsApp (solo en el navegador)", () => {
  const html = read("articulo-hector-rivero-santa-latino-canada.html");
  assert.doesNotMatch(html, /visualizaci/);
  assert.match(html, /property="og:image" content="https:\/\/podcastdelmigrante\.com\/assets\/social\/hector-rivero-santa-latino-canada\.jpg"/);
});

/* ---------- Conteo ---------- */
test("una visualización válida suma 1 y fija la fecha de inicio de la medición", async () => {
  const env = entorno();
  assert.equal(await total(env), 0);
  const r = await registrarVista(post(HECTOR), env, HECTOR, T0);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { contado: true });
  const g = await (await leerVistas(get(HECTOR), env, HECTOR)).json();
  assert.equal(g.vistas, 1);
  assert.equal(g.inicio, new Date(T0).toISOString());
  assert.deepEqual(filas(env, "SELECT dia, article_id, vistas FROM vistas_dia").map((x) => ({ ...x })), [{ dia: "2026-10-26", article_id: HECTOR, vistas: 1 }]);
  /* El inicio no cambia con conteos posteriores */
  await registrarVista(post(HECTOR, { ip: "203.0.113.8" }), env, HECTOR, T0 + 3600e3);
  assert.equal((await (await leerVistas(get(HECTOR), env, HECTOR)).json()).inicio, new Date(T0).toISOString());
});

test("recargas: el mismo navegador cuenta una vez cada 30 minutos por noticia", async () => {
  const env = entorno();
  for (let i = 0; i < 5; i++) await registrarVista(post(HECTOR), env, HECTOR, T0 + i * 60e3);
  assert.equal(await total(env), 1);
  await registrarVista(post(HECTOR), env, HECTOR, T0 + VENTANA_MS - 1000);
  assert.equal(await total(env), 1, "dentro de la ventana");
  await registrarVista(post(HECTOR), env, HECTOR, T0 + VENTANA_MS + 1000);
  assert.equal(await total(env), 2, "pasada la ventana");
  /* Otra noticia, otra persona: cuentan aparte */
  await registrarVista(post("ART-2026-030"), env, "ART-2026-030", T0);
  await registrarVista(post(HECTOR, { ip: "198.51.100.4" }), env, HECTOR, T0);
  assert.equal(await total(env), 3);
  assert.equal(await total(env, "ART-2026-030"), 1);
});

test("vistas previas, otros dominios e identificadores inexistentes no registran nada", async () => {
  const env = entorno();
  for (const host of ["abc123.podcastdelmigrante.pages.dev", "podcastdelmigrante.pages.dev", "otro-sitio.com", "127.0.0.1"]) {
    const r = await registrarVista(post(HECTOR, { host }), env, HECTOR, T0);
    assert.equal(r.status, 403, host);
    assert.equal((await leerVistas(get(HECTOR, host), env, HECTOR)).status, 404, `GET en ${host}`);
  }
  for (const id of ["ART-2099-999", "ART-2026-024", "ART-2026-016", "art-2026-029", "1", "../../x", ""]) {
    assert.equal((await registrarVista(post(id), env, id, T0)).status, 404, id);
    assert.equal((await leerVistas(get(id), env, id)).status, 404, `GET ${id}`);
  }
  assert.equal(filas(env, "SELECT COUNT(*) AS n FROM vistas_total")[0].n, 0);
  assert.equal(filas(env, "SELECT COUNT(*) AS n FROM vistas_reciente")[0].n, 0);
});

test("robots y generadores de vistas previas no cuentan; los navegadores de las apps sí", async () => {
  const env = entorno();
  const robots = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0 Safari/537.36",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "WhatsApp/2.23.20.0 A",
    "Twitterbot/1.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36",
    "Mozilla/5.0 (compatible; LinkedInBot/1.0)",
    "curl/8.5.0",
    "python-requests/2.31",
    "",
  ];
  for (const ua of robots) {
    assert.equal(esRobot(ua), true, ua);
    const r = await registrarVista(post(HECTOR, { ua, ip: "203.0.113." + robots.indexOf(ua) }), env, HECTOR, T0);
    assert.equal((await r.json()).contado, false, ua);
  }
  assert.equal(await total(env), 0);
  assert.equal(esRobot(CHROME, { verifiedBotCategory: "Search Engine Crawler" }), true, "robot verificado por Cloudflare");

  const personas = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.98;FBBV/123]",
    "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36 Instagram 330.0.0.40.92 Android",
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 trill_340002 BytedanceWebview/d8a21c6",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  ];
  for (const ua of personas) assert.equal(esRobot(ua), false, ua);
});

test("no se puede manipular: origen ajeno, formato incorrecto o un número enviado no cambian el contador", async () => {
  const env = entorno();
  const casos = [
    [post(HECTOR, { origin: "https://otro-sitio.com" }), 403],
    [post(HECTOR, { origin: null }), 403],
    [post(HECTOR, { headers: { "Sec-Fetch-Site": "cross-site" } }), 403],
    [post(HECTOR, { type: "text/plain" }), 415],
    [post(HECTOR, { body: JSON.stringify({ id: HECTOR, relleno: "x".repeat(400) }) }), 413],
    [post(HECTOR, { body: JSON.stringify({ id: "ART-2026-030" }) }), 400],
    [post(HECTOR, { body: "no es json" }), 400],
  ];
  for (const [req, status] of casos) assert.equal((await registrarVista(req, env, HECTOR, T0)).status, status);
  assert.equal(await total(env), 0);
  /* Un valor enviado por el navegador se ignora: el servidor solo suma 1 */
  await registrarVista(post(HECTOR, { body: JSON.stringify({ id: HECTOR, vistas: 999999 }) }), env, HECTOR, T0);
  assert.equal(await total(env), 1);
  /* Otros métodos */
  assert.equal(onRequest().status, 405);
});

test("límite de frecuencia por navegador: como máximo 20 noticias distintas cada 30 minutos", async () => {
  const env = entorno();
  const ids = [...ARTICULOS_CON_CONTADOR];
  const contados = [];
  for (const id of ids) contados.push((await registrarVista(post(id), env, id, T0)).status);
  assert.equal(contados.filter((s) => s === 200).length, LIMITE_POR_VENTANA);
  assert.ok(contados.slice(LIMITE_POR_VENTANA).every((s) => s === 429));
});

test("privacidad: no se guarda la IP, el navegador ni nada que identifique a la persona; las huellas vencen", async () => {
  const env = entorno();
  const ip = "203.0.113.77";
  await registrarVista(post(HECTOR, { ip }), env, HECTOR, T0);
  const todo = JSON.stringify(["vistas_total", "vistas_dia", "vistas_reciente", "vistas_config"].map((t) => filas(env, `SELECT * FROM ${t}`)));
  assert.ok(!todo.includes(ip) && !todo.includes("iPhone"), "sin IP ni User-Agent");
  assert.match(filas(env, "SELECT huella FROM vistas_reciente")[0].huella, /^[0-9a-f]{64}$/);
  /* Pasados 30 minutos, el siguiente registro borra las huellas vencidas */
  await registrarVista(post("ART-2026-030", { ip: "198.51.100.1" }), env, "ART-2026-030", T0 + VENTANA_MS + 1);
  assert.equal(filas(env, "SELECT COUNT(*) AS n FROM vistas_reciente")[0].n, 1);
});

test("día en hora de Alberta, no en UTC", () => {
  /* 23:30 del 31 de octubre en Alberta ya es 1 de noviembre en UTC */
  assert.equal(diaAlberta(Date.parse("2026-11-01T05:30:00Z")), "2026-10-31");
  assert.equal(diaAlberta(Date.parse("2026-11-01T06:30:00Z")), "2026-11-01");
  /* Misma regla que Intl con la zona de Alberta, sea cual sea su horario vigente */
  const ms = Date.parse("2026-12-01T06:59:00Z");
  assert.equal(diaAlberta(ms), new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton" }).format(new Date(ms)));
});

test("fallos del servicio: sin base, sin sal o con D1 caída responde 503 sin romper nada", async () => {
  assert.equal((await leerVistas(get(HECTOR), {}, HECTOR)).status, 503);
  assert.equal((await registrarVista(post(HECTOR), {}, HECTOR, T0)).status, 503);
  const sinSal = entorno({ VISTAS_SAL: "" });
  assert.equal((await registrarVista(post(HECTOR), sinSal, HECTOR, T0)).status, 503);
  const caida = { VISTAS_SAL: "x", VISTAS_DB: { prepare() { throw new Error("D1 no disponible"); }, batch() { throw new Error("D1 no disponible"); } } };
  const errores = [];
  const original = console.error;
  console.error = (...a) => errores.push(a.join(" "));
  try {
    assert.equal((await leerVistas(get(HECTOR), caida, HECTOR)).status, 503);
    assert.equal((await registrarVista(post(HECTOR), caida, HECTOR, T0)).status, 503);
  } finally {
    console.error = original;
  }
  assert.equal(errores.length, 2, "el error queda registrado");
  assert.ok(errores.every((e) => !e.includes("203.0.113")), "sin datos personales en el registro");
});

test("la Function de Pages enlaza GET y POST con la lógica", async () => {
  const env = entorno();
  const r = await onRequestPost({ request: post(HECTOR), env, params: { id: HECTOR } });
  assert.equal(r.status, 200);
  const g = await onRequestGet({ request: get(HECTOR), env, params: { id: HECTOR } });
  assert.equal((await g.json()).vistas, 1);
  assert.match(g.headers.get("Cache-Control"), /s-maxage=60/);
});

test("las pruebas locales solo se habilitan en 127.0.0.1 con VISTAS_PRUEBAS_LOCAL=1", async () => {
  const env = entorno({ VISTAS_PRUEBAS_LOCAL: "1" });
  assert.equal((await registrarVista(post(HECTOR, { host: "127.0.0.1" }), env, HECTOR, T0)).status, 200);
  assert.equal((await registrarVista(post(HECTOR, { host: "abc.podcastdelmigrante.pages.dev" }), env, HECTOR, T0)).status, 403);
});
