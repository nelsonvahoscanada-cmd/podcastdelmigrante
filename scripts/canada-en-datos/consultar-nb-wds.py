"""
consultar-nb-wds.py — Cifras de Statistics Canada para Nuevo Brunswick (API oficial WDS)
========================================================================================
Solo lectura. Statistics Canada rechaza (403) las descargas de tablas en CSV
desde los servidores de GitHub Actions; su servicio web oficial de datos
(Web Data Service, WDS) sí responde desde el entorno de desarrollo y devuelve
las mismas cifras publicadas en cada tabla. No se sortea ninguna protección:
se usan los métodos documentados del WDS con curl.
https://www.statcan.gc.ca/en/developers/wds/user-guide

Escribe scripts/canada-en-datos/nb-wds.json con:
  provincia   población estimada, migración internacional, PIB, Encuesta de
              Población Activa (mensual y anual), salarios, idiomas oficiales,
              inmigración y población latinoamericana del Censo 2021.
  censo       98-10-0002-01 (Censo 2021): provincia, 15 condados y 266
              subdivisiones censales (población 2021 y 2016, cambio,
              viviendas privadas, superficie y densidad).
  epa         14-10-0464-01 y 14-10-0466-01: Encuesta de Población Activa
              anual por región económica (2025).
Cada bloque guarda la tabla, el período de referencia y la fecha de consulta.
No se calcula ni redondea ninguna cifra: se guarda el valor publicado.

USO: python3 scripts/canada-en-datos/consultar-nb-wds.py
"""
import datetime, json, pathlib, re, subprocess

API = "https://www150.statcan.gc.ca/t1/wds/rest/"
BASE = pathlib.Path(__file__).parent
HOY = datetime.date.today().isoformat()
NB = "New Brunswick"


def post(metodo, cuerpo):
    out = subprocess.run(["curl", "-s", "-m", "180", "-X", "POST", "-H", "Content-Type: application/json", "-d", json.dumps(cuerpo), API + metodo], capture_output=True, check=True).stdout
    return json.loads(out)


_META = {}


def meta(pid):
    if pid not in _META:
        _META[pid] = post("getCubeMetadata", [{"productId": pid}])[0]["object"]
    return _META[pid]


def miembro(pid, dim, nombre):
    for d in meta(pid)["dimension"]:
        if d["dimensionPositionId"] == dim:
            for x in d["member"]:
                if x["memberNameEn"] == nombre:
                    return x["memberId"]
    raise KeyError(f"{pid}: dimensión {dim} sin «{nombre}»")


def coord(pid, pares):
    ids = [miembro(pid, d, v) for d, v in pares]
    return ".".join(map(str, ids + [0] * (10 - len(ids))))


def lote(pid, coords, n=1):
    """Varias series en una llamada. El WDS no respeta el orden: se empareja por coordenada."""
    res = {}
    for i in range(0, len(coords), 100):
        r = post("getDataFromCubePidCoordAndLatestNPeriods", [{"productId": pid, "coordinate": c, "latestN": n} for c in coords[i:i + 100]])
        for o in r:
            if o["status"] == "SUCCESS":
                res[o["object"]["coordinate"]] = [(p["refPer"], p["value"], p.get("statusCode")) for p in o["object"]["vectorDataPoint"]]
    return res


def tabla(pid):
    m = meta(pid)
    return {"tabla": f"{str(pid)[:2]}-{str(pid)[2:4]}-{str(pid)[4:8]}-01", "titulo": m["cubeTitleEn"], "publicada": m.get("releaseTime"), "consultado": HOY}


def series(pid, nombre_pares, n):
    cs = {k: coord(pid, p) for k, p in nombre_pares.items()}
    r = lote(pid, list(cs.values()), n)
    return {**tabla(pid), "series": {k: r.get(c) for k, c in cs.items()}}


salida = {"consultado": HOY, "fuente": "Statistics Canada — Web Data Service (WDS)", "provincia": {}}
P = salida["provincia"]

# ------------------------------------------------------------ Población e inmigración
P["poblacion"] = series(17100009, {"total": [(1, NB)]}, 8)
comp = [x["memberNameEn"] for x in meta(17100040)["dimension"][1]["member"]]
P["migracion"] = series(17100040, {c: [(1, NB), (2, c)] for c in comp}, 8)

# ------------------------------------------------------------ Economía
P["pib"] = series(36100222, {"corrientes": [(1, NB), (2, "Current prices"), (3, "Gross domestic product at market prices")]}, 3)

# ------------------------------------------------------------ Empleo y salarios
EPA = ["Unemployment rate", "Participation rate", "Employment rate", "Employment", "Population"]
P["epa_mensual"] = series(14100287, {
    **{c: [(1, NB), (2, c), (3, "Total - Gender"), (4, "15 years and over"), (5, "Estimate"), (6, "Seasonally adjusted")] for c in EPA},
    "Unemployment rate 15-24": [(1, NB), (2, "Unemployment rate"), (3, "Total - Gender"), (4, "15 to 24 years"), (5, "Estimate"), (6, "Seasonally adjusted")],
}, 4)
P["epa_anual"] = series(14100327, {c: [(1, NB), (2, c), (3, "Total - Gender"), (4, "15 years and over")] for c in EPA[:4]}, 3)
P["salarios"] = series(14100064, {w: [(1, NB), (2, w), (3, "Both full- and part-time employees"), (4, "Total employees, all industries"), (5, "Total - Gender"), (6, "15 years and over")] for w in ["Average hourly wage rate", "Median hourly wage rate"]}, 3)

