/* Desafío 100 Empresas: páginas generadas, contadores, SEO, privacidad y contenido editorial. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { render } from "../scripts/build-desafio.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const { DATOS, resumen } = createRequire(import.meta.url)("../js/desafio-datos.js");
const R = resumen("calgary");
const FILES = render();
const PAGES = Object.entries(FILES).filter(([k]) => !k.startsWith("/"));
const SITE = "https://podcastdelmigrante.com";
const url = (k) => `${SITE}/desafio-100-empresas/${k.replace(/index\.html$/, "").replace(/\.html$/, "")}`;

test("las páginas están generadas y al día (node scripts/build-desafio.mjs)", () => {
  for (const [k, html] of Object.entries(FILES)) {
    const ruta = k.startsWith("/") ? k.slice(1) : `desafio-100-empresas/${k}`;
    assert.equal(read(ruta), html, `desactualizado: ${ruta}`);
  }
  const enDisco = readdirSync(join(ROOT, "desafio-100-empresas"), { recursive: true }).map(String).filter((f) => f.endsWith(".html")).sort();
  assert.deepEqual(enDisco, PAGES.map(([k]) => k).sort(), "sin páginas sobrantes");
});

test("rutas: programa, edición, archivo, Muro y una página por episodio", () => {
  for (const k of ["index.html", "calgary/index.html", "calgary/entrevistas.html", "calgary/muro.html"]) assert.ok(FILES[k], k);
  for (const e of DATOS.episodios) assert.ok(FILES[`calgary/${e.slug}.html`], e.slug);
  assert.equal(PAGES.length, 4 + DATOS.episodios.length);
  assert.ok(!PAGES.some(([k]) => /ep-26/.test(k)), "EP 26 sin video: sin página");
});

test("SEO: un h1, canonical, Open Graph con imagen existente y en el sitemap", () => {
  const sitemap = read("sitemap.xml");
  for (const [k, html] of PAGES) {
    const u = url(k);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, k);
    assert.ok(html.includes(`<link rel="canonical" href="${u}">`), `${k}: canonical`);
    assert.ok(html.includes(`<meta property="og:url" content="${u}">`), k);
    const img = html.match(/<meta property="og:image" content="https:\/\/podcastdelmigrante\.com([^"]+)">/)[1];
    assert.ok(existsSync(join(ROOT, img)), `${k}: ${img}`);
    assert.doesNotMatch(html, /noindex/, k);
    assert.ok(sitemap.includes(`<loc>${u}</loc>`), `${k} en el sitemap`);
  }
});

test("identidad del portal: cabecera, menú, pie, estilos y sin fondos negros propios", () => {
  for (const [k, html] of PAGES) {
    assert.match(html, /id="siteHeader"/, k);
    assert.match(html, /class="site-footer"/, k);
    assert.match(html, /<link rel="stylesheet" href="\/css\/styles\.css">\s*<link rel="stylesheet" href="\/css\/desafio\.css">/, k);
  }
  const css = read("css/desafio.css");
  assert.doesNotMatch(css, /background(-color)?:\s*(#0b0b0b|#000\b|#000000|black|var\(--negro\)|var\(--gris-950\))/i);
  assert.match(read("js/data.js"), /\{ label: "Desafío 100 Empresas", href: "desafio-100-empresas\/" \}/);
});

test("contenido editorial: lema, sin plazos, sin patrocinio vigente y libro «Próximamente»", () => {
  for (const [k, html] of PAGES) {
    assert.doesNotMatch(html, /90 d[ií]as|tres meses|3 meses|sin plazo fijo/i, k);
    assert.doesNotMatch(html, /patrocinador(a)? oficial|Sterna Global Immigration es patrocinador/i, k);
    assert.doesNotMatch(html, /Amazon|TikTok|seguidores/i, k);
    assert.doesNotMatch(html, /«\s*»|“\s*”|""\s*<\/h3>/, `${k}: comillas vacías`);
  }
  for (const k of ["index.html", "calgary/index.html"]) assert.match(FILES[k], /<h1>100 empresarios\. 100 historias\. <em>Un legado\.<\/em><\/h1>/);
  assert.match(FILES["index.html"], /dz-proximamente">Próximamente/);
  assert.doesNotMatch(FILES["index.html"], /libro-portada-sin-confirmar|100 Historias, 100 Lecciones/, "título del libro sin confirmar");
});

test("contador: cifras calculadas desde los datos y marcadas como provisionales", () => {
  const prov = DATOS.ediciones[0].conteo.estado === "provisional";
  for (const k of ["index.html", "calgary/index.html"]) {
    const html = FILES[k];
    assert.match(html, new RegExp(`data-dz-cifra="historias">${R.historiasPublicadas} <small>/ ${R.meta}</small>`), k);
    if (prov) assert.match(html, /Cifra provisional/, k);
  }
  const ed = FILES["calgary/index.html"];
  assert.equal((ed.match(/<i class="pub"><\/i>/g) || []).length, R.historiasPublicadas + 1 /* leyenda */);
  assert.equal((ed.match(/<i( class="pub")?><\/i>/g) || []).length, R.meta + 2 /* leyenda */);
  /* Las entrevistas grabadas solo se muestran con un dato comprobable */
  if (DATOS.ediciones[0].grabadas == null) assert.doesNotMatch(ed, /Entrevistas grabadas/);
  assert.match(FILES["calgary/muro.html"], new RegExp(`<b>${R.participantes}</b><span>Empresarios confirmados en el Muro`));
});

