/*
  solicitud-form.js — Formulario «Solicita tu Perfil Empresarial Premium»
  ======================================================================
  - Valida con las MISMAS reglas que el servidor (solicitud-core.js).
  - Reduce las imágenes en el navegador (máx. 1600 px foto / 1000 px logo;
    hasta 3 fotografías adicionales a 1600 px) y las vuelve a codificar:
    pesan menos y se eliminan sus metadatos (EXIF, ubicación GPS, etc.).
    El servidor las vuelve a validar.
  - Protección antispam: Cloudflare Turnstile + campo trampa. El token de
    Turnstile vale 5 minutos y una sola vez: antes de enviar se comprueba
    que siga vigente y, si caducó (p. ej., la persona tardó en llenar el
    formulario o salió a la galería del celular), se renueva sin perder los
    datos ni las fotografías.
  - Envía a POST /registro/enviar (Cloudflare Pages Function). La
    confirmación solo aparece cuando el servidor responde que la solicitud
    quedó REGISTRADA (D1 + R2).
  - No guarda nada en el navegador.
========================================================================= */

import { CATEGORIES, PROVINCES, LIMITS, normalize, validate } from "./solicitud-core.js?v=20261018";

const ENDPOINT = "/registro/enviar";
const CONFIG = "/registro/config";
const TURNSTILE_JS = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const $ = (sel, root = document) => root.querySelector(sel);

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/* ---------- Imagen ---------- */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

