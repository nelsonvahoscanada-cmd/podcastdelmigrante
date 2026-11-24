"""
compactar-ns.py — Reúne las fuentes oficiales de Nueva Escocia en ns-localidades.json
====================================================================================
Entradas (no se guardan en el repositorio; se obtienen en solo lectura):
  ns-fuentes.json   obtener-ns-localidades.py (GitHub Actions): límites del
                    Censo 2021 de Statistics Canada (provincia, condados,
                    subdivisiones censales, aglomeraciones y la región
                    económica de cada condado), Base de datos de nombres
                    geográficos de Canadá y encuesta de alquileres de CMHC.
  <datos>/          obtener-ns-ficha.py datos=… (GitHub Actions): conjuntos de
                    datos abiertos del Gobierno de Nueva Escocia
                    (data.novascotia.ca): límites municipales vigentes
                    (7bqh-hssn), villas (23hp-7dde), límites de comunidad del
                    archivo de direcciones civiles NSCAF (a89z-tinp), escuelas
                    públicas (iyap-ttn5) y hospitales (tmfr-3h8a).
  ns-wds.json       consultar-ns-wds.py (en el repositorio): cifras del Censo
                    2021 por subdivisión y por centro de población, y Encuesta
                    de Población Activa por región económica (API oficial de
                    Statistics Canada).

Conserva solo lo que usa provincias/nova-scotia.mjs, sin cambiar ningún
valor oficial. Lo único que se calcula es geográfico y se documenta:
  - en qué subdivisión censal cae cada escuela, hospital o nombre geográfico
    (sus coordenadas oficiales dentro del polígono de la subdivisión), y en
    qué comunidad NSCAF caen las escuelas y los hospitales (para las fichas
    de Dartmouth y Sydney);
  - qué municipios vigentes ocupan el territorio de cada subdivisión de 2021
    (porcentaje de su superficie, con los límites oficiales de la provincia y
    del censo; se omiten las partes de menos de 20%, que en la práctica son
    diferencias de trazado entre los dos mapas) y qué villas tienen su punto interior dentro de ella.

USO: python3 scripts/canada-en-datos/compactar-ns.py <ns-fuentes.json> <carpeta de datos abiertos>
"""
import json, pathlib, sys

from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import Point, shape
from shapely.ops import transform
from shapely.strtree import STRtree

BASE = pathlib.Path(__file__).parent
F = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
DATOS = pathlib.Path(sys.argv[2])
W = json.loads((BASE / "ns-wds.json").read_text(encoding="utf-8"))
a_lambert = Transformer.from_crs("EPSG:4326", "EPSG:3347", always_xy=True)
lambert = lambda g: transform(lambda x, y, z=None: a_lambert.transform(x, y), g)  # noqa: shapely.ops.transform (aviso de obsolescencia sin efecto)
conjunto = lambda i: json.loads((DATOS / f"datos-{i}.json").read_text(encoding="utf-8"))

# Región económica de cada condado: la que contiene su punto interior (obtener-ns-localidades.py)
ER_DE_CD = {}
for cd, ers in F["er_de_cd"].items():
    if len(ers) != 1:
        raise SystemExit(f"Condado {cd} sin una única región económica: {ers}")
    ER_DE_CD[cd] = ers[0]

CAMPOS = W["censo"]["campos"]
censo = lambda cod: [W["censo"]["datos"].get(cod, {}).get(k) for k in CAMPOS]
ca_de = {}
for m in F["cma"]:
    for c in m["csd"]:
        ca_de[c] = m["CMANAME"].split(" (")[0]

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


def punto(fila, *campos):
    """Coordenadas (lon, lat) de una fila de Socrata: columna geográfica (Point) o latitud y longitud."""
    for c in campos:
        g = fila.get(c)
        if isinstance(g, dict):
            if g.get("type") == "Point":
                return g["coordinates"][:2]
            if "latitude" in g and "longitude" in g:
                return float(g["longitude"]), float(g["latitude"])
    lat = fila.get("latitude") or fila.get("lat")
    lon = fila.get("longitude") or fila.get("long") or fila.get("lon")
    return (float(lon), float(lat)) if lat and lon else None


# ---------- Municipios vigentes (límites oficiales del Gobierno de Nueva Escocia) ----------
mun = [(f.get("fullname") or f.get("name"), f.get("featdesc"), make_valid(lambert(shape(f["the_geom"])))) for f in conjunto("7bqh-hssn")]
arbol_mun = STRtree([x[2] for x in mun])
actual = {}
for cod, g in geo_csd.items():
    partes = []
    for i in arbol_mun.query(g):
        n, t, p = mun[i]
        inter = g.intersection(p).area
        if inter / g.area >= 0.2:
            partes.append([n, t, round(100 * inter / g.area)])
    actual[cod] = sorted(partes, key=lambda x: -x[2])
