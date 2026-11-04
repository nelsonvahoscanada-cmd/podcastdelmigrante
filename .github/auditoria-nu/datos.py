"""Auditoría de Nunavut (solo lectura): cifras vigentes y fuentes oficiales actuales."""
import csv, gzip, html, io, json, re, time, urllib.parse, urllib.request, zipfile

UA = {"User-Agent": "Mozilla/5.0 (auditoria de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=180, data=None, hdr=None):
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={**UA, **(hdr or {})}, data=data)
            with urllib.request.urlopen(req, timeout=t) as r:
                b = r.read()
                return (gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b), r.status
        except urllib.error.HTTPError as e:
            if i == 2: return b"", e.code
        except Exception as e:
            if i == 2: return str(e).encode(), "error"
        time.sleep(6)


def texto(b):
    h = b.decode("utf-8", "ignore") if isinstance(b, bytes) else b
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def mostrar(t, pat, maximo=25, ventana=2):
    n = 0
    lin = t.split("\n")
    for i, l in enumerate(lin):
        if re.search(pat, l, re.I):
            print("  >", " | ".join(x.strip() for x in lin[i:i + ventana] if x.strip())[:600]); n += 1
            if n >= maximo: break
    if not n: print("  (sin coincidencias)")


def paso(n): print(f"\n=== {n} ===", flush=True)


# 1. Metadatos de las tablas de StatCan (fecha de publicación y último período)
paso("StatCan: últimas publicaciones")
pids = [17100009, 17100005, 14100292, 14100223, 36100222, 36100402, 18100004, 17100008, 17100040]
b, st = get("https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata", data=json.dumps([{"productId": p} for p in pids]).encode(), hdr={"Content-Type": "application/json"})
try:
    for o in json.loads(b):
        o = o["object"]; print(f"  {o['productId']}: {o['cubeTitleEn'][:70]} | inicio {o['cubeStartDate']} fin {o['cubeEndDate']} | publicado {o['releaseTime']}")
except Exception as e:
    print("ERROR", st, b[:200])


def tabla(pid, filtro, n=6):
    b, st = get(f"https://www150.statcan.gc.ca/t1/tbl1/en/dtl!downloadDbLoadingData-nonTraduit.action?pid={pid}01&latestN=13&startDate=&endDate=&csvLocale=en&selectedMembers=&checkedLevels=", 300)
    filas = []
    try:
        r = csv.DictReader(io.StringIO(b.decode("utf-8-sig", "ignore")))
        for f in r:
            if filtro(f): filas.append(f)
    except Exception as e:
        print("ERROR", e)
    if not filas:
        b, st = get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 600)
        try:
            z = zipfile.ZipFile(io.BytesIO(b))
            with z.open(f"{pid}.csv") as fh:
                for f in csv.DictReader(io.TextIOWrapper(fh, "utf-8-sig")):
                    if filtro(f): filas.append(f)
        except Exception as e:
            print("ERROR zip", st, e)
    for f in filas[-n:]:
        print("  ", f.get("REF_DATE"), "|", f.get("GEO"), "|", " | ".join(str(v) for k, v in f.items() if k not in ("REF_DATE", "GEO", "DGUID", "UOM_ID", "SCALAR_ID", "VECTOR", "COORDINATE", "STATUS", "SYMBOL", "TERMINATED", "DECIMALS", "SCALAR_FACTOR"))[:300])


paso("17-10-0009 población Nunavut")
tabla(17100009, lambda f: f["GEO"] == "Nunavut", 6)
paso("14-10-0292 desempleo Nunavut (desestacionalizado)")
tabla(14100292, lambda f: f["GEO"] == "Nunavut" and "nemployment rate" in f.get("Labour force characteristics", "") and "Seasonally adjusted" in f.get("Data type", f.get("Statistics", "")), 6)
paso("14-10-0223 ganancias semanales Nunavut")
tabla(14100223, lambda f: f["GEO"] == "Nunavut" and "Average weekly earnings" in f.get("Estimate", "") and f.get("North American Industry Classification System (NAICS)", "").startswith("Industrial aggregate excluding"), 4)
paso("18-10-0004 IPC Iqaluit, todos los artículos")
tabla(18100004, lambda f: "Iqaluit" in f["GEO"] and f.get("Products and product groups") in ("All-items", "Food", "Shelter", "Energy"), 16)

