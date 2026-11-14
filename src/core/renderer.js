// ---------- renderer / scene ----------
const HD = false; // build flag: build.sh writes gangstamen-hd.html with this set to true
const ULTRA = false; // build flag (branch ultra): gangstamen-ultra.html, the HD build that gets the docs/BACKLOG.md cycles
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
let retro = !HD;
const setRatio = () => HD || renderer.setPixelRatio(retro ? 0.5 : Math.min(devicePixelRatio, 1.5));
setRatio();
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !isTouch;
renderer.shadowMap.type = HD ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.5, 2200);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

function gradientTex(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([o, col]) => lg.addColorStop(o, col));
  g.fillStyle = lg; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; return t;
}
const SKY = {
  day: gradientTex([[0, '#1d1240'], [0.35, '#6b2a6e'], [0.62, '#e2557a'], [0.8, '#ff9b52'], [1, '#ffcf8a']]),
  night: gradientTex([[0, '#03020a'], [0.5, '#120a26'], [0.85, '#2a1640'], [1, '#3a1d3e']]),
};
const hemi = new THREE.HemisphereLight(0xffd2a8, 0x3a2c4a, 0.62);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffae66, 1.05);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 500 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);
const SUN_OFF = new THREE.Vector3(-150, 95, 70);

