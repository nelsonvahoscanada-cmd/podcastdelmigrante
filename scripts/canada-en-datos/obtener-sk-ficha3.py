"""
obtener-sk-ficha3.py — Tercera verificación de la ficha de Saskatchewan (solo lectura)
=====================================================================================
Lo que faltaba tras obtener-sk-ficha2.py:
  paginas   SINP (páginas vigentes), símbolos y colores oficiales, Agencia de
            Seguridad Pública (SaskAlert, incendios), SGI (licencias para
            quienes se mudan) y registro de pacientes, con un navegador normal.
  hora      notas de la base de datos horaria IANA sobre Saskatchewan,
            Lloydminster, Creighton, Alberta y Manitoba.
  censo     identidad indígena (98-10-0264-01) y población urbana y rural
            (centros de población del Censo 2021).
  dic       diccionario del Censo 2021 (tipos CN, CS y RS) con un navegador.
"""
import csv, gzip, io, json, re, sys, urllib.parse, urllib.request, zipfile

PARTE = sys.argv[1] if len(sys.argv) > 1 else "todo"
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
GEO = "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer"


def get(url, t=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        b = r.read()
        return gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def mostrar(t, patron, maximo=40):
    n = 0
    for l in t.split("\n"):
        l = l.strip()
        if len(l) > 3 and re.search(patron, l, re.I) and "Google" not in l:
            print("  >", l[:800])
            n += 1
            if n >= maximo:
                break


def navegador(lista):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        nav = p.chromium.launch()
        pg = nav.new_context(locale="en-CA").new_page()
        for u, patron, enl in lista:
            paso(f"Navegador: {u}")
            try:
                r = pg.goto(u, wait_until="networkidle", timeout=90000)
                pg.wait_for_timeout(2500)
                t = pg.inner_text("body")
                print("estado:", r.status if r else None, "| final:", pg.url, "| título:", pg.title()[:100], "| caracteres:", len(t))
                mostrar(t, patron)
                if enl:
                    vis = set()
                    for a in pg.query_selector_all("a[href]"):
                        h, tx = a.get_attribute("href") or "", (a.inner_text() or "").strip().replace("\n", " ")
                        full = urllib.parse.urljoin(pg.url, h)
                        if re.search(enl, tx + " " + h, re.I) and full not in vis:
                            vis.add(full)
                            print("   enlace:", tx[:80], "→", full)
            except Exception as e:
                print("ERROR", type(e).__name__, str(e)[:150])
        nav.close()


if PARTE in ("paginas", "todo"):
    SINP = "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating"
    navegador([
        (SINP, r"nominee|SINP|stream|categor|apply|Express Entry", r"nominee|sinp|categor|stream|international|express|occupation|entrepreneur|farm|health|tech|hospitality|fraud|news"),
        (SINP + "/saskatchewan-immigrant-nominee-program", r"nominee|SINP|stream|categor|apply|Express Entry|nominat|IRCC|permanent|allocation|20\d\d|fraud|representative|fee", r"categor|stream|international|express|occupation|entrepreneur|farm|health|tech|hospitality|fraud|news|fee|process"),
        (SINP + "/saskatchewan-immigrant-nominee-program/browse-sinp-programs", r"International Skilled|Saskatchewan Experience|Entrepreneur|Farm|Express Entry|Occupation|Health|Hospitality|Tech|Agriculture|category", r"categor|international|express|occupation|entrepreneur|farm|health|tech|hospitality|experience"),
        ("https://www.saskatchewan.ca/government/visual-identity-and-protocol/emblems-and-flags", r"flag|green|gold|colour|color|lily|emblem|wheat|sheaf|1969|adopt", None),
        ("https://www.saskpublicsafety.ca/", r"SaskAlert|alert|wildfire|fire ban|evacuat|emergency", r"saskalert|alert|wildfire|fire ban|prepar|72"),
        ("https://sgi.sk.ca/moving-to-saskatchewan", r"licen|90 days|exchange|country|test|knowledge|road|insurance|regist|plate|reciprocal|Class 5", r"exchange|country|reciprocal|outside|knowledge|road test|out-of-province"),
        ("https://www.saskhealthauthority.ca/facilities-locations?field_facility_type=4", r"hospital|regional", None),
        ("https://www.saskatchewan.ca/residents/health/accessing-health-care-services", r"family|doctor|physician|nurse|registry|walk-in|811|virtual", r"family|doctor|physician|nurse|registry|walk|virtual|find"),
    ])

if PARTE in ("hora", "todo"):
    paso("IANA tzdata: NEWS y northamerica")
    for u in ("https://data.iana.org/time-zones/tzdb/NEWS", "https://data.iana.org/time-zones/tzdb/northamerica"):
        try:
            t = get(u).decode("utf-8", "ignore")
            print("URL:", u, "| caracteres:", len(t))
            bloques = t.split("\n\n")
            for b in bloques:
                if re.search(r"Saskatchewan|Lloydminster|Creighton|Flin Flon", b):
                    print("  ---\n  " + b.strip()[:1500].replace("\n", "\n  "))
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:150])


