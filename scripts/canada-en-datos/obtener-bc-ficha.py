"""
obtener-bc-ficha.py — Verificación de las cifras y textos de la ficha provincial de Columbia Británica
=====================================================================================================
Solo lectura. Se ejecuta en GitHub Actions (el entorno de desarrollo no
tiene acceso a estos servidores). Imprime en el registro:
  1. Los últimos valores de las tablas de Statistics Canada que usa la
     ficha (población, superficie, PIB, empleo, salarios, delito).
  2. Fragmentos literales de las páginas oficiales en las que se basan
     los textos (salario mínimo, alquiler, MSP, PNP, licencias, etc.),
     para comprobarlos uno por uno antes de escribirlos.
  3. Las estimaciones municipales de BC Stats, si están publicadas.
No guarda datos en el repositorio: la ficha cita cada cifra con su fuente.
"""
import csv, html, io, json, re, urllib.request, zipfile

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=600):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)))
    nombre = [n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(nombre), encoding="utf-8-sig"))


def ultimos(pid, cond, n=3, clave="REF_DATE"):
    paso(f"StatCan {pid}")
    filas = [x for x in tabla(pid) if cond(x)]
    fechas = sorted({x[clave] for x in filas})[-n:]
    for x in filas:
        if x[clave] in fechas:
            print("  ", {k: v for k, v in x.items() if k not in ("DGUID", "UOM_ID", "SCALAR_ID", "VECTOR", "COORDINATE", "TERMINATED", "SYMBOL")})


BC = lambda x: x["GEO"] == "British Columbia"

for pid, cond, n in (
    ("17100009", BC, 3),
    ("98100001", lambda x: BC(x), 1),
    ("36100222", lambda x: BC(x) and x["Prices"] == "Current dollars" and x["Estimates"] == "Gross domestic product at market prices", 3),
    ("14100287", lambda x: BC(x) and x["Labour force characteristics"] in ("Unemployment rate", "Participation rate", "Employment rate") and x["Sex"] == "Both sexes" and x["Age group"] == "15 years and over" and x["Data type"] == "Seasonally adjusted" and x.get("Statistics", "Estimate") == "Estimate", 3),
    ("14100327", lambda x: BC(x) and x["Labour force characteristics"] == "Unemployment rate" and x["Gender"] == "Total - Gender" and x["Age group"] == "15 years and over", 3),
    ("14100064", lambda x: BC(x) and x["Wages"] in ("Average hourly wage rate", "Median hourly wage rate") and x["Type of work"] == "Both full- and part-time employees" and x["North American Industry Classification System (NAICS)"] == "Total employees, all industries" and x["Gender"] == "Total - Gender" and x["Age group"] == "15 years and over", 2),
    ("35100026", lambda x: BC(x) and x["Statistics"] == "Crime severity index", 2),
):
    try:
        ultimos(pid, cond, n)
    except Exception as e:
        print("ERROR", pid, type(e).__name__, e)


def texto(url):
    h = get(url, 120).decode("utf-8", "ignore")
    h = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t ]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


