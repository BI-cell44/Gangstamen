// ---------- seeded random ----------
let seed = 1996;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const hash = n => { let x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

