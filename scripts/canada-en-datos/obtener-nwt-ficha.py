"""
obtener-nwt-ficha.py — Verificación de las cifras y fuentes de la ficha de los Territorios del Noroeste (solo lectura)
================================================================================================
Se ejecuta en GitHub Actions (el entorno de desarrollo no tiene acceso a estos
servidores), en partes:
  statcan    tablas de Statistics Canada con filas de los Territorios del Noroeste: población
             estimada, PIB, Encuesta de Población Activa de los territorios,
             salarios, inmigración y vivienda. Imprime los nombres de serie
             tal como vienen en cada archivo.
  perfil     Perfil del Censo 2021 (página oficial) de NWT y de Yellowknife:
             identidad indígena, lenguas, inmigración, vivienda e ingresos.
  mapa       sitemaps del Gobierno de los Territorios del Noroeste y de otros sitios oficiales,
             filtrados por palabras clave, para encontrar las páginas vigentes.
  paginas    páginas oficiales: estado, título, fecha y frases clave. Si una
             página necesita JavaScript, se abre con un navegador normal (sin
             sortear ninguna protección).
  clima      normales climáticas de Environment and Climate Change Canada
             (API MSC GeoMet) de las estaciones de NWT con normales.
  salario    tabla federal de salarios mínimos.
Uso: python3 obtener-nu-ficha.py <parte> [<parte> …]
"""
import csv, gzip, html, io, json, re, sys, time, urllib.parse, urllib.request, zipfile

PARTES = sys.argv[1:] or ["statcan", "perfil", "mapa", "paginas", "clima", "salario"]
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


def mostrar(t, patron, ventana=3, maximo=30):
    lineas, vistos, n = t.split("\n"), set(), 0
    for i, l in enumerate(lineas):
        if re.search(patron, l, re.I) and i not in vistos:
            vistos.update(range(i, i + ventana))
            print("  >", " | ".join(x.strip() for x in lineas[max(0, i - 1): i + ventana] if x.strip())[:900])
            n += 1
            if n >= maximo:
                break


def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)[0]))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig"))


GEOX = "Northwest Territories"


def filas_nu(pid, desde="2019"):
    """Filas de los Territorios del Noroeste (GEO exacto) desde el año indicado."""
    return [r for r in tabla(pid) if r.get("GEO", "") == GEOX and r.get("REF_DATE", "") >= desde]


