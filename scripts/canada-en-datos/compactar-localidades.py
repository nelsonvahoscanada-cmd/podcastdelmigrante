"""
compactar-localidades.py — Reduce <abrev>-fuentes.json a <abrev>-localidades.json (lo que usa la guía)
=====================================================================================================
Versión general de compactar-sk.py. <abrev>-fuentes.json es la descarga casi
sin procesar de obtener-localidades-censo.py y no se guarda en el
repositorio. Este script conserva solo los campos que usa el módulo de la
provincia, sin cambiar ningún valor (no se calcula ni se redondea ninguna
cifra oficial).

USO:
  python3 scripts/canada-en-datos/obtener-localidades-censo.py mb   (en GitHub Actions)
  python3 scripts/canada-en-datos/compactar-localidades.py mb
"""
import json, pathlib, sys

AB = sys.argv[1]
PR = {"mb": "46", "qc": "24"}[AB]
BASE = pathlib.Path(__file__).parent
F = json.loads((BASE / f"{AB}-fuentes.json").read_text(encoding="utf-8"))

C = "Population and dwelling counts (13): "
CAMPOS = {
    "p": C + "Population, 2021 [1]",
    "p16": C + "Population, 2016 [2]",
    "cambio": C + "Population percentage change, 2016 to 2021 [3]",
    "viviendas": C + "Total private dwellings, 2021 [4]",
    "superficie": C + "Land area in square kilometres, 2021 [10]",
    "densidad": C + "Population density per square kilometre, 2021 [11]",
}
D = "Population and dwelling counts (7): "
CAMPOS_DPL = {
    "p": D + "Population, 2021 [1]",
    "p16": D + "Population, 2016 [2]",
    "cambio": D + "Population percentage change, 2016 to 2021 [3]",
    "viviendas": D + "Total private dwellings, 2021 [4]",
    "superficie": D + "Land area in square kilometres, 2021 [6]",
    "densidad": D + "Population density per square kilometre, 2021 [7]",
}
censo = lambda dguid: [F["censo"].get(dguid, {}).get(v) for v in CAMPOS.values()]
censo_dpl = lambda dguid: [F["censo_dpl"].get(dguid, {}).get(v) for v in CAMPOS_DPL.values()]
ca_de = {c: m["CMANAME"] for m in F["cma"] for c in m["csd"]}

salida = {
    "consultado": F["consultado"],
    "fuentes": F["fuentes"],
    "provincia": censo("2021A0002" + PR),
    "divisiones": [[c["CDUID"], c["CDNAME"], c["ERUID"], censo("2021A0003" + c["CDUID"])] for c in F["cd"]],
    "cd_geo": {c["CDUID"]: c["geo"] for c in F["cd"]},
    "er": F["er"],
    "censo_campos": list(CAMPOS),
    "csd": [
        [c["CSDUID"], c["CSDNAME"], c["CSDTYPE"], c["CSDUID"][:4], ca_de.get(c["CSDUID"]), c["ERUID"], c["x"], c["y"], c["lat"], c["lon"], censo(c["DGUID"])]
        for c in F["csd"]
    ],
    "csd_campos": ["id", "nombre", "tipo", "cd", "ca", "er", "x", "y", "lat", "lon", "censo"],
    "dpl": [[d["DPLUID"], d["DPLNAME"], d["DPLTYPE"], d["csd"], d["x"], d["y"], d["lat"], d["lon"], censo_dpl(d["DGUID"])] for d in F["dpl"]],
    "dpl_campos": ["uid", "nombre", "tipo", "csd", "x", "y", "lat", "lon", "censo"],
    "cgn": [[g["id"], g["n"], g["t"], g["csd"], g["x"], g["y"], g["lat"], g["lon"]] for g in F["cgn"]],
    "cgn_campos": ["id", "nombre", "tipo", "csd", "x", "y", "lat", "lon"],
    "epa": F["epa"],
    "cmhc": F["cmhc"],
    "salud": [[h["facility_name"], h.get("city"), h.get("source_facility_type"), h.get("provider"), h["csd"], h["lat"], h["lon"]] for h in F.get("salud", []) if h.get("odhf_facility_type") == "Hospitals" or "regional health centre" in h["facility_name"]],
    "salud_campos": ["nombre", "localidad", "tipo_fuente", "proveedor", "csd", "lat", "lon"],
    "escuelas": [
        [e.get("Facility_Name"), e.get("Facility_Type"), e.get("Authority_Name"), "".join("1" if e.get(k) == "1" else "0" for k in ("ISCED010", "ISCED020", "ISCED1", "ISCED2", "ISCED3", "ISCED4Plus")), e.get("csd")]
        for e in F.get("educacion", [])
    ],
    "escuelas_campos": ["nombre", "tipo", "autoridad", "niveles", "csd"],
}
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(BASE / f"{AB}-localidades.json").write_text(texto, encoding="utf-8")
print(f"{AB}-localidades.json:", len(texto), "bytes")
