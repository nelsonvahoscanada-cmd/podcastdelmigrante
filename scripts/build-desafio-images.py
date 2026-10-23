#!/usr/bin/env python3
"""
build-desafio-images.py — Imagen para compartir de «Desafío 100 Empresas»
=========================================================================
Escribe assets/desafio-100-empresas/social-desafio.jpg (1200 × 630, JPEG):
fondo verde suave del portal, logotipo, el lema en Fraunces y la franja
verde institucional. Sin fondos negros. No contiene cifras (así no queda
desactualizada cuando cambia el contador).

Uso (requiere Pillow):
    python3 scripts/build-desafio-images.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "desafio-100-empresas" / "social-desafio.jpg"
W, H = 1200, 630
VERDE, VERDE_OSCURO, VERDE_SUAVE = (111, 154, 3), (85, 121, 2), (238, 244, 224)
NEGRO, GRIS = (11, 11, 11), (42, 42, 42)


def site_font(kind, size, weight):
    files = {"display": "fraunces-latin-opsz-normal.woff2", "ui": "public-sans-latin-wght-normal.woff2"}
    font = ImageFont.truetype(str(ROOT / "assets" / "fonts" / files[kind]), size)
    axes = [a["name"] for a in font.get_variation_axes()]
    font.set_variation_by_axes([min(144, size) if n == b"Optical Size" else weight for n in axes])
    return font


def main():
    img = Image.new("RGB", (W, H), VERDE_SUAVE)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 12), fill=VERDE)
    draw.rectangle((0, H - 12, W, H), fill=VERDE)
    logo = Image.open(ROOT / "assets" / "logo.png").convert("RGBA")
    logo.thumbnail((96, 96), Image.LANCZOS)
    img.paste(logo, (72, 64), logo)
    draw.text((72 + logo.width + 20, 78), "El Podcast del Migrante", font=site_font("ui", 26, 700), fill=NEGRO)
    draw.text((72 + logo.width + 20, 112), "Magazine", font=site_font("ui", 20, 700), fill=VERDE_OSCURO)
    draw.text((72, 236), "DESAFÍO 100 EMPRESAS", font=site_font("ui", 26, 700), fill=VERDE_OSCURO)
    t = site_font("display", 78, 600)
    draw.text((72, 284), "100 empresarios.", font=t, fill=NEGRO)
    draw.text((72, 372), "100 historias.", font=t, fill=NEGRO)
    draw.text((72, 460), "Un legado.", font=t, fill=VERDE_OSCURO)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "JPEG", quality=86, optimize=True, progressive=True)
    print(f"escrito {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
