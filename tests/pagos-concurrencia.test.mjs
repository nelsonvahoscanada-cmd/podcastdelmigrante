/*
  Regresión de la primera prueba de extremo a extremo (28-11-2026): webhooks
  simultáneos, fuera de orden, con marcas de tiempo iguales y duplicados;
  suscripciones con otro identificador; facturas antes que la suscripción;
  confirmación única del primer pago; recuperación tras errores con historial
  conservado; alertas de cancelación; condiciones v2. Sin red.
  node --test tests/pagos-concurrencia.test.mjs
*/
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fakeD1 } from "./helpers/fake-cloudflare.mjs";
import { fakeStripe, installStripeFetch, event } from "./helpers/fake-stripe.mjs";
import * as P from "../functions/_lib/pagos.js";
import { signPayload } from "../functions/_lib/stripe.js";
import { onRequestPost as webhook } from "../functions/pagos/webhook.js";
import { onRequestPost as checkout } from "../functions/pagos/checkout.js";

const fakeKey = (kind, mode) => [kind, mode, "PRUEBAfalsa" + "0".repeat(16)].join("_");
const WHSEC = ["whsec", "pruebaDeFirmaLocal123456"].join("_");
const ORIGIN = "https://claude-pagos.podcastdelmigrante.pages.dev";
let S, restore, env, errLogs;

const db = () => env.PAGOS_DB;
const row = (sql, ...a) => db()._db.prepare(sql).get(...a);
const rows = (sql, ...a) => db()._db.prepare(sql).all(...a);
const n = (sql, ...a) => row(sql, ...a).n;

