"""
obtener-localidades.py — Directorio oficial de localidades de Alberta
=====================================================================
Descarga (solo lectura) las fuentes oficiales y escribe un JSON
compacto con todas las localidades. Se ejecuta en GitHub Actions (el
entorno de desarrollo no tiene acceso a estos servidores); el resultado
se imprime comprimido en el registro entre las marcas DATOS-INICIO y
DATOS-FIN, y se guarda en scripts/canada-en-datos/alberta-localidades.json.

Fuentes:
  - Gobierno de Alberta, servidor geoespacial (geospatial.alberta.ca):
      boundaries/municipal_boundary_public      condados y distritos
          municipales, municipios especializados, distritos de mejora
          y áreas especiales
      boundaries/municipal_communities_public   ciudades, towns,
          villages, summer villages, áreas de servicio urbano y la capa
          de puntos de hamlets, localidades y townsites
      boundaries/municipal_metis_settlement_public  asentamientos métis
      census/census_boundaries_2021             regiones económicas 2021
          (adaptadas de Statistics Canada)
  - Alberta Municipal Affairs Population List 2025 (open.alberta.ca):
      población, tipo y nombre legal por código municipal.

No se rellena ningún dato: lo que falta queda en null.
"""
import base64, datetime, gzip, io, json, math, re, sys, unicodedata, urllib.parse, urllib.request

import openpyxl
from shapely.geometry import shape, Point
from shapely.ops import unary_union

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
G = "https://geospatial.alberta.ca/titan/rest/services"
MAPL = "https://open.alberta.ca/dataset/8dae0ffd-dbb7-46f7-89eb-efa64b2ce385/resource/387c1c81-cfcb-4616-be4e-dc829c7fd6fb/download/2025-mapl-worksheets-for-internet-posting.xlsx"


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
        return r.read()


def capa(servicio, tipo, capa_id, campos, simplificar=None):
    """Todas las entidades de una capa en GeoJSON (EPSG:4326)."""
    q = {"where": "1=1", "outFields": campos, "returnGeometry": "true", "outSR": "4326", "f": "geojson", "resultRecordCount": "100000"}
    if simplificar:
        q["maxAllowableOffset"] = str(simplificar)
    d = json.loads(get(f"{G}/{servicio}/{tipo}/{capa_id}/query?" + urllib.parse.urlencode(q)))
    return d["features"]


