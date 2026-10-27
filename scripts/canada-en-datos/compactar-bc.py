"""
compactar-bc.py — Reduce bc-fuentes.json a bc-localidades.json (lo que usa la guía)
==================================================================================
bc-fuentes.json (≈3 MB) es la descarga casi sin procesar de
obtener-bc-localidades.py y no se guarda en el repositorio. Este script
conserva solo los campos que usa provincias/british-columbia.mjs, sin
cambiar ningún valor (no se calcula ni se redondea ninguna cifra oficial).

USO:
  python3 scripts/canada-en-datos/obtener-bc-localidades.py   (en GitHub Actions)
  python3 scripts/canada-en-datos/compactar-bc.py
"""
import json, pathlib

BASE = pathlib.Path(__file__).parent
F = json.loads((BASE / "bc-fuentes.json").read_text(encoding="utf-8"))

# Algunos nombres del Archivo de atributos geográficos llegan con el apóstrofo tipográfico de Windows-1252
arregla = lambda s: s.replace("\x92", "’") if isinstance(s, str) else s

pk = "Population and dwelling counts (7): Population, 2021 [1]"
pk16 = "Population and dwelling counts (7): Population, 2016 [2]"
cdpl = F["censo_dpl"]

salida = {
    "consultado": F["consultado"],
    "fuentes": F["fuentes"],
    "provincia": {k: v for k, v in F["censo"]["2021A000259"].items() if k != "Symbols"},
    "distritos_censo": {k[-4:]: {"GEO": v["GEO"], "p": v.get("Population and dwelling counts (13): Population, 2021 [1]"), "p16": v.get("Population and dwelling counts (13): Population, 2016 [2]")} for k, v in F["censo"].items() if k.startswith("2021A0003")},
    "csd": [
        [c["CENSUS_SUBDIVISION_ID"], c["CENSUS_SUBDIVISION_NAME"], c["CENSUS_SUBDIVISION_TYPE_CODE"], c["CENSUS_DIVISION_ID"], c["CENSUS_METRO_AREA_NAME"], c["ECONOMIC_REGION_ID"], c["x"], c["y"], c["lat"], c["lon"]]
        for c in F["csd"]
    ],
    "csd_campos": ["id", "nombre", "tipo", "cd", "cma", "er", "x", "y", "lat", "lon"],
    "perfil": {
        k: [v.get("POP_TOTAL_2021"), v.get("POP_TOTAL_2016"), v.get("POP_2016_2021_PCT_CHANGE"), v.get("TOTAL_PRIVATE_DWELLINGS"), v.get("LAND_AREA_SQ_KM"), v.get("POP_DENSITY_PER_SQ_KM"), v.get("MEDIAN_MTHLY_SHLTER_COSTS_RNTD"), v.get("MEDIAN_MTHLY_SHLTER_COSTS_OWND"), v.get("GLOBAL_NONRESP_SF_PCT")]
        for k, v in F["perfil"].items()
    },
    "perfil_campos": ["p", "p16", "cambio", "viviendas", "superficie", "densidad", "costo_alquiler", "costo_propietario", "no_respuesta"],
    # Superficie y densidad con decimales de la tabla oficial 98-10-0002-01 (la copia del perfil las redondea a enteros)
    "superficie_censo": {
        k[-7:]: [v.get("Population and dwelling counts (13): Land area in square kilometres, 2021 [10]"), v.get("Population and dwelling counts (13): Population density per square kilometre, 2021 [11]")]
        for k, v in F["censo"].items()
        if k.startswith("2021A0005")
    },
    "cd": F["cd"],
    "er": F["er"],
    "dpl": [
        [d["uid"], arregla(d["n"]), d["tipo"], d["csd"], d["x"], d["y"], d["lat"], d["lon"], (lambda r: int(r[pk]) if r and r.get(pk) not in (None, "") else None)(cdpl.get(d["uid"])), (lambda r: int(r[pk16]) if r and r.get(pk16) not in (None, "") else None)(cdpl.get(d["uid"]))]
        for d in F["dpl"]
    ],
    "dpl_campos": ["uid", "nombre", "tipo", "csd", "x", "y", "lat", "lon", "p", "p16"],
    "bcgnis": [[g["id"], g["n"], g["t"], g["csd"], g["x"], g["y"], g["lat"], g["lon"]] for g in F["bcgnis"]],
    "bcgnis_campos": ["id", "nombre", "tipo", "csd", "x", "y", "lat", "lon"],
    "municipios": [[m["ADMIN_AREA_NAME"], m["ADMIN_AREA_ABBREVIATION"]] for m in F["municipios"]],
    "distritos": [[d["ADMIN_AREA_NAME"], d["ADMIN_AREA_ABBREVIATION"]] for d in F["distritos"]],
    "areas_electorales": [[a["ADMIN_AREA_NAME"], a["ADMIN_AREA_GROUP_NAME"]] for a in F["areas_electorales"]],
    "epa": F["epa"],
    "cmhc": F["cmhc"],
    "hospitales": [[h["OCCUPANT_NAME"], h["LOCALITY"], h["csd"], h["LATITUDE"], h["LONGITUDE"], h["HOURS"], h["WEBSITE_URL"], h["DATE_UPDATED"]] for h in F["hospitales_wfs"]],
    "hospitales_campos": ["nombre", "localidad", "csd", "lat", "lon", "horario", "web", "actualizado"],
    "escuelas": F["escuelas"],
}
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(BASE / "bc-localidades.json").write_text(texto, encoding="utf-8")
print("bc-localidades.json:", len(texto), "bytes")
