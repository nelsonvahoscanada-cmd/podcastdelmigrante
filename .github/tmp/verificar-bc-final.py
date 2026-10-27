"""Verificación final, ronda 3 (solo lectura): lista oficial de 161 municipios frente a la nuestra, y la vista previa."""
import io, json, re, sys, time, urllib.request, unicodedata

UA = {"User-Agent": "Mozilla/5.0 (verificacion; podcastdelmigrante.com)"}


def get(url, t=120):
    for i in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, b""
        except Exception as e:
            err = e
            time.sleep(20)
    raise err


norm = lambda s: re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())
J = json.load(open("scripts/canada-en-datos/bc-localidades.json"))
MUNI = {"CY", "DM", "T", "VL", "IM", "RGM"}
ACTUAL = {"Queen Charlotte": "Daajing Giids", "Sun Peaks Mountain": "Sun Peaks", "One Hundred Mile House": "100 Mile House"}
nuestros = [ACTUAL.get(c[1], c[1]) for c in J["csd"] if c[2] in MUNI]
print("nuestros municipios:", len(nuestros))

print("\n=== Lista oficial (PDF) frente a nuestros 160 ===")
from pypdf import PdfReader
try:
    _, b = get("https://www2.gov.bc.ca/assets/gov/british-columbians-our-governments/local-governments/finance/local-government-statistics/local_government_legal_name_and_incorporation_dates.pdf")
    t = "\n".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(b)).pages)
    t = t.split("CORPORATE NAME - REGIONAL DISTRICTS")[0]
    fila = re.compile(r"^(.+?)\s+(January|February|March|April|May|June|July|August|September|October|November|December) \d{2}, \d{4}\s*$")
    oficiales = [m.group(1).strip() for l in t.split("\n") if (m := fila.match(l.strip()))]
    print("filas en el PDF:", len(oficiales))
    base = lambda s: norm(re.sub(r"\s*(Mountain Resort Municipality|Regional Municipality|Island Municipality|Municipality|, Resort Municipality of|Nation Government District)$", "", s.split(",")[0]))
    pendientes = [norm(n) for n in nuestros]
    sobran = []
    for o in oficiales:
        k = base(o)
        if k in pendientes:
            pendientes.remove(k)
        else:
            sobran.append(o)
    print("en la lista oficial y no entre nuestros 160:", sobran)
    print("entre nuestros 160 y no en la lista oficial:", pendientes)
except Exception as e:
    print("ERROR PDF", type(e).__name__, e)

print("\n=== Vista previa ===")
P = sys.argv[1]
for i in range(40):
    st, b = get(P + "/canada-en-datos/british-columbia")
    if b"shishalh" in b.lower() or "shíshálh".encode() in b:
        break
    time.sleep(30)
print("vista previa con el último cambio:", "shíshálh".encode() in b)
st, js = get(P + "/js/british-columbia-localidades.js")
ctx = json.loads(js.decode().split("window.CD_LOCALIDADES = ", 1)[1].rstrip().rstrip(";"))
L = ctx["localidades"]
paginas = sorted({f[7] for f in L if f[7]})
print("páginas en los datos:", len(paginas))
malos, html = [], {}
for s in paginas:
    st, b = get(f"{P}/canada-en-datos/british-columbia/{s}")
    h = b.decode("utf-8", "ignore")
    html[s] = h
    if st != 200 or f'<link rel="canonical" href="https://podcastdelmigrante.com/canada-en-datos/british-columbia/{s}">' not in h:
        malos.append((s, st))
print("páginas con error o canonical incorrecto:", malos[:20], "de", len(paginas))
sin_ancla = [f"{L[f[5]][7]}#{f[11]}" for f in L if f[5] != -1 and f'id="{f[11]}"' not in html.get(L[f[5]][7], "")]
print("lugares sin ancla en la página de su subdivisión:", len(sin_ancla), sin_ancla[:10], "de", sum(1 for f in L if f[5] != -1))
for r in ["/canada-en-datos/", "/canada-en-datos/british-columbia", "/sitemap.xml", "/assets/canada-en-datos/social-british-columbia.jpg", "/canada-en-datos/alberta", "/canada-en-datos/ontario", "/"]:
    print("RUTA|", get(P + r)[0], r)
