/*
  invitacion.js — Página /invitacion del Directorio Empresarial
  ======================================================================
  El enlace trae el código después de «#» (…/invitacion#c=CODIGO): el
  navegador no lo envía al servidor al pedir la página, ni en el Referer.
  Este script:
    1. lee el código y lo BORRA de inmediato de la barra de direcciones
       (history.replaceState), para que no quede al copiar o compartir;
    2. lo comprueba con POST /registro/invitacion (en el cuerpo, nunca en la
       URL); el servidor decide si es válido: nada se confía al navegador;
    3. muestra el mensaje según el tipo (cortesía, Premium pagada, gratuita)
       o el error (inválida, ya utilizada, retirada, no disponible);
    4. «Activar mi membresía» guarda el código solo en sessionStorage de esta
       pestaña y abre el formulario de registro con el plan fijado. El canje
       ocurre en el servidor al enviar el formulario completo.
  Nada se publica desde aquí: la solicitud pasa por la revisión manual.
*/
(function () {
  "use strict";

  var ENDPOINT = "/registro/invitacion";
  var STORE = "pdm-invitacion";
  var CODE_RE = /^[A-Za-z0-9_-]{32}$/;
  var TITLES = { PREMIUM_GIFT: "¡Bienvenido a Premium!", PREMIUM_PAID: "Tu invitación Premium", FREE: "Tu invitación al directorio" };
  var ERRORS = {
    invalida: "Esta invitación no es válida. Revisa que hayas abierto el enlace completo que recibiste.",
    usada: "Esta invitación ya fue utilizada.",
    retirada: "Esta invitación ya no está disponible.",
    no_disponible: "Las invitaciones no están disponibles en este momento. Inténtalo más tarde.",
    red: "No pudimos comprobar tu invitación. Revisa tu conexión e inténtalo de nuevo.",
  };

  function readStore() {
    try {
      var v = JSON.parse(sessionStorage.getItem(STORE) || "null");
      return v && CODE_RE.test(v.code || "") ? v : null;
    } catch (e) {
      return null;
    }
  }
  function writeStore(v) {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  }
  function clearStore() {
    try {
      sessionStorage.removeItem(STORE);
    } catch (e) {}
  }

  /* 1. Código del fragmento, y fuera de la barra de direcciones */
  var code = "";
  var m = /(?:^#|&)c=([^&]*)/.exec(window.location.hash || "");
  if (m) {
    try {
      code = decodeURIComponent(m[1]).trim();
    } catch (e) {
      code = "";
    }
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (e) {
      window.location.hash = "";
    }
  } else {
    var saved = readStore();
    if (saved) code = saved.code;
  }

  function $(s) {
    return document.querySelector(s);
  }

  function show(state, data) {
    var card = $("#invCard");
    card.setAttribute("aria-busy", "false");
    document.querySelectorAll(".inv-state").forEach(function (el) {
      el.hidden = el.getAttribute("data-state") !== state;
    });
    var box = document.querySelector('.inv-state[data-state="' + state + '"]');
    if (state === "error") {
      $("#invTitle").textContent = "Tu invitación";
      box.querySelector("[data-error-text]").textContent = data;
      $("#invActions").hidden = true;
      return;
    }
    $("#invTitle").textContent = TITLES[state] || "Tu invitación";
    document.title = (TITLES[state] || "Tu invitación") + " | El Podcast del Migrante";
    var forEl = box.querySelector("[data-for]");
    if (forEl && data.businessName) {
      forEl.textContent = "Invitación para " + data.businessName + (data.contactName ? " · " + data.contactName : "");
      forEl.hidden = false;
    }
    if (data.registroAbierto === false) {
      $("#invActions").hidden = true;
      $("#invClosed").hidden = false;
    } else {
      $("#invActions").hidden = false;
      $("#invActivate").textContent = state === "PREMIUM_GIFT" ? "Activar mi membresía" : state === "FREE" ? "Crear mi ficha gratis" : "Solicitar mi Perfil Premium";
    }
  }

  async function check() {
    if (!CODE_RE.test(code)) {
      clearStore();
      show("error", ERRORS.invalida);
      return;
    }
    var res, body;
    try {
      res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ code: code }), credentials: "same-origin", cache: "no-store" });
      body = await res.json().catch(function () {
        return null;
      });
    } catch (e) {
      show("error", ERRORS.red);
      return;
    }
    if (!res.ok || !body || !body.ok || !TITLES[body.kind]) {
      var key = body && body.code;
      if (key === "invalida" || key === "usada" || key === "retirada") clearStore();
      show("error", ERRORS[key] || (body && body.error) || ERRORS.red);
      return;
    }
    var invitation = { code: code, kind: body.kind, label: body.label, price: body.price, plan: body.plan, businessName: body.businessName || "" };
    show(body.kind, body);
    $("#invActivate").onclick = function () {
      if (!writeStore(invitation)) {
        show("error", "Tu navegador no permite continuar (almacenamiento desactivado). Abre el enlace en otro navegador o escríbenos.");
        return;
      }
      window.location.href = "registra-tu-empresa?plan=" + encodeURIComponent(invitation.plan) + "&invitacion=1#solicitud";
    };
  }

  function start() {
    if (window.PDM && window.PDM.initSiteChrome) window.PDM.initSiteChrome();
    check();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
