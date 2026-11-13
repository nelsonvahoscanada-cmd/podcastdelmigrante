#!/usr/bin/env node
/*
  build-rutas-validas.mjs — parámetros válidos de las plantillas
  ======================================================================
  Las plantillas genéricas (articulo, guia, guia-ruta, historia,
  historia-vida, columna, colaborador, business-profile) se arman con
  JavaScript según el parámetro de la URL. Con un parámetro que no existe,
  la plantilla muestra «no encontrado», pero el servidor respondía 200:
  Google lo registra como «soft 404».

  Este script escribe functions/_lib/rutas-validas.js con los valores que
  cada plantilla SÍ sabe mostrar, leídos de los mismos datos que usa su
  JavaScript (mismos criterios que su función find…):

    articulo          ?slug=       ARTICLES (incluidos los borradores, que
                                   muestran «próximamente»)
    guia              ?categoria=  USEFUL_GUIDES
    guia-ruta         ?ruta=       GUIA_RUTAS  ·  ?subruta= GUIA_SUBRUTAS
    historia          ?slug=       DESAFIO_STORIES
    historia-vida     ?slug=       LIFE_STORIES
    columna           ?slug=       COLUMNS
    colaborador       ?id=         CONTRIBUTORS
    business-profile  ?slug=       BUSINESSES publicados que no son del
                                   plan Gratuito (js/business-profile.js)

  functions/_middleware.js responde 404 (con la página 404.html) cuando el
  parámetro falta o no está en la lista; con un valor válido la página se
  sirve como siempre.

  IMPORTANTE: cada vez que se agrega una noticia, guía, ruta, historia,
  columna, colaborador o perfil, hay que volver a ejecutar este script
  (si no, su URL con parámetro respondería 404). La prueba
  tests/seo-plantillas-404.test.mjs falla en CI si la lista no está al día.

  USO:
    node scripts/build-rutas-validas.mjs           genera / actualiza
    node scripts/build-rutas-validas.mjs --check   solo verifica (pruebas)
*/
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "functions/_lib/rutas-validas.js");

export function rutasValidas(root = ROOT) {
  const ctx = vm.createContext({});
  const leer = (f, expr) => vm.runInContext(readFileSync(join(root, f), "utf8") + `\n;${expr}`, ctx);
  leer("js/data.js", "globalThis.__CONTRIBUTORS = CONTRIBUTORS;");
  leer("js/articles.js", "globalThis.__ARTICLES = ARTICLES;");
  leer("js/guias.js", "globalThis.__GUIAS = USEFUL_GUIDES;");
  leer("js/guia-rutas.js", "globalThis.__RUTAS = GUIA_RUTAS;");
  leer("js/guia-subrutas.js", "globalThis.__SUBRUTAS = GUIA_SUBRUTAS;");
  leer("js/desafio-stories.js", "globalThis.__DESAFIO = DESAFIO_STORIES;");
  leer("js/life-stories.js", "globalThis.__VIDA = LIFE_STORIES;");
  leer("js/columns.js", "globalThis.__COLUMNAS = COLUMNS;");
  leer("js/businesses.js", "globalThis.__NEGOCIOS = BUSINESSES;");
  const ordenar = (lista) => [...new Set(lista.filter((x) => typeof x === "string" && x))].sort();
  return {
    articulo: { slug: ordenar(ctx.__ARTICLES.map((a) => a.slug)) },
    guia: { categoria: ordenar(Object.keys(ctx.__GUIAS)) },
    "guia-ruta": { ruta: ordenar(Object.keys(ctx.__RUTAS)), subruta: ordenar(Object.keys(ctx.__SUBRUTAS)) },
    historia: { slug: ordenar(ctx.__DESAFIO.map((s) => s.slug)) },
    "historia-vida": { slug: ordenar(ctx.__VIDA.map((s) => s.slug)) },
    columna: { slug: ordenar(ctx.__COLUMNAS.map((c) => c.slug)) },
    colaborador: { id: ordenar(ctx.__CONTRIBUTORS.map((c) => c.id)) },
    "business-profile": { slug: ordenar(ctx.__NEGOCIOS.filter((b) => b.published && b.plan !== "gratuito").map((b) => b.slug)) },
  };
}

export function archivo(rutas) {
  return `/* Generado por scripts/build-rutas-validas.mjs a partir de los datos de cada plantilla. No editar a mano. */
export const RUTAS_VALIDAS = ${JSON.stringify(rutas, null, 2)};
`;
}

const esPrincipal = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (esPrincipal) {
  const nuevo = archivo(rutasValidas());
  let actual = "";
  try { actual = readFileSync(OUT, "utf8"); } catch {}
  if (process.argv.includes("--check")) {
    if (actual !== nuevo) {
      console.error("functions/_lib/rutas-validas.js no está al día: ejecuta  node scripts/build-rutas-validas.mjs");
      process.exit(1);
    }
    console.log("Rutas válidas de las plantillas verificadas.");
  } else {
    if (actual !== nuevo) writeFileSync(OUT, nuevo);
    console.log("functions/_lib/rutas-validas.js al día.");
  }
}
