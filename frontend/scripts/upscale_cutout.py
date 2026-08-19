"""Agrandit un PNG detoure avec Lanczos + accentuation legere.

N'invente pas de detail, mais evite le flou du reechantillonnage naif du
navigateur quand l'image est affichee plus grande que sa taille native.
"""

import sys
from pathlib import Path

from PIL import Image, ImageFilter

src = Path(sys.argv[1])
factor = float(sys.argv[2]) if len(sys.argv) > 2 else 2.5

im = Image.open(src).convert("RGBA")
target = (round(im.width * factor), round(im.height * factor))
big = im.resize(target, Image.LANCZOS)

# l'accentuation ne doit porter que sur les couleurs, pas sur le canal alpha,
# sinon les contours du detourage se mettent a crenerer
r, g, b, a = big.split()
rgb = Image.merge("RGB", (r, g, b)).filter(
    ImageFilter.UnsharpMask(radius=1.4, percent=105, threshold=3)
)
out = Image.merge("RGBA", (*rgb.split(), a))
out.save(src, optimize=True)

print(f"{im.size} -> {out.size}")
