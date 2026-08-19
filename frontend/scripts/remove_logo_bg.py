from PIL import Image
from collections import deque
import os

src = r"public/logo.jpeg"
img = Image.open(src).convert("RGBA")
pixels = img.load()
w, h = img.size
print("size", w, h, "corners", [pixels[0, 0], pixels[w - 1, 0], pixels[0, h - 1], pixels[w - 1, h - 1]])


def is_bg(r, g, b, a=255):
    if a < 10:
        return True
    brightness = (r + g + b) / 3
    if brightness >= 235 and abs(r - g) < 18 and abs(g - b) < 18 and abs(r - b) < 18:
        return True
    if brightness >= 220 and abs(r - g) < 12 and abs(g - b) < 12:
        return True
    return False


visited = [[False] * h for _ in range(w)]
q = deque()
for x in range(w):
    q.append((x, 0))
    q.append((x, h - 1))
for y in range(h):
    q.append((0, y))
    q.append((w - 1, y))

while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= w or y >= h or visited[x][y]:
        continue
    visited[x][y] = True
    r, g, b, a = pixels[x, y]
    if not is_bg(r, g, b, a):
        continue
    pixels[x, y] = (r, g, b, 0)
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
            q.append((nx, ny))

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if not a:
            continue
        brightness = (r + g + b) / 3
        if brightness >= 245 and abs(r - g) < 10 and abs(g - b) < 10:
            pixels[x, y] = (r, g, b, 0)
        elif brightness >= 228 and abs(r - g) < 8 and abs(g - b) < 8:
            alpha = max(0, min(a, int(255 * (245 - brightness) / 17)))
            pixels[x, y] = (r, g, b, alpha)

out = r"public/logo.png"
img.save(out, "PNG")
print("saved", out, os.path.getsize(out))
