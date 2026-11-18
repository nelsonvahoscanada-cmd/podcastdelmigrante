"""
obtener-nb-ficha.py — Verificación de la ficha provincial de Nuevo Brunswick (solo lectura)
===========================================================================================
Se ejecuta en GitHub Actions (el entorno de desarrollo no tiene acceso a estos
servidores), en partes:
  statcan    tablas de Statistics Canada con filas de Nuevo Brunswick:
             población estimada, componentes de la migración internacional,
             PIB, Encuesta de Población Activa, salarios, empleo por industria
             y por región económica. Imprime los nombres de serie tal como
             vienen en cada archivo.
  perfil     Perfil del Censo 2021 de Nuevo Brunswick y de sus ciudades
             principales: idiomas oficiales, lengua materna, inmigración,
             minorías visibles (latinoamericanos) y vivienda.
  mapa       sitemaps de los sitios oficiales (Gobierno de Nuevo Brunswick,
             Bienvenue/Welcome NB, Service New Brunswick y otros), filtrados
             por palabras clave, para encontrar las páginas vigentes.
  paginas    páginas oficiales: estado, título, fecha de actualización y
             texto. Si una página necesita JavaScript, se abre con un
             navegador normal; si no responde, se lee su copia pública en el
             Archivo de Internet y se anota la fecha de la copia. No se sortea
             ninguna protección.
Uso: python3 obtener-nb-ficha.py <parte> [<parte> …]
"""
import csv, gzip, html, io, json, re, sys, time, urllib.parse, urllib.request, zipfile

PARTES = sys.argv[1:] or ["statcan", "perfil", "mapa", "paginas"]
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
GEO = "New Brunswick"


def get(url, t=120):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        b = r.read()
        return (gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b), r.status, r.geturl()


def texto(h):
    h = h.decode("utf-8", "ignore") if isinstance(h, bytes) else h
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)[0]))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig"))


FIJAS = {"REF_DATE", "GEO", "DGUID", "UOM", "UOM_ID", "SCALAR_FACTOR", "SCALAR_ID", "VECTOR", "COORDINATE", "VALUE", "STATUS", "SYMBOL", "TERMINATED", "DECIMALS"}


def muestra(pid, geo=GEO, filtro=None, n=3, maxfilas=80, geo_parcial=False):
    paso(f"StatCan {pid}")
    try:
        filas = [x for x in tabla(pid) if (geo in x["GEO"] if geo_parcial else x["GEO"] == geo)]
        if not filas:
            print("sin filas para", geo)
            return
        cols = [c for c in filas[0] if c not in FIJAS]
        for c in cols:
            vals = sorted({x[c] for x in filas})
            print("  columna", c, f"({len(vals)}) →", vals[:40])
        if filtro:
            filas = [x for x in filas if filtro(x)]
        fechas = sorted({x["REF_DATE"] for x in filas})[-n:]
        k = 0
        for x in filas:
            if x["REF_DATE"] in fechas and k < maxfilas:
                k += 1
                print("  ", {c: x[c] for c in ["REF_DATE", "GEO", "VALUE", "UOM", "SCALAR_FACTOR", "STATUS"] + cols})
    except Exception as e:
        print("ERROR", pid, type(e).__name__, e)


TOT = lambda x: x.get("Gender", x.get("Sex", "Total")).startswith(("Total", "Both"))

