/*
  Planes del Directorio Empresarial (Gratuito y Premium): página comercial,
  formulario, reglas compartidas, Function /registro/enviar y ficha gratuita
  en el directorio. Precio Premium: $24.99 CAD al mes + impuestos aplicables.
  Hoy NO hay cobro en línea: nada debe anunciar un pago habilitado.
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import * as core from "../js/directorio/solicitud-core.js";
import { internalEmail, confirmationEmail } from "../functions/_lib/correos.js";
import { onRequestPost } from "../functions/registro/enviar.js";
import { fakeEnv, installFetch } from "./helpers/fake-cloudflare.mjs";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const LOGO = new Uint8Array(readFileSync(new URL("assets/logo.png", ROOT)));
const PHOTO = new Uint8Array(readFileSync(new URL("assets/tomas-velazquez.jpg", ROOT)));
const planes = read("planes-directorio.html");
const registro = read("registra-tu-empresa.html");
const texto = (h) => h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const FREE = {
  plan: "gratuito", name: "Panadería La Esquina", category: "otra", categoryOther: "Panadería", city: "Edmonton", province: "Alberta",
  summary: "Pan artesanal latino en Edmonton.", email: "Ana@Example.com", phone: "+1 780 555 1234", imageKind: "logo",
  consentData: "on", consentRights: "on", consentPublish: "on", "cf-turnstile-response": "token-ok",
};

function request(fields, image = LOGO, extras = [], ip = "203.0.113.50") {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  fd.set("image", new Blob([image], { type: image === LOGO ? "image/png" : "image/jpeg" }), "imagen");
  for (const b of extras) fd.append("extraImages", new Blob([b], { type: "image/jpeg" }), "extra.jpg");
  return new Request("https://podcastdelmigrante.com/registro/enviar", { method: "POST", body: fd, headers: { "CF-Connecting-IP": ip } });
}
async function send(env, fields, image, extras, ip) {
  const pending = [];
  const res = await onRequestPost({ request: request(fields, image, extras, ip), env, waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  return { res, body: await res.json() };
}
const rows = (env) => env.DIRECTORIO_DB._db.prepare("SELECT * FROM business_applications").all();

/* ---------- Página comercial ---------- */
test("página de planes: título, subtítulo, dos planes, precios exactos y botones al formulario", () => {
  const t = texto(planes);
  assert.match(planes, /<h1 class="reg-hero__title">Haz crecer tu negocio en Canadá<\/h1>/);
  assert.ok(t.includes("Únete al Directorio Empresarial de El Podcast del Migrante. Comienza gratis o destaca tu negocio con un Perfil Premium."));
  assert.match(t, /Plan Gratuito .*\$0 CAD/);
  assert.match(t, /Plan Premium .*\$24\.99 CAD\/mes \+ impuestos aplicables/);
  assert.doesNotMatch(planes, /\$\s?25(?![.\d])|25 CAD|\$25\.00/, "nunca $25");
  for (const c of ["Registrar mi empresa gratis", "Quiero mi Perfil Premium"]) assert.ok(t.includes(c), c);
  assert.ok((planes.match(/href="registra-tu-empresa\?plan=gratuito#solicitud"/g) || []).length >= 2);
  assert.ok((planes.match(/href="registra-tu-empresa\?plan=premium#solicitud"/g) || []).length >= 2);
});

test("página de planes: contenido de cada plan sin prometer funciones inexistentes", () => {
  const t = texto(planes);
  for (const f of ["Una fotografía, imagen del negocio o logotipo", "Descripción de hasta 200 caracteres", "Número de teléfono", "Ficha empresarial permanente en el directorio"]) assert.ok(t.includes(f), f);
  for (const f of ["Miniweb individual", "Tarjeta digital vCard y códigos QR", "Video y estadísticas individuales"]) assert.ok(t.includes(f), `Gratuito no incluye: ${f}`);
  for (const f of ["Miniweb empresarial personalizada", "Botones de llamada y WhatsApp", "Tarjeta digital vCard", "Dos códigos QR: tu miniweb y tu contacto", "Video de presentación", "Enlaces comerciales y redes sociales", "Estadísticas de visitas e interacciones", "Aparece antes que las fichas gratuitas"]) assert.ok(t.includes(f), f);
  /* Ejemplos reales de Perfil Premium publicados */
  for (const p of ["perfil-tomas-velazquez", "perfil-carlos-d-castillo"]) { assert.ok(planes.includes(`href="${p}"`)); assert.ok(existsSync(new URL(`${p}.html`, ROOT))); }
});

