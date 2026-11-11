"""
obtener-yt-ficha2.py — Fuentes oficiales de Yukón: tablas, normales y páginas (solo lectura)
=====================================================================================================
Se ejecuta en GitHub Actions. Guarda el texto de cada página (con sus enlaces entre corchetes) en
/tmp/out/<clave>.txt para revisarlo y citarlo. Si una página necesita JavaScript, se abre con un
navegador normal; si no responde, se usa la copia más reciente del Internet Archive (se indica).
No se sortea ninguna protección contra robots.
"""
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
        time.sleep(4)


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


def archivo(u, desde="2025"):
    q = {"url": u, "output": "json", "fl": "timestamp,statuscode,original", "filter": "statuscode:200", "from": desde, "limit": "-3"}
    b, st, _ = get("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), 120)
    try:
        d = json.loads(b or b"[]")[1:]
    except Exception:
        return None, f"CDX {st}"
    if not d:
        return None, "sin copia 200"
    ts, _, o = d[-1]
    b, st, _ = get(f"http://web.archive.org/web/{ts}id_/{o}", 120)
    return b, f"copia del Internet Archive del {ts} ({st})"


def pdf_texto(b):
    import pypdf
    return "\n".join(p.extract_text() or "" for p in pypdf.PdfReader(io.BytesIO(b)).pages)


OMITIR = set(os.environ.get("OMITIR_TABLAS", "").split())


def tabla(pid):
    if pid in OMITIR:
        raise RuntimeError(f"tabla {pid} omitida en esta ronda")
    b, st, _ = get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)
    zf = zipfile.ZipFile(io.BytesIO(b))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig"))


PARTES = os.environ.get("PARTES", "statcan clima paginas navegador pdf").split()

# ------------------------------------------------------------ 1. Statistics Canada
if "statcan" in PARTES:
    out = []
    try:
        f = [r for r in tabla("14100292") if r["GEO"] == "Yukon" and r["REF_DATE"] >= "2025-09" and r["Gender"] == "Total - Gender" and r["Age group"] == "15 years and over" and r["Labour force characteristics"] in ("Unemployment rate", "Employment rate", "Participation rate", "Population", "Employment")]
        out.append("== 14-10-0292 (Yukón, 15+): REF_DATE | característica | Statistics | Data type | UOM | VALUE")
        out += [" | ".join([r["REF_DATE"], r["Labour force characteristics"], r["Statistics"], r["Data type"], r["UOM"], r["SCALAR_FACTOR"], r["VALUE"]]) for r in f]
        out.append("== 14-10-0292 promedio anual 2025 (calculado aparte si no existe)")
    except Exception as e:
        out.append(f"ERROR 14100292 {e}")
    try:
        out.append("== 34-10-0133-01 CMHC alquiler promedio, Whitehorse")
        f = [r for r in tabla("34100133") if "Whitehorse" in r["GEO"] and r["REF_DATE"] >= "2021"]
        out.append("columnas: " + str(list(f[0].keys())[:12]) if f else "sin filas")
        out += [" | ".join([r["REF_DATE"], r["GEO"], r.get("Type of structure", ""), r.get("Type of unit", ""), r["VALUE"], r.get("STATUS", "")]) for r in f]
    except Exception as e:
        out.append(f"ERROR 34100133 {e}")
    try:
        out.append("== 34-10-0127-01 CMHC desocupación (Whitehorse o Yukón)")
        f = [r for r in tabla("34100127") if ("Whitehorse" in r["GEO"] or "Yukon" in r["GEO"]) and r["REF_DATE"] >= "2021"]
        out += [" | ".join([r["REF_DATE"], r["GEO"], r.get("Vacancy rates", r.get("Type of unit", "")), r["VALUE"]]) for r in f] or ["sin filas"]
    except Exception as e:
        out.append(f"ERROR 34100127 {e}")
    try:
        out.append("== 98-10-0216-01 Censo 2021: conocimiento de idiomas (Yukón)")
        for r in tabla("98100216"):
            if r["GEO"] == "Yukon" and r.get("Age (15A)", r.get("Age (15C)", "Total - Age")).startswith("Total"):
                k = [c for c in r if c.startswith("Knowledge of languages")][0]
                v = [c for c in r if "Total - Gender" in c or c.endswith("[1]")]
                out.append(r[k] + " | " + json.dumps({c: r[c] for c in r if c.startswith("Gender") or c.startswith("Statistics")}, ensure_ascii=False)[:300])
    except Exception as e:
        out.append(f"ERROR 98100216 {e}")
    try:
        out.append("== 98-10-0264-01 Censo 2021: identidad indígena (Yukón, todas las columnas de la fila total)")
        for r in tabla("98100264"):
            if r["GEO"] == "Yukon":
                out.append(json.dumps(r, ensure_ascii=False))
                break
    except Exception as e:
        out.append(f"ERROR 98100264 {e}")
    try:
        out.append("== 36-10-0402-01 PIB por industria, Yukón, último año, dólares encadenados de 2017")
        todas = [r for r in tabla("36100402") if r["GEO"] == "Yukon"]
        out.append("Prices: " + str(sorted({r["Prices"] for r in todas})))
        ult = max(r["REF_DATE"] for r in todas)
        for r in todas:
            ind = r["North American Industry Classification System (NAICS)"]
            if r["REF_DATE"] == ult and r["Prices"].startswith("Chained") and (re.search(r"\[(1[01]|2[123]|31-33|41|4A|44-45|48-49|5[1-6]|6[12]|7[12]|81|91|212|21)\]$", ind) or ind.startswith("All industries")):
                out.append(" | ".join([r["REF_DATE"], ind, r["VALUE"], r["SCALAR_FACTOR"]]))
    except Exception as e:
        out.append(f"ERROR 36100402 {e}")
    try:
        out.append("== 18-10-0004-01 IPC: Whitehorse y Canadá, septiembre 2025 y 2026; Food/Shelter")
        for r in tabla("18100004"):
            if r["GEO"] in ("Whitehorse, Yukon", "Canada", "Vancouver, British Columbia") and r["REF_DATE"] in ("2025-09", "2026-09") and r["Products and product groups"] in ("All-items", "Food", "Shelter", "Energy", "Gasoline"):
                out.append(" | ".join([r["REF_DATE"], r["GEO"], r["Products and product groups"], r["VALUE"]]))
    except Exception as e:
        out.append(f"ERROR 18100004 {e}")
    try:
        out.append("== 17-10-0009 Canadá y territorios, 2026-07-01")
        for r in tabla("17100009"):
            if r["REF_DATE"] == "2026-07-01" and r["GEO"] in ("Canada", "Yukon", "Northwest Territories", "Nunavut"):
                out.append(r["GEO"] + " | " + r["VALUE"])
    except Exception as e:
        out.append(f"ERROR 17100009 {e}")
    b, st, _ = get("https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata", data=json.dumps([{"productId": p} for p in [17100009, 17100005, 17100008, 14100292, 14100223, 36100222, 36100402, 18100004, 34100133]]).encode(), hdr={"Content-Type": "application/json"})
    try:
        out += [f"{o['object']['productId']} | {o['object']['cubeTitleEn']} | fin {o['object']['cubeEndDate']} | publicado {o['object']['releaseTime']}" for o in json.loads(b)]
    except Exception as e:
        out.append(f"ERROR meta {st}")
    guardar("statcan2", "\n".join(out))