# ------------------------------------------------------------ Censo 2021: idiomas, inmigración, latinoamericanos
LENG = ["Total - Knowledge of official languages", "English only", "French only", "English and French", "Neither English nor French"]
P["idiomas"] = series(98100222, {**{k: [(1, NB), (2, "Total - Age"), (3, k), (4, "2021 Counts")] for k in LENG}, **{k + " %": [(1, NB), (2, "Total - Age"), (3, k), (4, "% distribution (2021)")] for k in LENG}}, 1)
nac = [x["memberNameEn"] for x in meta(98100307)["dimension"][3]["member"]][0]
P["inmigracion"] = series(98100307, {k: [(1, NB), (2, "Total - Age"), (3, "Total - Gender"), (4, nac), (5, k)] for k in ["Total - Immigrant status and period of immigration", "Non-immigrants", "Immigrants", "2016 to 2021", "Non-permanent residents"]}, 1)
P["minorias"] = series(98100308, {k: [(1, NB), (2, "Total - Age"), (3, "Total - Gender"), (4, "Count"), (5, k), (6, "Total - Immigrant status and period of immigration")] for k in ["Total - Visible minority", "Total visible minority population", "Latin American"]}, 1)

# ------------------------------------------------------------ Censo 2021 por subdivisión censal (98-10-0002-01)
m = meta(98100002)
geo = [x for x in m["dimension"][0]["member"] if (x.get("classificationCode") or "").startswith("13")]
med = {x["memberNameEn"]: x["memberId"] for x in m["dimension"][1]["member"]}
CAMPOS = {"p": "Population, 2021", "p16": "Population, 2016", "cambio": "Population percentage change, 2016 to 2021", "viviendas": "Total private dwellings, 2021", "superficie": "Land area in square kilometres, 2021", "densidad": "Population density per square kilometre, 2021"}
pedidos = {(g["classificationCode"], k): f"{g['memberId']}.{med[v]}.0.0.0.0.0.0.0.0" for g in geo for k, v in CAMPOS.items()}
r = lote(98100002, list(pedidos.values()))
censo = {}
for (cod, k), c in pedidos.items():
    g = next(x for x in geo if x["classificationCode"] == cod)
    reg = censo.setdefault(cod, {"nombre": g["memberNameEn"], "nivel": g["geoLevel"]})
    v = r.get(c)
    reg[k] = v[0][1] if v else None
salida["censo"] = {**tabla(98100002), "campos": list(CAMPOS), "datos": censo}

# ------------------------------------------------------------ Encuesta de Población Activa por región económica (anual)
claves = re.findall(r'^  "([^"]+ \[[^"]+\])":', (BASE / "localidades.mjs").read_text(encoding="utf-8"), re.M)
epa = {}
for pid, clave in ((14100464, "lfs"), (14100466, "industrias")):
    md = meta(pid)
    regiones = [x for x in md["dimension"][0]["member"] if NB in x["memberNameEn"]]
    caracteristicas = md["dimension"][1]["member"]
    if clave == "industrias":
        caracteristicas = [x for x in caracteristicas if x["memberNameEn"] == "Total employed" or any(c.split(" [")[0] == x["memberNameEn"] for c in claves)]
    fijos = []
    for d in md["dimension"][2:]:
        est = [x for x in d["member"] if x["memberNameEn"] in ("Estimate", "Total - Gender", "15 years and over")]
        fijos.append((est or d["member"])[0]["memberId"])
    cs = {}
    for g in regiones:
        for c in caracteristicas:
            cs[(g["memberNameEn"], c["memberNameEn"])] = ".".join(map(str, [g["memberId"], c["memberId"]] + fijos + [0] * (8 - len(fijos))))
    r = lote(pid, list(cs.values()))
    for (gn, cn), c in cs.items():
        v = r.get(c)
        if not v:
            continue
        ref, valor, estado = v[0]
        reg = epa.setdefault(gn, {"anio": ref[:4]})
        nombre = "Total employed, all industries" if cn == "Total employed" else next((k for k in claves if k.split(" [")[0] == cn), cn)
        reg.setdefault(clave, {})[nombre] = {"v": "" if valor is None else str(valor), "uom": "", "status": "" if estado in (0, None) else str(estado), "escala": "thousands" if nombre != "Unemployment rate" and not nombre.endswith("rate") else ""}
salida["epa"] = {"tablas": [tabla(14100464), tabla(14100466)], "datos": epa}

texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(BASE / "nb-wds.json").write_text(texto, encoding="utf-8")
print("nb-wds.json:", len(texto), "bytes")
print("población:", P["poblacion"]["series"]["total"][-1], "| desempleo:", P["epa_mensual"]["series"]["Unemployment rate"][-1], "| CSD:", sum(1 for k in censo if len(k) == 7), "| regiones EPA:", list(epa))
