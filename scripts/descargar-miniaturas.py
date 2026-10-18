#!/usr/bin/env python3
"""
descargar-miniaturas.py — Copia local de las miniaturas de videos PROPIOS
=========================================================================
Descarga la miniatura oficial de cada video indicado y la guarda, sin
modificarla, en assets/yt/<id>.jpg. Así las páginas no contactan a
YouTube al abrirse (ver js/video-cover.js).

Solo para videos de los canales de El Podcast del Migrante / eRadio
Global. Las miniaturas de canales externos NO se copian: esos videos usan
la portada local neutra (assets/yt/sin-miniatura.svg).

USO:  python3 scripts/descargar-miniaturas.py <id> [<id> ...]
Prueba la mejor resolución disponible (maxresdefault → sddefault →
hqdefault) y muestra la línea para LOCAL_THUMBS en js/video-cover.js.
"""
import io
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "yt"
SIZES = ["maxresdefault", "sddefault", "hqdefault"]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main(ids):
    OUT.mkdir(parents=True, exist_ok=True)
    failed = []
    for vid in ids:
        for size in SIZES:
            try:
                data = fetch(f"https://i.ytimg.com/vi/{vid}/{size}.jpg")
            except urllib.error.HTTPError:
                continue
            w, h = Image.open(io.BytesIO(data)).size
            if w <= 120:  # imagen gris de "no existe"
                continue
            (OUT / f"{vid}.jpg").write_bytes(data)
            print(f'    "{vid}": ["/assets/yt/{vid}.jpg", {w}, {h}],  // {size}, {len(data) // 1024} KB')
            break
        else:
            failed.append(vid)
    if failed:
        print("SIN MINIATURA:", " ".join(failed), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
