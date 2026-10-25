/*
  canada-compartir.js — «Compartir esta guía» y «Copiar enlace»
  ======================================================================
  Fichas provinciales y de localidades de Canadá en Datos. El HTML lo
  genera scripts/canada-en-datos/compartir.mjs y funciona sin JavaScript
  (enlaces de WhatsApp, Facebook, X y correo). Este script agrega:
  - el menú nativo para compartir (Web Share API) cuando existe; si no,
    «Compartir esta guía» lleva el foco a los enlaces de redes;
  - copiar la URL permanente al portapapeles, con confirmación accesible.
  Siempre se comparte data-url (la URL canónica), no location.href.
*/
(function () {
  "use strict";

  document.querySelectorAll("[data-cd-share]").forEach((caja) => {
    const url = caja.dataset.url;
    const titulo = caja.dataset.titulo;
    const texto = caja.dataset.texto;
    const estado = caja.querySelector("[data-share-estado]");
    const redes = caja.querySelector("[data-share-redes]");
    let limpiar = null;

    function avisar(mensaje) {
      estado.textContent = mensaje;
      clearTimeout(limpiar);
      limpiar = setTimeout(() => (estado.textContent = ""), 6000);
    }

    function copiarConRespaldo() {
      const area = document.createElement("textarea");
      area.value = url;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      area.remove();
      return ok;
    }

    caja.querySelector("[data-share-copiar]").addEventListener("click", () => {
      const listo = () => avisar("Enlace copiado. Ya puedes pegarlo en WhatsApp, Facebook o donde quieras.");
      const fallo = () => avisar(`No se pudo copiar automáticamente. Copia este enlace: ${url}`);
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(listo, () => (copiarConRespaldo() ? listo() : fallo()));
      } else if (copiarConRespaldo()) listo();
      else fallo();
    });

    caja.querySelector("[data-share-nativo]").addEventListener("click", () => {
      if (navigator.share) {
        navigator.share({ title: titulo, text: texto, url }).catch((e) => {
          /* Cancelar el menú no es un error */
          if (e && e.name !== "AbortError") avisar("No se pudo abrir el menú para compartir. Usa los enlaces de abajo o copia el enlace.");
        });
      } else {
        redes.classList.add("es-destacado");
        const primero = redes.querySelector("a");
        if (primero) primero.focus();
        avisar("Elige dónde compartir: WhatsApp, Facebook, X o correo. También puedes copiar el enlace.");
      }
    });
  });
})();
