#!/usr/bin/env python3
"""
build-canada-datos-images.py — Imágenes para compartir de «Canadá en Datos»
======================================================================
Escribe, 1200 × 630 px (JPEG), con la identidad del Magazine (fondo claro,
verde institucional #6f9a03, Fraunces y Public Sans):

  assets/canada-en-datos/social-canada-en-datos.jpg   portada del módulo
  assets/canada-en-datos/social-<perfil>.jpg          una por ficha provincial
  assets/canada-en-datos/<provincia>/<localidad>.jpg  una por localidad
                                                      (plantilla automática)

Van en assets/canada-en-datos/ y NO en assets/social/: el generador de las
noticias (build-social-images.py) borra de assets/social/ todo lo que no
sea un artículo o un colaborador.

Diseño: a la izquierda, la marca, el título y el dato principal; a la
derecha, el mapa (Canadá con la provincia resaltada, o la provincia con la
ubicación de la localidad). Los mapas salen de la misma geometría oficial
que usan las páginas. Sin fotografías: no hay derechos de terceros.

Uso (requiere Pillow, igual que build-social-images.py):
    python3 scripts/build-canada-datos-images.py            todas
    python3 scripts/build-canada-datos-images.py --solo-provincias
"""

import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "canada-en-datos"
W, H = 1200, 630
FONDO = (247, 246, 242)
BLANCO = (255, 255, 255)
TEXTO = (17, 17, 17)
GRIS = (88, 88, 84)
VERDE = (111, 154, 3)          # #6f9a03, verde institucional
VERDE_OSCURO = (85, 121, 2)    # #557902
VERDE_SUAVE = (226, 236, 200)
REGION = (222, 221, 214)
BORDE = (200, 199, 190)
IZQ = 620                      # ancho de la columna de texto
CAJA = (IZQ + 10, 40, W - 40, H - 58)   # recuadro del mapa


