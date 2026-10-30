/*
  canada-reloj-localidad.js — Reloj local en las fichas completas de localidades
  ==============================================================================
  Monta el reloj de js/canada-reloj.js (mismo diseño que la guía provincial) en
  los elementos [data-reloj-localidad], con su zona horaria IANA (data-zona) y
  sus coordenadas (data-lat, data-lon) para el cálculo de día y noche. Solo se
  carga en las páginas de localidad que lo piden.
*/
(function () {
  "use strict";
  function iniciar() {
    if (!window.CDReloj) return;
    document.querySelectorAll("[data-reloj-localidad]").forEach((el) => {
      window.CDReloj.montar(el, { timeZone: el.dataset.zona, coords: [Number(el.dataset.lat), Number(el.dataset.lon)] });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
