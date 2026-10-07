/*
  business-intake.js — Solicitud de Perfil Empresarial Premium
  ======================================================================
  Formulario de registra-tu-empresa.html. Valida los datos, arma una
  FICHA lista para pegar en js/businesses.js y envía la solicitud a
  podcastdelmigrante@gmail.com mediante FormSubmit (formsubmit.co).

  QUÉ HACE Y QUÉ NO
  - Nada se publica automáticamente: la ficha sale con published: false
    y el equipo la revisa antes de crear la miniweb.
  - La confirmación al solicitante (pantalla y correo automático) solo
    ocurre cuando FormSubmit responde que registró el envío.
  - No se cobra nada ni se publica ningún precio.
  - No se guardan datos en el navegador (ni localStorage ni cookies).
  - No hay credenciales: FormSubmit no usa claves. Tras activar el
    formulario (primer envío → correo de activación a la casilla), se
    puede reemplazar el correo de INTAKE_ENDPOINT por el alias aleatorio
    que entrega FormSubmit, para no mostrar la dirección en el código.

  ANTI-SPAM: campo trampa (_honey), tiempo mínimo de llenado, un envío
  por minuto por pestaña, validación estricta y límites de longitud.
  FormSubmit aplica además sus propios filtros.

  La parte "pura" (validate, buildFicha, buildPayload...) no toca el DOM
  y se prueba con node --test (tests/business-intake.test.mjs).
========================================================================= */

