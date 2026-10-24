"""
obtener-ontario-localidades.py — Fuentes oficiales del directorio de localidades de Ontario
=========================================================================================
Solo lectura. Se ejecuta en GitHub Actions (el entorno de desarrollo no
tiene acceso a estos servidores). Guarda los datos casi sin procesar en
scripts/canada-en-datos/ontario-fuentes.json (el cruce y la selección se
hacen en scripts/canada-en-datos/ontario-localidades.mjs, auditables) y
los imprime comprimidos en el registro entre DATOS-INICIO y DATOS-FIN.

Fuentes:
  - Gobierno de Ontario, «List of Ontario municipalities»: nombre,
    estatus municipal (city, town, township...), nivel (single-tier,
    lower-tier, upper-tier) y área geográfica (condado, región o distrito).
  - Statistics Canada, límites cartográficos del Censo 2021: subdivisiones
    censales (CSD) y regiones económicas (ER) de Ontario, en la proyección
    cónica conforme de Lambert de Statistics Canada (EPSG:3347).
  - Statistics Canada 98-10-0002-01: población y viviendas, Censo 2021,
    por subdivisión y división censal.
  - Statistics Canada 14-10-0393-01 y 14-10-0392-01: Encuesta de
    Población Activa por región económica (anual).
  - CMHC, Rental Market Survey 2025: tablas 1.1.1 y 1.1.2 de los centros
    de Ontario.
  - Ontario Data Catalogue: información de las escuelas (si está disponible).

No se rellena ningún dato: lo que falta queda en null.
"""
import base64, csv, datetime, gzip, io, json, re, sys, urllib.request, zipfile
from html.parser import HTMLParser

import openpyxl
import shapefile  # pyshp
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import unary_union

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
BOUNDARY = "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/{}"
RMS = "https://assets.cmhc-schl.gc.ca/sites/cmhc/professional/housing-markets-data-and-research/housing-data-tables/rental-market/rental-market-report-data-tables/2025/rmr-{}-2025-en.xlsx"
CMHC_CENTROS = ["toronto", "ottawa", "hamilton", "london", "kitchener-cambridge-waterloo", "windsor", "oshawa", "st-catharines-niagara", "guelph", "barrie", "kingston", "thunder-bay", "greater-sudbury", "sudbury", "ontario"]
a_lonlat = Transformer.from_crs("EPSG:3347", "EPSG:4326", always_xy=True)
salida = {"consultado": datetime.date.today().isoformat(), "fuentes": {}}


def get(url, t=600):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read()


def paso(nombre):
    print(f"\n=== {nombre} ===", flush=True)


