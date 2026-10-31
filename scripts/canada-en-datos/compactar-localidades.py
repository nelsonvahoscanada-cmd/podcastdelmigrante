"""
compactar-localidades.py — Reduce <abrev>-fuentes.json a <abrev>-localidades.json (lo que usa la guía)
=====================================================================================================
Versión general de compactar-sk.py. <abrev>-fuentes.json es la descarga casi
sin procesar de obtener-localidades-censo.py y no se guarda en el
repositorio. Este script conserva solo los campos que usa el módulo de la
provincia, sin cambiar ningún valor (no se calcula ni se redondea ninguna
cifra oficial).

USO:
  python3 scripts/canada-en-datos/obtener-localidades-censo.py mb   (en GitHub Actions)
  python3 scripts/canada-en-datos/compactar-localidades.py mb
"""
import json, pathlib, sys

AB = sys.argv[1]
PR = {"mb": "46", "qc": "24"}[AB]
BASE = pathlib.Path(__file__).parent
F = json.loads((BASE / f"{AB}-fuentes.json").read_text(encoding="utf-8"))

C = "Population and dwelling counts (13): "
CAMPOS = {
    "p": C + "Population, 2021 [1]",
    "p16": C + "Population, 2016 [2]",
    "cambio": C + "Population percentage change, 2016 to 2021 [3]",
    "viviendas": C + "Total private dwellings, 2021 [4]",
    "superficie": C + "Land area in square kilometres, 2021 [10]",
    "densidad": C + "Population density per square kilometre, 2021 [11]",
}
D = "Population and dwelling counts (7): "
CAMPOS_DPL = {
    "p": D + "Population, 2021 [1]",
    "p16": D + "Population, 2016 [2]",
    "cambio": D + "Population percentage change, 2016 to 2021 [3]",
    "viviendas": D + "Total private dwellings, 2021 [4]",
    "superficie": D + "Land area in square kilometres, 2021 [6]",
    "densidad": D + "Population density per square kilometre, 2021 [7]",
}
def simplifica(anillo, tol):
    """Douglas-Peucker en metros (EPSG:3347): solo reduce el contorno de las divisiones censales del mapa."""
    if len(anillo) < 5:
        return anillo
    marca = [False] * len(anillo)
    marca[0] = marca[-1] = True
    pila = [(0, len(anillo) - 1)]
    while pila:
        i, j = pila.pop()
        (ax, ay), (bx, by) = anillo[i], anillo[j]
        dx, dy = bx - ax, by - ay
        l = dx * dx + dy * dy
        dmax, k = 0, -1
        for x in range(i + 1, j):
            px, py = anillo[x]
            t_ = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l)) if l else 0
            d = ((px - ax - t_ * dx) ** 2 + (py - ay - t_ * dy) ** 2) ** 0.5
            if d > dmax:
                dmax, k = d, x
        if dmax > tol:
            marca[k] = True
            pila += [(i, k), (k, j)]
    return [p for p, m in zip(anillo, marca) if m]


def geo_simple(geo, tol):
    if not tol:
        return geo
    polis = [geo["coordinates"]] if geo["type"] == "Polygon" else geo["coordinates"]
    salida = []
    for p in polis:
        tam = lambda a: max(max(x for x, _ in a) - min(x for x, _ in a), max(y for _, y in a) - min(y for _, y in a))
        anillos = [simplifica(a, tol) for a in p if tam(a) >= 4 * tol]
        if anillos and tam(p[0]) >= 4 * tol and len(anillos[0]) >= 4:  # islas, islotes y lagos de menos de 4 veces la tolerancia no se dibujan
            salida.append([a for a in anillos if len(a) >= 4])
    return {"type": "MultiPolygon", "coordinates": salida}