test("pagos: se dice con claridad que hoy es una solicitud y no un pago; sin checkout, tarjetas ni políticas inventadas", () => {
  const t = texto(planes) + " " + texto(registro);
  assert.match(t, /Todavía no hay pago en línea/);
  assert.match(t, /es una solicitud, no un pago/);
  assert.doesNotMatch(t, /paga ahora|pagar ahora|pago seguro|tarjeta de crédito|checkout|suscríbete ya/i);
  assert.doesNotMatch(planes + registro, /stripe|paypal|<input[^>]+(card|cc-number)/i);
  assert.doesNotMatch(t, /reembolso|cancela cuando quieras|sin permanencia|garantiza(mos)? (resultados|clientes)/i, "sin políticas de cancelación, reembolso o garantías no aprobadas");
});

test("preguntas frecuentes: las seis preguntas y el canal oficial de ayuda", () => {
  for (const q of ["¿Puedo registrar mi negocio gratis?", "¿Qué diferencia existe entre Gratis y Premium?", "¿Puedo pasar del plan gratuito al Premium?", "¿Cuánto cuesta Premium?", "¿Cuándo aparece publicado mi negocio?", "¿Cómo solicito ayuda?"]) assert.ok(planes.includes(`<summary>${q}</summary>`), q);
  assert.match(planes, /mailto:podcastdelmigrante@gmail\.com/);
});

