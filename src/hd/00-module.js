// >>> HD MODULE
// ================= HD renderer =================
// Linear HDR pipeline (float target, MSAA, bloom, ACES tone mapping), procedural sky with image-based reflections,
// soft shadows, lofted car bodies with clear-coat paint, a particle system (smoke, fire, sparks), skid marks,
// debris, street lamps. Only active in the HD build (const HD = true); the classic build never calls into it.
const hd = !HD ? null : (() => {
  const isGL2 = renderer.capabilities.isWebGL2;
  const floatRT = isGL2 && !!renderer.extensions.get('EXT_color_buffer_float');
  let RT_TYPE = floatRT ? THREE.HalfFloatType : THREE.UnsignedByteType;
  // (17 nov.) safe levels when the picture stays black (frame.js, watchBlack): 1 no MSAA, 2 8-bit targets, 3 no post-processing
  let safe = 0;
  const QUAL = [
    { name: 'Basse', scale: 0.6, dpr: 1, msaa: 0, shadow: 1024, bloom: 3, parts: 0.5 },
    { name: 'Moyenne', scale: 0.8, dpr: 1.25, msaa: 2, shadow: 2048, bloom: 4, parts: 0.75 },
    { name: 'Haute', scale: 1, dpr: 1.5, msaa: 4, shadow: 4096, bloom: 5, parts: 1 },
    { name: 'Ultra', scale: 1, dpr: 2, msaa: 4, shadow: 4096, bloom: 5, parts: 1 },
  ];
  let q = QUAL[2], qi = 2, time = 0;
  const lin = h => new THREE.Color(h).convertSRGBToLinear();
  const linHex = h => lin(h).getHex();

