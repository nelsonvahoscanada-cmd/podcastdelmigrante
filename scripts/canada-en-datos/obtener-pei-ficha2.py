"""
obtener-pei-ficha2.py — Segunda ronda de verificación de la ficha de Isla del Príncipe Eduardo
=============================================================================================
Solo lectura, en GitHub Actions:
  1. Páginas de canada.ca y de Statistics Canada que necesitan un navegador
     para mostrar su contenido (tabla de salarios mínimos, CRA, IRCC, tipos de
     subdivisión censal). Se abren con un navegador normal (Playwright).
  2. Copias públicas en el Archivo de Internet de páginas del Gobierno de PEI
     (su sitio tiene protección contra robots): se descomprimen si llegan en
     gzip y se anota la fecha de la copia.
"""
import gzip, html, re, sys, time, urllib.parse, urllib.request, json

PARTE = sys.argv[1] if len(sys.argv) > 1 else "todo"
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=90):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        b = r.read()
    return gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b


def texto(h):
    h = h.decode("utf-8", "ignore") if isinstance(h, bytes) else h
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


# ------------------------------------------------------------ 1. Navegador
if PARTE in ("navegador", "todo"):
    from playwright.sync_api import sync_playwright

    PAGINAS = [
        ("Salario mínimo (Gobierno de Canadá)", "https://minwage-salairemin.service.canada.ca/en/general.html", r"Prince Edward|PE\b", 3000),
        ("CRA: tasas de impuesto sobre la renta", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html", r"Prince Edward Island", 2500),
        ("CRA: tasas del GST/HST", "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html", r"Prince Edward|HST|15", 1500),
        ("IRCC: Programa de Inmigración del Atlántico", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html", None, 4000),
        ("IRCC: nominados provinciales", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html", None, 2000),
        ("Statistics Canada: tipos de subdivisión censal (SGC 2021)", "https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/introduction", r"\bFD\b|\bRMU\b|\bRM\b|Fire|Resort|Rural municipality|Prince Edward", 4000),
    ]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(locale="en-CA")
        for nombre, url, patron, lim in PAGINAS:
            paso(f"Navegador: {nombre}")
            print("URL:", url)
            pg = ctx.new_page()
            try:
                r = pg.goto(url, wait_until="networkidle", timeout=90000)
                pg.wait_for_timeout(2000)
                t = pg.inner_text("main") if pg.locator("main").count() else pg.inner_text("body")
                m = re.search(r"Date modified:\s*([\d-]+)", pg.inner_text("body"))
                print("estado:", r.status if r else None, "| título:", pg.title()[:120], "| modificado:", m.group(1) if m else "—", "| caracteres:", len(t))
                if patron:
                    lineas = t.split("\n")
                    for i, l in enumerate(lineas):
                        if re.search(patron, l):
                            print("  >", " | ".join(x.strip() for x in lineas[max(0, i - 2): i + 6] if x.strip())[:900])
                else:
                    print(t[:lim])
            except Exception as e:
                print("ERROR", type(e).__name__, str(e)[:200])
            pg.close()
        b.close()

# ------------------------------------------------------------ 2. Copias archivadas del Gobierno de PEI
if PARTE in ("archivo", "todo"):
    LEER = [
        ("en/information/office-of-immigration/pei-provincial-nominee-program", 6000),
        ("en/topic/immigrate-prince-edward-island", 3500),
        ("en/topic/immigration-and-population", 3500),
        ("en/topic/atlantic-immigration-program", 3000),
        ("en/topic/settlement", 3000),
        ("en/service/apply-pei-health-card-new-residents", 5000),
        ("en/service/virtual-health-care-maple-for-islanders-without-a-family-doctor", 2500),
        ("en/topic/employment-standards", 3500),
        ("en/topic/landlord-and-tenant-matters", 3500),
        ("en/service/residential-tenancies-unit", 3500),
        ("en/topic/rental-of-residential-property-office", 3500),
        ("en/information/finance-and-affordability/pei-population-report-quarterly", 4000),
        ("en/topic/drivers-licences-and-testing", 3000),
    ]
    for ruta, lim in LEER:
        u = "princeedwardisland.ca/" + ruta
        paso(f"Copia archivada: {u}")
        try:
            d = json.loads(get("https://archive.org/wayback/available?url=" + urllib.parse.quote(u, safe="")))
            s = (d.get("archived_snapshots") or {}).get("closest")
            if not s:
                print("sin copia")
                continue
            print("copia:", s["timestamp"], s["url"])
            t = texto(get(s["url"].replace("/web/" + s["timestamp"] + "/", "/web/" + s["timestamp"] + "id_/"), 120))
            if "Radware" in t[:400]:
                print("la copia guardó la página de verificación contra robots, no el contenido")
                continue
            m = re.search(r"Published date:\s*([A-Z][a-z]+ \d{1,2}, \d{4})", t)
            print("publicado:", m.group(1) if m else "—")
            i = t.find("Share this page")
            print(t[i if i > 0 else 0:][:lim])
            time.sleep(2)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])