(function (root) {
  "use strict";

  const INTAKE_ENDPOINT = "https://formsubmit.co/ajax/podcastdelmigrante@gmail.com";
  const CONTACT_EMAIL = "podcastdelmigrante@gmail.com";
  const MIN_FILL_MS = 8000;      /* nadie llena 6 secciones en menos de 8 s */
  const RESUBMIT_MS = 60000;
  const TIMEOUT_MS = 20000;

  const PROVINCES = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
    "Northwest Territories", "Nunavut", "Yukon",
  ];
  const LANGUAGES = { es: "Español", en: "English", fr: "Français" };

  /* Límites de longitud (también van como maxlength en el HTML) */
  const MAX = { short: 120, medium: 200, url: 300, shortDescription: 180, long: 1500, list: 1500 };

  /* ---------- Utilidades ---------- */
  const str = (v) => (v == null ? "" : String(v)).replace(/\s+/g, " ").trim();
  const text = (v) => (v == null ? "" : String(v)).replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const lines = (v) => text(v).split("\n").map((l) => l.replace(/^[-•*·\s]+/, "").trim()).filter(Boolean);

  function slugify(s) {
    return str(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  function normalizeUrl(v) {
    const s = str(v);
    if (!s) return "";
    const withScheme = /^https?:\/\//i.test(s) ? s : "https://" + s.replace(/^\/+/, "");
    try {
      const u = new URL(withScheme);
      if (!/^https?:$/.test(u.protocol) || !/\./.test(u.hostname)) return null;
      return u.href;
    } catch (e) {
      return null;
    }
  }

  /* Redes: acepta URL completa o @usuario */
  function socialUrl(v, base) {
    const s = str(v);
    if (!s) return "";
    if (/^https?:\/\//i.test(s) || s.includes("/")) return normalizeUrl(s);
    if (/^@?[A-Za-z0-9._-]{2,60}$/.test(s) && !/\.(com|net|org|ca|io|me)$/i.test(s)) {
      return base + s.replace(/^@/, "") + (base.includes("tiktok") ? "" : "/");
    }
    return normalizeUrl(s);
  }
  const SOCIAL_BASE = {
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/@",
    facebook: "https://www.facebook.com/",
    linkedin: "https://www.linkedin.com/in/",
  };

  function digits(v) {
    return str(v).replace(/\D/g, "");
  }

  function youtubeId(url) {
    const m = str(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  }

  const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[A-Za-z]{2,}$/;

  /* ---------- Lectura de datos (objeto plano: nombre → valor o lista) ---------- */
  function clean(raw) {
    const g = (k) => raw[k];
    const list = (k) => [].concat(raw[k] || []).map(str).filter(Boolean);
    return {
      /* 1. Datos empresariales */
      company: str(g("company")),
      brandName: str(g("brandName")),
      category: str(g("category")),
      categoryOther: str(g("categoryOther")),
      city: str(g("city")),
      province: str(g("province")),
      addressMode: str(g("addressMode")),
      address: str(g("address")),
      postalCode: str(g("postalCode")).toUpperCase(),
      serviceAreas: list("serviceAreas").filter((p) => PROVINCES.includes(p)),
      website: str(g("website")),
      /* 2. Información profesional */
      name: str(g("name")),
      shortName: str(g("shortName")),
      professionalTitle: str(g("professionalTitle")),
      professionalTitleAlt: str(g("professionalTitleAlt")),
      affiliation: str(g("affiliation")),
      languages: list("languages").filter((l) => LANGUAGES[l]),
      availability: str(g("availability")),
      longDescription: text(g("longDescription")),
      quote: str(g("quote")),
      /* 3. Productos y servicios */
      shortDescription: str(g("shortDescription")),
      services: lines(g("services")),
      ctaTitle: str(g("ctaTitle")),
      /* 4. Contacto y redes (públicos) + contacto de gestión (privado) */
      phone: str(g("phone")),
      whatsapp: str(g("whatsapp")),
      publicEmail: str(g("publicEmail")).toLowerCase(),
      bookingUrl: str(g("bookingUrl")),
      catalogUrl: str(g("catalogUrl")),
      instagram: str(g("instagram")),
      tiktok: str(g("tiktok")),
      facebook: str(g("facebook")),
      linkedin: str(g("linkedin")),
      requesterName: str(g("requesterName")),
      email: str(g("email")).toLowerCase(),
      requesterPhone: str(g("requesterPhone")),
      /* 5. Material */
      photoUrl: str(g("photoUrl")),
      logoUrl: str(g("logoUrl")),
      videoUrl: str(g("videoUrl")),
      mediaLater: !!g("mediaLater"),
      /* 6. vCard, consentimiento y publicación */
      wantsConnect: str(g("wantsConnect")) !== "no",
      vcardGivenName: str(g("vcardGivenName")),
      vcardFamilyName: str(g("vcardFamilyName")),
      consentData: !!g("consentData"),
      consentPublish: !!g("consentPublish"),
      consentTruth: !!g("consentTruth"),
      /* anti-spam */
      honey: str(g("_honey")),
    };
  }

  /* ---------- Validación: devuelve { data, errors: { campo: mensaje } } ---------- */
  function validate(raw, categories) {
    const d = clean(raw);
    const e = {};
    const need = (k, msg) => { if (!d[k]) e[k] = msg; };
    const maxLen = (k, n) => { if (d[k] && d[k].length > n) e[k] = `Máximo ${n} caracteres.`; };

    need("company", "Escribe el nombre de la empresa o negocio.");
    need("category", "Elige la categoría.");
    if (d.category === "otra") need("categoryOther", "Indica a qué se dedica tu empresa.");
    else if (d.category && categories && !categories.includes(d.category)) e.category = "Elige una categoría de la lista.";
    need("city", "Escribe la ciudad.");
    if (!PROVINCES.includes(d.province)) e.province = "Elige la provincia o territorio.";
    if (!["publica", "sin-direccion"].includes(d.addressMode)) e.addressMode = "Indica si tienes dirección física pública.";
    if (d.addressMode === "publica") need("address", "Escribe la dirección, o elige «Sin dirección física pública».");
    if (d.postalCode && !/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(d.postalCode)) e.postalCode = "Código postal canadiense, ej. T2P 1J9.";

    need("name", "Escribe el nombre que aparecerá en el perfil.");
    need("professionalTitle", "Escribe tu cargo o especialidad.");
    if (!d.languages.length) e.languages = "Elige al menos un idioma de atención.";

    need("shortDescription", "Describe brevemente lo que ofreces.");
    if (!d.services.length) e.services = "Escribe al menos un producto o servicio.";
    if (d.services.length > 30) e.services = "Máximo 30 líneas.";

    ["company", "brandName", "categoryOther", "city", "name", "shortName", "professionalTitle", "professionalTitleAlt",
      "affiliation", "availability", "ctaTitle", "requesterName", "vcardGivenName", "vcardFamilyName", "address"].forEach((k) => maxLen(k, MAX.medium));
    maxLen("shortDescription", MAX.shortDescription);
    maxLen("quote", MAX.medium * 2);
    maxLen("longDescription", MAX.long);
    if (d.services.join("\n").length > MAX.list) e.services = `Máximo ${MAX.list} caracteres en total.`;

    /* URLs públicas */
    ["website", "bookingUrl", "catalogUrl", "photoUrl", "logoUrl", "videoUrl"].forEach((k) => {
      if (!d[k]) return;
      const u = normalizeUrl(d[k]);
      if (u === null || u.length > MAX.url) e[k] = "Escribe un enlace válido (https://...).";
      else d[k] = u;
    });
    Object.keys(SOCIAL_BASE).forEach((k) => {
      if (!d[k]) return;
      const u = socialUrl(d[k], SOCIAL_BASE[k]);
      if (!u || u.length > MAX.url) e[k] = "Escribe el enlace del perfil (https://...) o tu @usuario.";
      else d[k] = u;
    });
    if (d.videoUrl && !e.videoUrl && !youtubeId(d.videoUrl)) e.videoUrl = "Usa un enlace de YouTube (puede ser «no listado»).";

    /* Teléfonos y correos */
    if (d.phone && (digits(d.phone).length < 10 || digits(d.phone).length > 15)) e.phone = "Escribe un teléfono válido, ej. +1 403 555 1234.";
    if (d.whatsapp) {
      const w = digits(d.whatsapp);
      if (w.length < 11 || w.length > 15) e.whatsapp = "Incluye el código de país (1 para Canadá), ej. 1 403 555 1234.";
      else d.whatsapp = w;
    }
    if (d.publicEmail && !EMAIL_RE.test(d.publicEmail)) e.publicEmail = "Escribe un correo válido.";
    if (!(d.phone || d.whatsapp || d.publicEmail || d.website || d.bookingUrl) && !e.phone) {
      e.phone = "Indica al menos un medio de contacto público (teléfono, WhatsApp, correo, sitio web o agenda).";
    }
    need("requesterName", "Escribe tu nombre.");
    if (!EMAIL_RE.test(d.email)) e.email = "Escribe un correo válido: ahí te enviaremos la confirmación.";
    if (d.requesterPhone && (digits(d.requesterPhone).length < 10 || digits(d.requesterPhone).length > 15)) e.requesterPhone = "Escribe un teléfono válido.";

    /* vCard */
    if (d.wantsConnect) {
      need("vcardGivenName", "Escribe el nombre para la tarjeta de contacto.");
      need("vcardFamilyName", "Escribe el apellido para la tarjeta de contacto.");
    }

    if (!d.consentData) e.consentData = "Necesitamos tu autorización para tratar estos datos.";
    if (!d.consentPublish) e.consentPublish = "Necesitamos tu autorización para publicar el perfil aprobado.";
    if (!d.consentTruth) e.consentTruth = "Confirma que la información es verdadera y que tienes derecho a usar el material.";

    return { data: d, errors: e };
  }

  /* ---------- Ficha compatible con js/businesses.js ---------- */
  function js(v) {
    return JSON.stringify(v == null ? "" : v);
  }

  function buildFicha(d, meta) {
    const slug = slugify(d.name || d.company);
    const paragraphs = d.longDescription ? d.longDescription.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean) : [];
    const seoTitle = [d.name, d.city ? `${d.professionalTitle || d.company} en ${d.city}` : d.professionalTitle, "El Podcast del Migrante"].filter(Boolean).join(" | ");
    const I = "    ";
    const out = [
      `  /* Solicitud ${meta.requestId} (${meta.date}). Revisar y confirmar antes de publicar. */`,
      "  {",
      `${I}id: "BIZ-000",              /* asignar el siguiente número */`,
      `${I}slug: ${js(slug)},`,
      `${I}published: false,           /* nada se publica sin aprobación */`,
      `${I}featured: false,`,
      `${I}foundingProfile: false,`,
      "",
      `${I}name: ${js(d.name)},`,
      `${I}shortName: ${js(d.shortName || d.name.split(" ")[0])},`,
      `${I}professionalTitle: ${js(d.professionalTitle)},`,
      `${I}professionalTitleAlt: ${js(d.professionalTitleAlt)},`,
      `${I}company: ${js(d.company)},`,
      `${I}brandName: ${js(d.brandName)},`,
      `${I}affiliation: ${js(d.affiliation)},`,
      `${I}category: ${js(d.category === "otra" ? "" : d.category)},${d.category === "otra" ? "   /* categoría nueva solicitada: ver la solicitud */" : ""}`,
      "",
      `${I}city: ${js(d.city)},`,
      `${I}province: ${js(d.province)},`,
      `${I}country: "Canadá",`,
      `${I}address: ${js(d.addressMode === "publica" ? d.address : "")},${d.addressMode === "publica" ? "" : "   /* sin dirección física pública */"}`,
      `${I}postalCode: ${js(d.addressMode === "publica" ? d.postalCode : "")},`,
      `${I}mapUrl: "",`,
      `${I}serviceAreas: ${js(d.serviceAreas.filter((p) => p !== d.province))},`,
      "",
      `${I}languages: ${js(d.languages)},`,
      `${I}availability: ${js(d.availability)},`,
      `${I}shortDescription: ${js(d.shortDescription)},`,
      `${I}longDescription: ${js(paragraphs)},`,
      `${I}quote: ${js(d.quote)},`,
      `${I}callToAction: { title: ${js(d.ctaTitle)}, text: "" },`,
      `${I}services: [],`,
      `${I}serviceGroups: [{ title: "Productos y servicios", items: ${js(d.services)} }],`,
      "",
      `${I}phone: ${js(d.phone)},`,
      `${I}whatsapp: ${js(d.whatsapp)},`,
      `${I}email: ${js(d.publicEmail)},`,
      `${I}website: ${js(d.website)},`,
      `${I}inventoryUrl: ${js(d.catalogUrl)},`,
      `${I}inventoryLabel: ${js(d.catalogUrl ? "Ver catálogo" : "")},`,
      `${I}bookingUrl: ${js(d.bookingUrl)},`,
      `${I}bookingLabel: ${js(d.bookingUrl ? "Agenda una cita" : "")},`,
      "",
      `${I}instagram: ${js(d.instagram)},`,
      `${I}tiktok: ${js(d.tiktok)},`,
      `${I}facebook: ${js(d.facebook)},`,
      `${I}linkedin: ${js(d.linkedin)},`,
      "",
      `${I}youtubeVideoId: ${js(youtubeId(d.videoUrl))},`,
      `${I}videoText: "",`,
      `${I}profileImage: "",            /* material recibido: ver la solicitud */`,
      `${I}cardImage: "",`,
      `${I}ogImage: "",`,
      `${I}coverImage: "",`,
      `${I}gallery: [],`,
      `${I}hours: [],`,
      `${I}testimonials: [],`,
    ];
    if (d.wantsConnect) {
      out.push("", `${I}connect: {`, `${I}  profileQr: true,`, `${I}  contactCard: { givenName: ${js(d.vcardGivenName)}, familyName: ${js(d.vcardFamilyName)} },`, `${I}},`);
    }
    out.push("", `${I}seo: {`, `${I}  title: ${js(seoTitle)},`, `${I}  description: ${js(d.shortDescription)},`, `${I}},`, "  },");
    return out.join("\n");
  }

  /* ---------- Contenido que recibe el correo (tabla de FormSubmit) ---------- */
  function yesNo(b) {
    return b ? "Sí" : "No";
  }

  function buildPayload(d, meta, categoryLabel) {
    const lang = d.languages.map((l) => LANGUAGES[l]).join(", ");
    const p = {
      _subject: `Solicitud Perfil Empresarial — ${d.company} (${meta.requestId})`,
      _template: "table",
      _captcha: "false",
      _honey: d.honey,
      _autoresponse:
        `Hola ${d.requesterName}: recibimos tu solicitud ${meta.requestId} para el Perfil Empresarial Premium de «${d.company}» en El Podcast del Migrante. ` +
        "Revisaremos la información y te contactaremos con la propuesta y los próximos pasos. Nada se publica sin tu aprobación y no se ha realizado ningún cobro. " +
        "Si tienes fotografías, logotipo o video, puedes enviarlos respondiendo a este correo. — El Podcast del Migrante",
      "Solicitud": meta.requestId,
      "Recibida (hora del navegador)": meta.date,
      "1 · Empresa": d.company,
      "1 · Marca comercial": d.brandName,
      "1 · Categoría": d.category === "otra" ? `Otra: ${d.categoryOther}` : categoryLabel || d.category,
      "1 · Ciudad / provincia": `${d.city}, ${d.province}`,
      "1 · Dirección física pública": d.addressMode === "publica" ? `${d.address}${d.postalCode ? " " + d.postalCode : ""}` : "No (sin dirección física pública)",
      "1 · Otras provincias de servicio": d.serviceAreas.join(", "),
      "1 · Sitio web": d.website,
      "2 · Nombre en el perfil": d.name,
      "2 · Nombre corto": d.shortName,
      "2 · Cargo / especialidad": d.professionalTitle,
      "2 · Cargo en inglés": d.professionalTitleAlt,
      "2 · Afiliación": d.affiliation,
      "2 · Idiomas de atención": lang,
      "2 · Disponibilidad": d.availability,
      "2 · Sobre la empresa": d.longDescription,
      "2 · Frase o filosofía": d.quote,
      "3 · Descripción breve": d.shortDescription,
      "3 · Productos y servicios": d.services.join("\n"),
      "3 · Frase principal": d.ctaTitle,
      "4 · Teléfono (público)": d.phone,
      "4 · WhatsApp (público)": d.whatsapp,
      "4 · Correo (público)": d.publicEmail,
      "4 · Agenda / citas": d.bookingUrl,
      "4 · Catálogo / inventario": d.catalogUrl,
      "4 · Instagram": d.instagram,
      "4 · TikTok": d.tiktok,
      "4 · Facebook": d.facebook,
      "4 · LinkedIn": d.linkedin,
      "4 · Solicitante (privado)": d.requesterName,
      "4 · Teléfono del solicitante (privado)": d.requesterPhone,
      "5 · Fotografía": d.photoUrl,
      "5 · Logotipo": d.logoUrl,
      "5 · Video (YouTube)": d.videoUrl,
      "5 · Enviará material por correo": yesNo(d.mediaLater),
      "6 · Quiere QR y tarjeta digital": yesNo(d.wantsConnect),
      "6 · Nombre / apellido en la tarjeta": d.wantsConnect ? `${d.vcardGivenName} / ${d.vcardFamilyName}` : "",
      "6 · Autoriza tratamiento de datos": yesNo(d.consentData),
      "6 · Autoriza publicación tras aprobación": yesNo(d.consentPublish),
      "6 · Confirma veracidad y derechos del material": yesNo(d.consentTruth),
      "Ficha para js/businesses.js": buildFicha(d, meta),
      email: d.email,   /* FormSubmit: responder-a y destinatario de la confirmación */
    };
    Object.keys(p).forEach((k) => { if (p[k] === "" && !k.startsWith("_")) delete p[k]; });
    return p;
  }

  function newRequestId(now, rand) {
    const t = now || new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const r = rand || Math.random().toString(36).slice(2, 6);
    return `SOL-${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}-${r.toUpperCase()}`;
  }

  /* ¿FormSubmit registró el envío? (si el formulario no está activado responde success: "false") */
  function isAccepted(status, body) {
    return !!(status >= 200 && status < 300 && body && (body.success === true || body.success === "true"));
  }

  const api = { INTAKE_ENDPOINT, PROVINCES, LANGUAGES, MAX, slugify, normalizeUrl, youtubeId, clean, validate, buildFicha, buildPayload, newRequestId, isAccepted };
  root.PDM_INTAKE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  /* =====================================================================
     Interfaz (solo en el navegador, si existe el formulario)
  ===================================================================== */
  if (typeof document === "undefined") return;

  function randomTag() {
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0].toString(36).slice(-4).padStart(4, "0");
    } catch (e) {
      return Math.random().toString(36).slice(2, 6);
    }
  }

  function readForm(form) {
    const raw = {};
    new FormData(form).forEach((v, k) => {
      if (k in raw) raw[k] = [].concat(raw[k], v);
      else raw[k] = form.querySelectorAll(`[name="${k}"][type="checkbox"]`).length > 1 ? [v] : v;
    });
    return raw;
  }

  function init() {
    if (root.PDM && root.PDM.initSiteChrome) root.PDM.initSiteChrome();
    const form = document.getElementById("intakeForm");
    if (!form) return;
    const startedAt = Date.now();
    /* Categorías del directorio (const global de js/businesses.js) */
    const CATS = typeof BUSINESS_CATEGORIES !== "undefined" ? BUSINESS_CATEGORIES : [];
    const categories = CATS.map((c) => c.id);
    const categoryLabel = (id) => (CATS.find((c) => c.id === id) || {}).label || "";

    /* Opciones generadas desde los datos existentes */
    const catSelect = form.querySelector("#fCategoryIntake");
    CATS.forEach((c) => catSelect.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.label}</option>`));
    catSelect.insertAdjacentHTML("beforeend", '<option value="otra">Otra (indícala)</option>');
    const provSelect = form.querySelector("#fProvinceIntake");
    PROVINCES.forEach((p) => provSelect.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`));
    const areas = form.querySelector("#serviceAreasBox");
    PROVINCES.forEach((p) =>
      areas.insertAdjacentHTML("beforeend", `<label class="intake-check intake-check--chip"><input type="checkbox" name="serviceAreas" value="${p}"> <span>${p}</span></label>`)
    );

    /* Campos que dependen de otros */
    const toggle = () => {
      const other = catSelect.value === "otra";
      form.querySelector("[data-show-if='category-otra']").hidden = !other;
      const hasAddress = (form.querySelector("[name=addressMode]:checked") || {}).value === "publica";
      form.querySelector("[data-show-if='address']").hidden = !hasAddress;
      const wants = (form.querySelector("[name=wantsConnect]:checked") || {}).value !== "no";
      form.querySelector("[data-show-if='connect']").hidden = !wants;
    };
    form.addEventListener("change", toggle);
    toggle();

    const status = document.getElementById("intakeStatus");
    const button = form.querySelector("[type=submit]");

    function clearErrors() {
      form.querySelectorAll(".intake-error").forEach((n) => n.remove());
      form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
    }

    function showErrors(errors) {
      let first = null;
      Object.keys(errors).forEach((name) => {
        const field = form.querySelector(`[name="${name}"]`);
        if (!field) return;
        const box = field.closest("[data-field]") || field.parentElement;
        const msg = document.createElement("p");
        msg.className = "intake-error";
        msg.id = "err-" + name;
        msg.textContent = errors[name];
        box.appendChild(msg);
        form.querySelectorAll(`[name="${name}"]`).forEach((f) => {
          f.setAttribute("aria-invalid", "true");
          f.setAttribute("aria-describedby", msg.id);
        });
        if (!first) first = field;
      });
      return first;
    }

    function setStatus(kind, html) {
      status.className = "intake-status intake-status--" + kind;
      status.innerHTML = html;
      status.hidden = false;
    }

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      clearErrors();
      status.hidden = true;

      const { data, errors } = validate(readForm(form), categories);
      const keys = Object.keys(errors);
      if (keys.length) {
        const first = showErrors(errors);
        setStatus("error", `Revisa ${keys.length === 1 ? "el campo marcado" : `los ${keys.length} campos marcados`} en rojo.`);
        if (first) {
          first.scrollIntoView({ behavior: "smooth", block: "center" });
          first.focus({ preventScroll: true });
        }
        return;
      }
      /* Anti-spam silencioso: trampa o envío demasiado rápido → no se envía */
      if (data.honey || Date.now() - startedAt < MIN_FILL_MS) {
        setStatus("error", "No pudimos enviar la solicitud. Revisa los datos e inténtalo de nuevo en unos segundos.");
        return;
      }
      try {
        const last = Number(sessionStorage.getItem("pdm_intake_sent") || 0);
        if (Date.now() - last < RESUBMIT_MS) {
          setStatus("error", "Ya enviaste una solicitud hace un momento. Si necesitas corregir algo, responde al correo de confirmación.");
          return;
        }
      } catch (e) { /* sin sessionStorage: se sigue */ }

      const meta = { requestId: newRequestId(new Date(), randomTag()), date: new Date().toLocaleString("es-CA", { hour12: false }) };
      const payload = buildPayload(data, meta, categoryLabel(data.category));

      button.disabled = true;
      const label = button.textContent;
      button.textContent = "Enviando…";
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctrl && setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      let ok = false;
      try {
        const res = await fetch(INTAKE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl ? ctrl.signal : undefined,
        });
        const body = await res.json().catch(() => null);
        ok = isAccepted(res.status, body);
      } catch (e) {
        ok = false;
      } finally {
        if (timer) clearTimeout(timer);
        button.disabled = false;
        button.textContent = label;
      }

      if (!ok) {
        setStatus(
          "error",
          `No pudimos registrar tu solicitud. Tus datos siguen en el formulario: inténtalo de nuevo en unos minutos o escríbenos a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`
        );
        status.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      try { sessionStorage.setItem("pdm_intake_sent", String(Date.now())); } catch (e) { /* opcional */ }
      const done = document.getElementById("intakeDone");
      done.querySelector("[data-done-id]").textContent = meta.requestId;
      done.querySelector("[data-done-email]").textContent = data.email;
      done.querySelector("[data-done-company]").textContent = data.company;
      form.hidden = true;
      status.hidden = true;
      done.hidden = false;
      done.focus();
      done.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : globalThis);
