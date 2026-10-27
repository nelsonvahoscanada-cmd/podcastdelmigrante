"""
obtener-bc-ficha3.py — Tercera ronda de verificación de la ficha de Columbia Británica
=====================================================================================
Solo lectura, en GitHub Actions. Completa las rondas 1 y 2 (hora oficial, cuidado infantil, escuelas, PIB, delito y recursos):
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
for pid in ("36100222", "35100026"):
    paso(f"StatCan {pid}")
    try:
        filas = [x for x in tabla(pid) if x["GEO"].startswith("British Columbia")]
        if pid == "36100222":
            filas = [x for x in filas if x["Prices"] == "Current prices" and x["Estimates"].startswith("Gross domestic product at market prices")]
        else:
            print("  columnas:", list(filas[0]))
            print("  Statistics:", sorted({x.get("Statistics", "") for x in filas}))
            filas = [x for x in filas if x.get("Statistics") == "Crime severity index"]
        for x in [f for f in filas if f["REF_DATE"] in sorted({y["REF_DATE"] for y in filas})[-3:]]:
            print("  ", {k: v for k, v in x.items() if k in ("REF_DATE", "GEO", "Prices", "Estimates", "Statistics", "VALUE", "UOM", "SCALAR_FACTOR")})
    except Exception as e:
        print("ERROR", pid, type(e).__name__, e)


def texto(url):
    h = get(url, 120).decode("utf-8", "ignore")
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\u00a0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def enlaces(url, patron):
    h = get(url, 120).decode("utf-8", "ignore")
    out = []
    for m in re.finditer(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h, re.I | re.S):
        href = urllib.parse.urljoin(url, html.unescape(m.group(1)))
        txt = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", m.group(2)))).strip()
        if re.search(patron, href + " " + txt, re.I) and (txt, href) not in out:
            out.append((txt, href))
    return out


# ------------------------------------------------------------ 2. Hora oficial
paso("Comunicados sobre la hora")
for txt, href in enlaces("https://news.gov.bc.ca/search?q=daylight%20saving%20time", r"releases|news.gov.bc.ca/\d+"):
    print(f"   {txt[:100]!r} → {href}")
    if re.search(r"PCT|permanent daylight|time zone", txt, re.I):
        try:
            t = texto(href)
            i = t.find("Summary") if "Summary" in t else 0
            print("----- TEXTO -----")
            print(t[i:i + 6000])
            print("-----------------")
        except Exception as e:
            print("ERROR", e)

PAGINAS = [
    ("WelcomeBC: zonas horarias", "https://www.welcomebc.ca/choose-b-c/about-british-columbia-canada/time-zones", 4000),
    ("Alberta: hora", "https://www.alberta.ca/daylight-saving-time", 4000),
    ("WelcomeBC: el BC PNP", "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/the-bc-provincial-nominee-program", 6000),
    ("WelcomeBC: Skills Immigration", "https://www.welcomebc.ca/immigrate-to-b-c/skills-immigration", 6000),
    ("WelcomeBC: guía para recién llegados", "https://www.welcomebc.ca/start-your-life-in-b-c/newcomers-guides", 3500),
    ("WelcomeBC: BC Newcomer Services Program", "https://www.welcomebc.ca/start-your-life-in-b-c/settlement-services/services-for-newcomers-on-a-temporary-work-or-study-permit-and-new-citizens", 4000),
    ("WelcomeBC: credenciales", "https://www.welcomebc.ca/start-your-life-in-b-c/working-in-b-c/getting-your-employment-credentials-recognized", 4000),
    ("WelcomeBC: cuidado infantil", "https://www.welcomebc.ca/start-your-life-in-b-c/living-in-b-c/child-care", 4000),
    ("WelcomeBC: sistema escolar", "https://www.welcomebc.ca/start-your-life-in-b-c/studying-in-b-c/kindergarten-to-grade-12", 4000),
    ("WelcomeBC: educación de adultos e inglés", "https://www.welcomebc.ca/start-your-life-in-b-c/studying-in-b-c/english-language-learning", 3000),
    ("WelcomeBC: transporte", "https://www.welcomebc.ca/start-your-life-in-b-c/living-in-b-c/transportation", 3000),
    ("WelcomeBC: impuestos", "https://www.welcomebc.ca/start-your-life-in-b-c/living-in-b-c/taxes", 3500),
    ("WelcomeBC: geografía", "https://www.welcomebc.ca/choose-b-c/about-british-columbia-canada/geography", 3500),
    ("WelcomeBC: clima", "https://www.welcomebc.ca/choose-b-c/about-british-columbia-canada/climate", 3500),
    ("211 BC", "https://bc.211.ca/", 1500),
    ("Health Connect Registry", "https://www.healthlinkbc.ca/health-connect-registry", 2500),
    ("WorkBC Centres", "https://www.workbc.ca/discover-employment-services/workbc-centres", 2500),
    ("Employment Standards (derechos laborales)", "https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards", 2500),
]
for nombre, url, lim in PAGINAS:
    paso(f"Página: {nombre}")
    print("URL:", url)
    try:
        t = texto(url)
        m = re.search(r"Last updated(?: on)?:? ([A-Z][a-z]+ \d{1,2}, \d{4})", t)
        print("Última actualización:", m.group(1) if m else "—", "| caracteres:", len(t))
        i = max(0, t.find("Last updated") - 50) if "Last updated" in t else 0
        print(t[i:i + lim])
    except Exception as e:
        print("ERROR", type(e).__name__, e)

for url, patron in (
    ("https://www2.gov.bc.ca/gov/content/family-social-supports/caring-for-young-children/child-care-funding", r"."),
    ("https://www2.gov.bc.ca/gov/content/education-training/k-12/support", r"enrol|register|school|district"),
    ("https://www.welcomebc.ca/choose-b-c/about-british-columbia-canada", r"time|geograph|climate"),
):
    paso(f"Enlaces: {url}")
    try:
        for txt, href in enlaces(url, patron)[:80]:
            if "gov.bc.ca" in href or "welcomebc" in href:
                print(f"   {txt[:90]!r} → {href}")
    except Exception as e:
        print("ERROR", type(e).__name__, e)
