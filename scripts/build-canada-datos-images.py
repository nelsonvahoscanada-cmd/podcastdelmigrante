#!/usr/bin/env python3
"""
build-canada-datos-images.py — Imágenes para compartir de «Canadá en Datos»
======================================================================
Escribe, 1200 × 630 px (JPEG):

  assets/canada-en-datos/social-canada-en-datos.jpg   portada del módulo
  assets/canada-en-datos/social-<perfil>.jpg          una por ficha (alberta)

Van en assets/canada-en-datos/ y NO en assets/social/: el generador de las
noticias (build-social-images.py) borra de assets/social/ todo lo que no
sea un artículo o un colaborador.

Diseño: panel negro con el logotipo original, el título en Fraunces y el
acento verde #8DC63F; a la derecha, el mapa de Canadá (misma geometría
que la página) con la región de la ficha resaltada.

Uso (requiere Pillow, igual que build-social-images.py):
    python3 scripts/build-canada-datos-images.py
"""

import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "canada-en-datos"
W, H = 1200, 630
NEGRO, BLANCO, ACENTO = (11, 11, 11), (255, 255, 255), (141, 198, 63)
GRIS_REGION, GRIS_FONDO, GRIS_TEXTO = (214, 213, 207), (242, 241, 237), (210, 210, 210)
PANEL = 500


def load_data():
    code = (
        "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+';globalThis.__D={CD_REGIONS,CD_PROFILES};',c);"
        "process.stdout.write(JSON.stringify(c.__D));"
    )
    out = subprocess.run(["node", "-e", code, str(ROOT / "js" / "canada-datos.js")], check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def site_font(kind, size, weight):
    files = {"display": "fraunces-latin-opsz-normal.woff2", "ui": "public-sans-latin-wght-normal.woff2"}
    font = ImageFont.truetype(str(ROOT / "assets" / "fonts" / files[kind]), size)
    axes = [a["name"] for a in font.get_variation_axes()]
    font.set_variation_by_axes([min(144, size) if n == b"Optical Size" else weight for n in axes])
    return font


def rings(d):
    """Anillos absolutos de un trazo «M x y l dx dy … z»."""
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


def draw_map(img, geo, highlight):
    area_x, area_y, area_w, area_h = PANEL + 30, 40, W - PANEL - 60, H - 80
    s = min(area_w / geo["width"], area_h / geo["height"])
    ox = area_x + (area_w - geo["width"] * s) / 2
    oy = area_y + (area_h - geo["height"] * s) / 2
    draw = ImageDraw.Draw(img)
    for code, d in geo["paths"].items():
        color = ACENTO if code == highlight else GRIS_REGION
        for ring in rings(d):
            pts = [(ox + x * s, oy + y * s) for x, y in ring]
            if len(pts) >= 3:
                draw.polygon(pts, fill=color, outline=BLANCO)
    if highlight:
        for ring in rings(geo["paths"][highlight]):
            pts = [(ox + x * s, oy + y * s) for x, y in ring]
            draw.line(pts + [pts[0]], fill=NEGRO, width=3)


def wrap(draw, text, font, width):
    lines, line = [], ""
    for word in text.split():
        test = (line + " " + word).strip()
        if draw.textlength(test, font=font) <= width:
            line = test
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def card(geo, kicker, title, subtitle, highlight):
    img = Image.new("RGB", (W, H), GRIS_FONDO)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, PANEL, H), fill=NEGRO)
    draw_map(img, geo, highlight)

    # Logotipo original sobre una placa blanca (el logo es oscuro y no se lee sobre negro)
    logo = Image.open(ROOT / "assets" / "logo.png").convert("RGBA")
    logo.thumbnail((92, 92), Image.LANCZOS)
    plate = Image.new("RGBA", (logo.width + 20, logo.height + 20), BLANCO + (255,))
    plate.alpha_composite(logo, (10, 10))
    img.paste(plate.convert("RGB"), (48, 44))
    brand = site_font("ui", 22, 700)
    draw.text((48 + plate.width + 18, 60), "El Podcast del Migrante", font=brand, fill=BLANCO)
    draw.text((48 + plate.width + 18, 90), "Magazine", font=site_font("ui", 18, 600), fill=ACENTO)

    y = 230
    k = site_font("ui", 20, 700)
    draw.rectangle((48, y + 11, 78, y + 15), fill=ACENTO)
    draw.text((90, y), kicker.upper(), font=k, fill=ACENTO)
    y += 46
    tf = site_font("display", 56, 600)
    for line in wrap(draw, title, tf, PANEL - 96)[:3]:
        draw.text((48, y), line, font=tf, fill=BLANCO)
        y += 64
    y += 10
    sf = site_font("ui", 22, 500)
    for line in wrap(draw, subtitle, sf, PANEL - 96)[:3]:
        draw.text((48, y), line, font=sf, fill=GRIS_TEXTO)
        y += 32
    draw.text((48, H - 52), "podcastdelmigrante.com", font=site_font("ui", 18, 600), fill=GRIS_TEXTO)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    data = load_data()
    geo = json.loads((ROOT / "scripts" / "canada-en-datos" / "mapa-canada.json").read_text())
    imgs = {
        "social-canada-en-datos.jpg": card(geo, "Canadá en Datos", "Provincias y territorios de Canadá", "Hora local, capitales e información oficial para recién llegados.", None),
    }
    for r in data["CD_REGIONS"]:
        if r.get("profile"):
            imgs[f"social-{r['profile']}.jpg"] = card(geo, "Canadá en Datos", f"{r['name']} en datos", "Empleo, vivienda, salud, inmigración y primeros pasos para recién llegados.", r["code"])
    for name, img in imgs.items():
        path = OUT / name
        img.save(path, "JPEG", quality=86, optimize=True, progressive=True)
        print(f"escrito    assets/canada-en-datos/{name}  ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
