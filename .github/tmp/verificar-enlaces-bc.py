"""Comprueba (solo lectura) los enlaces externos de la guía de Columbia Británica."""
import glob, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "en-CA,en;q=0.9"}
urls, perfiles = set(), set()
for f in ["canada-en-datos/british-columbia.html"] + glob.glob("canada-en-datos/british-columbia/*.html"):
    for u in re.findall(r'<a [^>]*href="(https?://[^"]+)"', open(f, encoding="utf-8").read()):
        u = u.replace("&amp;", "&")
        if "podcastdelmigrante.com" in u or re.match(r"https://(www\.)?(instagram|facebook|twitter|wa\.me)", u) or "sharer" in u or "intent/tweet" in u:
            continue
        (perfiles if "dp-pd/prof" in u else urls).add(u)
muestra = sorted(perfiles)[:3]
print(f"perfiles del censo: {len(perfiles)} (se prueban {len(muestra)})")


def probar(u):
    err = None
    for metodo in ("GET", "GET", "HEAD"):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA, method=metodo), timeout=60) as r:
                return u, r.status, r.geturl()
        except Exception as e:
            err = e
    return u, getattr(err, "code", None) or str(err)[:80], None


with ThreadPoolExecutor(8) as ex:
    res = sorted(ex.map(probar, sorted(urls) + muestra))
malos = [r for r in res if not (isinstance(r[1], int) and r[1] < 400)]
for u, st, final in res:
    print("E|", st, u, "->", final if final and final != u else "")
print(f"{len(res)} enlaces; {len(malos)} con problemas")
for u, st, _ in malos:
    print("MAL|", st, u)

# Segunda pasada con navegador real, uno por uno, para los que rechazan robots
if malos:
    from playwright.sync_api import sync_playwright
    import time
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(user_agent=UA["User-Agent"], locale="en-CA")
        for u, _, _ in malos:
            pg = ctx.new_page()
            try:
                r = pg.goto(u, wait_until="domcontentloaded", timeout=90000)
                titulo = re.sub(r"\s+", " ", pg.title())[:90]
                print("NAV|", r.status if r else None, u, "->", pg.url if pg.url != u else "", "|", titulo)
            except Exception as e:
                print("NAV|", str(e).split("\n")[0][:80], u)
            pg.close()
            time.sleep(3)
        b.close()
