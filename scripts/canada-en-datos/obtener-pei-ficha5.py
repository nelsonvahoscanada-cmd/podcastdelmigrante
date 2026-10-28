"""
obtener-pei-ficha5.py — Idiomas del Censo 2021 en Isla del Príncipe Eduardo (solo lectura)
Tablas 98-10-0222 (conocimiento de idiomas oficiales) y 98-10-0218 (lengua materna):
filas de la provincia para el total de edades.
"""
import csv, io, urllib.request, zipfile

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
for pid in ("98100222", "98100218"):
    print(f"\n=== Tabla {pid[:2]}-{pid[2:4]}-{pid[4:]} ===", flush=True)
    b = urllib.request.urlopen(urllib.request.Request(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", headers=UA), timeout=300).read()
    z = zipfile.ZipFile(io.BytesIO(b))
    nombre = next(n for n in z.namelist() if not n.endswith("_MetaData.csv"))
    with z.open(nombre) as f:
        lector = csv.reader(io.TextIOWrapper(f, encoding="utf-8-sig"))
        cab = next(lector)
        for r in lector:
            if r[1] == "Prince Edward Island" and r[3] == "Total - Age":
                print(" | ".join(f"{c[:45]}={v}" for c, v in zip(cab[4:], r[4:]) if v and not c.startswith("Symbol")))
