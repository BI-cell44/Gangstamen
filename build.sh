#!/bin/sh
# Rebuild gangstamen.html (classic) and gangstamen-hd.html (HD renderer) from the sources and data.
# Python 3, no dependencies.
set -e
cd "$(dirname "$0")"
mkdir -p build && cd build
cp ../data/world_raw.json ../data/facades2.json ../data/shops.json ../data/facade_hints.json ../data/furniture.json ../data/fences.json .
rm -rf models && cp -r ../data/models models
cp ../data/people.json .
# the sources are split by system (src/*.parts list the files in order); the HD renderer and the HD game layer are
# assembled the same way and inlined into the template at their markers
python3 - <<'PY'
def assemble(manifest):
    parts = [l.strip() for l in open('../src/' + manifest, encoding='utf-8') if l.strip() and not l.startswith('#')]
    return ''.join(open('../src/' + p, encoding='utf-8').read() for p in parts)
t = assemble('template.parts')
assert t.count('/*@HD_MODULE@*/') == 1 and t.count('/*@GX_MODULE@*/') == 1
t = t.replace('/*@HD_MODULE@*/', assemble('hd.parts')).replace('/*@GX_MODULE@*/', assemble('gx.parts'))
open('template.html', 'w', encoding='utf-8').write(t)
PY
python3 ../src/carve.py                                   # smooth road profiles, bridges, finer terrain -> world.json
python3 ../src/make_belt.py                               # the town carries on past the edges (invented backdrop) -> world.json
# data/facades_curated is made from data/facades by src/curate_facades.py (needs Pillow + numpy); it is committed
python3 ../src/build_photos.py ../data/facades_curated gangstamen_facades2   # embed data + Panoramax facades -> gangstamen.html
# HD variant: same code with the HD flag, drawn facades only (no photo atlas) and the IGN aerial photo for ground and roofs
python3 - <<'PY'
import base64, re
t = open('gangstamen.html', encoding='utf-8').read()
assert t.count('const HD = false;') == 1 and t.count('<title>Gangstamen</title>') == 1
t = t.replace('const HD = false;', 'const HD = true;').replace('<title>Gangstamen</title>', '<title>Gangstamen HD</title>')
ortho = base64.b64encode(open('../data/ortho/ortho.jpg', 'rb').read()).decode()
pre = '<script>window.PHOTO_ATLAS=[];window.ORTHO={src:"data:image/jpeg;base64,' + ortho + '",x0:-440,z0:-1000,x1:2400,z1:760};</script>'
t, n = re.subn(r'<script>window\.PHOTO_ATLAS=\[.*?\];</script>', lambda m: pre, t, count=1, flags=re.S)
assert n == 1
open('gangstamen-hd.html', 'w', encoding='utf-8').write(t)
PY
# Ultra variant (branch ultra): the HD build with the ULTRA flag, for the features of docs/BACKLOG.md
python3 - <<'PY'
t = open('gangstamen-hd.html', encoding='utf-8').read()
assert t.count('const ULTRA = false;') == 1 and t.count('<title>Gangstamen HD</title>') == 1
t = t.replace('const ULTRA = false;', 'const ULTRA = true;').replace('<title>Gangstamen HD</title>', '<title>Gangstamen Ultra</title>')
# postcard photographs (data/postcards/<id>.jpg, credits in data/postcards/credits.json), inlined before the game code
import json, os, base64
pc = {}
d = '../data/postcards'
if os.path.isdir(d):
    cred = json.load(open(d + '/credits.json', encoding='utf-8')) if os.path.exists(d + '/credits.json') else {}
    for f in sorted(os.listdir(d)):
        if f.endswith('.jpg'):
            k = f[:-4]; c = cred.get(k, {})
            pc[k] = {'src': 'data:image/jpeg;base64,' + base64.b64encode(open(d + '/' + f, 'rb').read()).decode(), 'author': c.get('author', '?'), 'license': c.get('license', '?'), 'url': c.get('url', '')}
# (16 nov., user) the aerial photo only steers the drawn roofs and lawns, read blurred: a 1024 px copy is enough in Ultra
small = '../data/ortho/ortho_1024.jpg'
if os.path.exists(small):
    import re
    o = base64.b64encode(open(small, 'rb').read()).decode()
    t, n = re.subn(r'window\.ORTHO=\{src:"data:image/jpeg;base64,[^"]*"', lambda m: 'window.ORTHO={lod:2,src:"data:image/jpeg;base64,' + o + '"', t, count=1)  # lod: 4x smaller, two mip levels less
    assert n == 1
tag = '<script>window.PHOTO_ATLAS='
assert t.count(tag) == 1, t.count(tag)
t = t.replace(tag, '<script>window.POSTCARDS=' + json.dumps(pc, ensure_ascii=False) + ';</script>' + tag)
open('gangstamen-ultra.html', 'w', encoding='utf-8').write(t)
PY
cp gangstamen.html gangstamen-hd.html gangstamen-ultra.html ..
echo "gangstamen.html, gangstamen-hd.html and gangstamen-ultra.html rebuilt"
