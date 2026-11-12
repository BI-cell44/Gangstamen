"""Curate the Panoramax facade atlas: keep only the clean photo chunks, enhance them and repack.

Many reprojected chunks are unusable (tree in front, sky, ghosting from misaligned photos, oblique smears).
Each chunk is scored; rejected chunks fall back to the procedural facade, tinted with the wall colour
measured in the photo so the street keeps its real colours.

usage: curate_facades.py <in folder> <out folder> [prefix]      (needs Pillow and numpy)
"""
import json, sys, os
import numpy as np
from PIL import Image, ImageFilter, ImageOps

src, dst = sys.argv[1], sys.argv[2]
PFX = sys.argv[3] if len(sys.argv) > 3 else 'gangstamen_facades2'
os.makedirs(dst, exist_ok=True)
meta = json.load(open(f'{src}/{PFX}.json'))
fac = json.load(open(os.environ.get('FACES', 'facades2.json')))
atl = [Image.open(f'{src}/{PFX}_{k}.jpg').convert('RGB') for k in range(len(meta['atlas']))]


def score(im):
    a = np.asarray(im, dtype=np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    v, mn = a.max(-1), a.min(-1)
    s = (v - mn) / (v + 1e-6)
    veg = (g > r * 1.04) & (g > b * 1.08) & (s > 0.18)
    sky = (b > r * 1.08) & (b >= g * 0.98) & (v > 0.55)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    gx = lum[1:-1, 2:] - lum[1:-1, :-2]
    gy = lum[2:, 1:-1] - lum[:-2, 1:-1]
    w = gx * gx + gy * gy
    ang = np.arctan2(gy, gx)
    axis = float((w * (np.abs(np.sin(2 * ang)) < 0.42)).sum() / (w.sum() + 1e-9))   # share of edges that are horizontal or vertical
    edge = float(np.sqrt(w).mean())
    wall = ~veg & ~sky & (v > 0.25)
    col = [float(np.median(a[..., k][wall])) for k in range(3)] if wall.sum() > 200 else None
    return {'veg': float(veg.mean()), 'sky': float(sky.mean()), 'axis': axis, 'edge': edge, 'col': col}


def keep(m, c):
    if m['veg'] > 0.2 or m['sky'] > 0.22:
        return False
    if m['edge'] > 0.018 and m['axis'] < float(os.environ.get('AXIS', 0.5)):   # busy but not rectilinear: ghosting or an oblique smear
        return False
    if c['w'] < 24:
        return False
    return True


kept, rej, cols = [], [], {}
for c in meta['chunks']:
    im = atl[c['t']].crop((c['x'], c['y'], c['x'] + c['w'], c['y'] + c['h']))
    m = score(im)
    c['_m'] = m
    bi = int(fac[c['f']]['id'].split(':')[0])
    if m['col']:
        cols.setdefault(bi, []).append((c['w'] * c['h'], m['col'], keep(m, c)))
    (kept if keep(m, c) else rej).append((c, im))

# repack the kept chunks (shelves, tallest first), enhanced
AW = 2048
kept.sort(key=lambda t: -t[0]['h'])
pages, x, y, rowh, page = [], 0, 0, 0, 0
out = []
for c, im in kept:
    if x + c['w'] + 2 > AW:
        x, y, rowh = 0, y + rowh + 2, 0
    if y + c['h'] > 2048:
        pages.append(y + rowh); page += 1; x = y = rowh = 0
    im = ImageOps.autocontrast(im, cutoff=(0.5, 0.5), preserve_tone=True)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    out.append((page, x, y, im))
    c2 = {k: c[k] for k in ('f', 'u0', 'u1', 'prods') if k in c}
    c2.update(t=page, x=x, y=y, w=c['w'], h=c['h'])
    c['_new'] = c2
    x += c['w'] + 2; rowh = max(rowh, c['h'])
pages.append(y + rowh)
sheets = [Image.new('RGB', (AW, max(16, h)), (120, 112, 100)) for h in pages]
for page, x, y, im in out:
    sheets[page].paste(im, (x, y))
for k, s in enumerate(sheets):
    s.save(f'{dst}/{PFX}_{k}.jpg', quality=86, optimize=True)

# one wall colour per building: from its kept photos when it has some, else from the rejected ones
bt = []
for bi, lst in sorted(cols.items()):
    use = [t for t in lst if t[2]] or lst
    tot = sum(t[0] for t in use)
    bt.append([bi] + [round(sum(t[0] * t[1][k] for t in use) / tot, 3) for k in range(3)])
json.dump({'v': 3, 'ppm': meta['ppm'], 'atlas': [[AW, s.size[1]] for s in sheets], 'chunks': [c['_new'] for c, _ in kept], 'bt': bt},
          open(f'{dst}/{PFX}.json', 'w'), separators=(',', ':'))
print('kept', len(kept), 'rejected', len(rej), 'pages', [s.size for s in sheets], 'building tints', len(bt))

if os.environ.get('SHEET'):   # contact sheets to eyeball the decision
    for name, lst in (('kept', kept), ('rej', rej)):
        W_, H_ = 2000, 1400
        sh = Image.new('RGB', (W_, H_), (40, 40, 40)); x = y = rowh = 0
        for c, im in lst[::max(1, len(lst) // 140)]:
            t = im.copy(); t.thumbnail((160, 150))
            if x + t.size[0] > W_: x, y, rowh = 0, y + rowh + 3, 0
            if y + t.size[1] > H_: break
            sh.paste(t, (x, y)); x += t.size[0] + 3; rowh = max(rowh, t.size[1])
        sh.save(os.environ['SHEET'] + '_' + name + '.jpg', quality=80)
