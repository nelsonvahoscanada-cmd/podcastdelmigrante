/*
  Stripe simulado para pruebas (sin red). Atiende en https://stripe.test las
  llamadas que usa functions/_lib/pagos.js y guarda el estado en memoria.
  Respeta Idempotency-Key como Stripe: la misma clave devuelve el mismo objeto.
*/
let seq = 0;
const id = (p) => `${p}_${String(++seq).padStart(6, "0")}TESTOBJ`;

export function fakeStripe({ livemode = false } = {}) {
  const S = { sessions: new Map(), subscriptions: new Map(), invoices: new Map(), refunds: [], idem: new Map(), calls: [], emails: [] };

  S.addSubscription = (over = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const s = Object.assign({ id: id("sub"), object: "subscription", livemode, status: "active", cancel_at_period_end: false, customer: id("cus"), created: now, canceled_at: null, ended_at: null, metadata: {},
      items: { data: [{ current_period_start: now, current_period_end: now + 30 * 86400, price: { id: "price_TEST2499CAD", unit_amount: 2499, currency: "cad" } }] } }, over);
    S.subscriptions.set(s.id, s);
    return s;
  };
  S.addInvoice = (over = {}) => {
    const now = Math.floor(Date.now() / 1000);
    const inv = Object.assign({ id: id("in"), object: "invoice", livemode, status: "paid", number: "PDM-" + String(seq).padStart(4, "0"), billing_reason: "subscription_create", currency: "cad",
      subtotal: 2499, tax: 125, total: 2624, amount_paid: 2624, total_taxes: [{ amount: 125, taxable_amount: 2499, tax_rate_details: { tax_rate: "txr_gst" } }], customer_address: { state: "AB", country: "CA" },
      payment_intent: id("pi"), charge: id("ch"), hosted_invoice_url: "https://invoice.stripe.test/x", invoice_pdf: "https://invoice.stripe.test/x.pdf", created: now,
      status_transitions: { paid_at: now }, attempt_count: 1, next_payment_attempt: null, lines: { data: [{ period: { start: now, end: now + 30 * 86400 } }] } }, over);
    S.invoices.set(inv.id, inv);
    return inv;
  };

  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  const notFound = () => json({ error: { type: "invalid_request_error", code: "resource_missing", message: "No such object" } }, 404);

  S.handle = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || "GET";
    const auth = (init.headers && (init.headers.Authorization || init.headers.authorization)) || "";
    S.calls.push({ method, path: u.pathname, idem: init.headers && init.headers["Idempotency-Key"] });
    if (!/^Bearer (sk|rk)_test_/.test(auth)) return json({ error: { type: "authentication_error", message: "bad key" } }, 401);
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
    } else if (method === "GET" && u.pathname === "/v1/subscriptions") {
      out = { object: "list", data: [...S.subscriptions.values()], has_more: false };
    } else if (method === "GET" && /^\/v1\/invoices\/[^/]+$/.test(u.pathname)) {
      out = S.invoices.get(u.pathname.split("/").pop());
      if (!out) return notFound();
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

export function event(type, object, { created = Math.floor(Date.now() / 1000), livemode = false, eventId } = {}) {
  return { id: eventId || "evt_" + id("e").replace(/[^A-Za-z0-9]/g, ""), object: "event", type, created, livemode, data: { object } };
}
