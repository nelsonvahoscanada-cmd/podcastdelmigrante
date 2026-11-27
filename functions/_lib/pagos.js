/*
  functions/_lib/pagos.js — Núcleo de suscripciones del Perfil Empresarial
  Premium (Stripe Checkout + Billing). Solo servidor (functions/ no se publica).
  ===========================================================================
  Flujo aprobado (27-11-2026):
    solicitud → revisión → aprobación → ENLACE INDIVIDUAL DE PAGO → Stripe
    Checkout → confirmación por WEBHOOK firmado → solicitud pagada →
    creación y publicación de la miniweb (manual, Pull Request).
  El pago nunca publica nada.

  Separación de estados: este módulo solo escribe en las tablas billing_*
  (migración 0006) y deja constancia en application_events / membership_events.
  No modifica business_applications ni business_memberships.

  Protección de cortesías (regla general, no solo identificadores):
    solo una membresía PREMIUM_PAID (en revisión o activa) puede tener enlace,
    cliente o suscripción; nunca si la solicitud o el BIZ-id tienen una
    cortesía PREMIUM_GIFT o figuran en billing_protected. La regla se aplica
    aquí (mensaje claro) y en la base (triggers de 0006).
*/
import { stripeRequest } from "./stripe.js";

export const PRICE_CENTS = 2499;
export const CURRENCY = "cad";
export const PRICE_LABEL = "$24.99 CAD al mes";
/* Versión de las condiciones que se muestran y aceptan antes del pago.
   Cambiarla cada vez que cambie el texto de pago.html / condiciones(). */
export const TERMS_VERSION = "pagos-premium-2026-11-v1";

export const LINK_ID_RE = /^PAY-\d{8}-[A-Z2-9]{6}$/;
export const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,}$/;
const DEFAULTS = { grace_days: 7, link_ttl_days: 7, delivery_business_days: 10, refund_window_days: 30 };
const LIVE_STATUSES = ["incomplete", "trialing", "active", "past_due", "unpaid", "paused"];
const INVOICE_RANK = { draft: 0, open: 1, uncollectible: 2, void: 3, paid: 3 };

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const stamp = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
function randomSuffix(n = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}
export const newLinkId = (d = new Date()) => `PAY-${stamp(d)}-${randomSuffix()}`;
export const newMembershipId = (d = new Date()) => `MEM-${stamp(d)}-${randomSuffix()}`;

/* Token secreto del enlace: 24 bytes aleatorios (32 caracteres base64url).
   En D1 solo se guarda su huella SHA-256. */
export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function hashToken(token) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pdm-pago|" + token));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const iso = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);
const nowIso = () => new Date().toISOString();

/* ---------- Configuración ---------- */
export async function settings(db) {
  const out = { ...DEFAULTS };
  try {
    const { results } = await db.prepare("SELECT key, value FROM billing_settings").all();
    for (const r of results || []) if (r.key in out && Number.isFinite(Number(r.value))) out[r.key] = Number(r.value);
  } catch {
    /* sin tablas: valores por defecto */
  }
  return out;
}

export async function schemaReady(db) {
  try {
    const r = await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('billing_payment_links','billing_subscriptions','billing_events','billing_protected')").first();
    return !!r && r.n === 4;
  } catch {
    return false;
  }
}

/* Condiciones que se muestran ANTES del pago (y se repiten en la confirmación). */
export function condiciones(cfg) {
  return {
    version: TERMS_VERSION,
    precio: PRICE_LABEL,
    precioCentavos: PRICE_CENTS,
    moneda: "CAD",
    impuestos: "Más los impuestos que correspondan por ley según tu dirección de facturación. El total, con impuestos, se muestra en la página de pago de Stripe antes de confirmar.",
    renovacion: "La suscripción se renueva automáticamente cada mes, en la misma fecha del primer pago, hasta que la canceles.",
    permanencia: "Sin permanencia mínima.",
    cancelacion: "Puedes cancelar cuando quieras desde el portal seguro de Stripe: la cancelación se aplica al final del período ya pagado y no se cobra la siguiente renovación.",
    inicio: "El período contratado empieza el día en que se confirma tu primer pago.",
    entrega: `Preparamos tu miniweb y te enviamos la vista previa en un plazo de hasta ${cfg.delivery_business_days} días hábiles desde la confirmación del pago. Se publica solo cuando tú apruebas la vista previa.`,
    devolucion: `Si tu empresa no puede aprobarse para el Directorio, te devolvemos el 100 % del primer pago dentro de los ${cfg.refund_window_days} días siguientes y cancelamos la suscripción para que no haya renovaciones.`,
    impago: `Si un cobro mensual es rechazado, Stripe vuelve a intentarlo y te avisa por correo. Tienes ${cfg.grace_days} días de gracia para actualizar tu tarjeta; un impago nunca borra tu perfil ni tus estadísticas.`,
  };
}

