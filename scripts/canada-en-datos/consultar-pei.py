"""
consultar-pei.py — Exploración (solo lectura) de las fuentes oficiales para Isla del Príncipe Eduardo
====================================================================================================
Se ejecuta en GitHub Actions (el entorno de desarrollo no llega a los sitios
oficiales). Comprueba qué fuentes responden y qué contienen, sin guardar nada.
"""
import csv, io, json, re, urllib.parse, urllib.request, zipfile

UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)", "Accept-Language": "en-CA"}


def get(url, t=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=t) as r:
        return r.read()


def paso(n):
    print(f"\n=== {n} ===", flush=True)


def prueba(nombre, url, fn=None):
    try:
        b = get(url)
        print(f"OK {len(b)} bytes — {nombre} — {url}")
        if fn:
            fn(b)
    except Exception as e:
        print(f"ERROR {type(e).__name__} {str(e)[:120]} — {nombre} — {url}")


def zip_lista(b):
    z = zipfile.ZipFile(io.BytesIO(b))
    print("   archivos:", [(n, i.file_size) for n, i in zip(z.namelist(), z.infolist())][:12])


paso("Límites censales 2021 (Statistics Canada)")
for n in ["lpr_000b21a_e", "lcd_000b21a_e", "lcsd000b21a_e", "lcsd000a21a_e", "ler_000b21a_e", "ldpl000b21a_e"]:
    prueba(n, f"https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/{n}.zip", zip_lista)
prueba("GAF 92-151-X", "https://www12.statcan.gc.ca/census-recensement/2021/geo/aip-pia/attribute-attribs/files-fichiers/2021_92-151_X.zip", zip_lista)
GEO = "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer"
prueba("ArcGIS StatCan raíz", GEO + "?f=json", lambda b: print("   capas:", [(l["id"], l["name"]) for l in json.loads(b).get("layers", [])][:20]))
for i in range(0, 12):
    prueba(f"ArcGIS capa {i}", f"{GEO}/{i}/query?where=PRUID%3D%2711%27&outFields=*&returnGeometry=false&resultRecordCount=3&f=json", lambda b: print("   ", str(json.loads(b))[:300]))

paso("Nombres geográficos de Canadá (CGNDB, Recursos Naturales Canadá)")
prueba("CGN CSV PEI", "https://ftp.cartes.canada.ca/pub/nrcan_rncan/vector/geobase_cgn_toponyme/prov_csv_eng/cgn_pe_csv_eng.zip", zip_lista)
prueba("CGN API", "https://geogratis.gc.ca/services/geoname/en/geonames.json?province=11&concise=CITY&num=5", lambda b: print("   ", b[:600]))
prueba("CGN API UNP", "https://geogratis.gc.ca/services/geoname/en/geonames.json?province=11&concise=UNP&num=3", lambda b: print("   ", b[:600]))

paso("Datos abiertos del Gobierno de PEI")
for q in ["municipal boundaries", "municipalities", "lots", "schools", "hospitals", "communities", "place names", "population"]:
    prueba(f"catálogo: {q}", "https://data.princeedwardisland.ca/api/catalog/v1?only=datasets&limit=12&q=" + urllib.parse.quote(q),
           lambda b: [print("   ", r["resource"]["id"], "|", r["resource"]["name"][:90], "|", r["resource"].get("updatedAt", "")[:10], "|", r["resource"].get("type")) for r in json.loads(b)["results"]])

paso("Páginas oficiales de PEI")
for nombre, url in [
    ("Municipios", "https://www.princeedwardisland.ca/en/information/housing-land-and-communities/municipalities-in-prince-edward-island"),
    ("Buscar municipios", "https://www.princeedwardisland.ca/en/search/site?f%5B0%5D=type%3Ainformation&search_api_fulltext=municipalities"),
    ("Salario mínimo", "https://www.princeedwardisland.ca/en/information/economic-development-innovation-and-trade/minimum-wage-order"),
    ("Population report", "https://www.princeedwardisland.ca/en/information/finance/pei-population-report-quarterly"),
    ("Health card", "https://www.princeedwardisland.ca/en/information/health-and-wellness/pei-health-card"),
    ("PEI PNP", "https://www.princeedwardisland.ca/en/topic/office-immigration"),
    ("Health PEI", "https://www.healthpei.ca/"),
    ("Public Schools Branch", "https://psb.edu.pe.ca/"),
    ("Newcomers", "https://www.peianc.com/"),
    ("WorkPEI", "https://www.workpei.ca/"),
]:
    prueba(nombre, url, lambda b: print("   título:", (re.search(rb"<title>(.*?)</title>", b, re.S) or [b"", b"-"])[1][:120]))

paso("Statistics Canada — tablas útiles (cabeceras)")
for pid in ["17100142", "98100002", "98100012", "14100393", "14100287"]:
    prueba(f"metadatos {pid}", f"https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata", None)
