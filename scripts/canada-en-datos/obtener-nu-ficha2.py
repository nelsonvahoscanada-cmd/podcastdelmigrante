"""
obtener-nu-ficha2.py — Segunda ronda de verificación de la ficha de Nunavut (solo lectura)
==========================================================================================
Se ejecuta en GitHub Actions. Completa lo que la primera ronda
(obtener-nu-ficha.py) no pudo leer:
  archivo    El sitio del Gobierno de Nunavut (gov.nu.ca) muestra una
             verificación de Cloudflare a los lectores automáticos: no se
             intenta sortearla. Se usan las copias públicas del Internet
             Archive (Wayback Machine): primero se listan sus direcciones
             archivadas (CDX) por palabras clave y después se lee la copia
             más reciente de cada página elegida, indicando su fecha.
  statcan    identidad indígena (Inuit) y lenguas inuit (inuktitut,
             inuinnaqtun) del Censo 2021; PIB por industria.
  clima      normales climáticas de ECCC para Iqaluit, Rankin Inlet,
             Cambridge Bay y Baker Lake.
  paginas    páginas complementarias (Job Bank, IRCC, Nutrition North, Qiniq…).
"""
import csv, gzip, html, io, json, re, sys, time, urllib.parse, urllib.request, zipfile

PARTES = sys.argv[1:] or ["archivo", "statcan", "clima", "paginas"]
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


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


def mostrar(t, patron, ventana=3, maximo=40):
    lineas, vistos, n = t.split("\n"), set(), 0
    for i, l in enumerate(lineas):
        if re.search(patron, l, re.I) and i not in vistos:
            vistos.update(range(i, i + ventana))
            print("  >", " | ".join(x.strip() for x in lineas[max(0, i - 1): i + ventana] if x.strip())[:1000])
            n += 1
            if n >= maximo:
                break


def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)[0]))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig"))


# ------------------------------------------------------------ 1. Copias del Internet Archive
TEMAS = [
    ("salario mínimo", r"minimum-wage", r"minimum wage|\$\d+\.\d\d|effective|September|April"),
    ("normas laborales", r"labour-standards|employment-standards|labour-standard", r"overtime|vacation|holiday|hours|notice|complaint|minimum"),
    ("tarjeta de salud", r"health-care-card|health-care-coverage|nunavut-health-care-plan|health-insurance|hcp", r"eligib|resident|month|permit|student|work|apply|coverage|waiting"),
    ("viajes médicos", r"medical-travel", r"medical travel|escort|co-pay|policy|community"),
    ("centros de salud", r"health-centres|health-centre|community-health", r"health centre|nurse|clinic|community|hours"),
    ("alquileres", r"residential-tenanc|rental-officer|landlord|tenant", r"tenant|landlord|deposit|notice|Rental Officer|rent increase"),
    ("símbolos", r"symbol|flag|coat-of-arms", r"flag|inuksuk|star|blue|gold|red|white|coat of arms|1999"),
    ("hora", r"time-zone|daylight|time-change", r"time|daylight|Eastern|Central|Mountain|Southampton|Coral Harbour|Kugluktuk|Cambridge|Rankin"),
    ("estadísticas y precios de alimentos", r"bureau-statistics|food-price|cost-of-living|statistics", r"food price|price|population|survey|cost|20\d\d"),
    ("educación", r"/education$|/education/|schools|register", r"school|Inuktut|bilingual|kindergarten|Grade|register|district education"),
    ("FANS", r"financial-assistance-nunavut-students|fans", r"FANS|eligib|resident|grant|loan|Inuit|Nunavut Land Claims"),
    ("licencia de conducir", r"motor-vehicle|driver|licen", r"driver|licen|exchange|test|registration|days"),
    ("asistencia de ingresos", r"income-assistance|family-services", r"income assistance|eligib|apply|community"),
    ("911", r"/911|emergency", r"911|emergency|launched|communit"),
    ("idiomas", r"language|inuktut|official-languages", r"Inuktut|Inuktitut|Inuinnaqtun|official|English|French|services"),
    ("inmigración y recién llegados", r"immigra|newcomer|settle|nominee|work-in-nunavut|moving-to-nunavut", r"immigra|newcomer|nominee|work permit|program|settle"),
]


