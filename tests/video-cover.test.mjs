import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), "utf8");

test("VideoCover: miniatura de YouTube con botón y sin reproductor antes de pulsar", () => {
  const ctx = { window: {} };
  vm.runInNewContext(read("js/video-cover.js"), ctx);
  const html = ctx.window.VideoCover.html({ id: "z2Ih590xSP4", title: 'Entrevista "x" <y>' });
  assert.match(html, /<img class="article-video__thumb" src="https:\/\/i\.ytimg\.com\/vi\/z2Ih590xSP4\/maxresdefault\.jpg"/);
  assert.match(html, /data-video-play/);
  assert.doesNotMatch(html, /<iframe/);
  assert.doesNotMatch(html, /<y>/);
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