# ------------------------------------------------------------ 1. Statistics Canada
if "statcan" in PARTES:
    muestra("17100009", n=5)
    muestra("17100040", n=6, maxfilas=120)
    muestra("17100008", filtro=lambda x: True, n=3, maxfilas=60)
    muestra("36100222", filtro=lambda x: x.get("Prices") == "Current prices" and x.get("Estimates", "").startswith("Gross domestic product at market prices"), n=3)
    muestra("14100287", filtro=lambda x: TOT(x) and x.get("Age group") in ("15 years and over", "15 to 24 years") and x.get("Data type") == "Seasonally adjusted" and x.get("Statistics") == "Estimate" and x.get("Labour force characteristics") in ("Unemployment rate", "Participation rate", "Employment rate", "Employment", "Population"), n=4)
    muestra("14100327", filtro=lambda x: TOT(x) and x.get("Age group") in ("15 years and over", "15 to 24 years") and x.get("Labour force characteristics") in ("Unemployment rate", "Participation rate", "Employment rate", "Employment"), n=3)
    muestra("14100064", filtro=lambda x: TOT(x) and x.get("Age group") == "15 years and over" and x.get("Type of work") == "Both full- and part-time employees" and x.get("North American Industry Classification System (NAICS)") == "Total employees, all industries" and x.get("Wages") in ("Average hourly wage rate", "Median hourly wage rate"), n=3)
    muestra("14100023", filtro=lambda x: TOT(x) and x.get("Age group") == "15 years and over" and x.get("Labour force characteristics") == "Employment", n=1, maxfilas=40)
    muestra("14100393", geo_parcial=True, filtro=lambda x: x.get("Statistics", "Estimate") == "Estimate" and x.get("Labour force characteristics") in ("Unemployment rate", "Employment", "Participation rate", "Employment rate"), n=1, maxfilas=60)
    muestra("18100004", filtro=lambda x: x.get("Products and product groups") in ("All-items", "Shelter", "Food"), n=3)
    muestra("35100026", filtro=lambda x: x.get("Statistics") in ("Crime severity index", "Violent crime severity index", "Non-violent crime severity index"), n=2)

# ------------------------------------------------------------ 2. Perfil del Censo 2021
if "perfil" in PARTES:
    PERFILES = {"Nuevo Brunswick": "2021A000213", "Moncton (CY)": "2021A00051307022", "Saint John (C)": "2021A00051301006", "Fredericton (CY)": "2021A00051310032", "Dieppe (CY)": "2021A00051307024"}
    CLAVES = r"English only|French only|English and French|Neither English nor French|Total - Knowledge of official languages|Total - Mother tongue|^\s*Spanish|Total - Immigrant status|Immigrants|Non-immigrants|Non-permanent residents|Latin American|Total - Visible minority|Renter|Owner|Average monthly shelter costs for rented|Median monthly shelter costs for rented|2016 to 2021|Total - First official language spoken|French\s*$|English\s*$"
    for nombre, dguid in PERFILES.items():
        paso(f"Perfil del Censo 2021: {nombre} ({dguid})")
        u = f"https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger.cfm?Lang=E&SearchText=&DGUIDlist={dguid}&GENDERlist=1&STATISTIClist=1&HEADERlist=0"
        try:
            b, st, fin = get(u, 240)
            print("estado:", st, "bytes:", len(b), "url:", fin)
            t = b.decode("utf-8-sig", "ignore")
            filas = list(csv.reader(io.StringIO(t)))
            print("cabecera:", filas[0][:12] if filas else "-")
            k = 0
            for f in filas[1:]:
                linea = " | ".join(x.strip() for x in f if x.strip())
                if re.search(CLAVES, linea) and k < 120:
                    k += 1
                    print("  >", linea[:260])
        except Exception as e:
            print("ERROR descarga", type(e).__name__, e)
            try:
                b, st, fin = get(f"https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist={dguid}", 240)
                t = texto(b)
                for l in t.split("\n"):
                    if re.search(CLAVES, l):
                        print("  >", l.strip()[:260])
            except Exception as e2:
                print("ERROR página", type(e2).__name__, e2)

