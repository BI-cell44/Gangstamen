"""Street furniture from the OpenStreetMap extract: bus shelters, bins, benches (positions in game metres).

usage: make_furniture.py <map.osm> <out.json>        (Python 3, no dependencies)
The HD build breaks them when a car drives through; the council puts them back a little later.
"""
import sys, json, math, collections
import xml.etree.ElementTree as ET

osm, out = sys.argv[1:3]
lat0, lon0 = 47.2025, -1.5900050000000001
KX = math.cos(math.radians(lat0)) * 111320.0; KZ = 110540.0
X0, X1, Z0, Z1 = -372.5, 1664.0, -840.0, 686.5  # play area, see convert.py
items = []
for ev, el in ET.iterparse(osm, events=('end',)):
    if el.tag != 'node': continue
    t = {x.get('k'): x.get('v') for x in el.findall('tag')}
    kind = None
    if t.get('amenity') == 'shelter' and t.get('shelter_type') == 'public_transport': kind = 'shelter'
    elif t.get('highway') == 'bus_stop' and t.get('shelter') == 'yes': kind = 'shelter'
    elif t.get('amenity') == 'waste_basket': kind = 'bin'
    elif t.get('amenity') == 'bench': kind = 'bench'
    if not kind: continue
    x, z = (float(el.get('lon')) - lon0) * KX, -(float(el.get('lat')) - lat0) * KZ
    if X0 < x < X1 and Z0 < z < Z1 and not any(i['t'] == kind and math.hypot(i['x'] - x, i['z'] - z) < 4 for i in items):
        items.append({'t': kind, 'x': round(x, 1), 'z': round(z, 1)})
    el.clear()
json.dump(items, open(out, 'w'), separators=(',', ':'))
print('furniture', len(items), collections.Counter(i['t'] for i in items))
