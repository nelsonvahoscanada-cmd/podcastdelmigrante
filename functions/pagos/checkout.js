/*
  POST /pagos/checkout — Crea (o reutiliza) la sesión de Stripe Checkout del
  enlace. Cuerpo JSON: { token, aceptaCondiciones: true, condiciones: "<versión>" }.
  Responde { ok, url } para redirigir a la página de pago alojada por Stripe.
  Nunca recibe datos de tarjeta. Mismo origen obligatorio.
*/
import { pagosStatus, closedResponse, jsonResponse } from "../_lib/pagos-env.js";
import { crearCheckout, schemaReady } from "../_lib/pagos.js";

const SITE_ORIGIN = "https://podcastdelmigrante.com";
const MENSAJES = {
  condiciones: "Las condiciones cambiaron: recarga la página y vuelve a revisarlas.",
  invalido: "Este enlace de pago no es válido.",
  vencido: "Este enlace de pago venció. Escríbenos y te enviamos uno nuevo.",
  usado: "Este enlace de pago ya se usó.",
  revocado: "Este enlace de pago ya no está activo.",
  no_permitido: "Este enlace no requiere ningún pago.",
  ya_suscrita: "Tu suscripción ya está activa.",
};

function originOf(request, env) {
  const url = new URL(request.url);
  /* En vistas previas (pages.dev) el regreso de Stripe vuelve a la misma vista previa */
  return env.PAGOS_SITE_ORIGIN || (url.hostname.endsWith(".pages.dev") || url.hostname === "127.0.0.1" || url.hostname === "localhost" ? url.origin : SITE_ORIGIN);
}

export async function onRequestPost({ request, env }) {
  const status = pagosStatus(env);
  if (!status.open) return closedResponse(status);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return jsonResponse({ ok: false, error: "Origen no permitido." }, 403);
  if (!/^application\/json\b/i.test(request.headers.get("Content-Type") || "")) return jsonResponse({ ok: false, error: "Formato no admitido." }, 415);
  if (!(await schemaReady(env.PAGOS_DB))) return jsonResponse({ ok: false, error: "El pago en línea todavía no está disponible." }, 503);
  const body = await request.json().catch(() => ({}));
  if (!body || body.aceptaCondiciones !== true) return jsonResponse({ ok: false, error: "Debes aceptar las condiciones antes de pagar." }, 400);
  try {
    const r = await crearCheckout(env, env.PAGOS_DB, { token: body.token, termsVersion: body.condiciones, siteOrigin: originOf(request, env) });
    return jsonResponse({ ok: true, url: r.url });
  } catch (e) {
    if (e && e.status && MENSAJES[e.code]) return jsonResponse({ ok: false, estado: e.code, error: MENSAJES[e.code] }, e.status);
    console.error("Checkout no creado", (e && (e.code || e.status)) || "error");
    return jsonResponse({ ok: false, error: "No pudimos abrir la página de pago. Intenta de nuevo en unos minutos." }, 502);
  }
}

export function onRequest() {
  return jsonResponse({ ok: false, error: "Método no permitido." }, 405, { Allow: "POST" });
}
