// ---------- save v2 (cycle 10): versioned profiles, 3 slots, export and import by code ----------
// Schema 'gangstamen.save.v2' in this browser: { v: 2, cur: slot, slots: [profile | null] x3 }. A profile carries the
// progression; the game code keeps reading and writing the same fields of `settings` (bank, camp, upg, cars[0]) as
// before: loading a slot copies them into settings, and saveSettings() copies them back and stores the slot. Display
// preferences (volumes, quality, controls) stay in settings.v1 and are shared by all slots.
const SAVE_KEY = 'gangstamen.save.v2';
const Profile = (() => {
  const blank = name => ({ v: 2, name: name || 'Chantenaysien', created: Date.now(), updated: Date.now(), respect: 0, camp: { done: [] }, upg: { engine: 0, armor: 0, guns: 0, paint: 0 },
    car: null, garage: [], stats: { km: 0, kos: 0, deaths: 0, missions: 0, vmax: 0, shots: 0, time: 0 }, records: {}, found: [] });
  let S = null, statT = 0;
  function load() {
    try { S = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { S = null; }
    if (!S || S.v !== 2 || !Array.isArray(S.slots)) {
      // first start with v2: the progression of settings.v1 becomes slot 1
      const p = blank();
      if (settings.bank) p.respect = settings.bank;
      if (settings.camp) p.camp = JSON.parse(JSON.stringify(settings.camp));
      if (settings.upg) p.upg = { ...p.upg, ...settings.upg };
      if (settings.cars && settings.cars[0]) p.car = { ...settings.cars[0] };
      p.stats.missions = p.camp.done.length;
      S = { v: 2, cur: 0, slots: [p, null, null] };
      store();
    }
    apply(S.slots[S.cur] || (S.slots[S.cur] = blank()));
  }
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
  function apply(p) { // profile -> the fields the game reads
    settings.bank = p.respect; settings.camp = JSON.parse(JSON.stringify(p.camp)); settings.upg = { ...p.upg };
    settings.cars = settings.cars || []; if (p.car) settings.cars[0] = JSON.parse(JSON.stringify(p.car));
    settings.owned = JSON.parse(JSON.stringify(p.garage || []));
  }
  function capture() { // the fields the game wrote -> profile, then stored
    if (!S) return; const p = S.slots[S.cur]; if (!p) return;
    p.respect = settings.bank || 0; if (settings.camp) p.camp = JSON.parse(JSON.stringify(settings.camp)); if (settings.upg) p.upg = { ...settings.upg };
    if (settings.cars && settings.cars[0]) p.car = JSON.parse(JSON.stringify(settings.cars[0]));
    if (settings.owned) p.garage = JSON.parse(JSON.stringify(settings.owned));
    p.stats.missions = p.camp.done.length; p.updated = Date.now(); store();
  }
  // statistics, counted while playing solo (slot 0 player)
  function tick(dt) {
    if (!S || mode !== 'solo' || !locals.length || paused) return;
    const p = S.slots[S.cur], L = locals[0], c = L.car; if (!p || !c) return;
    if (c.alive) { p.stats.km += c.speed * dt / 1000; p.stats.vmax = Math.max(p.stats.vmax, Math.round(c.speed * 3.6)); }
    p.stats.time += dt;
    if (L.kills > (L._kSeen || 0)) { p.stats.kos += L.kills - (L._kSeen || 0); } L._kSeen = L.kills;
    if (!c.alive && L._wasAlive) p.stats.deaths++; L._wasAlive = c.alive;
    if ((statT += dt) > 20) { statT = 0; capture(); } // and at the key moments (missions, garage) through saveSettings()
  }
  function record(key, value, better = (a, b) => a < b) { // best time or score of an activity; true when it is a new record
    const p = S && S.slots[S.cur]; if (!p) return false;
    const old = p.records[key]; if (old !== undefined && !better(value, old)) return false;
    p.records[key] = value; capture(); return true;
  }
  // export: the slot as a code to copy (base64 of the JSON, with a short checksum); import checks it before writing
  const sum = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  function exportCode(i = S.cur) {
    capture(); const p = S.slots[i]; if (!p) return '';
    const js = JSON.stringify(p), b = btoa(unescape(encodeURIComponent(js)));
    return 'GSTM2-' + sum(js) + '-' + b;
  }
  function importCode(code, i) {
    const m = /^GSTM2-([0-9a-z]+)-([A-Za-z0-9+/=]+)$/.exec(String(code).trim().replace(/\s+/g, ''));
    if (!m) return 'Ce code n’est pas une sauvegarde Gangstamen.';
    let js; try { js = decodeURIComponent(escape(atob(m[2]))); } catch (e) { return 'Code abîmé (lecture impossible).'; }
    if (sum(js) !== m[1]) return 'Code abîmé (somme de contrôle fausse) : recopie-le en entier.';
    let p; try { p = JSON.parse(js); } catch (e) { return 'Code abîmé.'; }
    if (!p || p.v !== 2 || typeof p.respect !== 'number' || !p.camp || !Array.isArray(p.camp.done)) return 'Sauvegarde d’une autre version.';
    p = Object.assign(blank(p.name), p, { stats: { ...blank().stats, ...(p.stats || {}) } });
    S.slots[i] = p; if (i === S.cur) apply(p); store(); return null;
  }
  function use(i) { if (!S.slots[i]) S.slots[i] = blank('Partie ' + (i + 1)); capture(); S.cur = i; apply(S.slots[i]); store(); saveSettingsRaw(); }
  function reset(i) { S.slots[i] = blank('Partie ' + (i + 1)); if (i === S.cur) apply(S.slots[i]); store(); saveSettingsRaw(); }
  function rename(i, n) { if (S.slots[i]) { S.slots[i].name = String(n).slice(0, 24) || S.slots[i].name; store(); } }
  return { load, capture, tick, record, exportCode, importCode, use, reset, rename, get data() { return S; }, get cur() { return S ? S.slots[S.cur] : null; } };
})();
Profile.load();
