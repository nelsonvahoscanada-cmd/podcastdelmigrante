"""
obtener-sk-ficha2.py — Segunda verificación de la ficha de Saskatchewan (solo lectura)
=====================================================================================
La primera pasada (obtener-sk-ficha.py) encontró que varias direcciones del
Gobierno de Saskatchewan y de SGI ya no existen (404). Esta pasada:
  statcan   Encuesta de Población Activa mensual y anual (las tablas usan
            ahora «Gender»), salarios, idiomas, inmigración, minorías
            visibles y población urbana/rural, cada paso por separado.
  buscar    recorre las páginas índice oficiales y lista los enlaces
            vigentes sobre cada tema; después abre los encontrados y
            muestra las frases clave.
  sgi       SGI y la Saskatchewan Health Authority con un navegador normal
            (sus sitios se arman con JavaScript).
  dic       diccionario del Censo 2021: tipos de subdivisión censal y de
            lugar designado de Saskatchewan.
"""
import csv, gzip, html, io, re, sys, time, urllib.parse, urllib.request, zipfile

PARTE = sys.argv[1] if len(sys.argv) > 1 else "todo"
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=120):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        b = r.read()
        return (gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b), r.status, r.geturl()


def texto(h):
    h = h.decode("utf-8", "ignore") if isinstance(h, bytes) else h
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    t = re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()
    # Aviso de traducción automática repetido en saskatchewan.ca
    return "\n".join(l for l in t.split("\n") if "Google™" not in l and "Software-based translations" not in l)


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def mostrar(t, patron, maximo=30):
    n = 0
    for l in t.split("\n"):
        if re.search(patron, l, re.I) and len(l.strip()) > 3:
            print("  >", l.strip()[:700])
            n += 1
            if n >= maximo:
                break


def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)[0]))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig"))


def seguro(nombre, fn):
    paso(nombre)
    try:
        fn()
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:300])


# ------------------------------------------------------------ 1. Statistics Canada
def epa_mensual():
    sel, cols = {}, None
    for r in tabla("14100287"):
        if cols is None:
            cols = list(r)
            print("columnas:", cols)
        g = r.get("Gender") or r.get("Sex")
        if r["GEO"] == "Saskatchewan" and g in ("Total - Gender", "Both sexes") and r["Age group"] == "15 years and over" and r["Statistics"] == "Estimate" and r["Data type"] == "Seasonally adjusted" and r["Labour force characteristics"] in ("Unemployment rate", "Participation rate", "Employment rate", "Employment"):
            sel.setdefault(r["REF_DATE"], {})[r["Labour force characteristics"]] = r["VALUE"]
    for k in sorted(sel)[-5:]:
        print(" ", k, sel[k])


def epa_anual():
    sel = {}
    for r in tabla("14100327"):
        g = r.get("Gender") or r.get("Sex")
        if r["GEO"] == "Saskatchewan" and g in ("Total - Gender", "Both sexes") and r["Age group"] == "15 years and over" and r["Labour force characteristics"] in ("Unemployment rate", "Participation rate", "Employment rate", "Employment") and r["REF_DATE"] >= "2023":
            if r.get("UOM") == "Persons" and r["Labour force characteristics"] != "Employment":
                continue
            sel.setdefault(r["REF_DATE"], {})[r["Labour force characteristics"]] = r["VALUE"]
    print(" ", sel)


def epa_regiones():
    sel = {}
    for r in tabla("14100393"):
        if "Saskatchewan" in r["GEO"] and r["REF_DATE"] >= "2024" and r["Labour force characteristics"] == "Unemployment rate" and r.get("Statistics", "Estimate") == "Estimate":
            sel.setdefault(r["GEO"], {})[r["REF_DATE"]] = r["VALUE"]
    for k, v in sel.items():
        print(" ", k, v)


