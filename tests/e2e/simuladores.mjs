// Simuladores locales para tests/e2e-registro.cjs: Resend (guarda los correos en el archivo indicado) y Turnstile (acepta "token-ok").
// Uso: node tests/e2e/simuladores.mjs /tmp/correos.jsonl
import http from "node:http";
import { appendFileSync, writeFileSync } from "node:fs";
const LOG = process.argv[2];
writeFileSync(LOG, "");
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.url.startsWith("/turnstile")) {
      const p = new URLSearchParams(body);
      const ok = p.get("response") === "token-ok";
      res.end(JSON.stringify(ok ? { success: true, hostname: process.env.TURNSTILE_HOSTNAME || "podcastdelmigrante.com" } : { success: false }));
    } else if (req.url.startsWith("/resend")) {
      const j = JSON.parse(body);
      appendFileSync(LOG, JSON.stringify({ idem: req.headers["idempotency-key"], auth: req.headers.authorization, ...j, attachments: (j.attachments || []).map((a) => ({ filename: a.filename, bytes: Buffer.from(a.content, "base64").length })) }) + "\n");
      res.end(JSON.stringify({ id: "mock" }));
    } else { res.statusCode = 404; res.end(); }
  });
}).listen(9999, "127.0.0.1", () => console.log("mocks listos"));
