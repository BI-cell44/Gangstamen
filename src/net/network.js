// ---------- networking: claude.ai room, or a WebSocket server with the same calls ----------
// Every client drives its own car with no round trip (no input lag) and shares its state through presence ~30 times a second.
// The host (the game's creator, then the oldest peer) runs the Rapaces and shares them in its presence.
// Damage travels as small events: the shooter tells the victim ("hit"), players tell the host about bots ("hb").
const Net = {
  api: null, room: null, code: null, isHost: false, hostPeer: null, me: null, remotes: new Map(), queued: {}, lastSend: 0, lastQueue: 0,
  status: 'off',
  queue(topic, key, d) { const q = this.queued[topic] || (this.queued[topic] = {}); q[key] = (q[key] || 0) + d; },
  emit(topic, data) { if (this.room) this.room.emit(topic, data).catch(() => { }); },
};
function wsRoom(url) { // minimal client for the self-hosted server (server/ folder): same surface as the claude.ai room
  let ws = null, conn = false, me = null;
  const rooms = new Map(), connL = new Set();
  const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  function mk(name) {
    const st = { name, peers: new Map(), topics: new Map(), peersL: new Set(), my: {}, timer: null, snap: Object.freeze([]) };
    const peerObj = (id, pres) => Object.freeze({ peer: id, by: null, isMe: id === me, sameTab: id === me, kind: 'viewer', guest: false, presence: Object.freeze(pres || {}), updatedAt: Date.now() });
    st.notify = (joined, left, updated) => { st.snap = Object.freeze([...st.peers.values()]); for (const f of st.peersL) f({ peers: st.snap, joined, left, updated }); };
    const api = {
      name,
      emit(topic, data) { send({ t: 'emit', room: name, topic, data }); return Promise.resolve(); },
      on(topic, fn) { let s = st.topics.get(topic); if (!s) st.topics.set(topic, s = new Set()); s.add(fn); return () => s.delete(fn); },
      presence(patch) {
        for (const k in patch) { if (patch[k] === null) delete st.my[k]; else st.my[k] = patch[k]; }
        if (me) { const p = peerObj(me, { ...st.my }); st.peers.set(me, p); }
        if (!st.timer) st.timer = setTimeout(() => { st.timer = null; send({ t: 'pres', room: name, data: st.my }); }, 33);
        return Promise.resolve();
      },
      peers: () => st.snap,
      onPeers(fn) { st.peersL.add(fn); queueMicrotask(() => fn({ peers: st.snap, joined: st.snap, left: [], updated: [] })); return () => st.peersL.delete(fn); },
      connected: () => conn,
      onConnection(fn) { connL.add(fn); queueMicrotask(() => fn(conn)); return () => connL.delete(fn); },
      leave() { send({ t: 'leave', room: name }); rooms.delete(name); return Promise.resolve(); },
      join: async (n) => { if (rooms.has(n)) return rooms.get(n).api; const r = mk(n); send({ t: 'join', room: n }); return r.api; },
    };
    st.api = api; st.peerObj = peerObj; rooms.set(name, st);
    return st;
  }
  function onMsg(m) {
    if (m.t === 'hello') { me = m.peer; for (const st of rooms.values()) { if (st.name) send({ t: 'join', room: st.name }); if (Object.keys(st.my).length) send({ t: 'pres', room: st.name, data: st.my }); } return; }
    const st = rooms.get(m.room); if (!st) return;
    if (m.t === 'peers') { const joined = []; st.peers.clear(); for (const p of m.list) { const o = st.peerObj(p.peer, p.presence); st.peers.set(p.peer, o); joined.push(o); } st.notify(joined, [], []); }
    else if (m.t === 'pres') { const had = st.peers.has(m.peer); const o = st.peerObj(m.peer, m.data); st.peers.set(m.peer, o); st.notify(had ? [] : [o], [], had ? [o] : []); }
    else if (m.t === 'left') { const o = st.peers.get(m.peer); if (o) { st.peers.delete(m.peer); st.notify([], [o], []); } }
    else if (m.t === 'msg') { const s = st.topics.get(m.topic); if (s) for (const f of s) f({ topic: m.topic, data: m.data, peer: m.peer, by: null, isMe: m.peer === me, sameTab: m.peer === me, kind: 'viewer', guest: false }); }
  }
  function connect() {
    try { ws = new WebSocket(url); } catch (e) { setTimeout(connect, 2000); return; }
    ws.onopen = () => { conn = true; for (const f of connL) f(true); };
    ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch (err) { } };
    ws.onclose = () => { conn = false; for (const f of connL) f(false); setTimeout(connect, 1500); };
  }
  const lobby = mk('');
  connect();
  return lobby.api;
}
async function netInit() {
  let url = window.GM_SERVER || null;
  try { const q = new URLSearchParams(location.search).get('server'); if (q) url = q; } catch (e) { }
  if (url === 'auto') url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  if (url) Net.api = wsRoom(url);
  else { try { Net.api = window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { Net.api = null; } }
  if (!Net.api) { Net.status = 'none'; renderGames(); return; }
  Net.status = 'lobby';
  Net.api.onPeers(() => renderGames(), () => { Net.status = 'none'; renderGames(); });
  Net.api.onConnection(c => { Net.connected = c; renderGames(); });
  renderGames();
}
function lobbyGames() {
  if (!Net.api) return [];
  const out = [];
  for (const p of Net.api.peers()) { const g = p.presence && p.presence.gm; if (g && typeof g.code === 'string' && /^[a-z0-9]{4}$/.test(g.code) && !p.sameTab) out.push({ code: g.code, n: Math.max(1, Math.min(12, +g.n || 1)), host: String(g.host || '?').slice(0, 14), md: g.md === 1 ? 1 : 0, gx: [3, 4].includes(g.gx) ? g.gx : 0, gl: [10, 20, 30].includes(g.gl) ? g.gl : 0, tl: [5, 10, 15].includes(g.tl) ? g.tl : 0 }); }
  return out;
}
function renderGames() {
  const st = $('netStatus'), box = $('games'); if (!st) return;
  if (Net.status === 'none') { st.textContent = 'Jeu en ligne indisponible ici : ouvrez la version publiée sur claude.ai en étant connecté (ou la version serveur).'; $('create').disabled = true; box.replaceChildren(); return; }
  if (!Net.api) { st.textContent = 'Connexion…'; return; }
  $('create').disabled = false;
  st.textContent = Net.connected === false ? 'Reconnexion…' : 'Parties ouvertes';
  const games = lobbyGames();
  const sig = JSON.stringify(games);
  if (sig === renderGames.sig && box.children.length) return; // keep buttons (and focus) when nothing changed
  renderGames.sig = sig;
  if (!games.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Aucune partie pour l’instant : créez-en une.'; box.replaceChildren(e); return; }
  box.replaceChildren(...games.map(g => {
    const b = document.createElement('button'); b.className = 'mbtn';
    b.textContent = 'Partie ' + g.code.toUpperCase() + ' · ' + g.host + ' · ' + (g.gx === 3 ? 'Roi de la colline' : g.gx === 4 ? 'Course' : g.md ? 'Par équipes' : 'Chacun pour soi') + (g.gl ? ' · ' + g.gl + ' KO' : '') + (g.tl ? ' · ' + g.tl + ' min' : '') + ' · ' + g.n + '/12';
    b.disabled = g.n >= 12;
    b.addEventListener('click', () => startOnline(g.code, false, g.md, g.gl, g.tl, g.gx));
    return b;
  }));
}
function remoteFromPeer(p) {
  const pres = p.presence, c = pres && pres.c;
  if (!Array.isArray(c) || c.length < 8 || !c.slice(0, 7).every(v => typeof v === 'number' && isFinite(v))) return;
  let R = Net.remotes.get(p.peer);
  if (!R) {
    const tm = teamMode && (pres.tm === 0 || pres.tm === 1) ? pres.tm : -1;
    const pc = Number.isInteger(pres.pc) && pres.pc >= 0 && pres.pc <= 0xffffff ? pres.pc : null;
    const col = tm >= 0 ? TEAMS[tm].body : pc ?? NET_PAINT[Math.abs(+pres.col || 0) % NET_PAINT.length];
    const cs = CAR_STYLES[pres.cs] && typeof pres.cs === 'string' ? pres.cs : 'saloon';
    const car = new Car(makeCar(col, tm >= 0 ? NET_PAINT[Math.abs(+pres.col || 0) % NET_PAINT.length] : 0xf3ead8, true, cs), true);
    car.team = tm;
    if (car.mesh.userData.spot) car.mesh.userData.spot.intensity = night ? 2.4 : 0;
    R = { peer: p.peer, car, nick: 'Joueur', respect: 0, kills: 0, colour: tm >= 0 ? TEAMS[tm].css : '#' + new THREE.Color(col).getHexString(), tx: c[0], tz: c[1], th: c[2], tvx: 0, tvz: 0, tt: performance.now(), fireAcc: 0 };
    car.remote = R; car.owner = R; car.place(c[0], c[1], c[2]);
    Net.remotes.set(p.peer, R);
    feed(String(pres.nick || 'Un joueur').slice(0, 14) + ' arrive');
  }
  R.nick = String(pres.nick || 'Joueur').slice(0, 14);
  R.respect = +pres.r || 0; R.kills = +pres.k || 0;
  R.tx = c[0]; R.tz = c[1]; R.th = c[2]; R.tvx = c[3]; R.tvz = c[4]; R.steer = c[5] || 0; R.firing = !!c[8]; R.tt = performance.now();
  const wasAlive = R.car.alive, alive = !!c[7];
  R.car.hp = Math.max(0, Math.min(100, c[6]));
  if (wasAlive && !alive) { explode(R.car.x, R.car.z); R.car.mesh.userData.mBody.color.setHex(0x1a1414); R.car.mesh.userData.mPaint.color.setHex(0x1a1414); }
  if (!wasAlive && alive) { R.car.mesh.userData.mBody.color.setHex(R.car.mesh.userData.base); R.car.mesh.userData.mPaint.color.setHex(R.car.mesh.userData.paint); R.car.place(c[0], c[1], c[2]); }
  R.car.alive = alive;
}
function electHost() {
  if (!Net.room) return;
  const ps = Net.room.peers().filter(p => p.presence && Array.isArray(p.presence.c));
  const meP = Net.room.peers().find(p => p.sameTab); if (meP) Net.me = meP.peer;
  const claim = ps.filter(p => p.presence.host === 1).map(p => p.peer).sort();
  let h = claim[0] || null;
  if (!h) h = [...ps.map(p => p.peer), Net.me].filter(Boolean).sort()[0];
  const was = Net.isHost;
  Net.hostPeer = h; Net.isHost = !!Net.me && h === Net.me;
  if (Net.isHost && !was) becomeHost();
  if (!Net.isHost && was) { for (const r of rivals) { r.proxy = true; } }
}
function becomeHost() {
  if (resEl.hidden === false) { $('resAgain').hidden = false; $('resWait').hidden = true; }
  for (const r of rivals) { r.proxy = false; if (!r.ai) r.ai = { mode: 'cruise', target: nearestNode(r.x, r.z), prev: -1, stuck: 0, back: 0, lost: 0, burst: 0, firing: 0 }; }
  if (started) flashAll('Vous êtes l’hôte', 'Vous faites rouler les voitures du quartier');
}
async function startOnline(code, create, md, gl, tl, gxm) {
  if (!Net.api) return;
  settings.nick = ($('nick').value || '').trim().slice(0, 14) || 'Gangsta' + ((Math.random() * 90 + 10) | 0); saveSettings();
  if (create) code = Array.from({ length: 4 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[(Math.random() * 31) | 0]).join('');
  let room;
  try { room = await Net.api.join('gm-' + code); } catch (e) { $('netStatus').textContent = 'Impossible de rejoindre la partie (' + (e && e.code || 'erreur') + ').'; return; }
  const others = room.peers().filter(p => !p.sameTab && p.presence && Array.isArray(p.presence.c)).length;
  if (!create && others >= 12) { room.leave(); $('netStatus').textContent = 'Partie pleine (12 joueurs).'; return; }
  Net.room = room; Net.code = code; mode = 'online';
  Net.gxm = HD ? (create ? (settings.netGmode || 0) : (gxm || 0)) : 0;
  teamMode = Net.gxm ? false : create ? !!settings.netTeams : !!md;
  setupMatch(create ? settings.goal : gl || 0, create ? settings.limit : tl || 0);
  Net.team = -1;
  if (teamMode) { // chosen team, or the smaller one
    if (settings.netTeam === 0 || settings.netTeam === 1) Net.team = settings.netTeam;
    else {
      const n = [0, 0];
      for (const p of room.peers()) if (!p.sameTab && p.presence && (p.presence.tm === 0 || p.presence.tm === 1)) n[p.presence.tm]++;
      Net.team = n[0] < n[1] ? 0 : n[1] < n[0] ? 1 : (Math.random() < 0.5 ? 0 : 1);
    }
  }
  Net.isHost = !!create; Net.colIdx = create ? 0 : ((others + (Math.random() * 3 | 0)) % NET_PAINT.length);
  for (const r of rivals) r.proxy = !create;
  room.onPeers(ch => {
    for (const p of ch.left) { const R = Net.remotes.get(p.peer); if (R) { scene.remove(R.car.mesh); Net.remotes.delete(p.peer); feed(R.nick + ' est parti'); } }
    for (const p of [...ch.joined, ...ch.updated]) {
      if (p.sameTab) { Net.me = p.peer; continue; }
      remoteFromPeer(p);
      if (!Net.isHost && p.peer === Net.hostPeer && Array.isArray(p.presence.b)) applyBots(p.presence.b);
      if (!Net.isHost && p.peer === Net.hostPeer) applyMatch(p.presence.m);
    }
    electHost();
  });
  room.on('hit', m => { const d = m.data || {}; if (d.to !== Net.me || typeof d.d !== 'number') return; const L = locals[0]; if (L && L.car.alive) damage(L.car, Math.min(40, Math.max(0, d.d)), { remotePeer: m.peer }); });
  room.on('hb', m => { const d = m.data || {}; if (!Net.isHost) return; const r = rivals[+d.i | 0]; if (r && typeof d.d === 'number') damage(r, Math.min(40, Math.max(0, d.d)), { remotePeer: m.peer }); });
  room.on('ko', m => { const d = m.data || {}; const L = locals[0]; const victim = String(d.nick || 'un joueur').slice(0, 14); if (d.by === Net.me && L) credit(L.car, 150, victim + ' au tapis'); else { const R = Net.remotes.get(d.by); feed(victim + ' démoli par ' + (R ? R.nick : 'un joueur')); } });
  room.on('qc', m => { if (gx) gx.chatIn(m.peer, m.data); });
  room.on('rk', m => { if (gx) gx.netIn('rk', m.peer, m.data); });
  room.on('bl', m => { if (gx) gx.netIn('bl', m.peer, m.data); });
  room.on('bko', m => { const d = m.data || {}; const L = locals[0]; if (d.by === Net.me && L) credit(L.car, 100, botLabel(rivals[+d.i | 0]) + ' au tapis'); });
  startGame('online');
}
function applyBots(b) {
  b.slice(0, rivals.length).forEach((s, i) => {
    if (!Array.isArray(s) || !s.slice(0, 5).every(v => typeof v === 'number' && isFinite(v))) return;
    const r = rivals[i]; r.proxy = true;
    r.tx = s[0]; r.tz = s[1]; r.th = s[2]; r.tvx = s[3]; r.tvz = s[4]; r.tt = performance.now(); r.firing = !!s[7];
    const alive = !!s[6];
    if (r.alive && !alive) { explode(r.x, r.z); r.mesh.userData.mBody.color.setHex(0x1a1414); r.mesh.userData.mPaint.color.setHex(0x1a1414); }
    if (!r.alive && alive) { r.mesh.userData.mBody.color.setHex(r.mesh.userData.base); r.mesh.userData.mPaint.color.setHex(r.mesh.userData.paint); r.place(s[0], s[1], s[2]); }
    r.alive = alive; r.hp = s[5];
  });
}
// smooth a car simulated elsewhere toward its last known state, extrapolated with its velocity
function followState(c, o, dt) {
  if (o.tt === undefined) return;
  const age = Math.min(0.35, (performance.now() - o.tt) / 1000);
  const px = o.tx + o.tvx * age, pz = o.tz + o.tvz * age;
  if (Math.hypot(px - c.x, pz - c.z) > 18) { c.x = px; c.z = pz; }
  const k = Math.min(1, dt * 12);
  c.x += (px - c.x) * k; c.z += (pz - c.z) * k;
  let dh = o.th - c.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); c.h += dh * k;
  c.vx = o.tvx; c.vz = o.tvz;
}
function netTick(dt, now) {
  if (!Net.room) return;
  const L = locals[0]; if (!L) return;
  // lobby advert (host only), every 2 s
  if (Net.isHost && (!Net.lastAdvert || now - Net.lastAdvert > 2000)) { Net.lastAdvert = now; Net.api.presence({ gm: { code: Net.code, n: Net.remotes.size + 1, host: settings.nick, md: teamMode ? 1 : 0, gx: Net.gxm || 0, gl: Match.goal, tl: Match.limit } }).catch(() => { }); }
  if (!Net.isHost && Net.lastAdvert) { Net.lastAdvert = 0; Net.api.presence({ gm: null }).catch(() => { }); }
  // own state ~30 Hz
  if (now - Net.lastSend > 33) {
    Net.lastSend = now;
    const c = L.car, r1 = v => Math.round(v * 10) / 10;
    const pres = { c: [r1(c.x), r1(c.z), Math.round(c.h * 1000) / 1000, r1(c.vx), r1(c.vz), Math.round(c.steer * 100) / 100, Math.round(c.hp), c.alive ? 1 : 0, L.firing ? 1 : 0],
      nick: settings.nick, col: Net.colIdx, cs: L.car.style || 'saloon', pc: HD && L.team < 0 ? carChoice(0).paint[0] : undefined, tm: L.team, r: L.respect, k: L.kills, host: Net.isHost ? 1 : 0 };
    if (Net.isHost) pres.m = [Match.n, Math.round(Match.left), Match.over ? 1 : 0, Match.over ? Match.title : '', Match.over ? Match.sub : ''];
    if (Net.isHost) pres.b = rivals.map(r => [r1(r.x), r1(r.z), Math.round(r.h * 1000) / 1000, r1(r.vx), r1(r.vz), Math.round(r.hp), r.alive ? 1 : 0, r.ai && r.ai.firing ? 1 : 0]);
    Net.room.presence(pres).catch(() => { });
  }
  // batched damage events, at most ~8 per second
  if (now - Net.lastQueue > 120) {
    Net.lastQueue = now;
    for (const topic in Net.queued) {
      for (const k in Net.queued[topic]) {
        const d = Math.round(Net.queued[topic][k] * 10) / 10;
        if (topic === 'hit') Net.emit('hit', { to: k, d }); else Net.emit('hb', { i: +k, d });
      }
    }
    Net.queued = {};
  }
  // remote players: follow + their gunfire as visuals
  for (const R of Net.remotes.values()) {
    if (R.car.alive) followState(R.car, R, dt);
    if (R.firing && R.car.alive) { R.fireAcc += dt; if (R.fireAcc > 0.1) { R.fireAcc = 0; ghostShot(R.car, false); } } else R.fireAcc = 0;
  }
}

