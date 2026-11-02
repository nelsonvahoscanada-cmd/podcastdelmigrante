#!/usr/bin/env python3
"""
portada-2026-10.py — Portada de la Edición 01 (octubre de 2026)
================================================================
Genera, con la identidad visual del Magazine (negro, blanco y verde;
Fraunces y Public Sans, las tipografías del sitio) y el logotipo oficial
(assets/logo.png, sin modificarlo):

  assets/ediciones/2026-10/portada.jpg          1200 × 1600 (vertical)
  assets/ediciones/2026-10/portada-social.jpg   1200 × 630  (para compartir)

Sin fotografías ni imágenes generadas: solo tipografía, logotipo y color.
Los titulares del índice son los de los artículos originales, abreviados.

Uso: python3 scripts/ediciones/portada-2026-10.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "ediciones" / "2026-10"
NEGRO, BLANCO, VERDE, VERDE_CLARO, GRIS = (11, 11, 11), (255, 255, 255), (111, 154, 3), (130, 178, 4), (217, 217, 214)

NUMERO = "EDICIÓN 01 · OCTUBRE 2026"
TEMA = [("Nace una ", BLANCO), ("nueva voz", VERDE_CLARO), (" para los migrantes en Canadá", BLANCO)]
INDICE = [
    "El frío no pudo apagar mi señal, por Nelson Vahos",
    "Héctor Rivero, el Santa Latino de Canadá",
    "Diana Cardona y sus estrategias digitales",
    "Un médico de familia latino llega a Brooks",
    "Express Entry: nuevos puntos desde noviembre",
]


def fuente(tipo, tam, peso):
    archivo = {"display": "fraunces-latin-opsz-normal.woff2", "ui": "public-sans-latin-wght-normal.woff2"}[tipo]
    f = ImageFont.truetype(str(ROOT / "assets" / "fonts" / archivo), tam)
    ejes = [a["name"] for a in f.get_variation_axes()]
    f.set_variation_by_axes([min(144, tam) if n == b"Optical Size" else peso for n in ejes])
    return f


def palabras_en_lineas(draw, trozos, f, ancho):
    """Reparte trozos de color en líneas que caben en `ancho`; devuelve [[(texto, color)…]…]."""
    tokens = []
    for texto, color in trozos:
        for i, p in enumerate(texto.split(" ")):
            if p:
                tokens.append((p, color))
    lineas, actual = [], []
    for p, c in tokens:
        prueba = " ".join(t for t, _ in actual + [(p, c)])
        if actual and draw.textlength(prueba, font=f) > ancho:
            lineas.append(actual)
            actual = [(p, c)]
        else:
            actual.append((p, c))
    if actual:
        lineas.append(actual)
    return lineas


def dibuja_tema(draw, x, y, ancho, f, interlineado):
    for linea in palabras_en_lineas(draw, TEMA, f, ancho):
        cx = x
        for i, (p, c) in enumerate(linea):
            texto = p + (" " if i < len(linea) - 1 else "")
            draw.text((cx, y), texto, font=f, fill=c)
            cx += draw.textlength(texto, font=f)
        y += interlineado
    return y


def logo(tam):
    return Image.open(ROOT / "assets" / "logo.png").convert("RGB").resize((tam, tam), Image.LANCZOS)


def portada_vertical():
    W, H = 1200, 1600
    img = Image.new("RGB", (W, H), NEGRO)
    d = ImageDraw.Draw(img)
    # Banda blanca superior: logotipo y cabecera
    d.rectangle([0, 0, W, 360], fill=BLANCO)
    img.paste(logo(280), (80, 40))
    d.text((400, 92), "El Podcast", font=fuente("display", 74, 600), fill=NEGRO)
    d.text((400, 172), "del Migrante", font=fuente("display", 74, 600), fill=NEGRO)
    d.text((404, 270), "MAGAZINE", font=fuente("ui", 30, 700), fill=VERDE)
    d.rectangle([0, 360, W, 372], fill=VERDE)
    # Número y tema
    d.rectangle([80, 452, 136, 458], fill=VERDE_CLARO)
    d.text((156, 438), NUMERO, font=fuente("ui", 30, 700), fill=VERDE_CLARO)
    y = dibuja_tema(d, 80, 506, W - 160, fuente("display", 112, 600), 128)
    d.text((80, y + 18), "Selección editorial de octubre de 2026", font=fuente("ui", 34, 500), fill=GRIS)
    # Índice
    y += 108
    d.line([80, y, W - 80, y], fill=(70, 70, 68), width=2)
    y += 34
    d.text((80, y), "EN ESTA EDICIÓN", font=fuente("ui", 26, 700), fill=GRIS)
    y += 56
    f_ind = fuente("ui", 38, 500)
    for t in INDICE:
        d.rectangle([80, y + 17, 93, y + 30], fill=VERDE_CLARO)
        d.text((118, y), t, font=f_ind, fill=BLANCO)
        y += 70
    # Pie
    d.rectangle([0, H - 110, W, H], fill=VERDE)
    d.text((80, H - 80), "Conectando latinos, construyendo futuro", font=fuente("ui", 32, 600), fill=NEGRO)
    d.text((W - 80 - d.textlength("podcastdelmigrante.com", font=fuente("ui", 30, 600)), H - 78), "podcastdelmigrante.com", font=fuente("ui", 30, 600), fill=NEGRO)
    return img


def portada_social():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), NEGRO)
    d = ImageDraw.Draw(img)
    # Columna blanca con el logotipo
    d.rectangle([0, 0, 400, H], fill=BLANCO)
    img.paste(logo(320), (40, 120))
    d.rectangle([400, 0, 410, H], fill=VERDE)
    d.text((470, 70), "EL PODCAST DEL MIGRANTE MAGAZINE", font=fuente("ui", 24, 700), fill=GRIS)
    d.rectangle([470, 126, 514, 131], fill=VERDE_CLARO)
    d.text((530, 112), NUMERO, font=fuente("ui", 28, 700), fill=VERDE_CLARO)
    dibuja_tema(d, 470, 180, W - 470 - 60, fuente("display", 66, 600), 80)
    d.text((470, H - 82), "Selección editorial de octubre de 2026", font=fuente("ui", 28, 500), fill=GRIS)
    d.rectangle([410, H - 18, W, H], fill=VERDE)
    return img


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    portada_vertical().save(OUT / "portada.jpg", quality=88, optimize=True, progressive=True)
    portada_social().save(OUT / "portada-social.jpg", quality=88, optimize=True, progressive=True)
    for f in ("portada.jpg", "portada-social.jpg"):
        print("escrito", (OUT / f).relative_to(ROOT), (OUT / f).stat().st_size // 1024, "KB")
