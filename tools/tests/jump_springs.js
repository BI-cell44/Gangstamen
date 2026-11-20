// jumps (20 nov.): attitude in the air and springs on landing, with a controlled clock. Run from /home/claude/t:
// node dbg.js gangstamen-ultra.html tools/tests/jump_springs.js -> air: nose-up then drops; minY about -0.15; settleS < 0.6
(() => {
  const c = __gm.locals()[0].car; let t = 1e6; const pn = performance.now.bind(performance); performance.now = () => t;
  c.place(c.x, c.z, c.h); c.sync(); t += 16.7; c.sync();
  const base = c.mesh.position.y, gp0 = c.mesh.rotation.x, out = { air: [], land: [] };
  c._gpv = 0.9; c.air = 1.5;
  for (let i = 0; i < 60; i++) { t += 16.7; c.sync(); if (i % 10 === 0) out.air.push(+(c.mesh.rotation.x - gp0).toFixed(3)); }
  c.air = 0; c.sqv = 5.5;
  let minY = 0, settle = -1;
  for (let i = 0; i < 90; i++) { t += 16.7; c.sync(); const dy = c.mesh.position.y - base; minY = Math.min(minY, dy); if (i % 6 === 0) out.land.push([+dy.toFixed(3), +(c.mesh.rotation.x - gp0).toFixed(3)]); if (settle < 0 && Math.abs(dy) < 0.005 && Math.abs(c.mesh.rotation.x - gp0) < 0.005 && i > 5) settle = i; }
  performance.now = pn;
  return { ...out, minY: +minY.toFixed(3), settleS: +(settle * 0.0167).toFixed(2), nan: [c.mesh.position.y, c.mesh.rotation.x].some(Number.isNaN) };
})()