# ------------------------------------------------------------ 1. Statistics Canada
if "statcan" in PARTES:
    paso("17-10-0009-01 Población estimada (últimos 10 trimestres)")
    f = [r for r in tabla("17100009") if r["GEO"] == GEOX]
    for r in f[-10:]:
        print(" ", r["REF_DATE"], r["VALUE"])

    paso("17-10-0005-01 Población estimada por edad (1 de julio, total y mediana)")
    try:
        for r in tabla("17100005"):
            if r["GEO"] == GEOX and r["REF_DATE"] >= "2024" and r.get("Gender", r.get("Sex", "")) in ("Total - gender", "Both sexes", "Total - Gender") and r["Age group"] in ("All ages", "Median age"):
                print(" ", r["REF_DATE"], r["Age group"], r["VALUE"])
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("17-10-0008-01 Componentes del crecimiento (inmigrantes, emigración interprovincial)")
    try:
        for r in tabla("17100008"):
            if r["GEO"] == GEOX and r["REF_DATE"] >= "2022":
                print(" ", r["REF_DATE"], r["Components of population growth"], r["VALUE"])
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("36-10-0222-01 PIB a precios de mercado, dólares corrientes")
    for r in tabla("36100222"):
        if r["GEO"] == GEOX and r["Prices"] == "Current prices" and r["Estimates"] in ("Gross domestic product at market prices",) and r["REF_DATE"] >= "2020":
            print(" ", r["REF_DATE"], r["VALUE"], r["SCALAR_FACTOR"])

    paso("36-10-0402-01 PIB por industria (dólares encadenados de 2017), último año: sectores de 2 dígitos")
    try:
        todas = [r for r in tabla("36100402") if r["GEO"] == GEOX]
        ult = max(r["REF_DATE"] for r in todas)
        print("columnas:", list(todas[0].keys()))
        for r in todas:
            ind = r.get("North American Industry Classification System (NAICS)", "")
            if r["REF_DATE"] == ult and "Chained" in r.get("Value", "") and (re.search(r"\[(1[01]|2[123]|31-33|4[1-9]|44-45|48-49|5[1-6]|6[12]|7[12]|81|91)\]$", ind) or ind.startswith("All industries")):
                print(" ", r["REF_DATE"], ind, r["VALUE"], r.get("SCALAR_FACTOR"))
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    for pid, nombre in (("14100292", "EPA de los territorios, media móvil de 3 meses"), ("14100393", "EPA por región económica, anual"), ("14100327", "EPA anual por provincia"), ("14100287", "EPA mensual por provincia")):
        paso(f"{pid[:2]}-{pid[2:4]}-{pid[4:]} {nombre}: series con NWT")
        try:
            f = filas_nu(pid, "2024")
            print("filas NWT:", len(f), "| columnas:", list(f[0].keys())[:14] if f else "-")
            sel = {}
            for r in f:
                lfc = r.get("Labour force characteristics", "")
                if lfc in ("Unemployment rate", "Participation rate", "Employment rate", "Employment", "Population") and r.get("Statistics", "Estimate") == "Estimate" and r.get("Gender", r.get("Sex", "Total - Gender")) in ("Total - Gender", "Both sexes") and r.get("Age group", "15 years and over") == "15 years and over":
                    sel.setdefault(r["REF_DATE"] + " " + r.get("Data type", ""), {})[lfc] = r["VALUE"]
            for k in sorted(sel)[-8:]:
                print(" ", k, sel[k])
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

    paso("14-10-0064-01 Salarios por hora, todas las industrias")
    try:
        for r in filas_nu("14100064", "2024"):
            if r["Type of work"] == "Both full- and part-time employees" and r["North American Industry Classification System (NAICS)"].startswith("Total employees, all industries") and r["Gender"] == "Total - Gender" and r["Age group"] == "15 years and over" and "hourly" in r["Wages"].lower():
                print(" ", r["REF_DATE"], r["Wages"], r["VALUE"])
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("14-10-0223-01 SEPH: ganancias semanales promedio, todas las industrias")
    try:
        for r in filas_nu("14100223", "2025"):
            if r.get("Estimate", "").startswith("Average weekly earnings") and r.get("North American Industry Classification System (NAICS)", "").startswith("Industrial aggregate excluding unclassified"):
                print(" ", r["REF_DATE"], r.get("Estimate"), r["VALUE"])
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("18-10-0004-01 IPC (Yellowknife), último dato")
    try:
        f = [r for r in tabla("18100004") if r["GEO"] == "Yellowknife, Northwest Territories" and r["Products and product groups"] in ("All-items", "Food", "Shelter")]
        for r in f[-9:]:
            print(" ", r["REF_DATE"], r["Products and product groups"], r["VALUE"])
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("98-10-0307-01 Censo 2021: estatus de inmigrante (NWT)")
    try:
        for r in tabla("98100307"):
            if r["GEO"] == GEOX and r["Age (8D)"] == "Total - Age" and r["Gender (3)"] == "Total - Gender":
                pob = r["Place of birth (290)"]
                if pob in ("Total – Place of birth", "Philippines", "India", "Nigeria", "United Kingdom", "United States of America", "Americas", "Central America", "South America", "Mexico", "Colombia", "China", "Viet Nam", "Pakistan", "Ethiopia", "Somalia", "Eritrea", "Zimbabwe", "Venezuela", "Peru", "Chile", "Brazil", "Caribbean and Bermuda", "Jamaica", "El Salvador", "Guatemala", "Honduras", "Cuba", "Argentina", "Ecuador", "Bolivia", "Nicaragua", "Dominican Republic", "Africa", "Asia", "Europe"):
                    print(" ", pob, {k.split(":")[1].split("[")[0]: v for k, v in r.items() if k.startswith("Immigrant status") and k.split(":")[1].split("[")[0] in ("Total - Immigrant status and period of immigration", "Non-immigrants", "Immigrants", "2016 to 2021", "Non-permanent residents")})
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    for pid, nombre in (("98100222", "conocimiento de idiomas oficiales"), ("98100218", "lengua materna")):
        paso(f"{pid[:2]}-{pid[2:4]}-{pid[4:]} Censo 2021: {nombre} (NWT)")
        try:
            for r in tabla(pid):
                if r["GEO"] == GEOX and r.get("Age (13B)", "Total - Age") == "Total - Age":
                    k = [c for c in r if c.startswith("Knowledge") or c.startswith("Mother tongue")][0]
                    if re.search(r"Total|English|French|Indigenous|Dene|Tlicho|Tłı̨chǫ|Slave|Slavey|Chipewyan|Gwich|Cree|Inuvialuktun|Inuinnaqtun|Inuktitut|Non-official|Tagalog|Spanish|Arabic|Vietnamese|Amharic", r[k]):
                        print(" ", r[k], "|", r.get("Statistics (6A):2021 Counts[1]"), "|", r.get("Statistics (6A):% distribution (2021)[2]"))
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

    paso("98-10-0264-01 Censo 2021: identidad indígena (NWT)")
    try:
        for r in tabla("98100264"):
            if r["GEO"] == GEOX:
                vals = {k: v for k, v in r.items() if v and k not in ("REF_DATE", "GEO", "DGUID") and not k.startswith("Symbol")}
                print(" ", json.dumps(vals, ensure_ascii=False)[:600])
                break
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("34-10-0133-01 / 34-10-0127-01 CMHC (alquiler y desocupación): ¿hay Yellowknife o NWT?")
    for pid in ("34100133", "34100127"):
        try:
            geos = sorted({r["GEO"] for r in tabla(pid) if "Northwest Territories" in r["GEO"] or "Yellowknife" in r["GEO"]})
            print(pid, geos or "sin filas de NWT")
        except Exception as e:
            print("ERROR", pid, type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 2. Perfil del Censo 2021 (página oficial)
PERFILES = {
    "Northwest Territories": "2021A000261",
    "Yellowknife": "2021A00056106023",
}
if "perfil" in PARTES:
    for nombre, dguid in PERFILES.items():
        url = f"https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist={dguid}&GENDERlist=1&STATISTIClist=1,4&HEADERlist=0"
        paso(f"Perfil del Censo 2021: {nombre}")
        print("URL:", url)
        try:
            b, st, final = get(url, 180)
            t = texto(b)
            print("estado:", st, "| caracteres:", len(t))
            mostrar(t, r"^Total - (Indigenous identity|Mother tongue|Knowledge of languages|Language spoken most often|Immigrant status|Private households by tenure|Owner and tenant households|Tenant households)|^ ?(Inuk|Inuit|First Nations|Métis|Inuktitut|Inuinnaqtun|Inuktut|Inuit languages|English|French|Immigrants|Non-immigrants|Non-permanent residents|Owner|Renter|Dwelling provided by the local government|% of tenant households in subsidized housing|% of tenant households spending 30%|Median monthly shelter costs for rented dwellings|Average monthly shelter costs for rented dwellings|Median total income of household|Median total income in 2020 among recipients|Average household size|Population, 2021|Population, 2016|Median age|Average age|Total - Age|0 to 14 years|65 years and over|Unemployment rate|Participation rate|Employment rate|Not suitable|Major repairs needed|% of owner households)\b", ventana=1, maximo=120)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 3. Sitemaps oficiales (descubrir páginas vigentes)
SITEMAPS = [
    "https://www.gov.nt.ca/sitemap.xml",
    "https://www.immigratenwt.ca/sitemap.xml",
    "https://www.ece.gov.nt.ca/sitemap.xml",
    "https://www.hss.gov.nt.ca/sitemap.xml",
    "https://www.nwthc.gov.nt.ca/sitemap.xml",
    "https://www.inf.gov.nt.ca/sitemap.xml",
    "https://www.iti.gov.nt.ca/sitemap.xml",
    "https://www.statsnwt.ca/sitemap.xml",
    "https://www.yellowknife.ca/sitemap.xml",
    "https://www.auroracollege.nt.ca/sitemap.xml",
    "https://www.nthssa.ca/sitemap.xml",
    "https://www.justice.gov.nt.ca/sitemap.xml",
    "https://www.fin.gov.nt.ca/sitemap.xml",
]
CLAVES = r"minimum-wage|wage|labour-standard|employment-standard|health-care|health-insurance|healthcare-card|health-card|coverage|medical-travel|nurse|health-centre|health-center|hospital|qikiqtani|housing|rent|tenant|landlord|staff-housing|homeownership|immigra|newcomer|nominee|settle|language|inuktut|inuktitut|inuinnaqtun|official-language|time-zone|daylight|statistic|population|census|food|nutrition|cost-of-living|income-assist|child|school|education|student|fanu|financial-assist|driver|licen|vehicle|emergency|911|police|rcmp|internet|broadband|climate|weather|job|employ|career|trades|apprentic|certif|tourism|flag|symbol|capital|power|fuel|airport|travel|ferry|ice-road|winter-road|highway|ntnp|business-stream|employer-driven|express-entry|francophone|cost|northern|dene|tlicho|gwich|metis|indigenous|aurora|inuvik|hay-river|fort-smith"
if "mapa" in PARTES:
    for sm in SITEMAPS:
        paso(f"Sitemap: {sm}")
        try:
            pendientes, vistos, urls = [sm], set(), []
            while pendientes and len(vistos) < 40:
                u = pendientes.pop(0)
                if u in vistos:
                    continue
                vistos.add(u)
                b, st, final = get(u, 60)
                locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", b.decode("utf-8", "ignore"))
                for l in locs:
                    (pendientes if l.endswith(".xml") or "sitemap" in l.split("/")[-1] else urls).append(html.unescape(l))
            print("sitemaps leídos:", len(vistos), "| URL:", len(urls))
            for u in sorted({u for u in urls if re.search(CLAVES, u, re.I) and not re.search(r"/(fr|iu|ikt)/|/fr$|/iu$|/ikt$", u)})[:400]:
                print("  ", u)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 4. Páginas oficiales (lista revisable)
PAGINAS = [l.split("\t") for l in open(__file__.replace("obtener-nwt-ficha.py", "nwt-paginas.txt"), encoding="utf-8").read().splitlines() if l.strip() and not l.startswith("#")] if "paginas" in PARTES else []
if "paginas" in PARTES:
    pendientes = []
    for nombre, url, patron in PAGINAS:
        paso(f"Página: {nombre}")
        print("URL:", url)
        try:
            b, st, final = get(url, 40)
            t = texto(b)
            if len(t) < 400 or re.search(r"Just a moment|Radware|Access denied|captcha|enable JavaScript", t[:800], re.I):
                print("estado:", st, "| sin contenido legible por lectura directa (", len(t), "caracteres )")
                pendientes.append((nombre, url, patron))
                continue
            tit = re.search(r"(?is)<title[^>]*>(.*?)</title>", b.decode("utf-8", "ignore"))
            m = re.search(r"(Last updated|Updated|Date modified|Published|Posted)[:\s]+([A-Za-z0-9 ,.-]{6,30})", t)
            print("estado:", st, "| final:", final[:140], "| título:", html.unescape(tit.group(1)).strip()[:100] if tit else "", "|", m.group(0)[:60] if m else "fecha no indicada", "| caracteres:", len(t))
            mostrar(t, patron)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:150])
            pendientes.append((nombre, url, patron))
        time.sleep(1)
    if pendientes:
        paso(f"Navegador para {len(pendientes)} páginas")
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(locale="en-CA")
            for nombre, url, patron in pendientes:
                paso(f"Navegador: {nombre}")
                pg = ctx.new_page()
                try:
                    r = pg.goto(url, wait_until="domcontentloaded", timeout=60000)
                    pg.wait_for_timeout(4000)
                    t = pg.inner_text("body")
                    print("estado:", r.status if r else None, "| final:", pg.url[:140], "| título:", pg.title()[:100], "| caracteres:", len(t))
                    if len(t) > 300 and not re.search(r"Just a moment|Radware|Access denied|captcha", t[:800], re.I):
                        mostrar(t, patron)
                    else:
                        print("  (sin contenido legible: protección contra robots o página vacía)")
                except Exception as e:
                    print("ERROR", type(e).__name__, str(e)[:150])
                pg.close()
            b.close()

