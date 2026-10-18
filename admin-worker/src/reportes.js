/*
  reportes.js — Envío por correo del reporte mensual (PDF adjunto).

  DESACTIVADO por defecto. Solo envía si el Worker tiene, a la vez:
    REPORTES_CORREO = "1"      interruptor explícito (Variables)
    RESEND_API_KEY             secreto (la misma cuenta de Resend del sitio)
    MAIL_FROM                  remitente del dominio verificado en Resend
  Opcional: MAIL_REPLY_TO (a dónde responde el empresario).

  Reglas:
  - El PDF lo genera y elige el administrador (el mismo que descarga); aquí
    solo se valida que sea un PDF pequeño y se adjunta. No se guarda en
    ningún lado ni se crea un enlace público.
  - Un solo destinatario, validado. Todo texto se escapa.
  - Nada aquí lee ni escribe D1 o R2: las métricas no se tocan.
*/

import { BUSINESS_ID_RE } from "./stats.js";
import { parseMonth, DEFAULT_TIMEZONE } from "./period.js";

export const MAX_PDF_BYTES = 4 * 1024 * 1024;
/* JSON con el PDF en base64 (+33 %) y el mensaje. */
export const MAX_BODY_BYTES = Math.ceil(MAX_PDF_BYTES * 1.4) + 64 * 1024;

const EMAIL_RE = /^[^\s@<>(),;:"\[\]\\]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const KEY_RE = /^[A-Za-z0-9-]{16,64}$/;
const BRAND = "El Podcast del Migrante";
const TAGLINE = "Conectando latinos, construyendo futuro";
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const esc = (t) =>
  String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (t) => String(t == null ? "" : t).replace(/[\r\n\t]+/g, " ").trim();

export const isEmail = (v) => typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);

/* Lo que el panel necesita saber antes de ofrecer el envío. */
export function emailConfig(env) {
  const enabled = env.REPORTES_CORREO === "1" && Boolean(env.RESEND_API_KEY) && Boolean(env.MAIL_FROM);
  return { enabled, from: enabled ? env.MAIL_FROM : "", max_pdf_bytes: MAX_PDF_BYTES };
}

function decodePdf(b64) {
  if (typeof b64 !== "string" || !b64 || b64.length > Math.ceil(MAX_PDF_BYTES / 3) * 4 + 4) return null;
  let bin;
  try {
    bin = atob(b64);
  } catch {
    return null;
  }
  if (bin.length > MAX_PDF_BYTES || !bin.startsWith("%PDF-")) return null;
  return bin.length;
}

function emailBody(name, monthText, message) {
  const paragraphs = message
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f2f1ed;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ed;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:4px solid #6f9a03;font-family:Arial,Helvetica,sans-serif;color:#0b0b0b;">
<tr><td style="padding:26px 28px 6px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#557902;font-weight:bold;">${BRAND}</td></tr>
<tr><td style="padding:6px 28px 4px;"><h1 style="margin:0 0 4px;font-size:22px;line-height:1.3;">Reporte de rendimiento</h1>
<p style="margin:0 0 16px;font-size:14px;color:#5b5b5b;">Perfil Empresarial Premium · ${esc(name)} · ${esc(monthText)}</p>
${paragraphs}
<p style="margin:0 0 20px;font-size:12px;line-height:1.5;color:#5b5b5b;">El reporte va adjunto en PDF. Las cifras representan visitas e interacciones registradas por la plataforma; no equivalen a ventas, clientes obtenidos ni citas confirmadas.</p></td></tr>
<tr><td style="padding:18px 28px 26px;border-top:1px solid #d9d9d6;font-size:12px;color:#5b5b5b;">${BRAND} · eRadio Global Corp.<br>${TAGLINE}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    `Reporte de rendimiento — Perfil Empresarial Premium`,
    `${name} · ${monthText}`,
    "",
    message,
    "",
    "El reporte va adjunto en PDF. Las cifras representan visitas e interacciones registradas por la plataforma; no equivalen a ventas, clientes obtenidos ni citas confirmadas.",
    "",
    `${BRAND} · eRadio Global Corp.`,
    TAGLINE,
  ].join("\n");
  return { html, text };
}

/* Valida la petición del panel. Devuelve { message } listo para Resend o { status, error }. */
export function buildReportEmail(env, input) {
  const businessId = String(input.business_id || "");
  if (!BUSINESS_ID_RE.test(businessId)) return { status: 400, error: "business_id inválido" };
  const period = parseMonth(input.month, env.REPORT_TIMEZONE || DEFAULT_TIMEZONE);
  if (!period) return { status: 400, error: "Mes inválido (formato AAAA-MM)" };
  const to = String(input.to || "").trim();
  if (!isEmail(to)) return { status: 400, error: "Correo del destinatario no válido" };
  if (input.confirmed !== true) return { status: 400, error: "Falta confirmar el destinatario" };
  const name = oneLine(input.business_name).slice(0, 120) || businessId;
  const message = String(input.message || "").replace(/\r\n?/g, "\n").trim();
  if (!message || message.length > 2000) return { status: 400, error: "El mensaje debe tener entre 1 y 2000 caracteres" };
  if (!decodePdf(input.pdf_base64)) return { status: 400, error: "El archivo adjunto debe ser un PDF de hasta 4 MB" };
  if (!KEY_RE.test(String(input.idempotency_key || ""))) return { status: 400, error: "Falta la clave de envío" };

  const monthText = `${MONTHS[period.monthNumber - 1]} de ${period.year}`;
  const { html, text } = emailBody(name, monthText, message);
  const file = `Reporte-${businessId}-${period.month}.pdf`;
  const email = {
    from: env.MAIL_FROM,
    to: [to],
    subject: oneLine(`Reporte de rendimiento de ${monthText} — ${name} — ${BRAND}`).slice(0, 200),
    html,
    text,
    attachments: [{ filename: file, content: input.pdf_base64 }],
  };
  if (env.MAIL_REPLY_TO) email.reply_to = env.MAIL_REPLY_TO;
  return { message: email, key: `reporte-${businessId}-${period.month}-${input.idempotency_key}` };
}

export async function sendReportEmail(env, input) {
  if (!emailConfig(env).enabled) return { ok: false, status: 503, error: "El envío por correo no está activado en el panel." };
  const built = buildReportEmail(env, input);
  if (built.error) return { ok: false, status: built.status, error: built.error };
  const res = await fetch(env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": built.key },
    body: JSON.stringify(built.message),
  }).catch(() => null);
  if (!res || !res.ok) return { ok: false, status: 502, error: "El servicio de correo no aceptó el envío. No se envió nada; inténtalo de nuevo más tarde." };
  return { ok: true, to: built.message.to[0] };
}
