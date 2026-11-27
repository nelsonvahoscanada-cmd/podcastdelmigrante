/*
  Pruebas del núcleo de pagos del Perfil Empresarial Premium (modo de prueba):
  migración 0006 y protección de cortesías, enlace individual, Checkout,
  webhook firmado e idempotente, orden de eventos, pagos aprobados y
  rechazados, gracia, renovaciones, cancelaciones, devoluciones, conciliación,
  acceso no autorizado y aislamiento entre producción y pruebas.
  Sin red: SQLite real (node:sqlite) y Stripe simulado.
  node --test tests/pagos.test.mjs
*/
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fakeD1 } from "./helpers/fake-cloudflare.mjs";
import { fakeStripe, installStripeFetch, event } from "./helpers/fake-stripe.mjs";
import * as P from "../functions/_lib/pagos.js";
import { verifyWebhook, signPayload, keyMode, encodeForm, LIVE_MODE_ALLOWED } from "../functions/_lib/stripe.js";
import { missingConfig } from "../functions/_lib/pagos-env.js";
import { onRequestPost as enlace, onRequest as enlaceOtro } from "../functions/pagos/enlace.js";
import { onRequestPost as checkout } from "../functions/pagos/checkout.js";
import { onRequestPost as webhook, onRequest as webhookOtro } from "../functions/pagos/webhook.js";
import { onRequestGet as estado } from "../functions/pagos/estado.js";

/* Claves FALSAS armadas en tiempo de ejecución: ningún texto con forma de clave
   queda escrito en el repositorio (los detectores de secretos no las confunden). */
const fakeKey = (kind, mode) => [kind, mode, "PRUEBAfalsa" + "0".repeat(16)].join("_");
const WHSEC = ["whsec", "pruebaDeFirmaLocal123456"].join("_");
const KEY = fakeKey("rk", "test");
const LIVE_RK = fakeKey("rk", "live");
const LIVE_SK = fakeKey("sk", "live");
const ORIGIN = "https://claude-pagos.podcastdelmigrante.pages.dev";
let S, restore, env, logs;

function baseEnv(over = {}) {
  return Object.assign({
    PAGOS_DB: fakeD1(),
    STRIPE_SECRET_KEY: KEY,
    STRIPE_WEBHOOK_SECRET: WHSEC,
    STRIPE_PRICE_ID: "price_TEST2499CAD",
    STRIPE_API_BASE: "https://stripe.test",
    PAGOS_ABIERTOS: "1",
    PAGOS_MODO: "test",
    RESEND_API_KEY: "re_test",
    RESEND_API_URL: "https://resend.test/emails",
    MAIL_FROM: "El Podcast del Migrante <pagos@podcastdelmigrante.com>",
    STRIPE_PORTAL_LOGIN_URL: "https://billing.stripe.com/p/login/test_portal",
  }, over);
}
const db = () => env.PAGOS_DB;
const row = (sql, ...a) => db()._db.prepare(sql).get(...a);
const rows = (sql, ...a) => db()._db.prepare(sql).all(...a);
const run = (sql, ...a) => db()._db.prepare(sql).run(...a);

function addApplication(id, { status = "en_revision", plan = "Premium", email = "cliente@example.com", name = "Negocio de Prueba", businessId = null } = {}) {
  const now = new Date().toISOString();
  run(
    `INSERT INTO business_applications (id, idempotency_key, created_at, updated_at, status, name, category, city, province, representative, summary, email, image_kind, image_key, image_type, image_bytes, consent_version, consent_at, notes, business_id)
     VALUES (?, ?, ?, ?, ?, ?, 'vivienda', 'Calgary', 'Alberta', 'Ana', 'Reseña', ?, 'logo', 'k', 'image/png', 10, 'v', ?, ?, ?)`,
    id, "idem-" + id, now, now, status, name, email, now, `Plan solicitado: Plan ${plan} ($…).`, businessId
  );
}
function addMembership(id, plan, { status = "en_revision", applicationId = null, businessId = null } = {}) {
  const now = new Date().toISOString();
  run("INSERT INTO business_memberships (id, plan, status, business_name, application_id, business_id, created_at, updated_at) VALUES (?, ?, ?, 'X', ?, ?, ?, ?)", id, plan, status, applicationId, businessId, now, now);
}
const post = (fn, path, body, headers = {}) =>
  fn({ request: new Request(ORIGIN + path, { method: "POST", headers: Object.assign({ "Content-Type": "application/json", Origin: ORIGIN }, headers), body: JSON.stringify(body) }), env });
