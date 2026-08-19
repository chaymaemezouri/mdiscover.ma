"""Retire les declarations fontFamily devenues redondantes.

La regle globale h1..h6 de globals.css applique deja --font-title : garder la
declaration inline dupliquerait l'information et rendrait la police difficile a
changer depuis un seul endroit.
"""

import re
from pathlib import Path

DECL = r"fontFamily: 'var\(--font-display\), serif'"

patterns = [
    # seule propriete du style : on supprime l'attribut entier
    (re.compile(r" style=\{\{ " + DECL + r" \}\}"), ""),
    # premiere propriete d'un objet inline
    (re.compile(r"\{ " + DECL + r", "), "{ "),
    # derniere propriete d'un objet inline
    (re.compile(r", " + DECL), ""),
    # propriete sur sa propre ligne dans un objet multi-lignes
    (re.compile(r"[ \t]*" + DECL + r",\n"), ""),
]

total = 0
for path in Path("src").rglob("*.tsx"):
    original = path.read_text(encoding="utf-8")
    if "--font-display" not in original:
        continue
    updated = original
    for pattern, replacement in patterns:
        updated = pattern.sub(replacement, updated)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        removed = original.count("--font-display") - updated.count("--font-display")
        total += removed
        print(f"{path}: -{removed}")

print("total supprime:", total)
