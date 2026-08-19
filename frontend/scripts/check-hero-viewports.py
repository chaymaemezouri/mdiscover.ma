"""Vérifie qu'aucun viewport cible ne fait chevaucher le texte et les produits.

Rejoue le calcul du CSS (hauteur du stage, cover ancré à droite) pour situer le
premier produit de la photo par rapport au bloc de texte du hero.
"""

ASSET_W, ASSET_H = 3200, 941
PAD_RIGHT = 26
PHOTO_W = 1202  # photo après retrait des 470 colonnes de gauche
PHOTO_X = ASSET_W - PAD_RIGHT - PHOTO_W
PRODUCT_COL = 922 - 470  # première colonne produit, dans la photo recadrée

VIEWPORTS = [
    (1920, 1080),
    (1600, 900),
    (1440, 900),
    (1366, 768),
    (1280, 720),
    (1024, 768),
    (768, 1024),
]


def stage_height(w: int, h: int) -> float:
    if w >= 1600:
        s = min(0.50 * w, 900)
    elif w >= 1280:
        s = min(0.5625 * w, 830)
    elif w >= 1024:
        s = min(0.5625 * w, 820)
    else:
        s = max(640, min(0.78 * h, 740))
    if w >= 1024 and h <= 780:
        s = min(s, 0.5625 * w, 0.88 * h, 760)
    if w >= 1024 and h <= 700:
        s = min(s, 0.5625 * w, 0.92 * h, 680)
    return s


def text_right_edge(w: int) -> float:
    if w >= 1800:
        shell, tmax, pct = 1520, 34 * 16, 0.38
    elif w >= 1600:
        shell, tmax, pct = 1440, 32 * 16, 0.40
    elif w >= 1280:
        shell, tmax, pct = 1360, 30 * 16, 0.44
    elif w >= 1024:
        shell, tmax, pct = 1200, 26 * 16, 0.46
    else:
        shell, tmax, pct = w, 26 * 16, 0.58
    pad = max(24, min(0.03 * w, 56))
    shell_w = min(w, shell)
    left = (w - shell_w) / 2 + pad
    return left + min(tmax, pct * (shell_w - 2 * pad))


print(f"{'viewport':>12} {'stage':>6} {'produits x':>11} {'texte fin':>10} {'marge':>7}")
for w, h in VIEWPORTS:
    stage = stage_height(w, h)
    scale = max(w / ASSET_W, stage / ASSET_H)
    cut = ASSET_W * scale - w  # cover ancré à droite
    product_x = (PHOTO_X + PRODUCT_COL) * scale - cut
    text_x = text_right_edge(w)
    print(
        f"{w}x{h:<7} {stage:6.0f} {product_x:11.0f} {text_x:10.0f} {product_x - text_x:7.0f}"
    )