async function sendEvent(ev, { secret = WHSEC, t } = {}) {
  const raw = JSON.stringify(ev);
  const sig = await signPayload(raw, secret, t);
  return webhook({ request: new Request(ORIGIN + "/pagos/webhook", { method: "POST", headers: { "Stripe-Signature": sig, "Content-Type": "application/json" }, body: raw }), env });
}
/* Recorrido completo hasta el primer pago confirmado */
async function pagarPrimerMes(appId = "SOL-20261127-AAAAAA") {
  addApplication(appId);
  const link = await P.crearEnlacePago(db(), { applicationId: appId, actor: "admin@example.com" });
  const c = await post(checkout, "/pagos/checkout", { token: link.token, aceptaCondiciones: true, condiciones: P.TERMS_VERSION });
  const { url } = await c.json();
  const session = [...S.sessions.values()].at(-1);
  const sub = S.addSubscription({ metadata: { membership_id: link.membershipId }, customer: "cus_TESTCLIENTE001" });
  const inv = S.addInvoice({ subscription: sub.id, customer: sub.customer });
  await sendEvent(event("checkout.session.completed", { id: session.id, object: "checkout.session", mode: "subscription", payment_status: "paid", client_reference_id: link.membershipId, customer: sub.customer, subscription: sub.id, metadata: { membership_id: link.membershipId, payment_link_id: link.linkId }, livemode: false }));
  await sendEvent(event("invoice.paid", { id: inv.id, object: "invoice", subscription: sub.id, billing_reason: "subscription_create" }));
  return { link, url, session, sub, inv };
}

beforeEach(() => {
  S = fakeStripe();
  restore = installStripeFetch(S);
  env = baseEnv();
  logs = [];
  for (const k of ["log", "error"]) {
    const orig = console[k];
    console[k] = (...a) => logs.push(a.join(" "));
    console[k].__orig = orig;
  }
});
afterEach(() => {
  restore();
  for (const k of ["log", "error"]) if (console[k].__orig) console[k] = console[k].__orig;
});

/* ---------------------------------------------------------------- Migración */
test("migración 0006: no destructiva, repetible y con los perfiles protegidos BIZ-001 a BIZ-005", () => {
  const sql = readFileSync(new URL("../db/directorio/0006_facturacion.sql", import.meta.url), "utf8");
  const ejecutable = sql.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(ejecutable, /\b(DROP|DELETE|ALTER|UPDATE)\b/i, "sin sentencias destructivas fuera de comentarios");
  db()._db.exec(sql); /* repetirla no tiene efecto */
  assert.deepEqual(rows("SELECT business_id, reason FROM billing_protected ORDER BY business_id").map((r) => [r.business_id, r.reason]), [["BIZ-001", "fundador"], ["BIZ-002", "fundador"], ["BIZ-003", "cortesia"], ["BIZ-004", "cortesia"], ["BIZ-005", "institucional"]]);
  assert.deepEqual(Object.fromEntries(rows("SELECT key, value FROM billing_settings").map((r) => [r.key, r.value])), { grace_days: "7", link_ttl_days: "7", delivery_business_days: "10", refund_window_days: "30" });
});

