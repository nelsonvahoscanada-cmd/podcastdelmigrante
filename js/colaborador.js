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
========================================================================= */

(function () {
  "use strict";

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
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
      ${contributor.longBio ? `<p class="profile-longbio">${contributor.longBio}</p>` : ""}
      ${contributor.licensedIn ? `<p class="profile-licensed"><strong>Licenciado en:</strong> ${contributor.licensedIn}</p>` : ""}
      ${contributor.brandLogo ? `<div class="profile-brand"><img src="${contributor.brandLogo.src}" alt="${contributor.brandLogo.alt}"></div>` : ""}

      ${proSiteBtn ? `<div class="profile-actions">${proSiteBtn}</div>` : ""}

      ${columnsHtml}
    `;
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
    const id = getParam("id");
    const contributor = id ? findContributor(id) : null;
    if (contributor) {
      renderProfile(contributor);
    } else {
      renderNotFound();
    }
  });
})();
