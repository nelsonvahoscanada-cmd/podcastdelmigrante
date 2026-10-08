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

Después de agregar o cambiar un artículo:
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
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Falta Pillow: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "social"
W, H = 1200, 630
DEFAULT_FOCUS = (0.5, 0.4)


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
        social_crop(Image.open(path), focus).save(out, "JPEG", quality=84, optimize=True, progressive=True)
        expected.add(out.name)
        print(f"escrito    assets/social/{out.name}  ({out.stat().st_size // 1024} KB)  ← {src}")
    for f in OUT.glob("*.jpg"):
        if f.name not in expected:
            f.unlink()
            print(f"borrado    assets/social/{f.name} (ya no corresponde a un artículo publicado)")
    print(f"{len(expected)} imagen(es) social(es) al día.")


if __name__ == "__main__":
    main()
