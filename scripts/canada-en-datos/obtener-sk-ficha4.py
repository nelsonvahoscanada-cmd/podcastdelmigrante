"""
obtener-sk-ficha4.py — Cuarta verificación de la ficha de Saskatchewan (solo lectura)
====================================================================================
  dic     diccionario del Censo 2021 (tipos de subdivisión CN y NO, y de lugar
          designado CS y RS) en la copia archivada de Internet Archive: el
          sitio de Statistics Canada pide una verificación contra robots que no
          se intenta sortear.
  urbano  población urbana y rural: centros de población (capa PC del servicio
          de límites del Censo 2021) cruzados con la tabla 98-10-0011-01.
"""
import csv, io, json, re, sys, urllib.parse, urllib.request, zipfile, html

PARTE = sys.argv[1] if len(sys.argv) > 1 else "todo"
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
GEO = "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer"


def get(url, t=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read(), r.geturl()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


if PARTE in ("dic", "todo"):
    for u, pat in (
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/tab/index-eng.cfm?ID=t1_5", r"\bCN\b|Crown|\bNO\b|Unorganized|Saskatchewan"),
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/az/definition-eng.cfm?ID=geo018", r"\bCS\b|\bRS\b|resort|community|Saskatchewan|organized hamlet|dissolved|northern settlement|retired"),
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/az/definition-eng.cfm?ID=geo012", r"\bCN\b|Crown|Saskatchewan|unorganized"),
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/fig/index-eng.cfm?ID=f1_5", r"\bCN\b|Crown|\bCS\b|\bRS\b"),
    ):
        paso(f"Archivo: {u}")
        try:
            meta = json.loads(get("https://archive.org/wayback/available?url=" + urllib.parse.quote(u, safe=""))[0])
            snap = (meta.get("archived_snapshots") or {}).get("closest") or {}
            print("copia:", snap.get("url"), snap.get("timestamp"))
            if not snap.get("url"):
                continue
            b, final = get(snap["url"])
            t = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", b.decode("utf-8", "ignore"))))
            t = re.sub(r"[ \t\xa0]+", " ", t)
            n = 0
            for l in t.split("\n"):
                l = l.strip()
                if len(l) > 2 and re.search(pat, l):
                    print("  >", l[:3000])
                    n += 1
                    if n > 60:
                        break
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

if PARTE in ("urbano", "todo"):
    paso("Capa PC (centros de población)")
    q = {"where": "1=1", "outFields": "*", "returnGeometry": "false", "f": "json", "resultRecordCount": 2}
    d = json.loads(get(f"{GEO}/7/query?" + urllib.parse.urlencode(q))[0])
    print("campos:", [f["attributes"] for f in d.get("features", [])])
    campo = next((k for k in d["features"][0]["attributes"] if k.upper() in ("PRUID", "PCPUID")), None)
    print("campo de provincia:", campo)
    where = "PRUID='47'" if campo == "PRUID" else "PCPUID LIKE '47%'"
    dg, desde = {}, 0
    while True:
        q = {"where": where, "outFields": "*", "returnGeometry": "false", "f": "json", "resultOffset": desde, "resultRecordCount": 1000}
        fs = json.loads(get(f"{GEO}/7/query?" + urllib.parse.urlencode(q))[0]).get("features", [])
        for f in fs:
            a = f["attributes"]
            dg[a.get("DGUID")] = a
        if len(fs) < 1000:
            break
        desde += 1000
    print("centros (partes) de Saskatchewan:", len(dg), list(dg)[:3])
    zf = zipfile.ZipFile(io.BytesIO(get("https://www150.statcan.gc.ca/n1/tbl/csv/98100011-eng.zip", 900)[0]))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    # Las partes por provincia (2021S0511) solo existen en la tabla para los centros que cruzan un límite
    # provincial; los demás figuran con el código del centro completo (2021S0510 + PCUID)
    alt = {"2021S0510" + a["PCUID"]: k for k, a in dg.items()}
    valores = {}
    for r in csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig")):
        if (r["DGUID"] in dg or r["DGUID"] in alt) and r.get("Population and dwelling counts (7): Population, 2021 [1]"):
            valores[r["DGUID"]] = (r["GEO"], int(r["Population and dwelling counts (7): Population, 2021 [1]"]))
    suma, cuenta, filas = 0, 0, []
    for k, at in dg.items():
        v = valores.get(k) or valores.get("2021S0510" + at["PCUID"])
        if v:
            suma += v[1]
            cuenta += 1
            filas.append(v)
    print("con cifra:", cuenta, "| población en centros de población (urbana):", suma)
    for g, v in sorted(filas, key=lambda x: -x[1])[:12]:
        print("  ", g, v)
    if cuenta:
        tot = 1132505
        print("rural:", tot - suma, "| % urbano:", round(100 * suma / tot, 1))
