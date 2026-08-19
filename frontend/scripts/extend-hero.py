"""Étend le décor de fin2.png vers la gauche (mur + table prolongés par ligne).

Le hero est plus large que le ratio 16/9 de la photo : sans extension, il faut
soit rogner le haut des produits, soit laisser une bande de fond dont la
jonction se voit. On génère donc un asset large dont seul le décor ajouté est
rogné par object-fit: cover.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent.parent / "public" / "hero"
SRC = HERE / "fin2.png"
DST = HERE / "fin2-wide.jpg"

TARGET_W = 3200
CUT_LEFT = 470  # colonnes retirées : la branche devient un calque autonome
EDGE_SAMPLE = 3  # colonnes moyennées pour la couleur de référence
BASE_SPAN = 380  # base large de mesure de la tendance lumineuse
FALLOFF_TAU = 520.0  # douceur de la chute de lumière vers l'extrême gauche
DELTA_MAX = 14.0  # amplitude maximale de cette chute, en niveaux
SMOOTH_Y = 5.0  # lissage vertical du profil (évite les bandes horizontales)
SMOOTH_FAR = 165.0  # lissage du profil loin de la photo
DISSOLVE = 200.0  # distance sur laquelle l'arête mur/table se dissout
NOISE = 2.0  # bruit léger pour éviter un aplat trop lisse
PAD_RIGHT = 26  # respiration ajoutée au bord droit, dans l'échelle de la photo

src = Image.open(SRC).convert("RGB").crop((CUT_LEFT, 0, *Image.open(SRC).size))
arr = np.asarray(src).astype(np.float32)
h, w, _ = arr.shape

fill_w = TARGET_W - w - PAD_RIGHT
if fill_w <= 0:
    raise SystemExit("TARGET_W doit être plus grand que la largeur source")

def smooth_y(profile: np.ndarray, sigma: float) -> np.ndarray:
    radius = int(sigma * 3)
    k = np.exp(-0.5 * (np.arange(-radius, radius + 1) / sigma) ** 2)
    k /= k.sum()
    padded = np.pad(profile, ((radius, radius), (0, 0)), mode="edge")
    return np.stack(
        [np.convolve(padded[:, c], k, mode="valid") for c in range(profile.shape[1])],
        axis=1,
    )


# Couleur de référence par ligne = bord gauche réel de la photo.
edge = smooth_y(arr[:, :EDGE_SAMPLE, :].mean(axis=1), SMOOTH_Y)

# Prolongement par ligne : la couleur du bord est reprise à l'identique, puis
# la tendance lumineuse mesurée sur une large base est prolongée en s'amortissant.
# Sans cela, le mur repart à plat et la cassure de pente se lit comme un trait.
inner = smooth_y(arr[:, BASE_SPAN : BASE_SPAN + EDGE_SAMPLE, :].mean(axis=1), SMOOTH_Y)
slope = np.clip((edge - inner) / BASE_SPAN * FALLOFF_TAU, -DELTA_MAX, DELTA_MAX)

dist = np.arange(fill_w, 0, -1, dtype=np.float32)
ramp = 1.0 - np.exp(-dist / FALLOFF_TAU)

# Deux profils : l'un fidèle au bord de la photo, l'autre très lissé. On fond
# du premier vers le second en s'éloignant, sinon l'arête mur/table et les
# traînées de lumière se prolongent en bandes horizontales franches.
near_p = edge[:, None, :] + slope[:, None, :] * ramp[None, :, None]
far_p = (
    smooth_y(edge, SMOOTH_FAR)[:, None, :]
    + smooth_y(slope, SMOOTH_FAR)[:, None, :] * ramp[None, :, None]
)

blend = (np.clip(1.0 - dist / DISSOLVE, 0.0, 1.0) ** 1.5)[None, :, None]
fill_arr = near_p * blend + far_p * (1.0 - blend)

rng = np.random.default_rng(7)
fill_arr += rng.normal(0.0, NOISE, fill_arr.shape)

fill = Image.fromarray(np.clip(fill_arr, 0, 255).astype(np.uint8)).filter(
    ImageFilter.GaussianBlur(0.6)
)

out = Image.new("RGB", (TARGET_W, h))
out.paste(fill, (0, 0))
out.paste(src, (fill_w, 0))

# Respiration à droite : la dernière colonne est prolongée puis très légèrement
# fondue, pour décoller les bols du bord sans déformer la composition.
if PAD_RIGHT:
    # Miroir : les feuilles et les bols coupés par le cadre se prolongent de
    # façon plausible, là où un simple étirement laisserait des traînées.
    tail = arr[:, -PAD_RIGHT - 1 : -1, :][:, ::-1, :]
    tail = Image.fromarray(np.clip(tail, 0, 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(0.4)
    )
    out.paste(tail, (TARGET_W - PAD_RIGHT, 0))
out.save(DST, quality=93, subsampling=0, optimize=True, progressive=True)

print(f"{DST.name} {out.size} ratio={TARGET_W / h:.2f}")
