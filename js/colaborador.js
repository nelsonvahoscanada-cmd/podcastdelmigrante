/*
  colaborador.js — Perfil editorial interno de un colaborador
  ======================================================================
  Arma colaborador.html?id=... a partir de un objeto de CONTRIBUTORS
  (js/data.js). Lista automáticamente, sin tocar esta plantilla:
  - la(s) columna(s) que firma (buscando en COLUMNS por authorId)
  - los artículos ya publicados que le pertenecen (buscando en
    ARTICLES por author.authorId)

  Agregar un futuro artículo de este colaborador es: crearlo en
  js/articles.js con `author.authorId` igual al `id` de este
  colaborador — aparecerá aquí solo, sin editar esta página.

  También muestra, si el colaborador los tiene: foto grande, biografía
  en párrafos, presentación en inglés (`en`), entrevistas en video
  (`interviews`, se cargan desde YouTube solo al pulsar) y los botones
  «Compartir perfil» y «Copiar enlace» con su URL pública
  (colaborador-<id>, generada por scripts/build-contributor-pages.mjs).
========================================================================= */

(function () {
  "use strict";

  const SITE_ORIGIN = "https://podcastdelmigrante.com";

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function paragraphs(text, cls) {
    return String(text || "")
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((p) => `<p class="${cls}">${esc(p)}</p>`)
      .join("");
  }

  function profileUrl(c) {
    return SITE_ORIGIN + "/colaborador-" + c.id;
  }

  const LANG_LABEL = { en: "Entrevista en inglés", es: "Entrevista en español" };

  function interviewsHtml(c) {
    if (!c.interviews || !c.interviews.length) return "";
    const items = c.interviews
      .map((iv) => {
        const related = iv.relatedArticleSlug && typeof ARTICLES !== "undefined"
          ? ARTICLES.find((a) => a.slug === iv.relatedArticleSlug && !a.draft)
          : null;
        const langAttr = iv.lang ? ` lang="${esc(iv.lang)}"` : "";
        return `
          <article class="profile-interview">
            <span class="profile-interview__lang">${esc(LANG_LABEL[iv.lang] || "Entrevista")}${iv.lang === "en" ? ' · <span lang="en">English interview</span>' : ""}</span>
            <h3 class="profile-interview__title"${langAttr}>${esc(iv.title)}</h3>
            <div class="article-video__frame article-video__frame--cover" data-video-id="${encodeURIComponent(iv.youtubeId)}" data-video-title="${esc(iv.title)}">
              <button type="button" class="article-video__play" data-video-play>
                <span class="video-card__play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
                </span>
                <span class="article-video__play-label">Reproducir video<span class="sr-only">: ${esc(iv.title)}</span></span>
              </button>
            </div>
            <p class="article-video__note">Al reproducirlo, el video se carga desde YouTube.</p>
            <p class="profile-interview__links">
              <a href="https://www.youtube.com/watch?v=${encodeURIComponent(iv.youtubeId)}" target="_blank" rel="noopener">Ver en YouTube<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
              ${related ? ` · <a href="articulo-${encodeURIComponent(related.slug)}">Lee nuestra cobertura en español: ${esc(related.title)}</a>` : ""}
            </p>
          </article>`;
      })
      .join("");
    return `
      <section class="profile-column profile-interviews" aria-labelledby="interviewsTitle">
        <h2 class="section-title" id="interviewsTitle">Entrevistas</h2>
        ${items}
      </section>`;
  }

  function englishHtml(c) {
    if (!c.en || !c.en.longBio) return "";
    return `
      <section class="profile-column profile-en" lang="en" aria-labelledby="enTitle">
        <h2 class="section-title" id="enTitle">About ${esc(c.name.split(" ")[0])} <span class="profile-en__badge">English</span></h2>
        ${c.en.specialty ? `<p class="profile-en__specialty">${esc(c.en.specialty)}</p>` : ""}
        ${paragraphs(c.en.longBio, "profile-longbio")}
      </section>`;
  }

  function shareHtml() {
    return `
      <div class="profile-share">
        <button type="button" class="btn-outline btn-outline--dark" data-share-profile>Compartir perfil</button>
        <button type="button" class="btn-outline btn-outline--dark" data-copy-link>Copiar enlace</button>
        <p class="profile-share__status" role="status" aria-live="polite"></p>
      </div>`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function bindProfileActions(c) {
    const root = document.getElementById("profileRoot");
    const status = root.querySelector(".profile-share__status");
    const url = profileUrl(c);
    const say = (msg) => { if (status) status.textContent = msg; };
    const share = root.querySelector("[data-share-profile]");
    if (share) {
      share.addEventListener("click", async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: c.name + " — El Podcast del Migrante Magazine", text: c.shareDescription || c.bio || "", url });
            return;
          } catch (e) {
            if (e && e.name === "AbortError") return;
          }
        }
        say((await copyText(url)) ? "Enlace copiado: " + url : "Copia este enlace: " + url);
      });
    }
    const copy = root.querySelector("[data-copy-link]");
    if (copy) copy.addEventListener("click", async () => say((await copyText(url)) ? "Enlace copiado: " + url : "Copia este enlace: " + url));
    root.querySelectorAll("[data-video-play]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const frame = btn.closest("[data-video-id]");
        const iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + frame.dataset.videoId + "?autoplay=1&rel=0";
        iframe.title = frame.dataset.videoTitle || "Video";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        frame.classList.remove("article-video__frame--cover");
        frame.innerHTML = "";
        frame.appendChild(iframe);
        iframe.focus();
      });
    });
  }

  function findContributor(id) {
    return CONTRIBUTORS.find((c) => c.id === id) || null;
  }

  function articlesByAuthor(id) {
    return ARTICLES.filter((a) => a.author && a.author.authorId === id);
  }

  function columnsByAuthor(id) {
    return typeof COLUMNS !== "undefined" ? COLUMNS.filter((c) => c.authorId === id) : [];
  }

  function articleCardHtml(article) {
    return `
      <article class="related-card">
        <div class="related-card__media" style="background-image:${article.heroImage.background}"></div>
        <span class="tag tag--sm">${article.category}</span>
        <h3 class="related-card__title"><a href="articulo.html?slug=${encodeURIComponent(article.slug)}">${article.title}</a></h3>
      </article>
    `;
  }

  function columnSectionHtml(column) {
    const published = articlesByAuthor(column.authorId).filter((a) =>
      column.entries.some((e) => e.published && e.slug === a.slug)
    );
    const cards = published.length
      ? `<div class="related-grid">${published.map(articleCardHtml).join("")}</div>`
      : `<p class="profile-empty">Todavía no hay artículos publicados en esta columna.</p>`;
    return `
      <section class="profile-column">
        <span class="article-column-badge">${column.title}</span>
        <p class="profile-column__desc">${column.description}</p>
        <h2 class="section-title">Artículos publicados</h2>
        ${cards}
      </section>
    `;
  }

  function renderProfile(contributor) {
    document.title = contributor.name + " — El Podcast del Migrante Magazine";

    const avatar = contributor.photo
      ? `<img class="profile-avatar" src="${contributor.photo}" alt="${contributor.name}">`
      : `<div class="profile-avatar profile-avatar--initials">${contributor.name.charAt(0)}</div>`;
    const photoLarge = contributor.photoLarge
      ? `<figure class="profile-photo"><img src="${contributor.photoLarge}" alt="Fotografía de ${esc(contributor.name)}" width="900" height="1200"></figure>`
      : "";

    const columns = columnsByAuthor(contributor.id);
    const columnsHtml = columns.map(columnSectionHtml).join("");

    const proSiteBtn = contributor.professionalSite
      ? `<a class="btn-outline btn-outline--dark" href="${contributor.professionalSite}" target="_blank" rel="noopener">Visitar sitio profesional</a>`
      : "";

    document.getElementById("profileRoot").innerHTML = `
      <div class="profile-header">
        ${avatar}
        <div>
          <h1 class="profile-name">${contributor.name}</h1>
          <span class="tag">${contributor.specialty}</span>
          ${contributor.organization ? `<p class="profile-org">${contributor.organization}</p>` : ""}
        </div>
      </div>

      <p class="article-dek">${contributor.bio}</p>
      ${photoLarge}
      ${paragraphs(contributor.longBio, "profile-longbio")}
      ${contributor.licensedIn ? `<p class="profile-licensed"><strong>Licenciado en:</strong> ${contributor.licensedIn}</p>` : ""}
      ${contributor.brandLogo ? `<div class="profile-brand"><img src="${contributor.brandLogo.src}" alt="${contributor.brandLogo.alt}"></div>` : ""}

      ${proSiteBtn ? `<div class="profile-actions">${proSiteBtn}</div>` : ""}
      ${shareHtml()}

      ${columnsHtml}
      ${interviewsHtml(contributor)}
      ${englishHtml(contributor)}
    `;
    bindProfileActions(contributor);
  }

  function renderNotFound() {
    document.title = "Colaborador no encontrado — El Podcast del Migrante Magazine";
    document.getElementById("profileRoot").innerHTML = `
      <div class="article-not-found">
        <h1>No encontramos este perfil</h1>
        <p>Puede que el enlace esté incompleto o el colaborador ya no esté disponible.</p>
        <a class="btn" href="index.html">Volver al inicio</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const id = document.documentElement.getAttribute("data-contributor-id") || getParam("id");
    const contributor = id ? findContributor(id) : null;
    if (contributor) {
      renderProfile(contributor);
    } else {
      renderNotFound();
    }
  });
})();