PAGINAS = {
    "salario mínimo": ("https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards/wages/minimum-wage", r"\$\d|June 1|resident caretaker|live-in camp|farm|app-based|ride-hail|delivery"),
    "aumento de alquiler": ("https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies/during-a-tenancy/rent-increases", r"\d\.\d ?%|per cent|2026|2027|three months|12 months|once a year"),
    "depósito": ("https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies/starting-a-tenancy/deposits-and-fees", r"half|deposit|pet damage|15 days"),
    "MSP elegibilidad": ("https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp/bc-residents/eligibility-and-enrolment/how-to-enrol/eligibility-and-enrolment", r"wait|month|eligible|permit|six months|study|work permit|enrol"),
    "MSP período de espera": ("https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp/bc-residents/eligibility-and-enrolment/how-to-enrol/coverage-wait-period", r"wait|month|arrival|three|two"),
    "HealthLink BC": ("https://www.healthlinkbc.ca/", r"8-1-1|811|24|nurse|dietitian|pharmacist|translation|130"),
    "BC PNP": ("https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-pnp", r"2026|nominat|stream|Skills Immigration|Entrepreneur|allocation|invitation|registration|close|pause"),
    "BC PNP novedades": ("https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-news-and-updates", r"2026|2025|stream|invitation|allocation|pause|close|open"),
    "WelcomeBC servicios": ("https://www.welcomebc.ca/start-your-life-in-b-c/services-for-newcomers", r"free|eligible|settlement|BC Settlement|citizens|refugee|temporary|program"),
    "ICBC licencia": ("https://www.icbc.com/driver-licensing/moving-bc/Moving-from-another-country", r"90 days|exchange|reciprocal|knowledge test|road test|experience|years|translation"),
    "ICBC países con acuerdo": ("https://www.icbc.com/driver-licensing/moving-bc/Licence-exchange-chart", r"Austria|Australia|Germany|Japan|Korea|Mexico|Colombia|exchange"),
    "WorkBC": ("https://www.workbc.ca/", r"WorkBC Centres|free|job|centre|labour market|outlook"),
    "BC credenciales": ("https://www.welcomebc.ca/work-or-study-in-b-c/work-in-b-c/getting-your-credentials-recognized", r"regulat|credential|licens|occupation|assess"),
    "PST": ("https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst", r"7%|7 %|per cent|PST|GST"),
    "impuesto a la renta BC": ("https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal/tax-rates", r"\d+\.\d+%|\$\d[\d,]+|2026"),
    "cuidado infantil": ("https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/child-care-funding/child-care-fee-reduction-initiative", r"\$10|\$\d+|per day|month|reduction"),
    "BC Family Benefit": ("https://www2.gov.bc.ca/gov/content/family-social-supports/affordability/family-benefit", r"\$\d[\d,]*|per year|child|automatic|tax return"),
    "BC Housing": ("https://www.bchousing.org/housing-assistance/rental-housing", r"subsid|apply|registry|waitlist|eligible"),
    "TransLink": ("https://www.translink.ca/", r"SkyTrain|Compass|bus|SeaBus|West Coast Express"),
    "BC Transit": ("https://www.bctransit.com/choose-your-transit-system", r"Victoria|Kelowna|Kamloops|Nanaimo|Prince George|systems|communities"),
    "PreparedBC": ("https://www2.gov.bc.ca/gov/content/safety/emergency-management/preparedbc", r"earthquake|wildfire|flood|heat|tsunami|kit|plan"),
    "Job Bank BC 2026": ("https://www.jobbank.gc.ca/trend-analysis/job-market-reports/british-columbia/environmental-scan", r"20\d\d|unemploy|employment|grew|growth|sector|industr|%"),
    "BC Stats población": ("https://www2.gov.bc.ca/gov/content/data/statistics/people-population-community/population/population-estimates", r"20\d\d|estimate|July 1|population"),
    "Acerca de BC": ("https://www2.gov.bc.ca/gov/content/governments/about-the-bc-government/bc-facts", r"km|area|capital|population|largest|coast|mountain|islands|time"),
    "zonas horarias BC": ("https://www2.gov.bc.ca/gov/content/governments/policies-for-government/core-policy/policies/time", r"time zone|Mountain|Pacific|daylight|Peace River|East Kootenay|Creston"),
    "municipios BC": ("https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/municipalities", r"\d+ municipalities|city|town|village|district|incorporat|population"),
    "distritos regionales": ("https://www2.gov.bc.ca/gov/content/governments/local-governments/facts-framework/systems/regional-districts", r"\d+ regional districts|electoral area|unincorporated|Stikine"),
    "estudiantes internacionales PAL": ("https://www2.gov.bc.ca/gov/content/education-training/post-secondary-education/international-education/provincial-attestation-letter", r"PAL|attestation|2026|study permit"),
    "escuelas inscripción": ("https://www2.gov.bc.ca/gov/content/education-training/k-12/support/enrolling-in-school", r"school district|enrol|age|kindergarten|free|5 years|documents"),
    "StudentAid BC": ("https://studentaidbc.ca/", r"grant|loan|apply|eligible"),
    "MSP qué cubre": ("https://www2.gov.bc.ca/gov/content/health/health-drug-coverage/msp/bc-residents/benefits/services-covered-by-msp", r"physician|hospital|not covered|dental|prescription|PharmaCare|eye"),
    "IRCC servicios": ("https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/new-life-canada/settlement-services.html", r"free|eligible|permanent|services"),
}
for nombre, (url, patron) in PAGINAS.items():
    paso(f"Página: {nombre}")
    print("URL:", url)
    try:
        t = texto(url)
        m = re.search(r"Last updated on ([A-Z][a-z]+ \d{1,2}, \d{4})", t)
        print("Última actualización:", m.group(1) if m else "—", "| caracteres:", len(t))
        vistos, n = set(), 0
        for linea in t.split("\n"):
            s = linea.strip()
            if 25 <= len(s) <= 900 and re.search(patron, s, re.I) and s not in vistos:
                vistos.add(s)
                print("  ·", s)
                n += 1
                if n >= 45:
                    break
    except Exception as e:
        print("ERROR", type(e).__name__, e)

paso("BC Stats — estimaciones de población subprovinciales")
try:
    d = json.loads(get("https://catalogue.data.gov.bc.ca/api/3/action/package_show?id=bc-sub-provincial-population-estimates-and-projections", 120))["result"]
    print(d["title"], "| modificado:", d.get("metadata_modified"))
    for r in d["resources"]:
        print("   recurso:", r.get("name"), r.get("format"), r.get("url"), r.get("last_modified"))
    for r in d["resources"]:
        if re.search(r"municipal", (r.get("name") or "") + (r.get("url") or ""), re.I) and (r.get("format") or "").lower() == "csv":
            filas = list(csv.reader(io.StringIO(get(r["url"], 300).decode("utf-8-sig", "ignore"))))
            print("  ", r["name"], "columnas:", filas[0][:20], "filas:", len(filas))
            for f in filas[1:6]:
                print("     ", f[:12])
            años = sorted({f[filas[0].index("Year")] for f in filas[1:] if "Year" in filas[0]})
            print("   años:", años[-6:] if años else None)
except Exception as e:
    print("ERROR", e)
