"""Convert an OpenStreetMap .osm export into a compact JSON world for the Gangstamen demo.
Coordinates: local metres, x = east, z = south (Three.js convention: -z = north)."""
import sys, json, math, random, xml.etree.ElementTree as ET

src, dst = sys.argv[1], sys.argv[2]
BD = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else None
root = ET.parse(src).getroot()
b = root.find('bounds')
minlat, maxlat = float(b.get('minlat')), float(b.get('maxlat'))
minlon, maxlon = float(b.get('minlon')), float(b.get('maxlon'))
# the origin stays where the first Chantenay map had its centre, so every place written in game metres keeps its spot
lat0, lon0 = 47.2025, -1.5900050000000001
KX = math.cos(math.radians(lat0)) * 111320.0
KZ = 110540.0

def proj(lat, lon):
    return ((lon - lon0) * KX, -(lat - lat0) * KZ)

# play area (game metres): west and south edges of the first map; east to the start of the quai de la Fosse,
# north just past the tram line 1, which closes the map on that side
X0, X1, Z0, Z1 = -372.5, 1664.0, -845.0, 686.5
CX, CZ, HX, HZ = (X0 + X1) / 2, (Z0 + Z1) / 2, (X1 - X0) / 2, (Z1 - Z0) / 2
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
    return abs(p[0] - CX) <= HX + m and abs(p[1] - CZ) <= HZ + m

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
        cob = tg.get('surface') in ('sett', 'cobblestone', 'unhewn_cobblestone', 'paving_stones')
        for run in clip_line(pts, MARGIN):
            rd = {'w': w, 'd': 1 if hw in DRIVE else 0, 'n': name_idx[nm], 'b': layer, 'p': flat(run)}
            ow = tg.get('oneway')
            if hw in DRIVE and (ow in ('yes', 'true', '1') or (tg.get('junction') in ('roundabout', 'circular') and ow != 'no')):
                rd['o'] = 1  # one way, in the order of the points
            elif hw in DRIVE and ow == '-1':
                rd['o'] = -1
            if cob:
                rd['s'] = 1  # cobbles (pavés): rumble under the tyres
            roads.append(rd)
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

# ---- the tram line 1 closes the map to the north: a function z(x) sampled every 5 m (south rail and centre)
TSTEP = 5.0
ntc = int(math.ceil((X1 - X0) / TSTEP)) + 1
tS, tN = [None] * ntc, [None] * ntc
for r in rails:
    if r['t'] != 1: continue
    p = r['p']
    for i in range(0, len(p) - 2, 2):
        x1, z1, x2, z2 = p[i:i + 4]; L = math.hypot(x2 - x1, z2 - z1); n = max(1, int(L / 1.0))
        for k in range(n + 1):
            x = x1 + (x2 - x1) * k / n; z = z1 + (z2 - z1) * k / n
            c = int(round((x - X0) / TSTEP))
            if 0 <= c < ntc:
                tS[c] = z if tS[c] is None else max(tS[c], z); tN[c] = z if tN[c] is None else min(tN[c], z)
known = [i for i in range(ntc) if tS[i] is not None]
for i in range(ntc):  # fill gaps by interpolation / extension
    if tS[i] is None:
        a = max([k for k in known if k < i], default=None); b = min([k for k in known if k > i], default=None)
        if a is None: tS[i], tN[i] = tS[b], tN[b]
        elif b is None: tS[i], tN[i] = tS[a], tN[a]
        else:
            u = (i - a) / (b - a); tS[i] = tS[a] + (tS[b] - tS[a]) * u; tN[i] = tN[a] + (tN[b] - tN[a]) * u
def tramS(x):
    c = (x - X0) / TSTEP; i = max(0, min(ntc - 2, int(c))); u = max(0.0, min(1.0, c - i))
    return tS[i] + (tS[i + 1] - tS[i]) * u
def south_of_tram(x, z, m=0.0):
    return z > tramS(x) + m
