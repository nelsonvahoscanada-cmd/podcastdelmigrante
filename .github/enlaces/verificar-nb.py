"""Verificación de enlaces de la guía de Nuevo Brunswick (solo lectura): estado, URL final y título.
Primero una lectura directa con la identificación de los scripts del proyecto; si falla, un navegador
normal (Chromium); si tampoco abre, se informa si hay copia en el Archivo de Internet. No se sortea ninguna protección."""
import json, re, time, urllib.parse, urllib.request, html
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
pend, out = [], []
for u in [l.strip() for l in open(".github/enlaces/nb-enlaces.txt") if l.strip()]:
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40) as r:
            b = r.read(400000).decode("utf-8", "ignore"); m = re.search(r"(?is)<title[^>]*>(.*?)</title>", b)
            t = html.unescape(m.group(1)).strip()[:90] if m else ""
            if re.search(r"one moment|not found|404|page introuvable", t, re.I):
                pend.append(u); out.append(f"REVISAR {r.status} | {u} | {r.geturl()} | {t}")
            else:
                out.append(f"{r.status} | {u} | {r.geturl()} | {t}")
    except Exception as e:
        pend.append(u); out.append(f"ERR {getattr(e, 'code', type(e).__name__)} | {u}")
    time.sleep(0.5)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(locale="en-CA")
    for u in pend:
        pg = c.new_page()
        try:
            r = pg.goto(u, wait_until="domcontentloaded", timeout=60000); pg.wait_for_timeout(4000)
            out.append(f"NAV {r.status if r else None} | {u} | {pg.url} | {pg.title()[:90]}")
        except Exception as e:
            out.append(f"NAV ERR {type(e).__name__} | {u}")
        pg.close()
    b.close()
fallan = [l.split(" | ")[1] for l in out if l.startswith("NAV") and not l.startswith("NAV 200")]
for u in fallan:
    try:
        q = urllib.parse.urlencode({"url": u, "output": "json", "fl": "timestamp,statuscode", "filter": "statuscode:200", "limit": "-1"})
        with urllib.request.urlopen("http://web.archive.org/cdx/search/cdx?" + q, timeout=90) as r:
            d = json.loads(r.read() or b"[]")[1:]
        out.append(f"ARCHIVO {d[-1][0] if d else 'SIN COPIA'} | {u}")
    except Exception as e:
        out.append(f"ARCHIVO ERR {type(e).__name__} | {u}")
open("/tmp/out/enlaces.txt", "w").write("\n".join(out)); print("\n".join(out))
