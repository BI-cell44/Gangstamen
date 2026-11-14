"""Breakable fences, hedges, garden walls and gates along the properties (cycle 8) -> data/fences.json.
Sources: OpenStreetMap barrier ways (fence, wall, hedge, railing) and gate nodes; where OSM has nothing, the front edges
of the cadastre parcels (IGN Parcellaire Express) that face a street get a low wall with a railing, or a hedge.
Output: panels of about 2.4 m, [x*10, z*10, angle*1000, kind, length*10]; kind 0 wood fence, 1 low wall and railing,
2 hedge, 3 gate, 4 garden wall. Usage: python3 src/make_fences.py data/map.osm data/cadastre.json data/world_raw.json data/fences.json"""
import sys, json, math, random, xml.etree.ElementTree as ET

osm, cad, world, dst = sys.argv[1:5]
random.seed(44)
W = json.load(open(world)); C = json.load(open(cad))
m = W['meta']; CX, CZ, HX, HZ = m['cx'], m['cz'], m['hx'], m['hz']
lat0, lon0 = 47.2025, -1.5900050000000001
KX = math.cos(math.radians(lat0)) * 111320.0; KZ = 110540.0
proj = lambda la, lo: ((lo - lon0) * KX, -(la - lat0) * KZ)
TS, TX0, TSTEP = W['tram']['s'], W['tram']['x0'], W['tram']['step']
def tramS(x):
    c = (x - TX0) / TSTEP; i = max(0, min(len(TS) - 2, int(c))); u = max(0.0, min(1.0, c - i)); return TS[i] + (TS[i + 1] - TS[i]) * u
def inside(x, z, mg=6): return abs(x - CX) < HX - mg and abs(z - CZ) < HZ - mg and z > tramS(x) + 6

