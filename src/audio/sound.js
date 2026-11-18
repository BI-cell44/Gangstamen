// ---------- sound (WebAudio, generated) ----------
const sfx = (() => {
  let nImp = 0, nBell = 0, ac = null, ambG = null, an = null, duckK = 1, me = null, tyre = null, roll = null, others = [], amb = {}, rainG = null, sirenO = null, sirenG = null, master, fxG, engO, engF, engG, musicG, noiseBuf, musicOn = true, step = 0, nextT = 0, timer = null, arr = 4; // arr: how much of the loop plays (the intro builds it up; 4 = all of it)
  const vol = { music: 0.7, fx: 0.8, amb: 0.8 };
  function init() {
    if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    fxG = ac.createGain(); fxG.gain.value = vol.fx; fxG.connect(master);
    engO = ac.createOscillator(); engO.type = 'sawtooth'; engF = ac.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 400;
    engG = ac.createGain(); engG.gain.value = 0.0; engO.connect(engF).connect(engG).connect(fxG); engO.start();
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    musicG = ac.createGain(); musicG.gain.value = 0.46 * vol.music; musicG.connect(master);
    // sound v2 buses: ambience (places, weather) on its own volume; an analyser on the master for the tests and the F3 meter
    ambG = ac.createGain(); ambG.gain.value = vol.amb; ambG.connect(master);
    an = ac.createAnalyser(); an.fftSize = 2048; master.connect(an);
    nextT = ac.currentTime + 0.1; timer = setInterval(schedule, 50);
  }
  function noise(t, dur, f, q, vol, dest, type = 'bandpass') {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const bf = ac.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(bf).connect(g).connect(dest || fxG); s.start(t); s.stop(t + dur + 0.05);
  }
  // 92 BPM West-coast style loop in E minor: bass, kick, snare, hats, a whiny lead
  const BPM = 92, S16 = 60 / BPM / 4;
  const BASS = [40, 0, 0, 40, 0, 0, 43, 0, 45, 0, 0, 45, 47, 0, 45, 43, 40, 0, 0, 40, 0, 0, 43, 0, 38, 0, 0, 38, 40, 0, 0, 0];
  const LEAD = { 0: 76, 6: 79, 8: 81, 14: 79, 16: 76, 22: 74, 24: 71 };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // the other stations of the car radio (HD): French boom-bap, Loire techno, Chantenay funk. Same scheduler, own tempo.
  let station = 0;
  const STATIONS = [
    { name: 'Chantenay FM 92.4', style: 'G-funk', bpm: 92 },
    { name: 'Rap Nantes 44', style: 'rap français', bpm: 90 },
    { name: 'Techno Loire 103.1', style: 'techno', bpm: 132 },
    { name: 'Radio Funk Sainte-Anne', style: 'funk', bpm: 104 },
  ];
  const s16 = () => 60 / STATIONS[station].bpm / 4;
  function tone(t, f, dur, type, vol, dest, opt = {}) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(opt.slide, t + dur);
    let node = o;
    if (opt.lp) { const bf = ac.createBiquadFilter(); bf.type = opt.bp ? 'bandpass' : 'lowpass'; bf.frequency.setValueAtTime(opt.lp, t); if (opt.lpTo) bf.frequency.exponentialRampToValueAtTime(opt.lpTo, t + dur); bf.Q.value = opt.q || 1; o.connect(bf); node = bf; }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (opt.att || 0.005)); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    node.connect(g).connect(dest || musicG); o.start(t); o.stop(t + dur + 0.05);
  }
  const kick = (t, v = 0.9, f0 = 130) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g).connect(musicG); o.start(t); o.stop(t + 0.32); };
  // rap: dusty minor piano chords, deep bass, swung hats, a bit of vinyl
  const RAP_CH = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]];
  const RAP_B = [45, 0, 0, 0, 0, 0, 45, 0, 0, 0, 41, 0, 0, 0, 0, 0];
  const RAP_HOOK = { 0: 81, 3: 79, 6: 76, 8: 74, 12: 76 };
  function rapStep(s, t, bar) {
    const sw = s % 2 ? s16() * 0.18 : 0; t += sw;
    if (s === 0 || s === 7 || s === 10) kick(t, 0.95, 110);
    if (s === 4 || s === 12) { noise(t, 0.2, 1500, 0.7, 0.75, musicG); noise(t, 0.08, 4000, 0.5, 0.3, musicG); }
    if (s % 2 === 0) noise(t, 0.035, 9000, 1.6, s % 4 ? 0.07 : 0.11, musicG, 'highpass');
    if (RAP_B[s]) { const b = mtof(RAP_B[s] - (bar % 4 === 3 ? 2 : 0) - 12); tone(t, b, 0.5, 'sine', 0.36); tone(t, b * 2, 0.4, 'sawtooth', 0.07, null, { lp: 700, lpTo: 300 }); }
    if (s === 0 || s === 6 || (s === 11 && bar % 2)) for (const n of RAP_CH[bar % 4]) tone(t, mtof(n), 0.55, 'triangle', 0.13, null, { lp: 2200 });
    if (bar % 4 >= 2 && RAP_HOOK[s]) tone(t, mtof(RAP_HOOK[s]), s16() * 3, 'sine', 0.09, null, { att: 0.03 }); // whistled hook every other pair of bars
    if (Math.random() < 0.3) noise(t, 0.01, 3000, 0.4, 0.03, musicG, 'highpass');
  }
  // techno: four on the floor, off-beat open hats, a 303-ish acid line
  const ACID = [33, 33, 45, 33, 36, 33, 43, 33, 33, 45, 33, 38, 33, 40, 33, 31];
  function technoStep(s, t, bar) {
    if (s % 4 === 0) { kick(t, 1, 150); noise(t, 0.012, 3500, 0.8, 0.25, musicG); }
    if (s % 4 === 2) noise(t, 0.09, 8500, 1, 0.13, musicG, 'highpass');
    if (s === 4 || s === 12) noise(t, 0.12, 1200, 1.4, 0.32, musicG);
    if (s % 8 === 6) for (const n of [57, 60, 64]) tone(t, mtof(n), 0.16, 'sawtooth', 0.035, null, { lp: 2600, lpTo: 900 });
    { const sweep = 400 + 1600 * (0.5 + 0.5 * Math.sin(bar * 0.7 + s * 0.05)); tone(t, mtof(ACID[s] + 12), s16() * 0.9, 'sawtooth', 0.13, null, { lp: sweep * 2.2, lpTo: sweep * 0.5, q: 12 }); }
    if (bar % 4 === 3 && s === 14) noise(t, 0.4, 2000, 0.4, 0.15, musicG, 'highpass');
  }
  // funk: slap bass, clavinet chops, brass stabs
  const FB = [40, 0, 52, 40, 0, 40, 50, 0, 43, 0, 55, 43, 45, 47, 0, 50];
  function funkStep(s, t, bar) {
    if (s === 0 || s === 3 || s === 10) kick(t, 0.85, 120);
    if (s === 4 || s === 12) noise(t, 0.16, 2000, 0.8, 0.65, musicG);
    if (s === 7 || s === 15) noise(t, 0.05, 2500, 1, 0.12, musicG);
    noise(t, 0.03, 9000, 1.6, s % 2 ? 0.05 : 0.09, musicG, 'highpass');
    if (FB[s]) { tone(t, mtof(FB[s] - 12), 0.18, 'square', 0.12, null, { lp: 900, lpTo: 200 }); tone(t, mtof(FB[s]), 0.14, 'square', 0.12, null, { lp: 2000, lpTo: 500 }); } // slap: the octave pops
    if (s % 4 === 2 || s === 7) for (const n of [64, 67, 71]) tone(t, mtof(n), 0.1, 'square', 0.1, null, { lp: 2400, lpTo: 900, q: 2 });
    if (s % 2 === 1) noise(t, 0.03, 2600, 3, 0.12, musicG); // muted guitar scratch
    if ((s === 14 || s === 15) || (bar % 2 === 0 && s === 6)) for (const n of [74, 79]) tone(t, mtof(n), 0.18, 'sawtooth', 0.08, null, { lp: 2400, att: 0.02 });
  }
  // (17 nov., user) « Rap Nantes 44 » in Ultra: a real boom-bap loop (8 bars, window.MUSIC.rap, see build.sh) instead of
  // the synthesised one, and a short voice (window.MUSIC.yo) every 4 bars when the build has one; the classic and HD
  // builds, and Ultra while the loop decodes, keep the synthesised station
  let rapBuf = null, rapSrc = null, rapLoading = false, yoBuf = null, nextYo = 0;
  const RAP_GAIN = 0.28; // level with the other stations (tools/run-tests.js, radio levels)
  function rapLoad() {
    const M = window.MUSIC; if (!M || !M.rap || rapBuf || rapLoading || !ac || !ac.decodeAudioData || typeof OfflineAudioContext !== 'undefined' && ac instanceof OfflineAudioContext) return;
    rapLoading = true;
    const dec = src => fetch(src).then(r => r.arrayBuffer()).then(a => new Promise((ok, ko) => ac.decodeAudioData(a, ok, ko)));
    dec(M.rap.src).then(b => { rapBuf = b; }).catch(e => console.warn('rap loop', e));
    if (M.yo) dec(M.yo.src).then(b => { yoBuf = b; }).catch(e => console.warn('yo', e));
  }
  function rapPlay(t) {
    if (rapSrc && rapSrc.context === ac) return;
    const M = window.MUSIC.rap, s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = RAP_GAIN;
    s.buffer = rapBuf; s.loop = true; s.loopStart = M.loopStart; s.loopEnd = M.loopEnd; s.connect(g).connect(musicG); s.start(t, M.loopStart);
    // the voice before bar 5 so that its « man » (MUSIC.yo.lead s in) falls on the first beat, then every 4 bars
    rapSrc = s; s._t0 = t; nextYo = t + (M.loopEnd - M.loopStart) / 8 * 4 - ((window.MUSIC.yo && window.MUSIC.yo.lead) || 0);
  }
  function rapStop() { if (!rapSrc) return; try { rapSrc.stop(); } catch (e) { } rapSrc = null; }
  function schedule(until) {
    if (!ac) return;
    rapLoad();
    if (musicOn && station === 1 && rapBuf) { // the loop plays by itself: only the voice to place
      rapPlay(Math.max(nextT, ac.currentTime + 0.03));
      const bar = (window.MUSIC.rap.loopEnd - window.MUSIC.rap.loopStart) / 8, end = until ?? ac.currentTime + 0.15;
      while (yoBuf && nextYo < end) { if (nextYo > ac.currentTime) { const v = ac.createBufferSource(), g = ac.createGain(); g.gain.value = window.MUSIC.yo.gain || 0.9; v.buffer = yoBuf; v.connect(g).connect(musicG); v.start(nextYo); } nextYo += bar * 4; }
      nextT = end; return;
    }
    if (rapSrc && rapSrc.context === ac) rapStop();
    while (nextT < (until ?? ac.currentTime + 0.15)) {
      if (musicOn && station > 0) {
        const s = step % 16, bar = (step / 16) | 0;
        if (station === 1) rapStep(s, nextT, bar); else if (station === 2) technoStep(s, nextT, bar); else funkStep(s, nextT, bar);
        nextT += s16(); step++; continue;
      }
      if (musicOn) {
        const s = step % 32, t = nextT;
        if (BASS[s] && arr >= 0) {
          const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
          o.type = 'square'; o.frequency.value = mtof(BASS[s]); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.25);
          g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
          o.connect(f).connect(g).connect(musicG); o.start(t); o.stop(t + 0.35);
        }
        if (arr >= 1 && (s % 8 === 0 || s === 11 || s === 27)) { // kick
          const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
          g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g).connect(musicG); o.start(t); o.stop(t + 0.3);
        }
        if (arr >= 2 && s % 8 === 4) noise(t, 0.18, 1800, 0.8, 0.5, musicG);
        if (arr >= 2 ? s % 2 === 0 : arr >= 0 && s % 4 === 0) noise(t, 0.04, 8000, 1.5, s % 4 === 2 ? 0.18 : 0.1, musicG, 'highpass');
        if (LEAD[s] && (arr === 3 || (arr > 3 && step % 64 >= 32))) {
          const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
          o.frequency.setValueAtTime(mtof(LEAD[s]) * 0.97, t); o.frequency.exponentialRampToValueAtTime(mtof(LEAD[s]), t + 0.12);
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + S16 * 5);
          o.connect(g).connect(musicG); o.start(t); o.stop(t + S16 * 5 + 0.05);
        }
      }
      nextT += S16; step++;
    }
  }
  // ---------- sound v2 ----------
  // A 4-cylinder engine: the firing frequency is rpm / 30 (two bangs per turn). The wave carries the harmonics of the
  // firing order, a sub-octave gives the crankshaft rumble, an amplitude wobble at half the firing rate makes the idle
  // lumpy, a soft clipper adds grit under load, and band-passed noise is the intake breathing. Optional turbo whistle.
  let engWave = null;
  function makeEngine(dest, full) {
    if (!engWave) { const re = new Float32Array(10), im = new Float32Array([0, 1, 0.75, 0.3, 0.55, 0.18, 0.28, 0.08, 0.14, 0.05]); engWave = ac.createPeriodicWave(re, im); }
    const e = { rpm: 900, load: 0, gear: 1, boost: 0, on: false };
    e.o1 = ac.createOscillator(); e.o1.setPeriodicWave(engWave);
    e.o2 = ac.createOscillator(); e.o2.type = 'sawtooth';
    e.g2 = ac.createGain(); e.g2.gain.value = 0.45;
    e.mix = ac.createGain(); e.mix.gain.value = 1;
    e.lp = ac.createBiquadFilter(); e.lp.type = 'lowpass'; e.lp.Q.value = 1.6;
    e.g = ac.createGain(); e.g.gain.value = 0;
    e.o1.connect(e.mix); e.o2.connect(e.g2).connect(e.mix);
    let node = e.lp; e.mix.connect(e.lp);
    if (full) {
      e.o3 = ac.createOscillator(); e.o3.type = 'square'; e.g3 = ac.createGain(); e.g3.gain.value = 0.08; e.o3.connect(e.g3).connect(e.mix);
      e.lfo = ac.createOscillator(); e.lfoG = ac.createGain(); e.lfoG.gain.value = 0.3; e.lfo.connect(e.lfoG).connect(e.mix.gain); e.lfo.start();
      const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; curve[i] = Math.tanh(2.2 * x); }
      e.sh = ac.createWaveShaper(); e.sh.curve = curve; e.lp.connect(e.sh); node = e.sh;
      e.ns = ac.createBufferSource(); e.ns.buffer = noiseBuf; e.ns.loop = true;
      e.bp = ac.createBiquadFilter(); e.bp.type = 'bandpass'; e.bp.Q.value = 1.2; e.ig = ac.createGain(); e.ig.gain.value = 0;
      e.ns.connect(e.bp).connect(e.ig).connect(e.g); e.ns.start();
      e.tw = ac.createOscillator(); e.tw.type = 'sine'; e.tg = ac.createGain(); e.tg.gain.value = 0; e.tw.connect(e.tg).connect(e.g); e.tw.start();
      e.o3.start();
    }
    if (dest.pan) { e.pan = ac.createStereoPanner(); node.connect(e.g).connect(e.pan).connect(dest.node); } else node.connect(e.g).connect(dest);
    e.o1.start(); e.o2.start();
    return e;
  }
  // rpm, load 0..1, gear, gear change running (s), turbo; k = extra gain (distance), f = pitch factor (Doppler)
  function driveEngine(e, s, on, k = 1, f = 1, turbo = false) {
    const t = ac.currentTime, rpmN = Math.max(0, Math.min(1, (s.rpm - 900) / 5900)), fr = s.rpm / 30 * f * (s.pitch || 1);
    e.o1.frequency.setTargetAtTime(fr, t, 0.025); e.o2.frequency.setTargetAtTime(fr / 2, t, 0.025);
    e.lp.frequency.setTargetAtTime(220 + fr * (2.2 + 4 * s.load) + 700 * s.load, t, 0.04);
    let g = on ? (0.032 + 0.05 * s.load + 0.028 * rpmN) * k : 0;
    if (s.shift > 0) g *= 0.35;
    e.g.gain.setTargetAtTime(g, t, s.shift > 0 ? 0.012 : 0.05); e._g = g;
    if (e.o3) {
      e.o3.frequency.setTargetAtTime(fr * 2.01, t, 0.025);
      e.lfo.frequency.setTargetAtTime(fr / 2, t, 0.05); e.lfoG.gain.setTargetAtTime(0.32 * (1 - rpmN) + 0.05, t, 0.1);
      e.bp.frequency.setTargetAtTime(500 + rpmN * 2400, t, 0.05); e.ig.gain.setTargetAtTime(on ? s.load * (0.04 + 0.1 * rpmN) * k : 0, t, 0.05);
      // lift-off at high revs: the exhaust pops (pétarades); turbo: blow-off valve
      if (on && e.load > 0.6 && s.load < 0.3 && rpmN > 0.55) {
        const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) noise(t + 0.05 + i * (0.06 + Math.random() * 0.08), 0.045, 260 + Math.random() * 500, 0.7, 0.35 * k, fxG, 'lowpass');
        if (turbo && e.boost > 0.4) noise(t, 0.35, 2600, 2.5, 0.12 * k, fxG);
      }
      if (turbo) { e.boost += ((s.load > 0.5 ? rpmN : 0) - e.boost) * (s.load > 0.5 ? 0.04 : 0.2); e.tw.frequency.setTargetAtTime(1800 + e.boost * 4200, t, 0.05); e.tg.gain.setTargetAtTime(on ? e.boost * 0.05 * k : 0, t, 0.05); }
    }
    e.load = s.load; e.on = on;
  }
  // a looping noise through a band-pass: tyre squeal, cobble rumble, water, crowd, tram rolling
  function loopNoise(f, q, dest, type = 'bandpass') {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const bf = ac.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q;
    const g = ac.createGain(); g.gain.value = 0; s.connect(bf).connect(g).connect(dest); s.start(); return { s, bf, g };
  }
  const level = (o, v, tc = 0.08) => { if (Math.abs(v - (o._l ?? -1)) > 0.003) { o._l = v; o.g.gain.setTargetAtTime(v, ac.currentTime, tc); } };
  function bellStrike(t, base, v, dest) { // a church bell: inharmonic partials (hum, prime, tierce, quint, nominal), long decay
    for (const [r, a, d] of [[0.5, 0.5, 6], [1, 0.8, 4], [1.19, 0.45, 3], [1.5, 0.3, 2.5], [2, 0.5, 2], [2.66, 0.2, 1.2], [3.01, 0.15, 1]]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = base * r; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, t + d);
      o.connect(g).connect(dest); o.start(t); o.stop(t + d + 0.1);
    }
  }
  function gull(t, v) { // a herring gull call: falling, wavering whistle, two or three times
    const n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) {
      const t0 = t + i * (0.32 + Math.random() * 0.1), o = ac.createOscillator(), g = ac.createGain(), bf = ac.createBiquadFilter(); o.type = 'sawtooth';
      const f0 = 1900 + Math.random() * 500; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t0 + 0.26);
      bf.type = 'bandpass'; bf.frequency.value = 2200; bf.Q.value = 3;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      o.connect(bf).connect(g).connect(ambG); o.start(t0); o.stop(t0 + 0.3);
    }
  }
  return {
    init,
    // the player's car (slot 0): engine from engineState(), tyre squeal from the slide, rumble on cobbles
    car(s, on, slip, cobbles, turbo) {
      if (!ac) return;
      if (!me) { me = makeEngine(fxG, true); tyre = [loopNoise(1250, 7, fxG), loopNoise(2300, 9, fxG)]; roll = loopNoise(90, 0.8, fxG, 'lowpass'); }
      driveEngine(me, s, on, 1, 1, turbo);
      const sq = on ? Math.max(0, Math.min(1, slip)) : 0;
      level(tyre[0], sq * 0.13); level(tyre[1], sq * sq * 0.07);
      if (sq > 0.05) { tyre[0].bf.frequency.setTargetAtTime(1100 + Math.random() * 350, ac.currentTime, 0.05); tyre[1].bf.frequency.setTargetAtTime(2100 + Math.random() * 500, ac.currentTime, 0.05); }
      level(roll, on ? cobbles : 0, 0.05);
    },
    // other cars near the listener, with distance, stereo position and Doppler; list of { s, k, f, pan }
    others(list) {
      if (!ac) return;
      while (others.length < list.length) others.push(makeEngine({ pan: true, node: fxG }, false));
      others.forEach((e, i) => { const o = list[i]; if (o) { driveEngine(e, o.s, true, o.k, o.f); e.pan.pan.setTargetAtTime(o.pan, ac.currentTime, 0.05); } else driveEngine(e, e, false); });
    },
    // a crash: a low thump and a metal crunch, both with the force (m/s of speed lost)
    impact(force) {
      if (!ac || force < 2) return; const t = ac.currentTime, k = Math.min(1, force / 22); nImp++;
      const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(110 - 40 * k, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.18);
      g.gain.setValueAtTime(0.25 + 0.6 * k, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g).connect(fxG); o.start(t); o.stop(t + 0.28);
      noise(t, 0.08 + 0.3 * k, 700 + 900 * k, 0.9, 0.2 + 0.45 * k);
      if (k > 0.35) { noise(t + 0.03, 0.5 * k, 3200, 4, 0.12 * k); noise(t + 0.08, 0.4, 5200, 6, 0.06 * k); } // glass and loose bits
    },
    // places: { water, crowd, tram, brake } levels 0..1, set every frame by soundscape.js
    places(p) {
      if (!ac) return;
      if (!amb.water) { amb.water = loopNoise(420, 0.5, ambG, 'lowpass'); amb.wash = loopNoise(900, 0.7, ambG); amb.crowd = loopNoise(650, 1.1, ambG); amb.crowd2 = loopNoise(1600, 1.6, ambG); amb.tram = loopNoise(140, 1.2, ambG, 'lowpass'); amb.brake = loopNoise(3400, 18, ambG); }
      const t = ac.currentTime, sw = 0.6 + 0.4 * Math.sin(t * 0.7) * Math.sin(t * 0.23); // the swell of the river
      level(amb.water, p.water * 0.11 * sw, 0.3); level(amb.wash, p.water * 0.035 * (1 - sw * 0.5), 0.3);
      const mur = 0.7 + 0.3 * Math.sin(t * 3.1) * Math.sin(t * 1.7); level(amb.crowd, p.crowd * 0.06 * mur, 0.2); level(amb.crowd2, p.crowd * 0.025 * (1.3 - mur), 0.2);
      level(amb.tram, p.tram * 0.16, 0.15); level(amb.brake, p.brake * 0.05, 0.05);
    },
    gull(v) { if (ac) gull(ac.currentTime, v); },
    bells(n, v) { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < n; i++) bellStrike(t + i * 2.2, 196, v, ambG); nBell += n; },
    // music and ambience go quieter while somebody speaks (mission dialogues)
    duck(on) { const k = on ? 0.35 : 1; if (!ac || k === duckK) return; duckK = k; musicG.gain.setTargetAtTime(0.46 * vol.music * k, ac.currentTime, on ? 0.08 : 0.6); ambG.gain.setTargetAtTime(vol.amb * (on ? 0.6 : 1), ac.currentTime, 0.3); },
    // loudness of the mix (RMS, 0..1) and the share of energy above 1 kHz: for the tests
    meter() { if (!an) return null; const a = new Float32Array(an.fftSize); an.getFloatTimeDomainData(a); let s = 0; for (const x of a) s += x * x; const fb = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(fb); let lo = 0, hi = 0; const k1 = Math.round(1000 / (ac.sampleRate / 2) * fb.length); fb.forEach((db, i) => { const p = Math.pow(10, db / 10); if (i < k1) lo += p; else hi += p; }); return { rms: Math.sqrt(s / a.length), hi: hi / (lo + hi || 1) }; },
    get ctx() { return ac; },
    get ducked() { return duckK < 1; },
    // loudness of each radio station (RMS of a few seconds rendered offline, same code as live): to keep them level
    // hp: high-pass in Hz, to hear it as small speakers do (laptop, phone: almost nothing under 200 Hz)
    async stationLevels(sec = 6, hp = 0) {
      if (!ac) init(); if (!ac) return null;
      const keep = { ac, musicG, station, step, nextT, musicOn, arr, rapSrc }, out = [];
      for (let i = 0; i < STATIONS.length; i++) {
        const off = new OfflineAudioContext(1, 44100 * sec, 44100);
        ac = off; musicG = off.createGain(); musicG.gain.value = 0.46 * 0.7;
        if (hp) { const h1 = off.createBiquadFilter(), h2 = off.createBiquadFilter(); h1.type = h2.type = 'highpass'; h1.frequency.value = h2.frequency.value = hp; musicG.connect(h1).connect(h2).connect(off.destination); } else musicG.connect(off.destination);
        station = i; step = 0; nextT = 0.05; musicOn = true; arr = 4; rapSrc = null; schedule(sec - 0.6);
        ac = keep.ac; musicG = keep.musicG;
        const buf = await off.startRendering(), d = buf.getChannelData(0); let s = 0, pk = 0; for (const x of d) { s += x * x; pk = Math.max(pk, Math.abs(x)); }
        out.push({ name: STATIONS[i].name, rms: +Math.sqrt(s / d.length).toFixed(4), peak: +pk.toFixed(3) });
      }
      station = keep.station; step = keep.step; nextT = keep.nextT; musicOn = keep.musicOn; arr = keep.arr; rapSrc = keep.rapSrc;
      return out;
    },
    get _lv() { return { tyre: tyre ? tyre[0]._l || 0 : 0, roll: roll ? roll._l || 0 : 0, eng: me ? me._g : 0, others: others.filter(e => e.on).length, impacts: nImp, bells: nBell }; },
    engine(speed, on) { if (!ac) return; engO.frequency.setTargetAtTime(38 + speed * 2.4, ac.currentTime, 0.05); engF.frequency.setTargetAtTime(300 + speed * 25, ac.currentTime, 0.1); engG.gain.setTargetAtTime(on ? 0.05 : 0, ac.currentTime, 0.1); },
    gun(enemy) { if (ac) noise(ac.currentTime, 0.07, enemy ? 1100 : 1600, 0.9, enemy ? 0.25 : 0.4); },
    hit() { if (ac) noise(ac.currentTime, 0.12, 600, 1.2, 0.5); },
    boom() { if (ac) noise(ac.currentTime, 1.1, 300, 0.6, 1.0, null, 'lowpass'); },
    pick() { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(660, ac.currentTime); o.frequency.setValueAtTime(990, ac.currentTime + 0.08); g.gain.setValueAtTime(0.25, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3); o.connect(g).connect(fxG); o.start(); o.stop(ac.currentTime + 0.32); },
    arr(n) { arr = n; },
    restart() { station = 0; if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => { }); step = 0; nextT = ac.currentTime + 0.06; } },
    whoosh() { if (ac) noise(ac.currentTime, 0.35, 700, 0.6, 0.22); },
    slam() { // the hit under the title
      if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.9); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      o.connect(g).connect(fxG); o.start(t); o.stop(t + 1.5); noise(t, 1.8, 180, 0.5, 0.9, null, 'lowpass');
    },
    rain(level) { // continuous hiss of the rain, louder on the roof of the car
      if (!ac) return;
      if (!rainG) {
        const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
        rainG = ac.createGain(); rainG.gain.value = 0; s.connect(hp).connect(lp).connect(rainG).connect(fxG); s.start();
      }
      if (Math.abs(level - (rainG._l || 0)) > 0.01) { rainG._l = level; rainG.gain.setTargetAtTime(level * 0.16, ac.currentTime, 0.3); }
    },
    bell() { // the tram's two-tone bell
      if (!ac) return; const t = ac.currentTime;
      for (const [f, dt] of [[1318, 0], [988, 0.22], [1318, 0.5], [988, 0.72]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + dt); g.gain.linearRampToValueAtTime(0.16, t + dt + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.5); o.connect(g).connect(fxG); o.start(t + dt); o.stop(t + dt + 0.55); }
    },
    shipHorn(vol = 1) { // (16 nov.) the ferry's horn: two low notes, long, a little rough
      if (!ac || vol < 0.02) return; const t = ac.currentTime;
      for (const f of [98, 123]) { const o = ac.createOscillator(), g = ac.createGain(), bf = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.25); bf.type = 'lowpass'; bf.frequency.value = 520;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11 * vol, t + 0.18); g.gain.setValueAtTime(0.11 * vol, t + 1.5); g.gain.exponentialRampToValueAtTime(0.001, t + 2.1); o.connect(bf).connect(g).connect(fxG); o.start(t); o.stop(t + 2.2); }
    },
    horn() { // a little 90s hatchback horn
      if (!ac) return; const t = ac.currentTime;
      for (const f of [415, 523]) { const o = ac.createOscillator(), g = ac.createGain(), bf = ac.createBiquadFilter(); o.type = 'square'; o.frequency.value = f; bf.type = 'lowpass'; bf.frequency.value = 1800;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.02); g.gain.setValueAtTime(0.07, t + 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.connect(bf).connect(g).connect(fxG); o.start(t); o.stop(t + 0.45); }
    },
    siren(level) { // French two-tone "pin-pon"
      if (!ac) return;
      if (!sirenO) { sirenO = ac.createOscillator(); sirenO.type = 'triangle'; sirenG = ac.createGain(); sirenG.gain.value = 0; sirenO.connect(sirenG).connect(fxG); sirenO.start(); }
      const t = ac.currentTime; sirenO.frequency.setTargetAtTime((t % 1.2) < 0.6 ? 435 : 580, t, 0.01);
      if (Math.abs(level - (sirenG._l || 0)) > 0.02) { sirenG._l = level; sirenG.gain.setTargetAtTime(level * 0.09, t, 0.15); }
    },
    thunder() {
      if (!ac) return; const t = ac.currentTime;
      noise(t, 0.35, 900, 0.4, 0.5, null, 'lowpass'); noise(t + 0.05, 3.2, 110, 0.4, 1.2, null, 'lowpass'); noise(t + 0.6, 2.4, 70, 0.3, 0.8, null, 'lowpass');
    },
    toggle() { if (!ac) return; musicOn = !musicOn; return musicOn; },
    // next station; after the last one the radio goes off, then back to the first
    nextStation() { if (!ac) return null; if (!musicOn) { musicOn = true; station = 0; } else if (station < STATIONS.length - 1) station++; else { musicOn = false; } step = 0; nextT = ac.currentTime + 0.08; return musicOn ? STATIONS[station] : null; },
    setStation(i) { station = i; step = 0; if (ac) nextT = ac.currentTime + 0.06; },
    get station() { return musicOn ? STATIONS[station] : null; },
    get music() { return musicOn; },
    // separate music / effects volumes, 0..1
    setVolume(kind, v) { vol[kind] = v; if (!ac) return; if (kind === 'music') musicG.gain.setTargetAtTime(0.46 * v * duckK, ac.currentTime, 0.05); else if (kind === 'amb') ambG.gain.setTargetAtTime(v, ac.currentTime, 0.05); else fxG.gain.setTargetAtTime(v, ac.currentTime, 0.05); },
    get volume() { return { ...vol }; },
  };
})();

