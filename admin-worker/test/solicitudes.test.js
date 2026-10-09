/*
  Panel: solicitudes del Directorio Empresarial (Worker completo con D1/R2
  simulados e identidad de desarrollo local).
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";
import { publicationPackage } from "../src/solicitudes.js";
import { fakeD1, fakeR2 } from "../../tests/helpers/fake-cloudflare.mjs";

const PHOTO = new Uint8Array(readFileSync(new URL("../../assets/tomas-velazquez.jpg", import.meta.url)));
const ORIGIN = "https://admin.podcastdelmigrante.com";

function env() {
  const e = { DIRECTORIO_DB: fakeD1(), SOLICITUDES: fakeR2(), ALLOW_LOCAL_DEV: "1", ASSETS: { fetch: async () => new Response("asset") } };
  const now = "2026-10-09T15:00:00.000Z";
  e.DIRECTORIO_DB._db.prepare(
    `INSERT INTO business_applications (id, idempotency_key, created_at, updated_at, name, category, city, province, representative, title, summary,
      email, whatsapp, instagram, image_kind, image_key, image_type, image_bytes, image_width, image_height, consent_version, consent_at)
     VALUES ('SOL-20261009-ABCDEF','k1',?,?,'Panadería La Esquina','otra','Edmonton','Alberta','Ana María Pérez','Panadera',
      'Pan artesanal latino.','ana@example.com','17805551234','https://www.instagram.com/la.esquina/','foto','solicitudes/SOL-20261009-ABCDEF/imagen.jpg','image/jpeg',100,800,800,'directorio-2026-10',?)`
  ).run(now, now, now);
  e.DIRECTORIO_DB._db.prepare("UPDATE business_applications SET category_other = 'Panadería' WHERE id = 'SOL-20261009-ABCDEF'").run();
  e.SOLICITUDES.put("solicitudes/SOL-20261009-ABCDEF/imagen.jpg", PHOTO, { httpMetadata: { contentType: "image/jpeg" } });
  return e;
}

const req = (path, init = {}) =>
  new Request(ORIGIN + path, Object.assign({}, init, { headers: Object.assign({ "CF-Connecting-IP": "127.0.0.1" }, init.headers || {}) }));
const call = async (e, path, init) => {
  const res = await worker.fetch(req(path, init), e);
  return { res, body: res.headers.get("Content-Type").includes("json") ? await res.json() : null };
};
const post = (e, id, data, headers = {}) =>
  call(e, `/api/solicitudes/${id}/estado`, { method: "POST", body: JSON.stringify(data), headers: Object.assign({ "Content-Type": "application/json", Origin: ORIGIN }, headers) });

test("sin identidad verificada no se ve nada", async () => {
  const e = env();
  const res = await worker.fetch(new Request(ORIGIN + "/api/solicitudes", { headers: { "CF-Connecting-IP": "203.0.113.5" } }), e);
  assert.equal(res.status, 403);
});

test("lista, detalle e imagen privada", async () => {
  const e = env();
  let r = await call(e, "/api/solicitudes");
  assert.equal(r.body.applications.length, 1);
  assert.equal(r.body.applications[0].category_label, "Otra: Panadería");
  assert.equal(r.body.counts.pendiente, 1);
  r = await call(e, "/api/solicitudes/SOL-20261009-ABCDEF");
  assert.equal(r.body.application.email, "ana@example.com");
  assert.equal(r.body.application.ip_hash, undefined, "la huella de IP no se expone");
  assert.deepEqual(r.body.application.transitions, ["en_revision", "rechazada", "duplicada"]);
  const img = await worker.fetch(req("/api/solicitudes/SOL-20261009-ABCDEF/imagen"), e);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("Content-Type"), "image/jpeg");
  assert.equal(img.headers.get("Cache-Control"), "no-store");
  assert.equal((await call(e, "/api/solicitudes/NO-VALIDO")).res.status, 404);
});

test("flujo de estados: no se aprueba sin la aprobación del empresario ni se publica sin BIZ-id", async () => {
  const e = env();
  const id = "SOL-20261009-ABCDEF";
  assert.equal((await post(e, id, { status: "publicada" })).res.status, 409);
  assert.equal((await post(e, id, { status: "en_revision" })).res.status, 200);
  assert.equal((await post(e, id, { status: "aprobada" })).res.status, 409);
  let r = await post(e, id, { status: "aprobada", ownerApproved: true, notes: "Aprobó por WhatsApp" });
  assert.equal(r.body.application.status, "aprobada");
  assert.equal(r.body.application.reviewed_by, "local-dev@localhost");
  assert.equal((await post(e, id, { status: "publicada", businessId: "x" })).res.status, 409);
  r = await post(e, id, { status: "publicada", businessId: "BIZ-003", businessSlug: "ana-maria-perez" });
  assert.equal(r.body.application.status, "publicada");
  assert.deepEqual(r.body.application.transitions, []);
});

test("cambios de estado: solo JSON y del mismo origen", async () => {
  const e = env();
  assert.equal((await post(e, "SOL-20261009-ABCDEF", { status: "en_revision" }, { Origin: "https://evil.example" })).res.status, 403);
  assert.equal((await post(e, "SOL-20261009-ABCDEF", { status: "en_revision" }, { "Content-Type": "text/plain" })).res.status, 415);
  const del = await worker.fetch(req("/api/solicitudes/SOL-20261009-ABCDEF", { method: "DELETE" }), e);
  assert.equal(del.status, 405);
});

test("paquete de publicación: ficha compatible y SIN el correo privado", async () => {
  const e = env();
  const { body } = await call(e, "/api/solicitudes/SOL-20261009-ABCDEF/paquete");
  assert.equal(body.slug, "ana-maria-perez");
  assert.equal(body.imageFile, "assets/directorio/perfiles/ana-maria-perez.jpg");
  assert.doesNotMatch(body.entry, /ana@example\.com/);
  const obj = new Function("return (" + body.entry.trim().replace(/,\s*$/, "") + ")")();
  assert.equal(obj.name, "Ana María Pérez");
  assert.equal(obj.company, "Panadería La Esquina");
  assert.equal(obj.email, "");
  assert.equal(obj.category, "", "categoría nueva: se crea al publicar");
  assert.equal(obj.whatsapp, "17805551234");
  assert.deepEqual(obj.connect, { profileQr: true, contactCard: { givenName: "Ana", familyName: "María Pérez" } });
  assert.equal(obj.profileImageKind, "foto");
});

test("logotipo de empresa: el nombre del perfil es la empresa", () => {
  const p = publicationPackage({
    id: "SOL-20261009-XYZXYZ", name: "Transportes Andes", representative: "Luis Rojas", image_kind: "logo", image_type: "image/png",
    category: "automoviles", city: "Calgary", province: "Alberta", summary: "Mudanzas.", title: "",
  });
  const obj = new Function("return (" + p.entry.trim().replace(/,\s*$/, "") + ")")();
  assert.equal(obj.name, "Transportes Andes");
  assert.equal(obj.company, "");
  assert.equal(obj.profileImageKind, "logo");
  assert.equal(obj.profileImage, "assets/directorio/perfiles/transportes-andes.png");
});
