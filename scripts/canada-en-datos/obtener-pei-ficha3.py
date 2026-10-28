"""
obtener-pei-ficha3.py — Tercera ronda de verificación de la ficha de Isla del Príncipe Eduardo
=============================================================================================
Solo lectura, en GitHub Actions:
  1. archivo: copias del Archivo de Internet (salario mínimo, tasas de la CRA,
     tipos de subdivisión censal, IRAC) buscando la copia más reciente que
     no sea la página de verificación contra robots.
  2. censo: tablas del Censo 2021 de idiomas e inmigración (www150) filtradas
     a Isla del Príncipe Eduardo.
  3. enlaces: estado HTTP de los enlaces oficiales que usará la guía.
"""
import csv, gzip, html, io, json, re, sys, time, urllib.parse, urllib.request, zipfile

PARTE = sys.argv[1] if len(sys.argv) > 1 else "todo"
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=90):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        b = r.read()
    return gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b


def texto(h):
    h = h.decode("utf-8", "ignore") if isinstance(h, bytes) else h
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def copias(patron, desde="2025"):
    q = "http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(
        {"url": patron, "output": "json", "from": desde, "filter": "statuscode:200", "collapse": "urlkey", "limit": "400"})
    filas = json.loads(get(q, 120) or b"[]")
    return filas[1:] if filas else []


def leer_copia(url_original, patron, ventana=6, max_intentos=6):
    """Lee la copia más reciente con contenido real e imprime las líneas que coinciden."""
    q = "http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(
        {"url": url_original, "output": "json", "from": "2025", "filter": "statuscode:200"})
    filas = (json.loads(get(q, 120) or b"[]") or [[]])[1:]
    for f in reversed(filas[-max_intentos:]):
        ts = f[1]
        try:
            t = texto(get(f"http://web.archive.org/web/{ts}id_/{f[2]}", 120))
        except Exception as e:
            print("  copia", ts, "ERROR", type(e).__name__)
            continue
        if "Radware" in t[:600] or len(t) < 400:
            print("  copia", ts, "sin contenido (verificación contra robots)")
            continue
        m = re.search(r"(Published date|Date modified):\s*([A-Za-z0-9 ,-]+)", t)
        print("  copia", ts, "|", m.group(0)[:60] if m else "fecha no indicada", "| caracteres:", len(t))
        lineas = t.split("\n")
        vistos = set()
        for i, l in enumerate(lineas):
            if re.search(patron, l) and i not in vistos:
                vistos.update(range(i, i + ventana))
                print("  >", " | ".join(x.strip() for x in lineas[max(0, i - 1): i + ventana] if x.strip())[:1200])
        return True
    print("  sin copia con contenido")
    return False


# ------------------------------------------------------------ 1. Archivo
if PARTE in ("archivo", "todo"):
    paso("Copias de princeedwardisland.ca con 'minimum-wage' o 'tenanc' o 'nominee' desde 2025")
    for pat in ("princeedwardisland.ca/en/*minimum-wage*", "princeedwardisland.ca/en/news/*wage*",
                "princeedwardisland.ca/en/*tenan*", "princeedwardisland.ca/en/*nominee*",
                "princeedwardisland.ca/en/*health-card*", "princeedwardisland.ca/en/*family-doctor*",
                "princeedwardisland.ca/en/*driver*licen*"):
        try:
            fs = copias(pat)
            print(pat, "→", len(fs))
            for f in fs[-25:]:
                print("  ", f[1], f[2][:170])
        except Exception as e:
            print(pat, "ERROR", type(e).__name__, str(e)[:120])
        time.sleep(2)

    LEER = [
        ("Salario mínimo (Gobierno de Canadá)", "minwage-salairemin.service.canada.ca/en/general.html", r"Prince Edward|PE\b"),
        ("Salario mínimo (Gobierno de PEI)", "princeedwardisland.ca/en/information/workforce-advanced-learning-and-population/minimum-wage-order", r"\$\d|minimum wage"),
        ("Salario mínimo (Gobierno de PEI, otro)", "princeedwardisland.ca/en/information/economic-development-innovation-and-trade/minimum-wage-order", r"\$\d|minimum wage"),
        ("CRA: tasas de impuesto", "www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html", r"Prince Edward Island|on the first|on the portion|on the next|on the amount|over \$"),
        ("Censo 2021: tipos de subdivisión censal", "www12.statcan.gc.ca/census-recensement/2021/ref/dict/tab/index-eng.cfm?ID=t1_5", r"\bFD\b|\bRMU\b|\bRM\b|\bLOT\b|Prince Edward"),
        ("Censo 2021: definición de subdivisión censal", "www12.statcan.gc.ca/census-recensement/2021/ref/dict/az/definition-eng.cfm?ID=geo012", r"Prince Edward|fire district|lot"),
        ("IRAC: aumento de alquiler", "irac.pe.ca/rental/", r"increase|%|Residential Tenancy|rent"),
        ("IRAC: inicio", "irac.pe.ca/", r"[Rr]ent|[Tt]enan"),
        ("PEI: programa de nominados", "princeedwardisland.ca/en/information/office-of-immigration/pei-provincial-nominee-program", r"Express Entry|Labour Impact|Business|Critical|Occupations|stream|Stream"),
        ("PEI: tarjeta sanitaria para nuevos residentes", "princeedwardisland.ca/en/service/apply-pei-health-card-new-residents", r"eligible|wait|permit|student|resident|months|document"),
        ("PEI: licencia de conducir de otro país", "princeedwardisland.ca/en/information/transportation-and-infrastructure/exchange-a-drivers-licence-from-another-country", r"exchange|country|test|days|licen"),
        ("PEI: médico de familia", "princeedwardisland.ca/en/service/find-a-family-doctor-or-nurse-practitioner", r"Registry|register|family doctor|nurse"),
    ]
    for nombre, u, patron in LEER:
        paso(f"Archivo: {nombre}")
        print("URL:", u)
        try:
            leer_copia(u, patron)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])
        time.sleep(2)

