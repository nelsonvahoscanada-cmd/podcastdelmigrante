/*
  Pruebas de js/business-intake.js (parte sin DOM).
  Ejecutar:  node --test tests/
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const I = require("../js/business-intake.js");

/* Categorías reales del sitio */
const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL("../js/businesses.js", import.meta.url), "utf8") + ";globalThis.C = BUSINESS_CATEGORIES.map((c) => c.id);", ctx);
const CATEGORIES = ctx.C;

function valid(over = {}) {
  return Object.assign(
    {
      company: "Panadería La Esquina",
      category: "vivienda",
      city: "Edmonton",
      province: "Alberta",
      addressMode: "sin-direccion",
      name: "Ana María Pérez",
      professionalTitle: "Asesora inmobiliaria",
      languages: ["es", "en"],
      shortDescription: "Te ayudo a encontrar tu primera vivienda en Edmonton.",
      services: "Compra de vivienda\n- Arriendo\n\n• Asesoría para recién llegados",
      phone: "+1 (780) 555-1234",
      requesterName: "Ana Pérez",
      email: "Ana@Example.com",
      vcardGivenName: "Ana María",
      vcardFamilyName: "Pérez",
      consentData: "on",
      consentPublish: "on",
      consentTruth: "on",
    },
    over
  );
}

const meta = { requestId: "SOL-20261008-AB12", date: "2026-10-08 10:00" };

function evalFicha(ficha) {
  const body = ficha.trim().replace(/,\s*$/, "");
  return JSON.parse(JSON.stringify(vm.runInNewContext("(" + body + ")")));
}

test("una solicitud completa y válida no tiene errores", () => {
  const { errors, data } = I.validate(valid(), CATEGORIES);
  assert.deepEqual(errors, {});
  assert.deepEqual(data.services, ["Compra de vivienda", "Arriendo", "Asesoría para recién llegados"]);
  assert.equal(data.email, "ana@example.com");
});

test("faltan obligatorios → errores por campo", () => {
  const { errors } = I.validate({}, CATEGORIES);
  for (const k of ["company", "category", "city", "province", "addressMode", "name", "professionalTitle", "languages",
    "shortDescription", "services", "requesterName", "email", "consentData", "consentPublish", "consentTruth"]) {
    assert.ok(errors[k], "falta error para " + k);
  }
});

test("se puede registrar sin dirección física pública; con dirección pública la exige", () => {
  assert.equal(I.validate(valid({ addressMode: "sin-direccion" }), CATEGORIES).errors.address, undefined);
  assert.ok(I.validate(valid({ addressMode: "publica" }), CATEGORIES).errors.address);
  assert.deepEqual(I.validate(valid({ addressMode: "publica", address: "123 Main St NW", postalCode: "t5j 0n3" }), CATEGORIES).errors, {});
  assert.ok(I.validate(valid({ addressMode: "publica", address: "x", postalCode: "12345" }), CATEGORIES).errors.postalCode);
});

test("exige al menos un medio de contacto público", () => {
  const { errors } = I.validate(valid({ phone: "" }), CATEGORIES);
  assert.match(errors.phone, /al menos un medio/);
  assert.deepEqual(I.validate(valid({ phone: "", website: "miempresa.ca" }), CATEGORIES).errors, {});
});

test("normaliza y valida enlaces, redes, WhatsApp y video", () => {
  const { data, errors } = I.validate(
    valid({ website: "www.miempresa.ca", instagram: "@ana.perez", tiktok: "anaperez", whatsapp: "1 780-555-1234", videoUrl: "https://youtu.be/EEqjez0MuAY" }),
    CATEGORIES
  );
  assert.deepEqual(errors, {});
  assert.equal(data.website, "https://www.miempresa.ca/");
  assert.equal(data.instagram, "https://www.instagram.com/ana.perez/");
  assert.equal(data.tiktok, "https://www.tiktok.com/@anaperez");
  assert.equal(data.whatsapp, "17805551234");
  assert.equal(I.youtubeId("https://www.youtube.com/watch?v=EEqjez0MuAY&t=3"), "EEqjez0MuAY");

  const bad = I.validate(valid({ website: "javascript:alert(1)", whatsapp: "780 555 1234", videoUrl: "https://vimeo.com/1", publicEmail: "no-es-correo" }), CATEGORIES).errors;
  assert.ok(bad.website && bad.whatsapp && bad.videoUrl && bad.publicEmail);
});

