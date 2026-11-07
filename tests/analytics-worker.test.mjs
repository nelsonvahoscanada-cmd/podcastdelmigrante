/* Worker de estadísticas (analytics-worker/src/worker.js): acepta y guarda
   los eventos de los cuatro perfiles Premium publicados, con los eventos que
   la plantilla emite; rechaza empresas, slugs y eventos no válidos. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import worker from "../analytics-worker/src/worker.js";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const ctx = {};
vm.runInNewContext(read("js/businesses.js") + ";globalThis.B = BUSINESSES;", ctx);
const PUBLISHED = JSON.parse(JSON.stringify(ctx.B.filter((b) => b.published && b.plan !== "gratuito").map((b) => [b.id, b.slug])));

function fakeDb() {
  const rows = [];
  return { rows, prepare: (sql) => ({ bind: (...v) => ({ run: async () => { rows.push({ sql, v }); return { success: true }; } }), all: async () => ({ results: [] }) }) };
}
let ip = 0;
async function send(payload, env, headers = {}) {
  const req = new Request("https://podcastdelmigrante.com/api/events", {
    method: "POST",
    headers: Object.assign({ Origin: "https://podcastdelmigrante.com", "Content-Type": "text/plain;charset=UTF-8", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1", "CF-Connecting-IP": `203.0.113.${++ip % 250}` }, headers),
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
  return worker.fetch(req, env);
}

test("BUSINESSES coincide con los perfiles Premium publicados (BIZ-001…BIZ-004)", () => {
  const src = read("analytics-worker/src/worker.js");
  const map = Object.fromEntries([...src.matchAll(/"(BIZ-\d{3})": "([a-z0-9-]+)"/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(map, Object.fromEntries(PUBLISHED));
  assert.deepEqual(Object.keys(map), ["BIZ-001", "BIZ-002", "BIZ-003", "BIZ-004"]);
});

test("guarda profile_view de cada perfil con su id y slug oficiales", async () => {
  for (const [id, slug] of PUBLISHED) {
    const env = { DB: fakeDb() };
    const r = await send({ event: "profile_view", business_id: id, business: slug, page: `/perfil-${slug}`, referrer: "instagram.com" }, env);
    assert.equal(r.status, 204, id);
    assert.equal(env.DB.rows.length, 1, id);
    const v = env.DB.rows[0].v;
    assert.deepEqual([v[1], v[2], v[3], v[5], v[6], v[11]], ["profile_view", id, slug, `/perfil-${slug}`, "instagram.com", "mobile"]);
  }
});

test("acepta todos los eventos que emite la plantilla del perfil", async () => {
  const src = read("js/business-profile.js") + read("js/business-directory.js");
  const emitted = new Set([...src.matchAll(/(?:data-track="|track: "|track\(")([a-z_]+)"/g)].map((m) => m[1]).filter((e) => e !== "evento"));
  for (const k of ["instagram", "tiktok", "facebook", "linkedin"]) emitted.add(`${k}_click`);
  for (const e of ["profile_view", "video_start", "vcard_download", "qr_profile_download", "qr_contact_download", "email_click", "phone_click", "whatsapp_click"]) assert.ok(emitted.has(e), e);
  for (const e of emitted) {
    const env = { DB: fakeDb() };
    const r = await send({ event: e, business_id: "BIZ-003", business: "santa-latino", target: "x" }, env);
    assert.equal(r.status, 204, e);
  }
});

test("rechaza sin escribir: empresa desconocida, slug que no coincide, evento no válido, origen ajeno", async () => {
  const cases = [
    [{ event: "profile_view", business_id: "BIZ-999", business: "x" }, {}, 400, "business_not_allowed"],
    [{ event: "profile_view", business_id: "BIZ-004", business: "santa-latino" }, {}, 400, "business_mismatch"],
    [{ event: "zz_prueba", business_id: "BIZ-003", business: "santa-latino" }, {}, 400, "event_not_allowed"],
    [{ event: "profile_view", business_id: "BIZ-003", business: "santa-latino" }, { Origin: "https://otro.com" }, 403, "origin_not_allowed"],
  ];
  for (const [p, h, status, error] of cases) {
    const env = { DB: fakeDb() };
    const r = await send(p, env, h);
    assert.equal(r.status, status, error);
    assert.equal((await r.json()).error, error);
    assert.equal(env.DB.rows.length, 0, error);
  }
});

test("solo inserta (nunca borra ni modifica filas existentes)", () => {
  const src = read("analytics-worker/src/worker.js");
  assert.match(src, /INSERT INTO events/);
  assert.doesNotMatch(src, /\b(DELETE|UPDATE|DROP|ALTER)\b/);
});
