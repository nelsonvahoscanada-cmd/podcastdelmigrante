/*
  Stripe simulado para pruebas (sin red). Atiende en https://stripe.test las
  llamadas que usa functions/_lib/pagos.js y guarda el estado en memoria.
  Respeta Idempotency-Key como Stripe: la misma clave devuelve el mismo objeto.
*/
import { STRIPE_API_VERSION } from "../../functions/_lib/stripe.js";

let seq = 0;
/* Expansiones que Stripe acepta en 2025-01-27.acacia para cada recurso (las
   que no existen en esa versión, como «payments» en la factura, se rechazan
   con 400 igual que en Stripe). */
const ACACIA_EXPAND = {
  invoice: ["charge", "charge.balance_transaction", "payment_intent", "payment_intent.latest_charge", "subscription", "customer"],
  charge: ["balance_transaction", "payment_intent", "invoice", "customer"],
};
const id = (p) => `${p}_${String(++seq).padStart(6, "0")}TESTOBJ`;

export function fakeStripe({ livemode = false } = {}) {
  const S = { sessions: new Map(), subscriptions: new Map(), invoices: new Map(), refunds: [], idem: new Map(), calls: [], emails: [], rejected: [] };

  S.addSubscription = (over = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const s = Object.assign({ id: id("sub"), object: "subscription", livemode, status: "active", cancel_at_period_end: false, customer: id("cus"), created: now, canceled_at: null, ended_at: null, metadata: {},
      current_period_start: now, current_period_end: now + 30 * 86400,
      items: { data: [{ current_period_start: now, current_period_end: now + 30 * 86400, price: { id: "price_TEST2499CAD", unit_amount: 2499, currency: "cad" } }] } }, over);
    S.subscriptions.set(s.id, s);
    return s;
  };
  S.addInvoice = (over = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const inv = Object.assign({ id: id("in"), object: "invoice", livemode, status: "paid", number: "PDM-" + String(seq).padStart(4, "0"), billing_reason: "subscription_create", currency: "cad",
      subtotal: 2499, tax: 125, total: 2624, amount_paid: 2624, total_tax_amounts: [{ amount: 125, inclusive: false, taxable_amount: 2499, tax_rate: "txr_gst" }], customer_address: { state: "AB", country: "CA" },
      payment_intent: id("pi"), charge: id("ch"), hosted_invoice_url: "https://invoice.stripe.test/x", invoice_pdf: "https://invoice.stripe.test/x.pdf", created: now,
      status_transitions: { paid_at: now }, attempt_count: 1, next_payment_attempt: null, lines: { data: [{ period: { start: now, end: now + 30 * 86400 } }] } }, over);
    S.invoices.set(inv.id, inv);
    return inv;
  };

  /* Cargo de una factura; la transacción de saldo (comisión real) solo viene
     expandida si se pide, como en Stripe. */
  const chargeOf = (inv, withBt) => {
    const txn = "txn_" + inv.charge;
    const bt = S.feesPending ? null : { id: txn, object: "balance_transaction", fee: Math.round(inv.amount_paid * 0.029) + 30 };
    return { id: inv.charge, object: "charge", amount: inv.amount_paid, payment_intent: inv.payment_intent, invoice: inv.id, balance_transaction: withBt ? bt : bt && txn };
  };
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  const notFound = () => json({ error: { type: "invalid_request_error", code: "resource_missing", message: "No such object" } }, 404);

  S.handle = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || "GET";
    const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || "";
    const version = init.headers && init.headers["Stripe-Version"];
    S.calls.push({ method, path: u.pathname, idem: init.headers && init.headers["Idempotency-Key"], version });
    if (!/^Bearer (sk|rk)_test_/.test(auth)) return json({ error: { type: "authentication_error", message: "bad key" } }, 401);
    const reject = (message) => {
      S.rejected.push({ method, path: u.pathname, message });
      return json({ error: { type: "invalid_request_error", message } }, 400);
    };
    if (version !== STRIPE_API_VERSION) return reject("Stripe-Version distinta de " + STRIPE_API_VERSION + ": " + version);
    const expand = [];
    for (const [k, v] of u.searchParams) if (/^expand\[\d*\]$/.test(k)) expand.push(v);
    const resource = /^\/v1\/invoices\//.test(u.pathname) ? "invoice" : /^\/v1\/charges\//.test(u.pathname) ? "charge" : null;
    for (const e of expand) if (!resource || !ACACIA_EXPAND[resource].includes(e)) return reject("This property cannot be expanded (" + e + ").");
    const idem = init.headers && init.headers["Idempotency-Key"];
    if (idem && S.idem.has(idem)) return json(S.idem.get(idem));
    const body = new URLSearchParams(init.body || "");
    let out;
    if (method === "POST" && u.pathname === "/v1/checkout/sessions") {
      out = { id: "cs_test_" + id("sess").replace(/[^A-Za-z0-9]/g, ""), object: "checkout.session", livemode, url: "https://checkout.stripe.com/c/pay/" + seq, expires_at: Number(body.get("expires_at")), mode: body.get("mode"),
        client_reference_id: body.get("client_reference_id"), customer: body.get("customer"), customer_email: body.get("customer_email"), params: Object.fromEntries(body) };
      S.sessions.set(out.id, out);
    } else if (method === "GET" && /^\/v1\/subscriptions\/[^/]+$/.test(u.pathname)) {
      out = S.subscriptions.get(u.pathname.split("/").pop());
      if (!out) return notFound();
    } else if (method === "DELETE" && /^\/v1\/subscriptions\/[^/]+$/.test(u.pathname)) {
      out = S.subscriptions.get(u.pathname.split("/").pop());
      if (!out) return notFound();
      Object.assign(out, { status: "canceled", canceled_at: Math.floor(Date.now() / 1000), ended_at: Math.floor(Date.now() / 1000) });
    } else if (method === "POST" && /^\/v1\/subscriptions\/[^/]+$/.test(u.pathname)) {
      out = S.subscriptions.get(u.pathname.split("/").pop());
      if (!out) return notFound();
      if (body.has("cancel_at_period_end")) out.cancel_at_period_end = body.get("cancel_at_period_end") === "true";
    } else if (method === "GET" && /^\/v1\/charges\/[^/]+$/.test(u.pathname)) {
      const inv = [...S.invoices.values()].find((i) => i.charge === u.pathname.split("/").pop());
      if (!inv) return notFound();
      out = chargeOf(inv, expand.includes("balance_transaction"));
    } else if (method === "GET" && u.pathname === "/v1/subscriptions") {
      out = { object: "list", data: [...S.subscriptions.values()], has_more: false };
    } else if (method === "GET" && /^\/v1\/invoices\/[^/]+$/.test(u.pathname)) {
      const inv = S.invoices.get(u.pathname.split("/").pop());
      if (!inv) return notFound();
      out = Object.assign({}, inv);
      if (inv.charge && (expand.includes("charge") || expand.includes("charge.balance_transaction"))) out.charge = chargeOf(inv, expand.includes("charge.balance_transaction"));
      if (inv.payment_intent && expand.includes("payment_intent")) out.payment_intent = { id: inv.payment_intent, object: "payment_intent", latest_charge: inv.charge || null };
    } else if (method === "POST" && u.pathname === "/v1/refunds") {
      out = { id: id("re"), object: "refund", amount: Number(body.get("amount")), currency: "cad", status: "succeeded", charge: body.get("charge") || null, payment_intent: body.get("payment_intent"), created: Math.floor(Date.now() / 1000) };
      S.refunds.push(out);
    } else {
      return notFound();
    }
    if (idem) S.idem.set(idem, out);
    return json(out);
  };
  return S;
}

/* Instala fetch: Stripe simulado + Resend simulado; cualquier otra red falla. */
export function installStripeFetch(S) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith("https://stripe.test/")) return S.handle(u, init);
    if (u.startsWith("https://resend.test/")) {
      S.emails.push({ headers: init.headers, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ id: "email" }), { status: 200 });
    }
    throw new Error("Red no permitida en pruebas: " + u);
  };
  return () => { globalThis.fetch = original; };
}

export function event(type, object, { created = Math.floor(Date.now() / 1000), livemode = false, eventId, apiVersion = STRIPE_API_VERSION } = {}) {
  return { id: eventId || "evt_" + id("e").replace(/[^A-Za-z0-9]/g, ""), object: "event", api_version: apiVersion, type, created, livemode, data: { object } };
}
