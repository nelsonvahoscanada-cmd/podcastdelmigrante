/*
  eliminaciones.js — Pedidos de eliminación de datos del Directorio
  Empresarial (panel privado). Tabla deletion_requests, migración
  db/directorio/0003_eliminaciones.sql.

  Dos pasos para que un error no sea irreversible:
    1. «programar»: se registra el pedido (fecha y canal). Se puede cancelar.
       Mientras está abierto, la solicitud no se puede aprobar ni publicar.
    2. «ejecutar»: escribiendo el número SOL-… exacto, se borran la imagen en
       R2, el historial y la solicitud en D1, y el pedido queda «ejecutada»
       con el resumen de lo borrado. Si el perfil ya estaba publicado, antes
       hay que retirarlo del sitio (Pull Request) y confirmarlo.
  Fuera de Cloudflare, el administrador marca a mano: correos del caso
  borrados en Gmail y respuesta enviada a la persona.

  El registro conserva solo el número SOL-…, una huella SHA-256 del correo,
  fechas, quién hizo cada paso y el resumen. Nunca los datos borrados.
*/
import { REQUEST_ID_RE } from "../../js/directorio/solicitud-core.js";

export const CHANNELS = { correo: "Correo electrónico", telefono: "Teléfono", whatsapp: "WhatsApp", otro: "Otro" };
/* Plazo interno de referencia para responder (no es un plazo de conservación). */
export const RESPONSE_DAYS = 45;
const MIGRATION = "db/directorio/0003_eliminaciones.sql";
const COLUMNS = `id, application_id, requested_on, channel, status, notes, scheduled_by, scheduled_at, cancelled_by, cancelled_at, cancel_reason,
  executed_by, executed_at, result, gmail_done_by, gmail_done_at, reply_sent_by, reply_sent_at`;

const missingTable = (e) => /deletion_requests/.test(String(e && e.message));
const fail = (status, error) => ({ ok: false, status, error });
const MISSING = fail(503, `Falta aplicar la migración ${MIGRATION} en D1. No se guardó ningún cambio.`);

