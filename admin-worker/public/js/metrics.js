/*
  metrics.js — Catálogo ÚNICO de métricas (panel + reporte).

  Cada métrica corresponde a un evento que emite js/analytics.js en el sitio.
  `applies(b)` decide si la métrica corresponde al perfil según sus datos en
  businesses.js (ej. "Ver vehículos" solo si tiene inventoryUrl). Una métrica
  que no aplica se oculta; si aun así tiene registros, se muestra igual.

  Lenguaje: son visitas, clics e interacciones registradas. Nunca ventas,
  clientes ni citas confirmadas.
*/
(function () {
  "use strict";

  const has = (k) => (b) => Boolean(b && b[k]);

  const GROUPS = [
    { id: "contacto", title: "Contactos iniciados", hint: "Clics que abren un canal de contacto directo con el profesional." },
    { id: "sitio", title: "Sitio web y ubicación", hint: "Clics hacia recursos externos del profesional." },
    { id: "video", title: "Video", hint: "Interés en el video de presentación del perfil." },
    { id: "redes", title: "Redes sociales", hint: "Clics hacia las redes oficiales del profesional." },
  ];

  const METRICS = [
    { event: "whatsapp_click", label: "Clics en WhatsApp", group: "contacto", applies: has("whatsapp") },
    { event: "phone_click", label: "Clics en Llamar", group: "contacto", applies: has("phone") },
    { event: "email_click", label: "Clics en Email", group: "contacto", applies: has("email") },
    { event: "booking_click", label: "Clics en Agendar consulta", group: "contacto", applies: has("bookingUrl"),
      note: "Clic hacia el calendario; no confirma que la cita se haya agendado." },
    { event: "website_click", label: "Clics al sitio web", group: "sitio", applies: has("website") },
    { event: "vehicles_click", label: "Clics en Ver vehículos / inventario", group: "sitio", applies: has("inventoryUrl") },
    { event: "directions_click", label: "Clics en Cómo llegar", group: "sitio", applies: (b) => Boolean(b && (b.mapUrl || b.address)) },
    { event: "video_click", label: "Clics en reproducir video", group: "video", applies: has("youtubeVideoId") },
    { event: "video_start", label: "Reproducciones iniciadas", group: "video", applies: has("youtubeVideoId"), notClick: true,
      note: "YouTube confirmó que la reproducción comenzó." },
    { event: "instagram_click", label: "Instagram", group: "redes", applies: has("instagram") },
    { event: "tiktok_click", label: "TikTok", group: "redes", applies: has("tiktok") },
    { event: "facebook_click", label: "Facebook", group: "redes", applies: has("facebook") },
    { event: "linkedin_click", label: "LinkedIn", group: "redes", applies: has("linkedin") },
  ];

  const CONTACT_EVENTS = METRICS.filter((m) => m.group === "contacto").map((m) => m.event);

  const DEVICE_LABELS = { mobile: "Móvil", desktop: "Computador", tablet: "Tableta", desconocido: "Sin dato" };

  /* Empresa (registro de businesses.js) + estadísticas → modelo para mostrar. */
  function buildView(business, stats) {
    const ev = stats.events || {};
    const known = new Set(METRICS.map((m) => m.event).concat("profile_view"));

    const groups = GROUPS.map((g) => ({
      ...g,
      items: METRICS.filter((m) => m.group === g.id)
        .filter((m) => (business ? m.applies(business) : false) || (ev[m.event] || 0) > 0)
        .map((m) => ({ event: m.event, label: m.label, note: m.note || "", value: ev[m.event] || 0 })),
    })).filter((g) => g.items.length);

    /* Eventos nuevos que aún no están en el catálogo: se muestran, no se pierden. */
    const others = Object.keys(ev)
      .filter((e) => !known.has(e))
      .map((e) => ({ event: e, label: e, note: "", value: ev[e] }));
    if (others.length) groups.push({ id: "otros", title: "Otras interacciones", hint: "", items: others });

    const clickTotal = Object.entries(ev)
      .filter(([e]) => /_click$/.test(e))
      .reduce((s, [, n]) => s + n, 0);

    return {
      views: ev.profile_view || 0,
      contacts: CONTACT_EVENTS.reduce((s, e) => s + (ev[e] || 0), 0),
      interactions: clickTotal,
      videoStarts: ev.video_start || 0,
      groups,
      sources: (stats.sources || []).map((s) => ({ label: sourceLabel(s), n: s.n })),
      devices: (stats.devices || []).map((d) => ({ label: DEVICE_LABELS[d.device] || d.device, n: d.n })),
      daily: stats.daily || [],
    };
  }

  function sourceLabel(s) {
    if (s.type === "direct") return "Directo / sin campaña";
    if (s.type === "referrer") {
      return s.source === "podcastdelmigrante.com" ? "Navegación interna del sitio" : `Enlace desde ${s.source}`;
    }
    return `Campaña: ${s.source}`;
  }

  function monthLabel(month) {
    const [y, m] = month.split("-").map(Number);
    const name = new Intl.DateTimeFormat("es", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
    return name.charAt(0).toUpperCase() + name.slice(1) + " " + y;
  }

  /* Mes anterior completo en hora de Alberta (valor por defecto del selector). */
  function previousMonth() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit" })
      .formatToParts(new Date());
    let y = Number(parts.find((p) => p.type === "year").value);
    let m = Number(parts.find((p) => p.type === "month").value) - 1;
    if (m === 0) { m = 12; y -= 1; }
    return `${y}-${String(m).padStart(2, "0")}`;
  }

  function currentMonth() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit" })
      .formatToParts(new Date());
    return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}`;
  }

  const fmt = (n) => new Intl.NumberFormat("es-CA").format(n || 0);
  const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  window.PDMAdmin = Object.assign(window.PDMAdmin || {}, {
    METRICS, GROUPS, buildView, monthLabel, previousMonth, currentMonth, fmt, pct, esc,
  });
})();
