"""
consultar-pei.py — Exploración (solo lectura) de las fuentes oficiales para Isla del Príncipe Eduardo
====================================================================================================
Se ejecuta en GitHub Actions (el entorno de desarrollo no llega a los sitios
oficiales). Comprueba qué fuentes responden y qué contienen, sin guardar nada.
Ronda 2: escuelas, hospitales, alquileres, estimaciones por subdivisión y hora.
"""
import csv, io, json, re, urllib.parse, urllib.request, zipfile

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def prueba(nombre, url, fn=None):
    try:
        b = get(url)
        print(f"OK {len(b)} bytes — {nombre} — {url}")
        if fn:
            fn(b)
    except Exception as e:
        print(f"ERROR {type(e).__name__} {str(e)[:120]} — {nombre} — {url}")


def zip_lista(b):
    z = zipfile.ZipFile(io.BytesIO(b))
    print("   archivos:", [(i.filename, i.file_size) for i in z.infolist()][:15])
    return z


def ckan(b):
    for r in json.loads(b)["result"]["results"][:10]:
        print("   ", r["name"][:70], "|", r.get("title", "")[:80], "|", r.get("metadata_modified", "")[:10], "|", r.get("organization", {}).get("title", "")[:50])
        for res in r.get("resources", [])[:4]:
            print("        ·", res.get("format"), res.get("url", "")[:150])


paso("Portal de datos abiertos de PEI")
prueba("raíz", "https://data.princeedwardisland.ca/", lambda b: print("   título:", re.search(rb"<title>(.*?)</title>", b, re.S)))
paso("Gobierno abierto de Canadá (incluye datos de PEI)")
for q in ["Prince Edward Island schools", "Prince Edward Island municipal boundaries", "Prince Edward Island hospitals", "Open Database of Healthcare Facilities", "Open Database of Educational Facilities"]:
    prueba(q, "https://open.canada.ca/data/api/3/action/package_search?rows=6&q=" + urllib.parse.quote(q), ckan)

paso("CGNDB PEI: tipos de entidades")
def cgn(b):
    z = zipfile.ZipFile(io.BytesIO(b))
    rows = list(csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]), encoding="utf-8-sig")))
    print("   columnas:", list(rows[0].keys()))
    from collections import Counter
    for k in ["Generic Term", "Concise Code", "Status Term"]:
        if k in rows[0]:
            print("  ", k, Counter(r[k] for r in rows).most_common(40))
    print("   ejemplo:", rows[0])
prueba("CGN CSV", "https://ftp.cartes.canada.ca/pub/nrcan_rncan/vector/geobase_cgn_toponyme/prov_csv_eng/cgn_pe_csv_eng.zip", cgn)

paso("CMHC RMS 2025 PEI")
RMS = "https://assets.cmhc-schl.gc.ca/sites/cmhc/professional/housing-markets-data-and-research/housing-data-tables/rental-market/rental-market-report-data-tables"
for f in ["2025/rmr-prince-edward-island-2025-en.xlsx", "2025/rmr-pei-2025-en.xlsx"]:
    prueba(f, f"{RMS}/{f}")
print(open("scripts/canada-en-datos/obtener-bc-localidades.py").read().split("RMS = ")[1][:300])

paso("StatCan 17-10-0142-01 (estimaciones por subdivisión)")
def est(b):
    z = zipfile.ZipFile(io.BytesIO(b))
    n = [x for x in z.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    r = csv.DictReader(io.TextIOWrapper(z.open(n), encoding="utf-8-sig"))
    filas = [x for x in r if "Prince Edward Island" in x["GEO"]]
    print("   columnas:", list(filas[0].keys()))
    print("   fechas:", sorted({x["REF_DATE"] for x in filas})[-4:], "| geos PEI:", len({x["GEO"] for x in filas}))
    print("   ejemplo:", [x for x in filas if x["REF_DATE"] == max(y["REF_DATE"] for y in filas)][:3])
prueba("17100142", "https://www150.statcan.gc.ca/n1/tbl/csv/17100142-eng.zip", est)

paso("Hora: base de zonas horarias de IANA (Atlántico)")
def tz(b):
    t = b.decode("utf-8", "ignore")
    for l in t[:200000].split("\n"):
        if re.search(r"Halifax|Prince Edward|Nova Scotia|New Brunswick|Atlantic Canada|Moncton", l):
            print("  >", l[:200])
prueba("NEWS", "https://data.iana.org/time-zones/tzdb/NEWS", tz)
def tzna(b):
    t = b.decode("utf-8", "ignore")
    i = t.find("Zone America/Halifax")
    print(t[max(0, i - 6000):i + 1200])
prueba("northamerica", "https://data.iana.org/time-zones/tzdb/northamerica", tzna)

paso("Copias archivadas de páginas oficiales de PEI (Wayback)")
for u in [
    "https://www.princeedwardisland.ca/en/information/economic-development-innovation-and-trade/minimum-wage-order",
    "https://www.princeedwardisland.ca/en/information/health-and-wellness/pei-health-card",
    "https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-provincial-nominee-program",
    "https://www.princeedwardisland.ca/en/information/finance/pei-population-report-quarterly",
    "https://www.princeedwardisland.ca/en/information/housing-land-and-communities/municipalities-in-prince-edward-island",
]:
    prueba("wayback " + u[-60:], "https://archive.org/wayback/available?url=" + urllib.parse.quote(u, safe=""), lambda b: print("   ", json.loads(b).get("archived_snapshots", {}).get("closest")))

paso("Otras fuentes")
for n, u in [
    ("Salario mínimo (Gobierno de Canadá)", "https://minwage-salairemin.service.canada.ca/en/general.html"),
    ("PSB escuelas", "https://psb.edu.pe.ca/schools"),
    ("CSLF", "https://cslfipe.ca/"),
    ("PEIANC", "https://www.peianc.com/"),
    ("Holland College", "https://www.hollandcollege.com/"),
    ("UPEI", "https://www.upei.ca/"),
    ("T3 Transit", "https://www.t3transit.ca/"),
]:
    prueba(n, u, lambda b: print("   título:", (re.search(rb"<title>(.*?)</title>", b, re.S) or [b"", b"-"])[1][:120]))
