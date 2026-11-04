/*
  Pruebas de invitaciones y membresías del Directorio Empresarial (sitio):
  POST /registro/invitacion y el canje dentro de POST /registro/enviar,
  con D1 (SQLite real) y R2 simulados.
  node --test tests/membresias.test.mjs
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as m from "../js/directorio/membresias-core.js";
import { onRequestPost as checkInvitation, onRequest as invitationOther } from "../functions/registro/invitacion.js";
import { onRequestPost as enviar } from "../functions/registro/enviar.js";
import { fakeEnv, fakeD1, installFetch } from "./helpers/fake-cloudflare.mjs";

const ROOT = new URL("../", import.meta.url);
const PHOTO = new Uint8Array(readFileSync(new URL("assets/tomas-velazquez.jpg", ROOT)));

const PREMIUM = {
  plan: "premium", name: "Santa Latino", category: "vivienda", city: "Calgary", province: "Alberta",
  representative: "Héctor", summary: "Reseña de prueba.", services: "Servicios de prueba.",
  email: "prueba@example.com", whatsapp: "1 403 555 0000", imageKind: "logo",
  consentData: "on", consentRights: "on", consentPublish: "on", "cf-turnstile-response": "token-ok",
};
const FREE = {
  plan: "gratuito", name: "Ficha Libre", category: "vivienda", city: "Regina", province: "Saskatchewan",
  summary: "Descripción corta.", phone: "306 555 0101", email: "libre@example.com", imageKind: "logo",
  consentData: "on", consentRights: "on", consentPublish: "on", "cf-turnstile-response": "token-ok",
};

async function addInvitation(env, kind = "PREMIUM_GIFT", status = "pendiente", name = "Santa Latino") {
  const code = m.newCode();
  const id = m.newInvitationId();
  env.DIRECTORIO_DB._db
    .prepare("INSERT INTO business_invitations (id, kind, business_name, contact_name, code_hash, status, created_at, created_by) VALUES (?, ?, ?, 'Héctor', ?, ?, ?, 'admin@example.com')")
    .run(id, kind, name, await m.hashCode(code), status, new Date().toISOString());
  return { id, code };
}
const check = (env, body, type = "application/json") =>
  checkInvitation({ request: new Request("https://podcastdelmigrante.com/registro/invitacion", { method: "POST", headers: { "Content-Type": type }, body: JSON.stringify(body) }), env });

function form(fields, ip) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  fd.set("image", new Blob([PHOTO], { type: "image/jpeg" }), "logo.jpg");
  return new Request("https://podcastdelmigrante.com/registro/enviar", { method: "POST", body: fd, headers: { "CF-Connecting-IP": ip || "203.0.113.50" } });
}
async function send(env, fields, ip) {
  const pending = [];
  const res = await enviar({ request: form(fields, ip), env, waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  return { res, body: await res.json() };
}
const all = (env, sql, ...a) => env.DIRECTORIO_DB._db.prepare(sql).all(...a);

/* ---------- Núcleo ---------- */
test("planes internos: gratuita $0, Premium pagada $25 + impuestos, cortesía $0 sin vencimiento", () => {
  assert.deepEqual(Object.keys(m.KINDS), ["FREE", "PREMIUM_PAID", "PREMIUM_GIFT"]);
  assert.equal(m.KINDS.FREE.price, "$0 CAD");
  assert.equal(m.KINDS.PREMIUM_PAID.price, "$25 CAD al mes + impuestos aplicables");
  assert.match(m.KINDS.PREMIUM_GIFT.price, /^\$0 CAD, sin mensualidad y sin vencimiento$/);
  assert.equal(m.planForKind("PREMIUM_GIFT"), "premium");
  assert.equal(m.planForKind("FREE"), "gratuito");
});

test("códigos: 32 caracteres base64url, únicos; solo se guarda la huella; enlace con el código tras «#»", async () => {
  const codes = new Set(Array.from({ length: 200 }, () => m.newCode()));
  assert.equal(codes.size, 200);
  for (const c of codes) assert.match(c, m.CODE_RE);
  const c = [...codes][0];
  const h = await m.hashCode(c);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.ok(!h.includes(c));
  assert.equal(m.invitationLink(c), `https://podcastdelmigrante.com/invitacion#c=${c}`);
  assert.match(m.newInvitationId(new Date("2026-11-04T10:00:00Z")), /^INV-20261104-[A-Z2-9]{6}$/);
});

test("la migración 0005 coincide con el esquema del código y solo crea tablas nuevas", () => {
  const sql = readFileSync(new URL("db/directorio/0005_membresias.sql", ROOT), "utf8");
  for (const stmt of m.SCHEMA) assert.ok(sql.includes(stmt), stmt.slice(0, 60));
  const code = sql.replace(/--.*$/gm, "");
  assert.doesNotMatch(code, /\b(DROP|ALTER|DELETE|UPDATE)\b/i, "sin cambios sobre tablas o filas existentes");
  assert.equal((code.match(/CREATE (TABLE|INDEX) IF NOT EXISTS/g) || []).length, m.SCHEMA.length);
});

