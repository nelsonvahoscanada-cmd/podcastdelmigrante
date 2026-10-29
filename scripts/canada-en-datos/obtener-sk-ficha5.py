"""
obtener-sk-ficha5.py — Fichas ampliadas de seis ciudades de Saskatchewan y Time Act, 2026 (solo lectura)
=======================================================================================================
  ciudades  sitio oficial de Prince Albert, Moose Jaw, Swift Current, Yorkton,
            North Battleford y Lloydminster: enlaces vigentes a transporte,
            servicios municipales y recién llegados; agencias de asentamiento y
            colleges regionales. Con un navegador normal si la página lo pide.
  hora      Time Act, 2026: proyecto de ley 58, orden de entrada en vigor y
            páginas del Gobierno de Saskatchewan.
"""
import re, sys, urllib.parse

PARTE = sys.argv[1] if len(sys.argv) > 1 else "todo"
CIUDADES = {
    "Prince Albert": "https://www.citypa.ca/",
    "Moose Jaw": "https://moosejaw.ca/",
    "Swift Current": "https://www.swiftcurrent.ca/",
    "Yorkton": "https://www.yorkton.ca/",
    "North Battleford": "https://www.cityofnb.ca/",
    "Lloydminster": "https://www.lloydminster.ca/",
}
ENLACES = r"transit|bus|newcomer|immigra|welcome|service|utilit|garbage|waste|recycl|water|property tax|fire|police|recreation|library|report|311|contact|bylaw|licen"
EXTRA = [
    ("Prince Albert Multicultural Council", "https://pamcc.ca/"),
    ("Moose Jaw Multicultural Council", "https://www.mjmcinc.ca/"),
    ("Southwest Newcomer Welcome Centre", "https://www.swnewcomer.ca/"),
    ("East Central Newcomer Welcome Centre (Parkland)", "https://www.ecnwc.ca/"),
    ("Battlefords Immigrant Newcomers Services / BILC", "https://www.batlit.ca/"),
    ("Lloydminster Region Newcomer Centre", "https://www.lloydminsternewcomers.ca/"),
    ("Regina Open Door Society", "https://rods.sk.ca/"),
    ("Saskatoon Open Door Society", "https://sods.sk.ca/"),
    ("Great Plains College", "https://greatplainscollege.ca/"),
    ("Suncrest College", "https://www.suncrestcollege.ca/"),
    ("North West College", "https://www.northwestcollege.ca/"),
    ("Lakeland College (Lloydminster)", "https://www.lakelandcollege.ca/"),
    ("Saskatchewan Polytechnic — campus", "https://saskpolytech.ca/about/campuses-and-locations/"),
    ("Gobierno de SK — mapa de servicios para recién llegados", "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/find-immigration-services-near-you"),
]


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def mostrar(t, pat, maximo=40):
    n = 0
    for l in t.split("\n"):
        l = l.strip()
        if 3 < len(l) < 600 and re.search(pat, l, re.I):
            print("  >", l[:500])
            n += 1
            if n >= maximo:
                break


from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(locale="en-CA", user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 (verificacion de datos; podcastdelmigrante.com)")
    pg = ctx.new_page()

    def abrir(u, pat_texto, pat_enl=None, maximo=40):
        try:
            r = pg.goto(u, wait_until="domcontentloaded", timeout=60000)
            pg.wait_for_timeout(3000)
            t = pg.inner_text("body")
            print("estado:", r.status if r else None, "| final:", pg.url, "| título:", pg.title()[:100], "| caracteres:", len(t))
            mostrar(t, pat_texto, maximo)
            if pat_enl:
                vis = set()
                for a in pg.query_selector_all("a[href]"):
                    h, tx = a.get_attribute("href") or "", (a.inner_text() or "").strip().replace("\n", " ")
                    full = urllib.parse.urljoin(pg.url, h).split("#")[0]
                    if full.startswith("http") and re.search(pat_enl, tx + " " + h, re.I) and full not in vis:
                        vis.add(full)
                        print("   enlace:", tx[:70], "→", full)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:150])

    if PARTE in ("ciudades", "todo"):
        for nombre, u in CIUDADES.items():
            paso(f"Ciudad: {nombre} — {u}")
            abrir(u, r"transit|bus|newcomer|immigra|population|welcome", ENLACES)
        for nombre, u in EXTRA:
            paso(f"Organismo: {nombre} — {u}")
            abrir(u, r"newcomer|immigra|settlement|free|language|English|Prince Albert|Moose Jaw|Swift Current|Yorkton|Battleford|Lloydminster|campus|program|Regina|Saskatoon", r"newcomer|settlement|services|campus|contact|about", 25)

    if PARTE in ("hora", "todo"):
        for u in ("https://publications.saskatchewan.ca/#/products/130175", "https://docs.legassembly.sk.ca/legdocs/Bills/30L2S/Bill30-58.pdf", "https://www.saskatchewan.ca/government/news-and-media?search=time%20act"):
            paso(f"Hora: {u}")
            if u.endswith(".pdf"):
                try:
                    import urllib.request, io
                    from pypdf import PdfReader
                    b = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read()
                    t = "\n".join(pg_.extract_text() or "" for pg_ in PdfReader(io.BytesIO(b)).pages)
                    t = re.sub(r"[ \t]+", " ", t)
                    print("caracteres:", len(t))
                    for par in re.split(r"\n(?=\d+\(?\d*\)?\s)", t):
                        if re.search(r"Lloydminster|Creighton|time option|UTC|daylight|coming into force|proclamation|Central Standard|Mountain|repeal", par, re.I):
                            print("  >", par.strip().replace("\n", " ")[:900])
                except Exception as e:
                    print("ERROR", type(e).__name__, str(e)[:200])
            else:
                abrir(u, r"Time Act|time|Order in Council|O\.C\.|force|October|Lloydminster|Creighton|2026", r"time|Time Act|daylight", 40)
    nav.close()