/* ---------- Protección de cortesías ---------- */
/* ¿Se puede cobrar a esta membresía? Devuelve { ok, motivo }. */
export async function puedeCobrar(db, membershipId) {
  const m = await db.prepare("SELECT id, plan, status, application_id, business_id FROM business_memberships WHERE id = ?").bind(membershipId).first();
  if (!m) return { ok: false, motivo: "membresia_inexistente" };
  if (m.plan !== "PREMIUM_PAID") return { ok: false, motivo: m.plan === "PREMIUM_GIFT" ? "cortesia" : "plan_no_pagado" };
  if (!["en_revision", "activa"].includes(m.status)) return { ok: false, motivo: "membresia_no_vigente" };
  if (m.business_id) {
    const p = await db.prepare("SELECT reason FROM billing_protected WHERE business_id = ?").bind(m.business_id).first();
    if (p) return { ok: false, motivo: "perfil_protegido" };
  }
  const gift = await db
    .prepare("SELECT 1 AS x FROM business_memberships WHERE plan = 'PREMIUM_GIFT' AND status <> 'retirada' AND ((? IS NOT NULL AND application_id = ?) OR (? IS NOT NULL AND business_id = ?)) LIMIT 1")
    .bind(m.application_id, m.application_id, m.business_id, m.business_id)
    .first();
  if (gift) return { ok: false, motivo: "cortesia" };
  return { ok: true, membership: m };
}

async function audit(db, actor, action, membershipId, objectId, detail) {
  await db.prepare("INSERT INTO billing_audit (at, actor, action, membership_id, object_id, detail) VALUES (?, ?, ?, ?, ?, ?)").bind(nowIso(), actor, action, membershipId || null, objectId || null, detail || null).run();
}
async function applicationNote(db, applicationId, detail) {
  if (!applicationId) return;
  try {
    await db.prepare("INSERT INTO application_events (application_id, at, actor, action, detail) VALUES (?, ?, 'sistema', 'revision', ?)").bind(applicationId, nowIso(), detail).run();
  } catch (e) {
    console.error("Historial de solicitud no registrado", applicationId, e && e.message);
  }
}
async function membershipNote(db, membershipId, action, detail) {
  try {
    await db.prepare("INSERT INTO membership_events (membership_id, at, actor, action, detail) VALUES (?, ?, 'sistema', ?, ?)").bind(membershipId, nowIso(), action, detail).run();
  } catch (e) {
    console.error("Historial de membresía no registrado", membershipId, e && e.message);
  }
}

/* ---------- Enlace individual de pago (lo genera el panel) ---------- */
/* Para una solicitud Premium aprobada por el equipo. Usa su membresía
   PREMIUM_PAID o la crea («en_revision») si no existe. Devuelve el token UNA
   sola vez. Lanza Error con `code` si no se permite. */
