#!/bin/sh
# Rebuild gangstamen.html (classic) and gangstamen-hd.html (HD renderer) from the sources and data.
# Python 3, no dependencies.
set -e
cd "$(dirname "$0")"
mkdir -p build && cd build
cp ../data/world_raw.json ../data/facades2.json ../data/shops.json ../data/facade_hints.json ../data/furniture.json .
# the HD renderer lives in its own file and is inlined into the template
python3 - <<'PY'
t = open('../src/template.html', encoding='utf-8').read()
assert '/*@HD_MODULE@*/' in t
assert '/*@GX_MODULE@*/' in t
t = t.replace('/*@HD_MODULE@*/', open('../src/hd.js', encoding='utf-8').read()).replace('/*@GX_MODULE@*/', open('../src/gx.js', encoding='utf-8').read())
open('template.html', 'w', encoding='utf-8').write(t)
PY
python3 ../src/carve.py                                   # smooth road profiles, bridges, finer terrain -> world.json
# data/facades_curated is made from data/facades by src/curate_facades.py (needs Pillow + numpy); it is committed
python3 ../src/build_photos.py ../data/facades_curated gangstamen_facades2   # embed data + Panoramax facades -> gangstamen.html
# HD variant: same code with the HD flag, drawn facades only (no photo atlas) and the IGN aerial photo for ground and roofs
python3 - <<'PY'
import base64, re
t = open('gangstamen.html', encoding='utf-8').read()
assert t.count('const HD = false;') == 1 and t.count('<title>Gangstamen</title>') == 1
t = t.replace('const HD = false;', 'const HD = true;').replace('<title>Gangstamen</title>', '<title>Gangstamen HD</title>')
ortho = base64.b64encode(open('../data/ortho/ortho.jpg', 'rb').read()).decode()
pre = '<script>window.PHOTO_ATLAS=[];window.ORTHO={src:"data:image/jpeg;base64,' + ortho + '",x0:-440,z0:-1000,x1:1840,z1:760};</script>'
t, n = re.subn(r'<script>window\.PHOTO_ATLAS=\[.*?\];</script>', lambda m: pre, t, count=1, flags=re.S)
assert n == 1
open('gangstamen-hd.html', 'w', encoding='utf-8').write(t)
PY
# Ultra variant (branch ultra): the HD build with the ULTRA flag, for the features of docs/BACKLOG.md
python3 - <<'PY'
t = open('gangstamen-hd.html', encoding='utf-8').read()
assert t.count('const ULTRA = false;') == 1 and t.count('<title>Gangstamen HD</title>') == 1
t = t.replace('const ULTRA = false;', 'const ULTRA = true;').replace('<title>Gangstamen HD</title>', '<title>Gangstamen Ultra</title>')
open('gangstamen-ultra.html', 'w', encoding='utf-8').write(t)
PY
cp gangstamen.html gangstamen-hd.html gangstamen-ultra.html ..
echo "gangstamen.html, gangstamen-hd.html and gangstamen-ultra.html rebuilt"
