-- =====================================================================
-- Solicitud de Perfil Empresarial Premium (base
-- «podcastdelmigrante-directorio»). Migración NO destructiva: solo añade
-- tres columnas opcionales; no modifica ni borra datos existentes.
--
-- Aplicar (una vez, después de 0001, 0002 y 0003) ANTES de abrir el
-- formulario con REGISTRO_ABIERTO = "1":
--   npx wrangler d1 execute podcastdelmigrante-directorio --remote --file=db/directorio/0004_perfil_premium.sql
--   (o pegar este contenido en Cloudflare → D1 → Console)
-- Si se ejecuta dos veces, SQLite responde «duplicate column name»: no
-- cambia nada.
--
--   services      productos o servicios principales (público si se aprueba)
--   notes         información adicional para preparar el perfil (PRIVADA)
--   extra_images  fotografías adicionales en R2 (bucket privado), JSON:
--                 [{"key":"solicitudes/SOL-…/adicional-1.jpg","type":"image/jpeg",
--                   "bytes":123,"width":1600,"height":1200}, …]  (máx. 3)
-- =====================================================================

ALTER TABLE business_applications ADD COLUMN services TEXT;
ALTER TABLE business_applications ADD COLUMN notes TEXT;
ALTER TABLE business_applications ADD COLUMN extra_images TEXT;
