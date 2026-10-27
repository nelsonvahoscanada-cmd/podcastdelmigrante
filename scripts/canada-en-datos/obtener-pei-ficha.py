"""
obtener-pei-ficha.py — Verificación de la ficha provincial de Isla del Príncipe Eduardo
======================================================================================
Solo lectura, en GitHub Actions. Imprime, para revisarlos a mano, los
valores oficiales que usa la ficha (js/canada-datos.js) y el texto de las
páginas oficiales:
  1. Statistics Canada: estimaciones de población, PIB, Encuesta de
     Población Activa, salarios, índice de gravedad del delito e idiomas y
     origen del Censo 2021 (tablas buscadas por su título en el catálogo).
  2. Clasificación Geográfica Estándar 2021: tipos de subdivisión censal.
  3. Páginas oficiales (federales y de instituciones de PEI) con su texto.
  4. Sitios del Gobierno de PEI y Health PEI: tienen una protección contra
     robots, así que se leen sus copias públicas en el Archivo de Internet
     (Wayback Machine) y se anota la fecha de cada copia.
"""
import csv, html, io, json, re, time, urllib.parse, urllib.request, zipfile

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=600):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
                return r.read()
        except urllib.error.HTTPError:
            raise
        except Exception as e:
            err = e
            time.sleep(10)
    raise err


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def texto(h):
    h = h.decode("utf-8", "ignore") if isinstance(h, bytes) else h
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return list(csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig")))


FIJAS = {"REF_DATE", "GEO", "DGUID", "UOM", "UOM_ID", "SCALAR_FACTOR", "SCALAR_ID", "VECTOR", "COORDINATE", "VALUE", "STATUS", "SYMBOL", "TERMINATED", "DECIMALS"}


def muestra(pid, geo="Prince Edward Island", filtro=None, n=3, maxfilas=60):
    paso(f"StatCan {pid}")
    try:
        filas = [x for x in tabla(pid) if x["GEO"] == geo]
        cols = [c for c in filas[0] if c not in FIJAS]
        for c in cols:
            vals = sorted({x[c] for x in filas})
            print("  columna", c, f"({len(vals)}) →", vals[:30])
        if filtro:
            filas = [x for x in filas if filtro(x)]
        fechas = sorted({x["REF_DATE"] for x in filas})[-n:]
        k = 0
        for x in filas:
            if x["REF_DATE"] in fechas and k < maxfilas:
                k += 1
                print("  ", {c: x[c] for c in ["REF_DATE", "VALUE", "UOM", "SCALAR_FACTOR", "STATUS"] + cols})
    except Exception as e:
        print("ERROR", pid, type(e).__name__, e)


# ------------------------------------------------------------ 1. Statistics Canada
muestra("17100009", n=4)
muestra("36100222", filtro=lambda x: x.get("Prices") == "Current prices" and x.get("Estimates", "").startswith("Gross domestic product at market prices"), n=3)
muestra("14100287", filtro=lambda x: x.get("Gender", x.get("Sex", "")).startswith("Total") and x.get("Age group") == "15 years and over" and x.get("Data type") == "Seasonally adjusted" and x.get("Statistics") == "Estimate" and x.get("Labour force characteristics") in ("Unemployment rate", "Participation rate", "Employment rate", "Employment", "Population"), n=3)
muestra("14100327", filtro=lambda x: x.get("Gender", x.get("Sex", "")).startswith("Total") and x.get("Age group") == "15 years and over" and x.get("Labour force characteristics") in ("Unemployment rate", "Participation rate", "Employment rate"), n=3)
muestra("14100064", filtro=lambda x: x.get("Gender", x.get("Sex", "")).startswith("Total") and x.get("Age group") == "15 years and over" and x.get("Type of work") == "Both full- and part-time employees" and x.get("North American Industry Classification System (NAICS)") == "Total employees, all industries" and x.get("Wages") in ("Average hourly wage rate", "Median hourly wage rate"), n=2)
muestra("35100026", filtro=lambda x: x.get("Statistics") in ("Crime severity index", "Violent crime severity index", "Non-violent crime severity index"), n=2)
muestra("14100392", filtro=lambda x: x.get("Statistics", "Estimate") == "Estimate", n=1, maxfilas=40)

paso("Catálogo de StatCan: tablas del Censo 2021 sobre idiomas, inmigración y edad")
try:
    cubos = json.loads(get("https://www150.statcan.gc.ca/t1/wds/rest/getAllCubesListLite", 300))
    for c in cubos:
        t = c.get("cubeTitleEn", "")
        if str(c.get("productId", "")).startswith("9810") and re.search(r"official language|mother tongue|immigrant status|age \(in single years\)|visible minority|first official language spoken", t, re.I):
            print("  ", c["productId"], "|", t[:150], "|", c.get("releaseTime", "")[:10])
except Exception as e:
    print("ERROR catálogo", type(e).__name__, e)

# ------------------------------------------------------------ 2. Tipos de subdivisión censal
paso("Clasificación Geográfica Estándar 2021: tipos de CSD")
for u in ["https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/introduction", "https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/index"]:
    try:
        t = texto(get(u, 120))
        print("URL:", u, "caracteres:", len(t))
        for l in t.split("\n"):
            if re.search(r"\b(FD|RM|RMU|IRI|CY|T)\b\s*[-–—]|Fire district|Rural municipality|Resort municipality|Prince Edward", l):
                print("  >", l.strip()[:300])
    except Exception as e:
        print("ERROR", u, type(e).__name__, e)

# ------------------------------------------------------------ 3. Páginas oficiales accesibles
PAGINAS = [
    ("Salario mínimo (Gobierno de Canadá)", "https://minwage-salairemin.service.canada.ca/en/general.html", 4000),
    ("CRA: tasas del GST/HST", "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html", 3000),
    ("CRA: tasas de impuesto sobre la renta", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html", 9000),
    ("IRCC: Programa de Inmigración del Atlántico", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html", 4000),
    ("IRCC: nominados provinciales", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html", 2500),
    ("Public Schools Branch: escuelas", "https://psb.edu.pe.ca/schools", 6000),
    ("UPEI", "https://www.upei.ca/", 1500),
    ("Holland College", "https://www.hollandcollege.com/", 1500),
    ("T3 Transit", "https://www.t3transit.ca/", 2500),
    ("WorkPEI", "https://www.workpei.ca/", 1500),
    ("IRAC: Residential Rental", "https://irac.pe.ca/", 2500),
    ("Puente de la Confederación", "https://www.confederationbridge.com/", 1500),
    ("Job Bank: PEI", "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/prince-edward-island/environmental-scan", 3000),
    ("Clima (Environment Canada)", "https://weather.gc.ca/canada_e.html", 500),
    ("PEIANC", "https://www.peianc.com/", 1000),
    ("Collège de l'Île", "https://www.collegedelile.ca/", 1000),
]
for nombre, url, lim in PAGINAS:
    paso(f"Página: {nombre}")
    print("URL:", url)
    try:
        b = get(url, 120)
        print("bytes:", len(b), "| título:", (re.search(rb"<title>(.*?)</title>", b, re.S) or [b"", b"-"])[1][:150])
        print(texto(b)[:lim])
    except Exception as e:
        print("ERROR", type(e).__name__, e)

# ------------------------------------------------------------ 4. Gobierno de PEI y Health PEI (copias archivadas)
paso("Archivo de Internet: páginas del Gobierno de PEI y de Health PEI")
PALABRAS = r"minimum-wage|employment-standards|health-card|health-pei-card|provincial-nominee|office-of-immigration|newcomer|settlement|rental|tenan|driver|licence|emergency-measures|population-report|hst|income-tax|student|english-as|islander|labour-market|skills|apprentice|immigrat|welcome"
vistos = set()
for dominio in ["princeedwardisland.ca/en/information/*", "princeedwardisland.ca/en/service/*", "princeedwardisland.ca/en/topic/*", "healthpei.ca/*"]:
    try:
        q = urllib.parse.urlencode({"url": dominio, "output": "json", "fl": "original,timestamp,statuscode", "filter": "statuscode:200", "from": "2025", "collapse": "urlkey", "limit": "20000"})
        filas = json.loads(get("https://web.archive.org/cdx/search/cdx?" + q, 300))[1:]
        sel = [f for f in filas if re.search(PALABRAS, f[0], re.I) and "?" not in f[0]]
        print("CDX", dominio, "total:", len(filas), "seleccionadas:", len(sel))
        for f in sel[:150]:
            print("   ", f[1], f[0])
            vistos.add(f[0].split("://", 1)[-1].replace("www.", "").rstrip("/"))
    except Exception as e:
        print("ERROR CDX", dominio, type(e).__name__, e)

LEER = [
    "princeedwardisland.ca/en/information/economic-development-innovation-and-trade/minimum-wage-order",
    "princeedwardisland.ca/en/information/office-of-immigration/pei-provincial-nominee-program",
    "princeedwardisland.ca/en/information/finance/pei-population-report-quarterly",
]
for patron, lim in [(r"minimum-wage", 4000), (r"employment-standards", 3000), (r"health-card", 4000), (r"provincial-nominee-program$|pei-provincial-nominee", 5000), (r"rental|tenan", 3500), (r"driver", 3000), (r"population-report", 3000), (r"newcomer|settlement", 3000), (r"emergency-measures", 2000)]:
    for u in sorted(vistos):
        if re.search(patron, u) and u not in LEER and len([x for x in LEER if re.search(patron, x)]) < 2:
            LEER.append(u)
for u in LEER:
    paso(f"Copia archivada: {u}")
    try:
        d = json.loads(get("https://archive.org/wayback/available?url=" + urllib.parse.quote(u, safe=""), 60))
        s = (d.get("archived_snapshots") or {}).get("closest")
        if not s:
            print("sin copia")
            continue
        print("copia:", s["timestamp"], s["url"])
        t = texto(get(s["url"].replace("/web/" + s["timestamp"] + "/", "/web/" + s["timestamp"] + "id_/"), 180))
        m = re.search(r"(Last updated|Published date|Updated)[^\n]{0,60}", t)
        print("actualización:", m.group(0) if m else "—")
        print(t[:4000])
        time.sleep(3)
    except Exception as e:
        print("ERROR", type(e).__name__, e)
