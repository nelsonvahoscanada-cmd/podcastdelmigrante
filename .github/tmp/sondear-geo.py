import json, urllib.parse, urllib.request, csv, io, zipfile
UA = {"User-Agent": "Mozilla/5.0 (verificacion de datos; podcastdelmigrante.com)"}
def get(u, t=300):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t) as r:
        return r.read()
WFS = "https://openmaps.gov.bc.ca/geo/pub/wfs"
for capa in ["WHSE_HUMAN_CULTURAL_ECONOMIC.CEN_CENSUS_SUBDIVSIONS_SVW", "WHSE_HUMAN_CULTURAL_ECONOMIC.CEN_CENSUS_DIVISIONS_SVW", "WHSE_HUMAN_CULTURAL_ECONOMIC.CEN_ECONOMIC_REGIONS_SVW", "WHSE_HUMAN_CULTURAL_ECONOMIC.CEN_PROF_CSD_GENERAL_SV", "WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP", "WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_ELECTORAL_AREAS_SP", "WHSE_IMAGERY_AND_BASE_MAPS.GSR_SCHOOLS_K_TO_12_SVW", "WHSE_IMAGERY_AND_BASE_MAPS.GSR_HOSPITALS_SVW"]:
    try:
        q = {"service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeName": capa, "outputFormat": "application/json", "count": 2, "srsName": "EPSG:4326"}
        d = json.loads(get(WFS + "?" + urllib.parse.urlencode(q)))
        f = d["features"][0]
        print("OK", capa, "total:", d.get("numberMatched"), "geom:", f["geometry"]["type"] if f.get("geometry") else None)
        print("   ", {k: v for k, v in f["properties"].items() if not isinstance(v, (dict, list))})
    except Exception as e:
        print("ERROR", capa, e)
GEO = "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer"
for u in [GEO + "?f=json", GEO + "/9?f=json", GEO + "/9/query?where=1%3D1&returnCountOnly=true&f=json", "https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Digital_boundary_files/MapServer/9?f=json"]:
    try:
        print("OK", u, get(u)[:300])
    except Exception as e:
        print("ERROR", u, e)
for pkg in ["census-geographic-attribute-file", "current-census-subdivision-boundaries", "census-profiles-for-bc-census-subdivisions-2021-census", "hospitals-in-bc"]:
    try:
        d = json.loads(get("https://catalogue.data.gov.bc.ca/api/3/action/package_show?id=" + pkg))["result"]
        print("PKG", pkg, "|", d["title"], "|", d.get("metadata_modified"))
        for r in d["resources"]:
            print("    ", r.get("name"), r.get("format"), r.get("url"))
    except Exception as e:
        print("ERROR", pkg, e)
for u in ["https://www12.statcan.gc.ca/census-recensement/2021/geo/aip-pia/attribute-attribs/files-fichiers/2021_92-151_X.zip"]:
    try:
        b = get(u, 600)
        z = zipfile.ZipFile(io.BytesIO(b))
        print("GAF OK", len(b), z.namelist())
    except Exception as e:
        print("ERROR GAF", u, e)
