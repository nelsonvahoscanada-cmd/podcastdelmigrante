"""Solo lectura: notas de IANA y fuentes oficiales sobre la hora de Alberta, Manitoba, Territorios del Noroeste y el sureste de BC."""
import html as H, re, urllib.request
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0", "Accept-Language": "en-CA"}), timeout=120).read().decode("utf-8", "ignore")
def texto(h):
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div)>", "\n", h)
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", H.unescape(re.sub(r"<[^>]+>", " ", h)))).strip()
news = get("https://data.iana.org/time-zones/tzdb/NEWS")
fin = news.find("\nRelease 2026b")
print("NEWSHEAD|" + news[:min(fin if fin > 0 else 9000, 12000)].replace("\n", "\nNEWSHEAD|"))
na = get("https://data.iana.org/time-zones/tzdb/northamerica")
for zona in ["Zone America/Edmonton", "Zone America/Vancouver", "Zone America/Creston", "Zone America/Dawson_Creek"]:
    i = na.find(zona)
    ini = max(na.rfind("\n\n\n", 0, i - 50), i - 9000)
    print(f"=== {zona} (comentarios anteriores) ===")
    print("NA|" + na[ini:i + 600].replace("\n", "\nNA|"))
urls = sorted(set(re.findall(r"https?://[^\s>)\]]*(?:alberta\.ca|gov\.mb\.ca|gov\.nt\.ca|gov\.bc\.ca|cranbrook|rdek)[^\s>)\]]*", na + news)))
print("URLS|", urls)
for u in urls:
    if not re.search(r"alberta\.ca|gov\.nt\.ca|cranbrook|rdek|news\.gov\.mb\.ca", u):
        continue
    try:
        t = texto(get(u))
        print(f"=== OFICIAL {u} ===")
        for l in t.split("\n"):
            if len(l) > 40 and re.search(r"time|clock|daylight|hour|UTC|Mountain|Central", l, re.I):
                print("OF|", l.strip()[:500])
    except Exception as e:
        print("OF| ERROR", u, type(e).__name__, e)