def cdx(dominio, desde="2024"):
    q = {"url": dominio, "matchType": "prefix", "output": "json", "fl": "original,timestamp", "filter": "statuscode:200", "collapse": "urlkey", "from": desde, "limit": "50000"}
    d = json.loads(get("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), 300)[0] or b"[]")
    return d[1:] if d else []


if "archivo" in PARTES:
    filas = []
    for dominio in ("www.gov.nu.ca/en/", "gov.nu.ca/en/", "nu-lsco.ca/", "canadiannorth.com/"):
        paso(f"CDX: {dominio}")
        try:
            f = cdx(dominio)
            print("direcciones archivadas desde 2024:", len(f))
            filas += f
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])
    ultimos = {}
    for original, ts in filas:
        u = re.sub(r"^https?://(www\.)?", "", original).split("?")[0].rstrip("/")
        if u not in ultimos or ts > ultimos[u][1]:
            ultimos[u] = (original, ts)
    for nombre, url_re, frases in TEMAS:
        cand = sorted([(u, v) for u, v in ultimos.items() if re.search(url_re, u, re.I) and not re.search(r"/(fr|iu|ikt|in)/|\.pdf$|news|/node/", u)], key=lambda x: (len(x[0]), x[0]))
        paso(f"Tema: {nombre} — {len(cand)} direcciones")
        for u, (orig, ts) in cand[:25]:
            print("   ", ts[:8], u)
        for u, (orig, ts) in cand[:3]:
            paso(f"Copia archivada {ts[:8]}: {u}")
            try:
                b, st, final = get(f"http://web.archive.org/web/{ts}id_/{orig}", 90)
                t = texto(b)
                m = re.search(r"(Last updated|Updated|Date modified|Published|Posted)[:\s]+([A-Za-z0-9 ,.-]{6,30})", t)
                print("estado:", st, "| caracteres:", len(t), "|", m.group(0)[:60] if m else "fecha no indicada")
                mostrar(t, frases)
            except Exception as e:
                print("ERROR", type(e).__name__, str(e)[:150])
            time.sleep(1)

