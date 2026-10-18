/*
  Panel: envío del reporte por correo. Desactivado por defecto; con la
  configuración completa adjunta el PDF y no toca D1 ni R2.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.js";
import { buildReportEmail, emailConfig, MAX_PDF_BYTES } from "../src/reportes.js";

const ORIGIN = "https://admin.podcastdelmigrante.com";
const PDF = Buffer.from("%PDF-1.7\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF").toString("base64");
const KEY = "0f8c2a7e-1b2c-4d5e-8f90-a1b2c3d4e5f6";

const base = { ALLOW_LOCAL_DEV: "1", ASSETS: { fetch: async () => new Response("asset") } };
const on = Object.assign({}, base, {
  REPORTES_CORREO: "1",
  RESEND_API_KEY: "re_prueba",
  MAIL_FROM: "El Podcast del Migrante <reportes@correo.podcastdelmigrante.com>",
  MAIL_REPLY_TO: "podcastdelmigrante@gmail.com",
  RESEND_API_URL: "https://resend.prueba/emails",
});
const input = (over = {}) =>
  Object.assign(
    { business_id: "BIZ-002", business_name: "Carlos D. Castillo", month: "2026-10", to: "advice@carlosdar.io", message: "Hola Carlos:\n\nTe compartimos el reporte.", pdf_base64: PDF, confirmed: true, idempotency_key: KEY },
    over
  );

function send(env, body, headers = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return worker.fetch(
    new Request(ORIGIN + "/api/reportes/enviar", {
      method: "POST",
      body: raw,
      headers: Object.assign({ "CF-Connecting-IP": "127.0.0.1", "Content-Type": "application/json", Origin: ORIGIN }, headers),
    }),
    env
  );
}

function mockResend(status = 200) {
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: "x" }), { status });
  };
  return { calls, restore: () => (globalThis.fetch = orig) };
}

test("desactivado por defecto: no envía nada", async () => {
  const m = mockResend();
  try {
    assert.equal(emailConfig(base).enabled, false);
    assert.equal(emailConfig(Object.assign({}, on, { REPORTES_CORREO: "" })).enabled, false, "sin interruptor");
    assert.equal(emailConfig(Object.assign({}, on, { RESEND_API_KEY: "" })).enabled, false, "sin clave");
    assert.equal(emailConfig(Object.assign({}, on, { MAIL_FROM: "" })).enabled, false, "sin remitente");
    const cfg = await worker.fetch(new Request(ORIGIN + "/api/reportes/correo", { headers: { "CF-Connecting-IP": "127.0.0.1" } }), base);
    assert.deepEqual(await cfg.json(), { enabled: false, from: "", max_pdf_bytes: MAX_PDF_BYTES });
    const res = await send(base, input());
    assert.equal(res.status, 503);
    assert.equal(m.calls.length, 0);
  } finally {
    m.restore();
  }
});

test("sin identidad verificada no se puede consultar ni enviar", async () => {
  const m = mockResend();
  try {
    assert.equal((await send(on, input(), { "CF-Connecting-IP": "203.0.113.5" })).status, 403);
    const cfg = await worker.fetch(new Request(ORIGIN + "/api/reportes/correo", { headers: { "CF-Connecting-IP": "203.0.113.5" } }), on);
    assert.equal(cfg.status, 403);
    assert.equal(m.calls.length, 0);
  } finally {
    m.restore();
  }
});

test("solo POST JSON del mismo origen", async () => {
  const m = mockResend();
  try {
    assert.equal((await send(on, input(), { Origin: "https://otro.example" })).status, 403);
    assert.equal((await send(on, input(), { "Content-Type": "text/plain" })).status, 415);
    const get = await worker.fetch(new Request(ORIGIN + "/api/reportes/enviar", { headers: { "CF-Connecting-IP": "127.0.0.1" } }), on);
    assert.equal(get.status, 405);
    assert.equal((await send(on, input(), { "Content-Length": String(20 * 1024 * 1024) })).status, 413);
    assert.equal(m.calls.length, 0);
  } finally {
    m.restore();
  }
});

test("valida destinatario, confirmación, mes, mensaje y PDF", () => {
  const bad = [
    [{ to: "no-es-correo" }, /destinatario/],
    [{ to: "a@b.com, c@d.com" }, /destinatario/],
    [{ to: "a@b.com\nBcc: x@y.com" }, /destinatario/],
    [{ confirmed: false }, /confirmar/],
    [{ confirmed: "true" }, /confirmar/],
    [{ business_id: "../x" }, /business_id/],
    [{ month: "2026-13" }, /Mes/],
    [{ message: "   " }, /mensaje/],
    [{ message: "x".repeat(2001) }, /mensaje/],
    [{ pdf_base64: Buffer.from("<html>no</html>").toString("base64") }, /PDF/],
    [{ pdf_base64: "%%%no-base64" }, /PDF/],
    [{ pdf_base64: Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(MAX_PDF_BYTES)]).toString("base64") }, /PDF/],
    [{ idempotency_key: "" }, /clave/],
  ];
  for (const [over, re] of bad) {
    const out = buildReportEmail(on, input(over));
    assert.equal(out.status, 400, JSON.stringify(over).slice(0, 80));
    assert.match(out.error, re);
  }
});

test("con todo configurado: un solo destinatario, remitente oficial y PDF adjunto", async () => {
  const m = mockResend();
  try {
    const res = await send(on, input({ business_name: "Carlos <b>D.</b>\nCastillo", message: "Hola <script>x</script>\n\nSaludos" }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, to: "advice@carlosdar.io" });
    assert.equal(m.calls.length, 1);
    const { url, init, body } = m.calls[0];
    assert.equal(url, "https://resend.prueba/emails");
    assert.equal(init.headers.Authorization, "Bearer re_prueba");
    assert.equal(init.headers["Idempotency-Key"], `reporte-BIZ-002-2026-10-${KEY}`);
    assert.equal(body.from, on.MAIL_FROM);
    assert.deepEqual(body.to, ["advice@carlosdar.io"]);
    assert.equal(body.reply_to, "podcastdelmigrante@gmail.com");
    assert.equal(body.cc, undefined);
    assert.equal(body.bcc, undefined);
    assert.doesNotMatch(body.subject, /[\r\n]/);
    assert.match(body.subject, /^Reporte de rendimiento de octubre de 2026 — /);
    assert.deepEqual(body.attachments, [{ filename: "Reporte-BIZ-002-2026-10.pdf", content: PDF }]);
    assert.doesNotMatch(body.html, /<script>|<b>D/);
    assert.match(body.html, /&lt;script&gt;/);
    assert.match(body.text, /no equivalen a ventas/);
    assert.doesNotMatch(body.html + body.text, /https?:\/\/admin\.|\/report\?/, "sin enlaces al panel ni al reporte");
  } finally {
    m.restore();
  }
});

test("si Resend falla se informa y no se da por enviado", async () => {
  const m = mockResend(500);
  try {
    const res = await send(on, input());
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /No se envió nada/);
  } finally {
    m.restore();
  }
});

test("el envío no lee ni escribe D1 ni R2", async () => {
  const m = mockResend();
  const touched = [];
  const trap = new Proxy({}, { get: (_, k) => { touched.push(String(k)); return () => { throw new Error("no"); }; } });
  try {
    const res = await send(Object.assign({}, on, { DB: trap, DIRECTORIO_DB: trap, SOLICITUDES: trap }), input());
    assert.equal(res.status, 200);
    assert.deepEqual(touched, []);
  } finally {
    m.restore();
  }
});

test("WhatsApp y correo llevan solo texto: ningún enlace al panel ni al reporte", () => {
  const js = readFileSync(new URL("../public/js/report-delivery.js", import.meta.url), "utf8");
  for (const fn of ["waMessage", "mailMessage", "subject"]) {
    const body = js.slice(js.indexOf(fn), js.indexOf("\n  }", js.indexOf(fn)) + 4);
    assert.ok(body.length > 20, fn);
    assert.doesNotMatch(body, /https?:|www\.|\.com|admin|\/report|location/i, fn);
  }
  /* wa.me solo recibe el número y el texto; mailto, destinatario, asunto y texto. */
  assert.match(js, /wa\.me\/\$\{p\.to\}\?text=\$\{encodeURIComponent\(p\.message\)\}/);
  assert.doesNotMatch(js, /location\.href|document\.URL|location\.search[^)]*message/);
});

test("PDF: sin margen de página, Chrome no puede imprimir la dirección interna", () => {
  const css = readFileSync(new URL("../public/css/report.css", import.meta.url), "utf8");
  assert.match(css, /@page\s*\{\s*size:\s*letter;\s*margin:\s*0;\s*\}/);
  assert.match(css, /box-decoration-break:\s*clone/);
});

test("Compartir nativo: solo el PDF elegido y el mensaje, nunca una URL", () => {
  const js = readFileSync(new URL("../public/js/report-delivery.js", import.meta.url), "utf8");
  const fn = js.slice(js.indexOf("async function sharePdf"), js.indexOf("function close"));
  assert.match(fn, /files: \[shareFile\]/);
  assert.doesNotMatch(fn, /\burl\s*:/, "no se comparte ningún enlace");
  assert.match(js, /navigator\.canShare\(\{ files: \[probe\] \}\)/, "se detecta el soporte antes de ofrecerlo");
  assert.match(js, /head !== "%PDF-"/, "solo se comparten PDF");
});
