/*
  membresias.js — Invitaciones empresariales y membresías (panel privado)
  ======================================================================
  Todo pasa antes por Cloudflare Access + verificación del JWT (src/index.js)
  y aquí, además, se exige el rol de administrador.

  Invitaciones (business_invitations):
    pendiente → usada (al enviarse el formulario con el código, en el sitio)
    pendiente → revocada (el administrador la retira)
    · El código se genera aquí y se entrega UNA sola vez; en D1 queda solo su
      huella SHA-256. «Renovar enlace» crea un código nuevo e invalida el
      anterior (solo mientras la invitación está pendiente).

  Membresías (business_memberships), creadas al canjear una invitación:
    en_revision → activa (cuando la miniweb ya se publicó, con su BIZ-id)
    activa ⇄ suspendida
    en_revision | activa | suspendida → retirada (con transición elegida:
      ficha gratuita o Premium pagada). Retirar NO borra datos, fotografías,
      historial ni estadísticas, y nunca crea un cobro.
    · Premium de cortesía: expires_at siempre NULL («Sin vencimiento»).
    · Toda acción que cambia beneficios exige confirm: true y queda en
      membership_events con el correo del administrador.
*/
import {
  KINDS,
  SCHEMA,
  schemaReady,
  newInvitationId,
  newCode,
  hashCode,
  invitationLink,
  validateInvitationInput,
  INVITATION_ID_RE,
  MEMBERSHIP_ID_RE,
  BUSINESS_ID_RE,
  SLUG_RE,
  MEMBERSHIP_ACTIONS,
} from "../../js/directorio/membresias-core.js";

const isAdmin = (identity) => Boolean(identity && identity.role === "admin");
const fail = (status, error) => ({ ok: false, status, error });
const NOT_READY = fail(409, "Faltan las tablas de invitaciones: usa «Preparar tablas» (migración 0005).");

