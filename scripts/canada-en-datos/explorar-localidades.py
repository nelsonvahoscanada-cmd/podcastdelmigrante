"""Exploración (solo lectura): límites censales 2021 publicados por el Gobierno de Alberta."""
import json, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
def js(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r: return json.loads(r.read())
G = "https://geospatial.alberta.ca/titan/rest/services"
for svc in ["census/census_boundaries_2021"]:
    d = js(f"{G}/{svc}/MapServer?f=json")
    print(d.get("serviceDescription", "")[:400], d.get("copyrightText"))
    for l in js(f"{G}/{svc}/MapServer/layers?f=json")["layers"]:
        print("layer", l["id"], l["name"], l.get("geometryType"), [f["name"] for f in (l.get("fields") or [])])
        if l.get("type") == "Feature Layer":
            try:
                c = js(f"{G}/{svc}/MapServer/{l['id']}/query?where=1%3D1&returnCountOnly=true&f=json")
                s = js(f"{G}/{svc}/MapServer/{l['id']}/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=3&f=json")
                print("   ", c, json.dumps([f["attributes"] for f in s.get("features", [])], ensure_ascii=False)[:700])
            except Exception as e: print("   ERR", e)
