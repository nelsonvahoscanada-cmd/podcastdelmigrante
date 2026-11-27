-- =====================================================================
-- 0006_facturacion.sql — Suscripciones y facturación del Perfil
-- Empresarial Premium (Stripe). Base «podcastdelmigrante-directorio».
--
-- ESTADO: solo para la base de PRUEBAS (podcastdelmigrante-directorio-test).
-- NO aplicar en producción sin autorización expresa de la dirección y sin
-- respaldo previo:
--   npx wrangler d1 export podcastdelmigrante-directorio --remote --output=respaldo-AAAAMMDD.sql
--
-- Aplicar en la base de pruebas (después de 0001 a 0005):
--   npx wrangler d1 execute podcastdelmigrante-directorio-test --remote --file=db/directorio/0006_facturacion.sql
--
-- Migración NO destructiva: solo CREATE TABLE / INDEX / TRIGGER IF NOT EXISTS
-- y valores iniciales con INSERT OR IGNORE. No modifica ni borra ninguna
-- tabla ni fila existente (business_applications, application_events,
-- business_invitations, business_memberships, membership_events…). Repetirla
-- no tiene efecto. Reversión al final del archivo.
--
-- Separación de estados:
--   editorial   → business_applications (sin cambios)
--   membresía   → business_memberships (sin cambios)
--   financiero  → tablas billing_* (nuevas)
-- Ningún dato de tarjeta se guarda aquí: el pago ocurre en Stripe.
-- =====================================================================

-- Parámetros configurables (clave → valor)
CREATE TABLE IF NOT EXISTS billing_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT NOT NULL
);
INSERT OR IGNORE INTO billing_settings (key, value, updated_at, updated_by) VALUES
  ('grace_days', '7', '2026-11-27T00:00:00Z', 'migracion-0006'),
  ('link_ttl_days', '7', '2026-11-27T00:00:00Z', 'migracion-0006'),
  ('delivery_business_days', '10', '2026-11-27T00:00:00Z', 'migracion-0006'),
  ('refund_window_days', '30', '2026-11-27T00:00:00Z', 'migracion-0006');

-- Perfiles que NUNCA se cobran (además de la regla general: solo se cobra a
-- membresías PREMIUM_PAID; las cortesías PREMIUM_GIFT, presentes y futuras,
-- quedan fuera por regla, no por lista).
CREATE TABLE IF NOT EXISTS billing_protected (
  business_id  TEXT PRIMARY KEY,
  reason       TEXT NOT NULL CHECK (reason IN ('cortesia','fundador','institucional','otro')),
  added_at     TEXT NOT NULL,
  added_by     TEXT NOT NULL
);
INSERT OR IGNORE INTO billing_protected (business_id, reason, added_at, added_by) VALUES
  ('BIZ-001', 'fundador', '2026-11-27T00:00:00Z', 'migracion-0006'),
  ('BIZ-002', 'fundador', '2026-11-27T00:00:00Z', 'migracion-0006'),
  ('BIZ-003', 'cortesia', '2026-11-27T00:00:00Z', 'migracion-0006'),
  ('BIZ-004', 'cortesia', '2026-11-27T00:00:00Z', 'migracion-0006'),
  ('BIZ-005', 'institucional', '2026-11-27T00:00:00Z', 'migracion-0006');

-- Enlaces individuales de pago (un solo uso, con vencimiento). Del token solo
-- se guarda su huella SHA-256, como en las invitaciones.
CREATE TABLE IF NOT EXISTS billing_payment_links (
  id                   TEXT PRIMARY KEY,                -- PAY-AAAAMMDD-XXXXXX
  membership_id        TEXT NOT NULL,
  application_id       TEXT,
  business_name        TEXT NOT NULL,
  email                TEXT,                            -- correo de la solicitud (para Checkout)
  token_sha256         TEXT NOT NULL UNIQUE,
  status               TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','usado','vencido','revocado')),
  livemode             INTEGER NOT NULL DEFAULT 0 CHECK (livemode IN (0, 1)),
  created_at           TEXT NOT NULL,
  created_by           TEXT NOT NULL,
  expires_at           TEXT NOT NULL,
  terms_version        TEXT,                            -- condiciones aceptadas antes del pago
  accepted_at          TEXT,
  checkout_session_id  TEXT UNIQUE,
  checkout_url         TEXT,
  checkout_expires_at  TEXT,
  used_at              TEXT,
  revoked_at           TEXT,
  revoked_by           TEXT
);
CREATE INDEX IF NOT EXISTS idx_billing_links_membership ON billing_payment_links (membership_id, created_at);
-- Como máximo un enlace abierto por membresía
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_links_one_open ON billing_payment_links (membership_id) WHERE status = 'pendiente';

