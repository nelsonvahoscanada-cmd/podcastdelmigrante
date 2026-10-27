/*
  vistas.js — Contador público de visualizaciones (noticias y guías)
  ======================================================================
  js/article.js deja en la línea de fecha un hueco oculto:
    <span class="article-views" data-vistas-id="ART-…" data-publicado="…" hidden>
  Este archivo:
    1. Pide la cifra (GET /api/vistas/ART-…, en caché 60 s) y la muestra:
       «· 1.248 visualizaciones». Las piezas publicadas ANTES de la activación
       del contador (hora exacta de vistas_config.inicio, que envía el
       servidor) muestran en su lugar «· Artículo del Magazine»: su cifra no
       refleja toda su vida. Si el servicio no responde, no se muestra nada:
       la noticia se lee igual.
    2. Registra UNA visualización (POST) cuando la pestaña lleva 5 segundos
       visible, como máximo una vez por noticia cada 30 minutos en esta
       pestaña (sessionStorage). El servidor vuelve a comprobar todo
       (functions/_lib/vistas.js): dominio oficial, robots, duplicados.
       Se registra en TODAS las piezas, también en las anteriores a la
       activación: el registro real se conserva aunque no se muestre.
  No usa cookies ni almacenamiento persistente, no envía datos personales y nunca envía
  un número: el servidor solo suma 1.
  Ver docs/contador-visualizaciones.md.
*/
(function () {
  "use strict";

  const ESPERA_MS = 5000;
  const VENTANA_MS = 30 * 60 * 1000;
  const CLAVE = "pdm_vistas";
  /* Hora real de activación del contador (vistas_config.inicio en producción:
     25 oct. 2026, 21:17:04 en Alberta). Solo sirve para reservar el espacio
     con la forma correcta antes de la respuesta, o si el servidor aún no
     tiene inicio; manda siempre el «inicio» que envía el servidor. */
  const ACTIVACION = Date.parse("2026-10-26T03:17:04.778Z");
  const LIBRO =
    '<svg class="article-views__icono" width="16" height="16" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>';
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

  const SEP = '<span class="article-views__sep" aria-hidden="true"> · </span>';

  function textoHtml(n) {
    return SEP + OJO + '<span class="article-views__n">' + miles(n) + "</span> " + (n === 1 ? "visualización" : "visualizaciones");
  }

  function magazineHtml() {
    return SEP + LIBRO + '<span class="article-views__magazine">Artículo del Magazine</span>';
  }

  /* Publicada antes de la hora exacta de activación (no del día): una pieza
     del mismo día publicada antes de esa hora también es anterior. */
  function anterior(inicioIso) {
    const publicado = Date.parse(hueco.getAttribute("data-publicado") || "");
    const corte = (inicioIso && Date.parse(inicioIso)) || ACTIVACION;
    return Boolean(publicado) && publicado < corte;
  }

  /* Espacio reservado: se escribe en la misma tarea en que js/article.js
     dibuja la noticia (antes de que el navegador la pinte), invisible y con la
     misma forma que tendrá la cifra. Al llegar el dato solo cambia el texto:
     la línea no salta ni empuja lo que está debajo, también en celular. */
  function reservar() {
    hueco.innerHTML = anterior(null) ? magazineHtml() : textoHtml(10);
    hueco.classList.add("article-views--reserva");
    hueco.setAttribute("aria-hidden", "true");
    hueco.hidden = false;
  }

  function mostrar(datos) {
    const n = Math.max(0, Math.floor(Number(datos.vistas) || 0));
    hueco.innerHTML = anterior(datos.inicio) ? magazineHtml() : textoHtml(n);
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
