import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { verifyAccess, localDevIdentity, canViewBusiness } from "../src/auth.js";

const TEAM = "https://eradio-test.cloudflareaccess.com";
const AUD = "aud-panel-123";
const ENV = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ADMIN_EMAILS: "admin@eradio.test, Otro@eradio.test" };

let keyPair, jwk, otherPair;
const realFetch = globalThis.fetch;

const b64url = (bytes) => Buffer.from(bytes).toString("base64url");

async function sign(payload, opts = {}) {
  const header = { alg: "RS256", kid: opts.kid || "k1", typ: "JWT" };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", (opts.pair || keyPair).privateKey, new TextEncoder().encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

const now = () => Math.floor(Date.now() / 1000);
const good = (over = {}) => ({ aud: [AUD], iss: TEAM, email: "admin@eradio.test", exp: now() + 600, iat: now(), ...over });
const req = (token, url = "https://admin.podcastdelmigrante.com/") =>
  new Request(url, { headers: token ? { "Cf-Access-Jwt-Assertion": token } : {} });

before(async () => {
  const params = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };
  keyPair = await crypto.subtle.generateKey(params, true, ["sign", "verify"]);
  otherPair = await crypto.subtle.generateKey(params, true, ["sign", "verify"]);
  jwk = { ...(await crypto.subtle.exportKey("jwk", keyPair.publicKey)), kid: "k1", alg: "RS256" };
  globalThis.fetch = async (url) => {
    assert.equal(String(url), `${TEAM}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [jwk] }));
  };
});
after(() => {
  globalThis.fetch = realFetch;
});

test("acepta un token válido de un administrador", async () => {
  const id = await verifyAccess(req(await sign(good())), ENV);
  assert.deepEqual(id, { email: "admin@eradio.test", role: "admin" });
});

test("acepta correos sin distinguir mayúsculas", async () => {
  const id = await verifyAccess(req(await sign(good({ email: "otro@ERADIO.test" }))), ENV);
  assert.equal(id.email, "otro@eradio.test");
});

test("rechaza: sin token, token basura, otra firma, otra aud, otro emisor, vencido, correo no autorizado", async () => {
  assert.equal(await verifyAccess(req(null), ENV), null);
  assert.equal(await verifyAccess(req("abc.def.ghi"), ENV), null);
  assert.equal(await verifyAccess(req(await sign(good(), { pair: otherPair })), ENV), null);
  assert.equal(await verifyAccess(req(await sign(good({ aud: ["otra-app"] }))), ENV), null);
  assert.equal(await verifyAccess(req(await sign(good({ iss: "https://evil.cloudflareaccess.com" }))), ENV), null);
  assert.equal(await verifyAccess(req(await sign(good({ exp: now() - 10 }))), ENV), null);
  assert.equal(await verifyAccess(req(await sign(good({ email: "cliente@empresa.com" }))), ENV), null);
});

test("rechaza alg distinto de RS256 (ej. 'none')", async () => {
  const header = b64url(JSON.stringify({ alg: "none", kid: "k1" }));
  const payload = b64url(JSON.stringify(good()));
  assert.equal(await verifyAccess(req(`${header}.${payload}.`), ENV), null);
});

test("falla cerrado si falta configuración", async () => {
  const token = await sign(good());
  for (const missing of ["ACCESS_TEAM_DOMAIN", "ACCESS_AUD", "ADMIN_EMAILS"]) {
    assert.equal(await verifyAccess(req(token), { ...ENV, [missing]: "" }), null, missing);
  }
});

test("modo local solo con ALLOW_LOCAL_DEV=1 y conexión desde la propia máquina", () => {
  const from = (ip) => new Request("https://admin.podcastdelmigrante.com/", { headers: ip ? { "CF-Connecting-IP": ip } : {} });
  assert.ok(localDevIdentity(from("127.0.0.1"), { ALLOW_LOCAL_DEV: "1" }));
  assert.equal(localDevIdentity(from("127.0.0.1"), {}), null);
  assert.equal(localDevIdentity(from("203.0.113.9"), { ALLOW_LOCAL_DEV: "1" }), null);
  assert.equal(localDevIdentity(from(null), { ALLOW_LOCAL_DEV: "1" }), null);
});

test("autorización por empresa: solo administradores", () => {
  assert.equal(canViewBusiness({ role: "admin" }, "BIZ-002"), true);
  assert.equal(canViewBusiness({ role: "business" }, "BIZ-002"), false);
  assert.equal(canViewBusiness(null, "BIZ-002"), false);
});
