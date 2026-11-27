/*
  Configuración de los pagos (Cloudflare Pages → el proyecto → Settings →
  Variables and Secrets / Bindings). Ver docs/pagos-configuracion-pruebas.md.

  Entorno de PRUEBAS (Preview) únicamente, hasta autorización expresa:
    Binding:   PAGOS_DB            D1 «podcastdelmigrante-directorio-test»
                                   (copia de esquema 0001–0006, SIN datos reales)
    Secretos:  STRIPE_SECRET_KEY   clave RESTRINGIDA de prueba (rk_test_…)
               STRIPE_WEBHOOK_SECRET  secreto de firma del endpoint de prueba (whsec_…)
    Variables: STRIPE_PRICE_ID     price_… del producto en modo de prueba (no es secreto)
               PAGOS_ABIERTOS = "1"   interruptor (cerrado por defecto)
               PAGOS_MODO = "test"    único valor aceptado
               STRIPE_PORTAL_LOGIN_URL  enlace de acceso al portal del cliente (opcional, público)
               STRIPE_AUTOMATIC_TAX   NO definir hasta confirmar las obligaciones fiscales

  Producción: sin PAGOS_DB ni claves → /pagos/* responde 503 («cerrado»).
  Los pagos usan su propio binding (PAGOS_DB), nunca DIRECTORIO_DB: así una
  configuración de prueba no puede escribir en la base de producción.
*/
import { keyMode, LIVE_MODE_ALLOWED } from "./stripe.js";
import { jsonResponse } from "./registro-env.js";

export const REQUIRED = ["PAGOS_DB", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"];
const PRICE_RE = /^price_[A-Za-z0-9]{8,}$/;

/* Nombres (nunca valores) de lo que falta o no es válido. */
export function missingConfig(env) {
  const missing = REQUIRED.filter((k) => !env || !env[k]);
  if (env && env.STRIPE_SECRET_KEY) {
    const mode = keyMode(env.STRIPE_SECRET_KEY);
    if (!mode) missing.push("STRIPE_SECRET_KEY (formato no válido)");
    else if (mode === "live" && !LIVE_MODE_ALLOWED) missing.push("STRIPE_SECRET_KEY (es una clave REAL: los cobros reales están desactivados)");
  }
  if (env && env.STRIPE_PRICE_ID && !PRICE_RE.test(String(env.STRIPE_PRICE_ID))) missing.push("STRIPE_PRICE_ID (formato no válido)");
  if (env && env.STRIPE_WEBHOOK_SECRET && !/^whsec_/.test(String(env.STRIPE_WEBHOOK_SECRET).trim())) missing.push("STRIPE_WEBHOOK_SECRET (formato no válido)");
  if (!env || env.PAGOS_MODO !== "test") missing.push('PAGOS_MODO (solo se admite "test")');
  return missing;
}

export function pagosStatus(env) {
  const missing = missingConfig(env);
  const switchOpen = !!env && env.PAGOS_ABIERTOS === "1";
  return { open: switchOpen && missing.length === 0, missing, switchOpen };
}

export function closedResponse(status) {
  const parts = [];
  if (!status.switchOpen) parts.push('interruptor PAGOS_ABIERTOS distinto de "1"');
  if (status.missing.length) parts.push("falta: " + status.missing.join(", "));
  console.log("Pagos cerrados — " + parts.join(" · "));
  return jsonResponse({ ok: false, error: "El pago en línea todavía no está disponible. Escríbenos y te ayudamos." }, 503);
}

export { jsonResponse };
