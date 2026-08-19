from PIL import Image


def clear_light_bg(path: str) -> None:
    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    changed = 0

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue

            mx = max(r, g, b)
            mn = min(r, g, b)
            chroma = mx - mn
            # luminance approx
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

            # Pure / near white
            if lum >= 235 and chroma <= 25:
                pixels[x, y] = (r, g, b, 0)
                changed += 1
                continue

            # Soft mint / beige fills often baked behind logos
            if lum >= 220 and chroma <= 45 and g >= r - 5:
                pixels[x, y] = (r, g, b, 0)
                changed += 1
                continue

            # Very light gray anti-aliased flats
            if lum >= 245 and chroma <= 15:
                pixels[x, y] = (r, g, b, 0)
                changed += 1

    out = path.replace("logo.png", "logo.png").replace(
        "logo-light.png", "logo-light.png"
    )
    img.save(path, "PNG")
    print(f"{path}: {w}x{h}, cleared={changed}, corner={pixels[0, 0]}")


clear_light_bg(r"c:\Users\admin\mdiscoverma\frontend\public\logo.png")
clear_light_bg(r"c:\Users\admin\mdiscoverma\frontend\public\logo-light.png")
