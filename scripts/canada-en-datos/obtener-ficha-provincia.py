"""
obtener-ficha-provincia.py — Verificación de las cifras y fuentes de la ficha de una provincia (solo lectura)
===========================================================================================================
Versión general de obtener-sk-ficha.py. Uso:
  python3 scripts/canada-en-datos/obtener-ficha-provincia.py <Provincia> <parte> [archivo de páginas]
<Provincia> es el nombre de Statistics Canada (p. ej., Manitoba). El archivo
de páginas es un .py con la lista PAGINAS = [(nombre, url, patrón), …].
Se ejecuta en GitHub Actions, en partes:
  statcan    tablas de Statistics Canada: población estimada, PIB, Encuesta de
             Población Activa (mensual y anual), salarios, idiomas, inmigración,
             minorías visibles y población urbana/rural del Censo 2021.
  paginas    páginas oficiales de la lista (gobierno provincial, programa de
             nominación, salud, licencias, ciudades, universidades…): estado, título, fecha y
             frases clave. Si una página necesita JavaScript, se abre con un
             navegador normal (sin sortear ninguna protección).
  salario    tabla federal de salarios mínimos (copia archivada; el sitio no
             permite la lectura automática).
"""
import csv, gzip, html, io, json, re, sys, time, urllib.parse, urllib.request, zipfile

PROV = sys.argv[1]
PARTE = sys.argv[2] if len(sys.argv) > 2 else "todo"
PAGINAS = []
if len(sys.argv) > 3:
    exec(open(sys.argv[3], encoding="utf-8").read())
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=120):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        b = r.read()
        return (gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b), r.status, r.geturl()


def texto(h):
    h = h.decode("utf-8", "ignore") if isinstance(h, bytes) else h
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def mostrar(t, patron, ventana=3, maximo=25):
    lineas, vistos, n = t.split("\n"), set(), 0
    for i, l in enumerate(lineas):
        if re.search(patron, l, re.I) and i not in vistos:
            vistos.update(range(i, i + ventana))
            print("  >", " | ".join(x.strip() for x in lineas[max(0, i - 1): i + ventana] if x.strip())[:900])
            n += 1
            if n >= maximo:
                break


# ------------------------------------------------------------ 1. Statistics Canada
def tabla(pid):
    zf = zipfile.ZipFile(io.BytesIO(get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)[0]))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig"))


if PARTE in ("statcan", "todo"):
    paso("17-10-0009-01 Población estimada (últimos 8 trimestres)")
    filas = [r for r in tabla("17100009") if r["GEO"] == PROV]
    for r in filas[-8:]:
        print(" ", r["REF_DATE"], r["VALUE"])

    paso("36-10-0222-01 PIB a precios de mercado, dólares corrientes")
    for r in tabla("36100222"):
        if r["GEO"] == PROV and r["Prices"] == "Current prices" and r["Estimates"] == "Gross domestic product at market prices" and r["REF_DATE"] >= "2021":
            print(" ", r["REF_DATE"], r["VALUE"], r["SCALAR_FACTOR"])

    paso("14-10-0287-01 EPA mensual, desestacionalizada (últimos 4 meses)")
    sel = {}
    for r in tabla("14100287"):
        if r["GEO"] == PROV and r["Sex"] == "Both sexes" and r["Age group"] == "15 years and over" and r["Statistics"] == "Estimate" and r["Data type"] == "Seasonally adjusted" and r["Labour force characteristics"] in ("Unemployment rate", "Participation rate", "Employment rate", "Employment", "Population"):
            sel.setdefault(r["REF_DATE"], {})[r["Labour force characteristics"]] = r["VALUE"]
    for k in sorted(sel)[-4:]:
        print(" ", k, sel[k])

    paso("14-10-0327-01 EPA anual")
    sel = {}
    for r in tabla("14100327"):
        if r["GEO"] == PROV and r["Gender"] == "Total - Gender" and r["Age group"] == "15 years and over" and r["Labour force characteristics"] in ("Unemployment rate", "Participation rate", "Employment rate") and r["REF_DATE"] >= "2023":
            sel.setdefault(r["REF_DATE"], {})[r["Labour force characteristics"]] = r["VALUE"]
    print(" ", sel)

    paso("14-10-0064-01 Salarios por hora, todas las industrias")
    for r in tabla("14100064"):
        if r["GEO"] == PROV and r["REF_DATE"] >= "2024" and r["Type of work"] == "Both full- and part-time employees" and r["North American Industry Classification System (NAICS)"].startswith("Total employees, all industries") and r["Gender"] == "Total - Gender" and r["Age group"] == "15 years and over" and "hourly" in r["Wages"].lower():
            print(" ", r["REF_DATE"], r["Wages"], r["VALUE"])

    for pid, nombre in (("98100222", "conocimiento de idiomas oficiales"), ("98100218", "lengua materna")):
        paso(f"{pid[:2]}-{pid[2:4]}-{pid[4:]} Censo 2021: {nombre} (total de edades)")
        for r in tabla(pid):
            if r["GEO"] == PROV and r.get("Age (13B)") == "Total - Age":
                k = [c for c in r if c.startswith("Knowledge") or c.startswith("Mother tongue")][0]
                print(" ", r[k], "|", r.get("Statistics (6A):2021 Counts[1]"), "|", r.get("Statistics (6A):% distribution (2021)[2]"))

    paso("98-10-0307-01 Censo 2021: estatus de inmigrante (provincia)")
    for r in tabla("98100307"):
        if r["GEO"] == PROV and r["Age (8D)"] == "Total - Age" and r["Gender (3)"] == "Total - Gender":
            pob = r["Place of birth (290)"]
            if pob in ("Total – Place of birth", "Philippines", "India", "Nigeria", "China", "Pakistan", "Ukraine", "Mexico", "Colombia", "Americas", "Central America", "South America"):
                print(" ", pob, {k.split(":")[1].split("[")[0]: v for k, v in r.items() if k.startswith("Immigrant status") and k.split(":")[1].split("[")[0] in ("Total - Immigrant status and period of immigration", "Immigrants", "2016 to 2021", "Non-permanent residents")})
            if pob == "Total – Place of birth":
                pass

    paso("98-10-0352-01 Censo 2021: minorías visibles")
    for r in tabla("98100352"):
        if r["GEO"] == PROV and r["Age (15C)"] == "Total - Age" and r["Gender (3)"] == "Total - Gender" and r["Statistics (2)"] == "2021 Counts":
            print(" ", {k.split(":")[1].split("[")[0]: v for k, v in r.items() if k.startswith("Visible minority")})

    paso("98-10-0011-01 Censo 2021: centros de población y zonas rurales")
    try:
        cols = None
        for r in tabla("98100011"):
            if cols is None:
                cols = list(r.keys())
                print("columnas:", cols[:12])
            if r["GEO"].startswith(PROV) or r["GEO"].endswith(PROV) or "(Man.)" in r["GEO"]:
                print(" ", r["GEO"][:70], "|", " | ".join(f"{k[:40]}={v}" for k, v in r.items() if v and k not in ("REF_DATE", "GEO", "DGUID", "COORDINATE") and not k.startswith("Symbol"))[:400])
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:200])

