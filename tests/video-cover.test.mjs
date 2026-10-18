import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), "utf8");

test("VideoCover: portada local con aviso de privacidad y sin reproductor antes de pulsar", () => {
  const ctx = { window: {} };
  vm.runInNewContext(read("js/video-cover.js"), ctx);
  const VC = ctx.window.VideoCover;
  const html = VC.html({ id: "videoExterno", title: 'Entrevista "x" <y>' });
  assert.match(html, /<img class="article-video__thumb" src="\/assets\/yt\/sin-miniatura\.svg"/);
  assert.match(html, /data-video-play/);
  assert.match(html, /class="video-privacy-note">Al reproducir, te conectas con YouTube/);
  assert.doesNotMatch(html, /<iframe|ytimg|img\.youtube/);
  assert.doesNotMatch(html, /<y>/);
  assert.ok(existsSync(new URL("assets/yt/sin-miniatura.svg", ROOT)));
  // Cada miniatura registrada existe como archivo local
  const src = read("js/video-cover.js");
  const reg = src.match(/const LOCAL_THUMBS = \{([\s\S]*?)\};/)[1];
  for (const [, id] of reg.matchAll(/"([A-Za-z0-9_-]{11})":/g)) {
    assert.ok(existsSync(new URL(`assets/yt/${id}.jpg`, ROOT)), `assets/yt/${id}.jpg`);
    assert.match(reg, new RegExp(`"${id}": \\["/assets/yt/${id}\\.jpg", \\d+, \\d+\\]`), id);
    assert.equal(VC.thumb(id), `/assets/yt/${id}.jpg`);
  }
  // El reproductor sigue en modo de privacidad mejorada
  assert.match(src, /https:\/\/www\.youtube-nocookie\.com\/embed\//);
});

test("privacidad: ninguna página pública pide miniaturas a YouTube ni crea el reproductor al abrirse", () => {
  const files = [
    ...readdirSync(ROOT).filter((f) => f.endsWith(".html")),
    ...readdirSync(new URL("js/", ROOT), { recursive: true }).filter((f) => f.endsWith(".js")).map((f) => "js/" + f),
  ];
  for (const f of files) assert.doesNotMatch(read(f), /i\.ytimg\.com|img\.youtube\.com/, f);
  for (const f of ["js/desafio-story.js", "js/life-story.js", "js/business-profile.js"]) {
    assert.match(read(f), /VideoCover\.noteHtml\(\)/, `${f}: aviso antes de reproducir`);
    assert.match(read(f), /youtube-nocookie\.com/, f);
  }
  const pages = ["historia.html", "historia-vida.html", "business-profile.html", ...readdirSync(ROOT).filter((f) => /^perfil-.+\.html$/.test(f))];
  for (const p of pages) assert.match(read(p), /<script src="js\/video-cover\.js"><\/script>\s*<script src="js\/(desafio-story|life-story|business-profile)\.js">/, p);
});

test("las páginas con videos cargan el componente VideoCover", () => {
  const pages = ["articulo.html", "colaborador.html", ...readdirSync(ROOT).filter((f) => /^(articulo|colaborador)-.+\.html$/.test(f))];
  for (const p of pages) assert.match(read(p), /<script src="js\/video-cover\.js"><\/script>\s*<script src="js\/(article|colaborador)\.js">/, p);
});

test("carrusel Podcast del Migrante Play: videos con reproducción en la portada", () => {
  const ctx = {};
  vm.runInNewContext(read("js/data.js") + ";globalThis.V = VIDEOS;", ctx);
  const shown = ctx.V.filter((v) => v.published);
  assert.deepEqual([...shown.map((v) => v.videoId)], ["O5on_J9cRb4", "AnAZeaE7LV4", "z2Ih590xSP4", "3tOZfCwZWN8", "ENyFwvkj8W0", "jw0cYzjV35U"]);
  const en = shown.find((v) => v.videoId === "z2Ih590xSP4");
  assert.equal(en.tag, "Entrevista en inglés");
  assert.match(en.title + " " + en.desc, /Medicina familiar|entrevista en inglés/, "títulos y descripciones en español");
  assert.ok(ctx.V.some((v) => v.videoId === "M7JFiyvPDT8" && !v.published), "Tomás Velázquez: retirado, no borrado");
  assert.match(read("index.html"), /<script src="js\/video-cover\.js"><\/script>\s*<script src="js\/main\.js">/);
});

test("Desafío 100 Empresas: tres videos destacados en orden, desde el inicio, sin borrar el catálogo", () => {
  const ctx = {};
  vm.runInNewContext(read("js/desafio-stories.js") + ";globalThis.D = DESAFIO_STORIES;", ctx);
  const home = ctx.D.filter((s) => s.homeOrder).sort((a, b) => a.homeOrder - b.homeOrder);
  assert.deepEqual([...home.map((s) => s.videoId)], ["3tOZfCwZWN8", "0rFRBV7wYqM", "2RcMF0Uiz2Y"]);
  for (const s of home) assert.equal(s.videoStart, undefined, `${s.slug}: sin segundo de inicio`);
  assert.equal(home[0].cardTag, "Desafío 100 Empresas", "Andrea: sin número de capítulo");
  assert.match(home[1].cardTag, /capítulo 30/i);
  assert.match(home[2].cardTag, /capítulo 29/i);
  for (const id of ["xJaXI3r83sA", "bDhX_XW2bE0", "UloNyWGYEXo"]) assert.ok(ctx.D.some((s) => s.videoId === id), `se conserva ${id}`);
});
