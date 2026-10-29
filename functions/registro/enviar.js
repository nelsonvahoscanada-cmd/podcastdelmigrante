/*
  POST /registro/enviar — Recepción de solicitudes de Perfil Empresarial
  ======================================================================
  Flujo (nada se publica automáticamente):
    1. Valida y sanea en el servidor (mismas reglas que el formulario:
       js/directorio/solicitud-core.js) y comprueba cada imagen por su
       contenido real (JPG / PNG / WebP, ≤ 5 MB, ≥ 300 px): la principal
       (obligatoria) y hasta 3 fotografías adicionales (opcionales).
    2. Antispam: Cloudflare Turnstile + campo trampa + límite de
       frecuencia por IP (hash con sal, nunca la IP en claro) y por correo.
    3. Evita duplicados: misma clave de envío (reintentos) o misma empresa
       y correo con una solicitud abierta → devuelve el número existente.
    4. Guarda las imágenes en R2 (privado) y la solicitud en D1 con estado
       «pendiente». Solo si todo queda guardado responde «ok»; si algo
       falla, borra lo que alcanzó a subir.
    Nunca crea ni publica una miniweb: el perfil se prepara a mano.
    5. Después envía (en segundo plano) el aviso interno y la confirmación
       al empresario con Resend y registra el resultado. Un fallo de
       correo NO pierde la solicitud: queda marcada en el panel.
*/
import { normalize, validate, validateImage, newRequestId, LIMITS } from "../../js/directorio/solicitud-core.js";
import { internalEmail, confirmationEmail, sendEmail, toBase64 } from "../_lib/correos.js";
import { registrationStatus, closedReason, jsonResponse, turnstileSecret } from "../_lib/registro-env.js";
import { recordEvent } from "../_lib/historial.js";

/* Versión del texto de consentimiento y del aviso de privacidad del formulario
   (registra-tu-empresa.html). Cambiarla cada vez que cambie ese texto. */
export const CONSENT_VERSION = "directorio-2026-10-v3";
/* Imagen principal + hasta 3 adicionales (≤ 5 MB cada una) + texto */
const MAX_BODY = (1 + LIMITS.extraImagesMax) * LIMITS.imageMaxBytes + 512 * 1024;
/* Adjuntos del aviso interno: tope para no superar el límite de Gmail
   (25 MB, y base64 suma ~33 %). Lo que no quepa se ve en el panel. */
const MAX_ATTACH_BYTES = 12 * 1024 * 1024;
const LIMIT_PER_IP_HOUR = 5;
const LIMIT_PER_EMAIL_DAY = 3;

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/* Dominios desde los que se acepta el token de Turnstile. Por defecto, solo
   el sitio oficial; para probar en una vista previa de Pages se añade su
   dominio en TURNSTILE_HOSTNAMES (lista separada por comas). */
const DEFAULT_TURNSTILE_HOSTNAMES = ["podcastdelmigrante.com", "www.podcastdelmigrante.com"];

