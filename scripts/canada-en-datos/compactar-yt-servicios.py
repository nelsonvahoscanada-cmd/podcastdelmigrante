"""
compactar-yt-servicios.py — Datos complementarios de las comunidades de Yukón
==============================================================================
Genera scripts/canada-en-datos/yt-servicios.json, que usa provincias/yukon.mjs:

  escuelas  Lista oficial de escuelas del Gobierno de Yukón, con su sistema escolar (página
            «Register your child for school»). Se prefirió a la base abierta ODEF de Statistics
            Canada (2022), que omite escuelas de Whitehorse y ubica mal algunas (J.V. Clark School,
            de Mayo, aparece con las coordenadas de Dawson).
  clima     Normales climáticas 1991-2020 de Environment and Climate Change Canada (texto de las
            páginas oficiales guardado por obtener-yt-ficha.py), por comunidad.
  cmhc      Alquiler promedio de CMHC en Whitehorse (Statistics Canada, tabla 34-10-0133-01):
            las cifras de 2021 a 2025 están suprimidas («F», poco fiables para publicarse), así
            que la página muestra «Dato no disponible».

USO:
  python3 scripts/canada-en-datos/compactar-yt-servicios.py <carpeta de la ronda 1> <carpeta de la ronda 3>
"""
import json, pathlib, re, sys, unicodedata

BASE = pathlib.Path(__file__).parent
F = json.loads((BASE / "yt-fuentes.json").read_text(encoding="utf-8"))
R1 = pathlib.Path(sys.argv[1])  # ronda 1: normales y tablas de Statistics Canada
R3 = pathlib.Path(sys.argv[2])  # ronda 3: páginas de yukon.ca

# ------------------------------------------------------------ Escuelas (Gobierno de Yukón, «Register your child for school»)
# Lista oficial de escuelas y sus zonas de asistencia (copia del Internet Archive guardada por
# obtener-yt-ficha2.py, clave ed-registro). Cada escuela se ubica en la subdivisión censal de su
# comunidad. École Nomade atiende a todo el territorio (no tiene comunidad) y no se lista por comunidad.
COMUNIDAD = {
    "Christ the King Elementary School": "6001009", "Holy Family Elementary School": "6001009",
    "St. Francis of Assisi Catholic Secondary School": "6001009", "École Whitehorse Elementary School": "6001009",
    "Selkirk Elementary School": "6001009", "F.H. Collins Secondary School": "6001009",
    "Centre scolaire secondaire communautaire Paul-Émile Mercier (CSSC Mercier)": "6001009", "École Émilie-Tremblay": "6001009",
    "Programme en français de Dawson": "6001029", "Chief Zzeh Gittlit School": "6001043", "Eliza Van Bibber School": "6001041",
    "Grey Mountain Primary School": "6001009", "Ghùch Tlâ Community School": "6001048", "Johnson Elementary School": "6001003",
    "Kluane Lake School": "6001049", "Watson Lake Secondary School": "6001003", "Nelnah Bessie John School": "6001042",
    "Ross River School": "6001037", "St. Elias Community School": "6001018", "Takhini Elementary School": "6001009",
    "Dámbü Tän Kets’ádań Kų̀ – Cliff Trail Elementary School": "6001009", "Elijah Smith Elementary School": "6001009",
    "Golden Horn Elementary School": "6001009", "Hidden Valley Elementary School": "6001009", "J.V. Clark School": "6001022",
    "Jack Hulland Elementary School": "6001009", "Porter Creek Secondary School": "6001009", "Robert Service School": "6001029",
    "Tantalus School": "6001012", "Del Van Gorder School": "6001004", "Khàtìnas.àxh Community School": "6001006",
}
COMUNIDAD = {unicodedata.normalize("NFC", k): v for k, v in COMUNIDAD.items()}
SISTEMA = {
    "Catholic schools": "escuela católica (sistema público)",
    "French immersion schools": "programa en inglés e inmersión en francés",
    "French first language schools": "en francés (Commission scolaire francophone du Yukon)",
    "First Nation School Board schools": "Junta Escolar de las Primeras Naciones (First Nation School Board)",
    "Yukon Education schools": "Departamento de Educación de Yukón",
}
SOLO_INMERSION = {"École Whitehorse Elementary School"}
T = (R3 / "ed-registro.txt").read_text(encoding="utf-8")
T = T[T.index("School attendance area"):T.rindex("Register your child for Kindergarten")]
escuelas, seccion = [], None
for l in T.split("\n"):
    l = l.strip()
    if l in SISTEMA:
        seccion = l
        continue
    m = re.match(r"\[https://yukon\.ca/en/places/[^\]]+\] (.+)$", l)
    if not m:
        continue
    nombre = unicodedata.normalize("NFC", m.group(1).strip())
    if nombre == "École Nomade":
        continue
    if nombre not in COMUNIDAD:
        raise SystemExit(f"Escuela sin comunidad: {nombre}")
    sistema = "inmersión en francés" if nombre in SOLO_INMERSION else SISTEMA[seccion]
    escuelas.append({"csd": COMUNIDAD[nombre], "nombre": nombre, "sistema": sistema})
faltan = set(COMUNIDAD) - {e["nombre"] for e in escuelas}
if faltan:
    raise SystemExit(f"Escuelas de la tabla que ya no están en la página oficial: {sorted(faltan)}")
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