# ------------------------------------------------------------ 3. Sitemaps oficiales
PALABRAS = r"immigra|nominee|nbpnp|pnp|express|skilled|strategic|entrepreneur|business-immig|atlantic|critical|language|clb|francophon|newcomer|settle|welcome|minimum-wage|employment-standard|labour-standard|medicare|health-card|patient|family-doctor|tele-?care|811|extra-mural|tenan|rent|housing|driver|licen|education|school|district|child|benefit|tax|low-income|emergency|emo|population|statistic|economy|wage|local-governance|local-government|municipal|rural-district|regional-service|sitemap"
if "mapa" in PARTES:
    paso("Sitemaps oficiales")
    SITIOS = ["https://www.gnb.ca/sitemap.xml", "https://www2.gnb.ca/sitemap.xml", "https://www.welcomenb.ca/sitemap.xml", "https://www.snb.ca/sitemap.xml", "https://www2.snb.ca/sitemap.xml", "https://www.horizonnb.ca/sitemap.xml", "https://www.vitalitenb.ca/sitemap.xml", "https://www.nbjobs.ca/sitemap.xml", "https://www.welcomenb.ca/robots.txt", "https://www.gnb.ca/robots.txt"]
    vistos = set()

    def recorre(u, prof=0):
        if u in vistos or prof > 2 or len(vistos) > 200:
            return
        vistos.add(u)
        try:
            b, st, fin = get(u, 90)
        except Exception as e:
            print("ERROR", u, type(e).__name__, e)
            return
        t = b.decode("utf-8", "ignore")
        if u.endswith("robots.txt"):
            print("robots", u, "→", [l for l in t.splitlines() if l.lower().startswith(("sitemap", "disallow"))][:20])
            for s in re.findall(r"(?im)^sitemap:\s*(\S+)", t):
                recorre(s, prof + 1)
            return
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", t)
        hijos = [l for l in locs if l.endswith(".xml") or "sitemap" in l.lower()]
        pags = [l for l in locs if l not in hijos]
        sel = [p for p in pags if re.search(PALABRAS, p, re.I) and re.search(r"/en[/.]|/en$|lang=en|english", p, re.I)]
        print(f"sitemap {u} estado {st}: {len(locs)} loc, {len(hijos)} hijos, {len(pags)} páginas, {len(sel)} seleccionadas")
        for p in sel[:400]:
            print("   ", p)
        for h in hijos[:60]:
            recorre(h, prof + 1)

    for s in SITIOS:
        recorre(s)