def slug(texto):
    t = unicodedata.normalize("NFD", texto.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


# ---------------------------------------------------------------- municipios
MUNICIPIOS = [
    # (servicio, capa, campo nombre, campo código, tipo)
    ("boundaries/municipal_communities_public", 5, "CITY_NAME", "CITY_CODE", "city"),
    ("boundaries/municipal_communities_public", 3, "TOWN_NAME", "TOWN_CODE", "town"),
    ("boundaries/municipal_communities_public", 1, "VILL_NAME", "VILL_CODE", "village"),
    ("boundaries/municipal_communities_public", 2, "SVILL_NAME", "SVILL_CODE", "summer-village"),
    ("boundaries/municipal_boundary_public", 1, "SPMUN_NAME", "SPMUN_CODE", "specialized"),
    ("boundaries/municipal_boundary_public", 3, "MD_NAME", "MD_CODE", "md"),
    ("boundaries/municipal_boundary_public", 2, "ID_NAME", "ID_CODE", "id"),
    ("boundaries/municipal_boundary_public", 0, "SPAREA_NAME", "SPAREA_CODE", "special-area"),
    ("boundaries/municipal_metis_settlement_public", 0, "METIS_NAME", "METIS_CODE", "metis"),
    ("boundaries/municipal_communities_public", 4, "USA_NAME", "USA_CODE", "usa"),
]

regiones = capa("census/census_boundaries_2021", "MapServer", 3, "ERUID,ERNAME", 0.0005)
reg_geo = [(f["properties"]["ERUID"], f["properties"]["ERNAME"], shape(f["geometry"])) for f in regiones]
print("Regiones económicas:", [(r[0], r[1]) for r in reg_geo])


def region_de(punto):
    for uid, _, g in reg_geo:
        if g.contains(punto):
            return uid
    # Punto en el borde: la región más cercana
    return min(reg_geo, key=lambda r: r[2].distance(punto))[0]


registros, poligonos, conteo = [], [], {}
for servicio, capa_id, campo_n, campo_c, tipo in MUNICIPIOS:
    feats = capa(servicio, "FeatureServer", capa_id, f"{campo_n},{campo_c}", 0.0002)
    conteo[tipo] = len(feats)
    agrupado = {}
    for f in feats:
        codigo = str(f["properties"][campo_c]).strip()
        nombre = str(f["properties"][campo_n]).strip()
        g = shape(f["geometry"])
        if codigo in agrupado:
            agrupado[codigo]["g"] = unary_union([agrupado[codigo]["g"], g])
        else:
            agrupado[codigo] = {"n": nombre, "g": g}
    for codigo, v in agrupado.items():
        p = v["g"].representative_point()
        registros.append({"c": codigo, "n": v["n"], "t": tipo, "lat": round(p.y, 4), "lon": round(p.x, 4), "r": region_de(p)})
        if tipo != "usa":
            poligonos.append((codigo, tipo, v["g"]))
print("Entidades por capa:", conteo)

# ------------------------------------------- hamlets, localidades y townsites
TIPO_PUNTO = {"Hamlet": "hamlet", "Locality": "locality", "Townsite": "townsite"}
puntos = capa("boundaries/municipal_communities_public", "FeatureServer", 0, "CULPT_NAME,CULPT_CODE,TYPE")
ORDEN_PADRE = {"city": 0, "town": 0, "village": 0, "summer-village": 0, "metis": 1, "specialized": 2, "md": 2, "id": 2, "special-area": 2}
sin_padre = 0
for f in puntos:
    a = f["properties"]
    lon, lat = f["geometry"]["coordinates"][:2]
    p = Point(lon, lat)
    contiene = [(ORDEN_PADRE[t], g.area, c) for c, t, g in poligonos if g.contains(p)]
    padre = min(contiene)[2] if contiene else None
    sin_padre += padre is None
    registros.append({"c": str(a["CULPT_CODE"]).strip(), "n": str(a["CULPT_NAME"]).strip(), "t": TIPO_PUNTO[a["TYPE"]], "lat": round(lat, 4), "lon": round(lon, 4), "r": region_de(p), "m": padre})
print("Puntos:", len(puntos), "sin municipio contenedor:", sin_padre)

# ------------------------------------------------ Municipal Affairs Population List 2025
wb = openpyxl.load_workbook(io.BytesIO(get(MAPL)), data_only=True)
ws = wb["Data"]
filas = list(ws.iter_rows(values_only=True))
cab = [str(c).strip() if c is not None else "" for c in filas[0]]
print("MAPL columnas:", cab)
mapl, tipos_mapl = {}, {}
for fila in filas[1:]:
    if not fila or fila[0] in (None, ""):
        continue
    d = dict(zip(cab, fila))
    codigo = str(d["LG_CODE"]).strip()
    fecha = d.get("LAST MUNCIPAL CENSUS")
    mapl[codigo] = {
        "tipo": d.get("TYPE"),
        "legal": d.get("LEGAL NAME"),
        "pob": d.get("POPULATION"),
        "marca": d.get("*"),
        "censo_municipal": fecha.date().isoformat() if isinstance(fecha, datetime.datetime) else None,
        "correccion_federal": d.get("FEDERAL CORRECTION DATE") or None,
    }
    tipos_mapl[d.get("TYPE")] = tipos_mapl.get(d.get("TYPE"), 0) + 1
print("MAPL filas:", len(mapl), "por tipo:", tipos_mapl)
# Notas al pie de la hoja Data
for fila in filas:
    celdas = [str(c) for c in fila if c not in (None, "")]
    if celdas and not re.match(r"^\d{4}$", celdas[0]) and celdas[0] != "LG_CODE":
        print("  nota MAPL:", " | ".join(celdas)[:300])

sin_mapl = []
for r in registros:
    if r["t"] in ("hamlet", "locality", "townsite", "usa"):
        continue
    m = mapl.get(r["c"])
    if not m:
        sin_mapl.append((r["c"], r["n"], r["t"]))
        continue
    r["l"] = m["legal"]
    r["p"] = m["pob"] if isinstance(m["pob"], (int, float)) else None
    r["cm"] = m["censo_municipal"]
    r["tm"] = m["tipo"]
print("Sin fila en MAPL:", sin_mapl)

# ------------------------------------------------------------------ mapa SVG
# Proyección cónica conforme de Lambert (paralelos 49° y 77°, como el mapa de Canadá)
phi1, phi2, phi0, lam0 = map(math.radians, (49, 77, 63.390675, -91.866667))
n = math.log(math.cos(phi1) / math.cos(phi2)) / math.log(math.tan(math.pi / 4 + phi2 / 2) / math.tan(math.pi / 4 + phi1 / 2))
F = math.cos(phi1) * math.tan(math.pi / 4 + phi1 / 2) ** n / n
rho0 = F / math.tan(math.pi / 4 + phi0 / 2) ** n


def lcc(lon, lat):
    rho = F / math.tan(math.pi / 4 + math.radians(lat) / 2) ** n
    th = n * (math.radians(lon) - lam0)
    return rho * math.sin(th), rho0 - rho * math.cos(th)


alberta = unary_union([g for _, _, g in reg_geo])
xs, ys = zip(*[lcc(x, y) for x, y in alberta.envelope.exterior.coords])
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
ANCHO = 600
esc = ANCHO / (x1 - x0)
ALTO = round((y1 - y0) * esc)


def xy(lon, lat):
    x, y = lcc(lon, lat)
    return round((x - x0) * esc, 1), round((y1 - y) * esc, 1)


def ruta(g):
    partes = []
    for poly in getattr(g, "geoms", [g]):
        for anillo in [poly.exterior, *poly.interiors]:
            pts = [xy(*c) for c in anillo.coords]
            partes.append("M" + "L".join(f"{x},{y}" for x, y in pts) + "Z")
    return "".join(partes)


mapa = {"ancho": ANCHO, "alto": ALTO, "regiones": [{"r": uid, "n": nombre, "d": ruta(g.simplify(0.02, preserve_topology=True))} for uid, nombre, g in reg_geo]}
for r in registros:
    r["x"], r["y"] = xy(r["lon"], r["lat"])

salida = {
    "_fuentes": {
        "geoespacial": G,
        "mapl": MAPL,
        "consultado": datetime.date.today().isoformat(),
    },
    "conteo_capas": conteo,
    "mapl_tipos": tipos_mapl,
    "regiones": {uid: nombre for uid, nombre, _ in reg_geo},
    "mapa": mapa,
    "localidades": registros,
}
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
open("scripts/canada-en-datos/alberta-localidades.json", "w", encoding="utf-8").write(texto)
b64 = base64.b64encode(gzip.compress(texto.encode("utf-8"), 9)).decode()
print("Localidades:", len(registros), "bytes JSON:", len(texto), "base64:", len(b64))
print("DATOS-INICIO")
for i in range(0, len(b64), 3000):
    print("D|" + b64[i : i + 3000])
print("DATOS-FIN")