export async function sha256Hex(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function dueOn(requestedOn) {
  const d = new Date(requestedOn + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + RESPONSE_DAYS);
  return d.toISOString().slice(0, 10);
}

const withDue = (r) => Object.assign(r, { due_on: dueOn(r.requested_on) });

/* Fecha AAAA-MM-DD real, no futura (margen de un día por husos horarios). */
function validDay(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false;
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  return s >= "2026-01-01" && d.getTime() <= Date.now() + 86400e3;
}

/* Las notas del registro no deben llevar datos de contacto. */
function cleanNotes(s) {
  const notes = String(s || "").trim().slice(0, 300);
  if (/@/.test(notes) || /\d[\d\s().-]{6,}\d/.test(notes)) return null;
  return notes;
}

async function openRequest(db, id) {
  return db.prepare(`SELECT ${COLUMNS} FROM deletion_requests WHERE application_id = ? AND status = 'programada'`).bind(id).first();
}

/* ¿Hay un pedido abierto? (false si la migración 0003 aún no se aplicó) */
export async function hasOpenDeletion(db, id) {
  try {
    return !!(await openRequest(db, id));
  } catch (e) {
    return false;
  }
}

/* Números SOL-… con un pedido abierto (para marcar la lista). */
export async function openDeletionIds(db) {
  try {
    const { results } = await db.prepare("SELECT application_id FROM deletion_requests WHERE status = 'programada'").all();
    return new Set(results.map((r) => r.application_id));
  } catch (e) {
    return new Set();
  }
}

/* Estado para el detalle: { available, open, past } */
export async function deletionState(db, id) {
  try {
    const { results } = await db.prepare(`SELECT ${COLUMNS} FROM deletion_requests WHERE application_id = ? ORDER BY id DESC`).bind(id).all();
    const rows = results.map(withDue);
    return { available: true, open: rows.find((r) => r.status === "programada") || null, past: rows.filter((r) => r.status !== "programada") };
  } catch (e) {
    return { available: false, open: null, past: [] };
  }
}

/* Paso 1: registrar el pedido. */
export async function scheduleDeletion(db, id, input, identity) {
  if (!REQUEST_ID_RE.test(id || "")) return fail(404, "Solicitud no encontrada");
  const row = await db.prepare("SELECT id, email FROM business_applications WHERE id = ?").bind(id).first();
  if (!row) return fail(404, "Solicitud no encontrada");
  const requestedOn = String(input.requestedOn || "");
  if (!validDay(requestedOn)) return fail(400, "Indica la fecha (AAAA-MM-DD) en que la persona pidió la eliminación. No puede ser futura.");
  const channel = String(input.channel || "");
  if (!CHANNELS[channel]) return fail(400, "Indica por qué canal llegó el pedido.");
  const notes = cleanNotes(input.notes);
  if (notes === null) return fail(400, "Las notas no deben incluir correos ni teléfonos: el registro no guarda datos de contacto.");
  const now = new Date().toISOString();
  try {
    if (await openRequest(db, id)) return fail(409, "Ya hay un pedido de eliminación abierto para esta solicitud.");
    await db
      .prepare(
        `INSERT INTO deletion_requests (application_id, email_sha256, requested_on, channel, status, notes, scheduled_by, scheduled_at)
         VALUES (?, ?, ?, ?, 'programada', ?, ?, ?)`
      )
      .bind(id, await sha256Hex(String(row.email || "").trim().toLowerCase()), requestedOn, channel, notes || null, identity.email, now)
      .run();
  } catch (e) {
    console.error("No se pudo registrar el pedido de eliminación", id, e && e.message);
    return missingTable(e) ? MISSING : fail(500, "No se pudo registrar el pedido. No se modificó nada.");
  }
  return { ok: true };
}

/* Deshacer el paso 1 (pedido registrado por error o retirado por la persona). */
export async function cancelDeletion(db, id, input, identity) {
  if (!REQUEST_ID_RE.test(id || "")) return fail(404, "Solicitud no encontrada");
  const reason = cleanNotes(input.reason);
  if (!reason) return fail(400, "Indica brevemente por qué se cancela (sin correos ni teléfonos).");
  try {
    const open = await openRequest(db, id);
    if (!open) return fail(409, "No hay un pedido de eliminación abierto.");
    await db
      .prepare("UPDATE deletion_requests SET status = 'cancelada', cancelled_by = ?, cancelled_at = ?, cancel_reason = ? WHERE id = ? AND status = 'programada'")
      .bind(identity.email, new Date().toISOString(), reason, open.id)
      .run();
  } catch (e) {
    console.error("No se pudo cancelar el pedido de eliminación", id, e && e.message);
    return missingTable(e) ? MISSING : fail(500, "No se pudo cancelar. No se modificó nada.");
  }
  return { ok: true };
}

/* Paso 2: borrar de verdad (R2 primero; luego D1 en una sola transacción). */
export async function executeDeletion(env, id, input, identity) {
  const db = env.DIRECTORIO_DB;
  if (!REQUEST_ID_RE.test(id || "")) return fail(404, "Solicitud no encontrada");
  if (String(input.confirm || "").trim() !== id) return fail(400, `Para confirmar, escribe exactamente el número ${id}.`);
  let open;
  try {
    open = await openRequest(db, id);
  } catch (e) {
    return missingTable(e) ? MISSING : fail(500, "No se pudo leer el pedido de eliminación.");
  }
  if (!open) return fail(409, "Primero registra el pedido de eliminación (paso 1).");
  const row = await db.prepare("SELECT id, status, image_key, business_id FROM business_applications WHERE id = ?").bind(id).first();
  if (!row) return fail(404, "Solicitud no encontrada");
  if ((row.status === "publicada" || row.business_id) && input.profileRemoved !== true) {
    return fail(409, "Esta solicitud tiene un perfil publicado. Retíralo primero del sitio (Pull Request) y marca que ya se retiró.");
  }

  /* 1) Archivos en R2: la imagen registrada y cualquier otro bajo su carpeta. */
  const keys = new Set([row.image_key].filter(Boolean));
  let removed = 0;
  try {
    if (env.SOLICITUDES.list) {
      const listed = await env.SOLICITUDES.list({ prefix: `solicitudes/${id}/` });
      for (const o of listed.objects || []) keys.add(o.key);
    }
    for (const key of keys) {
      const existed = await env.SOLICITUDES.get(key);
      await env.SOLICITUDES.delete(key);
      if (await env.SOLICITUDES.get(key)) throw new Error("el archivo sigue existiendo: " + key);
      if (existed) removed++;
    }
  } catch (e) {
    console.error("No se pudo borrar en R2", id, e && e.message);
    return fail(502, "No se pudo borrar la imagen en R2. No se borró nada en la base de datos: inténtalo de nuevo.");
  }

  /* 2) D1: historial + solicitud + cierre del pedido, todo o nada. Los DELETE
        solo actúan si el pedido sigue abierto (por si alguien lo canceló). */
  const now = new Date().toISOString();
  const guard = "EXISTS (SELECT 1 FROM deletion_requests WHERE id = ? AND status = 'programada')";
  try {
    const hasHistory = !!(await db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'application_events'").first());
    const events = hasHistory ? (await db.prepare("SELECT COUNT(*) AS n FROM application_events WHERE application_id = ?").bind(id).first()).n : 0;
    const result = `D1: solicitud borrada y ${events} registro(s) de historial · R2: ${removed} archivo(s) borrado(s)`;
    const stmts = [];
    if (hasHistory) stmts.push(db.prepare(`DELETE FROM application_events WHERE application_id = ? AND ${guard}`).bind(id, open.id));
    stmts.push(db.prepare(`DELETE FROM business_applications WHERE id = ? AND ${guard}`).bind(id, open.id));
    stmts.push(
      db
        .prepare("UPDATE deletion_requests SET status = 'ejecutada', executed_by = ?, executed_at = ?, result = ? WHERE id = ? AND status = 'programada'")
        .bind(identity.email, now, result, open.id)
    );
    await db.batch(stmts);
  } catch (e) {
    console.error("No se pudo borrar en D1", id, e && e.message);
    return fail(500, "La imagen ya se borró, pero no se pudo borrar la solicitud en la base de datos. Vuelve a intentarlo: el paso es seguro de repetir.");
  }
  const still = await db.prepare("SELECT 1 FROM business_applications WHERE id = ?").bind(id).first();
  if (still) return fail(409, "El pedido dejó de estar abierto (¿se canceló?). No se borró la solicitud.");
  return { ok: true, deletion: withDue(await db.prepare(`SELECT ${COLUMNS} FROM deletion_requests WHERE id = ?`).bind(open.id).first()) };
}

/* Registro completo (más reciente primero). null = migración sin aplicar. */
export async function listDeletions(db) {
  try {
    const { results } = await db.prepare(`SELECT ${COLUMNS} FROM deletion_requests ORDER BY id DESC LIMIT 200`).all();
    return results.map(withDue);
  } catch (e) {
    return null;
  }
}

/* Pasos manuales fuera de Cloudflare, después de ejecutar. */
const STEPS = { gmail: ["gmail_done_by", "gmail_done_at"], respuesta: ["reply_sent_by", "reply_sent_at"] };

export async function markDeletionStep(db, n, input, identity) {
  const cols = STEPS[String(input.step || "")];
  if (!cols) return fail(400, "Paso no válido.");
  if (!/^\d{1,9}$/.test(String(n))) return fail(404, "Pedido no encontrado");
  try {
    const row = await db.prepare(`SELECT ${COLUMNS} FROM deletion_requests WHERE id = ?`).bind(Number(n)).first();
    if (!row) return fail(404, "Pedido no encontrado");
    if (row.status !== "ejecutada") return fail(409, "Primero ejecuta la eliminación en el panel.");
    if (row[cols[0]]) return { ok: true, deletion: withDue(row) };
    await db
      .prepare(`UPDATE deletion_requests SET ${cols[0]} = ?, ${cols[1]} = ? WHERE id = ? AND ${cols[0]} IS NULL`)
      .bind(identity.email, new Date().toISOString(), row.id)
      .run();
    return { ok: true, deletion: withDue(await db.prepare(`SELECT ${COLUMNS} FROM deletion_requests WHERE id = ?`).bind(row.id).first()) };
  } catch (e) {
    return missingTable(e) ? MISSING : fail(500, "No se pudo guardar el paso.");
  }
}
