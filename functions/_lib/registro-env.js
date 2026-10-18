/*
  Configuración del registro de empresas (Cloudflare Pages → el proyecto →
  Settings → Variables and Secrets / Bindings). Ver docs/directorio-solicitudes.md.

  Bindings:  DIRECTORIO_DB (D1)   SOLICITUDES (R2, bucket privado)
  Secretos:  RESEND_API_KEY   TURNSTILE_SECRET_KEY   IP_HASH_SALT
  Variables: TURNSTILE_SITE_KEY   MAIL_FROM   MAIL_INTERNAL_TO
             REGISTRO_ABIERTO = "1" para abrir el formulario (interruptor)
             MAIL_REPLY_TO (opcional)   PANEL_URL (opcional)

  El formulario está CERRADO por defecto: solo se abre si REGISTRO_ABIERTO
  vale exactamente "1" y además está toda la configuración. Si la variable
  no existe, está vacía o tiene cualquier otro valor, queda cerrado.
*/
export const REQUIRED = ["DIRECTORIO_DB", "SOLICITUDES", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "TURNSTILE_SITE_KEY", "IP_HASH_SALT", "MAIL_FROM", "MAIL_INTERNAL_TO"];

/* Clave pública de Turnstile: «0x…» (o las claves de prueba «1x…», «2x…»,
   «3x…»). Evita abrir el formulario con el nombre del widget por error. */
const SITE_KEY_RE = /^[0-3]x[A-Za-z0-9_-]{16,}$/;

/* Nombres (nunca valores) de lo que falta o está mal configurado. */
export function missingConfig(env) {
  const missing = REQUIRED.filter((k) => !env || !env[k]);
  if (env && env.TURNSTILE_SITE_KEY && !SITE_KEY_RE.test(String(env.TURNSTILE_SITE_KEY))) {
    missing.push("TURNSTILE_SITE_KEY (formato no válido: debe ser la Site Key, no el nombre del widget)");
  }
  return missing;
}

export function isSwitchOpen(env) {
  return !!env && env.REGISTRO_ABIERTO === "1";
}

/* { open, missing, switchOpen } — open solo si el interruptor está en "1" y
   no falta nada. */
export function registrationStatus(env) {
  const missing = missingConfig(env);
  const switchOpen = isSwitchOpen(env);
  return { open: switchOpen && missing.length === 0, missing, switchOpen };
}

/* Línea para los registros de Functions: solo nombres, nunca valores. */
export function closedReason(status) {
  const parts = [];
  if (!status.switchOpen) parts.push('interruptor REGISTRO_ABIERTO distinto de "1"');
  if (status.missing.length) parts.push("falta: " + status.missing.join(", "));
  return "Registro de empresas cerrado — " + parts.join(" · ");
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