/* ------------------------------------------------- Protección de cortesías */
test("cortesías y protegidos: la base impide enlace, cliente y suscripción (regla general, no solo identificadores)", async () => {
  const now = new Date().toISOString();
  const link = (mid, n) => () => run("INSERT INTO billing_payment_links (id, membership_id, business_name, token_sha256, created_at, created_by, expires_at) VALUES (?, ?, 'X', ?, ?, 'a', ?)", "PAY-20261127-AAAAA" + n, mid, "h" + n, now, now);
  addMembership("MEM-GIFT", "PREMIUM_GIFT");
  addMembership("MEM-FREE", "FREE");
  addMembership("MEM-RET", "PREMIUM_PAID", { status: "retirada" });
  for (const b of ["BIZ-001", "BIZ-002", "BIZ-003", "BIZ-004", "BIZ-005"]) addMembership("MEM-" + b, "PREMIUM_PAID", { status: "activa", businessId: b });
  addMembership("MEM-FUTURA-GIFT", "PREMIUM_GIFT", { applicationId: "SOL-X", businessId: "BIZ-900" });
  addMembership("MEM-MISMA-SOL", "PREMIUM_PAID", { applicationId: "SOL-X" });
  addMembership("MEM-MISMO-BIZ", "PREMIUM_PAID", { businessId: "BIZ-900" });
  let n = 0;
  for (const mid of ["MEM-GIFT", "MEM-FREE", "MEM-RET", "MEM-BIZ-001", "MEM-BIZ-002", "MEM-BIZ-003", "MEM-BIZ-004", "MEM-BIZ-005", "MEM-MISMA-SOL", "MEM-MISMO-BIZ"]) {
    assert.throws(link(mid, n++), /cobro no permitido/, mid);
    assert.equal((await P.puedeCobrar(db(), mid)).ok, false, mid);
  }
  for (const mid of ["MEM-GIFT", "MEM-BIZ-003"]) {
    assert.throws(() => run("INSERT INTO billing_customers (membership_id, stripe_customer_id, created_at) VALUES (?, 'cus_x' || ?, ?)", mid, mid, now), /cobro no permitido/);
    assert.throws(() => run("INSERT INTO billing_subscriptions (stripe_subscription_id, membership_id, stripe_customer_id, status, created_at, updated_at) VALUES ('sub_' || ?, ?, 'cus_x', 'active', ?, ?)", mid, mid, now, now), /cobro no permitido/);
  }
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_payment_links").n, 0);
});

test("enlace de pago: solo para solicitudes Premium en revisión o aprobadas; nunca gratuitas ni con cortesía", async () => {
  addApplication("SOL-PEND", { status: "pendiente" });
  addApplication("SOL-FREE", { plan: "Gratuito" });
  addApplication("SOL-GIFT");
  addMembership("MEM-G", "PREMIUM_GIFT", { applicationId: "SOL-GIFT" });
  for (const [id, code] of [["SOL-PEND", "estado"], ["SOL-FREE", "gratuito"], ["SOL-GIFT", "cortesia"], ["SOL-NO", "no_existe"]]) {
    await assert.rejects(P.crearEnlacePago(db(), { applicationId: id, actor: "admin@example.com" }), (e) => e.code === code, id);
  }
  addApplication("SOL-OK");
  const l = await P.crearEnlacePago(db(), { applicationId: "SOL-OK", actor: "admin@example.com" });
  assert.match(l.linkId, P.LINK_ID_RE);
  assert.match(l.token, P.TOKEN_RE);
  const stored = row("SELECT * FROM billing_payment_links WHERE id = ?", l.linkId);
  assert.notEqual(stored.token_sha256, l.token, "solo se guarda la huella");
  assert.equal(stored.token_sha256, await P.hashToken(l.token));
  assert.equal(row("SELECT plan, status FROM business_memberships WHERE id = ?", l.membershipId).plan, "PREMIUM_PAID");
  /* Un enlace nuevo revoca el anterior: nunca dos abiertos */
  const l2 = await P.crearEnlacePago(db(), { applicationId: "SOL-OK", actor: "admin@example.com" });
  assert.equal(l2.membershipId, l.membershipId);
  assert.equal(row("SELECT status FROM billing_payment_links WHERE id = ?", l.linkId).status, "revocado");
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_payment_links WHERE status = 'pendiente'").n, 1);
  assert.equal(row("SELECT status FROM business_applications WHERE id = 'SOL-OK'").status, "en_revision", "el estado editorial no cambia");
});

