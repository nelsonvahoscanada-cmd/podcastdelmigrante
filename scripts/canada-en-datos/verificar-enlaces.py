"""Comprueba (solo lectura) todos los enlaces externos de las páginas de
Canadá en Datos, incluidas las de localidades de Alberta. Sale con error si
alguno no responde. Uso: python3 scripts/canada-en-datos/verificar-enlaces.py"""
import glob, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "Mozilla/5.0 (verificacion de enlaces; podcastdelmigrante.com)"}
urls = set()
for f in glob.glob("canada-en-datos/**/*.html", recursive=True):
    for u in re.findall(r'<a [^>]*href="(https?://[^"]+)"', open(f, encoding="utf-8").read()):
        if "podcastdelmigrante.com" not in u and not re.match(r"https://(instagram|facebook)\.com/", u):  # redes del pie: limitan consultas automáticas
            urls.add(u.replace("&amp;", "&"))


def probar(u):
    for metodo in ("GET", "GET", "HEAD"):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA, method=metodo), timeout=90) as r:
                return u, r.status, r.geturl()
        except Exception as e:
            err = e
    return u, getattr(err, "code", None) or str(err)[:80], None


with ThreadPoolExecutor(8) as ex:
    res = sorted(ex.map(probar, sorted(urls)))
malos = [r for r in res if not (isinstance(r[1], int) and r[1] < 400)]
for u, st, final in res:
    print(st, u, "->", final if final and final != u else "")
print(f"{len(res)} enlaces; {len(malos)} con problemas")
sys.exit(1 if malos else 0)
