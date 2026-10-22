/*
  canada-region.js — Ficha de una región en «Canadá en Datos»
  ======================================================================
  Páginas: canada-en-datos/<slug>.html (las genera
  scripts/build-canada-datos.mjs con todo el contenido ya escrito).
  Este script solo agrega lo que cambia con el tiempo:
  - el reloj local de la capital (js/canada-reloj.js);
  - las noticias publicadas de la región, leídas de ARTICLES
    (js/articles.js) SIN modificar el sistema editorial: se excluyen
    borradores y contenido demostrativo, y se ordenan de la más reciente
    a la más antigua.
  La página indica su región con <body data-cd-region="alberta">.
*/

(function () {
  "use strict";

  const slug = document.body.dataset.cdRegion;
  const region = typeof CD_REGIONS !== "undefined" && CD_REGIONS.find((r) => r.slug === slug);
  if (!region) return;
  const perfil = CD_PROFILES[region.profile];

  const reloj = document.getElementById("cdClock");
  if (reloj && window.CDReloj) window.CDReloj.montar(reloj, { timeZone: region.timeZone, coords: region.coords });

  const lista = document.getElementById("cdNews");
  if (!lista || !perfil || !perfil.news || typeof ARTICLES === "undefined") return;

  const { province, category, limit } = perfil.news;
  const noticias = ARTICLES
    .filter((a) => !a.draft && a.demo === false && a.slug && a.publishedAt)
    .filter((a) => (a.location && a.location.province === province) || a.category === category)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);

  if (!noticias.length) {
    lista.outerHTML = '<p class="cd-news-empty">Todavía no hay noticias publicadas sobre esta región.</p>';
    return;
  }

  const fecha = new Intl.DateTimeFormat("es-CA", { day: "numeric", month: "long", year: "numeric", timeZone: region.timeZone });
  lista.innerHTML = noticias
    .map((a) => {
      const li = document.createElement("li");
      const enlace = document.createElement("a");
      enlace.href = "/articulo-" + a.slug;
      const f = document.createElement("time");
      f.className = "cd-news__date";
      f.dateTime = a.publishedAt;
      f.textContent = fecha.format(new Date(a.publishedAt));
      const t = document.createElement("p");
      t.className = "cd-news__title";
      t.textContent = a.title;
      enlace.append(f, t);
      li.append(enlace);
      return li.outerHTML;
    })
    .join("");
})();
