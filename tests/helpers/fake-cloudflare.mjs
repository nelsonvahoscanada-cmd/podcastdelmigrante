/*
  Entorno de Cloudflare simulado para pruebas (sin red ni dependencias):
    - D1  → SQLite real de Node (node:sqlite) con el esquema de db/directorio
    - R2  → mapa en memoria
    - Resend y Turnstile → URLs falsas atendidas por un fetch simulado
*/
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

/* Aplica todas las migraciones de db/directorio en orden (o solo hasta
   `upTo`, para simular una base a la que aún no se le aplicó una migración). */
export function fakeD1({ upTo } = {}) {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../../db/directorio/", import.meta.url);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (upTo && f > upTo) break;
    db.exec(readFileSync(new URL(f, dir), "utf8"));
  }
  const wrap = (sql) => {
    let args = [];
    const stmt = {
      bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return stmt; },
      async first() { return db.prepare(sql).get(...args) || null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { return stmt._run(); },
      _run() { const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: r.changes } }; },
    };
    return stmt;
  };
  /* Como D1: batch() es una transacción (todo o nada). */
  async function batch(stmts) {
    db.exec("BEGIN");
    try {
      const out = stmts.map((s) => s._run());
      db.exec("COMMIT");
      return out;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return { prepare: wrap, batch, _db: db };
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
export function installFetch({ turnstileOk = true, turnstileDown = false, resendFails = false } = {}) {
  const sent = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith("https://turnstile.test/")) {
      if (turnstileDown) throw new TypeError("fetch failed");
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
      TURNSTILE_SITE_KEY: "1x00000000000000000000AA", /* clave de prueba pública de Cloudflare */
      TURNSTILE_VERIFY_URL: "https://turnstile.test/siteverify",
      IP_HASH_SALT: "sal",
      MAIL_FROM: "El Podcast del Migrante <solicitudes@podcastdelmigrante.com>",
      MAIL_INTERNAL_TO: "podcastdelmigrante@gmail.com",
      PANEL_URL: "https://admin.podcastdelmigrante.com",
      REGISTRO_ABIERTO: "1",
    },
    over
  );
}
