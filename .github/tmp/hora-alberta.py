"""Solo lectura: ¿qué dice la base de zonas horarias de IANA (la que usan los navegadores) sobre Alberta y BC?"""
import re, urllib.request
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=120).read().decode("utf-8", "ignore")
news = get("https://data.iana.org/time-zones/tzdb/NEWS")
print("=== NEWS (inicio) ===")
print(news[:6000])
print("=== NEWS: líneas sobre Alberta/BC/Kootenay ===")
for l in news[:60000].split("\n"):
    if re.search(r"Alberta|Edmonton|British Columbia|Vancouver|Kootenay|Creston|Cranbrook|Yukon", l):
        print("  >", l)
na = get("https://data.iana.org/time-zones/tzdb/northamerica")
i = na.find("# Alberta")
print("=== northamerica: Alberta ===")
print(na[i:i+7000])
j = na.find("# British Columbia")
print("=== northamerica: British Columbia ===")
print(na[j:j+9000])
