/*
  noticias-archivo.js — Archivo de noticias (noticias.html)
  ======================================================================
  Lista todas las noticias publicadas de ARTICLES, de la más reciente a
  la más antigua, en páginas de PDM_NOTICIAS.POR_PAGINA:
  noticias (página 1), noticias?pagina=2, noticias?pagina=3…
  Cada fila enlaza a la página permanente del artículo
  (articulo-<slug>), la misma que se comparte en redes.
  Requiere js/articles.js y js/noticias.js.
*/
(function () {
  "use strict";

  if (window.PDM && window.PDM.initSiteChrome) window.PDM.initSiteChrome();

  const lista = document.getElementById("archivoLista");
  const paginas = document.getElementById("archivoPaginas");
  const resumen = document.getElementById("archivoResumen");
  if (!lista || typeof ARTICLES === "undefined" || !window.PDM_NOTICIAS) return;

  const N = window.PDM_NOTICIAS;
  const pedida = new URLSearchParams(location.search).get("pagina");
  const todas = N.publicadas(ARTICLES);
  const actual = N.pagina(todas, pedida === null ? 1 : Number(pedida));
  const hrefPagina = (n) => (n === 1 ? "noticias" : "noticias?pagina=" + n);

  /* Una página inexistente (?pagina=99, ?pagina=abc) muestra la primera con su dirección limpia. */
  if (pedida !== null && !actual.valida) history.replaceState(null, "", hrefPagina(1));

  if (actual.numero > 1) {
    document.title = `Todas las noticias — página ${actual.numero} — El Podcast del Migrante Magazine`;
    document.getElementById("canonicalLink").href = "https://podcastdelmigrante.com/" + hrefPagina(actual.numero);
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  lista.innerHTML = actual.items
    .map((a) => {
      const img = N.imagen(a);
      return `<a class="latest-row${img ? " latest-row--img" : ""}" href="articulo-${esc(a.slug)}">
        ${img ? `<span class="latest-row__thumb" style="background-image:url('${esc(img)}')"></span>` : ""}
        <span class="tag tag--sm">${esc(a.category)}</span>
        <span class="latest-row__title">${esc(a.title)}</span>
        <time class="latest-row__time" datetime="${esc(a.publishedAt)}">${N.fechaCorta(a.publishedAt)}</time>
      </a>`;
    })
    .join("");

  resumen.textContent =
    `${todas.length} noticias, de la más reciente a la más antigua.` +
    (actual.total > 1 ? ` Página ${actual.numero} de ${actual.total}.` : "");

  if (actual.total > 1) {
    const partes = [];
    partes.push(
      actual.numero > 1
        ? `<a class="news-pager__step" href="${hrefPagina(actual.numero - 1)}" rel="prev">← Anterior</a>`
        : `<span class="news-pager__step" aria-disabled="true">← Anterior</span>`,
    );
    for (let n = 1; n <= actual.total; n++) {
      partes.push(
        n === actual.numero
          ? `<a class="news-pager__num" href="${hrefPagina(n)}" aria-current="page" aria-label="Página ${n}, actual">${n}</a>`
          : `<a class="news-pager__num" href="${hrefPagina(n)}" aria-label="Página ${n}">${n}</a>`,
      );
    }
    partes.push(
      actual.numero < actual.total
        ? `<a class="news-pager__step" href="${hrefPagina(actual.numero + 1)}" rel="next">Siguiente →</a>`
        : `<span class="news-pager__step" aria-disabled="true">Siguiente →</span>`,
    );
    paginas.innerHTML = partes.join("");
    paginas.hidden = false;
  }
})();
