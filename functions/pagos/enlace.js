/*
  POST /pagos/enlace — Comprueba un enlace individual de pago (página /pago).
  Cuerpo JSON: { token }. Responde el nombre del negocio y las CONDICIONES que
  deben mostrarse antes del pago. No crea nada en Stripe.
  El token llega en el cuerpo (no en la URL): en el navegador va después de «#».
*/
import { pagosStatus, closedResponse, jsonResponse } from "../_lib/pagos-env.js";
import { enlacePorToken, condiciones, settings, schemaReady } from "../_lib/pagos.js";

const MENSAJES = {
  invalido: "Este enlace de pago no es válido. Revisa que lo copiaste completo o escríbenos.",
  vencido: "Este enlace de pago venció. Escríbenos y te enviamos uno nuevo.",
  usado: "Este enlace de pago ya se usó. Si ya pagaste, revisa tu correo: Stripe te envió el recibo.",
  revocado: "Este enlace de pago ya no está activo. Escríbenos si necesitas ayuda.",
  no_permitido: "Este enlace no requiere ningún pago. Escríbenos si tienes dudas.",
  ya_suscrita: "Tu suscripción ya está activa: no necesitas pagar otra vez.",
};

export async function onRequestPost({ request, env }) {
  const status = pagosStatus(env);
  if (!status.open) return closedResponse(status);
  if (!/^application\/json\b/i.test(request.headers.get("Content-Type") || "")) return jsonResponse({ ok: false, error: "Formato no admitido." }, 415);
  if (!(await schemaReady(env.PAGOS_DB))) return jsonResponse({ ok: false, error: "El pago en línea todavía no está disponible." }, 503);
  const body = await request.json().catch(() => ({}));
  const r = await enlacePorToken(env.PAGOS_DB, body && body.token);
  if (r.estado !== "valido") return jsonResponse({ ok: false, estado: r.estado, error: MENSAJES[r.estado] || MENSAJES.invalido }, r.estado === "invalido" ? 404 : 409);
  const cfg = await settings(env.PAGOS_DB);
  return jsonResponse({ ok: true, negocio: r.link.business_name, vence: r.link.expires_at, condiciones: condiciones(cfg), modoPrueba: true });
}

export function onRequest() {
  return jsonResponse({ ok: false, error: "Método no permitido." }, 405, { Allow: "POST" });
}
