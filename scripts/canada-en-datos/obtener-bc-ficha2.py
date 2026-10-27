"""
obtener-bc-ficha2.py — Segunda ronda de verificación de la ficha de Columbia Británica
=====================================================================================
Solo lectura, en GitHub Actions. Completa obtener-bc-ficha.py:
  1. Tablas de Statistics Canada que fallaron por el filtro (PIB, Encuesta
     de Población Activa mensual, índice de gravedad del delito): primero
     se imprimen los valores posibles de cada columna.
  2. Páginas oficiales con su dirección actual (las anteriores daban 404),
     con el texto completo (recortado) para comprobar cada afirmación.
  3. Enlaces de las portadas oficiales que coinciden con palabras clave
     (para encontrar direcciones vigentes sin adivinarlas).
  4. BC Stats: estimaciones de población por municipio (2011-2025). Se
     guardan en scripts/canada-en-datos/bc-estimaciones.json y se imprimen
     comprimidas entre DATOS-INICIO y DATOS-FIN.
"""
import base64, csv, gzip, html, io, json, re, urllib.parse, urllib.request, zipfile

import openpyxl

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=600):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)))
    nombre = [n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n][0]
    return list(csv.DictReader(io.TextIOWrapper(zf.open(nombre), encoding="utf-8-sig")))


# ------------------------------------------------------------ 1. Tablas
for pid, fijos, n in (
    ("36100222", {"Prices": "Current dollars"}, 3),
    ("14100287", {"Gender": "Total - Gender", "Age group": "15 years and over", "Data type": "Seasonally adjusted", "Statistics": "Estimate"}, 3),
    ("35100026", {}, 3),
):
    paso(f"StatCan {pid}")
    try:
        filas = [x for x in tabla(pid) if x["GEO"] == "British Columbia"]
        cols = [c for c in filas[0] if c not in ("REF_DATE", "GEO", "DGUID", "UOM", "UOM_ID", "SCALAR_FACTOR", "SCALAR_ID", "VECTOR", "COORDINATE", "VALUE", "STATUS", "SYMBOL", "TERMINATED", "DECIMALS")]
        for c in cols:
            print("  columna", c, "→", sorted({x[c] for x in filas})[:40])
        sel = [x for x in filas if all(x.get(k) == v for k, v in fijos.items())]
        if pid == "36100222":
            sel = [x for x in sel if "market prices" in x.get("Estimates", "") and x["Estimates"].startswith("Gross domestic product")]
        if pid == "14100287":
            sel = [x for x in sel if x["Labour force characteristics"] in ("Unemployment rate", "Participation rate", "Employment rate")]
        if pid == "35100026":
            sel = [x for x in sel if x.get("Statistics") in ("Crime severity index", "Violent crime severity index", "Non-violent crime severity index")]
        fechas = sorted({x["REF_DATE"] for x in sel})[-n:]
        for x in sel:
            if x["REF_DATE"] in fechas:
                print("  ", {k: v for k, v in x.items() if k in ["REF_DATE", "VALUE", "UOM", "SCALAR_FACTOR"] + cols})
    except Exception as e:
        print("ERROR", pid, type(e).__name__, e)


# ------------------------------------------------------------ 2. Páginas (texto)
def texto(url):
    h = get(url, 120).decode("utf-8", "ignore")
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t ]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


