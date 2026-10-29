"""
obtener-sk-enlaces.py — Comprueba los enlaces externos de la guía de Saskatchewan (solo lectura).
Primero con una petición normal; si falla, con un navegador (algunos sitios oficiales
solo responden a navegadores). Lista: sk-enlaces.txt.
"""
import pathlib, urllib.request, urllib.error

UA = {"User-Agent": "Mozilla/5.0 (verificacion de enlaces; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
urls = [u.strip() for u in (pathlib.Path(__file__).parent / "sk-enlaces.txt").read_text().splitlines() if u.strip()]
pendientes = []
for u in urls:
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25) as r:
            final = r.geturl()
            radware = "perfdrive" in final or "validate." in final
            print(("RADWARE " if radware else "") + str(r.status), u, "→", final[:100], flush=True)
            if radware:
                pendientes.append(u)
    except urllib.error.HTTPError as e:
        print(e.code, u, flush=True)
        pendientes.append(u)
    except Exception as e:
        print("ERR", u, type(e).__name__, flush=True)
        pendientes.append(u)

print("\n=== Navegador para los", len(pendientes), "restantes ===", flush=True)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(locale="en-CA")
    for u in pendientes:
        pg = ctx.new_page()
        try:
            r = pg.goto(u, wait_until="domcontentloaded", timeout=60000)
            pg.wait_for_timeout(1500)
            print("NAV", r.status if r else None, u, "| título:", pg.title()[:80], flush=True)
        except Exception as e:
            print("NAV ERR", u, type(e).__name__, flush=True)
        pg.close()
    b.close()
