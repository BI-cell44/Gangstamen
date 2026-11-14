  // ---------- open world: places to discover ("cartes postales") and what the progression unlocks (cycle 14) ----------
  const SPOTS = [
    { id: 'stAnne', name: 'Église Sainte-Anne', x: 781, z: -46, r: 35, text: 'Bâtie de 1846 à 1872 au sommet de la butte, elle domine la Loire.' },
    { id: 'escalier', name: 'Escalier Sainte-Anne', x: 955, z: 120, r: 28, text: 'La double volée de 1851 descend de la statue jusqu’au quai.' },
    { id: 'mairie', name: 'Mairie de Chantenay', x: 123, z: -445, r: 32, text: 'La mairie de 1903, du temps où Chantenay était une commune à part.' },
    { id: 'stMartin', name: 'Église Saint-Martin', x: -204, z: 347, r: 32, text: 'Le vieux bourg de Chantenay, autour de son clocher.' },
    { id: 'jeanMace', name: 'Place Jean-Macé', x: 45, z: 283, r: 28, text: 'Le cœur du quartier : commerces, terrasses et le boulevard.' },
    { id: 'misery', name: 'Carrière Misery', x: 670, z: 262, r: 45, text: 'L’ancienne carrière, creusée au pied de la butte.' },
    { id: 'gare', name: 'Gare de Chantenay', x: -322, z: 580, r: 32, text: 'La petite gare du quartier, au bord des voies.' },
    { id: 'maritime', name: 'Gare maritime', x: 1285, z: -440, r: 45, text: 'Les quais, le fleuve et les bateaux d’autrefois.' },
    { id: 'titan', name: 'Grue Titan', x: 1690, z: -430, r: 170, text: 'La grue jaune de 1954, en face, à la pointe de l’île de Nantes.' },
    { id: 'police', name: 'Commissariat', x: 170, z: -343, r: 30, text: 'Le commissariat de police nationale, près de la mairie : c’est d’ici que partent les patrouilles.' },
    { id: 'temple', name: 'Temple antoiniste', x: 89, z: -374, r: 26, text: 'Un temple antoiniste, une rareté dans l’Ouest.' },
  ];
  let discT = 0;
  const found = () => (Profile.cur ? Profile.cur.found : []);
  function discoverStep(dt) {
    if (mode !== 'solo' || !locals.length || (discT -= dt) > 0) return; discT = 0.5;
    const c = locals[0].car; if (!c.alive || !Profile.cur) return;
    for (const s of SPOTS) {
      if (found().includes(s.id) || Math.hypot(s.x - c.x, s.z - c.z) > s.r) continue;
      Profile.cur.found.push(s.id); locals[0].respect += 50; saveBank(locals[0]); Profile.capture(); sfx.pick();
      flashFor(locals[0], 'Carte postale : ' + s.name, s.text + ' (' + found().length + ' / ' + SPOTS.length + ', +50 respect)');
      const un = unlockNews(); if (un) setTimeout(() => flashFor(locals[0], 'Débloqué', un), 3500);
    }
  }
  // what the progression opens: the sports coupé (5 postcards), the police car and the "lose the police" challenge
  // (mission Pin-pon). The real garages stay open from the start (asked by the user).
  const missionDone = id => !!(settings.camp && settings.camp.done.includes(id));
  function unlocked(what) {
    if (what === 'sport') return found().length >= 5;
    if (what === 'police' || what === 'd_cops') return missionDone('police');
    return true;
  }
  const LOCK_TXT = { sport: '5 cartes postales', police: 'mission Pin-pon', d_cops: 'mission Pin-pon' };
  let lastUnl = null;
  function unlockNews() {
    const now = ['sport', 'police'].filter(unlocked).join(); if (lastUnl === null) { lastUnl = now; return null; }
    if (now === lastUnl) return null; const prev = lastUnl.split(','); lastUnl = now;
    const nw = now.split(',').filter(x => x && !prev.includes(x));
    return nw.length ? nw.map(x => ({ sport: 'le coupé sport au garage', police: 'la voiture de police au garage'}[x])).join(', ') : null;
  }
  function discMinimap(add) { // nearby postcards not found yet show as white dots
    if (mode !== 'solo' || !locals.length) return; const c = locals[0].car;
    for (const s of SPOTS) if (!found().includes(s.id) && Math.hypot(s.x - c.x, s.z - c.z) < 220) add({ x: s.x, z: s.z }, '#ffffff');
  }
  function postcards() { return SPOTS.map(s => ({ name: found().includes(s.id) ? s.name : '???', text: found().includes(s.id) ? s.text : '' })); }