async function logEvent(db, e) {
  await db
    .prepare("INSERT INTO membership_events (membership_id, invitation_id, at, actor, action, from_status, to_status, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(e.membershipId || null, e.invitationId || null, e.at || new Date().toISOString(), e.actor, e.action, e.from || null, e.to || null, (e.detail || "").slice(0, 300) || null)
    .run();
}

/* «Preparar tablas»: aplica solo CREATE … IF NOT EXISTS (migración 0005) */
export async function prepareSchema(db, input, identity) {
  if (!isAdmin(identity)) return fail(403, "Solo un administrador puede preparar las tablas.");
  if (!input || input.confirm !== true) return fail(400, "Falta la confirmación.");
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  await logEvent(db, { actor: identity.email, action: "tablas", detail: "Migración 0005 aplicada desde el panel (solo tablas nuevas)" });
  return { ok: true, ready: await schemaReady(db) };
}

export async function createInvitation(db, input, identity) {
  if (!isAdmin(identity)) return fail(403, "Solo un administrador puede crear invitaciones.");
  if (!(await schemaReady(db))) return NOT_READY;
  const { data, errors } = validateInvitationInput(input || {});
  if (Object.keys(errors).length) return Object.assign(fail(400, Object.values(errors)[0]), { errors });
  const now = new Date();
  const code = newCode();
  const id = newInvitationId(now);
  await db
    .prepare("INSERT INTO business_invitations (id, kind, business_name, contact_name, code_hash, status, created_at, created_by) VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?)")
    .bind(id, data.kind, data.businessName, data.contactName || null, await hashCode(code), now.toISOString(), identity.email)
    .run();
  await logEvent(db, { invitationId: id, at: now.toISOString(), actor: identity.email, action: "creada", to: "pendiente", detail: `${KINDS[data.kind].label} · ${data.businessName}` });
  return { ok: true, invitation: await getInvitation(db, id), link: invitationLink(code) };
}

export async function getInvitation(db, id) {
  return db
    .prepare(
      `SELECT i.id, i.kind, i.business_name, i.contact_name, i.status, i.created_at, i.created_by, i.used_at, i.application_id, i.revoked_at, i.revoked_by,
              m.id AS membership_id, m.status AS membership_status, m.business_id
         FROM business_invitations i LEFT JOIN business_memberships m ON m.invitation_id = i.id
        WHERE i.id = ?`
    )
    .bind(id)
    .first();
}

/* Nuevo código para una invitación pendiente (el anterior deja de funcionar) */
export async function renewInvitation(db, id, input, identity) {
  if (!isAdmin(identity)) return fail(403, "Solo un administrador puede renovar invitaciones.");
  if (!(await schemaReady(db))) return NOT_READY;
  if (!INVITATION_ID_RE.test(id)) return fail(400, "Invitación no válida.");
  if (!input || input.confirm !== true) return fail(400, "Falta la confirmación.");
  const code = newCode();
  const out = await db.prepare("UPDATE business_invitations SET code_hash = ? WHERE id = ? AND status = 'pendiente'").bind(await hashCode(code), id).run();
  if (!out.meta.changes) return fail(409, "Solo se puede renovar el enlace de una invitación pendiente.");
  await logEvent(db, { invitationId: id, actor: identity.email, action: "renovada", detail: "Enlace nuevo; el anterior dejó de funcionar" });
  return { ok: true, invitation: await getInvitation(db, id), link: invitationLink(code) };
}

export async function revokeInvitation(db, id, input, identity) {
  if (!isAdmin(identity)) return fail(403, "Solo un administrador puede revocar invitaciones.");
  if (!(await schemaReady(db))) return NOT_READY;
  if (!INVITATION_ID_RE.test(id)) return fail(400, "Invitación no válida.");
  if (!input || input.confirm !== true) return fail(400, "Falta la confirmación.");
  const now = new Date().toISOString();
  const out = await db
    .prepare("UPDATE business_invitations SET status = 'revocada', revoked_at = ?, revoked_by = ? WHERE id = ? AND status = 'pendiente'")
    .bind(now, identity.email, id)
    .run();
  if (!out.meta.changes) return fail(409, "Solo se puede revocar una invitación pendiente (las usadas se gestionan como membresía).");
  await logEvent(db, { invitationId: id, at: now, actor: identity.email, action: "revocada", from: "pendiente", to: "revocada" });
  return { ok: true, invitation: await getInvitation(db, id) };
}

/* Agregados de la analítica existente (solo lectura, base DB) para las
   miniwebs con membresía, en el mes elegido: visitas al perfil, todos los
   clics (mismo criterio que la pestaña Estadísticas: eventos «*_click»),
   y por separado WhatsApp y llamadas. Sin cifras inventadas: si la base no
   está disponible, no se muestra nada. */
async function membershipStats(analyticsDb, businessIds, period) {
  const ids = [...new Set(businessIds.filter((b) => BUSINESS_ID_RE.test(b)))];
  if (!analyticsDb || !ids.length || !period) return {};
  try {
    const { results } = await analyticsDb
      .prepare(
        `SELECT business_id,
                SUM(CASE WHEN event = 'profile_view' THEN 1 ELSE 0 END) AS views,
                SUM(CASE WHEN substr(event, -6) = '_click' THEN 1 ELSE 0 END) AS clicks,
                SUM(CASE WHEN event = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp,
                SUM(CASE WHEN event = 'phone_click' THEN 1 ELSE 0 END) AS phone
           FROM events
          WHERE business_id IN (${ids.map(() => "?").join(",")}) AND received_at >= ? AND received_at < ?
          GROUP BY business_id`
      )
      .bind(...ids, period.start, period.end)
      .all();
    return Object.fromEntries(results.map((r) => [r.business_id, { views: r.views || 0, clicks: r.clicks || 0, whatsapp: r.whatsapp || 0, phone: r.phone || 0 }]));
  } catch (e) {
    return null;
  }
}
const EMPTY_STATS = { views: 0, clicks: 0, whatsapp: 0, phone: 0 };

export async function overview(env, period) {
  const db = env.DIRECTORIO_DB;
  if (!(await schemaReady(db))) return { ready: false, invitations: [], memberships: [] };
  const inv = await db
    .prepare(
      `SELECT i.id, i.kind, i.business_name, i.contact_name, i.status, i.created_at, i.created_by, i.used_at, i.application_id, i.revoked_at, i.revoked_by,
              m.id AS membership_id, m.status AS membership_status, m.business_id
         FROM business_invitations i LEFT JOIN business_memberships m ON m.invitation_id = i.id
        ORDER BY i.created_at DESC LIMIT 300`
    )
    .all();
  const mem = await db
    .prepare(
      `SELECT id, plan, status, business_name, application_id, invitation_id, business_id, business_slug, created_at, activated_at, expires_at, updated_at, updated_by, withdrawn_to
         FROM business_memberships ORDER BY created_at DESC LIMIT 300`
    )
    .all();
  const memberships = mem.results;
  const stats = await membershipStats(env.DB, memberships.map((m) => m.business_id || ""), period);
  const statsAvailable = stats !== null && Boolean(env.DB);
  return {
    ready: true,
    period: period ? { month: period.month } : null,
    statsAvailable,
    invitations: inv.results,
    memberships: memberships.map((m) => Object.assign(m, { gift: m.plan === "PREMIUM_GIFT", stats: m.business_id && statsAvailable ? (stats[m.business_id] || EMPTY_STATS) : null })),
  };
}

export async function membershipHistory(db, id) {
  if (!MEMBERSHIP_ID_RE.test(id) || !(await schemaReady(db))) return [];
  const m = await db.prepare("SELECT invitation_id FROM business_memberships WHERE id = ?").bind(id).first();
  const { results } = await db
    .prepare("SELECT at, actor, action, from_status, to_status, detail FROM membership_events WHERE membership_id = ? OR (invitation_id IS NOT NULL AND invitation_id = ?) ORDER BY id")
    .bind(id, (m && m.invitation_id) || "")
    .all();
  return results;
}

/* activar | suspender | reactivar | retirar */
export async function membershipAction(db, id, input, identity) {
  if (!isAdmin(identity)) return fail(403, "Solo un administrador puede cambiar membresías.");
  if (!(await schemaReady(db))) return NOT_READY;
  if (!MEMBERSHIP_ID_RE.test(id)) return fail(400, "Membresía no válida.");
  const action = MEMBERSHIP_ACTIONS[input && input.action];
  if (!action) return fail(400, "Acción no válida.");
  if (input.confirm !== true) return fail(400, "Falta la confirmación.");
  const row = await db.prepare("SELECT * FROM business_memberships WHERE id = ?").bind(id).first();
  if (!row) return fail(404, "Membresía no encontrada.");
  if (!action.from.includes(row.status)) return fail(409, `No se puede ${action.label.toLowerCase()} una membresía en estado «${row.status}».`);

  const now = new Date().toISOString();
  const sets = ["status = ?", "updated_at = ?", "updated_by = ?"];
  const args = [action.to, now, identity.email];
  let detail = "";
  if (input.action === "activar") {
    const businessId = String(input.businessId || "").trim().toUpperCase();
    const slug = String(input.businessSlug || "").trim().toLowerCase();
    if (!BUSINESS_ID_RE.test(businessId) || !SLUG_RE.test(slug)) return fail(400, "Para activar, escribe el BIZ-id y el slug de la miniweb ya publicada (la publicación sigue siendo manual).");
    sets.push("business_id = ?", "business_slug = ?", "activated_at = COALESCE(activated_at, ?)", "expires_at = NULL");
    args.push(businessId, slug, now);
    detail = `Miniweb ${businessId} (${slug})`;
  }
  if (input.action === "retirar") {
    const to = String(input.withdrawTo || "");
    if (!["FREE", "PREMIUM_PAID"].includes(to)) return fail(400, "Elige la transición: ficha gratuita o Premium pagada.");
    sets.push("withdrawn_to = ?");
    args.push(to);
    detail = `Transición propuesta: ${KINDS[to].label}. Se conservan datos, fotografías, historial y estadísticas; no se crea ningún cobro.`;
  }
  const out = await db
    .prepare(`UPDATE business_memberships SET ${sets.join(", ")} WHERE id = ? AND status = ?`)
    .bind(...args, id, row.status)
    .run();
  if (!out.meta.changes) return fail(409, "La membresía cambió mientras tanto. Recarga la página.");
  await logEvent(db, { membershipId: id, at: now, actor: identity.email, action: input.action, from: row.status, to: action.to, detail });
  const updated = await db.prepare("SELECT * FROM business_memberships WHERE id = ?").bind(id).first();
  return { ok: true, membership: updated };
}
