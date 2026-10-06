/*
  auth.js — Verificación de Cloudflare Access (Zero Trust).

  Cloudflare Access protege admin.podcastdelmigrante.com en el borde. Aun así,
  el Worker verifica de nuevo, en CADA petición, el JWT que Access envía en la
  cabecera "Cf-Access-Jwt-Assertion" (defensa en profundidad):
    - firma RS256 con las claves públicas del equipo (/cdn-cgi/access/certs)
    - aud = ACCESS_AUD (la aplicación de Access del panel)
    - iss = ACCESS_TEAM_DOMAIN, exp / nbf vigentes
    - email incluido en ADMIN_EMAILS
  Si falta cualquier configuración, se DENIEGA todo (fail closed).

  Variables del Worker (ninguna es una clave privada):
    ACCESS_TEAM_DOMAIN  ej. "https://eradio.cloudflareaccess.com"
    ACCESS_AUD          "Application Audience (AUD) Tag" de la app de Access
    ADMIN_EMAILS        correos autorizados separados por comas (configurar
                        como secreto para no publicarlos en el repositorio)
*/

let jwksCache = { url: "", keys: null, at: 0 };
const JWKS_TTL_MS = 60 * 60 * 1000;

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function decodePart(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

async function getKeys(teamDomain, force) {
  const url = `${teamDomain}/cdn-cgi/access/certs`;
  if (!force && jwksCache.url === url && jwksCache.keys && Date.now() - jwksCache.at < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(url, { cf: { cacheTtl: 300 } });
  if (!res.ok) throw new Error("No se pudieron obtener las claves de Access");
  const { keys } = await res.json();
  jwksCache = { url, keys: keys || [], at: Date.now() };
  return jwksCache.keys;
}

function normalizeTeamDomain(v) {
  const s = String(v || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  return s.startsWith("https://") ? s : `https://${s}`;
}

export function parseAdminEmails(v) {
  return String(v || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/* Devuelve { email } si la petición es de un administrador válido, o null. */
export async function verifyAccess(request, env) {
  const teamDomain = normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN);
  const aud = String(env.ACCESS_AUD || "").trim();
  const admins = parseAdminEmails(env.ADMIN_EMAILS);
  if (!teamDomain || !aud || !admins.length) return null;

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header, payload;
  try {
    header = decodePart(parts[0]);
    payload = decodePart(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;

  let keys = await getKeys(teamDomain, false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getKeys(teamDomain, true); /* rotación de claves */
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) return null;

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) return null;

  const now = Math.floor(Date.now() / 1000);
  const audOk = Array.isArray(payload.aud) ? payload.aud.includes(aud) : payload.aud === aud;
  if (!audOk) return null;
  if (payload.iss !== teamDomain) return null;
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  if (typeof payload.nbf === "number" && payload.nbf > now + 60) return null;

  const email = String(payload.email || "").toLowerCase();
  if (!email || !admins.includes(email)) return null;
  return { email, role: "admin" };
}

/* Punto único de autorización por empresa. Hoy solo existen administradores
   de eRadio Global, que ven todas las empresas. Cuando cada empresario tenga
   acceso propio, aquí se consultará la relación correo → business_id en el
   servidor; NUNCA se confiará en el business_id que llega en la URL. */
export function canViewBusiness(identity, businessId) {
  return Boolean(identity && identity.role === "admin" && businessId);
}

/* Solo para `wrangler dev` en tu computador: exige la variable
   ALLOW_LOCAL_DEV="1" (archivo .dev.vars, que no se sube) Y que la conexión
   venga de la propia máquina (CF-Connecting-IP de loopback). En Cloudflare
   esa cabecera la fija la red con la IP real del visitante y no se puede
   falsificar, y ALLOW_LOCAL_DEV no existe: nunca se cumple. */
const LOOPBACK = new Set(["127.0.0.1", "::1"]);
export function localDevIdentity(request, env) {
  if (env.ALLOW_LOCAL_DEV !== "1") return null;
  if (!LOOPBACK.has(request.headers.get("CF-Connecting-IP") || "")) return null;
  return { email: "local-dev@localhost", role: "admin" };
}