/* -------------------------------------------------- Página /pago y Checkout */
test("/pagos/enlace: muestra las condiciones antes del pago (plazo de entrega e inicio del período incluidos)", async () => {
  addApplication("SOL-A");
  const l = await P.crearEnlacePago(db(), { applicationId: "SOL-A", actor: "admin@example.com" });
  const r = await post(enlace, "/pagos/enlace", { token: l.token });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.negocio, "Negocio de Prueba");
  assert.equal(d.modoPrueba, true);
  assert.equal(d.condiciones.version, P.TERMS_VERSION);
  assert.match(d.condiciones.precio, /\$24\.99 CAD al mes/);
  assert.match(d.condiciones.entrega, /10 días hábiles/);
  assert.match(d.condiciones.inicio, /empieza el día en que se confirma tu primer pago/);
  assert.match(d.condiciones.renovacion, /automáticamente cada mes/);
  assert.match(d.condiciones.permanencia, /Sin permanencia mínima/);
  assert.match(d.condiciones.cancelacion, /al final del período ya pagado/);
  assert.match(d.condiciones.devolucion, /100 %.*30 días.*cancelamos la suscripción/);
  assert.match(d.condiciones.impago, /7 días de gracia.*nunca borra tu perfil ni tus estadísticas/);
  assert.equal(JSON.stringify(d).includes("cliente@example.com"), false, "no expone el correo");
  /* Token inválido, vencido y método no permitido */
  assert.equal((await post(enlace, "/pagos/enlace", { token: "x".repeat(32) })).status, 404);
  run("UPDATE billing_payment_links SET expires_at = '2000-01-01T00:00:00Z'");
  const v = await post(enlace, "/pagos/enlace", { token: l.token });
  assert.equal(v.status, 409);
  assert.equal((await v.json()).estado, "vencido");
  assert.equal(enlaceOtro().status, 405);
  assert.equal(S.calls.length, 0, "comprobar un enlace no llama a Stripe");
});

test("/pagos/checkout: exige aceptar las condiciones vigentes; doble clic y dos pestañas → una sola sesión de Stripe", async () => {
  addApplication("SOL-B", { email: "b@example.com" });
  const l = await P.crearEnlacePago(db(), { applicationId: "SOL-B", actor: "admin@example.com" });
  assert.equal((await post(checkout, "/pagos/checkout", { token: l.token, condiciones: P.TERMS_VERSION })).status, 400);
  assert.equal((await post(checkout, "/pagos/checkout", { token: l.token, aceptaCondiciones: true, condiciones: "vieja" })).status, 409);
  assert.equal((await post(checkout, "/pagos/checkout", { token: l.token, aceptaCondiciones: true, condiciones: P.TERMS_VERSION }, { Origin: "https://otro.example" })).status, 403);
  const [a, b] = await Promise.all([1, 2].map(() => post(checkout, "/pagos/checkout", { token: l.token, aceptaCondiciones: true, condiciones: P.TERMS_VERSION })));
  const [ua, ub] = [await a.json(), await b.json()];
  assert.equal(ua.ok && ub.ok, true);
  assert.equal(ua.url, ub.url);
  assert.equal(S.sessions.size, 1, "una sola sesión de Checkout");
  const third = await (await post(checkout, "/pagos/checkout", { token: l.token, aceptaCondiciones: true, condiciones: P.TERMS_VERSION })).json();
  assert.equal(third.url, ua.url, "volver antes de que venza reutiliza la sesión");
  const s = [...S.sessions.values()][0];
  assert.equal(s.mode, "subscription");
  assert.equal(s.params["line_items[0][price]"], "price_TEST2499CAD");
  assert.equal(s.params["line_items[0][quantity]"], "1");
  assert.equal(s.client_reference_id, l.membershipId);
  assert.equal(s.params["subscription_data[metadata][membership_id]"], l.membershipId);
  assert.equal(s.customer_email, "b@example.com");
  assert.equal(s.params.billing_address_collection, "required");
  assert.equal(s.params["automatic_tax[enabled]"], undefined, "sin recaudación fiscal hasta confirmar obligaciones");
  assert.match(s.params.success_url, new RegExp("^" + ORIGIN + "/pago-confirmado\\?session_id=\\{CHECKOUT_SESSION_ID\\}$"));
  assert.ok(S.calls.every((c) => c.method !== "POST" || /^checkout-PAY-/.test(c.idem)), "Idempotency-Key en cada creación");
});

test("/pagos/checkout: un perfil protegido o una suscripción vigente no llegan a Stripe", async () => {
  addApplication("SOL-C", { businessId: "BIZ-777" });
  const l = await P.crearEnlacePago(db(), { applicationId: "SOL-C", actor: "admin@example.com" });
  run("INSERT INTO billing_protected (business_id, reason, added_at, added_by) VALUES ('BIZ-777', 'cortesia', '2026-11-27', 'admin')");
  const r = await post(checkout, "/pagos/checkout", { token: l.token, aceptaCondiciones: true, condiciones: P.TERMS_VERSION });
  assert.equal(r.status, 409);
  assert.equal(S.calls.length, 0);
});

