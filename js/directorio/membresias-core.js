/*
  membresias-core.js — Invitaciones y membresías del Directorio Empresarial
  ======================================================================
  Lo usan la Pages Function del sitio (functions/registro/*) y el panel
  privado (admin-worker). No se carga en el navegador del visitante.

  Modalidades (internas):
    FREE          Ficha gratuita, $0 CAD.
    PREMIUM_PAID  Premium pagada, $25 CAD al mes + impuestos aplicables.
                  Hoy NO hay pasarela de pagos: la invitación solo abre una
                  solicitud Premium; ningún cobro se activa desde aquí.
    PREMIUM_GIFT  Premium de cortesía, $0 CAD, sin vencimiento. Solo el
                  administrador la otorga, suspende, reactiva o retira, y
                  nunca se convierte por sí sola en una suscripción pagada.

  Seguridad de los códigos:
    - 24 bytes aleatorios (crypto.getRandomValues) en base64url: 32
      caracteres, imposibles de adivinar.
    - En D1 solo se guarda su huella SHA-256 (code_hash). El código completo
      aparece una única vez, en el panel, al crear o renovar la invitación.
    - El enlace lo lleva después de «#» (https://…/invitacion#c=CODIGO): el
      navegador no lo envía en la petición de la página ni en el Referer, así
      que no queda en registros del servidor ni en la analítica.
    - Cada invitación se canjea una sola vez (UNIQUE en
      business_memberships.invitation_id y cambio condicional de estado).
*/

export const KINDS = {
  FREE: { id: "FREE", label: "Ficha gratuita", price: "$0 CAD", plan: "gratuito" },
  PREMIUM_PAID: { id: "PREMIUM_PAID", label: "Premium pagada", price: "$25 CAD al mes + impuestos aplicables", plan: "premium" },
  PREMIUM_GIFT: { id: "PREMIUM_GIFT", label: "Premium de cortesía", price: "$0 CAD, sin mensualidad y sin vencimiento", plan: "premium" },
};

export const INVITATION_STATUSES = ["pendiente", "usada", "revocada"];
export const MEMBERSHIP_STATUSES = ["en_revision", "activa", "suspendida", "retirada"];

export const INVITATION_ID_RE = /^INV-\d{8}-[A-Z2-9]{6}$/;
export const MEMBERSHIP_ID_RE = /^MEM-\d{8}-[A-Z2-9]{6}$/;
export const CODE_RE = /^[A-Za-z0-9_-]{32}$/;
export const BUSINESS_ID_RE = /^BIZ-\d{3,6}$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SITE_ORIGIN = "https://podcastdelmigrante.com";
export const INVITATION_PATH = "/invitacion";

/* Tablas nuevas (migración db/directorio/0005_membresias.sql). Solo
   CREATE … IF NOT EXISTS: no tocan tablas ni registros existentes y repetirlas
   no tiene efecto. El panel puede aplicarlas con un botón de confirmación. */
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS business_invitations (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL CHECK (kind IN ('FREE','PREMIUM_PAID','PREMIUM_GIFT')),
  business_name   TEXT NOT NULL,
  contact_name    TEXT,
  code_hash       TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','usada','revocada')),
  created_at      TEXT NOT NULL,
  created_by      TEXT NOT NULL,
  used_at         TEXT,
  application_id  TEXT,
  revoked_at      TEXT,
  revoked_by      TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_status ON business_invitations (status, created_at)`,
  `CREATE TABLE IF NOT EXISTS business_memberships (
  id              TEXT PRIMARY KEY,
  plan            TEXT NOT NULL CHECK (plan IN ('FREE','PREMIUM_PAID','PREMIUM_GIFT')),
  status          TEXT NOT NULL DEFAULT 'en_revision' CHECK (status IN ('en_revision','activa','suspendida','retirada')),
  business_name   TEXT NOT NULL,
  application_id  TEXT,
  invitation_id   TEXT UNIQUE,
  business_id     TEXT,
  business_slug   TEXT,
  created_at      TEXT NOT NULL,
  activated_at    TEXT,
  expires_at      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  withdrawn_to    TEXT CHECK (withdrawn_to IN ('FREE','PREMIUM_PAID'))
)`,
  `CREATE INDEX IF NOT EXISTS idx_memberships_status ON business_memberships (status, created_at)`,
  `CREATE TABLE IF NOT EXISTS membership_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_id   TEXT,
  invitation_id   TEXT,
  at              TEXT NOT NULL,
  actor           TEXT NOT NULL,
  action          TEXT NOT NULL,
  from_status     TEXT,
  to_status       TEXT,
  detail          TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_membership_events ON membership_events (membership_id, invitation_id, id)`,
];

/* ¿Están las tablas? (las tres). */
export async function schemaReady(db) {
  try {
    const { results } = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('business_invitations','business_memberships','membership_events')")
      .all();
    return results.length === 3;
  } catch (e) {
    return false;
  }
}

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomSuffix(n = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}
const stamp = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");
export const newInvitationId = (date = new Date()) => `INV-${stamp(date)}-${randomSuffix()}`;
export const newMembershipId = (date = new Date()) => `MEM-${stamp(date)}-${randomSuffix()}`;

/* Código secreto de la invitación (32 caracteres base64url) */
export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashCode(code) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pdm-invitacion|" + code));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export const invitationLink = (code) => `${SITE_ORIGIN}${INVITATION_PATH}#c=${code}`;

/* Datos de una invitación nueva (panel). Devuelve { data, errors }. */
export function validateInvitationInput(input) {
  const errors = {};
  const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const data = { kind: String(input.kind || ""), businessName: clean(input.businessName, 120), contactName: clean(input.contactName, 80) };
  if (!KINDS[data.kind]) errors.kind = "Elige el tipo de invitación.";
  if (data.businessName.length < 2) errors.businessName = "Escribe el nombre del negocio o del empresario.";
  return { data, errors };
}

/* La invitación pide un plan del formulario: Gratuita → gratuito; Premium → premium */
export const planForKind = (kind) => (KINDS[kind] ? KINDS[kind].plan : "");

/* Línea privada que queda al inicio de las notas de la solicitud */
export function invitationNote(inv) {
  const k = KINDS[inv.kind];
  return `Invitación ${inv.id}: ${k.label} (${k.price}).`;
}

/* Estado público de una invitación según su código, sin revelar nada más que
   lo necesario para mostrar el mensaje correcto. */
export async function findInvitationByCode(db, code) {
  if (!CODE_RE.test(String(code || ""))) return null;
  const hash = await hashCode(code);
  return db.prepare("SELECT id, kind, business_name, contact_name, status FROM business_invitations WHERE code_hash = ?").bind(hash).first();
}

/* Transiciones de una membresía (acciones del panel) */
export const MEMBERSHIP_ACTIONS = {
  activar: { from: ["en_revision"], to: "activa", label: "Activar" },
  suspender: { from: ["activa"], to: "suspendida", label: "Suspender" },
  reactivar: { from: ["suspendida"], to: "activa", label: "Reactivar" },
  retirar: { from: ["en_revision", "activa", "suspendida"], to: "retirada", label: "Retirar" },
};
