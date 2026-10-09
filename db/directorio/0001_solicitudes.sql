-- =====================================================================
-- Base D1 «podcastdelmigrante-directorio» (NUEVA, separada de la de
-- estadísticas). Solicitudes de Perfiles Empresariales.
--
-- Aplicar (una vez):
--   npx wrangler d1 execute podcastdelmigrante-directorio --remote --file=db/directorio/0001_solicitudes.sql
--
-- Datos PRIVADOS: solo los leen la Function /registro/enviar (escribe) y el
-- panel admin.podcastdelmigrante.com (Cloudflare Access). Nunca se
-- exponen en el sitio público.
--
-- Pensada para crecer: cuando existan suscripciones Premium se añadirán
-- tablas propias (p. ej. memberships) enlazadas por business_id, sin tocar
-- esta tabla.
-- =====================================================================

CREATE TABLE IF NOT EXISTS business_applications (
  id                TEXT PRIMARY KEY,               -- SOL-AAAAMMDD-XXXXXX
  idempotency_key   TEXT NOT NULL UNIQUE,           -- evita duplicados por reenvío
  created_at        TEXT NOT NULL,                  -- ISO 8601 UTC
  updated_at        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (status IN ('pendiente','en_revision','aprobada','publicada','rechazada','duplicada')),

  -- Información básica (pública si se aprueba)
  name              TEXT NOT NULL,                  -- empresa o profesional
  category          TEXT NOT NULL,
  category_other    TEXT,
  city              TEXT NOT NULL,
  province          TEXT NOT NULL,
  representative    TEXT NOT NULL,
  title             TEXT,                           -- cargo o especialidad
  summary           TEXT NOT NULL,                  -- reseña ≤ 300

  -- Contacto
  email             TEXT NOT NULL,                  -- PRIVADO: solo para gestionar la solicitud
  phone             TEXT,
  whatsapp          TEXT,
  website           TEXT,
  address           TEXT,
  instagram         TEXT,
  facebook          TEXT,
  tiktok            TEXT,
  linkedin          TEXT,

  -- Imagen (archivo en R2, bucket privado)
  image_kind        TEXT NOT NULL CHECK (image_kind IN ('foto','logo')),
  image_key         TEXT NOT NULL,
  image_type        TEXT NOT NULL,
  image_bytes       INTEGER NOT NULL,
  image_width       INTEGER,
  image_height      INTEGER,

  -- Consentimientos (texto exacto aceptado + fecha)
  consent_version   TEXT NOT NULL,
  consent_at        TEXT NOT NULL,

  -- Correos (un fallo de correo NO pierde la solicitud)
  internal_email_status      TEXT NOT NULL DEFAULT 'pendiente',   -- enviado | error | pendiente
  confirmation_email_status  TEXT NOT NULL DEFAULT 'pendiente',
  email_error                TEXT,

  -- Antispam: huella de la IP (hash con sal), nunca la IP en claro
  ip_hash           TEXT,

  -- Revisión y publicación
  reviewed_by       TEXT,
  reviewed_at       TEXT,
  review_notes      TEXT,
  owner_approved    INTEGER NOT NULL DEFAULT 0,     -- 1 = el empresario aprobó la vista previa
  business_id       TEXT,                           -- BIZ-xxx una vez publicado
  business_slug     TEXT
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON business_applications (status, created_at);
CREATE INDEX IF NOT EXISTS idx_applications_email ON business_applications (email, created_at);
CREATE INDEX IF NOT EXISTS idx_applications_ip ON business_applications (ip_hash, created_at);
