/*
  facturacion.js — Suscripciones y Facturación (panel privado)
  ============================================================
  Todo pasa antes por Cloudflare Access + JWT (src/index.js). Además:
    - Ver: rol de administrador.
    - Acciones financieras (enlaces, cancelaciones, devoluciones, conciliación,
      ajustes): el correo debe estar en BILLING_ADMIN_EMAILS (secreto). Si la
      lista no existe, las acciones se deniegan (falla cerrado).
    - Confirmación explícita en cada acción; la devolución exige escribir el
      identificador de la membresía. Todo queda en billing_audit.

  Aislamiento: solo usa el binding PAGOS_DB (base de PRUEBAS) y una clave de
  Stripe de prueba. El panel de producción no tiene PAGOS_DB: esta sección
  responde 503 y no puede escribir en la base del directorio.

  Dinero (siempre en centavos CAD; se separan ingresos e impuestos):
    ingresos       suma de subtotales de facturas pagadas (sin impuestos)
    impuestos      impuestos recaudados (se remiten al gobierno: no son ingreso)
    total cobrado  lo que pagaron los clientes (ingresos + impuestos)
    comisiones     comisión REAL de Stripe (balance transaction)
    devoluciones   reembolsos hechos
    neto           ingresos − comisiones − parte sin impuestos de las devoluciones
    MRR actual     precio mensual de TODAS las suscripciones de PAGO vigentes
                   (activas, en prueba o con pago pendiente), aunque tengan una
                   cancelación programada: siguen activas y pagadas.
    cancelación    suscripciones vigentes que terminan al final del período
    programada     (cancel_at_period_end); su importe se muestra aparte.
    MRR futuro     MRR actual − cancelaciones programadas (lo que se prevé
                   seguir cobrando).
    canceladas     suscripciones ya terminadas en el período.
    Las cortesías nunca suman: no tienen suscripción.
*/
import { keyMode, LIVE_MODE_ALLOWED } from "../../functions/_lib/stripe.js";
import * as P from "../../functions/_lib/pagos.js";

