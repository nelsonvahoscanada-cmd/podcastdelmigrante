"""Correcciones de Nunavut (solo lectura): fuentes oficiales para escuelas, emergencias, transporte,
beneficios, licencias, clima, precios y cifras recientes. Guarda textos en /tmp/out/<clave>.txt"""
import csv, gzip, html, io, json, os, re, time, urllib.parse, urllib.request, zipfile
OUT = "/tmp/out"; os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}

def get(url, t=120, data=None, hdr=None):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **(hdr or {})}, data=data), timeout=t) as r:
                b = r.read(); return (gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b), r.status, r.geturl()
        except urllib.error.HTTPError as e:
            if i == 2: return b"", e.code, url
        except Exception as e:
            if i == 2: return str(e).encode(), "error", url
        time.sleep(5)

def texto(b):
    h = b.decode("utf-8", "ignore") if isinstance(b, bytes) else b
    h = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r'(?is)<a [^>]*href="([^"]+)"[^>]*>', r" [\1] ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()

def guardar(clave, contenido):
    open(f"{OUT}/{clave}.txt", "w", encoding="utf-8").write(contenido)
    print(clave, len(contenido), flush=True)

def archivo(u, desde="2024"):
    q = {"url": u, "output": "json", "fl": "timestamp,statuscode,original", "filter": "statuscode:200", "from": desde, "limit": "-3"}
    b, st, _ = get("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), 120)
    try:
        d = json.loads(b or b"[]")[1:]
    except Exception:
        return None, f"CDX {st} {b[:80]}"
    if not d: return None, "sin copia 200"
    ts, _, o = d[-1]
    b, st, _ = get(f"http://web.archive.org/web/{ts}id_/{o}", 120)
    return b, f"copia del {ts} ({st})"

def pdf_texto(b):
    import pypdf
    r = pypdf.PdfReader(io.BytesIO(b)); return "\n".join(p.extract_text() or "" for p in r.pages)

# 1. Escuelas: calendario escolar oficial 2025-26 y directorio de escuelas
for clave, u in [("cal-2025-26", "https://www.gov.nu.ca/sites/default/files/documents/2025-10/2025-26_Nunavut_Territorial_School_Calendar_EN.pdf")]:
    b, st, _ = get(u, 120); nota = f"directo {st}"
    if not (st == 200 and b[:4] == b"%PDF"):
        b, nota = archivo(u, "2025")
    try: guardar(clave, f"# {u}\n# {nota}\n" + pdf_texto(b))
    except Exception as e: guardar(clave, f"# {u}\n# {nota}\nERROR {e}")
for clave, u in [("gn-escuelas", "https://www.gov.nu.ca/en/education-and-schools/schools-and-colleges"),
                 ("gn-licencias", "https://www.gov.nu.ca/en/transportation/drivers-licences"),
                 ("gn-licencias2", "https://www.gov.nu.ca/en/transportation/drivers-licences-and-permits"),
                 ("gn-licencia-cambio", "https://www.gov.nu.ca/en/transportation/exchange-out-province-drivers-licence"),
                 ("gn-salud-mental", "https://www.gov.nu.ca/en/health/mental-health-and-addictions"),
                 ("gn-crisis", "https://www.gov.nu.ca/en/health/crisis-lines"),
                 ("gn-guarderias", "https://www.gov.nu.ca/en/education-and-schools/early-learning-and-child-care"),
                 ("gn-guarderias2", "https://www.gov.nu.ca/en/early-learning-and-child-care"),
                 ("gn-proteccion-ninos", "https://www.gov.nu.ca/en/family-services/child-protection"),
                 ("gn-inmigracion", "https://www.gov.nu.ca/en/immigration/immigrate-nunavut")]:
    b, st, _ = get(u, 60); nota = f"directo {st}"
    if st != 200 or b"Just a moment" in b[:3000]:
        b, nota = archivo(u, "2024")
    guardar(clave, f"# {u}\n# {nota}\n" + (texto(b) if b else ""))
# Prefijos de gov.nu.ca archivados sobre transporte, salud mental, guarderías
for clave, pref in [("cdx-transporte", "www.gov.nu.ca/en/transportation/"), ("cdx-salud", "www.gov.nu.ca/en/health/"), ("cdx-educacion", "www.gov.nu.ca/en/education-and-schools/"), ("cdx-familia", "www.gov.nu.ca/en/family-services/"), ("cdx-social", "www.gov.nu.ca/en/social-supports/")]:
    q = {"url": pref, "matchType": "prefix", "output": "json", "fl": "original,timestamp,statuscode", "collapse": "urlkey", "from": "2024", "limit": "3000"}
    b, st, _ = get("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), 300)
    guardar(clave, b.decode("utf-8", "ignore")[:200000])

# 2. RCMP y escuelas/college/CSFN, aerolíneas y organizaciones (lectura directa)
for clave, u in [("rcmp-911", "https://rcmp.ca/en/nunavut/news/2025/12/4348432"), ("rcmp-nu", "https://rcmp.ca/en/nunavut"),
                 ("rcmp-destacamentos", "https://rcmp.ca/en/nunavut/detachments"), ("csfn", "https://www.csfn.ca/"), ("trois-soleils", "https://www.trois-soleils.ca/"),
                 ("arctic-college", "https://www.arcticcollege.com/campuses"), ("arctic-college2", "https://www.arcticcollege.com/"),
                 ("calmair-destinos", "https://www.calmair.com/destinations"), ("calmair", "https://www.calmair.com/"),
                 ("carrefour", "https://carrefournunavut.ca/"), ("carrefour-imm", "https://carrefournunavut.ca/immigration/"), ("afn", "https://www.afnunavut.ca/"),
                 ("helpline", "https://www.nunavuthelpline.ca/"), ("helpline2", "https://nunavuthelpline.ca/"),
                 ("iqaluit", "https://www.iqaluit.ca/"), ("rankin", "https://www.rankininlet.ca/"), ("cambridge", "https://www.cambridgebay.ca/")]:
    b, st, final = get(u, 60)
    guardar(clave, f"# {u} → {final}\n# estado {st}\n" + (texto(b) if isinstance(st, int) and st < 400 else ""))

# 3. Normales climáticas 1991-2020 (ECCC)
b, st, _ = get("https://climate.weather.gc.ca/climate_normals/station_select_1991_2020_e.html?searchType=stnProv&lstProvince=NU", 120)
h = b.decode("utf-8", "ignore")
enl = sorted(set(re.findall(r'href="([^"]*results_1991_2020_e\.html[^"]*)"', h)))
salida = [f"# estaciones: {len(enl)}"] + enl
for e in enl:
    u = urllib.parse.urljoin("https://climate.weather.gc.ca/climate_normals/", html.unescape(e))
    b2, st2, _ = get(u, 120); t = texto(b2)
    salida += [f"\n=== {u} ({st2})", t[:30000]]
    time.sleep(2)
guardar("normales-1991-2020", "\n".join(salida))

# 4. StatCan: metadatos e IPC
b, st, _ = get("https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata", data=json.dumps([{"productId": p} for p in [17100009, 17100005, 14100292, 14100223, 36100222, 36100402, 18100004, 14100393]]).encode(), hdr={"Content-Type": "application/json"})
try: guardar("statcan-meta", "\n".join(f"{o['object']['productId']} | {o['object']['cubeTitleEn']} | fin {o['object']['cubeEndDate']} | publicado {o['object']['releaseTime']}" for o in json.loads(b)))
except Exception as e: guardar("statcan-meta", f"ERROR {st} {b[:200]}")

def tabla_zip(pid, filtro):
    b, st, _ = get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)
    filas = []
    z = zipfile.ZipFile(io.BytesIO(b))
    with z.open(f"{pid}.csv") as fh:
        for f in csv.DictReader(io.TextIOWrapper(fh, "utf-8-sig")):
            if filtro(f): filas.append(f)
    return filas
try:
    F = tabla_zip(18100004, lambda f: f["GEO"] in ("Iqaluit, Nunavut", "Canada", "Whitehorse, Yukon", "Yellowknife, Northwest Territories") and f["REF_DATE"] >= "2024-09")
    prods = sorted({f["Products and product groups"] for f in F if f["GEO"].startswith("Iqaluit")})
    lin = ["# productos de Iqaluit: " + " | ".join(prods)]
    for f in F:
        if f["Products and product groups"] in ("All-items", "Food", "Shelter", "Energy", "Transportation", "Food purchased from stores", "Gasoline", "Household operations, furnishings and equipment", "Clothing and footwear", "Health and personal care", "Rent"):
            lin.append(f"{f['REF_DATE']} | {f['GEO']} | {f['Products and product groups']} | {f['UOM']} | {f['VALUE']} | {f.get('STATUS','')}")
    guardar("ipc", "\n".join(lin))
except Exception as e:
    guardar("ipc", f"ERROR {e}")
try:
    F = tabla_zip(14100292, lambda f: f["GEO"] == "Nunavut" and f["REF_DATE"] >= "2025-09" and f.get("Gender") in ("Total - Gender", "Both sexes") and f.get("Age group") == "15 years and over" and f.get("Statistics") == "Estimate")
    guardar("epa", "\n".join(f"{f['REF_DATE']} | {f['Labour force characteristics']} | {f.get('Data type')} | {f['VALUE']}" for f in F))
except Exception as e:
    guardar("epa", f"ERROR {e}")
