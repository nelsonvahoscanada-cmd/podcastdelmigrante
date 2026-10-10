/*
  Pruebas del registro de empresas: reglas compartidas (solicitud-core),
  correos y la Function POST /registro/enviar con D1/R2 simulados.
  Ejecutar:  node --test tests/*.test.mjs
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as core from "../js/directorio/solicitud-core.js";
import { internalEmail, confirmationEmail } from "../functions/_lib/correos.js";
import { onRequestPost } from "../functions/registro/enviar.js";
import { onRequestGet as configGet } from "../functions/registro/config.js";
import { fakeEnv, fakeD1, installFetch } from "./helpers/fake-cloudflare.mjs";

const ROOT = new URL("../", import.meta.url);
const bytesOf = (p) => new Uint8Array(readFileSync(new URL(p, ROOT)));
const PHOTO = bytesOf("assets/tomas-velazquez.jpg");      /* JPEG real */
const LOGO = bytesOf("assets/logo.png");                  /* PNG real 500×500 */
const WEBP = bytesOf("assets/directorio/vitrina-720.webp");

const VALID = {
  name: "Panadería La Esquina", category: "vivienda", city: "Edmonton", province: "Alberta",
  representative: "Ana Pérez", title: "Propietaria", summary: "Pan artesanal latino en Edmonton.\nPedidos para eventos.",
  email: "Ana@Example.com", whatsapp: "1 780 555 1234", instagram: "@la.esquina", imageKind: "foto",
  consentData: "on", consentRights: "on", consentPublish: "on", "cf-turnstile-response": "token-ok",
};

/* ---------- Reglas compartidas ---------- */
test("las categorías coinciden con las del directorio (js/businesses.js) + «otra»", () => {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(new URL("js/businesses.js", ROOT), "utf8") + ";globalThis.C = BUSINESS_CATEGORIES.map((c) => c.id);", ctx);
  assert.deepEqual(core.CATEGORIES.map((c) => c.id), [...ctx.C, "otra"]);
});

test("solicitud válida: sin errores y datos normalizados", () => {
  const { errors, data } = core.validate(core.normalize(VALID));
  assert.deepEqual(errors, {});
  assert.equal(data.email, "ana@example.com");
  assert.equal(data.whatsapp, "17805551234");
  assert.equal(data.instagram, "https://www.instagram.com/la.esquina/");
});

test("obligatorios, reseña ≤ 300 y al menos un contacto publicable", () => {
  const { errors } = core.validate(core.normalize({}));
  for (const k of ["name", "category", "city", "province", "representative", "summary", "email", "contact", "imageKind", "consentData", "consentRights", "consentPublish"]) assert.ok(errors[k], k);
  assert.ok(core.validate(core.normalize({ ...VALID, summary: "x".repeat(301) })).errors.summary);
  assert.ok(core.validate(core.normalize({ ...VALID, whatsapp: "", instagram: "" })).errors.contact);
  assert.deepEqual(core.validate(core.normalize({ ...VALID, whatsapp: "", instagram: "", website: "minegocio.ca" })).errors, {});
  /* la dirección sola no es un medio de contacto */
  assert.ok(core.validate(core.normalize({ ...VALID, whatsapp: "", instagram: "", address: "123 Main St" })).errors.contact);
});

test("enlaces y redes: rechaza esquemas peligrosos y redes cruzadas", () => {
  assert.ok(core.validate(core.normalize({ ...VALID, website: "javascript:alert(1)" })).errors.website);
  assert.ok(core.validate(core.normalize({ ...VALID, instagram: "https://evil.com/x" })).errors.instagram);
  assert.equal(core.socialUrl("tiktok", "@pan"), "https://www.tiktok.com/@pan");
  assert.ok(core.validate(core.normalize({ ...VALID, category: "otra" })).errors.categoryOther);
});

test("imagen: tipo real por contenido, tamaño y dimensiones", () => {
  assert.equal(core.validateImage(PHOTO).info.type, "image/jpeg");
  assert.deepEqual([core.validateImage(LOGO).info.type, core.validateImage(LOGO).info.width], ["image/png", 500]);
  assert.equal(core.validateImage(WEBP).info.type, "image/webp");
  assert.equal(core.validateImage(WEBP).info.width, 720);
  assert.equal(core.validateImage(new TextEncoder().encode("<svg onload=alert(1)>" + " ".repeat(64))).ok, false);
  const big = new Uint8Array(core.LIMITS.imageMaxBytes + 1); big.set(PHOTO.slice(0, 64));
  assert.match(core.validateImage(big).error, /5 MB/);
});

test("número de solicitud", () => {
  assert.match(core.newRequestId(new Date("2026-10-09T12:00:00Z")), core.REQUEST_ID_RE);
});