def node_json(code):
    out = subprocess.run(["node", "--input-type=module", "-e", code], cwd=ROOT, check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def load_data():
    code = (
        "import fs from 'node:fs'; import vm from 'node:vm'; const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync('js/canada-datos.js','utf8')+';globalThis.__D={CD_REGIONS,CD_PROFILES};',c);"
        "process.stdout.write(JSON.stringify(c.__D));"
    )
    return node_json(code)


def load_localidades():
    return node_json("import { manifiestoImagenes } from './scripts/build-canada-datos.mjs'; process.stdout.write(JSON.stringify(manifiestoImagenes()));")


def site_font(kind, size, weight):
    files = {"display": "fraunces-latin-opsz-normal.woff2", "ui": "public-sans-latin-wght-normal.woff2"}
    font = ImageFont.truetype(str(ROOT / "assets" / "fonts" / files[kind]), size)
    axes = [a["name"] for a in font.get_variation_axes()]
    font.set_variation_by_axes([min(144, size) if n == b"Optical Size" else weight for n in axes])
    return font


def anillos_relativos(d):
    """Anillos absolutos de un trazo «M x y l dx dy … z» (mapa de Canadá)."""
    out = []
    for part in re.findall(r"M[^M]+", d):
        nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", part)]
        x, y = nums[0], nums[1]
        ring = [(x, y)]
        for i in range(2, len(nums), 2):
            x, y = x + nums[i], y + nums[i + 1]
            ring.append((x, y))
        out.append(ring)
    return out


def anillos_absolutos(d):
    """Anillos de un trazo «Mx,yLx,y…Z» (mapas de provincia)."""
    out = []
    for part in re.findall(r"M[^M]+", d):
        nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", part)]
        out.append([(nums[i], nums[i + 1]) for i in range(0, len(nums) - 1, 2)])
    return out


def encuadre(ancho, alto):
    x0, y0, x1, y1 = CAJA
    pad = 26
    s = min((x1 - x0 - 2 * pad) / ancho, (y1 - y0 - 2 * pad) / alto)
    ox = x0 + (x1 - x0 - ancho * s) / 2
    oy = y0 + (y1 - y0 - alto * s) / 2
    return s, ox, oy


def dibuja_anillos(draw, anillos, s, ox, oy, relleno, borde, ancho_borde=1):
    for ring in anillos:
        pts = [(ox + x * s, oy + y * s) for x, y in ring]
        if len(pts) >= 3:
            draw.polygon(pts, fill=relleno, outline=borde, width=ancho_borde)


def base_lienzo():
    img = Image.new("RGB", (W, H), FONDO)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(CAJA, radius=18, fill=BLANCO, outline=BORDE, width=2)
    draw.rectangle((0, H - 14, W, H), fill=VERDE)
    return img


def wrap(draw, text, font, width):
    lines, line = [], ""
    for word in text.split():
        test = (line + " " + word).strip()
        if draw.textlength(test, font=font) <= width:
            line = test
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def textos(img, kicker, titulo, subtitulo, dato, ruta):
    draw = ImageDraw.Draw(img)
    logo = Image.open(ROOT / "assets" / "logo.png").convert("RGBA")
    logo.thumbnail((84, 84), Image.LANCZOS)
    img.paste(logo, (56, 44), logo)
    draw.text((56 + logo.width + 16, 54), "El Podcast del Migrante", font=site_font("ui", 24, 800), fill=TEXTO)
    draw.text((56 + logo.width + 16, 86), "Magazine · Canadá en Datos", font=site_font("ui", 19, 600), fill=VERDE_OSCURO)

    y = 196
    k = site_font("ui", 20, 800)
    draw.rectangle((56, y + 10, 92, y + 15), fill=VERDE)
    draw.text((104, y), kicker.upper(), font=k, fill=VERDE_OSCURO)
    y += 44
    ancho = IZQ - 56 - 40
    for size in (68, 60, 52, 44):
        tf = site_font("display", size, 650)
        lineas = wrap(draw, titulo, tf, ancho)
        if len(lineas) <= 2:
            break
    for line in lineas[:3]:
        draw.text((56, y), line, font=tf, fill=TEXTO)
        y += int(size * 1.12)
    y += 12
    sf = site_font("ui", 24, 500)
    for line in wrap(draw, subtitulo, sf, ancho)[:2]:
        draw.text((56, y), line, font=sf, fill=GRIS)
        y += 34
    if dato:
        y += 8
        df = site_font("ui", 24, 750)
        for line in wrap(draw, dato, df, ancho)[:2]:
            draw.text((56, y), line, font=df, fill=VERDE_OSCURO)
            y += 34
    rf = site_font("ui", 19, 650)
    draw.text((56, H - 62), ruta, font=rf, fill=GRIS)


# ------------------------------------------------------------------ Canadá y provincias
def tarjeta_canada(geo, destacado, kicker, titulo, subtitulo, dato, ruta):
    img = base_lienzo()
    draw = ImageDraw.Draw(img)
    s, ox, oy = encuadre(geo["width"], geo["height"])
    for code, d in geo["paths"].items():
        dibuja_anillos(draw, anillos_relativos(d), s, ox, oy, VERDE if code == destacado else REGION, BLANCO)
    if destacado:
        for ring in anillos_relativos(geo["paths"][destacado]):
            pts = [(ox + x * s, oy + y * s) for x, y in ring]
            draw.line(pts + [pts[0]], fill=VERDE_OSCURO, width=3)
    textos(img, kicker, titulo, subtitulo, dato, ruta)
    return img


# ------------------------------------------------------------------ Localidades (plantilla)
class Provincia:
    def __init__(self, m):
        self.m = m
        mapa = m["mapa"]
        self.s, self.ox, self.oy = encuadre(mapa["ancho"], mapa["alto"])
        self.base = base_lienzo()
        draw = ImageDraw.Draw(self.base)
        for r in mapa["regiones"]:
            dibuja_anillos(draw, anillos_absolutos(r["d"]), self.s, self.ox, self.oy, VERDE_SUAVE, BLANCO)

    def tarjeta(self, loc):
        img = self.base.copy()
        draw = ImageDraw.Draw(img)
        x, y = self.ox + loc["x"] * self.s, self.oy + loc["y"] * self.s
        for radio, color in ((19, BLANCO), (14, VERDE_OSCURO), (8, VERDE), (3, BLANCO)):
            draw.ellipse((x - radio, y - radio, x + radio, y + radio), fill=color)
        nombre = self.m["nombre"]
        textos(img, f"Canadá en Datos · {nombre}", loc["n"], f"{loc['tipo']}, {nombre}", loc["dato"], f"podcastdelmigrante.com/canada-en-datos/{self.m['provincia']}/{loc['s']}")
        return img


def guardar(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=75, optimize=True, progressive=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    data = load_data()
    geo = json.loads((ROOT / "scripts" / "canada-en-datos" / "mapa-canada.json").read_text())
    guardar(tarjeta_canada(geo, None, "Canadá en Datos · Descubre tu Canadá", "Provincias y territorios de Canadá", "Herramienta gratuita y en español, con datos oficiales para inmigrantes.", "Ciudades, empleo, vivienda, clima y más", "podcastdelmigrante.com/canada-en-datos"), OUT / "social-canada-en-datos.jpg")
    print("escrito    assets/canada-en-datos/social-canada-en-datos.jpg")
    for r in data["CD_REGIONS"]:
        if r.get("profile"):
            tipo = "provincia" if r["type"] == "provincia" else "territorio"
            guardar(tarjeta_canada(geo, r["code"], "Canadá en Datos", f"Conoce {r['name']}", f"Guía de la {tipo} para inmigrantes y recién llegados.", "Empleo, vivienda, salud, inmigración y ciudades", f"podcastdelmigrante.com/canada-en-datos/{r['profile']}"), OUT / f"social-{r['profile']}.jpg")
            print(f"escrito    assets/canada-en-datos/social-{r['profile']}.jpg")
    if "--solo-provincias" in sys.argv:
        return
    for m in load_localidades():
        prov = Provincia(m)
        destino = OUT / m["provincia"]
        validos = set()
        for loc in m["localidades"]:
            guardar(prov.tarjeta(loc), destino / f"{loc['s']}.jpg")
            validos.add(f"{loc['s']}.jpg")
        # Imágenes de localidades que ya no existen
        for f in destino.glob("*.jpg"):
            if f.name not in validos:
                f.unlink()
        tam = sum(f.stat().st_size for f in destino.glob("*.jpg"))
        print(f"escrito    assets/canada-en-datos/{m['provincia']}/  {len(validos)} imágenes ({tam // 1024} KB en total)")


if __name__ == "__main__":
    main()
