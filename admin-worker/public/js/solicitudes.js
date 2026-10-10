/*
  solicitudes.js — Revisión de solicitudes del Directorio Empresarial.
  Sin librerías ni estilos en línea (la CSP del panel no los permite).
*/
(function () {
  "use strict";

  const STATUS = {
    pendiente: "Pendiente",
    en_revision: "En revisión",
    aprobada: "Aprobada",
    publicada: "Publicada",
    rechazada: "Rechazada",
    duplicada: "Duplicada",
  };
  const MAIL = { enviado: "Enviado", error: "Error", pendiente: "Pendiente" };
  const ACTION = { recibida: "Solicitud recibida", correos: "Correos", estado: "Cambio de estado", revision: "Revisión" };
  const CHANNEL = { correo: "Correo electrónico", telefono: "Teléfono", whatsapp: "WhatsApp", otro: "Otro" };
  const DEL_STATUS = { programada: "Programada", cancelada: "Cancelada", ejecutada: "Ejecutada" };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmtDate = (iso) => {
    try {
      return new Intl.DateTimeFormat("es-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Edmonton" }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  };
  const safeUrl = (u) => (/^https:\/\//.test(u || "") ? u : "");

  const fmtDay = (d) => {
    try {
      return new Intl.DateTimeFormat("es-CA", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
    } catch (e) {
      return d;
    }
  };
  const todayEdmonton = () => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton" }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  };
  const postJson = (path, data) =>
    api(path, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ credentials: "same-origin", headers: { Accept: "application/json" } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  function setStatus(msg, isError) {
    const s = $("#status");
    s.textContent = msg || "";
    s.className = "status" + (isError ? " status--error" : "");
  }

  /* ---------- Lista ---------- */
  async function loadList(selectId) {
    const filter = $("#statusFilter").value;
    try {
      const { applications, counts } = await api("/api/solicitudes" + (filter ? `?status=${encodeURIComponent(filter)}` : ""));
      $("#counts").textContent = Object.keys(STATUS)
        .filter((k) => counts[k])
        .map((k) => `${STATUS[k]}: ${counts[k]}`)
        .join(" · ") || "Todavía no hay solicitudes.";
      $("#items").innerHTML = applications.length
        ? applications
            .map(
              (a) => `<li><button type="button" class="sol-item" data-id="${esc(a.id)}">
                <span class="sol-item__name">${esc(a.name)}</span>
                <span class="sol-item__meta">${esc(a.category_label)} · ${esc(a.city)}, ${esc(a.province)}</span>
                <span class="sol-item__meta">${esc(a.id)} · ${esc(fmtDate(a.created_at))}</span>
                <span class="badge badge--${esc(a.status)}">${esc(STATUS[a.status] || a.status)}</span>
                ${a.internal_email_status === "error" || a.confirmation_email_status === "error" ? '<span class="badge badge--error">Correo con error</span>' : ""}
                ${a.deletion_pending ? '<span class="badge badge--error">Eliminación programada</span>' : ""}
              </button></li>`
            )
            .join("")
        : '<li><p class="empty">Sin solicitudes en este estado.</p></li>';
      if (selectId) openDetail(selectId);
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  /* ---------- Vista previa del perfil (según los datos disponibles) ---------- */
  function previewHtml(a) {
    const buttons = [
      a.whatsapp && "WhatsApp",
      a.phone && "Llamar",
      a.website && "Visitar sitio web",
      a.address && "Cómo llegar",
    ].filter(Boolean);
    const social = ["instagram", "facebook", "tiktok", "linkedin"].filter((k) => a[k]);
    return `<div class="preview">
      <div class="preview__media${a.image_kind === "logo" ? " preview__media--logo" : ""}"><img src="/api/solicitudes/${esc(a.id)}/imagen" alt="Imagen enviada"></div>
      <div class="preview__body">
        <span class="preview__label">Perfil empresarial · vista previa</span>
        <h3 class="preview__name">${esc(a.image_kind === "foto" && a.representative && a.representative.toLowerCase() !== a.name.toLowerCase() ? a.representative : a.name)}</h3>
        ${a.title ? `<p class="preview__title">${esc(a.title)}</p>` : ""}
        ${a.image_kind === "foto" && a.representative.toLowerCase() !== a.name.toLowerCase() ? `<p class="preview__company">${esc(a.name)}</p>` : ""}
        <p class="preview__place">${esc(a.city)}, ${esc(a.province)}</p>
        <p class="preview__summary">${esc(a.summary)}</p>
        <div class="preview__buttons">${buttons.map((b) => `<span class="preview__btn">${esc(b)}</span>`).join("")}</div>
        ${social.length ? `<p class="preview__social">Redes: ${social.map((k) => esc(k[0].toUpperCase() + k.slice(1))).join(" · ")}</p>` : ""}
        <p class="preview__qr">+ Código QR «Visita mi perfil» y «Guarda mi contacto» (se generan al publicar).</p>
      </div>
    </div>`;
  }

  function row(label, value, href) {
    if (!value) return "";
    const v = href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(value)}</a>` : esc(value);
    return `<tr><th scope="row">${esc(label)}</th><td>${v}</td></tr>`;
  }

  function historyHtml(events) {
    if (events === null) {
      return '<p class="card__hint">Historial no disponible: falta aplicar la migración <code>db/directorio/0002_historial.sql</code> en D1.</p>';
    }
    if (!events.length) return '<p class="empty">Sin acciones registradas.</p>';
    return `<table class="table sol-table sol-history"><thead><tr><th scope="col">Fecha</th><th scope="col">Acción</th><th scope="col">Quién</th><th scope="col">Detalle</th></tr></thead><tbody>
      ${events
        .map((h) => {
          const move = h.action === "estado" ? `${STATUS[h.from_status] || h.from_status} → ${STATUS[h.to_status] || h.to_status}` : "";
          const detail = [move, h.detail].filter(Boolean).join(" · ");
          return `<tr><td>${esc(fmtDate(h.at))}</td><td>${esc(ACTION[h.action] || h.action)}</td><td>${esc(h.actor)}</td><td>${esc(detail)}</td></tr>`;
        })
        .join("")}
    </tbody></table>`;
  }

  /* ---------- Privacidad: pedido de eliminación ---------- */
  function deletionHtml(a, d) {
    if (!d || !d.available) {
      return `<div class="card"><h3>Eliminación de datos</h3>
        <p class="card__hint">No disponible: falta aplicar la migración <code>db/directorio/0003_eliminaciones.sql</code> en D1.</p></div>`;
    }
    const past = d.past.length
      ? `<ul class="sol-del-past">${d.past
          .map((p) => `<li>${esc(DEL_STATUS[p.status] || p.status)} · pedido del ${esc(fmtDay(p.requested_on))} (${esc(CHANNEL[p.channel] || p.channel)})${p.cancel_reason ? ` · motivo: ${esc(p.cancel_reason)}` : ""}</li>`)
          .join("")}</ul>`
      : "";
    if (!d.open) {
      return `<form class="card sol-form" id="delScheduleForm">
        <h3>Eliminación de datos</h3>
        <p class="card__hint">Paso 1 de 2. Registra aquí el pedido de la persona. Se puede cancelar; no borra nada todavía.</p>
        <div class="sol-form__row">
          <label>Fecha del pedido <input type="date" name="requestedOn" required max="${esc(todayEdmonton())}" value="${esc(todayEdmonton())}"></label>
          <label>Canal <select name="channel">${Object.entries(CHANNEL).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
        </div>
        <label>Nota (sin correos ni teléfonos) <input name="notes" maxlength="300"></label>
        <div class="sol-form__actions"><button class="btn btn--outline" type="submit">Registrar pedido de eliminación</button></div>
        ${past}
      </form>`;
    }
    const o = d.open;
    const published = a.status === "publicada" || a.business_id;
    return `<div class="card sol-del">
      <h3>Eliminación de datos · pedido abierto</h3>
      <p>Pedido del <strong>${esc(fmtDay(o.requested_on))}</strong> por ${esc(CHANNEL[o.channel] || o.channel)} · registrado por ${esc(o.scheduled_by)}.
        Responder a más tardar el <strong>${esc(fmtDay(o.due_on))}</strong> (referencia interna de 45 días).</p>
      ${o.notes ? `<p class="card__hint">Nota: ${esc(o.notes)}</p>` : ""}
      <form class="sol-form" id="delExecuteForm">
        <p class="card__hint">Paso 2 de 2. Borra para siempre la solicitud, su historial y la imagen en R2. <strong>No se puede deshacer.</strong>
          Después, borra en Gmail los correos con el número ${esc(a.id)} y responde a la persona.</p>
        ${published ? `<label class="sol-check"><input type="checkbox" name="profileRemoved"> El perfil público ya se retiró del sitio (Pull Request fusionado)</label>` : ""}
        <label>Para confirmar, escribe el número de la solicitud <input name="confirm" autocomplete="off" spellcheck="false" placeholder="${esc(a.id)}"></label>
        <div class="sol-form__actions">
          <button class="btn btn--danger" type="submit">Eliminar definitivamente</button>
        </div>
      </form>
      <form class="sol-form" id="delCancelForm">
        <label>Motivo para cancelar el pedido <input name="reason" maxlength="300" required></label>
        <div class="sol-form__actions"><button class="btn btn--outline" type="submit">Cancelar pedido</button></div>
      </form>
      ${past}
    </div>`;
  }

  function bindDeletion(a) {
    const base = `/api/solicitudes/${encodeURIComponent(a.id)}/eliminacion`;
    const sched = $("#delScheduleForm");
    if (sched) {
      sched.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        try {
          await postJson(base, { action: "programar", requestedOn: sched.requestedOn.value, channel: sched.channel.value, notes: sched.notes.value });
          setStatus("Pedido de eliminación registrado.");
          loadList(a.id);
          loadDeletions();
        } catch (e) {
          setStatus(e.message, true);
        }
      });
    }
    const exec = $("#delExecuteForm");
    if (exec) {
      exec.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        if (exec.confirm.value.trim() !== a.id) {
          setStatus(`Para confirmar, escribe exactamente ${a.id}.`, true);
          return;
        }
        if (!window.confirm(`¿Eliminar definitivamente ${a.id}? No se puede deshacer.`)) return;
        try {
          const out = await postJson(base, { action: "ejecutar", confirm: exec.confirm.value.trim(), profileRemoved: exec.profileRemoved ? exec.profileRemoved.checked : false });
          setStatus(`Eliminada: ${out.deletion.result}. Falta: borrar los correos en Gmail y responder a la persona.`);
          history.replaceState(null, "", "/solicitudes");
          $("#detail").innerHTML = '<div class="card sol-empty"><p class="empty">Solicitud eliminada. Completa los pasos pendientes en el registro de eliminaciones.</p></div>';
          loadList();
          loadDeletions();
        } catch (e) {
          setStatus(e.message, true);
        }
      });
    }
    const cancel = $("#delCancelForm");
    if (cancel) {
      cancel.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        try {
          await postJson(base, { action: "cancelar", reason: cancel.reason.value });
          setStatus("Pedido de eliminación cancelado.");
          loadList(a.id);
          loadDeletions();
        } catch (e) {
          setStatus(e.message, true);
        }
      });
    }
  }

  /* ---------- Registro de eliminaciones ---------- */
  async function loadDeletions() {
    const box = $("#deletions");
    if (!box) return;
    try {
      const { deletions } = await api("/api/eliminaciones");
      if (deletions === null) {
        box.innerHTML = '<p class="card__hint">No disponible: falta aplicar la migración <code>db/directorio/0003_eliminaciones.sql</code> en D1.</p>';
        return;
      }
      if (!deletions.length) {
        box.innerHTML = '<p class="empty">Sin pedidos de eliminación.</p>';
        return;
      }
      const step = (d, key, label, by, at) =>
        d.status !== "ejecutada" ? "—" : d[at] ? `${esc(fmtDate(d[at]))} · ${esc(d[by])}` : `<button type="button" class="btn btn--outline btn--small" data-step="${key}" data-n="${esc(d.id)}">${esc(label)}</button>`;
      box.innerHTML = `<table class="table sol-table"><thead><tr><th scope="col">Solicitud</th><th scope="col">Pedido</th><th scope="col">Estado</th><th scope="col">Responder antes del</th><th scope="col">Resultado</th><th scope="col">Correos en Gmail</th><th scope="col">Respuesta a la persona</th></tr></thead><tbody>
        ${deletions
          .map(
            (d) => `<tr><td>${esc(d.application_id)}</td><td>${esc(fmtDay(d.requested_on))} · ${esc(CHANNEL[d.channel] || d.channel)}</td>
              <td>${esc(DEL_STATUS[d.status] || d.status)}${d.executed_by ? ` · ${esc(d.executed_by)}` : ""}</td><td>${esc(fmtDay(d.due_on))}</td>
              <td>${esc(d.result || d.cancel_reason || "")}</td>
              <td>${step(d, "gmail", "Marcar borrados", "gmail_done_by", "gmail_done_at")}</td>
              <td>${step(d, "respuesta", "Marcar enviada", "reply_sent_by", "reply_sent_at")}</td></tr>`
          )
          .join("")}
      </tbody></table>`;
    } catch (e) {
      box.innerHTML = `<p class="card__hint">${esc(e.message)}</p>`;
    }
  }

  async function openDetail(id) {
    document.querySelectorAll(".sol-item").forEach((b) => b.classList.toggle("is-active", b.dataset.id === id));
    try {
      const { application: a, history: events, deletion } = await api(`/api/solicitudes/${encodeURIComponent(id)}`);
      history.replaceState(null, "", `/solicitudes?id=${encodeURIComponent(a.id)}`);
      const options = [a.status].concat(a.transitions).map((s) => `<option value="${esc(s)}"${s === a.status ? " selected" : ""}>${esc(STATUS[s] || s)}</option>`).join("");
      $("#detail").innerHTML = `
        <div class="card">
          <div class="sol-detail__head">
            <div><h2 class="sol-h2">${esc(a.name)}</h2><p class="sol-item__meta">${esc(a.id)} · recibida ${esc(fmtDate(a.created_at))}</p></div>
            <span class="badge badge--${esc(a.status)}">${esc(STATUS[a.status] || a.status)}</span>
          </div>
          <table class="table sol-table"><tbody>
            ${row("Categoría", a.category_label)}
            ${row("Ciudad y provincia", `${a.city}, ${a.province}`)}
            ${row("Representante", a.representative)}
            ${row("Cargo o especialidad", a.title)}
            ${row("Correo (privado)", a.email, "mailto:" + a.email)}
            ${row("Teléfono", a.phone, a.phone ? "tel:" + a.phone.replace(/[^\d+]/g, "") : "")}
            ${row("WhatsApp", a.whatsapp ? "+" + a.whatsapp : "", a.whatsapp ? "https://wa.me/" + a.whatsapp : "")}
            ${row("Página web", a.website, safeUrl(a.website))}
            ${row("Dirección comercial", a.address)}
            ${row("Instagram", a.instagram, safeUrl(a.instagram))}
            ${row("Facebook", a.facebook, safeUrl(a.facebook))}
            ${row("TikTok", a.tiktok, safeUrl(a.tiktok))}
            ${row("LinkedIn", a.linkedin, safeUrl(a.linkedin))}
            ${row("Imagen", `${a.image_kind === "logo" ? "Logotipo" : "Fotografía"} · ${a.image_width}×${a.image_height} px · ${Math.round(a.image_bytes / 1024)} KB`, `/api/solicitudes/${a.id}/imagen`)}
            ${row("Correo interno", MAIL[a.internal_email_status] || a.internal_email_status)}
            ${row("Confirmación al empresario", MAIL[a.confirmation_email_status] || a.confirmation_email_status)}
            ${row("Error de correo", a.email_error)}
            ${row("Consentimientos", `Aceptados (${a.consent_version}) el ${fmtDate(a.consent_at)}`)}
            ${row("Última revisión", a.reviewed_by ? `${a.reviewed_by} · ${fmtDate(a.reviewed_at)}` : "")}
          </tbody></table>
          <h3 class="mt">Reseña</h3>
          <p class="sol-summary">${esc(a.summary)}</p>
        </div>

        <div class="card">
          <h3>Vista previa del perfil</h3>
          <p class="card__hint">Aproximación de la miniweb con los datos de la solicitud. Envíala al empresario para su aprobación.</p>
          ${previewHtml(a)}
        </div>

        <form class="card sol-form" id="statusForm">
          <h3>Revisión</h3>
          <label>Estado <select name="status">${options}</select></label>
          <label class="sol-check"><input type="checkbox" name="ownerApproved"${a.owner_approved ? " checked" : ""}> El empresario aprobó la vista previa de su perfil</label>
          <div class="sol-form__row">
            <label>BIZ-id publicado <input name="businessId" value="${esc(a.business_id || "")}" placeholder="BIZ-003" pattern="BIZ-\\d{3,6}"></label>
            <label>Slug publicado <input name="businessSlug" value="${esc(a.business_slug || "")}" placeholder="nombre-apellido"></label>
          </div>
          <label>Notas internas <textarea name="notes" rows="3" maxlength="2000">${esc(a.review_notes || "")}</textarea></label>
          <div class="sol-form__actions">
            <button class="btn btn--primary" type="submit">Guardar</button>
            <button class="btn btn--outline" type="button" id="packageBtn"${a.status === "aprobada" || a.status === "publicada" ? "" : " disabled title=\"Disponible cuando la solicitud esté aprobada\""}>Preparar publicación</button>
          </div>
        </form>
        <div id="package"></div>

        <div class="card">
          <h3>Historial</h3>
          <p class="card__hint">Registro de lo ocurrido con esta solicitud. No se puede editar.</p>
          ${historyHtml(events)}
        </div>

        ${deletionHtml(a, deletion)}`;

      bindDeletion(a);

      $("#statusForm").addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const f = ev.target;
        try {
          await api(`/api/solicitudes/${encodeURIComponent(a.id)}/estado`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ status: f.status.value, ownerApproved: f.ownerApproved.checked, businessId: f.businessId.value, businessSlug: f.businessSlug.value, notes: f.notes.value }),
          });
          setStatus("Cambios guardados.");
          loadList(a.id);
        } catch (e) {
          setStatus(e.message, true);
        }
      });
      $("#packageBtn").addEventListener("click", async () => {
        try {
          const p = await api(`/api/solicitudes/${encodeURIComponent(a.id)}/paquete`);
          $("#package").innerHTML = `<div class="card">
            <h3>Paquete de publicación</h3>
            <ol class="sol-steps">${p.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
            <p><a class="btn btn--outline" href="/api/solicitudes/${esc(a.id)}/imagen" download="${esc(p.imageFile.split("/").pop())}">Descargar imagen (${esc(p.imageFile)})</a></p>
            <label class="sol-code">Ficha para js/businesses.js<textarea readonly rows="16" id="entry">${esc(p.entry)}</textarea></label>
            <button class="btn btn--outline" type="button" id="copyEntry">Copiar ficha</button>
          </div>`;
          $("#copyEntry").addEventListener("click", async () => {
            try { await navigator.clipboard.writeText($("#entry").value); setStatus("Ficha copiada."); } catch (e) { $("#entry").select(); }
          });
        } catch (e) {
          setStatus(e.message, true);
        }
      });
      setStatus("");
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".sol-item");
    if (btn) openDetail(btn.dataset.id);
    const stepBtn = ev.target.closest("[data-step]");
    if (stepBtn) {
      try {
        await postJson(`/api/eliminaciones/${encodeURIComponent(stepBtn.dataset.n)}/pasos`, { step: stepBtn.dataset.step });
        setStatus("Paso registrado.");
        loadDeletions();
      } catch (e) {
        setStatus(e.message, true);
      }
    }
  });
  $("#statusFilter").addEventListener("change", () => loadList());
  loadList(new URLSearchParams(location.search).get("id"));
  loadDeletions();
})();
