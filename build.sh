#!/bin/sh
# Rebuild gangstamen.html (classic) and gangstamen-hd.html (HD renderer) from the sources and data.
# Python 3, no dependencies.
set -e
cd "$(dirname "$0")"
mkdir -p build && cd build
cp ../data/world_raw.json ../data/facades2.json .
# the HD renderer lives in its own file and is inlined into the template
python3 - <<'PY'
t = open('../src/template.html', encoding='utf-8').read()
assert '/*@HD_MODULE@*/' in t
open('template.html', 'w', encoding='utf-8').write(t.replace('/*@HD_MODULE@*/', open('../src/hd.js', encoding='utf-8').read()))
PY
python3 ../src/carve.py                                   # smooth road profiles, bridges, finer terrain -> world.json
python3 ../src/build_photos.py ../data/facades gangstamen_facades2   # embed data + Panoramax facades -> gangstamen.html
python3 - <<'PY'
t = open('gangstamen.html', encoding='utf-8').read()
assert t.count('const HD = false;') == 1 and t.count('<title>Gangstamen</title>') == 1
t = t.replace('const HD = false;', 'const HD = true;').replace('<title>Gangstamen</title>', '<title>Gangstamen HD</title>')
open('gangstamen-hd.html', 'w', encoding='utf-8').write(t)
PY
cp gangstamen.html gangstamen-hd.html ..
echo "gangstamen.html and gangstamen-hd.html rebuilt"