const MEM_RE = /^MEM-\d{8}-[A-Z2-9]{6}$/;
const SOL_RE = /^SOL-\d{8}-[A-Z0-9]{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const ESTADOS = ["al_dia", "pendiente_pago", "en_gracia", "gracia_vencida", "cancela_al_final", "cancelada", "sin_suscripcion"];

/* ---------- Configuración y permisos ---------- */
export function billingConfig(env, { necesitaStripe = false } = {}) {
  const faltan = [];
  if (!env.PAGOS_DB) faltan.push("PAGOS_DB");
  if (env.PAGOS_MODO !== "test") faltan.push('PAGOS_MODO (solo "test")');
  if (necesitaStripe) {
    const mode = keyMode(env.STRIPE_SECRET_KEY);
    if (!mode) faltan.push("STRIPE_SECRET_KEY");
    else if (mode === "live" && !LIVE_MODE_ALLOWED) faltan.push("STRIPE_SECRET_KEY (clave REAL: cobros reales desactivados)");
  }
  return faltan;
}
export function canManageBilling(identity, env) {
  const list = String(env.BILLING_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return Boolean(identity && identity.role === "admin" && list.includes(String(identity.email || "").toLowerCase()));
}

/* ---------- Filtros ---------- */
export function parseFiltros(sp) {
  const f = {};
  const q = String(sp.get("empresa") || "").trim().slice(0, 80);
  if (q) f.empresa = q;
  const e = sp.get("estado");
  if (e && ESTADOS.includes(e)) f.estado = e;
  const d = sp.get("desde"), h = sp.get("hasta");
  if (d && DATE_RE.test(d)) f.desde = d;
  if (h && DATE_RE.test(h)) f.hasta = h;
  const p = sp.get("periodo");
  if (p && MONTH_RE.test(p)) f.periodo = p;
  return f;
}
/* Rango [desde, hasta] inclusivo en ISO; por defecto, el mes en curso */
function rango(f, now = new Date()) {
  const desde = f.desde ? f.desde + "T00:00:00.000Z" : now.toISOString().slice(0, 8) + "01T00:00:00.000Z";
  const hasta = f.hasta ? f.hasta + "T23:59:59.999Z" : now.toISOString();
  return { desde, hasta };
}
const like = (q) => "%" + q.replace(/[%_]/g, "") + "%";

/* ---------- Clasificación de membresías ---------- */
/* Premium de pago, cortesías permanentes, fundadores e institucionales, por separado */
export async function clasificacion(db) {
  const prot = (await db.prepare("SELECT p.business_id, p.reason, m.id AS membership_id, m.business_name, m.plan, m.status FROM billing_protected p LEFT JOIN business_memberships m ON m.business_id = p.business_id ORDER BY p.business_id").all()).results || [];
  const gifts = (await db.prepare("SELECT id AS membership_id, business_name, business_id, status FROM business_memberships WHERE plan = 'PREMIUM_GIFT' ORDER BY created_at").all()).results || [];
  const pago = await db.prepare("SELECT COUNT(*) AS n FROM business_memberships WHERE plan = 'PREMIUM_PAID' AND status <> 'retirada'").first();
  const giftIds = new Set(gifts.map((g) => g.business_id).filter(Boolean));
  return {
    pago: pago ? pago.n : 0,
    cortesias: [...gifts.map((g) => ({ ...g, fuente: "membresia" })), ...prot.filter((p) => p.reason === "cortesia" && !giftIds.has(p.business_id)).map((p) => ({ business_id: p.business_id, membership_id: p.membership_id, business_name: p.business_name, status: p.status, fuente: "lista_protegida" }))],
    fundadores: prot.filter((p) => p.reason === "fundador"),
    institucionales: prot.filter((p) => p.reason === "institucional"),
  };
}

/* ---------- Suscripciones (una fila por membresía de pago) ---------- */
export async function suscripciones(db, f = {}, now = new Date()) {
  const cfg = await P.settings(db);
  const { results } = await db
    .prepare(
      `SELECT m.id AS membership_id, m.business_name, m.business_id, m.status AS membresia, m.application_id, a.status AS editorial,
              s.stripe_subscription_id, s.status, s.cancel_at_period_end, s.current_period_start, s.current_period_end, s.first_failed_at, s.amount, s.canceled_at,
              (SELECT MAX(paid_at) FROM billing_invoices i WHERE i.membership_id = m.id AND i.status = 'paid') AS ultimo_pago,
              (SELECT status FROM billing_payment_links l WHERE l.membership_id = m.id ORDER BY l.created_at DESC LIMIT 1) AS enlace,
              (SELECT expires_at FROM billing_payment_links l WHERE l.membership_id = m.id ORDER BY l.created_at DESC LIMIT 1) AS enlace_vence
         FROM business_memberships m
         LEFT JOIN business_applications a ON a.id = m.application_id
         LEFT JOIN billing_subscriptions s ON s.stripe_subscription_id = (SELECT stripe_subscription_id FROM billing_subscriptions x WHERE x.membership_id = m.id ORDER BY x.created_at DESC LIMIT 1)
        WHERE m.plan = 'PREMIUM_PAID' AND NOT EXISTS (SELECT 1 FROM billing_protected p WHERE p.business_id = m.business_id)
          ${f.empresa ? "AND (m.business_name LIKE ? OR m.business_id LIKE ? OR m.id LIKE ?)" : ""}
        ORDER BY m.created_at DESC`
    )
    .bind(...(f.empresa ? [like(f.empresa), like(f.empresa), like(f.empresa)] : []))
    .all();
  return (results || [])
    .map((r) => {
      const fin = r.stripe_subscription_id ? P.estadoFinanciero(r, cfg, now) : { estado: r.enlace === "pendiente" && r.enlace_vence > now.toISOString() ? "pendiente_pago" : "sin_suscripcion" };
      return { ...r, financiero: fin.estado, dias_restantes: fin.dias_restantes ?? null, beneficios_suspendibles: !!fin.beneficios_suspendibles };
    })
    .filter((r) => !f.estado || r.financiero === f.estado)
    .filter((r) => !f.periodo || (r.current_period_end || "").slice(0, 7) === f.periodo)
    .filter((r) => (!f.desde || (r.current_period_end || "") >= f.desde) && (!f.hasta || (r.current_period_end || "") <= f.hasta + "T23:59:59.999Z"));
}

/* Solicitudes Premium aprobadas por el equipo que todavía no pagaron */
export async function pendientesDePago(db, now = new Date()) {
  const { results } = await db
    .prepare(
      `SELECT a.id AS application_id, a.name, a.status AS editorial, a.created_at,
              (SELECT m.id FROM business_memberships m WHERE m.application_id = a.id AND m.plan = 'PREMIUM_PAID' AND m.status <> 'retirada' LIMIT 1) AS membership_id,
              (SELECT l.id FROM billing_payment_links l WHERE l.application_id = a.id ORDER BY l.created_at DESC LIMIT 1) AS enlace_id,
              (SELECT l.status FROM billing_payment_links l WHERE l.application_id = a.id ORDER BY l.created_at DESC LIMIT 1) AS enlace,
              (SELECT l.expires_at FROM billing_payment_links l WHERE l.application_id = a.id ORDER BY l.created_at DESC LIMIT 1) AS enlace_vence
         FROM business_applications a
        WHERE a.status IN ('en_revision','aprobada') AND COALESCE(a.notes, '') NOT LIKE 'Plan solicitado: Plan Gratuito%'
          AND NOT EXISTS (SELECT 1 FROM business_memberships g WHERE g.application_id = a.id AND g.plan IN ('PREMIUM_GIFT','FREE') AND g.status <> 'retirada')
          AND NOT EXISTS (SELECT 1 FROM billing_invoices i JOIN business_memberships m ON m.id = i.membership_id WHERE m.application_id = a.id AND i.status = 'paid')
        ORDER BY a.created_at`
    )
    .all();
  return (results || []).map((r) => ({ ...r, situacion: !r.enlace ? "sin_enlace" : r.enlace === "pendiente" && r.enlace_vence > now.toISOString() ? "enlace_enviado" : r.enlace === "pendiente" ? "enlace_vencido" : r.enlace }));
}

/* ---------- Resumen financiero ---------- */
export async function resumen(db, f = {}, now = new Date()) {
  const { desde, hasta } = rango(f, now);
  const cfg = await P.settings(db);
  const empresa = f.empresa ? " AND m.business_name LIKE ?" : "";
  const eb = f.empresa ? [like(f.empresa)] : [];
  const PAGO = "m.plan = 'PREMIUM_PAID' AND NOT EXISTS (SELECT 1 FROM billing_protected p WHERE p.business_id = m.business_id)";
  const mrr = await db.prepare(`SELECT COALESCE(SUM(s.amount), 0) AS c, COUNT(*) AS n, COALESCE(SUM(CASE WHEN s.cancel_at_period_end = 1 THEN s.amount ELSE 0 END), 0) AS pc, SUM(CASE WHEN s.cancel_at_period_end = 1 THEN 1 ELSE 0 END) AS pn FROM billing_subscriptions s JOIN business_memberships m ON m.id = s.membership_id WHERE ${PAGO} AND s.status IN ('active','past_due','trialing')${empresa}`).bind(...eb).first();
  const alertasCancel = await db.prepare(`SELECT COUNT(*) AS n FROM billing_audit a LEFT JOIN business_memberships m ON m.id = a.membership_id WHERE a.action IN ('alerta_cancelacion_programada','alerta_cancelacion_inesperada')${empresa}`).bind(...eb).first();
  const fact = await db
    .prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(i.subtotal),0) AS ingresos, COALESCE(SUM(i.tax),0) AS impuestos, COALESCE(SUM(i.amount_paid),0) AS cobrado, COALESCE(SUM(i.stripe_fee),0) AS comisiones, SUM(CASE WHEN i.stripe_fee IS NULL THEN 1 ELSE 0 END) AS sin_comision
                FROM billing_invoices i JOIN business_memberships m ON m.id = i.membership_id WHERE ${PAGO} AND i.status = 'paid' AND i.paid_at BETWEEN ? AND ?${empresa}`)
    .bind(desde, hasta, ...eb)
    .first();
  const dev = await db
    .prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(r.amount),0) AS total, COALESCE(SUM(CASE WHEN i.total > 0 THEN r.amount * 1.0 * i.subtotal / i.total ELSE r.amount END),0) AS sin_impuestos
                FROM billing_refunds r LEFT JOIN billing_invoices i ON i.stripe_invoice_id = r.stripe_invoice_id LEFT JOIN business_memberships m ON m.id = r.membership_id
               WHERE r.created_at BETWEEN ? AND ?${empresa}`)
    .bind(desde, hasta, ...eb)
    .first();
  const subs = await suscripciones(db, { empresa: f.empresa }, now);
  const cuenta = (e) => subs.filter((s) => s.financiero === e).length;
  const rechazados = await db.prepare(`SELECT COUNT(*) AS n FROM billing_audit a LEFT JOIN business_memberships m ON m.id = a.membership_id WHERE a.action = 'pago_rechazado' AND a.at BETWEEN ? AND ?${empresa}`).bind(desde, hasta, ...eb).first();
  const canceladas = await db.prepare(`SELECT COUNT(*) AS n FROM billing_subscriptions s JOIN business_memberships m ON m.id = s.membership_id WHERE ${PAGO} AND s.status = 'canceled' AND COALESCE(s.ended_at, s.canceled_at) BETWEEN ? AND ?${empresa}`).bind(desde, hasta, ...eb).first();
  const limite = new Date(now.getTime() + 30 * 86400000).toISOString();
  const proximas = subs
    .filter((s) => ["al_dia", "en_gracia"].includes(s.financiero) && s.current_period_end && s.current_period_end <= limite)
    .sort((a, b) => (a.current_period_end < b.current_period_end ? -1 : 1))
    .map((s) => ({ membership_id: s.membership_id, business_name: s.business_name, fecha: s.current_period_end, importe: s.amount }));
  const neto = Math.round(fact.ingresos - fact.comisiones - dev.sin_impuestos);
  return {
    periodo: { desde: desde.slice(0, 10), hasta: hasta.slice(0, 10) },
    ajustes: cfg,
    mrr: { centavos: mrr.c, suscripciones: mrr.n },
    cancelacion_programada: { centavos: mrr.pc || 0, suscripciones: mrr.pn || 0 },
    mrr_futuro: { centavos: mrr.c - (mrr.pc || 0), suscripciones: mrr.n - (mrr.pn || 0) },
    alertas_cancelacion: alertasCancel.n,
    ingresos: fact.ingresos,
    impuestos: fact.impuestos,
    cobrado: fact.cobrado,
    comisiones: fact.comisiones,
    facturas_sin_comision: fact.sin_comision || 0,
    devoluciones: { cantidad: dev.n, total: dev.total },
    neto,
    facturas_pagadas: fact.n,
    conteos: {
      activas: cuenta("al_dia") + cuenta("en_gracia") + cuenta("cancela_al_final"),
      pendientes_pago: (await pendientesDePago(db, now)).length,
      en_gracia: cuenta("en_gracia"),
      gracia_vencida: cuenta("gracia_vencida"),
      cancela_al_final: cuenta("cancela_al_final"),
      canceladas_periodo: canceladas.n,
      pagos_rechazados_periodo: rechazados.n,
    },
    proximas_renovaciones: proximas,
    clasificacion: await clasificacion(db),
  };
}

