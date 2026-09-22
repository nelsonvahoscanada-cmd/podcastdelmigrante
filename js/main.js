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
      const row = el(
        "a",
        "latest-row",
        `
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
      card.href = "#";
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
    VIDEOS.forEach((item) => {
      const card = el(
        "article",
        "video-card",
        `
        <div class="video-card__media">
          <span class="video-card__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
          </span>
          <span class="demo-badge demo-badge--sm">Demo</span>
        </div>
        <span class="tag tag--sm">${item.tag}</span>
        <h3 class="video-card__title">${item.title}</h3>
      `
      );
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
    MOST_READ.forEach((title, i) => {
      const row = el(
        "a",
        "most-read-row",
        `<span class="most-read-row__num">${String(i + 1).padStart(2, "0")}</span>
         <span class="most-read-row__title">${title}</span>`
      );
      row.href = "#";
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
        <div class="contributor-card__links">
          <a class="contributor-card__link" href="${c.link}">Ver perfil</a>
          ${c.website ? `<a class="contributor-card__link" href="${c.website}">Web</a>` : ""}
        </div>
      `
      );
      grid.appendChild(card);
    });
  }

  /* ---------- Dónde encontrar el Magazine ---------- */
  function mapsLink(point) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(point.name + ", " + point.address);
  }

  function renderDistroGrid(city) {
    const grid = document.getElementById("distroGrid");
    grid.innerHTML = "";
    const points = DISTRIBUTION_POINTS.filter((p) => p.city === city);
    if (!points.length) {
      grid.appendChild(
        el(
          "p",
          "distro-empty",
          `Estamos preparando nuestros puntos de distribución para la Edición #1 — Octubre 2026. Próximamente encontrarás aquí los establecimientos donde podrás recoger gratuitamente El Podcast del Migrante Magazine.`
        )
      );
      return;
    }
    points.forEach((p) => {
      const card = el(
        "article",
        "distro-card",
        `
        <div class="distro-card__top">
          <span class="distro-card__logo">${initials(p.name)}</span>
          <div>
            <h3 class="distro-card__name">${p.name}</h3>
            <span class="tag tag--sm">${p.city}</span>
          </div>
        </div>
        <p class="distro-card__address">${p.address}</p>
        <p class="distro-card__badge">Aquí puedes encontrar el Magazine gratis</p>
        <div class="distro-card__actions">
          <a class="btn-outline btn-outline--dark" href="${mapsLink(p)}" target="_blank" rel="noopener">Cómo llegar</a>
          ${p.website ? `<a class="distro-card__web" href="${p.website}">Web / redes</a>` : ""}
        </div>
      `
      );
      grid.appendChild(card);
    });
  }

  function buildDistribution() {
    const citiesWrap = document.getElementById("distroCities");
    DISTRIBUTION_CITIES.forEach((city, i) => {
      const btn = el("button", "distro-city-btn" + (i === 0 ? " is-active" : ""), city);
      btn.type = "button";
      btn.addEventListener("click", () => {
        citiesWrap.querySelectorAll(".distro-city-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        renderDistroGrid(city);
      });
      citiesWrap.appendChild(btn);
    });
    if (DISTRIBUTION_CITIES.length) renderDistroGrid(DISTRIBUTION_CITIES[0]);
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
    buildContributors();
    /* buildDistribution() se deja preparada en el código pero no se
       invoca todavía: la Edición #1 es exclusivamente digital y el
       Magazine impreso (con sus puntos de distribución) aún no se ha
       lanzado. Reactivar aquí cuando comience la edición física. */
    buildSponsors();
    bindNewsletter();
  });
})();