# ------------------------------------------------------------ 2. Normales climáticas 1991-2020 (ECCC)
if "clima" in PARTES:
    b, st, _ = get("https://climate.weather.gc.ca/climate_normals/station_select_1991_2020_e.html?searchType=stnProv&lstProvince=YT", 120)
    h = b.decode("utf-8", "ignore")
    enl = sorted(set(re.findall(r'href="([^"]*results_1991_2020_e\.html[^"]*)"', h)))
    salida = [f"# estado {st} | estaciones: {len(enl)}"] + enl
    for e in enl:
        u = urllib.parse.urljoin("https://climate.weather.gc.ca/climate_normals/", html.unescape(e))
        if not re.search(r"climate_id", u, re.I) and len(enl) > 40:
            continue
        b2, st2, _ = get(u, 120)
        salida += [f"\n=== {u} ({st2})", texto(b2)[:20000]]
        time.sleep(1)
    guardar("normales-1991-2020", "\n".join(salida))

# ------------------------------------------------------------ 3. Páginas oficiales (lectura directa, con respaldo del Internet Archive)
PAGINAS = [l.split("\t")[:2] for l in open(__file__.replace("obtener-yt-ficha2.py", "yt-paginas2.txt"), encoding="utf-8").read().splitlines() if l.strip() and not l.startswith("#")]
if "paginas" in PARTES:
    pendientes = []
    for clave, u in PAGINAS:
        b, st, final = get(u, 60)
        t = texto(b) if isinstance(st, int) and st < 400 and b else ""
        if len(t) < 500 or re.search(r"Just a moment|Access denied|captcha|enable JavaScript", t[:1500], re.I):
            pendientes.append((clave, u, st))
            guardar(clave, f"# {u} → {final}\n# estado {st} (sin contenido legible por lectura directa)\n{t}")
            continue
        guardar(clave, f"# {u} → {final}\n# estado {st}\n{t}")
        time.sleep(1)
    json.dump(pendientes, open(f"{OUT}/pendientes.json", "w"))

