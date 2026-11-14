// ---------- driving physics v2 ("réaliste"): a bicycle model with tyres, weight transfer, engine and gearbox ----------
// Used for the local players' cars when settings.physics === 'real' (HD builds); bots, traffic and the classic build keep
// the arcade model of drive(). Units: metres, seconds, kilograms, newtons. Car frame: x forward, y to the LEFT, yaw
// rate r > 0 turns left (c.h grows), like the arcade model. Each car type has its own data (VEHICLES), tuned on the
// fun side of real (a 90s hot hatch with about 1.5 times its real punch), so that town fights stay lively.
const VEHICLES = {
  //          mass  front/rear axle to centre  CG height  peak torque  drive   grip   drag     top gear
  saloon: { m: 1150, a: 1.22, b: 1.42, h: 0.52, T: 330, drive: 'R', mu: 1.12, cda: 0.70, gears: [3.4, 2.1, 1.48, 1.12, 0.88], fd: 3.9, turbo: true },
  p205:   { m: 900,  a: 1.00, b: 1.42, h: 0.50, T: 280, drive: 'F', mu: 1.18, cda: 0.62, gears: [3.3, 2.0, 1.44, 1.10, 0.86], fd: 4.1 },
  hatch:  { m: 1000, a: 1.05, b: 1.45, h: 0.51, T: 280, drive: 'F', mu: 1.15, cda: 0.66, gears: [3.3, 2.0, 1.44, 1.10, 0.86], fd: 4.0 },
  r5:     { m: 850,  a: 0.98, b: 1.43, h: 0.49, T: 265, drive: 'F', mu: 1.16, cda: 0.62, gears: [3.4, 2.1, 1.48, 1.12, 0.88], fd: 4.2 },
  sport:  { m: 1050, a: 1.10, b: 1.40, h: 0.45, T: 360, drive: 'R', mu: 1.26, cda: 0.58, gears: [3.2, 2.0, 1.42, 1.1, 0.88], fd: 3.8, turbo: true, pitch: 1.15 },
  van:    { m: 1500, a: 1.30, b: 1.60, h: 0.78, T: 300, drive: 'F', mu: 1.00, cda: 0.95, gears: [3.8, 2.2, 1.45, 1.05, 0.82], fd: 4.3, pitch: 0.72 },
  twingo: { m: 800,  a: 0.95, b: 1.40, h: 0.55, T: 200, drive: 'F', mu: 1.10, cda: 0.68, gears: [3.6, 2.2, 1.5, 1.12, 0.86], fd: 4.2 },
};
VEHICLES.police = VEHICLES.saloon;
// gripK and torqueK: game factors over the real figures (14 Nov.: a strictly real setting was unplayable in town: too slow
// off the line, unable to turn). The model keeps its behaviour (weight, slides, gears), at arcade-like pace.
const PHYS = { g: 9.81, rw: 0.30, idle: 900, red: 6800, up: 6300, down: 2600, eff: 0.85, roll: 0.015, airG: 1.35, gripK: 2.3, torqueK: 2.2, steer: 0.62, steerV: 20 };
const vehOf = c => VEHICLES[c.style] || VEHICLES.saloon;
const useRealPhysics = c => HD && c.local && settings.physics === 'real';
// grip of the surface under the car: carriageway, pavement, or the rest (grass, gravel); wet roads lose a quarter
function surfaceGrip(x, z) {
  const d = roadEdge(x, z)[0];
  let k = d < 0.3 ? 1 : d < 4 ? 0.93 : 0.68;
  if (HD && hd.amb && hd.amb.wet) k *= 1 - 0.25 * Math.min(1, hd.amb.wet);
  return k;
}
// engine torque at the crank (N·m) for a given rpm: rises to a peak around 4 000 rpm, falls towards the red line
function engineTorque(V, rpm) {
  const x = Math.max(0, Math.min(1, (rpm - PHYS.idle) / (PHYS.red - PHYS.idle)));
  return V.T * PHYS.torqueK * (0.85 + 0.15 * Math.sin(Math.PI * Math.min(1, x * 1.15))); // flat torque: lively from low revs
}
// lateral tyre force (simplified magic formula): grows with the slip angle, peaks near 8°, then fades a little
const tyreY = (alpha, Fz, mu) => mu * Fz * Math.sin(1.35 * Math.atan(9 * alpha));
// rear tyres: same stiffness but no fall past the peak, and a little more grip than the front. Real enough to feel the
// weight move, stable enough for a game: the car understeers when pushed, and the handbrake still breaks the rear loose
const tyreYRear = (alpha, Fz, mu) => mu * 1.15 * Fz * Math.tanh(12.1 * alpha / 1.15);

