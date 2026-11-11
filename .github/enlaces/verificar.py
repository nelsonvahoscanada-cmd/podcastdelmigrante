"""Verificación de enlaces de la guía de Yukón (solo lectura): estado, URL final y título."""
import json, re, sys, time, urllib.request, html
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36", "Accept-Language": "en-CA"}
pend, out = [], []
for u in [l.strip() for l in open(".github/enlaces/yt-enlaces.txt") if l.strip()]:
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40) as r:
            b = r.read(400000).decode("utf-8", "ignore"); m = re.search(r"(?is)<title[^>]*>(.*?)</title>", b)
            out.append(f"{r.status} | {u} | {r.geturl()} | {html.unescape(m.group(1)).strip()[:90] if m else ''}")
    except Exception as e:
        pend.append(u); out.append(f"ERR {getattr(e,'code',type(e).__name__)} | {u}")
    time.sleep(0.5)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(locale="en-CA")
    for u in pend:
        pg = c.new_page()
        try:
            r = pg.goto(u, wait_until="domcontentloaded", timeout=60000); pg.wait_for_timeout(3000)
            out.append(f"NAV {r.status if r else None} | {u} | {pg.url} | {pg.title()[:90]}")
        except Exception as e:
            out.append(f"NAV ERR {type(e).__name__} | {u}")
        pg.close()
    b.close()
open("/tmp/out/enlaces.txt", "w").write("\n".join(out)); print("\n".join(out))
# Enlaces que siguen sin abrirse (p. ej., yukon.ca bloquea la lectura automática): ¿hay copia reciente en el Internet Archive?
import urllib.parse
fallan = [l.split(" | ")[1] for l in out if l.startswith("NAV") and not l.startswith("NAV 200")]
arch = []
for u in fallan:
    try:
        q = urllib.parse.urlencode({"url": u, "output": "json", "fl": "timestamp,statuscode", "filter": "statuscode:200", "limit": "-1"})
        with urllib.request.urlopen("http://web.archive.org/cdx/search/cdx?" + q, timeout=90) as r:
            d = json.loads(r.read() or b"[]")[1:]
        arch.append(f"ARCHIVO {d[-1][0] if d else 'SIN COPIA'} | {u}")
    except Exception as e:
        arch.append(f"ARCHIVO ERR {type(e).__name__} | {u}")
open("/tmp/out/archivo.txt", "w").write("\n".join(arch)); print("\n".join(arch))