test("entrevistas: todas en el archivo, con su ciudad real y su video", () => {
  const archivo = FILES["calgary/entrevistas.html"];
  assert.equal((archivo.match(/class="desafio-card"/g) || []).length, DATOS.episodios.length);
  for (const e of DATOS.episodios) {
    const html = FILES[`calgary/${e.slug}.html`];
    assert.ok(html.includes(`data-video-id="${e.videoId}"`), `EP ${e.ep}: video`);
    assert.ok(html.includes(`https://www.youtube.com/watch?v=${e.videoId}`), `EP ${e.ep}: enlace a YouTube`);
    assert.ok(html.includes(`${e.ciudad}, ${e.provincia}`), `EP ${e.ep}: ubicación`);
    assert.doesNotMatch(html, /<iframe|i\.ytimg\.com|img\.youtube\.com/, `EP ${e.ep}: no contacta a YouTube al abrirse`);
    assert.match(html, /<script src="\/js\/video-cover\.js"><\/script>/);
    if (e.portadaPropia) assert.match(html, /class="dz-portada"/, `EP ${e.ep}: portada propia`);
    if (e.storySlug) assert.ok(html.includes(`/historia.html?slug=${e.storySlug}`), `EP ${e.ep}: historia editorial`);
  }
});

test("Andrea Díaz Posada: en la edición Calgary, con su ubicación real (Brooks, Alberta)", () => {
  const e = DATOS.episodios.find((x) => x.ep === 37);
  const html = FILES[`calgary/${e.slug}.html`];
  assert.match(html, /Brooks, Alberta/);
  assert.match(html, /Calgary · Primera edición/);
  assert.ok(FILES["calgary/entrevistas.html"].includes(`/desafio-100-empresas/calgary/${e.slug}`));
  assert.match(FILES["calgary/muro.html"], /Andrea Paola Díaz Posada<\/h3>\s*<p class="dz-persona__empresa">Empresa por confirmar/);
});

test("historias con varios episodios: WenFer cuenta una vez y lo indica", () => {
  for (const n of [11, 28]) {
    const e = DATOS.episodios.find((x) => x.ep === n);
    assert.match(FILES[`calgary/${e.slug}.html`], /WenFer Group: 2 episodios \(EP 11, EP 28\); cuenta como 1 de las 100/);
  }
});