function planarReal(c, inp, dt) {
  const V = vehOf(c), L = V.a + V.b, m = V.m, Iz = m * V.a * V.b * 1.05, g = PHYS.g;
  const ph = c.phys || (c.phys = { gear: 1, rpm: PHYS.idle, ax: 0, r: 0, shift: 0, slipR: 0 });
  const T = c.tune || {}; // garage settings of this car (cycle 12): sport tyres, short gearbox, stronger brakes, 0 to 3
  const grip = (c.air > 0.25 ? 0.04 : 1) * (c._grip ?? surfaceGrip(c.x, c.z)), mu = V.mu * PHYS.gripK * grip * (1 + 0.05 * (T.grip || 0)); // c._grip: test hook
  const [fx, fz] = c.fwd, rx = -fz, rz = fx;
  let u = c.vx * fx + c.vz * fz, v = -(c.vx * rx + c.vz * rz); // forward, left
  let r = ph.r;
  // steering: smoothed input, less lock at speed (keyboard friendly)
  c.steer += (inp.s - c.steer) * Math.min(1, dt * 8);
  const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
  const power = (c.accK || 1) * (c.nitro > 0 ? 1.55 : 1), vmax = (c.maxV || 44) * (c.nitro > 0 ? 1.25 : 1);
  for (let s = 0; s < n; s++) {
    const spd = Math.abs(u), delta = c.steer * PHYS.steer / (1 + (spd / PHYS.steerV) ** 2); // speed-sensitive steering
    // gearbox (automatic) and engine speed
    const wheelRpm = u / PHYS.rw * 60 / (2 * Math.PI), ratio = V.gears[ph.gear - 1] * V.fd * (1 + 0.06 * (T.gear || 0));
    ph.rpm = Math.max(PHYS.idle, Math.abs(wheelRpm) * ratio);
    if (ph.shift > 0) ph.shift -= h;
    else if (ph.rpm > PHYS.up && ph.gear < V.gears.length && inp.t > 0) { ph.gear++; ph.shift = 0.1; }
    else if (ph.rpm < PHYS.down && ph.gear > 1) { ph.gear--; ph.shift = 0.06; }
    // longitudinal forces: engine through the driven wheels, brakes, reverse
    let Fdrive = 0, Fbrake = 0;
    if (inp.t > 0 && u > -1) {
      const tq = engineTorque(V, Math.min(PHYS.red, ph.rpm)) * power * (ph.shift > 0 ? 0.5 : 1);
      Fdrive = inp.t * tq * ratio * PHYS.eff / PHYS.rw * Math.max(0, Math.min(1, (vmax - u) / 3)); // limiter at the game's top speed
    } else if (inp.t < 0) {
      if (u > 0.8) Fbrake = -inp.t * mu * m * g * 1.05 * (1 + 0.12 * (T.brake || 0)); // full braking ~1 g
      else Fdrive = inp.t * 4200 * Math.max(0, Math.min(1, (13 + u) / 3)); // reverse, up to ~13 m/s
    } else if (inp.t > 0 && u <= -1) Fbrake = inp.t * mu * m * g; // forward while rolling back: brake first
    // loads with weight transfer (from last step's acceleration)
    const Fzf = m * g * V.b / L - m * ph.ax * V.h / L, Fzr = m * g * V.a / L + m * ph.ax * V.h / L;
    const sgn = u >= 0 ? 1 : -1;
    let Fxf = 0, Fxr = 0;
    const bf = Fbrake * 0.65 * -sgn, br = Fbrake * 0.35 * -sgn;
    if (V.drive === 'F') Fxf = Fdrive; else Fxr = Fdrive;
    Fxf += bf; Fxr += br;
    if (inp.hb) Fxr += -sgn * Math.min(Math.abs(u) * m, mu * Fzr * 0.75); // handbrake locks the rear
    // traction limits (friction circle) and lateral forces
    const capF = mu * Math.max(0, Fzf), capR = mu * Math.max(0, Fzr) * (inp.hb ? 0.75 : 1);
    // traction control: when steering, the engine leaves part of the driven wheels' grip to the turn
    const tc = 1 - 0.4 * Math.abs(c.steer); // full traction in a straight line, 60 % with the wheel turned
    if (V.drive === 'F' && Fxf > 0) Fxf = Math.min(Fxf, tc * capF); if (V.drive === 'R' && Fxr > 0 && !inp.hb) Fxr = Math.min(Fxr, tc * capR);
    // brake distribution (like ABS): braking never takes more than 85 % of an axle's grip, so the tyres still hold the
    // car sideways; the engine never more than 92 % (a front-wheel drive at full throttle kept no grip to go straight)
    if (!inp.hb && Fbrake > 0) { Fxf = Math.max(-0.85 * capF, Math.min(0.85 * capF, Fxf)); Fxr = Math.max(-0.85 * capR, Math.min(0.85 * capR, Fxr)); }
    Fxf = Math.max(-capF, Math.min(0.92 * capF, Fxf)); Fxr = Math.max(-capR, Math.min(inp.hb ? capR : 0.92 * capR, Fxr));
    let Fyf = 0, Fyr = 0;
    if (spd > 1.5) {
      // slip angles. The tyre force always opposes the sideways speed of its axle, forwards or backwards; only the
      // steering term changes sign in reverse. (Until 14 Nov. the whole angle was flipped in reverse: the tyres pushed
      // the car further sideways instead of holding it, and it slid away at up to 25 m/s: the "car that translates
      // sideways" reported by the user, in reverse and at the end of every hard braking that ran into reverse.)
      const af = sgn * delta - Math.atan2(v + V.a * r, spd), ar = -Math.atan2(v - V.b * r, spd);
      Fyf = tyreY(af, Math.max(0, Fzf), mu) * Math.sqrt(Math.max(0, 1 - (Fxf / (capF || 1)) ** 2));
      Fyr = tyreYRear(ar, Math.max(0, Fzr), mu * (inp.hb ? 0.45 : 1)) * Math.sqrt(Math.max(0.15, 1 - (Fxr / (capR || 1)) ** 2));
      ph.slipR = Math.abs(ar);
    } else ph.slipR = 0;
    // resistances
    const Fres = -(0.5 * 1.2 * V.cda * u * Math.abs(u) + PHYS.roll * m * g * Math.sign(u) * Math.min(1, spd));
    // equations of motion in the car frame
    const cosd = Math.cos(delta), sind = Math.sin(delta);
    const Fx = Fxr + Fxf * cosd - Fyf * sind + Fres, Fy = Fyr + Fyf * cosd + Fxf * sind;
    let du = Fx / m + v * r, dv = Fy / m - u * r, dr = (V.a * (Fyf * cosd + Fxf * sind) - V.b * Fyr) / Iz;
    if (spd <= 1.5) { // parking speeds: rolls where the wheels point, no sliding
      dv = -v * 12; dr = 0; r = u * Math.tan(delta) / L;
    }
    // slope of the Chantenay hills
    const slope = (surfaceH(c.x + fx * 1.7, c.z + fz * 1.7) - surfaceH(c.x - fx * 1.7, c.z - fz * 1.7)) / 3.4;
    du -= g * slope * (c.air > 0.25 ? 0 : 1);
    u += du * h; v += dv * h; r += dr * h;
    // stability aid (like ESP): without the handbrake the car never turns faster than its grip allows at that speed,
    // and the slide is gently brought back; the handbrake switches it off for drifts
    if (!inp.hb && spd > 5) { const rMax = 1.15 * mu * g / spd; if (Math.abs(r) > rMax) r = Math.sign(r) * rMax; if (Math.abs(v) > 0.25 * spd) v *= Math.exp(-3 * h); }
    if (!inp.hb && u < -1.5 && Math.abs(v) > 0.3 * spd) v *= Math.exp(-8 * h); // reversing: no drifting backwards
    if (!inp.hb && spd < 7) { v *= Math.exp(-(7 - spd) * 1.2 * h); r *= Math.exp(-(7 - spd) * 0.25 * h * (Math.abs(c.steer) < 0.2 ? 1 : 0)); } // slowing down: the slide dies out with the speed instead of ending in a sideways drift
    if (inp.t === 0 && Fbrake === 0 && Math.abs(u) < 0.3) u *= Math.exp(-6 * h); // comes to rest
    const axTrue = Math.max(-1.5 * g, Math.min(1.5 * g, Fx / m)); // weight transfer follows the real longitudinal acceleration (forces / mass), not du, which carries the v·r turning term
    ph.ax = ph.ax + (axTrue - ph.ax) * Math.min(1, h * 10);
    c.h += r * h;
  }
  r = Math.max(-4, Math.min(4, r)); ph.r = r;
  // drift flag for the effects and the sound: the rear steps out
  c.drift = ph.slipR > 0.16 && Math.abs(u) > 6 ? 0.8 : Math.max(0, (c.drift || 0) - dt * 2.5);
  const [nfx, nfz] = c.fwd, nrx = -nfz, nrz = nfx;
  c.vx = nfx * u - nrx * v; c.vz = nfz * u - nrz * v;
}
// the engine note follows the revs in the realistic mode: an equivalent "speed" for sfx.engine (intro, old callers)
function engineVoice(c) {
  if (!c.phys || !useRealPhysics(c)) return c.speed;
  return Math.max(0, (c.phys.rpm - PHYS.idle) / (PHYS.red - PHYS.idle)) * 38 + 4;
}
// What the engine sounds like this frame (sound v2): revs, load (0..1), gear, gear change in progress. In the realistic
// mode it is the real gearbox; in arcade (and for every other car), a virtual gearbox from the speed, so the note climbs,
// drops at each change and settles in top gear, instead of a siren that follows the speed.
const ARC_GEARS = [0, 8, 14.5, 21, 29, 38, 99]; // m/s at which the virtual gearbox changes up
function engineState(c, thr) {
  const es = c._es || (c._es = { rpm: PHYS.idle, gear: 1, load: 0, shift: 0 });
  thr = Math.max(0, Math.min(1, thr || 0));
  if (c.phys && useRealPhysics(c)) {
    es.rpm = c.phys.rpm; es.shift = c.phys.shift || 0; es.gear = c.phys.gear; es.pitch = vehOf(c).pitch || 1;
    es.load += ((es.shift > 0 ? 0.2 : thr) - es.load) * 0.3;
    return es;
  }
  es.pitch = (VEHICLES[c.style] && VEHICLES[c.style].pitch) || 1; // diesel van lower, sports coupé higher
  const v = Math.abs(c.speed || Math.hypot(c.vx || 0, c.vz || 0));
  let g = es.gear;
  while (g < ARC_GEARS.length - 2 && v > ARC_GEARS[g]) g++;
  while (g > 1 && v < ARC_GEARS[g - 1] - 2.5) g--;
  if (g !== es.gear) { es.shift = g > es.gear ? 0.12 : 0.06; es.gear = g; }
  es.shift = Math.max(0, es.shift - 1 / 60);
  const lo = g > 1 ? ARC_GEARS[g - 1] - 2.5 : 0, hi = ARC_GEARS[g], k = Math.max(0, Math.min(1.08, (v - lo) / (hi - lo)));
  const target = c.air > 0.3 && thr > 0 ? PHYS.red * 0.95 : PHYS.idle + (PHYS.up - PHYS.idle) * (g === 1 ? k : 0.42 + 0.58 * k);
  es.rpm += (target - es.rpm) * 0.25;
  es.load += ((es.shift > 0 ? 0.2 : thr) - es.load) * 0.3;
  return es;
}
