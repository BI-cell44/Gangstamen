"""Convert an OpenStreetMap .osm export into a compact JSON world for the Gangstamen demo.
Coordinates: local metres, x = east, z = south (Three.js convention: -z = north)."""
import sys, json, math, random, xml.etree.ElementTree as ET

src, dst = sys.argv[1], sys.argv[2]
BD = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else None
root = ET.parse(src).getroot()
b = root.find('bounds')
minlat, maxlat = float(b.get('minlat')), float(b.get('maxlat'))
minlon, maxlon = float(b.get('minlon')), float(b.get('maxlon'))
lat0, lon0 = (minlat + maxlat) / 2, (minlon + maxlon) / 2
KX = math.cos(math.radians(lat0)) * 111320.0
KZ = 110540.0

def proj(lat, lon):
    return ((lon - lon0) * KX, -(lat - lat0) * KZ)

HX, HZ = (maxlon - minlon) * KX / 2, (maxlat - minlat) * KZ / 2
MARGIN = 60.0

nodes = {}
for n in root.iter('node'):
    nodes[n.get('id')] = proj(float(n.get('lat')), float(n.get('lon')))

def tags(el):
    return {t.get('k'): t.get('v') for t in el.findall('tag')}

ways = {}
for w in root.iter('way'):
    pts = [nodes[nd.get('ref')] for nd in w.findall('nd') if nd.get('ref') in nodes]
    ways[w.get('id')] = (pts, tags(w))

def inside(p, m=0.0):
    return abs(p[0]) <= HX + m and abs(p[1]) <= HZ + m

def area(pts):
    a = 0.0
    for i in range(len(pts)):
        x1, z1 = pts[i]; x2, z2 = pts[(i + 1) % len(pts)]
        a += x1 * z2 - x2 * z1
    return a / 2

def clean_ring(pts):
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    out = []
    for p in pts:
        if not out or (abs(p[0] - out[-1][0]) > 0.05 or abs(p[1] - out[-1][1]) > 0.05):
            out.append(p)
    return out

def r1(v):
    return round(v, 1)

def flat(pts):
    o = []
    for x, z in pts:
        o += [r1(x), r1(z)]
    return o

LEVELS = {'house': 2, 'detached': 2, 'semidetached_house': 2, 'terrace': 3, 'apartments': 5,
          'residential': 3, 'garage': 1, 'garages': 1, 'shed': 1, 'roof': 1, 'service': 1,
          'industrial': 3, 'warehouse': 3, 'school': 3, 'office': 5, 'retail': 2, 'commercial': 3,
          'church': 6}
KIND = {'house': 0, 'detached': 0, 'semidetached_house': 0, 'terrace': 0, 'residential': 0,
        'apartments': 1, 'office': 1, 'industrial': 2, 'warehouse': 2, 'garage': 3, 'garages': 3,
        'shed': 3, 'roof': 3, 'service': 3, 'school': 4, 'retail': 5, 'commercial': 5, 'church': 6}

def bheight(tg, wid, a):
    rnd = random.Random(int(wid))
    if 'height' in tg:
        try:
            return float(tg['height'].replace('m', '').strip())
        except ValueError:
            pass
    if 'building:levels' in tg:
        try:
            lv = float(tg['building:levels'])
            return lv * 3.0 + (0 if tg.get('building') == 'roof' else 1.0)
        except ValueError:
            pass
    bt = tg.get('building', 'yes')
    if bt in LEVELS:
        lv = LEVELS[bt]
    else:
        # untagged "yes": guess from footprint size, typical Nantes faubourg = R+1 / R+2
        if a < 25: lv = 1
        elif a < 300: lv = rnd.choice([2, 2, 2, 3, 3])
        elif a < 1200: lv = rnd.choice([2, 3, 4, 5])
        else: lv = rnd.choice([3, 3, 4])
    if bt == 'roof':
        return 4.0
    return lv * 3.0 + rnd.uniform(0.2, 1.5)

buildings = []
def add_building(pts, tg, wid):
    ring = clean_ring(pts)
    if len(ring) < 3:
        return
    cx = sum(p[0] for p in ring) / len(ring); cz = sum(p[1] for p in ring) / len(ring)
    if not inside((cx, cz)):
        return
    a = area(ring)
    if a > 0:  # normalise to clockwise in x/z (negative signed area)
        ring = ring[::-1]
    h = bheight(tg, wid, abs(a))
    kind = KIND.get(tg.get('building', 'yes'), 0 if abs(a) < 300 else (2 if abs(a) > 1500 else 1))
    if tg.get('amenity') == 'place_of_worship':
        kind = 6
    buildings.append({'h': r1(h), 'k': kind, 'p': flat(ring), 'n': tg.get('name', '')})

for wid, (pts, tg) in ways.items():
    if 'building' in tg and tg.get('building') != 'no' and len(pts) >= 4:
        add_building(pts, tg, wid)

