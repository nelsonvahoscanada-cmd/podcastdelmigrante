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

# ------------------------------------------------------------ 5. API oficial de Statistics Canada (WDS)
if "wds" in PARTES:
    paso("WDS de Statistics Canada: acceso de prueba")
    for u in ["https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata", "https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/17100009/en"]:
        try:
            if u.endswith("getCubeMetadata"):
                req = urllib.request.Request(u, data=json.dumps([{"productId": 17100009}]).encode(), headers={**UA, "Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    print(u, "→", r.status, r.read()[:400])
            else:
                b, st, fin = get(u, 60)
                print(u, "→", st, b[:400])
        except Exception as e:
            print("ERROR", u, type(e).__name__, str(e)[:200])


# ------------------------------------------------------------ 6. Páginas del Gobierno de Nuevo Brunswick (sitemap completo)
SEL_GNB = r"/immigration|/renting|licences-new-residents|driver-licences\.html|/communty-local-gov/(rural-districts|local-resource-manual/local-government-organization)|geonb/data-catalogue/(local-governments|rural-districts)|k-12/school/new-families|k-12/district(/anglophone|/francophone)?\.html|k-12\.html|/topic/health|/health-|medicare|patient|tele-care|811|family-doctor|jobs-workplaces|employment-standard|minimum-wage|labour|/emergency|seniors/senior-tax-credit|low-income|social-assistance|child|family-children\.html|population|statistic|economic-information|post-secondary|student-financial|language-proficiency|newcomer|settlement|study-succeed"
if "gnb" in PARTES:
    import os
    os.makedirs("/tmp/out/gnb", exist_ok=True)
    paso("Sitemap completo de gnb.ca (inglés)")
    b, st, fin = get("https://www.gnb.ca/en.sitemap.xml", 120)
    todas = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", b.decode("utf-8", "ignore"))
    open("/tmp/out/gnb-sitemap.txt", "w").write("\n".join(todas))
    sel = [u for u in todas if re.search(SEL_GNB, u, re.I) and "/business-economy/tenders" not in u]
    print("páginas:", len(todas), "seleccionadas:", len(sel))
    nav = None
    try:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        nav = pw.chromium.launch().new_context(locale="en-CA")
    except Exception as e:
        print("sin navegador:", e)
    for u in sel[:260]:
        nombre = re.sub(r"[^a-z0-9]+", "-", u.split("/en/", 1)[-1].lower()).strip("-")[:120]
        try:
            b, st, fin = get(u, 60)
            h = b.decode("utf-8", "ignore")
        except Exception as e:
            h = ""
            print("ERROR", u, type(e).__name__, str(e)[:120])
        if len(texto(h)) < 300 and nav:
            try:
                pg = nav.new_page()
                pg.goto(u, wait_until="networkidle", timeout=60000)
                h = pg.content()
                pg.close()
            except Exception as e:
                print("navegador ERROR", u, type(e).__name__)
        titulo = (re.search(r"<title>(.*?)</title>", h, re.S) or [None, "-"])[1].strip()
        mod = re.search(r'(?i)(?:dcterms\.modified|date[-_ ]?modified|last[-_ ]?modified)"?\s*content="([^"]+)"', h) or re.search(r"(?i)(Date modified|Last updated|Updated)\s*:?\s*</?[^>]*>?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Z][a-z]+ \d{1,2}, \d{4})", h)
        main = re.search(r"(?is)<main[^>]*>(.*?)</main>", h)
        cuerpo = main.group(1) if main else h
        links = []
        for href, txt in re.findall(r'(?is)<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', cuerpo):
            t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", txt))).strip()
            if t and (href, t) not in links:
                links.append((urllib.parse.urljoin(u, href), t))
        with open(f"/tmp/out/gnb/{nombre}.txt", "w") as f:
            f.write(f"URL: {u}\nTÍTULO: {titulo}\nMODIFICADA: {mod.group(mod.lastindex) if mod else '—'}\n\n{texto(cuerpo)}\n\n--- ENLACES ---\n" + "\n".join(f"{t} | {l}" for l, t in links))
        print("ok", u, "|", titulo[:90], "|", mod.group(mod.lastindex) if mod else "—")
        time.sleep(0.5)


# ------------------------------------------------------------ 7. Tercera ronda: páginas concretas, GeoNB, salario mínimo y bases ODHF/ODEF
RONDA3 = [
    "https://www.gnb.ca/en/topic/health-wellness/medicare-plans-programs.html",
    "https://www.gnb.ca/en/topic/health-wellness/access-health-care.html",
    "https://www.gnb.ca/en/topic/health-wellness/access-health-care/tele-care-811.html",
    "https://www.gnb.ca/en/topic/health-wellness/access-health-care/virtual-care.html",
    "https://www.gnb.ca/en/topic/health-wellness/access-health-care/medical-clinics.html",
    "https://www.gnb.ca/en/topic/health-wellness/access-health-care/ambulance-services.html",
    "https://www.gnb.ca/en/topic/health-wellness/access-health-care/regional-health-authorities.html",
    "https://www.gnb.ca/en/campaign/accessing-health-care-nb.html",
    "https://www.gnb.ca/en/topic/jobs-workplaces/labour-market-workforce/employment-standards.html",
    "https://www.gnb.ca/en/topic/jobs-workplaces/labour-market-workforce/employment-standards/wage-pay.html",
    "https://www.gnb.ca/en/topic/jobs-workplaces/labour-market-workforce/employment-standards/foreign-workers.html",
    "https://www.gnb.ca/en/topic/jobs-workplaces/labour-market-workforce/employment-standards/rights-terminated.html",
    "https://www.gnb.ca/en/topic/jobs-workplaces/labour-market-workforce/employment-standards/employment-standards-complaint.html",
    "https://www.gnb.ca/en/topic/jobs-workplaces/find-a-job.html",
    "https://www.gnb.ca/en/topic/laws-safety/emergency-preparedness-alerts.html",
    "https://www.gnb.ca/en/topic/business-economy/economic-information.html",
    "https://www.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams/nb-critical-workers-pilot.html",
    "https://www.gnb.ca/en/campaign/geonb/data-catalogue/local-governments.html",
    "https://www.gnb.ca/en/campaign/geonb/data-catalogue/rural-districts.html",
    "https://www.gnb.ca/en/topic/family-home-community/communty-local-gov/local-resource-manual/local-government-organization.html",
    "https://www.gnb.ca/en/topic/family-home-community/immigration/newcomers.html",
    "https://www.gnb.ca/en/topic/family-home-community/immigration/atlantic-immigration-program.html",
]
if "ronda3" in PARTES or "ronda5" in PARTES:
    if "ronda5" in PARTES:
        RONDA3[:] = ["https://www.gnb.ca/content/gnb/en/departments/health/Medicare.html", "https://www.gnb.ca/content/gnb/en/departments/health/DrugPlans/content/medicare/ApplyingforaCard.html", "https://nbhealthlink.ca/", "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html"]
    import os
    os.makedirs("/tmp/out/r3", exist_ok=True)
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    nav = pw.chromium.launch().new_context(locale="en-CA")

    def guarda(u, h, extra=""):
        nombre = re.sub(r"[^a-z0-9]+", "-", u.split("://", 1)[-1].lower()).strip("-")[:140]
        titulo = (re.search(r"<title>(.*?)</title>", h, re.S) or [None, "-"])[1].strip()
        links = []
        for href, txt in re.findall(r'(?is)<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h):
            t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", txt))).strip()
            if (href, t) not in links:
                links.append((urllib.parse.urljoin(u, href), t))
        main = re.search(r"(?is)<main[^>]*>(.*?)</main>", h)
        with open(f"/tmp/out/r3/{nombre}.txt", "w") as f:
            f.write(f"URL: {u}\nTÍTULO: {titulo}\n{extra}\n\n{texto(main.group(1) if main else h)}\n\n--- ENLACES (toda la página) ---\n" + "\n".join(f"{t} | {l}" for l, t in links))
        print("ok", u, "|", titulo[:90])

    for u in RONDA3:
        try:
            pg = nav.new_page()
            r = pg.goto(u, wait_until="networkidle", timeout=90000)
            guarda(u, pg.content(), f"ESTADO: {r.status if r else '-'} | FINAL: {pg.url}")
            pg.close()
        except Exception as e:
            print("ERROR", u, type(e).__name__, str(e)[:150])

    paso("Salario mínimo (tabla del Gobierno de Canadá, con navegador)")
    try:
        pg = nav.new_page()
        pg.goto("https://minwage-salairemin.service.canada.ca/en/general.html", wait_until="networkidle", timeout=90000)
        pg.wait_for_selector("table tbody tr", timeout=60000)
        print(texto(pg.inner_html("main"))[:6000])
        pg.close()
    except Exception as e:
        print("ERROR salario", type(e).__name__, str(e)[:200])

    paso("GeoNB: servicios de mapas (límites de gobiernos locales y distritos rurales)")
    for u in ["https://geonb.snb.ca/arcgis/rest/services?f=json", "https://geonb.snb.ca/arcgis/rest/services/GeoNB_DNR_LocalGovernment/MapServer?f=json"]:
        try:
            b, st, fin = get(u, 60)
            print(u, st, b.decode("utf-8", "ignore")[:3000])
        except Exception as e:
            print("ERROR", u, type(e).__name__, str(e)[:150])

    paso("ODHF y ODEF: copias del Archivo de Internet")
    for nombre, u in [("ODHF.zip", "www150.statcan.gc.ca/n1/pub/13-26-0001/2020001/ODHF.zip"), ("ODEF_v2.1.zip", "www150.statcan.gc.ca/n1/pub/37-26-0001/2022001/ODEF_v2.1.zip")]:
        try:
            d = json.loads(get("https://archive.org/wayback/available?url=" + urllib.parse.quote(u, safe=""), 60)[0])
            s = (d.get("archived_snapshots") or {}).get("closest")
            print(nombre, "copia:", s)
            if s:
                b, st, fin = get(s["url"].replace("/web/" + s["timestamp"] + "/", "/web/" + s["timestamp"] + "id_/"), 300)
                open(f"/tmp/out/{nombre}", "wb").write(b)
                print(nombre, "bytes:", len(b), "zip válido:", b[:2] == b"PK", "fecha de la copia:", s["timestamp"])
        except Exception as e:
            print("ERROR", nombre, type(e).__name__, str(e)[:150])


# ------------------------------------------------------------ 8. Cuarta ronda: capas oficiales de GeoNB y regiones económicas
GEONB = "https://geonb.snb.ca/arcgis/rest/services/"
SERVICIOS = ["GeoNB_ELG_Local_Governance", "GeoNB_EECD_PublicSchools", "GeoNB_Health_Facilities", "GeoNB_ENB_RegionalHealthAuthorities"]
if "geonb" in PARTES:
    import os
    os.makedirs("/tmp/out/geonb", exist_ok=True)
    for s in SERVICIOS:
        paso(f"GeoNB: {s}")
        try:
            m = json.loads(get(f"{GEONB}{s}/MapServer?f=json", 60)[0])
            print("descripción:", (m.get("serviceDescription") or m.get("description") or "")[:600])
            print("capas:", [(l["id"], l["name"]) for l in m.get("layers", [])])
            for l in m.get("layers", []):
                if l.get("subLayerIds"):
                    continue
                info = json.loads(get(f"{GEONB}{s}/MapServer/{l['id']}?f=json", 60)[0])
                print(f"  capa {l['id']} {l['name']} | tipo {info.get('geometryType')} | campos:", [f["name"] for f in info.get("fields", [])][:30], "| edición:", (info.get("editingInfo") or {}).get("lastEditDate"))
                feats, desde = [], 0
                while True:
                    q = {"where": "1=1", "outFields": "*", "returnGeometry": "true", "outSR": "4326", "f": "geojson", "resultOffset": desde, "resultRecordCount": 1000}
                    if info.get("geometryType") == "esriGeometryPolygon":
                        q["maxAllowableOffset"] = "0.0005"
                    d = json.loads(get(f"{GEONB}{s}/MapServer/{l['id']}/query?" + urllib.parse.urlencode(q), 300)[0])
                    lote = d.get("features", [])
                    feats += lote
                    if len(lote) < 1000 or not d.get("exceededTransferLimit", len(lote) == 1000):
                        break
                    desde += 1000
                json.dump({"type": "FeatureCollection", "servicio": s, "capa": l["name"], "features": feats}, open(f"/tmp/out/geonb/{s}-{l['id']}.geojson", "w"))
                print(f"  → {len(feats)} elementos; ejemplo:", (feats[0]["properties"] if feats else "-"))
        except Exception as e:
            print("ERROR", s, type(e).__name__, str(e)[:200])

    paso("Statistics Canada (límites 2021): regiones económicas de Nuevo Brunswick")
    try:
        q = {"where": "PRUID='13'", "outFields": "ERUID,ERNAME", "returnGeometry": "true", "outSR": "4326", "f": "geojson", "maxAllowableOffset": "0.005"}
        d = get("https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer/2/query?" + urllib.parse.urlencode(q), 300)[0]
        open("/tmp/out/geonb/statcan-er-2021.geojson", "wb").write(d)
        print("regiones:", [f["properties"] for f in json.loads(d)["features"]])
    except Exception as e:
        print("ERROR ER", type(e).__name__, str(e)[:200])
