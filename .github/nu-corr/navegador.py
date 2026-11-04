"""Páginas que requieren navegador (canada.ca, tabla de salarios mínimos, aerolíneas). Solo lectura."""
import os, re
from playwright.sync_api import sync_playwright
OUT = "/tmp/out"
P = [("minwage", "https://minwage-salairemin.service.canada.ca/en/general.html"),
     ("ccb", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html"),
     ("ccb-montos", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview/canada-child-benefit-we-calculate-your-ccb.html"),
     ("ccb-recien", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview/canada-child-benefit-before-you-apply.html"),
     ("nucb", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/provincial-territorial-programs/nunavut.html"),
     ("nrd", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions.html"),
     ("nrd-zonas", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-25500-northern-residents-deductions/places-prescribed-zones.html"),
     ("nrd-zonas-lista", "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4039.html"),
     ("guarderias", "https://www.canada.ca/en/early-learning-child-care-agreement/agreements-provinces-territories/nunavut.html"),
     ("guarderias-2021", "https://www.canada.ca/en/early-learning-child-care-agreement/agreements-provinces-territories/nunavut-canada-wide-2021.html"),
     ("dental", "https://www.canada.ca/en/services/benefits/dental/dental-care-plan.html"),
     ("988", "https://988.ca/"),
     ("988-gc", "https://www.canada.ca/en/public-health/services/mental-health-services/mental-health-get-help.html"),
     ("hope", "https://www.hopeforwellness.ca/"),
     ("ircc-servicios", "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/new-life-canada/find-free-services.html"),
     ("ircc-pnp", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html"),
     ("ircc-rural", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration.html"),
     ("ircc-franco", "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/francophone-immigration.html"),
     ("ircc-movilidad", "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/hire-temporary-foreign/international-mobility-program/eligibility/francophone-mobility-program.html"),
     ("canadiannorth", "https://canadiannorth.com/"), ("canadiannorth-destinos", "https://canadiannorth.com/destinations/"), ("canadiannorth-rutas", "https://canadiannorth.com/route-map/"),
     ("calmair-rutas", "https://www.calmair.com/route-map"), ("calmair-destinos2", "https://www.calmair.com/destinations/"),
     ("rcmp-911-b", "https://rcmp.ca/en/nunavut/news/2025/12/4348432"),
     ("nutricion", "https://www.nutritionnorthcanada.gc.ca/eng/1415538638170/1415538670874"),
     ("jobbank-salarios", "https://www.jobbank.gc.ca/trend-analysis/job-market-reports/nunavut/environmental-scan"),
     ("ccb-solicitar", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview/canada-child-benefit-apply.html"),
     ("gst", "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/goods-services-tax-harmonized-sales-tax-gst-hst-credit.html"),
     ("emergencias-gc", "https://www.getprepared.gc.ca/cnt/rsrcs/sfttps/tp201012-en.aspx"),
     ("arctic-college-b", "https://www.arcticcollege.com/campuses"),
]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(locale="en-CA", user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36")
    for clave, u in P:
        pg = ctx.new_page()
        try:
            r = pg.goto(u, wait_until="domcontentloaded", timeout=60000)
            pg.wait_for_timeout(4000)
            t = pg.evaluate("() => document.body.innerText")
            links = pg.evaluate("() => [...document.querySelectorAll('main a, article a, body a')].slice(0, 400).map(a => a.innerText.trim().slice(0,80) + ' -> ' + a.href).join('\\n')")
            open(f"{OUT}/nav-{clave}.txt", "w").write(f"# {u} → {pg.url}\n# estado {r.status if r else None} | {pg.title()}\n{t}\n\n# ENLACES\n{links}")
            print(clave, r.status if r else None, len(t), flush=True)
        except Exception as e:
            open(f"{OUT}/nav-{clave}.txt", "w").write(f"# {u}\nERROR {e}")
            print(clave, "ERROR", str(e)[:100], flush=True)
        pg.close()
    b.close()
