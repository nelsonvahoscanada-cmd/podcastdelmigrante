#!/usr/bin/env python3
"""
generar-geometria.py — Trazos SVG del mapa de «Canadá en Datos»
======================================================================
Se ejecuta UNA vez (o cuando se quiera cambiar la geometría); el
resultado, mapa-canada.json, es lo que usa scripts/build-canada-datos.mjs.
No es parte del sitio publicado ni de la compilación.

Entrada: ne_50m_admin_1_states_provinces.geojson de Natural Earth
(dominio público): https://github.com/nvkelso/natural-earth-vector
Proyección: cónica conforme de Lambert con los parámetros de
Statistics Canada (EPSG:3347). Simplificación Douglas-Peucker.

Uso (sin dependencias, Python 3):
    python3 generar-geometria.py ENTRADA.geojson SALIDA.json [TOLERANCIA] [AREA_MIN]
(Después se le agrega el campo "_fuente" con la atribución.)
"""
import json, math, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
feats = [f for f in d['features'] if f['properties'].get('iso_a2') == 'CA']
# EPSG:3347 Statistics Canada Lambert (NAD83): lat1 49, lat2 77, lat0 63.390675, lon0 -91.866667
R = 6378137.0
phi1, phi2, phi0, lam0 = map(math.radians, (49, 77, 63.390675, -91.866667))
n = math.log(math.cos(phi1)/math.cos(phi2)) / math.log(math.tan(math.pi/4+phi2/2)/math.tan(math.pi/4+phi1/2))
F = math.cos(phi1)*math.tan(math.pi/4+phi1/2)**n/n
rho0 = R*F/math.tan(math.pi/4+phi0/2)**n
def proj(lon, lat):
    phi, lam = math.radians(lat), math.radians(lon)
    rho = R*F/math.tan(math.pi/4+phi/2)**n
    th = n*(lam-lam0)
    return rho*math.sin(th), rho0-rho*math.cos(th)
def area(r):
    return 0.5*sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r)))
def dp(pts, tol):
    if len(pts) < 3: return pts
    keep=[False]*len(pts); keep[0]=keep[-1]=True; stack=[(0,len(pts)-1)]
    while stack:
        a,b=stack.pop(); ax,ay=pts[a]; bx,by=pts[b]; dx,dy=bx-ax,by-ay; L=math.hypot(dx,dy) or 1e-9
        best,bi=-1,None
        for i in range(a+1,b):
            px,py=pts[i]; dd=abs(dy*px-dx*py+bx*ay-by*ax)/L if (dx or dy) else math.hypot(px-ax,py-ay)
            if dd>best: best,bi=dd,i
        if bi is not None and best>tol: keep[bi]=True; stack+= [(a,bi),(bi,b)]
    return [p for p,k in zip(pts,keep) if k]
regions = {}
for f in feats:
    g=f['geometry']; polys = g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    regions[f['properties']['postal']] = [[ [proj(*c) for c in ring] for ring in poly] for poly in polys]
xs=[p[0] for r in regions.values() for poly in r for ring in poly for p in ring]
ys=[p[1] for r in regions.values() for poly in r for ring in poly for p in ring]
W=1000; pad=10; s=(W-2*pad)/(max(xs)-min(xs)); H=round((max(ys)-min(ys))*s+2*pad)
def tx(p): return ((p[0]-min(xs))*s+pad, (max(ys)-p[1])*s+pad)
TOL=float(sys.argv[3]) if len(sys.argv)>3 else 0.8
MINA=float(sys.argv[4]) if len(sys.argv)>4 else 6.0
paths={}; total=0
for code, polys in regions.items():
    parts=[]
    for poly in polys:
        for k,ring in enumerate(poly):
            r=[tx(p) for p in ring]
            a=abs(area(r))
            if a < (MINA if k==0 else MINA*2) and not (code=='PE'): continue
            r=dp(r, TOL)
            if len(r)<4: continue
            pts=[(round(x,1),round(y,1)) for x,y in r[:-1]]
            seg=f"M{pts[0][0]:g} {pts[0][1]:g}"
            prev=pts[0]; rel=[]
            for x,y in pts[1:]:
                rel.append(f"{round(x-prev[0],1):g} {round(y-prev[1],1):g}"); prev=(x,y)
            parts.append(seg+"l"+" ".join(rel)+"z")
    paths[code]="".join(parts); total+=len(paths[code])
json.dump({"width":W,"height":H,"paths":paths}, open(out,"w"))
print("viewBox 0 0",W,H,"bytes",total, {k:len(v) for k,v in paths.items()})
