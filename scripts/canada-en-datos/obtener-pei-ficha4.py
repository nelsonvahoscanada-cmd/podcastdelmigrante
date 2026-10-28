"""
obtener-pei-ficha4.py — Cuarta ronda de verificación de la ficha de Isla del Príncipe Eduardo
============================================================================================
Solo lectura, en GitHub Actions:
  1. archivo: busca en el Archivo de Internet (por prefijo) las páginas y
     documentos del Gobierno de PEI sobre el salario mínimo, y lee la copia
     más reciente con contenido.
  2. navegador: abre con un navegador normal la copia archivada de la tabla
     federal de salarios mínimos (la página necesita JavaScript) y la página
     de la CRA con las tasas provinciales de impuesto a la renta.
  3. irac: lee las páginas de la Oficina de Alquileres de IRAC (sitio público).
"""
import gzip, html, json, re, sys, time, urllib.parse, urllib.request

PARTE = sys.argv[1] if len(sys.argv) > 1 else "todo"
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=90):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        b = r.read()
    return gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b


def texto(h):
    h = h.decode("utf-8", "ignore") if isinstance(h, bytes) else h
    h = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|tr|div|td|th|dt|dd|caption)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return re.sub(r"[ \t\xa0]+", " ", re.sub(r"\n\s*\n+", "\n", t)).strip()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def mostrar(t, patron, ventana=5, maximo=40):
    lineas, vistos, n = t.split("\n"), set(), 0
    for i, l in enumerate(lineas):
        if re.search(patron, l) and i not in vistos:
            vistos.update(range(i, i + ventana))
            print("  >", " | ".join(x.strip() for x in lineas[max(0, i - 1): i + ventana] if x.strip())[:1000])
            n += 1
            if n >= maximo:
                break


# ------------------------------------------------------------ 1. Archivo por prefijo
if PARTE in ("archivo", "todo"):
    for prefijo, filtro in [
        ("princeedwardisland.ca/en/news/", r".*(wage|minimum).*"),
        ("princeedwardisland.ca/en/information/", r".*minimum.*wage.*"),
        ("princeedwardisland.ca/en/service/", r".*(wage|tenan|rental).*"),
        ("princeedwardisland.ca/sites/default/files/", r".*(minimum|wage).*"),
        ("princeedwardisland.ca/en/legislation/", r".*(minimum|employment-standards).*"),
        ("princeedwardisland.ca/en/information/", r".*(rental|tenan|residential-tenancy).*"),
        ("princeedwardisland.ca/en/information/", r".*(provincial-nominee|pnp|express-entry|labour-impact|occupations-in-demand|critical-worker).*"),
    ]:
        paso(f"Copias con prefijo {prefijo} y filtro {filtro}")
        try:
            q = "http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(
                {"url": prefijo, "matchType": "prefix", "output": "json", "from": "2024", "filter": ["statuscode:200", "original:" + filtro], "collapse": "urlkey", "limit": "300"}, doseq=True)
            filas = (json.loads(get(q, 180) or b"[]") or [[]])[1:]
            print("encontradas:", len(filas))
            for f in filas[-40:]:
                print("  ", f[1], f[2][:180])
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:160])
        time.sleep(3)

    # Lee la copia más reciente con contenido de las direcciones que parecen tratar del salario mínimo
    paso("Lectura de copias sobre el salario mínimo")
    try:
        q = "http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(
            {"url": "princeedwardisland.ca/en/", "matchType": "prefix", "output": "json", "from": "2025", "filter": ["statuscode:200", "original:.*minimum-wage.*"], "limit": "500"}, doseq=True)
        filas = (json.loads(get(q, 180) or b"[]") or [[]])[1:]
        filas.sort(key=lambda f: f[1], reverse=True)
        leidas = 0
        for f in filas:
            if leidas >= 4:
                break
            try:
                t = texto(get(f"http://web.archive.org/web/{f[1]}id_/{f[2]}", 120))
            except Exception as e:
                print("  copia", f[1], "ERROR", type(e).__name__)
                continue
            if "Radware" in t[:600] or len(t) < 400:
                print("  copia", f[1], f[2][:120], "sin contenido")
                continue
            m = re.search(r"Published date:\s*([A-Z][a-z]+ \d{1,2}, \d{4})", t)
            print("  copia", f[1], f[2][:150], "| publicado:", m.group(1) if m else "—")
            mostrar(t, r"\$\s?\d{2}\.\d{2}|minimum wage|effective|April 1|October 1")
            leidas += 1
            time.sleep(2)
    except Exception as e:
        print("ERROR", type(e).__name__, str(e)[:160])

# ------------------------------------------------------------ 2. Navegador
if PARTE in ("navegador", "todo"):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(locale="en-CA")
        paso("Navegador: copia archivada de la tabla federal de salarios mínimos")
        for u in ["https://web.archive.org/web/2026/https://minwage-salairemin.service.canada.ca/en/general.html",
                  "https://minwage-salairemin.service.canada.ca/en/general.html"]:
            pg = ctx.new_page()
            try:
                r = pg.goto(u, wait_until="networkidle", timeout=120000)
                pg.wait_for_timeout(6000)
                t = pg.inner_text("body")
                print("URL:", pg.url[:140], "| estado:", r.status if r else None, "| caracteres:", len(t))
                mostrar(t, r"Prince Edward|Effective|Date modified")
            except Exception as e:
                print("ERROR", u, type(e).__name__, str(e)[:160])
            pg.close()

        paso("Navegador: CRA — tasas provinciales")
        u = "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html"
        pg = ctx.new_page()
        try:
            pg.goto(u, wait_until="networkidle", timeout=120000)
            pg.wait_for_timeout(3000)
            # Abre todas las secciones plegadas
            for d in pg.locator("details").all():
                try:
                    d.evaluate("e => e.open = true")
                except Exception:
                    pass
            pg.wait_for_timeout(1000)
            t = pg.inner_text("body")
            m = re.search(r"Date modified:\s*([\d-]+)", t)
            print("caracteres:", len(t), "| modificado:", m.group(1) if m else "—")
            i = t.find("Prince Edward Island")
            while i >= 0:
                bloque = t[i:i + 900]
                if "%" in bloque:
                    print("  >", re.sub(r"\s+", " ", bloque)[:900])
                i = t.find("Prince Edward Island", i + 20)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:160])
        pg.close()
        b.close()

# ------------------------------------------------------------ 3. IRAC (Oficina de Alquileres)
if PARTE in ("irac", "todo"):
    paso("IRAC: enlaces de la página principal")
    try:
        h = get("https://irac.pe.ca/").decode("utf-8", "ignore")
        enl = sorted(set(re.findall(r'href="(https://irac\.pe\.ca/[^"#]+)"', h)))
        print("\n".join(enl[:120]))
    except Exception as e:
        enl = []
        print("ERROR", type(e).__name__, str(e)[:160])
    for u in [x for x in enl if re.search(r"rent|tenan|landlord|residential", x, re.I)][:12]:
        paso(f"IRAC: {u}")
        try:
            t = texto(get(u))
            m = re.search(r"(Updated|Last updated|Published)[:\s]+([A-Z][a-z]+ \d{1,2}, \d{4})", t)
            print("caracteres:", len(t), "|", m.group(0) if m else "fecha no indicada")
            mostrar(t, r"[Ii]ncrease|%|deposit|[Dd]eposit|notice|Residential Tenancy Act|allowable|2026|2027", ventana=4, maximo=25)
        except Exception as e:
            print("ERROR", type(e).__name__, str(e)[:160])
        time.sleep(1)
