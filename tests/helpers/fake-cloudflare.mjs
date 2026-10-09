/*
  Entorno de Cloudflare simulado para pruebas (sin red ni dependencias):
    - D1  → SQLite real de Node (node:sqlite) con el esquema de db/directorio
    - R2  → mapa en memoria
    - Resend y Turnstile → URLs falsas atendidas por un fetch simulado
*/
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export function fakeD1() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../../db/directorio/0001_solicitudes.sql", import.meta.url), "utf8"));
  const wrap = (sql) => {
    let args = [];
    const stmt = {
      bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return stmt; },
      async first() { return db.prepare(sql).get(...args) || null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: r.changes } }; },
    };
    return stmt;
  };
  return { prepare: wrap, _db: db, failInserts: false };
}

export function fakeR2() {
  const store = new Map();
  return {
    store,
    async put(key, value, opts = {}) { store.set(key, { bytes: new Uint8Array(value), httpMetadata: opts.httpMetadata || {}, customMetadata: opts.customMetadata || {} }); },
    async get(key) {
      const o = store.get(key);
      if (!o) return null;
      return { body: o.bytes, httpMetadata: o.httpMetadata, customMetadata: o.customMetadata, size: o.bytes.length, async arrayBuffer() { return o.bytes.buffer; } };
    },
    async delete(key) { store.delete(key); },
  };
}

/* fetch simulado: registra los correos y responde a Turnstile */
export function installFetch({ turnstileOk = true, resendFails = false } = {}) {
  const sent = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith("https://turnstile.test/")) {
      const params = new URLSearchParams(String(init.body));
      return new Response(JSON.stringify({ success: turnstileOk && params.get("response") === "token-ok" }), { status: 200 });
    }
    if (u.startsWith("https://resend.test/")) {
      sent.push({ headers: init.headers, body: JSON.parse(init.body) });
      return resendFails ? new Response("rate limited", { status: 429 }) : new Response(JSON.stringify({ id: "email_" + sent.length }), { status: 200 });
    }
    throw new Error("Red no permitida en pruebas: " + u);
  };
  return { sent, restore: () => { globalThis.fetch = original; } };
}

export function fakeEnv(over = {}) {
  return Object.assign(
    {
      DIRECTORIO_DB: fakeD1(),
      SOLICITUDES: fakeR2(),
      RESEND_API_KEY: "re_test",
      RESEND_API_URL: "https://resend.test/emails",
      TURNSTILE_SECRET_KEY: "secret",
      TURNSTILE_SITE_KEY: "site",
      TURNSTILE_VERIFY_URL: "https://turnstile.test/siteverify",
      IP_HASH_SALT: "sal",
      MAIL_FROM: "El Podcast del Migrante <solicitudes@podcastdelmigrante.com>",
      MAIL_INTERNAL_TO: "podcastdelmigrante@gmail.com",
      PANEL_URL: "https://admin.podcastdelmigrante.com",
    },
    over
  );
}
