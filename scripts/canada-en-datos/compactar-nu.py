"""
compactar-nu.py — Reduce nu-fuentes.json a nu-localidades.json (lo que usa la guía de Nunavut)
==============================================================================================
nu-fuentes.json es la descarga casi sin procesar de obtener-nu-localidades.py
(GitHub Actions) y no se guarda en el repositorio. Este script conserva solo
los campos que usa provincias/nunavut.mjs, sin cambiar ningún valor oficial
(no se calcula ni se redondea ninguna cifra).

Geometría: las tres regiones de Nunavut (divisiones censales) tienen miles de
islas. Para el mapa se conservan los polígonos de más de 400 km² y se
simplifican con Douglas-Peucker (tolerancia de 2.5 km), en metros (EPSG:3347).
Es un mapa de ubicación, no un mapa oficial de límites.

USO:
  python3 scripts/canada-en-datos/obtener-nu-localidades.py   (en GitHub Actions)
  python3 scripts/canada-en-datos/compactar-nu.py
"""
import json, math, pathlib

BASE = pathlib.Path(__file__).parent
F = json.loads((BASE / "nu-fuentes.json").read_text(encoding="utf-8"))

AREA_MIN = 400e6   # m²
TOL = 2500         # m


def area(anillo):
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(anillo, anillo[1:] + anillo[:1]))) / 2


def dp(pts, tol):
    if len(pts) < 4:
        return pts
    marca = [False] * len(pts)
    marca[0] = marca[-1] = True
    pila = [(0, len(pts) - 1)]
    while pila:
        i, j = pila.pop()
        (ax, ay), (bx, by) = pts[i], pts[j]
        dx, dy = bx - ax, by - ay
        l = dx * dx + dy * dy
        mx, k = 0, -1
        for x in range(i + 1, j):
            px, py = pts[x]
            t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l)) if l else 0
            d = math.hypot(px - ax - t * dx, py - ay - t * dy)
            if d > mx:
                mx, k = d, x
        if mx > tol:
            marca[k] = True
            pila += [(i, k), (k, j)]
    return [p for p, m in zip(pts, marca) if m]


def reduce(geo):
    polis = [geo["coordinates"]] if geo["type"] == "Polygon" else geo["coordinates"]
    salida = []
    for p in polis:
        exterior = p[0]
        if area(exterior) < AREA_MIN:
            continue
        anillo = dp(exterior, TOL)
        if len(anillo) >= 4:
            salida.append([[[round(x), round(y)] for x, y in anillo]])
    return {"type": "MultiPolygon", "coordinates": salida}


C = "Population and dwelling counts (13): "
CAMPOS = {
    "p": C + "Population, 2021 [1]",
    "p16": C + "Population, 2016 [2]",
    "cambio": C + "Population percentage change, 2016 to 2021 [3]",
    "viviendas": C + "Total private dwellings, 2021 [4]",
    "superficie": C + "Land area in square kilometres, 2021 [10]",
    "densidad": C + "Population density per square kilometre, 2021 [11]",
}
censo = lambda dguid: [F["censo"].get(dguid, {}).get(v) for v in CAMPOS.values()]
er = next(iter(F["er"]))

# ------------------------------------------------------------ Escuelas (ODEF 2022)
# La mayoría de las filas de Nunavut en la ODEF no tienen coordenadas ni código
# de subdivisión: se asignan por el campo «City», que siempre trae la comunidad.
# Apex es un barrio de Iqaluit (CGNDB). Nunavut Arctic College es postsecundaria
# y se presenta aparte. Los nombres se corrigen solo con la grafía del Gobierno
# de Nunavut (calendario escolar territorial 2025-26).
CIUDAD = {"iqaluit": "Iqaluit", "iqaluit (csfn)": "Iqaluit", "apex": "Iqaluit", "resolute bay": "Resolute", "qikiqtaruaq": "Qikiqtarjuaq",
          "kinngait": "Cape Dorset", "sanirajak": "Hall Beach", "naujaat": "Naujaat"}
NOMBRE_OFICIAL = json.loads((BASE / "nu-escuelas-nombres.json").read_text(encoding="utf-8")) if (BASE / "nu-escuelas-nombres.json").exists() else {}


def escuelas():
    por_nombre = {c["CSDNAME"].lower(): c["CSDUID"] for c in F["csd"]}
    filas = []
    for e in F.get("educacion", []):
        if (e.get("Facility_Type") or "").startswith("Private Institution") or e.get("Facility_Name") == "Nunavut Arctic College":
            continue
        ciudad = (e.get("City") or "").strip()
        nombre_csd = CIUDAD.get(ciudad.lower(), ciudad)
        csd = e.get("CSDUID") or por_nombre.get(nombre_csd.lower())
        if not csd:
            raise SystemExit(f"Escuela sin comunidad: {e.get('Facility_Name')} ({ciudad})")
        if e.get("csd") and e["csd"] != csd:
            raise SystemExit(f"Escuela con comunidad contradictoria: {e.get('Facility_Name')} {e['csd']} ≠ {csd}")
        nombre = e.get("Facility_Name").strip()
        filas.append([NOMBRE_OFICIAL.get(nombre, nombre), nombre, e.get("Authority_Name"), ciudad, csd])
    return filas


salida = {
    "consultado": F["consultado"],
    "fuentes": F["fuentes"],
    "territorio": censo("2021A000262"),
    "regiones": [[c["CDUID"], c["CDNAME"], censo("2021A0003" + c["CDUID"])] for c in sorted(F["cd"], key=lambda c: c["CDUID"])],
    "cd_geo": {c["CDUID"]: reduce(c["geo"]) for c in F["cd"]},
    "er": F["er"],
    "censo_campos": list(CAMPOS),
    "csd": [
        [c["CSDUID"], c["CSDNAME"], c["CSDTYPE"], c["CSDUID"][:4], er, c["x"], c["y"], c["lat"], c["lon"], censo(c["DGUID"])]
        for c in sorted(F["csd"], key=lambda c: c["CSDUID"])
    ],
    "csd_campos": ["id", "nombre", "tipo", "cd", "er", "x", "y", "lat", "lon", "censo"],
    "cgn": [[g["id"], g["n"], g["t"], g["csd"], g["x"], g["y"], g["lat"], g["lon"], g["fecha"]] for g in F["cgn"]],
    "cgn_campos": ["id", "nombre", "tipo", "csd", "x", "y", "lat", "lon", "fecha"],
    "hospitales": [[h["facility_name"], h.get("city"), h["csd"], h["lat"], h["lon"]] for h in F.get("salud", []) if h.get("odhf_facility_type") == "Hospitals"],
    "hospitales_campos": ["nombre", "localidad", "csd", "lat", "lon"],
    "escuelas": escuelas(),
    "escuelas_campos": ["nombre", "nombre_odef", "autoridad", "ciudad_odef", "csd"],
}
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(BASE / "nu-localidades.json").write_text(texto, encoding="utf-8")
print("nu-localidades.json:", len(texto), "bytes;", {k: sum(len(p[0]) for p in g["coordinates"]) for k, g in salida["cd_geo"].items()}, "vértices por región")
