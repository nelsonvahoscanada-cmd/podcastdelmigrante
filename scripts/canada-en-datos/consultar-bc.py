"""
consultar-bc.py — Exploración (solo lectura) de las fuentes oficiales de Columbia Británica
==========================================================================================
Se ejecuta en GitHub Actions (el entorno de desarrollo no tiene acceso a
estos servidores). No guarda nada: imprime qué ofrece cada fuente (capas,
campos, tipos y conteos) para decidir el criterio de inclusión antes de
programar la descarga definitiva (obtener-bc-*.py).
"""
import csv, io, json, re, sys, urllib.parse, urllib.request, zipfile

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def prueba(nombre, fn):
    paso(nombre)
    try:
        fn()
    except Exception as e:
        print("ERROR", type(e).__name__, e)


WFS = "https://openmaps.gov.bc.ca/geo/pub/wfs"


def wfs(capa, filtro=None, n=None, props=None, srs="EPSG:4326"):
    q = {"service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeName": capa, "outputFormat": "application/json", "srsName": srs}
    if n:
        q["count"] = n
    if filtro:
        q["CQL_FILTER"] = filtro
    if props:
        q["propertyName"] = props
    return json.loads(get(WFS + "?" + urllib.parse.urlencode(q), 600))


def capas_admin():
    xml = get(WFS + "?service=WFS&version=2.0.0&request=GetCapabilities", 300).decode("utf-8", "ignore")
    nombres = re.findall(r"<Name>([^<]+)</Name>", xml)
    print("capas totales:", len(nombres))
    for n in nombres:
        if re.search(r"ADMIN_BOUNDARIES|GNS_|GEOGRAPHICAL_NAMES|CENSUS|CEN_|HOSPITAL|SCHOOL|EDU_|INDIAN|RESERVE|FIRST_NATION|ELECTORAL|MUNICIPAL|REGIONAL_DISTRICT|POPULATION|LOCALIT|COMMUNIT", n, re.I):
            print("  ", n)


def muestra(capa, n=3, props=None):
    d = wfs(capa, n=n, props=props)
    print(capa, "total (numberMatched):", d.get("numberMatched"), "devueltos:", len(d.get("features", [])))
    for f in d.get("features", [])[:n]:
        p = f["properties"]
        print("   ", {k: v for k, v in p.items() if not isinstance(v, (dict, list))})


def municipios():
    d = wfs("WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP", props="ADMIN_AREA_NAME,ADMIN_AREA_ABBREVIATION,ADMIN_AREA_GROUP_NAME,ADMIN_AREA_GROUP_ABBREVIATION,OBJECTID")
    fs = d["features"]
    print("municipios:", len(fs))
    tipos = {}
    for f in fs:
        n = f["properties"]["ADMIN_AREA_NAME"]
        m = re.match(r"^(.*?) of ", n)
        k = m.group(1) if m else ("(sin prefijo) " + n)
        tipos[k] = tipos.get(k, 0) + 1
    for k, v in sorted(tipos.items(), key=lambda x: -x[1]):
        print("   ", v, k)
    print("   ejemplo:", fs[0]["properties"])


def regionales():
    d = wfs("WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_REGIONAL_DISTRICTS_SP", props="ADMIN_AREA_NAME,ADMIN_AREA_ABBREVIATION,OBJECTID")
    print("distritos regionales:", len(d["features"]))
    for f in d["features"]:
        print("   ", f["properties"])


def nombres():
    capa = "WHSE_BASEMAPPING.GNS_GEOGRAPHICAL_NAMES_SP"
    d = wfs(capa, n=2)
    print("campos:", list(d["features"][0]["properties"]))
    print("ejemplo:", d["features"][0]["properties"])
    for t in ["City", "Town", "Village", "District Municipality", "Community", "Locality", "Indian Reserve", "Indian Government District", "Island Municipality", "Regional District", "Resort Municipality", "Mountain Resort Municipality", "Regional Municipality", "Indian Settlement", "Settlement", "Urban Community", "Recreational Community", "Railway Point", "First Nation Village", "Treaty Settlement Land", "Former Locality"]:
        try:
            r = wfs(capa, filtro=f"FEATURE_TYPE='{t}'", n=1)
            print(f"   FEATURE_TYPE={t!r}: {r.get('numberMatched')}")
        except Exception as e:
            print("   ERROR", t, e)


def statcan_tabla(pid, filtro, maxi=8):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)))
    nombre = [n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n][0]
    r = csv.reader(io.TextIOWrapper(zf.open(nombre), encoding="utf-8-sig"))
    cab = next(r)
    print(pid, "columnas:", cab[:12], "…", len(cab))
    n = 0
    tipos = {}
    for f in r:
        if filtro(f):
            n += 1
            m = re.search(r"\(([^()]+)\)\s*$", f[1])
            if m:
                tipos[m.group(1)] = tipos.get(m.group(1), 0) + 1
            if n <= maxi:
                print("   ", f[:6])
    print("   filas BC:", n, "tipos (sufijo del nombre):", sorted(tipos.items(), key=lambda x: -x[1])[:40])


