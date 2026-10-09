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

  async function openDetail(id) {
    document.querySelectorAll(".sol-item").forEach((b) => b.classList.toggle("is-active", b.dataset.id === id));
    try {
      const { application: a } = await api(`/api/solicitudes/${encodeURIComponent(id)}`);
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
        <div id="package"></div>`;

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

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".sol-item");
    if (btn) openDetail(btn.dataset.id);
  });
  $("#statusFilter").addEventListener("change", () => loadList());
  loadList(new URLSearchParams(location.search).get("id"));
})();
