"""
consultar-ciudades.py — Datos oficiales para las fichas de las seis
primeras ciudades (Calgary, Edmonton, Brooks, Red Deer, Lethbridge y
Medicine Hat). Solo lectura; imprime lo encontrado para verificarlo.
"""
import csv, io, json, re, urllib.parse, urllib.request, zipfile

import openpyxl

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
CIUDADES = ["Calgary", "Edmonton", "Brooks", "Red Deer", "Lethbridge", "Medicine Hat"]
ER = {"4810", "4830", "4850", "4860"}


def get(url, t=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read(), r.geturl(), r.status


def seccion(t):
    print("\n" + "=" * 8, t, "=" * 8)


# 1. Notas de la Municipal Affairs Population List 2025
seccion("MAPL 2025: notas y columnas de las seis ciudades")
x, _, _ = get("https://open.alberta.ca/dataset/8dae0ffd-dbb7-46f7-89eb-efa64b2ce385/resource/387c1c81-cfcb-4616-be4e-dc829c7fd6fb/download/2025-mapl-worksheets-for-internet-posting.xlsx")
wb = openpyxl.load_workbook(io.BytesIO(x), data_only=True)
for ws in wb.worksheets:
    for fila in ws.iter_rows(values_only=True):
        celdas = [str(c) for c in fila if c not in (None, "")]
        texto = " | ".join(celdas)
        if celdas and (re.search(r"[A-Za-z]{4,}", texto) and not re.match(r"^\d{4} \|", texto)) and len(texto) > 40 and not re.search(r"\| \d+ \| [\d.]+ \|", texto):
            if any(k in texto.lower() for k in ("*", "note", "source", "census", "population", "federal", "shadow", "estimate")):
                print(f"  [{ws.title}] {texto[:400]}")
ws = wb["Data"]
cab = [str(c) for c in next(ws.iter_rows(values_only=True))]
for fila in ws.iter_rows(values_only=True):
    d = dict(zip(cab, fila))
    if d.get("LEGAL NAME") in [f"City of {c}" for c in CIUDADES] or (d.get("TYPE") == "Special Areas"):
        print("  ", {k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in d.items() if v not in (None, "")})
print("  valores de '*':", sorted({str(f[3]) for f in ws.iter_rows(min_row=2, values_only=True) if f and f[3] not in (None, "")}))

# 2. Censo 2021 — tabla 98-10-0002-01 (población por subdivisión de recensement)
seccion("Statistics Canada 98-10-0002-01 (Censo 2021)")
try:
    z, _, _ = get("https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip", 600)
    zf = zipfile.ZipFile(io.BytesIO(z))
    nombre = [n for n in zf.namelist() if not n.endswith("_MetaData.csv")][0]
    with zf.open(nombre) as f:
        r = csv.reader(io.TextIOWrapper(f, encoding="utf-8-sig"))
        cab = next(r)
        print("  columnas:", cab)
        for fila in r:
            geo = fila[1] if len(fila) > 1 else ""
            if re.match(r"^(Calgary|Edmonton|Brooks|Red Deer|Lethbridge|Medicine Hat) \(CY\), Alta\.?$", geo) or re.match(r"^(Calgary|Edmonton|Brooks|Red Deer|Lethbridge|Medicine Hat), City \(CY\)", geo):
                print("  ", fila)
except Exception as e:
    print("  ERROR", e)

# 3. Encuesta de Población Activa por región económica (anual)
for tabla, filtro in (("14100393", r"Unemployment rate|Population|Employment rate|Labour force"), ("14100392", r"")):
    seccion(f"Statistics Canada {tabla} (regiones económicas de Alberta)")
    try:
        z, _, _ = get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{tabla}-eng.zip", 600)
        zf = zipfile.ZipFile(io.BytesIO(z))
        nombre = [n for n in zf.namelist() if not n.endswith("_MetaData.csv")][0]
        with zf.open(nombre) as f:
            r = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
            print("  columnas:", r.fieldnames)
            filas = [fila for fila in r if fila["REF_DATE"] in ("2025", "2024") and ", Alberta" in fila["GEO"]]
        if tabla == "14100393":
            for fila in filas:
                if fila["REF_DATE"] == "2025" and re.search(filtro, fila.get("Labour force characteristics", "")) and fila.get("Statistics", "Estimate") in ("Estimate", ""):
                    print("  ", fila["REF_DATE"], fila["GEO"], fila.get("Labour force characteristics"), fila.get("UOM"), fila["VALUE"], fila.get("STATUS"))
        else:
            for fila in filas:
                if fila["REF_DATE"] == "2025":
                    print("  ", fila["GEO"], "|", fila.get("North American Industry Classification System (NAICS)"), "|", fila.get("UOM"), fila["VALUE"], fila.get("STATUS"))
    except Exception as e:
        print("  ERROR", e)

# 4. CMHC — Rental Market Survey 2025 (centros de Alberta)
seccion("CMHC Rental Market Survey 2025")
for c in ["red-deer", "lethbridge", "medicine-hat", "brooks", "alberta"]:
    url = f"https://assets.cmhc-schl.gc.ca/sites/cmhc/professional/housing-markets-data-and-research/housing-data-tables/rental-market/rental-market-report-data-tables/2025/rmr-{c}-2025-en.xlsx"
    try:
        x, _, _ = get(url)
        wb = openpyxl.load_workbook(io.BytesIO(x), read_only=True, data_only=True)
        print("  OK", c, wb.sheetnames[:12])
        for nombre in wb.sheetnames:
            if re.match(r"^Table 1\.1\.[12]\b", nombre) or (c == "alberta" and re.match(r"^Table 1\.0\b|^Table 1\b", nombre)):
                print("   --", nombre)
                for fila in wb[nombre].iter_rows(values_only=True):
                    celdas = [str(v).strip() for v in fila if v not in (None, "")]
                    if celdas and (c != "alberta" or re.search(r"Red Deer|Lethbridge|Medicine Hat|Brooks|Grande|Wood Buffalo|Total|Bachelor|Bedroom|Centre", " ".join(celdas))):
                        print("     ", " | ".join(celdas)[:240])
    except Exception as e:
        print("  ERR", c, e)

# 5. Datos abiertos de Alberta: hospitales, escuelas y transporte
seccion("open.alberta.ca: conjuntos de datos")
for q in ["hospital locations", "health facilities", "school locations", "school authority", "public transit", "settlement services newcomers"]:
    try:
        d = json.loads(get("https://open.alberta.ca/api/3/action/package_search?rows=6&q=" + urllib.parse.quote(q))[0])["result"]
        print("  q=", q, d["count"])
        for p in d["results"]:
            print("    -", p["name"], "|", p["title"][:90], "|", p.get("metadata_modified", "")[:10], "|", [(r.get("format"), r.get("url")) for r in p["resources"]][:3])
    except Exception as e:
        print("  ERR", q, e)

# 6. Sitios web municipales y recursos oficiales
seccion("Enlaces oficiales")
for u in ["https://www.calgary.ca/", "https://www.edmonton.ca/", "https://www.brooks.ca/", "https://www.reddeer.ca/", "https://www.lethbridge.ca/", "https://www.medicinehat.ca/",
          "https://www.calgary.ca/transit.html", "https://www.edmonton.ca/ets", "https://www.reddeer.ca/city-services/transit/", "https://www.lethbridge.ca/transit", "https://www.medicinehat.ca/transit",
          "https://www.brooks.ca/", "https://ircc.canada.ca/english/newcomers/services/index.asp", "https://www.albertahealthservices.ca/findhealth/", "https://www.alberta.ca/municipal-profiles",
          "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/alberta/environmental-scan"]:
    try:
        b, final, st = get(u, 60)
        t = re.search(rb"<title[^>]*>(.*?)</title>", b, re.S)
        print("  ", st, u, "->", final, "|", (t.group(1).decode("utf-8", "ignore").strip() if t else "")[:90])
    except Exception as e:
        print("  ERR", u, e)
