"""
compactar-pei.py — Reduce pei-fuentes.json a pei-localidades.json (lo que usa la guía)
=====================================================================================
pei-fuentes.json es la descarga casi sin procesar de
obtener-pei-localidades.py y no se guarda en el repositorio. Este script
conserva solo los campos que usa provincias/prince-edward-island.mjs, sin
cambiar ningún valor (no se calcula ni se redondea ninguna cifra oficial).

USO:
  python3 scripts/canada-en-datos/obtener-pei-localidades.py   (en GitHub Actions)
  python3 scripts/canada-en-datos/compactar-pei.py
"""
import json, pathlib

BASE = pathlib.Path(__file__).parent
F = json.loads((BASE / "pei-fuentes.json").read_text(encoding="utf-8"))

C = "Population and dwelling counts (13): "
CAMPOS = {
    "p": C + "Population, 2021 [1]",
    "p16": C + "Population, 2016 [2]",
    "cambio": C + "Population percentage change, 2016 to 2021 [3]",
    "viviendas": C + "Total private dwellings, 2021 [4]",
    "superficie": C + "Land area in square kilometres, 2021 [10]",
    "densidad": C + "Population density per square kilometre, 2021 [11]",
}
censo = lambda dguid: [F["censo"].get(dguid, {}).get(v) for v in CAMPOS.values()]
ca_de = {c: m["CMANAME"] for m in F["cma"] for c in m["csd"]}
er = next(iter(F["er"]))

salida = {
    "consultado": F["consultado"],
    "fuentes": F["fuentes"],
    "provincia": censo("2021A000211"),
    "condados": [[c["CDUID"], c["CDNAME"], censo("2021A0003" + c["CDUID"])] for c in F["cd"]],
    "cd_geo": {c["CDUID"]: c["geo"] for c in F["cd"]},
    "provincia_geo": F["provincia_geo"],
    "er": F["er"],
    "censo_campos": list(CAMPOS),
    "csd": [
        [c["CSDUID"], c["CSDNAME"], c["CSDTYPE"], c["CSDUID"][:4], ca_de.get(c["CSDUID"]), er, c["x"], c["y"], c["lat"], c["lon"], censo(c["DGUID"])]
        for c in F["csd"]
    ],
    "csd_campos": ["id", "nombre", "tipo", "cd", "ca", "er", "x", "y", "lat", "lon", "censo"],
    "cgn": [[g["id"], g["n"], g["t"], g["csd"], g["x"], g["y"], g["lat"], g["lon"], g["fecha"]] for g in F["cgn"]],
    "cgn_campos": ["id", "nombre", "tipo", "csd", "x", "y", "lat", "lon", "fecha"],
    "epa": F["epa"],
    "cmhc": F["cmhc"],
    "hospitales": [[h["facility_name"], h.get("city"), h["csd"], h["lat"], h["lon"]] for h in F.get("salud", []) if h.get("odhf_facility_type") == "Hospitals"],
    "hospitales_campos": ["nombre", "localidad", "csd", "lat", "lon"],
    "escuelas": [
        [e.get("Facility_Name"), e.get("Facility_Type"), e.get("Authority_Name"), "".join("1" if e.get(k) == "1" else "0" for k in ("ISCED010", "ISCED020", "ISCED1", "ISCED2", "ISCED3", "ISCED4Plus")), e.get("csd")]
        for e in F.get("educacion", [])
    ],
    "escuelas_campos": ["nombre", "tipo", "autoridad", "niveles", "csd"],
}
texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
(BASE / "pei-localidades.json").write_text(texto, encoding="utf-8")
print("pei-localidades.json:", len(texto), "bytes")
