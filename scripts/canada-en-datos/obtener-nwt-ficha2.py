"""
obtener-nwt-ficha2.py — Segunda ronda de fuentes oficiales de los Territorios del Noroeste (solo lectura)
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


def tabla(pid):
    b, st, _ = get(f"https://www150.statcan.gc.ca/n1/tbl/csv/{pid}-eng.zip", 900)
    zf = zipfile.ZipFile(io.BytesIO(b))
    n = [x for x in zf.namelist() if x.endswith(".csv") and "MetaData" not in x][0]
    return csv.DictReader(io.TextIOWrapper(zf.open(n), encoding="utf-8-sig"))


PARTES = os.environ.get("PARTES", "statcan clima paginas navegador pdf").split()

# ------------------------------------------------------------ 1. Statistics Canada
if "statcan" in PARTES:
    out = []
    try:
        f = [r for r in tabla("14100292") if r["GEO"] == "Northwest Territories" and r["REF_DATE"] >= "2025-09" and r["Gender"] == "Total - Gender" and r["Age group"] == "15 years and over" and r["Labour force characteristics"] in ("Unemployment rate", "Employment rate", "Participation rate", "Population", "Employment")]
        out.append("== 14-10-0292 (NWT, 15+, todas las series): REF_DATE | característica | Statistics | Data type | UOM | VALUE")
        out += [" | ".join([r["REF_DATE"], r["Labour force characteristics"], r["Statistics"], r["Data type"], r["UOM"], r["SCALAR_FACTOR"], r["VALUE"]]) for r in f]
        out.append("== 14-10-0292 promedio anual 2025 (calculado aparte si no existe)")
    except Exception as e:
        out.append(f"ERROR 14100292 {e}")
    try:
        out.append("== 34-10-0133-01 CMHC alquiler promedio, Yellowknife")
        f = [r for r in tabla("34100133") if "Yellowknife" in r["GEO"] and r["REF_DATE"] >= "2021"]
        out.append("columnas: " + str(list(f[0].keys())[:12]) if f else "sin filas")
        out += [" | ".join([r["REF_DATE"], r["GEO"], r.get("Type of structure", ""), r.get("Type of unit", ""), r["VALUE"], r.get("STATUS", "")]) for r in f]
    except Exception as e:
        out.append(f"ERROR 34100133 {e}")
    try:
        out.append("== 34-10-0127-01 CMHC desocupación (todas las GEO con Yellowknife o Northwest)")
        f = [r for r in tabla("34100127") if ("Yellowknife" in r["GEO"] or "Northwest" in r["GEO"]) and r["REF_DATE"] >= "2021"]
        out += [" | ".join([r["REF_DATE"], r["GEO"], r.get("Vacancy rates", r.get("Type of unit", "")), r["VALUE"]]) for r in f] or ["sin filas"]
    except Exception as e:
        out.append(f"ERROR 34100127 {e}")
    try:
        out.append("== 98-10-0216-01 Censo 2021: conocimiento de idiomas (NWT)")
        for r in tabla("98100216"):
            if r["GEO"] == "Northwest Territories" and r.get("Age (15A)", r.get("Age (15C)", "Total - Age")).startswith("Total"):
                k = [c for c in r if c.startswith("Knowledge of languages")][0]
                v = [c for c in r if "Total - Gender" in c or c.endswith("[1]")]
                out.append(r[k] + " | " + json.dumps({c: r[c] for c in r if c.startswith("Gender") or c.startswith("Statistics")}, ensure_ascii=False)[:300])
    except Exception as e:
        out.append(f"ERROR 98100216 {e}")
    try:
        out.append("== 98-10-0264-01 Censo 2021: identidad indígena (NWT, todas las columnas de la fila total)")
        for r in tabla("98100264"):
            if r["GEO"] == "Northwest Territories":
                out.append(json.dumps(r, ensure_ascii=False))
                break
    except Exception as e:
        out.append(f"ERROR 98100264 {e}")
    try:
        out.append("== 36-10-0402-01 PIB por industria, NWT, último año, dólares encadenados de 2017")
        todas = [r for r in tabla("36100402") if r["GEO"] == "Northwest Territories"]
        out.append("Prices: " + str(sorted({r["Prices"] for r in todas})))
        ult = max(r["REF_DATE"] for r in todas)
        for r in todas:
            ind = r["North American Industry Classification System (NAICS)"]
            if r["REF_DATE"] == ult and r["Prices"].startswith("Chained") and (re.search(r"\[(1[01]|2[123]|31-33|41|4A|44-45|48-49|5[1-6]|6[12]|7[12]|81|91|212|21)\]$", ind) or ind.startswith("All industries")):
                out.append(" | ".join([r["REF_DATE"], ind, r["VALUE"], r["SCALAR_FACTOR"]]))
    except Exception as e:
        out.append(f"ERROR 36100402 {e}")
    try:
        out.append("== 18-10-0004-01 IPC: Yellowknife y Canadá, septiembre 2025 y 2026; Food/Shelter")
        for r in tabla("18100004"):
            if r["GEO"] in ("Yellowknife, Northwest Territories", "Canada", "Edmonton, Alberta") and r["REF_DATE"] in ("2025-09", "2026-09") and r["Products and product groups"] in ("All-items", "Food", "Shelter", "Energy", "Gasoline"):
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
    b, st, _ = get("https://climate.weather.gc.ca/climate_normals/station_select_1991_2020_e.html?searchType=stnProv&lstProvince=NT", 120)
    h = b.decode("utf-8", "ignore")
    enl = sorted(set(re.findall(r'href="([^"]*results_1991_2020_e\.html[^"]*)"', h)))
    salida = [f"# estado {st} | estaciones: {len(enl)}"] + enl
    for e in enl:
        u = urllib.parse.urljoin("https://climate.weather.gc.ca/climate_normals/", html.unescape(e))
        if not re.search(r"YELLOWKNIFE|INUVIK|HAY RIVER|FORT SMITH|NORMAN WELLS|FORT SIMPSON|FORT LIARD|ULUKHAKTOK|TUKTOYAKTUK|FORT GOOD HOPE|FORT MCPHERSON|FORT RESOLUTION|FORT PROVIDENCE|BEHCHOKO|DELINE|SACHS|PAULATUK|AKLAVIK|WRIGLEY|TULITA|LUTSELK|stnID", u, re.I) and len(enl) > 40:
            continue
        b2, st2, _ = get(u, 120)
        salida += [f"\n=== {u} ({st2})", texto(b2)[:20000]]
        time.sleep(1)
    guardar("normales-1991-2020", "\n".join(salida))

# ------------------------------------------------------------ 3. Páginas oficiales (lectura directa, con respaldo del Internet Archive)
PAGINAS = [
    ("ntnp-inicio", "https://www.immigratenwt.ca/"),
    ("ntnp-skilled", "https://www.immigratenwt.ca/skilled-worker"),
    ("ntnp-entry", "https://www.immigratenwt.ca/entry-levelsemi-skilled-occupations"),
    ("ntnp-ee", "https://www.immigratenwt.ca/nwt-express-entry"),
    ("ntnp-employer", "https://www.immigratenwt.ca/employer-driven-stream"),
    ("ntnp-business", "https://www.immigratenwt.ca/business-stream"),
    ("ntnp-franco", "https://www.immigratenwt.ca/francophone-stream"),
    ("ntnp-immigrate", "https://www.immigratenwt.ca/immigrate-here"),
    ("ntnp-support", "https://www.immigratenwt.ca/nominee-support"),
    ("ntnp-forms", "https://www.immigratenwt.ca/forms-and-resources"),
    ("ntnp-contact", "https://www.immigratenwt.ca/contact-us"),
    ("ntnp-news2", "https://www.immigratenwt.ca/news-0"),
    ("hss-plan", "https://www.hss.gov.nt.ca/en/services/nwt-health-care-plan"),
    ("hss-apply", "https://www.hss.gov.nt.ca/en/services/nwt-health-care-plan/applying-health-care"),
    ("hss-general", "https://www.hss.gov.nt.ca/en/services/nwt-health-care-plan/general-information-residents"),
    ("hss-card", "https://www.hss.gov.nt.ca/en/services/nwt-health-care-plan/health-care-card"),
    ("hss-811", "https://www.hss.gov.nt.ca/en/services/811"),
    ("hss-mental", "https://www.hss.gov.nt.ca/en/services/mental-health-and-addictions"),
    ("nthssa-inicio", "https://www.nthssa.ca/"),
    ("nthssa-doctor", "https://www.nthssa.ca/en/services/primary-health-care"),
    ("ece-wage", "https://www.ece.gov.nt.ca/en/minimum-wage"),
    ("ece-es", "https://www.ece.gov.nt.ca/en/services/employment-standards"),
    ("ece-langs", "https://www.ece.gov.nt.ca/en/official-languages"),
    ("ece-services", "https://www.ece.gov.nt.ca/en/services"),
    ("ece-k12", "https://www.ece.gov.nt.ca/en/services/education-schools"),
    ("ece-elcc", "https://www.ece.gov.nt.ca/en/services/early-learning-and-child-care"),
    ("ece-ia", "https://www.ece.gov.nt.ca/en/services/income-security/income-assistance"),
    ("ece-sfa", "https://www.ece.gov.nt.ca/en/services/student-financial-assistance"),
    ("ece-careers", "https://www.ece.gov.nt.ca/en/services/career-and-employment-development"),
    ("ece-newcomers", "https://www.ece.gov.nt.ca/en/services/immigration"),
    ("gnwt-nuevo", "https://www.gnwt.ca/"),
    ("gnwt-newsroom", "https://www.gnwt.ca/newsroom"),
    ("gnwt-time", "https://www.gnwt.ca/en/newsroom/search?keys=time"),
    ("gov-time-news", "https://www.gov.nt.ca/en/newsroom?keys=time"),
    ("inf-dvs", "https://www.inf.gov.nt.ca/en/services/driver-and-vehicle-services"),
    ("inf-licence", "https://www.inf.gov.nt.ca/en/services/driver-and-vehicle-services/driver-licensing"),
    ("inf-roads", "https://www.inf.gov.nt.ca/en/services/highways-ferries-and-winter-roads"),
    ("inf-services", "https://www.inf.gov.nt.ca/en/services"),
    ("nwthc-public", "https://www.nwthc.gov.nt.ca/en/services/public-housing-program"),
    ("nwthc-cnhb", "https://www.nwthc.gov.nt.ca/en/services/canada-nwt-housing-benefit"),
    ("nwthc-market", "https://www.nwthc.gov.nt.ca/en/services/market-housing-program"),
    ("nwthc-contact", "https://www.nwthc.gov.nt.ca/en/contact-us"),
    ("stats-inicio", "https://www.statsnwt.ca/en"),
    ("stats-lcd", "https://www.statsnwt.ca/en/prices-and-expenditures/living-cost-differentials"),
    ("stats-cpi-comm", "https://www.statsnwt.ca/en/prices-and-expenditures/community-price-index"),
    ("stats-cpi", "https://www.statsnwt.ca/en/prices-and-expenditures/consumer-price-index"),
    ("stats-pop-comm", "https://www.statsnwt.ca/en/population/population-estimates-community"),
    ("stats-nmbm", "https://www.statsnwt.ca/en/prices-and-expenditures/northern-market-basket-measure"),
    ("stats-lfs", "https://www.statsnwt.ca/en/labour-and-income/labour-force-activity"),
    ("maca-911", "https://www.maca.gov.nt.ca/en/services/9-1-1-nwt"),
    ("maca-services", "https://www.maca.gov.nt.ca/en/services"),
    ("rcmp-nt", "https://rcmp.ca/en/nt"),
    ("rcmp-nt2", "https://www.rcmp-grc.gc.ca/detach/en/find/NT"),
    ("yk-inicio", "https://www.yellowknife.ca/"),
    ("yk-imm", "https://www.yellowknife.ca/immigration-services"),
    ("yk-housing", "https://www.yellowknife.ca/housing"),
    ("yk-hosp", "https://www.yellowknife.ca/hospitals-and-clinics"),
    ("yk-emerg", "https://www.yellowknife.ca/emergency-contacts"),
    ("yk-weather", "https://www.yellowknife.ca/weather-and-aurora-borealis"),
    ("yk-schools", "https://www.yellowknife.ca/education/schools"),
    ("yk-childcare", "https://www.yellowknife.ca/education/child-care"),
    ("yk-transit", "https://www.yellowknife.ca/transit"),
    ("aurora", "https://www.auroracollege.nt.ca/"),
    ("aurora2", "https://auroracollege.nt.ca/"),
    ("cdetno", "https://www.cdetno.com/"),
    ("college-nordique", "https://www.collegenordique.ca/"),
    ("ircc-pnp", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html"),
    ("ircc-servicios", "https://ircc.canada.ca/english/newcomers/services/index.asp"),
    ("cra-ntcb", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/northwest-territories.html"),
    ("cra-25500", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions.html"),
    ("cra-zonas", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions/northern-southern-prescribed-zones.html"),
    ("elcc-10", "https://www.canada.ca/en/early-learning-child-care-agreement/agreements-provinces-territories/northwest-territories.html"),
    ("nnc-comunidades", "https://www.nutritionnorthcanada.gc.ca/eng/1415540731169/1415540791407"),
    ("jobbank-escaneo", "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/northwest-territories/environmental-scan"),
    ("jobbank-buscar", "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Northwest+Territories"),
    ("cmhc-yk", "https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/Table?TableId=2.1.31.2&GeographyId=1290&GeographyTypeId=3&DisplayAs=Table&GeograghyName=Yellowknife"),
    ("nwt-languages-comm", "https://www.olc-nt.ca/"),
    ("rentals-office", "https://www.justice.gov.nt.ca/en/rental-office/"),
    ("justice-legislation-interp", "https://www.justice.gov.nt.ca/en/legislation/#gn-filebrowse-0:/i/interpretation/"),
    ("diavik", "https://www.riotinto.com/en/operations/canada/diavik"),
    ("spectacular", "https://spectacularnwt.com/"),
    ("canada-nwt", "https://www.canada.ca/en/intergovernmental-affairs/services/provinces-territories.html"),
]
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

# ------------------------------------------------------------ 5. Documentos PDF oficiales
if "pdf" in PARTES:
    for clave, u in [("reg-hora", "https://www.justice.gov.nt.ca/en/files/legislation/interpretation/interpretation.r2.pdf"),
                     ("ntnp-guidelines-ed", "https://www.immigratenwt.ca/sites/immigratenwt/files/resources/ntnp_employer-driven_stream_program_guidelines.pdf")]:
        b, st, _ = get(u, 120); nota = f"directo {st}"
        if not (st == 200 and b[:4] == b"%PDF"):
            b, nota = archivo(u, "2024")
        try:
            guardar(clave, f"# {u}\n# {nota}\n" + pdf_texto(b))
        except Exception as e:
            guardar(clave, f"# {u}\n# {nota}\nERROR {e}")
