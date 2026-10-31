/*
  Pruebas del módulo «Descubre tu Canadá» de la portada (campaña de Canadá en Datos).
  node --test tests/descubre-canada.test.mjs
*/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { loadData, disponibilidad, render } from "../scripts/build-canada-datos.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const D = loadData();
const portada = read("index.html");
const seccion = portada.match(/<section class="section wrap descubre"[\s\S]*?<\/section>/)[0];

/* Ejecuta js/descubre-canada.js sobre un DOM mínimo y devuelve lo que escribió */
function ejecutar(datos) {
  const nodos = {};
  const nodo = (id) => (nodos[id] ||= { id, hidden: true, textContent: "", children: [], className: "", attrs: {}, appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; } });
  for (const id of ["descubreConteo", "descubreRegiones", "descubreLista", "descubreProximas"]) nodo(id);
  const document = {
    getElementById: (id) => nodos[id] || null,
    createElement: (tag) => ({ tag, className: "", textContent: "", children: [], attrs: {}, appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; } }),
    createTextNode: (t) => ({ tag: "#text", textContent: t }),
  };
  vm.runInNewContext(read("js/descubre-canada.js"), { window: { CD_DISPONIBLES: datos }, document });
  return nodos;
}

test("la portada lleva el módulo con los textos de la campaña y el botón a la ruta real de Canadá en Datos", () => {
  assert.match(seccion, /id="descubre-tu-canada"/);
  assert.match(seccion, /<p class="descubre__kicker">Descubre tu Canadá<\/p>/);
  assert.match(seccion, /¿En qué ciudad de Canadá está tu próxima <span class="descubre__acento">oportunidad<\/span>\?/);
  assert.match(seccion, /Explora provincias, descubre ciudades y encuentra información sobre empleo, vivienda, clima, educación y servicios\./);
  assert.match(seccion, /Una herramienta gratuita, en español y con información respaldada por fuentes oficiales\./);
  assert.match(seccion, /<a class="descubre__btn" href="\/canada-en-datos\/" data-descubre="portada">Explorar Canadá en Datos<\/a>/);
  assert.ok(existsSync(join(ROOT, "canada-en-datos/index.html")), "la ruta /canada-en-datos/ existe");
  assert.match(seccion, /<img src="\/assets\/canada-en-datos\/descubre-mapa\.svg" width="1000" height="865" alt="[^"]+" loading="lazy" decoding="async">/);
  /* Nada de promesas de empleo, vivienda ni residencia */
  assert.doesNotMatch(seccion, /garantiz|asegura(mos)? (tu|un) (empleo|trabajo|vivienda)|residencia permanente/i);
});

test("ningún número de provincias escrito a mano en la portada: el contador y la lista salen de los datos generados", () => {
  assert.doesNotMatch(seccion, /\b\d+ de 1[03]\b|\b(7|siete) provincias\b/i);
  assert.match(seccion, /<p class="descubre__conteo" id="descubreConteo" hidden><\/p>/);
  assert.match(seccion, /<ul class="descubre__lista" id="descubreLista"><\/ul>/);
  for (const r of D.CD_REGIONS) assert.ok(!seccion.includes(r.name), `${r.name} no está escrito en el HTML`);
  assert.match(portada, /<script src="js\/canada-datos-disponibles\.js"><\/script>\n<script src="js\/descubre-canada\.js"><\/script>/);
});

test("disponibilidad: sale de CD_REGIONS (regiones con ficha), y el archivo publicado está al día", () => {
  const d = disponibilidad(D);
  assert.equal(d.total, 13);
  assert.equal(d.provincias.total, 10);
  assert.equal(d.territorios.total, 3);
  const conFicha = D.CD_REGIONS.filter((r) => r.profile);
  assert.equal(d.disponibles, conFicha.length);
  for (const r of d.regiones) {
    const reg = D.CD_REGIONS.find((x) => x.code === r.code);
    assert.equal(r.url, reg.profile ? `/canada-en-datos/${reg.profile}` : null, r.code);
    if (r.url) assert.ok(existsSync(join(ROOT, `${r.url.slice(1)}.html`)), `${r.url} existe`);
  }
  const archivos = render();
  assert.equal(read("js/canada-datos-disponibles.js"), archivos["/js/canada-datos-disponibles.js"]);
  assert.equal(read("assets/canada-en-datos/descubre-mapa.svg"), archivos["/assets/canada-en-datos/descubre-mapa.svg"]);
  /* El mapa pinta en verde exactamente las regiones disponibles */
  assert.equal((read("assets/canada-en-datos/descubre-mapa.svg").match(/class="si"/g) || []).length, conFicha.length);
});

