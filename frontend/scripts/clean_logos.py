"""Nettoie logo.png et régénère logo-light.png.

L'ombre portée sous l'emblème ajoutait une large bande vide sous le lettrage :
la boîte de l'image ne correspondait plus au dessin, ce qui décalait le logo
par rapport aux éléments alignés à côté. On la supprime, puis on rogne.
"""

from PIL import Image

CREAM = (244, 239, 228)
SRC = "public/logo.jpeg"


def alpha_bbox(img: Image.Image, threshold: int = 24):
    return img.getchannel("A").point(lambda v: 255 if v > threshold else 0).getbbox()


def strip_background(img: Image.Image) -> Image.Image:
    """Fond gris clair uniforme -> transparent (flood fill depuis les bords)."""
    from collections import deque

    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size

    def is_bg(r, g, b, a):
        if a < 10:
            return True
        brightness = (r + g + b) / 3
        return brightness >= 220 and abs(r - g) < 18 and abs(g - b) < 18

    seen = [[False] * h for _ in range(w)]
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]:
            continue
        seen[x][y] = True
        r, g, b, a = px[x, y]
        if not is_bg(r, g, b, a):
            continue
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny]:
                q.append((nx, ny))
    return img


def drop_ground_shadow(img: Image.Image) -> Image.Image:
    """Efface l'ellipse d'ombre : les lignes du bas qui ne contiennent
    plus que la colonne de l'emblème."""
    px = img.load()
    w, h = img.size

    def row_span(y):
        xs = [x for x in range(w) if px[x, y][3] > 24]
        return (min(xs), max(xs), len(xs)) if xs else None

    # colonne occupée par l'emblème = zone la plus basse restante
    last_wide = 0
    for y in range(h):
        span = row_span(y)
        if not span:
            continue
        lo, hi, _ = span
        if hi - lo > w * 0.5:
            last_wide = y

    for y in range(last_wide + 1, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (r, g, b, 0)
    return img


def to_light(img: Image.Image) -> Image.Image:
    img = img.copy()
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
    return img


base = strip_background(Image.open(SRC))
base = drop_ground_shadow(base)
base = base.crop(alpha_bbox(base))
base.save("public/logo.png", "PNG")
print("logo.png", base.size, round(base.size[0] / base.size[1], 4))

light = to_light(base)
light = light.crop(alpha_bbox(light))
light.save("public/logo-light.png", "PNG")
print("logo-light.png", light.size, round(light.size[0] / light.size[1], 4))
