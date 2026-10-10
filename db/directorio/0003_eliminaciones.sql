-- =====================================================================
-- Registro de solicitudes de eliminación de datos del Directorio
-- Empresarial (base «podcastdelmigrante-directorio»). Migración NO
-- destructiva: solo crea una tabla nueva y sus índices; no modifica ni borra
-- datos existentes y puede ejecutarse más de una vez sin efecto.
--
-- Aplicar (una vez, después de 0001 y 0002):
--   npx wrangler d1 execute podcastdelmigrante-directorio --remote --file=db/directorio/0003_eliminaciones.sql
--   (o pegar este contenido en Cloudflare → D1 → Console)
--
-- Sirve para ACREDITAR que se atendió cada pedido de eliminación sin guardar
-- los datos eliminados. Por eso:
--   · no tiene clave foránea hacia business_applications (la solicitud se
--     borra; este registro queda);
--   · no guarda nombre, teléfono ni correo: solo el número SOL-… y una
--     huella SHA-256 del correo (permite comprobar después «¿se eliminó lo de
--     esta persona?» sin conservar la dirección).
--
-- Dos pasos en el panel, para que un error no sea irreversible:
--   1. programada  → se registra el pedido (se puede cancelar)
--   2. ejecutada   → se borran la fila en D1, su historial y la imagen en R2,
--                    escribiendo el número SOL-… para confirmar
--   Después se marcan a mano los pasos fuera de Cloudflare: correos en Gmail
--   borrados y respuesta enviada a la persona.
-- =====================================================================

CREATE TABLE IF NOT EXISTS deletion_requests (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id   TEXT NOT NULL,                  -- SOL-AAAAMMDD-XXXXXX
  email_sha256     TEXT,                           -- huella del correo (minúsculas), nunca el correo
  requested_on     TEXT NOT NULL,                  -- AAAA-MM-DD: cuándo lo pidió la persona
  channel          TEXT NOT NULL CHECK (channel IN ('correo','telefono','whatsapp','otro')),
  status           TEXT NOT NULL DEFAULT 'programada' CHECK (status IN ('programada','cancelada','ejecutada')),
  notes            TEXT,                           -- breve, sin datos de contacto
  scheduled_by     TEXT NOT NULL,                  -- correo verificado del administrador
  scheduled_at     TEXT NOT NULL,                  -- ISO 8601 UTC
  cancelled_by     TEXT,
  cancelled_at     TEXT,
  cancel_reason    TEXT,
  executed_by      TEXT,
  executed_at      TEXT,
  result           TEXT,                           -- qué se borró (filas, historial, archivos)
  gmail_done_by    TEXT,                           -- correos del caso borrados en Gmail
  gmail_done_at    TEXT,
  reply_sent_by    TEXT,                           -- respuesta enviada a la persona
  reply_sent_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_deletions_application ON deletion_requests (application_id, id);
-- Como máximo un pedido abierto («programada») por solicitud
CREATE UNIQUE INDEX IF NOT EXISTS idx_deletions_one_open ON deletion_requests (application_id) WHERE status = 'programada';
