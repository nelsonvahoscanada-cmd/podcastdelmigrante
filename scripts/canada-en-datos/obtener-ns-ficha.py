"""
obtener-ns-ficha.py — Verificación de la ficha provincial de Nueva Escocia (solo lectura)
=========================================================================================
Se ejecuta en GitHub Actions (el entorno de desarrollo no tiene acceso a estos
servidores), en partes:
  mapa       sitemaps de los sitios oficiales (Gobierno de Nueva Escocia,
             Nova Scotia Immigration, Nova Scotia Health y otros): guarda la
             lista completa y muestra las páginas que coinciden con los temas
             de la guía, para encontrar las páginas vigentes.
  paginas    páginas oficiales (lista fija y, si se indica, un archivo .txt con
             más direcciones): estado, título, fecha de actualización, texto y
             enlaces. Si una página necesita JavaScript, se abre con un
             navegador normal. No se sortea ninguna protección: si una página
             no responde, se anota el error.
  datos      catálogo de datos abiertos del Gobierno de Nueva Escocia
             (data.novascotia.ca, API de Socrata): conjuntos de escuelas,
             hospitales, límites municipales y comunidades, con sus columnas
             y fecha de actualización. Con «datos=<id>,<id>» descarga esos
             conjuntos completos en JSON.
  bandera    Wikimedia Commons: licencia y archivo SVG de la bandera de
             Nueva Escocia.
Uso: python3 obtener-ns-ficha.py <parte> [<parte> …] [urls.txt]
"""
import gzip, html, json, os, re, sys, time, urllib.parse, urllib.request

PARTES = [a for a in sys.argv[1:] if not a.endswith(".txt")]
EXTRA = [l.strip() for l in open(sys.argv[-1]).read().splitlines() if l.strip() and not l.startswith("#")] if sys.argv[-1].endswith(".txt") else []
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}
OUT = "/tmp/out"
os.makedirs(OUT, exist_ok=True)


def get(url, t=120, cab=None):
    with urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **(cab or {})}), timeout=t) as r:
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


def nombre_archivo(u):
    return re.sub(r"[^a-z0-9]+", "-", u.split("://", 1)[-1].lower()).strip("-")[:150]


