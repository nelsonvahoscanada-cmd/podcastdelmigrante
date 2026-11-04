"""
verificar-enlaces-nu.py — Comprueba (solo lectura) los enlaces externos de la guía de Nunavut
=============================================================================================
Lee canada-en-datos/nunavut.html y canada-en-datos/nunavut/*.html. Para cada
enlace externo: lectura directa; si falla, un navegador normal. El sitio del
Gobierno de Nunavut (gov.nu.ca) muestra una verificación de Cloudflare a los
lectores automáticos y no se intenta sortearla: para esas direcciones se
consulta la copia más reciente en el Internet Archive y se informa su fecha y
su estado. Sale con error solo si un enlace responde 404/410 o no existe ni
en el sitio ni en el archivo.
"""
import glob, json, re, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "Mozilla/5.0 (verificacion de enlaces; podcastdelmigrante.com)"}
urls = set()
for f in ["canada-en-datos/nunavut.html", *glob.glob("canada-en-datos/nunavut/*.html")]:
    for u in re.findall(r'<a [^>]*href="(https?://[^"]+)"', open(f, encoding="utf-8").read()):
        if "podcastdelmigrante.com" not in u and not re.match(r"https://(www\.)?(instagram|facebook|youtube|twitter|wa\.me)", u) and "sharer" not in u and "intent" not in u:
            urls.add(u.replace("&amp;", "&").split("#")[0])


def directo(u):
    for metodo in ("GET", "GET"):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA, method=metodo), timeout=60) as r:
                return r.status
        except Exception as e:
            err = e
    return getattr(err, "code", None) or str(err)[:60]


def archivo(u):
    q = {"url": u, "output": "json", "fl": "timestamp,statuscode", "limit": "-1"}
    try:
        with urllib.request.urlopen(urllib.request.Request("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), headers=UA), timeout=120) as r:
            d = json.loads(r.read() or b"[]")
        return d[-1] if len(d) > 1 else None
    except Exception as e:
        return ("error", str(e)[:60])


with ThreadPoolExecutor(6) as ex:
    res = dict(zip(sorted(urls), ex.map(directo, sorted(urls))))

pendientes = [u for u, st in res.items() if not (isinstance(st, int) and st < 400)]
navegador = {}
if pendientes:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(locale="en-CA")
        for u in pendientes:
            pg = ctx.new_page()
            try:
                r = pg.goto(u, wait_until="domcontentloaded", timeout=60000)
                pg.wait_for_timeout(2500)
                navegador[u] = (r.status if r else None, pg.title()[:70])
            except Exception as e:
                navegador[u] = ("error", str(e)[:60])
            pg.close()
        b.close()

malos = []
for u in sorted(urls):
    st = res[u]
    linea = f"{st} {u}"
    if u in navegador:
        nst, tit = navegador[u]
        linea += f" | navegador: {nst} «{tit}»"
        ok = isinstance(nst, int) and nst < 400
        if not ok and "gov.nu.ca" in u:
            a = archivo(u)
            linea += f" | archivo: {a}"
            ok = bool(a) and a[0] != "error" and str(a[1]) == "200" and a[0] >= "2025"
            if a and a[0] != "error" and str(a[1]) in ("301", "302", "404"):
                ok = False
            if nst == 403 and "Just a moment" in tit:
                linea += " (verificación de Cloudflare)"
        if not ok:
            malos.append(u)
    print(linea)
print(f"{len(urls)} enlaces; {len(malos)} con problemas")
for u in malos:
    print("PROBLEMA", u)
sys.exit(1 if malos else 0)
