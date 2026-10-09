/*
  solicitud-form.js — Formulario «Registra tu empresa»
  ======================================================================
  - Valida con las MISMAS reglas que el servidor (solicitud-core.js).
  - Reduce la imagen en el navegador (máx. 1600 px foto / 1000 px logo) y
    la vuelve a codificar: pesa menos y se eliminan sus metadatos (EXIF,
    ubicación GPS, etc.). El servidor la vuelve a validar.
  - Protección antispam: Cloudflare Turnstile + campo trampa.
  - Envía a POST /registro/enviar (Cloudflare Pages Function). La
    confirmación solo aparece cuando el servidor responde que la solicitud
    quedó REGISTRADA (D1 + R2).
  - No guarda nada en el navegador.
========================================================================= */

import { CATEGORIES, PROVINCES, LIMITS, normalize, validate } from "./solicitud-core.js?v=20261009";

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
function loadTurnstile(siteKey, box) {
  return new Promise((resolve) => {
    const render = () => {
      try {
        const id = window.turnstile.render(box, { sitekey: siteKey, language: "es", theme: "light", size: "flexible" });
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
  let prepared = null;   /* imagen ya procesada */

  CATEGORIES.forEach((c) => $("#fCategory").insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.label}</option>`));
  PROVINCES.forEach((p) => $("#fProvince").insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`));

  const toggle = () => { $("[data-show-if='category-otra']").hidden = $("#fCategory").value !== "otra"; };
  $("#fCategory").addEventListener("change", toggle);
  toggle();

  const summary = $("#fSummary");
  const counter = $("#summaryCount");
  summary.addEventListener("input", () => { counter.textContent = String(summary.value.length); });

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
  form.querySelectorAll("[name=imageKind]").forEach((r) => r.addEventListener("change", () => fileInput.files.length && refreshImage()));

  /* ¿Está listo el servidor? (si no, se avisa antes de llenar nada) */
  try {
    const res = await fetch(CONFIG, { headers: { Accept: "application/json" } });
    const cfg = res.ok ? await res.json() : { ready: false };
    if (!cfg.ready) throw new Error("no listo");
    turnstileId = await loadTurnstile(cfg.turnstileSiteKey, $("#turnstileBox"));
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

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearErrors();
    status.hidden = true;

    const raw = {};
    new FormData(form).forEach((v, k) => { if (typeof v === "string") raw[k] = v; });
    const { errors } = validate(normalize(raw));
    if (!prepared) {
      if (fileInput.files && fileInput.files[0]) await refreshImage();
      if (!prepared) errors.image = errors.image || "Adjunta una fotografía o un logotipo.";
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
    body.set("idempotencyKey", idempotencyKey);

    button.disabled = true;
    const label = button.textContent;
    button.textContent = "Enviando…";
    let result = null;
    let httpStatus = 0;
    try {
      const res = await fetch(ENDPOINT, { method: "POST", body, headers: { Accept: "application/json" } });
      httpStatus = res.status;
      result = await res.json().catch(() => null);
    } catch (e) {
      result = null;
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
    if (window.turnstile && turnstileId !== null && httpStatus !== 429) {
      try { window.turnstile.reset(turnstileId); } catch (e) { /* opcional */ }
    }
    setStatus((result && result.error) || "No pudimos registrar tu solicitud. Tus datos siguen en el formulario: inténtalo de nuevo en unos minutos.");
    status.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
