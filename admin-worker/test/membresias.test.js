/*
  Panel: invitaciones empresariales y membresías (Worker completo con D1
  simulado e identidad de desarrollo local).
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";
import { createInvitation, membershipAction, prepareSchema } from "../src/membresias.js";
import { hashCode, CODE_RE } from "../../js/directorio/membresias-core.js";
import { fakeD1 } from "../../tests/helpers/fake-cloudflare.mjs";

const ORIGIN = "https://admin.podcastdelmigrante.com";
const SEED = readFileSync(new URL("./fixtures/seed.sql", import.meta.url), "utf8");

function env(dbOptions) {
  const analytics = fakeD1({ upTo: "0000" });
  analytics._db.exec(SEED);
  return { DIRECTORIO_DB: fakeD1(dbOptions), DB: analytics, ALLOW_LOCAL_DEV: "1", ASSETS: { fetch: async () => new Response("asset") } };
}
const req = (path, init = {}) => new Request(ORIGIN + path, Object.assign({}, init, { headers: Object.assign({ "CF-Connecting-IP": "127.0.0.1" }, init.headers || {}) }));
const post = (path, body, headers = {}) => req(path, { method: "POST", headers: Object.assign({ "Content-Type": "application/json", Origin: ORIGIN }, headers), body: JSON.stringify(body) });
const call = async (e, r) => {
  const res = await worker.fetch(r, e);
  return { res, body: await res.json().catch(() => ({})) };
};
const sql = (e, q, ...a) => e.DIRECTORIO_DB._db.prepare(q).all(...a);

/* Simula el canje hecho por el sitio (/registro/enviar) */
function redeem(e, invitationId, memId = "MEM-20261104-AAAAAA") {
  const now = new Date().toISOString();
  e.DIRECTORIO_DB._db.prepare("INSERT INTO business_memberships (id, plan, status, business_name, application_id, invitation_id, created_at, updated_at, updated_by) SELECT ?, kind, 'en_revision', business_name, 'SOL-20261104-AAAAAA', id, ?, ?, 'formulario' FROM business_invitations WHERE id = ?").run(memId, now, now, invitationId);
  e.DIRECTORIO_DB._db.prepare("UPDATE business_invitations SET status = 'usada', used_at = ?, application_id = 'SOL-20261104-AAAAAA' WHERE id = ?").run(now, invitationId);
  return memId;
}

test("solo con identidad verificada: sin Access → 403 en la API y en la página", async () => {
  const e = env();
  delete e.ALLOW_LOCAL_DEV;
  assert.equal((await worker.fetch(req("/api/invitaciones"), e)).status, 403);
  assert.equal((await worker.fetch(post("/api/invitaciones", { kind: "PREMIUM_GIFT", businessName: "X" }), e)).status, 403);
  assert.equal((await worker.fetch(req("/invitaciones"), e)).status, 403);
  /* Desde una IP que no es local, la identidad de desarrollo no vale */
  const e2 = env();
  assert.equal((await worker.fetch(new Request(ORIGIN + "/api/invitaciones", { headers: { "CF-Connecting-IP": "198.51.100.9" } }), e2)).status, 403);
});

test("solo administradores: las funciones rechazan un rol distinto", async () => {
  const e = env();
  const viewer = { email: "otro@example.com", role: "viewer" };
  assert.equal((await createInvitation(e.DIRECTORIO_DB, { kind: "PREMIUM_GIFT", businessName: "X" }, viewer)).status, 403);
  assert.equal((await membershipAction(e.DIRECTORIO_DB, "MEM-20261104-AAAAAA", { action: "suspender", confirm: true }, viewer)).status, 403);
  assert.equal((await prepareSchema(e.DIRECTORIO_DB, { confirm: true }, viewer)).status, 403);
});