# Las reservas indígenas no forman parte de ningún municipio, aunque el límite municipal las rodee
for c in F["csd"]:
    if c["CSDTYPE"] == "IRI":
        actual[c["CSDUID"]] = []
tipos_mun = {}
for _, t, _ in mun:
    tipos_mun[t] = tipos_mun.get(t, 0) + 1

# ---------- Villas (Village Boundaries) ----------
villas = {}
for f in conjunto("23hp-7dde"):
    g = make_valid(lambert(shape(f["the_geom"])))
    p = g.representative_point()
    for i in arbol.query(p):
        if geo_csd[ids[i]].contains(p):
            villas.setdefault(ids[i], []).append(f.get("name"))

# ---------- Comunidades NSCAF: solo las que tienen ficha propia ----------
COMUNIDADES = {"DARTMOUTH", "SYDNEY"}
geo_com = {}
for f in conjunto("a89z-tinp"):
    n = (f.get("gsa_name") or "").upper()
    if n in COMUNIDADES and str(f.get("retired", "N")).upper() not in ("Y", "1", "TRUE"):
        g = make_valid(lambert(shape(f["the_geom"])))
        geo_com[n] = geo_com[n].union(g) if n in geo_com else g
if set(geo_com) != COMUNIDADES:
    raise SystemExit(f"Faltan límites de comunidad NSCAF: {COMUNIDADES - set(geo_com)}")


def comunidad_de(lon, lat):
    p = Point(*a_lambert.transform(lon, lat))
    return next((n for n, g in geo_com.items() if g.contains(p)), None)


# ---------- Escuelas públicas ----------
escuelas, sin_coord = [], []
for f in conjunto("iyap-ttn5"):
    pt = punto(f, "georeference")
    if not pt:
        sin_coord.append(f.get("school_name"))
        continue
    lon, lat = pt
    escuelas.append([f.get("school_name"), f.get("board_name"), f.get("start_grade"), f.get("end_grade"), f.get("civic_address_line_2"), csd_de(lon, lat), comunidad_de(lon, lat)])

# ---------- Hospitales ----------
hospitales = []
for f in conjunto("tmfr-3h8a"):
    lon, lat = punto(f, "the_geom")
    hospitales.append([f.get("facility"), f.get("type"), f.get("town"), f.get("county"), csd_de(lon, lat), comunidad_de(lon, lat), round(lat, 5), round(lon, 5)])

salida = {
    "consultado": F["consultado"],
    "consultado_wds": W["consultado"],
    "fuentes": F["fuentes"],
    "provincia": censo("12"),
    "condados": [[c["CDUID"], c["CDNAME"], ER_DE_CD[c["CDUID"]], censo(c["CDUID"])] for c in F["cd"]],
    "cd_geo": {c["CDUID"]: c["geo"] for c in F["cd"]},
    "er": F["er"],
    "censo_campos": CAMPOS,
    "csd": [[c["CSDUID"], c["CSDNAME"], c["CSDTYPE"], c["CSDUID"][:4], ca_de.get(c["CSDUID"]), ER_DE_CD[c["CSDUID"][:4]], c["x"], c["y"], c["lat"], c["lon"], censo(c["CSDUID"]), actual[c["CSDUID"]], sorted(x for x in villas.get(c["CSDUID"], []) if x)] for c in F["csd"]],
    "csd_campos": ["id", "nombre", "tipo", "cd", "ca", "er", "x", "y", "lat", "lon", "censo", "actual", "villas"],
    "municipios": {"total": len(mun), "tipos": tipos_mun, "villas": sum(len(v) for v in villas.values())},
    "cgn": [[g["id"], g["n"], g["t"], g["csd"], g["x"], g["y"], g["lat"], g["lon"], g["fecha"]] for g in F["cgn"]],
    "cgn_campos": ["id", "nombre", "tipo", "csd", "x", "y", "lat", "lon", "fecha"],
    "centros": W["centros"],
    "epa": W["epa"]["datos"],
    "epa_tablas": W["epa"]["tablas"],
    "cmhc": F["cmhc"],
    "hospitales": hospitales,
    "hospitales_campos": ["nombre", "tipo", "ciudad", "condado", "csd", "comunidad", "lat", "lon"],
    "escuelas": escuelas,
    "escuelas_campos": ["nombre", "centro", "desde", "hasta", "localidad", "csd", "comunidad"],
    "escuelas_curso": sorted({f.get("year") for f in conjunto("iyap-ttn5")}),
}
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(BASE / "ns-localidades.json").write_text(texto, encoding="utf-8")
print("ns-localidades.json:", len(texto), "bytes |", len(salida["csd"]), "subdivisiones |", len(escuelas), "escuelas (sin coordenadas:", len(sin_coord), ") |", len(hospitales), "hospitales |", salida["municipios"])
