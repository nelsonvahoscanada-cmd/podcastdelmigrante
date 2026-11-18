"""
compactar-nb.py — Reúne las fuentes oficiales de Nuevo Brunswick en nb-localidades.json
======================================================================================
Entradas (no se guardan en el repositorio; se obtienen en solo lectura):
  nb-fuentes.json   obtener-nb-localidades.py (GitHub Actions): límites del
                    Censo 2021 de Statistics Canada (provincia, condados,
                    subdivisiones censales y aglomeraciones), Base de datos de
                    nombres geográficos de Canadá y encuesta de alquileres de CMHC.
  <geonb>/          obtener-nb-ficha.py geonb (GitHub Actions): capas oficiales
                    de GeoNB (Gobierno de Nuevo Brunswick): gobiernos locales y
                    distritos rurales vigentes desde el 1 de enero de 2023
                    (reglamentos 2022-50 y 2022-45 de la Local Governance Act),
                    escuelas públicas y hospitales.
  nb-wds.json       consultar-nb-wds.py (en el repositorio): cifras del Censo
                    2021 por subdivisión y Encuesta de Población Activa por
                    región económica (API oficial de Statistics Canada).

Conserva solo lo que usa provincias/new-brunswick.mjs, sin cambiar ningún
valor oficial. Lo único que se calcula es geográfico y se documenta:
  - en qué subdivisión censal cae cada escuela, hospital o nombre geográfico
    (sus coordenadas oficiales dentro del polígono de la subdivisión);
  - qué gobiernos locales o distritos rurales de 2023 ocupan el territorio de
    cada subdivisión de 2021 (porcentaje de su superficie, con los límites
    oficiales de GeoNB y del censo).

USO: python3 scripts/canada-en-datos/compactar-nb.py <nb-fuentes.json> <carpeta geonb>
"""
import json, pathlib, sys

from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import Point, shape
from shapely.ops import transform
from shapely.strtree import STRtree

BASE = pathlib.Path(__file__).parent
F = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
GEONB = pathlib.Path(sys.argv[2])
W = json.loads((BASE / "nb-wds.json").read_text(encoding="utf-8"))
a_lambert = Transformer.from_crs("EPSG:4326", "EPSG:3347", always_xy=True)
lambert = lambda g: transform(lambda x, y, z=None: a_lambert.transform(x, y), g)
capa = lambda n: json.loads((GEONB / n).read_text(encoding="utf-8"))["features"]

# Regiones económicas: Statistics Canada las forma con condados completos (comprobado con los límites oficiales de 2021)
ER_DE_CD = {"1314": "1310", "1315": "1310", "1309": "1310", "1306": "1320", "1307": "1320", "1308": "1320", "1301": "1330", "1302": "1330", "1305": "1330", "1303": "1340", "1304": "1340", "1310": "1340", "1311": "1350", "1312": "1350", "1313": "1350"}

CAMPOS = W["censo"]["campos"]
censo = lambda cod: [W["censo"]["datos"].get(cod, {}).get(k) for k in CAMPOS]
ca_de = {}
for m in F["cma"]:
    nombre = m["CMANAME"].split(" (")[0]
    for c in m["csd"]:
        ca_de[c] = nombre

# ---------- Subdivisiones censales (polígonos en EPSG:3347) ----------
geo_csd = {c["CSDUID"]: make_valid(shape(c["geo"])) for c in F["csd"]}
ids = list(geo_csd)
arbol = STRtree([geo_csd[i] for i in ids])


def csd_de(lon, lat):
    p = Point(*a_lambert.transform(lon, lat))
    for i in arbol.query(p):
        if geo_csd[ids[i]].contains(p):
            return ids[i]
    return ids[arbol.nearest(p)]