# drivable and walkable streets stop at the tram (the run keeps its crossing point so it reaches the rails)
def cut_north(p, m=1.5):
    runs, cur = [], []
    pts = [(p[i], p[i + 1]) for i in range(0, len(p), 2)]
    for i, q in enumerate(pts):
        ok = south_of_tram(q[0], q[1], m)
        if ok:
            if not cur and i > 0:  # entering from the north: start at the crossing
                a = pts[i - 1]; cur.append(cross(a, q, m))
            cur.append(q)
        elif cur:
            cur.append(cross(cur[-1], q, m)); runs.append(cur); cur = []
    if cur: runs.append(cur)
    return [r for r in runs if len(r) >= 2]
def cross(a, b, m):
    lo, hi = 0.0, 1.0; sa = south_of_tram(a[0], a[1], m)
    for _ in range(30):
        mid = (lo + hi) / 2; q = (a[0] + (b[0] - a[0]) * mid, a[1] + (b[1] - a[1]) * mid)
        if south_of_tram(q[0], q[1], m) == sa: lo = mid
        else: hi = mid
    return (a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo)
nroads = []
for rd in roads:
    for run in cut_north(rd['p']):
        nroads.append({**rd, 'p': flat(run)})
roads = nroads
# streets with no link to the main network (Île de Nantes across the Loire, no bridge in the play area): dropped
par = {}
def fnd(a):
    while par.setdefault(a, a) != a:
        par[a] = par[par[a]]; a = par[a]
    return a
key = lambda x, z: (round(x, 1), round(z, 1))
for rd in roads:
    if not rd['d']: continue
    p = rd['p']; k0 = key(p[0], p[1])
    for i in range(2, len(p), 2): par[fnd(key(p[i], p[i + 1]))] = fnd(k0)
size = {}
for rd in roads:
    if rd['d']:
        r = fnd(key(rd['p'][0], rd['p'][1])); size[r] = size.get(r, 0) + len(rd['p'])
main = max(size, key=size.get)
before = len(roads)
roads = [rd for rd in roads if not rd['d'] or fnd(key(rd['p'][0], rd['p'][1])) == main or size[fnd(key(rd['p'][0], rd['p'][1]))] > 0.15 * size[main]]
print('streets cut off from the network, dropped:', before - len(roads))
BAND = 70.0  # beyond the rails only a strip of facades remains, as a backdrop
def keep_poly(p):
    n = len(p) // 2; cx = sum(p[0::2]) / n; cz = sum(p[1::2]) / n
    return south_of_tram(cx, cz, -BAND)
buildings = [b for b in buildings if keep_poly(b['p'])]
greens = [g for g in greens if keep_poly(g['p'])]

trees = []
for n in root.iter('node'):
    tg = tags(n)
    if tg.get('natural') == 'tree':
        p = nodes[n.get('id')]
        if inside(p) and south_of_tram(p[0], p[1], -BAND):
            trees += [r1(p[0]), r1(p[1])]
