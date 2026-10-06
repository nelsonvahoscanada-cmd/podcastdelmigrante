/*
  report.js — Reporte mensual de UNA empresa, listo para imprimir / PDF.
  Usa el mismo endpoint que el panel: las cifras siempre coinciden.
*/
(function () {
  "use strict";
  const A = window.PDMAdmin;
  const $ = (id) => document.getElementById(id);

  function tile(value, label, hint) {
    return `<div class="r-tile"><span class="r-tile__value">${A.fmt(value)}</span><span class="r-tile__label">${A.esc(label)}</span>${hint ? `<span class="r-tile__hint">${A.esc(hint)}</span>` : ""}</div>`;
  }

  async function init() {
    const params = new URLSearchParams(location.search);
    const id = params.get("business_id") || "";
    const month = params.get("month") || "";
    if (!id || !month) {
      $("status").textContent = "Falta la empresa o el mes. Genera el reporte desde el panel.";
      return;
    }
    $("status").textContent = "Generando reporte…";

    let stats;
    try {
      stats = await A.api(`/api/stats?business_id=${encodeURIComponent(id)}&month=${encodeURIComponent(month)}`);
    } catch (e) {
      $("status").textContent = e.message;
      $("status").classList.add("status--error");
      return;
    }

    let b = null;
    try {
      /* global BUSINESSES */
      b = (typeof BUSINESSES !== "undefined" ? BUSINESSES : []).find((x) => x.id === id) || null;
    } catch (e) {
      b = null;
    }
    const v = A.buildView(b, stats);
    const name = (b && b.name) || id;
    const period = A.monthLabel(stats.period.month);

    document.title = `${name} · ${period} · Reporte de rendimiento`;
    $("rName").textContent = name;
    $("rTitle").textContent = b ? [b.card && b.card.title ? b.card.title : b.professionalTitle, b.company, b.city].filter(Boolean).join(" · ") : "";
    $("rPeriod").textContent = period;
    const photo = b && A.imageUrl(b.cardImage || b.profileImage);
    if (photo) {
      $("rPhoto").src = photo;
      $("rPhoto").hidden = false;
    }

    $("rTiles").innerHTML =
      tile(v.views, "Visitas al perfil") +
      tile(v.contacts, "Contactos iniciados", "WhatsApp · llamada · email · agendar") +
      tile(v.interactions, "Clics totales", "Interacciones con botones del perfil") +
      (v.videoStarts || (b && b.youtubeVideoId) ? tile(v.videoStarts, "Reproducciones de video") : "");

    $("rDaily").innerHTML = A.dailyColumns(v.daily, "views", "visitas al perfil");

    $("rGroups").innerHTML = v.groups.length
      ? v.groups
          .map((g) => `<div class="r-group"><h3>${A.esc(g.title)}</h3>${A.barList(
            g.items.map((i) => ({ label: i.label, n: i.value })),
            { total: 0 }
          )}${g.items.filter((i) => i.note).map((i) => `<p class="r-hint">${A.esc(i.label)}: ${A.esc(i.note)}</p>`).join("")}</div>`)
          .join("")
      : `<p class="empty">Sin interacciones registradas en este período.</p>`;

    $("rSources").innerHTML = A.barList(v.sources);
    $("rDevices").innerHTML = A.barList(v.devices);

    const gen = new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "America/Edmonton" }).format(new Date(stats.generated_at));
    $("rGenerated").textContent = `Generado el ${gen} · ${id}`;

    $("status").textContent = "";
    $("report").hidden = false;
  }

  $("printBtn").addEventListener("click", () => window.print());
  init();
})();
