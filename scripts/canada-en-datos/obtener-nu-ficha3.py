"""
obtener-nu-ficha3.py — Tercera ronda de verificación de la ficha de Nunavut (solo lectura)
==========================================================================================
Copias públicas del Internet Archive de páginas del Gobierno de Nunavut que la
segunda ronda no pudo leer (sin sortear la verificación de Cloudflare del
sitio original), base de datos de zonas horarias de la IANA (comentarios
sobre las comunidades de Nunavut) y normales climáticas de Iqaluit.
"""
import gzip, html, io, json, re, tarfile, time, urllib.parse, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=120, intentos=4):
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
                b = r.read()
                return (gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b), r.status, r.geturl()
        except Exception as e:
            if i == intentos - 1:
                raise
            time.sleep(8 * (i + 1))


def texto(h):
    h = h.decode("utf-8", "ignore") if isinstance(h, bytes) else h
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def mostrar(t, patron, ventana=3, maximo=40):
    lineas, vistos, n = t.split("\n"), set(), 0
    for i, l in enumerate(lineas):
        if re.search(patron, l, re.I) and i not in vistos:
            vistos.update(range(i, i + ventana))
            print("  >", " | ".join(x.strip() for x in lineas[max(0, i - 1): i + ventana] if x.strip())[:1100])
            n += 1
            if n >= maximo:
                break


# ------------------------------------------------------------ 1. IANA: comunidades de Nunavut en tzdata
paso("IANA tzdata: archivo northamerica (Nunavut)")
try:
    b, st, _ = get("https://data.iana.org/time-zones/tzdata-latest.tar.gz", 120)
    tf = tarfile.open(fileobj=io.BytesIO(b))
    print("versión:", tf.extractfile("version").read().decode().strip())
    na = tf.extractfile("northamerica").read().decode("utf-8", "ignore")
    zt = tf.extractfile("zone1970.tab").read().decode("utf-8", "ignore")
    for l in zt.splitlines():
        if re.search(r"Iqaluit|Rankin|Resolute|Cambridge|Atikokan|Coral|Pangnirtung", l):
            print("  zone1970.tab:", l)
    i = na.find("# Nunavut")
    if i < 0:
        i = na.find("Nunavut")
    bloque = na[i: i + 16000]
    for l in bloque.splitlines():
        if re.search(r"Nunavut|Iqaluit|Rankin|Resolute|Cambridge|Kugluktuk|Kugaaruk|Taloyoak|Gjoa|Igloolik|Hall Beach|Sanirajak|Arctic Bay|Pond|Clyde|Grise|Coral|Southampton|Baker|Arviat|Whale|Chesterfield|Naujaat|Repulse|Kinngait|Dorset|Kimmirut|Pangnirtung|Qikiqtarjuaq|Sanikiluaq|Eastern|Central|Mountain|^Zone|^Rule|daylight|DST", l):
            print("  |", l[:200])
