/*
  GET /registro/config — ¿el registro está abierto? + clave PÚBLICA de Turnstile.
  El formulario la consulta al abrir: si está cerrado (interruptor
  REGISTRO_ABIERTO distinto de "1") o falta configuración, avisa antes de que
  la persona llene nada. No revela qué falta: los NOMBRES quedan en los
  registros de Functions, nunca los valores.
*/
import { registrationStatus, closedReason, jsonResponse } from "../_lib/registro-env.js";

export async function onRequestGet({ env }) {
  const status = registrationStatus(env);
  if (!status.open) console.warn(closedReason(status));
  return jsonResponse({ ready: status.open, turnstileSiteKey: status.open ? env.TURNSTILE_SITE_KEY : "" });
}
