/* =========================================================
   video-cover.js — Video de YouTube con portada (componente reutilizable)
   ---------------------------------------------------------
   Muestra la portada del video (16:9) con un botón de reproducción
   encima. Privacidad:
   - Al abrir la página NO se contacta a YouTube: la portada es una copia
     local de la miniatura (assets/yt/<id>.jpg, solo videos propios,
     registrados en LOCAL_THUMBS) o, si no la tenemos, una imagen local
     neutra (assets/yt/sin-miniatura.svg).
   - El reproductor (youtube-nocookie.com) solo se crea cuando la persona
     pulsa «Reproducir». El botón lleva un aviso breve: al reproducir se
     conecta con YouTube. No se guarda ninguna aceptación ni cookie.

   Uso:
     VideoCover.html({ id: "<youtubeId>", title: "Título" })  → HTML
     VideoCover.bind(contenedor)                              → activa los botones
     VideoCover.thumb(id)        → ruta local de la portada (o la neutra)
     VideoCover.noteHtml()       → aviso de privacidad para otros reproductores

   Para añadir la miniatura de un video PROPIO: guardar el archivo en
   assets/yt/<id>.jpg (scripts/descargar-miniaturas.py) y registrarlo en
   LOCAL_THUMBS con su ruta, ancho y alto reales.
========================================================= */
(function () {
  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Miniaturas propias alojadas en el sitio: id → [ruta, ancho, alto].
     La ruta completa permite que scripts/build-public.mjs compruebe que
     cada archivo existe antes de publicar. */
  const LOCAL_THUMBS = {
    /* Canal oficial @ElPodcastDelMigranteOficial (confirmado por Nelson,
       18 de octubre de 2026). Archivos originales sin modificar. */
    "O5on_J9cRb4": ["/assets/yt/O5on_J9cRb4.jpg", 1280, 720],
    "AnAZeaE7LV4": ["/assets/yt/AnAZeaE7LV4.jpg", 1280, 720],
    "z2Ih590xSP4": ["/assets/yt/z2Ih590xSP4.jpg", 1280, 720],
    "3tOZfCwZWN8": ["/assets/yt/3tOZfCwZWN8.jpg", 1280, 720],
    "ENyFwvkj8W0": ["/assets/yt/ENyFwvkj8W0.jpg", 1280, 720],
    "jw0cYzjV35U": ["/assets/yt/jw0cYzjV35U.jpg", 1280, 720],
    "M7JFiyvPDT8": ["/assets/yt/M7JFiyvPDT8.jpg", 1280, 720],
    "0rFRBV7wYqM": ["/assets/yt/0rFRBV7wYqM.jpg", 1280, 720],
    "2RcMF0Uiz2Y": ["/assets/yt/2RcMF0Uiz2Y.jpg", 1280, 720],
    "xJaXI3r83sA": ["/assets/yt/xJaXI3r83sA.jpg", 1280, 720],
    "bDhX_XW2bE0": ["/assets/yt/bDhX_XW2bE0.jpg", 1280, 720],
    "UloNyWGYEXo": ["/assets/yt/UloNyWGYEXo.jpg", 1280, 720],
    "oqfNbzC_OLA": ["/assets/yt/oqfNbzC_OLA.jpg", 1280, 720],
    "6YdTsBzG2gs": ["/assets/yt/6YdTsBzG2gs.jpg", 1280, 720],
    "UsWWtkmnszw": ["/assets/yt/UsWWtkmnszw.jpg", 1280, 720],
    "EEqjez0MuAY": ["/assets/yt/EEqjez0MuAY.jpg", 1280, 720],
  };
  const PLACEHOLDER = "/assets/yt/sin-miniatura.svg";
  const NOTE = "Al reproducir, te conectas con YouTube, que puede usar cookies de seguimiento.";

  function thumb(id) {
    return LOCAL_THUMBS[id] ? LOCAL_THUMBS[id][0] : PLACEHOLDER;
  }

  function noteHtml() {
    return `<span class="video-privacy-note">${NOTE}</span>`;
  }

  function html(opts) {
    const id = opts.id;
    const title = opts.title || "Video";
    const playLabel = opts.playLabel || "Reproducir video";
    const size = LOCAL_THUMBS[id] ? LOCAL_THUMBS[id].slice(1) : [1280, 720];
    return `
      <div class="article-video__frame article-video__frame--cover" data-video-id="${esc(id)}" data-video-title="${esc(title)}">
        <img class="article-video__thumb" src="${thumb(id)}" alt="" loading="lazy" decoding="async" width="${size[0]}" height="${size[1]}">
        <button type="button" class="article-video__play" data-video-play>
          <span class="article-video__play-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30"><polygon points="8,5 19,12 8,19" fill="currentColor"/></svg>
          </span>
          <span class="article-video__play-label">${esc(playLabel)}<span class="sr-only">: ${esc(title)}</span></span>
          ${noteHtml()}
        </button>
      </div>`;
  }

  function play(frame) {
    const iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(frame.getAttribute("data-video-id")) + "?autoplay=1&rel=0";
    iframe.title = frame.getAttribute("data-video-title") || "Video";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    frame.classList.remove("article-video__frame--cover");
    frame.replaceChildren(iframe);
    iframe.focus();
  }

  function bind(root) {
    root.querySelectorAll("[data-video-play]").forEach((btn) => {
      if (btn.dataset.videoBound) return;
      btn.dataset.videoBound = "1";
      btn.addEventListener("click", () => {
        const frame = btn.closest("[data-video-id]");
        if (frame) play(frame);
      });
    });
  }

  window.VideoCover = { html, bind, thumb, noteHtml, NOTE };
})();
