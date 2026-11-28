/*
  facturacion.js — Suscripciones y Facturación (panel privado, modo de PRUEBA).
  Sin librerías ni estilos en línea (CSP del panel). El enlace de pago se
  muestra una sola vez y nunca se guarda en el navegador ni en la URL.
*/
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cad = (c) => (c == null ? "—" : new Intl.NumberFormat("es-CA", { style: "currency", currency: "CAD" }).format(c / 100));
  const fmtDate = (iso, time) => {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("es-CA", Object.assign({ dateStyle: "medium", timeZone: "America/Edmonton" }, time ? { timeStyle: "short" } : {})).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  };
  const FIN = { al_dia: "Al día", pendiente_pago: "Pendiente de pago", en_gracia: "En gracia", gracia_vencida: "Gracia vencida", cancela_al_final: "Cancela al final", cancelada: "Cancelada", sin_suscripcion: "Sin suscripción" };
  const SIT = { sin_enlace: "Sin enlace", enlace_enviado: "Enlace enviado", enlace_vencido: "Enlace vencido", pagado: "Pagado", revocado: "Revocado", vencido: "Vencido" };
  const EDIT = { en_revision: "En revisión", aprobada: "Aprobada", publicada: "Publicada", rechazada: "Rechazada", pendiente: "Pendiente" };
  const INV = { paid: "Pagada", open: "Abierta", draft: "Borrador", void: "Anulada", uncollectible: "Incobrable" };
  let puedeGestionar = false;
  let ultimoResumen = null;

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ credentials: "same-origin", headers: { Accept: "application/json" } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Error ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
  const postJson = (path, data) => api(path, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });

  function setStatus(msg, isError) {
    const s = $("#status");
    s.textContent = msg || "";
    s.className = "status" + (isError ? " status--error" : "");
  }

  function query() {
    const fd = new FormData($("#filters"));
    const p = new URLSearchParams();
    for (const [k, v] of fd) if (String(v).trim()) p.set(k, String(v).trim());
    return p;
  }

  const badge = (key, label) => `<span class="badge badge--${esc(key)}">${esc(label || key)}</span>`;
  const table = (head, rows, empty) =>
    rows.length
      ? `<div class="fac-table-wrap"><table class="table fac-table"><thead><tr>${head.map((h) => `<th${h.num ? ' class="num"' : ""}>${esc(h.t || h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
      : `<p class="empty">${esc(empty)}</p>`;
  const btn = (attrs, label, cls) => `<button class="btn ${cls || "btn--outline"} btn--small" type="button" data-manage ${attrs}>${label}</button>`;

  /* ---------- Indicadores ---------- */
  function renderTiles(r) {
    const tile = (value, label, hint, cls) => `<div class="tile${cls ? " " + cls : ""}"><span class="tile__value">${value}</span><span class="tile__label">${esc(label)}</span>${hint ? `<span class="tile__hint">${esc(hint)}</span>` : ""}</div>`;
    const c = r.conteos;
    $("#tiles").innerHTML = [
      tile(cad(r.mrr.centavos), "MRR actual", `${r.mrr.suscripciones} suscripciones de pago vigentes`),
      tile(cad(r.cancelacion_programada.centavos), "Cancelaciones programadas", `${r.cancelacion_programada.suscripciones} terminan al final de su período`),
      tile(cad(r.mrr_futuro.centavos), "MRR futuro previsto", "MRR actual − cancelaciones programadas"),
      tile(cad(r.ingresos), "Ingresos cobrados", `Sin impuestos · ${r.facturas_pagadas} facturas`),
      tile(cad(r.impuestos), "Impuestos recaudados", "Se remiten: no son ingreso"),
      tile(cad(r.comisiones), "Comisiones de Stripe", "Comisión real de cada cobro"),
      tile(cad(r.devoluciones.total), "Devoluciones", `${r.devoluciones.cantidad} en el período`),
      tile(cad(r.neto), "Neto después de comisiones", "Ingresos − comisiones − devoluciones", "tile--neto"),
      tile(String(c.activas), "Suscripciones activas", `${c.cancela_al_final} cancelan al final del período`),
      tile(String(c.pendientes_pago), "Pendientes de pago", "Solicitudes aprobadas sin pagar"),
      tile(String(c.en_gracia), "En período de gracia", `Gracia: ${r.ajustes.grace_days} días`, c.en_gracia ? "tile--alerta" : ""),
      tile(String(c.gracia_vencida), "Gracia vencida", "Beneficios suspendibles; el perfil no se borra", c.gracia_vencida ? "tile--alerta" : ""),
      tile(String(c.pagos_rechazados_periodo), "Pagos rechazados", "En el período"),
      tile(String(c.canceladas_periodo), "Canceladas", "Suscripciones terminadas en el período"),
      tile(String(r.alertas_cancelacion), "Alertas de cancelación", "Cancelaciones no pedidas: revisar en la auditoría", r.alertas_cancelacion ? "tile--alerta" : ""),
    ].join("");
    const note = $("#feeNote");
    note.hidden = !r.facturas_sin_comision;
    note.textContent = r.facturas_sin_comision ? `${r.facturas_sin_comision} factura(s) todavía sin comisión conciliada: el neto se completará en la próxima conciliación.` : "";
    $("#mode").textContent = `MODO DE PRUEBA · período ${r.periodo.desde} a ${r.periodo.hasta} · no se realizan cobros reales`;
  }

  function renderCats(k) {
    const list = (items) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i.business_name || i.business_id || i.membership_id)}${i.business_name && i.business_id ? ` <small>${esc(i.business_id)}</small>` : ""}</li>`).join("")}</ul>` : '<p class="empty">Ninguno</p>');
    $("#cats").innerHTML = [
      `<div class="fac-cat"><h3>Premium de pago</h3><span class="fac-cat__n">${k.pago}</span><p class="card__hint">Membresías con cobro mensual.</p></div>`,
      `<div class="fac-cat"><h3>Cortesías permanentes</h3><span class="fac-cat__n">${k.cortesias.length}</span>${list(k.cortesias)}</div>`,
      `<div class="fac-cat"><h3>Fundadores</h3><span class="fac-cat__n">${k.fundadores.length}</span>${list(k.fundadores)}</div>`,
      `<div class="fac-cat"><h3>Institucionales</h3><span class="fac-cat__n">${k.institucionales.length}</span>${list(k.institucionales)}</div>`,
    ].join("");
  }

  function renderRenovaciones(items) {
    $("#renovaciones").innerHTML = table(["Fecha", "Negocio", { t: "Importe sin impuestos", num: true }], items.map((s) => `<tr><td>${fmtDate(s.fecha)}</td><td>${esc(s.business_name)}<small>${esc(s.membership_id)}</small></td><td class="num">${cad(s.importe)}</td></tr>`), "Sin renovaciones en los próximos 30 días.");
  }

  function renderPendientes(items) {
    $("#pendientes").innerHTML = table(
      ["Solicitud", "Estado editorial", "Pago", "Enlace vence", "Acciones"],
      items.map((p) => {
        const abierto = p.situacion === "enlace_enviado";
        return `<tr><td><strong>${esc(p.name)}</strong><small>${esc(p.application_id)}${p.membership_id ? " · " + esc(p.membership_id) : ""}</small></td>
          <td>${badge(p.editorial, EDIT[p.editorial])}</td><td>${badge(p.situacion, SIT[p.situacion])}</td><td>${abierto ? fmtDate(p.enlace_vence, true) : "—"}</td>
          <td class="fac-actions">${btn(`data-act="enlace" data-sol="${esc(p.application_id)}" data-name="${esc(p.name)}"`, abierto ? "Nuevo enlace" : "Generar enlace de pago", "btn--primary")}${abierto && p.enlace_id ? btn(`data-act="revocar" data-link="${esc(p.enlace_id)}" data-name="${esc(p.name)}"`, "Revocar enlace") : ""}</td></tr>`;
      }),
      "No hay solicitudes pendientes de pago."
    );
  }

  function renderSuscripciones(items) {
    $("#suscripciones").innerHTML = table(
      ["Negocio", "Editorial", "Financiero", "Próximo cobro", "Último pago", { t: "Precio", num: true }, "Acciones"],
      items.map((s) => {
        const vigente = s.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(s.status);
        const gracia = s.financiero === "en_gracia" ? ` <small>${s.dias_restantes} día(s) de gracia</small>` : s.beneficios_suspendibles ? " <small>Beneficios suspendibles</small>" : "";
        const acciones = [
          `<button class="btn btn--outline btn--small" type="button" data-act="detalle" data-mem="${esc(s.membership_id)}">Detalle</button>`,
          vigente && !s.cancel_at_period_end ? btn(`data-act="cancelar" data-mem="${esc(s.membership_id)}" data-name="${esc(s.business_name)}"`, "Cancelar al final del período") : "",
          vigente && s.cancel_at_period_end ? btn(`data-act="reactivar" data-mem="${esc(s.membership_id)}" data-name="${esc(s.business_name)}"`, "Anular cancelación", "btn--primary") : "",
          s.ultimo_pago ? btn(`data-act="devolver" data-mem="${esc(s.membership_id)}" data-name="${esc(s.business_name)}"`, "Devolver primer pago", "btn--danger") : "",
        ].join("");
        return `<tr><td><strong>${esc(s.business_name)}</strong><small>${esc(s.membership_id)}${s.business_id ? " · " + esc(s.business_id) : ""}</small></td>
          <td>${badge(s.editorial || "pendiente", EDIT[s.editorial] || "—")}</td><td>${badge(s.financiero, FIN[s.financiero])}${gracia}</td>
          <td>${s.status === "canceled" ? "—" : fmtDate(s.current_period_end)}</td><td>${fmtDate(s.ultimo_pago)}</td><td class="num">${cad(s.amount)}</td><td class="fac-actions">${acciones}</td></tr>`;
      }),
      "No hay suscripciones con estos filtros."
    );
  }

  function renderFacturas(items) {
    $("#facturas").innerHTML = table(
      ["Factura", "Fecha", "Negocio", "Estado", "Prov.", { t: "Sin impuestos", num: true }, { t: "Impuestos", num: true }, { t: "Total", num: true }, { t: "Devuelto", num: true }, { t: "Comisión", num: true }, { t: "Neto", num: true }],
      items.map((i) => `<tr><td>${i.hosted_invoice_url && /^https:\/\//.test(i.hosted_invoice_url) ? `<a href="${esc(i.hosted_invoice_url)}" target="_blank" rel="noopener noreferrer">${esc(i.number || i.stripe_invoice_id)}</a>` : esc(i.number || i.stripe_invoice_id)}</td>
        <td>${fmtDate(i.paid_at || i.created_at)}</td><td>${esc(i.business_name || "—")}</td><td>${badge(i.status === "paid" ? "al_dia" : i.status === "open" ? "pendiente_pago" : "sin_suscripcion", INV[i.status] || i.status)}</td><td>${esc(i.customer_province || "—")}</td>
        <td class="num">${cad(i.subtotal)}</td><td class="num">${cad(i.tax)}</td><td class="num">${cad(i.total)}</td><td class="num">${i.amount_refunded ? cad(i.amount_refunded) : "—"}</td>
        <td class="num">${i.stripe_fee == null ? "pendiente" : cad(i.stripe_fee)}</td><td class="num">${i.status === "paid" && i.stripe_fee != null ? cad((i.subtotal || 0) - i.stripe_fee) : "—"}</td></tr>`),
      "No hay facturas con estos filtros."
    );
  }

  function renderAuditoria(items) {
    $("#auditoria").innerHTML = table(
      ["Fecha", "Quién", "Acción", "Negocio", "Detalle"],
      items.slice(0, 200).map((a) => `<tr><td>${fmtDate(a.at, true)}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.business_name || a.membership_id || "—")}</td><td>${esc(a.detail || "")}${a.object_id ? `<small>${esc(a.object_id)}</small>` : ""}</td></tr>`),
      "Sin movimientos en el período."
    );
  }

  async function showDetalle(memId) {
    const d = await api(`/api/facturacion/membresias/${encodeURIComponent(memId)}`);
    const m = d.membresia;
    const s = d.suscripcion;
    $("#detTitle").textContent = `Detalle · ${m.business_name}`;
    $("#detalle").innerHTML = `
      <p><strong>${esc(m.id)}</strong>${m.business_id ? " · " + esc(m.business_id) : ""} · membresía ${esc(m.status)}${s ? ` · suscripción ${esc(s.status)}${s.cancel_at_period_end ? " (cancela al final del período)" : ""}` : ""}</p>
      <h3>Facturas</h3>${table(["Factura", "Estado", { t: "Total", num: true }, { t: "Comisión", num: true }, "Pagada"], d.facturas.map((i) => `<tr><td>${esc(i.number || i.stripe_invoice_id)}</td><td>${esc(i.status)}</td><td class="num">${cad(i.total)}</td><td class="num">${i.stripe_fee == null ? "pendiente" : cad(i.stripe_fee)}</td><td>${fmtDate(i.paid_at)}</td></tr>`), "Sin facturas.")}
      <h3>Devoluciones</h3>${table(["Fecha", { t: "Importe", num: true }, "Motivo", "Solicitada por"], d.devoluciones.map((r) => `<tr><td>${fmtDate(r.created_at)}</td><td class="num">${cad(r.amount)}</td><td>${esc(r.reason)}</td><td>${esc(r.requested_by)}</td></tr>`), "Sin devoluciones.")}
      <h3>Historia editorial y financiera</h3>${table(["Fecha", "Tipo", "Quién", "Acción", "Detalle"], d.eventos.map((e) => `<tr><td>${fmtDate(e.at, true)}</td><td>${esc(e.tipo)}</td><td>${esc(e.actor)}</td><td>${esc(e.action)}</td><td>${esc(e.detail || "")}</td></tr>`), "Sin eventos.")}`;
    $("#detalleCard").hidden = false;
    $("#detalleCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Carga ---------- */
  async function load(msg) {
    setStatus("Cargando…");
    const q = query().toString();
    const qs = q ? "?" + q : "";
    try {
      const [r, s, p, f, a] = await Promise.all([
        api("/api/facturacion/resumen" + qs),
        api("/api/facturacion/suscripciones" + qs),
        api("/api/facturacion/pendientes"),
        api("/api/facturacion/facturas" + qs),
        api("/api/facturacion/auditoria" + qs),
      ]);
      $("#app").hidden = false;
      $("#off").hidden = true;
      puedeGestionar = !!r.puedeGestionar;
      ultimoResumen = r;
      renderTiles(r);
      renderCats(r.clasificacion);
      renderRenovaciones(r.proximas_renovaciones);
      renderPendientes(p.pendientes);
      renderSuscripciones(s.suscripciones);
      renderFacturas(f.facturas);
      renderAuditoria(a.auditoria);
      const form = $("#settings");
      for (const k of ["delivery_business_days", "grace_days", "link_ttl_days"]) form.elements[k].value = r.ajustes[k];
      document.querySelectorAll("[data-manage]").forEach((b) => {
        b.disabled = !puedeGestionar;
        if (!puedeGestionar) b.title = "Tu correo no está en BILLING_ADMIN_EMAILS";
      });
      setStatus(msg || (puedeGestionar ? "" : "Solo lectura: las acciones financieras requieren permiso de facturación."));
    } catch (e) {
      if (e.status === 503) {
        $("#app").hidden = true;
        $("#off").hidden = false;
        $("#offList").textContent = e.data && e.data.faltan ? "Falta: " + e.data.faltan.join(", ") : "";
        setStatus("");
        return;
      }
      setStatus(e.message, true);
    }
  }

  /* ---------- Acciones (todas con confirmación) ---------- */
  function showLink(title, link) {
    $("#linkTitle").textContent = title;
    $("#linkValue").value = link;
    $("#linkResult").hidden = false;
    $("#linkValue").focus();
    $("#linkValue").select();
  }

  async function act(el) {
    const a = el.dataset.act;
    const name = el.dataset.name || "";
    try {
      if (a === "detalle") return await showDetalle(el.dataset.mem);
      if (a === "enlace") {
        const dias = ultimoResumen ? ultimoResumen.ajustes.link_ttl_days : 7;
        if (!window.confirm(`¿Generar un enlace de pago individual para «${name}»?\n\nVence en ${dias} días. Si había otro enlace pendiente, deja de funcionar.`)) return;
        const out = await postJson("/api/facturacion/enlaces", { applicationId: el.dataset.sol, confirm: true });
        showLink(`Enlace de pago de ${name} · vence ${fmtDate(out.expiresAt, true)}`, out.url);
        return await load("Enlace generado. Cópialo y envíalo tú mismo: el panel no envía nada.");
      } else if (a === "revocar") {
        if (!window.confirm(`¿Revocar el enlace de pago pendiente de «${name}»? Dejará de funcionar de inmediato.`)) return;
        await postJson(`/api/facturacion/enlaces/${encodeURIComponent(el.dataset.link)}/revocar`, { confirm: true });
        return await load("Enlace revocado.");
      } else if (a === "cancelar" || a === "reactivar") {
        const q = a === "cancelar"
          ? `¿Programar la cancelación de «${name}» al final del período pagado?\n\nNo se cobrará la siguiente renovación. El perfil no se borra ni se despublica.`
          : `¿Anular la cancelación programada de «${name}»? La suscripción seguirá renovándose cada mes.`;
        if (!window.confirm(q)) return;
        await postJson(`/api/facturacion/membresias/${encodeURIComponent(el.dataset.mem)}/${a}`, { confirm: true });
        return await load(a === "cancelar" ? "Cancelación programada al final del período." : "Cancelación anulada.");
      } else if (a === "devolver") {
        const mem = el.dataset.mem;
        const motivo = window.prompt(`Devolución del 100 % del primer pago de «${name}» (solo dentro de 30 días, si el negocio no pudo aprobarse). También cancela la suscripción de inmediato.\n\nMotivo:`);
        if (motivo == null) return;
        const conf = window.prompt(`Para confirmar, escribe el identificador de la membresía: ${mem}`);
        if (conf == null) return;
        await postJson(`/api/facturacion/membresias/${encodeURIComponent(mem)}/devolver`, { confirm: true, confirmText: conf.trim(), motivo });
        return await load("Devolución solicitada a Stripe y suscripción cancelada.");
      }
      await load();
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  function exportar(tipo) {
    const p = query();
    p.set("tipo", tipo);
    window.location.href = "/api/facturacion/exportar?" + p.toString();
  }

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act]");
    if (el) return act(el);
    const ex = ev.target.closest("[data-export]");
    if (ex) {
      ev.preventDefault();
      exportar(ex.dataset.export);
    }
  });
  $("#filters").addEventListener("submit", (ev) => {
    ev.preventDefault();
    load();
  });
  $("#filters").addEventListener("reset", () => setTimeout(() => load(), 0));
  $("#copyLink").addEventListener("click", async () => {
    const input = $("#linkValue");
    try {
      await navigator.clipboard.writeText(input.value);
      setStatus("Enlace copiado.");
    } catch (e) {
      input.select();
      setStatus("Selecciona el enlace y cópialo con Ctrl+C / Cmd+C.");
    }
  });
  $("#hideLink").addEventListener("click", () => {
    $("#linkValue").value = "";
    $("#linkResult").hidden = true;
  });
  $("#closeDet").addEventListener("click", () => {
    $("#detalleCard").hidden = true;
  });
  $("#settings").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const cambios = ["delivery_business_days", "grace_days", "link_ttl_days"].filter((k) => ultimoResumen && Number(form.elements[k].value) !== Number(ultimoResumen.ajustes[k]));
    if (!cambios.length) return setStatus("No hay cambios.");
    if (!window.confirm(`¿Guardar ${cambios.map((k) => `${form.elements[k].parentElement.firstChild.textContent.trim()}: ${ultimoResumen.ajustes[k]} → ${form.elements[k].value}`).join("; ")}?`)) return;
    try {
      for (const k of cambios) await postJson("/api/facturacion/ajustes", { key: k, value: Number(form.elements[k].value), confirm: true });
      await load("Parámetros guardados.");
    } catch (e) {
      setStatus(e.message, true);
    }
  });
  $("#reconcile").addEventListener("click", async () => {
    if (!window.confirm("¿Conciliar ahora con Stripe (modo de prueba)? Solo lee de Stripe y corrige la base de pruebas.")) return;
    try {
      const out = await postJson("/api/facturacion/conciliar", { confirm: true });
      const r = out.resultado || {};
      await load(`Conciliación terminada: ${r.revisadas || 0} revisadas, ${r.corregidas || 0} corregidas, ${r.comisiones || 0} comisiones completadas, ${r.alertas || 0} alertas.`);
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  load();
})();