/* ---------- Correos ---------- */
test("correo interno: organizado, sin código, con datos escapados", () => {
  const { data } = core.validate(core.normalize({ ...VALID, name: 'Pan <script>alert("x")</script>\nBcc: otro@x.com' }));
  const m = internalEmail(data, { id: "SOL-20261009-ABCDEF", receivedLabel: "9 oct 2026", panelUrl: "https://admin.podcastdelmigrante.com" });
  assert.match(m.subject, /^Nueva solicitud empresarial — .+ — SOL-20261009-ABCDEF$/);
  assert.doesNotMatch(m.subject, /[\r\n]/);
  assert.doesNotMatch(m.html, /<script>/);
  assert.doesNotMatch(m.html + m.text, /BUSINESSES|published:|=>|function\s*\(/);
  for (const k of ["Número de solicitud", "Fecha de recepción", "Categoría", "Ciudad y provincia", "Representante", "Correo (privado)", "WhatsApp", "Instagram", "Reseña", "Revisar en el panel"]) assert.ok((m.html + m.text).includes(k), k);
});

test("confirmación al empresario: asunto y texto aprobados, sin datos del administrador", () => {
  const m = confirmationEmail({ id: "SOL-20261009-ABCDEF" });
  assert.equal(m.subject, "Recibimos tu solicitud — El Podcast del Migrante");
  for (const t of ["¡Gracias por registrar tu empresa!", "Número de solicitud: SOL-20261009-ABCDEF", "Tu perfil no será publicado sin tu aprobación.", "Conectando latinos, construyendo futuro"]) assert.ok(m.text.includes(t), t);
  assert.doesNotMatch(m.text + m.html, /gmail|Nelson/i);
});

/* ---------- Function POST /registro/enviar ---------- */
function request(fields, image = PHOTO, { ip = "203.0.113.7", type = "image/jpeg" } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  if (image) fd.set("image", new Blob([image], { type }), "foto.jpg");
  return new Request("https://podcastdelmigrante.com/registro/enviar", { method: "POST", body: fd, headers: { "CF-Connecting-IP": ip } });
}
async function send(env, fields, image, opts) {
  const pending = [];
  const res = await onRequestPost({ request: request(fields, image, opts), env, waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  return { res, body: await res.json() };
}
const rows = (env) => env.DIRECTORIO_DB._db.prepare("SELECT * FROM business_applications").all();

test("registro completo: D1 + R2 + correos interno y de confirmación", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const { res, body } = await send(env, { ...VALID, idempotencyKey: "a".repeat(32) });
    assert.equal(res.status, 201);
    assert.match(body.requestId, core.REQUEST_ID_RE);
    const [row] = rows(env);
    assert.equal(row.id, body.requestId);
    assert.equal(row.status, "pendiente");
    assert.equal(row.email, "ana@example.com");
    assert.equal(row.image_type, "image/jpeg");
    assert.ok(env.SOLICITUDES.store.has(row.image_key));
    assert.equal(row.internal_email_status, "enviado");
    assert.equal(row.confirmation_email_status, "enviado");
    assert.notEqual(row.ip_hash, "203.0.113.7");
    assert.equal(net.sent.length, 2);
    const [internal, confirm] = net.sent.map((s) => s.body);
    assert.deepEqual(internal.to, ["podcastdelmigrante@gmail.com"]);
    assert.equal(internal.from, "El Podcast del Migrante <solicitudes@podcastdelmigrante.com>");
    assert.equal(internal.attachments.length, 1);
    assert.deepEqual(confirm.to, ["ana@example.com"]);
    assert.equal(confirm.subject, "Recibimos tu solicitud — El Podcast del Migrante");
    assert.equal(net.sent[0].headers["Idempotency-Key"], `${body.requestId}-interno`);
  } finally { net.restore(); }
});

test("si falla el correo, la solicitud NO se pierde (queda marcada)", async () => {
  const net = installFetch({ resendFails: true });
  try {
    const env = fakeEnv();
    const { res, body } = await send(env, VALID);
    assert.equal(res.status, 201);
    const [row] = rows(env);
    assert.equal(row.id, body.requestId);
    assert.equal(row.internal_email_status, "error");
    assert.equal(row.confirmation_email_status, "error");
    assert.match(row.email_error, /Resend 429/);
  } finally { net.restore(); }
});

test("rechazos: validación, imagen falsa, robot, Turnstile, sin configuración", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    let r = await send(env, { ...VALID, summary: "" });
    assert.equal(r.res.status, 400); assert.ok(r.body.errors.summary);
    r = await send(env, VALID, new TextEncoder().encode("no soy una imagen".repeat(10)));
    assert.equal(r.res.status, 400); assert.ok(r.body.errors.image);
    r = await send(env, VALID, null);
    assert.equal(r.res.status, 400); assert.ok(r.body.errors.image);
    r = await send(env, { ...VALID, company_website: "http://spam" });
    assert.equal(r.res.status, 400);
    r = await send(env, { ...VALID, "cf-turnstile-response": "falso" });
    assert.equal(r.res.status, 403);
    assert.equal(rows(env).length, 0, "nada se guarda");
    assert.equal(env.SOLICITUDES.store.size, 0);
    r = await send(fakeEnv({ RESEND_API_KEY: "" }), VALID);
    assert.equal(r.res.status, 503);
    assert.equal(net.sent.length, 0);
  } finally { net.restore(); }
});

