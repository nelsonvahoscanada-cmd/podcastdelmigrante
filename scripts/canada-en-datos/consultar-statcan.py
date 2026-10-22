#!/usr/bin/env python3
"""
consultar-statcan.py — Datos de Alberta desde las tablas oficiales de Statistics Canada
======================================================================
Herramienta de verificación (no forma parte del sitio). Descarga la tabla
completa en CSV desde la dirección oficial de Statistics Canada
(https://www150.statcan.gc.ca/n1/tbl/csv/<tabla>-eng.zip), filtra las filas
por los NOMBRES escritos en el propio archivo (región, serie, unidad) e
imprime los últimos períodos con su unidad, escala y estado, además de la
fecha de publicación que trae el archivo de metadatos de la tabla.

Si un filtro no coincide, imprime los valores disponibles para corregirlo.
Uso: python3 scripts/canada-en-datos/consultar-statcan.py
"""

import csv
import io
import re
import sys
import urllib.request
import zipfile

UA = {"User-Agent": "Mozilla/5.0 (compatible; PodcastDelMigrante-verificacion/1.0)"}

# clave, tabla, filtros {columna: regex del valor}, cuántos períodos
CONSULTAS = [
    ("population", "17100009", {"GEO": r"Alberta"}, 3),
    ("censusPopulation", "98100001", {"GEO": r"Alberta", "Population and dwelling counts": r"Population, 20(21|16)"}, 2),
    ("unemploymentRate", "14100287", {"GEO": r"Alberta", "Labour force characteristics": r"Unemployment rate", "Gender": r"Total - Gender", "Age group": r"15 years and over", "Statistics": r"Estimate", "Data type": r"Seasonally adjusted"}, 3),
    ("hourlyWage", "14100064", {"GEO": r"Alberta", "Wages": r"(Average|Median) hourly wage rate", "Type of work": r"Both full- and part-time employees", "North American Industry Classification System (NAICS)": r"Total employees, all industries", "Gender": r"Total - Gender", "Age group": r"15 years and over"}, 4),
    ("gdp", "36100222", {"GEO": r"Alberta", "Prices": r"Current prices", "Estimates": r"Gross domestic product at market prices"}, 2),
    ("crimeSeverity", "35100026", {"GEO": r"Alberta", "Statistics": r"Crime severity index"}, 2),
    ("rent", "34100133", {"GEO": r"(Calgary|Edmonton), Alberta", "Type of unit": r"Two bedroom units"}, 4),
    ("vacancy", "34100127", {"GEO": r"(Calgary|Edmonton), Alberta"}, 4),
]


def descargar(tabla):
    url = f"https://www150.statcan.gc.ca/n1/tbl/csv/{tabla}-eng.zip"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r:
        datos = r.read()
    print(f"Descarga: {url} ({len(datos) // 1024} KB)")
    return zipfile.ZipFile(io.BytesIO(datos))


def columna(cabecera, nombre):
    for c in cabecera:
        if c == nombre or re.sub(r"\s*\(\d+\)$", "", c) == nombre:
            return c
    return None


def consultar(clave, tabla, filtros, n):
    print(f"\n=== {clave} — tabla {tabla[:2]}-{tabla[2:4]}-{tabla[4:8]}-01 ===")
    z = descargar(tabla)
    meta = [m for m in z.namelist() if "MetaData" in m]
    if meta:
        texto = z.read(meta[0]).decode("utf-8-sig", "replace")
        filas = list(csv.reader(io.StringIO(texto)))
        if len(filas) > 1:
            cab, val = filas[0], filas[1]
            for campo in ("Cube Title", "Product Id", "Release Time", "Frequency", "Start Reference Period", "End Reference Period"):
                if campo in cab:
                    print(f"  {campo}: {val[cab.index(campo)]}")
    nombre = [m for m in z.namelist() if m.endswith(".csv") and "MetaData" not in m][0]
    with z.open(nombre) as f:
        lector = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
        cab = lector.fieldnames
        cols = {k: columna(cab, k) for k in filtros}
        faltan = [k for k, c in cols.items() if c is None]
        if faltan:
            print(f"  ¡Columnas no encontradas: {faltan}! Columnas: {cab}")
            return
        geo_re = re.compile(filtros["GEO"] + r"$")
        res, vistos = [], {}
        for fila in lector:
            if not geo_re.match(fila[cols["GEO"]]):
                continue
            ok = True
            for k, patron in filtros.items():
                v = fila[cols[k]]
                vistos.setdefault(k, set()).add(v)
                if not re.fullmatch(patron, v):
                    ok = False
            if ok:
                res.append(fila)
    if not res:
        print("  Sin coincidencias. Valores disponibles:")
        for k, vs in vistos.items():
            print(f"   {k}: {sorted(vs)[:40]}")
        print(f"  Columnas: {cab}")
        return
    periodos = sorted({f['REF_DATE'] for f in res})[-n:]
    otras = [c for c in cab if c not in ("REF_DATE", "DGUID", "UOM_ID", "SCALAR_ID", "VECTOR", "COORDINATE", "VALUE", "STATUS", "SYMBOL", "TERMINATED", "DECIMALS")]
    for f in res:
        if f["REF_DATE"] in periodos:
            desc = " · ".join(f"{c}={f[c]}" for c in otras if f.get(c))
            print(f"  {f['REF_DATE']} | VALOR {f['VALUE']} | estado '{f.get('STATUS', '')}' símbolo '{f.get('SYMBOL', '')}' | {f.get('VECTOR', '')} | {desc}")


def main():
    for c in CONSULTAS:
        try:
            consultar(*c)
        except Exception as e:  # una tabla con error no detiene las demás
            print(f"ERROR {c[0]}: {e}")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