export async function crearEnlacePago(db, { applicationId, actor, livemode = 0, now = new Date() }) {
  const fail = (code, msg) => Object.assign(new Error(msg), { code });
  const app = await db.prepare("SELECT id, status, name, email, notes, business_id FROM business_applications WHERE id = ?").bind(applicationId).first();
  if (!app) throw fail("no_existe", "La solicitud no existe.");
  if (!["en_revision", "aprobada"].includes(app.status)) throw fail("estado", "Solo se genera el enlace para una solicitud en revisión o aprobada.");
  if (/^Plan solicitado: Plan Gratuito/.test(app.notes || "")) throw fail("gratuito", "La solicitud es del plan Gratuito: no se cobra.");
  let m = await db.prepare("SELECT id, plan FROM business_memberships WHERE application_id = ? AND status <> 'retirada' ORDER BY created_at DESC LIMIT 1").bind(app.id).first();
  if (m && m.plan !== "PREMIUM_PAID") throw fail("cortesia", "La solicitud tiene una membresía que no es de pago (cortesía o gratuita): no se cobra.");
  const stmts = [];
  if (!m) {
    m = { id: newMembershipId(now), plan: "PREMIUM_PAID" };
    stmts.push(db.prepare("INSERT INTO business_memberships (id, plan, status, business_name, application_id, business_id, created_at, updated_at, updated_by) VALUES (?, 'PREMIUM_PAID', 'en_revision', ?, ?, ?, ?, ?, ?)").bind(m.id, app.name, app.id, app.business_id || null, now.toISOString(), now.toISOString(), actor));
    stmts.push(db.prepare("INSERT INTO membership_events (membership_id, at, actor, action, to_status, detail) VALUES (?, ?, ?, 'crear', 'en_revision', ?)").bind(m.id, now.toISOString(), actor, `Membresía Premium de pago creada para el enlace de pago de ${app.id}`));
  } else {
    const ok = await puedeCobrar(db, m.id);
    if (!ok.ok) throw fail(ok.motivo, "Esta membresía no admite cobros (" + ok.motivo + ").");
  }
  const live = await db.prepare(`SELECT 1 AS x FROM billing_subscriptions WHERE membership_id = ? AND status IN (${LIVE_STATUSES.map(() => "?").join(",")})`).bind(m.id, ...LIVE_STATUSES).first();
  if (live) throw fail("ya_suscrita", "La membresía ya tiene una suscripción vigente.");
  const cfg = await settings(db);
  const token = newToken();
  const link = { id: newLinkId(now), expires_at: new Date(now.getTime() + cfg.link_ttl_days * 86400000).toISOString() };
  stmts.push(db.prepare("UPDATE billing_payment_links SET status = 'revocado', revoked_at = ?, revoked_by = ? WHERE membership_id = ? AND status = 'pendiente'").bind(now.toISOString(), actor, m.id));
  stmts.push(db.prepare("INSERT INTO billing_payment_links (id, membership_id, application_id, business_name, email, token_sha256, livemode, created_at, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(link.id, m.id, app.id, app.name, app.email || null, await hashToken(token), livemode ? 1 : 0, now.toISOString(), actor, link.expires_at));
  stmts.push(db.prepare("INSERT INTO billing_audit (at, actor, action, membership_id, object_id, detail) VALUES (?, ?, 'enlace_creado', ?, ?, ?)").bind(now.toISOString(), actor, m.id, link.id, `Vence ${link.expires_at.slice(0, 10)}`));
  try {
    await db.batch(stmts);
  } catch (e) {
    if (/cobro no permitido/.test(String(e && e.message))) throw fail("protegido", "Cobro no permitido para esta membresía.");
    throw e;
  }
  await applicationNote(db, app.id, `Enlace de pago ${link.id} generado (vence ${link.expires_at.slice(0, 10)}).`);
  return { linkId: link.id, membershipId: m.id, token, expiresAt: link.expires_at };
}

/* Estado de un enlace a partir de su token (página /pago). Nunca revela más
   que el nombre del negocio y las condiciones. */
export async function enlacePorToken(db, token, now = new Date()) {
  if (!TOKEN_RE.test(String(token || ""))) return { estado: "invalido" };
  const l = await db.prepare("SELECT * FROM billing_payment_links WHERE token_sha256 = ?").bind(await hashToken(token)).first();
  if (!l) return { estado: "invalido" };
  if (l.status === "usado") return { estado: "usado", link: l };
  if (l.status === "revocado") return { estado: "revocado", link: l };
  if (l.status === "vencido" || l.expires_at <= now.toISOString()) return { estado: "vencido", link: l };
  const ok = await puedeCobrar(db, l.membership_id);
  if (!ok.ok) return { estado: "no_permitido", link: l };
  const live = await db.prepare(`SELECT 1 AS x FROM billing_subscriptions WHERE membership_id = ? AND status IN (${LIVE_STATUSES.map(() => "?").join(",")})`).bind(l.membership_id, ...LIVE_STATUSES).first();
  if (live) return { estado: "ya_suscrita", link: l };
  return { estado: "valido", link: l };
}

/* ---------- Checkout ---------- */
/* Crea (o reutiliza) la sesión de Checkout del enlace. Una sola sesión abierta
   por enlace: si el cliente vuelve antes de que venza, recibe la misma URL.
   Idempotency-Key = id del enlace + número de intento: un doble clic nunca
   crea dos sesiones. */
export async function crearCheckout(env, db, { token, termsVersion, siteOrigin, now = new Date() }) {
  const fail = (code, status) => Object.assign(new Error(code), { code, status });
  if (termsVersion !== TERMS_VERSION) throw fail("condiciones", 409);
  const r = await enlacePorToken(db, token, now);
  if (r.estado !== "valido") throw fail(r.estado, r.estado === "invalido" ? 404 : 409);
  const l = r.link;
  if (l.checkout_session_id && l.checkout_url && l.checkout_expires_at > new Date(now.getTime() + 60000).toISOString()) {
    return { url: l.checkout_url, reused: true };
  }
  const attempts = await db.prepare("SELECT COUNT(*) AS n FROM billing_audit WHERE object_id = ? AND action = 'checkout_creado'").bind(l.id).first();
  const cust = await db.prepare("SELECT stripe_customer_id FROM billing_customers WHERE membership_id = ?").bind(l.membership_id).first();
  const expiresAt = Math.floor(now.getTime() / 1000) + 3600; /* la sesión de Stripe vence en 1 hora */
  const meta = { membership_id: l.membership_id, payment_link_id: l.id, application_id: l.application_id || "", terms_version: TERMS_VERSION };
  const params = {
    mode: "subscription",
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: l.membership_id,
    metadata: meta,
    subscription_data: { metadata: meta },
    billing_address_collection: "required",
    locale: "es",
    expires_at: expiresAt,
    allow_promotion_codes: false,
    success_url: `${siteOrigin}/pago-confirmado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteOrigin}/pago?cancelado=1`,
    custom_text: { submit: { message: "Suscripción mensual con renovación automática. Puedes cancelarla cuando quieras; la cancelación se aplica al final del período pagado." } },
  };
  if (cust) params.customer = cust.stripe_customer_id;
  else if (l.email) params.customer_email = l.email;
  /* Recaudación de impuestos: desactivada hasta confirmar las obligaciones fiscales. */
  if (env.STRIPE_AUTOMATIC_TAX === "1") {
    params.automatic_tax = { enabled: true };
    if (cust) params.customer_update = { address: "auto" };
  }
  const session = await stripeRequest(env, "POST", "/v1/checkout/sessions", params, { idempotencyKey: `checkout-${l.id}-${(attempts && attempts.n) || 0}` });
  if (session.livemode) throw fail("modo_real", 503);
  await db.batch([
    db.prepare("UPDATE billing_payment_links SET checkout_session_id = ?, checkout_url = ?, checkout_expires_at = ?, terms_version = ?, accepted_at = ? WHERE id = ? AND status = 'pendiente'").bind(session.id, session.url, iso(session.expires_at || expiresAt), TERMS_VERSION, now.toISOString(), l.id),
    db.prepare("INSERT INTO billing_audit (at, actor, action, membership_id, object_id, detail) VALUES (?, 'cliente', 'checkout_creado', ?, ?, ?)").bind(now.toISOString(), l.membership_id, l.id, `Condiciones ${TERMS_VERSION} aceptadas`),
  ]);
  return { url: session.url, reused: false };
}

/* Estado mínimo para la página de confirmación (por id de sesión). */
export async function estadoSesion(db, sessionId) {
  if (!SESSION_RE.test(String(sessionId || ""))) return { estado: "desconocido" };
  const l = await db.prepare("SELECT membership_id, status FROM billing_payment_links WHERE checkout_session_id = ?").bind(sessionId).first();
  if (!l) return { estado: "desconocido" };
  const inv = await db.prepare("SELECT 1 AS x FROM billing_invoices WHERE membership_id = ? AND status = 'paid' LIMIT 1").bind(l.membership_id).first();
  return { estado: inv ? "confirmado" : "pendiente" };
}

/* ---------- Webhook ---------- */
export const EVENTOS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
];

/* Registra el evento (idempotencia) y lo aplica. Devuelve { resultado }. Un
   evento ya aplicado o ignorado no se vuelve a aplicar; uno con error sí
   (Stripe reintenta). */
export async function procesarEvento(env, db, event) {
  const prev = await db.prepare("SELECT result FROM billing_events WHERE stripe_event_id = ?").bind(event.id).first();
  if (prev && ["aplicado", "ignorado", "rechazado"].includes(prev.result)) return { resultado: "duplicado" };
  const obj = (event.data && event.data.object) || {};
  if (!prev) {
    await db
      .prepare("INSERT OR IGNORE INTO billing_events (stripe_event_id, type, livemode, stripe_created, object_id, received_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(event.id, event.type, event.livemode ? 1 : 0, event.created || 0, obj.id || null, nowIso())
      .run();
  }
  const done = (result, detail) =>
    db.prepare("UPDATE billing_events SET result = ?, processed_at = ?, detail = ? WHERE stripe_event_id = ?").bind(result, nowIso(), detail || null, event.id).run();
  try {
    const out = await aplicar(env, db, event, obj);
    await done(out.result, out.detail);
    return { resultado: out.result };
  } catch (e) {
    await done("error", String((e && e.code) || (e && e.message) || "error").slice(0, 120));
    throw e;
  }
}

const subscriptionIdOf = (inv) =>
  inv.subscription && typeof inv.subscription === "object" ? inv.subscription.id
    : inv.subscription || (inv.parent && inv.parent.subscription_details && inv.parent.subscription_details.subscription) || null;

async function aplicar(env, db, event, obj) {
  switch (event.type) {
    case "checkout.session.completed": {
      if (obj.mode !== "subscription") return { result: "ignorado", detail: "no es suscripción" };
      const membershipId = obj.client_reference_id || (obj.metadata && obj.metadata.membership_id);
      const linkId = obj.metadata && obj.metadata.payment_link_id;
      if (!membershipId) return { result: "rechazado", detail: "sin membresía" };
      const ok = await puedeCobrar(db, membershipId);
      if (!ok.ok) {
        await audit(db, "sistema", "alerta_cobro_no_permitido", membershipId, obj.subscription, ok.motivo);
        return { result: "rechazado", detail: "cobro no permitido: " + ok.motivo };
      }
      if (obj.customer) await db.prepare("INSERT OR IGNORE INTO billing_customers (membership_id, stripe_customer_id, livemode, created_at) VALUES (?, ?, ?, ?)").bind(membershipId, obj.customer, obj.livemode ? 1 : 0, nowIso()).run();
      if (linkId) await db.prepare("UPDATE billing_payment_links SET status = 'usado', used_at = ? WHERE id = ? AND status = 'pendiente'").bind(nowIso(), linkId).run();
      if (obj.subscription) await sincronizarSuscripcion(env, db, typeof obj.subscription === "object" ? obj.subscription.id : obj.subscription, event.created);
      await audit(db, "stripe", "checkout_completado", membershipId, obj.id, `pago: ${obj.payment_status || "-"}`);
      return { result: "aplicado" };
    }
    case "checkout.session.expired": {
      await db.prepare("UPDATE billing_payment_links SET checkout_session_id = NULL, checkout_url = NULL, checkout_expires_at = NULL WHERE checkout_session_id = ? AND status = 'pendiente'").bind(obj.id).run();
      return { result: "aplicado", detail: "sesión vencida: el enlace puede usarse otra vez" };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return sincronizarSuscripcion(env, db, obj.id, event.created);
    case "invoice.finalized":
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required": {
      const subId = subscriptionIdOf(obj);
      if (!subId) return { result: "ignorado", detail: "factura sin suscripción" };
      /* La suscripción primero (estado y orden), luego la factura desde la API */
      const s = await sincronizarSuscripcion(env, db, subId, event.created);
      if (s.result === "rechazado") return s;
      const inv = await stripeRequest(env, "GET", `/v1/invoices/${obj.id}`, { expand: ["payments.data.payment.payment_intent", "charge"] }).catch(() => obj);
      await guardarFactura(env, db, inv, subId);
      const sub = await db.prepare("SELECT membership_id FROM billing_subscriptions WHERE stripe_subscription_id = ?").bind(subId).first();
      if (event.type === "invoice.payment_failed" && sub) {
        await db.prepare("UPDATE billing_subscriptions SET first_failed_at = COALESCE(first_failed_at, ?), updated_at = ? WHERE stripe_subscription_id = ?").bind(iso(event.created), nowIso(), subId).run();
        await audit(db, "stripe", "pago_rechazado", sub.membership_id, obj.id, `intento ${obj.attempt_count || 1}`);
      }
      if (event.type === "invoice.paid" && sub) {
        await db.prepare("UPDATE billing_subscriptions SET first_failed_at = NULL, updated_at = ? WHERE stripe_subscription_id = ?").bind(nowIso(), subId).run();
        if ((inv.billing_reason || obj.billing_reason) === "subscription_create") await primerPagoConfirmado(env, db, sub.membership_id, inv);
      }
      return { result: "aplicado" };
    }
    case "charge.refunded": {
      const refunds = (obj.refunds && obj.refunds.data) || [];
      const inv = await db.prepare("SELECT stripe_invoice_id, membership_id FROM billing_invoices WHERE charge_id = ? OR (payment_intent_id IS NOT NULL AND payment_intent_id = ?)").bind(obj.id, obj.payment_intent || "").first();
      for (const rf of refunds) {
        await db
          .prepare("INSERT OR IGNORE INTO billing_refunds (stripe_refund_id, stripe_invoice_id, charge_id, membership_id, amount, currency, status, reason, requested_by, livemode, stripe_created, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'stripe', ?, ?, ?)")
          .bind(rf.id, inv ? inv.stripe_invoice_id : null, obj.id, inv ? inv.membership_id : null, rf.amount, rf.currency, rf.status || null, rf.reason || null, obj.livemode ? 1 : 0, rf.created || null, nowIso())
          .run();
        await db.prepare("UPDATE billing_refunds SET status = ? WHERE stripe_refund_id = ?").bind(rf.status || null, rf.id).run();
      }
      if (inv) await db.prepare("UPDATE billing_invoices SET amount_refunded = ?, updated_at = ? WHERE stripe_invoice_id = ?").bind(obj.amount_refunded || 0, nowIso(), inv.stripe_invoice_id).run();
      return { result: "aplicado" };
    }
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const inv = await db.prepare("SELECT membership_id FROM billing_invoices WHERE charge_id = ?").bind(obj.charge || "").first();
      await audit(db, "stripe", event.type === "charge.dispute.created" ? "disputa_abierta" : "disputa_cerrada", inv ? inv.membership_id : null, obj.id, `estado: ${obj.status || "-"}`);
      return { result: "aplicado" };
    }
    default:
      return { result: "ignorado", detail: "evento no utilizado" };
  }
}

/* Lee la suscripción ACTUAL en la API (no la del evento) y la guarda solo si
   es más reciente que lo ya aplicado: resiste eventos fuera de orden. */
export async function sincronizarSuscripcion(env, db, subscriptionId, eventCreated = 0) {
  const s = await stripeRequest(env, "GET", `/v1/subscriptions/${subscriptionId}`, {});
  if (s.livemode) return { result: "rechazado", detail: "modo real" };
  const membershipId = (s.metadata && s.metadata.membership_id) || null;
  const known = await db.prepare("SELECT membership_id, stripe_updated FROM billing_subscriptions WHERE stripe_subscription_id = ?").bind(s.id).first();
  const mid = (known && known.membership_id) || membershipId;
  if (!mid) {
    await audit(db, "sistema", "alerta_suscripcion_sin_membresia", null, s.id, "Suscripción sin metadata membership_id");
    return { result: "rechazado", detail: "sin membresía" };
  }
  if (!known) {
    const ok = await puedeCobrar(db, mid);
    if (!ok.ok && s.status !== "canceled") {
      await audit(db, "sistema", "alerta_cobro_no_permitido", mid, s.id, ok.motivo);
      return { result: "rechazado", detail: "cobro no permitido: " + ok.motivo };
    }
  }
  const item = (s.items && s.items.data && s.items.data[0]) || {};
  const periodStart = s.current_period_start || item.current_period_start;
  const periodEnd = s.current_period_end || item.current_period_end;
  const version = Math.max(Number(eventCreated) || 0, 1);
  if (known && known.stripe_updated && known.stripe_updated > version) return { result: "ignorado", detail: "evento antiguo" };
  const price = item.price || {};
  const vals = [s.status, s.cancel_at_period_end ? 1 : 0, iso(periodStart), iso(periodEnd), iso(s.canceled_at), iso(s.ended_at), price.id || null, price.unit_amount != null ? price.unit_amount : null, price.currency || s.currency || null, version, nowIso()];
  if (known) {
    await db.prepare("UPDATE billing_subscriptions SET status = ?, cancel_at_period_end = ?, current_period_start = ?, current_period_end = ?, canceled_at = ?, ended_at = ?, price_id = ?, amount = ?, currency = ?, stripe_updated = ?, updated_at = ? WHERE stripe_subscription_id = ?").bind(...vals, s.id).run();
  } else {
    await db
      .prepare("INSERT INTO billing_subscriptions (status, cancel_at_period_end, current_period_start, current_period_end, canceled_at, ended_at, price_id, amount, currency, stripe_updated, updated_at, stripe_subscription_id, membership_id, stripe_customer_id, livemode, stripe_created, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(...vals, s.id, mid, typeof s.customer === "object" ? s.customer.id : s.customer, s.livemode ? 1 : 0, s.created || null, nowIso())
      .run();
    await db.prepare("INSERT OR IGNORE INTO billing_customers (membership_id, stripe_customer_id, livemode, created_at) VALUES (?, ?, ?, ?)").bind(mid, typeof s.customer === "object" ? s.customer.id : s.customer, 0, nowIso()).run();
  }
  return { result: "aplicado" };
}

/* Guarda la factura (subtotal, impuestos y total por separado). Su estado solo
   avanza: un evento antiguo no devuelve una factura pagada a «abierta». */
export async function guardarFactura(env, db, inv, subscriptionId) {
  const sub = await db.prepare("SELECT membership_id FROM billing_subscriptions WHERE stripe_subscription_id = ?").bind(subscriptionId).first();
  const prev = await db.prepare("SELECT status FROM billing_invoices WHERE stripe_invoice_id = ?").bind(inv.id).first();
  if (prev && (INVOICE_RANK[prev.status] || 0) > (INVOICE_RANK[inv.status] || 0)) return;
  const line = (inv.lines && inv.lines.data && inv.lines.data[0]) || {};
  const taxes = (inv.total_taxes || inv.total_tax_amounts || []).map((t) => ({ amount: t.amount, rate: t.tax_rate_details || t.tax_rate || null, taxable: t.taxable_amount }));
  const tax = inv.tax != null ? inv.tax : taxes.reduce((a, t) => a + (t.amount || 0), 0);
  const pay = inv.payments && inv.payments.data && inv.payments.data[0] && inv.payments.data[0].payment;
  const pi = typeof inv.payment_intent === "object" && inv.payment_intent ? inv.payment_intent.id : inv.payment_intent || (pay && (typeof pay.payment_intent === "object" ? pay.payment_intent && pay.payment_intent.id : pay.payment_intent)) || null;
  const charge = typeof inv.charge === "object" && inv.charge ? inv.charge.id : inv.charge || (pay && pay.charge) || null;
  const addr = inv.customer_address || {};
  const paidAt = inv.status_transitions && inv.status_transitions.paid_at;
  await db
    .prepare(
      `INSERT INTO billing_invoices (stripe_invoice_id, stripe_subscription_id, membership_id, stripe_customer_id, number, status, billing_reason, currency, subtotal, tax, total, amount_paid, tax_breakdown, customer_province, payment_intent_id, charge_id, hosted_invoice_url, invoice_pdf, period_start, period_end, paid_at, attempt_count, next_payment_attempt, livemode, stripe_created, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stripe_invoice_id) DO UPDATE SET number = excluded.number, status = excluded.status, subtotal = excluded.subtotal, tax = excluded.tax, total = excluded.total, amount_paid = excluded.amount_paid, tax_breakdown = excluded.tax_breakdown, customer_province = excluded.customer_province, payment_intent_id = COALESCE(excluded.payment_intent_id, billing_invoices.payment_intent_id), charge_id = COALESCE(excluded.charge_id, billing_invoices.charge_id), hosted_invoice_url = excluded.hosted_invoice_url, invoice_pdf = excluded.invoice_pdf, paid_at = COALESCE(excluded.paid_at, billing_invoices.paid_at), attempt_count = excluded.attempt_count, next_payment_attempt = excluded.next_payment_attempt, updated_at = excluded.updated_at`
    )
    .bind(
      inv.id, subscriptionId, sub ? sub.membership_id : null, typeof inv.customer === "object" ? inv.customer && inv.customer.id : inv.customer || null, inv.number || null, inv.status, inv.billing_reason || null, inv.currency || null,
      inv.subtotal != null ? inv.subtotal : null, tax || 0, inv.total != null ? inv.total : null, inv.amount_paid != null ? inv.amount_paid : null, JSON.stringify(taxes), addr.state || null, pi, charge,
      inv.hosted_invoice_url || null, inv.invoice_pdf || null, iso(line.period && line.period.start), iso(line.period && line.period.end), iso(paidAt), inv.attempt_count != null ? inv.attempt_count : null, iso(inv.next_payment_attempt),
      inv.livemode ? 1 : 0, inv.created || null, nowIso(), nowIso()
    )
    .run();
}

/* Primer pago confirmado: la solicitud queda «pagada» en su historial (el
   estado editorial no cambia) y se avisa al empresario. Una sola vez. */
async function primerPagoConfirmado(env, db, membershipId, inv) {
  const done = await db.prepare("SELECT 1 AS x FROM billing_audit WHERE membership_id = ? AND action = 'primer_pago_confirmado'").bind(membershipId).first();
  if (done) return;
  await audit(db, "stripe", "primer_pago_confirmado", membershipId, inv.id, `Factura ${inv.number || inv.id}`);
  const m = await db.prepare("SELECT application_id FROM business_memberships WHERE id = ?").bind(membershipId).first();
  await membershipNote(db, membershipId, "pago_confirmado", `Primer pago confirmado (${inv.number || inv.id}). La miniweb se prepara y se publica tras la aprobación de la vista previa.`);
  if (m && m.application_id) await applicationNote(db, m.application_id, `Solicitud pagada: primer pago confirmado por Stripe (${inv.number || inv.id}). Preparar la miniweb.`);
  await correoConfirmacion(env, db, membershipId, inv).catch((e) => console.error("Correo de confirmación de pago no enviado", membershipId, e && e.message));
}

async function correoConfirmacion(env, db, membershipId, inv) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return;
  const link = await db.prepare("SELECT email, business_name FROM billing_payment_links WHERE membership_id = ? AND email IS NOT NULL ORDER BY created_at DESC LIMIT 1").bind(membershipId).first();
  if (!link || !link.email) return;
  const cfg = await settings(db);
  const c = condiciones(cfg);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const portal = env.STRIPE_PORTAL_LOGIN_URL ? `<p>Para actualizar tu tarjeta, ver tus facturas o cancelar la suscripción, usa el portal seguro de Stripe: <a href="${esc(env.STRIPE_PORTAL_LOGIN_URL)}">${esc(env.STRIPE_PORTAL_LOGIN_URL)}</a></p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px">
<h2 style="color:#111">¡Gracias! Confirmamos tu pago</h2>
<p>Hola, recibimos el primer pago del <strong>Perfil Empresarial Premium</strong> de <strong>${esc(link.business_name)}</strong>.</p>
<p>${esc(c.inicio)} ${esc(c.entrega)}</p>
<p>${esc(c.renovacion)} ${esc(c.cancelacion)}</p>
${inv.hosted_invoice_url ? `<p>Tu factura y recibo: <a href="${esc(inv.hosted_invoice_url)}">ver factura</a>. Stripe también te envía el recibo por correo.</p>` : ""}
${portal}
<p style="color:#555;font-size:13px">El Podcast del Migrante · eRadio Global Corp.</p></div>`;
  await fetch(env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `pago-confirmado-${membershipId}` },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [link.email], reply_to: env.MAIL_REPLY_TO || undefined, subject: "Confirmamos tu pago — Perfil Empresarial Premium", html }),
  }).then((r) => {
    if (!r.ok) throw new Error("Resend " + r.status);
  });
}

