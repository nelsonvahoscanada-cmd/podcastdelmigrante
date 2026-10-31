"""
obtener-qc-urgencias.py — Instalaciones con urgencias en Quebec (MSSS, Données Québec), solo lectura
Busca por la API CKAN de Données Québec el conjunto de datos de la situación en las urgencias del
Ministère de la Santé et des Services sociaux y guarda sus recursos CSV sin cambios (nombre de la
instalación, establecimiento y región). Se ejecuta en GitHub Actions.
"""
import json, pathlib, sys, urllib.parse, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
API = "https://www.donneesquebec.ca/recherche/api/3/action/"
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=180) as r:
        return r.read()
res = json.loads(get(API + "package_search?" + urllib.parse.urlencode({"q": "urgences", "rows": 20})))["result"]["results"]
for p in res:
    print("PAQUETE", p["name"], "|", p.get("title"), "|", p.get("organization", {}).get("title"), "|", p.get("metadata_modified"))
    if "urgence" not in p["name"]:
        continue
    for r in p["resources"]:
        print("  RECURSO", r.get("name"), r.get("format"), r["url"], r.get("last_modified"))
        if (r.get("format") or "").upper() == "CSV" or r["url"].lower().endswith(".csv"):
            try:
                b = get(r["url"])
                (OUT / (p["name"] + "--" + r["url"].rsplit("/", 1)[-1].split("?")[0])).write_bytes(b)
                print("    ok", len(b))
            except Exception as e:
                print("    ERROR", e)
