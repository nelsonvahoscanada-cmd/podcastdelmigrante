/*
  Panel: Suscripciones y Facturación (Worker completo, SQLite real con todas
  las migraciones y Stripe simulado en https://stripe.test; sin red).
  node --test admin-worker/test/facturacion.test.js
*/
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";
import { csvCell } from "../src/facturacion.js";
import * as P from "../../functions/_lib/pagos.js";
import { fakeD1 } from "../../tests/helpers/fake-cloudflare.mjs";
import { fakeStripe, installStripeFetch, event } from "../../tests/helpers/fake-stripe.mjs";

const ORIGIN = "https://admin-pruebas.podcastdelmigrante.com";
const SITE = "https://claude-pagos.podcastdelmigrante.pages.dev";
const KEY = ["rk", "test", "PRUEBAfalsa" + "0".repeat(16)].join("_");
const LIVE = ["sk", "live", "PRUEBAfalsa" + "0".repeat(16)].join("_");
const ADMIN = "local-dev@localhost";
let S, restore, env;

function baseEnv(over = {}) {
  const db = fakeD1();
  return Object.assign({
    PAGOS_DB: db,
    DIRECTORIO_DB: db,
    ALLOW_LOCAL_DEV: "1",
    BILLING_ADMIN_EMAILS: "otra@example.com, " + ADMIN.toUpperCase(),
    PAGOS_MODO: "test",
    PAGOS_SITE_ORIGIN: SITE,
    STRIPE_SECRET_KEY: KEY,
    STRIPE_PRICE_ID: "price_TEST2499CAD",
    STRIPE_API_BASE: "https://stripe.test",
    ASSETS: { fetch: async () => new Response("asset") },
  }, over);
}
const db = () => env.PAGOS_DB;
const run = (sql, ...a) => db()._db.prepare(sql).run(...a);
const rows = (sql, ...a) => db()._db.prepare(sql).all(...a);
const row = (sql, ...a) => db()._db.prepare(sql).get(...a);
const req = (path, init = {}) => new Request(ORIGIN + path, Object.assign({}, init, { headers: Object.assign({ "CF-Connecting-IP": "127.0.0.1" }, init.headers || {}) }));
const post = (path, body, headers = {}) => req(path, { method: "POST", headers: Object.assign({ "Content-Type": "application/json", Origin: ORIGIN }, headers), body: JSON.stringify(body) });
const call = async (r, e = env) => {
  const res = await worker.fetch(r, e);
  const text = await res.text();
  let body = {};
  try { body = JSON.parse(text); } catch { body = text; }
  return { res, body };
};
const get = (path) => call(req(path));

function addApplication(id, { status = "aprobada", plan = "Premium", name = "Negocio " + id.slice(-6) } = {}) {
  const now = new Date().toISOString();
  run(
    `INSERT INTO business_applications (id, idempotency_key, created_at, updated_at, status, name, category, city, province, representative, summary, email, image_kind, image_key, image_type, image_bytes, consent_version, consent_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, 'vivienda', 'Calgary', 'Alberta', 'Ana', 'Reseña', 'cliente@example.com', 'logo', 'k', 'image/png', 10, 'v', ?, ?)`,
    id, "idem-" + id, now, now, status, name, now, `Plan solicitado: Plan ${plan} ($…).`
  );
}

/* Enlace desde el panel → Checkout → webhooks de Stripe (modo de prueba) */
async function pagar(appId, { tax = 125, province = "AB" } = {}) {
  addApplication(appId);
  const { res, body } = await call(post("/api/facturacion/enlaces", { applicationId: appId, confirm: true }));
  assert.equal(res.status, 200, JSON.stringify(body));
  const token = body.url.split("#t=")[1];
  await P.crearCheckout(env, db(), { token, termsVersion: P.TERMS_VERSION, siteOrigin: SITE });
  const session = [...S.sessions.values()].at(-1);
  const sub = S.addSubscription({ metadata: { membership_id: body.membershipId } });
  const inv = S.addInvoice({ subscription: sub.id, customer: sub.customer, tax, total: 2499 + tax, amount_paid: 2499 + tax, customer_address: { state: province, country: "CA" } });
  await P.procesarEvento(env, db(), event("checkout.session.completed", { id: session.id, object: "checkout.session", mode: "subscription", payment_status: "paid", client_reference_id: body.membershipId, customer: sub.customer, subscription: sub.id, metadata: { membership_id: body.membershipId, payment_link_id: body.linkId } }));
  await P.procesarEvento(env, db(), event("invoice.paid", { id: inv.id, object: "invoice", subscription: sub.id }));
  return { membershipId: body.membershipId, linkId: body.linkId, sub, inv };
}