function hasAlpha(ctx, w, h) {
  const step = Math.max(1, Math.floor((w * h) / 40000));
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4 * step) if (data[i] < 250) return true;
  return false;
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/* Devuelve { blob, width, height } listo para enviar, o lanza un mensaje */
async function prepareImage(file, kind) {
  if (!file) throw new Error("Adjunta una fotografía o un logotipo.");
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Formato no admitido: usa JPG, PNG o WebP.");
  if (file.size > 15 * 1024 * 1024) throw new Error("La imagen pesa demasiado (máximo 5 MB).");
  let loaded;
  try {
    loaded = await loadImage(file);
  } catch (e) {
    throw new Error("No pudimos leer la imagen. Prueba con otro archivo JPG, PNG o WebP.");
  }
  const { img, url } = loaded;
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  if (Math.min(w0, h0) < LIMITS.imageMinSide) {
    URL.revokeObjectURL(url);
    throw new Error(`La imagen es muy pequeña: mínimo ${LIMITS.imageMinSide} px por lado.`);
  }
  const maxSide = kind === "logo" ? 1000 : 1600;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.round(w0 * scale), h = Math.round(h0 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  let blob = null;
  try {
    blob = kind === "logo" && hasAlpha(ctx, w, h) ? await toBlob(canvas, "image/png") : null;
    if (!blob) {
      if (kind === "logo") { ctx.globalCompositeOperation = "destination-over"; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
      blob = await toBlob(canvas, "image/jpeg", 0.86);
    }
  } catch (e) {
    blob = null;
  }
  if (!blob) blob = file;   /* navegador sin canvas: se envía el original */
  if (blob.size > LIMITS.imageMaxBytes) throw new Error("La imagen pesa demasiado (máximo 5 MB).");
  return { blob, width: w, height: h };
}

/* ---------- Turnstile ---------- */
/* Un token vale 300 s (Cloudflare). Se renueva antes, con margen, porque
   Safari en iPhone pausa los temporizadores de la página mientras la persona
   está en otra aplicación (p. ej., eligiendo fotografías) y la casilla puede
   seguir en verde con un token ya vencido. */
const TOKEN_MAX_MS = 240000;
const NEW_TOKEN_WAIT_MS = 45000;

function createVerifier() {
  let token = "";
  let issuedAt = 0;
  let waiting = [];
  const settle = (value) => { const w = waiting; waiting = []; w.forEach((fn) => fn(value)); };
  return {
    options: {
      callback: (t) => { token = t; issuedAt = Date.now(); settle(t); },
      "expired-callback": () => { token = ""; },
      "timeout-callback": () => { token = ""; },
      "error-callback": () => { token = ""; settle(""); },
    },
    /* Token vigente o "" si hay que volver a verificar */
    current(id) {
      const ts = window.turnstile;
      const t = ts && id !== null && typeof ts.getResponse === "function" ? (ts.getResponse(id) || "") : token;
      const expired = ts && id !== null && typeof ts.isExpired === "function" && ts.isExpired(id);
      if (!t || expired || Date.now() - issuedAt > TOKEN_MAX_MS) return "";
      return t;
    },
    /* Pide un token nuevo; si la verificación necesita que la persona marque
       la casilla, resuelve "" al agotarse la espera. */
    renew(id) {
      token = "";
      issuedAt = 0;
      return new Promise((resolve) => {
        const timer = setTimeout(() => { waiting = waiting.filter((fn) => fn !== done); resolve(""); }, NEW_TOKEN_WAIT_MS);
        const done = (v) => { clearTimeout(timer); resolve(v); };
        waiting.push(done);
        try { window.turnstile.reset(id); } catch (e) { clearTimeout(timer); resolve(""); }
      });
    },
    get age() { return issuedAt ? Date.now() - issuedAt : Infinity; },
  };
}

function loadTurnstile(siteKey, box, options) {
  return new Promise((resolve) => {
    const render = () => {
      try {
        const id = window.turnstile.render(box, Object.assign({ sitekey: siteKey, language: "es", theme: "light", size: "flexible", "refresh-expired": "auto" }, options));
        resolve(id);
      } catch (e) {
        resolve(null);
      }
    };
    if (window.turnstile) return render();
    const s = document.createElement("script");
    s.src = TURNSTILE_JS;
    s.async = true;
    s.defer = true;
    s.onload = render;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

/* ---------- Formulario ---------- */
async function init() {
  if (window.PDM && window.PDM.initSiteChrome) window.PDM.initSiteChrome();
  const form = $("#intakeForm");
  if (!form) return;
  const status = $("#intakeStatus");
  const unavailable = $("#intakeUnavailable");
  const button = $("[type=submit]", form);
  const idempotencyKey = uuid();
  let turnstileId = null;
  const verifier = createVerifier();
  let sending = false;
  let prepared = null;   /* imagen ya procesada */

  CATEGORIES.forEach((c) => $("#fCategory").insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.label}</option>`));
  PROVINCES.forEach((p) => $("#fProvince").insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`));

  const toggle = () => { $("[data-show-if='category-otra']").hidden = $("#fCategory").value !== "otra"; };
  $("#fCategory").addEventListener("change", toggle);
  toggle();

  [["#fSummary", "#summaryCount"], ["#fServices", "#servicesCount"], ["#fNotes", "#notesCount"]].forEach(([field, count]) => {
    const input = $(field);
    input.addEventListener("input", () => { $(count).textContent = String(input.value.length); });
  });

  /* Vista previa y preparación de la imagen al elegirla */
  const fileInput = $("#fImage");
  const preview = $("#imagePreview");
  const info = $("#imageInfo");
  const defaultInfo = info.textContent;
  async function refreshImage() {
    prepared = null;
    clearError("image");
    const file = fileInput.files && fileInput.files[0];
    if (!file) { preview.hidden = true; info.textContent = defaultInfo; return; }
    const kind = (form.querySelector("[name=imageKind]:checked") || {}).value || "foto";
    try {
      prepared = await prepareImage(file, kind);
      preview.src = URL.createObjectURL(prepared.blob);
      preview.hidden = false;
      preview.classList.toggle("is-logo", kind === "logo");
      info.textContent = `Lista: ${prepared.width} × ${prepared.height} px · ${Math.max(1, Math.round(prepared.blob.size / 1024))} KB`;
    } catch (e) {
      preview.hidden = true;
      info.textContent = defaultInfo;
      showErrors({ image: e.message });
    }
  }
  fileInput.addEventListener("change", refreshImage);

  /* Fotografías adicionales (opcionales, hasta LIMITS.extraImagesMax) */
  const extraInput = $("#fExtraImages");
  const extraPreviews = $("#extraPreviews");
  const extraInfo = $("#extraInfo");
  const extraDefault = extraInfo.textContent;
  let extras = [];        /* imágenes ya procesadas */
  let extrasPending = null;
  let extrasError = "";
  async function refreshExtras() {
    clearError("extraImages");
    extras = [];
    extrasError = "";
    extraPreviews.replaceChildren();
    extraPreviews.hidden = true;
    extraInfo.textContent = extraDefault;
    const files = Array.from(extraInput.files || []);
    if (!files.length) return;
    if (files.length > LIMITS.extraImagesMax) {
      extrasError = `Puedes enviar como máximo ${LIMITS.extraImagesMax} fotografías adicionales.`;
      showErrors({ extraImages: extrasError });
      return;
    }
    try {
      for (const f of files) extras.push(await prepareImage(f, "foto"));
    } catch (e) {
      extras = [];
      extrasError = "Fotografía adicional: " + e.message.charAt(0).toLowerCase() + e.message.slice(1);
      showErrors({ extraImages: extrasError });
      return;
    }
    extras.forEach((x) => {
      const img = document.createElement("img");
      img.alt = "";
      img.src = URL.createObjectURL(x.blob);
      extraPreviews.appendChild(img);
    });
    extraPreviews.hidden = false;
    extraInfo.textContent = `${extras.length} lista${extras.length > 1 ? "s" : ""} para enviar.`;
  }
  extraInput.addEventListener("change", () => { extrasPending = refreshExtras(); });
  form.querySelectorAll("[name=imageKind]").forEach((r) => r.addEventListener("change", () => fileInput.files.length && refreshImage()));

  /* ¿Está listo el servidor? (si no, se avisa antes de llenar nada) */
  try {
    const res = await fetch(CONFIG, { headers: { Accept: "application/json" } });
    const cfg = res.ok ? await res.json() : { ready: false };
    if (!cfg.ready) throw new Error("no listo");
    turnstileId = await loadTurnstile(cfg.turnstileSiteKey, $("#turnstileBox"), verifier.options);
    /* Al volver a la página (p. ej., desde la galería del iPhone), si el token
       ya es viejo se renueva enseguida, sin tocar los datos del formulario. */
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && turnstileId !== null && !sending && verifier.age > TOKEN_MAX_MS) verifier.renew(turnstileId);
    });
  } catch (e) {
    unavailable.hidden = false;
    button.disabled = true;
  }

  function clearError(name) {
    const box = form.querySelector(`[data-error-for="${name}"]`) || (form.querySelector(`[name="${name}"]`) || {}).closest?.("[data-field]");
    if (box) box.querySelectorAll(".intake-error").forEach((n) => n.remove());
    form.querySelectorAll(`[name="${name}"]`).forEach((f) => f.removeAttribute("aria-invalid"));
  }

  function clearErrors() {
    form.querySelectorAll(".intake-error").forEach((n) => n.remove());
    form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
  }

  function showErrors(errors) {
    let first = null;
    for (const [name, message] of Object.entries(errors)) {
      const field = form.querySelector(`[name="${name}"]`);
      const box = form.querySelector(`[data-error-for="${name}"]`) || (field && (field.closest("[data-field]") || field.parentElement));
      if (!box) continue;
      const msg = document.createElement("p");
      msg.className = "intake-error";
      msg.id = "err-" + name;
      msg.textContent = message;
      box.appendChild(msg);
      form.querySelectorAll(`[name="${name}"]`).forEach((f) => {
        f.setAttribute("aria-invalid", "true");
        f.setAttribute("aria-describedby", msg.id);
      });
      if (!first) first = field || box;
    }
    return first;
  }

  function setStatus(text) {
    status.textContent = text;
    status.className = "intake-status intake-status--error";
    status.hidden = false;
  }

  /* Un solo envío a la vez: el bloqueo empieza con el primer toque, antes de
     preparar las fotografías, para que un doble toque no mande dos solicitudes */
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (sending) return;
    sending = true;
    try {
      await enviarSolicitud();
    } finally {
      sending = false;
    }
  });

  async function enviarSolicitud() {
    clearErrors();
    status.hidden = true;

    const raw = {};
    new FormData(form).forEach((v, k) => { if (typeof v === "string") raw[k] = v; });
    const { errors } = validate(normalize(raw));
    if (!prepared) {
      if (fileInput.files && fileInput.files[0]) await refreshImage();
      if (!prepared) errors.image = errors.image || "Adjunta una fotografía o un logotipo.";
    }
    if (extrasPending) await extrasPending;
    const extraCount = (extraInput.files || []).length;
    if (extraCount && extras.length !== extraCount) {
      errors.extraImages = extrasError || "Revisa las fotografías adicionales.";
    }
    const keys = Object.keys(errors);
    if (keys.length) {
      const first = showErrors(errors);
      setStatus(keys.length === 1 ? "Revisa el campo marcado en rojo." : `Revisa los ${keys.length} campos marcados en rojo.`);
      if (first) {
        first.scrollIntoView({ behavior: "smooth", block: "center" });
        if (first.focus) first.focus({ preventScroll: true });
      }
      return;
    }

    const body = new FormData(form);
    body.delete("image");
    const ext = prepared.blob.type === "image/png" ? "png" : prepared.blob.type === "image/webp" ? "webp" : "jpg";
    body.append("image", prepared.blob, `imagen.${ext}`);
    body.delete("extraImages");
    extras.forEach((x, i) => body.append("extraImages", x.blob, `adicional-${i + 1}.${x.blob.type === "image/png" ? "png" : x.blob.type === "image/webp" ? "webp" : "jpg"}`));
    body.set("idempotencyKey", idempotencyKey);

    button.disabled = true;
    const label = button.textContent;
    let result = null;
    let httpStatus = 0;
    try {
      /* Token vigente: si caducó, se renueva antes de enviar */
      let token = verifier.current(turnstileId);
      if (!token && turnstileId !== null) {
        button.textContent = "Verificando…";
        token = await verifier.renew(turnstileId);
      }
      if (!token) {
        setStatus("Completa la verificación de seguridad (la casilla de Cloudflare, arriba del botón) y vuelve a pulsar «Enviar solicitud». Tus datos y fotografías siguen en el formulario.");
        $("#turnstileBox").scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      button.textContent = "Enviando…";
      const post = async (t) => {
        body.set("cf-turnstile-response", t);
        const res = await fetch(ENDPOINT, { method: "POST", body, headers: { Accept: "application/json" } });
        httpStatus = res.status;
        return res.json().catch(() => null);
      };
      try {
        result = await post(token);
        /* El servidor dice que el token venció o ya se usó: se renueva y se
           reintenta una sola vez. La clave de idempotencia evita duplicados. */
        if (result && result.code === "turnstile_expired" && turnstileId !== null) {
          button.textContent = "Verificando…";
          const again = await verifier.renew(turnstileId);
          if (again) {
            button.textContent = "Enviando…";
            result = await post(again);
          }
        }
      } catch (e) {
        result = null;
      }
    } finally {
      button.disabled = false;
      button.textContent = label;
    }

    if (result && result.ok && /^SOL-\d{8}-[A-Z2-9]{6}$/.test(result.requestId || "")) {
      const done = $("#intakeDone");
      $("[data-done-id]", done).textContent = result.requestId;
      form.hidden = true;
      status.hidden = true;
      done.hidden = false;
      done.focus();
      done.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (result && result.errors) {
      const first = showErrors(result.errors);
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    /* Un token ya enviado no sirve otra vez: se pide uno nuevo para el reintento */
    if (window.turnstile && turnstileId !== null && httpStatus !== 429) verifier.renew(turnstileId);
    setStatus((result && result.error) || "No pudimos registrar tu solicitud. Tus datos siguen en el formulario: inténtalo de nuevo en unos minutos.");
    status.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
