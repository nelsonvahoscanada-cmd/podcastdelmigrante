-- =====================================================================
-- Historial de acciones del Directorio Empresarial (base
-- «podcastdelmigrante-directorio»). Migración NO destructiva: solo crea una
-- tabla nueva y un índice; no modifica ni borra datos existentes y puede
-- ejecutarse más de una vez sin efecto.
--
-- Aplicar (una vez, después de 0001):
--   npx wrangler d1 execute podcastdelmigrante-directorio --remote --file=db/directorio/0002_historial.sql
--   (o pegar este contenido en Cloudflare → D1 → Console)
--
-- Cada fila es un hecho que no se edita ni se borra desde el sitio ni el panel:
--   recibida  la solicitud entró por el formulario (actor = formulario)
--   correos   resultado del aviso interno y de la confirmación
--   estado    cambio de estado hecho en el panel (actor = correo verificado)
--   revision  cambio de notas, aprobación del empresario o BIZ-id sin cambiar
--             de estado
-- =====================================================================

CREATE TABLE IF NOT EXISTS application_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id  TEXT NOT NULL REFERENCES business_applications (id),
  at              TEXT NOT NULL,                  -- ISO 8601 UTC
  actor           TEXT NOT NULL,                  -- «formulario», «sistema» o correo del administrador
  action          TEXT NOT NULL CHECK (action IN ('recibida','correos','estado','revision')),
  from_status     TEXT,
  to_status       TEXT,
  detail          TEXT                            -- resumen breve, sin datos de contacto
);

CREATE INDEX IF NOT EXISTS idx_events_application ON application_events (application_id, id);