/* ---------- Facturas ---------- */
export async function facturas(db, f = {}) {
  const cond = ["1 = 1"];
  const args = [];
  if (f.empresa) cond.push("(m.business_name LIKE ? OR i.number LIKE ?)"), args.push(like(f.empresa), like(f.empresa));
  if (f.desde) cond.push("COALESCE(i.paid_at, i.created_at) >= ?"), args.push(f.desde + "T00:00:00.000Z");
  if (f.hasta) cond.push("COALESCE(i.paid_at, i.created_at) <= ?"), args.push(f.hasta + "T23:59:59.999Z");
  if (f.periodo) cond.push("substr(i.period_start, 1, 7) = ?"), args.push(f.periodo);
  const { results } = await db
    .prepare(
      `SELECT i.stripe_invoice_id, i.number, i.status, i.billing_reason, i.membership_id, m.business_name, m.business_id, i.customer_province, i.currency,
              i.subtotal, i.tax, i.total, i.amount_paid, i.amount_refunded, i.stripe_fee, i.paid_at, i.period_start, i.period_end, i.attempt_count, i.hosted_invoice_url, i.created_at
         FROM billing_invoices i LEFT JOIN business_memberships m ON m.id = i.membership_id
        WHERE ${cond.join(" AND ")} ORDER BY COALESCE(i.paid_at, i.created_at) DESC LIMIT 1000`
    )
    .bind(...args)
    .all();
  return results || [];
}