test("categoría «otra» exige descripción; categorías inventadas se rechazan", () => {
  assert.ok(I.validate(valid({ category: "otra" }), CATEGORIES).errors.categoryOther);
  assert.deepEqual(I.validate(valid({ category: "otra", categoryOther: "Restaurantes" }), CATEGORIES).errors, {});
  assert.ok(I.validate(valid({ category: "hackeo" }), CATEGORIES).errors.category);
});

test("la vCard pide nombre y apellido solo si se quieren los QR", () => {
  assert.ok(I.validate(valid({ vcardGivenName: "" }), CATEGORIES).errors.vcardGivenName);
  assert.equal(I.validate(valid({ wantsConnect: "no", vcardGivenName: "", vcardFamilyName: "" }), CATEGORIES).errors.vcardGivenName, undefined);
});

test("límites de longitud", () => {
  assert.ok(I.validate(valid({ shortDescription: "x".repeat(181) }), CATEGORIES).errors.shortDescription);
  assert.ok(I.validate(valid({ company: "x".repeat(201) }), CATEGORIES).errors.company);
});

test("la ficha es un objeto JS válido con el esquema de js/businesses.js y published: false", () => {
  const { data } = I.validate(valid({ longDescription: "Primer párrafo.\n\nSegundo párrafo.", serviceAreas: ["Alberta", "Ontario"] }), CATEGORIES);
  const f = evalFicha(I.buildFicha(data, meta));
  assert.equal(f.published, false);
  assert.equal(f.slug, "ana-maria-perez");
  assert.equal(f.name, "Ana María Pérez");
  assert.equal(f.category, "vivienda");
  assert.equal(f.address, "");
  assert.deepEqual(f.serviceAreas, ["Ontario"]);
  assert.deepEqual(f.longDescription, ["Primer párrafo.", "Segundo párrafo."]);
  assert.deepEqual(f.serviceGroups[0].items, ["Compra de vivienda", "Arriendo", "Asesoría para recién llegados"]);
  assert.deepEqual(f.connect, { profileQr: true, contactCard: { givenName: "Ana María", familyName: "Pérez" } });
  assert.equal(f.seo.description, data.shortDescription);
  /* mismos campos que usa la plantilla del perfil */
  for (const k of ["id", "shortName", "professionalTitle", "company", "city", "province", "languages", "phone", "whatsapp", "email",
    "website", "bookingUrl", "instagram", "tiktok", "facebook", "linkedin", "youtubeVideoId", "profileImage", "ogImage", "testimonials"]) {
    assert.ok(k in f, "falta " + k);
  }
});

test("la ficha no se rompe con comillas, saltos de línea ni comentarios en los datos", () => {
  const evil = 'Ana "*/ globalThis.pwn = 1; /*" \\ </script>';
  const { data } = I.validate(valid({ name: evil, company: evil, quote: evil }), CATEGORIES);
  const f = evalFicha(I.buildFicha(data, meta));
  assert.equal(f.name, data.name);
  assert.equal(globalThis.pwn, undefined);
});

test("sin QR no se incluye connect", () => {
  const { data } = I.validate(valid({ wantsConnect: "no" }), CATEGORIES);
  assert.equal(evalFicha(I.buildFicha(data, meta)).connect, undefined);
});

test("el envío lleva correo del solicitante, confirmación, trampa anti-spam y la ficha; sin filas vacías", () => {
  const { data } = I.validate(valid(), CATEGORIES);
  const p = I.buildPayload(data, meta, "Vivienda");
  assert.equal(p.email, "ana@example.com");
  assert.equal(p._template, "table");
  assert.equal(p._honey, "");
  assert.match(p._subject, /SOL-20261008-AB12/);
  assert.match(p._autoresponse, /SOL-20261008-AB12/);
  assert.match(p._autoresponse, /Nada se publica sin tu aprobación/);
  assert.match(p["Ficha para js/businesses.js"], /published: false/);
  assert.equal(p["1 · Dirección física pública"], "No (sin dirección física pública)");
  assert.equal(p["1 · Marca comercial"], undefined);
  assert.ok(Object.keys(p).every((k) => k.startsWith("_") || p[k] !== ""));
});

test("solo se confirma si FormSubmit registró el envío", () => {
  assert.equal(I.isAccepted(200, { success: "true" }), true);
  assert.equal(I.isAccepted(200, { success: true }), true);
  assert.equal(I.isAccepted(200, { success: "false", message: "This form needs Activation." }), false);
  assert.equal(I.isAccepted(500, { success: "true" }), false);
  assert.equal(I.isAccepted(200, null), false);
});

test("número de solicitud", () => {
  assert.equal(I.newRequestId(new Date(2026, 9, 8), "ab12"), "SOL-20261008-AB12");
});
