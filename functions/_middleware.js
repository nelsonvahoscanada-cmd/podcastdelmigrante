/*
  functions/_middleware.js — Cloudflare Pages Function
  ======================================================================
  Vistas previas correctas para los enlaces antiguos de noticias.

  Los enlaces /articulo?slug=X (y /articulo.html?slug=X, que Cloudflare
  Pages convierte en /articulo?slug=X) sirven la PLANTILLA genérica:
  Facebook, WhatsApp, LinkedIn y X no ejecutan JavaScript, así que verían
  el logotipo y el título del Magazine en lugar de la noticia.

  Esta función responde 301 → /articulo-X, la página estática de esa
  noticia, que ya trae en su HTML su titular, descripción, foto y URL
  (la genera scripts/build-article-pages.mjs). Los rastreadores siguen
  la redirección; las personas llegan a la misma noticia.

  - Solo actúa si X es un artículo publicado (functions/_lib/
    published-articles.js, generado junto con las páginas). Si no, por
    ejemplo un borrador o un slug inexistente, se sirve la plantilla como
    siempre. (No se consulta ASSETS: sin 404.html, Cloudflare Pages
    responde 200 con la portada para cualquier ruta inexistente.)
  - Conserva los demás parámetros (utm_*, etc.) y el ancla.
  - Solo se ejecuta en /articulo y /articulo.html (ver _routes.json):
    el resto del sitio, el panel y las estadísticas no pasan por aquí.
  - Sin dependencias, sin claves, sin almacenamiento.
========================================================================= */

import { PUBLISHED_ARTICLES } from "./_lib/published-articles.js";

const TEMPLATE_PATHS = new Set(["/articulo", "/articulo.html", "/articulo/"]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const slug = url.searchParams.get("slug");
  const method = context.request.method;

  if (!TEMPLATE_PATHS.has(url.pathname) || !slug || !PUBLISHED_ARTICLES.has(slug) || (method !== "GET" && method !== "HEAD")) {
    return context.next();
  }

  const target = new URL("/articulo-" + slug, url.origin);
  url.searchParams.delete("slug");
  target.search = url.searchParams.toString();
  return new Response(null, {
    status: 301,
    headers: {
      Location: target.pathname + target.search,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
