"""
obtener-ontario-er.py — Regiones económicas de Ontario y sus divisiones censales
=================================================================================
Solo lectura; GitHub Actions. Recorre la «Variant of Standard Geographical
Classification (SGC) 2021 for Economic Regions» de Statistics Canada
(www23.statcan.gc.ca, TVD=1368923) por niveles y guarda, para cada página,
los enlaces hijos (código y título). Escribe ontario-er.json.
"""
import base64, gzip, html as H, json, re, urllib.parse, urllib.request
from collections import deque

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
RAIZ = "https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=1368923"


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read().decode("utf-8", "ignore")


paginas, vistos, cola = {}, set(), deque([RAIZ])
while cola and len(vistos) < 80:
    url = cola.popleft()
    if url in vistos:
        continue
    vistos.add(url)
    try:
        h = get(url)
    except Exception as e:
        print("ERROR", url, e)
        continue
    hijos = []
    for m in re.finditer(r'<a[^>]+href="([^"]*TVD=1368923[^"]*)"[^>]*>([\s\S]*?)</a>', h):
        href = urllib.parse.urljoin(url, H.unescape(m.group(1)))
        t = re.sub(r"<[^>]+>|\s+", " ", H.unescape(m.group(2))).strip()
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(href).query))
        if "CPV" in q:
            hijos.append({"href": href, "texto": t, "cpv": q.get("CPV"), "clv": q.get("CLV")})
    # Texto de la página con códigos de Ontario (por si la estructura se muestra como tabla)
    texto = [re.sub(r"\s+", " ", x).strip() for x in re.sub(r"<[^>]+>", "\n", h).split("\n")]
    codigos = [x for x in texto if re.match(r"^35\d{2}\b", x)]
    paginas[url] = {"hijos": hijos, "codigos": codigos}
    print("PÁGINA", url, "hijos:", [(x["cpv"], x["clv"], x["texto"][:40]) for x in hijos][:40])
    for c in codigos[:60]:
        print("    código:", c)
    for x in hijos:
        cpv = x["cpv"] or ""
        if cpv == "3" or cpv.startswith("35"):
            cola.append(x["href"])

t = json.dumps({"raiz": RAIZ, "paginas": paginas}, ensure_ascii=False, separators=(",", ":"))
open("scripts/canada-en-datos/ontario-er.json", "w", encoding="utf-8").write(t)
b64 = base64.b64encode(gzip.compress(t.encode("utf-8"), 9)).decode()
print("bytes:", len(t))
print("DATOS-INICIO")
for i in range(0, len(b64), 3000):
    print("D|" + b64[i : i + 3000])
print("DATOS-FIN")