# ------------------------------------------------------------ 2. Censo (idiomas e inmigración)
if PARTE in ("censo", "todo"):
    for pid in ("98100222", "98100218", "98100307", "98100302", "98100352"):
        paso(f"Tabla {pid[:2]}-{pid[2:4]}-{pid[4:]}")
        try:
            meta = json.loads(urllib.request.urlopen(urllib.request.Request(
                "https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata", data=json.dumps([{"productId": int(pid)}]).encode(),
                headers={**UA, "Content-Type": "application/json"}), timeout=90).read())[0]["object"]
            print("título:", meta.get("cubeTitleEn"), "| publicado:", meta.get("releaseTime"))
            z = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 300)))
            nombre = next(n for n in z.namelist() if not n.endswith("_MetaData.csv"))
            with z.open(nombre) as f:
                lector = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
                cols = lector.fieldnames
                print("columnas:", cols)
                filas = [r for r in lector if r.get("GEO") == "Prince Edward Island"]
            dims = [c for c in cols if c not in ("REF_DATE", "GEO", "DGUID", "UOM", "UOM_ID", "SCALAR_FACTOR", "SCALAR_ID", "VECTOR", "COORDINATE", "VALUE", "STATUS", "SYMBOL", "TERMINATED", "DECIMALS") and not c.startswith("Symbol Legend")]
            print("filas PEI:", len(filas), "| dimensiones:", dims)
            # Primero las filas en que todas las dimensiones salvo una son 'Total' (o su primer valor)
            primeros = {d: filas[0][d] if filas else None for d in dims}
            print("primer valor de cada dimensión:", primeros)
            n = 0
            for r in filas:
                distintos = [d for d in dims if r[d] != primeros[d]]
                if len(distintos) <= 1:
                    print("  ", " | ".join(f"{d[:40]}={r[d][:90]}" for d in dims if r[d] != primeros[d]) or "(totales)", "→", r["VALUE"])
                    n += 1
                    if n > 260:
                        break
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 3. Enlaces oficiales
if PARTE in ("enlaces", "todo"):
    paso("Enlaces oficiales")
    ENLACES = [
        "https://www.charlottetown.ca/", "https://www.summerside.ca/", "https://www.townofstratford.ca/", "https://www.cornwallpe.ca/",
        "https://www.threeriverspei.com/", "https://www.kensington.ca/", "https://www.townofsouris.com/", "https://www.townofalberton.ca/",
        "https://www.t3transit.ca/", "https://www.transitpei.ca/", "https://www.irac.pe.ca/", "https://irac.pe.ca/",
        "https://www.workpei.ca/", "https://www.upei.ca/", "https://www.hollandcollege.com/", "https://www.collegedelile.ca/",
        "https://www.psb.edu.pe.ca/", "https://cslf.edu.pe.ca/", "https://www.peianc.com/", "https://www.healthpei.ca/",
        "https://www.princeedwardisland.ca/en/topic/health", "https://www.princeedwardisland.ca/en/topic/office-of-immigration",
        "https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-provincial-nominee-program",
        "https://www.princeedwardisland.ca/en/service/apply-pei-health-card-new-residents",
        "https://www.princeedwardisland.ca/en/service/find-a-family-doctor-or-nurse-practitioner",
        "https://www.princeedwardisland.ca/en/topic/employment-standards",
        "https://www.princeedwardisland.ca/en/topic/drivers-licences-and-testing",
        "https://www.princeedwardisland.ca/en/topic/emergency-measures-organization",
        "https://www.princeedwardisland.ca/en/topic/atlantic-immigration-program",
        "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/pe", "https://www.confederationbridge.com/",
        "https://www.dpeipc.org/", "https://cmhc-schl.gc.ca/", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html",
    ]
    for u in ENLACES:
        try:
            req = urllib.request.Request(u, headers=UA)
            with urllib.request.urlopen(req, timeout=25) as r:
                cuerpo = r.read(4000).decode("utf-8", "ignore")
                tit = re.search(r"(?is)<title[^>]*>(.*?)</title>", cuerpo)
                print(r.status, u, "→", r.geturl()[:100], "|", html.unescape(tit.group(1)).strip()[:80] if tit else "")
        except urllib.error.HTTPError as e:
            print(e.code, u)
        except Exception as e:
            print("ERR", u, type(e).__name__, str(e)[:80])
