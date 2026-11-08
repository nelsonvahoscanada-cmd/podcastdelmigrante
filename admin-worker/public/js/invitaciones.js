/*
  invitaciones.js — Invitaciones empresariales y membresías (panel privado).
  Sin librerías ni estilos en línea (la CSP del panel no los permite).
  El enlace con el código se muestra una sola vez y nunca se guarda en el
  navegador ni en la URL.
*/
(function () {
  "use strict";

  const KIND = { FREE: "Ficha gratuita", PREMIUM_PAID: "Premium pagada", PREMIUM_GIFT: "Premium de cortesía" };
  const PRICE = { FREE: "$0 CAD", PREMIUM_PAID: "$24.99 CAD al mes + impuestos", PREMIUM_GIFT: "$0 CAD" };
  const INV_STATUS = { pendiente: "Pendiente", usada: "Usada", revocada: "Revocada" };
  const MEM_STATUS = { en_revision: "En revisión", activa: "Activa", suspendida: "Suspendida", retirada: "Retirada" };
  const SITE = "https://podcastdelmigrante.com";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("es-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Edmonton" }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  };
  const fmt = (n) => new Intl.NumberFormat("es-CA").format(n || 0);

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ credentials: "same-origin", headers: { Accept: "application/json" } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }
  const postJson = (path, data) => api(path, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });

  function setStatus(msg, isError) {
    const s = $("#status");
    s.textContent = msg || "";
    s.className = "status" + (isError ? " status--error" : "");
  }

  function currentMonth() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
    } catch (e) {
      return new Date().toISOString().slice(0, 7);
    }
  }

  /* ---------- Resultado de crear / renovar: el enlace se ve UNA vez ---------- */
  function showLink(title, link) {
    $("#resultTitle").textContent = title;
    $("#resultLink").value = link;
    $("#result").hidden = false;
    $("#resultLink").focus();
    $("#resultLink").select();
  }
  function hideLink() {
    $("#resultLink").value = "";
    $("#result").hidden = true;
  }

  /* ---------- Listas ---------- */
  function membershipRow(m) {
    const stats = m.stats
      ? `${fmt(m.stats.views)} visitas · ${fmt(m.stats.clicks)} clics<br><small>WhatsApp ${fmt(m.stats.whatsapp)} · Llamadas ${fmt(m.stats.phone)}</small>`
      : m.business_id
        ? '<small>Estadísticas no disponibles</small>'
        : "<small>Sin miniweb publicada todavía</small>";
    const vence = m.plan === "PREMIUM_GIFT" ? "Sin vencimiento" : m.expires_at ? fmtDate(m.expires_at) : "—";
    const miniweb = m.business_slug ? `<a class="btn btn--outline btn--small" href="${SITE}/business-profile.html?slug=${encodeURIComponent(m.business_slug)}" target="_blank" rel="noopener">Ver miniweb</a>` : "";
    const btn = (action, label, cls) => `<button class="btn ${cls || "btn--outline"} btn--small" type="button" data-mem="${esc(m.id)}" data-action="${action}">${label}</button>`;
    const actions = [
      miniweb,
      m.status === "en_revision" ? btn("activar", "Activar", "btn--primary") : "",
      m.status === "activa" ? btn("suspender", "Suspender") : "",
      m.status === "suspendida" ? btn("reactivar", "Reactivar", "btn--primary") : "",
      m.status !== "retirada" ? btn("retirar", m.plan === "PREMIUM_GIFT" ? "Retirar cortesía" : "Retirar", "btn--danger") : "",
    ].join("");
    return `<tr>
      <td><strong>${esc(m.business_name)}</strong><br><small>${esc(m.id)}${m.business_id ? ` · ${esc(m.business_id)}` : ""}</small></td>
      <td>${esc(KIND[m.plan] || m.plan)}${m.plan === "PREMIUM_GIFT" ? ' <span class="badge badge--gift">Cortesía</span>' : ""}</td>
      <td><span class="badge badge--${esc(m.status)}">${esc(MEM_STATUS[m.status] || m.status)}</span>${m.withdrawn_to ? `<br><small>Transición: ${esc(KIND[m.withdrawn_to])}</small>` : ""}</td>
      <td>${fmtDate(m.activated_at)}</td>
      <td>${vence}</td>
      <td>${stats}</td>
      <td><div class="inv-actions">${actions}</div></td>
    </tr>`;
  }

  function invitationRow(i) {
    const btn = (action, label, cls) => `<button class="btn ${cls || "btn--outline"} btn--small" type="button" data-inv="${esc(i.id)}" data-action="${action}">${label}</button>`;
    const linked = i.membership_id ? `${esc(i.membership_id)}${i.application_id ? `<br><small>${esc(i.application_id)}</small>` : ""}` : i.application_id ? esc(i.application_id) : "—";
    return `<tr>
      <td><strong>${esc(i.business_name)}</strong>${i.contact_name ? `<br><small>${esc(i.contact_name)}</small>` : ""}<br><small>${esc(i.id)}</small></td>
      <td>${esc(KIND[i.kind] || i.kind)}<br><small>${esc(PRICE[i.kind] || "")}</small></td>
      <td><span class="badge badge--inv-${esc(i.status)}">${esc(INV_STATUS[i.status] || i.status)}</span></td>
      <td>${fmtDate(i.created_at)}<br><small>${esc(i.created_by)}</small></td>
      <td>${i.status === "revocada" ? `Revocada ${fmtDate(i.revoked_at)}` : fmtDate(i.used_at)}</td>
      <td>${linked}</td>
      <td><div class="inv-actions">${i.status === "pendiente" ? btn("renovar", "Renovar enlace") + btn("revocar", "Revocar", "btn--danger") : ""}</div></td>
    </tr>`;
  }

  function table(head, rows, empty) {
    if (!rows.length) return `<p class="empty">${empty}</p>`;
    return `<div class="inv-table-wrap"><table class="table inv-table"><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  }

  let state = null;
  async function load() {
    try {
      state = await api(`/api/invitaciones?month=${encodeURIComponent($("#month").value || currentMonth())}`);
    } catch (e) {
      setStatus(e.message, true);
      return;
    }
    $("#setup").hidden = state.ready;
    $("#newForm").querySelector("[type=submit]").disabled = !state.ready;
    if (!state.ready) {
      $("#memberships").innerHTML = '<p class="empty">Primero prepara las tablas.</p>';
      $("#invitations").innerHTML = '<p class="empty">Primero prepara las tablas.</p>';
      return;
    }
    $("#memberships").innerHTML = table(["Empresa", "Plan", "Estado", "Activación", "Vencimiento", "Estadísticas del mes", "Acciones"], state.memberships.map(membershipRow), "Todavía no hay membresías.");
    $("#invitations").innerHTML = table(["Invitado", "Tipo", "Estado", "Creada", "Usada / revocada", "Vinculada a", "Acciones"], state.invitations.map(invitationRow), "Todavía no hay invitaciones.");
  }

  /* ---------- Acciones ---------- */
  async function invitationAction(id, action) {
    const inv = state.invitations.find((x) => x.id === id);
    const name = inv ? inv.business_name : id;
    const q = action === "revocar"
      ? `¿Revocar la invitación de ${name}? El enlace dejará de funcionar.`
      : `¿Generar un enlace nuevo para ${name}? El anterior dejará de funcionar.`;
    if (!window.confirm(q)) return;
    try {
      const out = await postJson(`/api/invitaciones/${encodeURIComponent(id)}/${action}`, { confirm: true });
      if (out.link) showLink(`Enlace nuevo para ${name}`, out.link);
      setStatus(action === "revocar" ? "Invitación revocada." : "Enlace renovado. Cópialo ahora: no se volverá a mostrar.");
      await load();
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  async function membershipAction(id, action) {
    const m = state.memberships.find((x) => x.id === id);
    if (!m) return;
    const body = { action, confirm: true };
    if (action === "activar") {
      const businessId = window.prompt(`Activar ${m.business_name}.\nLa miniweb debe estar ya publicada (con un Pull Request).\n\nBIZ-id de la miniweb (por ejemplo BIZ-012):`, m.business_id || "");
      if (!businessId) return;
      const slug = window.prompt("Slug de la miniweb (la parte final de su dirección, por ejemplo santa-latino):", m.business_slug || "");
      if (!slug) return;
      body.businessId = businessId.trim();
      body.businessSlug = slug.trim();
      if (!window.confirm(`¿Activar la membresía de ${m.business_name} (${KIND[m.plan]}) con la miniweb ${body.businessId}?`)) return;
    } else if (action === "retirar") {
      const choice = window.prompt(
        `${m.plan === "PREMIUM_GIFT" ? "Retirar la cortesía" : "Retirar la membresía"} de ${m.business_name}.\nSe conservan los datos, las fotografías, el historial y las estadísticas. No se crea ningún cobro.\n\nEscribe la transición:\n  1 = Ficha gratuita\n  2 = Premium pagada (a acordar con el empresario)`,
        "1"
      );
      if (choice == null) return;
      const to = { 1: "FREE", 2: "PREMIUM_PAID" }[choice.trim()];
      if (!to) {
        setStatus("Transición no válida: escribe 1 o 2.", true);
        return;
      }
      body.withdrawTo = to;
      if (!window.confirm(`¿Confirmas retirar ${KIND[m.plan]} de ${m.business_name} con transición a ${KIND[to]}?`)) return;
    } else {
      const verb = action === "suspender" ? "Suspender" : "Reactivar";
      if (!window.confirm(`¿${verb} la membresía de ${m.business_name}?`)) return;
    }
    try {
      await postJson(`/api/membresias/${encodeURIComponent(id)}/accion`, body);
      setStatus("Membresía actualizada.");
      await load();
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-action]");
    if (!b) return;
    if (b.dataset.inv) invitationAction(b.dataset.inv, b.dataset.action);
    else if (b.dataset.mem) membershipAction(b.dataset.mem, b.dataset.action);
  });

  $("#newForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const data = { kind: f.kind.value, businessName: f.businessName.value.trim(), contactName: f.contactName.value.trim() };
    if (data.businessName.length < 2) {
      setStatus("Escribe el nombre del negocio o del empresario.", true);
      f.businessName.focus();
      return;
    }
    if (!window.confirm(`¿Generar una invitación «${KIND[data.kind]}» para ${data.businessName}?`)) return;
    try {
      const out = await postJson("/api/invitaciones", data);
      showLink(`Invitación ${KIND[data.kind]} para ${data.businessName}`, out.link);
      setStatus("Invitación creada. Copia el enlace ahora: no se volverá a mostrar.");
      f.reset();
      togglePaidWarning();
      await load();
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  function togglePaidWarning() {
    $("#paidWarning").hidden = $("#newForm").kind.value !== "PREMIUM_PAID";
  }
  $("#newForm").kind.addEventListener("change", togglePaidWarning);

  $("#copyBtn").addEventListener("click", async () => {
    const input = $("#resultLink");
    try {
      await navigator.clipboard.writeText(input.value);
      setStatus("Invitación copiada.");
    } catch (e) {
      input.select();
      setStatus("Selecciona el enlace y cópialo con Ctrl+C / Cmd+C.");
    }
  });
  $("#hideBtn").addEventListener("click", hideLink);

  $("#setupBtn").addEventListener("click", async () => {
    if (!window.confirm("¿Crear las tablas de invitaciones y membresías? Solo se crean tablas nuevas; no se modifica nada existente.")) return;
    try {
      await postJson("/api/invitaciones/instalar", { confirm: true });
      setStatus("Tablas preparadas.");
      await load();
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  $("#month").value = currentMonth();
  $("#month").addEventListener("change", load);
  load();
})();
