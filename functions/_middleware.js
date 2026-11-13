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
    published-articles.js, generado junto con las páginas). Un borrador
    sirve la plantilla («próximamente»).
  - Conserva los demás parámetros (utm_*, etc.) y el ancla.
  - Solo se ejecuta en las plantillas, en las carpetas internas y en las
    rutas propias de las Functions (ver _routes.json): el resto del sitio,
    el panel y las estadísticas no pasan por aquí.

  404 reales en las plantillas (soft 404): articulo, guia, guia-ruta,
  historia, historia-vida, columna, colaborador y business-profile se arman
  con JavaScript según el parámetro de la URL. Si falta o no existe, la
  plantilla solo mostraba «no encontrado» con estado 200. Ahora la función
  responde 404 con el contenido de 404.html. Los valores válidos están en
  functions/_lib/rutas-validas.js (scripts/build-rutas-validas.mjs, con los
  mismos criterios que el JavaScript de cada plantilla); con un valor
  válido, la página se sirve exactamente como antes.
  - Sin dependencias, sin claves, sin almacenamiento.

  Carpetas internas: Cloudflare Pages publica la raíz del repositorio, así
  que admin-worker/, db/, docs/, tests/, scripts/, functions/ y .github/
  quedarían accesibles como archivos. No contienen claves, pero no son
  parte del sitio (código del panel privado, esquema de la base, guías
  internas): aquí responden 404. Ver _routes.json.
========================================================================= */

import { PUBLISHED_ARTICLES } from "./_lib/published-articles.js";
import { RUTAS_VALIDAS } from "./_lib/rutas-validas.js";

const TEMPLATE_PATHS = new Set(["/articulo", "/articulo.html", "/articulo/"]);

/* Plantilla → ¿el parámetro de la URL corresponde a algo que puede mostrar?
   /x y /x.html (Cloudflare Pages redirige la segunda a la primera). */
const tiene = (lista, valor) => !!valor && lista.includes(valor);
const PLANTILLAS = {
  "/articulo": (q) => tiene(RUTAS_VALIDAS.articulo.slug, q.get("slug")),
  "/guia": (q) => tiene(RUTAS_VALIDAS.guia.categoria, q.get("categoria")),
  "/guia-ruta": (q) => (q.has("subruta") ? tiene(RUTAS_VALIDAS["guia-ruta"].subruta, q.get("subruta")) : tiene(RUTAS_VALIDAS["guia-ruta"].ruta, q.get("ruta"))),
  "/historia": (q) => tiene(RUTAS_VALIDAS.historia.slug, q.get("slug")),
  "/historia-vida": (q) => tiene(RUTAS_VALIDAS["historia-vida"].slug, q.get("slug")),
  "/columna": (q) => tiene(RUTAS_VALIDAS.columna.slug, q.get("slug")),
  "/colaborador": (q) => tiene(RUTAS_VALIDAS.colaborador.id, q.get("id")),
  "/business-profile": (q) => tiene(RUTAS_VALIDAS["business-profile"].slug, q.get("slug")),
};

function plantillaDe(pathname) {
  const p = pathname.replace(/\.html$/, "").replace(/\/$/, "");
  return Object.prototype.hasOwnProperty.call(PLANTILLAS, p) ? PLANTILLAS[p] : null;
}

/* Respuesta 404 con la página 404.html del sitio (si no se puede leer, un
   texto simple). Nunca se guarda en caché compartida. */
async function noEncontrado(context, url, method) {
  const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
  try {
    const pagina = await context.env.ASSETS.fetch(new Request(new URL("/404", url.origin)));
    /* /404 sirve 404.html (según la plataforma, con estado 200 o 404) */
    if (pagina.status === 200 || pagina.status === 404) return new Response(method === "HEAD" ? null : pagina.body, { status: 404, headers });
  } catch {}
  return new Response(method === "HEAD" ? null : "Página no encontrada", { status: 404, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
}

const INTERNAL_PATH = /^\/(?:admin-worker|analytics-worker|db|docs|tests|scripts|functions|\.github)(?:\/|$)/;

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (INTERNAL_PATH.test(url.pathname)) {
    return new Response("No encontrado", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  const slug = url.searchParams.get("slug");
  const method = context.request.method;

  if (method !== "GET" && method !== "HEAD") return context.next();

  if (!TEMPLATE_PATHS.has(url.pathname) || !slug || !PUBLISHED_ARTICLES.has(slug)) {
    const valido = plantillaDe(url.pathname);
    if (valido && !valido(url.searchParams)) return noEncontrado(context, url, method);
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
