/*
  vistas.js — Contador público de visualizaciones (noticias y guías)
  ======================================================================
  js/article.js deja en la línea de fecha un hueco oculto:
    <span class="article-views" data-vistas-id="ART-…" data-publicado="…" hidden>
  Este archivo:
    1. Pide la cifra (GET /api/vistas/ART-…, en caché 60 s) y la muestra:
       «· 1.248 visualizaciones». Si el servicio no responde, no se muestra
       nada: la noticia se lee igual.
    2. Registra UNA visualización (POST) cuando la pestaña lleva 5 segundos
       visible, como máximo una vez por noticia cada 30 minutos en esta
       pestaña (sessionStorage). El servidor vuelve a comprobar todo
       (functions/_lib/vistas.js): dominio oficial, robots, duplicados.
  No usa cookies ni almacenamiento persistente, no envía datos personales y nunca envía
  un número: el servidor solo suma 1.
  Ver docs/contador-visualizaciones.md.
*/
(function () {
  "use strict";

  const ESPERA_MS = 5000;
  const VENTANA_MS = 30 * 60 * 1000;
  const CLAVE = "pdm_vistas";
  const MESES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];
  /* Las piezas publicadas antes de esta fecha mostrarán «desde el [inicio]»
     (la medición empieza con esta versión): solo sirve para reservar el
     espacio con la forma correcta. La cifra y la fecha reales vienen del servidor. */
  const ANTES_DE_LA_MEDICION = Date.parse("2026-10-27T00:00:00-06:00");
  const OJO =
    '<svg class="article-views__icono" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

  /* El hueco lo dibuja js/article.js en DOMContentLoaded: ver iniciar(). */
  let hueco = null;
  let id = "";
  let url = "";

  /* 1248 → «1.248» (el formato es-CA del navegador usaría un espacio). */
  function miles(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /* Fecha de inicio de la medición en hora de Alberta: «25 oct. 2026». */
  function fechaCorta(iso) {
    const p = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(new Date(iso))
      .forEach((x) => (p[x.type] = x.value));
    return `${Number(p.day)} ${MESES[Number(p.month) - 1]} ${p.year}`;
  }

  function textoHtml(n, desde) {
    return (
      '<span class="article-views__sep" aria-hidden="true"> · </span>' +
      OJO +
      '<span class="article-views__n">' + miles(n) + "</span> " +
      (n === 1 ? "visualización" : "visualizaciones") +
      desde
    );
  }

  /* Espacio reservado: se escribe en la misma tarea en que js/article.js
     dibuja la noticia (antes de que el navegador la pinte), invisible y con la
     misma forma que tendrá la cifra. Al llegar el dato solo cambia el texto:
     la línea no salta ni empuja lo que está debajo, también en celular. */
  function reservar() {
    const publicado = Date.parse(hueco.getAttribute("data-publicado") || "");
    const desde = publicado && publicado < ANTES_DE_LA_MEDICION ? " desde el 25 oct. 2026" : "";
    hueco.innerHTML = textoHtml(10, desde);
    hueco.classList.add("article-views--reserva");
    hueco.setAttribute("aria-hidden", "true");
    hueco.hidden = false;
  }

  function mostrar(datos) {
    const n = Math.max(0, Math.floor(Number(datos.vistas) || 0));
    const publicado = Date.parse(hueco.getAttribute("data-publicado") || "");
    const inicio = datos.inicio ? Date.parse(datos.inicio) : NaN;
    /* Publicada antes de que empezara la medición: se dice desde cuándo se cuenta. */
    const desde = inicio && publicado && publicado < inicio ? " desde el " + fechaCorta(datos.inicio) : "";
    hueco.innerHTML = textoHtml(n, desde);
    hueco.classList.remove("article-views--reserva");
    hueco.removeAttribute("aria-hidden");
    hueco.hidden = false;
  }

  function ocultar() {
    hueco.hidden = true;
    hueco.innerHTML = "";
  }

  function yaContada() {
    try {
      const m = JSON.parse(window.sessionStorage.getItem(CLAVE) || "{}");
      return Boolean(m[id] && Date.now() - m[id] < VENTANA_MS);
    } catch (e) {
      return false;
    }
  }

  function marcar() {
    try {
      const m = JSON.parse(window.sessionStorage.getItem(CLAVE) || "{}");
      const ahora = Date.now();
      for (const k of Object.keys(m)) if (ahora - m[k] >= VENTANA_MS) delete m[k];
      m[id] = ahora;
      window.sessionStorage.setItem(CLAVE, JSON.stringify(m));
    } catch (e) {
      /* sin sessionStorage, el servidor igual evita los duplicados */
    }
  }

  function registrar() {
    if (navigator.webdriver || yaContada()) return;
    marcar();
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(function () {});
  }

  /* 5 segundos con la pestaña visible (el tiempo en segundo plano no cuenta). */
  function esperarVisible() {
    let restante = ESPERA_MS;
    let desde = 0;
    let temporizador = null;
    function arrancar() {
      if (temporizador || document.visibilityState !== "visible" || document.prerendering) return;
      desde = Date.now();
      temporizador = setTimeout(function () {
        temporizador = null;
        restante = 0;
        document.removeEventListener("visibilitychange", cambio);
        registrar();
      }, restante);
    }
    function pausar() {
      if (!temporizador) return;
      clearTimeout(temporizador);
      temporizador = null;
      restante = Math.max(0, restante - (Date.now() - desde));
    }
    function cambio() {
      if (document.visibilityState === "visible") arrancar();
      else pausar();
    }
    document.addEventListener("visibilitychange", cambio);
    if (document.prerendering) document.addEventListener("prerenderingchange", arrancar, { once: true });
    arrancar();
  }

  /* Solo en el dominio oficial (y en 127.0.0.1/localhost para las pruebas
     locales). En las vistas previas (*.pages.dev) no se consulta ni se
     registra nada; el servidor también las rechaza. */
  const DOMINIOS = ["podcastdelmigrante.com", "127.0.0.1", "localhost"];

  function iniciar() {
    if (!DOMINIOS.includes(window.location.hostname)) return;
    hueco = document.querySelector(".article-views[data-vistas-id]");
    if (!hueco || !window.fetch) return;
    id = hueco.getAttribute("data-vistas-id");
    url = "/api/vistas/" + encodeURIComponent(id);
    reservar();
    fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (datos) {
        if (!datos || datos.id !== id) return ocultar();
        mostrar(datos);
        esperarVisible();
      })
      .catch(function () {
        /* servicio no disponible: la noticia se lee igual, sin contador */
        ocultar();
      });
  }

  /* Este script se carga después de js/article.js: su DOMContentLoaded corre
     después del de article.js, cuando el hueco ya existe. */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
