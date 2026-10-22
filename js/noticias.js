/*
  noticias.js — Selección y orden de noticias publicadas
  ======================================================================
  Fuente única: ARTICLES (js/articles.js). No hay una lista aparte que
  mantener a mano: al publicar una noticia nueva (agregar su objeto a
  ARTICLES), la portada y el archivo se actualizan solos.

  - Noticia publicada = contentType "Noticia", demo === false, sin
    `draft` y en español. Orden: publishedAt, de la más reciente a la
    más antigua.
  - Portada («Últimas noticias»): las 5 más recientes que no estén ya
    en el bloque principal (HERO), para no repetir titulares.
  - Archivo (noticias.html): todas, en páginas de POR_PAGINA.
  Se carga en el navegador (window.PDM_NOTICIAS) y en Node (pruebas).
*/
(function (raiz) {
  "use strict";

  const EN_PORTADA = 5;
  const POR_PAGINA = 12;
  const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

  function publicadas(articulos) {
    return articulos
      .filter((a) => a.contentType === "Noticia" && a.demo === false && !a.draft && (a.lang || "es") === "es")
      .slice()
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }

  function slugsDelHero(hero) {
    if (!hero) return [];
    return [hero.main, ...(hero.secondary || [])].filter((h) => h && h.slug).map((h) => h.slug);
  }

  function portada(articulos, hero, cantidad = EN_PORTADA) {
    const enHero = new Set(slugsDelHero(hero));
    return publicadas(articulos).filter((a) => !enHero.has(a.slug)).slice(0, cantidad);
  }

  /* Página pedida (1 si no es válida) y los artículos que le tocan. */
  function pagina(lista, numero, porPagina = POR_PAGINA) {
    const total = Math.max(1, Math.ceil(lista.length / porPagina));
    const n = Number.isInteger(numero) && numero >= 1 && numero <= total ? numero : 1;
    return { numero: n, total, valida: n === numero, items: lista.slice((n - 1) * porPagina, n * porPagina) };
  }

  /* «19 OCT 2026»: fecha local de publicación tal como está escrita en
     publishedAt (ISO con su desfase), sin depender de la zona horaria
     del lector. */
  function fechaCorta(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}` : "";
  }

  function imagen(articulo) {
    const m = /url\(['"]?([^'")]+)['"]?\)/.exec((articulo.heroImage && articulo.heroImage.background) || "");
    return m ? m[1] : "";
  }

  const api = { EN_PORTADA, POR_PAGINA, publicadas, portada, pagina, fechaCorta, imagen };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.PDM_NOTICIAS = api;
})(typeof window !== "undefined" ? window : globalThis);
