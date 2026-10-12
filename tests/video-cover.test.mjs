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