/* ---------- Estado financiero derivado (panel) ---------- */
/* No cambia nada: describe la situación para el panel y las reglas comerciales.
   «beneficios_suspendibles» indica que vence la gracia; la suspensión real de
   beneficios es una decisión comercial posterior (nunca automática). */
export function estadoFinanciero(sub, cfg, now = new Date()) {
  if (!sub) return { estado: "sin_suscripcion" };
  if (sub.status === "canceled" || sub.status === "incomplete_expired") return { estado: "cancelada" };
  if (sub.status === "incomplete") return { estado: "pendiente_pago" };
  if (sub.first_failed_at || sub.status === "past_due" || sub.status === "unpaid") {
    const desde = sub.first_failed_at ? new Date(sub.first_failed_at) : now;
    const dias = Math.floor((now - desde) / 86400000);
    const restantes = Math.max(0, cfg.grace_days - dias);
    return restantes > 0 ? { estado: "en_gracia", dias_restantes: restantes } : { estado: "gracia_vencida", beneficios_suspendibles: true };
  }
  if (sub.cancel_at_period_end) return { estado: "cancela_al_final", hasta: sub.current_period_end };
  return { estado: "al_dia", proximo_cobro: sub.current_period_end };
}

/* ---------- Devolución del primer pago (panel, con confirmación) ---------- */
/* Política aprobada: 100 % del primer pago dentro de 30 días si la empresa no
   puede aprobarse, y cancelación inmediata para evitar renovaciones. */
