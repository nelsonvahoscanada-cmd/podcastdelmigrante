"""Verificación final (solo lectura) para el PR #75: municipios 160/161, hora oficial y registro público de los enlaces que no admiten comprobación automática."""
import html, io, json, re, sys, time, urllib.parse, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "Accept-Language": "en-CA,en;q=0.9"}


def get(url, t=120):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
                return r.read()
        except Exception as e:
            err = e
            time.sleep(5)
    raise err


def texto(h):
    h = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def enlaces(h, base, patron):
    vistos = set()
    for m in re.finditer(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h, re.I | re.S):
        href = urllib.parse.urljoin(base, html.unescape(m.group(1)))
        txt = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", m.group(2)))).strip()
        if (re.search(patron, href, re.I) or re.search(patron, txt, re.I)) and href not in vistos:
            vistos.add(href)
            yield txt, href


# ---------------------------------------------------------------- 1. Municipios
NUESTROS = {n for n, _ in json.load(open("scripts/canada-en-datos/bc-localidades.json"))["municipios"]}
paso("Página oficial: Municipalities")
U = "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/municipalities"
try:
    h = get(U).decode("utf-8", "ignore")
    t = texto(h)
    m = re.search(r"Last updated on ([A-Z][a-z]+ \d{1,2}, \d{4})", t)
    print("Última actualización:", m.group(1) if m else "—")
    for linea in t.split("\n"):
        if re.search(r"\b16[01]\b|municipalit(y|ies) in B\.?C|incorporat|mountain resort|Jumbo|Sun Peaks", linea, re.I):
            print("  >", linea.strip()[:400])
    for txt, href in enlaces(h, U, r"statistic|directory|list|xls|csv|civicinfo|mountain resort|incorporat"):
        print("  enlace:", repr(txt[:80]), "→", href)
except Exception as e:
    print("ERROR", e)

paso("Páginas relacionadas (estadísticas de gobiernos locales, municipios de montaña)")
for U in [
    "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/statistics",
    "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/municipalities/mountain-resort-municipalities",
    "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/local-government-maps",
    "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems",
]:
    print("URL:", U)
    try:
        h = get(U).decode("utf-8", "ignore")
        t = texto(h)
        m = re.search(r"Last updated on ([A-Z][a-z]+ \d{1,2}, \d{4})", t)
        print("  Última actualización:", m.group(1) if m else "—")
        for linea in t.split("\n"):
            if re.search(r"\b16[01]\b|\b27 regional|mountain resort|Jumbo|Sun Peaks|incorporated|dissol", linea, re.I):
                print("  >", linea.strip()[:400])
        for txt, href in enlaces(h, U, r"xlsx?|csv|statistic|mountain resort|jumbo"):
            print("  enlace:", repr(txt[:80]), "→", href)
    except Exception as e:
        print("  ERROR", type(e).__name__, e)

paso("Límites legales (ABMS): municipios vigentes y búsqueda de Jumbo")
WFS = "https://openmaps.gov.bc.ca/geo/pub/wfs"
for capa in ["WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP"]:
    try:
        q = urllib.parse.urlencode({"service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeName": capa, "outputFormat": "json", "propertyName": "ADMIN_AREA_NAME,ADMIN_AREA_ABBREVIATION,ADMIN_AREA_GROUP_NAME,CHANGE_REQUESTED_ORG,UPDATE_TYPE,WHEN_UPDATED,MAP_STATUS,OIC_MO_NUMBER,OIC_MO_YEAR,OIC_MO_TYPE,WEBSITE_URL,AFFECTED_ADMIN_AREA_ABRVN", "count": 500})
        J = json.loads(get(f"{WFS}?{q}", 300))
        props = [f["properties"] for f in J["features"]]
        nombres = sorted({p["ADMIN_AREA_NAME"] for p in props})
        print("capa", capa, "elementos:", len(props), "nombres distintos:", len(nombres))
        print("  en ABMS hoy y no en nuestro catálogo:", sorted(set(nombres) - NUESTROS))
        print("  en nuestro catálogo y no en ABMS hoy:", sorted(NUESTROS - set(nombres)))
        print("  con 'Jumbo':", [p for p in props if "umbo" in json.dumps(p)])
        for p in sorted(props, key=lambda p: str(p.get("WHEN_UPDATED")))[-5:]:
            print("  más recientes:", {k: p.get(k) for k in ("ADMIN_AREA_NAME", "WHEN_UPDATED", "UPDATE_TYPE", "OIC_MO_NUMBER", "OIC_MO_YEAR")})
        print("  claves:", sorted(props[0].keys()))
    except Exception as e:
        print("ERROR", capa, type(e).__name__, e)

paso("BC Geographical Names: Jumbo Glacier")
try:
    q = urllib.parse.urlencode({"service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeName": "WHSE_BASEMAPPING.GNS_GEOGRAPHICAL_NAMES_SP", "outputFormat": "json", "CQL_FILTER": "GEOGRAPHICAL_NAME LIKE '%Jumbo%'", "propertyName": "GEOGRAPHICAL_NAME,FEATURE_TYPE,FEATURE_CATEGORY_DESCRIPTION,DECISION_DATE,RETIREMENT_DATE,GEOGRAPHICAL_NAME_ID", "count": 50})
    for f in json.loads(get(f"{WFS}?{q}", 300))["features"]:
        print("  ", f["properties"])
except Exception as e:
    print("ERROR", type(e).__name__, e)

paso("Comunicados oficiales: Jumbo / mountain resort municipality")
for q in ["Jumbo Glacier Mountain Resort Municipality", "mountain resort municipality dissolved", "new municipality incorporated"]:
    U = "https://news.gov.bc.ca/search?q=" + urllib.parse.quote(q)
    try:
        h = get(U).decode("utf-8", "ignore")
        print("búsqueda:", q)
        for txt, href in list(enlaces(h, U, r"/releases/|/factsheets/"))[:8]:
            print("   ", repr(txt[:120]), "→", href)
    except Exception as e:
        print("ERROR", type(e).__name__, e)

# ---------------------------------------------------------------- 2. Hora
paso("Hora oficial de BC (comunicados)")
for U in ["https://news.gov.bc.ca/releases/2026AG0013-000209", "https://news.gov.bc.ca/releases/2026CITZ0009-001073"]:
    print("URL:", U)
    try:
        t = texto(get(U).decode("utf-8", "ignore"))
        m = re.search(r"(?m)^.*(Victoria|VICTORIA).*$", t)
        for linea in t.split("\n"):
            if re.search(r"time|clock|daylight|Mountain|Kootenay|Peace|Dawson|Creston|Cranbrook|Golden|November|March|PCT|UTC|Yukon", linea, re.I) and len(linea) > 30:
                print("  >", linea.strip()[:600])
    except Exception as e:
        print("  ERROR", type(e).__name__, e)

# ---------------------------------------------------------------- 3. Enlaces protegidos
PROTEGIDOS = [
    "https://vancouver.ca/",
    "https://www.kelowna.ca/",
    "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A00055915022",
    "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A00055935010",
    "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A00055923047",
]
paso("Archivo de Internet (Wayback Machine): última copia de cada enlace protegido")
for u in PROTEGIDOS:
    try:
        J = json.loads(get("https://archive.org/wayback/available?url=" + urllib.parse.quote(u, safe=""), 60))
        s = J.get("archived_snapshots", {}).get("closest") or {}
        print("WB|", s.get("status"), s.get("timestamp"), s.get("url"), "|", u)
    except Exception as e:
        print("WB| ERROR", type(e).__name__, u)
