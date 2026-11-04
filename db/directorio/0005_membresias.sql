-- 0005_membresias.sql — Invitaciones y membresías del Directorio Empresarial
-- Solo crea tablas e índices NUEVOS (CREATE … IF NOT EXISTS): no modifica
-- business_applications ni ningún registro existente, y repetirla no tiene
-- efecto. El mismo esquema está en js/directorio/membresias-core.js (SCHEMA):
-- el panel puede aplicarlo con «Preparar tablas» (con confirmación).
--
-- Reversión (solo si nunca se usó; borra invitaciones y membresías):
--   DROP TABLE IF EXISTS membership_events;
--   DROP TABLE IF EXISTS business_memberships;
--   DROP TABLE IF EXISTS business_invitations;
-- Antes de aplicarla o revertirla en producción: copia de seguridad
--   npx wrangler d1 export podcastdelmigrante-directorio --remote --output=respaldo-AAAAMMDD.sql

CREATE TABLE IF NOT EXISTS business_invitations (
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
);

CREATE INDEX IF NOT EXISTS idx_invitations_status ON business_invitations (status, created_at);

CREATE TABLE IF NOT EXISTS business_memberships (
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
);

CREATE INDEX IF NOT EXISTS idx_memberships_status ON business_memberships (status, created_at);

CREATE TABLE IF NOT EXISTS membership_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_id   TEXT,
  invitation_id   TEXT,
  at              TEXT NOT NULL,
  actor           TEXT NOT NULL,
  action          TEXT NOT NULL,
  from_status     TEXT,
  to_status       TEXT,
  detail          TEXT
);

CREATE INDEX IF NOT EXISTS idx_membership_events ON membership_events (membership_id, invitation_id, id);