PAGINAS = [
    ("Límite de alquiler 2027 (comunicado)", "https://news.gov.bc.ca/releases/2026HMA0085-000982", 5000),
    ("Aumentos de alquiler (RTB)", "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies/during-a-tenancy/rent-increases", 9000),
    ("MSP: ¿eres elegible?", "https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp/bc-residents/eligibility-and-enrolment/are-you-eligible", 7000),
    ("MSP: período de espera", "https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp/bc-residents/eligibility-and-enrolment/how-to-enrol/coverage-wait-period", 4000),
    ("ICBC: desde otro país", "https://www.icbc.com/driver-licensing/moving-bc/moving-from-another-country", 9000),
    ("WelcomeBC: servicios para recién llegados", "https://www.welcomebc.ca/start-your-life-in-b-c/settlement-services", 5000),
    ("WelcomeBC: BC Newcomer Services Program", "https://www.welcomebc.ca/temporaryresidents", 6000),
    ("WelcomeBC: noticias del PNP", "https://www.welcomebc.ca/immigrate-to-b-c/news", 7000),
    ("WelcomeBC: invitaciones", "https://www.welcomebc.ca/immigrate-to-b-c/invitations-to-apply", 5000),
    ("Cuidado infantil (reducción de tarifas)", "https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/child-care-funding/child-care-operating-funding/child-care-fee-reduction-initiative-provider-opt-in-status", 3000),
    ("Cuidado infantil $10 al día", "https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/child-care-funding/10-a-day-childcare", 4000),
    ("Ahorro en cuidado infantil", "https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/child-care-funding/child-care-fee-reduction-initiative-parents", 4000),
    ("Hora (comunicados)", "https://news.gov.bc.ca/search?q=time%20zone", 3000),
    ("Hora permanente (comunicados)", "https://news.gov.bc.ca/search?q=daylight%20saving%20time", 3000),
    ("BC Transit", "https://www.bctransit.com/", 2500),
    ("WelcomeBC: credenciales", "https://www.welcomebc.ca/work-or-study-in-b-c/work-in-b-c/getting-your-credentials-recognized-in-b-c", 3000),
    ("Distritos regionales", "https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/regional-districts", 4000),
    ("Escuelas: inscripción", "https://www2.gov.bc.ca/gov/content/education-training/k-12/support/enrolling-in-school", 3000),
    ("PreparedBC: peligros", "https://www2.gov.bc.ca/gov/content/safety/emergency-management/preparedbc/know-your-hazards", 3000),
    ("Residential Tenancy Branch", "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies", 2500),
]
for nombre, url, lim in PAGINAS:
    paso(f"Página: {nombre}")
    print("URL:", url)
    try:
        t = texto(url)
        m = re.search(r"Last updated on ([A-Z][a-z]+ \d{1,2}, \d{4})", t)
        print("Última actualización:", m.group(1) if m else "—", "| caracteres:", len(t))
        print(t[:lim])
    except Exception as e:
        print("ERROR", type(e).__name__, e)

# ------------------------------------------------------------ 3. Enlaces de portadas
PORTADAS = [
    ("https://www.welcomebc.ca/", r"nominee|PNP|immigrat|credential|settlement|newcomer|skills"),
    ("https://www.welcomebc.ca/immigrate-to-b-c", r"nominee|PNP|skills|entrepreneur|stream|program guide"),
    ("https://www.icbc.com/driver-licensing", r"moving|another country|exchange|licen"),
    ("https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp", r"eligib|enrol|apply|wait|cover"),
    ("https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children", r"\$10|fee|afford|benefit|funding"),
    ("https://www.bctransit.com/", r"victoria|kelowna|kamloops|nanaimo|prince-george|comox|squamish|whistler|fraser|chilliwack|systems|choose"),
    ("https://www2.gov.bc.ca/gov/content/data/statistics/people-population-community/population/population-estimates", r"xlsx|csv|municipal"),
]
estim_url = None
for url, patron in PORTADAS:
    paso(f"Enlaces: {url}")
    try:
        h = get(url, 120).decode("utf-8", "ignore")
        vistos = set()
        for m in re.finditer(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h, re.I | re.S):
            href = urllib.parse.urljoin(url, html.unescape(m.group(1)))
            txt = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", m.group(2)))).strip()
            if (re.search(patron, href, re.I) or re.search(patron, txt, re.I)) and href not in vistos:
                vistos.add(href)
                print(f"   {txt[:90]!r} → {href}")
                if "2011 to 2025" in txt or re.search(r"2011.*2025.*xlsx", href, re.I):
                    estim_url = href
    except Exception as e:
        print("ERROR", type(e).__name__, e)

# ------------------------------------------------------------ 4. BC Stats: estimaciones municipales
paso("BC Stats — estimaciones municipales 2011-2025")
print("URL:", estim_url)
salida = {"url": estim_url, "hojas": {}}
if estim_url:
    try:
        wb = openpyxl.load_workbook(io.BytesIO(get(estim_url, 300)), read_only=True, data_only=True)
        for ws in wb.worksheets:
            filas = [[("" if c is None else str(c).strip()) for c in f] for f in ws.iter_rows(values_only=True)]
            filas = [f for f in filas if any(f)]
            salida["hojas"][ws.title] = filas
            print("hoja:", ws.title, "filas:", len(filas))
            for f in filas[:8]:
                print("   ", f[:18])
    except Exception as e:
        print("ERROR", type(e).__name__, e)
texto_json = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
open("scripts/canada-en-datos/bc-estimaciones.json", "w", encoding="utf-8").write(texto_json)
b64 = base64.b64encode(gzip.compress(texto_json.encode("utf-8"), 9)).decode()
print("\nbytes JSON:", len(texto_json), "base64:", len(b64))
print("DATOS-INICIO")
for i in range(0, len(b64), 3000):
    print("D|" + b64[i : i + 3000])
print("DATOS-FIN")