test("CSRF: otro origen o sin JSON → rechazado; métodos no permitidos → 405", async () => {
  const e = env();
  assert.equal((await worker.fetch(post("/api/invitaciones", { kind: "FREE", businessName: "X" }, { Origin: "https://evil.example" }), e)).status, 403);
  assert.equal((await worker.fetch(req("/api/invitaciones", { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "text/plain" }, body: "{}" }), e)).status, 415);
  assert.equal((await worker.fetch(req("/api/invitaciones", { method: "DELETE" }), e)).status, 405);
  assert.equal((await worker.fetch(req("/api/membresias/MEM-20261104-AAAAAA/otra", { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json" }, body: "{}" }), e)).status, 405);
});

test("tablas sin preparar: el panel lo indica, no deja crear y «Preparar tablas» exige confirmación", async () => {
  const e = env({ skip: ["0005_membresias.sql"] });
  let r = await call(e, req("/api/invitaciones"));
  assert.equal(r.res.status, 200);
  assert.equal(r.body.ready, false);
  r = await call(e, post("/api/invitaciones", { kind: "PREMIUM_GIFT", businessName: "Santa Latino" }));
  assert.equal(r.res.status, 409);
  assert.equal((await call(e, post("/api/invitaciones/instalar", {}))).res.status, 400);
  const before = sql(e, "SELECT COUNT(*) AS n FROM business_applications")[0].n;
  r = await call(e, post("/api/invitaciones/instalar", { confirm: true }));
  assert.equal(r.res.status, 200);
  assert.equal(r.body.ready, true);
  assert.equal(sql(e, "SELECT COUNT(*) AS n FROM business_applications")[0].n, before, "no toca las solicitudes");
  /* Repetirlo no tiene efecto */
  assert.equal((await call(e, post("/api/invitaciones/instalar", { confirm: true }))).res.status, 200);
});

test("crear invitación de cortesía: enlace con código una sola vez, solo la huella en D1, creador registrado", async () => {
  const e = env();
  const r = await call(e, post("/api/invitaciones", { kind: "PREMIUM_GIFT", businessName: "Santa Latino", contactName: "Héctor" }));
  assert.equal(r.res.status, 200);
  assert.equal(r.res.headers.get("Cache-Control"), "no-store");
  const m = r.body.link.match(/^https:\/\/podcastdelmigrante\.com\/invitacion#c=([A-Za-z0-9_-]+)$/);
  assert.ok(m, r.body.link);
  assert.match(m[1], CODE_RE);
  const [row] = sql(e, "SELECT * FROM business_invitations");
  assert.equal(row.kind, "PREMIUM_GIFT");
  assert.equal(row.business_name, "Santa Latino");
  assert.equal(row.contact_name, "Héctor");
  assert.equal(row.status, "pendiente");
  assert.equal(row.created_by, "local-dev@localhost");
  assert.equal(row.code_hash, await hashCode(m[1]));
  assert.ok(!JSON.stringify(sql(e, "SELECT * FROM business_invitations")).includes(m[1]));
  /* La lista nunca devuelve códigos ni huellas */
  const list = await call(e, req("/api/invitaciones"));
  assert.equal(list.body.invitations.length, 1);
  assert.ok(!JSON.stringify(list.body).includes(m[1]));
  assert.ok(!JSON.stringify(list.body).includes(row.code_hash));
  /* Validación */
  assert.equal((await call(e, post("/api/invitaciones", { kind: "OTRO", businessName: "X Y" }))).res.status, 400);
  assert.equal((await call(e, post("/api/invitaciones", { kind: "FREE", businessName: "" }))).res.status, 400);
  /* Nombre con marcas HTML: se limpian */
  const x = await call(e, post("/api/invitaciones", { kind: "FREE", businessName: "<b>Pan</b> & Café" }));
  assert.equal(x.body.invitation.business_name, " b Pan /b & Café".replace(/\s+/g, " ").trim());
});

test("revocar y renovar: solo pendientes, con confirmación; el código anterior deja de valer", async () => {
  const e = env();
  const a = await call(e, post("/api/invitaciones", { kind: "PREMIUM_GIFT", businessName: "Santa Latino" }));
  const id = a.body.invitation.id;
  const oldHash = sql(e, "SELECT code_hash FROM business_invitations")[0].code_hash;
  assert.equal((await call(e, post(`/api/invitaciones/${id}/renovar`, {}))).res.status, 400);
  const b = await call(e, post(`/api/invitaciones/${id}/renovar`, { confirm: true }));
  assert.equal(b.res.status, 200);
  assert.notEqual(b.body.link, a.body.link);
  assert.notEqual(sql(e, "SELECT code_hash FROM business_invitations")[0].code_hash, oldHash);
  assert.equal((await call(e, post(`/api/invitaciones/${id}/revocar`, {}))).res.status, 400);
  const c = await call(e, post(`/api/invitaciones/${id}/revocar`, { confirm: true }));
  assert.equal(c.res.status, 200);
  assert.equal(c.body.invitation.status, "revocada");
  assert.equal(c.body.invitation.revoked_by, "local-dev@localhost");
  assert.equal((await call(e, post(`/api/invitaciones/${id}/revocar`, { confirm: true }))).res.status, 409);
  assert.equal((await call(e, post(`/api/invitaciones/${id}/renovar`, { confirm: true }))).res.status, 409);
  assert.equal((await call(e, post("/api/invitaciones/INV-mal/revocar", { confirm: true }))).res.status, 400);
});

test("ciclo de una cortesía: activar → suspender → reactivar → retirar, sin vencimiento y sin borrar datos", async () => {
  const e = env();
  const a = await call(e, post("/api/invitaciones", { kind: "PREMIUM_GIFT", businessName: "Santa Latino", contactName: "Héctor" }));
  const memId = redeem(e, a.body.invitation.id);
  const act = (body) => call(e, post(`/api/membresias/${memId}/accion`, body));

  assert.equal((await act({ action: "activar", businessId: "BIZ-002", businessSlug: "carlos-d-castillo" })).res.status, 400, "sin confirmación");
  assert.equal((await act({ action: "activar", confirm: true, businessId: "002", businessSlug: "x" })).res.status, 400, "BIZ-id inválido");
  assert.equal((await act({ action: "suspender", confirm: true })).res.status, 409, "no se suspende lo que no está activo");
  let r = await act({ action: "activar", confirm: true, businessId: "biz-002", businessSlug: "carlos-d-castillo" });
  assert.equal(r.res.status, 200);
  assert.equal(r.body.membership.status, "activa");
  assert.equal(r.body.membership.business_id, "BIZ-002");
  assert.equal(r.body.membership.expires_at, null);
  const activatedAt = r.body.membership.activated_at;
  assert.ok(activatedAt);

  /* Estadísticas del mes de la miniweb (fixture de octubre 2026) */
  const list = await call(e, req("/api/invitaciones?month=2026-10"));
  const m = list.body.memberships[0];
  assert.equal(m.gift, true);
  assert.equal(list.body.statsAvailable, true);
  const seedViews = e.DB._db.prepare("SELECT COUNT(*) AS n FROM events WHERE business_id = 'BIZ-002' AND event = 'profile_view' AND received_at >= '2026-10-01T06:00:00.000Z' AND received_at < '2026-11-01T06:00:00.000Z'").get().n;
  const seedWa = e.DB._db.prepare("SELECT COUNT(*) AS n FROM events WHERE business_id = 'BIZ-002' AND event = 'whatsapp_click' AND received_at >= '2026-10-01T06:00:00.000Z' AND received_at < '2026-11-01T06:00:00.000Z'").get().n;
  assert.equal(m.stats.views, seedViews);
  assert.equal(m.stats.whatsapp, seedWa);
  assert.ok(m.stats.views > 0);
  assert.equal((await call(e, req("/api/invitaciones?month=2026-13"))).res.status, 400);

  assert.equal((await act({ action: "suspender", confirm: true })).body.membership.status, "suspendida");
  assert.equal((await act({ action: "suspender", confirm: true })).res.status, 409);
  r = await act({ action: "reactivar", confirm: true });
  assert.equal(r.body.membership.status, "activa");
  assert.equal(r.body.membership.activated_at, activatedAt, "la fecha de activación original se conserva");

  assert.equal((await act({ action: "retirar", confirm: true })).res.status, 400, "hay que elegir la transición");
  r = await act({ action: "retirar", confirm: true, withdrawTo: "FREE" });
  assert.equal(r.res.status, 200);
  assert.equal(r.body.membership.status, "retirada");
  assert.equal(r.body.membership.withdrawn_to, "FREE");
  assert.equal(r.body.membership.plan, "PREMIUM_GIFT", "el registro histórico no se reescribe");
  assert.equal(r.body.membership.business_id, "BIZ-002", "se conserva la miniweb vinculada");
  assert.equal(r.body.membership.application_id, "SOL-20261104-AAAAAA");
  assert.equal(e.DB._db.prepare("SELECT COUNT(*) AS n FROM events WHERE business_id = 'BIZ-002'").get().n > 0, true, "estadísticas intactas");
  assert.equal((await act({ action: "reactivar", confirm: true })).res.status, 409);

  /* Historial completo con el actor */
  const h = await call(e, req(`/api/membresias/${memId}`));
  assert.deepEqual(h.body.history.map((x) => x.action), ["creada", "activar", "suspender", "reactivar", "retirar"]);
  assert.ok(h.body.history.every((x) => x.actor === "local-dev@localhost"));
});

test("acciones inválidas o sobre membresías inexistentes", async () => {
  const e = env();
  assert.equal((await call(e, post("/api/membresias/MEM-20261104-ZZZZZZ/accion", { action: "suspender", confirm: true }))).res.status, 404);
  assert.equal((await call(e, post("/api/membresias/MEM-20261104-ZZZZZZ/accion", { action: "borrar", confirm: true }))).res.status, 400);
  assert.equal((await call(e, post("/api/membresias/x/accion", { action: "suspender", confirm: true }))).res.status, 400);
});

test("la página del panel enlaza Invitaciones y no usa scripts ni estilos en línea", () => {
  const html = readFileSync(new URL("../public/invitaciones.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>|\sstyle=|\son[a-z]+=/i);
  assert.match(html, /Copiar invitación/);
  for (const p of ["index.html", "solicitudes.html", "invitaciones.html"]) {
    assert.match(readFileSync(new URL(`../public/${p}`, import.meta.url), "utf8"), /<a href="\/invitaciones"/);
  }
  const js = readFileSync(new URL("../public/js/invitaciones.js", import.meta.url), "utf8");
  assert.doesNotMatch(js, /localStorage|sessionStorage/, "el enlace nunca se guarda en el navegador");
  /* «Nueva invitación»: solo Tipo, Negocio o empresario y Persona de contacto (sin «Atajo») */
  const form = html.match(/<form class="sol-form" id="newForm"[\s\S]*?<\/form>/)[0];
  assert.deepEqual([...form.matchAll(/name="([^"]+)"/g)].map((m) => m[1]), ["kind", "businessName", "contactName"]);
  assert.doesNotMatch(html + js, /Atajo|invNotes|<textarea/);
  assert.doesNotMatch(html + js, /Santa Latino|Héctor|prefillSanta/);
});