-- Cliente de Stripe de cada membresía (sin datos de tarjeta)
CREATE TABLE IF NOT EXISTS billing_customers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_id       TEXT NOT NULL UNIQUE,
  stripe_customer_id  TEXT NOT NULL UNIQUE,
  livemode            INTEGER NOT NULL DEFAULT 0 CHECK (livemode IN (0, 1)),
  created_at          TEXT NOT NULL
);

-- Estado financiero (copia de la suscripción de Stripe)
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  stripe_subscription_id  TEXT PRIMARY KEY,
  membership_id           TEXT NOT NULL,
  stripe_customer_id      TEXT NOT NULL,
  status                  TEXT NOT NULL,                -- incomplete, incomplete_expired, trialing, active, past_due, unpaid, canceled, paused
  cancel_at_period_end    INTEGER NOT NULL DEFAULT 0,
  current_period_start    TEXT,
  current_period_end      TEXT,
  canceled_at             TEXT,
  ended_at                TEXT,
  price_id                TEXT,
  amount                  INTEGER,                      -- centavos, sin impuestos
  currency                TEXT,
  first_failed_at         TEXT,                         -- inicio del período de gracia
  livemode                INTEGER NOT NULL DEFAULT 0 CHECK (livemode IN (0, 1)),
  stripe_created          INTEGER,
  stripe_updated          INTEGER,                      -- marca de tiempo del último evento aplicado (orden)
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_subs_membership ON billing_subscriptions (membership_id);
-- Como máximo una suscripción vigente por membresía
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_subs_one_live ON billing_subscriptions (membership_id)
  WHERE status IN ('incomplete','trialing','active','past_due','unpaid','paused');

