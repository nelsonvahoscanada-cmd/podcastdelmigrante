"""
compactar-nwt-servicios.py — Datos complementarios de las comunidades de los Territorios del Noroeste
======================================================================================================
Genera scripts/canada-en-datos/nwt-servicios.json, que usa provincias/northwest-territories.mjs:

  escuelas  Base abierta de establecimientos educativos de Statistics Canada (ODEF v2.1, 2022),
            filas de NWT (nwt-fuentes.json). Muchas filas de NWT no tienen coordenadas: se ubican
            en su subdivisión censal por la localidad que registra la base (columna City), con la
            tabla LOCALIDAD de abajo. La base perdió las letras de las lenguas dene de algunos
            nombres (p. ej., «Gamt» por Gamètì): se corrigen solo cuando el nombre se reconstruye
            sin dudas (tabla NOMBRES); si no, se muestra una descripción en español con el nombre
            anterior que sí aparece en la base, sin inventar el nombre actual.
  clima     Normales climáticas 1991-2020 de Environment and Climate Change Canada (texto de las
            páginas oficiales guardado por obtener-nwt-ficha2.py), por comunidad.
  costo     Diferenciales de costo de vida 2025 de los puestos aislados federales (Edmonton = 100) e
            índice de precios de alimentos 2019 (Yellowknife = 100), por comunidad, del NWT Bureau of
            Statistics (texto de sus páginas guardado por obtener-nwt-ficha2.py).
  cmhc      Alquiler promedio de CMHC en Yellowknife, octubre de 2025 (Statistics Canada, tabla
            34-10-0133-01; texto guardado por obtener-nwt-ficha2.py).

USO:
  python3 scripts/canada-en-datos/compactar-nwt-servicios.py <carpeta con los textos de la ronda 2>
"""
import json, pathlib, re, sys, unicodedata

BASE = pathlib.Path(__file__).parent
F = json.loads((BASE / "nwt-fuentes.json").read_text(encoding="utf-8"))
R2 = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None

# ------------------------------------------------------------ Escuelas (ODEF 2022)
LOCALIDAD = {
    "Wekwet": "6103052", "Paulatuk": "6101014", "Inuvik": "6101017", "Sambaa Ke": "6104006", "Nahanni Butte": "6104010",
    "Behchok": "6103031", "Wrigley": "6104044", "Fort Mcpherson": "6101015", "Tsiigehtchic": "6101010",
    "K'atlode-eche First Nation Reserve": "6104017", "Fort Good Hope": "6102009", "Colville Lake": "6102012",
    "Fort Providence": "6104014", "Fort Liard": "6104009", "Ulukhaktok": "6101095", "Sachs Harbour": "6101041",
    "Gamt": "6103049", "Ndil": "6106023", "Kakisa": "6104005", "Detah": "6106021", "Jean Marie River": "6104013",
    "utselke": "6105020", "Fort Simpson": "6104038", "Norman Wells": "6102007", "What": "6103034", "Dlne": "6102003",
    "Yellowknife": "6106023", "Aklavik": "6101025", "Tuktoyaktuk": "6101036", "Tulita": "6102005", "Fort Smith": "6105001",
    "Hay River": "6105016", "Fort Resolution": "6105018",
}
NOMBRES = {
    "Jean Wetrade Gamt School": "Jean Wetrade Gamètì School",
    "Elizabeth Mackenzie Elem.": "Elizabeth Mackenzie Elementary School",
    "ehtseo Ayha School": "Ehtseo Ayha School",
    "Líídl?? Kú? Elementary School (Bompas Elementary School)": "Escuela primaria de Fort Simpson (en la base, también con su nombre anterior, Bompas Elementary School)",
    "Líídl?? Kú? Regional High School (Thomas Simpson Secondary School)": "Escuela secundaria regional de Fort Simpson (en la base, también con su nombre anterior, Thomas Simpson Secondary School)",
    "K'lem Dene School": "Escuela dene de Ndilǫ (K'àlemì Dene School)",
}
NIVELES = [("ISCED020", "preescolar"), ("ISCED1", "primaria"), ("ISCED2", "secundaria básica"), ("ISCED3", "secundaria superior"), ("ISCED4Plus", "formación postsecundaria")]
escuelas = []
for e in F["educacion"]:
    csd = e.get("csd") or LOCALIDAD.get(e.get("City", ""))
    if not csd:
        raise SystemExit(f"Escuela sin subdivisión censal: {e['Facility_Name']} ({e.get('City')})")
    nombre = NOMBRES.get(e["Facility_Name"], e["Facility_Name"])
    if "?" in nombre:
        raise SystemExit(f"Nombre con caracteres perdidos sin corregir: {nombre}")
    niveles = [n for k, n in NIVELES if e.get(k) == "1"]
    escuelas.append({"csd": csd, "nombre": nombre, "niveles": ", ".join(niveles), "autoridad": e.get("Authority_Name"), "en_ndilo": e.get("City") == "Ndil"})
escuelas.sort(key=lambda x: (x["csd"], x["nombre"]))

# ------------------------------------------------------------ Normales 1991-2020 (ECCC)
# Subdivisión censal → identificador climático de la estación de Environment Canada en la comunidad
ESTACIONES = {
    "6106023": "2204100", "6101017": "2202570", "6105016": "2202400", "6105001": "2202200", "6102007": "2202800",
    "6104038": "2202101", "6104009": "2201575", "6101095": "2502501", "6101036": "2203911", "6102009": "2201400",
    "6101015": "2201601", "6104014": "2201799", "6102003": "2201022", "6102012": "2200824", "6103034": "2202678",
    "6101014": "2203055", "6101041": "2503648",
}


