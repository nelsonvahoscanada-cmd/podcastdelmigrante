import json, urllib.parse, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
GEO = "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer"
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=300) as r:
        return r.read()
d = json.loads(get(f"{GEO}/9?f=json"))
print("campos:", [(f["name"], f["type"]) for f in d.get("fields", [])])
print("maxRecordCount:", d.get("maxRecordCount"), "formatos:", d.get("supportedQueryFormats"), "capabilities:", d.get("capabilities"))
for q in [
    {"where": "PRUID='59'", "outFields": "CSDUID", "returnGeometry": "false", "f": "json", "resultRecordCount": 5},
    {"where": "PRUID='59'", "returnCountOnly": "true", "f": "json"},
    {"where": "CSDUID LIKE '59%'", "returnCountOnly": "true", "f": "json"},
    {"where": "PRUID='59'", "outFields": "*", "returnGeometry": "true", "outSR": "3347", "f": "geojson", "resultRecordCount": 5},
    {"where": "PRUID='59'", "outFields": "*", "returnGeometry": "true", "f": "json", "resultRecordCount": 5, "maxAllowableOffset": 100},
    {"where": "PRUID='59'", "outFields": "*", "returnGeometry": "true", "f": "geojson", "resultRecordCount": 5},
    {"where": "PRUID='59'", "outFields": "*", "returnGeometry": "true", "f": "geojson", "resultOffset": 0, "resultRecordCount": 5, "maxAllowableOffset": 100},
]:
    try:
        r = json.loads(get(f"{GEO}/9/query?" + urllib.parse.urlencode(q)))
        feats = r.get("features", [])
        print("OK", q, "→", r.get("count"), len(feats), (feats[0].get("properties") or feats[0].get("attributes")) if feats else r.get("error"), "sr:", r.get("spatialReference") or r.get("crs"))
    except Exception as e:
        print("ERROR", q, e)
