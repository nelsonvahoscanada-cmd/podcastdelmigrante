/*
  main.js — Renderizado del HOME de EL PODCAST DEL MIGRANTE MAGAZINE
  ------------------------------------------------------------------------
  Todo el contenido visual se construye a partir de js/data.js.
  Ningún dato editorial está escrito directamente en este archivo:
  así, agregar/editar artículos nunca requiere tocar el layout.

  El header/nav/footer compartidos con la plantilla de artículo viven
  en js/nav.js (window.PDM) desde la Fase 2 — este archivo solo arma
  el contenido específico del HOME.
*/

(function () {
  "use strict";

  const { el, initials, prefersReducedMotion } = window.PDM;

  /* ---------- Breaking / última hora ---------- */
  function buildBreaking() {
    const track = document.getElementById("breakingTrack");
    const items = BREAKING.concat(BREAKING); // loop
    items.forEach((text) => {
      track.appendChild(el("span", "breaking-item", text));
    });
  }

  /* ---------- Edición del mes (para header y módulo) ---------- */
  function fillEdition() {
    document.querySelectorAll("[data-edition-label]").forEach((n) => {
      n.textContent = `Edición #${EDITION.number} · ${EDITION.monthLabel} ${EDITION.year}`;
    });
    const kickerNode = document.getElementById("editionKickerLabel");
    if (kickerNode) kickerNode.textContent = `Edición #${EDITION.number} · ${EDITION.monthLabel} ${EDITION.year} — Edición Digital`;
    const headlineNode = document.getElementById("editionHeadline");
    if (headlineNode) headlineNode.textContent = EDITION.headline;
    const numNode = document.getElementById("editionNumLabel");
    if (numNode) numNode.textContent = `Edición #${EDITION.number}`;

    const monthsWrap = document.getElementById("editionMonths");
    if (monthsWrap) {
      EDITION_MONTHS.forEach((m) => {
        const item = m.active
          ? el("a", "edition-month is-active", m.label)
          : el("span", "edition-month is-disabled", m.label);
        if (m.active) item.href = "#";
        monthsWrap.appendChild(item);
      });
    }
  }

  /* ---------- Hero ----------
     Si el objeto trae `slug`, el título enlaza a su artículo real
     (articulo.html?slug=...). Si no trae `slug` (como las demás
     tarjetas demo del HOME), se muestra exactamente igual que antes:
     texto plano, sin enlace — así ninguna tarjeta sin artículo real
     queda apuntando a una página vacía. */
  function articleHref(slug) {
    return "articulo.html?slug=" + encodeURIComponent(slug);
  }

  function buildHero() {
    const main = HERO.main;
    const heroMain = document.getElementById("heroMain");
    const titleHtml = main.slug
      ? `<a href="${articleHref(main.slug)}">${main.title}</a>`
      : main.title;
    const mediaStyle = `background-image:${main.image};${main.aspectRatio ? `aspect-ratio:${main.aspectRatio};` : ""}`;
    const mediaA11y = main.alt ? ` role="img" aria-label="${main.alt}"` : "";
    const mediaBadge = main.demo === false ? "" : `<span class="demo-badge">Demo</span>`;
    heroMain.innerHTML = `
      <div class="hero-main__media" style="${mediaStyle}"${mediaA11y}>
        ${mediaBadge}
      </div>
      <div class="hero-main__body">
        <span class="tag">${main.category}</span>
        <h1 class="hero-main__title">${titleHtml}</h1>
        <p class="hero-main__dek">${main.dek}</p>
        <p class="byline">${main.author} · ${main.date}</p>
      </div>
    `;

    const list = document.getElementById("heroSecondary");
    HERO.secondary.forEach((item) => {
      const titleInner = item.slug ? `<a href="${articleHref(item.slug)}">${item.title}</a>` : item.title;
      const mediaStyle = `background-image:${item.image};${item.aspectRatio ? `aspect-ratio:${item.aspectRatio};` : ""}`;
      const mediaA11y = item.alt ? ` role="img" aria-label="${item.alt}"` : "";
      const mediaBadge = item.demo === false ? "" : `<span class="demo-badge demo-badge--sm">Demo</span>`;
      const card = el(
        "article",
        "hero-sec-card",
        `
        <div class="hero-sec-card__media" style="${mediaStyle}"${mediaA11y}>
          ${mediaBadge}
        </div>
        <div class="hero-sec-card__body">
          <span class="tag tag--sm">${item.category}</span>
          <h3 class="hero-sec-card__title">${titleInner}</h3>
          <p class="byline">${item.date}</p>
        </div>
      `
      );
      list.appendChild(card);
    });
  }

  /* ---------- Últimas noticias ---------- */
  function buildLatest() {
    const list = document.getElementById("latestList");
    LATEST.forEach((item) => {
      const thumb = item.image ? `<span class="latest-row__thumb" style="background-image:url('${item.image}')"></span>` : "";
      const row = el(
        "a",
        "latest-row" + (item.image ? " latest-row--img" : ""),
        `
        ${thumb}
        <span class="tag tag--sm">${item.category}</span>
        <span class="latest-row__title">${item.title}</span>
        <span class="latest-row__time">${item.time}</span>
      `
      );
      row.href = item.slug ? articleHref(item.slug) : "#";
      list.appendChild(row);
    });
  }

  /* ---------- Información útil ---------- */
  function buildUsefulInfo() {
    const grid = document.getElementById("usefulGrid");
    USEFUL_INFO.forEach((item) => {
      const card = el(
        "a",
        "useful-card",
        `
        <h3 class="useful-card__title">${item.title}</h3>
        <p class="useful-card__desc">${item.desc}</p>
        <span class="useful-card__link">Explorar</span>
      `
      );
      card.href = item.href || "#";
      grid.appendChild(card);
    });
  }

  function youtubeThumb(id) {
    return "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";
  }

  /* ---------- Historias ---------- */
  function buildStories() {
    const grid = document.getElementById("storiesGrid");
    STORIES.forEach((item) => {
      const href = item.href ? item.href : item.slug ? articleHref(item.slug) : null;
      const titleInner = href ? `<a href="${href}">${item.title}</a>` : item.title;
      const mediaStyle = item.videoId
        ? `background-image:url('${youtubeThumb(item.videoId)}')`
        : `background-image:${item.image}`;
      const mediaBadge = item.demo === false ? "" : `<span class="demo-badge demo-badge--sm">Demo</span>`;
      const playIcon = item.videoId
        ? `<span class="story-card__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg></span>`
        : "";
      const card = el(
        "article",
        "story-card",
        `
        <div class="story-card__media" style="${mediaStyle}">
          ${mediaBadge}
          ${playIcon}
        </div>
        <h3 class="story-card__title">${titleInner}</h3>
        <p class="story-card__excerpt">${item.excerpt}</p>
      `
      );
      grid.appendChild(card);
    });
  }

  /* ---------- Video / Podcast ---------- */
  function buildVideos() {
    const track = document.getElementById("videoTrack");
    VIDEOS.filter((item) => item.published).forEach((item) => {
      const mediaStyle = item.videoId ? ` style="background-image:url('${youtubeThumb(item.videoId)}')"` : "";
      const badge = item.demo === false ? "" : `<span class="demo-badge demo-badge--sm">Demo</span>`;
      const desc = item.desc ? `<p class="video-card__desc">${item.desc}</p>` : "";
      const innerHtml = `
        <div class="video-card__media"${mediaStyle}>
          <span class="video-card__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
          </span>
          ${badge}
        </div>
        <span class="tag tag--sm">${item.tag}</span>
        <h3 class="video-card__title">${item.title}</h3>
        ${desc}
      `;
      const card = item.videoId
        ? el("a", "video-card video-card--link", innerHtml)
        : el("article", "video-card", innerHtml);
      if (item.videoId) {
        card.href = "https://youtu.be/" + item.videoId;
        card.target = "_blank";
        card.rel = "noopener";
        /* El nombre accesible es el texto visible (título y descripción)
           más este aviso; un aria-label distinto lo ocultaría (WCAG 2.5.3). */
        card.insertAdjacentHTML("beforeend", '<span class="sr-only"> (abre YouTube en una pestaña nueva)</span>');
      }
      track.appendChild(card);
    });
  }

  function bindVideoScroll() {
    const track = document.getElementById("videoTrack");
    document.getElementById("videoPrev").addEventListener("click", () => {
      track.scrollBy({ left: -320, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
    document.getElementById("videoNext").addEventListener("click", () => {
      track.scrollBy({ left: 320, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Desafío 100 Empresas ---------- */
  function youtubeThumb(id) {
    return "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";
  }

  function buildDesafio() {
    const grid = document.getElementById("desafioGrid");
    DESAFIO_STORIES.forEach((story) => {
      const thumb = youtubeThumb(story.videoId);
      const alt = story.image && story.image.alt ? story.image.alt : story.cardTitle;
      const card = el(
        "a",
        "desafio-card",
        `
        <div class="desafio-card__media" style="background-image:url('${thumb}')" role="img" aria-label="${alt}">
          <span class="desafio-card__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
          </span>
        </div>
        <div class="desafio-card__body">
          <span class="tag tag--sm">${story.empresa || story.area || "Desafío 100 Empresas"}</span>
          <h3 class="desafio-card__title">${story.cardTitle}</h3>
          <p class="byline">Empresario: ${story.empresario}</p>
        </div>
      `
      );
      card.href = "historia.html?slug=" + encodeURIComponent(story.slug);
      grid.appendChild(card);
    });
  }

  /* ---------- Lo más leído ---------- */
  function buildMostRead() {
    const list = document.getElementById("mostReadList");
    RECOMMENDED_READS.forEach((item, i) => {
      const row = el(
        "a",
        "most-read-row",
        `<span class="most-read-row__num">${String(i + 1).padStart(2, "0")}</span>
         <span class="most-read-row__body">
           <span class="most-read-row__category">${item.category}</span>
           <span class="most-read-row__title">${item.title}</span>
         </span>`
      );
      row.href = articleHref(item.slug);
      list.appendChild(row);
    });
  }

  /* ---------- Patrocinadores ---------- */
  function buildSponsors() {
    const row = document.getElementById("sponsorRow");
    SPONSORS.forEach((s) => {
      const card = el(
        "div",
        "sponsor-card",
        `<span class="sponsor-card__kind">${s.kind}</span>
         <span class="sponsor-card__name">${s.name}</span>`
      );
      row.appendChild(card);
    });
  }

  /* ---------- Nuestros colaboradores ---------- */
  /* ---------- Columna destacada en el HOME ---------- */
  /* Muestra, de forma compacta, la ÚLTIMA entrega PUBLICADA de cada columna
     marcada con featuredOnHome (ver js/columns.js). Si la columna todavía
     no tiene ninguna entrega publicada (o su artículo sigue en borrador),
     el bloque permanece oculto: nunca se anuncia una columna sin texto. */
  function buildColumnFeature() {
    const host = document.getElementById("columnFeature");
    if (!host || typeof COLUMNS === "undefined" || typeof ARTICLES === "undefined") return;
    const column = COLUMNS.find((c) => c.featuredOnHome);
    if (!column) return;
    const published = column.entries.filter((e) => e.published && e.slug);
    if (!published.length) return;
    const entry = published[published.length - 1];
    const article = ARTICLES.find((a) => a.slug === entry.slug && !a.draft);
    if (!article) return;
    host.innerHTML = `
      <div class="column-feature__inner">
        <p class="column-feature__name">${column.title}</p>
        <p class="column-feature__by">Por ${column.authorName}</p>
        <h3 class="column-feature__title"><a href="${articleHref(article.slug)}">${article.title}</a></h3>
        <p class="column-feature__text">${article.excerpt}</p>
        <a class="btn" href="${articleHref(article.slug)}">Leer la columna →</a>
      </div>
    `;
    host.hidden = false;
  }


  /* Última entrega publicada de un colaborador — calculada dinámicamente
     desde ARTICLES, nunca guardada a mano. Sirve para cualquier
     colaborador futuro: en cuanto tenga un artículo real (demo:false)
     firmado con su authorId, su tarjeta del HOME lo recoge solo. */
  function getLatestArticleFor(contributorId) {
    if (typeof ARTICLES === "undefined") return null;
    const matches = ARTICLES.filter(
      (a) => a.demo === false && !a.draft && a.author && a.author.mode === "colaborador" && a.author.authorId === contributorId
    );
    if (!matches.length) return null;
    matches.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return matches[0];
  }

  function buildContributors() {
    const grid = document.getElementById("contributorsGrid");
    CONTRIBUTORS.forEach((c) => {
      const avatar = c.photo
        ? `<img class="contributor-card__avatar contributor-card__avatar--photo" src="${c.photo}" alt="${c.name}">`
        : `<div class="contributor-card__avatar">${initials(c.name)}</div>`;
      const orgLine = c.organization ? `<p class="contributor-card__org">${c.organization}</p>` : "";
      const columnLine = c.columnName ? `<p class="contributor-card__column">Columna: ${c.columnName}</p>` : "";
      const brandLogo = c.brandLogo
        ? `<img class="contributor-card__logo" src="${c.brandLogo.src}" alt="${c.brandLogo.alt}">`
        : "";
      const latest = getLatestArticleFor(c.id);
      const actionBlock = latest
        ? `
          <p class="contributor-card__latest-label">Última entrega:</p>
          <p class="contributor-card__latest-title">${latest.title}</p>
          <a class="contributor-card__cta" href="articulo.html?slug=${encodeURIComponent(latest.slug)}">Leer la columna →</a>
        `
        : `
          <div class="contributor-card__links">
            <a class="contributor-card__link" href="${c.link}">Ver perfil</a>
            ${c.website ? `<a class="contributor-card__link" href="${c.website}">Web</a>` : ""}
          </div>
        `;
      const card = el(
        "article",
        "contributor-card",
        `
        ${avatar}
        <h3 class="contributor-card__name">${c.name}</h3>
        <span class="tag tag--sm">${c.specialty}</span>
        ${orgLine}
        ${columnLine}
        ${brandLogo}
        <p class="contributor-card__bio">${c.bio}</p>
        ${c.articlesNote ? `<p class="contributor-card__note">${c.articlesNote}</p>` : ""}
        ${actionBlock}
      `
      );
      grid.appendChild(card);
    });
  }

  /* ---------- Dónde encontrar el Magazine ---------- */
  function mapsLink(point) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(point.address);
  }

  function waLink(phone) {
    return "https://wa.me/" + phone.replace(/[^\d]/g, "");
  }

  const SOCIAL_ICONS = {
    instagram: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`,
    facebook: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M13.5 21v-7.5H16l.5-3.5h-3V7.8c0-1 .3-1.7 1.7-1.7H16.6V3.1C16.3 3 15.3 3 14.2 3c-2.4 0-4 1.5-4 4.2v2.8H7.7v3.5h2.5V21h3.3z"/></svg>`,
    tiktok: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M16.5 3c.3 1.8 1.5 3.2 3.5 3.5v2.7c-1.3 0-2.5-.4-3.5-1.1v6.4c0 3-2.4 5.5-5.5 5.5S5.5 17.5 5.5 14.5 8 9 11 9c.3 0 .6 0 .9.1v2.8c-.3-.1-.6-.2-.9-.2-1.5 0-2.7 1.2-2.7 2.7s1.2 2.8 2.7 2.8 2.8-1.2 2.8-2.8V3h2.7z"/></svg>`,
    whatsapp: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5C10 9 9.5 7.8 9.3 7.3c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.5-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.8-1.5C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3.1.9.9-3-.2-.3C4 14.9 3.6 13.5 3.6 12 3.6 7.4 7.4 3.6 12 3.6S20.4 7.4 20.4 12 16.6 20 12 20z"/></svg>`,
    email: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  };

  function socialRowHtml(social) {
    if (!social) return "";
    const items = [];
    if (social.instagram) items.push(`<span class="distro-card__social-item">${SOCIAL_ICONS.instagram}${social.instagram}</span>`);
    if (social.facebook) items.push(`<span class="distro-card__social-item">${SOCIAL_ICONS.facebook}${social.facebook}</span>`);
    if (social.tiktok) items.push(`<span class="distro-card__social-item">${SOCIAL_ICONS.tiktok}${social.tiktok}</span>`);
    if (social.whatsapp)
      items.push(
        `<a class="distro-card__social-item distro-card__social-item--link" href="${waLink(social.whatsapp)}" target="_blank" rel="noopener">${SOCIAL_ICONS.whatsapp}${social.whatsapp}</a>`
      );
    if (social.email)
      items.push(`<a class="distro-card__social-item distro-card__social-item--link" href="mailto:${social.email}">${SOCIAL_ICONS.email}${social.email}</a>`);
    return `<div class="distro-card__social">${items.join("")}</div>`;
  }

  function distroCardHtml(point) {
    return `
      <article class="distro-card">
        <div class="distro-card__top">
          <img class="distro-card__logo-img" src="${point.logo}" alt="${point.name}" loading="lazy">
          <span class="distro-card__badge">${point.statusLabel}</span>
        </div>
        <p class="distro-card__brand">${point.brandLine}</p>
        <h3 class="distro-card__name">${point.name}</h3>
        <p class="distro-card__desc">${point.desc}</p>
        <p class="distro-card__address">${point.address}</p>
        <a class="btn distro-card__cta" href="${mapsLink(point)}" target="_blank" rel="noopener">📍 Cómo llegar</a>
        ${socialRowHtml(point.social)}
      </article>
    `;
  }

  function buildDistribution() {
    const grid = document.getElementById("distroGrid");
    if (!grid) return;
    if (!DISTRIBUTION_POINTS.length) {
      grid.innerHTML = `<p class="distro-empty">Estamos confirmando nuestros primeros puntos oficiales de distribución. Vuelve pronto.</p>`;
      return;
    }
    grid.innerHTML = DISTRIBUTION_POINTS.map(distroCardHtml).join("");
  }

  /* ---------- Newsletter (demo, sin backend) ---------- */
  function bindNewsletter() {
    const form = document.getElementById("newsletterForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = document.getElementById("newsletterMsg");
      msg.textContent = "Gracias — el registro de boletín se activará próximamente.";
      form.querySelector("input").value = "";
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();

    buildBreaking();
    fillEdition();
    buildHero();
    buildLatest();
    buildUsefulInfo();
    buildStories();
    buildVideos();
    bindVideoScroll();
    buildDesafio();
    buildMostRead();
    buildColumnFeature();
    buildContributors();
    buildDistribution();
    buildSponsors();
    bindNewsletter();
  });
})();
