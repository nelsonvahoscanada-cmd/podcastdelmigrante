/*
  functions/_lib/stripe.js — Cliente mínimo de la API de Stripe para Workers
  ===========================================================================
  Sin SDK: fetch + Web Crypto. Se usa en las Pages Functions de /pagos/* y,
  más adelante, en el panel (admin-worker).

  Seguridad:
    - La clave (STRIPE_SECRET_KEY) solo se lee del entorno (Cloudflare
      Secrets). Nunca se escribe en registros, respuestas ni errores.
    - MODO PRUEBA OBLIGATORIO: mientras la dirección no autorice cobros
      reales, solo se aceptan claves de prueba (sk_test_ / rk_test_) y
      eventos con livemode = false. Cualquier clave o evento real se rechaza.
    - Firma de webhooks: HMAC-SHA256 del cuerpo crudo, comparación en tiempo
      constante y tolerancia de 5 minutos (como el SDK oficial).
*/

export const STRIPE_API = "https://api.stripe.com";
export const TOLERANCE_SECONDS = 300;

/* Los cobros reales están desactivados en el código. Activarlos requiere
   cambiar esta constante en un Pull Request autorizado expresamente. */
export const LIVE_MODE_ALLOWED = false;

const TEST_KEY_RE = /^(sk|rk)_test_[A-Za-z0-9]{10,}$/;
const LIVE_KEY_RE = /^(sk|rk)_live_[A-Za-z0-9]{10,}$/;

/* Modo de la clave configurada, sin revelarla: "test", "live" o "" (inválida). */
export function keyMode(key) {
  const k = String(key || "").trim();
  if (TEST_KEY_RE.test(k)) return "test";
  if (LIVE_KEY_RE.test(k)) return "live";
  return "";
}

/* Parámetros anidados al formato application/x-www-form-urlencoded de Stripe
   ({ a: { b: 1 }, items: [{ price: "x" }] } → a[b]=1&items[0][price]=x). */
export function encodeForm(params, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (item !== null && typeof item === "object" ? encodeForm(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") encodeForm(v, key, out);
    else out.append(key, typeof v === "boolean" ? (v ? "true" : "false") : String(v));
  }
  return out;
}

export class StripeError extends Error {
  constructor(status, type, code, message) {
    super(`Stripe ${status}${type ? ` ${type}` : ""}${code ? ` (${code})` : ""}`);
    this.status = status;
    this.type = type || "";
    this.code = code || "";
    /* El mensaje de Stripe puede mencionar datos del cliente: no se propaga a registros. */
    this.stripeMessage = message || "";
  }
}

/* Versión de la API FIJADA. Debe coincidir con la versión del webhook
   registrado en Stripe (2025-01-27.acacia), para que las respuestas de la API y
   los eventos tengan siempre la misma forma. Cambiarla exige revisar las
   expansiones (EXPANSIONES_VALIDAS) y las pruebas. */
export const STRIPE_API_VERSION = "2025-01-27.acacia";

/* Expansiones que el código usa y que existen en esa versión. En acacia la
   factura tiene «charge» y «payment_intent»; «payments» no existe (llegó en
   2025-03-31.basil) y Stripe rechaza la consulta entera si se pide. */
export const EXPANSIONES_VALIDAS = {
  invoice: ["charge", "charge.balance_transaction", "payment_intent"],
  charge: ["balance_transaction"],
};

/* Llamada a la API. `idempotencyKey` evita cobros u objetos duplicados si la
   misma operación se repite (reintento, doble clic, dos pestañas). */
export async function stripeRequest(env, method, path, params, { idempotencyKey } = {}) {
  const key = String(env.STRIPE_SECRET_KEY || "").trim();
  const mode = keyMode(key);
  if (!mode) throw new StripeError(0, "config", "clave_invalida", "");
  if (mode === "live" && !LIVE_MODE_ALLOWED) throw new StripeError(0, "config", "modo_real_desactivado", "");
  const base = (env.STRIPE_API_BASE || STRIPE_API).replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${key}`, "Stripe-Version": STRIPE_API_VERSION };
  let url = base + path;
  let body;
  if (method === "GET") {
    const q = encodeForm(params).toString();
    if (q) url += (url.includes("?") ? "&" : "?") + q;
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = encodeForm(params).toString();
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  }
  const res = await fetch(url, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data && data.error ? data.error : {};
    throw new StripeError(res.status, e.type, e.code, e.message);
  }
  return data;
}

/* ---------- Firma de webhooks ---------- */
const enc = new TextEncoder();

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Cabecera Stripe-Signature: "t=1700000000,v1=abc…,v1=def…". */
export function parseSignatureHeader(header) {
  const out = { t: null, v1: [] };
  for (const part of String(header || "").split(",")) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    if (k.trim() === "t") out.t = Number(v.trim());
    else if (k.trim() === "v1") out.v1.push(v.trim());
  }
  return out;
}

/* Verifica la firma y devuelve el evento ya interpretado. Lanza un Error con
   `reason` (firma_ausente, firma_invalida, fuera_de_tiempo, json_invalido). */
export async function verifyWebhook(rawBody, header, secret, { now = Date.now(), tolerance = TOLERANCE_SECONDS } = {}) {
  const fail = (reason) => Object.assign(new Error("Webhook rechazado: " + reason), { reason });
  const sec = String(secret || "").trim();
  if (!sec) throw fail("secreto_ausente");
  const { t, v1 } = parseSignatureHeader(header);
  if (!t || !v1.length) throw fail("firma_ausente");
  if (Math.abs(Math.floor(now / 1000) - t) > tolerance) throw fail("fuera_de_tiempo");
  const expected = await hmacHex(sec, `${t}.${rawBody}`);
  if (!v1.some((s) => timingSafeEqualHex(s, expected))) throw fail("firma_invalida");
  try {
    return JSON.parse(rawBody);
  } catch {
    throw fail("json_invalido");
  }
}

/* Para pruebas y herramientas: genera la cabecera como lo hace Stripe. */
export async function signPayload(rawBody, secret, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${rawBody}`)}`;
}