test("SEO y accesibilidad básica de la página de planes", () => {
  assert.match(planes, /<html lang="es"/);
  assert.match(planes, /<title>Planes del Directorio Empresarial: Gratuito y Premium \| El Podcast del Migrante<\/title>/);
  assert.match(planes, /<link id="canonicalLink" rel="canonical" href="https:\/\/podcastdelmigrante\.com\/planes-directorio">/);
  assert.match(planes, /<meta id="metaDescription" name="description" content="[^"]{80,200}">/);
  assert.match(planes, /property="og:title"/);
  assert.equal((planes.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(planes, /<caption class="sr-only">/);
  const ld = JSON.parse(planes.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(ld.offers.map((o) => [o.name, o.price, o.priceCurrency]), [["Plan Gratuito", "0", "CAD"], ["Plan Premium", "24.99", "CAD"]]);
  assert.match(read("sitemap.xml"), /<loc>https:\/\/podcastdelmigrante\.com\/planes-directorio<\/loc>/);
});

test("navegación: la portada y el directorio llevan a la página de planes", () => {
  assert.match(read("index.html"), /<a class="biz-showcase__link" href="planes-directorio">/);
  const dir = read("quien-puede-ayudarte.html");
  assert.ok((dir.match(/href="planes-directorio"/g) || []).length >= 2);
  assert.match(registro, /href="planes-directorio"/);
});

/* ---------- Formulario ---------- */
test("formulario: selector de plan; los campos exclusivos de Premium se marcan y el teléfono es obligatorio en Gratuito", () => {
  assert.match(registro, /<input type="radio" name="plan" value="gratuito">/);
  assert.match(registro, /<input type="radio" name="plan" value="premium">/);
  for (const id of ["fRepresentative", "fTitle", "fServices", "fWhatsapp", "fWebsite", "fAddress", "fInstagram", "fFacebook", "fTiktok", "fLinkedin", "fExtraImages"]) {
    assert.match(registro, new RegExp(`data-plan-only="premium">\\s*<label for="${id}"`), id);
  }
  assert.match(registro, /<fieldset class="intake-fieldset" data-plan-only="premium">\s*<legend class="intake-legend"><span class="intake-step">04<\/span> Información adicional/);
  assert.match(registro, /<span class="intake-req" data-plan-text="gratuito" hidden>\*<\/span>/);
  assert.match(registro, /\$24\.99 CAD al mes más impuestos aplicables/);
  assert.doesNotMatch(registro, /se informa de forma personalizada/, "el precio ya no es «personalizado»");
  const js = read("js/directorio/solicitud-form.js");
  assert.match(js, /new URLSearchParams\(location\.search\)\.get\("plan"\)/);
  assert.match(js, /errors\.plan = "Elige el plan Gratuito o Premium\."/);
});

/* ---------- Reglas compartidas ---------- */
test("reglas: plan Gratuito con teléfono obligatorio, descripción ≤ 200 y sin campos de Premium", () => {
  const ok = core.validate(core.normalize({ ...FREE, website: "minegocio.ca", instagram: "@x", services: "algo", notes: "privado", representative: "" }));
  assert.deepEqual(ok.errors, {});
  for (const k of core.PREMIUM_ONLY) assert.equal(ok.data[k], "", k);
  const bad = core.validate(core.normalize({ ...FREE, phone: "", summary: "x".repeat(201) })).errors;
  assert.match(bad.phone, /teléfono/);
  assert.equal(bad.summary, "Máximo 200 caracteres.");
  assert.ok(!bad.contact, "el error de teléfono basta");
  assert.ok(!core.validate(core.normalize({ ...FREE, summary: "x".repeat(200) })).errors.summary);
  assert.equal(core.validate(core.normalize({ ...FREE, plan: "oro" })).errors.plan, "Elige el plan Gratuito o Premium.");
  /* Sin plan (formulario anterior en caché) = Premium, con sus reglas de siempre */
  const legacy = core.validate(core.normalize({ ...FREE, plan: "" }));
  assert.equal(legacy.data.plan, "premium");
  assert.ok(legacy.errors.services && legacy.errors.representative);
  assert.equal(core.PLANS.premium.price, "$24.99 CAD al mes + impuestos aplicables");
});

/* ---------- Function /registro/enviar ---------- */
test("Function: una ficha gratuita se guarda pendiente, con el plan en la información privada y en el historial", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const { res, body } = await send(env, { ...FREE, website: "https://otro.ca", notes: "no debe guardarse" });
    assert.equal(res.status, 201);
    assert.match(body.requestId, core.REQUEST_ID_RE);
    const [row] = rows(env);
    assert.equal(row.status, "pendiente");
    assert.equal(row.notes, "Plan solicitado: Plan Gratuito ($0 CAD).");
    assert.equal(row.website, null);
    assert.equal(row.services, null);
    assert.equal(row.representative, "");
    assert.equal(row.phone, "+1 780 555 1234");
    assert.equal(row.consent_version, "directorio-2026-11-v4");
    const ev = env.DIRECTORIO_DB._db.prepare("SELECT detail FROM application_events WHERE action = 'recibida'").get();
    assert.match(ev.detail, /^Plan Gratuito · /);
    const [internal, confirm] = net.sent.map((s) => s.body);
    assert.match(internal.subject, /^Nueva solicitud empresarial \[GRATUITO\] — Panadería La Esquina — SOL-/);
    assert.match(internal.text, /Plan solicitado: Plan Gratuito \(\$0 CAD\)/);
    assert.match(confirm.text, /ficha gratuita/);
    assert.match(confirm.text, /La ficha gratuita no tiene costo\./);
    assert.doesNotMatch(confirm.text, /24\.99|aprobación final/);
  } finally { net.restore(); }
});

test("Function: el plan Gratuito no acepta fotografías adicionales ni guarda nada en ese caso", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const { res, body } = await send(env, FREE, LOGO, [PHOTO]);
    assert.equal(res.status, 400);
    assert.match(body.errors.extraImages, /una sola imagen/);
    assert.equal(rows(env).length, 0);
    assert.equal(env.SOLICITUDES.store.size, 0);
  } finally { net.restore(); }
});