/* -------------------------------------------------------------- Webhook */
test("webhook: firma ausente, inválida, vencida o de otro secreto → 400 sin tocar la base", async () => {
  const ev = event("invoice.paid", { id: "in_x" });
  const raw = JSON.stringify(ev);
  const call = (headers) => webhook({ request: new Request(ORIGIN + "/pagos/webhook", { method: "POST", headers, body: raw }), env });
  assert.equal((await call({})).status, 400);
  assert.equal((await call({ "Stripe-Signature": "t=1,v1=abc" })).status, 400);
  assert.equal((await sendEvent(ev, { secret: ["whsec", "otroSecreto"].join("_") })).status, 400);
  assert.equal((await sendEvent(ev, { t: Math.floor(Date.now() / 1000) - 600 })).status, 400, "más de 5 minutos");
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_events").n, 0);
  assert.equal(webhookOtro().status, 405);
  await assert.rejects(verifyWebhook(raw, await signPayload(raw, WHSEC), WHSEC, { now: Date.now() + 10 * 60000 }), (e) => e.reason === "fuera_de_tiempo");
});

test("pago aprobado: webhook firmado → suscripción activa, factura con impuestos separados, solicitud pagada; sin publicar nada", async () => {
  const { link, sub, inv } = await pagarPrimerMes();
  assert.equal(row("SELECT status FROM billing_payment_links WHERE id = ?", link.linkId).status, "usado");
  const s = row("SELECT * FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id);
  assert.equal(s.status, "active");
  assert.equal(s.membership_id, link.membershipId);
  assert.equal(s.amount, 2499);
  const f = row("SELECT * FROM billing_invoices WHERE stripe_invoice_id = ?", inv.id);
  assert.deepEqual([f.status, f.subtotal, f.tax, f.total, f.customer_province], ["paid", 2499, 125, 2624, "AB"]);
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_customers WHERE membership_id = ?", link.membershipId).n, 1);
  assert.match(row("SELECT detail FROM application_events WHERE application_id = 'SOL-20261127-AAAAAA' ORDER BY id DESC LIMIT 1").detail, /Solicitud pagada/);
  assert.equal(row("SELECT status FROM business_applications WHERE id = 'SOL-20261127-AAAAAA'").status, "en_revision", "el pago no publica ni aprueba");
  assert.equal(row("SELECT status FROM business_memberships WHERE id = ?", link.membershipId).status, "en_revision", "la membresía se activa al publicar, a mano");
  /* Confirmación al empresario: una vez, con portal e inicio del período */
  assert.equal(S.emails.length, 1);
  assert.deepEqual(S.emails[0].body.to, ["cliente@example.com"]);
  assert.match(S.emails[0].body.html, /billing\.stripe\.com\/p\/login/);
  assert.match(S.emails[0].body.html, /empieza el día en que se confirma tu primer pago/);
  /* Página de confirmación */
  const e = await estado({ request: new Request(ORIGIN + "/pagos/estado?session_id=" + [...S.sessions.keys()][0]), env });
  assert.equal((await e.json()).estado, "confirmado");
  /* El enlace ya no sirve para pagar otra vez */
  const again = await post(enlace, "/pagos/enlace", { token: link.token });
  assert.equal((await again.json()).estado, "usado");
});

test("eventos duplicados no se aplican dos veces; un evento antiguo no retrocede el estado", async () => {
  const { sub, inv } = await pagarPrimerMes();
  const ev = event("invoice.paid", { id: inv.id, subscription: sub.id, billing_reason: "subscription_create" }, { eventId: "evt_DUPLICADO0001" });
  const r1 = await (await sendEvent(ev)).json();
  const r2 = await (await sendEvent(ev)).json();
  assert.equal(r1.resultado, "aplicado");
  assert.equal(r2.resultado, "duplicado");
  assert.equal(S.emails.length, 1, "sin correos repetidos");
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_audit WHERE action = 'primer_pago_confirmado'").n, 1);
  /* Fuera de orden: llega primero el cambio nuevo y después uno antiguo */
  const t = Math.floor(Date.now() / 1000);
  S.subscriptions.get(sub.id).cancel_at_period_end = true;
  await sendEvent(event("customer.subscription.updated", { id: sub.id }, { created: t + 100 }));
  S.subscriptions.get(sub.id).cancel_at_period_end = false; /* lo que diría la API si se consultara un estado viejo */
  const old = await (await sendEvent(event("customer.subscription.updated", { id: sub.id }, { created: t + 50 }))).json();
  assert.equal(old.resultado, "ignorado");
  assert.equal(row("SELECT cancel_at_period_end FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id).cancel_at_period_end, 1);
  /* Una factura pagada no vuelve a «abierta» por un evento atrasado */
  S.invoices.get(inv.id).status = "open";
  await sendEvent(event("invoice.finalized", { id: inv.id, subscription: sub.id }));
  assert.equal(row("SELECT status FROM billing_invoices WHERE stripe_invoice_id = ?", inv.id).status, "paid");
});

test("pago rechazado: gracia configurable de 7 días, aviso en el panel y recuperación; nunca borra ni despublica", async () => {
  const { sub, link } = await pagarPrimerMes();
  const antes = row("SELECT * FROM business_applications WHERE id = 'SOL-20261127-AAAAAA'");
  const fail = S.addInvoice({ subscription: sub.id, status: "open", billing_reason: "subscription_cycle", amount_paid: 0, attempt_count: 1 });
  S.subscriptions.get(sub.id).status = "past_due";
  await sendEvent(event("invoice.payment_failed", { id: fail.id, subscription: sub.id, attempt_count: 1 }));
  const s = row("SELECT * FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id);
  assert.equal(s.status, "past_due");
  assert.ok(s.first_failed_at);
  const cfg = await P.settings(db());
  assert.deepEqual(P.estadoFinanciero(s, cfg, new Date(Date.parse(s.first_failed_at) + 2 * 86400000)), { estado: "en_gracia", dias_restantes: 5 });
  assert.deepEqual(P.estadoFinanciero(s, cfg, new Date(Date.parse(s.first_failed_at) + 8 * 86400000)), { estado: "gracia_vencida", beneficios_suspendibles: true });
  run("UPDATE billing_settings SET value = '10' WHERE key = 'grace_days'");
  assert.equal(P.estadoFinanciero(s, await P.settings(db()), new Date(Date.parse(s.first_failed_at) + 8 * 86400000)).estado, "en_gracia", "la gracia es configurable");
  assert.ok(row("SELECT 1 AS x FROM billing_audit WHERE action = 'pago_rechazado' AND membership_id = ?", link.membershipId));
  /* El cliente actualiza la tarjeta y el reintento paga */
  S.invoices.get(fail.id).status = "paid";
  S.subscriptions.get(sub.id).status = "active";
  await sendEvent(event("invoice.paid", { id: fail.id, subscription: sub.id, billing_reason: "subscription_cycle" }));
  const s2 = row("SELECT * FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id);
  assert.equal(s2.first_failed_at, null);
  assert.equal(P.estadoFinanciero(s2, cfg).estado, "al_dia");
  assert.deepEqual(row("SELECT * FROM business_applications WHERE id = 'SOL-20261127-AAAAAA'"), antes, "la solicitud no cambia por el impago");
  assert.equal(S.emails.length, 1, "la renovación no repite la confirmación inicial");
});

test("renovación mensual: cada factura se registra; ingresos e impuestos quedan separados", async () => {
  const { sub } = await pagarPrimerMes();
  for (let i = 0; i < 2; i++) {
    const r = S.addInvoice({ subscription: sub.id, billing_reason: "subscription_cycle" });
    await sendEvent(event("invoice.paid", { id: r.id, subscription: sub.id, billing_reason: "subscription_cycle" }));
  }
  const t = row("SELECT COUNT(*) AS n, SUM(subtotal) AS ingresos, SUM(tax) AS impuestos, SUM(total) AS total FROM billing_invoices WHERE status = 'paid'");
  assert.deepEqual([t.n, t.ingresos, t.impuestos, t.total], [3, 3 * 2499, 3 * 125, 3 * 2624]);
});

test("cancelación al final del período, retractación y fin de la suscripción", async () => {
  const { sub } = await pagarPrimerMes();
  const cfg = await P.settings(db());
  const get = () => row("SELECT * FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id);
  let t = Math.floor(Date.now() / 1000);
  S.subscriptions.get(sub.id).cancel_at_period_end = true;
  await sendEvent(event("customer.subscription.updated", { id: sub.id }, { created: ++t }));
  assert.equal(P.estadoFinanciero(get(), cfg).estado, "cancela_al_final");
  S.subscriptions.get(sub.id).cancel_at_period_end = false;
  await sendEvent(event("customer.subscription.updated", { id: sub.id }, { created: ++t }));
  assert.equal(P.estadoFinanciero(get(), cfg).estado, "al_dia");
  Object.assign(S.subscriptions.get(sub.id), { status: "canceled", canceled_at: t, ended_at: t });
  await sendEvent(event("customer.subscription.deleted", { id: sub.id }, { created: ++t }));
  assert.equal(P.estadoFinanciero(get(), cfg).estado, "cancelada");
  /* Recuperación: con la suscripción terminada se puede generar un enlace nuevo */
  const l2 = await P.crearEnlacePago(db(), { applicationId: "SOL-20261127-AAAAAA", actor: "admin@example.com" });
  assert.ok(l2.token);
});

test("devolución del 100 % del primer pago dentro de 30 días, con cancelación inmediata; fuera de plazo o repetida se rechaza", async () => {
  const { link, sub, inv } = await pagarPrimerMes();
  const r = await P.devolverPrimerPago(env, db(), { membershipId: link.membershipId, actor: "admin@example.com", motivo: "No se pudo aprobar" });
  assert.equal(r.amount, 2624);
  assert.equal(S.refunds.length, 1);
  assert.equal(S.refunds[0].payment_intent, inv.payment_intent);
  assert.equal(S.subscriptions.get(sub.id).status, "canceled", "sin renovaciones futuras");
  assert.equal(row("SELECT status FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id).status, "canceled");
  assert.ok(row("SELECT 1 AS x FROM billing_audit WHERE action = 'devolucion_primer_pago' AND actor = 'admin@example.com'"));
  /* El reembolso llega también como evento de Stripe */
  await sendEvent(event("charge.refunded", { id: inv.charge, payment_intent: inv.payment_intent, amount_refunded: 2624, refunds: { data: [{ id: S.refunds[0].id, amount: 2624, currency: "cad", status: "succeeded" }] } }));
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_refunds").n, 1, "sin duplicar la devolución");
  assert.equal(row("SELECT amount_refunded FROM billing_invoices WHERE stripe_invoice_id = ?", inv.id).amount_refunded, 2624);
  await assert.rejects(P.devolverPrimerPago(env, db(), { membershipId: link.membershipId, actor: "a" }), (e) => e.code === "ya_devuelto");
  const { link: l2 } = await pagarPrimerMes("SOL-20261127-BBBBBB");
  await assert.rejects(P.devolverPrimerPago(env, db(), { membershipId: l2.membershipId, actor: "a", now: new Date(Date.now() + 31 * 86400000) }), (e) => e.code === "fuera_de_plazo");
});

test("protección también en el webhook: un pago asociado a una cortesía se rechaza y queda como alerta", async () => {
  addMembership("MEM-REGALO", "PREMIUM_GIFT", { status: "activa", businessId: "BIZ-003" });
  const sub = S.addSubscription({ metadata: { membership_id: "MEM-REGALO" } });
  const r = await (await sendEvent(event("checkout.session.completed", { id: "cs_test_x", mode: "subscription", client_reference_id: "MEM-REGALO", customer: sub.customer, subscription: sub.id, metadata: { membership_id: "MEM-REGALO" } }))).json();
  assert.equal(r.resultado, "rechazado");
  await sendEvent(event("customer.subscription.created", { id: sub.id }));
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_subscriptions").n, 0);
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_customers").n, 0);
  assert.ok(row("SELECT 1 AS x FROM billing_audit WHERE action = 'alerta_cobro_no_permitido' AND membership_id = 'MEM-REGALO'"));
});

/* ---------------------------------------------------- Conciliación diaria */
test("conciliación: corrige en D1 lo que falte con la API de Stripe como fuente de verdad", async () => {
  const { sub } = await pagarPrimerMes();
  run("UPDATE billing_subscriptions SET status = 'active', cancel_at_period_end = 0");
  S.subscriptions.get(sub.id).status = "past_due";
  const huerfana = S.addSubscription({ metadata: {} });
  const r = await P.conciliar(env, db());
  assert.equal(r.revisadas, 2);
  assert.equal(r.corregidas, 1);
  assert.equal(r.alertas, 1);
  assert.equal(row("SELECT status FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id).status, "past_due");
  assert.ok(row("SELECT 1 AS x FROM billing_audit WHERE action = 'alerta_suscripcion_sin_membresia' AND object_id = ?", huerfana.id));
});

/* ------------------------------------- Acceso no autorizado y aislamiento */
test("cerrado por defecto: sin interruptor, sin configuración, con clave real o fuera del modo de prueba → 503", async () => {
  addApplication("SOL-D");
  const l = await P.crearEnlacePago(db(), { applicationId: "SOL-D", actor: "admin@example.com" });
  const casos = [{ PAGOS_ABIERTOS: undefined }, { PAGOS_ABIERTOS: "0" }, { STRIPE_SECRET_KEY: undefined }, { PAGOS_DB: undefined }, { STRIPE_SECRET_KEY: LIVE_RK }, { STRIPE_SECRET_KEY: LIVE_SK }, { PAGOS_MODO: "live" }, { PAGOS_MODO: undefined }, { STRIPE_WEBHOOK_SECRET: "otro-formato" }];
  for (const over of casos) {
    const keep = env;
    env = baseEnv(Object.assign({ PAGOS_DB: keep.PAGOS_DB }, over));
    assert.equal((await post(enlace, "/pagos/enlace", { token: l.token })).status, 503, JSON.stringify(over));
    assert.equal((await post(checkout, "/pagos/checkout", { token: l.token, aceptaCondiciones: true, condiciones: P.TERMS_VERSION })).status, 503);
    assert.equal((await sendEvent(event("invoice.paid", { id: "in_x" }))).status, 503);
    env = keep;
  }
  assert.equal(S.calls.length, 0);
  assert.equal(LIVE_MODE_ALLOWED, false, "los cobros reales están desactivados en el código");
  assert.deepEqual(missingConfig(baseEnv({ STRIPE_SECRET_KEY: LIVE_RK })), ["STRIPE_SECRET_KEY (es una clave REAL: los cobros reales están desactivados)"]);
});

test("aislamiento: los pagos solo usan PAGOS_DB (base de pruebas), nunca DIRECTORIO_DB de producción; eventos de modo real se rechazan", async () => {
  const produccion = fakeD1();
  env = baseEnv({ DIRECTORIO_DB: produccion });
  await pagarPrimerMes();
  for (const t of ["billing_payment_links", "billing_subscriptions", "billing_invoices", "billing_events", "billing_audit", "business_memberships", "application_events"]) {
    assert.equal(produccion._db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n, 0, `${t} de producción sin cambios`);
  }
  assert.ok(row("SELECT COUNT(*) AS n FROM billing_invoices").n > 0, "los datos quedan en la base de pruebas");
  const antes = row("SELECT COUNT(*) AS n FROM billing_events").n;
  assert.equal((await sendEvent(event("invoice.paid", { id: "in_real" }, { livemode: true }))).status, 400);
  assert.equal(row("SELECT COUNT(*) AS n FROM billing_events").n, antes);
  assert.equal(keyMode(KEY), "test");
  assert.equal(keyMode(LIVE_SK), "live");
  assert.equal(keyMode(["pk", "test", "publica"].join("_")), "");
});

test("/pagos/estado y consultas sin permiso: no revelan nada; registros sin secretos ni correos", async () => {
  await pagarPrimerMes();
  for (const q of ["", "?session_id=cs_test_noexiste123456", "?session_id=<script>", "?session_id=" + "a".repeat(500)]) {
    const d = await (await estado({ request: new Request(ORIGIN + "/pagos/estado" + q), env })).json();
    assert.equal(d.estado, "desconocido", q);
  }
  const texto = logs.join("\n");
  assert.doesNotMatch(texto, /whsec_|rk_test_|sk_test_|@example\.com|cliente@/);
});

test("formato de la API de Stripe: parámetros anidados", () => {
  const f = encodeForm({ mode: "subscription", line_items: [{ price: "price_1", quantity: 1 }], metadata: { a: "b" }, flag: true, nada: null });
  assert.equal(f.toString(), "mode=subscription&line_items%5B0%5D%5Bprice%5D=price_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Ba%5D=b&flag=true");
});
