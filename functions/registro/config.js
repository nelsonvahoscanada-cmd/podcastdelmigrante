/*
  GET /registro/config — ¿el registro está listo? + clave PÚBLICA de Turnstile.
  El formulario la consulta al abrir: si falta configuración, avisa antes de
  que la persona llene nada. No revela qué falta (eso queda en los logs).
*/
import { missingConfig, jsonResponse } from "../_lib/registro-env.js";

export async function onRequestGet({ env }) {
  const missing = missingConfig(env);
  if (missing.length) console.warn("Registro de empresas sin configurar:", missing.join(", "));
  return jsonResponse({ ready: missing.length === 0, turnstileSiteKey: missing.length ? "" : env.TURNSTILE_SITE_KEY });
}
