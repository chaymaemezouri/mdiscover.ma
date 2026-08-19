"""Rogne les marges transparentes de logo.png / logo-light.png.

Sans ce rognage, la zone vide du PNG décale visuellement le logo par rapport
aux autres éléments alignés au centre.
"""

from PIL import Image

for name in ("logo.png", "logo-light.png"):
    path = f"public/{name}"
    img = Image.open(path).convert("RGBA")
    alpha = img.getchannel("A")
    # ignore les pixels quasi transparents (ombres résiduelles)
    mask = alpha.point(lambda v: 255 if v > 24 else 0)
    bbox = mask.getbbox()
    print(name, "canvas", img.size, "content", bbox)
    if bbox:
        img.crop(bbox).save(path, "PNG")
        print("  ->", Image.open(path).size)
