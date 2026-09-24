/*
  guia.js — Página de categoría de "Información útil para migrantes"
  ======================================================================
  Arma guia.html?categoria=... a partir de un objeto de js/guias.js.
  Migración es la primera categoría; esta misma plantilla debe servir,
  sin cambios, para Empleo/Vivienda/Educación/Finanzas/Servicios más
  adelante — solo hace falta agregar su objeto en USEFUL_GUIDES.
========================================================================= */

(function () {
  "use strict";

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function findGuide(slug) {
    return USEFUL_GUIDES[slug] || null;
  }

  function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function routeCardHtml(route, index) {
    const ctaNode = route.href
      ? `<a class="guia-route__cta" href="${route.href}">${route.cta}</a>`
      : `<span class="guia-route__cta guia-route__cta--pending">${route.cta}</span>`;
    return `
      <article class="guia-route" data-search="${normalize(route.title + " " + route.desc)}">
        <span class="guia-route__num">${String(index + 1).padStart(2, "0")}</span>
        <h3 class="guia-route__title">${route.title}</h3>
        <p class="guia-route__desc">${route.desc}</p>
        ${ctaNode}
      </article>
    `;
  }

  function bindSearch(guide) {
    const input = document.getElementById("guiaSearchInput");
    const empty = document.getElementById("guiaSearchEmpty");
    if (!input) return;
    input.addEventListener("input", () => {
      const q = normalize(input.value.trim());
      const cards = document.querySelectorAll(".guia-route");
      let visible = 0;
      cards.forEach((card) => {
        const match = !q || card.getAttribute("data-search").includes(q);
        card.style.display = match ? "" : "none";
        if (match) visible++;
      });
      empty.hidden = visible !== 0;
    });
  }

  function relatedArticlesHtml(guide) {
    const related = ARTICLES.filter((a) => a.category === guide.label && a.demo === false).slice(0, 6);
    if (!related.length) return "";
    const cards = related
      .map(
        (a) => `
        <article class="related-card">
          <div class="related-card__media" style="background-image:${a.heroImage.background}"></div>
          <span class="tag tag--sm">${a.category}</span>
          <h3 class="related-card__title"><a href="articulo.html?slug=${encodeURIComponent(a.slug)}">${a.title}</a></h3>
        </article>
      `
      )
      .join("");
    return `
      <section class="guia-related">
        <h2 class="section-title">Últimas guías de ${guide.label}</h2>
        <div class="related-grid">${cards}</div>
      </section>
    `;
  }

  function sourcesHtml(guide) {
    if (!guide.sources || !guide.sources.length) return "";
    const items = guide.sources
      .map(
        (s) => `
        <li class="article-sources__item">
          <a href="${s.href}" target="_blank" rel="noopener">
            <svg class="article-sources__icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
            <span>${s.label}</span>
          </a>
        </li>
      `
      )
      .join("");
    return `
      <section class="article-sources">
        <h2 class="article-sources__heading">Fuentes y recursos oficiales</h2>
        <ul class="article-sources__list">${items}</ul>
      </section>
    `;
  }

  function setSEO(guide) {
    document.title = guide.title + " — El Podcast del Migrante Magazine";
    document.getElementById("metaDescription").setAttribute("content", guide.dek);
    document.getElementById("ogTitle").setAttribute("content", guide.title);
    document.getElementById("ogDescription").setAttribute("content", guide.dek);
    document.getElementById("twitterTitle").setAttribute("content", guide.title);
    document.getElementById("twitterDescription").setAttribute("content", guide.dek);
    const url = "https://podcastdelmigrante.com/guia.html?categoria=" + encodeURIComponent(guide.slug);
    document.getElementById("canonicalLink").setAttribute("href", url);
    document.getElementById("ogUrl").setAttribute("content", url);
  }

  function renderGuide(guide) {
    setSEO(guide);
    const root = document.getElementById("guiaRoot");
    root.innerHTML = `
      <span class="tag">Información útil para migrantes</span>
      <h1 class="article-title">${guide.title}</h1>
      <p class="article-dek">${guide.dek}</p>
      <p class="guia-intro">${guide.intro}</p>

      <div class="guia-search">
        <label class="guia-search__label" for="guiaSearchInput">¿Qué necesitas saber?</label>
        <input class="guia-search__input" id="guiaSearchInput" type="search" placeholder="${guide.searchPlaceholder}">
        <p class="guia-search__empty" id="guiaSearchEmpty" hidden>No encontramos resultados con esa búsqueda. Intenta con otra palabra.</p>
      </div>

      <div class="guia-routes">
        ${guide.routes.map(routeCardHtml).join("")}
      </div>

      ${relatedArticlesHtml(guide)}
      ${sourcesHtml(guide)}

      <div class="article-disclaimer">
        <h2 class="article-disclaimer__heading">Información importante</h2>
        <p class="article-disclaimer__text">${guide.disclaimer}</p>
      </div>
    `;
    bindSearch(guide);
  }

  function renderNotFound() {
    document.title = "Sección no encontrada — El Podcast del Migrante Magazine";
    document.getElementById("guiaRoot").innerHTML = `
      <div class="article-not-found">
        <h1>No encontramos esta sección</h1>
        <p>Puede que el enlace esté incompleto o la sección todavía no esté disponible.</p>
        <a class="btn" href="index.html">Volver al inicio</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const categoria = getParam("categoria");
    const guide = categoria ? findGuide(categoria) : null;
    if (guide) {
      renderGuide(guide);
    } else {
      renderNotFound();
    }
  });
})();
