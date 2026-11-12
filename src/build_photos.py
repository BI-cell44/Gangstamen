"""Merge the Panoramax facade atlas into world.json and assemble gangstamen.html."""
import json, base64, sys

up = sys.argv[1]  # folder holding gangstamen_facades*.{jpg,json}
w = json.load(open('world.json', encoding='utf-8'))
PFX = sys.argv[2] if len(sys.argv) > 2 else 'gangstamen_facades'
fac = json.load(open('facades2.json' if PFX.endswith('2') else 'facades.json'))
meta = json.load(open(f'{up}/{PFX}.json'))
w['photos'] = {
    'atlas': meta['atlas'],
    'fac': [[int(f['id'].split(':')[0]), int(f['id'].split(':')[1]), f['yb'], f['yt']] for f in fac],
    'ch': [[c['f'], c['u0'], c['u1'], c['t'], c['x'], c['y'], c['w'], c['h']] for c in meta['chunks']],
}
if meta.get('bt'):
    w['photos']['bt'] = meta['bt']
prods = sorted({p for c in meta['chunks'] for p in (c.get('prods') or [c.get('prod')])})
print('chunks', len(meta['chunks']), 'producers', prods)
atl = [base64.b64encode(open(f'{up}/{PFX}_{k}.jpg', 'rb').read()).decode() for k in range(len(meta['atlas']))]
t = open('template.html', encoding='utf-8').read()
wj = json.dumps(w, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
pre = '<script>window.PHOTO_ATLAS=[' + ','.join('"data:image/jpeg;base64,' + a + '"' for a in atl) + '];</script>\n'
t = t.replace('<script id="world" type="application/json">/*WORLD*/</script>', pre + '<script id="world" type="application/json">' + wj + '</script>')
open('gangstamen.html', 'w', encoding='utf-8').write(t)
print('html bytes', len(t.encode()))
