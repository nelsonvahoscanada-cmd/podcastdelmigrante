"""
obtener-paginas-texto.py — Guarda el texto de páginas oficiales para verificar una ficha (solo lectura)
=====================================================================================================
Uso: python3 scripts/canada-en-datos/obtener-paginas-texto.py <archivo de páginas> <carpeta>
El archivo de páginas es un .py con PAGINAS = [(nombre, url), …]. Para cada
página guarda <carpeta>/NNN.txt con la URL pedida, el estado, la URL final, el
título, la fecha de modificación declarada y el texto visible, seguido de la
lista de enlaces (para descubrir otras páginas oficiales). Primero con una
petición normal; si falla o la página necesita JavaScript, con un navegador
normal (sin sortear ninguna protección). Se ejecuta en GitHub Actions.
"""
import gzip, html, pathlib, re, sys, urllib.request, urllib.parse

PAGINAS = []
exec(open(sys.argv[1], encoding="utf-8").read())
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "fr-CA,en-CA;q=0.8"}


def texto(h):
    h = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption|section|article)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def enlaces(h, base):
    vistos, salida = set(), []
    for href, txt in re.findall(r'(?is)<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h):
        u = urllib.parse.urljoin(base, html.unescape(href))
        if u in vistos or not u.startswith("http"):
            continue
        vistos.add(u)
        salida.append(f"{u} | {re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', txt))).strip()[:90]}")
    return salida


def meta(h):
    t = re.search(r"(?is)<title[^>]*>(.*?)</title>", h)
    f = re.findall(r'(?i)(?:dateModified|dcterms\.modified|date-modified|"modified")[^0-9]{0,40}(20\d\d-\d\d-\d\d)', h) + re.findall(r"(?i)(?:Date de mise à jour|Mise à jour|Last updated|Date modified|Modifié le|Dernière mise à jour)\s*:?\s*([^<\n]{6,40})", h)
    return (html.unescape(t.group(1)).strip() if t else ""), (f[0] if f else "")


pendientes = []
for i, (nombre, url) in enumerate(PAGINAS):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45) as r:
            b = r.read(); b = gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b
            h = b.decode("utf-8", "ignore"); estado, final = r.status, r.geturl()
        t = texto(h)
        if len(t) < 600:
            raise ValueError("texto corto")
        titulo, fecha = meta(h)
        (OUT / f"{i:03d}.txt").write_text(f"NOMBRE: {nombre}\nURL: {url}\nESTADO: {estado}\nFINAL: {final}\nTITULO: {titulo}\nFECHA: {fecha}\n\n{t}\n\n=== ENLACES ===\n" + "\n".join(enlaces(h, final)), encoding="utf-8")
        print(estado, i, url, flush=True)
    except Exception as e:
        print("PENDIENTE", i, url, type(e).__name__, str(e)[:80], flush=True)
        pendientes.append((i, nombre, url))

if pendientes:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(locale="fr-CA")
        for i, nombre, url in pendientes:
            pg = ctx.new_page()
            try:
                r = pg.goto(url, wait_until="domcontentloaded", timeout=60000)
                pg.wait_for_timeout(2500)
                h = pg.content()
                titulo, fecha = meta(h)
                (OUT / f"{i:03d}.txt").write_text(f"NOMBRE: {nombre}\nURL: {url}\nESTADO: NAV {r.status if r else None}\nFINAL: {pg.url}\nTITULO: {titulo}\nFECHA: {fecha}\n\n{texto(h)}\n\n=== ENLACES ===\n" + "\n".join(enlaces(h, pg.url)), encoding="utf-8")
                print("NAV", r.status if r else None, i, url, flush=True)
            except Exception as e:
                (OUT / f"{i:03d}.txt").write_text(f"NOMBRE: {nombre}\nURL: {url}\nESTADO: ERROR {type(e).__name__}\n", encoding="utf-8")
                print("NAV ERR", i, url, type(e).__name__, flush=True)
            pg.close()
        b.close()