test("actualización automática: al publicar una provincia nueva, el módulo la muestra sin tocar la portada", () => {
  const regiones = D.CD_REGIONS.map((r) => (r.code === "NS" ? { ...r, profile: "nova-scotia" } : r));
  const d = disponibilidad({ ...D, CD_REGIONS: regiones });
  assert.equal(d.disponibles, D.CD_REGIONS.filter((r) => r.profile).length + 1);
  const n = ejecutar(d);
  assert.equal(n.descubreConteo.textContent, `${d.disponibles} de 13 provincias y territorios ya disponibles`);
  assert.equal(n.descubreConteo.hidden, false);
  const enlaces = n.descubreLista.children.map((li) => [li.children[0].textContent, li.children[0].href]);
  assert.ok(enlaces.some(([nombre, href]) => nombre === "Nueva Escocia" && href === "/canada-en-datos/nova-scotia"));
  assert.ok(!n.descubreProximas.children.some((c) => /Nueva Escocia/.test(c.textContent)));
});

test("con los datos actuales: siete enlaces a guías publicadas y las demás como «Próximamente», sin enlace", () => {
  const d = disponibilidad(D);
  const n = ejecutar(d);
  const disponibles = d.regiones.filter((r) => r.url);
  assert.deepEqual(n.descubreLista.children.map((li) => li.children[0].href), disponibles.map((r) => r.url));
  assert.ok(n.descubreLista.children.every((li) => li.children[0].tag === "a"));
  const texto = n.descubreProximas.children.map((c) => c.textContent).join("");
  assert.match(texto, /^Próximamente /);
  for (const r of d.regiones.filter((x) => !x.url)) assert.ok(texto.includes(r.name), r.name);
  for (const r of disponibles) assert.ok(!texto.includes(r.name), r.name);
  assert.equal(n.descubreRegiones.hidden, false);
});

test("sin datos (archivo no cargado), el módulo conserva solo el botón principal", () => {
  const n = ejecutar(undefined);
  assert.equal(n.descubreConteo.hidden, true);
  assert.equal(n.descubreRegiones.hidden, true);
  assert.equal(n.descubreLista.children.length, 0);
});

test("ubicación: después de «Últimas noticias»; el hero, las noticias y el resto de la portada no cambian", () => {
  const i = (s) => portada.indexOf(s);
  assert.ok(i('id="heroMain"') < i('id="latestList"') && i('id="latestList"') < i('id="descubre-tu-canada"') && i('id="descubre-tu-canada"') < i('id="usefulGrid"'));
  /* Mismas secciones de la portada, en el mismo orden, con «Descubre tu Canadá» como única novedad */
  const secciones = [...portada.matchAll(/<section class="([^"]*)"(?: id="([^"]*)")?/g)].map((m) => m[2] || m[1]);
  assert.deepEqual(secciones, ["inicio", "section wrap", "descubre-tu-canada", "section useful-section", "quien-puede-ayudarte", "historias", "video", "desafio", "section wrap", "columnFeature", "contributors", "edicion", "distribution", "section wrap", "newsletter section--tight"]);
  /* El hero y las noticias siguen vacíos en el HTML: los llena main.js con el mismo orden editorial */
  assert.match(portada, /<article id="heroMain" class="hero-main"><\/article>\n      <div id="heroSecondary" class="hero-secondary"><\/div>/);
  assert.match(portada, /<div class="latest-list" id="latestList"><\/div>/);
  /* Los scripts de la portada se cargan como antes; los del módulo van al final */
  assert.match(portada, /<script src="js\/main\.js"><\/script>\n<script src="js\/canada-datos-disponibles\.js"><\/script>/);
});