/* ---------- POST /registro/invitacion ---------- */
test("invitación válida: devuelve tipo y precio, sin devolver el código ni la huella", async () => {
  const env = fakeEnv();
  const { code } = await addInvitation(env);
  const res = await check(env, { code });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(res.headers.get("X-Robots-Tag"), "noindex");
  const body = await res.json();
  assert.deepEqual(
    { kind: body.kind, plan: body.plan, businessName: body.businessName, contactName: body.contactName, registroAbierto: body.registroAbierto },
    { kind: "PREMIUM_GIFT", plan: "premium", businessName: "Santa Latino", contactName: "Héctor", registroAbierto: true }
  );
  assert.ok(!JSON.stringify(body).includes(code));
  assert.ok(!JSON.stringify(body).includes(await m.hashCode(code)));
  /* Comprobar no canjea */
  assert.equal(all(env, "SELECT status FROM business_invitations")[0].status, "pendiente");
});

test("invitación: inexistente o mal formada → 404; usada o revocada → 410; tablas sin preparar → 503", async () => {
  const env = fakeEnv();
  assert.equal((await check(env, { code: m.newCode() })).status, 404);
  assert.equal((await check(env, { code: "corto" })).status, 404);
  assert.equal((await check(env, { code: "' OR 1=1 --" + "x".repeat(21) })).status, 404);
  assert.equal((await check(env, {})).status, 404);
  const used = await addInvitation(env, "PREMIUM_GIFT", "usada");
  const r1 = await check(env, { code: used.code });
  assert.equal(r1.status, 410);
  assert.equal((await r1.json()).code, "usada");
  const revoked = await addInvitation(env, "PREMIUM_GIFT", "revocada");
  const r2 = await check(env, { code: revoked.code });
  assert.equal(r2.status, 410);
  assert.equal((await r2.json()).code, "retirada");
  assert.equal((await check(env, { code: used.code }, "text/plain")).status, 415);
  const sin = fakeEnv({ DIRECTORIO_DB: fakeD1({ skip: ["0005_membresias.sql"] }) });
  const r3 = await check(sin, { code: m.newCode() });
  assert.equal(r3.status, 503);
  assert.equal((await r3.json()).code, "no_disponible");
  assert.equal((await invitationOther()).status, 405);
});

/* ---------- Canje en /registro/enviar ---------- */
test("canje de cortesía: solicitud + membresía PREMIUM_GIFT en revisión, sin vencimiento; la invitación queda usada", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const { id, code } = await addInvitation(env);
    const { res, body } = await send(env, { ...PREMIUM, invitationCode: code });
    assert.equal(res.status, 201, JSON.stringify(body));
    const [app] = all(env, "SELECT * FROM business_applications");
    assert.equal(app.id, body.requestId);
    assert.equal(app.status, "pendiente", "nada se publica: la solicitud va a revisión");
    assert.match(app.notes, new RegExp(`^Plan solicitado: Premium de cortesía \\(\\$0 CAD, sin mensualidad y sin vencimiento\\)\\. Invitación ${id}\\.`));
    const [mem] = all(env, "SELECT * FROM business_memberships");
    assert.equal(mem.plan, "PREMIUM_GIFT");
    assert.equal(mem.status, "en_revision");
    assert.equal(mem.invitation_id, id);
    assert.equal(mem.application_id, app.id);
    assert.equal(mem.expires_at, null);
    assert.equal(mem.business_id, null);
    const [inv] = all(env, "SELECT * FROM business_invitations");
    assert.equal(inv.status, "usada");
    assert.equal(inv.application_id, app.id);
    assert.ok(inv.used_at);
    const ev = all(env, "SELECT * FROM membership_events");
    assert.equal(ev.length, 1);
    assert.equal(ev[0].action, "canje");
    assert.equal(ev[0].membership_id, mem.id);
    /* Correos: el aviso interno identifica la cortesía; la confirmación explica $0 sin cobros */
    const [internal, confirm] = net.sent.map((s) => s.body);
    assert.match(internal.subject, /PREMIUM DE CORTESÍA/);
    assert.match(internal.html, new RegExp(id));
    assert.match(confirm.html, /\$0 CAD/);
    assert.match(confirm.html, /sin cobros automáticos/i);
    /* El código nunca viaja en los correos ni queda en D1 */
    for (const s of net.sent) assert.ok(!JSON.stringify(s.body).includes(code));
    const dump = JSON.stringify([all(env, "SELECT * FROM business_applications"), all(env, "SELECT * FROM business_invitations"), all(env, "SELECT * FROM membership_events"), all(env, "SELECT * FROM application_events")]);
    assert.ok(!dump.includes(code));
  } finally {
    net.restore();
  }
});

