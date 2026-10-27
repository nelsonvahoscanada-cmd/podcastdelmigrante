/* Desafío 100 Empresas: datos, conteo de historias únicas y privacidad. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const ROOT = new URL("..", import.meta.url).pathname;
const { DATOS, resumen, muro, enMuro, capituloDe } = createRequire(import.meta.url)("../js/desafio-datos.js");
const { historias, episodios, participantes, ediciones } = DATOS;

test("edición Calgary: meta de 100 historias, sin plazo", () => {
  const cal = ediciones.find((e) => e.id === "calgary");
  assert.equal(cal.meta, 100);
  assert.equal(cal.nombre, "Desafío 100 Empresas — Calgary");
  assert.doesNotMatch(readFileSync(ROOT + "js/desafio-datos.js", "utf8"), /90 d[ií]as|tres meses|3 meses/i);
});

test("contador: historias empresariales únicas con al menos un video público", () => {
  const r = resumen("calgary");
  assert.equal(r.episodiosPublicados, 36);
  assert.equal(r.historiasPublicadas, 34);
  assert.ok(r.historiasPublicadas <= r.episodiosPublicados && r.historiasPublicadas <= r.meta);
  assert.equal(r.participantes, 49, "registro interno completo: nadie se borra");
  assert.equal(r.muro, 36, "visibles en el Muro del Legado");
  /* Una misma empresa con varios episodios cuenta una vez */
  assert.deepEqual(historias.find((h) => h.id === "wenfer-group").episodios, [11, 28]);
  assert.deepEqual(historias.find((h) => h.id === "expert-mortgage-consulting").episodios, [17, 33]);
  /* Los confirmados sin historia publicada no suman */
  for (const h of historias.filter((x) => x.estado === "pendiente")) assert.equal(h.episodios.length, 0, h.id);
});

test("episodios: videos únicos, públicos y enlazados a una historia existente", () => {
  const ids = episodios.map((e) => e.videoId);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(episodios.map((e) => e.ep)).size, episodios.length);
  assert.ok(!episodios.some((e) => e.ep === 26), "el EP 26 no tiene video verificado");
  for (const e of episodios) {
    assert.equal(e.visibilidad, "publico", e.ep);
    assert.match(e.videoId, /^[\w-]{11}$/);
    assert.ok(historias.some((h) => h.id === e.historia && h.episodios.includes(e.ep)), `EP ${e.ep}`);
  }
});

test("Andrea Díaz Posada: EP 37, Brooks, dentro de la edición Calgary y sin duplicados", () => {
  const ep = episodios.filter((e) => e.persona === "Andrea Paola Díaz Posada");
  assert.equal(ep.length, 1);
  assert.equal(ep[0].ep, 37);
  assert.equal(ep[0].videoId, "3tOZfCwZWN8");
  assert.equal(ep[0].ciudad, "Brooks");
  const p = participantes.filter((x) => x.nombre === "Andrea Paola Díaz Posada");
  assert.equal(p.length, 1);
  /* Número del Muro y empresa: pendientes de confirmar, no se inventan */
  assert.equal(p[0].muro, null);
  assert.deepEqual(p[0].confirmar, ["numeroMuro", "empresa"]);
  assert.equal(ep[0].empresa, null);
});

test("datos dudosos marcados como pendientes de confirmación y conteo provisional", () => {
  const cal = ediciones.find((e) => e.id === "calgary");
  /* Mientras haya historias en verificación, el conteo no puede ser definitivo */
  if (historias.some((h) => h.verificar)) assert.equal(cal.conteo.estado, "provisional");
  assert.ok(cal.conteo.motivo.length > 20);
  assert.equal(cal.grabadas, null, "sin dato comprobable de entrevistas grabadas");
  const acosta = historias.find((h) => h.id === "expert-mortgage-consulting");
  assert.equal(acosta.verificar, true);
  /* Nombres con diferencias entre fuentes */
  for (const n of [1, 20, 32, 34, 35]) assert.ok(episodios.find((e) => e.ep === n).confirmar.includes("persona"), `EP ${n}`);
  for (const m of ["001", "027", "028", "046", "047"]) assert.ok(participantes.find((p) => p.muro === m).confirmar.includes("nombre"), m);
  /* Los confirmados sin historia publicada siguen pendientes de verificar */
  for (const h of historias.filter((x) => x.estado === "pendiente")) assert.deepEqual(h.confirmar, ["estado"], h.id);
  /* Claudia Briceño (EP 14) no se añade al Muro sin confirmación */
  assert.ok(!participantes.some((p) => /Claudia/.test(p.nombre)));
  const VALIDOS = new Set(["persona", "nombre", "empresa", "numeroMuro", "estado"]);
  for (const x of [...episodios, ...participantes, ...historias]) for (const c of x.confirmar || []) assert.ok(VALIDOS.has(c), c);
});

test("estructura reutilizable: cada registro pertenece a una edición existente", () => {
  const ids = new Set(ediciones.map((e) => e.id));
  for (const x of [...historias, ...episodios, ...participantes]) assert.ok(ids.has(x.edicion), JSON.stringify(x).slice(0, 80));
  for (const e of episodios) assert.match(e.slug, new RegExp(`^ep-${String(e.ep).padStart(2, "0")}-[a-z0-9-]+$`));
  assert.equal(new Set(episodios.map((e) => e.slug)).size, episodios.length);
  assert.throws(() => resumen("edmonton"), /Edición desconocida/);
});

test("registro de participantes (interno): nombre, ciudad real e historia; números únicos", () => {
  assert.equal(new Set(participantes.map((p) => p.muro)).size, participantes.length);
  for (const p of participantes) {
    assert.ok(p.nombre && p.ciudad, p.muro);
    assert.ok(historias.some((h) => h.id === p.historia), p.muro);
  }
  const ciudades = new Set(participantes.map((p) => p.ciudad));
  for (const c of ["Calgary", "Airdrie", "Okotoks", "Winnipeg", "Brooks"]) assert.ok(ciudades.has(c), c);
});

