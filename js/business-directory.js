/*
  business-directory.js — "Encuentra quién puede ayudarte en Canadá"
  ======================================================================
  Directorio alimentado por js/businesses.js. Los filtros (¿Qué
  necesitas? / Provincia / Ciudad) se construyen SOLO con negocios
  publicados reales. Las categorías sin negocios aparecen deshabilitadas
  ("próximamente") y nunca con negocios inventados.
========================================================================= */

(function () {
  "use strict";

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }

  const published = () => BUSINESSES.filter((b) => b.published);
  const unique = (arr) => [...new Set(arr)];

  function fillCategories(select, selected) {
    const live = new Set(published().map((b) => b.category));
    select.innerHTML =
      `<option value=""${selected ? "" : " selected"}>Todas las categorías</option>` +
      BUSINESS_CATEGORIES.map(
      (c) => `<option value="${c.id}"${live.has(c.id) ? "" : " disabled"}${c.id === selected ? " selected" : ""}>${esc(c.label)}${live.has(c.id) ? "" : " — próximamente"}</option>`
    ).join("");
  }

  /* Provincia: donde está el profesional + provincias donde indica prestar
     servicios (serviceAreas). La ciudad siempre es la de su ubicación. */
  const provincesOf = (b) => unique([b.province].concat(b.serviceAreas || []).filter(Boolean));

  function fillProvinces(select, selected) {
    const provinces = unique(published().flatMap(provincesOf)).sort();
    select.innerHTML =
      `<option value="">Todas las provincias</option>` +
      provinces.map((p) => `<option value="${esc(p)}"${p === selected ? " selected" : ""}>${esc(p)}</option>`).join("");
  }

  function fillCities(select, province, selected) {
    const cities = unique(published().filter((b) => !province || b.province === province).map((b) => b.city)).sort();
    select.innerHTML =
      `<option value="">Todas las ciudades</option>` +
      cities.map((c) => `<option value="${esc(c)}"${c === selected ? " selected" : ""}>${esc(c)}</option>`).join("");
  }

  const LANG_NATIVE = { es: "Español", en: "English", fr: "Français" };

  function cardHtml(b) {
    const img = b.cardImage || b.profileImage;
    const photo = img
      ? `<img class="biz-card__photo${b.profileImageKind === "logo" && !b.cardImage ? " biz-card__photo--logo" : ""}" src="${esc(img)}" alt="${esc(b.name)}" width="84" height="84" loading="lazy">`
      : `<div class="biz-card__photo biz-card__photo--initials" aria-hidden="true">${esc(initials(b.name))}</div>`;
    const place = [b.city, b.province].filter(Boolean).join(", ");
    const title = (b.card && b.card.title) || b.professionalTitle;
    const langs = (b.languages || []).map((l) => LANG_NATIVE[l]).filter(Boolean);
    return `
      <article class="biz-card">
        ${photo}
        <div class="biz-card__body">
          <h3 class="biz-card__name">${esc(b.name)}</h3>
          ${title ? `<p class="biz-card__title">${esc(title)}</p>` : ""}
          ${b.company ? `<p class="biz-card__company">${esc(b.company)}</p>` : ""}
          ${place ? `<p class="biz-card__place">${esc(place)}</p>` : ""}
          ${langs.length ? `<p class="biz-card__langs">${langs.map(esc).join(" | ")}</p>` : ""}
          <a class="biz-btn biz-btn--primary biz-card__cta" href="perfil-${encodeURIComponent(b.slug)}.html">Ver perfil →</a>
        </div>
      </article>
    `;
  }

  function render() {
    const category = document.getElementById("fCategory").value;
    const province = document.getElementById("fProvince").value;
    const city = document.getElementById("fCity").value;
    /* Orden: destacados primero; después, orden de alta en businesses.js */
    const results = published()
      .filter((b) => (!category || b.category === category) && (!province || provincesOf(b).includes(province)) && (!city || b.city === city))
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    const box = document.getElementById("bizResults");
    if (!results.length) {
      box.innerHTML = `<p class="biz-empty">Todavía no hay perfiles para esta búsqueda. Estamos sumando profesionales poco a poco.</p>`;
      return;
    }
    box.innerHTML = results.map(cardHtml).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const catSel = document.getElementById("fCategory");
    const provSel = document.getElementById("fProvince");
    const citySel = document.getElementById("fCity");

    /* Selección inicial: Todas las categorías · Alberta · Calgary */
    fillCategories(catSel, "");
    fillProvinces(provSel, "Alberta");
    fillCities(citySel, "Alberta", "Calgary");
    render();

    catSel.addEventListener("change", render);
    provSel.addEventListener("change", () => {
      fillCities(citySel, provSel.value, "");
      render();
    });
    citySel.addEventListener("change", render);
  });
})();
