// ---------- settings (per viewer, kept in this browser) ----------
const SETTINGS_KEY = 'gangstamen.settings.v1';
const settings = Object.assign({
  ctl: ['kb1', 'kb2', 'kb3', 'kb4'], soloCtl: 'kb1+pad0', nPlayers: 2,
  music: 0.7, fx: 0.8, rumble: true, retro: true, nick: '',
  hdq: 2, autoQ: true, physics: ULTRA ? 'real' : 'arcade', tod: 'sunset', rain: '0', traffic: 2, voices: true, shadows: 1, dist: 2, intro: true, teams: false, team: [0, 1, 0, 1], netTeams: false, netTeam: -1, goal: 20, limit: 10,
}, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { } }
sfx.setVolume('music', settings.music); sfx.setVolume('fx', settings.fx);
if (HD) { view.classList.remove('retro'); $('scan').classList.add('off'); hd.setQuality(settings.hdq); }
else if (!settings.retro) { retro = false; setRatio(); view.classList.remove('retro'); $('scan').classList.add('off'); }

