  // ---------- dialogue between the missions ----------
  const CAST = {
    dede: { name: 'Dédé', role: 'garagiste, rue de la Liberté', col: '#d8a400', pitch: 0.75, rate: 1.0 },
    nadia: { name: 'Nadia', role: 'cheffe des Chantenaysiens', col: '#f2c81e', pitch: 1.25, rate: 1.08 },
    duc: { name: 'Le Grand Duc', role: 'patron des Rapaces', col: '#c8202f', pitch: 0.55, rate: 0.92 },
    vautour: { name: 'Le Vautour', role: 'lieutenant des Rapaces', col: '#7a1a24', pitch: 0.85, rate: 1.15 },
    radio: { name: 'Chantenay FM', role: 'Jean-Mi, à l’antenne', col: '#e2337a', pitch: 1.05, rate: 1.12 },
    toi: { name: 'Toi', role: '', col: '#5b2ba6', pitch: 1.0, rate: 1.05 },
  };
  const dlgEl = document.createElement('div'); dlgEl.id = 'dlg'; dlgEl.hidden = true;
  dlgEl.innerHTML = '<div class="dlgBox"><div class="dlgFace"></div><div class="dlgBody"><div class="dlgWho"><b></b><span></span></div><div class="dlgTxt"></div></div></div><div class="dlgHint">Entrée, Espace ou A · suite &nbsp;·&nbsp; Échap · passer</div>';
  document.body.append(dlgEl);
  let dq = null;
  function dialogue(lines, then) {
    if (!lines || !lines.length) { if (then) then(); return; }
    dq = { lines, i: -1, then, shown: 0, t: 0 }; blocking = true; dlgEl.hidden = false; nextLine();
  }
  function nextLine() {
    dq.i++;
    if (dq.i >= dq.lines.length) { const f = dq.then; dq = null; dlgEl.hidden = true; blocking = false; try { speechSynthesis.cancel(); } catch (e) { } if (f) f(); return; }
    const [who, text] = dq.lines[dq.i], c = CAST[who] || CAST.toi;
    dlgEl.querySelector('.dlgFace').textContent = c.name.replace(/^Le /, '').slice(0, 2).toUpperCase();
    dlgEl.querySelector('.dlgFace').style.background = c.col;
    dlgEl.querySelector('.dlgWho b').textContent = c.name; dlgEl.querySelector('.dlgWho span').textContent = c.role;
    dlgEl.querySelector('.dlgTxt').textContent = ''; dq.shown = 0; dq.t = 0; dq.text = text;
    if (who !== 'toi') say(text, { pitch: c.pitch, rate: c.rate, cancel: true, nosub: true });
  }
  function dlgAdvance() { if (!dq) return; if (dq.shown < dq.text.length) { dq.shown = dq.text.length; dlgEl.querySelector('.dlgTxt').textContent = dq.text; } else nextLine(); }
  function dlgSkip() { if (!dq) return; dq.i = dq.lines.length; nextLine(); }
  addEventListener('keydown', e => {
    if (dq) { if (['Enter', 'Space', 'NumpadEnter'].includes(e.code) && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); dlgAdvance(); } else if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); dlgSkip(); } return; }
    if (garageOpen) garageKey(e);
  }, true);
  dlgEl.addEventListener('pointerdown', e => { e.preventDefault(); dlgAdvance(); });

