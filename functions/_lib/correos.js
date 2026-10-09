/*
  correos.js — Correos de las solicitudes del Directorio Empresarial
  ======================================================================
  Se envían con Resend (https://resend.com, plan gratuito) desde el
  remitente verificado MAIL_FROM (p. ej. «El Podcast del Migrante
  <solicitudes@podcastdelmigrante.com>»). La clave RESEND_API_KEY es un
  SECRETO de Cloudflare Pages: nunca está en el código.

  Dos mensajes:
    A. Aviso interno → MAIL_INTERNAL_TO (podcastdelmigrante@gmail.com):
       datos organizados + imagen adjunta + enlace al panel. Sin código.
    B. Confirmación al empresario → su correo: texto aprobado.
  Todo dato del solicitante se escapa (HTML) y los asuntos no admiten
  saltos de línea.
========================================================================= */

import { categoryLabel, IMAGE_KINDS } from "../../js/directorio/solicitud-core.js";

const BRAND = "El Podcast del Migrante";
const TAGLINE = "Conectando latinos, construyendo futuro";

export const esc = (t) =>
  String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (t) => String(t == null ? "" : t).replace(/[\r\n\t]+/g, " ").trim();

function layout(inner) {
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f2f1ed;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ed;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:4px solid #6f9a03;font-family:Arial,Helvetica,sans-serif;color:#0b0b0b;">
<tr><td style="padding:26px 28px 6px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#557902;font-weight:bold;">${BRAND}</td></tr>
${inner}
<tr><td style="padding:18px 28px 26px;border-top:1px solid #d9d9d6;font-size:12px;color:#5b5b5b;">${BRAND}<br>${TAGLINE}</td></tr>
</table></td></tr></table></body></html>`;
}

/* ---------- A. Aviso interno ---------- */
export function internalEmail(d, meta) {
  const rows = [
    ["Número de solicitud", meta.id],
    ["Fecha de recepción", meta.receivedLabel],
    ["Empresa o profesional", d.name],
    ["Categoría", categoryLabel(d)],
    ["Ciudad y provincia", `${d.city}, ${d.province}`],
    ["Representante", d.representative],
    ["Cargo o especialidad", d.title],
    ["Correo (privado)", d.email],
    ["Teléfono", d.phone],
    ["WhatsApp", d.whatsapp ? "+" + d.whatsapp : ""],
    ["Página web", d.website],
    ["Dirección comercial", d.address],
    ["Instagram", d.instagram],
    ["Facebook", d.facebook],
    ["TikTok", d.tiktok],
    ["LinkedIn", d.linkedin],
    ["Imagen", `${IMAGE_KINDS[d.imageKind]} (adjunta)`],
  ].filter(([, v]) => v);

  const htmlRows = rows
    .map(([k, v]) => `<tr><td style="padding:7px 0;width:42%;vertical-align:top;font-size:13px;color:#5b5b5b;">${esc(k)}</td><td style="padding:7px 0;font-size:14px;font-weight:bold;">${esc(v)}</td></tr>`)
    .join("");
  const panel = meta.panelUrl ? `${meta.panelUrl}/solicitudes?id=${encodeURIComponent(meta.id)}` : "";

  const html = layout(`
<tr><td style="padding:4px 28px 0;"><h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;">Nueva solicitud empresarial</h1>
<p style="margin:0 0 16px;font-size:14px;color:#2a2a2a;">Pendiente de revisión. No se publica nada sin aprobación.</p></td></tr>
<tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d9d9d6;border-bottom:1px solid #d9d9d6;">${htmlRows}</table></td></tr>
<tr><td style="padding:16px 28px 0;"><p style="margin:0 0 6px;font-size:13px;color:#5b5b5b;">Reseña</p><p style="margin:0;font-size:14px;line-height:1.55;white-space:pre-line;">${esc(d.summary)}</p></td></tr>
${panel ? `<tr><td style="padding:22px 28px 6px;"><a href="${esc(panel)}" style="display:inline-block;background:#0b0b0b;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;">Revisar en el panel</a></td></tr>` : ""}`);

  const text = [
    "Nueva solicitud empresarial (pendiente de revisión)",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Reseña:",
    d.summary,
    "",
    panel ? `Revisar en el panel: ${panel}` : "",
  ].join("\n");

  return {
    subject: oneLine(`Nueva solicitud empresarial — ${d.name} — ${meta.id}`).slice(0, 180),
    html,
    text,
  };
}

/* ---------- B. Confirmación al empresario ---------- */
export function confirmationEmail(meta) {
  const html = layout(`
<tr><td style="padding:4px 28px 0;"><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:24px;">¡Gracias por registrar tu empresa!</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hemos recibido correctamente tu solicitud para formar parte del Directorio Empresarial de El Podcast del Migrante.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Número de solicitud: <strong>${esc(meta.id)}</strong></p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Nuestro equipo revisará la información y se comunicará contigo para explicarte los siguientes pasos.</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;"><strong>Tu perfil no será publicado sin tu aprobación.</strong></p></td></tr>`);
  const text = [
    "¡Gracias por registrar tu empresa!",
    "",
    "Hemos recibido correctamente tu solicitud para formar parte del Directorio Empresarial de El Podcast del Migrante.",
    "",
    `Número de solicitud: ${meta.id}`,
    "",
    "Nuestro equipo revisará la información y se comunicará contigo para explicarte los siguientes pasos.",
    "",
    "Tu perfil no será publicado sin tu aprobación.",
    "",
    BRAND,
    TAGLINE,
  ].join("\n");
  return { subject: "Recibimos tu solicitud — El Podcast del Migrante", html, text };
}

/* ---------- Envío por Resend ---------- */
export async function sendEmail(env, message, idempotencyKey) {
  const res = await fetch(env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
  return true;
}

export function toBase64(bytes) {
  let s = "";
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
