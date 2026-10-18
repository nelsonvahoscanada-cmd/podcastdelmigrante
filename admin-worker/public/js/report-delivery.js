/*
  report-delivery.js — Entrega del reporte: Descargar PDF, WhatsApp y correo.

  - Nada se abre ni se envía sin mostrar antes el destinatario y pedir
    confirmación.
  - Los contactos se toman SOLO del perfil publicado (businesses.js); si
    falta alguno, el administrador lo escribe.
  - WhatsApp: un enlace wa.me no puede adjuntar archivos. Se abre la
    conversación con el mensaje listo y el PDF se adjunta a mano.
  - Correo: si el envío directo está activado en el Worker, se adjunta el PDF
    descargado y se envía desde el remitente oficial. Si no, se abre el
    programa de correo del administrador con el mensaje listo.
  - No se crean enlaces públicos al reporte.
*/
(function () {
  "use strict";
  const A = window.PDMAdmin;
  const $ = (id) => document.getElementById(id);
  const EMAIL_RE = /^[^\s@<>(),;:"[\]\\]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

  let report = null;
  let mailConfig = { enabled: false, from: "", max_pdf_bytes: 4 * 1024 * 1024 };
  let mode = "";
  let pending = null;

  const waDigits = (v) => String(v || "").replace(/[\s().+-]/g, "");
  const validWa = (d) => /^[1-9]\d{9,14}$/.test(d);
  const kb = (n) => `${Math.max(1, Math.round(n / 1024)).toLocaleString("es")} KB`;

  /* Nombre de pila del perfil publicado; sin perfil, saludo genérico. */
  function hello(sep) {
    const b = report.business;
    if (!b) return `Hola${sep}`;
    const card = b.connect && b.connect.contactCard;
    return `Hola ${(card && card.givenName) || b.name}${sep}`;
  }

  function monthText() {
    const [y, m] = report.month.split("-").map(Number);
    const name = new Intl.DateTimeFormat("es", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
    return `${name} de ${y}`;
  }

  function waMessage() {
    return [
      `${hello(",")} te saludamos de El Podcast del Migrante.`,
      `Te compartimos el reporte de rendimiento de tu Perfil Empresarial Premium correspondiente a ${monthText()}. Te enviamos el PDF en este mismo chat.`,
      "Las cifras corresponden a visitas e interacciones registradas en la plataforma. Si tienes alguna pregunta, con gusto te ayudamos.",
      "Equipo de El Podcast del Migrante",
    ].join("\n\n");
  }

  function mailMessage() {
    return [
      hello(":"),
      `Te compartimos el reporte de rendimiento de tu Perfil Empresarial Premium correspondiente a ${monthText()}.`,
      "Si tienes alguna pregunta sobre las cifras, responde a este correo y con gusto te ayudamos.",
      "Equipo de El Podcast del Migrante",
    ].join("\n\n");
  }

  const subject = () => `Reporte de rendimiento de ${monthText()} — ${report.name} — El Podcast del Migrante`;

  function show(step) {
    $("sendEdit").hidden = step !== "edit";
    $("sendReview").hidden = step !== "review";
    $("sendDone").hidden = step !== "done";
  }

  function setError(text) {
    $("sendError").textContent = text || "";
    $("sendError2").textContent = "";
  }

  function open(which) {
    mode = which;
    pending = null;
    const b = report.business || {};
    const wa = which === "wa";
    const known = wa ? waDigits(b.whatsapp) : String(b.email || "").trim();
    const ok = wa ? validWa(known) : EMAIL_RE.test(known);
    const direct = !wa && mailConfig.enabled;

    $("sendTitle").textContent = wa ? "Compartir por WhatsApp" : "Enviar por correo";
    $("toLabel").textContent = wa ? "Número de WhatsApp del empresario (con código de país)" : "Correo del empresario";
    $("toInput").type = wa ? "tel" : "email";
    $("toInput").inputMode = wa ? "tel" : "email";
    $("toInput").value = ok ? (wa ? `+${known}` : known) : "";
    $("toInput").placeholder = wa ? "+1 403 555 1234" : "nombre@empresa.com";
    $("toSource").textContent = ok
      ? "Dato publicado en el perfil del empresario. Verifícalo antes de continuar."
      : wa
        ? "El perfil no tiene un WhatsApp publicado. Escríbelo con el código de país."
        : "El perfil no tiene un correo publicado. Escríbelo antes de continuar.";
    $("msgInput").value = wa ? waMessage() : mailMessage();
    $("pdfField").hidden = !direct;
    $("pdfInput").value = "";
    $("sendNote").textContent = wa
      ? "WhatsApp no permite adjuntar archivos desde un enlace. Se abrirá la conversación con el mensaje listo; adjunta tú el PDF descargado (📎 → Documento) antes de enviar."
      : direct
        ? `Se enviará desde el remitente oficial (${mailConfig.from}) con el PDF adjunto.`
        : "El envío directo desde el panel todavía no está activado. Se abrirá tu programa de correo con el mensaje listo; adjunta tú el PDF descargado antes de enviarlo.";
    setError("");
    show("edit");
    $("sendDialog").showModal();
    $("toInput").focus();
  }

  function readPdf(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || "");
        const b64 = s.slice(s.indexOf(",") + 1);
        atob(b64.slice(0, 8)).startsWith("%PDF-") ? resolve(b64) : reject(new Error("El archivo no es un PDF."));
      };
      r.onerror = () => reject(new Error("No se pudo leer el archivo."));
      r.readAsDataURL(file);
    });
  }

  async function review() {
    const wa = mode === "wa";
    const raw = $("toInput").value.trim();
    const to = wa ? waDigits(raw) : raw;
    if (wa ? !validWa(to) : !EMAIL_RE.test(to)) {
      setError(wa ? "Escribe un número de WhatsApp válido, con código de país (ej. +1 403 555 1234)." : "Escribe un correo válido.");
      return;
    }
    const message = $("msgInput").value.trim();
    if (!message) return setError("El mensaje no puede quedar vacío.");

    const direct = !wa && mailConfig.enabled;
    let pdf = null;
    if (direct) {
      const file = $("pdfInput").files[0];
      if (!file) return setError("Elige el PDF del reporte que descargaste.");
      if (file.size > mailConfig.max_pdf_bytes) return setError(`El PDF pesa ${kb(file.size)}; el máximo es ${kb(mailConfig.max_pdf_bytes)}.`);
      try {
        pdf = { name: file.name, size: file.size, b64: await readPdf(file) };
      } catch (e) {
        return setError(e.message);
      }
    }
    setError("");
    pending = { to, message, pdf, key: crypto.randomUUID() };

    const rows = wa
      ? [["Para", `${report.name} · +${to}`], ["Canal", "WhatsApp (se abre en una pestaña nueva)"], ["PDF", "Lo adjuntas tú en la conversación"]]
      : direct
        ? [["De", mailConfig.from], ["Para", `${report.name} · ${to}`], ["Asunto", subject()], ["Adjunto", `${pdf.name} (${kb(pdf.size)})`]]
        : [["Para", `${report.name} · ${to}`], ["Asunto", subject()], ["Canal", "Tu programa de correo"], ["PDF", "Lo adjuntas tú antes de enviar"]];
    $("reviewList").innerHTML = rows.map(([k, v]) => `<dt>${A.esc(k)}</dt><dd>${A.esc(v)}</dd>`).join("");
    $("reviewMsg").textContent = message;
    $("confirmText").textContent = wa
      ? `Confirmo que el número +${to} corresponde a ${report.name}.`
      : `Confirmo que el correo ${to} corresponde a ${report.name}.`;
    $("confirmChk").checked = false;
    $("confirmBtn").disabled = true;
    $("confirmBtn").textContent = wa ? "Abrir WhatsApp" : direct ? "Enviar correo" : "Abrir mi correo";
    show("review");
    $("confirmChk").focus();
  }

  function done(text) {
    $("doneText").textContent = text;
    show("done");
    $("closeBtn").focus();
  }

  async function confirm() {
    if (!pending || !$("confirmChk").checked) return;
    const p = pending;
    if (mode === "wa") {
      window.open(`https://wa.me/${p.to}?text=${encodeURIComponent(p.message)}`, "_blank", "noopener");
      return done("Se abrió WhatsApp con el mensaje listo. Adjunta el PDF en la conversación; nada se envía hasta que pulses Enviar en WhatsApp.");
    }
    if (!mailConfig.enabled) {
      const a = document.createElement("a");
      a.href = `mailto:${encodeURIComponent(p.to)}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(p.message)}`;
      a.click();
      return done("Se abrió tu programa de correo con el mensaje listo. Adjunta el PDF antes de enviarlo.");
    }
    $("confirmBtn").disabled = true;
    $("confirmBtn").textContent = "Enviando…";
    $("sendError2").textContent = "";
    try {
      const res = await fetch("/api/reportes/enviar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          business_id: report.id,
          business_name: report.name,
          month: report.month,
          to: p.to,
          message: p.message,
          pdf_base64: p.pdf.b64,
          confirmed: true,
          idempotency_key: p.key,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      done(`Correo enviado a ${data.to} con el PDF adjunto.`);
    } catch (e) {
      $("sendError2").textContent = `${e.message} Puedes intentarlo de nuevo: no se enviará dos veces.`;
      $("confirmBtn").disabled = !$("confirmChk").checked;
      $("confirmBtn").textContent = "Enviar correo";
    }
  }

  function close() {
    pending = null;
    $("sendDialog").close();
  }

  document.addEventListener("report:ready", async (ev) => {
    report = ev.detail;
    $("delivery").hidden = false;
    try {
      mailConfig = Object.assign(mailConfig, await A.api("/api/reportes/correo"));
    } catch (e) {
      mailConfig.enabled = false;
    }
  });

  $("printBtn").addEventListener("click", () => window.print());
  $("waBtn").addEventListener("click", () => open("wa"));
  $("mailBtn").addEventListener("click", () => open("mail"));
  $("reviewBtn").addEventListener("click", review);
  $("backBtn").addEventListener("click", () => show("edit"));
  $("confirmChk").addEventListener("change", () => ($("confirmBtn").disabled = !$("confirmChk").checked));
  $("confirmBtn").addEventListener("click", confirm);
  $("cancelBtn").addEventListener("click", close);
  $("closeBtn").addEventListener("click", close);
  $("sendForm").addEventListener("submit", (e) => e.preventDefault());
})();
