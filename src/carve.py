"""Make roads drivable on the IGN ground model:
1. upsample the 12.5 m elevation grid to 6.25 m,
2. give every road a smooth height profile (no bumps from embankments or walls),
3. flatten the ground under and beside each road to that profile.
Input world_raw.json, output world.json."""
import json, math

w = json.load(open('world_raw.json', encoding='utf-8'))
D = w['dem']
nx, nz, st, x0, z0 = D['nx'], D['nz'], D['step'], D['x0'], D['z0']
H = [v / 10 for v in D['h']]

def g0(x, z):
    fx = max(0, min(nx - 1.001, (x - x0) / st)); fz = max(0, min(nz - 1.001, (z - z0) / st))
    i, j = int(fx), int(fz); u, v = fx - i, fz - j
    a, b, c, d = H[j*nx+i], H[j*nx+i+1], H[(j+1)*nx+i], H[(j+1)*nx+i+1]
    return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v

# 1. upsample x2
S = st / 2
NX, NZ = (nx - 1) * 2 + 1, (nz - 1) * 2 + 1
G = [g0(x0 + i * S, z0 + j * S) for j in range(NZ) for i in range(NX)]

# 2. smooth road profiles
def densify(p, step=2.0):
    o = [(p[0], p[1])]
    for k in range(0, len(p) - 2, 2):
        ax, az, bx, bz = p[k], p[k+1], p[k+2], p[k+3]
        L = math.hypot(bx - ax, bz - az); n = max(1, math.ceil(L / step))
        for s in range(1, n + 1):
            o.append((ax + (bx - ax) * s / n, az + (bz - az) * s / n))
    return o

samples = []  # (x, z, height, half width)
bridges = []
def _end_h(x, z, ox, oz):
    L = math.hypot(ox, oz) or 1
    return max(g0(x, z), g0(x + ox / L * 6, z + oz / L * 6), g0(x + ox / L * 10, z + oz / L * 10))
bridge_ends = []
for r in w['roads']:
    if r.get('b'):
        p = r['p']
        bridge_ends.append((p[0], p[1], _end_h(p[0], p[1], p[0] - p[2], p[1] - p[3])))
        bridge_ends.append((p[-2], p[-1], _end_h(p[-2], p[-1], p[-2] - p[-4], p[-1] - p[-3])))
for r in w['roads']:
    if r.get('b'):
        # bridge deck: straight between the two ends, taken at street level just beyond each end
        p = r['p']; pts = densify(p)
        def end_h(x, z, ox, oz):
            L = math.hypot(ox, oz) or 1
            return max(g0(x, z), g0(x + ox / L * 6, z + oz / L * 6), g0(x + ox / L * 10, z + oz / L * 10))
        h0 = end_h(p[0], p[1], p[0] - p[2], p[1] - p[3])
        h1 = end_h(p[-2], p[-1], p[-2] - p[-4], p[-1] - p[-3])
        tot = sum(math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]) for i in range(len(pts)-1)) or 1
        acc = 0; out = []
        for i, (x, z) in enumerate(pts):
            if i: acc += math.hypot(x - pts[i-1][0], z - pts[i-1][1])
            out += [round(x, 2), round(z, 2), round(h0 + (h1 - h0) * acc / tot, 2)]
        bridges.append({'w': r['w'], 'd': r['d'], 'n': r['n'], 'p': out})
        continue
    pts = densify(r['p'])
    hs = [g0(x, z) for x, z in pts]
    # near a bridge end, hold the road at deck level so the approach meets the deck without a step
    for k, (x, z) in enumerate(pts):
        for bx, bz, bh in bridge_ends:
            d = math.hypot(x - bx, z - bz)
            if d < 16:
                wgt = 1 if d < 6 else 1 - (d - 6) / 10
                hs[k] = hs[k] * (1 - wgt) + bh * wgt
    # distance-weighted moving average over +-14 m (7 samples each side), two passes
    for _ in range(2):
        hs = [sum(hs[max(0, i - 7):i + 8]) / len(hs[max(0, i - 7):i + 8]) for i in range(len(hs))]
    for k, (x, z) in enumerate(pts):
        for bx, bz, bh in bridge_ends:
            d = math.hypot(x - bx, z - bz)
            if d < 16:
                wgt = 1 if d < 6 else 1 - (d - 6) / 10
                hs[k] = hs[k] * (1 - wgt) + bh * wgt
    hw = r['w'] / 2
    for (x, z), h in zip(pts, hs):
        samples.append((x, z, h, hw, r['d']))

# 3. flatten the ground around each road sample
best = {}  # grid index -> (weight, height)
for x, z, h, hw, drive in samples:
    R = hw + (7.0 if drive else 3.0)
    i0, i1 = int((x - R - x0) // S), int((x + R - x0) // S) + 1
    j0, j1 = int((z - R - z0) // S), int((z + R - z0) // S) + 1
    for j in range(max(0, j0), min(NZ, j1 + 1)):
        gz = z0 + j * S
        for i in range(max(0, i0), min(NX, i1 + 1)):
            gx = x0 + i * S
            d = math.hypot(gx - x, gz - z)
            if d > R: continue
            core = hw + (1.5 if drive else 0.5)
            wt = 1.0 if d <= core else 1 - (d - core) / (R - core)
            wt *= 1.0 if drive else 0.6
            k = j * NX + i
            ob = best.get(k)
            if ob is None or wt > ob[0] or (wt == ob[0] and d < ob[2]):
                best[k] = (wt, h, d)
for k, (wt, h, _) in best.items():
    G[k] = G[k] * (1 - wt) + h * wt

# 4. dry land stays dry: outside the Loire (OSM multipolygon, even-odd over its rings), ground under the water level is
# raised just above it, so the river plane no longer shows through on the quays and under the footbridges
WATER_Y, DRY = 0.4, 1.0
rings = [[(r['p'][k], r['p'][k + 1]) for k in range(0, len(r['p']), 2)] for r in w.pop('river', [])]
raised = 0
if rings:
    edges = [(a, b) for ring in rings for a, b in zip(ring, ring[1:] + ring[:1])]
    for j in range(NZ):
        gz = z0 + j * S; xs = []
        for (ax, az), (bx, bz) in edges:
            if (az > gz) != (bz > gz): xs.append(ax + (gz - az) * (bx - ax) / (bz - az))
        xs.sort()
        for i in range(NX):
            k = j * NX + i
            if G[k] >= DRY: continue
            gx = x0 + i * S; n = 0
            for x in xs:
                if x < gx: n += 1
                else: break
            if n % 2 == 0: G[k] = DRY; raised += 1
print('dry land raised', raised)

D2 = {'nx': NX, 'nz': NZ, 'step': S, 'x0': x0, 'z0': z0, 'h': [round(v * 10) for v in G]}
w['dem'] = D2
w['bridges'] = bridges
json.dump(w, open('world.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('bridges', len(bridges)); print('grid', NX, 'x', NZ, 'at', S, 'm; road samples', len(samples), '; grid points flattened', len(best))
