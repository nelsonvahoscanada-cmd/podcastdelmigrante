"""
obtener-qc-municipios.py — Répertoire des municipalités du Québec (MAMH, Données Québec), solo lectura
Descarga por la API CKAN de Données Québec todos los recursos CSV del conjunto «repertoire-des-municipalites-du-quebec»
(designación, MRC, región administrativa, población del decreto, sitio web) y los guarda sin cambios en la carpeta indicada.
Licencia: CC BY 4.0 (Données Québec). Se ejecuta en GitHub Actions.
"""
import json, pathlib, sys, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=180) as r:
        return r.read()
p = json.loads(get("https://www.donneesquebec.ca/recherche/api/3/action/package_show?id=repertoire-des-municipalites-du-quebec"))["result"]
meta = {"titulo": p.get("title"), "licencia": p.get("license_title"), "modificado": p.get("metadata_modified"), "recursos": []}
for r in p["resources"]:
    meta["recursos"].append({k: r.get(k) for k in ("name", "format", "url", "last_modified", "created")})
    if (r.get("format") or "").upper() in ("CSV", "JSON", "XLSX") or r["url"].lower().endswith((".csv", ".json")):
        nombre = r["url"].rsplit("/", 1)[-1].split("?")[0] or (r["id"] + ".csv")
        try:
            (OUT / nombre).write_bytes(get(r["url"]))
            print("ok", nombre, r.get("name"))
        except Exception as e:
            print("ERROR", r["url"], e)
(OUT / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(meta, ensure_ascii=False, indent=1)[:3000])