-- Facturas y pagos
CREATE TABLE IF NOT EXISTS billing_invoices (
  stripe_invoice_id       TEXT PRIMARY KEY,
  stripe_subscription_id  TEXT,
  membership_id           TEXT,
  stripe_customer_id      TEXT,
  number                  TEXT,
  status                  TEXT NOT NULL,                -- draft, open, paid, void, uncollectible
  billing_reason          TEXT,                         -- subscription_create, subscription_cycle…
  currency                TEXT,
  subtotal                INTEGER,                      -- centavos, sin impuestos
  tax                     INTEGER,                      -- impuestos recaudados (centavos)
  total                   INTEGER,
  amount_paid             INTEGER,
  amount_refunded         INTEGER NOT NULL DEFAULT 0,
  stripe_fee              INTEGER,                      -- comisión de Stripe (si se conoce)
  tax_breakdown           TEXT,                         -- JSON por jurisdicción
  customer_province       TEXT,
  payment_intent_id       TEXT,
  charge_id               TEXT,
  hosted_invoice_url      TEXT,
  invoice_pdf             TEXT,
  period_start            TEXT,
  period_end              TEXT,
  paid_at                 TEXT,
  attempt_count           INTEGER,
  next_payment_attempt    TEXT,
  livemode                INTEGER NOT NULL DEFAULT 0 CHECK (livemode IN (0, 1)),
  stripe_created          INTEGER,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_membership ON billing_invoices (membership_id, stripe_created);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_charge ON billing_invoices (charge_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_pi ON billing_invoices (payment_intent_id);

-- Devoluciones
CREATE TABLE IF NOT EXISTS billing_refunds (
  stripe_refund_id   TEXT PRIMARY KEY,
  stripe_invoice_id  TEXT,
  charge_id          TEXT,
  membership_id      TEXT,
  amount             INTEGER NOT NULL,
  currency           TEXT,
  status             TEXT,
  reason             TEXT,
  requested_by       TEXT,                              -- correo del administrador o «stripe»
  livemode           INTEGER NOT NULL DEFAULT 0 CHECK (livemode IN (0, 1)),
  stripe_created     INTEGER,
  created_at         TEXT NOT NULL
);

-- Bitácora de webhooks: idempotencia y auditoría (solo identificadores)
CREATE TABLE IF NOT EXISTS billing_events (
  stripe_event_id  TEXT PRIMARY KEY,
  type             TEXT NOT NULL,
  livemode         INTEGER NOT NULL CHECK (livemode IN (0, 1)),
  stripe_created   INTEGER NOT NULL,
  object_id        TEXT,
  received_at      TEXT NOT NULL,
  processed_at     TEXT,
  result           TEXT NOT NULL DEFAULT 'procesando'
                   CHECK (result IN ('procesando','aplicado','ignorado','rechazado','error')),
  detail           TEXT                                  -- breve, sin datos personales
);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events (type, stripe_created);

-- Auditoría de acciones humanas y alertas del sistema
CREATE TABLE IF NOT EXISTS billing_audit (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  at             TEXT NOT NULL,
  actor          TEXT NOT NULL,                          -- correo verificado, «sistema» o «stripe»
  action         TEXT NOT NULL,
  membership_id  TEXT,
  object_id      TEXT,
  detail         TEXT
);
CREATE INDEX IF NOT EXISTS idx_billing_audit_membership ON billing_audit (membership_id, id);

-- ---------------------------------------------------------------------
-- Protección contra cobros a cortesías, fundadores y perfiles protegidos.
-- Regla general (no solo identificadores): solo una membresía PREMIUM_PAID
-- en revisión o activa puede tener enlace de pago, cliente o suscripción, y
-- nunca si su solicitud o su BIZ-id tienen una membresía de cortesía o están
-- en billing_protected.
-- ---------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_billing_link_guard
BEFORE INSERT ON billing_payment_links
BEGIN
  SELECT RAISE(ABORT, 'cobro no permitido: la membresia no es Premium de pago')
  WHERE NOT EXISTS (SELECT 1 FROM business_memberships m
                    WHERE m.id = NEW.membership_id AND m.plan = 'PREMIUM_PAID' AND m.status IN ('en_revision','activa'));
  SELECT RAISE(ABORT, 'cobro no permitido: perfil protegido')
  WHERE EXISTS (SELECT 1 FROM business_memberships m JOIN billing_protected p ON p.business_id = m.business_id
                WHERE m.id = NEW.membership_id);
  SELECT RAISE(ABORT, 'cobro no permitido: la solicitud o el perfil tienen una cortesia')
  WHERE EXISTS (SELECT 1 FROM business_memberships m, business_memberships g
                WHERE m.id = NEW.membership_id AND g.plan = 'PREMIUM_GIFT' AND g.status <> 'retirada'
                  AND ((m.application_id IS NOT NULL AND g.application_id = m.application_id)
                    OR (m.business_id IS NOT NULL AND g.business_id = m.business_id)));
END;

CREATE TRIGGER IF NOT EXISTS trg_billing_customer_guard
BEFORE INSERT ON billing_customers
BEGIN
  SELECT RAISE(ABORT, 'cobro no permitido: la membresia no es Premium de pago')
  WHERE NOT EXISTS (SELECT 1 FROM business_memberships m WHERE m.id = NEW.membership_id AND m.plan = 'PREMIUM_PAID');
  SELECT RAISE(ABORT, 'cobro no permitido: perfil protegido')
  WHERE EXISTS (SELECT 1 FROM business_memberships m JOIN billing_protected p ON p.business_id = m.business_id
                WHERE m.id = NEW.membership_id);
END;

CREATE TRIGGER IF NOT EXISTS trg_billing_subscription_guard
BEFORE INSERT ON billing_subscriptions
BEGIN
  SELECT RAISE(ABORT, 'cobro no permitido: la membresia no es Premium de pago')
  WHERE NOT EXISTS (SELECT 1 FROM business_memberships m WHERE m.id = NEW.membership_id AND m.plan = 'PREMIUM_PAID');
  SELECT RAISE(ABORT, 'cobro no permitido: perfil protegido')
  WHERE EXISTS (SELECT 1 FROM business_memberships m JOIN billing_protected p ON p.business_id = m.business_id
                WHERE m.id = NEW.membership_id);
END;

-- Reversión (solo en la base de pruebas, o en producción con respaldo y
-- autorización; borra los datos de facturación):
--   DROP TRIGGER IF EXISTS trg_billing_subscription_guard;
--   DROP TRIGGER IF EXISTS trg_billing_customer_guard;
--   DROP TRIGGER IF EXISTS trg_billing_link_guard;
--   DROP TABLE IF EXISTS billing_audit;   DROP TABLE IF EXISTS billing_events;
--   DROP TABLE IF EXISTS billing_refunds; DROP TABLE IF EXISTS billing_invoices;
--   DROP TABLE IF EXISTS billing_subscriptions; DROP TABLE IF EXISTS billing_customers;
--   DROP TABLE IF EXISTS billing_payment_links; DROP TABLE IF EXISTS billing_protected;
--   DROP TABLE IF EXISTS billing_settings;