beforeEach(() => {
  S = fakeStripe();
  restore = installStripeFetch(S);
  env = baseEnv();
});
afterEach(() => restore());

test("acceso: sin Access → 403; rol no administrador → 403; sin BILLING_ADMIN_EMAILS solo lectura", async () => {
  const e = baseEnv();
  delete e.ALLOW_LOCAL_DEV;
  assert.equal((await worker.fetch(req("/api/facturacion/resumen"), e)).status, 403);
  assert.equal((await worker.fetch(req("/facturacion"), e)).status, 403);
  assert.equal((await worker.fetch(post("/api/facturacion/conciliar", { confirm: true }), e)).status, 403);

  const lectura = baseEnv({ BILLING_ADMIN_EMAILS: "" });
  const r = await call(req("/api/facturacion/resumen"), lectura);
  assert.equal(r.res.status, 200);
  assert.equal(r.body.puedeGestionar, false);
  addApplication.call(null, "SOL-20261127-AAAAA1");
  const denied = await call(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-AAAAA1", confirm: true }), lectura);
  assert.equal(denied.res.status, 403);
  assert.match(denied.body.error, /BILLING_ADMIN_EMAILS/);
});

test("CSRF: otro origen o sin JSON → rechazado; acción sin confirmación → 400", async () => {
  assert.equal((await worker.fetch(post("/api/facturacion/conciliar", { confirm: true }, { Origin: "https://evil.example" }), env)).status, 403);
  assert.equal((await worker.fetch(req("/api/facturacion/conciliar", { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "text/plain" }, body: "{}" }), env)).status, 415);
  assert.equal((await worker.fetch(req("/api/facturacion/conciliar", { method: "DELETE" }), env)).status, 405);
  assert.equal((await worker.fetch(req("/api/facturacion/enlaces/OTRA/revocar", { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json" }, body: "{}" }), env)).status, 405);
  const r = await call(post("/api/facturacion/conciliar", {}));
  assert.equal(r.res.status, 400);
});

test("aislamiento: sin PAGOS_DB (panel de producción), fuera de modo de prueba o con clave real → 503 y nada se escribe", async () => {
  const prod = baseEnv();
  const directorio = prod.DIRECTORIO_DB;
  delete prod.PAGOS_DB;
  for (const p of ["/api/facturacion/resumen", "/api/facturacion/suscripciones", "/api/facturacion/exportar?tipo=facturas"]) {
    const r = await call(req(p), prod);
    assert.equal(r.res.status, 503, p);
    assert.ok(r.body.faltan.includes("PAGOS_DB"));
  }
  directorio._db.prepare("INSERT INTO business_applications (id, idempotency_key, created_at, updated_at, status, name, category, city, province, representative, summary, email, image_kind, image_key, image_type, image_bytes, consent_version, consent_at, notes) VALUES ('SOL-20261127-PROD01','i','x','x','aprobada','N','c','c','p','r','s','e','logo','k','t',1,'v','x','Plan solicitado: Plan Premium')").run();
  assert.equal((await worker.fetch(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-PROD01", confirm: true }), prod)).status, 503);
  assert.equal(directorio._db.prepare("SELECT COUNT(*) n FROM billing_payment_links").get().n, 0);

  assert.equal((await worker.fetch(req("/api/facturacion/resumen"), baseEnv({ PAGOS_MODO: "live" }))).status, 503);
  const live = await call(post("/api/facturacion/conciliar", { confirm: true }), baseEnv({ STRIPE_SECRET_KEY: LIVE }));
  assert.equal(live.res.status, 503);
  assert.match(live.body.faltan.join(" "), /REAL/);
  assert.equal(S.calls.length, 0, "nunca se llamó a Stripe");
});

test("enlace de pago: se muestra una vez, apunta a la vista previa de pruebas y nunca se guarda en claro; cortesías y protegidos rechazados", async () => {
  addApplication("SOL-20261127-AAAAA2");
  const r = await call(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-AAAAA2", confirm: true }));
  assert.equal(r.res.status, 200);
  assert.equal(r.body.modo, "prueba");
  assert.match(r.body.url, new RegExp("^" + SITE.replace(/\./g, "\\.") + "/pago#t="));
  const token = r.body.url.split("#t=")[1];
  const dump = JSON.stringify(rows("SELECT * FROM billing_payment_links")) + JSON.stringify(rows("SELECT * FROM billing_audit"));
  assert.ok(!dump.includes(token), "el token nunca queda en la base");
  assert.match(r.res.headers.get("Cache-Control") || "", /no-store/);

  /* Sin PAGOS_SITE_ORIGIN no se emite el enlace */
  const sin = await call(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-AAAAA2", confirm: true }), Object.assign({}, env, { PAGOS_SITE_ORIGIN: "" }));
  assert.equal(sin.res.status, 503);

  /* Cortesía en la misma solicitud → nunca se cobra */
  addApplication("SOL-20261127-AAAAA3");
  const now = new Date().toISOString();
  run("INSERT INTO business_memberships (id, plan, status, business_name, application_id, created_at, updated_at) VALUES ('MEM-20261127-GIFT22', 'PREMIUM_GIFT', 'en_revision', 'X', 'SOL-20261127-AAAAA3', ?, ?)", now, now);
  const gift = await call(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-AAAAA3", confirm: true }));
  assert.equal(gift.res.status, 409);
  /* Gratuita → nunca se cobra */
  addApplication("SOL-20261127-AAAAA4", { plan: "Gratuito" });
  assert.equal((await call(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-AAAAA4", confirm: true }))).res.status, 409);
});

test("concurrencia: dos enlaces a la vez para la misma solicitud → un solo enlace abierto; revocar lo cierra", async () => {
  addApplication("SOL-20261127-AAAAA5");
  const [a, b] = await Promise.all([
    call(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-AAAAA5", confirm: true })),
    call(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-AAAAA5", confirm: true })),
  ]);
  assert.ok([a, b].some((x) => x.res.status === 200));
  assert.equal(row("SELECT COUNT(*) n FROM billing_payment_links WHERE status = 'pendiente'").n, 1);
  const open = row("SELECT id FROM billing_payment_links WHERE status = 'pendiente'").id;
  const pend = await get("/api/facturacion/pendientes");
  assert.equal(pend.body.pendientes[0].situacion, "enlace_enviado");
  const rv = await call(post(`/api/facturacion/enlaces/${open}/revocar`, { confirm: true }));
  assert.equal(rv.res.status, 200);
  assert.equal(row("SELECT status FROM billing_payment_links WHERE id = ?", open).status, "revocado");
  assert.equal((await call(post(`/api/facturacion/enlaces/${open}/revocar`, { confirm: true }))).res.status, 409);
});

test("indicadores: MRR sin cortesías, ingresos e impuestos separados, comisión real y neto", async () => {
  await pagar("SOL-20261127-BBBBB1", { tax: 125, province: "AB" });
  await pagar("SOL-20261127-BBBBB2", { tax: 325, province: "ON" });
  /* Una cortesía activa y los cinco protegidos no suman nada */
  const now = new Date().toISOString();
  run("INSERT INTO business_memberships (id, plan, status, business_name, created_at, updated_at) VALUES ('MEM-20261127-GIFT33', 'PREMIUM_GIFT', 'activa', 'Cortesía', ?, ?)", now, now);

  const r = (await get("/api/facturacion/resumen")).body;
  assert.equal(r.mrr.centavos, 4998);
  assert.equal(r.mrr.suscripciones, 2);
  assert.equal(r.ingresos, 4998, "ingresos sin impuestos");
  assert.equal(r.impuestos, 450, "impuestos aparte");
  assert.equal(r.cobrado, 5448);
  const fee = (paid) => Math.round(paid * 0.029) + 30;
  assert.equal(r.comisiones, fee(2624) + fee(2824), "comisión real del balance transaction");
  assert.equal(r.facturas_sin_comision, 0);
  assert.equal(r.neto, 4998 - r.comisiones);
  assert.equal(r.conteos.activas, 2);
  assert.equal(r.proximas_renovaciones.length, 2);
  assert.equal(r.clasificacion.pago, 2);
  assert.equal(r.clasificacion.fundadores.length, 2);
  assert.equal(r.clasificacion.institucionales.length, 1);
  assert.ok(r.clasificacion.cortesias.some((c) => c.membership_id === "MEM-20261127-GIFT33"));
  assert.equal(r.clasificacion.cortesias.filter((c) => c.fuente === "lista_protegida").length, 2);
  assert.equal(r.ajustes.delivery_business_days, 10, "el plazo sigue en 10 hasta su aprobación");
});

test("filtros: negocio, estado financiero, período facturado y fechas", async () => {
  const a = await pagar("SOL-20261127-CCCCC1");
  await pagar("SOL-20261127-CCCCC2");
  run("UPDATE business_memberships SET business_name = 'Panadería Única' WHERE id = ?", a.membershipId);
  assert.equal((await get("/api/facturacion/suscripciones?empresa=" + encodeURIComponent("Panadería"))).body.suscripciones.length, 1);
  assert.equal((await get("/api/facturacion/suscripciones?estado=al_dia")).body.suscripciones.length, 2);
  assert.equal((await get("/api/facturacion/suscripciones?estado=en_gracia")).body.suscripciones.length, 0);
  assert.equal((await get("/api/facturacion/suscripciones?estado=inventado")).body.suscripciones.length, 2, "estado desconocido se ignora");
  const mes = new Date().toISOString().slice(0, 7);
  assert.equal((await get("/api/facturacion/facturas?periodo=" + mes)).body.facturas.length, 2);
  assert.equal((await get("/api/facturacion/facturas?periodo=2001-01")).body.facturas.length, 0);
  assert.equal((await get("/api/facturacion/facturas?hasta=2001-01-01")).body.facturas.length, 0);
  assert.equal((await get("/api/facturacion/resumen?desde=2001-01-01&hasta=2001-01-31")).body.ingresos, 0);
});

test("pago rechazado → en gracia y alerta en el panel; nunca despublica", async () => {
  const p = await pagar("SOL-20261127-DDDDD1");
  const fail = S.addInvoice({ subscription: p.sub.id, status: "open", billing_reason: "subscription_cycle", amount_paid: 0, status_transitions: { paid_at: null }, attempt_count: 1 });
  Object.assign(p.sub, { status: "past_due" });
  await P.procesarEvento(env, db(), event("invoice.payment_failed", { id: fail.id, object: "invoice", subscription: p.sub.id }));
  await P.procesarEvento(env, db(), event("customer.subscription.updated", p.sub));
  const s = (await get("/api/facturacion/suscripciones?estado=en_gracia")).body.suscripciones;
  assert.equal(s.length, 1);
  assert.equal(s[0].dias_restantes, 7);
  const r = (await get("/api/facturacion/resumen")).body;
  assert.equal(r.conteos.en_gracia, 1);
  assert.equal(r.conteos.pagos_rechazados_periodo, 1);
  assert.notEqual(row("SELECT status FROM business_memberships WHERE id = ?", p.membershipId).status, "retirada");
});

test("cancelar al final del período y anular: idempotentes en Stripe; MRR actual, cancelación programada y MRR futuro", async () => {
  const p = await pagar("SOL-20261127-EEEEE1");
  const c1 = await call(post(`/api/facturacion/membresias/${p.membershipId}/cancelar`, { confirm: true }));
  assert.equal(c1.res.status, 200, JSON.stringify(c1.body));
  assert.equal(S.subscriptions.get(p.sub.id).cancel_at_period_end, true);
  /* Sigue activa y pagada: cuenta en el MRR actual; sale del MRR futuro */
  const rc = (await get("/api/facturacion/resumen")).body;
  assert.equal(rc.mrr.centavos, 2499);
  assert.deepEqual(rc.cancelacion_programada, { centavos: 2499, suscripciones: 1 });
  assert.deepEqual(rc.mrr_futuro, { centavos: 0, suscripciones: 0 });
  assert.equal((await get("/api/facturacion/suscripciones?estado=cancela_al_final")).body.suscripciones.length, 1);
  const c2 = await call(post(`/api/facturacion/membresias/${p.membershipId}/cancelar`, { confirm: true }));
  assert.equal(c2.res.status, 200);
  const posts = S.calls.filter((c) => c.method === "POST" && c.path === `/v1/subscriptions/${p.sub.id}`);
  assert.ok(posts.every((c) => c.idem), "con Idempotency-Key");
  const re = await call(post(`/api/facturacion/membresias/${p.membershipId}/reactivar`, { confirm: true }));
  assert.equal(re.res.status, 200);
  assert.equal(S.subscriptions.get(p.sub.id).cancel_at_period_end, false);
  assert.equal((await get("/api/facturacion/resumen")).body.mrr.centavos, 2499);
  const actores = rows("SELECT DISTINCT actor FROM billing_audit WHERE membership_id = ? AND action LIKE '%cancel%'", p.membershipId).map((x) => x.actor);
  assert.deepEqual(actores, [ADMIN]);
});

test("devolución: exige motivo y escribir el identificador; 100 % del primer pago y cancelación inmediata; no se repite", async () => {
  const p = await pagar("SOL-20261127-FFFFF1");
  const url = `/api/facturacion/membresias/${p.membershipId}/devolver`;
  assert.equal((await call(post(url, { confirm: true, motivo: "No se pudo aprobar" }))).res.status, 400);
  assert.equal((await call(post(url, { confirm: true, confirmText: "MEM-OTRO", motivo: "No se pudo aprobar" }))).res.status, 400);
  assert.equal((await call(post(url, { confirm: true, confirmText: p.membershipId, motivo: "no" }))).res.status, 400);
  assert.equal(S.refunds.length, 0);
  const ok = await call(post(url, { confirm: true, confirmText: p.membershipId, motivo: "El negocio no pudo aprobarse" }));
  assert.equal(ok.res.status, 200, JSON.stringify(ok.body));
  assert.equal(S.refunds.length, 1);
  assert.equal(S.refunds[0].amount, 2624);
  assert.equal(S.subscriptions.get(p.sub.id).status, "canceled");
  assert.equal((await call(post(url, { confirm: true, confirmText: p.membershipId, motivo: "El negocio no pudo aprobarse" }))).res.status, 409);
  assert.equal(S.refunds.length, 1);
  const r = (await get("/api/facturacion/resumen")).body;
  assert.equal(r.devoluciones.total, 2624);
  assert.equal(r.neto, Math.round(2499 - r.comisiones - 2499), "la parte sin impuestos de la devolución se descuenta");
});

test("exportación CSV: facturas, suscripciones y resumen; celdas protegidas contra fórmulas", async () => {
  const p = await pagar("SOL-20261127-GGGGG1");
  run("UPDATE business_memberships SET business_name = '=HYPERLINK(\"http://x\")' WHERE id = ?", p.membershipId);
  const r = await call(req("/api/facturacion/exportar?tipo=facturas"));
  assert.equal(r.res.status, 200);
  assert.match(r.res.headers.get("Content-Type"), /text\/csv/);
  assert.match(r.res.headers.get("Content-Disposition"), /facturacion-facturas-prueba-/);
  assert.ok(r.body.includes("Comisión Stripe"));
  assert.ok(r.body.includes(`"'=HYPERLINK(""http://x"")"`), "fórmula neutralizada");
  assert.ok(r.body.includes("24.99") && r.body.includes("1.25") && r.body.includes("26.24"));
  assert.ok((await call(req("/api/facturacion/exportar?tipo=suscripciones"))).body.includes("Estado financiero"));
  assert.ok((await call(req("/api/facturacion/exportar?tipo=resumen"))).body.includes("MRR"));
  assert.equal((await call(req("/api/facturacion/exportar?tipo=otro"))).res.status, 400);
  assert.equal(csvCell("-5"), "-5");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
});

test("ajustes: plazo de entrega configurable (sigue en 10), límites, auditoría y reflejo en las condiciones", async () => {
  assert.equal((await P.settings(db())).delivery_business_days, 10);
  const bad = await call(post("/api/facturacion/ajustes", { key: "delivery_business_days", value: 0, confirm: true }));
  assert.equal(bad.res.status, 409);
  assert.equal((await call(post("/api/facturacion/ajustes", { key: "price", value: 1, confirm: true }))).res.status, 409);
  const ok = await call(post("/api/facturacion/ajustes", { key: "delivery_business_days", value: 3, confirm: true }));
  assert.equal(ok.res.status, 200);
  const cfg = await P.settings(db());
  assert.equal(cfg.delivery_business_days, 3);
  assert.match(P.condiciones(cfg).entrega, /3 días hábiles/);
  const a = row("SELECT actor, detail FROM billing_audit WHERE action LIKE 'ajuste%' ORDER BY id DESC LIMIT 1");
  assert.equal(a.actor, ADMIN);
  assert.match(a.detail, /10 → 3/);
});

test("conciliación diaria programada: completa comisiones pendientes y vence enlaces caducados; sin configuración no hace nada", async () => {
  S.feesPending = true;
  const p = await pagar("SOL-20261127-HHHHH1");
  assert.equal(row("SELECT stripe_fee FROM billing_invoices WHERE stripe_invoice_id = ?", p.inv.id).stripe_fee, null);
  assert.equal((await get("/api/facturacion/resumen")).body.facturas_sin_comision, 1);
  addApplication("SOL-20261127-HHHHH2");
  await call(post("/api/facturacion/enlaces", { applicationId: "SOL-20261127-HHHHH2", confirm: true }));
  run("UPDATE billing_payment_links SET expires_at = '2001-01-01T00:00:00.000Z' WHERE application_id = 'SOL-20261127-HHHHH2'");
  S.feesPending = false;

  const waits = [];
  await worker.scheduled({ cron: "17 9 * * *" }, env, { waitUntil: (pr) => waits.push(pr) });
  await Promise.all(waits);
  assert.equal(row("SELECT stripe_fee FROM billing_invoices WHERE stripe_invoice_id = ?", p.inv.id).stripe_fee, Math.round(2624 * 0.029) + 30);
  assert.equal(row("SELECT status FROM billing_payment_links WHERE application_id = 'SOL-20261127-HHHHH2'").status, "vencido");

  const sinPagos = baseEnv();
  delete sinPagos.PAGOS_DB;
  const before = S.calls.length;
  const w2 = [];
  await worker.scheduled({}, sinPagos, { waitUntil: (pr) => w2.push(pr) });
  assert.equal(w2.length, 0);
  assert.equal(S.calls.length, before);
});

test("detalle y auditoría: historia editorial y financiera con el actor de cada acción", async () => {
  const p = await pagar("SOL-20261127-JJJJJ1");
  const d = (await get(`/api/facturacion/membresias/${p.membershipId}`)).body;
  assert.equal(d.membresia.id, p.membershipId);
  assert.equal(d.facturas.length, 1);
  assert.ok(d.eventos.some((e) => e.tipo === "editorial"));
  assert.ok(d.eventos.some((e) => e.tipo === "financiero"));
  assert.equal((await get("/api/facturacion/membresias/MEM-20261127-NOEXIS")).res.status, 404);
  assert.equal((await get("/api/facturacion/membresias/x")).res.status, 404);
  const aud = (await get("/api/facturacion/auditoria")).body.auditoria;
  assert.ok(aud.some((a) => a.actor === ADMIN && a.membership_id === p.membershipId));
  assert.ok(!JSON.stringify(aud).includes(KEY), "sin claves en la auditoría");
});

test("página y navegación: /facturacion existe con el enlace en todas las secciones; sin estilos ni scripts en línea", () => {
  const html = readFileSync(new URL("../public/facturacion.html", import.meta.url), "utf8");
  assert.ok(!/<script>(?!<)/.test(html) && !/ style=/.test(html));
  assert.match(html, /MODO DE PRUEBA/);
  for (const f of ["index.html", "solicitudes.html", "invitaciones.html", "facturacion.html"]) {
    assert.match(readFileSync(new URL("../public/" + f, import.meta.url), "utf8"), /href="\/facturacion"/, f);
  }
});

test("indicadores: una suscripción activa con alerta de cancelación sigue en el MRR actual; la alerta se cuenta aparte", async () => {
  const p = await pagar("SOL-20261128-KKKKK1");
  S.subscriptions.get(p.sub.id).cancel_at = Math.floor(Date.UTC(2027, 1, 26) / 1000);
  await P.sincronizarSuscripcion(env, db(), p.sub.id);
  const r = (await get("/api/facturacion/resumen")).body;
  assert.equal(r.mrr.centavos, 2499, "no se excluye una suscripción activa y pagada");
  assert.equal(r.alertas_cancelacion, 1);
  assert.deepEqual(r.cancelacion_programada, { centavos: 0, suscripciones: 0 });
  const csv = (await call(req("/api/facturacion/exportar?tipo=resumen"))).body;
  assert.ok(csv.includes("MRR futuro previsto") && csv.includes("Cancelaciones programadas"));
});

test("página de confirmación: no afirma que se envió un correo; remite al portal de Stripe", () => {
  const html = readFileSync(new URL("../../pago-confirmado.html", import.meta.url), "utf8");
  assert.ok(html.includes("Tu pago está confirmado. Puedes consultar y descargar tu recibo y tu factura desde el portal seguro de Stripe."));
  assert.ok(!/te envió por correo|recibirás el recibo por correo/.test(html));
});