def trece(bloque, etiqueta, desde=0):
    i = bloque.find("\n " + etiqueta + "\n", desde)
    if i < 0:
        return None, -1
    nums = []
    for l in bloque[i:].split("\n")[2:40]:
        l = l.strip()
        if re.fullmatch(r"-?\d+(\.\d+)?", l):
            nums.append(float(l))
        elif l and nums:
            break
        if len(nums) == 13:
            break
    return (nums if len(nums) == 13 else None), i


clima = {}
T = (R2 / "normales-1991-2020.txt").read_text(encoding="utf-8")
por_id = {}
for bloque in T.split("\n=== ")[1:]:
    url = bloque.split(" (")[0].strip()
    cid = re.search(r"climate_id=(\w+)", url).group(1)
    nom = re.search(r"\[#metadata-thread\] ([^\n]+?) \n", bloque)
    temp, _ = trece(bloque, "Daily Average (°C)")
    nieve, j = trece(bloque, "Snowfall (cm)")
    prec, _ = trece(bloque, "Precipitation (mm)", j if j > 0 else 0)
    por_id[cid] = (url, nom.group(1).strip() if nom else cid, temp, nieve, prec)
for csd, cid in ESTACIONES.items():
    url, estacion, temp, nieve, prec = por_id[cid]
    if not temp:
        raise SystemExit(f"Sin temperaturas 1991-2020 en la estación {cid}")
    clima[csd] = {"estacion": estacion, "enero": temp[0], "julio": temp[6], "anual": temp[12],
                  "nieve": nieve[12] if nieve else None, "precipitacion": prec[12] if prec else None, "url": url}

# ------------------------------------------------------------ Costo de vida por comunidad (NWT Bureau of Statistics)
COMUNIDAD = {
    "Yellowknife": "6106023", "Aklavik": "6101025", "Fort McPherson": "6101015", "Inuvik": "6101017", "Paulatuk": "6101014",
    "Sachs Harbour": "6101041", "Tsiigehtchic": "6101010", "Tuktoyaktuk": "6101036", "Ulukhaktok": "6101095",
    "Colville Lake": "6102012", "Délı̨nę": "6102003", "Fort Good Hope": "6102009", "Norman Wells": "6102007", "Tulita": "6102005",
    "Fort Liard": "6104009", "Fort Providence": "6104014", "Fort Simpson": "6104038", "Jean Marie River": "6104013",
    "Nahanni Butte": "6104010", "Sambaa K'e (Trout Lake)": "6104006", "Sambaa K’e": "6104006", "Wrigley": "6104044",
    "Behchokǫ̀": "6103031", "Gametı̀": "6103049", "Whatı̀": "6103034", "Wekweètì": "6103052", "Enterprise": "6105003",
    "Fort Resolution": "6105018", "Fort Smith": "6105001", "Hay River": "6105016", "Kakisa": "6104005",
    "Łutselkʼe": "6105020", "Kátł'odeeche (Hay River Reserve)": "6104017",
}
CLAVE = lambda s: "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c)).replace("ı", "i").replace("’", "'").replace("ʼ", "'").lower()
POR_CLAVE = {CLAVE(k): v for k, v in COMUNIDAD.items()}
lcd = {}
L = [l.strip() for l in (R2 / "stats-lcd.txt").read_text(encoding="utf-8").split("\n") if l.strip()]
i0 = L.index("High End") + 1
i = i0
while i + 2 < len(L) and CLAVE(L[i]) in POR_CLAVE:
    bajo, alto = L[i + 1], L[i + 2]
    lcd[POR_CLAVE[CLAVE(L[i])]] = None if bajo == ".." else [int(bajo), int(alto)]
    i += 3
fpi = {}
T = (R2 / "stats-cpi-comm.txt").read_text(encoding="utf-8")
for nombre, valor in re.findall(r"\n ?([^\n\[]+?) – \[/en/time-series-retrival/TS\d+\] \(TS\d+\) \n ?(\d+)", T):
    fpi[POR_CLAVE[CLAVE(nombre.strip())]] = int(valor)

# ------------------------------------------------------------ CMHC Yellowknife, octubre de 2025 (tabla 34-10-0133-01)
UNIDADES = [("Bachelor units", "estudio (bachelor)"), ("One bedroom units", "1 habitación"), ("Two bedroom units", "2 habitaciones"), ("Three bedroom units", "3 habitaciones")]
filas = {}
for l in (R2 / "statcan2.txt").read_text(encoding="utf-8").split("\n"):
    c = [x.strip() for x in l.split("|")]
    if len(c) >= 5 and c[0] == "2025" and c[1].startswith("Yellowknife") and c[2] == "Row and apartment structures of three units and over":
        filas[c[3]] = int(c[4]) if c[4] else None
cmhc = {"periodo": "octubre de 2025", "filas": [[es, filas.get(en)] for en, es in UNIDADES]}

salida = {"escuelas": escuelas, "clima": clima, "lcd": lcd, "fpi": fpi, "cmhc": cmhc}
(BASE / "nwt-servicios.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
print("escuelas:", len(escuelas), "| clima:", len(clima), "| costo de vida:", len(lcd), "| alimentos:", len(fpi), "| cmhc:", cmhc)
