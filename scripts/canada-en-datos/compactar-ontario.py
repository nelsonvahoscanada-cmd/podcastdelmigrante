"""
compactar-ontario.py — Reduce los datos descargados de Ontario a lo que usa el generador
=========================================================================================
Se ejecuta después de obtener-ontario-localidades.py, obtener-ontario-
complementos.py y obtener-ontario-complementos2.py. No cambia ningún
valor: solo quita columnas y registros que las páginas no usan (p. ej. la
geometría de los municipios de nivel inferior, que no se dibuja).

Uso: python3 scripts/canada-en-datos/compactar-ontario.py
"""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent


def leer(n):
    return json.loads((BASE / n).read_text(encoding="utf-8"))


def escribir(n, d):
    (BASE / n).write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(n, (BASE / n).stat().st_size // 1024, "KB")


def rdp(pts, tol):
    """Douglas-Peucker (metros). El mapa se dibuja a ~2.3 km por píxel: 1 km no cambia el dibujo."""
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
            d = ((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) ** 0.5
            if d > mx:
                mx, k = d, x
        if mx > tol:
            marca[k] = True
            pila += [(i, k), (k, j)]
    return [p for p, m in zip(pts, marca) if m]


def simplifica(geo, tol=1000):
    polis = [geo["coordinates"]] if geo["type"] == "Polygon" else geo["coordinates"]
    nuevos = [[rdp(a, tol) for a in p] for p in polis]
    nuevos = [[a for a in p if len(a) >= 4] for p in nuevos]
    nuevos = [p for p in nuevos if p]
    return {"type": "MultiPolygon", "coordinates": nuevos}


F = leer("ontario-fuentes.json")
CAMPOS = ["MUNICIPAL_TYPE", "MUNICIPAL_NAME", "MUNICIPAL_NAME_PREFIX", "MUNICIPAL_NAME_SHORTFORM", "MUNID", "UPPER_TIER_MUNICIPALITY"]
for x in F["lio"]["inferior"]:
    x["a"] = {k: x["a"].get(k) for k in CAMPOS}
    if "single" not in (x["a"]["MUNICIPAL_TYPE"] or "").lower():
        x.pop("geo", None)
    elif "geo" in x:
        x["geo"] = simplifica(x["geo"])
for x in F["lio"].get("superior", []):
    x["a"] = {k: x["a"].get(k) for k in ("MUNICIPAL_TYPE", "MUNICIPAL_NAME", "MUNID")}
    x["geo"] = simplifica(x["geo"])
POB = ["GEO", "Population and dwelling counts (13): Population, 2021 [1]", "Population and dwelling counts (13): Population, 2016 [2]", "Population and dwelling counts (13): Population percentage change, 2016 to 2021 [3]"]
F["censo"] = {k: {c: v[c] for c in POB if c in v} for k, v in F["censo"].items()}
F.pop("escuelas", None)  # edición 2019-2020: la vigente está en ontario-complementos.json
F.pop("er_sgc", None)    # sustituido por ontario-er-cd.json
escribir("ontario-fuentes.json", F)

C = leer("ontario-complementos.json")
E = C["escuelas"]
usar = [E["cabecera"].index(c) for c in ("Board Name", "Board Type", "School Language", "City", "Board Website")]
E["filas"] = [[f[i] for i in usar] for f in E["filas"]]
E["cabecera"] = [E["cabecera"][i] for i in usar]
for u, a in C["sgc"]["archivos"].items():
    if "element" in u:
        if a["filas"] and len(a["filas"][0]) >= 5:  # idempotente: solo si aún no está compactado
            a["filas"] = [[f[1], f[4]] for f in a["filas"] if f[3] == "Place name(s)"]
        a["cabecera"] = ["Code", "Place name(s)"]
    else:
        a["filas"] = []
C["sgc"]["paginas"] = {}
C.pop("hospitales", None)
escribir("ontario-complementos.json", C)

C2 = leer("ontario-complementos2.json")
for k, v in list(C2["hospitales"].items()):
    if isinstance(v, dict) and "filas" in v:
        v["filas"] = [{c: f.get(c) for c in ("ENGLISH_NAME", "SERVICE_TYPE", "SERVICE_TYPE_DETAIL", "COMMUNITY")} for f in v["filas"] if f.get("SERVICE_TYPE") == "Hospital"]
C2.pop("er", None)
escribir("ontario-complementos2.json", C2)
