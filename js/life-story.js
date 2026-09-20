/*
  life-story.js — Plantilla de Historias de vida
  ======================================================================
  Una sola plantilla para las tres (y futuras) historias de vida,
  leída desde js/life-stories.js por slug — mismo patrón técnico que
  desafio-story.js (incluido el video cover), pero sin patrocinio ni
  disclaimer: no corresponden a este tipo de contenido.
========================================================================= */

(function () {
  "use strict";

  const SITE_ORIGIN = "https://podcastdelmigrante.com";

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function findStory(slug) {
    return LIFE_STORIES.find((s) => s.slug === slug) || null;
  }

  function canonicalUrl(story) {
    return SITE_ORIGIN + story.seo.canonicalPath;
  }

  function youtubeThumb(id) {
    return "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";
  }

  function heroMediaHtml(story) {
    return `<div class="article-hero-media" style="background-image:url('${youtubeThumb(story.videoId)}')" role="img" aria-label="${story.title}"></div>`;
  }

  function protagonistaHtml(story) {
    const name = story.akaName ? `${story.protagonista} — "${story.akaName}"` : story.protagonista;
    return `<p class="byline article-byline">${name}</p>`;
  }

  function videoHtml(story) {
    const startParamAutoplay = story.videoStart ? `?start=${story.videoStart}&autoplay=1` : "?autoplay=1";
    const watchUrl = `https://www.youtube.com/watch?v=${story.videoId}` + (story.videoStart ? `&t=${story.videoStart}s` : "");
    return `
      <section class="article-video">
        <div class="video-cover" id="videoCover" data-embed-src="https://www.youtube.com/embed/${story.videoId}${startParamAutoplay}" data-title="${story.title}">
          <div class="video-cover__thumb" style="background-image:url('${youtubeThumb(story.videoId)}')" role="img" aria-label="${story.title}"></div>
          <button type="button" class="video-cover__play" id="videoCoverBtn" aria-label="Ver historia">
            <span class="video-cover__play-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
            </span>
            <span class="video-cover__play-label">Ver historia</span>
          </button>
          <span class="video-cover__kicker">${LIFE_STORIES_COLLECTION}</span>
        </div>
        <div class="article-video__frame" id="videoFrame" hidden></div>
        <a class="video-cover__yt-link" href="${watchUrl}" target="_blank" rel="noopener">Ver directamente en YouTube ↗</a>
      </section>
    `;
  }

  function bindVideoCover() {
    const cover = document.getElementById("videoCover");
    const btn = document.getElementById("videoCoverBtn");
    if (!cover || !btn) return;
    btn.addEventListener("click", () => {
      const frame = document.getElementById("videoFrame");
      const src = cover.getAttribute("data-embed-src");
      const title = cover.getAttribute("data-title");
      frame.innerHTML = `<iframe src="${src}" title="${title}" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>`;
      frame.hidden = false;
      cover.remove();
    });
  }

  function shareHtml(story) {
    const url = canonicalUrl(story);
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(story.title);
    return `
      <div class="article-share">
        <span class="article-share__label">Compartir</span>
        <div class="article-share__buttons">
          <a class="article-share__btn" href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" rel="noopener" aria-label="Compartir por WhatsApp">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5C10 9 9.5 7.8 9.3 7.3c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.5-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.8-1.5C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3.1.9.9-3-.2-.3C4 14.9 3.6 13.5 3.6 12 3.6 7.4 7.4 3.6 12 3.6S20.4 7.4 20.4 12 16.6 20 12 20z"/></svg>
            WhatsApp
          </a>
          <a class="article-share__btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener" aria-label="Compartir en Facebook">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M13.5 21v-7.5H16l.5-3.5h-3V7.8c0-1 .3-1.7 1.7-1.7H16.6V3.1C16.3 3 15.3 3 14.2 3c-2.4 0-4 1.5-4 4.2v2.8H7.7v3.5h2.5V21h3.3z"/></svg>
            Facebook
          </a>
          <a class="article-share__btn" href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noopener" aria-label="Compartir en X">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.6L4.4 22H1.3l8.1-9.3L1 2h7.1l4.9 6.1L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z"/></svg>
            X
          </a>
          <button type="button" class="article-share__btn article-share__btn--copy" id="copyLinkBtn" data-url="${url}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span id="copyLinkLabel">Copiar enlace</span>
          </button>
        </div>
      </div>
    `;
  }

  function setSEO(story) {
    document.title = story.title + " — El Podcast del Migrante Magazine";
    document.getElementById("metaDescription").setAttribute("content", story.cardDescription);
    document.getElementById("ogTitle").setAttribute("content", story.title);
    document.getElementById("ogDescription").setAttribute("content", story.cardDescription);
    document.getElementById("twitterTitle").setAttribute("content", story.title);
    document.getElementById("twitterDescription").setAttribute("content", story.cardDescription);
    const url = canonicalUrl(story);
    document.getElementById("canonicalLink").setAttribute("href", url);
    document.getElementById("ogUrl").setAttribute("content", url);
  }

  function renderStory(story) {
    setSEO(story);
    const root = document.getElementById("lifeStoryRoot");
    root.innerHTML = `
      <span class="tag">${LIFE_STORIES_COLLECTION}</span>
      <h1 class="article-title">${story.title}</h1>
      <p class="article-dek">${story.cardDescription}</p>
      ${protagonistaHtml(story)}
      ${heroMediaHtml(story)}
      <div class="article-body">${story.bodyHtml}</div>
      ${videoHtml(story)}
      ${shareHtml(story)}
    `;

    const copyBtn = document.getElementById("copyLinkBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const url = copyBtn.getAttribute("data-url");
        const label = document.getElementById("copyLinkLabel");
        const done = () => {
          label.textContent = "¡Enlace copiado!";
          setTimeout(() => (label.textContent = "Copiar enlace"), 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
        } else {
          fallbackCopy(url, done);
        }
      });
    }

    bindVideoCover();
  }

  function fallbackCopy(text, done) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (err) {
      /* silencioso */
    }
  }

  function renderNotFound() {
    document.title = "Historia no encontrada — El Podcast del Migrante Magazine";
    document.getElementById("lifeStoryRoot").innerHTML = `
      <div class="article-not-found">
        <h1>No encontramos esta historia</h1>
        <p>Puede que el enlace esté incompleto o el contenido ya no esté disponible.</p>
        <a class="btn" href="index.html">Volver al inicio</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const slug = getParam("slug");
    const story = slug ? findStory(slug) : null;
    if (story) {
      renderStory(story);
    } else {
      renderNotFound();
    }
  });
})();
