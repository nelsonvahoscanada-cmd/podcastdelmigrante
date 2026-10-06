-- SOLO para pruebas locales (wrangler --local). Mismo esquema que producción.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event TEXT NOT NULL,
  business_id TEXT NOT NULL,
  business_slug TEXT NOT NULL,
  category TEXT, city TEXT, target TEXT, page TEXT, referrer_host TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT,
  device_type TEXT
);
DELETE FROM events;
INSERT INTO events (received_at, event, business_id, business_slug, category, city, target, page, referrer_host, utm_source, device_type) VALUES
 ('2026-09-30T23:30:00.000Z','profile_view','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','','/business-profile.html','','','mobile'),
 ('2026-10-01T05:59:59.999Z','profile_view','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','','/business-profile.html','','','mobile'),
 ('2026-10-01T06:00:00.000Z','profile_view','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','','/business-profile.html','instagram.com','','mobile'),
 ('2026-10-05T19:10:28.726Z','profile_view','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','','/business-profile.html','','facebook','desktop'),
 ('2026-10-05T19:11:00.000Z','profile_view','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','','/business-profile.html','www.podcastdelmigrante.com','','mobile'),
 ('2026-10-05T19:12:00.000Z','booking_click','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','booking-availability','/business-profile.html','','facebook','desktop'),
 ('2026-10-05T19:13:00.000Z','whatsapp_click','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','whatsapp-hero','/business-profile.html','','','mobile'),
 ('2026-10-05T19:14:00.000Z','linkedin_click','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','linkedin-final','/business-profile.html','','','desktop'),
 ('2026-10-05T19:15:00.000Z','video_click','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','profile-video','/business-profile.html','','','desktop'),
 ('2026-10-05T19:15:02.000Z','video_start','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','profile-video','/business-profile.html','','','desktop'),
 ('2026-11-01T05:59:59.000Z','phone_click','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','phone-hero','/business-profile.html','','','mobile'),
 ('2026-11-01T06:00:00.000Z','phone_click','BIZ-002','carlos-d-castillo','seguros-finanzas','Calgary','phone-hero','/business-profile.html','','','mobile'),
 ('2026-10-05T23:41:58.319Z','profile_view','BIZ-001','tomas-velazquez','automoviles','Calgary','','/business-profile.html','','','desktop'),
 ('2026-10-05T23:41:59.790Z','vehicles_click','BIZ-001','tomas-velazquez','automoviles','Calgary','vehicles-hero','/business-profile.html','','','desktop'),
 ('2026-10-05T23:42:16.866Z','directions_click','BIZ-001','tomas-velazquez','automoviles','Calgary','directions','/business-profile.html','','','mobile'),
 ('2026-10-10T18:00:00.000Z','profile_view','BIZ-003','nuevo-negocio','vivienda','Edmonton','','/business-profile.html','','newsletter','mobile');
