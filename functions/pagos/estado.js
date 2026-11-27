/*
  GET /pagos/estado?session_id=cs_… — Página de confirmación: ¿Stripe ya
  confirmó el pago? Solo responde «confirmado», «pendiente» o «desconocido».
  La confirmación real llega por el webhook firmado; esta consulta no activa nada.
*/
import { pagosStatus, closedResponse, jsonResponse } from "../_lib/pagos-env.js";
import { estadoSesion, schemaReady } from "../_lib/pagos.js";

export async function onRequestGet({ request, env }) {
  const status = pagosStatus(env);
  if (!status.open) return closedResponse(status);
  if (!(await schemaReady(env.PAGOS_DB))) return jsonResponse({ ok: false }, 503);
  const id = new URL(request.url).searchParams.get("session_id");
  const r = await estadoSesion(env.PAGOS_DB, id);
  return jsonResponse({ ok: true, estado: r.estado, portal: env.STRIPE_PORTAL_LOGIN_URL || null });
}

export function onRequest() {
  return jsonResponse({ ok: false }, 405, { Allow: "GET" });
}
