"""Exploración (solo lectura) de las fuentes oficiales de localidades de Alberta."""
import json, sys, urllib.request, urllib.parse

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}

def get(url, n=None):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        b = r.read()
    return b if n is None else b[:n]

def js(url):
    return json.loads(get(url))

for svc in ["boundaries/municipal_communities_public", "boundaries/municipal_boundary_public"]:
    for kind in ["FeatureServer", "MapServer"]:
        u = f"https://geospatial.alberta.ca/titan/rest/services/{svc}/{kind}/layers?f=json"
        try:
            d = js(u)
            print("==", u)
            for l in d.get("layers", []):
                print(" layer", l["id"], l["name"], l.get("geometryType"), "| desc:", (l.get("description") or "")[:300].replace("\n", " "))
                print("   fields:", [(f["name"], f.get("alias")) for f in l.get("fields", [])])
                try:
                    c = js(f"https://geospatial.alberta.ca/titan/rest/services/{svc}/{kind}/{l['id']}/query?where=1%3D1&returnCountOnly=true&f=json")
                    print("   count:", c)
                    s = js(f"https://geospatial.alberta.ca/titan/rest/services/{svc}/{kind}/{l['id']}/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=3&f=json")
                    print("   sample:", json.dumps([f["attributes"] for f in s.get("features", [])], ensure_ascii=False)[:1500])
                except Exception as e:
                    print("   query error", e)
            break
        except Exception as e:
            print("ERR", u, e)

for q in ["alberta-municipal-affairs-population-list"]:
    try:
        d = js("https://open.alberta.ca/api/3/action/package_show?id=" + q)["result"]
        print("== CKAN", d["title"], d.get("metadata_modified"))
        for r in d["resources"]:
            print("  ", r.get("name"), r.get("format"), r.get("url"), r.get("last_modified") or r.get("created"))
    except Exception as e:
        print("ERR CKAN", q, e)

for u in ["https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm?Lang=E",
          "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410006401",
          "https://www.alberta.ca/types-of-municipalities-in-alberta",
          "https://www.alberta.ca/municipal-profiles"]:
    try:
        b = get(u, 400000).decode("utf-8", "ignore")
        import re
        t = re.search(r"<title>(.*?)</title>", b, re.S)
        print("OK", u, (t.group(1).strip() if t else "")[:120], "unavailable" in b.lower())
    except Exception as e:
        print("ERR", u, e)
