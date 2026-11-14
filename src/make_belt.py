#!/usr/bin/env python3
"""Beyond the edges of the map, the town carries on (asked by the user: edges that make sense).

The real data stops 60 m past the play area and the ground was then an empty plain. This adds, into build/world.json:
the streets that cross the edge, prolonged by 200 m or so; houses and blocks along them and in the gaps; trees. All of
it is invented (flagged x: 1), out of reach behind the edge walls, and only there to be seen. Deterministic.
"""
import json, math, random
rnd = random.Random(1996)
w = json.load(open('world.json', encoding='utf-8'))
M, D = w['meta'], w['dem']
X0, X1, Z0, Z1 = M['x0'], M['x1'], M['z0'], M['z1']
NX, NZ, S, DX0, DZ0, H = D['nx'], D['nz'], D['step'], D['x0'], D['z0'], D['h']
WATER, REAL, DEPTH = 1.0, 7.0, 250.0       # dry above 1 m; the belt starts 7 m past the edge walls (where the real data leaves room) and goes 250 m out
T = w.get('tram')

def ground(x, z):
    i = max(0, min(NX - 1, int(round((x - DX0) / S)))); j = max(0, min(NZ - 1, int(round((z - DZ0) / S))))
    return H[j * NX + i] / 10
def tram_n(x):       # z of the far (north) track of the tram, the northern edge of the game
    k = max(0.0, min(len(T['n']) - 1.001, (x - T['x0']) / T['step'])); i = int(k); return T['n'][i] + (T['n'][i + 1] - T['n'][i]) * (k - i)
def out(x, z):       # how far outside the play area (negative inside); to the north the edge is the tram line
    north = (tram_n(x) - 9) - z if T else Z0 - z
    return max(X0 - x, x - X1, north, z - Z1)
def in_belt(x, z):
    o = out(x, z)
    return REAL < o < DEPTH and ground(x, z) > WATER

