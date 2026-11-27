/*
  Página /pago-confirmado — Regreso desde Stripe Checkout. NO activa nada:
  solo consulta si el webhook firmado ya confirmó el pago (/pagos/estado).
*/
(function () {
  "use strict";
  const card = document.getElementById("confCard");
  const show = (s) => {
    card.querySelectorAll(".inv-state").forEach((el) => (el.hidden = el.dataset.state !== s));
    card.setAttribute("aria-busy", s === "pendiente" ? "true" : "false");
  };
  try { sessionStorage.removeItem("pdm-pago-token"); } catch (e) { /* nada */ }
  const id = new URLSearchParams(location.search).get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(id)) return show("demora");
  history.replaceState(null, "", location.pathname);
  let tries = 0;
  (function check() {
    fetch("/pagos/estado?session_id=" + encodeURIComponent(id))
      .then((r) => r.json())
      .then((d) => {
        if (d.estado === "confirmado") {
          if (d.portal && /^https:\/\//.test(d.portal)) {
            const a = document.getElementById("confPortal");
            a.href = d.portal;
            a.hidden = false;
          }
          return show("confirmado");
        }
        if (++tries < 10) return setTimeout(check, 3000);
        show("demora");
      })
      .catch(() => (++tries < 10 ? setTimeout(check, 3000) : show("demora")));
  })();
})();