function addApplication(id, plan = "Premium") {
  const now = new Date().toISOString();
  db()._db.prepare(
    `INSERT INTO business_applications (id, idempotency_key, created_at, updated_at, status, name, category, city, province, representative, summary, email, image_kind, image_key, image_type, image_bytes, consent_version, consent_at, notes)
     VALUES (?, ?, ?, ?, 'aprobada', 'Negocio', 'c', 'Calgary', 'Alberta', 'Ana', 'R', 'cliente@example.com', 'logo', 'k', 'image/png', 1, 'v', ?, ?)`
  ).run(id, "i-" + id, now, now, now, `Plan solicitado: Plan ${plan}`);
}
async function sendEvent(ev) {
  const raw = JSON.stringify(ev);
  const sig = await signPayload(raw, WHSEC);
  return webhook({ request: new Request(ORIGIN + "/pagos/webhook", { method: "POST", headers: { "Stripe-Signature": sig, "Content-Type": "application/json" }, body: raw }), env });
}
/* Enlace + Checkout + objetos en Stripe; devuelve los 4 eventos del pago */
async function prepararPago(appId = "SOL-20261128-AAAAAA", { t = Math.floor(Date.now() / 1000) } = {}) {
  addApplication(appId);
  const l = await P.crearEnlacePago(db(), { applicationId: appId, actor: "admin@example.com" });
  await checkout({ request: new Request(ORIGIN + "/pagos/checkout", { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify({ token: l.token, aceptaCondiciones: true, condiciones: P.TERMS_VERSION }) }), env });
  const ses = [...S.sessions.values()].at(-1);
  const sub = S.addSubscription({ metadata: { membership_id: l.membershipId } });
  const inv = S.addInvoice({ subscription: sub.id, customer: sub.customer, tax: 0, total: 2499, amount_paid: 2499, total_tax_amounts: [] });
  const ev = {
    finalized: event("invoice.finalized", { id: inv.id, object: "invoice", subscription: sub.id }, { created: t }),
    created: event("customer.subscription.created", { id: sub.id, object: "subscription" }, { created: t }),
    checkout: event("checkout.session.completed", { id: ses.id, object: "checkout.session", mode: "subscription", payment_status: "paid", client_reference_id: l.membershipId, customer: sub.customer, subscription: sub.id, metadata: { membership_id: l.membershipId, payment_link_id: l.linkId } }, { created: t }),
    paid: event("invoice.paid", { id: inv.id, object: "invoice", subscription: sub.id }, { created: t }),
  };
  return { l, ses, sub, inv, ev };
}
function permutaciones(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) => permutaciones([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
}
/* Estado esperado tras un primer pago correcto */
function estadoCorrecto(l, sub, inv) {
  assert.equal(n("SELECT COUNT(*) n FROM billing_subscriptions"), 1, "una sola suscripción");
  const s = row("SELECT * FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id);
  assert.equal(s.membership_id, l.membershipId);
  assert.equal(s.status, "active");
  const f = row("SELECT * FROM billing_invoices WHERE stripe_invoice_id = ?", inv.id);
  assert.equal(f.status, "paid");
  assert.equal(f.membership_id, l.membershipId, "factura vinculada a su membresía");
  assert.equal(f.charge_id, inv.charge);
  assert.equal(f.payment_intent_id, inv.payment_intent);
  assert.equal(f.stripe_fee, Math.round(2499 * 0.029) + 30);
  assert.equal(n("SELECT COUNT(*) n FROM billing_audit WHERE action = 'primer_pago_confirmado'"), 1, "primer pago confirmado una sola vez");
  assert.equal(n("SELECT COUNT(*) n FROM application_events WHERE detail LIKE 'Solicitud pagada%'"), 1);
  assert.equal(S.emails.length, 1, "un solo correo de confirmación");
  assert.equal(row("SELECT status FROM billing_payment_links WHERE id = ?", l.linkId).status, "usado");
  assert.equal(n("SELECT COUNT(*) n FROM billing_customers"), 1);
  /* El pago nunca publica ni cambia el estado editorial */
  const a = row("SELECT status, business_id, business_slug FROM business_applications WHERE id = (SELECT application_id FROM business_memberships WHERE id = ?)", l.membershipId);
  assert.deepEqual([a.status, a.business_id, a.business_slug], ["aprobada", null, null]);
  assert.equal(row("SELECT status FROM business_memberships WHERE id = ?", l.membershipId).status, "en_revision");
}

/* Stripe con latencia variable (1–8 ms) en todas las pruebas de este archivo */
const conLatencia = (st) => Object.assign(st, { latencia: () => 1 + Math.floor(Math.random() * 8) });
/* D1 con latencia de red (0–3 ms por consulta), como en Cloudflare */
const d1 = (o = {}) => fakeD1({ latencia: () => Math.floor(Math.random() * 4), ...o });

beforeEach(() => {
  S = conLatencia(fakeStripe());
  restore = installStripeFetch(S);
  errLogs = [];
  env = {
    PAGOS_DB: d1(), STRIPE_SECRET_KEY: fakeKey("rk", "test"), STRIPE_WEBHOOK_SECRET: WHSEC, STRIPE_PRICE_ID: "price_TEST2499CAD", STRIPE_API_BASE: "https://stripe.test",
    PAGOS_ABIERTOS: "1", PAGOS_MODO: "test", RESEND_API_KEY: "re_test", RESEND_API_URL: "https://resend.test/emails", MAIL_FROM: "Pagos <pagos@podcastdelmigrante.com>",
  };
});
afterEach(() => restore());

test("webhooks SIMULTÁNEOS: las 24 combinaciones de los 4 eventos del pago responden 200 al primer intento y dejan un estado único y correcto", async () => {
  const origErr = console.error;
  console.error = () => {};
  try {
    for (const orden of permutaciones(["finalized", "created", "checkout", "paid"])) {
      restore();
      S = conLatencia(fakeStripe());
      restore = installStripeFetch(S);
      env.PAGOS_DB = d1();
      const { l, sub, inv, ev } = await prepararPago();
      const res = await Promise.all(orden.map((k) => sendEvent(ev[k])));
      assert.deepEqual(res.map((r) => r.status), [200, 200, 200, 200], "sin 500 ni reintentos: " + orden.join(","));
      assert.equal(n("SELECT COUNT(*) n FROM billing_events WHERE result IN ('error','procesando')"), 0);
      assert.equal(n("SELECT COUNT(*) n FROM billing_audit WHERE action = 'error_webhook'"), 0);
      estadoCorrecto(l, sub, inv);
    }
  } finally {
    console.error = origErr;
  }
});

test("webhooks FUERA DE ORDEN (secuenciales, 24 órdenes): mismo estado final", async () => {
  for (const orden of permutaciones(["finalized", "created", "checkout", "paid"])) {
    restore();
    S = conLatencia(fakeStripe());
    restore = installStripeFetch(S);
    env.PAGOS_DB = d1();
    const { l, sub, inv, ev } = await prepararPago();
    for (const k of orden) assert.equal((await sendEvent(ev[k])).status, 200, orden.join(","));
    estadoCorrecto(l, sub, inv);
  }
});

test("lectura antigua que termina después (misma marca de tiempo del evento): nunca pisa el estado más reciente", async () => {
  const { sub, ev } = await prepararPago();
  for (const k of ["checkout", "paid"]) await sendEvent(ev[k]);
  const t = Math.floor(Date.now() / 1000) + 10;
  /* A pide la suscripción (foto: sin cancelación) y se queda esperando… */
  const liberar = S.retenerRespuesta("GET", `/v1/subscriptions/${sub.id}`);
  const lento = sendEvent(event("customer.subscription.updated", { id: sub.id }, { created: t }));
  await new Promise((r) => setTimeout(r, 5));
  /* …el cliente programa la cancelación y B (misma marca de tiempo) la guarda */
  S.subscriptions.get(sub.id).cancel_at_period_end = true;
  await new Promise((r) => setTimeout(r, 5));
  const rb = await (await sendEvent(event("customer.subscription.updated", { id: sub.id }, { created: t }))).json();
  assert.equal(rb.resultado, "aplicado");
  liberar();
  const ra = await (await lento).json();
  assert.equal(ra.resultado, "ignorado", "la foto antigua se descarta");
  assert.equal(row("SELECT cancel_at_period_end AS c FROM billing_subscriptions WHERE stripe_subscription_id = ?", sub.id).c, 1);
});

test("entregas DUPLICADAS simultáneas del mismo evento: se procesa una vez; la otra recibe 409 o «duplicado»", async () => {
  const { l, sub, inv, ev } = await prepararPago();
  await sendEvent(ev.checkout);
  const res = await Promise.all([sendEvent(ev.paid), sendEvent(ev.paid), sendEvent(ev.paid)]);
  const cuerpos = await Promise.all(res.map((r) => r.json()));
  assert.ok(res.some((r) => r.status === 200));
  assert.ok(res.every((r) => r.status === 200 || r.status === 409), res.map((r) => r.status).join(","));
  for (const [i, r] of res.entries()) if (r.status === 409) assert.equal(cuerpos[i].resultado, "en_curso");
  /* El reintento de Stripe de la entrega con 409 queda como duplicado */
  assert.equal((await (await sendEvent(ev.paid)).json()).resultado, "duplicado");
  await sendEvent(ev.finalized);
  estadoCorrecto(l, sub, inv);
});

test("primer pago confirmado UNA sola vez aunque lleguen dos invoice.paid distintos a la vez", async () => {
  const { l, sub, inv, ev } = await prepararPago();
  await sendEvent(ev.checkout);
  const otro = event("invoice.paid", { id: inv.id, object: "invoice", subscription: sub.id }, { created: ev.paid.created });
  const res = await Promise.all([sendEvent(ev.paid), sendEvent(otro)]);
  assert.deepEqual(res.map((r) => r.status), [200, 200]);
  estadoCorrecto(l, sub, inv);
});

test("otra suscripción (identificador distinto) para la misma membresía: nunca sobrescribe; alerta; se acepta si la primera ya terminó", async () => {
  const { l, sub, ev } = await prepararPago();
  for (const k of ["checkout", "paid"]) await sendEvent(ev[k]);
  const sub2 = S.addSubscription({ metadata: { membership_id: l.membershipId } });
  const r = await (await sendEvent(event("customer.subscription.created", { id: sub2.id, object: "subscription" }))).json();
  assert.equal(r.resultado, "rechazado");
  assert.equal(n("SELECT COUNT(*) n FROM billing_subscriptions"), 1);
  assert.equal(row("SELECT stripe_subscription_id AS id, status FROM billing_subscriptions").id, sub.id, "la original queda intacta");
  assert.equal(n("SELECT COUNT(*) n FROM billing_audit WHERE action = 'alerta_suscripcion_duplicada' AND object_id = ?", sub2.id), 1);
  /* La primera terminó en Stripe pero el aviso aún no llegó: se relee y se acepta la nueva */
  Object.assign(S.subscriptions.get(sub.id), { status: "canceled", canceled_at: 1, ended_at: 1 });
  const r2 = await (await sendEvent(event("customer.subscription.updated", { id: sub2.id, object: "subscription" }))).json();
  assert.equal(r2.resultado, "aplicado");
  assert.deepEqual(rows("SELECT stripe_subscription_id AS id, status FROM billing_subscriptions ORDER BY status").map((x) => [x.id, x.status]), [[sub2.id, "active"], [sub.id, "canceled"]]);
});

test("factura guardada antes que la suscripción: queda vinculada a su membresía al llegar la suscripción", async () => {
  const { l, sub, inv, ev } = await prepararPago();
  await P.guardarFactura(env, db(), S.invoices.get(inv.id), sub.id);
  assert.equal(row("SELECT membership_id FROM billing_invoices WHERE stripe_invoice_id = ?", inv.id).membership_id, null);
  await sendEvent(ev.created);
  assert.equal(row("SELECT membership_id FROM billing_invoices WHERE stripe_invoice_id = ?", inv.id).membership_id, l.membershipId);
  /* Y un reintento posterior no la desvincula */
  await sendEvent(ev.paid);
  assert.equal(row("SELECT membership_id FROM billing_invoices WHERE stripe_invoice_id = ?", inv.id).membership_id, l.membershipId);
});

test("recuperación tras un error: 500, historial del error CONSERVADO (sin correos ni claves) y reintento aplicado", async () => {
  const origErr = console.error;
  console.error = (...a) => errLogs.push(a.join(" "));
  try {
    const { l, sub, inv, ev } = await prepararPago();
    await sendEvent(ev.checkout);
    S.fallar = { metodo: "GET", ruta: "/v1/subscriptions/", veces: 1, status: 500, mensaje: `Fallo para cliente@example.com con ${fakeKey("sk", "test")}` };
    assert.equal((await sendEvent(ev.paid)).status, 500);
    assert.equal(row("SELECT result FROM billing_events WHERE stripe_event_id = ?", ev.paid.id).result, "error");
    assert.equal((await sendEvent(ev.paid)).status, 200, "Stripe reintenta y se aplica");
    assert.equal(row("SELECT result FROM billing_events WHERE stripe_event_id = ?", ev.paid.id).result, "aplicado");
    const hist = rows("SELECT detail FROM billing_audit WHERE action = 'error_webhook' AND object_id = ?", ev.paid.id);
    assert.equal(hist.length, 1, "el error queda en el historial aunque luego se recupere");
    assert.match(hist[0].detail, /^invoice\.paid: /);
    const todo = JSON.stringify(hist) + errLogs.join(" ");
    assert.ok(!todo.includes("cliente@example.com") && !/sk_test_/.test(todo), "sin correos ni claves en auditoría ni logs");
    estadoCorrecto(l, sub, inv);
  } finally {
    console.error = origErr;
  }
});

test("limpieza de mensajes técnicos: sin correos, claves, secretos ni tokens Bearer; longitud limitada", () => {
  const e = new Error(`D1_ERROR: fallo con cliente@example.com ${fakeKey("sk", "live")} ${fakeKey("rk", "test")} ${WHSEC} Bearer abc.def ` + "x".repeat(400));
  const m = P.limpiarError(e);
  assert.ok(!m.includes("cliente@example.com") && !/(sk|rk)_(live|test)_/.test(m) && !m.includes("whsec_") && !m.includes("abc.def"), m);
  assert.match(m, /^D1_ERROR: fallo con \[correo\] \[clave\] \[clave\] \[secreto\] Bearer \[oculto\]/);
  assert.ok(m.length <= 200);
});

test("recuperación tras un error de la base (mensaje con datos sensibles): queda en el historial ya limpio", async () => {
  const { ev } = await prepararPago();
  await sendEvent(ev.checkout);
  const real = env.PAGOS_DB;
  let fallos = 1;
  env.PAGOS_DB = new Proxy(real, { get(t, k) {
    if (k === "prepare") return (sql) => { if (/INSERT INTO billing_invoices/.test(sql) && fallos-- > 0) throw new Error("D1_ERROR: database is locked (cliente@example.com)"); return t.prepare(sql); };
    return t[k];
  } });
  const origErr = console.error; console.error = (...a) => errLogs.push(a.join(" "));
  try {
    assert.equal((await sendEvent(ev.paid)).status, 500);
    assert.equal((await sendEvent(ev.paid)).status, 200);
  } finally { console.error = origErr; env.PAGOS_DB = real; }
  const d = row("SELECT detail FROM billing_audit WHERE action = 'error_webhook'").detail;
  assert.equal(d, "invoice.paid: D1_ERROR: database is locked ([correo])");
  assert.ok(!errLogs.join(" ").includes("cliente@example.com"));
});

test("reserva del evento: un proceso interrumpido se retoma al caducar la reserva; una reserva viva devuelve 409", async () => {
  const { ev } = await prepararPago();
  await sendEvent(ev.checkout);
  const ahora = new Date().toISOString();
  db()._db.prepare("INSERT INTO billing_events (stripe_event_id, type, livemode, stripe_created, received_at, processed_at, result) VALUES (?, 'invoice.paid', 0, 1, ?, ?, 'procesando')").run(ev.paid.id, ahora, ahora);
  assert.equal((await sendEvent(ev.paid)).status, 409, "otro proceso lo tiene reservado");
  const viejo = new Date(Date.now() - P.RESERVA_MS - 1000).toISOString();
  db()._db.prepare("UPDATE billing_events SET processed_at = ? WHERE stripe_event_id = ?").run(viejo, ev.paid.id);
  assert.equal((await sendEvent(ev.paid)).status, 200, "reserva caducada: se retoma");
  assert.equal(row("SELECT result FROM billing_events WHERE stripe_event_id = ?", ev.paid.id).result, "aplicado");
});

test("cancelaciones: fecha fija inesperada → alerta (una vez) sin sacar del MRR actual; baja no pedida → alerta; cancelación desde el portal → sin alerta", async () => {
  const { sub, ev } = await prepararPago();
  for (const k of ["checkout", "paid"]) await sendEvent(ev[k]);
  const fecha = Math.floor(Date.UTC(2027, 1, 26) / 1000);
  S.subscriptions.get(sub.id).cancel_at = fecha;
  await sendEvent(event("customer.subscription.updated", { id: sub.id }));
  await sendEvent(event("customer.subscription.updated", { id: sub.id }));
  const al = rows("SELECT detail FROM billing_audit WHERE action = 'alerta_cancelacion_programada'");
  assert.equal(al.length, 1);
  assert.match(al[0].detail, /2027-02-26/);
  assert.equal(row("SELECT status FROM billing_subscriptions").status, "active", "sigue activa y pagada");
  Object.assign(S.subscriptions.get(sub.id), { status: "canceled", cancellation_details: { reason: "payment_failed" }, canceled_at: fecha, ended_at: fecha });
  await sendEvent(event("customer.subscription.deleted", { id: sub.id }));
  assert.equal(n("SELECT COUNT(*) n FROM billing_audit WHERE action = 'alerta_cancelacion_inesperada'"), 1);
  /* Otra suscripción cancelada por el propio cliente: sin alerta */
  env.PAGOS_DB = d1();
  const p2 = await prepararPago("SOL-20261128-BBBBBB");
  for (const k of ["checkout", "paid"]) await sendEvent(p2.ev[k]);
  Object.assign(S.subscriptions.get(p2.sub.id), { cancel_at_period_end: true, cancel_at: fecha });
  await sendEvent(event("customer.subscription.updated", { id: p2.sub.id }));
  Object.assign(S.subscriptions.get(p2.sub.id), { status: "canceled", cancellation_details: { reason: "cancellation_requested" } });
  await sendEvent(event("customer.subscription.deleted", { id: p2.sub.id }));
  assert.equal(n("SELECT COUNT(*) n FROM billing_audit WHERE action LIKE 'alerta_cancelacion%'"), 0);
});

test("aviso de rechazo que llega tarde (factura ya pagada): no abre el período de gracia", async () => {
  const { sub, inv, ev } = await prepararPago();
  for (const k of ["checkout", "paid"]) await sendEvent(ev[k]);
  await sendEvent(event("invoice.payment_failed", { id: inv.id, object: "invoice", subscription: sub.id, attempt_count: 1 }));
  assert.equal(row("SELECT first_failed_at FROM billing_subscriptions").first_failed_at, null);
  assert.equal(P.estadoFinanciero(row("SELECT * FROM billing_subscriptions"), await P.settings(db())).estado, "al_dia");
});

test("reembolso: el importe devuelto es acumulado y un estado final no retrocede", async () => {
  const { inv, ev } = await prepararPago();
  for (const k of ["checkout", "paid"]) await sendEvent(ev[k]);
  const base = { id: inv.charge, object: "charge", payment_intent: inv.payment_intent };
  await sendEvent(event("charge.refunded", { ...base, amount_refunded: 2499, refunds: { data: [{ id: "re_A", amount: 2499, currency: "cad", status: "succeeded" }] } }));
  await sendEvent(event("charge.refunded", { ...base, amount_refunded: 1000, refunds: { data: [{ id: "re_A", amount: 2499, currency: "cad", status: "pending" }] } }));
  assert.equal(row("SELECT amount_refunded FROM billing_invoices").amount_refunded, 2499);
  assert.equal(row("SELECT status FROM billing_refunds WHERE stripe_refund_id = 're_A'").status, "succeeded");
});

test("condiciones v2: texto aprobado, días configurables (singular/plural), v1 conservada y Checkout exige v2", async () => {
  assert.equal(P.TERMS_VERSION, "pagos-premium-2026-11-v2");
  const cfg = await P.settings(db());
  assert.equal(P.condiciones(cfg).entrega, "Preparamos tu miniweb y te enviamos una vista previa en un plazo máximo de 10 días hábiles, contados a partir de la confirmación del primer pago y de la recepción completa de todos los materiales necesarios para su elaboración. Tu miniweb se publicará únicamente después de recibir tu aprobación de la vista previa.");
  assert.match(P.condiciones({ ...cfg, delivery_business_days: 3 }).entrega, /plazo máximo de 3 días hábiles,/);
  assert.match(P.condiciones({ ...cfg, delivery_business_days: 1 }).entrega, /plazo máximo de 1 día hábil,/);
  assert.equal(P.TERMS_V1_ENTREGA(10), "Preparamos tu miniweb y te enviamos la vista previa en un plazo de hasta 10 días hábiles desde la confirmación del pago. Se publica solo cuando tú apruebas la vista previa.");
  addApplication("SOL-20261128-CCCCCC");
  const l = await P.crearEnlacePago(db(), { applicationId: "SOL-20261128-CCCCCC", actor: "a" });
  await assert.rejects(P.crearCheckout(env, db(), { token: l.token, termsVersion: "pagos-premium-2026-11-v1", siteOrigin: ORIGIN }), (e) => e.code === "condiciones");
  await P.crearCheckout(env, db(), { token: l.token, termsVersion: P.TERMS_VERSION, siteOrigin: ORIGIN });
  assert.equal(row("SELECT terms_version FROM billing_payment_links WHERE id = ?", l.linkId).terms_version, P.TERMS_VERSION);
  /* Un enlace ya pagado con v1 conserva su versión aceptada */
  db()._db.prepare("UPDATE billing_payment_links SET terms_version = 'pagos-premium-2026-11-v1' WHERE id = ?").run(l.linkId);
  await P.conciliar(env, db());
  assert.equal(row("SELECT terms_version FROM billing_payment_links WHERE id = ?", l.linkId).terms_version, "pagos-premium-2026-11-v1");
});

test("protección: eventos simultáneos para un perfil protegido o una cortesía nunca crean cliente, suscripción ni factura", async () => {
  const now = new Date().toISOString();
  for (const [mid, plan, biz] of [["MEM-20261128-PROT01", "PREMIUM_PAID", "BIZ-001"], ["MEM-20261128-GIFT01", "PREMIUM_GIFT", null]]) {
    db()._db.prepare("INSERT INTO business_memberships (id, plan, status, business_name, business_id, created_at, updated_at) VALUES (?, ?, 'activa', 'X', ?, ?, ?)").run(mid, plan, biz, now, now);
    const sub = S.addSubscription({ metadata: { membership_id: mid } });
    const inv = S.addInvoice({ subscription: sub.id, customer: sub.customer });
    const res = await Promise.all([
      sendEvent(event("checkout.session.completed", { id: "cs_test_" + mid.replace(/-/g, ""), object: "checkout.session", mode: "subscription", client_reference_id: mid, customer: sub.customer, subscription: sub.id, metadata: { membership_id: mid } })),
      sendEvent(event("customer.subscription.created", { id: sub.id, object: "subscription" })),
      sendEvent(event("invoice.paid", { id: inv.id, object: "invoice", subscription: sub.id })),
    ]);
    assert.ok(res.every((r) => r.status === 200), res.map((r) => r.status).join(","));
  }
  assert.equal(n("SELECT COUNT(*) n FROM billing_subscriptions"), 0);
  assert.equal(n("SELECT COUNT(*) n FROM billing_customers"), 0);
  assert.equal(n("SELECT COUNT(*) n FROM billing_invoices"), 0);
  assert.equal(n("SELECT COUNT(*) n FROM billing_payment_links"), 0);
  assert.ok(n("SELECT COUNT(*) n FROM billing_audit WHERE action = 'alerta_cobro_no_permitido'") >= 2);
  assert.equal(S.emails.length, 0);
});
