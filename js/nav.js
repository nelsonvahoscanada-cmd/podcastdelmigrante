/*
  nav.js — Cabecera, navegación y footer compartidos
  ------------------------------------------------------------------------
  Usado por index.html y por la plantilla de artículo (articulo.html).
  Se agregó en la Fase 2 exclusivamente para no duplicar el header/menú/
  footer en dos archivos JS distintos — el comportamiento es idéntico
  al que ya existía en main.js, solo cambió de lugar.

  Requiere que NAV_PRIMARY y NAV_MORE (de data.js) estén cargados antes.
  Expone window.PDM con las utilidades compartidas con main.js/article.js.
*/

(function (global) {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function initials(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  function buildNav() {
    const primary = document.getElementById("navPrimary");
    NAV_PRIMARY.forEach((item) => {
      const a = el("a", "nav-link", item.label);
      a.href = item.href;
      primary.appendChild(a);
    });

    const more = document.getElementById("navMoreMenu");
    NAV_MORE.forEach((item) => {
      const a = el("a", "nav-more-link", item.label);
      a.href = item.href;
      more.appendChild(a);
    });

    const mobileList = document.getElementById("mobileNavList");
    [...NAV_PRIMARY, ...NAV_MORE].forEach((item) => {
      const a = el("a", "mobile-nav-link", item.label);
      a.href = item.href;
      a.addEventListener("click", closeMobileMenu);
      mobileList.appendChild(a);
    });
  }

  function toggleMoreMenu() {
    const menu = document.getElementById("navMoreMenu");
    const btn = document.getElementById("navMoreBtn");
    const isOpen = menu.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(isOpen));
  }

  function openMobileMenu() {
    document.getElementById("mobileNav").classList.add("is-open");
    document.getElementById("navToggle").setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
  }

  function closeMobileMenu() {
    document.getElementById("mobileNav").classList.remove("is-open");
    document.getElementById("navToggle").setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
  }

  function toggleSearch() {
    const bar = document.getElementById("searchBar");
    const isOpen = bar.classList.toggle("is-open");
    document.getElementById("searchToggle").setAttribute("aria-expanded", String(isOpen));
    if (isOpen) bar.querySelector("input").focus();
    updateHeaderOffset();
  }

  function fillYear() {
    const node = document.getElementById("yearNow");
    if (node) node.textContent = new Date().getFullYear();
  }

  function bindHeaderScroll() {
    const header = document.getElementById("siteHeader");
    let lastState = false;
    window.addEventListener(
      "scroll",
      () => {
        const shouldShrink = window.scrollY > 12;
        if (shouldShrink !== lastState) {
          header.classList.toggle("is-scrolled", shouldShrink);
          lastState = shouldShrink;
        }
      },
      { passive: true }
    );
  }

  function updateHeaderOffset() {
    const header = document.getElementById("siteHeader");
    if (!header) return;
    // +1px de margen para que el borde inferior del header nunca quede pegado al título
    document.documentElement.style.setProperty("--header-offset", header.offsetHeight + 1 + "px");
  }

  function bindHeaderEvents() {
    document.getElementById("navMoreBtn").addEventListener("click", toggleMoreMenu);
    document.getElementById("navToggle").addEventListener("click", openMobileMenu);
    document.getElementById("mobileNavClose").addEventListener("click", closeMobileMenu);
    document.getElementById("searchToggle").addEventListener("click", toggleSearch);

    document.addEventListener("click", (e) => {
      const moreMenu = document.getElementById("navMoreMenu");
      const moreBtn = document.getElementById("navMoreBtn");
      if (moreMenu.classList.contains("is-open") && !moreMenu.contains(e.target) && e.target !== moreBtn) {
        moreMenu.classList.remove("is-open");
        moreBtn.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMobileMenu();
        document.getElementById("navMoreMenu").classList.remove("is-open");
      }
    });
  }

  function scrollToHashOnLoad() {
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) target.scrollIntoView();
    }
  }

  /* Punto de entrada único: cabecera, menú, footer y offset de anchors.
     Cada página llama a esto y luego arma su propio contenido. */
  function initSiteChrome() {
    buildNav();
    fillYear();
    bindHeaderScroll();
    bindHeaderEvents();
    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);
    scrollToHashOnLoad();
  }

  global.PDM = global.PDM || {};
  Object.assign(global.PDM, {
    el,
    initials,
    prefersReducedMotion,
    updateHeaderOffset,
    initSiteChrome,
  });
})(window);
