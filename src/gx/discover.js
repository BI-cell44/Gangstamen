  // ---------- open world: places to discover ("cartes postales") and what the progression unlocks (cycle 14) ----------
  // (16 nov., user) reviewed for the enlarged map: places of the île de Nantes and of the quays added, positions checked
  // against the OpenStreetMap buildings; each card shows a real photograph when data/postcards/<id>.jpg exists (free
  // licence, credited on the card and in DATA-LICENSES.md), otherwise a drawn card
  const SPOTS = [
    { id: 'stAnne', name: 'Église Sainte-Anne', x: 781, z: -46, r: 35, text: 'Bâtie de 1846 à 1872 au sommet de la butte, elle domine la Loire.' },
    { id: 'escalier', name: 'Escalier Sainte-Anne', x: 965, z: 130, r: 18, text: 'La double volée de 1851 descend de la statue jusqu’au quai.' },
    { id: 'julesVerne', name: 'Musée Jules Verne', x: 950, z: 92, r: 14, text: 'Au-dessus du fleuve, la maison devenue en 1978 le musée de l’écrivain nantais.' },
    { id: 'planetarium', name: 'Planétarium', x: 946, z: 31, r: 20, text: 'Ouvert au début des années 1980 sur la butte : le ciel de Nantes sous une coupole.' },
    { id: 'mairie', name: 'Mairie de Chantenay', x: 123, z: -445, r: 32, text: 'La mairie de 1903, du temps où Chantenay était une commune à part.' },
    { id: 'stMartin', name: 'Église Saint-Martin', x: -204, z: 347, r: 32, text: 'Le vieux bourg de Chantenay, autour de son clocher.' },
    { id: 'jeanMace', name: 'Place Jean-Macé', x: 45, z: 283, r: 28, text: 'Le cœur du quartier : commerces, terrasses et le boulevard.' },
    { id: 'misery', name: 'Carrière Misery', x: 670, z: 262, r: 45, text: 'L’ancienne carrière, creusée au pied de la butte.' },
    { id: 'gare', name: 'Gare de Chantenay', x: -322, z: 580, r: 32, text: 'La petite gare du quartier, au bord des voies.' },
    { id: 'temple', name: 'Temple antoiniste', x: 89, z: -374, r: 26, text: 'Un temple antoiniste, une rareté dans l’Ouest.' },
    { id: 'maritime', name: 'Gare maritime', x: 1288, z: -395, r: 40, text: 'D’ici partaient les passagers des navires ; aujourd’hui, le bac pour l’île.' },
    { id: 'mailleBreze', name: 'Maillé-Brézé', x: 1388, z: -468, r: 42, text: 'L’escorteur d’escadre, amarré quai de la Fosse et devenu musée en 1988.' },
    { id: 'transbordeur', name: 'Pile du transbordeur', x: 1869, z: -601, r: 40, text: 'Il ne reste qu’une pile du pont transbordeur, démonté en 1958.' },
    { id: 'titan', name: 'Grue Titan jaune', x: 1528, z: -288, r: 45, text: 'La grue jaune des chantiers Dubigeon, sur le quai de l’île de Nantes.' },
    { id: 'nefs', name: 'Nefs Dubigeon', x: 1958, z: -363, r: 50, text: 'Les nefs des chantiers navals : on y a construit des navires jusqu’en 1987.' },
    { id: 'hangarBananes', name: 'Hangar à bananes', x: 1247, z: 239, r: 40, text: 'Sur le quai des Antilles, on y faisait mûrir les bananes arrivées par bateau.' },
    { id: 'grueGrise', name: 'Grue Titan grise', x: 1218, z: 366, r: 30, text: 'La sœur grise de la grue jaune, à la pointe de l’île.' },
    { id: 'chapidock', name: 'Chapidock', x: 1413, z: 264, r: 28, text: 'Le grand chapiteau de bois de l’école de cirque, au bout de l’île.' },
  ];
  let discT = 0;
  const found = () => (Profile.cur ? Profile.cur.found : []);
  function nearPostcard(x, z, m) { return SPOTS.some(s => Math.hypot(s.x - x, s.z - z) < s.r + m); } // (spawnmap.js keeps its starting points clear)
  function discoverStep(dt) {
    if (mode !== 'solo' || soloKind !== 'free' || mission || !locals.length || (discT -= dt) > 0) return; discT = 0.5; // (16 nov., user) only in free driving
    const c = locals[0].car; if (!c.alive || !Profile.cur) return;
    for (const s of SPOTS) {
      if (found().includes(s.id) || Math.hypot(s.x - c.x, s.z - c.z) > s.r) continue;
      Profile.cur.found.push(s.id); locals[0].respect += 50; saveBank(locals[0]); Profile.capture(); sfx.pick();
      flashFor(locals[0], 'Carte postale : ' + s.name, s.text + ' (' + found().length + ' / ' + SPOTS.length + ', +50 respect)');
      showPostcard(s, 7);
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
  const LOCK_TXT = { sport: '5 cartes postales', police: 'mission 5 « Pin-pon » de la campagne', d_cops: 'mission 5 « Pin-pon » de la campagne' };
  let lastUnl = null;
  function unlockNews() {
    const now = ['sport', 'police'].filter(unlocked).join(); if (lastUnl === null) { lastUnl = now; return null; }
    if (now === lastUnl) return null; const prev = lastUnl.split(','); lastUnl = now;
    const nw = now.split(',').filter(x => x && !prev.includes(x));
    return nw.length ? nw.map(x => ({ sport: 'le coupé sport au garage', police: 'la voiture de police au garage'}[x])).join(', ') : null;
  }
  function discMinimap(add) { // nearby postcards not found yet show as white dots
    if (mode !== 'solo' || soloKind !== 'free' || mission || !locals.length) return; const c = locals[0].car;
    for (const s of SPOTS) if (!found().includes(s.id) && Math.hypot(s.x - c.x, s.z - c.z) < 220) add({ x: s.x, z: s.z }, '#ffffff');
  }
  // (16 nov., user) the card itself: the photograph (or a drawn card), the name, the text and the credit of the photo
  const PC = window.POSTCARDS || {};
  let pcEl = null, pcT = 0;
  function cardHTML(s, big) {
    const ph = PC[s.id];
    const pic = ph ? '<img src="' + ph.src + '" alt="">' : '<div class="pcDraw"><span>' + s.name + '</span><small>Nantes · Chantenay</small></div>';
    return '<div class="pcPhoto">' + pic + '<b class="pcStamp">Nantes</b></div><div class="pcBody"><h3>' + s.name + '</h3><p>' + s.text + '</p>'
      + (ph ? '<p class="pcCred">Photo : ' + ph.author + ' · ' + ph.license + (big && /wikimedia/.test(ph.url || '') ? ' · Wikimedia Commons' : '') + '</p>' : '') + '</div>';
  }
  function showPostcard(s, secs) {
    if (!pcEl) { pcEl = document.createElement('div'); pcEl.id = 'postcard'; document.body.append(pcEl); pcEl.addEventListener('click', () => { pcEl.hidden = true; }); }
    pcEl.innerHTML = cardHTML(s, !secs); pcEl.className = secs ? 'toast' : 'big'; pcEl.hidden = false; pcT = secs || 0;
    if (secs) setTimeout(() => { if (pcT === secs) pcEl.hidden = true; }, secs * 1000);
  }
  function postcardGallery(box) { // the cards found so far, in the menu: a click shows one large
    const g = document.createElement('div'); g.className = 'pcGrid';
    for (const s of SPOTS) { const ok = found().includes(s.id), c = document.createElement('button'); c.className = 'pcMini' + (ok ? '' : ' locked');
      c.innerHTML = ok ? (PC[s.id] ? '<img src="' + PC[s.id].src + '" alt="">' : '<i>✉</i>') + '<span>' + s.name + '</span>' : '<i>?</i><span>???</span>';
      if (ok) c.addEventListener('click', () => showPostcard(s, 0)); g.append(c); }
    box.append(g);
  }
  function postcardSpots() { return SPOTS.map(s => ({ s, x: s.x, z: s.z, found: found().includes(s.id) })); } // (spawnmap.js draws them)
  function postcards() { return SPOTS.map(s => ({ name: found().includes(s.id) ? s.name : '???', text: found().includes(s.id) ? s.text : '' })); }
