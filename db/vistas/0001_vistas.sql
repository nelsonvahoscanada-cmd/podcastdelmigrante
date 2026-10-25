-- Contador público de visualizaciones de noticias y guías.
-- Base D1 INDEPENDIENTE: podcastdelmigrante-vistas (binding VISTAS_DB en el
-- proyecto de Pages, SOLO en el entorno de Producción). No tiene relación con
-- podcastdelmigrante-analytics (estadísticas de las miniwebs).
-- Ver docs/contador-visualizaciones.md.
--
-- No se guardan direcciones IP, cookies ni identificadores persistentes.

-- Total público por artículo (lo que muestra el contador).
CREATE TABLE IF NOT EXISTS vistas_total (
  article_id   TEXT PRIMARY KEY,              -- ART-AAAA-NNN (js/articles.js)
  vistas       INTEGER NOT NULL DEFAULT 0,
  actualizado  TEXT NOT NULL                  -- ISO UTC del último conteo
);

-- Serie diaria por artículo, en hora de Alberta (para el Centro de
-- Inteligencia Editorial y para verificar los totales).
CREATE TABLE IF NOT EXISTS vistas_dia (
  dia         TEXT NOT NULL,                   -- AAAA-MM-DD, America/Edmonton
  article_id  TEXT NOT NULL,
  vistas      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, article_id)
);

-- Anti-duplicados de vida corta (30 minutos). `huella` y `grupo` son
-- SHA-256 con una sal secreta que cambia cada día: no permiten recuperar la
-- IP ni reconocer a la misma persona en otro día. Las filas vencidas se
-- borran en cada registro.
CREATE TABLE IF NOT EXISTS vistas_reciente (
  huella  TEXT PRIMARY KEY,                    -- navegador + artículo + día
  grupo   TEXT NOT NULL,                       -- navegador + día (límite de frecuencia)
  expira  TEXT NOT NULL                        -- ISO UTC
);
CREATE INDEX IF NOT EXISTS idx_vistas_reciente_expira ON vistas_reciente (expira);
CREATE INDEX IF NOT EXISTS idx_vistas_reciente_grupo ON vistas_reciente (grupo, expira);

-- Ajustes del contador. `inicio` = fecha y hora real del primer conteo en
-- producción (se fija sola una vez; las noticias anteriores muestran
-- «visualizaciones desde [fecha]»).
CREATE TABLE IF NOT EXISTS vistas_config (
  clave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL
);
