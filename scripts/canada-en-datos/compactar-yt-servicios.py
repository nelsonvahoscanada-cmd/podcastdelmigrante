"""
compactar-yt-servicios.py — Datos complementarios de las comunidades de Yukón
==============================================================================
Genera scripts/canada-en-datos/yt-servicios.json, que usa provincias/yukon.mjs:

  escuelas  Base abierta de establecimientos educativos de Statistics Canada (ODEF v2.1, 2022),
            filas de Yukón (yt-fuentes.json). Algunas filas no tienen coordenadas o las tienen
            mal (J.V. Clark School, de Mayo, aparece con las coordenadas de Dawson): se ubican
            en su subdivisión censal por la localidad de su dirección (tabla DIRECCION). Las
            residencias estudiantiles y las escuelas de vuelo se omiten (no son escuelas para
            inscribir a los hijos). La base no incluye todas las escuelas del territorio:
            la página lo advierte y remite al Departamento de Educación.
  clima     Normales climáticas 1991-2020 de Environment and Climate Change Canada (texto de las
            páginas oficiales guardado por obtener-yt-ficha.py), por comunidad.
  cmhc      Alquiler promedio de CMHC en Whitehorse (Statistics Canada, tabla 34-10-0133-01):
            las cifras de 2021 a 2025 están suprimidas («F», poco fiables para publicarse), así
            que la página muestra «Dato no disponible».

USO:
  python3 scripts/canada-en-datos/compactar-yt-servicios.py <carpeta con los textos de la ronda 1>
"""
import json, pathlib, re, sys

BASE = pathlib.Path(__file__).parent
F = json.loads((BASE / "yt-fuentes.json").read_text(encoding="utf-8"))
R1 = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None

# ------------------------------------------------------------ Escuelas (ODEF 2022)
DIRECCION = {
    "Chief Zzeh Gittlit School": "6001043",   # Old Crow
    "Del Van Gorder School": "6001004",       # Faro
    "Eliza Van Bibber School": "6001041",     # Pelly Crossing
    "Ghùch Tlâ Community School": "6001048",  # Carcross
    "J.V. Clark School": "6001022",           # Mayo (302 7th Avenue, Mayo)
    "Khàtìnas.àxh Community School": "6001006",  # Teslin
    "Kluane Lake School": "6001049",          # Destruction Bay
    "Nelnah Bessie John School": "6001042",   # Beaver Creek
    "Ross River School": "6001037",           # Ross River
    "Watson Lake Secondary School": "6001003",  # Watson Lake
    "Wood Street Centre": "6001009",          # Whitehorse (411 Wood Street)
}
OMITIR = {"Alkan Air Flight Training", "Gadzoosdaa Student Residence"}
# École Whitehorse Elementary es una escuela de inmersión en francés del sistema público en inglés,
# no de la Commission scolaire francophone du Yukon, como indica la base.
AUTORIDAD = {"École Whitehorse Elementary School": None}
NIVELES = [("ISCED020", "preescolar"), ("ISCED1", "primaria"), ("ISCED2", "secundaria básica"), ("ISCED3", "secundaria superior"), ("ISCED4Plus", "formación postsecundaria")]
escuelas = []
for e in F["educacion"]:
    if e["Facility_Name"] in OMITIR:
        continue
    csd = DIRECCION.get(e["Facility_Name"]) or e.get("csd")
    if not csd:
        raise SystemExit(f"Escuela sin subdivisión censal: {e['Facility_Name']} ({e.get('Full_Addr')})")
    niveles = [n for k, n in NIVELES if e.get(k) == "1"]
    autoridad = AUTORIDAD.get(e["Facility_Name"], e.get("Authority_Name"))
    escuelas.append({"csd": csd, "nombre": e["Facility_Name"], "niveles": ", ".join(niveles), "francofona": autoridad == "Commission scolaire francophone du Yukon"})
escuelas.sort(key=lambda x: (x["csd"], x["nombre"]))

# ------------------------------------------------------------ Normales 1991-2020 (ECCC)
# Subdivisión censal → identificador climático de la estación de Environment Canada en la comunidad
ESTACIONES = {
    "6001009": "2101300",  # Whitehorse
    "6001029": "2100402",  # Dawson
    "6001003": "2101200",  # Watson Lake
    "6001018": "2100630",  # Haines Junction
    "6001012": "2100300",  # Carmacks
    "6001004": "2100517",  # Faro
    "6001022": "2100700",  # Mayo
    "6001043": "2100800",  # Old Crow
    "6001006": "2101100",  # Teslin
    "6001039": "2100179",  # Burwash Landing (estación Burwash)
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
T = (R1 / "normales-1991-2020.txt").read_text(encoding="utf-8")
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
    clima[csd] = {"estacion": estacion.title(), "enero": temp[0], "julio": temp[6], "anual": temp[12],
                  "nieve": nieve[12] if nieve else None, "precipitacion": prec[12] if prec else None, "url": url}

# ------------------------------------------------------------ CMHC Whitehorse (tabla 34-10-0133-01)
UNIDADES = [("Bachelor units", "estudio (bachelor)"), ("One bedroom units", "1 habitación"), ("Two bedroom units", "2 habitaciones"), ("Three bedroom units", "3 habitaciones")]
filas = {}
for l in (R1 / "statcan2.txt").read_text(encoding="utf-8").split("\n"):
    c = [x.strip() for x in l.split("|")]
    if len(c) >= 6 and c[0] == "2025" and c[1].startswith("Whitehorse") and c[2] == "Row and apartment structures of three units and over":
        filas[c[3]] = int(c[4]) if c[4] else None
cmhc = {"periodo": "octubre de 2025", "filas": [[es, filas.get(en)] for en, es in UNIDADES]}

salida = {"escuelas": escuelas, "clima": clima, "cmhc": cmhc}
(BASE / "yt-servicios.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
print("escuelas:", len(escuelas), "| clima:", len(clima), "| cmhc:", cmhc)
