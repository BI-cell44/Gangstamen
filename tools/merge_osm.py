"""Add an OpenStreetMap extract to data/map.osm without disturbing what is already there (15 Nov. 2026: strip east of
the first extract, from the OSM API in four tiles, for the île de Nantes). Elements already present keep their place and
their order (building numbers depend on it); new nodes, ways and relations go at the end of each kind; the bounds grow.
usage: merge_osm.py <base.osm> <more.osm> <out.osm>"""
import sys, re
base, more, out = sys.argv[1:4]
A = open(base, encoding='utf-8').read(); B = re.sub(r' (?:user|uid|changeset|timestamp|visible)="[^"]*"', '', open(more, encoding='utf-8').read())  # no contributor names in the repository
EL = re.compile(r'<(node|way|relation) id="(\d+)"[^>]*?(?:/>|>.*?</\1>)', re.S)
have = set((m.group(1), m.group(2)) for m in EL.finditer(A))
add = {'node': [], 'way': [], 'relation': []}
for m in EL.finditer(B):
    k = (m.group(1), m.group(2))
    if k not in have: have.add(k); add[k[0]].append(m.group(0))
def bounds(t):
    b = re.search(r'<bounds minlat="([-\d.]+)" minlon="([-\d.]+)" maxlat="([-\d.]+)" maxlon="([-\d.]+)"/>', t); return [float(v) for v in b.groups()], b.group(0)
(a0, a1, a2, a3), sa = bounds(A); (b0, b1, b2, b3), _ = bounds(B)
A = A.replace(sa, '<bounds minlat="%.4f" minlon="%.4f" maxlat="%.4f" maxlon="%.4f"/>' % (min(a0, b0), min(a1, b1), max(a2, b2), max(a3, b3)))
# new nodes before the first way, new ways before the first relation, new relations before </osm>
i = A.index('<way '); A = A[:i] + '\n'.join(add['node']) + '\n  ' + A[i:]
i = A.index('<relation '); A = A[:i] + '\n'.join(add['way']) + '\n  ' + A[i:]
i = A.rindex('</osm>'); A = A[:i] + '\n'.join(add['relation']) + '\n' + A[i:]
open(out, 'w', encoding='utf-8').write(A)
print('added', {k: len(v) for k, v in add.items()}, 'bytes', len(A))