def salarios():
    for r in tabla("14100064"):
        g = r.get("Gender") or r.get("Sex")
        if r["GEO"] == "Saskatchewan" and r["REF_DATE"] >= "2024" and r["Type of work"] == "Both full- and part-time employees" and r["North American Industry Classification System (NAICS)"].startswith("Total employees, all industries") and g in ("Total - Gender", "Both sexes") and r["Age group"] == "15 years and over" and "hourly" in r["Wages"].lower():
            print(" ", r["REF_DATE"], r["Wages"], r["VALUE"])


def industrias():
    for r in tabla("14100392"):
        if r["GEO"] == "Saskatchewan" and r["REF_DATE"] == "2025":
            print(" ", r["North American Industry Classification System (NAICS)"], r["VALUE"], r["UOM"], r["SCALAR_FACTOR"])


def idiomas():
    for pid in ("98100222", "98100218"):
        cols = None
        for r in tabla(pid):
            if cols is None:
                cols = list(r)
                print(pid, "columnas:", cols)
            if r["GEO"] == "Saskatchewan" and any(v == "Total - Age" for k, v in r.items() if k.startswith("Age")):
                print(" ", " | ".join(f"{k.split('(')[0][:30]}={v}" for k, v in r.items() if k not in ("REF_DATE", "GEO", "DGUID") and not k.startswith("Symbol") and v)[:400])


def inmigracion():
    cols = None
    for r in tabla("98100307"):
        if cols is None:
            cols = list(r)
            print("columnas:", cols)
        if r["GEO"] == "Saskatchewan" and any(v == "Total - Age" for k, v in r.items() if k.startswith("Age")) and any(v == "Total - Gender" for k, v in r.items() if k.startswith("Gender")):
            pob = next(v for k, v in r.items() if k.startswith("Place of birth"))
            if pob.startswith("Total") or pob in ("Philippines", "India", "Nigeria", "China", "Pakistan", "Ukraine", "Mexico", "Colombia", "Americas", "Central America", "South America", "Caribbean and Bermuda", "Brazil", "El Salvador", "Venezuela"):
                print(" ", pob, {k.split(":")[-1].split("[")[0].strip(): v for k, v in r.items() if k.startswith("Immigrant status") and re.search(r"Total - Immigrant|Immigrants|2016 to 2021|Non-permanent", k)})


def minorias():
    cols = None
    for r in tabla("98100352"):
        if cols is None:
            cols = list(r)
            print("columnas:", cols[:12])
        if r["GEO"] == "Saskatchewan" and any(v == "Total - Age" for k, v in r.items() if k.startswith("Age")) and any(v == "Total - Gender" for k, v in r.items() if k.startswith("Gender")):
            st = next((v for k, v in r.items() if k.startswith("Statistics")), "")
            if "Count" in st or not st:
                print(" ", {k.split(":")[-1].split("[")[0].strip(): v for k, v in r.items() if k.startswith("Visible minority")})


def urbano():
    for r in tabla("98100011"):
        if r["GEO"] == "Saskatchewan":
            print(" ", " | ".join(f"{k[:70]}={v}" for k, v in r.items() if v and k not in ("REF_DATE", "DGUID") and not k.startswith("Symbol"))[:900])


def indigenas():
    cols = None
    for r in tabla("98100264"):
        if cols is None:
            cols = list(r)
            print("columnas:", cols[:14])
        if r["GEO"] == "Saskatchewan" and all(v.startswith("Total") for k, v in r.items() if k.startswith(("Age", "Gender", "Registered", "Residence"))):
            print(" ", next(v for k, v in r.items() if k.startswith("Indigenous identity")), "|", " | ".join(f"{k.split(':')[-1][:30]}={v}" for k, v in r.items() if k.startswith("Statistics") or k.startswith("VALUE"))[:200])


if PARTE in ("statcan", "todo"):
    for n, fn in (("14-10-0287-01 EPA mensual", epa_mensual), ("14-10-0327-01 EPA anual", epa_anual), ("14-10-0393-01 Desempleo por región económica", epa_regiones), ("14-10-0064-01 Salarios", salarios), ("14-10-0392-01 Empleo por industria 2025", industrias), ("Censo 2021: idiomas", idiomas), ("Censo 2021: inmigración", inmigracion), ("Censo 2021: minorías visibles", minorias), ("Censo 2021: urbano/rural (98-10-0011)", urbano), ("Censo 2021: identidad indígena (98-10-0264)", indigenas)):
        seguro(n, fn)