# ------------------------------------------------------------ 4. Navegador (páginas con JavaScript) y copia archivada
if "navegador" in PARTES:
    pendientes = json.load(open(f"{OUT}/pendientes.json")) if os.path.exists(f"{OUT}/pendientes.json") else []
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        br = p.chromium.launch()
        ctx = br.new_context(locale="en-CA", ignore_https_errors=False)
        for clave, u, st in pendientes:
            pg = ctx.new_page()
            t, nota = "", ""
            try:
                r = pg.goto(u, wait_until="domcontentloaded", timeout=60000)
                pg.wait_for_timeout(5000)
                t = pg.inner_text("body")
                enl = pg.eval_on_selector_all("a[href]", "as => as.map(a => a.innerText.trim().slice(0,80) + ' [' + a.href + ']')")
                nota = f"navegador {r.status if r else None} {pg.url}"
                t += "\n\n# ENLACES\n" + "\n".join(enl[:400])
            except Exception as e:
                nota = f"navegador ERROR {type(e).__name__} {str(e)[:120]}"
            pg.close()
            if len(t) < 600:
                b, nota2 = archivo(u)
                if b:
                    t, nota = texto(b), nota + " | " + nota2
            guardar(clave, f"# {u}\n# {nota}\n{t}")
        br.close()

# ------------------------------------------------------------ 4b. Documentos enlazados (tercera columna de la lista: expresión regular)
if "seguir" in PARTES:
    for l in open(__file__.replace("obtener-yt-ficha2.py", "yt-paginas2.txt"), encoding="utf-8").read().splitlines():
        c = l.split("\t")
        if l.startswith("#") or len(c) < 3:
            continue
        clave, patron = c[0], c[2]
        try:
            t = open(f"{OUT}/{clave}.txt", encoding="utf-8").read()
        except OSError:
            continue
        vistos = []
        for m in re.findall(r"\[((?:https?://[^\]\s]+)|(?:/[^\]\s]*))\]", t):
            u = urllib.parse.urljoin("https://yukon.ca/", m)
            if re.search(patron, u) and u not in vistos:
                vistos.append(u)
        for i, u in enumerate(vistos[:2], 1):
            b, st, _ = get(u, 120); nota = f"directo {st}"
            if not (st == 200 and b and (b[:4] == b"%PDF" or len(texto(b)) > 800)):
                b, nota = archivo(u, "2024")
            try:
                cont = pdf_texto(b) if b and b[:4] == b"%PDF" else texto(b or b"")
            except Exception as e:
                cont = f"ERROR {e}"
            guardar(f"{clave}-{i}", f"# {u}\n# {nota}\n{cont}")
            time.sleep(1)

# ------------------------------------------------------------ 4c. Documentos buscados en el índice del Internet Archive (yt-cdx.txt)
if "cdx" in PARTES:
    for l in open(__file__.replace("obtener-yt-ficha2.py", "yt-cdx.txt"), encoding="utf-8").read().splitlines():
        if not l.strip() or l.startswith("#"):
            continue
        clave, prefijo, patron = l.split("\t")[:3]
        q = {"url": prefijo, "matchType": "prefix", "output": "json", "fl": "timestamp,original,statuscode", "filter": "statuscode:200", "limit": "5000"}
        b, st, _ = get("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), 300)
        try:
            filas = [f for f in json.loads(b or b"[]")[1:] if re.search(patron, f[1], re.I)]
        except Exception as e:
            guardar(clave, f"# CDX {prefijo} ({st})\nERROR {e}"); continue
        lista = "\n".join(f"{ts} {o}" for ts, o, _ in filas[-40:])
        if not filas:
            guardar(clave, f"# CDX {prefijo} ({st})\nsin coincidencias para {patron}"); continue
        ts, o, _ = sorted(filas)[-1]
        b, st2, _ = get(f"http://web.archive.org/web/{ts}id_/{o}", 180)
        try:
            cont = pdf_texto(b) if b[:4] == b"%PDF" else texto(b)
        except Exception as e:
            cont = f"ERROR {e}"
        guardar(clave, f"# {o}\n# copia del Internet Archive del {ts} ({st2})\n# CANDIDATOS\n{lista}\n# TEXTO\n{cont}")

# ------------------------------------------------------------ 5. Documentos PDF oficiales
if "pdf" in PARTES:
    for clave, u in [l.split("\t")[:2] for l in open(__file__.replace("obtener-yt-ficha2.py", "yt-pdf.txt"), encoding="utf-8").read().splitlines() if l.strip() and not l.startswith("#")]:
        b, st, _ = get(u, 120); nota = f"directo {st}"
        if not (st == 200 and b[:4] == b"%PDF"):
            b, nota = archivo(u, "2024")
        try:
            guardar(clave, f"# {u}\n# {nota}\n" + pdf_texto(b))
        except Exception as e:
            guardar(clave, f"# {u}\n# {nota}\nERROR {e}")
