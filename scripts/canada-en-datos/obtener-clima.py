"""
obtener-clima.py — Normales climáticas de Environment and Climate Change Canada (solo lectura)
Versión general de obtener-mb-clima.py. Uso: python3 obtener-clima.py <PROV> <nombre de estación>…
Busca en la API MSC GeoMet (collections/climate-stations) las estaciones de la provincia con
normales cuyo nombre contenga cada texto, y para cada una imprime las temperaturas medias,
máximas y mínimas mensuales y la precipitación y nevada.
"""
import json, sys, urllib.parse, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
API = "https://api.weather.gc.ca/collections"
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120) as r:
        return json.loads(r.read())
PROV, NOMBRES = sys.argv[1], sys.argv[2:]
est = get(f"{API}/climate-stations/items?" + urllib.parse.urlencode({"f": "json", "PROV_STATE_TERR_CODE": PROV, "HAS_NORMALS_DATA": "Y", "limit": 5000}))["features"]
print("estaciones con normales:", len(est))
for nombre in NOMBRES:
    cands = [e["properties"] for e in est if nombre.upper() in (e["properties"].get("STATION_NAME") or "").upper()]
    print(f"\n### {nombre}:", [(c["STATION_NAME"], c["CLIMATE_IDENTIFIER"], c.get("FIRST_DATE", "")[:4], c.get("LAST_DATE", "")[:4]) for c in cands][:8], flush=True)
    for c in cands[:3]:
        cid = c["CLIMATE_IDENTIFIER"]
        try:
            feats = get(f"{API}/climate-normals/items?" + urllib.parse.urlencode({"f": "json", "CLIMATE_IDENTIFIER": cid, "limit": 3000}))["features"]
        except Exception as e:
            print(" ERROR", cid, e); continue
        if not feats:
            continue
        p0 = feats[0]["properties"]
        print(f" == {c['STATION_NAME']} ({cid}) período:", {k: p0.get(k) for k in p0 if "YEAR" in k or "NORMAL_CODE" in k or "PERIOD" in k})
        filas = {}
        for f in feats:
            p = f["properties"]
            filas.setdefault(p.get("E_NORMAL_ELEMENT_NAME"), {})[p.get("MONTH")] = p.get("VALUE")
        for el, meses in filas.items():
            if el and any(k in el for k in ["Mean daily temperature", "Mean daily max", "Mean daily min", "Total precipitation", "Total snowfall"]):
                print("  ", el, dict(sorted(meses.items(), key=lambda kv: (kv[0] is None, kv[0]))))