for wid, (pts, tg) in ways.items():
    if tg.get('natural') == 'tree_row':
        for i in range(len(pts) - 1):
            (x1, z1), (x2, z2) = pts[i], pts[i + 1]
            L = math.hypot(x2 - x1, z2 - z1)
            for k in range(int(L // 9) + 1):
                t = (k * 9) / L if L else 0
                p = (x1 + (x2 - x1) * t, z1 + (z2 - z1) * t)
                if inside(p) and south_of_tram(p[0], p[1], -BAND):
                    trees += [r1(p[0]), r1(p[1])]

# Loire: the export carries no river geometry, so estimate the north bank from where
# mapped features stop. For each 20 m column, the bank sits just south of the southernmost
# building or drivable road (bridges excluded).
COL = 20.0
ncol = int(math.ceil(2 * HX / COL)) + 1
south = [-1e9] * ncol
def mark(x, z):
    c = int((x - X0) // COL)
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
    x = X0 + c * COL
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

# ---- traffic (cycle 7): lights, stops, give way, crossings on the drivable streets; bus lines and stops ----
TAGN = {}
for n in root.iter('node'):
    t = {x.get('k'): x.get('v') for x in n.findall('tag')}
    if t: TAGN[n.get('id')] = t
cell = {}
for rd in roads:
    if not rd['d']: continue
    p = rd['p']
    for i in range(0, len(p) - 2, 2):
        ax, az, bx, bz = p[i], p[i + 1], p[i + 2], p[i + 3]
        for gx in range(int(min(ax, bx) // 20) - 1, int(max(ax, bx) // 20) + 2):
            for gz in range(int(min(az, bz) // 20) - 1, int(max(az, bz) // 20) + 2):
                cell.setdefault((gx, gz), []).append((ax, az, bx, bz))
def on_drive(x, z, r=4.0):
    for s in cell.get((int(x // 20), int(z // 20)), []):
        ax, az, bx, bz = s; dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1e-9
        u = max(0.0, min(1.0, ((x - ax) * dx + (z - az) * dz) / L2))
        if math.hypot(ax + dx * u - x, az + dz * u - z) < r: return True
    return False
KIND = {'traffic_signals': 0, 'stop': 1, 'give_way': 2, 'crossing': 3}
signals = []
for nid, t in TAGN.items():
    k = KIND.get(t.get('highway'))
    if k is None and t.get('crossing') == 'traffic_signals': k = 0
    if k is None or nid not in nodes: continue
    x, z = nodes[nid]
    if not inside((x, z), -3) or not south_of_tram(x, z, 2) or not on_drive(x, z): continue
    signals.append([r1(x), r1(z), k])
bus, stops = [], []
for rel in root.iter('relation'):
    tg = tags(rel)
    if tg.get('route') != 'bus': continue
    chain = []
    for m in rel.findall('member'):
        if m.get('type') != 'way' or m.get('role') not in ('', 'forward', 'backward'): continue
        pts = ways.get(m.get('ref'), ([], {}))[0]
        if len(pts) < 2: continue
        pts = list(pts)
        if chain:
            e = chain[-1]
            if math.dist(e, pts[-1]) < math.dist(e, pts[0]): pts.reverse()
            if math.dist(e, pts[0]) > 30:  # the first way may need turning round too
                if len(chain) and math.dist(chain[0], pts[0]) < 1: chain.reverse()
                elif math.dist(chain[0], pts[-1]) < 1: chain.reverse(); pts.reverse()
        chain += pts if not chain else pts[1:]
    if len(chain) < 2: continue
    for run in clip_line(chain, -8):
        run = [q for q in run if south_of_tram(q[0], q[1], 3)]
        L = sum(math.dist(run[i], run[i + 1]) for i in range(len(run) - 1))
        if len(run) >= 2 and L > 250: bus.append({'ref': tg.get('ref', ''), 'p': flat(run)})
for nid, t in TAGN.items():
    if (t.get('highway') == 'bus_stop' or (t.get('public_transport') in ('platform', 'stop_position') and t.get('bus') == 'yes')) and nid in nodes:
        x, z = nodes[nid]
        if inside((x, z), -3) and south_of_tram(x, z, 2) and not any(math.hypot(x - s[0], z - s[1]) < 15 for s in stops): stops.append([r1(x), r1(z)])
print('traffic', len(signals), 'signals', sum(1 for s in signals if s[2] == 0), 'lights', len(bus), 'bus runs', len(stops), 'stops')

out = {
    'meta': {'hx': r1(HX), 'hz': r1(HZ), 'cx': r1(CX), 'cz': r1(CZ), 'x0': X0, 'x1': X1, 'z0': Z0, 'z1': Z1, 'lat0': lat0, 'lon0': lon0,
             'src': '© OpenStreetMap contributors (ODbL); IGN BD TOPO & RGE ALTI (Licence Ouverte)'},
    'tram': {'x0': X0, 'step': TSTEP, 's': [r1(v) for v in tS], 'n': [r1(v) for v in tN]},
    'names': names, 'buildings': buildings, 'roads': roads, 'rails': rails,
    'greens': greens, 'trees': trees, 'traffic': {'signals': signals, 'bus': bus, 'stops': stops},
    'dem': ({'nx': BD['dem']['nx'], 'nz': BD['dem']['nz'], 'step': BD['dem']['STEP'], 'x0': BD['dem']['X0'], 'z0': BD['dem']['Z0'], 'h': BD['dem']['h']} if BD else None),
}
with open(dst, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('half extents', round(HX), round(HZ))
print('buildings', len(buildings), 'roads', len(roads), 'rails', len(rails), 'greens', len(greens),
      'trees', len(trees) // 2, 'names', len(names))

