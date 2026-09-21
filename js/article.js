/*
  article.js — Plantilla maestra de artículo (Fase 2)
  ======================================================================
  Arma articulo.html?slug=... a partir de un objeto de js/articles.js.
  Ningún módulo opcional se dibuja si el dato correspondiente no existe
  — ver la regla de oro en articles.js.

  NOTA SOBRE canonicalPath: hoy el artículo "vive" en
  articulo.html?slug=... — es la única forma de tener URLs estables por
  artículo sin servidor/backend. `article.seo.canonicalPath` guarda la
  ruta LIMPIA prevista para cuando exista dominio y enrutamiento real
  (ej. /migracion/mi-titulo/). Se usa para <link rel="canonical">,
  Open Graph, JSON-LD y los botones de "Compartir" — de modo que
  compartir un artículo ya apunta a la URL definitiva, aunque el
  archivo físico de esta demo use querystring.
========================================================================= */

(function () {
  "use strict";

  const { el } = window.PDM;
  const SITE_ORIGIN = "https://podcastdelmigrante.com";
  const CONTENT_TYPE_SCHEMA = {
    "Noticia": "NewsArticle",
    "Reportaje": "NewsArticle",
    "Entrevista": "NewsArticle",
    "Opinión": "OpinionNewsArticle",
    "Guía": "Article",
    "Historia de migrante": "Article",
    "Columna": "Article",
    "Contenido patrocinado": "Article",
  };

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function findArticle(slug) {
    return ARTICLES.find((a) => a.slug === slug) || null;
  }

  function canonicalUrl(article) {
    return SITE_ORIGIN + article.seo.canonicalPath;
  }

  function estimateReadingTime(html) {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    return Math.max(1, Math.ceil(words / 200));
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-CA", { day: "numeric", month: "long", year: "numeric" }).format(d);
  }

  function renderLocation(loc) {
    if (!loc) return "";
    const parts = [loc.city, loc.province, loc.country].filter(Boolean);
    return parts.join(", ");
  }

  function renderAuthorHtml(author) {
    if (author.mode === "colaborador") {
      const link = author.profileHref
        ? `<a href="${author.profileHref}">${author.name}</a>`
        : author.name;
      return `<span class="article-byline__name">${link}</span>${
        author.specialty ? `<span class="article-byline__specialty"> — ${author.specialty}</span>` : ""
      }`;
    }
    return `<span class="article-byline__name">${author.name}</span>`;
  }

  function getRelated(article) {
    let related = [];
    if (article.relatedSlugs && article.relatedSlugs.length) {
      related = article.relatedSlugs.map((s) => findArticle(s)).filter(Boolean);
    } else {
      related = ARTICLES.filter((a) => a.slug !== article.slug && a.category === article.category);
    }
    return related.slice(0, 3);
  }

  /* ---------- Bloques opcionales (devuelven "" si no aplican) ---------- */

  function sponsoredBadgeHtml(article) {
    if (!article.sponsored) return "";
    return `<div class="article-sponsored-badge">Contenido patrocinado</div>`;
  }

  function contentTypeHtml(article) {
    const isOpinion = article.contentType === "Opinión";
    return `
      <div class="article-eyebrow-row">
        <span class="tag">${article.category}</span>
        <span class="article-type${isOpinion ? " article-type--opinion" : ""}">${article.contentType}</span>
      </div>
      ${isOpinion ? `<p class="article-opinion-note">Opinión — este contenido refleja el punto de vista personal del autor, no una postura editorial del medio.</p>` : ""}
    `;
  }

  function columnBadgeHtml(article) {
    if (!article.columnName) return "";
    const column = typeof COLUMNS !== "undefined" ? COLUMNS.find((c) => c.title === article.columnName) : null;
    if (column) {
      return `<a class="article-column-badge" href="columna.html?slug=${encodeURIComponent(column.slug)}">${article.columnName}</a>`;
    }
    return `<span class="article-column-badge">${article.columnName}</span>`;
  }

  function guideModuleHtml(article) {
    if (!article.freeGuide) return "";
    const guide = article.freeGuide;
    if (guide.fileHref) {
      return `
        <section class="article-guide article-guide--ready">
          <div class="article-guide__cover">
            <img src="${guide.coverImage}" alt="Portada de la guía: ${guide.title}">
          </div>
          <div class="article-guide__info">
            <span class="article-guide__kicker">Guía práctica gratuita</span>
            <h2 class="article-guide__title">${guide.title}</h2>
            <p class="article-guide__desc">${guide.description}</p>
            <a class="btn article-guide__btn" href="${guide.fileHref}" target="_blank" rel="noopener">${guide.buttonLabel || "Descargar guía gratis"}</a>
          </div>
        </section>
      `;
    }
    return `
      <section class="article-guide">
        <span class="article-guide__kicker">Guía práctica gratuita</span>
        <h2 class="article-guide__title">${guide.title}</h2>
        <p class="article-guide__desc">${guide.description}</p>
        <span class="article-guide__status">Disponible próximamente</span>
      </section>
    `;
  }

  function metaLineHtml(article) {
    const parts = [];
    parts.push(formatDate(article.publishedAt));
    if (article.updatedAt) parts.push("Actualizado el " + formatDate(article.updatedAt));
    const minutes = article.readingTimeOverride || estimateReadingTime(article.bodyHtml);
    parts.push(minutes + " min de lectura");
    return parts.join(" · ");
  }

  function locationHtml(article) {
    const text = renderLocation(article.location);
    if (!text) return "";
    return `<p class="article-location">${text}</p>`;
  }

  function heroImageHtml(article) {
    const credit = article.heroImage.credit
      ? `<p class="article-hero-credit">${article.heroImage.credit}</p>`
      : "";
    const mediaStyle = `background-image:${article.heroImage.background};${
      article.heroImage.aspectRatio ? `aspect-ratio:${article.heroImage.aspectRatio};` : ""
    }`;
    const mediaA11y = article.heroImage.alt ? ` role="img" aria-label="${article.heroImage.alt}"` : "";
    const mediaBadge = article.demo === false ? "" : `<span class="demo-badge">Demo</span>`;
    return `
      <div class="article-hero-media" style="${mediaStyle}"${mediaA11y}>
        ${mediaBadge}
      </div>
      ${credit}
    `;
  }

  function videoBlockHtml(article) {
    if (!article.video) return "";
    if (article.video.youtubeId) {
      return `
        <section class="article-video">
          <h2 class="article-video__heading">Esta historia también puedes verla en video</h2>
          <div class="article-video__frame">
            <iframe src="https://www.youtube.com/embed/${article.video.youtubeId}" title="${article.video.title}" allowfullscreen loading="lazy"></iframe>
          </div>
        </section>
      `;
    }
    return `
      <section class="article-video">
        <h2 class="article-video__heading">Esta historia también puedes verla en video</h2>
        <div class="article-video__placeholder">
          <span class="video-card__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
          </span>
          <span class="demo-badge demo-badge--sm">Demo</span>
        </div>
        <p class="article-video__title">${article.video.title}</p>
      </section>
    `;
  }

  function sourcesHtml(article) {
    if (!article.sources || !article.sources.length) return "";
    const items = article.sources
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
        <h2 class="article-sources__heading">Fuentes consultadas</h2>
        <ul class="article-sources__list">${items}</ul>
      </section>
    `;
  }

  function correctionHtml(article) {
    if (!article.correctionNote) return "";
    return `<div class="article-correction"><strong>Corrección:</strong> ${article.correctionNote}</div>`;
  }

  function disclaimerHtml(article) {
    if (!article.disclaimerCategory) return "";
    const text = DISCLAIMERS[article.disclaimerCategory];
    if (!text) return "";
    return `
      <div class="article-disclaimer">
        <h2 class="article-disclaimer__heading">Información importante</h2>
        <p class="article-disclaimer__text">${text}</p>
      </div>
    `;
  }

  function shareHtml(article) {
    const url = canonicalUrl(article);
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(article.title);
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

  function newsletterHtml(article) {
    if (!article.showNewsletter) return "";
    return `
      <section class="article-newsletter">
        <p class="article-newsletter__title">Recibe las historias y noticias útiles para la comunidad migrante.</p>
        <form class="newsletter-form" id="articleNewsletterForm">
          <input type="email" required placeholder="tu@correo.com" aria-label="Correo electrónico">
          <button class="btn" type="submit">Suscribirme</button>
        </form>
        <p class="newsletter-msg" id="articleNewsletterMsg"></p>
      </section>
    `;
  }

  function relatedHtml(article) {
    const related = getRelated(article);
    if (!related.length) return "";
    const cards = related
      .map(
        (a) => `
        <article class="related-card">
          <div class="related-card__media" style="background-image:${a.heroImage.background}">
            <span class="demo-badge demo-badge--sm">Demo</span>
          </div>
          <span class="tag tag--sm">${a.category}</span>
          <h3 class="related-card__title"><a href="articulo.html?slug=${encodeURIComponent(a.slug)}">${a.title}</a></h3>
        </article>
      `
      )
      .join("");
    return `
      <section class="article-related">
        <h2 class="section-title">Noticias relacionadas</h2>
        <div class="related-grid">${cards}</div>
      </section>
    `;
  }

  function langToggleHtml(article) {
    const esActive = article.lang === "es";
    const esNode = esActive
      ? `<span class="lang-pill is-active">ES</span>`
      : `<a class="lang-pill" href="articulo.html?slug=${encodeURIComponent(article.slug)}">ES</a>`;
    let enNode;
    if (article.lang === "en") {
      enNode = `<span class="lang-pill is-active">EN</span>`;
    } else if (article.translationSlug && findArticle(article.translationSlug)) {
      enNode = `<a class="lang-pill" href="articulo.html?slug=${encodeURIComponent(article.translationSlug)}">EN</a>`;
    } else {
      enNode = `<span class="lang-pill is-disabled" title="Traducción no disponible todavía">EN</span>`;
    }
    return `<div class="lang-toggle">${esNode}${enNode}</div>`;
  }

  /* ---------- SEO / metadatos por artículo ---------- */
  function setSEO(article) {
    const title = (article.seo.title || article.title) + " — El Podcast del Migrante Magazine";
    document.title = title;
    document.getElementById("htmlRoot").setAttribute("lang", article.lang);

    const description = article.seo.description || article.excerpt;
    document.getElementById("metaDescription").setAttribute("content", description);
    document.getElementById("ogTitle").setAttribute("content", article.title);
    document.getElementById("ogDescription").setAttribute("content", description);
    document.getElementById("twitterTitle").setAttribute("content", article.title);
    document.getElementById("twitterDescription").setAttribute("content", description);
    document.getElementById("ogLocale").setAttribute("content", article.lang === "en" ? "en_CA" : "es_CA");

    const url = canonicalUrl(article);
    document.getElementById("canonicalLink").setAttribute("href", url);
    document.getElementById("ogUrl").setAttribute("content", url);

    const schemaType = CONTENT_TYPE_SCHEMA[article.contentType] || "Article";
    const authorNode =
      article.author.mode === "medio"
        ? { "@type": "Organization", name: article.author.name }
        : { "@type": "Person", name: article.author.name };

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": schemaType,
      headline: article.title,
      description: description,
      inLanguage: article.lang,
      datePublished: article.publishedAt,
      ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
      author: authorNode,
      publisher: {
        "@type": "Organization",
        name: "eRadio Global Corp.",
        logo: { "@type": "ImageObject", url: SITE_ORIGIN + "/assets/logo.png" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      image: SITE_ORIGIN + "/assets/logo.png",
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }

  /* ---------- Ensamblado completo ---------- */
  function renderArticle(article) {
    setSEO(article);

    const root = document.getElementById("articleRoot");
    root.innerHTML = `
      ${sponsoredBadgeHtml(article)}
      ${contentTypeHtml(article)}
      ${columnBadgeHtml(article)}
      <h1 class="article-title">${article.title}</h1>
      <p class="article-dek">${article.dek}</p>
      <div class="article-byline-row">
        <p class="byline article-byline">${renderAuthorHtml(article.author)}</p>
        ${langToggleHtml(article)}
      </div>
      <p class="article-meta">${metaLineHtml(article)}</p>
      ${locationHtml(article)}
      ${heroImageHtml(article)}
      <div class="article-body">${article.bodyHtml}</div>
      ${videoBlockHtml(article)}
      ${guideModuleHtml(article)}
      ${sourcesHtml(article)}
      ${correctionHtml(article)}
      ${disclaimerHtml(article)}
      ${shareHtml(article)}
      ${newsletterHtml(article)}
      ${relatedHtml(article)}
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

    const nlForm = document.getElementById("articleNewsletterForm");
    if (nlForm) {
      nlForm.addEventListener("submit", (e) => {
        e.preventDefault();
        document.getElementById("articleNewsletterMsg").textContent =
          "Gracias — el registro de boletín se activará próximamente.";
        nlForm.querySelector("input").value = "";
      });
    }
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
      /* silencioso: si tampoco funciona el fallback, el enlace ya está
         visible en la barra de direcciones para copiar manualmente */
    }
  }

  function renderNotFound() {
    document.title = "Artículo no encontrado — El Podcast del Migrante Magazine";
    document.getElementById("articleRoot").innerHTML = `
      <div class="article-not-found">
        <h1>No encontramos este artículo</h1>
        <p>Puede que el enlace esté incompleto o el contenido ya no esté disponible.</p>
        <a class="btn" href="index.html">Volver al inicio</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const slug = getParam("slug");
    const article = slug ? findArticle(slug) : null;
    if (article) {
      renderArticle(article);
    } else {
      renderNotFound();
    }
  });
})();
