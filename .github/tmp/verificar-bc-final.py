"""Verificación final, ronda 2 (solo lectura): por qué la página oficial dice 161 municipios."""
import html, io, json, re, time, urllib.request

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
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


NUESTROS = [n for n, _ in json.load(open("scripts/canada-en-datos/bc-localidades.json"))["municipios"]]

print("=== Comunicados ===")
for u in ["https://news.gov.bc.ca/releases/2012CSCD0101-001819", "https://news.gov.bc.ca/releases/2021MUNI0062-002036", "https://news.gov.bc.ca/releases/2025HMA0066-000781", "https://news.gov.bc.ca/releases/2026HMA0069-000747"]:
    print("\nURL:", u)
    try:
        t = texto(get(u).decode("utf-8", "ignore"))
        for l in t.split("\n"):
            if len(l) > 40 and re.search(r"Jumbo|Okanagan Falls|municipalit|incorporat|letters patent|dissol|election|inaugural|2026|2027", l, re.I):
                print("  >", l.strip()[:700])
    except Exception as e:
        print("  ERROR", type(e).__name__, e)

print("\n=== PDF: Local Government Legal Names & Incorporation Dates ===")
from pypdf import PdfReader
u = "https://www2.gov.bc.ca/assets/gov/british-columbians-our-governments/local-governments/finance/local-government-statistics/local_government_legal_name_and_incorporation_dates.pdf"
try:
    r = PdfReader(io.BytesIO(get(u)))
    t = "\n".join(p.extract_text() or "" for p in r.pages)
    print("páginas:", len(r.pages), "| metadatos:", {k: str(v) for k, v in (r.metadata or {}).items()})
    lineas = [l.strip() for l in t.split("\n") if l.strip()]
    print("primeras líneas:", lineas[:15])
    for l in lineas:
        if re.search(r"Jumbo|Okanagan Falls|Sun Peaks|Mountain Resort|Total|as of|updated|161|160", l, re.I):
            print("  >", l[:200])
    prefijos = r"^(City|District|Town|Village|Township|Corporation|Island Municipality|Resort Municipality|Mountain Resort Municipality|Northern Rockies|Regional Municipality|The Corporation)"
    muni = [l for l in lineas if re.match(prefijos, l)]
    print("líneas que empiezan como municipio:", len(muni))
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    nuestros = {norm(n) for n in NUESTROS}
    faltan = [l for l in muni if not any(n in norm(l) for n in nuestros)]
    print("en el PDF y no en nuestra lista (160):", faltan[:20])
    print("TEXTO|" + t.replace("\n", " ⏎ ")[:12000])
except Exception as e:
    print("ERROR", type(e).__name__, e)
