/*
  Configuración del registro de empresas (Cloudflare Pages → el proyecto →
  Settings → Variables and Secrets / Bindings). Ver docs/directorio-solicitudes.md.

  Bindings:  DIRECTORIO_DB (D1)   SOLICITUDES (R2, bucket privado)
  Secretos:  RESEND_API_KEY   TURNSTILE_SECRET_KEY   IP_HASH_SALT
  Variables: TURNSTILE_SITE_KEY   MAIL_FROM   MAIL_INTERNAL_TO
             MAIL_REPLY_TO (opcional)   PANEL_URL (opcional)
*/
export const REQUIRED = ["DIRECTORIO_DB", "SOLICITUDES", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "TURNSTILE_SITE_KEY", "IP_HASH_SALT", "MAIL_FROM", "MAIL_INTERNAL_TO"];

export function missingConfig(env) {
  return REQUIRED.filter((k) => !env || !env[k]);
}

export function jsonResponse(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign(
      {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
      extra
    ),
  });
}
