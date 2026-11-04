"""Noticia de refugio (solo lectura): TikTok y fuentes oficiales de IRCC."""
import json, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright
OUT = "/tmp/out"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"}
# 1. Enlace corto de TikTok → URL definitiva
r = urllib.request.urlopen(urllib.request.Request("https://vt.tiktok.com/ZSpLttjdT/", headers=UA), timeout=60)
final = r.geturl()
open(f"{OUT}/tiktok-url.txt", "w").write(final + "\n")
print("final:", final)
canon = final.split("?")[0]
o = json.loads(urllib.request.urlopen(urllib.request.Request("https://www.tiktok.com/oembed?url=" + urllib.parse.quote(canon, safe=""), headers=UA), timeout=60).read())
json.dump(o, open(f"{OUT}/tiktok-oembed.json", "w"), ensure_ascii=False, indent=1)
print("oembed:", o.get("title"), o.get("author_unique_id"), o.get("embed_product_id"))
if o.get("thumbnail_url"):
    open(f"{OUT}/tiktok-thumb.jpg", "wb").write(urllib.request.urlopen(urllib.request.Request(o["thumbnail_url"], headers=UA), timeout=60).read())
# 2. Fuentes oficiales y reproductor embebido
P = [("asylum-changes", "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/asylum-process-changes.html"),
     ("news-2026-11", "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/11/canada-modernizes-the-asylum-system-to-support-timely-decisions.html"),
     ("eligibility", "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/eligibility.html"),
     ("start-in-canada", "https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/asylum/start/in-canada.html")]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(locale="en-CA", user_agent=UA["User-Agent"])
    for k, u in P:
        pg = ctx.new_page()
        try:
            resp = pg.goto(u, wait_until="domcontentloaded", timeout=90000); pg.wait_for_timeout(3000)
            open(f"{OUT}/{k}.txt", "w").write(f"# {u} → {pg.url}\n# estado {resp.status if resp else None} | {pg.title()}\n" + pg.evaluate("() => document.body.innerText"))
            print(k, resp.status if resp else None, pg.title())
        except Exception as e:
            open(f"{OUT}/{k}.txt", "w").write(f"ERROR {e}")
        pg.close()
    vid = o.get("embed_product_id")
    pg = ctx.new_page()
    resp = pg.goto(f"https://www.tiktok.com/player/v1/{vid}", wait_until="domcontentloaded", timeout=90000); pg.wait_for_timeout(6000)
    pg.wait_for_timeout(4000)
    pg.screenshot(path=f"{OUT}/player.png")
    try:
        open(f"{OUT}/video-page.txt", "w").write(urllib.request.urlopen(urllib.request.Request(canon, headers=UA), timeout=60).read().decode("utf-8", "ignore")[:400000])
    except Exception as e:
        print("pagina", e)
    open(f"{OUT}/player.txt", "w").write(f"estado {resp.status if resp else None}; video: {pg.evaluate('() => document.querySelectorAll(\"video\").length')}")
    b.close()