# multipolygon buildings: use closed outer members
for rel in root.iter('relation'):
    tg = tags(rel)
    if tg.get('type') == 'multipolygon' and 'building' in tg:
        for m in rel.findall('member'):
            if m.get('type') == 'way' and m.get('role') == 'outer' and m.get('ref') in ways:
                pts, wtg = ways[m.get('ref')]
                if len(pts) >= 4 and pts[0] == pts[-1] and 'building' not in wtg:
                    add_building(pts, {**tg, **wtg}, m.get('ref'))

ROADW = {'primary': 11, 'secondary': 9, 'tertiary': 8, 'unclassified': 6, 'residential': 6.5,
         'living_street': 5, 'service': 4, 'pedestrian': 6, 'footway': 2.2, 'path': 2,
         'cycleway': 2.2, 'steps': 2, 'track': 3, 'primary_link': 7, 'secondary_link': 6}
DRIVE = {'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street',
         'service', 'pedestrian', 'primary_link', 'secondary_link', 'track'}

def clip_line(pts, m):
    """Keep the runs of a polyline that are inside the extended box (with one point beyond)."""
    runs, cur = [], []
    for i, p in enumerate(pts):
        ins = inside(p, m)
        if ins:
            if not cur and i > 0:
                cur.append(pts[i - 1])
            cur.append(p)
        else:
            if cur:
                cur.append(p); runs.append(cur); cur = []
    if cur:
        runs.append(cur)
    return [r for r in runs if len(r) >= 2]

roads, rails, greens, names = [], [], [], []
name_idx = {}
for wid, (pts, tg) in ways.items():
    hw = tg.get('highway')
    if hw in ROADW and len(pts) >= 2:
        if tg.get('area') == 'yes':
            continue
        nm = tg.get('name', '')
        if nm not in name_idx:
            name_idx[nm] = len(names); names.append(nm)
        w = ROADW[hw]
        if 'lanes' in tg and hw in DRIVE:
            try:
                w = max(w, int(tg['lanes']) * 3.2)
            except ValueError:
                pass
        layer = 0
        if tg.get('bridge') == 'yes':
            layer = 1
        if tg.get('tunnel') == 'yes':
            continue
        for run in clip_line(pts, MARGIN):
            roads.append({'w': w, 'd': 1 if hw in DRIVE else 0, 'n': name_idx[nm], 'b': layer,
                          'p': flat(run)})
    rw = tg.get('railway')
    if rw in ('rail', 'tram') and len(pts) >= 2:
        for run in clip_line(pts, MARGIN):
            rails.append({'t': 0 if rw == 'rail' else 1, 'p': flat(run)})
    g = None
    if tg.get('leisure') in ('park', 'garden', 'pitch', 'playground') or \
       tg.get('landuse') in ('grass', 'cemetery', 'recreation_ground', 'meadow') or \
       tg.get('natural') in ('wood', 'scrub', 'wetland', 'grassland'):
        g = 0 if tg.get('leisure') != 'pitch' else 1
        if tg.get('landuse') == 'cemetery':
            g = 2
    if tg.get('leisure') == 'swimming_pool' or tg.get('natural') == 'water':
        g = 3
    if g is not None and len(pts) >= 4 and pts[0] == pts[-1]:
        ring = clean_ring(pts)
        if all(inside(p, 300) for p in ring) and len(ring) >= 3:
            if area(ring) > 0:
                ring = ring[::-1]
            greens.append({'g': g, 'p': flat(ring)})

trees = []
for n in root.iter('node'):
    tg = tags(n)
    if tg.get('natural') == 'tree':
        p = nodes[n.get('id')]
        if inside(p):
            trees += [r1(p[0]), r1(p[1])]