def censo():
    statcan_tabla("98100002", lambda f: re.match(r"^2021A0005(59\d{5})$", f[2] if len(f) > 2 else "") is not None)


def dpl():
    for pid in ("98100011", "98100012", "98100013", "98100014", "98100016"):
        try:
            zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)))
            meta = [n for n in zf.namelist() if "MetaData" in n]
            if meta:
                txt = zf.open(meta[0]).read().decode("utf-8-sig", "ignore")
                print(pid, "título:", txt.splitlines()[1][:200])
            nombre = [n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n][0]
            r = csv.reader(io.TextIOWrapper(zf.open(nombre), encoding="utf-8-sig"))
            cab = next(r)
            filas = [f for f in r if len(f) > 2 and ("British Columbia" in f[1] or re.match(r"^2021[A-Z]\d{4}59", f[2]))]
            print("   columnas:", cab[:8], "filas BC:", len(filas))
            for f in filas[:6]:
                print("     ", f[:5])
            pref = {}
            for f in filas:
                k = f[2][:9]
                pref[k] = pref.get(k, 0) + 1
            print("   prefijos DGUID:", pref)
        except Exception as e:
            print("ERROR", pid, e)


def er():
    url = "https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=1368923"
    html = get(url, 300).decode("utf-8", "ignore")
    texto = re.sub(r"<[^>]+>", " ", html)
    for m in re.finditer(r"59\d\d[^0-9]{1,120}", texto):
        s = re.sub(r"\s+", " ", m.group(0)).strip()
        if len(s) > 6:
            print("   ", s[:140])


def epa():
    zf = zipfile.ZipFile(io.BytesIO(get("https://www150.statcan.gc.ca/n1/tbl/csv/14100393-eng.zip", 900)))
    nombre = [n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n][0]
    geos, ult = set(), ""
    for x in csv.DictReader(io.TextIOWrapper(zf.open(nombre), encoding="utf-8-sig")):
        if "British Columbia" in x["GEO"]:
            geos.add(x["GEO"])
            ult = max(ult, x["REF_DATE"])
    print("   regiones EPA:", sorted(geos), "último año:", ult)


def cmhc():
    for c in ["british-columbia", "vancouver", "victoria", "kelowna", "abbotsford-mission", "nanaimo", "kamloops", "chilliwack", "prince-george", "vernon", "penticton", "courtenay", "campbell-river", "fort-st-john", "squamish", "duncan", "parksville", "cranbrook", "williams-lake", "quesnel", "terrace", "prince-rupert", "nelson", "salmon-arm", "dawson-creek", "port-alberni", "powell-river", "west-kelowna"]:
        url = f"https://assets.cmhc-schl.gc.ca/sites/cmhc/professional/housing-markets-data-and-research/housing-data-tables/rental-market/rental-market-report-data-tables/2025/rmr-{c}-2025-en.xlsx"
        try:
            b = get(url, 120)
            print("   OK", c, len(b))
        except Exception as e:
            print("   --", c, e)


def ckan():
    for q in ["bc schools", "hospitals", "census subdivision", "electoral areas", "first nations", "population estimates municipalities", "geographical names"]:
        d = json.loads(get("https://catalogue.data.gov.bc.ca/api/3/action/package_search?rows=6&q=" + urllib.parse.quote(q), 120))["result"]
        print(f"  q={q!r}: {d['count']}")
        for p in d["results"]:
            print("     ", p["name"], "|", p["title"][:90], "|", [r.get("format") for r in p.get("resources", [])][:6])


def geo_statcan():
    for u in ["https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer?f=json", "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Digital_boundary_files/MapServer?f=json"]:
        try:
            d = json.loads(get(u, 120))
            print("  ", u, [(l["id"], l["name"]) for l in d.get("layers", [])])
        except Exception as e:
            print("   ERROR", u, e)


def paginas():
    for u in ["https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards/wages/minimum-wage", "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/municipalities", "https://www2.gov.bc.ca/gov/content/data/statistics/people-population-community/population/population-estimates"]:
        try:
            t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", get(u, 120).decode("utf-8", "ignore")))
            print("  ", u, len(t))
            for m in re.finditer(r"[^.]{0,200}(\$\d+\.\d\d|\d{3} municipalities|161|162|June 1, 202\d)[^.]{0,200}\.", t):
                print("      ", m.group(0)[:400])
        except Exception as e:
            print("   ERROR", u, e)


prueba("Capas WFS de interés", capas_admin)
prueba("Municipios (ABMS)", municipios)
prueba("Distritos regionales (ABMS)", regionales)
prueba("Nombres geográficos (BCGNIS)", nombres)
prueba("Censo 2021 CSD de BC", censo)
prueba("Lugares designados y centros de población", dpl)
prueba("Regiones económicas SGC 2021", er)
prueba("EPA BC", epa)
prueba("CMHC 2025 centros BC", cmhc)
prueba("Catálogo de datos de BC", ckan)
prueba("Límites de Statistics Canada (ArcGIS)", geo_statcan)
prueba("Páginas oficiales", paginas)