/* ---------- Detalle de una membresía: historia editorial + financiera ---------- */
export async function detalle(db, membershipId) {
  if (!MEM_RE.test(String(membershipId || ""))) return null;
  const m = await db.prepare("SELECT * FROM business_memberships WHERE id = ?").bind(membershipId).first();
  if (!m) return null;
  const q = (sql, ...a) => db.prepare(sql).bind(...a).all().then((r) => r.results || []);
  const eventos = [
    ...(m.application_id ? (await q("SELECT at, actor, action, detail FROM application_events WHERE application_id = ?", m.application_id)).map((e) => ({ ...e, tipo: "editorial" })) : []),
    ...(await q("SELECT at, actor, action, detail FROM membership_events WHERE membership_id = ?", m.id)).map((e) => ({ ...e, tipo: "membresia" })),
    ...(await q("SELECT at, actor, action, detail, object_id FROM billing_audit WHERE membership_id = ?", m.id)).map((e) => ({ ...e, tipo: "financiero" })),
  ].sort((a, b) => (a.at < b.at ? -1 : 1));
  return {
    membresia: m,
    suscripcion: await db.prepare("SELECT * FROM billing_subscriptions WHERE membership_id = ? ORDER BY created_at DESC LIMIT 1").bind(m.id).first(),
    facturas: await q("SELECT stripe_invoice_id, number, status, subtotal, tax, total, amount_paid, amount_refunded, stripe_fee, paid_at, hosted_invoice_url FROM billing_invoices WHERE membership_id = ? ORDER BY stripe_created", m.id),
    devoluciones: await q("SELECT stripe_refund_id, amount, status, reason, requested_by, created_at FROM billing_refunds WHERE membership_id = ?", m.id),
    enlaces: await q("SELECT id, status, created_at, created_by, expires_at, used_at, revoked_at FROM billing_payment_links WHERE membership_id = ? ORDER BY created_at", m.id),
    eventos,
  };
}

