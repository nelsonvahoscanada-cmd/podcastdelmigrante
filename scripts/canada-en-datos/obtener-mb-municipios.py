"""
obtener-mb-municipios.py — Lista oficial de municipios de Manitoba (solo lectura)
===============================================================================
Lee el Municipal Officials Directory de Manitoba Municipal and Northern
Relations (PDF) y la lista de comunidades de Northern Affairs, y los imprime
para contrastar el directorio con el Censo 2021 (nombres, tipos y conteo).
Se ejecuta en GitHub Actions; no guarda nada en el repositorio.
"""
import io, re, urllib.request
from pypdf import PdfReader

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}


def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120) as r:
        return r.read()


print("\n=== Municipal Officials Directory (mod.pdf) ===", flush=True)
pdf = PdfReader(io.BytesIO(get("https://www.gov.mb.ca/mr/contactus/pubs/mod.pdf")))
print("páginas:", len(pdf.pages))
texto = "\n".join((p.extract_text() or "") for p in pdf.pages)
print("caracteres:", len(texto))
print("--- primeras líneas ---")
print("\n".join(texto.split("\n")[:60]))
cabeceras = []
for l in texto.split("\n"):
    l = l.strip()
    if re.match(r"^(City|Town|Village|Municipality|Rural Municipality|R\.M\.|Local Government District|LGD|Municipal District)\b.*\bof\b", l) or re.match(r"^(The )?(City|Town|Village|Rural Municipality|Municipality|Local Government District) of ", l):
        cabeceras.append(l)
print("--- cabeceras de municipios encontradas:", len(cabeceras))
for c in cabeceras:
    print("  M|", c[:120])
print("--- líneas con población ---")
for l in texto.split("\n"):
    if re.search(r"Population|Pop\.", l):
        print("  P|", l.strip()[:160])
fecha = re.findall(r"(?:Updated|Revised|as of|Current to)[^\n]{0,60}", texto, re.I)
print("fechas:", fecha[:10])

print("\n=== Northern Affairs: perfiles de comunidades ===", flush=True)
h = get("https://www.gov.mb.ca/mr/northern/community_profiles.html").decode("utf-8", "ignore")
t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " | ", re.sub(r"(?is)<(script|style).*?</\1>", "", h)))
print(t[:12000])