test("Function: una solicitud Premium muestra el precio y deja claro que no hubo cobro", async () => {
  const net = installFetch();
  try {
    const env = fakeEnv();
    const premium = { ...FREE, plan: "premium", representative: "Ana Pérez", services: "Pan dulce y tortas.", imageKind: "foto" };
    const { res } = await send(env, premium, PHOTO, [], "203.0.113.51");
    assert.equal(res.status, 201);
    assert.match(rows(env)[0].notes, /^Plan solicitado: Plan Premium \(\$24\.99 CAD al mes \+ impuestos aplicables\)\.$/);
    const [internal, confirm] = net.sent.map((s) => s.body);
    assert.match(internal.subject, /\[PREMIUM\]/);
    assert.match(confirm.text, /Enviar esta solicitud no implica contratar ni pagar ningún servicio\./);
    assert.match(confirm.text, /\$24\.99 CAD al mes más impuestos aplicables\. Por ahora no realizamos cobros en línea/);
  } finally { net.restore(); }
});

test("correos: el asunto y la confirmación distinguen el plan sin repetir datos privados", () => {
  const { data } = core.validate(core.normalize(FREE));
  const m = internalEmail(data, { id: "SOL-20261103-ABCDEF", receivedLabel: "3 nov 2026", panelUrl: "" });
  assert.equal(m.subject, "Nueva solicitud empresarial [GRATUITO] — Panadería La Esquina — SOL-20261103-ABCDEF");
  const c = confirmationEmail({ id: "SOL-20261103-ABCDEF", plan: "gratuito" });
  assert.equal(c.subject, "Recibimos tu solicitud — El Podcast del Migrante");
  assert.doesNotMatch(c.text + c.html, /780 555|example\.com/i);
});

/* ---------- Directorio: ficha gratuita ligera ---------- */
function directory(extra) {
  const html = `<select id="fCategory"></select><select id="fProvince"></select><select id="fCity"></select><div id="bizResults"></div>`;
  const doc = { listeners: {}, nodes: {}, getElementById(id) { return (this.nodes[id] ||= { id, value: "", innerHTML: "", addEventListener() {} }); }, addEventListener(ev, fn) { this.listeners[ev] = fn; } };
  const ctx = { document: doc, window: { PDM: { initSiteChrome() {} } }, console };
  vm.createContext(ctx);
  vm.runInContext(read("js/businesses.js") + `;BUSINESSES.push(${JSON.stringify(extra)});`, ctx);
  vm.runInContext(read("js/business-directory.js"), ctx);
  doc.listeners.DOMContentLoaded();
  void html;
  return doc.getElementById("bizResults").innerHTML;
}

test("directorio: la ficha gratuita es una tarjeta sin miniweb, con teléfono, después de los Premium", () => {
  const free = { id: "BIZ-900", slug: "panaderia-prueba", published: true, plan: "gratuito", name: "Panadería Prueba", category: "vivienda", city: "Calgary", province: "Alberta", country: "Canadá", shortDescription: "Pan latino <b>fresco</b>.", phone: "+1 403 555 0000", profileImage: "assets/logo.png", profileImageKind: "logo" };
  const out = directory(free);
  const card = out.slice(out.indexOf('<article class="biz-card biz-card--free">'));
  assert.ok(card.startsWith('<article class="biz-card biz-card--free">'));
  assert.match(card, /href="tel:\+14035550000">Llamar: \+1 403 555 0000<\/a>/);
  assert.match(card, /Pan latino &lt;b&gt;fresco&lt;\/b&gt;\./, "texto escapado");
  assert.match(card, /<a class="biz-card__upsell" href="planes-directorio">/);
  assert.doesNotMatch(card, /perfil-panaderia-prueba/, "sin enlace a una miniweb");
  assert.ok(out.indexOf("biz-card--free") > out.indexOf("perfil-tomas-velazquez.html"), "los Premium van primero");
});

test("generador de perfiles y plantilla: una ficha gratuita nunca crea ni abre una miniweb", () => {
  assert.match(read("scripts/build-profile-pages.mjs"), /filter\(\(b\) => b\.published && b\.plan !== "gratuito"\)/);
  assert.match(read("js/business-profile.js"), /b\.published && b\.plan !== "gratuito"/);
});