export async function auditoria(db, f = {}) {
  const cond = ["1 = 1"];
  const args = [];
  if (f.desde) cond.push("a.at >= ?"), args.push(f.desde + "T00:00:00.000Z");
  if (f.hasta) cond.push("a.at <= ?"), args.push(f.hasta + "T23:59:59.999Z");
  if (f.empresa) cond.push("(m.business_name LIKE ? OR a.membership_id LIKE ?)"), args.push(like(f.empresa), like(f.empresa));
  const { results } = await db.prepare(`SELECT a.id, a.at, a.actor, a.action, a.membership_id, m.business_name, a.object_id, a.detail FROM billing_audit a LEFT JOIN business_memberships m ON m.id = a.membership_id WHERE ${cond.join(" AND ")} ORDER BY a.id DESC LIMIT 500`).bind(...args).all();
  return results || [];
}

/* ---------- Exportación CSV ---------- */
/* Celdas protegidas contra fórmulas (= + - @) al abrir en hojas de cálculo. */
export function csvCell(v) {
  if (v == null) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const money = (c) => (c == null ? "" : (c / 100).toFixed(2));
export async function exportarCSV(db, tipo, f = {}) {
  if (tipo === "facturas") {
    const rows = await facturas(db, f);
    const head = ["Factura", "Estado", "Motivo", "Fecha de pago", "Período desde", "Período hasta", "Empresa", "BIZ", "Membresía", "Provincia", "Moneda", "Ingreso sin impuestos", "Impuestos", "Total", "Pagado", "Devuelto", "Comisión Stripe", "Neto después de comisión"];
    const lines = rows.map((r) => [r.number || r.stripe_invoice_id, r.status, r.billing_reason, (r.paid_at || "").slice(0, 10), (r.period_start || "").slice(0, 10), (r.period_end || "").slice(0, 10), r.business_name, r.business_id, r.membership_id, r.customer_province, String(r.currency || "").toUpperCase(),
      money(r.subtotal), money(r.tax), money(r.total), money(r.amount_paid), money(r.amount_refunded), money(r.stripe_fee), r.status === "paid" && r.stripe_fee != null ? money((r.subtotal || 0) - r.stripe_fee) : ""]);
    return [head, ...lines].map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }
  if (tipo === "suscripciones") {
    const rows = await suscripciones(db, f);
    const head = ["Membresía", "Empresa", "BIZ", "Estado editorial", "Estado financiero", "Días de gracia restantes", "Próximo cobro", "Último pago", "Precio mensual", "Cancelación programada"];
    const lines = rows.map((r) => [r.membership_id, r.business_name, r.business_id, r.editorial, r.financiero, r.dias_restantes, (r.current_period_end || "").slice(0, 10), (r.ultimo_pago || "").slice(0, 10), money(r.amount), r.cancel_at_period_end ? "sí" : "no"]);
    return [head, ...lines].map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }
  if (tipo === "resumen") {
    const r = await resumen(db, f);
    const lines = [["Concepto", "CAD"], ["Período", `${r.periodo.desde} a ${r.periodo.hasta}`], ["Ingresos (sin impuestos)", money(r.ingresos)], ["Impuestos recaudados (no son ingreso)", money(r.impuestos)], ["Total cobrado", money(r.cobrado)], ["Comisiones de Stripe", money(r.comisiones)], ["Devoluciones", money(r.devoluciones.total)], ["Ingresos netos después de comisiones y devoluciones", money(r.neto)], ["Ingreso recurrente mensual actual (MRR)", money(r.mrr.centavos)], ["Cancelaciones programadas (importe mensual)", money(r.cancelacion_programada.centavos)], ["MRR futuro previsto", money(r.mrr_futuro.centavos)], ["Facturas pagadas", r.facturas_pagadas], ["Facturas sin comisión conciliada", r.facturas_sin_comision]];
    return lines.map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }
  return null;
}

/* ---------- Acciones (POST) ---------- */
export async function accion(env, identity, ruta, input, siteOrigin) {
  const db = env.PAGOS_DB;
  const actor = identity.email;
  const fail = (status, error) => ({ ok: false, status, error });
  if (input.confirm !== true) return fail(400, "Confirma la acción.");
  try {
    if (ruta.tipo === "enlace") {
      if (!SOL_RE.test(String(input.applicationId || ""))) return fail(400, "Solicitud no válida.");
      if (!/^https:\/\/[a-z0-9.-]+$/.test(String(siteOrigin || ""))) return fail(503, "Falta configurar PAGOS_SITE_ORIGIN (dirección de la vista previa de pruebas).");
      const r = await P.crearEnlacePago(db, { applicationId: input.applicationId, actor });
      return { ok: true, linkId: r.linkId, membershipId: r.membershipId, expiresAt: r.expiresAt, url: `${siteOrigin}/pago#t=${r.token}` };
    }
    if (ruta.tipo === "revocar") return { ...(await P.revocarEnlace(db, { linkId: ruta.id, actor })) };
    if (ruta.tipo === "cancelar" || ruta.tipo === "reactivar") return await P.cancelarAlFinal(env, db, { membershipId: ruta.id, actor, cancelar: ruta.tipo === "cancelar" });
    if (ruta.tipo === "devolver") {
      if (input.confirmText !== ruta.id) return fail(400, "Para devolver, escribe el identificador exacto de la membresía.");
      const motivo = String(input.motivo || "").trim();
      if (motivo.length < 5) return fail(400, "Indica el motivo de la devolución.");
      const r = await P.devolverPrimerPago(env, db, { membershipId: ruta.id, actor, motivo });
      return { ok: true, ...r };
    }
    if (ruta.tipo === "conciliar") return { ok: true, resultado: await P.conciliar(env, db) };
    if (ruta.tipo === "ajuste") return await P.actualizarAjuste(db, { key: input.key, value: input.value, actor });
  } catch (e) {
    const code = (e && e.code) || "";
    const msgs = {
      estado: "Solo se genera el enlace para solicitudes en revisión o aprobadas.", gratuito: "La solicitud es del plan Gratuito: no se cobra.", cortesia: "Cortesía: nunca se cobra.", protegido: "Perfil protegido: nunca se cobra.",
      perfil_protegido: "Perfil protegido: nunca se cobra.", ya_suscrita: "Ya tiene una suscripción vigente.", no_existe: "No existe.", no_pendiente: "El enlace ya no está pendiente.", sin_suscripcion: "No tiene una suscripción vigente.",
      sin_primer_pago: "No hay un primer pago para devolver.", fuera_de_plazo: "Fuera del plazo de devolución.", ya_devuelto: "Ya se devolvió.", ajuste_desconocido: "Ajuste desconocido.", concurrente: "Otra persona generó el enlace al mismo tiempo. Actualiza la página.", fuera_de_rango: "Valor fuera del rango permitido.",
    };
    if (msgs[code]) return fail(409, msgs[code]);
    if (/UNIQUE constraint/.test(String(e && e.message))) return fail(409, "Otra operación igual se hizo al mismo tiempo. Actualiza la página.");
    console.error("Facturación: acción fallida", ruta.tipo, code || (e && e.status) || "error");
    return fail(502, "No se pudo completar la acción. Intenta de nuevo; no se hizo ningún cambio duplicado.");
  }
  return fail(404, "No encontrado");
}

/* Rutas POST de facturación → { tipo, id } */
export function rutaAccion(pathname) {
  if (pathname === "/api/facturacion/enlaces") return { tipo: "enlace" };
  if (pathname === "/api/facturacion/conciliar") return { tipo: "conciliar" };
  if (pathname === "/api/facturacion/ajustes") return { tipo: "ajuste" };
  let m = pathname.match(/^\/api\/facturacion\/enlaces\/(PAY-\d{8}-[A-Z2-9]{6})\/revocar$/);
  if (m) return { tipo: "revocar", id: m[1] };
  m = pathname.match(/^\/api\/facturacion\/membresias\/(MEM-\d{8}-[A-Z2-9]{6})\/(cancelar|reactivar|devolver)$/);
  if (m) return { tipo: m[2], id: m[1] };
  return null;
}
export const BILLING_POST_RE = /^\/api\/facturacion\/(?:enlaces|conciliar|ajustes|enlaces\/PAY-\d{8}-[A-Z2-9]{6}\/revocar|membresias\/MEM-\d{8}-[A-Z2-9]{6}\/(?:cancelar|reactivar|devolver))$/;
