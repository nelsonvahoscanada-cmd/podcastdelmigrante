"""
consultar-hora-oficial.py — Reglas oficiales de la hora en Canadá (solo lectura)
1. Base de datos horaria IANA (tzdata más reciente): versión, NEWS de 2026 y la
   sección de Canadá del archivo northamerica (zonas y comentarios con fuentes).
2. Comunicados oficiales sobre las excepciones regionales (BC sureste, noroeste
   de Ontario, Lloydminster, Nunavut, Territorios del Noroeste).
"""
import io, re, tarfile, urllib.request, html, sys
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
def get(u, t=90):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read()

print("=== IANA tzdata-latest ===", flush=True)
tf = tarfile.open(fileobj=io.BytesIO(get("https://data.iana.org/time-zones/tzdata-latest.tar.gz")))
leer = lambda n: tf.extractfile(n).read().decode("utf-8", "ignore")
print("versión:", leer("version").strip())
news = leer("NEWS") if "NEWS" in tf.getnames() else ""
for bloque in re.split(r"\n(?=Release \d{4}[a-z] )", news)[:6]:
    if "2026" in bloque[:40]:
        print(bloque[:2500]); print("-----")
na = leer("northamerica")
i, j = na.find("# Canada"), na.find("# Mexico")
canada = na[i:j] if i > 0 else na
claves = r"Alberta|Edmonton|Manitoba|Winnipeg|Ontario|Rainy|Kenora|Thunder|Atikokan|Kootenay|Cranbrook|Golden|Creston|Dawson Creek|Fort Nelson|Northwest Territories|Yellowknife|Inuvik|Nunavut|Iqaluit|Rankin|Cambridge|Resolute|Lloydminster|Saskatchewan|Regina|Swift|Whitehorse|Vancouver|2026"
lineas = canada.split("\n")
vistos = set()
for k, l in enumerate(lineas):
    if re.search(claves, l) and ("2026" in l or l.startswith("Zone") or l.startswith("Rule\tWinn") or l.startswith("Rule\tEdm") or l.startswith("Link")):
        for m in range(max(0, k - 3), min(len(lineas), k + 6)):
            if m not in vistos:
                vistos.add(m); print(lineas[m])
        print("..")
print("\n=== Zonas de Canadá (líneas Zone y continuaciones, últimas reglas) ===")
for bloque in re.findall(r"\nZone\tAmerica/\S+.*?(?=\n\n|\n#)", canada, re.S):
    print(bloque.strip().split("\n")[0]); print("   último:", bloque.strip().split("\n")[-1].strip())
backzone = leer("backward")
print("\n=== Enlaces (backward) de Canadá ===")
for l in backzone.split("\n"):
    if re.search(r"Canada/|Atikokan|Rainy|Thunder|Nipigon|Coral|Creston|Fort_Nelson|Dawson_Creek|Yellowknife|Pangnirtung", l): print(l)

print("\n=== Fuentes oficiales ===", flush=True)
for u in sys.argv[1:]:
    try:
        t = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", get(u, 40).decode("utf-8", "ignore"))))
        t = re.sub(r"\s+", " ", t)
        print("URL:", u, "| caracteres:", len(t))
        for m in re.finditer(r"[^.]{0,250}(time zone|daylight|standard time|clocks|Central Time|Mountain Time|hora)[^.]{0,300}\.", t, re.I):
            print("  >", m.group(0).strip()[:600])
    except Exception as e:
        print("ERROR", u, type(e).__name__, str(e)[:100])