test("privacidad: sin correos, teléfonos ni direcciones de participantes", () => {
  const txt = readFileSync(ROOT + "js/desafio-datos.js", "utf8");
  assert.doesNotMatch(txt, /[\w.+-]+@[\w-]+\.[\w.]+/);
  assert.doesNotMatch(txt, /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  assert.doesNotMatch(txt, /"(correo|email|telefono|teléfono|direccion|dirección)"/i);
});

test("Sterna no figura como patrocinador vigente", () => {
  assert.doesNotMatch(readFileSync(ROOT + "js/desafio-stories.js", "utf8"), /Patrocinador[a]? oficial/i);
  assert.doesNotMatch(readFileSync(ROOT + "js/articles.js", "utf8"), /Sterna Global Immigration es patrocinador/);
});

/* ---------- Muro del Legado: regla automática ---------- */
const RETIRADOS = ["006", "007", "009", "014", "017", "029", "032", "034", "040", "041", "044", "045", "048"];

test("Muro: retira a quienes no tienen capítulo publicado y a quienes no son de Alberta, sin borrarlos del registro", () => {
  const visibles = muro("calgary");
  for (const n of RETIRADOS) {
    const p = participantes.find((x) => x.muro === n);
    assert.ok(p, `${n} sigue en el registro interno`);
    assert.ok(!visibles.includes(p), `${n} ${p.nombre} fuera del Muro`);
  }
  for (const p of participantes.filter((x) => x.ciudad === "Winnipeg")) {
    assert.equal(p.provincia, "Manitoba");
    assert.equal(enMuro(p), false, p.nombre);
  }
  assert.deepEqual(participantes.filter((x) => x.ciudad === "Winnipeg").map((x) => x.nombre).sort(), ["Lesdy Johana Perilla Ruiz", "Marcela Galindo"]);
  assert.equal(visibles.length + RETIRADOS.length, participantes.length);
});

test("Muro: todos los visibles son de Alberta, con historia publicada y su propio capítulo con video", () => {
  for (const p of muro("calgary")) {
    assert.equal(p.provincia, "Alberta", p.nombre);
    assert.equal(historias.find((h) => h.id === p.historia).estado, "publicada", p.nombre);
    const e = capituloDe(p);
    assert.ok(e && e.historia === p.historia && e.visibilidad === "publico" && /^[A-Za-z0-9_-]{11}$/.test(e.videoId) && e.slug, p.nombre);
  }
  /* Andrea Paola Díaz Posada (Brooks, Alberta) se conserva, con su EP 37 */
  const andrea = participantes.find((p) => p.nombre === "Andrea Paola Díaz Posada");
  assert.equal(enMuro(andrea), true);
  assert.equal(capituloDe(andrea).ep, 37);
  /* Historias compartidas: cada persona enlaza a su propio episodio */
  assert.equal(capituloDe(participantes.find((p) => p.nombre === "Wendy Montoya Aguirre")).ep, 28);
  assert.equal(capituloDe(participantes.find((p) => p.nombre === "Cristina Acosta")).ep, 33);
  assert.equal(capituloDe(participantes.find((p) => p.nombre === "Juan Acosta")).ep, 17);
});

/* Simula datos futuros sin dejar rastro en DATOS */
function conEpisodio(ep, fn) {
  episodios.push(ep);
  try {
    return fn();
  } finally {
    episodios.splice(episodios.indexOf(ep), 1);
  }
}
function conEstado(historiaId, estado, fn) {
  const h = historias.find((x) => x.id === historiaId);
  const antes = h.estado;
  h.estado = estado;
  try {
    return fn();
  } finally {
    h.estado = antes;
  }
}

test("Muro: un empresario de Alberta entra solo cuando se publica su capítulo con video", () => {
  const p = participantes.find((x) => x.muro === "007"); /* Jorge Navas, Calgary, pendiente */
  const ep = { edicion: "calgary", ep: 99, historia: p.historia, persona: "Jorge Navas", videoId: "AbCdEfGhIjK", visibilidad: "publico", slug: "ep-99-jorge-navas" };
  assert.equal(enMuro(p), false);
  conEstado(p.historia, "publicada", () => {
    assert.equal(enMuro(p), false, "historia publicada pero sin capítulo: no entra");
    conEpisodio(ep, () => assert.equal(enMuro(p), true, "con capítulo publicado: entra solo"));
    conEpisodio({ ...ep, visibilidad: "privado" }, () => assert.equal(enMuro(p), false, "video no público"));
    conEpisodio({ ...ep, videoId: "https://youtu.be/x" }, () => assert.equal(enMuro(p), false, "URL escrita, no un video válido"));
    conEpisodio({ ...ep, slug: "" }, () => assert.equal(enMuro(p), false, "sin página del capítulo"));
    conEpisodio({ ...ep, persona: "Otra Persona" }, () => assert.equal(enMuro(p), false, "capítulo no vinculado a la persona"));
  });
  assert.equal(enMuro(p), false, "los datos quedan como estaban");
});

test("Muro: fuera de Alberta no entra aunque tenga capítulo publicado", () => {
  const p = participantes.find((x) => x.nombre === "Marcela Galindo");
  const ep = { edicion: "calgary", ep: 98, historia: p.historia, persona: "Marcela Galindo", videoId: "AbCdEfGhIjK", visibilidad: "publico", slug: "ep-98-marcela-galindo" };
  conEstado(p.historia, "publicada", () => conEpisodio(ep, () => assert.equal(enMuro(p), false)));
});
