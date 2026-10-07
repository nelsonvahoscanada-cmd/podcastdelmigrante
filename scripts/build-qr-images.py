#!/usr/bin/env python3
"""
build-qr-images.py — Códigos QR de la sección "Conecta con ..."
======================================================================
Para cada perfil publicado con `connect` en js/businesses.js genera:

  assets/qr/perfil-<slug>.svg     QR "Visita mi perfil" (se ve en la miniweb)
  assets/qr/perfil-<slug>.png     el mismo QR listo para descargar, compartir
                                  e imprimir (alta resolución, con nombre y
                                  "Escanea y conoce mis servicios")
  assets/qr/contacto-<slug>.svg   QR "Guarda mi contacto" → vcard/<slug>.vcf
  assets/qr/contacto-<slug>.png   versión descargable/imprimible

El QR del perfil apunta SIEMPRE a la URL oficial:
  https://podcastdelmigrante.com/perfil-<slug>.html
El QR de contacto apunta a la tarjeta alojada en nuestro dominio:
  https://podcastdelmigrante.com/vcard/<slug>.vcf
(la genera scripts/build-profile-pages.mjs a partir del mismo registro).
Como los QR solo contienen la URL, cambiar un teléfono o un email NO
obliga a reimprimir: basta con regenerar la vCard.

Es una herramienta de edición, no se ejecuta en la web: el sitio solo
sirve los SVG/PNG ya generados (sin librerías externas en el navegador).

REQUISITOS (una vez):  pip install segno pillow
USO:                   python3 scripts/build-qr-images.py
Las fuentes del sitio (Fraunces y Public Sans, Google Fonts) se descargan
la primera vez a scripts/.fonts/ (ignorado por git).
"""

import io
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

try:
    import segno
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Faltan dependencias: pip install segno pillow")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "qr"
FONTS = Path(__file__).resolve().parent / ".fonts"
SITE_ORIGIN = "https://podcastdelmigrante.com"

# Paleta de css/styles.css
NEGRO = "#0b0b0b"
VERDE = "#6f9a03"
VERDE_OSCURO = "#557902"
GRIS_600 = "#5b5b5b"
GRIS_200 = "#d9d9d6"
BLANCO = "#ffffff"

FONT_CSS = (
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600"
    "&family=Public+Sans:wght@500;700"
)


def load_businesses():
    code = (
        "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});"
        "vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+';globalThis.__B=BUSINESSES;',c);"
        "process.stdout.write(JSON.stringify(c.__B));"
    )
    out = subprocess.run(
        ["node", "-e", code, str(ROOT / "js" / "businesses.js")], check=True, capture_output=True, text=True
    ).stdout
    return json.loads(out)


def fonts():
    """Descarga (una vez) las fuentes del sitio desde Google Fonts."""
    files = {"display": FONTS / "Fraunces-600.ttf", "ui500": FONTS / "PublicSans-500.ttf", "ui700": FONTS / "PublicSans-700.ttf"}
    if not all(f.exists() for f in files.values()):
        FONTS.mkdir(exist_ok=True)
        css = urllib.request.urlopen(FONT_CSS).read().decode()
        blocks = re.findall(r"font-family: '([^']+)';[^}]*?font-weight: (\d+);[^}]*?url\((https://[^)]+\.ttf)\)", css)
        urls = {(fam, w): u for fam, w, u in blocks}
        for key, (fam, w) in {"display": ("Fraunces", "600"), "ui500": ("Public Sans", "500"), "ui700": ("Public Sans", "700")}.items():
            files[key].write_bytes(urllib.request.urlopen(urls[(fam, w)]).read())
    return files


def qr_matrix_image(data, max_size):
    """QR (corrección nivel Q, apto para impresión), módulos enteros, hasta `max_size` px."""
    qr = segno.make(data, error="q", micro=False)
    modules = qr.symbol_size(scale=1, border=4)[0]
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=max(1, max_size // modules), border=4, dark=NEGRO, light=BLANCO)
    return qr, Image.open(buf).convert("RGB")


def centered(draw, y, text, font, fill, width):
    w = draw.textlength(text, font=font)
    draw.text(((width - w) / 2, y), text, font=font, fill=fill)


def build_card(data, kicker, name, caption, footnote, f):
    """Tarjeta PNG 1200×1650 para descargar / imprimir."""
    W, H = 1200, 1650
    img = Image.new("RGB", (W, H), BLANCO)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 18], fill=VERDE)
    d.rectangle([0, H - 1, W, H], fill=GRIS_200)

    k = ImageFont.truetype(str(f["ui700"]), 34)
    spaced = " ".join(kicker.upper())  # tracking amplio, como .biz-label
    centered(d, 92, spaced, k, VERDE_OSCURO, W)
    centered(d, 150, name, ImageFont.truetype(str(f["display"]), 76), NEGRO, W)

    qr, code = qr_matrix_image(data, 940)
    img.paste(code, ((W - code.size[0]) // 2, 270 + (940 - code.size[1]) // 2))

    centered(d, 1240, caption, ImageFont.truetype(str(f["ui700"]), 52), NEGRO, W)
    centered(d, 1318, footnote, ImageFont.truetype(str(f["ui500"]), 30), GRIS_600, W)

    logo = Image.open(ROOT / "assets" / "logo.png").convert("RGBA").resize((120, 120), Image.LANCZOS)
    img.paste(logo, ((W - 120) // 2, 1440), logo)
    return qr, img


def write_svg(qr, path, title):
    qr.save(str(path), kind="svg", scale=10, border=4, dark=NEGRO, light=BLANCO, xmldecl=False, omitsize=True, title=title)


def main():
    f = fonts()
    OUT.mkdir(parents=True, exist_ok=True)
    count = 0
    for b in load_businesses():
        c = b.get("connect")
        if not b.get("published") or not c:
            continue
        slug, name = b["slug"], b["name"]
        if c.get("profileQr"):
            url = f"{SITE_ORIGIN}/perfil-{slug}.html"
            qr, card = build_card(url, "Visita mi perfil", name, "Escanea y conoce mis servicios", url.replace("https://", ""), f)
            write_svg(qr, OUT / f"perfil-{slug}.svg", f"QR del perfil de {name}")
            card.save(OUT / f"perfil-{slug}.png", optimize=True)
            print(f"escrito  assets/qr/perfil-{slug}.svg/.png  → {url}")
            count += 1
        if c.get("contactCard"):
            url = f"{SITE_ORIGIN}/vcard/{slug}.vcf"
            if not (ROOT / "vcard" / f"{slug}.vcf").exists():
                sys.exit(f"Falta vcard/{slug}.vcf: ejecuta antes  node scripts/build-profile-pages.mjs")
            foot = " · ".join(x for x in [b.get("company"), b.get("city")] if x)
            qr, card = build_card(url, "Guarda mi contacto", name, "Escanea y guarda mi contacto", foot, f)
            write_svg(qr, OUT / f"contacto-{slug}.svg", f"QR de contacto de {name}")
            card.save(OUT / f"contacto-{slug}.png", optimize=True)
            print(f"escrito  assets/qr/contacto-{slug}.svg/.png  → {url}")
            count += 1
    print(f"{count} QR generado(s).")


if __name__ == "__main__":
    main()
