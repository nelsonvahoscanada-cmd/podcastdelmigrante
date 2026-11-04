/*
  POST /registro/invitacion — Comprueba una invitación del Directorio Empresarial
  ======================================================================
  La página /invitacion lee el código del fragmento de la URL (#c=…, que el
  navegador no envía al servidor ni a la analítica) y lo manda aquí en el
  cuerpo de un POST. Respuesta mínima para mostrar el mensaje correcto:
    200 { ok, kind, label, price, businessName, contactName, registroAbierto }
    404 código inexistente o mal formado
    410 invitación ya utilizada o retirada
    503 invitaciones no disponibles (tablas sin preparar o base no configurada)
  Nada se canjea aquí: el canje ocurre solo al enviar el formulario completo
  (/registro/enviar), dentro de la misma transacción que guarda la solicitud.
  Nunca se registra el código en los registros (console) ni se devuelve.
*/
import { KINDS, findInvitationByCode, schemaReady } from "../../js/directorio/membresias-core.js";
import { registrationStatus, jsonResponse } from "../_lib/registro-env.js";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

function reply(data, status) {
  const res = jsonResponse(data, status);
  for (const [k, v] of Object.entries(NO_STORE)) res.headers.set(k, v);
  return res;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return reply({ ok: false, error: "Solicitud no válida." }, 415);
    const body = await request.json().catch(() => null);
    const code = body && typeof body.code === "string" ? body.code.trim() : "";
    const db = env.DIRECTORIO_DB;
    if (!db || !(await schemaReady(db))) {
      console.warn("Invitaciones: tablas de membresías no disponibles (migración 0005)");
      return reply({ ok: false, code: "no_disponible", error: "Las invitaciones no están disponibles en este momento. Inténtalo más tarde o escríbenos." }, 503);
    }
    const inv = await findInvitationByCode(db, code);
    if (!inv) return reply({ ok: false, code: "invalida", error: "Esta invitación no es válida. Revisa que hayas abierto el enlace completo que recibiste." }, 404);
    if (inv.status !== "pendiente") {
      return reply({ ok: false, code: inv.status === "usada" ? "usada" : "retirada", error: inv.status === "usada" ? "Esta invitación ya fue utilizada. Si crees que es un error, escríbenos." : "Esta invitación ya no está disponible. Si crees que es un error, escríbenos." }, 410);
    }
    const k = KINDS[inv.kind];
    return reply({ ok: true, kind: inv.kind, label: k.label, price: k.price, plan: k.plan, businessName: inv.business_name, contactName: inv.contact_name || "", registroAbierto: registrationStatus(env).open });
  } catch (e) {
    console.error("Error al comprobar una invitación:", e && e.message);
    return reply({ ok: false, code: "error", error: "No pudimos comprobar la invitación. Inténtalo de nuevo en unos minutos." }, 500);
  }
}

export async function onRequest() {
  return reply({ ok: false, error: "Método no permitido." }, 405);
}
