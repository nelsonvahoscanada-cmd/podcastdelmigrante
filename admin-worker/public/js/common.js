/*
  common.js — API, directorio de empresas y gráficas (SVG/HTML, sin librerías).
*/
(function () {
  "use strict";
  const A = window.PDMAdmin;
  const SITE = "https://podcastdelmigrante.com";

  async function api(path) {
    const res = await fetch(path, { credentials: "same-origin", headers: { Accept: "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  /* Registro público del sitio (js/businesses.js). Es la misma fuente que usa
     la plantilla de perfiles: agregar BIZ-003 allí basta para que aparezca. */
  function siteBusinesses() {
    try {
      /* global BUSINESSES */
      return typeof BUSINESSES !== "undefined" && Array.isArray(BUSINESSES) ? BUSINESSES : [];
    } catch (e) {
      return [];
    }
  }

  /* Une businesses.js con las empresas que ya tienen eventos en D1. */
  async function loadDirectory() {
    const { businesses: withData } = await api("/api/businesses");
    const map = new Map();
    for (const b of siteBusinesses()) {
      if (!b || !/^BIZ-\d{3,6}$/.test(b.id)) continue;
      map.set(b.id, { id: b.id, slug: b.slug, name: b.name, record: b, events: 0, firstSeen: "" });
    }
    for (const r of withData) {
      const cur = map.get(r.business_id) || { id: r.business_id, slug: r.business_slug, name: "", record: null, events: 0, firstSeen: "" };
      cur.events += r.events;
      if (!cur.firstSeen || r.first_seen < cur.firstSeen) cur.firstSeen = r.first_seen;
      if (!cur.slug) cur.slug = r.business_slug;
      map.set(r.business_id, cur);
    }
    return [...map.values()].sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  }

  const imageUrl = (path) => (path ? (/^https?:/.test(path) ? path : `${SITE}/${path.replace(/^\//, "")}`) : "");

  /* Barras horizontales (una sola serie: un solo color, valor como texto). */
  function barList(items, opts) {
    const o = Object.assign({ total: null, unit: "" }, opts);
    if (!items.length) return `<p class="empty">Sin registros en este período.</p>`;
    const max = Math.max(...items.map((i) => i.n), 1);
    const total = o.total == null ? items.reduce((s, i) => s + i.n, 0) : o.total;
    return `<ul class="bars">${items
      .map((i) => {
        const w = Math.max((i.n / max) * 100, i.n ? 2 : 0);
        const share = total ? ` · ${A.pct(i.n, total)}%` : "";
        return `<li class="bars__row" title="${A.esc(i.label)}: ${A.fmt(i.n)}${share}">
          <span class="bars__label">${A.esc(i.label)}</span>
          <svg class="bars__track" width="100%" height="10" aria-hidden="true"><rect class="bars__bg" width="100%" height="10" rx="2"/>${i.n ? `<rect class="bars__fill" width="${w.toFixed(1)}%" height="10" rx="2"/>` : ""}</svg>
          <span class="bars__value">${A.fmt(i.n)}<small>${share}</small></span>
        </li>`;
      })
      .join("")}</ul>`;
  }

  function niceMax(v) {
    if (v <= 4) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  }

  /* Columnas por día (una serie). Tooltip nativo por columna; zona activa
     de todo el ancho del día, más grande que la marca. */
  function dailyColumns(daily, key, label) {
    const W = 720, H = 200, padL = 34, padR = 8, padT = 10, padB = 26;
    const n = daily.length || 1;
    const max = niceMax(Math.max(...daily.map((d) => d[key]), 0));
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const step = plotW / n;
    const barW = Math.max(Math.min(step - 2, 18), 2);
    const y = (v) => padT + plotH - (v / max) * plotH;

    const grid = [0, max / 2, max]
      .map((t) => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" class="chart__grid"/>
        <text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end" class="chart__tick">${A.fmt(t)}</text>`)
      .join("");

    const bars = daily
      .map((d, i) => {
        const v = d[key];
        const x = padL + i * step;
        const h = (v / max) * plotH;
        const day = Number(d.date.slice(8));
        const r = Math.min(4, barW / 2, h);
        const bx = x + (step - barW) / 2, top = padT + plotH - h;
        /* esquinas redondeadas solo arriba; la base queda recta sobre el eje */
        const path = h > 0
          ? `<path class="chart__bar" d="M${bx},${padT + plotH} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + barW - r} Q${bx + barW},${top} ${bx + barW},${top + r} V${padT + plotH} Z"/>`
          : "";
        const tick = day === 1 || day % 5 === 0 ? `<text x="${x + step / 2}" y="${H - 8}" text-anchor="middle" class="chart__tick">${day}</text>` : "";
        return `<g class="chart__day"><title>${d.date}: ${A.fmt(v)} ${A.esc(label)}</title>
          <rect x="${x}" y="${padT}" width="${step}" height="${plotH}" class="chart__hit"/>${path}${tick}</g>`;
      })
      .join("");

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${A.esc(label)} por día">
      ${grid}${bars}<line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" class="chart__axis"/></svg>`;
  }

  /* Tabla equivalente para accesibilidad/impresión. */
  function dailyTable(daily) {
    const rows = daily.filter((d) => d.views || d.clicks);
    if (!rows.length) return `<p class="empty">Sin registros en este período.</p>`;
    return `<table class="table"><thead><tr><th>Día</th><th>Visitas al perfil</th><th>Clics</th></tr></thead><tbody>${rows
      .map((d) => `<tr><td>${d.date}</td><td>${A.fmt(d.views)}</td><td>${A.fmt(d.clicks)}</td></tr>`)
      .join("")}</tbody></table>`;
  }

  Object.assign(A, { api, loadDirectory, imageUrl, barList, dailyColumns, dailyTable, SITE });
})();