test("Directorio: solo perfiles existentes, enlazados desde su entrevista", () => {
  for (const p of DATOS.participantes.filter((x) => x.businessSlug)) {
    assert.ok(existsSync(join(ROOT, `perfil-${p.businessSlug}.html`)), p.businessSlug);
    assert.ok(existsSync(join(ROOT, `assets/${p.businessSlug}-logo.jpg`)), `${p.businessSlug}: logotipo`);
  }
  const conPerfil = PAGES.filter(([, html]) => /href="\/perfil-[a-z0-9-]+\.html"/.test(html)).map(([k]) => k);
  for (const k of conPerfil) for (const [, s] of FILES[k].matchAll(/href="\/perfil-([a-z0-9-]+)\.html"/g)) assert.ok(DATOS.participantes.some((p) => p.businessSlug === s), `${k}: ${s}`);
});

test("privacidad: ninguna página publica correos (salvo el institucional) ni teléfonos de participantes", () => {
  for (const [k, html] of PAGES) {
    const correos = [...html.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)].map((m) => m[0]).filter((c) => c !== "podcastdelmigrante@gmail.com");
    assert.deepEqual(correos, [], k);
    const texto = html.replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(texto, /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/, `${k}: teléfono`);
    assert.doesNotMatch(texto, /\btel(é|e)fono\b|\bwhatsapp\b/i, `${k}: contacto`);
  }
});

test("Muro del Legado: todos los participantes con nombre, empresa y ciudad", () => {
  const muro = FILES["calgary/muro.html"];
  assert.equal((muro.match(/<article class="dz-persona/g) || []).length, DATOS.participantes.length);
  for (const p of DATOS.participantes) {
    assert.ok(muro.includes(`>${p.nombre.replace(/&/g, "&amp;")}</h3>`), p.nombre);
    assert.ok(muro.includes(`${p.ciudad}, ${p.provincia}`), p.ciudad);
  }
  for (const c of ["Airdrie", "Okotoks", "Winnipeg", "Brooks"]) assert.match(muro, new RegExp(`${c}, (Alberta|Manitoba)`), c);
});

test("pie de página: «Desafío 100 Empresas» lleva a /desafio-100-empresas/ en todas las páginas", () => {
  const paginas = readdirSync(ROOT, { recursive: true }).map(String).filter((f) => f.endsWith(".html") && !/^(dist|node_modules|\.)/.test(f));
  let conPie = 0;
  for (const f of paginas) {
    const html = read(f);
    const pie = html.slice(html.indexOf('<footer class="site-footer"'));
    if (!html.includes('<footer class="site-footer"')) continue;
    conPie++;
    const enlaces = [...pie.matchAll(/<a href="([^"]*)">Desafío 100 Empresas<\/a>/g)].map((m) => m[1]);
    assert.equal(enlaces.length, 1, `${f}: un enlace al Desafío en el pie`);
    /* Las páginas de subcarpetas usan rutas absolutas; las de la raíz, relativas */
    assert.ok(enlaces[0] === "/desafio-100-empresas/" || (enlaces[0] === "desafio-100-empresas/" && !f.includes("/")), `${f}: ${enlaces[0]}`);
    assert.doesNotMatch(html, /href="(\/?index\.html)?#desafio"/, `${f}: enlace antiguo`);
  }
  assert.ok(conPie > 400, `páginas con pie: ${conPie}`);
});

test("inscripción: «Quiero participar» abre el formulario oficial de Google (sin formularios propios)", () => {
  const FORM = "https://forms.gle/ZxDpuzUuEbr3LjjS6";
  assert.equal(DATOS.programas[0].inscripcion, FORM);
  const boton = `<a class="btn" href="${FORM}" target="_blank" rel="noopener" data-dz-inscripcion>Quiero participar en el Desafío 100 Empresas`;
  assert.equal(FILES["index.html"].split(boton).length - 1, 2, "portada: botón en la cabecera y en «¿Tu historia merece estar entre las 100?»");
  assert.equal(FILES["calgary/index.html"].split(boton).length - 1, 1, "edición Calgary");
  for (const [k, html] of PAGES) {
    assert.doesNotMatch(html.replace(/<form role="search"[^>]*>/g, ""), /<form[\s>]/, `${k}: sin formularios propios (solo el buscador del portal)`);
    for (const [u] of html.matchAll(/https:\/\/(?:forms\.gle|docs\.google\.com\/forms)\/[^"\s<]+/g)) assert.equal(u, FORM, `${k}: solo el formulario oficial`);
  }
});
