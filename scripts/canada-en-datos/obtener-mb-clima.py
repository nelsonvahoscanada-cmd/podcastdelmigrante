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
for nombre in ["WINNIPEG RICHARDSON INT'L A", "BRANDON A", "THOMPSON A", "THE PAS A", "DAUPHIN A", "FLIN FLON A", "CHURCHILL A"]:
    print(f"\n=== {nombre} ===", flush=True)
    try:
        est = get(f"{API}/climate-stations/items?" + urllib.parse.urlencode({"f": "json", "STATION_NAME": nombre, "PROV_STATE_TERR_CODE": "MB", "limit": 5}))
        for f in est["features"]:
            p = f["properties"]
            print("estación:", p["STATION_NAME"], p["CLIMATE_IDENTIFIER"], "normales:", p.get("HAS_NORMALS_DATA"))
        if not est["features"]:
            continue
        cid = est["features"][0]["properties"]["CLIMATE_IDENTIFIER"]
        d = get(f"{API}/climate-normals/items?" + urllib.parse.urlencode({"f": "json", "CLIMATE_IDENTIFIER": cid, "limit": 2000}))
        filas = {}
        for f in d["features"]:
            p = f["properties"]
            filas.setdefault(p.get("E_NORMAL_ELEMENT_NAME"), {})[p.get("MONTH")] = (p.get("VALUE"), p.get("FIRST_YEAR"), p.get("LAST_YEAR"), p.get("NORMAL_CODE"))
        for el, meses in filas.items():
            if el and any(k in el for k in ["Mean daily temperature", "Mean daily max", "Mean daily min", "Total precipitation", "Total snowfall", "Total rainfall", "Extreme"]):
                print(" ", el, {m: v[0] for m, v in sorted(meses.items(), key=lambda kv: (kv[0] is None, kv[0]))}, "período:", next(iter(meses.values()))[1:3])
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])