# ------------------------------------------------------------ 4. Páginas oficiales
PAGINAS = [
    # Gobierno de Canadá
    ("Salario mínimo (Gobierno de Canadá)", "https://minwage-salairemin.service.canada.ca/en/general.html", 4000),
    ("CRA: tasas del GST/HST", "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html", 2500),
    ("CRA: tasas provinciales de impuesto sobre la renta", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html", 9000),
    ("CRA: beneficios provinciales de Nuevo Brunswick", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/province-new-brunswick.html", 6000),
    ("IRCC: Programa de Inmigración del Atlántico", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html", 5000),
    ("IRCC: AIP — quién puede solicitar", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/eligibility.html", 6000),
    ("IRCC: nominados provinciales", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html", 2500),
    ("IRCC: inmigración francófona fuera de Quebec", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/francophone-immigration-outside-quebec.html", 4000),
    ("IRCC: Francophone Community Immigration Pilot", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/francophone-community-immigration-pilot.html", 5000),
    ("IRCC: Rural Community Immigration Pilot", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-community-immigration-pilot.html", 4000),
    ("Job Bank: panorama de Nuevo Brunswick", "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/new-brunswick/environmental-scan", 5000),
    # Inmigración de Nuevo Brunswick
    ("Welcome NB: inicio", "https://www.welcomenb.ca/content/wel-bien/en.html", 3000),
    ("Welcome NB: Programa de Nominados Provinciales", "https://www.welcomenb.ca/content/wel-bien/en/immigrating_to_nb/nb_provincial_nomineeprogram.html", 7000),
    ("Welcome NB: Express Entry Stream", "https://www.welcomenb.ca/content/wel-bien/en/immigrating_to_nb/nb_provincial_nomineeprogram/express_entry_labourmarketstream.html", 7000),
    ("Welcome NB: Skilled Worker Stream", "https://www.welcomenb.ca/content/wel-bien/en/immigrating_to_nb/nb_provincial_nomineeprogram/skilled_workers.html", 7000),
    ("Welcome NB: Strategic Initiative Stream", "https://www.welcomenb.ca/content/wel-bien/en/immigrating_to_nb/nb_provincial_nomineeprogram/strategic_initiative.html", 7000),
    ("Welcome NB: Business Immigration Stream", "https://www.welcomenb.ca/content/wel-bien/en/immigrating_to_nb/nb_provincial_nomineeprogram/business_immigration.html", 5000),
    ("Welcome NB: Atlantic Immigration Program", "https://www.welcomenb.ca/content/wel-bien/en/immigrating_to_nb/atlantic_immigrationprogram.html", 6000),
    ("Welcome NB: settlement", "https://www.welcomenb.ca/content/wel-bien/en/living_in_nb.html", 3000),
    # Gobierno de Nuevo Brunswick (sitio nuevo y anterior)
    ("GNB: inicio", "https://www.gnb.ca/en.html", 2000),
    ("GNB: salario mínimo", "https://www2.gnb.ca/content/gnb/en/departments/post-secondary_education_training_and_labour/People/content/EmploymentStandards/MinimumWage.html", 4000),
    ("GNB: normas de empleo", "https://www2.gnb.ca/content/gnb/en/departments/post-secondary_education_training_and_labour/People/content/EmploymentStandards.html", 3000),
    ("GNB: Medicare — elegibilidad", "https://www2.gnb.ca/content/gnb/en/departments/health/MedicarePrescriptionDrugPlan/content/medicare/MedicareEligibility.html", 5000),
    ("GNB: Patient Connect NB", "https://www2.gnb.ca/content/gnb/en/departments/health/patientconnectnb.html", 4000),
    ("GNB: Tele-Care 811", "https://www2.gnb.ca/content/gnb/en/departments/health/Tele-Care.html", 2500),
    ("GNB: licencias de conducir (canje)", "https://www2.gnb.ca/content/gnb/en/departments/public-safety/motor_vehicle/content/driver_licensing.html", 4000),
    ("GNB: Residential Tenancies Tribunal", "https://www2.snb.ca/content/snb/en/sites/residential-tenancies.html", 4000),
    ("GNB: Local Governance Reform", "https://www2.gnb.ca/content/gnb/en/departments/elg/local_government/content/promos/local_governance_reform.html", 5000),
    ("GNB: EMO", "https://www2.gnb.ca/content/gnb/en/departments/public-safety/emo.html", 2500),
    ("GNB: educación — escuelas", "https://www2.gnb.ca/content/gnb/en/departments/education/k12.html", 3000),
    ("GNB: beneficios para familias", "https://www2.gnb.ca/content/gnb/en/departments/finance/taxes/credit.html", 3000),
    ("GNB: Statistics (Finance) — población", "https://www2.gnb.ca/content/gnb/en/departments/finance/economy_statistics.html", 3000),
    # Salud
    ("Horizon Health Network", "https://horizonnb.ca/", 1500),
    ("Vitalité Health Network", "https://www.vitalitenb.ca/en", 1500),
    ("Ambulance New Brunswick", "https://ambulancenb.ca/", 1500),
    # Educación
    ("UNB", "https://www.unb.ca/", 1000),
    ("Université de Moncton", "https://www.umoncton.ca/", 1000),
    ("Mount Allison University", "https://mta.ca/", 1000),
    ("St. Thomas University", "https://www.stu.ca/", 1000),
    ("NBCC", "https://nbcc.ca/", 1000),
    ("CCNB", "https://ccnb.ca/", 1000),
    # Asentamiento
    ("NB Multicultural Council", "https://nbmc-cmnb.ca/", 3000),
    ("Multicultural Association of Fredericton", "https://www.mcaf.nb.ca/", 1500),
    ("MAGMA (Moncton)", "https://www.magma-amgm.org/", 1500),
    ("YMCA de Saint John: recién llegados", "https://ymcanb.ca/", 1500),
    ("CAFi (Edmundston)", "https://www.cafi-nb.org/", 1500),
    ("NBJobs", "https://www.nbjobs.ca/", 1500),
    # Transporte y ciudades
    ("Codiac Transpo", "https://www.codiactranspo.ca/", 1500),
    ("Saint John Transit", "https://saintjohn.ca/en/transportation-and-streets/saint-john-transit", 1500),
    ("Fredericton Transit", "https://www.fredericton.ca/en/transit", 1500),
    ("Maritime Bus", "https://maritimebus.com/", 1500),
    ("NB 511", "https://511.gnb.ca/", 800),
    ("Ciudad de Moncton", "https://www.moncton.ca/", 600),
    ("Ciudad de Saint John", "https://saintjohn.ca/en", 600),
    ("Ciudad de Fredericton", "https://www.fredericton.ca/", 600),
    ("Ciudad de Dieppe", "https://www.dieppe.ca/en/index.aspx", 600),
    ("Riverview", "https://www.townofriverview.ca/", 600),
    ("Quispamsis", "https://www.quispamsis.ca/", 600),
    ("Miramichi", "https://www.miramichi.org/", 600),
    ("Edmundston", "https://www.edmundston.ca/", 600),
    ("Bathurst", "https://www.bathurst.ca/", 600),
    ("Alert Ready", "https://www.alertready.ca/", 500),
]
EXTRA = [l.strip() for l in open(sys.argv[-1]).read().splitlines() if l.strip()] if sys.argv[-1].endswith(".txt") else []


def leer_pagina(nombre, url, lim, nav=None):
    paso(f"Página: {nombre}")
    print("URL:", url)
    t = None
    try:
        b, st, fin = get(url, 90)
        print("estado:", st, "| final:", fin, "| bytes:", len(b), "| título:", (re.search(rb"<title>(.*?)</title>", b, re.S) or [b"", b"-"])[1][:160].decode("utf-8", "ignore").strip())
        t = texto(b)
        if len(t) < 400 and nav:
            raise ValueError("contenido corto: se abre con navegador")
    except Exception as e:
        print("lectura directa:", type(e).__name__, str(e)[:200])
        if nav:
            try:
                pg = nav.new_page()
                r = pg.goto(url, wait_until="networkidle", timeout=60000)
                print("navegador: estado", r.status if r else "-", "| final:", pg.url, "| título:", pg.title()[:160])
                t = texto(pg.content())
                pg.close()
            except Exception as e2:
                print("navegador:", type(e2).__name__, str(e2)[:200])
        if not t or len(t) < 400:
            try:
                d = json.loads(get("https://archive.org/wayback/available?url=" + urllib.parse.quote(url.split("://", 1)[-1], safe=""), 60)[0])
                s = (d.get("archived_snapshots") or {}).get("closest")
                if s:
                    print("copia archivada:", s["timestamp"], s["url"])
                    t = texto(get(s["url"].replace("/web/" + s["timestamp"] + "/", "/web/" + s["timestamp"] + "id_/"), 120)[0])
                else:
                    print("sin copia archivada")
            except Exception as e3:
                print("archivo:", type(e3).__name__, str(e3)[:200])
    if t:
        m = re.search(r"(Last updated|Date modified|Updated|Published|Modified|Mise à jour)[^\n]{0,80}", t, re.I)
        print("actualización:", m.group(0).strip() if m else "—")
        print(t[:lim])


if "paginas" in PARTES:
    nav = None
    try:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        nav = pw.chromium.launch().new_context(user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", locale="en-CA")
    except Exception as e:
        print("sin navegador:", e)
    for nombre, url, lim in PAGINAS + [(f"Extra: {u}", u, 8000) for u in EXTRA]:
        leer_pagina(nombre, url, lim, nav)
        time.sleep(1)
