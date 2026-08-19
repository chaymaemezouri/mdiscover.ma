"""Génère logo-light.png depuis logo.png.

Le lettrage sombre devient crème, le pictogramme garde ses couleurs, et les
pixels quasi transparents (ombre portée) sont supprimés pour que la zone de
l'image corresponde exactement au dessin.
"""

from PIL import Image

CREAM = (244, 239, 228)

img = Image.open("public/logo.png").convert("RGBA")
px = img.load()
w, h = img.size

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        mx, mn = max(r, g, b), min(r, g, b)
        saturation = 0 if mx == 0 else (mx - mn) / mx
        brightness = (r + g + b) / 3
        if saturation >= 0.28:
            continue
        if brightness < 105:
            px[x, y] = (*CREAM, a)
        elif brightness < 165:
            px[x, y] = (*CREAM, int(a * (165 - brightness) / 60))
        else:
            px[x, y] = (*CREAM, 0)

# supprime l'ombre portée : elle ajouterait du vide sous le lettrage
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if 0 < a < 90:
            px[x, y] = (r, g, b, 0)

bbox = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
img = img.crop(bbox)
img.save("public/logo-light.png", "PNG")
print("logo-light.png", img.size)
