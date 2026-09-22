/*
  column.js — Página de una columna editorial (arquitectura nueva)
  ======================================================================
  Arma columna.html?slug=... a partir de un objeto de js/columns.js.
  Sigue el mismo patrón que article.js: una sola plantilla reutilizable
  para todas las columnas presentes y futuras.
========================================================================= */

(function () {
  "use strict";

  const { el } = window.PDM;

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function findColumn(slug) {
    return COLUMNS.find((c) => c.slug === slug) || null;
  }

  function findContributor(id) {
    return CONTRIBUTORS.find((c) => c.id === id) || null;
  }

  function entryRowHtml(entry) {
    if (entry.published && entry.slug) {
      return `
        <a class="column-entry column-entry--published" href="articulo.html?slug=${encodeURIComponent(entry.slug)}">
          <span class="column-entry__month">${entry.monthLabel}</span>
          <span class="column-entry__title">${entry.title}</span>
          <span class="column-entry__status">Leer</span>
        </a>
      `;
    }
    return `
      <div class="column-entry column-entry--upcoming">
        <span class="column-entry__month">${entry.monthLabel}</span>
        <span class="column-entry__title">${entry.title}</span>
        <span class="column-entry__status">Próximamente</span>
      </div>
    `;
  }

  function renderColumn(column) {
    const contributor = findContributor(column.authorId);
    document.title = column.title + " — El Podcast del Migrante Magazine";

    const authorLine = contributor
      ? `<a href="index.html#contributors">${contributor.name}</a>${contributor.organization ? ` — ${contributor.organization}` : ""}`
      : column.authorName;
    const authorLogo =
      contributor && contributor.brandLogo
        ? `<img class="column-author-logo" src="${contributor.brandLogo.src}" alt="${contributor.brandLogo.alt}">`
        : "";

    const entries = column.entries.map(entryRowHtml).join("");

    document.getElementById("columnRoot").innerHTML = `
      <span class="tag">${column.category}</span>
      <h1 class="article-title">${column.title}</h1>
      <p class="article-dek">${column.description}</p>
      <div class="column-author-row">
        <p class="byline article-byline">Por ${authorLine}</p>
        ${authorLogo}
      </div>

      <section class="column-entries">
        <h2 class="section-title">Entregas</h2>
        <div class="column-entries__list">${entries}</div>
      </section>
    `;
  }

  function renderNotFound() {
    document.title = "Columna no encontrada — El Podcast del Migrante Magazine";
    document.getElementById("columnRoot").innerHTML = `
      <div class="article-not-found">
        <h1>No encontramos esta columna</h1>
        <p>Puede que el enlace esté incompleto o la columna ya no esté disponible.</p>
        <a class="btn" href="index.html">Volver al inicio</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const slug = getParam("slug");
    const column = slug ? findColumn(slug) : null;
    if (column) {
      renderColumn(column);
    } else {
      renderNotFound();
    }
  });
})();