export function allowedTurnstileHostnames(env) {
  const list = String((env && env.TURNSTILE_HOSTNAMES) || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : DEFAULT_TURNSTILE_HOSTNAMES;
}

/* Resultado de la verificación: { ok, reason }.
   reason: "missing" (sin token) · "expired" (vencido o ya usado: el token
   vale 300 s y una sola vez) · "invalid" (rechazado) · "hostname" (emitido
   en otro dominio) · "config" (clave secreta errónea o ausente: problema
   nuestro, no de la persona) · "unavailable" (Turnstile no respondió).
   El registro anota solo los códigos de error de Cloudflare y el dominio,
   nunca el token, la IP ni datos personales. */
const TURNSTILE_EXPIRED = ["timeout-or-duplicate"];
const TURNSTILE_CONFIG = ["missing-input-secret", "invalid-input-secret"];

export async function verifyTurnstile(env, token, ip) {
  if (!token) {
    console.warn("Turnstile: la solicitud llegó sin token");
    return { ok: false, reason: "missing" };
  }
  const body = new URLSearchParams({ secret: turnstileSecret(env), response: token });
  if (ip) body.set("remoteip", ip);
  let res;
  try {
    res = await fetch(env.TURNSTILE_VERIFY_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  } catch (e) {
    console.error("Turnstile no respondió:", e && e.message);
    return { ok: false, reason: "unavailable" };
  }
  if (!res.ok) {
    console.error("Turnstile respondió", res.status);
    return { ok: false, reason: "unavailable" };
  }
  const out = await res.json().catch(() => ({}));
  if (out.success !== true) {
    const codes = (Array.isArray(out["error-codes"]) ? out["error-codes"] : []).map((c) => String(c).replace(/[^a-z0-9-]/gi, "").slice(0, 40));
    const reason = codes.some((c) => TURNSTILE_CONFIG.includes(c)) ? "config" : codes.some((c) => TURNSTILE_EXPIRED.includes(c)) ? "expired" : "invalid";
    (reason === "config" ? console.error : console.warn)(`Turnstile rechazó el token (${reason}): ${codes.join(",") || "sin códigos"}`);
    /* Un token recién emitido que Siteverify no reconoce suele indicar que la clave secreta es de otro widget
       (en ese caso, el panel de Turnstile del widget del formulario muestra 0 llamadas a Siteverify). */
    if (reason === "invalid" && codes.includes("invalid-input-response")) console.error("Turnstile: si los tokens recién resueltos se rechazan como «invalid-input-response», revisa que TURNSTILE_SECRET_KEY sea la Secret Key del mismo widget que TURNSTILE_SITE_KEY");
    return { ok: false, reason };
  }
  /* Un token válido obtenido en otro sitio (p. ej. copiado por un robot desde
     una página ajena con la misma clave) no sirve aquí. */
  const host = String(out.hostname || "").toLowerCase();
  if (!allowedTurnstileHostnames(env).includes(host)) {
    console.warn("Turnstile: token emitido para un dominio no permitido:", host || "(sin dominio)");
    return { ok: false, reason: "hostname" };
  }
  return { ok: true, reason: "" };
}

/* Respuesta al navegador según el motivo. Ninguna pide recargar la página
   (se perderían los datos y las fotografías): el formulario renueva la
   verificación y permite reintentar con el mismo número de solicitud. */
const KEEP = "Tus datos y fotografías siguen en el formulario.";
export function turnstileFailure(reason) {
  if (reason === "unavailable") return [503, "turnstile_unavailable", `No pudimos completar la verificación de seguridad en este momento. ${KEEP} Inténtalo de nuevo en unos minutos.`];
  if (reason === "config") return [503, "turnstile_config", `No pudimos completar la verificación de seguridad por un problema de nuestro sitio, no tuyo. ${KEEP} Inténtalo más tarde o escríbenos.`];
  if (reason === "expired" || reason === "missing") return [403, "turnstile_expired", `La verificación de seguridad venció. Vuelve a completarla (la casilla de Cloudflare, arriba del botón) y pulsa «Enviar solicitud». ${KEEP}`];
  return [403, "turnstile_invalid", `No pudimos verificar que no eres un robot. Vuelve a completar la verificación y pulsa «Enviar solicitud». ${KEEP}`];
}

function receivedLabel(date) {
  try {
    return new Intl.DateTimeFormat("es-CA", { dateStyle: "long", timeStyle: "short", timeZone: "America/Edmonton" }).format(date) + " (hora de Alberta)";
  } catch (e) {
    return date.toISOString();
  }
}

/* Cualquier fallo inesperado (p. ej. D1 no disponible) responde con un
   JSON claro y sin detalles internos; el detalle queda solo en los registros. */
export async function onRequestPost(context) {
  try {
    return await handlePost(context);
  } catch (e) {
    console.error("Error inesperado en /registro/enviar:", e && e.message);
    return jsonResponse({ ok: false, error: "No pudimos registrar tu solicitud. Tus datos siguen en el formulario: inténtalo de nuevo en unos minutos." }, 500);
  }
}

async function handlePost(context) {
  const { request, env } = context;
  const status = registrationStatus(env);
  if (!status.open) {
    console.warn(closedReason(status));
    return jsonResponse({ ok: false, error: "El registro no está disponible en este momento. Inténtalo más tarde." }, 503);
  }
  const ctype = request.headers.get("Content-Type") || "";
  if (!ctype.startsWith("multipart/form-data")) return jsonResponse({ ok: false, error: "Solicitud no válida." }, 415);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY) return jsonResponse({ ok: false, error: "Las imágenes pesan demasiado (máximo 5 MB cada una)." }, 413);

  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Solicitud no válida." }, 400);
  }
  const raw = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") raw[k] = v;

  const { data, errors } = validate(normalize(raw));
  const file = form.get("image");
  let image = null;
  if (!file || typeof file === "string") {
    errors.image = "Adjunta una fotografía o un logotipo.";
  } else {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = validateImage(bytes);
    if (!check.ok) errors.image = check.error;
    else image = Object.assign({ bytes }, check.info);
  }
  /* Fotografías adicionales (opcionales): se ignoran los campos vacíos */
  const extraFiles = form.getAll("extraImages").filter((f) => f && typeof f !== "string" && f.size > 0);
  const extras = [];
  if (extraFiles.length > LIMITS.extraImagesMax) {
    errors.extraImages = `Puedes enviar como máximo ${LIMITS.extraImagesMax} fotografías adicionales.`;
  } else {
    for (const f of extraFiles) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const check = validateImage(bytes);
      if (!check.ok) { errors.extraImages = "Fotografía adicional: " + check.error.charAt(0).toLowerCase() + check.error.slice(1); break; }
      extras.push(Object.assign({ bytes }, check.info));
    }
  }
  if (Object.keys(errors).length) return jsonResponse({ ok: false, error: "Revisa los campos marcados.", errors }, 400);

  /* Campo trampa: solo lo llenan los robots */
  if (data.honey) return jsonResponse({ ok: false, error: "No pudimos procesar la solicitud." }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const human = await verifyTurnstile(env, raw["cf-turnstile-response"], ip);
  if (!human.ok) {
    const [httpStatus, code, error] = turnstileFailure(human.reason);
    return jsonResponse({ ok: false, code, error }, httpStatus);
  }

  const db = env.DIRECTORIO_DB;
  const now = new Date();
  const nowIso = now.toISOString();
  const ipHash = ip ? await sha256(env.IP_HASH_SALT + "|" + ip) : null;
  const idemKey = data.idempotencyKey || (await sha256(`${data.email}|${data.name}|${nowIso.slice(0, 13)}`)).slice(0, 40);

  /* Reintento del mismo envío → mismo número */
  const prev = await db.prepare("SELECT id FROM business_applications WHERE idempotency_key = ?").bind(idemKey).first();
  if (prev) return jsonResponse({ ok: true, requestId: prev.id, duplicate: true });

  /* Misma empresa y correo con una solicitud abierta → no se duplica */
  const open = await db
    .prepare("SELECT id FROM business_applications WHERE email = ? AND lower(name) = lower(?) AND status IN ('pendiente','en_revision') ORDER BY created_at DESC LIMIT 1")
    .bind(data.email, data.name)
    .first();
  if (open) return jsonResponse({ ok: true, requestId: open.id, duplicate: true });

  /* Límite de frecuencia */
  const hourAgo = new Date(now.getTime() - 3600e3).toISOString();
  const dayAgo = new Date(now.getTime() - 86400e3).toISOString();
  if (ipHash) {
    const r = await db.prepare("SELECT COUNT(*) AS n FROM business_applications WHERE ip_hash = ? AND created_at > ?").bind(ipHash, hourAgo).first();
    if (r && r.n >= LIMIT_PER_IP_HOUR) return jsonResponse({ ok: false, error: "Recibimos varias solicitudes desde tu conexión. Inténtalo de nuevo más tarde." }, 429);
  }
  const r2 = await db.prepare("SELECT COUNT(*) AS n FROM business_applications WHERE email = ? AND created_at > ?").bind(data.email, dayAgo).first();
  if (r2 && r2.n >= LIMIT_PER_EMAIL_DAY) return jsonResponse({ ok: false, error: "Ya recibimos varias solicitudes con este correo hoy. Te contactaremos pronto." }, 429);

  /* Guardar: primero la imagen, luego la fila (si la fila falla, se borra la imagen) */
  let id = "";
  for (let attempt = 0; attempt < 3 && !id; attempt++) {
    const candidate = newRequestId(now);
    const exists = await db.prepare("SELECT 1 FROM business_applications WHERE id = ?").bind(candidate).first();
    if (!exists) id = candidate;
  }
  if (!id) return jsonResponse({ ok: false, error: "No pudimos registrar la solicitud. Inténtalo de nuevo." }, 500);

  const imageKey = `solicitudes/${id}/imagen.${image.ext}`;
  const extraMeta = extras.map((x, i) => ({ key: `solicitudes/${id}/adicional-${i + 1}.${x.ext}`, type: x.type, bytes: x.size, width: x.width, height: x.height }));
  const uploaded = [];
  try {
    await env.SOLICITUDES.put(imageKey, image.bytes, {
      httpMetadata: { contentType: image.type },
      customMetadata: { solicitud: id, tipo: data.imageKind },
    });
    uploaded.push(imageKey);
    for (let i = 0; i < extras.length; i++) {
      await env.SOLICITUDES.put(extraMeta[i].key, extras[i].bytes, {
        httpMetadata: { contentType: extras[i].type },
        customMetadata: { solicitud: id, tipo: "adicional" },
      });
      uploaded.push(extraMeta[i].key);
    }
    await db
      .prepare(
        `INSERT INTO business_applications (id, idempotency_key, created_at, updated_at, status, name, category, category_other, city, province,
          representative, title, summary, email, phone, whatsapp, website, address, instagram, facebook, tiktok, linkedin,
          image_kind, image_key, image_type, image_bytes, image_width, image_height, consent_version, consent_at, ip_hash,
          services, notes, extra_images)
         VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, idemKey, nowIso, nowIso, data.name, data.category, data.categoryOther || null, data.city, data.province,
        data.representative, data.title || null, data.summary, data.email, data.phone || null, data.whatsapp || null, data.website || null,
        data.address || null, data.instagram || null, data.facebook || null, data.tiktok || null, data.linkedin || null,
        data.imageKind, imageKey, image.type, image.size, image.width, image.height, CONSENT_VERSION, nowIso, ipHash,
        data.services, data.notes || null, extraMeta.length ? JSON.stringify(extraMeta) : null)
      .run();
  } catch (e) {
    console.error("No se pudo guardar la solicitud", id, e && e.message);
    for (const key of uploaded) await env.SOLICITUDES.delete(key).catch(() => {});
    return jsonResponse({ ok: false, error: "No pudimos registrar la solicitud. Inténtalo de nuevo en unos minutos." }, 500);
  }

  await recordEvent(db, { id, at: nowIso, actor: "formulario", action: "recibida", to: "pendiente", detail: `Consentimientos ${CONSENT_VERSION} · ${data.imageKind}${extras.length ? ` + ${extras.length} fotografía(s) adicional(es)` : ""}` });

  /* Correos en segundo plano: la solicitud ya está registrada */
  const meta = { id, receivedLabel: receivedLabel(now), panelUrl: (env.PANEL_URL || "").replace(/\/+$/, "") };
  const work = sendNotifications(env, data, image, meta, extras);
  if (context.waitUntil) context.waitUntil(work);
  else await work;

  return jsonResponse({ ok: true, requestId: id }, 201);
}

export async function sendNotifications(env, data, image, meta, extras = []) {
  const db = env.DIRECTORIO_DB;
  const errors = [];
  /* Imagen principal siempre; adicionales mientras quepan en el tope */
  const attachments = [{ filename: `${meta.id}-${data.imageKind}.${image.ext}`, content: toBase64(image.bytes) }];
  let attached = image.size;
  extras.forEach((x, i) => {
    if (attached + x.size > MAX_ATTACH_BYTES) return;
    attached += x.size;
    attachments.push({ filename: `${meta.id}-adicional-${i + 1}.${x.ext}`, content: toBase64(x.bytes) });
  });
  const internal = internalEmail(data, Object.assign({ extraCount: extras.length, extraAttached: attachments.length - 1 }, meta));
  let internalStatus = "enviado";
  try {
    await sendEmail(env, {
      from: env.MAIL_FROM,
      to: [env.MAIL_INTERNAL_TO],
      reply_to: data.email,
      subject: internal.subject,
      html: internal.html,
      text: internal.text,
      attachments,
    }, `${meta.id}-interno`);
  } catch (e) {
    internalStatus = "error";
    errors.push("interno: " + e.message);
  }
  const conf = confirmationEmail(meta);
  let confStatus = "enviado";
  try {
    await sendEmail(env, {
      from: env.MAIL_FROM,
      to: [data.email],
      reply_to: env.MAIL_REPLY_TO || env.MAIL_INTERNAL_TO,
      subject: conf.subject,
      html: conf.html,
      text: conf.text,
    }, `${meta.id}-confirmacion`);
  } catch (e) {
    confStatus = "error";
    errors.push("confirmación: " + e.message);
  }
  try {
    await db
      .prepare("UPDATE business_applications SET internal_email_status = ?, confirmation_email_status = ?, email_error = ?, updated_at = ? WHERE id = ?")
      .bind(internalStatus, confStatus, errors.length ? errors.join(" | ").slice(0, 500) : null, new Date().toISOString(), meta.id)
      .run();
  } catch (e) {
    console.error("No se pudo registrar el estado de los correos", meta.id, e && e.message);
  }
  await recordEvent(db, { id: meta.id, actor: "sistema", action: "correos", detail: `Aviso interno: ${internalStatus} · Confirmación: ${confStatus}` });
  if (errors.length) console.error("Correos de", meta.id, errors.join(" | "));
}