# 2. Salario mínimo: tabla federal actual
paso("Salarios mínimos (tabla federal)")
for u in ["https://minwage-salairemin.service.canada.ca/en/general.html"]:
    b, st = get(u)
    print("estado:", st, len(b))
    t = texto(b)
    mostrar(t, r"Nunavut|Yukon|Northwest|British Columbia|Ontario|Federal|Alberta", 30, 4)
    if st != 200:
        q = {"url": u, "output": "json", "fl": "timestamp,statuscode", "filter": "statuscode:200", "limit": "-3"}
        c, _ = get("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q))
        print("archivo:", c[:300])

# 3. Fuentes oficiales para información práctica que falta
PAGINAS = [
    ("CRA deducción para residentes del norte", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions.html", r"Nunavut|zone|\$\d+|per day|travel"),
    ("CRA zonas prescritas", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions/places-prescribed-zones.html", r"Nunavut|entire|all of"),
    ("CRA Nunavut child benefit", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/nunavut.html", r"Nunavut child benefit|territorial workers|\$\d|eligib|paid"),
    ("CRA Canada Child Benefit", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html", r"maximum|\$\d|July 2026|newcomer"),
    ("Guarderías Nunavut (acuerdo federal)", "https://www.canada.ca/en/early-learning-child-care-agreement/agreements-provinces-territories/nunavut.html", r"\$10|per day|spaces|2026|fees"),
    ("IRCC PNP", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html", r"Nunavut|Quebec"),
    ("IRCC Rural Community Immigration Pilot", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration.html", r"Nunavut|communit|Yukon|Northwest"),
    ("IRCC Francophone Community Immigration Pilot", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/francophone-immigration.html", r"Nunavut|communit"),
    ("Nutrition North", "https://www.nutritionnorthcanada.gc.ca/eng/1415385762263/1415385790537", r"million|communities|Harvesters|202\d"),
    ("Nutrition North comunidades NU", "https://www.nutritionnorthcanada.gc.ca/eng/1415540731169/1415540791407", r"Nunavut|Iqaluit|Arviat"),
    ("Canadian North", "https://www.canadiannorth.com/", r"Iqaluit|Nunavut|destinations"),
    ("Calm Air", "https://www.calmair.com/", r"Rankin|Nunavut"),
    ("NULC alcohol", "https://www.nulc.ca/", r"alcohol|beer|wine|permit|Iqaluit|Rankin"),
    ("Qiniq", "https://www.qiniq.com/", r"communit|plan|\$\d|unlimited"),
    ("Northwestel Nunavut", "https://www.nwtel.ca/", r"Nunavut|Iqaluit|internet"),
    ("CRTC 911", "https://crtc.gc.ca/eng/phone/911/", r"Nunavut|9-1-1 is available|territor"),
    ("Job Bank salario y perspectivas NU", "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/nunavut/environmental-scan", r"unemploy|Nunavut|mine|2026|housing"),
    ("CMHC alquiler (Rental Market Report)", "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/market-reports/rental-market-reports-major-markets", r"Iqaluit|Nunavut"),
    ("Service Canada en Nunavut", "https://www.servicecanada.gc.ca/tbsc-fsco/sc-hme.jsp?lang=eng", r"Iqaluit|Nunavut"),
    ("ECCC normales 1991-2020 (estaciones NU)", "https://climate.weather.gc.ca/climate_normals/station_select_1991_2020_e.html?searchType=stnProv&lstProvince=NU", r"IQALUIT|RANKIN|CAMBRIDGE"),
]
for nombre, u, pat in PAGINAS:
    paso(nombre + " — " + u)
    b, st = get(u, 90)
    t = texto(b)
    print("estado:", st, "| caracteres:", len(t), "| título:", (re.search(r"<title>([^<]*)", b.decode("utf-8", "ignore")) or [None, ""])[1].strip()[:100])
    mostrar(t, pat, 14)
    time.sleep(2)

# 4. API de normales (Iqaluit) y estaciones de Nunavut
paso("API normales ECCC — Iqaluit")
for q in ["CLIMATE_IDENTIFIER=2402590", "STATION_NAME=IQALUIT%20A", "PROVINCE_CODE=NU&MONTH=1&NORMAL_ID=1"]:
    b, st = get(f"https://api.weather.gc.ca/collections/climate-normals/items?f=json&limit=40&{q}", 90)
    try:
        d = json.loads(b); fe = d.get("features", [])
        print(" ", q, "→", d.get("numberMatched"), "resultados;", sorted({(f["properties"].get("STATION_NAME"), f["properties"].get("CLIMATE_IDENTIFIER"), f["properties"].get("PERIOD") or f["properties"].get("NORMAL_CODE")) for f in fe})[:20])
        for f in fe[:6]:
            p = f["properties"]; print("    ", {k: p.get(k) for k in ("STATION_NAME", "MONTH", "E_NORMAL_ELEMENT_NAME", "VALUE", "FIRST_YEAR", "LAST_YEAR", "PERIOD_BEGIN", "PERIOD_END")})
    except Exception as e:
        print(" ", q, "ERROR", st, b[:150])

# 5. Gobierno de Nunavut (Internet Archive): 911, encuesta de precios, alcohol, guarderías, licencias
paso("Internet Archive: páginas del Gobierno de Nunavut")
q = {"url": "www.gov.nu.ca/", "matchType": "prefix", "output": "json", "fl": "original,timestamp", "filter": "statuscode:200", "collapse": "urlkey", "from": "2025", "limit": "60000"}
b, st = get("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), 400)
try:
    filas = json.loads(b or b"[]")[1:]
except Exception:
    filas = []; print("ERROR CDX", st, b[:200])
print("direcciones archivadas desde 2025:", len(filas))
ult = {}
for o, ts in filas:
    u = re.sub(r"^https?://(www\.)?", "", o).split("?")[0].rstrip("/")
    if u not in ult or ts > ult[u][1]: ult[u] = (o, ts)
TEMAS = [
    ("911", r"911|emergency-services|emergency-number", r"911|launch|emergenc|communit|dispatch"),
    ("precios de alimentos", r"food-price|price-survey|cost-of-living", r"\$\d|price|survey|food|times|%"),
    ("alcohol", r"alcohol|liquor|cannabis-and-alcohol|restricted", r"restricted|prohibit|committee|permit|communit|unrestricted"),
    ("guarderías", r"child-care|childcare|early-learning|daycare", r"\$10|per day|fee|licensed|subsid|space"),
    ("licencias de conducir", r"drivers-licen|driver-licen|motor-vehicle", r"exchange|country|test|days|resident|licen"),
    ("vivienda personal GN", r"staff-housing|employee-housing|housing-for-employees", r"rent|staff|employee|\$\d|eligib"),
    ("asignación del norte", r"northern-allowance|allowance", r"Northern Allowance|\$\d|communit"),
    ("inmigración", r"immigra|newcomer", r"immigra|federal|program|newcomer|work permit|employer"),
    ("estadísticas", r"bureau-statistics|nunavut-bureau|statistics", r"population|estimate|price|survey|2026|2025"),
]
for nombre, url_re, frases in TEMAS:
    cand = sorted([(u, v) for u, v in ult.items() if re.search(url_re, u, re.I) and not re.search(r"/(fr|iu|ikt|in)/|\.(pdf|css|js|png|jpg)$", u)], key=lambda x: (len(x[0]), x[0]))
    paso(f"Tema {nombre}: {len(cand)} direcciones")
    for u, (o, ts) in cand[:15]: print("   ", ts[:8], u)
    for u, (o, ts) in cand[:2]:
        b, st = get(f"http://web.archive.org/web/{ts}id_/{o}", 90)
        t = texto(b); print(f"  -- {ts[:8]} {u}: estado {st}, {len(t)} caracteres"); mostrar(t, frases, 12)
        time.sleep(3)