# ------------------------------------------------------------ 2. Búsqueda de páginas vigentes
SEMILLAS = [
    "https://www.saskatchewan.ca/residents",
    "https://www.saskatchewan.ca/residents/moving-to-saskatchewan",
    "https://www.saskatchewan.ca/business/employment-standards",
    "https://www.saskatchewan.ca/residents/health",
    "https://www.saskatchewan.ca/residents/taxes-and-investments",
    "https://www.saskatchewan.ca/residents/education-and-learning",
    "https://www.saskatchewan.ca/residents/environment-public-health-and-safety",
    "https://www.saskatchewan.ca/residents/family-and-social-support",
    "https://www.saskatchewan.ca/residents/housing-and-renting",
    "https://www.saskatchewan.ca/government",
    "https://www.saskatchewan.ca/business/taxes-licensing-and-reporting",
]
TEMAS = {
    "sinp": r"immigrant nominee|sinp|immigrat",
    "salario": r"minimum wage",
    "pst": r"provincial sales tax|\bpst\b",
    "renta": r"income tax",
    "llegados": r"newcomer|settlement|gateway",
    "alertas": r"saskalert|emergency alert",
    "hora": r"time zone|time act|daylight|clock",
    "prestamos": r"student loan|student aid",
    "ort": r"residential tenanc",
    "familia": r"child benefit|low-income tax credit|child care",
    "medico": r"family doctor|family physician|primary care|nurse practitioner",
    "incendios": r"wildfire|fire ban|fire bans",
    "clima": r"tornado|severe weather|blizzard|flood",
    "datos": r"about saskatchewan|quick facts|fast facts|symbols|provincial flag|economy",
    "credenciales": r"credential|regulated occupation|labour market",
    "licencia": r"driver|licen[cs]e",
}
if PARTE in ("buscar", "todo"):
    vistos, cola, enlaces = set(), [(s, 0) for s in SEMILLAS], {}
    while cola and len(vistos) < 160:
        u, d = cola.pop(0)
        if u in vistos:
            continue
        vistos.add(u)
        try:
            b, st, final = get(u, 40)
        except Exception as e:
            print("ERROR", u, type(e).__name__, str(e)[:80])
            continue
        h = b.decode("utf-8", "ignore")
        for href, txt in re.findall(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h, re.S):
            url = urllib.parse.urljoin(final, html.unescape(href)).split("?")[0].rstrip("/")
            t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", txt))).strip()
            if "saskatchewan.ca" not in url or not t:
                continue
            enlaces.setdefault(url, t)
            if d < 2 and url not in vistos and url.count("/") <= 7 and re.search(r"/(residents|business|government)/", url):
                cola.append((url, d + 1))
        time.sleep(0.4)
    print("páginas recorridas:", len(vistos), "enlaces:", len(enlaces))
    elegidas = {}
    for tema, pat in TEMAS.items():
        paso(f"Tema: {tema}")
        hall = [(u, t) for u, t in enlaces.items() if re.search(pat, t, re.I) or re.search(pat.replace(" ", "-"), u, re.I)]
        for u, t in hall[:25]:
            print("  ", t[:90], "→", u)
        elegidas[tema] = [u for u, _ in hall[:4]]
    PATRONES = {
        "sinp": r"nominee|stream|categor|Express Entry|apply|fraud|representative|Occupation|cap|allocation|20\d\d",
        "salario": r"\$\d|minimum wage|October|effective",
        "pst": r"per cent|%|PST",
        "renta": r"per cent|%|bracket|rate",
        "llegados": r"newcomer|settlement|Gateway|free|language|Regional",
        "alertas": r"SaskAlert|alert|app",
        "hora": r"time|Central|Lloydminster|Creighton|daylight|Act",
        "prestamos": r"loan|grant|apply",
        "ort": r"Office of Residential Tenancies|ORT|hearing|fee|portal",
        "familia": r"benefit|credit|child care|\$\d",
        "medico": r"family|physician|nurse|registry|list|811",
        "incendios": r"wildfire|SPSA|fire|ban|evacuat",
        "clima": r"tornado|storm|blizzard|flood|warning",
        "datos": r"capital|Regina|largest|Saskatoon|km|population|lakes|flag|emblem",
        "credenciales": r"credential|regulat|licen|assessment",
        "licencia": r"licen|exchange|90 days|SGI",
    }
    for tema, us in elegidas.items():
        for u in us:
            paso(f"Lectura [{tema}]: {u}")
            try:
                b, st, final = get(u, 40)
                t = texto(b)
                print("estado:", st, "| final:", final, "| caracteres:", len(t))
                mostrar(t, PATRONES[tema], 18)
            except Exception as e:
                print("ERROR", type(e).__name__, str(e)[:100])
            time.sleep(0.5)