test("Turnstile: un token válido emitido en otro dominio se rechaza", async () => {
  let net = installFetch({ turnstileHostname: "sitio-ajeno.example" });
  try {
    const env = fakeEnv();
    const r = await send(env, VALID);
    assert.equal(r.res.status, 403);
    assert.equal(rows(env).length, 0, "nada se guarda");
    assert.equal(env.SOLICITUDES.store.size, 0);
    assert.equal(net.sent.length, 0, "no salen correos");
  } finally { net.restore(); }
  /* Vista previa de Pages: solo si se autoriza su dominio expresamente */
  net = installFetch({ turnstileHostname: "abc123.podcastdelmigrante.pages.dev" });
  try {
    assert.equal((await send(fakeEnv(), VALID)).res.status, 403, "por defecto, solo el dominio oficial");
    const env = fakeEnv({ TURNSTILE_HOSTNAMES: "podcastdelmigrante.com, abc123.podcastdelmigrante.pages.dev" });
    assert.equal((await send(env, VALID)).res.status, 201);
  } finally { net.restore(); }
  net = installFetch({ turnstileHostname: "www.podcastdelmigrante.com" });
  try {
    assert.equal((await send(fakeEnv(), VALID)).res.status, 201, "www también es oficial");
  } finally { net.restore(); }
});

test("consentimiento: se guarda la versión vigente del aviso de privacidad", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    assert.equal((await send(env, VALID)).res.status, 201);
    assert.equal(rows(env)[0].consent_version, "directorio-2026-10-v2");
  } finally { net.restore(); }
});

test("sin duplicados: reintento y misma empresa abierta devuelven el mismo número", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const a = await send(env, { ...VALID, idempotencyKey: "b".repeat(32) });
    const b = await send(env, { ...VALID, idempotencyKey: "b".repeat(32) });
    const c = await send(env, { ...VALID, idempotencyKey: "c".repeat(32) });
    assert.equal(b.body.requestId, a.body.requestId);
    assert.equal(c.body.requestId, a.body.requestId);
    assert.equal(rows(env).length, 1);
  } finally { net.restore(); }
});

test("límite de frecuencia por conexión", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    for (let i = 0; i < 5; i++) {
      const r = await send(env, { ...VALID, name: "Negocio " + i, email: `n${i}@example.com` });
      assert.equal(r.res.status, 201);
    }
    const r = await send(env, { ...VALID, name: "Negocio 6", email: "n6@example.com" });
    assert.equal(r.res.status, 429);
    assert.equal(rows(env).length, 5);
  } finally { net.restore(); }
});

test("si D1 falla, se borra la imagen y no se confirma", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    env.DIRECTORIO_DB._db.exec("DROP TABLE business_applications; CREATE TABLE business_applications (id TEXT PRIMARY KEY, idempotency_key TEXT, email TEXT, name TEXT, status TEXT, created_at TEXT, ip_hash TEXT)");
    const { res } = await send(env, VALID);
    assert.equal(res.status, 500);
    assert.equal(env.SOLICITUDES.store.size, 0);
    assert.equal(net.sent.length, 0);
  } finally { net.restore(); }
});

test("GET /registro/config: listo solo con toda la configuración, sin revelar secretos", async () => {
  const ok = await (await configGet({ env: fakeEnv() })).json();
  assert.deepEqual(ok, { ready: true, turnstileSiteKey: "1x00000000000000000000AA" });
  const no = await (await configGet({ env: fakeEnv({ IP_HASH_SALT: "" }) })).json();
  assert.deepEqual(no, { ready: false, turnstileSiteKey: "" });
});

/* Captura console.warn para comprobar que el registro nombra lo que falta
   sin incluir ningún valor secreto. */
async function captureWarn(fn) {
  const lines = [];
  const original = console.warn;
  console.warn = (...a) => lines.push(a.join(" "));
  try { await fn(); } finally { console.warn = original; }
  return lines.join("\n");
}

