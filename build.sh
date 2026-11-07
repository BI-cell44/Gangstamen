#!/bin/sh
# Rebuild gangstamen.html from the sources and data (Python 3, no dependencies).
set -e
cd "$(dirname "$0")"
mkdir -p build && cd build
cp ../data/world_raw.json ../data/facades2.json ../src/template.html .
python3 ../src/carve.py                                   # smooth road profiles, bridges, finer terrain -> world.json
python3 ../src/build_photos.py ../data/facades gangstamen_facades2   # embed data + Panoramax facades -> gangstamen.html
cp gangstamen.html ../gangstamen.html
echo "gangstamen.html rebuilt"