for wid, (pts, tg) in ways.items():
    if tg.get('natural') == 'tree_row':
        for i in range(len(pts) - 1):
            (x1, z1), (x2, z2) = pts[i], pts[i + 1]
            L = math.hypot(x2 - x1, z2 - z1)
            for k in range(int(L // 9) + 1):
                t = (k * 9) / L if L else 0
                p = (x1 + (x2 - x1) * t, z1 + (z2 - z1) * t)
                if inside(p):
                    trees += [r1(p[0]), r1(p[1])]

# Loire: the export carries no river geometry, so estimate the north bank from where
# mapped features stop. For each 20 m column, the bank sits just south of the southernmost
# building or drivable road (bridges excluded).
COL = 20.0
ncol = int(math.ceil(2 * HX / COL)) + 1
south = [-1e9] * ncol
def mark(x, z):
    c = int((x + HX) // COL)
    if 0 <= c < ncol and z > south[c]:
        south[c] = z
for bd in buildings:
    p = bd['p']
    for i in range(0, len(p), 2):
        mark(p[i], p[i + 1])
for rd in roads:
    if rd['d'] and not rd['b']:
        p = rd['p']
        for i in range(0, len(p), 2):
            if inside((p[i], p[i + 1])):
                mark(p[i], p[i + 1])
for r in rails:
    p = r['p']
    for i in range(0, len(p), 2):
        if inside((p[i], p[i + 1])):
            mark(p[i], p[i + 1])

bank = []
for c in range(ncol):
    x = -HX + c * COL
    bank.append([r1(x), r1(south[c])])


def pip(x, z, p):
    ins = False; n = len(p) // 2; j = n - 1
    for i in range(n):
        xi, zi, xj, zj = p[2*i], p[2*i+1], p[2*j], p[2*j+1]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            ins = not ins
        j = i
    return ins

stats = {'matched': 0, 'near': 0, 'none': 0}
if BD:
    rows = []
    for r in BD['rows']:
        f = r.split(',')
        num = lambda v: float(v) / 10 if v not in ('', None) else None
        rows.append({'x': int(f[0]) / 10, 'z': int(f[1]) / 10, 'a': float(f[2] or 0), 'sol': num(f[3]),
                     'h': num(f[4]), 'top': num(f[5]), 'lv': int(f[6]) if f[6] else None, 'use': f[7]})
    cellmap = {}
    for r in rows:
        cellmap.setdefault((int(r['x'] // 20), int(r['z'] // 20)), []).append(r)
    def near(x, z, rad):
        out = []
        for i in range(int((x - rad) // 20), int((x + rad) // 20) + 1):
            for j in range(int((z - rad) // 20), int((z + rad) // 20) + 1):
                out += cellmap.get((i, j), [])
        return out
    for bd in buildings:
        p = bd['p']; n = len(p) // 2
        cx = sum(p[0::2]) / n; cz = sum(p[1::2]) / n
        xs, zs = p[0::2], p[1::2]
        rad = max(max(xs) - min(xs), max(zs) - min(zs)) / 2 + 2
        cands = [r for r in near(cx, cz, rad) if pip(r['x'], r['z'], p) and r['h'] is not None]
        if cands:
            # area-weighted mean height of BD TOPO parts falling inside this OSM footprint
            stats['matched'] += 1
        else:
            cands = [r for r in near(cx, cz, 8) if r['h'] is not None and (r['x'] - cx) ** 2 + (r['z'] - cz) ** 2 < 64]
            if cands:
                cands = [min(cands, key=lambda r: (r['x'] - cx) ** 2 + (r['z'] - cz) ** 2)]
                stats['near'] += 1
        if not cands:
            stats['none'] += 1
            continue
        big = max(cands, key=lambda r: r['a'])
        wsum = sum(max(r['a'], 1) for r in cands)
        h = sum(r['h'] * max(r['a'], 1) for r in cands) / wsum
        sol = min((r['sol'] for r in cands if r['sol'] is not None), default=None)
        rise = 0.0
        if big['top'] is not None and big['sol'] is not None:
            rise = max(0.0, min(8.0, big['top'] - big['sol'] - big['h']))
        bd['h'] = r1(max(2.2, h)); bd['r'] = r1(rise)
        if sol is not None:
            bd['b'] = r1(sol)
        area = abs(area_flat(p)) if False else None
        use = big['use']; lv = big['lv']
        a = abs(sum(p[2*i] * p[2*((i+1)%n)+1] - p[2*((i+1)%n)] * p[2*i+1] for i in range(n)) / 2)
        if bd['k'] in (4, 6):
            pass
        elif use == 'Religieux':
            bd['k'] = 6
        elif use in ('Industriel', 'Sportif'):
            bd['k'] = 2
        elif use == 'Commercial et services':
            bd['k'] = 2 if a > 900 else 5
        elif use == 'Annexe' or (h < 3.6 and a < 60):
            bd['k'] = 3
        else:
            levels = lv or round(h / 3)
            bd['k'] = 0 if (a < 260 and levels <= 3) else 1
    print('BD TOPO match', stats)

out = {
    'meta': {'hx': r1(HX), 'hz': r1(HZ), 'lat0': lat0, 'lon0': lon0,
             'src': '© OpenStreetMap contributors (ODbL); IGN BD TOPO & RGE ALTI (Licence Ouverte)'},
    'names': names, 'buildings': buildings, 'roads': roads, 'rails': rails,
    'greens': greens, 'trees': trees,
    'dem': ({'nx': BD['dem']['nx'], 'nz': BD['dem']['nz'], 'step': BD['dem']['STEP'], 'x0': BD['dem']['X0'], 'z0': BD['dem']['Z0'], 'h': BD['dem']['h']} if BD else None),
}
with open(dst, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('half extents', round(HX), round(HZ))
print('buildings', len(buildings), 'roads', len(roads), 'rails', len(rails), 'greens', len(greens),
      'trees', len(trees) // 2, 'names', len(names))