test("interruptor REGISTRO_ABIERTO: cerrado salvo que valga exactamente \"1\"", async () => {
  for (const value of [undefined, "", "0", "true", "si", " 1", "1 ", "01", 1]) {
    const env = fakeEnv({ REGISTRO_ABIERTO: value });
    const cfg = await (await configGet({ env })).json();
    assert.deepEqual(cfg, { ready: false, turnstileSiteKey: "" }, `config con ${JSON.stringify(value)}`);
  }
});

test("con el interruptor cerrado no se procesa ni se guarda nada", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv({ REGISTRO_ABIERTO: "0" });
    const log = await captureWarn(async () => {
      const r = await send(env, VALID);
      assert.equal(r.res.status, 503);
      assert.equal(r.body.ok, false);
    });
    assert.match(log, /REGISTRO_ABIERTO/);
    assert.equal(rows(env).length, 0);
    assert.equal(env.SOLICITUDES.store.size, 0);
    assert.equal(net.sent.length, 0, "ni Turnstile ni correos");
  } finally { net.restore(); }
});

test("clave pública de Turnstile mal puesta (nombre del widget): cerrado", async () => {
  const cfg = await (await configGet({ env: fakeEnv({ TURNSTILE_SITE_KEY: "Directorio empresarial" }) })).json();
  assert.deepEqual(cfg, { ready: false, turnstileSiteKey: "" });
  assert.equal((await (await configGet({ env: fakeEnv({ TURNSTILE_SITE_KEY: "0x4AAAAAAAabcdefghijklmn" }) })).json()).ready, true);
});

test("los registros nombran lo que falta, nunca los valores secretos", async () => {
  const env = fakeEnv({ REGISTRO_ABIERTO: "", IP_HASH_SALT: "", RESEND_API_KEY: "re_SECRETO_123", TURNSTILE_SECRET_KEY: "0xSECRETO_TURNSTILE" });
  const log = await captureWarn(() => configGet({ env }));
  assert.match(log, /REGISTRO_ABIERTO/);
  assert.match(log, /IP_HASH_SALT/);
  for (const secret of ["re_SECRETO_123", "0xSECRETO_TURNSTILE"]) assert.ok(!log.includes(secret), "no revela " + secret);
  const body = await (await configGet({ env })).text();
  assert.ok(!/SECRETO/.test(body));
});

test("historial: la solicitud recibida y el resultado de los correos quedan registrados", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const r = await send(env, VALID);
    assert.equal(r.res.status, 201);
    const events = env.DIRECTORIO_DB._db.prepare("SELECT actor, action, to_status, detail FROM application_events WHERE application_id = ? ORDER BY id").all(r.body.requestId);
    assert.deepEqual(events.map((e) => [e.actor, e.action]), [["formulario", "recibida"], ["sistema", "correos"]]);
    assert.equal(events[0].to_status, "pendiente");
    assert.match(events[1].detail, /Aviso interno: enviado · Confirmación: enviado/);
    assert.doesNotMatch(JSON.stringify(events), /ana@example\.com/i, "sin datos de contacto");
  } finally { net.restore(); }
});

test("si el historial no existe todavía (migración 0002 sin aplicar), la solicitud NO se pierde", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv({ DIRECTORIO_DB: fakeD1({ upTo: "0001_solicitudes.sql" }) });
    const r = await send(env, VALID);
    assert.equal(r.res.status, 201);
    assert.equal(rows(env).length, 1);
    assert.equal(net.sent.length, 2, "los dos correos salen igual");
  } finally { net.restore(); }
});

test("servicios caídos: Turnstile sin respuesta → 503 claro; D1 caída → 500 JSON sin detalles internos", async () => {
  let net = installFetch({ turnstileDown: true });
  try {
    const env = fakeEnv();
    const r = await send(env, VALID);
    assert.equal(r.res.status, 503);
    assert.match(r.body.error, /Tus datos siguen en el formulario/);
    assert.equal(rows(env).length, 0);
    assert.equal(net.sent.length, 0);
  } finally { net.restore(); }
  net = installFetch();
  try {
    const broken = { prepare() { throw new Error("D1_ERROR: database unavailable (detalle interno)"); }, batch() { throw new Error("x"); } };
    const env = fakeEnv({ DIRECTORIO_DB: broken });
    const r = await send(env, VALID);
    assert.equal(r.res.status, 500);
    assert.equal(r.body.ok, false);
    assert.doesNotMatch(JSON.stringify(r.body), /D1_ERROR|detalle interno/);
    assert.equal(env.SOLICITUDES.store.size, 0, "no queda ninguna imagen huérfana");
  } finally { net.restore(); }
});