TOL = {"qc": 1500}.get(AB, 0)  # Quebec: contorno de 98 divisiones censales, tolerancia de 1,5 km (el mapa mide 600 px)
censo = lambda dguid: [F["censo"].get(dguid, {}).get(v) for v in CAMPOS.values()]
censo_dpl = lambda dguid: [F["censo_dpl"].get(dguid, {}).get(v) for v in CAMPOS_DPL.values()]
ca_de = {c: m["CMANAME"] for m in F["cma"] for c in m["csd"]}

salida = {
    "consultado": F["consultado"],
    "fuentes": F["fuentes"],
    "provincia": censo("2021A0002" + PR),
    "divisiones": [[c["CDUID"], c["CDNAME"], c["ERUID"], censo("2021A0003" + c["CDUID"])] for c in F["cd"]],
    "cd_geo": {c["CDUID"]: geo_simple(c["geo"], TOL) for c in F["cd"]},
    "er": F["er"],
    "censo_campos": list(CAMPOS),
    "csd": [
        [c["CSDUID"], c["CSDNAME"], c["CSDTYPE"], c["CSDUID"][:4], ca_de.get(c["CSDUID"]), c["ERUID"], c["x"], c["y"], c["lat"], c["lon"], censo(c["DGUID"])]
        for c in F["csd"]
    ],
    "csd_campos": ["id", "nombre", "tipo", "cd", "ca", "er", "x", "y", "lat", "lon", "censo"],
    "dpl": [[d["DPLUID"], d["DPLNAME"], d["DPLTYPE"], d["csd"], d["x"], d["y"], d["lat"], d["lon"], censo_dpl(d["DGUID"])] for d in F["dpl"]],
    "dpl_campos": ["uid", "nombre", "tipo", "csd", "x", "y", "lat", "lon", "censo"],
    "cgn": [[g["id"], g["n"], g["t"], g["csd"], g["x"], g["y"], g["lat"], g["lon"]] for g in F["cgn"]],
    "cgn_campos": ["id", "nombre", "tipo", "csd", "x", "y", "lat", "lon"],
    "epa": F["epa"],
    "cmhc": F["cmhc"],
    "salud": [[h["facility_name"], h.get("city"), h.get("source_facility_type"), h.get("provider"), h["csd"], h["lat"], h["lon"]] for h in F.get("salud", []) if h.get("odhf_facility_type") == "Hospitals" or "regional health centre" in h["facility_name"]],
    "salud_campos": ["nombre", "localidad", "tipo_fuente", "proveedor", "csd", "lat", "lon"],
    "escuelas": [
        [e.get("Facility_Name"), e.get("Facility_Type"), e.get("Authority_Name"), "".join("1" if e.get(k) == "1" else "0" for k in ("ISCED010", "ISCED020", "ISCED1", "ISCED2", "ISCED3", "ISCED4Plus")), e.get("csd")]
        for e in F.get("educacion", [])
    ],
    "escuelas_campos": ["nombre", "tipo", "autoridad", "niveles", "csd"],
}
# Quebec: Répertoire des municipalités du Québec (MAMH, Données Québec, CC BY 4.0), descargado con
# obtener-qc-municipios.py. Se conservan solo los campos que usa la guía, sin cambiar valores.
mamh = BASE / f"{AB}-mamh-MUN.csv"
if mamh.exists():
    import csv
    meta = json.loads((BASE / f"{AB}-mamh-meta.json").read_text(encoding="utf-8"))
    filas = list(csv.DictReader(mamh.open(encoding="utf-8-sig")))
    salida["mamh"] = {
        "modificado": meta.get("modificado"), "licencia": meta.get("licencia"),
        "campos": ["nombre", "designacion", "region", "mrc", "web", "poblacion", "constitucion"],
        "filas": {f["mcode"]: [f["munnom"], f["mdes"], f["regadm"], f["mrc"], f["mweb"], f["mpopul"], f["mdatcons"]] for f in filas},
    }
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(BASE / f"{AB}-localidades.json").write_text(texto, encoding="utf-8")
print(f"{AB}-localidades.json:", len(texto), "bytes")
