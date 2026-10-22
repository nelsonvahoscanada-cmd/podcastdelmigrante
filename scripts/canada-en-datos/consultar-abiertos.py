#!/usr/bin/env python3
"""consultar-abiertos.py — Herramienta temporal de verificación (no forma parte del sitio).
Lee publicaciones del catálogo oficial de datos abiertos del Gobierno de Alberta
(open.alberta.ca) e imprime las líneas pertinentes tal como están publicadas.
Requiere: pip install openpyxl pypdf"""
import io, json, re, urllib.parse, urllib.request
from pypdf import PdfReader

UA = {"User-Agent": "Mozilla/5.0 (compatible; PodcastDelMigrante-verificacion/1.0)"}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        return r.read()

def paquete(pid):
    url = f"https://open.alberta.ca/api/3/action/package_show?id={pid}"
    try:
        p = json.loads(get(url))["result"]
        print(f"\n=== {pid}: {p['title']} · modificado {p['metadata_modified'][:10]}")
        for r in p.get("resources", [])[:6]:
            print(f"    - {r.get('name')} · {r.get('format')} · {r.get('url')}")
        return p.get("resources", [])
    except Exception as e:
        print(f"\n=== {pid}: ERROR {e}")
        return []

def pdf_lineas(url, patron, max_lineas=40, max_paginas=60):
    print(f"\n=== PDF {url}")
    lector = PdfReader(io.BytesIO(get(url)))
    print(f"  páginas: {len(lector.pages)}")
    n = 0
    for i, pag in enumerate(lector.pages[:max_paginas]):
        for linea in (pag.extract_text() or "").splitlines():
            if re.search(patron, linea, re.I):
                print(f"  p{i+1}: {linea.strip()[:220]}")
                n += 1
                if n >= max_lineas:
                    return

for pid in ["2021-census-of-canada-population-and-dwelling-release", "2021-census-of-canada-population-and-dwelling-counts", "2021-census-of-canada-population-and-dwellings"]:
    recursos = paquete(pid)
    for r in recursos[:1]:
        if (r.get("format") or "").upper() == "PDF":
            try:
                pdf_lineas(r["url"], r"Alberta|population|2021|2016|per cent|%", 25, 3)
            except Exception as e:
                print(f"ERROR {e}")

try:
    pdf_lineas("https://open.alberta.ca/dataset/b569d90f-b07e-4b77-824d-2a02d760966f/resource/43295490-5d85-4318-aa19-21b0fb4c2ad6/download/jus-report-crime-justice-statistics-2020-2021-to-2024-2025.pdf", r"severity|CSI", 40)
except Exception as e:
    print(f"ERROR crimen: {e}")

try:
    pdf_lineas("https://open.alberta.ca/dataset/3393a7b5-07bf-4b9f-8aaf-a6d89273297b/resource/58a8d024-398f-482e-b1c2-81a754a97253/download/budget-2026-fiscal-plan-2026-29.pdf", r"nominal GDP|real GDP|gross domestic product", 25, 40)
except Exception as e:
    print(f"ERROR PIB: {e}")

print("\n=== STATISTICS CANADA (nuevo intento)")
for tabla in ("17100009", "35100026", "36100222", "98100001"):
    try:
        d = get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{tabla}-eng.zip")
        print(f"  {tabla}: {'disponible' if d.startswith(b'PK') else 'no disponible'} ({len(d)//1024} KB)")
    except Exception as e:
        print(f"  {tabla}: ERROR {e}")
