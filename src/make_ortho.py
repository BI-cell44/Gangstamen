"""Prepare the IGN aerial photo (BD ORTHO, Licence Ouverte) for the HD build.

data/ortho/ortho_raw.jpg covers x -440..2400 m (1840 before 15 Nov. 2026), z -1000..760 m of the game map at 0.4 m per pixel
(WMS data.geopf.fr, layer ORTHOIMAGERY.ORTHOPHOTOS). This script resamples it to 0.6 m per pixel (3800 px wide: within WebGL texture limits),
lifts the baked shadows, adds a little saturation and sharpening, and writes data/ortho/ortho.jpg.

usage: make_ortho.py <ortho_raw.jpg> <ortho.jpg>      (needs Pillow and numpy)
"""
import sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

im = Image.open(sys.argv[1]).convert('RGB')
W = min(4096, round(im.size[0] * 0.4 / 0.6))  # 0.6 m per pixel, 4096 px wide at most (since 15 Nov. 2026 the photo reaches x 2400: 0.69 m per pixel)
im = im.resize((W, round(im.size[1] * W / im.size[0])), Image.LANCZOS)
a = np.asarray(im, dtype=np.float32) / 255
lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[..., None]
# lift the shadows: the game casts its own, from its own sun
big = np.asarray(Image.fromarray((lum[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), dtype=np.float32)[..., None] / 255
gain = 1 + 0.9 * np.clip(0.42 - big, 0, 1) / 0.42
a = np.clip(a * gain, 0, 1) ** 0.92
im = Image.fromarray((a * 255).astype(np.uint8))
im = ImageEnhance.Color(im).enhance(1.18)
im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
im.save(sys.argv[2], quality=70, optimize=True, progressive=True)
print(im.size)