# ------------------------------------------------------------ 2. Statistics Canada
if "statcan" in PARTES:
    paso("98-10-0264-01 Censo 2021: identidad indígena (Nunavut, total)")
    try:
        for r in tabla("98100264"):
            if r["GEO"] == "Nunavut" and r.get("Age (20)") == "Total - Age" and r.get("Gender (3)") == "Total - Gender" and r.get("Statistics (3)") == "Count" and r.get("Registered or Treaty Indian status (3)", "").startswith("Total") and r.get("Residence by Indigenous geography (10)", "").startswith("Total"):
                for k, v in r.items():
                    if k.startswith("Indigenous identity"):
                        print(" ", k, "=", v)
                break
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    for pid in ("98100216", "98100217", "98100219", "98100220", "98100223", "98100224", "98100226", "98100227"):
        paso(f"{pid[:2]}-{pid[2:4]}-{pid[4:]}: filas de Nunavut con lenguas inuit")
        try:
            n = 0
            for r in tabla(pid):
                if r.get("GEO") != "Nunavut":
                    continue
                if n == 0:
                    print("columnas:", list(r.keys())[:12])
                n += 1
                linea = json.dumps(r, ensure_ascii=False)
                if re.search(r"Inuk|Inuinn|Inuit languages|Total - (Mother tongue|Language spoken|Knowledge of languages)", linea) and re.search(r"Total - Age|Total - Gender", linea):
                    print(" ", {k: v for k, v in r.items() if v and k not in ("REF_DATE", "GEO", "DGUID") and not k.startswith("Symbol")})
            print("filas Nunavut:", n)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

    paso("36-10-0402-01 PIB por industria: Nunavut, último año")
    try:
        todas = [r for r in tabla("36100402") if r["GEO"] == "Nunavut"]
        ult = max(r["REF_DATE"] for r in todas)
        print("valores de 'Prices':", sorted({r.get("Prices") for r in todas}))
        for r in todas:
            ind = r.get("North American Industry Classification System (NAICS)", "")
            if r["REF_DATE"] == ult and r.get("Prices", "").startswith("Chained") and (re.search(r"\[(11|21|22|23|31-33|41|44-45|48-49|51|52|53|54|55|56|61|62|71|72|81|91)\]$", ind) or ind.startswith("All industries")):
                print(" ", ult, ind, r["VALUE"], r.get("SCALAR_FACTOR"))
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("14-10-0393-01 EPA anual de Nunavut (todos los años desde 2021)")
    try:
        for r in tabla("14100393"):
            if r["GEO"].startswith("Nunavut") and r["REF_DATE"] >= "2021" and r["Labour force characteristics"] in ("Unemployment rate", "Participation rate", "Employment rate"):
                print(" ", r["GEO"], r["REF_DATE"], r["Labour force characteristics"], r["VALUE"], r.get("STATUS"))
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("14-10-0392-01 Empleo por industria en Nunavut (anual)")
    try:
        f = [r for r in tabla("14100392") if r["GEO"].startswith("Nunavut")]
        ult = max(r["REF_DATE"] for r in f) if f else None
        for r in f:
            if r["REF_DATE"] == ult:
                print(" ", ult, r.get("North American Industry Classification System (NAICS)"), r["VALUE"], r.get("STATUS"))
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("14-10-0292-01 EPA de los territorios: Nunavut, últimos meses, desestacionalizada (más series)")
    try:
        sel = {}
        for r in tabla("14100292"):
            if r["GEO"] == "Nunavut" and r["REF_DATE"] >= "2026-01" and r.get("Gender") == "Total - Gender" and r.get("Age group") == "15 years and over" and r.get("Statistics") == "Estimate" and r.get("Data type") == "Seasonally adjusted":
                sel.setdefault(r["REF_DATE"], {})[r["Labour force characteristics"]] = r["VALUE"]
        for k in sorted(sel):
            print(" ", k, sel[k])
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 3. Clima
if "clima" in PARTES:
    API = "https://api.weather.gc.ca/collections"
    for cid in ["2402590", "2402594", "2303401", "2400600", "2300500", "2300902"]:
        paso(f"Normales: {cid}")
        try:
            d = json.loads(get(f"{API}/climate-normals/items?" + urllib.parse.urlencode({"f": "json", "CLIMATE_IDENTIFIER": cid, "limit": 3000}), 120)[0])
            feats = d["features"]
            if not feats:
                print("sin normales")
                continue
            p0 = feats[0]["properties"]
            print("estación:", p0.get("STATION_NAME"), "| período:", {k: p0.get(k) for k in p0 if "YEAR" in k or "PERIOD" in k or "NORMAL_CODE" in k})
            filas = {}
            for f in feats:
                p = f["properties"]
                filas.setdefault(p.get("E_NORMAL_ELEMENT_NAME"), {})[p.get("MONTH")] = p.get("VALUE")
            for el, meses in filas.items():
                if el and any(k in el for k in ["Mean daily temperature", "Mean daily max", "Mean daily min", "Total precipitation", "Total snowfall", "Extreme min", "Days with max temp"]):
                    print(" ", el, dict(sorted(meses.items(), key=lambda kv: (kv[0] is None, kv[0]))))
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 4. Páginas complementarias
PAGINAS = [
    ("Job Bank: panorama económico de los territorios (Nunavut)", "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/nunavut/environmental-scan", r"Nunavut|2025|2026|mining|mine|Agnico|Baffinland|public administration|construction|unemployment|Iqaluit"),
    ("IRCC: Immigrate to Nunavut", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees/nunavut.html", r"Nunavut|nominee|program|Express Entry|work permit|immigrat"),
    ("IRCC: PNP (enlaces de provincias)", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html", r"Nunavut"),
    ("Nutrition North: comunidades elegibles", "https://www.nutritionnorthcanada.gc.ca/eng/1415540731169/1415540791407", r"Nunavut|Arctic Bay|Iqaluit|Grise|Resolute|Rankin|Cambridge|subsidy level|level 1|level 2|level 3"),
    ("Nutrition North: cómo funciona", "https://www.nutritionnorthcanada.gc.ca/eng/1415538638170/1415538670874", r"subsid|retailer|point of sale|receipt|per kilogram|eligible|pass"),
    ("Qiniq (internet en Nunavut)", "https://www.qiniq.com/", r"internet|satellite|communit|plan|Nunavut|25"),
    ("Nunavut Fibre Link (Gobierno de Canadá)", "https://www.canada.ca/en/crown-indigenous-relations-northern-affairs/news/2023/06/government-of-canada-announces-funding-for-a-fibre-link-to-nunavut.html", r"fibre|Iqaluit|Kimmirut|satellite|kilometre|2026|2027|internet"),
    ("Canadian North (copia archivada)", "http://web.archive.org/web/2026/https://canadiannorth.com/", r"Iqaluit|Rankin|Cambridge|Ottawa|Montreal|Edmonton|Yellowknife|Winnipeg|route|destinations"),
    ("Statistics Canada: The Daily — población territorial (estimaciones)", "https://www150.statcan.gc.ca/n1/daily-quotidien/260917/dq260917a-eng.htm", r"Nunavut|territor"),
    ("Gobierno de Canadá: Inuit Nunangat", "https://www.rcaanc-cirnac.gc.ca/eng/1100100014187/1534785248701", r"Inuit|Nunangat|Nunavut|regions|land claim"),
    ("Gobierno de Canadá: Acuerdo de Nunavut", "https://www.rcaanc-cirnac.gc.ca/eng/1100100030601/1638296976594", r"Nunavut Agreement|1993|Inuit|largest|land"),
    ("ECCC: datos históricos de Iqaluit (página de la estación)", "https://climate.weather.gc.ca/climate_normals/results_1981_2010_e.html?stnID=1758&autofwd=1", r"Daily Average|January|July|Snowfall|Extreme Minimum"),
]
if "paginas" in PARTES:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(locale="en-CA")
        for nombre, url, patron in PAGINAS:
            paso(f"Página: {nombre}")
            print("URL:", url)
            pg = ctx.new_page()
            try:
                r = pg.goto(url, wait_until="domcontentloaded", timeout=90000)
                pg.wait_for_timeout(4000)
                t = pg.inner_text("body")
                print("estado:", r.status if r else None, "| final:", pg.url[:160], "| título:", pg.title()[:110], "| caracteres:", len(t))
                if len(t) > 300 and not re.search(r"Just a moment|Radware|Access denied|captcha", t[:800], re.I):
                    mostrar(t, patron, ventana=2, maximo=60)
                    if "PNP (enlaces" in nombre:
                        for a in pg.query_selector_all("a"):
                            h, tx = a.get_attribute("href") or "", (a.inner_text() or "").strip()
                            if "unavut" in h + tx:
                                print("  enlace:", tx, "->", h)
                else:
                    print("  (sin contenido legible: protección contra robots o página vacía)")
            except Exception as e:
                print("ERROR", type(e).__name__, str(e)[:150])
            pg.close()
        b.close()
