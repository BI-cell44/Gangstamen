// ---------- settings (per viewer, kept in this browser) ----------
const SETTINGS_KEY = 'gangstamen.settings.v1';
const settings = Object.assign({
  ctl: ['kb1', 'kb2', 'kb3', 'kb4'], soloCtl: 'kb1+pad0', nPlayers: 2,
  music: 0.7, fx: 0.8, amb: 0.8, rumble: true, retro: true, nick: '',
  hdq: isTouch ? 0 : 2, hdSafe: 0, tctl0: 'touch', autoQ: true, physics: 'arcade', tod: 'sunset', rain: '0', traffic: 2, trafficNet: 1, aim: 2, motion: 1, voices: true, subs: true, shadows: 1, dist: 2, intro: true, introSeen: false, played: false, teams: false, team: [0, 1, 0, 1], netTeams: false, netTeam: -1, goal: 20, limit: 10, campDiff: 1, goalCtf: 3, goalHill: 60, placeFfa: 0, placeHill: 0, placeRap: 3, placeChant: 1, raceLaps: 1, // physics 'real' = realistic mode (cycle 4), chosen in the options
}, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; } })());
// (17 nov., user) end of a game in the HD modes (split screen and online): captures, hill points or laps instead of KO
const MODE_GOALS = {
  2: { key: 'goalCtf', opts: [[1, '1 capture'], [3, '3 captures'], [5, '5 captures'], [0, 'Sans']] },
  3: { key: 'goalHill', opts: [[30, '30 points'], [60, '60 points'], [120, '120 points'], [0, 'Sans']] },
  4: { key: 'raceLaps', opts: [[1, '1 tour'], [2, '2 tours'], [3, '3 tours'], [5, '5 tours']] },
};
function modeGoalSetting(k) { const g = MODE_GOALS[k]; return g ? +settings[g.key] : settings.goal; }
function saveSettingsRaw() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { } }
function saveSettings() { saveSettingsRaw(); if (typeof Profile !== 'undefined') Profile.capture(); } // the progression also goes to the save slot (cycle 10)
sfx.setVolume('music', settings.music); sfx.setVolume('fx', settings.fx); sfx.setVolume('amb', settings.amb ?? 0.8);
if (HD) { view.classList.remove('retro'); $('scan').classList.add('off'); hd.setSafe(settings.hdSafe || 0); hd.setQuality(settings.hdq); }
else if (!settings.retro) { retro = false; setRatio(); view.classList.remove('retro'); $('scan').classList.add('off'); }

