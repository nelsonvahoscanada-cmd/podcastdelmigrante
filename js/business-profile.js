/*
  business-profile.js — Plantilla ÚNICA de perfil empresarial
  ======================================================================
  Arma business-profile.html?slug=... a partir de un registro de
  js/businesses.js. Todos los perfiles (hoy Tomás Velázquez; mañana
  Carlos D. Castillo y los demás) usan esta misma plantilla.
  Los datos vacíos no se muestran: ni el texto, ni el botón, ni la
  sección. Los eventos de medición se emiten desde js/analytics.js.
========================================================================= */

(function () {
  "use strict";

  const SITE_ORIGIN = "https://podcastdelmigrante.com";
  const LANG_NAMES = { es: "español", en: "inglés", fr: "francés" };

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function findBusiness(slug) {
    return BUSINESSES.find((b) => b.slug === slug && b.published) || null;
  }

  function profileUrl(b) {
    return SITE_ORIGIN + "/business-profile.html?slug=" + encodeURIComponent(b.slug);
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }

  function mapsHref(b) {
    if (b.mapUrl) return b.mapUrl;
    if (!b.address) return "";
    const q = [b.address, b.city, b.province, b.postalCode].filter(Boolean).join(", ");
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  }

  function whatsappHref(b) {
    const digits = (b.whatsapp || "").replace(/\D/g, "");
    return digits ? "https://wa.me/" + digits : "";
  }

  function phoneHref(b) {
    const cleaned = (b.phone || "").replace(/[^\d+]/g, "");
    return cleaned ? "tel:" + cleaned : "";
  }

  function languageLine(b) {
    const names = (b.languages || []).map((l) => LANG_NAMES[l]).filter(Boolean);
    return names.length ? "Atención en " + names.join(" y ") : "";
  }

  /* ---------- Botones de contacto: solo los que tienen dato real ---------- */
  function actionList(b) {
    const list = [];
    const wa = whatsappHref(b);
    if (wa) list.push({ key: "whatsapp", label: "WhatsApp", href: wa, ext: true, track: "whatsapp_click", target: "whatsapp" });
    const tel = phoneHref(b);
    if (tel) list.push({ key: "phone", label: "Llamar", href: tel, ext: false, track: "phone_click", target: "phone" });
    if (b.inventoryUrl) list.push({ key: "inventory", label: b.inventoryLabel || "Ver catálogo", href: b.inventoryUrl, ext: true, track: "website_click", target: "inventory" });
    const map = mapsHref(b);
    if (map) list.push({ key: "maps", label: "Cómo llegar", href: map, ext: true, track: "maps_click", target: "maps" });
    if (b.email) list.push({ key: "email", label: "Enviar email", href: "mailto:" + b.email, ext: false, track: "email_click", target: "email" });
    return list;
  }

  function linkAttrs(a) {
    return `href="${esc(a.href)}"${a.ext ? ' target="_blank" rel="noopener"' : ""} data-track="${a.track}" data-track-target="${a.target}"`;
  }

  function actionsHtml(b) {
    const list = actionList(b);
    if (!list.length) return "";
    return `<div class="biz-actions">${list
      .map((a, i) => `<a class="biz-btn${i === 0 ? " biz-btn--primary" : ""}" ${linkAttrs(a)}>${esc(a.label)}</a>`)
      .join("")}</div>`;
  }

  /* ---------- Secciones ---------- */
  function heroHtml(b) {
    const media = b.profileImage
      ? `<img class="biz-hero__photo" src="${esc(b.profileImage)}" alt="${esc(b.name)}" fetchpriority="high">`
      : `<div class="biz-hero__photo biz-hero__photo--initials" role="img" aria-label="${esc(b.name)}">${esc(initials(b.name))}</div>`;
    const place = [b.city, b.province].filter(Boolean).join(", ");
    const lang = languageLine(b);
    return `
      <header class="biz-hero">
        <div class="biz-hero__media">${media}</div>
        <div class="biz-hero__body">
          <span class="biz-label">Perfil empresarial</span>
          <h1 class="biz-name">${esc(b.name)}</h1>
          ${b.professionalTitle ? `<p class="biz-title">${esc(b.professionalTitle)}</p>` : ""}
          ${b.company ? `<p class="biz-company">${esc(b.company)}</p>` : ""}
          ${place ? `<p class="biz-place">${esc(place)}</p>` : ""}
          ${lang ? `<p class="biz-lang">${esc(lang)}</p>` : ""}
        </div>
      </header>
    `;
  }

  function callToActionHtml(b) {
    const cta = b.callToAction;
    if (!cta || !cta.title) return "";
    return `
      <section class="biz-section biz-cta">
        <h2 class="biz-h2">${esc(cta.title)}</h2>
        ${cta.text ? `<p>${esc(cta.text)}</p>` : ""}
      </section>
    `;
  }

  function aboutHtml(b) {
    if (!b.longDescription) return "";
    return `<section class="biz-section"><p class="biz-long">${esc(b.longDescription)}</p></section>`;
  }

  function videoHtml(b) {
    if (!b.youtubeVideoId) return "";
    const id = encodeURIComponent(b.youtubeVideoId);
    return `
      <section class="biz-section biz-video">
        <h2 class="biz-h2">Conoce a ${esc(b.shortName || b.name)}</h2>
        ${b.videoText ? `<p>${esc(b.videoText)}</p>` : ""}
        <div class="biz-video__frame" id="bizVideoFrame">
          <button type="button" class="biz-video__play" id="bizVideoPlay" data-track="video_click" data-video-id="${id}" aria-label="Reproducir video de presentación">
            <span class="biz-video__thumb" style="background-image:url('https://img.youtube.com/vi/${id}/hqdefault.jpg')"></span>
            <span class="biz-video__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg></span>
          </button>
        </div>
      </section>
    `;
  }

  /* El reproductor NO se carga hasta que la persona pulsa (carga eficiente,
     sin autoplay al abrir la página). Al pulsar:
       - video_click  → lo emite analytics.js (data-track en el botón)
       - video_start  → se emite UNA vez cuando YouTube informa que la
                        reproducción realmente comenzó (mensaje del iframe,
                        sin cargar scripts de terceros). Si el navegador o
                        YouTube no envían ese mensaje, simplemente no se
                        registra: nunca se inventa. */
  const YT_ORIGIN = "https://www.youtube-nocookie.com";

  function bindVideo(b) {
    const btn = document.getElementById("bizVideoPlay");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const frame = document.getElementById("bizVideoFrame");
      const origin = /^https?:/.test(window.location.origin) ? "&origin=" + encodeURIComponent(window.location.origin) : "";
      frame.innerHTML = `<iframe src="${YT_ORIGIN}/embed/${btn.getAttribute("data-video-id")}?autoplay=1&rel=0&enablejsapi=1${origin}" title="Video de presentación de ${esc(b.name)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      const iframe = frame.querySelector("iframe");
      let started = false;
      function onMessage(ev) {
        if (ev.origin !== YT_ORIGIN || !iframe || ev.source !== iframe.contentWindow) return;
        let data = ev.data;
        try { if (typeof data === "string") data = JSON.parse(data); } catch (e) { return; }
        const state = data && (data.event === "onStateChange" ? data.info : data.info && data.info.playerState);
        if (!started && state === 1) {
          started = true;
          window.PDM.analytics.track("video_start", { target: "profile-video" });
          window.removeEventListener("message", onMessage);
        }
      }
      window.addEventListener("message", onMessage);
      iframe.addEventListener("load", () => {
        try { iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YT_ORIGIN); } catch (e) {}
      });
    });
  }

  function servicesHtml(b) {
    const active = (b.services || []).filter((s) => s.active);
    if (!active.length) return "";
    return `
      <section class="biz-section biz-services">
        <h2 class="biz-h2">¿Cómo puede ayudarte ${esc(b.shortName || b.name)}?</h2>
        <ul class="biz-services__list">
          ${active
            .map((s) => `<li class="biz-service"><strong>${esc(s.label)}</strong>${s.description ? `<span>${esc(s.description)}</span>` : ""}</li>`)
            .join("")}
        </ul>
      </section>
    `;
  }

  function galleryHtml(b) {
    if (!b.gallery || !b.gallery.length) return "";
    return `<section class="biz-section biz-gallery">${b.gallery
      .map((g) => `<img src="${esc(g.src || g)}" alt="${esc(g.alt || b.name)}" loading="lazy">`)
      .join("")}</section>`;
  }

  function locationHtml(b) {
    if (!b.address) return "";
    const map = mapsHref(b);
    const hours = (b.hours || []).length
      ? `<ul class="biz-hours">${b.hours.map((h) => `<li><span>${esc(h.day)}</span><span>${esc(h.time)}</span></li>`).join("")}</ul>`
      : "";
    return `
      <section class="biz-section biz-location">
        <h2 class="biz-h2">¿Dónde encontrarlo?</h2>
        <address class="biz-address">
          ${b.company ? `<strong>${esc(b.company)}</strong><br>` : ""}
          ${esc(b.address)}<br>
          ${esc([b.city, b.province].filter(Boolean).join(", "))}${b.postalCode ? `<br>${esc(b.postalCode)}` : ""}
        </address>
        ${hours}
        ${map ? `<a class="biz-btn biz-btn--outline" href="${esc(map)}" target="_blank" rel="noopener" data-track="maps_click" data-track-target="maps-location">Cómo llegar →</a>` : ""}
      </section>
    `;
  }

  function socialHtml(b) {
    const items = [["Instagram", b.instagram], ["Facebook", b.facebook], ["LinkedIn", b.linkedin]].filter((x) => x[1]);
    if (!items.length) return "";
    return `<p class="biz-social">${items.map((x) => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${x[0]}</a>`).join("")}</p>`;
  }

  function contactBlockHtml(b) {
    const channels = [];
    const wa = whatsappHref(b);
    if (wa) channels.push({ label: "WhatsApp", href: wa, ext: true, track: "whatsapp_click", target: "whatsapp-final" });
    const tel = phoneHref(b);
    if (tel) channels.push({ label: "Llamar", href: tel, ext: false, track: "phone_click", target: "phone-final" });
    if (b.email) channels.push({ label: "Email", href: "mailto:" + b.email, ext: false, track: "email_click", target: "email-final" });
    if (b.website) channels.push({ label: "Visitar sitio web", href: b.website, ext: true, track: "website_click", target: "website" });
    if (!channels.length) return "";
    return `
      <section class="biz-section biz-contact">
        <h2 class="biz-h2">¿Quieres hablar con ${esc(b.shortName || b.name)}?</h2>
        <div class="biz-actions">${channels
          .map((a, i) => `<a class="biz-btn${i === 0 ? " biz-btn--primary" : ""}" ${linkAttrs(a)}>${esc(a.label)}</a>`)
          .join("")}</div>
        ${socialHtml(b)}
      </section>
    `;
  }

  /* Barra inferior móvil: WhatsApp | Llamar | Ver (solo los disponibles) */
  function stickyBarHtml(b) {
    const keep = ["whatsapp", "phone", "inventory"];
    const list = actionList(b).filter((a) => keep.includes(a.key));
    if (!list.length) return "";
    return `<nav class="biz-sticky" aria-label="Contacto rápido">${list
      .map((a, i) => `<a class="biz-sticky__btn${i === 0 ? " biz-sticky__btn--primary" : ""}" ${linkAttrs(a)}>${esc(a.label)}</a>`)
      .join("")}</nav>`;
  }

  /* ---------- SEO ---------- */
  function setMeta(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  }

  function toAbsolute(src) {
    return /^https?:\/\//.test(src) ? src : SITE_ORIGIN + "/" + src.replace(/^\//, "");
  }

  /* Imagen para compartir: ogImage > profileImage > coverImage > logo del sitio */
  function absoluteImage(b) {
    const src = b.ogImage || b.profileImage || b.coverImage;
    return src ? toAbsolute(src) : SITE_ORIGIN + "/assets/logo.png";
  }

  function setSEO(b) {
    const title = (b.seo && b.seo.title) || b.name + " | El Podcast del Migrante";
    const description = (b.seo && b.seo.description) || b.shortDescription || "";
    const url = profileUrl(b);
    document.title = title;
    setMeta("metaDescription", "content", description);
    setMeta("canonicalLink", "href", url);
    setMeta("ogType", "content", "profile");
    setMeta("ogTitle", "content", title);
    setMeta("ogDescription", "content", description);
    setMeta("ogUrl", "content", url);
    setMeta("ogImage", "content", absoluteImage(b));
    setMeta("twitterTitle", "content", title);
    setMeta("twitterDescription", "content", description);
    setMeta("twitterImage", "content", absoluteImage(b));

    /* Datos estructurados: ProfilePage + Person. Sin reviews ni ratings. */
    const sameAs = [b.instagram, b.facebook, b.linkedin].filter(Boolean);
    const person = { "@type": "Person", name: b.name, url };
    if (b.professionalTitle) person.jobTitle = b.professionalTitle;
    if (b.profileImage) person.image = toAbsolute(b.profileImage);
    if (b.company) {
      person.worksFor = { "@type": "Organization", name: b.company };
      if (b.website) person.worksFor.url = b.website;
      if (b.address) {
        person.worksFor.address = Object.assign(
          { "@type": "PostalAddress", streetAddress: b.address },
          b.city ? { addressLocality: b.city } : {},
          b.province ? { addressRegion: b.province } : {},
          b.postalCode ? { postalCode: b.postalCode } : {},
          b.country ? { addressCountry: "CA" } : {}
        );
      }
    }
    if (sameAs.length) person.sameAs = sameAs;
    const jsonLd = { "@context": "https://schema.org", "@type": "ProfilePage", url, name: title, description, mainEntity: person };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }

  /* ---------- Render ---------- */
  function renderProfile(b) {
    setSEO(b);
    const root = document.getElementById("bizRoot");
    root.innerHTML = `
      ${heroHtml(b)}
      ${actionsHtml(b)}
      ${callToActionHtml(b)}
      ${aboutHtml(b)}
      ${videoHtml(b)}
      ${servicesHtml(b)}
      ${galleryHtml(b)}
      ${locationHtml(b)}
      ${contactBlockHtml(b)}
      <p class="biz-note">Perfil empresarial. Verifica directamente con el profesional los servicios, condiciones y disponibilidad antes de tomar decisiones.</p>
      <a class="biz-back" href="quien-puede-ayudarte.html">← Volver a Quién puede ayudarte</a>
    `;
    const bar = stickyBarHtml(b);
    if (bar) {
      document.body.insertAdjacentHTML("beforeend", bar);
      document.body.classList.add("has-sticky-bar");
    }
    bindVideo(b);
    window.PDM.analytics.setContext({ business: b.slug, category: b.category, city: b.city });
    window.PDM.analytics.track("profile_view");
  }

  function renderNotFound() {
    document.title = "Perfil no encontrado | El Podcast del Migrante";
    document.getElementById("bizRoot").innerHTML = `
      <div class="biz-notfound">
        <h1>No encontramos este perfil</h1>
        <p>Puede que el enlace esté incompleto o el perfil todavía no esté disponible.</p>
        <a class="biz-btn biz-btn--primary" href="quien-puede-ayudarte.html">Ver quién puede ayudarte</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const slug = getParam("slug");
    const business = slug ? findBusiness(slug) : null;
    if (business) renderProfile(business);
    else renderNotFound();
  });
})();