# occupied space: a hash of circles (rough, enough to keep things apart)
cells = {}
def free(x, z, r):
    for gx in range(int((x - r - 16) // 16), int((x + r + 16) // 16) + 1):
        for gz in range(int((z - r - 16) // 16), int((z + r + 16) // 16) + 1):
            for (ox, oz, orr) in cells.get((gx, gz), ()):
                if math.hypot(x - ox, z - oz) < r + orr: return False
    return True
def take(x, z, r): cells.setdefault((int(x // 16), int(z // 16)), []).append((x, z, r))
for b in w['buildings']:
    p = b['p']; n = len(p) // 2; cx, cz = sum(p[0::2]) / n, sum(p[1::2]) / n
    if out(cx, cz) > -40: take(cx, cz, max(math.hypot(p[2 * i] - cx, p[2 * i + 1] - cz) for i in range(n)))

def box(cx, cz, ux, uz, wd, dp):   # rectangle: width along (ux, uz), depth across
    vx, vz = -uz, ux; pts = []
    for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        pts += [round(cx + ux * a * wd / 2 + vx * b * dp / 2, 1), round(cz + uz * a * wd / 2 + vz * b * dp / 2, 1)]
    return pts
for r in w['roads'] + w.get('rails', []):
    p = r['p']
    for k in range(0, len(p) - 2, 2):
        L = math.hypot(p[k + 2] - p[k], p[k + 3] - p[k + 1]); n = max(1, int(L // 5))
        for i in range(n + 1):
            x, z = p[k] + (p[k + 2] - p[k]) * i / n, p[k + 1] + (p[k + 3] - p[k + 1]) * i / n
            if out(x, z) > -30: take(x, z, r.get('w', 3) / 2 + 1.5)
new_b, new_r, new_t = [], [], []
def house(cx, cz, ux, uz, big):
    wd, dp = (rnd.uniform(18, 34), rnd.uniform(11, 14)) if big else (rnd.uniform(7.5, 14), rnd.uniform(8, 11.5))
    r = math.hypot(wd, dp) / 2 * 0.82
    if not in_belt(cx, cz) or not free(cx, cz, r): return False
    hs = [ground(cx + ux * a * wd / 2 - uz * b * dp / 2, cz + uz * a * wd / 2 + ux * b * dp / 2) for a in (-1, 1) for b in (-1, 1)]
    if min(hs) < WATER or max(hs) - min(hs) > 5: return False
    take(cx, cz, r)
    new_b.append({'h': round(rnd.uniform(11, 19) if big else rnd.uniform(5.5, 9.5), 1), 'k': 1 if big else 0, 'p': box(cx, cz, ux, uz, wd, dp), 'x': 1})
    return True

# 1. the streets that leave the map carry on, with a slow bend, houses on both sides
ends = []
allpts = {}
for ri, r in enumerate(w['roads']):
    if r['d']:
        for k in range(0, len(r['p']), 2): allpts.setdefault((int(r['p'][k] // 6), int(r['p'][k + 1] // 6)), []).append((r['p'][k], r['p'][k + 1], ri))
def joined(x, z, ri):   # another street passes at this point: not a cut end
    for gx in (-1, 0, 1):
        for gz in (-1, 0, 1):
            for (ox, oz, oi) in allpts.get((int(x // 6) + gx, int(z // 6) + gz), ()):
                if oi != ri and math.hypot(x - ox, z - oz) < 3: return True
    return False
for ri, r in enumerate(w['roads']):
    if not r['d'] or r.get('b'): continue
    p = r['p']
    for (i0, i1) in ((len(p) - 2, len(p) - 4), (0, 2)):
        ex, ez, px, pz = p[i0], p[i0 + 1], p[i1], p[i1 + 1]
        if out(ex, ez) < 1 or out(px, pz) >= out(ex, ez) or joined(ex, ez, ri): continue   # cut by the edge of the data
        L = math.hypot(ex - px, ez - pz)
        if L < 0.5 or any(math.hypot(ex - e[0], ez - e[1]) < 9 for e in ends): continue
        ends.append((ex, ez)); ux, uz = (ex - px) / L, (ez - pz) / L
        # head outwards: blend the street's direction with the outward normal of the nearest edge
        nx, nz = max(((X0 - ex, (-1, 0)), (ex - X1, (1, 0)), ((tram_n(ex) - 9 if T else Z0) - ez, (0, -1)), (ez - Z1, (0, 1))))[1]
        ux, uz = ux * 0.6 + nx * 0.4, uz * 0.6 + nz * 0.4; L = math.hypot(ux, uz); ux, uz = ux / L, uz / L
        pts, x, z, turn = [ex, ez], ex, ez, rnd.uniform(-0.12, 0.12)
        for step in range(10):
            c, s = math.cos(turn), math.sin(turn); ux, uz = ux * c - uz * s, ux * s + uz * c
            x2, z2 = x + ux * 28, z + uz * 28
            if out(x2, z2) > DEPTH + 10 or ground(x2, z2) < WATER or out(x2, z2) < out(x, z): break
            # houses along this stretch, both sides
            for side in (-1, 1):
                a = rnd.uniform(0, 4)
                while a < 26:
                    big = rnd.random() < 0.18; off = r['w'] / 2 + (9.5 if big else 7.5)
                    house(x + ux * a - uz * side * off, z + uz * a + ux * side * off, ux, uz, big)
                    a += rnd.uniform(9, 16) if not big else rnd.uniform(24, 34)
            x, z = x2, z2; pts += [round(x, 1), round(z, 1)]
        if len(pts) >= 4:
            new_r.append({'w': r['w'], 'd': 1, 'n': r['n'], 'b': 0, 'p': pts, 'x': 1})
            for k in range(0, len(pts), 2): take(pts[k], pts[k + 1], r['w'] / 2 + 1)

# 2. the gaps: scattered houses and blocks on a loose grid, turned like the nearest edge with a little disorder
gx = DX0 - 60
while gx < DX0 + NX * S + 60:
    gz = DZ0 - 60
    while gz < DZ0 + NZ * S + 60:
        x, z = gx + rnd.uniform(-7, 7), gz + rnd.uniform(-7, 7)
        if in_belt(x, z) and rnd.random() < 0.62:
            a = rnd.choice((0, math.pi / 2)) + rnd.uniform(-0.3, 0.3)
            house(x, z, math.cos(a), math.sin(a), rnd.random() < 0.22)
        gz += 27
    gx += 27
# 3. trees between the houses
for _ in range(2600):
    x, z = rnd.uniform(X0 - DEPTH, X1 + DEPTH), rnd.uniform(Z0 - DEPTH - 80, Z1 + DEPTH)
    if in_belt(x, z) and free(x, z, 3.5): take(x, z, 2.5); new_t += [round(x, 1), round(z, 1)]

w['buildings'] += new_b; w['roads'] += new_r; w['trees'] += new_t   # appended: the indices of the real ones do not move
json.dump(w, open('world.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('belt:', len(new_b), 'buildings,', len(new_r), 'streets,', len(new_t) // 2, 'trees')
