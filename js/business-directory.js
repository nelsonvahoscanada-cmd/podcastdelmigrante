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

  const isFree = (b) => b.plan === "gratuito";
  const categoryLabel = (id) => ((typeof BUSINESS_CATEGORIES !== "undefined" ? BUSINESS_CATEGORIES : []).find((c) => c.id === id) || {}).label || "";

  /* Ficha del plan Gratuito: plantilla compartida y ligera, sin miniweb.
     Imagen, nombre, categoría, ciudad y provincia, descripción breve y
     teléfono VISIBLE como texto (no es el botón de llamada de Premium),
     más una invitación discreta a conocer el plan Premium. */
  function freeCardHtml(b) {
    const img = b.cardImage || b.profileImage;
    const photo = img
      ? `<img class="biz-card__photo${b.profileImageKind === "logo" && !b.cardImage ? " biz-card__photo--logo" : ""}" src="${esc(img)}" alt="${esc(b.name)}" width="84" height="84" loading="lazy">`
      : `<div class="biz-card__photo biz-card__photo--initials" aria-hidden="true">${esc(initials(b.name))}</div>`;
    const place = [b.city, b.province].filter(Boolean).join(", ");
    const tel = String(b.phone || "").replace(/[^\d+]/g, "");
    return `
      <article class="biz-card biz-card--free">
        ${photo}
        <div class="biz-card__body">
          <h2 class="biz-card__name">${esc(b.name)}</h2>
          ${categoryLabel(b.category) ? `<p class="biz-card__title">${esc(categoryLabel(b.category))}</p>` : ""}
          ${place ? `<p class="biz-card__place">${esc(place)}</p>` : ""}
          ${b.shortDescription ? `<p class="biz-card__desc">${esc(b.shortDescription)}</p>` : ""}
          ${tel ? `<p class="biz-card__phone">Teléfono: <a href="tel:${esc(tel)}">${esc(b.phone)}</a></p>` : ""}
          <a class="biz-card__upsell" href="planes-directorio">¿Es tu negocio? Conoce Premium</a>
        </div>
      </article>
    `;
  }

  function cardHtml(b) {
    if (isFree(b)) return freeCardHtml(b);
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
          <h2 class="biz-card__name">${esc(b.name)}</h2>
          ${title ? `<p class="biz-card__title">${esc(title)}</p>` : ""}
          ${b.company ? `<p class="biz-card__company">${esc(b.company)}</p>` : ""}
          ${place ? `<p class="biz-card__place">${esc(place)}</p>` : ""}
          ${langs.length ? `<p class="biz-card__langs">${langs.map(esc).join(" | ")}</p>` : ""}
          <a class="biz-btn biz-btn--primary biz-card__cta" href="perfil-${encodeURIComponent(b.slug)}">Ver perfil →</a>
        </div>
      </article>
    `;
  }

  /* Orden: destacados primero; después, Perfiles Premium antes que las
     fichas gratuitas; dentro de cada grupo, orden de alta en businesses.js */
  function results(category, province, city) {
    return published()
      .filter((b) => (!category || b.category === category) && (!province || provincesOf(b).includes(province)) && (!city || b.city === city))
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || Number(isFree(a)) - Number(isFree(b)));
  }

  /* Todo el directorio, sin filtros. El mismo HTML lo escribe en
     quien-puede-ayudarte.html scripts/build-profile-pages.mjs, para que los
     nombres, categorías y enlaces se lean sin JavaScript. */
  function allCardsHtml() {
    return results("", "", "").map(cardHtml).join("");
  }

  function render() {
    const category = document.getElementById("fCategory").value;
    const province = document.getElementById("fProvince").value;
    const city = document.getElementById("fCity").value;
    const list = results(category, province, city);
    const box = document.getElementById("bizResults");
    if (!list.length) {
      box.innerHTML = `<p class="biz-empty">Todavía no hay perfiles para esta búsqueda. Estamos sumando profesionales poco a poco.</p>`;
      return;
    }
    box.innerHTML = list.map(cardHtml).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.PDM.initSiteChrome();
    const catSel = document.getElementById("fCategory");
    const provSel = document.getElementById("fProvince");
    const citySel = document.getElementById("fCity");

    /* Selección inicial: todo el directorio (todas las categorías,
       provincias y ciudades). Antes abría filtrado en «Alberta · Calgary»,
       que ocultaba los perfiles de otras provincias. */
    fillCategories(catSel, "");
    fillProvinces(provSel, "");
    fillCities(citySel, "", "");
    /* La página ya trae todo el directorio en el HTML (data-prerendered): sin
       filtros no hace falta volver a dibujarlo. */
    const box = document.getElementById("bizResults");
    if (!box.hasAttribute("data-prerendered")) render();

    catSel.addEventListener("change", render);
    provSel.addEventListener("change", () => {
      fillCities(citySel, provSel.value, "");
      render();
    });
    citySel.addEventListener("change", render);
  });

  /* Para scripts/build-profile-pages.mjs (tarjetas del directorio en el HTML) */
  window.PDMBizDirectory = { allCardsHtml, results, categoryLabel };
})();
