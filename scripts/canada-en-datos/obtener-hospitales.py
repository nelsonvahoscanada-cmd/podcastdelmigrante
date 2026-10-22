"""Hospitales generales por ciudad según el listado oficial de instalaciones
del Gobierno de Alberta (AHCIP facility listing). Solo lectura."""
import io, json, re, urllib.request
from pypdf import PdfReader
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=300) as r: return r.read()
d = json.loads(get("https://open.alberta.ca/api/3/action/package_show?id=alberta-health-facility-and-functional-centre-definitions-and-facility-listing"))["result"]
rec = [r for r in d["resources"] if not r["name"].startswith("[SUPERSEDED]")][0]
lineas = [l.rstrip() for p in PdfReader(io.BytesIO(get(rec["url"]))).pages for l in (p.extract_text() or "").split("\n") if l.strip()]
ciudad, res, f = None, {}, None
for l in lineas:
    s_ = l.strip()
    m = re.match(r"^CITY:\s*(.+)$", s_)
    if m: ciudad = m.group(1).strip(); f = None; continue
    if ciudad in ("Calgary", "Edmonton", "Brooks", "Red Deer", "Lethbridge", "Medicine Hat"):
        m = re.match(r"^(.+?)\s+(\d{1,5})\s+([A-Z/]{2,6})\s+(.+)$", s_)
        if m:
            f = res.setdefault(ciudad, {}).setdefault(m.group(1).strip(), {"num": m.group(2), "fc": {}})
            f["fc"][m.group(3)] = m.group(4).strip()
            continue
        m = re.match(r"^([A-Z][A-Z/]{1,5})\s+([A-Z][A-Za-z].+)$", s_)
        if m and f is not None:
            f["fc"][m.group(1)] = m.group(2).strip()
salida = {}
for c, facs in res.items():
    for n, f in facs.items():
        urg = {k: v for k, v in f["fc"].items() if re.search(r"emergenc|urgent", v, re.I)}
        hosp = {k: v for k, v in f["fc"].items() if re.search(r"in-?patient|surg|obstet|intensive", v, re.I)}
        if urg:
            salida.setdefault(c, []).append({"nombre": n, "numero": f["num"], "urgencias": urg, "hospitalizacion": hosp})
            print("URG", c, "|", n, "|", f["num"], "|", urg, "|", list(hosp.values())[:4])
import datetime
texto = json.dumps({"fuente": rec["name"], "url": rec["url"], "consultado": datetime.date.today().isoformat(), "ciudades": salida}, ensure_ascii=False)
open("scripts/canada-en-datos/alberta-hospitales.json", "w", encoding="utf-8").write(texto)
print("JSON", texto)
