/*
  guia-ruta.js — Página de ruta (nivel dentro de una categoría)
  ======================================================================
  Arma guia-ruta.html?ruta=... a partir de un objeto de
  js/guia-rutas.js. Misma plantilla para cualquier ruta futura de
  cualquier categoría — agregar una ruta nueva es solo agregar su
  objeto en GUIA_RUTAS.
========================================================================= */

(function () {
  "use strict";

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function findRuta(slug) {
    return GUIA_RUTAS[slug] || null;
  }

  function findSubruta(slug) {
    return (typeof GUIA_SUBRUTAS !== "undefined" && GUIA_SUBRUTAS[slug]) || null;
  }

  function sectionBlockHtml(section, index) {
    const ctaNode = section.cta
      ? `<a class="guia-route__cta" href="${section.cta.href}" target="_blank" rel="noopener">${section.cta.label}</a>`
      : "";
    return `
      <article class="guia-section">
        <h2 class="guia-section__title">${section.heading}</h2>
        <div class="guia-path__body">${section.bodyHtml}</div>
        ${ctaNode}
      </article>
    `;
  }

  function calloutHtml(callout) {
    return `
      <div class="guia-callout">
        <h3 class="guia-callout__title">${callout.title}</h3>
        ${callout.bodyHtml}
      </div>
    `;
  }

  function checklistHtml(checklist) {
    if (!checklist) return "";
    const items = checklist.items.map((t) => `<li><span class="guia-checklist__box" aria-hidden="true"></span>${t}</li>`).join("");
    return `
      <section class="guia-checklist">
        <h2 class="section-title">${checklist.title}</h2>
        <ul class="guia-checklist__list">${items}</ul>
        ${checklist.note ? `<p class="guia-checklist__note">${checklist.note}</p>` : ""}
      </section>
    `;
  }

  function setSEOSubruta(subruta) {
    document.title = subruta.title + " — El Podcast del Migrante Magazine";
    document.getElementById("metaDescription").setAttribute("content", subruta.dek);
    document.getElementById("ogTitle").setAttribute("content", subruta.title);
    document.getElementById("ogDescription").setAttribute("content", subruta.dek);
    document.getElementById("twitterTitle").setAttribute("content", subruta.title);
    document.getElementById("twitterDescription").setAttribute("content", subruta.dek);
    const url = "https://podcastdelmigrante.com/guia-ruta.html?subruta=" + encodeURIComponent(subruta.slug);
    document.getElementById("canonicalLink").setAttribute("href", url);
    document.getElementById("ogUrl").setAttribute("content", url);
  }

  function renderSubruta(subruta) {
    setSEOSubruta(subruta);
    const backHref = "guia-ruta.html?ruta=" + encodeURIComponent(subruta.parentRuta);
    const backLabel = "← Volver a " + subruta.parentRutaLabel;
    const root = document.getElementById("guiaRutaRoot");
    root.innerHTML = `
      <a class="guia-back" href="${backHref}">${backLabel}</a>
      <span class="tag">Información útil para migrantes</span>
      <h1 class="article-title">${subruta.title}</h1>
      <p class="article-dek">${subruta.dek}</p>
      <p class="guia-intro">${subruta.intro}</p>

      <div class="guia-sections">
        ${subruta.sections.map(sectionBlockHtml).join("")}
        ${subruta.callouts.map(calloutHtml).join("")}
      </div>

      ${checklistHtml(subruta.checklist)}
      ${sourcesHtml(subruta)}

      <div class="article-disclaimer">
        <h2 class="article-disclaimer__heading">Información importante</h2>
        <p class="article-disclaimer__text">${subruta.disclaimer}</p>
      </div>

      <a class="guia-back guia-back--bottom" href="${backHref}">${backLabel}</a>
    `;
  }

  function pathBlockHtml(path, index) {
    const ctaNode = path.href
      ? `<a class="guia-route__cta" href="${path.href}">${path.cta}</a>`
      : `<span class="guia-route__cta guia-route__cta--pending">${path.cta}</span>`;
    return `
      <article class="guia-path">
        <span class="guia-route__num">${String(index + 1).padStart(2, "0")}</span>
        <h2 class="guia-path__title">${path.title}</h2>
        <div class="guia-path__body">${path.body}</div>
        ${ctaNode}
      </article>
    `;
  }

  function toolCalloutHtml(tool) {
    if (!tool) return "";
    return `
      <section class="guia-tool-callout">
        <h2 class="guia-tool-callout__title">${tool.title}</h2>
        <p class="guia-tool-callout__desc">${tool.desc}</p>
        <a class="btn" href="${tool.href}" target="_blank" rel="noopener">${tool.cta}</a>
      </section>
    `;
  }

  function beforePayingHtml(section) {
    if (!section) return "";
    const items = section.tips.map((t) => `<li>${t}</li>`).join("");
    return `
      <section class="guia-before-paying">
        <h2 class="section-title">${section.title}</h2>
        <ol class="guia-before-paying__list">${items}</ol>
      </section>
    `;
  }

  function sourcesHtml(ruta) {
    if (!ruta.sources || !ruta.sources.length) return "";
    const items = ruta.sources
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
        <h2 class="article-sources__heading">Fuentes oficiales</h2>
        <ul class="article-sources__list">${items}</ul>
      </section>
    `;
  }

  function setSEO(ruta) {
    document.title = ruta.title + " — El Podcast del Migrante Magazine";
    document.getElementById("metaDescription").setAttribute("content", ruta.dek);
    document.getElementById("ogTitle").setAttribute("content", ruta.title);
    document.getElementById("ogDescription").setAttribute("content", ruta.dek);
    document.getElementById("twitterTitle").setAttribute("content", ruta.title);
    document.getElementById("twitterDescription").setAttribute("content", ruta.dek);
    const url = "https://podcastdelmigrante.com/guia-ruta.html?ruta=" + encodeURIComponent(ruta.slug);
    document.getElementById("canonicalLink").setAttribute("href", url);
    document.getElementById("ogUrl").setAttribute("content", url);
  }

  function renderRuta(ruta) {
    setSEO(ruta);
    const root = document.getElementById("guiaRutaRoot");
    root.innerHTML = `
      <a class="guia-back" href="guia.html?categoria=${encodeURIComponent(ruta.parentCategoria)}">← Volver a ${ruta.parentLabel} a Canadá</a>
      <span class="tag">Información útil para migrantes</span>
      <h1 class="article-title">${ruta.title}</h1>
      <p class="article-dek">${ruta.dek}</p>
      <p class="guia-intro">${ruta.intro}</p>

      <div class="guia-paths">
        ${ruta.paths.map(pathBlockHtml).join("")}
      </div>

      ${toolCalloutHtml(ruta.toolCallout)}
      ${beforePayingHtml(ruta.beforePaying)}
      ${sourcesHtml(ruta)}

      <div class="article-disclaimer">
        <h2 class="article-disclaimer__heading">Información importante</h2>
        <p class="article-disclaimer__text">${ruta.disclaimer}</p>
      </div>

      <a class="guia-back guia-back--bottom" href="guia.html?categoria=${encodeURIComponent(ruta.parentCategoria)}">← Volver a ${ruta.parentLabel} a Canadá</a>
    `;
  }

  function renderNotFound() {
    document.title = "Página no encontrada — El Podcast del Migrante Magazine";
    document.getElementById("guiaRutaRoot").innerHTML = `
      <div class="article-not-found">
        <h1>No encontramos esta página</h1>
        <p>Puede que el enlace esté incompleto o el contenido todavía no esté disponible.</p>
        <a class="btn" href="index.html">Volver al inicio</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const rutaSlug = getParam("ruta");
    const subrutaSlug = getParam("subruta");
    if (subrutaSlug) {
      const subruta = findSubruta(subrutaSlug);
      if (subruta) {
        renderSubruta(subruta);
      } else {
        renderNotFound();
      }
      return;
    }
    const ruta = rutaSlug ? findRuta(rutaSlug) : null;
    if (ruta) {
      renderRuta(ruta);
    } else {
      renderNotFound();
    }
  });
})();
