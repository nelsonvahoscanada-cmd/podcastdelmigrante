/*
  Panel: pedidos de eliminación de datos (D1 + R2 simulados, identidad de
  desarrollo local). Dos pasos, confirmación con el número SOL-… y registro
  que acredita la gestión sin conservar los datos borrados.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";
import { sha256Hex } from "../src/eliminaciones.js";
import { fakeD1, fakeR2 } from "../../tests/helpers/fake-cloudflare.mjs";

const PHOTO = new Uint8Array(readFileSync(new URL("../../assets/tomas-velazquez.jpg", import.meta.url)));
const ORIGIN = "https://admin.podcastdelmigrante.com";
const ID = "SOL-20261009-ABCDEF";
const OTHER = "SOL-20261009-GHJKLM";
const TODAY = new Date().toISOString().slice(0, 10);

function env(dbOptions) {
  const e = { DIRECTORIO_DB: fakeD1(dbOptions), SOLICITUDES: fakeR2(), ALLOW_LOCAL_DEV: "1", ASSETS: { fetch: async () => new Response("asset") } };
  const now = "2026-10-09T15:00:00.000Z";
  for (const [id, email] of [[ID, "Ana@Example.com"], [OTHER, "luis@example.com"]]) {
    e.DIRECTORIO_DB._db.prepare(
      `INSERT INTO business_applications (id, idempotency_key, created_at, updated_at, name, category, city, province, representative, summary,
        email, image_kind, image_key, image_type, image_bytes, consent_version, consent_at)
       VALUES (?, ?, ?, ?, 'Negocio', 'otra', 'Edmonton', 'Alberta', 'Persona', 'Reseña.', ?, 'foto', ?, 'image/jpeg', 100, 'directorio-2026-10-v2', ?)`
    ).run(id, "k-" + id, now, now, email, `solicitudes/${id}/imagen.jpg`, now);
    e.SOLICITUDES.put(`solicitudes/${id}/imagen.jpg`, PHOTO, { httpMetadata: { contentType: "image/jpeg" } });
  }
  return e;
}

const req = (path, init = {}) =>
  new Request(ORIGIN + path, Object.assign({}, init, { headers: Object.assign({ "CF-Connecting-IP": "127.0.0.1" }, init.headers || {}) }));
const call = async (e, path, init) => {
  const res = await worker.fetch(req(path, init), e);
  return { res, body: (res.headers.get("Content-Type") || "").includes("json") ? await res.json() : null };
};
const postJson = (e, path, data, headers = {}) =>
  call(e, path, { method: "POST", body: JSON.stringify(data), headers: Object.assign({ "Content-Type": "application/json", Origin: ORIGIN }, headers) });
const del = (e, id, data, headers) => postJson(e, `/api/solicitudes/${id}/eliminacion`, data, headers);
const status = (e, id, data) => postJson(e, `/api/solicitudes/${id}/estado`, data);
const appRows = (e) => e.DIRECTORIO_DB._db.prepare("SELECT id FROM business_applications ORDER BY id").all().map((r) => r.id);
const SCHEDULE = { action: "programar", requestedOn: TODAY, channel: "correo", notes: "Pidió eliminar por correo" };

test("no se puede borrar sin el paso 1 ni sin escribir el número exacto", async () => {
  const e = env();
  let r = await del(e, ID, { action: "ejecutar", confirm: ID });
  assert.equal(r.res.status, 409, "sin pedido registrado no se borra");
  assert.match(r.body.error, /paso 1/);
  assert.equal((await del(e, ID, SCHEDULE)).res.status, 200);
  for (const confirm of ["", "sol-20261009-abcdef", OTHER, ID + " "]) {
    if (confirm.trim() === ID) continue;
    r = await del(e, ID, { action: "ejecutar", confirm });
    assert.equal(r.res.status, 400, `confirmación ${JSON.stringify(confirm)}`);
  }
  assert.deepEqual(appRows(e), [ID, OTHER], "nada se borró");
  assert.equal(e.SOLICITUDES.store.size, 2);
});

test("el paso 1 se puede cancelar y entonces ya no se puede ejecutar", async () => {
  const e = env();
  await del(e, ID, SCHEDULE);
  assert.equal((await del(e, ID, SCHEDULE)).res.status, 409, "un solo pedido abierto por solicitud");
  assert.equal((await del(e, ID, { action: "cancelar", reason: "" })).res.status, 400, "la cancelación exige motivo");
  assert.equal((await del(e, ID, { action: "cancelar", reason: "Registrado por error" })).res.status, 200);
  assert.equal((await del(e, ID, { action: "ejecutar", confirm: ID })).res.status, 409);
  assert.deepEqual(appRows(e), [ID, OTHER]);
  const { body } = await call(e, `/api/solicitudes/${ID}`);
  assert.equal(body.deletion.open, null);
  assert.equal(body.deletion.past[0].status, "cancelada");
  assert.equal(body.deletion.past[0].cancelled_by, "local-dev@localhost");
});

test("ejecutar borra D1 (solicitud e historial) y R2, y deja un registro sin datos personales", async () => {
  const e = env();
  e.SOLICITUDES.put(`solicitudes/${ID}/otra-version.jpg`, PHOTO, {});
  await status(e, ID, { status: "en_revision", notes: "Llamar el lunes" });
  await status(e, OTHER, { status: "en_revision" });
  assert.equal((await del(e, ID, SCHEDULE)).res.status, 200);
  const r = await del(e, ID, { action: "ejecutar", confirm: ID });
  assert.equal(r.res.status, 200);
  assert.equal(r.body.deletion.status, "ejecutada");
  assert.equal(r.body.deletion.executed_by, "local-dev@localhost");
  assert.match(r.body.deletion.result, /1 registro\(s\) de historial · R2: 2 archivo\(s\)/);
  assert.equal(r.body.deletion.due_on.length, 10);

  assert.deepEqual(appRows(e), [OTHER], "solo se borró esa solicitud");
  assert.deepEqual([...e.SOLICITUDES.store.keys()], [`solicitudes/${OTHER}/imagen.jpg`]);
  const db = e.DIRECTORIO_DB._db;
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM application_events WHERE application_id = ?").get(ID).n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM application_events WHERE application_id = ?").get(OTHER).n, 1, "el historial ajeno queda");

  const log = db.prepare("SELECT * FROM deletion_requests").all();
  assert.equal(log.length, 1);
  assert.equal(log[0].email_sha256, await sha256Hex("ana@example.com"), "huella del correo en minúsculas");
  assert.doesNotMatch(JSON.stringify(log), /ana@example\.com|Negocio|Persona/i, "el registro no guarda los datos borrados");

  assert.equal((await call(e, `/api/solicitudes/${ID}`)).res.status, 404);
  assert.equal((await call(e, `/api/solicitudes/${ID}/imagen`)).res.status, 404);
  assert.equal((await del(e, ID, { action: "ejecutar", confirm: ID })).res.status, 409, "no se repite");
});

test("pasos manuales (Gmail y respuesta) solo después de ejecutar; quedan con quién y cuándo", async () => {
  const e = env();
  await del(e, ID, SCHEDULE);
  let { body } = await call(e, "/api/eliminaciones");
  const n = body.deletions[0].id;
  assert.equal((await postJson(e, `/api/eliminaciones/${n}/pasos`, { step: "gmail" })).res.status, 409);
  await del(e, ID, { action: "ejecutar", confirm: ID });
  assert.equal((await postJson(e, `/api/eliminaciones/${n}/pasos`, { step: "otro" })).res.status, 400);
  let r = await postJson(e, `/api/eliminaciones/${n}/pasos`, { step: "gmail" });
  assert.equal(r.body.deletion.gmail_done_by, "local-dev@localhost");
  r = await postJson(e, `/api/eliminaciones/${n}/pasos`, { step: "respuesta" });
  assert.ok(r.body.deletion.reply_sent_at);
  ({ body } = await call(e, "/api/eliminaciones"));
  assert.equal(body.deletions[0].status, "ejecutada");
  assert.ok(body.deletions[0].gmail_done_at && body.deletions[0].reply_sent_at);
});

test("con un pedido abierto no se aprueba ni se publica; un perfil publicado exige confirmar su retiro", async () => {
  const e = env();
  await status(e, ID, { status: "en_revision" });
  await del(e, ID, SCHEDULE);
  assert.equal((await status(e, ID, { status: "aprobada", ownerApproved: true })).res.status, 409);
  const list = (await call(e, "/api/solicitudes")).body.applications;
  assert.equal(list.find((a) => a.id === ID).deletion_pending, true);
  assert.equal(list.find((a) => a.id === OTHER).deletion_pending, false);
  await del(e, ID, { action: "cancelar", reason: "La persona lo retiró" });
  await status(e, ID, { status: "aprobada", ownerApproved: true });
  await status(e, ID, { status: "publicada", businessId: "BIZ-010", businessSlug: "persona" });
  await del(e, ID, SCHEDULE);
  let r = await del(e, ID, { action: "ejecutar", confirm: ID });
  assert.equal(r.res.status, 409);
  assert.match(r.body.error, /perfil publicado/);
  r = await del(e, ID, { action: "ejecutar", confirm: ID, profileRemoved: true });
  assert.equal(r.res.status, 200);
});

test("validación del paso 1: fecha, canal y notas sin datos de contacto", async () => {
  const e = env();
  const future = new Date(Date.now() + 5 * 86400e3).toISOString().slice(0, 10);
  for (const bad of [
    { requestedOn: "2026-13-01" },
    { requestedOn: future },
    { channel: "paloma" },
    { notes: "escribió desde ana@example.com" },
    { notes: "llamó al 780 555 1234" },
  ]) {
    assert.equal((await del(e, ID, Object.assign({}, SCHEDULE, bad))).res.status, 400, JSON.stringify(bad));
  }
  assert.equal((await del(e, ID, { action: "borrar-todo" })).res.status, 400);
  assert.equal((await del(e, "SOL-20260101-ZZZZZZ", SCHEDULE)).res.status, 404);
});

test("eliminación: solo JSON del mismo origen y con identidad verificada", async () => {
  const e = env();
  assert.equal((await del(e, ID, SCHEDULE, { Origin: "https://evil.example" })).res.status, 403);
  assert.equal((await del(e, ID, SCHEDULE, { "Content-Type": "text/plain" })).res.status, 415);
  const anon = await worker.fetch(
    new Request(ORIGIN + `/api/solicitudes/${ID}/eliminacion`, { method: "POST", body: JSON.stringify(SCHEDULE), headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.5" } }),
    e
  );
  assert.equal(anon.status, 403);
  assert.equal((await call(e, `/api/solicitudes/${ID}/eliminacion`)).res.status, 405);
  assert.deepEqual(appRows(e), [ID, OTHER]);
});

test("sin la migración 0003: avisa y no borra nada", async () => {
  const e = env({ upTo: "0002_historial.sql" });
  const r = await del(e, ID, SCHEDULE);
  assert.equal(r.res.status, 503);
  assert.match(r.body.error, /0003_eliminaciones/);
  assert.equal((await del(e, ID, { action: "ejecutar", confirm: ID })).res.status, 503);
  const { body } = await call(e, `/api/solicitudes/${ID}`);
  assert.equal(body.deletion.available, false);
  assert.equal((await call(e, "/api/eliminaciones")).body.deletions, null);
  assert.equal((await call(e, "/api/solicitudes")).res.status, 200, "la lista sigue funcionando");
  assert.deepEqual(appRows(e), [ID, OTHER]);
  assert.equal(e.SOLICITUDES.store.size, 2);
});

test("si R2 falla no se borra nada en D1", async () => {
  const e = env();
  e.SOLICITUDES.delete = async () => { throw new Error("R2 caído"); };
  await del(e, ID, SCHEDULE);
  const r = await del(e, ID, { action: "ejecutar", confirm: ID });
  assert.equal(r.res.status, 502);
  assert.deepEqual(appRows(e), [ID, OTHER]);
  assert.equal((await call(e, `/api/solicitudes/${ID}`)).body.deletion.open.status, "programada", "el pedido sigue abierto para reintentar");
});
