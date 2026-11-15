"""Real-world hints for the HD facades.

1. shops.json : shops, cafes, banks... from the OpenStreetMap extract (name, kind, position in game metres).
2. facade_hints.json : per building, measured in the Panoramax facade photos that are clean enough:
   the spacing of the window bays (metres) and whether the wall is brick.

usage: make_street_data.py <map.osm> <facades folder> <facades2.json> <out folder>     (needs Pillow and numpy)
"""
import sys, json, math, collections
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image

osm, fdir, faces_json, out = sys.argv[1:5]
lat0, lon0 = 47.2025, -1.5900050000000001
KX = math.cos(math.radians(lat0)) * 111320.0; KZ = 110540.0
X0, X1, Z0, Z1 = -372.5, 2280.0, -840.0, 686.5  # play area, see convert.py

KINDS = {  # OSM tag -> sign family
    'shop=bakery': 'bakery', 'shop=pastry': 'bakery', 'amenity=pharmacy': 'pharmacy', 'amenity=cafe': 'cafe', 'amenity=bar': 'cafe', 'amenity=pub': 'cafe',
    'amenity=restaurant': 'restaurant', 'amenity=fast_food': 'restaurant', 'amenity=bank': 'bank', 'shop=hairdresser': 'hair', 'shop=newsagent': 'tabac',
    'shop=supermarket': 'market', 'shop=convenience': 'market', 'shop=car_repair': 'garage', 'shop=car': 'garage', 'amenity=post_office': 'post',
    'shop=florist': 'florist', 'shop=laundry': 'shop', 'shop=funeral_directors': 'shop',
}
nodes, found = {}, []
for ev, el in ET.iterparse(osm, events=('end',)):
    if el.tag == 'node':
        nodes[el.get('id')] = (float(el.get('lat')), float(el.get('lon')))
    if el.tag in ('node', 'way'):
        tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
        kind = None
        for k in ('shop', 'amenity', 'craft'):
            if k in tags:
                kind = KINDS.get(k + '=' + tags[k]) or ('shop' if k in ('shop', 'craft') else None)
                break
        if kind:
            refs = [el.get('id')] if el.tag == 'node' else [n.get('ref') for n in el.findall('nd')]
            found.append((kind, tags.get('name', ''), refs))
        if el.tag == 'way':
            el.clear()
shops = []
for kind, name, refs in found:
    pts = [nodes[r] for r in refs if r in nodes]
    if not pts: continue
    la = sum(p[0] for p in pts) / len(pts); lo = sum(p[1] for p in pts) / len(pts)
    x, z = (lo - lon0) * KX, -(la - lat0) * KZ
    if X0 < x < X1 and Z0 < z < Z1:
        shops.append({'x': round(x, 1), 'z': round(z, 1), 'k': kind, 'n': name})
json.dump(shops, open(out + '/shops.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('shops', len(shops), collections.Counter(s['k'] for s in shops).most_common())

# ---- window rhythm from the clean photo chunks
meta = json.load(open(fdir + '/gangstamen_facades2.json'))
faces = json.load(open(faces_json))
atl = [Image.open(f'{fdir}/gangstamen_facades2_{k}.jpg').convert('RGB') for k in range(len(meta['atlas']))]
ppm = meta['ppm']
per = collections.defaultdict(list)
for c in meta['chunks']:
    if c['w'] < 5 * ppm: continue   # need a couple of bays to measure a rhythm
    a = np.asarray(atl[c['t']].crop((c['x'], c['y'], c['x'] + c['w'], c['y'] + c['h'])), dtype=np.float32) / 255
    h = a.shape[0]
    up = a[: int(h * 0.62)]                                  # upper floors only: ground floors are too varied
    lum = up.mean(-1)
    dark = (lum < np.percentile(lum, 30)).astype(np.float32).mean(0)   # windows are the dark part of a facade
    d = dark - dark.mean()
    if d.std() < 0.03: continue
    ac = np.correlate(d, d, 'full')[len(d) - 1:]; ac /= ac[0] + 1e-9
    lo, hi = int(2.2 * ppm), min(int(5.2 * ppm), len(ac) - 1)
    if hi <= lo + 2: continue
    k = lo + int(np.argmax(ac[lo:hi]))
    r, g, b = [float(np.median(a[..., i])) for i in range(3)]
    brick = r > g * 1.22 and r > b * 1.4 and 0.25 < r < 0.75
    bi = int(faces[c['f']]['id'].split(':')[0])
    per[bi].append((float(ac[k]), k / ppm, brick, c['w']))
hints = []
for bi, lst in sorted(per.items()):
    best = max(lst, key=lambda t: t[0])
    if best[0] < 0.3: continue
    hints.append([bi, round(best[1], 2), 1 if sum(t[3] for t in lst if t[2]) > sum(t[3] for t in lst) / 2 else 0])
json.dump(hints, open(out + '/facade_hints.json', 'w'), separators=(',', ':'))
print('buildings with a measured rhythm', len(hints), 'median bay', np.median([h[1] for h in hints]), 'brick', sum(h[2] for h in hints))
