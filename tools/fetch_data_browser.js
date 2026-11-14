// Gangstamen: map data download, to paste in the console of a browser page on https://overpass-api.de/
// (the sandbox has no access to OSM, Overpass or the IGN Géoplateforme; a real browser does, and these services allow CORS).
// Each block saves a file to the Downloads folder (the Claude desktop built-in browser names them *.tmp).
// Then, in the repository:
//   cp <osm> data/map.osm ; cp <bdtopo> data/bdtopo.json ; cp <ortho> data/ortho/ortho_raw.jpg
//   python3 src/convert.py data/map.osm data/world_raw.json data/bdtopo.json
//   python3 src/make_street_data.py data/map.osm data/facades data/facades2.json data
//   python3 src/make_furniture.py data/map.osm data/furniture.json
//   python3 src/make_ortho.py data/ortho/ortho_raw.jpg data/ortho/ortho.jpg
//   sh build.sh
// Game metres: origin 47.2025 N, -1.590005 E (do not change: every position in the code depends on it).

const lat0 = 47.2025, lon0 = -1.5900050000000001, KX = Math.cos(lat0 * Math.PI / 180) * 111320, KZ = 110540;
const save = (data, name, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type })); a.download = name; document.body.append(a); a.click(); };

// 1. OpenStreetMap extract (about 25 MB)
async function osm() {
  const q = `[out:xml][timeout:300][bbox:47.1950,-1.5960,47.2115,-1.5670];(nwr;>;);out body;`;
  let t = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) }).then(r => r.text());
  t = t.replace(/<meta[^>]*>/, m => m + '\n  <bounds minlat="47.1950" minlon="-1.5960" maxlat="47.2115" maxlon="-1.5670"/>');
  save(t, 'gangstamen_map.osm', 'application/xml');
}

// 2. IGN BD TOPO buildings (compact rows) and RGE ALTI height grid -> bdtopo.json
async function bdtopo() {
  const P = ([lo, la]) => [(lo - lon0) * KX, -(la - lat0) * KZ], f10 = v => v == null ? '' : Math.round(v * 10), rows = [];
  const base = 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3:batiment&SRSNAME=EPSG:4326&outputFormat=application/json&BBOX=47.1950,-1.5960,47.2115,-1.5670,urn:ogc:def:crs:EPSG::4326&COUNT=1000&STARTINDEX=';
  for (let s = 0; ; s += 1000) {
    const j = await fetch(base + s).then(r => r.json());
    for (const ft of j.features) {
      const p = ft.properties, g = ft.geometry; if (!g) continue;
      let A = 0, cx = 0, cz = 0;
      for (const poly of g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates]) {
        const ring = poly[0].map(c => P(c[1] > 40 ? c : [c[1], c[0]]));
        for (let i = 0; i < ring.length - 1; i++) { const [x1, z1] = ring[i], [x2, z2] = ring[i + 1], k = x1 * z2 - x2 * z1; A += k; cx += (x1 + x2) * k; cz += (z1 + z2) * k; }
      }
      if (Math.abs(A) < 1e-6) continue; cx /= 3 * A; cz /= 3 * A; A = Math.abs(A) / 2;
      rows.push([Math.round(cx * 10), Math.round(cz * 10), Math.round(A), f10(p.altitude_minimale_sol), f10(p.hauteur), f10(p.altitude_maximale_toit), p.nombre_d_etages ?? '', p.usage_1 || '', p.nature || '', p.materiaux_des_murs ?? '', p.materiaux_de_la_toiture ?? ''].join(','));
    }
    if (j.features.length < 1000) break;
  }
  const X0 = -540, Z0 = -1100, STEP = 12.5, nx = 196, nz = 150, N = nx * nz, h = new Array(N);
  for (let s = 0; s < N; s += 2000) {
    const lo = [], la = [];
    for (let i = s; i < Math.min(N, s + 2000); i++) { lo.push((lon0 + (X0 + (i % nx) * STEP) / KX).toFixed(7)); la.push((lat0 - (Z0 + ((i / nx) | 0) * STEP) / KZ).toFixed(7)); }
    const j = await fetch('https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lon: lo.join('|'), lat: la.join('|'), resource: 'ign_rge_alti_wld', zonly: 'true' }) }).then(r => r.json());
    j.elevations.forEach((z, k) => h[s + k] = Math.round((typeof z === 'object' ? z.z : z) * 10));
  }
  const cnt = i => { const o = {}; for (const r of rows) { const k = r.split(',')[i]; o[k] = (o[k] || 0) + 1; } return o; };
  save(JSON.stringify({ dem: { nx, nz, STEP, X0, Z0, h }, rows, usages: cnt(7), natures: cnt(8) }), 'gangstamen_bdtopo.json', 'application/json');
}

// 3. IGN aerial photo, x -440..1840, z -1000..760 at 0.4 m per pixel (9 WMS tiles)
async function ortho() {
  const x0 = -440, x1 = 1840, z0 = -1000, z1 = 760, M = 0.4, W = Math.round((x1 - x0) / M), H = Math.round((z1 - z0) / M);
  const cv = new OffscreenCanvas(W, H), g = cv.getContext('2d'), tw = Math.ceil(W / 3), th = Math.ceil(H / 3);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const px0 = i * tw, pz0 = j * th, pw = Math.min(tw, W - px0), ph = Math.min(th, H - pz0), ax = x0 + px0 * M, az = z0 + pz0 * M;
    const bb = [lat0 - (az + ph * M) / KZ, lon0 + ax / KX, lat0 - az / KZ, lon0 + (ax + pw * M) / KX].map(v => v.toFixed(8)).join(',');
    const b = await fetch('https://data.geopf.fr/wms-r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&STYLES=&CRS=EPSG:4326&BBOX=' + bb + '&WIDTH=' + pw + '&HEIGHT=' + ph + '&FORMAT=image/jpeg').then(r => r.blob());
    g.drawImage(await createImageBitmap(b), px0, pz0);
  }
  save(await cv.convertToBlob({ type: 'image/jpeg', quality: 0.9 }), 'gangstamen_ortho.jpg');
}
