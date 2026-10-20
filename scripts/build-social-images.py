#!/usr/bin/env python3
"""
build-social-images.py — Imagen para compartir de cada artículo
======================================================================
WhatsApp, Facebook, LinkedIn y X muestran la vista previa en formato
horizontal ~1,91:1. Este script genera, para cada artículo publicado
de js/articles.js con fotografía principal (heroImage.background con
url(...)), una versión social:

  assets/social/<slug>.jpg     1200 × 630 px, JPEG, < 300 KB

- NO modifica la fotografía original (assets/...).
- NO deforma: escala proporcionalmente y recorta el sobrante.
- El recorte sigue el punto de interés de la foto: por defecto
  50 % horizontal / 40 % vertical (los rostros suelen estar en el tercio
  superior). Se puede ajustar por artículo con el campo opcional
  heroImage.socialFocus = "50% 30%" en js/articles.js.
- Si la imagen es una ilustración o fue generada con IA, el campo opcional
  heroImage.socialLabel = "Imagen ilustrativa generada con IA" la escribe
  en una franja visible sobre la imagen social: las redes no muestran el
  pie de foto del artículo, así que la advertencia viaja con la imagen.
  Con heroImage.socialLabelPosition = "top-left" la etiqueta es una pastilla
  pequeña en la esquina superior izquierda (para imágenes que ya llevan
  titular o botones en la parte inferior); con "top-right", en la esquina
  superior derecha (cuando la izquierda lleva el logotipo); por defecto,
  franja inferior.
- Si un recorte no puede conservar a la vez el logotipo y el titular de una
  ilustración, heroImage.socialArea = "0% 86%" indica la franja vertical
  (desde, hasta) que debe verse COMPLETA: se escala a 630 px de alto, sin
  deformar ni recortar, y los lados se rellenan con la misma imagen
  difuminada y oscurecida. Sin socialArea, se usa el recorte habitual.

Además, para cada colaborador de js/data.js (CONTRIBUTORS) escribe la
tarjeta para compartir su perfil:

  assets/social/colaborador-<id>.jpg   1200 × 630: foto a la izquierda;
  logotipo del Magazine, nombre, especialidad y descripción a la derecha.
  La foto sale de `socialPhoto` ({ src, focus, zoom }) o, si falta, de
  `photo`. Usa las tipografías del sitio (assets/fonts).

Después de agregar o cambiar un artículo o un colaborador:
    python3 scripts/build-social-images.py
    node scripts/build-article-pages.mjs
(el chequeo de GitHub «Artículos: vistas previas» avisa si falta algo).

REQUISITO (una vez): pip install pillow
"""

