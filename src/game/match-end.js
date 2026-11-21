// ---------- end of the match ----------
// local games check the limits themselves; online, the host decides and publishes the match state in its presence
const Match = { goal: 0, limit: 0, left: 0, over: false, n: 0, synced: false, title: '', sub: '' };
const resEl = $('results');
function fmtClock(t) { t = Math.max(0, Math.ceil(t)); return ((t / 60) | 0) + ':' + String(t % 60).padStart(2, '0'); }
function setupMatch(goal, limit) {
  Match.goal = goal; Match.limit = limit; Match.left = limit * 60; Match.over = false; Match.n = 0; Match.synced = false;
  resEl.hidden = true; updateClock(); statsReset();
}
// (21 nov., audit UX) what each player did in the game, on the results card: distance, damage dealt, best KO, respect won
function statsReset() { for (const L of locals) L.st = { dist: 0, dmg: 0, best: null, r0: L.respect || 0 }; }
function statsHTML() {
  return locals.map(L => { const s = L.st; if (!s) return '';
    const who = locals.length > 1 ? '<b>Joueur ' + (L.slot + 1) + '</b> · ' : '';
    return '<p class="resStat">' + who + (s.dist / 1000).toFixed(1).replace('.', ',') + ' km · ' + Math.round(s.dmg) + ' dégâts infligés · ' + Math.max(0, L.respect - s.r0) + ' respect gagné' + (s.best ? '<br><small>Meilleur coup : ' + s.best.text + ' (+' + s.best.p + ')</small>' : '') + '</p>'; }).join('');
}
function updateClock() {
  const el = $('clock'), parts = [];
  if (Match.limit) parts.push('⏱ ' + fmtClock(Match.left));
  // (17 nov.) on a phone held upright the clock alone: the goal stays in the pause and on the results
  if (Match.goal && !(isTouch && (innerWidth < 560 || mode === 'split') && Match.limit)) parts.push(gx && gx.gmode ? gx.goalText() : Match.goal + ' KO pour gagner');
  el.hidden = !parts.length || Match.over;
  const txt = parts.join(' · ');
  if (el.textContent !== txt) el.textContent = txt;
  el.classList.toggle('hurry', !!Match.limit && Match.left < 30);
}
function matchResult(timeUp) {
  const rows = boardRows();
  if (teamMode) {
    const sc = teamScores(rows), line = 'Rapaces ' + sc[0] + ' – ' + sc[1] + ' Chantenaysiens';
    if (sc[0] === sc[1]) return ['Match nul', line];
    return ['Victoire des ' + TEAMS[sc[0] > sc[1] ? 0 : 1].name, line];
  }
  rows.sort((a, b) => b.k - a.k || b.r - a.r);
  const sc = k => gx && gx.gmode ? gx.scoreText(k) : k + ' KO'; // (17 nov.) points of the hill, progress of the race
  if (rows.length === 1) return [timeUp ? 'Temps écoulé' : 'Le quartier est à vous', sc(rows[0].k) + ' · ' + rows[0].r + ' respect'];
  const top = rows[0], second = rows[1];
  if (top.k === second.k && top.r === second.r) return ['Égalité', sc(top.k) + ' chacun'];
  return [top.name.replace(' (vous)', '') + ' gagne', sc(top.k) + ' · ' + top.r + ' respect'];
}
function checkMatch(dt) {
  if (Match.over || !started) return;
  if (Match.limit) Match.left = Math.max(0, Match.left - dt);
  if (mode === 'online' && !Net.isHost) return; // the host's presence decides
  if (Match.grace > 0) { Match.grace -= dt; return; } // let everyone's scores reset after a rematch
  let reached = false;
  if (Match.goal) {
    const rows = boardRows();
    reached = teamMode ? Math.max(...teamScores(rows)) >= Match.goal : rows.some(r => r.k >= Match.goal);
  }
  const timeUp = !!Match.limit && Match.left <= 0;
  if (reached || timeUp) endMatch(...matchResult(timeUp && !reached));
}
function endMatch(title, sub) {
  Match.over = true; Match.title = String(title).slice(0, 60); Match.sub = String(sub).slice(0, 60);
  $('resTitle').textContent = Match.title; $('resSub').textContent = Match.sub;
  $('resTable').replaceChildren(boardTable(boardRows()));
  // (21 nov.) the record of the Rapaces hunt: most KO, then the shortest time to reach the goal
  if (mode === 'solo' && soloKind === 'hunt' && locals[0] && !(gx && (gx.gmode || gx.mission))) {
    const L = locals[0], t = Match.limit * 60 - Match.left, rec = settings.huntRec || {}, k = Match.goal + '/' + Match.limit, b = rec[k];
    const better = !b || L.kills > b.ko || (L.kills === b.ko && t < b.t);
    if (better && L.kills > 0) { rec[k] = { ko: L.kills, t: Math.round(t) }; settings.huntRec = rec; saveSettings(); Match.sub = (Match.sub + ' · nouveau record !').slice(0, 80); $('resSub').textContent = Match.sub; }
  }
  { let el = $('resStats'); if (!el) { el = document.createElement('div'); el.id = 'resStats'; $('resTable').after(el); } el.innerHTML = statsHTML(); }
  const canRestart = mode !== 'online' || Net.isHost;
  $('resAgain').hidden = !canRestart; $('resWait').hidden = canRestart;
  paused = false; pauseEl.hidden = true; resEl.hidden = false; updateClock();
  sfx.pick(); for (const L of locals) rumbleFor(L, 0.6, 0.8, 400);
  if (canRestart) $('resAgain').focus(); else $('resQuit').focus();
}
function rematch() { // everyone back to the start, scores to zero
  Match.over = false; Match.left = Match.limit * 60; Match.grace = 2; resEl.hidden = true;
  for (const L of locals) {
    const c = L.car; L.respect = 0; L.kills = 0; L.deadT = 0; L.st = { dist: 0, dmg: 0, best: null, r0: 0 };
    c.alive = true; c.hp = 100; c.vx = c.vz = 0;
    c.mesh.userData.mBody.color.setHex(c.mesh.userData.base); c.mesh.userData.mPaint.color.setHex(c.mesh.userData.paint);
    c.place(...(mode === 'online' ? onlineSpawn(L.team) : L.spawn));
  }
  for (const r of rivals) if (!r.proxy) spawnRival(r);
  if (gx) gx.rematch();
  updateClock(); updateTeamBar();
  flashAll('Revanche !', Match.goal ? (gx && gx.gmode ? gx.goalText() : Match.goal + ' KO pour gagner') : 'C’est reparti');
  try { renderer.domElement.focus(); } catch (e) { }
}
function applyMatch(m) { // non-host: follow the host's match state [n, seconds left, over, title, sub]
  if (!Array.isArray(m) || typeof m[0] !== 'number') return;
  if (!Match.synced) { Match.synced = true; Match.n = m[0]; }
  else if (m[0] !== Match.n) { Match.n = m[0]; rematch(); }
  if (Match.limit && typeof m[1] === 'number' && Math.abs(m[1] - Match.left) > 1.5) Match.left = m[1];
  if (m[2] && !Match.over) endMatch(m[3] || 'Fin de partie', m[4] || '');
}
$('resAgain').addEventListener('click', () => { if (mode === 'online') { if (!Net.isHost) return; Match.n++; } rematch(); });
$('resQuit').addEventListener('click', () => { try { if (Net.room) Net.room.leave(); } catch (e) { } location.reload(); });

