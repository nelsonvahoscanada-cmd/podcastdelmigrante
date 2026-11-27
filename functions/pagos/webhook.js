/*
  POST /pagos/webhook — Eventos de Stripe (endpoint de PRUEBA).
  1. Lee el cuerpo CRUDO y verifica la firma (Stripe-Signature, HMAC-SHA256,
     tolerancia de 5 minutos). Sin firma válida: 400 y no se toca nada.
  2. Rechaza eventos de modo real (livemode) mientras los cobros reales estén
     desactivados.
  3. Idempotencia: cada evento se registra una vez (billing_events); un
     duplicado responde 200 sin volver a aplicarse.
  4. Orden: el estado de la suscripción se lee de la API de Stripe, no del
     evento, y solo se guarda si es más reciente que lo ya aplicado.
  Responde 500 si falla al aplicar, para que Stripe reintente.
  Los registros solo contienen identificadores y tipos de evento.
*/
import { pagosStatus, closedResponse, jsonResponse } from "../_lib/pagos-env.js";
import { verifyWebhook, LIVE_MODE_ALLOWED } from "../_lib/stripe.js";
import { procesarEvento, schemaReady } from "../_lib/pagos.js";

const MAX_BODY = 512 * 1024;

export async function onRequestPost({ request, env }) {
  const status = pagosStatus(env);
  if (!status.open) return closedResponse(status);
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return jsonResponse({ ok: false }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return jsonResponse({ ok: false }, 413);
  let event;
  try {
    event = await verifyWebhook(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.log("Webhook rechazado:", e.reason || "firma");
    return jsonResponse({ ok: false }, 400);
  }
  if (!event || typeof event.id !== "string" || typeof event.type !== "string") return jsonResponse({ ok: false }, 400);
  if (event.livemode && !LIVE_MODE_ALLOWED) {
    console.log("Webhook de modo real rechazado", event.id);
    return jsonResponse({ ok: false }, 400);
  }
  if (!(await schemaReady(env.PAGOS_DB))) return jsonResponse({ ok: false }, 503);
  try {
    const r = await procesarEvento(env, env.PAGOS_DB, event);
    console.log("Webhook", event.type, event.id, r.resultado);
    return jsonResponse({ ok: true, resultado: r.resultado });
  } catch (e) {
    console.error("Webhook con error", event.type, event.id, (e && (e.code || e.status)) || "error");
    return jsonResponse({ ok: false }, 500);
  }
}

export function onRequest() {
  return jsonResponse({ ok: false }, 405, { Allow: "POST" });
}
