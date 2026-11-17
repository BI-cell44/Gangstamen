  function world() {
    try { church(); } catch (e) { console.warn('church', e); }
    try { quays(); } catch (e) { console.warn('quays', e); }
    try { stAnne(); } catch (e) { console.warn('stAnne', e); }
    try { stairs(); } catch (e) { console.warn('stairs', e); }
    try { bridgeClosed(); } catch (e) { console.warn('bridgeClosed', e); }
    try { chapidock(); } catch (e) { console.warn('chapidock', e); }
    // (the Misery quarry used to be a painted cliff past the map edge: the real slope of the butte is in the relief now)
    buildFurniture(); try { buildTerraces(); } catch (e) { console.warn('terraces', e); } try { Fences.build(); } catch (e) { console.warn('fences', e); } buildGarage(); finishFurniture();
    try { Boats.build(); } catch (e) { console.warn('boats', e); }
    try { buildPortCranes(); } catch (e) { console.warn('cranes', e); }
    try { buildHalls(); } catch (e) { console.warn('halls', e); }
  }
  function landmarkTick() { // lights that follow the time of day
    const n = hd.amb ? Math.min(1, hd.amb.t / 2.2) : 0;
    if (LM.clockM) LM.clockM.emissiveIntensity = 0.15 + n * 2.2;
    if (LM.stAnneGlass) LM.stAnneGlass.emissiveIntensity = n * 1.6; if (LM.stLamps) for (const m of LM.stLamps) m.emissiveIntensity = n * 6;
    if (LM.titanLights) LM.titanLights.color.setRGB((performance.now() / 700 | 0) % 2 ? 8 * n + 0.6 : 0.4, 0.3, 0.2);
  }
  { const el = $('ammo'); if (el) { el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer'; el.addEventListener('pointerdown', e => { e.preventDefault(); if (locals[0]) cycleWeapon(locals[0]); }); } }
  const api = { netIn, dj, cycleWeapon, hearShot, quickChat, chatIn, step: gameStep, world, landmarkTick, tick: dt => { tick(dt); Boats.step((paused && mode !== 'online') || Busy.on ? 0 : dt); NavLights.step(dt); }, Boats, People, portCranes, hallColumns, LM, walks: () => { if (!walks) buildWalks(); return walks; }, start: startHook, cars: () => npcs.concat(extras), copsOn, shieldHit, makeBus, policeHQ: HQ, hqNode, spots: SPOTS, unlocked, postcards, acts: () => (actsBuild(), acts), actRun: () => run, startAct, hearCars: carsHearShot, traffic: TF, Fences, LightPoles, lightState, roadRules, makeNpc, placeOnGraph, nextNode, spawnPatrol, npcs: () => npcs, damage: damageNpc, addHeat, say, peds: () => peds, stars, special, startMission, renderCampaign, cleanupMission, toMenu, roadblock, MISSIONS,
    get gmode() { return gm ? gm.kind : 0; }, get gmState() { return gm; }, raceRespawn, modeTarget, scoreText, mines: () => mines, customers: () => customers, teamScores: modeTeamScores, goalText, rematch: rematchMode,
    get blocking() { return blocking; }, get mission() { return mission; }, foes: () => extras.filter(c => c.alive && c.team === 1), saveBank, pus: () => pus, furniture: () => furniture, garage: GARAGE, garages: GARAGES, campDiff, SpawnMap, copBump: c => oneStar(c, 0.1, 'Tu as percuté la police'),
    get onGarage() { return gx_onGarage; }, get objTarget() { return objEl.hidden ? null : objTgt; },
    minimap(me, add) { minimap(me, add); actMinimap(add); discMinimap(add); for (const pu of pus) if (pu.on) add(pu, '#' + new THREE.Color(PU_COL[pu.kind]).getHexString()); for (const c of extras) if (c.alive) add(c, c.friendly ? '#f2c81e' : '#ff3b3b'); for (const m of markers) { if (gm && gm.cps && gm.cps.includes(m) && gm.cps[(me.owner && me.owner.cp || 0) % gm.cps.length] !== m) continue; add(m, gm && gm.cps && gm.cps.includes(m) ? OBJ_CSS : '#ffffff'); } if (GARAGE.pad && mode === 'solo') for (const G of GARAGES) add(G, '#3a8aff'); } };
  return api;
})();
// <<< GAMEPLAY MODULE