# ------------------------------------------------ Lista oficial de municipios
class Tablas(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tablas, self.fila, self.celda, self.en_celda, self.enlace = [], None, "", False, None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.tablas.append([])
        elif tag == "tr" and self.tablas:
            self.fila = []
        elif tag in ("td", "th") and self.fila is not None:
            self.en_celda, self.celda, self.enlace = True, "", None
        elif tag == "a" and self.en_celda:
            self.enlace = dict(attrs).get("href")

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.en_celda:
            self.fila.append({"t": re.sub(r"\s+", " ", self.celda).strip(), "a": self.enlace})
            self.en_celda = False
        elif tag == "tr" and self.fila is not None:
            if self.fila:
                self.tablas[-1].append(self.fila)
            self.fila = None

    def handle_data(self, data):
        if self.en_celda:
            self.celda += data


paso("Lista de municipios de Ontario")
for url in ("https://www.ontario.ca/page/list-ontario-municipalities", "https://www.ontario.ca/document/list-ontario-municipalities"):
    try:
        html = get(url, 120).decode("utf-8", "ignore")
    except Exception as e:
        print("ERROR", url, e)
        continue
    m = re.search(r"Updated:?\s*</?[^>]*>?\s*([A-Z][a-z]+ \d{1,2}, \d{4})", html) or re.search(r"Updated:?\s*([A-Z][a-z]+ \d{1,2}, \d{4})", html)
    p = Tablas()
    p.feed(html)
    print(url, "tablas:", [len(t) for t in p.tablas], "actualizada:", m and m.group(1))
    if p.tablas:
        filas = [f for t in p.tablas for f in t]
        print("  cabecera:", [c["t"] for c in filas[0]])
        for f in filas[1:6]:
            print("  ", [c["t"] for c in f])
        salida["municipios"] = {"url": url, "actualizada": m and m.group(1), "tablas": [[[c["t"] for c in f] for f in t] for t in p.tablas]}
        salida["fuentes"]["municipios"] = url
        break

# ----------------------------------------- Límites censales: CSD y ER de Ontario
def leer_shp(archivo, filtro):
    zf = zipfile.ZipFile(io.BytesIO(get(BOUNDARY.format(archivo), 900)))
    base = [n[:-4] for n in zf.namelist() if n.endswith(".shp")][0]
    r = shapefile.Reader(shp=io.BytesIO(zf.read(base + ".shp")), dbf=io.BytesIO(zf.read(base + ".dbf")), shx=io.BytesIO(zf.read(base + ".shx")))
    campos = [f[0] for f in r.fields[1:]]
    print(archivo, "campos:", campos, "registros:", len(r))
    out = []
    for sr in r.iterShapeRecords():
        a = dict(zip(campos, sr.record))
        if filtro(a):
            out.append((a, shape(sr.shape.__geo_interface__)))
    return out


paso("Regiones económicas (ER)")
ers = leer_shp("ler_000b21a_e.zip", lambda a: str(a.get("PRUID")) == "35")
er_geo = [(str(a["ERUID"]), a["ERNAME"], g) for a, g in ers]
print("ER de Ontario:", [(u, n) for u, n, _ in er_geo])


def er_de(p):
    for uid, _, g in er_geo:
        if g.contains(p):
            return uid
    return min(er_geo, key=lambda r: r[2].distance(p))[0]


paso("Subdivisiones censales (CSD)")
csds = leer_shp("lcsd000b21a_e.zip", lambda a: str(a.get("PRUID")) == "35")
tipos = {}
salida["csd"] = []
for a, g in csds:
    p = g.representative_point()
    lon, lat = a_lonlat.transform(p.x, p.y)
    tipos[a["CSDTYPE"]] = tipos.get(a["CSDTYPE"], 0) + 1
    salida["csd"].append({"uid": str(a["CSDUID"]), "dguid": a.get("DGUID"), "n": a["CSDNAME"], "t": a["CSDTYPE"], "er": er_de(p), "x": round(p.x), "y": round(p.y), "lat": round(lat, 4), "lon": round(lon, 4), "area": a.get("LANDAREA")})
print("CSD de Ontario:", len(salida["csd"]), "por tipo:", tipos)

# Mapa: contorno de las ER simplificado (metros, EPSG:3347)
salida["er"] = [{"uid": u, "n": n, "geo": unary_union([g]).simplify(1500, preserve_topology=True).__geo_interface__} for u, n, g in er_geo]
salida["fuentes"]["limites"] = BOUNDARY.format("lcsd000b21a_e.zip") + " ; " + BOUNDARY.format("ler_000b21a_e.zip")

# ------------------------------------------------------------ Censo 2021
def tabla_statcan(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)))
    nombre = [n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n][0]
    return zf.open(nombre)


paso("Censo 2021 (98-10-0002-01)")
censo = {}
with tabla_statcan("98100002") as f:
    r = csv.reader(io.TextIOWrapper(f, encoding="utf-8-sig"))
    cab = next(r)
    print("columnas:", cab)
    idx = {c: i for i, c in enumerate(cab)}
    for fila in r:
        if len(fila) < 5:
            continue
        dg = fila[idx["DGUID"]] if "DGUID" in idx else fila[2]
        # CSD de Ontario (A0005 35xxxxx) y divisiones censales (A0003 35xx)
        if re.match(r"^2021A0005(35\d{5})$", dg) or re.match(r"^2021A0003(35\d{2})$", dg):
            censo[dg] = {cab[i]: v for i, v in enumerate(fila) if v != "" and i >= 1}
print("filas de Ontario:", len(censo))
for k in list(censo)[:3]:
    print(" ", k, censo[k])
salida["censo"] = censo
salida["fuentes"]["censo"] = "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201"