test("una invitación se usa una sola vez: el segundo envío se rechaza y no guarda nada", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const { code } = await addInvitation(env);
    assert.equal((await send(env, { ...PREMIUM, invitationCode: code })).res.status, 201);
    const again = await send(env, { ...PREMIUM, name: "Otro Negocio", email: "otro@example.com", invitationCode: code }, "203.0.113.51");
    assert.equal(again.res.status, 409);
    assert.equal(again.body.code, "invitation_used");
    assert.equal(all(env, "SELECT * FROM business_applications").length, 1);
    assert.equal(all(env, "SELECT * FROM business_memberships").length, 1);
  } finally {
    net.restore();
  }
});

test("envíos simultáneos con el mismo código: solo uno canjea; el otro no deja solicitud, imágenes ni eventos", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const { code } = await addInvitation(env);
    const results = await Promise.all([
      send(env, { ...PREMIUM, invitationCode: code }, "203.0.113.60"),
      send(env, { ...PREMIUM, name: "Negocio Dos", email: "dos@example.com", invitationCode: code }, "203.0.113.61"),
    ]);
    const statuses = results.map((r) => r.res.status).sort();
    assert.deepEqual(statuses, [201, 409]);
    assert.equal(all(env, "SELECT * FROM business_applications").length, 1);
    assert.equal(all(env, "SELECT * FROM business_memberships").length, 1);
    assert.equal(all(env, "SELECT * FROM membership_events").length, 1);
    const winner = results.find((r) => r.res.status === 201).body.requestId;
    assert.ok([...env.SOLICITUDES.store.keys()].every((k) => k.startsWith(`solicitudes/${winner}/`)), "las imágenes del envío rechazado se borran");
  } finally {
    net.restore();
  }
});

test("canje: código inválido (404), revocado (409), plan distinto (400), tablas sin preparar (503); nada se guarda", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    let r = await send(env, { ...PREMIUM, invitationCode: m.newCode() });
    assert.deepEqual([r.res.status, r.body.code], [404, "invitation_invalid"]);
    const revoked = await addInvitation(env, "PREMIUM_GIFT", "revocada");
    r = await send(env, { ...PREMIUM, invitationCode: revoked.code });
    assert.deepEqual([r.res.status, r.body.code], [409, "invitation_used"]);
    const gift = await addInvitation(env);
    r = await send(env, { ...FREE, invitationCode: gift.code });
    assert.deepEqual([r.res.status, r.body.code], [400, "invitation_plan"]);
    assert.equal(all(env, "SELECT * FROM business_applications").length, 0);
    assert.equal(all(env, "SELECT * FROM business_memberships").length, 0);
    assert.equal(env.SOLICITUDES.store.size, 0);
    const sin = fakeEnv({ DIRECTORIO_DB: fakeD1({ skip: ["0005_membresias.sql"] }) });
    r = await send(sin, { ...PREMIUM, invitationCode: m.newCode() });
    assert.deepEqual([r.res.status, r.body.code], [503, "invitation_unavailable"]);
  } finally {
    net.restore();
  }
});

test("invitación gratuita y Premium pagada: membresía FREE / PREMIUM_PAID, sin ningún cobro", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const free = await addInvitation(env, "FREE", "pendiente", "Ficha Libre");
    assert.equal((await send(env, { ...FREE, invitationCode: free.code })).res.status, 201);
    const paid = await addInvitation(env, "PREMIUM_PAID", "pendiente", "Pagada");
    assert.equal((await send(env, { ...PREMIUM, name: "Pagada", email: "pagada@example.com", invitationCode: paid.code }, "203.0.113.70")).res.status, 201);
    assert.deepEqual(all(env, "SELECT plan, status, expires_at FROM business_memberships ORDER BY plan").map((x) => ({ ...x })), [
      { plan: "FREE", status: "en_revision", expires_at: null },
      { plan: "PREMIUM_PAID", status: "en_revision", expires_at: null },
    ]);
    /* Solo salen los correos (aviso interno + confirmación por solicitud): ningún cobro */
    assert.equal(net.sent.length, 4);
  } finally {
    net.restore();
  }
});

test("reintento del mismo envío con invitación: mismo número, sin canjear dos veces", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const { code } = await addInvitation(env);
    const fields = { ...PREMIUM, invitationCode: code, idempotencyKey: "k".repeat(32) };
    const a = await send(env, fields);
    const b = await send(env, fields);
    assert.equal(a.res.status, 201);
    assert.equal(b.res.status, 409, "la invitación ya está usada por la primera solicitud");
    assert.equal(all(env, "SELECT * FROM business_applications").length, 1);
    assert.equal(all(env, "SELECT * FROM business_memberships").length, 1);
  } finally {
    net.restore();
  }
});

test("registro sin invitación: igual que antes, no crea membresías (también sin la migración 0005)", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    assert.equal((await send(env, FREE)).res.status, 201);
    assert.equal(all(env, "SELECT * FROM business_memberships").length, 0);
    const sin = fakeEnv({ DIRECTORIO_DB: fakeD1({ skip: ["0005_membresias.sql"] }) });
    assert.equal((await send(sin, PREMIUM)).res.status, 201);
  } finally {
    net.restore();
  }
});
