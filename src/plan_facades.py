"""Pick every building face visible from the Panoramax track along the two streets, and up to 3 panoramas per chunk."""
import json, math
w = json.load(open('world.json')); D = w['dem']; P = json.load(open('panos.json'))
def gH(x, z):
    fx = (x - D['x0']) / D['step']; fz = (z - D['z0']) / D['step']
    fx = max(0, min(D['nx'] - 1.001, fx)); fz = max(0, min(D['nz'] - 1.001, fz))
    i = int(fx); j = int(fz); u = fx - i; v = fz - j; H = D['h']; n = D['nx']
    return ((H[j*n+i]*(1-u)+H[j*n+i+1]*u)*(1-v)+(H[(j+1)*n+i]*(1-u)+H[(j+1)*n+i+1]*u)*v)/10
segs = []
for nm in ['Boulevard de la Liberté', 'Rue de la Marseillaise']:
    k = w['names'].index(nm)
    for r in w['roads']:
        if r['n'] == k and r['d']:
            p = r['p']; segs += [(p[i], p[i+1], p[i+2], p[i+3]) for i in range(0, len(p)-2, 2)]
def dstreet(x, z):
    best = 1e9
    for sx, sz, tx, tz in segs:
        ex, ez = tx-sx, tz-sz; l2 = ex*ex+ez*ez or 1e-6
        t = max(0, min(1, ((x-sx)*ex+(z-sz)*ez)/l2)); best = min(best, math.hypot(sx+ex*t-x, sz+ez*t-z))
    return best
# wall grid for occlusion
C = 10; grid = {}
def sa(p):
    n = len(p)//2; return sum(p[2*i]*p[2*((i+1)%n)+1]-p[2*((i+1)%n)]*p[2*i+1] for i in range(n))/2
for bi, b in enumerate(w['buildings']):
    p = b['p']; n = len(p)//2
    for e in range(n):
        ax, az, bx, bz = p[2*e], p[2*e+1], p[2*((e+1)%n)], p[2*((e+1)%n)+1]
        for i in range(int(min(ax,bx)//C), int(max(ax,bx)//C)+1):
            for j in range(int(min(az,bz)//C), int(max(az,bz)//C)+1):
                grid.setdefault((i,j), []).append((bi, e, ax, az, bx, bz))
def blocked(x1, z1, x2, z2, own):
    L = math.hypot(x2-x1, z2-z1); seen = set()
    for s in range(0, int(L)+2, 3):
        t = min(1, s/L) if L else 0; x = x1+(x2-x1)*t; z = z1+(z2-z1)*t
        for g in grid.get((int(x//C), int(z//C)), []):
            if (g[0], g[1]) in seen or (g[0], g[1]) == own: continue
            seen.add((g[0], g[1]))
            ax, az, bx, bz = g[2:]
            d1x, d1z = x2-x1, z2-z1; d2x, d2z = bx-ax, bz-az
            den = d1x*d2z - d1z*d2x
            if abs(den) < 1e-9: continue
            ta = ((ax-x1)*d2z - (az-z1)*d2x)/den; tb = ((ax-x1)*d1z - (az-z1)*d1x)/den
            if 0.02 < ta < 0.97 and 0 <= tb <= 1: return True
    return False
pcell = {}
for k, (x, z, pr, yr) in enumerate(P):
    pcell.setdefault((int(x//30), int(z//30)), []).append(k)
def near_panos(x, z):
    out = []
    for i in range(int(x//30)-1, int(x//30)+2):
        for j in range(int(z//30)-1, int(z//30)+2): out += pcell.get((i,j), [])
    return out
fac = []; chunks = []
for bi, b in enumerate(w['buildings']):
    p = b['p']; n = len(p)//2; A = sa(p); kind = b['k']
    cx = sum(p[0::2])/n; cz = sum(p[1::2])/n
    if dstreet(cx, cz) > 45: continue
    gmin = min(gH(p[2*i], p[2*i+1]) for i in range(n)); base = b.get('b', gH(cx, cz)); y0 = min(gmin, base)-0.6
    riseIn = b['r'] if 'r' in b else (2.4 if kind == 0 else 0)
    pitched = n == 4 and abs(A) < 600 and riseIn > 0.8 and kind != 2
    top = max(y0+2.5, base+b['h']+(0 if pitched else riseIn*0.45))
    for e in range(n):
        ax, az, bx, bz = p[2*e], p[2*e+1], p[2*((e+1)%n)], p[2*((e+1)%n)+1]
        L = math.hypot(bx-ax, bz-az)
        if L < 1.2: continue
        dx, dz = (bx-ax)/L, (bz-az)/L; nx, nz = (dz, -dx) if A > 0 else (-dz, dx)
        k = max(1, math.ceil(L/8)); fidx = None
        for s in range(k):
            u0, u1 = s/k, (s+1)/k
            mx, mz = ax+(bx-ax)*(u0+u1)/2, az+(bz-az)*(u0+u1)/2
            cand = []
            for pk in near_panos(mx, mz):
                x, z, pr, yr = P[pk]; vx, vz = x-mx, z-mz; d = math.hypot(vx, vz)
                if d < 3 or d > 28: continue
                cs = (vx*nx+vz*nz)/d
                if cs < 0.4: continue
                if blocked(x, z, mx+nx*0.3, mz+nz*0.3, (bi, e)): continue
                sc = d*(1.4-cs) + (4 if yr < 25 else 0) + (3 if pr == 3 else 0)
                cand.append((sc, pk, x, z))
            cand.sort()
            pick = []
            for c in cand:
                if all(math.hypot(c[2]-q[2], c[3]-q[3]) > 2.5 for q in pick): pick.append(c)
                if len(pick) == 3: break
            if not pick: continue
            if fidx is None:
                fidx = len(fac); yb = gH((ax+bx)/2, (az+bz)/2)-0.3
                fac.append({'id': f'{bi}:{e}', 'a': [round(ax,2), round(az,2)], 'b': [round(bx,2), round(bz,2)], 'yb': round(yb,2), 'yt': round(top,2), 'n': [round(nx,3), round(nz,3)]})
            chunks.append([fidx, round(u0,4), round(u1,4)] + [q[1] for q in pick])
json.dump(fac, open('facades2.json', 'w')); json.dump(chunks, open('chunks2.json', 'w'))
print('faces', len(fac), 'chunks', len(chunks), 'width', round(sum(math.hypot(f['b'][0]-f['a'][0], f['b'][1]-f['a'][1]) for f in fac)), 'm',
      'single-pano', sum(1 for c in chunks if len(c) == 4), 'panos used', len({q for c in chunks for q in c[3:]}))
comp = [[f['a'][0], f['a'][1], f['b'][0], f['b'][1], f['yb'], f['yt']] for f in fac]
s = json.dumps({'f': comp, 'c': chunks}, separators=(',', ':')); open('plan2.json', 'w').write(s); print('plan bytes', len(s))