# ------------------------------------------------------------ 1. Sitemaps oficiales
PALABRAS = r"immigra|nominee|nsnp|pnp|express|skilled|occupation|graduate|entrepreneur|physician|atlantic|labour-market|language|clb|francophon|newcomer|settle|welcome|minimum-wage|minimumwage|labour-standard|employment-right|employmentrights|msi|health-card|family-practice|familypractice|811|tenan|rent|housing|driver|licen|rmv|education|school|regional-centre|csap|child|benefit|tax|low-income|income-assistance|emergency|emo|population|statistic|economy|wage|municipal|village|county|district|transit|apprentice|credential|international-student"
SITEMAPS = [
    "https://novascotia.ca/robots.txt", "https://novascotia.ca/sitemap.xml", "https://beta.novascotia.ca/robots.txt", "https://beta.novascotia.ca/sitemap.xml",
    "https://novascotiaimmigration.com/robots.txt", "https://novascotiaimmigration.com/sitemap.xml", "https://novascotiaimmigration.com/sitemap_index.xml",
    "https://www.nshealth.ca/robots.txt", "https://www.nshealth.ca/sitemap.xml", "https://www.ednet.ns.ca/sitemap.xml", "https://www.halifax.ca/sitemap.xml", "https://www.cbrm.ns.ca/sitemap.xml",
]
if "mapa" in PARTES:
    paso("Sitemaps oficiales")
    vistos, todas = set(), []

    def recorre(u, prof=0):
        if u in vistos or prof > 3 or len(vistos) > 400:
            return
        vistos.add(u)
        try:
            b, st, fin = get(u, 90)
        except Exception as e:
            print("ERROR", u, type(e).__name__, str(e)[:150])
            return
        t = b.decode("utf-8", "ignore")
        if u.endswith("robots.txt"):
            print("robots", u, "→", [l for l in t.splitlines() if l.lower().startswith(("sitemap", "disallow"))][:30])
            for s in re.findall(r"(?im)^sitemap:\s*(\S+)", t):
                recorre(s, prof + 1)
            return
        locs = [html.unescape(x) for x in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", t)]
        hijos = [l for l in locs if re.search(r"\.xml(\.gz)?$|sitemap", l, re.I)]
        pags = [l for l in locs if l not in hijos]
        todas.extend(pags)
        sel = [p for p in pags if re.search(PALABRAS, p, re.I) and not re.search(r"/fr/|/fr$|lang=fr|/news/|/news-release|/media", p, re.I)]
        print(f"sitemap {u} estado {st}: {len(locs)} loc, {len(hijos)} hijos, {len(pags)} páginas, {len(sel)} seleccionadas")
        for p in sel[:600]:
            print("   ", p)
        for h in hijos[:120]:
            recorre(h, prof + 1)

    for s in SITEMAPS:
        recorre(s)
    open(f"{OUT}/sitemaps.txt", "w").write("\n".join(sorted(set(todas))))
    print("páginas en total:", len(set(todas)))

# ------------------------------------------------------------ 2. Páginas oficiales
PAGINAS = [
    # Gobierno de Canadá
    "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/province-nova-scotia.html",
    "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html",
    "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html",
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html",
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/eligibility.html",
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html",
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-community-immigration-pilot.html",
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/francophone-community-immigration-pilot.html",
    "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/nova-scotia/environmental-scan",
    # Gobierno de Nueva Escocia (direcciones conocidas; el sitemap da las vigentes)
    "https://novascotiaimmigration.com/",
    "https://novascotiaimmigration.com/move-here/",
    "https://novascotia.ca/",
    "https://novascotia.ca/lae/employmentrights/minimumwage.asp",
    "https://novascotia.ca/lae/employmentrights/",
    "https://novascotia.ca/dhw/msi/",
    "https://novascotia.ca/dhw/msi/health_cards.asp",
    "https://needafamilypractice.nshealth.ca/",
    "https://www.nshealth.ca/",
    "https://811.novascotia.ca/",
    "https://novascotia.ca/sns/rmv/licence/new-to-ns.asp",
    "https://novascotia.ca/sns/access/land/residential-tenancies.asp",
    "https://www.ednet.ns.ca/",
    "https://novascotia.ca/emo/",
    "https://novascotia.ca/dma/",
    "https://www.isans.ca/",
    "https://maritimebus.com/",
    "https://www.halifax.ca/transportation/halifax-transit",
    "https://www.cbrm.ns.ca/transit",
]
if "paginas" in PARTES:
    os.makedirs(f"{OUT}/paginas", exist_ok=True)
    nav = None
    try:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        nav = pw.chromium.launch().new_context(locale="en-CA")
    except Exception as e:
        print("sin navegador:", e)

    def guarda(u, h, extra):
        titulo = (re.search(r"<title>(.*?)</title>", h, re.S) or [None, "-"])[1].strip()
        mod = re.search(r'(?i)(?:dcterms\.modified|date[-_ ]?modified|last[-_ ]?modified|article:modified_time)"?\s*content="([^"]+)"', h) or re.search(r"(?i)(Date modified|Last updated|Updated|Last modified)\s*:?\s*(?:</?[^>]*>\s*)*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Z][a-z]+ \d{1,2}, \d{4}|\d{1,2} [A-Z][a-z]+ \d{4})", h)
        links = []
        for href, txt in re.findall(r'(?is)<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', h):
            t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", txt))).strip()
            if (href, t) not in links:
                links.append((urllib.parse.urljoin(u, href), t))
        main = re.search(r"(?is)<main[^>]*>(.*?)</main>", h)
        cuerpo = texto(main.group(1) if main else h)
        with open(f"{OUT}/paginas/{nombre_archivo(u)}.txt", "w") as f:
            f.write(f"URL: {u}\nTÍTULO: {titulo}\nMODIFICADA: {mod.group(mod.lastindex) if mod else '—'}\n{extra}\n\n{cuerpo}\n\n--- ENLACES ---\n" + "\n".join(f"{t} | {l}" for l, t in links))
        print("ok", u, "|", titulo[:90], "|", mod.group(mod.lastindex) if mod else "—", "|", len(cuerpo), "car.")

    for u in PAGINAS + EXTRA:
        h, extra = "", ""
        try:
            b, st, fin = get(u, 60)
            h = b.decode("utf-8", "ignore")
            extra = f"ESTADO: {st} | FINAL: {fin}"
        except Exception as e:
            extra = f"ERROR directo: {type(e).__name__} {str(e)[:150]}"
        if len(texto(h)) < 600 and nav:
            try:
                pg = nav.new_page()
                r = pg.goto(u, wait_until="networkidle", timeout=90000)
                h = pg.content()
                extra += f" | NAVEGADOR: {r.status if r else '-'} {pg.url}"
                pg.close()
            except Exception as e:
                extra += f" | navegador ERROR {type(e).__name__}"
        if h:
            guarda(u, h, extra)
        else:
            print("ERROR", u, extra)
        time.sleep(0.5)

# ------------------------------------------------------------ 3. Datos abiertos de Nueva Escocia (Socrata)
if "datos" in PARTES:
    paso("Catálogo de data.novascotia.ca")
    cat = {}
    for q in ["schools", "school locations", "hospitals", "health facilities", "municipal boundaries", "municipalities", "villages", "communities", "community counts", "regional centre for education", "census subdivision"]:
        try:
            b, st, fin = get("https://api.us.socrata.com/api/catalog/v1?" + urllib.parse.urlencode({"domains": "data.novascotia.ca", "q": q, "limit": 15}), 60)
            for x in json.loads(b)["results"]:
                r = x["resource"]
                if r["id"] in cat:
                    continue
                cat[r["id"]] = {"nombre": r["name"], "tipo": r.get("type"), "actualizado": r.get("data_updated_at") or r.get("updatedAt"), "columnas": r.get("columns_name", [])[:40], "url": x.get("permalink") or x.get("link"), "descripcion": (r.get("description") or "")[:300]}
                print(f"[{q}] {r['id']} | {r['name']} | {r.get('type')} | {cat[r['id']]['actualizado']} | {x.get('permalink')}\n      columnas: {cat[r['id']]['columnas']}")
        except Exception as e:
            print("ERROR", q, type(e).__name__, str(e)[:150])
    json.dump(cat, open(f"{OUT}/catalogo.json", "w"), ensure_ascii=False, indent=1)
    pedidos = [p.split("=", 1)[1] for p in PARTES if p.startswith("datos=")]
    for ids in pedidos:
        for i in ids.split(","):
            try:
                b, st, fin = get(f"https://data.novascotia.ca/resource/{i}.json?$limit=50000", 300)
                open(f"{OUT}/datos-{i}.json", "wb").write(b)
                filas = json.loads(b)
                print("descargado", i, len(filas), "filas; ejemplo:", filas[:2])
            except Exception as e:
                print("ERROR", i, type(e).__name__, str(e)[:150])
            try:
                b, st, fin = get(f"https://data.novascotia.ca/api/views/{i}.json", 60)
                m = json.loads(b)
                print("   metadatos", i, "|", m.get("name"), "| actualizado:", m.get("rowsUpdatedAt"), "| licencia:", (m.get("license") or {}).get("name"), "| atribución:", m.get("attribution"))
            except Exception as e:
                print("ERROR metadatos", i, type(e).__name__)

# ------------------------------------------------------------ 4. Bandera (Wikimedia Commons)
if "bandera" in PARTES:
    paso("Bandera de Nueva Escocia en Wikimedia Commons")
    try:
        b, st, fin = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "titles": "File:Flag of Nova Scotia.svg", "prop": "imageinfo", "iiprop": "url|extmetadata|size|sha1", "format": "json"}), 60)
        d = json.loads(b)
        info = list(d["query"]["pages"].values())[0]["imageinfo"][0]
        em = info["extmetadata"]
        print("url:", info["url"], "| tamaño:", info.get("width"), "x", info.get("height"), "| sha1:", info.get("sha1"))
        for k in ("LicenseShortName", "License", "UsageTerms", "Copyrighted", "Restrictions", "Artist", "Credit", "AttributionRequired"):
            print(" ", k, ":", re.sub(r"<[^>]+>", "", str((em.get(k) or {}).get("value", "—")))[:300])
        svg, st, fin = get(info["url"], 60)
        open(f"{OUT}/Flag_of_Nova_Scotia.svg", "wb").write(svg)
        print("SVG:", len(svg), "bytes")
    except Exception as e:
        print("ERROR bandera", type(e).__name__, str(e)[:200])
