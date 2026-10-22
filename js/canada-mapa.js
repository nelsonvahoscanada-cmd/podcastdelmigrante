/*
  canada-mapa.js — Mapa interactivo y panel de «Canadá en Datos»
  ======================================================================
  Página: canada-en-datos/index.html (la genera
  scripts/build-canada-datos.mjs con el SVG y el panel de Alberta ya
  escritos en el HTML, para que funcione también sin JavaScript).

  - Mapa: cada región es un <path role="button" aria-pressed>. Tabulador
    con «roving tabindex»: solo la región activa entra en el orden de
    tabulación; las flechas recorren las 13 regiones (de oeste a este) y
    Enter/Espacio la seleccionan. Debajo, la lista de botones es la
    alternativa accesible (y la forma cómoda de elegir la Isla del
    Príncipe Eduardo en un celular).
  - Panel: se reescribe al seleccionar y se anuncia con aria-live.
  - La selección queda en la URL (#alberta) para compartirla.
  Requiere js/canada-datos.js y js/canada-reloj.js.
*/

(function () {
  "use strict";

  const mapa = document.getElementById("cdMap");
  const panel = document.getElementById("cdPanel");
  if (!mapa || !panel || typeof CD_REGIONS === "undefined") return;

  const porCodigo = new Map(CD_REGIONS.map((r) => [r.code, r]));
  const porSlug = new Map(CD_REGIONS.map((r) => [r.slug, r]));
  const trazos = Array.from(mapa.querySelectorAll(".cd-region"));
  const chips = Array.from(document.querySelectorAll(".cd-chip"));
  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let reloj = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  /* Formato numérico del portal (convención canadiense): 5,101,050 · 7.2% · $37.35 · 95.63.
     Propio y sin Intl, para que la página generada y el navegador muestren lo mismo. */
  function formatoValor(ind) {
    const [entero, decimales] = Math.abs(ind.value).toFixed(ind.decimals ?? 0).split(".");
    const num = (ind.value < 0 ? "-" : "") + entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (decimales ? "." + decimales : "");
    if (ind.format === "moneda") return "$" + num;
    return ind.format === "porcentaje" ? num + "%" : num;
  }

  function filaIndicador(ind) {
    if (!ind) return "";
    if (ind.value === null || ind.value === undefined) {
      return `<div class="cd-fact"><dt>${esc(ind.label)}</dt><dd><span class="cd-pending">Pendiente de verificación</span></dd></div>`;
    }
    const unidad = ind.format === "moneda" && /^(CAD )?(por|al)\b/.test(ind.unit) ? ` ${esc(ind.unit)}` : "";
    return `<div class="cd-fact"><dt>${esc(ind.label)}</dt><dd>${esc(formatoValor(ind))}${unidad}<small class="cd-fact__period">${esc(ind.refPeriod)}</small></dd></div>`;
  }

  function contenidoPanel(r) {
    const perfil = r.profile && typeof CD_PROFILES !== "undefined" ? CD_PROFILES[r.profile] : null;
    const tipo = r.type === "territorio" ? "Territorio" : "Provincia";
    const nota = r.multiZone
      ? `${esc(r.name)} tiene más de una zona horaria: el reloj muestra la hora de ${esc(r.capital)}.`
      : `Hora oficial de ${esc(r.capital)}.`;
    const indicadores = perfil
      ? perfil.summary.map((k) => filaIndicador(perfil.indicators[k])).join("")
      : '<div class="cd-fact"><dt>Población e indicadores</dt><dd><span class="cd-pending">Próximamente</span></dd></div>';
    const cta = perfil
      ? `<a class="btn" href="/canada-en-datos/${esc(r.profile)}">Ver la ficha completa de ${esc(r.name)}</a>`
      : `<span class="cd-soon">Ficha completa: próximamente</span>`;
    return `
      <p class="cd-panel__type">${tipo}</p>
      <h2 class="cd-panel__name" id="cdPanelTitle">${esc(r.name)}</h2>
      <div class="cd-clock" id="cdClock">
        <span class="cd-clock__label" data-reloj-etiqueta>Hora local en ${esc(r.capital)}</span>
        <time class="cd-clock__time" data-reloj-hora role="timer" aria-live="off">—</time>
        <span class="cd-clock__date" data-reloj-fecha></span>
        <span class="cd-clock__phase" data-reloj-fase></span>
      </div>
      <dl class="cd-facts">
        <div class="cd-fact"><dt>Capital</dt><dd>${esc(r.capital)}</dd></div>
        ${indicadores}
      </dl>
      <p class="cd-panel__note">${nota}</p>
      <div class="cd-panel__cta">${cta}</div>`;
  }

  function seleccionar(r, opciones = {}) {
    trazos.forEach((p) => {
      const activo = p.dataset.code === r.code;
      p.setAttribute("aria-pressed", activo ? "true" : "false");
      p.setAttribute("tabindex", activo ? "0" : "-1");
    });
    chips.forEach((c) => c.setAttribute("aria-pressed", c.dataset.code === r.code ? "true" : "false"));
    panel.innerHTML = contenidoPanel(r);
    if (reloj) reloj.detener();
    reloj = window.CDReloj.montar(document.getElementById("cdClock"), { timeZone: r.timeZone, coords: r.coords });
    /* Anuncio breve para lectores de pantalla (el panel no es aria-live: el reloj cambia cada segundo) */
    const anuncio = document.getElementById("cdAnuncio");
    if (anuncio && opciones.historial !== false) anuncio.textContent = `Seleccionaste ${r.name}. Capital: ${r.capital}.`;
    if (opciones.historial !== false) history.replaceState(null, "", "#" + r.slug);
    if (opciones.mostrarPanel && window.innerWidth < 1024) {
      const caja = panel.getBoundingClientRect();
      if (caja.top > window.innerHeight * 0.75 || caja.bottom < 0) {
        panel.scrollIntoView({ behavior: reducirMovimiento ? "auto" : "smooth", block: "start" });
      }
    }
  }

  function regionDe(el) {
    return porCodigo.get(el.closest("[data-code]").dataset.code);
  }

  trazos.forEach((p, i) => {
    p.addEventListener("click", () => seleccionar(regionDe(p), { mostrarPanel: true }));
    p.addEventListener("keydown", (e) => {
      const orden = CD_REGIONS.map((r) => r.code);
      const actual = orden.indexOf(p.dataset.code);
      let destino = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") destino = orden[(actual + 1) % orden.length];
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") destino = orden[(actual - 1 + orden.length) % orden.length];
      else if (e.key === "Home") destino = orden[0];
      else if (e.key === "End") destino = orden[orden.length - 1];
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        seleccionar(regionDe(p));
        return;
      }
      if (destino) {
        e.preventDefault();
        const siguiente = mapa.querySelector(`.cd-region[data-code="${destino}"]`);
        trazos.forEach((t) => t.setAttribute("tabindex", t === siguiente ? "0" : "-1"));
        siguiente.focus();
      }
    });
  });

  chips.forEach((c) => c.addEventListener("click", () => seleccionar(porCodigo.get(c.dataset.code), { mostrarPanel: true })));

  window.addEventListener("hashchange", () => {
    const r = porSlug.get(decodeURIComponent(location.hash.slice(1)));
    if (r) seleccionar(r, { historial: false });
  });

  const inicial = porSlug.get(decodeURIComponent(location.hash.slice(1))) || porCodigo.get("AB");
  seleccionar(inicial, { historial: false });
})();
