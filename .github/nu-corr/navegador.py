"""Segunda ronda (solo lectura): licencias, integración, guarderías, aerolíneas."""
import json, re, time, urllib.parse, urllib.request
from playwright.sync_api import sync_playwright
OUT = "/tmp/out"
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}

def ultima(u, desde="2024"):
    q = {"url": u, "output": "json", "fl": "timestamp,statuscode", "filter": "statuscode:200", "from": desde, "limit": "-2"}
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request("http://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(q), headers=UA), timeout=120) as r:
                d = json.loads(r.read() or b"[]")[1:]
                return d[-1][0] if d else None
        except Exception:
            time.sleep(8)
    return None

DIRECTAS = [("carrefour-imm", "https://carrefournunavut.ca/about/immigration"), ("carrefour-imm-en", "https://carrefournunavut.ca/en/about/immigration"),
            ("afn", "https://www.afnunavut.ca/"), ("esdc-10", "https://www.canada.ca/en/employment-social-development/news/2022/11/10-a-day-child-care-becoming-a-reality-for-families-in-nunavut-in-december-2022.html"),
            ("calmair-comunidades", "https://www.calmair.com/calm-air-community/our-communities"), ("calmair-arviat", "https://www.calmair.com/calm-air-community/our-communities/arviat-nu"),
            ("cn-iqaluit", "https://canadiannorth.com/destination/iqaluit/"), ("cn-kugluktuk", "https://canadiannorth.com/destination/kugluktuk/"), ("cn-cambridge", "https://canadiannorth.com/destination/cambridge-bay/"),
            ("ircc-servicios", "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/new-life-canada/settlement-services.html"),
            ("ircc-buscador", "https://ircc.canada.ca/english/newcomers/services/index.asp"),
            ("cra-zonas", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions/places-prescribed-zones.html"),
            ("cra-factsheet", "https://www.canada.ca/en/services/taxes/income-tax/personal-income-tax/help-others/outreach/outreach-materials-print-share/factsheet-northern-deductions.html"),
            ("ccb-temporales", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview/canada-child-benefit-before-you-apply.html")]
ARCHIVO = [("gn-licencia-solicitar", "https://www.gov.nu.ca/en/transportation/apply-drivers-licence"), ("gn-oficinas-vehiculos", "https://www.gov.nu.ca/en/transportation/motor-vehicles-offices"),
           ("gn-padres", "https://www.gov.nu.ca/en/families-parenting-elders-and-youth/parents-young-children"), ("gn-guarderia", "https://www.gov.nu.ca/en/families-parenting-elders-and-youth/early-learning-and-child-care"),
           ("gn-emergencias", "https://www.gov.nu.ca/en/public-safety-and-emergencies"), ("gn-licor", "https://www.gov.nu.ca/en/liquor-and-cannabis")]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(locale="en-CA", user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36")
    pares = DIRECTAS[:]
    for clave, u in ARCHIVO:
        ts = ultima(u)
        pares.append((clave, f"http://web.archive.org/web/{ts}id_/{u}" if ts else u))
    for clave, u in pares:
        pg = ctx.new_page()
        try:
            r = pg.goto(u, wait_until="domcontentloaded", timeout=90000)
            pg.wait_for_timeout(3500)
            t = pg.evaluate("() => document.body.innerText")
            links = pg.evaluate("() => [...document.querySelectorAll('a')].slice(0, 300).map(a => a.innerText.trim().slice(0,80) + ' -> ' + a.href).join('\\n')")
            open(f"{OUT}/{clave}.txt", "w").write(f"# {u} → {pg.url}\n# estado {r.status if r else None} | {pg.title()}\n{t}\n\n# ENLACES\n{links}")
            print(clave, r.status if r else None, len(t), flush=True)
        except Exception as e:
            open(f"{OUT}/{clave}.txt", "w").write(f"# {u}\nERROR {e}")
        pg.close()
    b.close()
