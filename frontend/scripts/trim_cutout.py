"""Nettoie un PNG detoure : supprime le halo quasi transparent puis recadre
sur le sujet, pour que l'image remplisse sa boite CSS."""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

THRESHOLD = 12

src = Path(sys.argv[1])
backup = Path(sys.argv[2]) if len(sys.argv) > 2 else None

im = Image.open(src).convert("RGBA")
if backup and not backup.exists():
    im.save(backup)

arr = np.array(im)
alpha = arr[:, :, 3]
alpha[alpha <= THRESHOLD] = 0
arr[:, :, 3] = alpha

cleaned = Image.fromarray(arr)
bbox = cleaned.getbbox()
cropped = cleaned.crop(bbox)
cropped.save(src)

print(f"{im.size} -> {cropped.size}  bbox={bbox}")