# ------------------------------------------------------------ 3. SGI y SHA (navegador)
if PARTE in ("sgi", "todo"):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        nav = p.chromium.launch()
        ctx = nav.new_context(locale="en-CA")
        pg = ctx.new_page()

        def leer(u, patron, enlaces_pat=None, maximo=30):
            paso(f"Navegador: {u}")
            try:
                r = pg.goto(u, wait_until="networkidle", timeout=90000)
                pg.wait_for_timeout(2500)
                t = pg.inner_text("body")
                print("estado:", r.status if r else None, "| final:", pg.url, "| título:", pg.title()[:90], "| caracteres:", len(t))
                mostrar(t, patron, maximo)
                if enlaces_pat:
                    vis = set()
                    for a in pg.query_selector_all("a[href]"):
                        h, tx = a.get_attribute("href") or "", (a.inner_text() or "").strip()
                        full = urllib.parse.urljoin(pg.url, h)
                        if re.search(enlaces_pat, tx + " " + h, re.I) and full not in vis:
                            vis.add(full)
                            print("   enlace:", tx[:70].replace("\n", " "), "→", full)
            except Exception as e:
                print("ERROR", type(e).__name__, str(e)[:150])

        leer("https://www.sgi.sk.ca/", r"licen|new|moving", r"licen|moving|new to|outside|country|exchange|class 5|knowledge|road test")
        leer("https://www.sgi.sk.ca/licensing", r"licen|moving|new|exchange", r"moving|new to|outside|country|exchange|class 5|knowledge|road test|reciprocal")
        leer("https://www.saskhealthauthority.ca/", r"family|doctor|hospital|location", r"family|doctor|physician|hospital|location|facilit|emergency|newcomer")
        leer("https://www.saskhealthauthority.ca/locations", r"hospital|regional|emergency", r"hospital", 60)
        nav.close()

# ------------------------------------------------------------ 4. Diccionario del Censo 2021
if PARTE in ("dic", "todo"):
    for u, pat in (
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/tab/index-eng.cfm?ID=t1_5", r"Crown|CN\b|NO\b|Unorganized|Northern|Resort|Saskatchewan|S-É|Indian"),
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/az/definition-eng.cfm?ID=geo018", r"Saskatchewan|organized hamlet|dissolved|northern settlement|resort|retired|CS\b|RS\b|DMU|OHM|NS\b|type"),
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/az/definition-eng.cfm?ID=geo012", r"Saskatchewan|Crown|CN\b|NO\b|unorganized|northern"),
        ("https://www12.statcan.gc.ca/census-recensement/2021/ref/dict/tab/index-eng.cfm?ID=t1_7", r"Saskatchewan|OHM|DMU|NS|RS|CS|RPC|Organized|Dissolved|Northern|Resort|Community|Retired|type"),
    ):
        paso(f"Diccionario: {u}")
        try:
            b, st, final = get(u, 60)
            t = texto(b)
            print("estado:", st, "| caracteres:", len(t))
            mostrar(t, pat, 60)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:150])
