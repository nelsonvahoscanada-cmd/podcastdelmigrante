/*
  canada-reloj.js — Reloj local de «Canadá en Datos»
  ======================================================================
  Hora de 12 horas con segundos, fecha y día/noche de una zona horaria
  IANA (la de la capital de cada región). Sin dependencias: usa la
  internacionalización del navegador (Intl), que aplica sola el horario
  de verano de cada zona.

  Día/noche: salida y puesta del sol calculadas para las coordenadas de
  la capital con la ecuación de la salida del sol (aproximación de la
  NOAA, error de pocos minutos). Contempla el sol de medianoche y la
  noche polar del norte.

  API: window.CDReloj.montar(contenedor, { timeZone, coords, label })
  devuelve { cambiar(opciones), detener() }. El contenedor debe tener los
  elementos [data-reloj-hora], [data-reloj-fecha], [data-reloj-fase] y,
  opcionalmente, [data-reloj-etiqueta].
  También se exporta para Node (pruebas): module.exports = CDReloj.
*/

(function (global) {
  "use strict";

  const RAD = Math.PI / 180;

  /* Salida y puesta del sol (UTC, en ms) del día de `fecha` en lat/lon.
     Devuelve { salida, puesta } o { polar: "dia" | "noche" }. */
  function sol(fecha, lat, lon) {
    const jd = fecha.getTime() / 86400000 + 2440587.5;
    const n = Math.round(jd - 2451545.0 + 0.0008);
    const jEstrella = n - lon / 360;
    const M = (357.5291 + 0.98560028 * jEstrella) % 360;
    const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
    const lambda = (M + C + 180 + 102.9372) % 360;
    const jTransito = 2451545.0 + jEstrella + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
    const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosW = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
    if (cosW < -1) return { polar: "dia" };
    if (cosW > 1) return { polar: "noche" };
    const w = Math.acos(cosW) / RAD;
    const aMs = (j) => (j - 2440587.5) * 86400000;
    return { salida: aMs(jTransito - w / 360), puesta: aMs(jTransito + w / 360) };
  }

  /* El «día» del cálculo es el día solar más cercano en UTC: al anochecer en
     el oeste de Canadá ya es el día siguiente en UTC. Por eso se revisan el
     día anterior, el actual y el siguiente. */
  function esDeDia(fecha, lat, lon) {
    const t = fecha.getTime();
    const actual = sol(fecha, lat, lon);
    if (actual.polar) return actual.polar === "dia";
    for (const desfase of [-1, 0, 1]) {
      const s = desfase ? sol(new Date(t + desfase * 86400000), lat, lon) : actual;
      if (!s.polar && t >= s.salida && t < s.puesta) return true;
    }
    return false;
  }

  /* Partes de la hora en 12 horas para una zona: { hora, minutos, segundos, periodo, fecha } */
  function partes(fecha, timeZone) {
    const hora = new Intl.DateTimeFormat("es-CA", {
      timeZone, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
    }).formatToParts(fecha);
    const get = (t) => (hora.find((p) => p.type === t) || {}).value || "";
    const fechaTexto = new Intl.DateTimeFormat("es-CA", {
      timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(fecha);
    return {
      hora: get("hour"),
      minutos: get("minute"),
      segundos: get("second"),
      periodo: get("dayPeriod").replace(/\s+/g, " ").trim(),
      fecha: fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1),
    };
  }

  const ICONO_SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke-linecap="round"/></svg>';
  const ICONO_LUNA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" stroke-linejoin="round"/></svg>';

  function montar(contenedor, opciones) {
    let op = Object.assign({}, opciones);
    const elHora = contenedor.querySelector("[data-reloj-hora]");
    const elFecha = contenedor.querySelector("[data-reloj-fecha]");
    const elFase = contenedor.querySelector("[data-reloj-fase]");
    const elEtiqueta = contenedor.querySelector("[data-reloj-etiqueta]");
    let temporizador = null;
    let faseActual = null;

    function pintar() {
      const ahora = new Date();
      let p;
      try {
        p = partes(ahora, op.timeZone);
      } catch (e) {
        elHora.textContent = "Hora no disponible";
        return;
      }
      elHora.innerHTML = `${p.hora}:${p.minutos}<span class="cd-clock__sec">:${p.segundos}</span><span class="cd-clock__ampm">${p.periodo}</span>`;
      elHora.setAttribute("datetime", ahora.toISOString());
      elFecha.textContent = p.fecha;
      const dia = op.coords ? esDeDia(ahora, op.coords[0], op.coords[1]) : null;
      const fase = dia === null ? "" : dia ? "dia" : "noche";
      if (fase !== faseActual) {
        faseActual = fase;
        contenedor.classList.toggle("cd-clock--dia", fase === "dia");
        contenedor.classList.toggle("cd-clock--noche", fase === "noche");
        if (elFase) elFase.innerHTML = fase ? (fase === "dia" ? ICONO_SOL : ICONO_LUNA) + `<span>${fase === "dia" ? "De día" : "De noche"}</span>` : "";
      }
    }

    function programar() {
      detener();
      pintar();
      /* Alinea la actualización con el cambio de segundo */
      temporizador = setTimeout(function tic() {
        pintar();
        temporizador = setTimeout(tic, 1000 - (Date.now() % 1000) + 5);
      }, 1000 - (Date.now() % 1000) + 5);
    }

    function detener() {
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
    }

    document.addEventListener("visibilitychange", () => (document.hidden ? detener() : programar()));
    if (elEtiqueta && op.label) elEtiqueta.textContent = op.label;
    programar();

    return {
      cambiar(nuevas) {
        op = Object.assign({}, op, nuevas);
        faseActual = null;
        if (elEtiqueta && op.label) elEtiqueta.textContent = op.label;
        programar();
      },
      detener,
    };
  }

  const CDReloj = { sol, esDeDia, partes, montar };
  if (typeof module !== "undefined" && module.exports) module.exports = CDReloj;
  else global.CDReloj = CDReloj;
})(typeof window !== "undefined" ? window : globalThis);
