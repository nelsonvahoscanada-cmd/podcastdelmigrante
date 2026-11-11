/* Worker de estadísticas (analytics-worker/src/worker.js) con lista pública
   de empresas autorizadas (negocios-premium.json, generada desde
   js/businesses.js): acepta los perfiles Premium publicados sin lista fija,
   rechaza empresas inventadas y alimenta el panel sin configuración. */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import vm from "node:vm";
import worker, { parseAuthorized, resetAuthorizedCache } from "../analytics-worker/src/worker.js";
import { listBusinesses, businessStats } from "../admin-worker/src/stats.js";
import { parseMonth } from "../admin-worker/src/period.js";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/businesses.js") + ";globalThis.B = BUSINESSES;", ctx);
const PUBLISHED = JSON.parse(JSON.stringify(ctx.B.filter((b) => b.published && b.plan !== "gratuito").map((b) => [b.id, b.slug])));
const AUTH_JSON = read("negocios-premium.json");

/* ---------- Simuladores ---------- */
/* D1 sobre SQLite real (misma tabla events que producción) */
function d1() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, event TEXT NOT NULL,
    business_id TEXT NOT NULL, business_slug TEXT NOT NULL, category TEXT, city TEXT, target TEXT, page TEXT, referrer_host TEXT,
    utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, device_type TEXT)`);
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    run: async () => (sql.prepare(q).run(...args), { success: true }),
    all: async () => ({ results: sql.prepare(q).all(...args).map((r) => ({ ...r })) }),
  });
  return { sql, prepare: (q) => stmt(q), batch: async (list) => Promise.all(list.map((s) => s.all())) };
}
/* fetch: sirve la lista pública indicada y cuenta las lecturas */
let served = AUTH_JSON, fetches = 0, failFetch = false;
globalThis.fetch = async (url) => {
  fetches++;
  assert.equal(String(url), "https://podcastdelmigrante.com/negocios-premium.json");
  if (failFetch) throw new Error("red caída");
  return new Response(served, { status: 200, headers: { "Content-Type": "application/json" } });
};
beforeEach(() => { resetAuthorizedCache(); served = AUTH_JSON; fetches = 0; failFetch = false; });

let ip = 0;
async function send(payload, env, headers = {}) {
  const req = new Request("https://podcastdelmigrante.com/api/events", {
    method: "POST",
    headers: Object.assign({ Origin: "https://podcastdelmigrante.com", "Content-Type": "text/plain;charset=UTF-8", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1", "CF-Connecting-IP": `203.0.113.${++ip % 250}` }, headers),
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
  return worker.fetch(req, env);
}

/* ---------- Fuente única ---------- */
test("negocios-premium.json = perfiles Premium publicados de js/businesses.js (BIZ-001…BIZ-004)", () => {
  const data = JSON.parse(AUTH_JSON);
  assert.deepEqual(data.businesses, Object.fromEntries(PUBLISHED));
  assert.deepEqual(Object.keys(data.businesses), ["BIZ-001", "BIZ-002", "BIZ-003", "BIZ-004"]);
  assert.match(read("scripts/build-public.mjs"), /"negocios-premium\.json"/, "se publica en el sitio");
});

test("el Worker no tiene lista fija salvo el respaldo de emergencia, igual a la lista pública actual", () => {
  const src = read("analytics-worker/src/worker.js");
  assert.doesNotMatch(src, /const BUSINESSES\b/);
  const fb = Object.fromEntries([...src.match(/FALLBACK_BUSINESSES = \{([^}]*)\}/)[1].matchAll(/"(BIZ-\d+)": "([a-z0-9-]+)"/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(fb, JSON.parse(AUTH_JSON).businesses);
});

test("parseAuthorized ignora entradas con formato no válido", () => {
  assert.deepEqual(parseAuthorized({ version: 1, businesses: { "BIZ-001": "ok-slug", "BIZ-1": "x", "BIZ-002": "Malo Slug", "<script>": "y", "BIZ-003": 5 } }), { "BIZ-001": "ok-slug" });
  assert.equal(parseAuthorized({ version: 2, businesses: { "BIZ-001": "a" } }), null);
  assert.equal(parseAuthorized(null), null);
});

/* ---------- Compatibilidad y eventos ---------- */
test("guarda los eventos de BIZ-001…BIZ-004 con id y slug oficiales", async () => {
  for (const [id, slug] of PUBLISHED) {
    const env = { DB: d1() };
    const r = await send({ event: "profile_view", business_id: id, business: slug, page: `/perfil-${slug}`, referrer: "instagram.com" }, env);
    assert.equal(r.status, 204, id);
    const rows = env.DB.sql.prepare("SELECT event, business_id, business_slug, page, referrer_host, device_type FROM events").all();
    assert.deepEqual({ ...rows[0] }, { event: "profile_view", business_id: id, business_slug: slug, page: `/perfil-${slug}`, referrer_host: "instagram.com", device_type: "mobile" });
  }
});

test("acepta todos los eventos de la plantilla: visitas, contacto, redes, video, vCard y QR", async () => {
  const src = read("js/business-profile.js");
  const emitted = new Set([...src.matchAll(/(?:data-track="|track: "|track\(")([a-z_]+)"/g)].map((m) => m[1]).filter((e) => e !== "evento"));
  for (const k of ["instagram", "tiktok", "facebook", "linkedin"]) emitted.add(`${k}_click`);
  for (const e of ["profile_view", "video_click", "video_start", "vcard_download", "qr_profile_download", "qr_contact_download", "email_click", "phone_click", "whatsapp_click"]) assert.ok(emitted.has(e), e);
  const env = { DB: d1() };
  for (const e of emitted) assert.equal((await send({ event: e, business_id: "BIZ-003", business: "santa-latino", target: "x" }, env)).status, 204, e);
  assert.equal(env.DB.sql.prepare("SELECT COUNT(*) n FROM events").get().n, emitted.size);
});

/* ---------- Seguridad ---------- */
test("rechaza sin escribir: empresa inventada, slug que no coincide, evento no válido, origen ajeno", async () => {
  const cases = [
    [{ event: "profile_view", business_id: "BIZ-999", business: "x" }, {}, 400, "business_not_allowed"],
    [{ event: "profile_view", business_id: "biz-001'--", business: "tomas-velazquez" }, {}, 400, "business_not_allowed"],
    [{ event: "profile_view", business_id: "BIZ-004", business: "santa-latino" }, {}, 400, "business_mismatch"],
    [{ event: "zz_prueba", business_id: "BIZ-003", business: "santa-latino" }, {}, 400, "event_not_allowed"],
    [{ event: "profile_view", business_id: "BIZ-003", business: "santa-latino" }, { Origin: "https://otro.com" }, 403, "origin_not_allowed"],
  ];
  for (const [p, h, status, error] of cases) {
    const env = { DB: d1() };
    const r = await send(p, env, h);
    assert.equal(r.status, status, error);
    assert.equal((await r.json()).error, error);
    assert.equal(env.DB.sql.prepare("SELECT COUNT(*) n FROM events").get().n, 0, error);
  }
});

test("ids inventados no disparan lecturas sin límite (una por minuto como mucho)", async () => {
  const env = { DB: d1() };
  for (let i = 0; i < 30; i++) await send({ event: "profile_view", business_id: `BIZ-${900 + i}`, business: "x" }, env);
  assert.equal(fetches, 1);
});

test("si la lista pública no se puede leer, sigue aceptando las empresas conocidas (respaldo)", async () => {
  failFetch = true;
  const env = { DB: d1() };
  assert.equal((await send({ event: "profile_view", business_id: "BIZ-004", business: "1juanromero1" }, env)).status, 204);
  assert.equal((await send({ event: "profile_view", business_id: "BIZ-005", business: "nuevo" }, env)).status, 400);
});

test("solo inserta (nunca borra ni modifica filas existentes)", () => {
  const src = read("analytics-worker/src/worker.js");
  assert.match(src, /INSERT INTO events/);
  assert.doesNotMatch(src, /\b(DELETE|UPDATE|DROP|ALTER)\b/);
});

/* ---------- Alta completa de BIZ-005 ---------- */
test("BIZ-005: alta en js/businesses.js → lista generada → eventos guardados → panel sin configuración", async () => {
  /* 1. Alta y publicación: copia del sitio con un perfil Premium nuevo */
  const dir = mkdtempSync(join(tmpdir(), "biz005-"));
  for (const d of ["js", "scripts", "css", "assets"]) cpSync(join(ROOT, d), join(dir, d), { recursive: true });
  for (const f of ["business-profile.html", "quien-puede-ayudarte.html", "sitemap.xml"]) cpSync(join(ROOT, f), join(dir, f));
  const src = read("js/businesses.js");
  const nuevo = `  {\n    id: "BIZ-005",\n    slug: "empresa-prueba",\n    published: true,\n    name: "Empresa de Prueba",\n    category: "salud",\n    city: "Calgary",\n    province: "Alberta",\n    phone: "+1 403 000 0000",\n    instagram: "https://www.instagram.com/empresa-prueba/",\n    seo: { title: "Empresa de Prueba", description: "Prueba" },\n  },\n];`;
  const borrador = nuevo.replace("BIZ-005", "BIZ-006").replace("empresa-prueba", "borrador").replace("published: true", "published: false");
  writeFileSync(join(dir, "js/businesses.js"), src.replace(/\n\];\s*$/, "\n" + nuevo.replace(/\n\];$/, "\n") + borrador));
  execFileSync(process.execPath, [join(dir, "scripts/build-profile-pages.mjs")], { cwd: dir, stdio: "pipe" });
  const lista = JSON.parse(readFileSync(join(dir, "negocios-premium.json"), "utf8"));
  assert.equal(lista.businesses["BIZ-005"], "empresa-prueba", "publicado → autorizado");
  assert.equal(lista.businesses["BIZ-006"], undefined, "borrador → no autorizado");
  for (const [id, slug] of PUBLISHED) assert.equal(lista.businesses[id], slug, `${id} se conserva`);

  /* 2. El Worker en producción ya tenía en memoria la lista anterior… */
  const env = { DB: d1() };
  env.DB.sql.exec("INSERT INTO events (received_at, event, business_id, business_slug) VALUES ('2026-11-02T18:00:00.000Z','profile_view','BIZ-001','tomas-velazquez')");
  assert.equal((await send({ event: "profile_view", business_id: "BIZ-001", business: "tomas-velazquez" }, env)).status, 204);
  /* …se publica BIZ-005 (sin desplegar el Worker) y pasa el minuto mínimo entre lecturas */
  served = JSON.stringify(lista);
  const realNow = Date.now;
  Date.now = () => realNow() + 61_000;
  try {
    for (const e of ["profile_view", "profile_view", "phone_click", "instagram_click", "vcard_download"]) {
      assert.equal((await send({ event: e, business_id: "BIZ-005", business: "empresa-prueba", page: "/perfil-empresa-prueba" }, env)).status, 204, e);
    }
    assert.equal((await send({ event: "profile_view", business_id: "BIZ-006", business: "borrador" }, env)).status, 400, "no publicado");
  } finally {
    Date.now = realNow;
  }

  /* 3. Panel: descubre BIZ-005 y muestra sus estadísticas; el histórico sigue */
  const empresas = await listBusinesses(env.DB);
  assert.deepEqual(empresas.map((b) => [b.business_id, b.business_slug, b.events]), [["BIZ-001", "tomas-velazquez", 2], ["BIZ-005", "empresa-prueba", 5]]);
  const mes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
  const st = await businessStats(env.DB, "BIZ-005", parseMonth(mes, "America/Edmonton"));
  assert.deepEqual(st.events, { profile_view: 2, phone_click: 1, instagram_click: 1, vcard_download: 1 });
  assert.equal(st.total_events, 5);
  assert.deepEqual(st.business_slugs, ["empresa-prueba"]);
});
