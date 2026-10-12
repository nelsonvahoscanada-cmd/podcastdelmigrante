/*
  Historial de la solicitud (tabla application_events, migración
  db/directorio/0002_historial.sql). Desde el sitio público se registra de
  forma "best effort": si el historial falla (p. ej. la migración aún no se
  aplicó), la solicitud NO se pierde ni se rechaza; solo queda en los
  registros. El detalle nunca incluye datos de contacto.
*/
export async function recordEvent(db, event) {
  try {
    await db
      .prepare("INSERT INTO application_events (application_id, at, actor, action, from_status, to_status, detail) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(event.id, event.at || new Date().toISOString(), event.actor, event.action, event.from || null, event.to || null, event.detail || null)
      .run();
    return true;
  } catch (e) {
    console.error("Historial no registrado", event.id, event.action, e && e.message);
    return false;
  }
}
