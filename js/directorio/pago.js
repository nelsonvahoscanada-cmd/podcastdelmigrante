/*
  Página /pago — Enlace individual de pago del Perfil Empresarial Premium.
  El token llega después de «#» (nunca se envía al servidor al abrir la página,
  ni a la analítica, ni al Referer). Se borra de la barra de direcciones al
  leerlo y queda solo en sessionStorage de esta pestaña.
  Flujo: POST /pagos/enlace → condiciones → aceptar → POST /pagos/checkout →
  redirección a la página de pago de Stripe.
*/
(function () {
  "use strict";
  const KEY = "pdm-pago-token";
  const card = document.getElementById("pagoCard");
  const show = (state) => {
    card.querySelectorAll(".inv-state").forEach((el) => (el.hidden = el.dataset.state !== state));
    card.setAttribute("aria-busy", state === "cargando" ? "true" : "false");
  };
  const error = (msg) => {
    card.querySelector("[data-error-text]").textContent = msg;
    show("error");
  };
  const params = new URLSearchParams(location.search);
  const m = /(?:^|[#&])t=([A-Za-z0-9_-]{32})(?:&|$)/.exec(location.hash);
  if (m) {
    try { sessionStorage.setItem(KEY, m[1]); } catch (e) { /* sin almacenamiento: se usa solo en memoria */ }
    history.replaceState(null, "", location.pathname + location.search);
  }
  let token = m ? m[1] : null;
  try { token = token || sessionStorage.getItem(KEY); } catch (e) { /* nada */ }
  if (params.get("cancelado") === "1" && !token) return show("cancelado");
  if (!token) return error("Abre esta página con el enlace de pago que te enviamos.");

  const ETIQUETAS = [
    ["precio", "Precio"],
    ["impuestos", "Impuestos"],
    ["inicio", "Inicio del período contratado"],
    ["entrega", "Plazo de entrega de tu miniweb"],
    ["renovacion", "Renovación"],
    ["permanencia", "Permanencia"],
    ["cancelacion", "Cancelación"],
    ["devolucion", "Devolución"],
    ["impago", "Si un pago es rechazado"],
  ];
  let version = "";

  fetch("/pagos/enlace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
    .then((r) => r.json().catch(() => ({})))
    .then((d) => {
      if (!d.ok) return error(d.error || "No pudimos comprobar tu enlace de pago.");
      version = d.condiciones.version;
      card.querySelector("[data-for]").textContent = "Para: " + d.negocio;
      document.getElementById("pagoTest").hidden = !d.modoPrueba;
      const dl = document.getElementById("pagoTerms");
      dl.textContent = "";
      for (const [k, label] of ETIQUETAS) {
        if (!d.condiciones[k]) continue;
        const row = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = k === "precio" ? d.condiciones.precio + " + impuestos aplicables" : d.condiciones[k];
        row.append(dt, dd);
        dl.appendChild(row);
      }
      if (params.get("cancelado") === "1") {
        const e = document.getElementById("pagoError");
        e.textContent = "No se realizó ningún pago. Puedes intentarlo de nuevo.";
        e.hidden = false;
      }
      show("valido");
    })
    .catch(() => error("No pudimos comprobar tu enlace de pago. Revisa tu conexión e intenta de nuevo."));

  const accept = document.getElementById("pagoAccept");
  const go = document.getElementById("pagoGo");
  accept.addEventListener("change", () => (go.disabled = !accept.checked));
  go.addEventListener("click", () => {
    if (!accept.checked || go.dataset.busy) return;
    go.dataset.busy = "1";
    go.disabled = true;
    go.textContent = "Abriendo el pago seguro…";
    const err = document.getElementById("pagoError");
    err.hidden = true;
    fetch("/pagos/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, aceptaCondiciones: true, condiciones: version }) })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (d.ok && /^https:\/\/checkout\.stripe\.com\//.test(d.url)) {
          location.assign(d.url);
          return;
        }
        throw new Error(d.error || "No pudimos abrir la página de pago.");
      })
      .catch((e) => {
        delete go.dataset.busy;
        go.disabled = !accept.checked;
        go.textContent = "Ir al pago seguro";
        err.textContent = e.message || "No pudimos abrir la página de pago.";
        err.hidden = false;
      });
  });
})();
