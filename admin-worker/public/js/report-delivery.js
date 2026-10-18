/*
  report-delivery.js — Entrega del reporte: Descargar PDF, WhatsApp y correo.

  - Nada se abre ni se envía sin mostrar antes el destinatario y pedir
    confirmación.
  - Los contactos se toman SOLO del perfil publicado (businesses.js); si
    falta alguno, el administrador lo escribe.
  - WhatsApp: un enlace wa.me no puede adjuntar archivos. En computadora se
    abre el chat SIN texto y el mensaje queda copiado, para pegarlo como
    comentario del PDF: así nunca sale el mensaje sin el reporte. En teléfono
    se ofrece además el menú «Compartir» del sistema con el PDF.
  - Ningún texto afirma que el PDF se envió o adjuntó: el panel no puede
    comprobarlo.
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
  let shareFile = null;

  /* Teléfono o tableta. En computadora el menú «Compartir» de Windows/Mac no
     entrega el archivo de forma fiable a WhatsApp (ni a WhatsApp Web), así
     que allí no se ofrece. iPadOS se presenta como Mac con pantalla táctil. */
  function isMobile() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean" && navigator.userAgentData.mobile) return true;
    const ua = navigator.userAgent || "";
    return /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }

  /* Menú «Compartir» nativo con archivos (Web Share): Chrome en Android y
     Safari en iPhone/iPad. */
  function canShareFiles() {
    try {
      const probe = new File(["%PDF-"], "reporte.pdf", { type: "application/pdf" });
      return typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
    } catch (e) {
      return false;
    }
  }

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
      hello(":"),
      `Te compartimos tu reporte de rendimiento correspondiente a ${monthText()}.`,
      "Equipo de El Podcast del Migrante",
    ].join("\n\n");
  }

  function mailMessage() {
    return [
      hello(":"),
      `Te compartimos tu reporte de rendimiento correspondiente a ${monthText()}.`,
      "Si tienes alguna pregunta, responde a este correo y con gusto te ayudamos.",
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
    $("toLabel").textContent = wa ? `Para: ${report.name} · WhatsApp` : `Para: ${report.name} · correo`;
    $("toInput").type = wa ? "tel" : "email";
    $("toInput").inputMode = wa ? "tel" : "email";
    $("toInput").value = ok ? (wa ? `+${known}` : known) : "";
    $("toInput").placeholder = wa ? "+1 403 555 1234" : "nombre@empresa.com";
    $("toSource").textContent = ok
      ? "Dato publicado en su perfil. Verifícalo antes de continuar."
      : wa
        ? "Su perfil no tiene WhatsApp publicado: escribe el número con código de país."
        : "Su perfil no tiene correo publicado: escríbelo aquí.";
    $("msgInput").value = wa ? waMessage() : mailMessage();
    $("pdfField").hidden = !direct;
    $("pdfInput").value = "";
    const mobile = isMobile();
    const share = !direct && mobile && canShareFiles();
    $("shareBlock").hidden = !share;
    shareFile = null;
    $("shareInput").value = "";
    $("shareBtn").disabled = true;
    $("shareFile").textContent = "Ningún PDF elegido. Si aún no lo tienes, usa «Descargar PDF».";
    $("sendNote").textContent = direct
      ? `Se enviará desde ${mailConfig.from} con el PDF adjunto.`
      : wa
        ? `${share ? "Otra forma: se" : "Se"} abrirá el chat vacío y el mensaje quedará copiado. Adjunta el PDF y pega el mensaje como comentario del archivo.`
        : `${share ? "Otra forma: se" : "Se"} abrirá un borrador en tu correo. Adjunta el PDF antes de enviarlo.`;
    $("reviewBtn").textContent = wa ? "Abrir WhatsApp" : direct ? "Revisar y enviar" : "Abrir correo";
    $("reviewBtn").className = share ? "btn btn--outline" : "btn btn--primary";
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
      const match = await checkPdfMatches(file);
      if (!match.ok) return setError(`Este PDF no corresponde a ${report.name} · ${report.period} (es «${match.title}»).`);
    }
    setError("");
    pending = { to, message, pdf, key: crypto.randomUUID() };
    /* WhatsApp y el correo propio: la pantalla ya muestra destinatario y
       mensaje, y nada se envía hasta pulsar Enviar en esa aplicación. */
    if (!direct) return openApp(pending);

    /* Envío directo (real): segunda pantalla con confirmación. */
    const rows = [["De", mailConfig.from], ["Para", `${report.name} · ${to}`], ["Asunto", subject()], ["Adjunto", `${pdf.name} (${kb(pdf.size)})`]];
    $("reviewList").innerHTML = rows.map(([k, v]) => `<dt>${A.esc(k)}</dt><dd>${A.esc(v)}</dd>`).join("");
    $("reviewMsg").textContent = message;
    $("confirmText").textContent = `Confirmo que el correo ${to} corresponde a ${report.name}.`;
    $("confirmChk").checked = false;
    $("confirmBtn").disabled = true;
    $("confirmBtn").textContent = "Enviar correo";
    show("review");
    $("confirmChk").focus();
  }

  /* Pantalla final: lo que falta hacer (nunca «enviado» ni «adjuntado»). */
  function done(text, steps, copyText) {
    $("doneText").textContent = text;
    $("doneSteps").innerHTML = (steps || []).map((t) => `<li>${A.esc(t)}</li>`).join("");
    $("doneSteps").hidden = !(steps && steps.length);
    $("copyBox").hidden = !copyText;
    $("copyMsg").textContent = copyText || "";
    $("copyState").textContent = "";
    show("done");
    $("closeBtn").focus();
  }

  function copyMessage(text) {
    try {
      return navigator.clipboard.writeText(text).then(() => true, () => false);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  /* Abre WhatsApp o el correo propio con el mensaje. Solo texto: nunca se
     incluye un enlace al panel ni al reporte (son de uso interno). */
  function openApp(p) {
    if (mode === "wa") {
      /* Chat SIN texto: el mensaje va copiado y se pega junto al PDF. */
      const copied = copyMessage(p.message);
      window.open(`https://wa.me/${p.to}`, "_blank", "noopener");
      const mobile = isMobile();
      done(
        "Falta adjuntar el PDF. En el chat de WhatsApp:",
        mobile
          ? ["Toca 📎 → Documento y elige el PDF del reporte.", "En el comentario del archivo, mantén pulsado y elige Pegar.", "Revisa que el PDF esté en el chat y envía."]
          : ["Arrastra el PDF al chat (o 📎 → Documento).", "En el comentario del archivo, pega el mensaje con Ctrl+V (⌘+V en Mac).", "Revisa que el PDF esté en el chat y envía."],
        p.message
      );
      copied.then((ok) => ($("copyState").textContent = ok ? "Mensaje copiado." : "No se pudo copiar automáticamente: usa «Copiar mensaje»."));
      return;
    }
    const a = document.createElement("a");
    a.href = `mailto:${encodeURIComponent(p.to)}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(p.message)}`;
    a.click();
    return done("Falta adjuntar el PDF. En el borrador de tu correo:", ["Adjunta el PDF del reporte (📎 Adjuntar).", "Revisa que el PDF esté adjunto y envía."]);
  }

  async function confirm() {
    if (!pending || !$("confirmChk").checked || !mailConfig.enabled) return;
    const p = pending;
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
      done(`Resend aceptó el correo para ${data.to} con el PDF adjunto.`);
    } catch (e) {
      $("sendError2").textContent = `${e.message} Puedes intentarlo de nuevo: no se enviará dos veces.`;
      $("confirmBtn").disabled = !$("confirmChk").checked;
      $("confirmBtn").textContent = "Enviar correo";
    }
  }

  /* Título interno del PDF (Chrome y Safari guardan el título de la página:
     «<Empresa> · <Mes Año> · Reporte de rendimiento»). "" si no se encuentra. */
  async function pdfTitle(file) {
    const latin1 = async (blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let out = "";
      for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      return out;
    };
    const span = 256 * 1024;
    const raw = (await latin1(file.slice(0, span))) + (file.size > span ? await latin1(file.slice(-span)) : "");
    const utf16 = (bin) => {
      let t = "";
      for (let i = 2; i + 1 < bin.length; i += 2) t += String.fromCharCode((bin.charCodeAt(i) << 8) | bin.charCodeAt(i + 1));
      return t;
    };
    const decode = (bin) => (bin.startsWith("\xfe\xff") ? utf16(bin) : decodeURIComponent(escape(bin)));
    let m = raw.match(/\/Title\s*<([0-9A-Fa-f\s]+)>/);
    if (m) {
      const hex = m[1].replace(/\s+/g, "");
      let bin = "";
      for (let i = 0; i + 1 < hex.length; i += 2) bin += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      try { return decode(bin); } catch (e) { return bin; }
    }
    m = raw.match(/\/Title\s*\(((?:\\.|[^\\)])*)\)/);
    if (m) {
      const bin = m[1].replace(/\\([()\\])/g, "$1");
      try { return decode(bin); } catch (e) { return bin; }
    }
    m = raw.match(/<dc:title>[\s\S]*?<rdf:li[^>]*>([^<]*)<\/rdf:li>/);
    if (m) {
      try { return decodeURIComponent(escape(m[1])); } catch (e) { return m[1]; }
    }
    return "";
  }

  const norm = (t) => String(t || "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

  /* ¿El PDF es de la empresa y el mes de ESTE reporte? Evita enviar a una
     empresa el reporte (o el nombre) de otra. */
  async function checkPdfMatches(file) {
    const title = await pdfTitle(file).catch(() => "");
    /* Solo se bloquea un reporte nuestro de OTRA empresa o mes; si el título
       no es reconocible (otro navegador), se avisa para revisarlo a mano. */
    if (!norm(title).includes("reporte de rendimiento")) return { ok: true, unknown: true };
    const ok = norm(title).includes(norm(report.name)) && norm(title).includes(norm(report.period));
    return { ok, title };
  }

  /* El PDF elegido se valida al elegirlo, para que «Compartir» se ejecute
     dentro del mismo clic (los navegadores lo exigen). */
  async function pickShareFile() {
    const file = $("shareInput").files[0];
    shareFile = null;
    $("shareBtn").disabled = true;
    setError("");
    if (!file) return;
    let head = "";
    try {
      head = await file.slice(0, 5).text();
    } catch (e) {
      head = "";
    }
    if (head !== "%PDF-") {
      $("shareFile").textContent = "Ningún PDF elegido.";
      return setError("El archivo elegido no es un PDF. Elige el reporte que descargaste.");
    }
    const match = await checkPdfMatches(file);
    if (!match.ok) {
      $("shareFile").textContent = "Ningún PDF elegido.";
      return setError(`Este PDF no corresponde a ${report.name} · ${report.period} (es «${match.title}»). Descarga el reporte de esta empresa y elígelo.`);
    }
    /* Algunos sistemas no informan el tipo; se fija para el menú Compartir. */
    shareFile = file.type === "application/pdf" ? file : new File([file], file.name, { type: "application/pdf" });
    $("shareFile").textContent = match.unknown
      ? `PDF elegido: ${file.name} (${kb(file.size)}). No se pudo comprobar su empresa: verifica que sea el de ${report.name} · ${report.period}.`
      : `PDF de ${report.name} · ${report.period} comprobado (${kb(file.size)}).`;
    $("shareBtn").disabled = false;
  }

  async function sharePdf() {
    if (!shareFile) return;
    const message = $("msgInput").value.trim();
    const data = { files: [shareFile], title: subject() };
    if (message) data.text = message;
    if (!navigator.canShare(data)) return setError("Este dispositivo no permite compartir este archivo. Adjúntalo a mano.");
    try {
      await navigator.share(data);
      done("Revisa en la aplicación que elegiste, antes de enviar:", ["Que el PDF aparezca en el chat o en el correo.", "Que el mensaje esté incluido; si no, escríbelo o pégalo."], message);
    } catch (e) {
      if (e && e.name === "AbortError") return; /* el usuario cerró el menú */
      setError("No se pudo abrir el menú Compartir. Puedes adjuntar el PDF a mano.");
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
  $("shareInput").addEventListener("change", pickShareFile);
  $("shareBtn").addEventListener("click", sharePdf);
  $("copyBtn").addEventListener("click", () =>
    copyMessage($("copyMsg").textContent).then((ok) => ($("copyState").textContent = ok ? "Mensaje copiado." : "No se pudo copiar: selecciona el texto y cópialo.")));
  $("backBtn").addEventListener("click", () => show("edit"));
  $("confirmChk").addEventListener("change", () => ($("confirmBtn").disabled = !$("confirmChk").checked));
  $("confirmBtn").addEventListener("click", confirm);
  $("cancelBtn").addEventListener("click", close);
  $("closeBtn").addEventListener("click", close);
  $("sendForm").addEventListener("submit", (e) => e.preventDefault());
})();
