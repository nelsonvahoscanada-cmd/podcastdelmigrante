"""
obtener-ontario-complementos2.py — Regiones económicas (SGC 2021) y hospitales de Ontario
=========================================================================================
Solo lectura; se ejecuta en GitHub Actions. Escribe
scripts/canada-en-datos/ontario-complementos2.json:
  - er: divisiones censales de cada región económica de Ontario, según la
    «Variant of SGC 2021 for Economic Regions» de Statistics Canada.
  - hospitales: Ministry of Health Service Provider Locations (MOHSERLO),
    Land Information Ontario, solo los registros de hospitales.
"""
import base64, datetime, gzip, io, json, re, urllib.parse, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
salida = {"consultado": datetime.date.today().isoformat()}


def get(url, t=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read().decode("utf-8", "ignore"), r.geturl()


def texto(html):
    h = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", html)
    h = re.sub(r"<(br|/p|/li|/h\d|/tr|/div|/dt|/dd|/td|/th)[^>]*>", "\n", h, flags=re.I)
    h = re.sub(r"<[^>]+>", " ", h).replace("&nbsp;", " ").replace("&amp;", "&").replace("&ndash;", "–").replace("&#8211;", "–")
    return [re.sub(r"\s+", " ", l).strip() for l in h.split("\n") if l.strip()]


print("\n=== SGC 2021, variante de regiones económicas (vista completa) ===")
ER_VD = "https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=1368923&CVD=1368924&CLV=0&MLV=5&D=1"
html, final = get(ER_VD, 600)
lineas = texto(html)
print(final, "líneas:", len(lineas))
ini = next((i for i, l in enumerate(lineas) if re.match(r"^35\b", l) or l.startswith("35 Ontario")), None)
on = [l for l in lineas if re.match(r"^35\d{0,5}\b", l)]
print("líneas que empiezan con 35:", len(on))
for l in on[:160]:
    print("   ·", l[:160])
# Tabla de la página: filas Nivel | Código | Título
filas = re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", html)
celdas = [[re.sub(r"<[^>]+>|\s+", " ", c).strip() for c in re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", f)] for f in filas]
celdas = [c for c in celdas if c]
print("filas de tabla:", len(celdas), "ejemplo:", celdas[:3])
ont = [c for c in celdas if any(re.match(r"^35\d*$", x) for x in c)]
print("filas de Ontario:", len(ont))
for c in ont[:200]:
    print("   ", c)
salida["er"] = {"url": ER_VD.replace("&", "&amp;"), "fuente": "Statistics Canada, Variant of SGC 2021 for Economic Regions", "lineas": on, "filas": ont}

print("\n=== LIO: capas de proveedores del Ministerio de Salud ===")
LIO = "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA"
capas = {}
for i in range(1, 11):
    try:
        info = json.loads(get(f"{LIO}/LIO_Open{i:02d}/MapServer?f=json", 120)[0])
    except Exception as e:
        print("ERROR", i, e)
        continue
    for l in info.get("layers", []):
        if re.search(r"moh service location|service provider|hospital", l["name"], re.I):
            print(f"  LIO_Open{i:02d}/{l['id']}: {l['name']}")
            capas[l["name"]] = f"{LIO}/LIO_Open{i:02d}/MapServer/{l['id']}"
salida["hospitales"] = {"capas": capas}
for nombre, url in capas.items():
    if not re.search(r"service location|service provider", nombre, re.I):
        continue
    filas, desde = [], 0
    while True:
        q = {"where": "1=1", "outFields": "*", "returnGeometry": "false", "f": "json", "resultOffset": str(desde), "resultRecordCount": "1000"}
        fs = json.loads(get(url + "/query?" + urllib.parse.urlencode(q), 300)[0]).get("features", [])
        filas += [f["attributes"] for f in fs]
        if len(fs) < 1000:
            break
        desde += 1000
    print(nombre, "registros:", len(filas), "campos:", list(filas[0]) if filas else None)
    tipos = {}
    for f in filas:
        for k, v in f.items():
            if isinstance(v, str) and re.search(r"type|categ|service", k, re.I):
                tipos[(k, v)] = tipos.get((k, v), 0) + 1
    for (k, v), n in sorted(tipos.items(), key=lambda x: -x[1])[:40]:
        print(f"   {k} = {v}: {n}")
    hosp = [f for f in filas if any(isinstance(v, str) and re.search(r"hospital", v, re.I) for v in f.values())]
    print("   registros con 'hospital':", len(hosp))
    for f in hosp[:5]:
        print("    ", f)
    salida["hospitales"][nombre] = {"url": url, "filas": hosp}

t = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
open("scripts/canada-en-datos/ontario-complementos2.json", "w", encoding="utf-8").write(t)
b64 = base64.b64encode(gzip.compress(t.encode("utf-8"), 9)).decode()
print("\nbytes JSON:", len(t), "base64:", len(b64))
print("DATOS-INICIO")
for i in range(0, len(b64), 3000):
    print("D|" + b64[i : i + 3000])
print("DATOS-FIN")
