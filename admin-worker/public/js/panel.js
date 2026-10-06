/*
  panel.js — Selector empresa + mes y vista de estadísticas.
*/
(function () {
  "use strict";
  const A = window.PDMAdmin;
  const $ = (id) => document.getElementById(id);
  let directory = [];

  function setStatus(text, isError) {
    $("status").textContent = text || "";
    $("status").classList.toggle("status--error", Boolean(isError));
  }

  function tile(value, label, hint) {
    return `<div class="tile"><span class="tile__value">${A.fmt(value)}</span><span class="tile__label">${A.esc(label)}</span>${hint ? `<span class="tile__hint">${A.esc(hint)}</span>` : ""}</div>`;
  }

  function render(entry, stats) {
    const b = entry && entry.record;
    const v = A.buildView(b, stats);

    $("sumName").textContent = (b && b.name) || entry.id;
    $("sumMeta").textContent = [entry.id, (b && b.company) || "", A.monthLabel(stats.period.month), "hora de Alberta"].filter(Boolean).join(" · ");
    const photo = b && A.imageUrl(b.cardImage || b.profileImage);
    $("sumPhoto").hidden = !photo;
    if (photo) $("sumPhoto").src = photo;

    $("tiles").innerHTML =
      tile(v.views, "Visitas al perfil") +
      tile(v.contacts, "Contactos iniciados", "WhatsApp, llamada, email y agendar") +
      tile(v.interactions, "Clics totales", "Todas las interacciones con botones") +
      (v.videoStarts || (b && b.youtubeVideoId) ? tile(v.videoStarts, "Reproducciones de video") : "");

    $("groups").innerHTML = v.groups.length
      ? v.groups
          .map((g) => `<h4>${A.esc(g.title)}</h4><table class="table"><tbody>${g.items
            .map((i) => `<tr><td>${A.esc(i.label)}${i.note ? `<small>${A.esc(i.note)}</small>` : ""}</td><td class="num">${A.fmt(i.value)}</td></tr>`)
            .join("")}</tbody></table>`)
          .join("")
      : `<p class="empty">Sin interacciones registradas.</p>`;

    $("sources").innerHTML = A.barList(v.sources);
    $("devices").innerHTML = A.barList(v.devices);
    $("dailyViews").innerHTML = A.dailyColumns(v.daily, "views", "visitas al perfil");
    $("dailyTable").innerHTML = A.dailyTable(v.daily);

    const link = $("reportLink");
    link.href = `/report?business_id=${encodeURIComponent(entry.id)}&month=${encodeURIComponent(stats.period.month)}`;
    link.hidden = false;
    $("results").hidden = false;
  }

  async function query() {
    const id = $("business").value;
    const month = $("month").value;
    if (!id || !month) return;
    const entry = directory.find((d) => d.id === id) || { id, record: null };
    history.replaceState(null, "", `?business_id=${encodeURIComponent(id)}&month=${encodeURIComponent(month)}`);
    setStatus("Consultando…");
    $("results").hidden = true;
    $("reportLink").hidden = true;
    try {
      const stats = await A.api(`/api/stats?business_id=${encodeURIComponent(id)}&month=${encodeURIComponent(month)}`);
      render(entry, stats);
      setStatus(stats.total_events ? "" : "No hay eventos registrados para esta empresa en este mes.");
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  async function init() {
    const params = new URLSearchParams(location.search);
    $("month").value = params.get("month") || A.currentMonth();
    $("month").max = A.currentMonth();
    try {
      directory = await A.loadDirectory();
    } catch (e) {
      setStatus(e.message, true);
      return;
    }
    $("business").innerHTML =
      `<option value="">Selecciona una empresa</option>` +
      directory
        .map((d) => {
          const name = d.name || d.slug || "(sin ficha en businesses.js)";
          const extra = d.record && !d.record.published ? " — no publicado" : "";
          return `<option value="${A.esc(d.id)}">${A.esc(d.id)} · ${A.esc(name)}${extra}</option>`;
        })
        .join("");
    const pre = params.get("business_id");
    if (pre && directory.some((d) => d.id === pre)) {
      $("business").value = pre;
      query();
    }
  }

  $("filters").addEventListener("submit", (e) => {
    e.preventDefault();
    query();
  });
  init();
})();
