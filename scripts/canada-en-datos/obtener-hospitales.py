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
# Encabezados de sección (mayúsculas) y de ciudad
for i, l in enumerate(lineas):
    if re.match(r"^[A-Z][A-Z &/\-,()]{6,}$", l.strip()) or l.startswith("FACILITY TYPE") or "TYPE:" in l:
        print("SEC", i, l.strip()[:120])
ciudad, tipo, res = None, None, {}
for i, l in enumerate(lineas):
    s = l.strip()
    m = re.match(r"^(?:FACILITY )?TYPE:\s*(.+)$", s)
    if m: tipo = m.group(1).strip()
    m = re.match(r"^CITY:\s*(.+)$", s)
    if m: ciudad = m.group(1).strip(); continue
    if ciudad in ("Calgary", "Edmonton", "Brooks", "Red Deer", "Lethbridge", "Medicine Hat"):
        m = re.match(r"^(.+?)\s+(\d{1,5})\s+([A-Z/]{2,6})\s+(.+)$", s)
        if m:
            res.setdefault(ciudad, {}).setdefault(tipo, {}).setdefault(m.group(1).strip(), m.group(2))
for c, tipos in res.items():
    for t, fac in tipos.items():
        print("FAC", c, "|", t, "|", sorted(fac))