def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig"))


if PARTE in ("censo", "todo"):
    paso("98-10-0264-01 Identidad indígena, Saskatchewan (totales)")
    try:
        for r in tabla("98100264"):
            if r["GEO"] != "Saskatchewan" or not r.get("Statistics (3)", "").startswith("Count"):
                continue
            dims = {k: v for k, v in r.items() if k.split(" (")[0] in ("Registered or Treaty Indian status", "Age", "Gender", "Residence by Indigenous geography")}
            if all(v.startswith("Total") for v in dims.values()):
                print(" ", {k.split(":")[-1].split("[")[0]: v for k, v in r.items() if k.startswith("Indigenous identity")})
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

    paso("Centros de población (Censo 2021): capas del servicio de límites")
    try:
        capas = json.loads(get(f"{GEO}?f=json"))["layers"]
        print([(c["id"], c["name"]) for c in capas])
        cap = [c["id"] for c in capas if "opulation" in c["name"]]
        dg = set()
        for cid in cap:
            q = {"where": "PRUID='47'", "outFields": "*", "returnGeometry": "false", "f": "json", "resultRecordCount": 1000}
            d = json.loads(get(f"{GEO}/{cid}/query?" + urllib.parse.urlencode(q)))
            fs = d.get("features", [])
            print("capa", cid, "entidades:", len(fs), "campos:", list(fs[0]["attributes"]) if fs else None)
            for f in fs:
                a = f["attributes"]
                dg.add(a.get("DGUID"))
        print("DGUID:", len(dg), sorted(dg)[:5])
        suma, n, cols = 0, 0, None
        for r in tabla("98100011"):
            if cols is None:
                cols = list(r)
                print("columnas:", cols[:8])
            if r["DGUID"] in dg:
                v = r.get("Population and dwelling counts (7): Population, 2021 [1]") or next((v for k, v in r.items() if "Population, 2021" in k), "")
                if v:
                    suma += int(v)
                    n += 1
        print("centros de población de Saskatchewan con cifra:", n, "población urbana (suma):", suma)
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:300])

if PARTE in ("dic", "todo"):
    navegador([
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/tab/index-eng.cfm?ID=t1_5", r"Crown|\bCN\b|\bNO\b|Unorganized|Northern|Resort|Saskatchewan|Indian settlement", None),
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/az/definition-eng.cfm?ID=geo018", r"Saskatchewan|organized hamlet|dissolved|northern settlement|resort|retired|\bCS\b|\bRS\b|DMU|OHM|\bNS\b", None),
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/az/definition-eng.cfm?ID=geo012", r"Saskatchewan|Crown|\bCN\b|\bNO\b|unorganized|northern", None),
    ])
