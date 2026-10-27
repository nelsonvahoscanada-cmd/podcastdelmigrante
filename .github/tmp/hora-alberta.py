"""Solo lectura: texto oficial de la hora permanente de Alberta y lo que se sabe del sureste de BC."""
import html as H, io, re, urllib.parse, urllib.request
from pypdf import PdfReader
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0", "Accept-Language": "en-CA"}), timeout=120).read()
def texto(h):
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div)>", "\n", h)
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", H.unescape(re.sub(r"<[^>]+>", " ", h)))).strip()
for u in ["https://kings-printer.alberta.ca/Documents/Orders/Orders_in_Council/2026/2026_204.pdf", "https://kings-printer.alberta.ca/Documents/Orders/Orders_in_Council/2026/2026_206.pdf"]:
    print("=== OIC", u)
    try:
        r = PdfReader(io.BytesIO(get(u)))
        print("PDF|" + "\n".join(p.extract_text() or "" for p in r.pages)[:3500].replace("\n", "\nPDF|"))
    except Exception as e:
        print("PDF| ERROR", type(e).__name__, e)
for base, qs in [("https://www.alberta.ca/news?search=", ["daylight saving time", "time change"]), ("https://news.gov.bc.ca/search?q=", ["mountain time", "Kootenay time", "time zone Alberta"])]:
    for q in qs:
        u = base + urllib.parse.quote(q)
        try:
            h = get(u).decode("utf-8", "ignore")
            print("BUSQ|", u)
            for m in re.finditer(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h, re.I | re.S):
                t = re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", m.group(2)))).strip()
                if re.search(r"time|clock|daylight", t, re.I) and len(t) > 15:
                    print("BUSQ|   ", t[:140], "→", urllib.parse.urljoin(u, m.group(1)))
        except Exception as e:
            print("BUSQ| ERROR", u, type(e).__name__, e)