except Exception as e:
    print("ERROR", type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 2. Copias archivadas del Gobierno de Nunavut
def cdx(prefijo):
    q = {"url": prefijo, "matchType": "prefix", "output": "json", "fl": "original,timestamp", "filter": "statuscode:200", "collapse": "urlkey", "from": "2023", "limit": "50000"}
    d = json.loads(get("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), 300)[0] or b"[]")
    return d[1:] if d else []


filas = []
for pref in ("www.gov.nu.ca/", "nu-lsco.ca/"):
    paso(f"CDX {pref}")
    try:
        f = cdx(pref)
        print("direcciones:", len(f))
        filas += f
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])
ult = {}
for o, ts in filas:
    u = re.sub(r"^https?://(www\.)?", "", o).split("?")[0].rstrip("/")
    if u not in ult or ts > ult[u][1]:
        ult[u] = (o, ts)

TEMAS = [
    ("911", r"911|emergency-number|dial", r"911|emergency|launch|communit|RCMP|fire|ambulance"),
    ("licencia: solicitar", r"apply-drivers-licence|drivers-licences-and-permits|exchange", r"licen|exchange|test|country|resident|days|vision|knowledge|road"),
    ("alquileres", r"tenan|landlord|rental-office|residential", r"tenant|landlord|deposit|notice|Rental Officer|rent increase|12 months|days"),
    ("símbolos y bandera", r"symbol|flag|emblem|coat-of-arms|official-symbol", r"flag|inuksuk|star|blue|gold|red|white|1999"),
    ("hora", r"time-zone|daylight|time-change|clock", r"time|daylight|Eastern|Central|Mountain|Southampton|Coral Harbour"),
    ("centros de salud", r"community-health-centres|health-centres|health-facilities|qikiqtani-general", r"health centre|nurse|Qikiqtani|Kivalliq|Kitikmeot|communit|emergenc"),
    ("viajes médicos", r"health/medical-travel$|medical-travel-non-inuit|medical-travel-policy", r"medical travel|co-pay|\$\d|escort|Inuit|non-Inuit|policy"),
    ("salario mínimo LSCO", r"minimum-wage|nu-lsco.ca/?$|nu-lsco.ca/en|wage", r"minimum wage|\$\d+\.\d\d|effective|September|April|2025|2026"),
    ("encuesta de vivienda", r"nunavut-housing-survey|housing-data|core-housing", r"crowd|need|repair|public housing|staff housing|%|20\d\d"),
    ("lenguas oficiales", r"official-languages|inuit-language|language-services|languages", r"Inuktut|Inuktitut|Inuinnaqtun|English|French|official|Inuit Language Protection Act|services"),
    ("recién llegados", r"moving-to-nunavut|newcomer|welcome|relocat|live-in-nunavut|living-in-nunavut", r"newcomer|moving|housing|cost|weather|internet|sealift|food"),
    ("costos de alimentos", r"food-price|price-survey|cost-of-living|food-security", r"food|price|survey|\$\d|times|percent|20\d\d"),
]
for nombre, url_re, frases in TEMAS:
    cand = sorted([(u, v) for u, v in ult.items() if re.search(url_re, u, re.I) and not re.search(r"/(fr|iu|ikt|in)/|\.(pdf|css|js|png|jpg)$|/jobs?/|nurse|midwife|-\d{2}-\d", u)], key=lambda x: (len(x[0]), x[0]))
    paso(f"Tema: {nombre} — {len(cand)} direcciones")
    for u, (o, ts) in cand[:20]:
        print("   ", ts[:8], u)
    for u, (o, ts) in cand[:3]:
        paso(f"Copia archivada {ts[:8]}: {u}")
        try:
            b, st, _ = get(f"http://web.archive.org/web/{ts}id_/{o}", 90)
            t = texto(b)
            print("estado:", st, "| caracteres:", len(t))
            mostrar(t, frases)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:150])
        time.sleep(4)

# ------------------------------------------------------------ 3. Normales de Iqaluit (página de ECCC archivada)
for u in ["https://climate.weather.gc.ca/climate_normals/results_1981_2010_e.html?searchType=stnName&txtStationName=iqaluit&searchMethod=contains&txtCentralLatMin=0&txtCentralLatSec=0&txtCentralLongMin=0&txtCentralLongSec=0&stnID=1758&dispBack=0",
          "http://web.archive.org/web/2025/https://climate.weather.gc.ca/climate_normals/results_1981_2010_e.html?stnID=1758&autofwd=1"]:
    paso(f"Normales de Iqaluit: {u[:110]}")
    try:
        b, st, final = get(u, 120)
        t = texto(b)
        print("estado:", st, "| final:", final[:140], "| caracteres:", len(t))
        mostrar(t, r"IQALUIT|Daily Average|Daily Maximum|Daily Minimum|Snowfall|Precipitation|Extreme Minimum", ventana=2)
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:150])