import json
import re
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps
except ImportError:
    sys.exit("Falta Pillow: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "social"
W, H = 1200, 630
DEFAULT_FOCUS = (0.5, 0.4)


def load_contributors():
    code = (
        "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+';globalThis.__C=CONTRIBUTORS;',c);"
        "process.stdout.write(JSON.stringify(c.__C));"
    )
    out = subprocess.run(["node", "-e", code, str(ROOT / "js" / "data.js")], check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def load_articles():
    code = (
        "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+';globalThis.__A=ARTICLES;',c);"
        "process.stdout.write(JSON.stringify(c.__A));"
    )
    out = subprocess.run(["node", "-e", code, str(ROOT / "js" / "articles.js")], check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def hero_path(article):
    bg = (article.get("heroImage") or {}).get("background") or ""
    m = re.search(r"url\(['\"]?([^'\")]+)['\"]?\)", bg)
    return m.group(1).lstrip("/") if m else None


def parse_focus(value):
    if not value:
        return DEFAULT_FOCUS
    parts = re.findall(r"(\d+(?:\.\d+)?)%", value)
    if len(parts) != 2:
        sys.exit(f"socialFocus no válido: {value!r} (formato: \"50% 30%\")")
    return float(parts[0]) / 100, float(parts[1]) / 100


FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
    "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


def label_font(size):
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    sys.exit("socialLabel necesita una fuente TrueType/OpenType (Inter o DejaVu Sans): no se encontró ninguna.")


def add_label(img, text):
    """Franja negra semitransparente con el texto, en la parte inferior."""
    font = label_font(26)
    band_h = 58
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, H - band_h, W, H), fill=(11, 11, 11, 215))
    tw = draw.textlength(text, font=font)
    draw.text(((W - tw) / 2, H - band_h + (band_h - 30) / 2), text, font=font, fill=(255, 255, 255, 255))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def add_corner_label(img, text, right=False):
    """Pastilla discreta y legible en una esquina superior (izquierda por defecto)."""
    font = label_font(21)
    margin, pad_x, pad_y = 16, 14, 8
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    left, top, right_, bottom = draw.textbbox((0, 0), text, font=font)
    bw = (right_ - left) + 2 * pad_x
    x0 = W - margin - bw if right else margin
    box = (x0, margin, x0 + bw, margin + (bottom - top) + 2 * pad_y)
    draw.rounded_rectangle(box, radius=8, fill=(11, 11, 11, 205))
    draw.text((x0 + pad_x - left, margin + pad_y - top), text, font=font, fill=(255, 255, 255, 255))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


LABEL_POSITIONS = {
    "bottom": add_label,
    "top-left": add_corner_label,
    "top-right": lambda img, text: add_corner_label(img, text, right=True),
}


def social_crop(img, focus):
    """Escala para cubrir 1200×630 sin deformar y recorta alrededor del foco."""
    img = ImageOps.exif_transpose(img).convert("RGB")
    scale = max(W / img.width, H / img.height)
    rw, rh = round(img.width * scale), round(img.height * scale)
    img = img.resize((rw, rh), Image.LANCZOS)
    fx, fy = focus
    left = min(max(round(rw * fx - W / 2), 0), rw - W)
    top = min(max(round(rh * fy - H / 2), 0), rh - H)
    return img.crop((left, top, left + W, top + H))


def parse_area(value):
    parts = re.findall(r"(\d+(?:\.\d+)?)%", value or "")
    if len(parts) != 2 or not 0 <= float(parts[0]) < float(parts[1]) <= 100:
        sys.exit(f"socialArea no válido: {value!r} (formato: \"0% 86%\")")
    return float(parts[0]) / 100, float(parts[1]) / 100


def social_area(img, area, focus):
    """Muestra completa la franja vertical `area`; rellena los lados con la imagen difuminada."""
    img = ImageOps.exif_transpose(img).convert("RGB")
    y0, y1 = round(img.height * area[0]), round(img.height * area[1])
    band = img.crop((0, y0, img.width, y1))
    if band.width / band.height >= W / H:
        return social_crop(band, focus)
    bg = social_crop(img, focus).filter(ImageFilter.GaussianBlur(28))
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    fw = round(band.width * H / band.height)
    bg.paste(band.resize((fw, H), Image.LANCZOS), ((W - fw) // 2, 0))
    return bg


# ---------- Tarjeta para compartir el perfil de un colaborador ----------
VERDE, VERDE_OSCURO, NEGRO, GRIS = (111, 154, 3), (85, 121, 2), (11, 11, 11), (91, 91, 91)
CREMA = (247, 246, 241)


def site_font(kind, size, weight):
    files = {"display": "fraunces-latin-opsz-normal.woff2", "ui": "public-sans-latin-wght-normal.woff2"}
    font = ImageFont.truetype(str(ROOT / "assets" / "fonts" / files[kind]), size)
    axes = [a["name"] for a in font.get_variation_axes()]
    values = [min(144, size) if n == b"Optical Size" else weight for n in axes]
    font.set_variation_by_axes(values)
    return font


def wrap(draw, text, font, width, max_lines):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= width:
            cur = test
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while draw.textlength(lines[-1] + "…", font=font) > width and " " in lines[-1]:
            lines[-1] = lines[-1].rsplit(" ", 1)[0]
        lines[-1] += "…"
    return lines


def contributor_card(c):
    sp = c.get("socialPhoto") or {"src": c.get("photo")}
    if not sp.get("src"):
        return None
    card = Image.new("RGB", (W, H), CREMA)
    # Foto (izquierda): cubre 470 × 630 sin deformar, con zoom y punto de interés
    PW = 470
    photo = ImageOps.exif_transpose(Image.open(ROOT / sp["src"])).convert("RGB")
    zoom = float(sp.get("zoom") or 1)
    fx, fy = parse_focus(sp.get("focus") or "50% 35%")
    scale = max(PW / photo.width, H / photo.height) * zoom
    rw, rh = round(photo.width * scale), round(photo.height * scale)
    photo = photo.resize((rw, rh), Image.LANCZOS)
    left = min(max(round(rw * fx - PW / 2), 0), rw - PW)
    top = min(max(round(rh * fy - H / 2), 0), rh - H)
    card.paste(photo.crop((left, top, left + PW, top + H)), (0, 0))
    d = ImageDraw.Draw(card)
    d.rectangle((PW, 0, PW + 8, H), fill=VERDE)
    x, maxw = PW + 64, W - PW - 64 - 56
    # Identidad del Magazine
    logo = Image.open(ROOT / "assets" / "logo.png").convert("RGBA")
    logo.thumbnail((76, 76), Image.LANCZOS)
    card.paste(logo, (x, 48), logo)
    d.text((x + 92, 56), "El Podcast del Migrante", font=site_font("display", 30, 600), fill=NEGRO)
    d.text((x + 92, 94), "MAGAZINE", font=site_font("ui", 18, 700), fill=VERDE_OSCURO)
    # Rol, nombre, especialidad, descripción
    y = 190
    d.text((x, y), (c.get("roleLabel") or "Colaborador").upper(), font=site_font("ui", 20, 700), fill=VERDE_OSCURO)
    y += 38
    name_font = site_font("display", 64, 600)
    for line in wrap(d, c["name"], name_font, maxw, 2):
        d.text((x, y), line, font=name_font, fill=NEGRO); y += 74
    y += 4
    spec_font = site_font("ui", 30, 600)
    for line in wrap(d, c.get("shareSpecialty") or c.get("specialty", ""), spec_font, maxw, 2):
        d.text((x, y), line, font=spec_font, fill=VERDE_OSCURO); y += 40
    y += 18
    desc_font = site_font("ui", 22, 400)
    for line in wrap(d, c.get("shareDescription") or c.get("bio", ""), desc_font, maxw, 4):
        d.text((x, y), line, font=desc_font, fill=GRIS); y += 31
    d.text((x, H - 58), "podcastdelmigrante.com", font=site_font("ui", 20, 600), fill=GRIS)
    return card


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    expected = set()
    for a in load_articles():
        if a.get("draft"):
            continue
        src = hero_path(a)
        if not src:
            print(f"sin foto   {a['slug']} (usará el logotipo del Magazine)")
            continue
        path = ROOT / src
        if not path.exists():
            sys.exit(f"No existe la fotografía {src} del artículo {a['slug']}")
        focus = parse_focus((a.get("heroImage") or {}).get("socialFocus"))
        out = OUT / f"{a['slug']}.jpg"
        area = (a.get("heroImage") or {}).get("socialArea")
        img = social_area(Image.open(path), parse_area(area), focus) if area else social_crop(Image.open(path), focus)
        label = (a.get("heroImage") or {}).get("socialLabel")
        if label:
            position = (a.get("heroImage") or {}).get("socialLabelPosition") or "bottom"
            if position not in LABEL_POSITIONS:
                sys.exit(f"socialLabelPosition no válido en {a['slug']}: {position!r} (usa: {', '.join(LABEL_POSITIONS)})")
            img = LABEL_POSITIONS[position](img, label)
        img.save(out, "JPEG", quality=84, optimize=True, progressive=True)
        expected.add(out.name)
        print(f"escrito    assets/social/{out.name}  ({out.stat().st_size // 1024} KB)  ← {src}")
    for c in load_contributors():
        card = contributor_card(c)
        if card is None:
            continue
        out = OUT / f"colaborador-{c['id']}.jpg"
        card.save(out, "JPEG", quality=86, optimize=True, progressive=True)
        expected.add(out.name)
        print(f"escrito    assets/social/{out.name}  ({out.stat().st_size // 1024} KB)  ← colaborador {c['id']}")
    for f in OUT.glob("*.jpg"):
        if f.name not in expected:
            f.unlink()
            print(f"borrado    assets/social/{f.name} (ya no corresponde a un artículo publicado)")
    print(f"{len(expected)} imagen(es) social(es) al día.")


if __name__ == "__main__":
    main()
