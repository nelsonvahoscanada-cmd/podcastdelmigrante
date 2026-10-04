/*
  analytics.js — Eventos de medición por perfil (SIN backend, SIN estadísticas)
  ======================================================================
  Este archivo NO guarda ni inventa ninguna cifra. Solo "emite" eventos
  bien formados para conectarlos después al sistema de analítica que se
  defina. Mientras no haya un destino configurado, los eventos no salen
  del navegador del visitante.

  EVENTOS (perfil empresarial — uno por acción)
    profile_view       se abrió el perfil
    booking_click      "Agenda una consulta" (calendario de citas)
    video_click        pulsó "reproducir" en el video
    video_start        YouTube confirmó que la reproducción comenzó
    vehicles_click     botón de inventario/catálogo ("Ver vehículos")
    directions_click   "Cómo llegar" (Google Maps)
    email_click        enlace mailto:
    website_click      sitio web de la empresa
    instagram_click · tiktok_click · facebook_click · linkedin_click
                       redes sociales oficiales
    whatsapp_click · phone_click
                       solo en perfiles con número confirmado
  `target` distingue la ubicación del botón (ej. "instagram-hero" vs
  "instagram-final", "directions" vs "directions-location").
  video_click = la persona pulsó "reproducir". video_start = YouTube
  confirmó que la reproducción comenzó (se emite una vez por visita).
  Un clic o una reproducción NO equivalen a una venta, un lead ni un
  cliente: son interacciones.

  CADA EVENTO LLEVA
    event, ts (ISO), page (ruta, sin parámetros), business (slug),
    business_id (ej. "BIZ-002"),
    category, city, target (a qué botón se hizo clic, si aplica),
    utm_source / utm_medium / utm_campaign / utm_content (si existen),
    referrer (solo el dominio de origen, si existe).
  No se envían datos personales del visitante ni se usan cookies.

  DESTINOS (se usan los que existan; ninguno es obligatorio)
    1. window.dataLayer.push(...)       si ya existe (Google Tag Manager)
    2. document "pdm:analytics"         evento DOM, para cualquier script
    3. navigator.sendBeacon(endpoint)   solo si se define
                                        PDM_ANALYTICS.endpoint (URL de un
                                        servicio SEPARADO del frontend)
  Nunca poner claves ni secretos aquí: este archivo es público.

  REPORTE MENSUAL (cuando exista destino): visitas al perfil
  (profile_view), clics WhatsApp, llamada, inventario (vehicles_click),
  sitio web (website_click), cómo llegar (directions_click), email, redes
  (instagram_click / tiktok_click), video (video_click / video_start) y fuentes de
  tráfico (utm_* + referrer), todo agrupado por `business`.

  PRUEBA: abrir cualquier página con ?pdm_debug=1 para ver cada evento
  en la consola del navegador.
========================================================================= */

(function () {
  "use strict";

  const PDM_ANALYTICS = (window.PDM_ANALYTICS = window.PDM_ANALYTICS || { endpoint: null });
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  const STORE_KEY = "pdm_utm";
  const DEBUG = /[?&]pdm_debug=1\b/.test(window.location.search);

  function readUtmFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    UTM_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) found[k] = v.slice(0, 100);
    });
    return found;
  }

  /* Los UTM de la visita se recuerdan solo durante la sesión (sessionStorage),
     para que un clic dentro del sitio conserve su origen. */
  function currentUtm() {
    const fromUrl = readUtmFromUrl();
    try {
      if (Object.keys(fromUrl).length) {
        window.sessionStorage.setItem(STORE_KEY, JSON.stringify(fromUrl));
        return fromUrl;
      }
      const saved = window.sessionStorage.getItem(STORE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return fromUrl;
    }
  }

  function referrerHost() {
    try {
      return document.referrer ? new URL(document.referrer).hostname : "";
    } catch (e) {
      return "";
    }
  }

  let context = {}; /* business, category, city — lo fija la plantilla del perfil */

  function track(eventName, extra) {
    const payload = Object.assign(
      {
        event: eventName,
        ts: new Date().toISOString(),
        page: window.location.pathname,
        referrer: referrerHost(),
      },
      context,
      currentUtm(),
      extra || {}
    );
    if (DEBUG && window.console) console.log("[pdm analytics]", payload);
    try {
      if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
      document.dispatchEvent(new CustomEvent("pdm:analytics", { detail: payload }));
      if (PDM_ANALYTICS.endpoint && navigator.sendBeacon) {
        navigator.sendBeacon(PDM_ANALYTICS.endpoint, JSON.stringify(payload));
      }
    } catch (e) {
      /* la medición nunca debe romper la página */
    }
  }

  /* Cualquier elemento con data-track="evento" emite ese evento al hacer clic.
     data-track-target="..." añade a qué botón corresponde. */
  document.addEventListener("click", (e) => {
    const el = e.target.closest ? e.target.closest("[data-track]") : null;
    if (!el) return;
    const extra = {};
    if (el.getAttribute("data-track-target")) extra.target = el.getAttribute("data-track-target");
    track(el.getAttribute("data-track"), extra);
  });

  window.PDM = window.PDM || {};
  window.PDM.analytics = {
    track,
    setContext(ctx) {
      context = Object.assign({}, ctx);
    },
  };
})();