# ------------------------------------------------------------ 2. Páginas oficiales (lista en el archivo de páginas)
if PARTE in ("paginas", "todo"):
    pendientes = []
    def enlaces_de(h, base, pat):
        """Enlaces cuyo texto o dirección coincide con pat (para descubrir listas oficiales)"""
        vistos = set()
        for href, tx in re.findall(r'(?is)<a\b[^>]*href="([^"#]+)"[^>]*>(.*?)</a>', h):
            tx = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", tx))).strip()
            u = urllib.parse.urljoin(base, html.unescape(href))
            if u.startswith("http") and re.search(pat, tx + " " + u, re.I) and u not in vistos:
                vistos.add(u)
                print("   enlace:", tx[:80], "→", u[:200])

    for entrada in PAGINAS:
        nombre, url, patron = entrada[:3]
        pat_enl = entrada[3] if len(entrada) > 3 else None
        paso(f"Página: {nombre}")
        print("URL:", url)
        try:
            b, st, final = get(url, 40)
            t = texto(b)
            if pat_enl:
                enlaces_de(b.decode("utf-8", "ignore"), final, pat_enl)
            if len(t) < 400 or re.search(r"Just a moment|Radware|Access denied|captcha", t[:800], re.I):
                print("estado:", st, "| sin contenido legible por lectura directa (", len(t), "caracteres )")
                pendientes.append((nombre, url, patron, pat_enl))
                continue
            tit = re.search(r"(?is)<title[^>]*>(.*?)</title>", b.decode("utf-8", "ignore"))
            m = re.search(r"(Last updated|Updated|Date modified|Published)[:\s]+([A-Za-z0-9 ,.-]{6,30})", t)
            print("estado:", st, "| final:", final[:120], "| título:", html.unescape(tit.group(1)).strip()[:100] if tit else "", "|", m.group(0)[:60] if m else "fecha no indicada", "| caracteres:", len(t))
            mostrar(t, patron)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:150])
            pendientes.append((nombre, url, patron, pat_enl))
        time.sleep(1)
    if pendientes:
        paso(f"Navegador para {len(pendientes)} páginas")
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(locale="en-CA")
            for nombre, url, patron, pat_enl in pendientes:
                paso(f"Navegador: {nombre}")
                pg = ctx.new_page()
                try:
                    r = pg.goto(url, wait_until="domcontentloaded", timeout=60000)
                    pg.wait_for_timeout(4000)
                    t = pg.inner_text("body")
                    print("estado:", r.status if r else None, "| final:", pg.url[:120], "| título:", pg.title()[:100], "| caracteres:", len(t))
                    if len(t) > 300 and not re.search(r"Just a moment|Radware|Access denied|captcha", t[:800], re.I):
                        mostrar(t, patron)
                        if pat_enl:
                            enlaces_de(pg.content(), pg.url, pat_enl)
                    else:
                        print("  (sin contenido legible: protección contra robots o página vacía)")
                except Exception as e:
                    print("ERROR", type(e).__name__, str(e)[:150])
                pg.close()
            b.close()

# ------------------------------------------------------------ 3. Salario mínimo (tabla federal, copia archivada)
if PARTE in ("salario", "todo"):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for u in ["https://minwage-salairemin.service.canada.ca/en/general.html", "https://web.archive.org/web/2026/https://minwage-salairemin.service.canada.ca/en/general.html"]:
            paso(f"Salario mínimo: {u}")
            try:
                r = pg.goto(u, wait_until="networkidle", timeout=120000)
                pg.wait_for_timeout(5000)
                t = pg.inner_text("body")
                print("URL:", pg.url[:140], "| estado:", r.status if r else None, "| caracteres:", len(t))
                mostrar(t, PROV + r"|Federal|Date modified", ventana=2)
            except Exception as e:
                print("ERROR", type(e).__name__, str(e)[:150])
        b.close()
