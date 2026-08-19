"""Détoure la branche d'olivier posée en bas à gauche de fin2.png.

Elle devient un calque autonome (`branch.png`) que le hero peut caler dans son
coin bas-gauche quelle que soit la hauteur de la section : dans la photo, sa
position dépend du ratio d'affichage, donc elle s'éloigne du bord dès que le
hero est plus plat que du 16/9.
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, gaussian_filter
from skimage.morphology import (
    binary_dilation,
    disk,
    remove_small_holes,
    remove_small_objects,
)

HERE = Path(__file__).resolve().parent.parent / "public" / "hero"
SRC = HERE / "fin2.png"
DST = HERE / "branch.png"

BOX = (0, 752, 470, 941)  # zone de la branche (marbre uniquement autour)
CORE = 150.0  # luminance en dessous de laquelle c'est franchement le feuillage
EDGE = 178.0  # luminance au dessus de laquelle c'est le marbre
MIN_BLOB = 400  # pixels : supprime les veines du marbre prises par erreur
SHADOW = (7, 9, 9.0, 0.30)  # décalage x, y, flou, opacité de l'ombre portée

src = Image.open(SRC).convert("RGB").crop(BOX)
rgb = np.asarray(src).astype(np.float32)
lum = rgb.mean(axis=2)

core = remove_small_objects(lum < CORE, MIN_BLOB)
# Fermeture légère + bouchage des seules micro-lacunes (nervures) : boucher
# les vrais vides entre les feuilles ramènerait des plaques de marbre opaques.
core = remove_small_holes(binary_closing(core, np.ones((3, 3))), 90)

# L'alpha doux se limite à quelques pixels autour du feuillage détecté :
# au-delà, le marbre resterait visible sous forme de halo clair.
near = binary_dilation(core, disk(3))
alpha = np.clip((EDGE - lum) / (EDGE - CORE), 0.0, 1.0) * near
alpha = np.maximum(alpha, core.astype(np.float32))
alpha = gaussian_filter(alpha, 0.7)

# Ombre portée reconstituée : sans elle, la branche flotte sur le marbre.
dx, dy, blur, strength = SHADOW
shadow = gaussian_filter(np.roll(np.roll(core.astype(np.float32), dy, 0), dx, 1), blur)
shadow = np.clip(shadow * strength, 0.0, 1.0) * (1.0 - alpha)

# Décontamination : sur les pixels semi-transparents, la couleur observée
# contient encore du marbre. Sans la retirer, le détourage garde un liseré clair.
back = np.zeros_like(rgb)
for y in range(rgb.shape[0]):
    clean = rgb[y][alpha[y] < 0.04]
    back[y] = np.median(clean, axis=0) if clean.size else np.array([200.0, 197.0, 194.0])

a3 = np.clip(alpha, 0.0, 1.0)[..., None]
fg = np.where(a3 > 0.08, (rgb - (1.0 - a3) * back) / np.maximum(a3, 0.08), rgb)
fg = np.clip(fg, 0.0, 255.0)

out = np.zeros((*alpha.shape, 4), dtype=np.float32)
shade_rgb = np.array([104.0, 99.0, 94.0])
total = alpha + shadow
np.divide(
    fg * alpha[..., None] + shade_rgb * shadow[..., None],
    np.maximum(total, 1e-6)[..., None],
    out=out[..., :3],
)
out[..., 3] = np.clip(total, 0.0, 1.0) * 255.0

cols = np.where(out[..., 3].max(axis=0) > 3)[0]
rows = np.where(out[..., 3].max(axis=1) > 3)[0]
# Bord gauche et bas conservés : la branche est coupée par le cadre d'origine
# et posée sur le sol, c'est ce qui la cale ensuite dans le coin.
crop = out[: rows.max() + 1, : cols.max() + 1]

Image.fromarray(np.clip(crop, 0, 255).astype(np.uint8), "RGBA").save(DST, optimize=True)
print(f"{DST.name} {crop.shape[1]}x{crop.shape[0]} rows={rows.min()}..{rows.max()}")