# ------------------------------------------------------------ 5. Clima (ECCC, normales 1981-2010 / 1991-2020)
if "clima" in PARTES:
    API = "https://api.weather.gc.ca/collections"
    paso("Estaciones de NWT con normales")
    try:
        d = json.loads(get(f"{API}/climate-stations/items?" + urllib.parse.urlencode({"f": "json", "PROV_STATE_TERR_CODE": "NT", "limit": 500}), 120)[0])
        est = [f["properties"] for f in d["features"]]
        for p in est:
            if p.get("HAS_NORMALS_DATA") == "Y" or re.search(r"YELLOWKNIFE|INUVIK|HAY RIVER|FORT SMITH|NORMAN WELLS|FORT SIMPSON|BEHCHOKO|FORT PROVIDENCE|FORT MCPHERSON|TUKTOYAKTUK|FORT GOOD HOPE|FORT RESOLUTION", p.get("STATION_NAME", "")):
                print(" ", p.get("CLIMATE_IDENTIFIER"), p.get("STATION_NAME"), p.get("HAS_NORMALS_DATA"), p.get("FIRST_DATE", "")[:10], p.get("LAST_DATE", "")[:10])
        ids = [p["CLIMATE_IDENTIFIER"] for p in est if p.get("HAS_NORMALS_DATA") == "Y" and re.search(r"YELLOWKNIFE A$|INUVIK A$|HAY RIVER A$|FORT SMITH A$|NORMAN WELLS A$|FORT SIMPSON A$", p.get("STATION_NAME", ""))]
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])
        ids = []
    for cid in ids:
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
                if el and any(k in el for k in ["Mean daily temperature", "Mean daily max", "Mean daily min", "Total precipitation", "Total snowfall", "Extreme min"]):
                    print(" ", el, dict(sorted(meses.items(), key=lambda kv: (kv[0] is None, kv[0]))))
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 6. Salario mínimo (tabla federal)
if "salario" in PARTES:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for u in ["https://minwage-salairemin.service.canada.ca/en/general.html", "https://web.archive.org/web/2026/https://minwage-salairemin.service.canada.ca/en/general.html"]:
            paso(f"Salario mínimo: {u}")
            try:
                r = pg.goto(u, wait_until="networkidle", timeout=120000)
                pg.wait_for_timeout(5000)
                t = pg.inner_text("body")
                print("URL:", pg.url[:140], "| estado:", r.status if r else None, "| caracteres:", len(t))
                mostrar(t, r"Northwest|Nunavut|Yukon|Alberta|Federal|Date modified", ventana=2)
            except Exception as e:
                print("ERROR", type(e).__name__, str(e)[:150])
        b.close()
