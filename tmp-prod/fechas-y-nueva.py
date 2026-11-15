# TEMPORAL (solo lectura en producción): fechas coherentes en las 43 noticias
# publicadas y simulación (en el runner, sin publicar) de una noticia nueva.
import json, re, subprocess, sys, urllib.request

B = "https://podcastdelmigrante.com"
MESES = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()
UA = {"User-Agent": "Mozilla/5.0 (verificacion-solo-lectura)"}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read().decode()

slugs = json.loads(subprocess.run(["node", "-e", "const vm=require('vm'),fs=require('fs');const c={};vm.runInNewContext(fs.readFileSync('js/articles.js','utf8')+';globalThis.A=ARTICLES',c);console.log(JSON.stringify(c.A.filter(a=>!a.draft).map(a=>a.slug)))"], capture_output=True, text=True).stdout)
sm = get(B + "/sitemap.xml")
out, fallos = [], []
for s in slugs:
    h = get(f"{B}/articulo-{s}")
    meta = re.search(r'property="article:published_time" content="([^"]+)"', h).group(1)
    ld = json.loads(re.search(r'id="articleJsonLd">(.*?)</script>', h, re.S).group(1))["datePublished"]
    v = re.search(r'class="article-meta">[^<]*?([0-9]+) de ([a-z]+) de ([0-9]{4})', h)
    vis = f"{v.group(3)}-{MESES.index(v.group(2)) + 1:02d}-{int(v.group(1)):02d}"
    lm = re.search(rf"<loc>{re.escape(B)}/articulo-{re.escape(s)}</loc>\s*<lastmod>([^<]+)</lastmod>", sm)
    ok = meta == ld and vis == meta[:10] and (not lm or lm.group(1) == meta[:10]) and 'data-prerendered="' + s + '"' in h and "Cargando artículo" not in h
    (out if ok else fallos).append(f"{'OK' if ok else 'FALLO'} {s}: visible {vis} | meta {meta} | JSON-LD {ld} | sitemap {lm.group(1) if lm else '-'}")
out.insert(0, f"Fechas y HTML completo en producción: {len(slugs) - len(fallos)} de {len(slugs)} correctas")
out += fallos

# Noticia nueva simulada en el runner (no se publica): el paso habitual genera HTML completo
src = open("js/articles.js").read()
i = src.index("const ARTICLES = [") + len("const ARTICLES = [")
nueva = """
  { id: "ART-2026-999", slug: "prueba-publicacion-automatica", title: "Noticia de prueba para la publicación automática",
    excerpt: "Texto breve de prueba para comprobar que una noticia nueva se genera con su HTML completo sin pasos manuales adicionales.",
    category: "Inmigración", contentType: "Noticia", publishedAt: "2026-11-14T23:30:00-07:00", demo: false,
    author: { mode: "redaccion", name: "Redacción El Podcast del Migrante" },
    seo: { description: "Texto breve de prueba para comprobar que una noticia nueva se genera con su HTML completo sin pasos manuales." },
    bodyHtml: "<p>" + "Párrafo de prueba con contenido editorial suficiente para la comprobación. ".repeat(30) + "</p><h2>Subtítulo</h2><p>Final.</p>" },"""
open("js/articles.js", "w").write(src[:i] + nueva + src[i:])
r = subprocess.run(["node", "scripts/build-article-pages.mjs"], capture_output=True, text=True)
h = open("articulo-prueba-publicacion-automatica.html").read()
checks = {
    "contenido en el HTML": 'data-prerendered="prueba-publicacion-automatica"' in h and "Cargando artículo" not in h,
    "NewsArticle": 'id="articleJsonLd"' in h,
    "fecha de Alberta (23:30 del 14-11 → 14 de noviembre)": "14 de noviembre de 2026" in h,
    "scripts versionados": "js/articles.js?v=" in h,
    "ruta válida": "prueba-publicacion-automatica" in open("functions/_lib/rutas-validas.js").read(),
}
out.append("Noticia nueva simulada (sin publicar): " + ", ".join(f"{k}: {'sí' if v else 'NO'}" for k, v in checks.items()))
subprocess.run(["git", "checkout", "--", "."]); subprocess.run(["git", "clean", "-fdq", "--", "articulo-prueba-publicacion-automatica.html"])
open("/tmp/out/fechas-y-nueva.txt", "w").write("\n".join(out)); print("\n".join(out))
sys.exit(1 if fallos or not all(checks.values()) else 0)