# ---------- Gobiernos locales y distritos rurales vigentes (GeoNB, 2023) ----------
gl = [(f["properties"]["OFFICIAL_E"], f["properties"]["Type_Name"], "LG", make_valid(lambert(shape(f["geometry"])))) for f in capa("GeoNB_ELG_Local_Governance-8.geojson")]
dr = [(f["properties"]["OFFICIAL_E"], "Rural District", "RD", make_valid(lambert(shape(f["geometry"])))) for f in capa("GeoNB_ELG_Local_Governance-5.geojson")]
actuales = gl + dr
arbol_gl = STRtree([x[3] for x in actuales])
reforma = {}
for cod, g in geo_csd.items():
    partes = []
    for i in arbol_gl.query(g):
        n, t, k, p = actuales[i]
        inter = g.intersection(p).area
        if inter / g.area >= 0.05:
            partes.append([n, t, round(100 * inter / g.area)])
    reforma[cod] = sorted(partes, key=lambda x: -x[2])

# ---------- Escuelas públicas (GeoNB, Departamento de Educación) ----------
escuelas = []
for n, sector in (("GeoNB_EECD_PublicSchools-0.geojson", "Anglophone"), ("GeoNB_EECD_PublicSchools-1.geojson", "Francophone")):
    for f in capa(n):
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"][:2]
        escuelas.append([p["strNM"], sector, p["strDST"], p["strGR"], p.get("StrCM"), csd_de(lon, lat)])

# ---------- Hospitales (GeoNB: Horizon y Vitalité) ----------
hospitales = []
for n in ("GeoNB_Health_Facilities-0.geojson", "GeoNB_Health_Facilities-1.geojson"):
    for f in capa(n):
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"][:2]
        red = "Horizon" if "Horizon" in p["Hospital_O"] else "Vitalité"
        hospitales.append([p["Name_E"].strip(), p["Name_F"].strip(), red, p.get("Telephone_"), csd_de(lon, lat), round(lat, 5), round(lon, 5)])

salida = {
    "consultado": F["consultado"],
    "consultado_wds": W["consultado"],
    "fuentes": F["fuentes"],
    "provincia": censo("13"),
    "condados": [[c["CDUID"], c["CDNAME"], ER_DE_CD[c["CDUID"]], censo(c["CDUID"])] for c in F["cd"]],
    "cd_geo": {c["CDUID"]: c["geo"] for c in F["cd"]},
    "er": F["er"],
    "censo_campos": CAMPOS,
    "csd": [[c["CSDUID"], c["CSDNAME"], c["CSDTYPE"], c["CSDUID"][:4], ca_de.get(c["CSDUID"]), ER_DE_CD[c["CSDUID"][:4]], c["x"], c["y"], c["lat"], c["lon"], censo(c["CSDUID"]), reforma[c["CSDUID"]]] for c in F["csd"]],
    "csd_campos": ["id", "nombre", "tipo", "cd", "ca", "er", "x", "y", "lat", "lon", "censo", "actual"],
    "gobiernos": {"locales": len(gl), "distritos": len(dr), "tipos": sorted({t for _, t, _, _ in gl})},
    "cgn": [[g["id"], g["n"], g["t"], g["csd"], g["x"], g["y"], g["lat"], g["lon"], g["fecha"]] for g in F["cgn"]],
    "cgn_campos": ["id", "nombre", "tipo", "csd", "x", "y", "lat", "lon", "fecha"],
    "epa": W["epa"]["datos"],
    "epa_tablas": W["epa"]["tablas"],
    "cmhc": F["cmhc"],
    "hospitales": hospitales,
    "hospitales_campos": ["nombre", "nombre_fr", "red", "telefono", "csd", "lat", "lon"],
    "escuelas": escuelas,
    "escuelas_campos": ["nombre", "sector", "distrito", "grados", "comunidad", "csd"],
}
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(BASE / "nb-localidades.json").write_text(texto, encoding="utf-8")
print("nb-localidades.json:", len(texto), "bytes |", len(salida["csd"]), "subdivisiones |", len(escuelas), "escuelas |", len(hospitales), "hospitales |", salida["gobiernos"])