# streets: segments by 20 m cell, with half width; distance to the carriageway edge
RC = 20; road = {}
for r in W['roads']:
    if not r['d']: continue
    p = r['p']
    for i in range(0, len(p) - 2, 2):
        s = (p[i], p[i + 1], p[i + 2], p[i + 3], r['w'] / 2)
        for gx in range(int(min(s[0], s[2]) // RC) - 1, int(max(s[0], s[2]) // RC) + 2):
            for gz in range(int(min(s[1], s[3]) // RC) - 1, int(max(s[1], s[3]) // RC) + 2):
                road.setdefault((gx, gz), []).append(s)
def road_d(x, z):
    best = 1e9
    for ax, az, bx, bz, hw in road.get((int(x // RC), int(z // RC)), []):
        dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1e-9; u = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L2))
        best = min(best, math.hypot(ax + dx * u - x, az + dz * u - z) - hw)
    return best
# footways too: a fence never crosses a path
foot = {}
for r in W['roads']:
    if r['d']: continue
    p = r['p']
    for i in range(0, len(p) - 2, 2):
        s = (p[i], p[i + 1], p[i + 2], p[i + 3], r['w'] / 2)
        for gx in range(int(min(s[0], s[2]) // RC) - 1, int(max(s[0], s[2]) // RC) + 2):
            for gz in range(int(min(s[1], s[3]) // RC) - 1, int(max(s[1], s[3]) // RC) + 2):
                foot.setdefault((gx, gz), []).append(s)
def foot_d(x, z):
    best = 1e9
    for ax, az, bx, bz, hw in foot.get((int(x // RC), int(z // RC)), []):
        dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1e-9; u = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L2))
        best = min(best, math.hypot(ax + dx * u - x, az + dz * u - z) - hw)
    return best
# buildings: polygons by cell
bld = {}
for b in W['buildings']:
    p = b['p']; xs, zs = p[0::2], p[1::2]
    for gx in range(int(min(xs) // RC), int(max(xs) // RC) + 1):
        for gz in range(int(min(zs) // RC), int(max(zs) // RC) + 1):
            bld.setdefault((gx, gz), []).append(p)
def pip(x, z, p):
    c = False; n = len(p) // 2
    for i in range(n):
        x1, z1, x2, z2 = p[2 * i], p[2 * i + 1], p[2 * ((i + 1) % n)], p[2 * ((i + 1) % n) + 1]
        if (z1 > z) != (z2 > z) and x < x1 + (z - z1) * (x2 - x1) / (z2 - z1): c = not c
    return c
def in_building(x, z, pad=0.0):
    for dx, dz in ((0, 0), (pad, 0), (-pad, 0), (0, pad), (0, -pad)) if pad else ((0, 0),):
        for p in bld.get((int((x + dx) // RC), int((z + dz) // RC)), []):
            if pip(x + dx, z + dz, p): return True
    return False

panels = []; taken = {}
def free(x, z):
    k = (int(x // 2), int(z // 2))
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for (px, pz) in taken.get((k[0] + i, k[1] + j), []):
                if math.hypot(px - x, pz - z) < 1.6: return False
    return True
def put(x, z, a, kind, L):
    if not inside(x, z) or in_building(x, z, 0.5) or road_d(x, z) < 0.6 or foot_d(x, z) < 0.3 or not free(x, z): return False
    panels.append([round(x * 10), round(z * 10), round(a * 1000), kind, round(L * 10)])
    taken.setdefault((int(x // 2), int(z // 2)), []).append((x, z)); return True
def line(pts, kind, step=3.0):
    for i in range(len(pts) - 1):
        (ax, az), (bx, bz) = pts[i], pts[i + 1]; L = math.hypot(bx - ax, bz - az)
        if L < 0.8: continue
        n = max(1, round(L / step)); a = math.atan2(bz - az, bx - ax)
        for k in range(n):
            u = (k + 0.5) / n; put(ax + (bx - ax) * u, az + (bz - az) * u, a, kind, L / n)

# 1. OpenStreetMap (gates, then barrier ways)
root = ET.parse(osm).getroot(); nodes = {}; gates = []
for n in root.iter('node'):
    nodes[n.get('id')] = proj(float(n.get('lat')), float(n.get('lon')))
    t = {x.get('k'): x.get('v') for x in n.findall('tag')}
    if t.get('barrier') in ('gate', 'swing_gate', 'sliding_gate'): gates.append(nodes[n.get('id')])
# 2. gates first (the fence around them stops at the gate): across the opening, facing the street
gate_n = 0
for x, z in gates:
    d = road_d(x, z)
    if d > 12: continue
    best = None  # direction of the nearest street segment
    for ax, az, bx, bz, hw in road.get((int(x // RC), int(z // RC)), []):
        dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1e-9; u = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L2))
        dd = math.hypot(ax + dx * u - x, az + dz * u - z)
        if best is None or dd < best[0]: best = (dd, math.atan2(dz, dx))
    if best and put(x, z, best[1], 3, 3.2): gate_n += 1
KIND = {'fence': 0, 'railing': 1, 'hedge': 2, 'wall': 4}
osm_n = 0
for w in root.iter('way'):
    t = {x.get('k'): x.get('v') for x in w.findall('tag')}
    k = KIND.get(t.get('barrier'))
    if k is None: continue
    if t.get('barrier') == 'wall' and t.get('wall') in ('retaining', 'noise_barrier', 'castle_wall'): continue
    pts = [nodes[nd.get('ref')] for nd in w.findall('nd') if nd.get('ref') in nodes]
    if k == 4 and t.get('fence_type') is None and random.random() < 0.0: continue
    before = len(panels); line(pts, k); osm_n += len(panels) - before
# 3. cadastre: parcel edges along a street, where OSM has nothing (garden fronts)
cad_n = 0
for idu, cont, r in C['parcels']:
    if cont and cont > 6000: continue  # schools, factories, sports grounds
    pts = [(r[i] / 10, r[i + 1] / 10) for i in range(0, len(r), 2)]
    kind = 2 if random.random() < 0.3 else 1
    for i in range(len(pts) - 1):
        (ax, az), (bx, bz) = pts[i], pts[i + 1]; L = math.hypot(bx - ax, bz - az)
        if L < 4 or L > 60: continue
        mx, mz = (ax + bx) / 2, (az + bz) / 2
        if not inside(mx, mz): continue
        da, db, dm = road_d(ax, az), road_d(bx, bz), road_d(mx, mz)
        if not (0.8 < dm < 7 and da < 9 and db < 9): continue  # a front along the pavement
        # skip the stretches in front of a house: the facade is on the street line
        before = len(panels); n = max(1, round(L / 3.0)); a = math.atan2(bz - az, bx - ax)
        for k in range(n):
            u = (k + 0.5) / n; x, z = ax + (bx - ax) * u, az + (bz - az) * u
            if in_building(x, z, 1.2): continue
            if random.random() < 0.06: continue  # a driveway or a gap now and then
            put(x, z, a, kind, L / n)
        cad_n += len(panels) - before

json.dump({'source': 'OpenStreetMap (ODbL) barrier=*; IGN Parcellaire Express (Etalab 2.0)', 'panels': panels}, open(dst, 'w'), separators=(',', ':'))
print('panels', len(panels), 'osm', osm_n, 'gates', gate_n, 'cadastre', cad_n)
