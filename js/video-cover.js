/* =========================================================
   video-cover.js — Video de YouTube con portada (componente reutilizable)
   ---------------------------------------------------------
   Muestra la miniatura original del video (16:9) con un botón de
   reproducción encima. El reproductor de YouTube (iframe) solo se crea
   cuando la persona pulsa «Reproducir»; antes solo se pide la imagen.

   Uso:
     VideoCover.html({ id: "<youtubeId>", title: "Título" })  → HTML
     VideoCover.bind(contenedor)                              → activa los botones

   La miniatura usa la mejor resolución disponible (ver SIZES). Sin
   miniatura, queda el fondo oscuro del marco con el botón.
========================================================= */
(function () {
  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function thumb(id, size) {
    return "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/" + size + ".jpg";
  }

  function html(opts) {
    const id = opts.id;
    const title = opts.title || "Video";
    return `
      <div class="article-video__frame article-video__frame--cover" data-video-id="${esc(id)}" data-video-title="${esc(title)}">
        <img class="article-video__thumb" src="${thumb(id, "maxresdefault")}" alt="" loading="lazy" decoding="async" width="1280" height="720" data-video-thumb>
        <button type="button" class="article-video__play" data-video-play>
          <span class="article-video__play-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30"><polygon points="8,5 19,12 8,19" fill="currentColor"/></svg>
          </span>
          <span class="article-video__play-label">Reproducir video<span class="sr-only">: ${esc(title)}</span></span>
        </button>
      </div>`;
  }

  /* maxresdefault (1280×720) → sddefault (640×480) → hqdefault (480×360).
     Si una no existe, YouTube responde 404 con una imagen gris de 120×90. */
  const SIZES = ["maxresdefault", "sddefault", "hqdefault"];

  function fixThumb(img) {
    const frame = img.closest("[data-video-id]");
    if (!frame) return;
    const id = frame.getAttribute("data-video-id");
    let step = 0;
    const next = () => {
      step += 1;
      if (step < SIZES.length) img.src = thumb(id, SIZES[step]);
      else img.remove();
    };
    img.addEventListener("load", () => { if (img.naturalWidth && img.naturalWidth <= 120) next(); });
    img.addEventListener("error", next);
    if (img.complete && img.naturalWidth && img.naturalWidth <= 120) next();
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
    root.querySelectorAll("[data-video-thumb]").forEach(fixThumb);
    root.querySelectorAll("[data-video-play]").forEach((btn) => {
      if (btn.dataset.videoBound) return;
      btn.dataset.videoBound = "1";
      btn.addEventListener("click", () => {
        const frame = btn.closest("[data-video-id]");
        if (frame) play(frame);
      });
    });
  }

  window.VideoCover = { html, bind };
})();