export async function devolverPrimerPago(env, db, { membershipId, actor, motivo, now = new Date() }) {
  const fail = (code) => Object.assign(new Error(code), { code });
  const inv = await db.prepare("SELECT * FROM billing_invoices WHERE membership_id = ? AND billing_reason = 'subscription_create' AND status = 'paid' ORDER BY stripe_created ASC LIMIT 1").bind(membershipId).first();
  if (!inv) throw fail("sin_primer_pago");
  const cfg = await settings(db);
  const pagado = new Date(inv.paid_at || inv.created_at);
  if (now - pagado > cfg.refund_window_days * 86400000) throw fail("fuera_de_plazo");
  if ((inv.amount_refunded || 0) >= (inv.amount_paid || 0)) throw fail("ya_devuelto");
  const params = { amount: (inv.amount_paid || 0) - (inv.amount_refunded || 0), reason: "requested_by_customer", metadata: { membership_id: membershipId, motivo: String(motivo || "").slice(0, 200) } };
  if (inv.payment_intent_id) params.payment_intent = inv.payment_intent_id;
  else if (inv.charge_id) params.charge = inv.charge_id;
  else throw fail("sin_cargo");
  const refund = await stripeRequest(env, "POST", "/v1/refunds", params, { idempotencyKey: `devolucion-${inv.stripe_invoice_id}` });
  await db.prepare("INSERT OR IGNORE INTO billing_refunds (stripe_refund_id, stripe_invoice_id, charge_id, membership_id, amount, currency, status, reason, requested_by, livemode, stripe_created, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)").bind(refund.id, inv.stripe_invoice_id, refund.charge || inv.charge_id, membershipId, refund.amount, refund.currency, refund.status || null, String(motivo || "").slice(0, 200), actor, refund.created || null, now.toISOString()).run();
  if (inv.stripe_subscription_id) {
    await stripeRequest(env, "DELETE", `/v1/subscriptions/${inv.stripe_subscription_id}`, {}, {}).catch((e) => {
      if (!(e && e.status === 404)) throw e;
    });
    await sincronizarSuscripcion(env, db, inv.stripe_subscription_id, Math.floor(now.getTime() / 1000)).catch(() => {});
  }
  await audit(db, actor, "devolucion_primer_pago", membershipId, refund.id, `${(refund.amount / 100).toFixed(2)} ${String(refund.currency || "").toUpperCase()} · suscripción cancelada`);
  return { refundId: refund.id, amount: refund.amount };
}

