"""
obtener-mb-clima.py — Normales climáticas de Environment and Climate Change Canada (solo lectura)
Consulta la API MSC GeoMet (collections/climate-normals) para estaciones de Manitoba y
imprime las temperaturas medias, máximas y mínimas mensuales y la precipitación anual.
"""
import json, urllib.parse, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
API = "https://api.weather.gc.ca/collections"
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120) as r:
        return json.loads(r.read())
for cid in ["5023222", "5010480", "5062922", "5052880", "5040680", "5060600"]:
    print(f"\n=== {cid} ===", flush=True)
    try:
        d = get(f"{API}/climate-normals/items?" + urllib.parse.urlencode({"f": "json", "CLIMATE_IDENTIFIER": cid, "limit": 3000}))
        feats = d["features"]
        if not feats:
            print("sin normales")
            continue
        p0 = feats[0]["properties"]
        print("estación:", p0.get("STATION_NAME"), "| campos:", sorted(p0)[:40])
        print("período:", {k: p0.get(k) for k in p0 if "YEAR" in k or "PERIOD" in k or "NORMAL_CODE" in k})
        filas = {}
        for f in feats:
            p = f["properties"]
            filas.setdefault(p.get("E_NORMAL_ELEMENT_NAME"), {})[p.get("MONTH")] = p.get("VALUE")
        for el, meses in filas.items():
            if el and any(k in el for k in ["Mean daily temperature", "Mean daily max", "Mean daily min", "Total precipitation", "Total snowfall", "Extreme"]):
                print(" ", el, dict(sorted(meses.items(), key=lambda kv: (kv[0] is None, kv[0]))))
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])