# ------------------------------------------------ Encuesta de Población Activa
paso("EPA por región económica")
salida["epa"] = {}
for pid, campo in (("14100393", "Labour force characteristics"), ("14100392", "North American Industry Classification System (NAICS)")):
    with tabla_statcan(pid) as f:
        filas = [x for x in csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig")) if x["GEO"].endswith(", Ontario") or x["GEO"] == "Ontario"]
    ult = max(x["REF_DATE"] for x in filas)
    for x in filas:
        if x["REF_DATE"] != ult:
            continue
        reg = salida["epa"].setdefault(x["GEO"], {"anio": ult})
        destino = reg.setdefault("lfs" if pid == "14100393" else "industrias", {})
        destino[x[campo]] = {"v": x["VALUE"], "uom": x["UOM"], "status": x["STATUS"], "escala": x["SCALAR_FACTOR"]}
print("EPA regiones:", list(salida["epa"]))
for k, v in salida["epa"].items():
    print(" ", k, v["anio"], (v.get("lfs") or {}).get("Unemployment rate"))

# ------------------------------------------------------------ CMHC 2025
paso("CMHC Rental Market Survey 2025")
salida["cmhc"] = {}
for c in CMHC_CENTROS:
    url = RMS.format(c)
    try:
        wb = openpyxl.load_workbook(io.BytesIO(get(url, 180)), read_only=True, data_only=True)
    except Exception as e:
        print("ERROR", c, e)
        continue
    hojas = {}
    for h in ("Table 1.1.1", "Table 1.1.2"):
        if h in wb.sheetnames:
            hojas[h] = [[str(x).strip() for x in fila if x not in (None, "")] for fila in wb[h].iter_rows(values_only=True)]
            hojas[h] = [f for f in hojas[h] if f]
    salida["cmhc"][c] = {"url": url, "hojas": hojas}
    print(c, "filas:", {h: len(v) for h, v in hojas.items()}, "primeras columnas:", [f[0] for f in hojas.get("Table 1.1.2", [])][:40])

# ------------------------------------------------------------ Escuelas
paso("Escuelas (Ontario Data Catalogue)")
for pkg in ("school-information-and-student-demographics", "ontario-public-schools-contact-information"):
    try:
        d = json.loads(get(f"https://data.ontario.ca/api/3/action/package_show?id={pkg}", 120))["result"]
    except Exception as e:
        print("ERROR", pkg, e)
        continue
    print(pkg, "|", d.get("title"), "| modificado:", d.get("metadata_modified"))
    for r in d["resources"]:
        print("   recurso:", r.get("name"), r.get("format"), r.get("url"), r.get("last_modified"))
    rec = [r for r in d["resources"] if (r.get("format") or "").upper() in ("XLSX", "CSV")]
    if not rec:
        continue
    rec = rec[0]
    try:
        datos = get(rec["url"], 300)
        if rec["url"].lower().endswith(".csv") or (rec.get("format") or "").upper() == "CSV":
            filas = list(csv.reader(io.StringIO(datos.decode("utf-8-sig", "ignore"))))
        else:
            ws = openpyxl.load_workbook(io.BytesIO(datos), read_only=True, data_only=True).worksheets[0]
            filas = [[("" if c is None else str(c)) for c in f] for f in ws.iter_rows(values_only=True)]
        cab = filas[0]
        print("   columnas:", cab)
        print("   ejemplo:", filas[1][:20])
        # Solo las columnas necesarias (consejo, tipo, nombre, nivel, idioma y ciudad)
        utiles = [i for i, c in enumerate(cab) if re.search(r"board|school name|school level|school type|language|city|municipality|special condition", c, re.I)]
        print("   columnas guardadas:", [cab[i] for i in utiles])
        salida["escuelas"] = {"paquete": pkg, "titulo": d.get("title"), "recurso": rec.get("name"), "url": rec["url"], "modificado": rec.get("last_modified") or d.get("metadata_modified"), "cabecera": [cab[i] for i in utiles], "filas": [[f[i] if i < len(f) else "" for i in utiles] for f in filas[1:] if any(f)]}
        break
    except Exception as e:
        print("   ERROR leyendo", e)

# ------------------------------------------------------------ Hospitales
paso("Hospitales (Ontario Data Catalogue)")
for pkg in ("ministry-of-health-service-provider-locations", "general-hospital-locations", "hospital-locations"):
    try:
        d = json.loads(get(f"https://data.ontario.ca/api/3/action/package_show?id={pkg}", 120))["result"]
    except Exception as e:
        print("ERROR", pkg, e)
        continue
    print(pkg, "|", d.get("title"), "| modificado:", d.get("metadata_modified"))
    for r in d["resources"]:
        print("   recurso:", r.get("name"), r.get("format"), r.get("url"))
    rec = [r for r in d["resources"] if (r.get("format") or "").upper() in ("XLSX", "CSV")]
    if not rec:
        continue
    try:
        datos = get(rec[0]["url"], 300)
        if (rec[0].get("format") or "").upper() == "CSV":
            filas = list(csv.reader(io.StringIO(datos.decode("utf-8-sig", "ignore"))))
        else:
            ws = openpyxl.load_workbook(io.BytesIO(datos), read_only=True, data_only=True).worksheets[0]
            filas = [[("" if c is None else str(c)) for c in f] for f in ws.iter_rows(values_only=True)]
        print("   columnas:", filas[0])
        tipos = {}
        for f in filas[1:]:
            for c in f:
                if re.search(r"hospital", c, re.I):
                    tipos[c[:60]] = tipos.get(c[:60], 0) + 1
        print("   valores con 'hospital':", sorted(tipos.items(), key=lambda x: -x[1])[:25])
        salida["hospitales"] = {"paquete": pkg, "titulo": d.get("title"), "url": rec[0]["url"], "modificado": d.get("metadata_modified"), "cabecera": filas[0], "filas": [f for f in filas[1:] if any(re.search(r"hospital", c, re.I) for c in f)]}
        break
    except Exception as e:
        print("   ERROR leyendo", e)

# ------------------------------------------------------------ Salida
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
open("scripts/canada-en-datos/ontario-fuentes.json", "w", encoding="utf-8").write(texto)
b64 = base64.b64encode(gzip.compress(texto.encode("utf-8"), 9)).decode()
print("\nbytes JSON:", len(texto), "base64:", len(b64))
print("DATOS-INICIO")
for i in range(0, len(b64), 3000):
    print("D|" + b64[i : i + 3000])
print("DATOS-FIN")