/* ---------- Conciliación (tarea diaria del panel) ---------- */
/* Recorre las suscripciones recientes en Stripe y corrige D1 con la API como
   fuente de verdad. Devuelve el resumen; lo que no se pueda asociar queda como
   alerta en billing_audit para revisión humana. */
export async function conciliar(env, db, { desde = Math.floor(Date.now() / 1000) - 35 * 86400, maxPaginas = 10 } = {}) {
  let after;
  const res = { revisadas: 0, corregidas: 0, alertas: 0 };
  for (let p = 0; p < maxPaginas; p++) {
    const page = await stripeRequest(env, "GET", "/v1/subscriptions", { status: "all", limit: 100, created: { gte: desde }, ...(after ? { starting_after: after } : {}) });
    for (const s of page.data || []) {
      res.revisadas++;
      const known = await db.prepare("SELECT status, cancel_at_period_end FROM billing_subscriptions WHERE stripe_subscription_id = ?").bind(s.id).first();
      if (known && known.status === s.status && !!known.cancel_at_period_end === !!s.cancel_at_period_end) continue;
      const r = await sincronizarSuscripcion(env, db, s.id, Math.floor(Date.now() / 1000));
      if (r.result === "aplicado") res.corregidas++;
      else res.alertas++;
    }
    if (!page.has_more || !(page.data || []).length) break;
    after = page.data[page.data.length - 1].id;
  }
  await audit(db, "sistema", "conciliacion", null, null, `revisadas ${res.revisadas}, corregidas ${res.corregidas}, alertas ${res.alertas}`);
  return res;
}
