// ---------- sound (WebAudio, generated) ----------
const sfx = (() => {
  let ac = null, rainG = null, sirenO = null, sirenG = null, master, fxG, engO, engF, engG, musicG, noiseBuf, musicOn = true, step = 0, nextT = 0, timer = null, arr = 4; // arr: how much of the loop plays (the intro builds it up; 4 = all of it)
  const vol = { music: 0.7, fx: 0.8 };
  function init() {
    if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    fxG = ac.createGain(); fxG.gain.value = vol.fx; fxG.connect(master);
    engO = ac.createOscillator(); engO.type = 'sawtooth'; engF = ac.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 400;
    engG = ac.createGain(); engG.gain.value = 0.0; engO.connect(engF).connect(engG).connect(fxG); engO.start();
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    musicG = ac.createGain(); musicG.gain.value = 0.46 * vol.music; musicG.connect(master);
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
  function rapStep(s, t, bar) {
    const sw = s % 2 ? s16() * 0.18 : 0; t += sw;
    if (s === 0 || s === 7 || s === 10) kick(t, 0.95, 110);
    if (s === 4 || s === 12) { noise(t, 0.2, 1500, 0.7, 0.55, musicG); noise(t, 0.08, 4000, 0.5, 0.2, musicG); }
    if (s % 2 === 0) noise(t, 0.035, 9000, 1.6, s % 4 ? 0.07 : 0.11, musicG, 'highpass');
    if (RAP_B[s]) tone(t, mtof(RAP_B[s] - (bar % 4 === 3 ? 2 : 0) - 12), 0.5, 'sine', 0.42);
    if (s === 0 || s === 6 || (s === 11 && bar % 2)) for (const n of RAP_CH[bar % 4]) tone(t, mtof(n), 0.55, 'triangle', 0.06, null, { lp: 1600 });
    if (Math.random() < 0.3) noise(t, 0.01, 3000, 0.4, 0.03, musicG, 'highpass');
  }
  // techno: four on the floor, off-beat open hats, a 303-ish acid line
  const ACID = [33, 33, 45, 33, 36, 33, 43, 33, 33, 45, 33, 38, 33, 40, 33, 31];
  function technoStep(s, t, bar) {
    if (s % 4 === 0) kick(t, 1, 150);
    if (s % 4 === 2) noise(t, 0.09, 8500, 1, 0.13, musicG, 'highpass');
    if (s === 4 || s === 12) noise(t, 0.12, 1200, 1.4, 0.32, musicG);
    if (bar % 8 >= 2) { const sweep = 400 + 1600 * (0.5 + 0.5 * Math.sin(bar * 0.7 + s * 0.05)); tone(t, mtof(ACID[s]), s16() * 0.9, 'sawtooth', 0.11, null, { lp: sweep * 2.2, lpTo: sweep * 0.5, q: 12 }); }
    if (bar % 4 === 3 && s === 14) noise(t, 0.4, 2000, 0.4, 0.15, musicG, 'highpass');
  }
  // funk: slap bass, clavinet chops, brass stabs
  const FB = [40, 0, 52, 40, 0, 40, 50, 0, 43, 0, 55, 43, 45, 47, 0, 50];
  function funkStep(s, t, bar) {
    if (s === 0 || s === 3 || s === 10) kick(t, 0.85, 120);
    if (s === 4 || s === 12) noise(t, 0.16, 2000, 0.8, 0.45, musicG);
    if (s === 7 || s === 15) noise(t, 0.05, 2500, 1, 0.12, musicG);
    noise(t, 0.03, 9000, 1.6, s % 2 ? 0.05 : 0.09, musicG, 'highpass');
    if (FB[s]) tone(t, mtof(FB[s] - 12), 0.18, 'square', 0.16, null, { lp: 900, lpTo: 200 });
    if (s % 4 === 2 || s === 7) for (const n of [64, 67, 71]) tone(t, mtof(n), 0.09, 'square', 0.025, null, { lp: 1800, bp: true, q: 3 });
    if (bar % 2 === 1 && (s === 14 || s === 15)) for (const n of [74, 79]) tone(t, mtof(n), 0.18, 'sawtooth', 0.05, null, { lp: 2400, att: 0.02 });
  }
  function schedule() {
    if (!ac) return;
    while (nextT < ac.currentTime + 0.15) {
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
  return {
    init,
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
    setVolume(kind, v) { vol[kind] = v; if (!ac) return; if (kind === 'music') musicG.gain.setTargetAtTime(0.46 * v, ac.currentTime, 0.05); else fxG.gain.setTargetAtTime(v, ac.currentTime, 0.05); },
    get volume() { return { ...vol }; },
  };
})();

