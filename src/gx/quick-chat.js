  // ---------- quick chat: a few ready-made lines, D-pad or keys 1 to 6 ----------
  const QC = ['Par ici !', 'Attention, derrière toi !', 'Bien joué !', 'Revanche ?', 'Les flics !', 'Tous sur la Butte !'];
  let qcCd = 0;
  function quickChat(L, i) {
    if (!L || !QC[i] || performance.now() < qcCd) return; qcCd = performance.now() + 1200;
    const who = mode === 'online' ? (settings.nick || 'Moi') : 'J' + (L.slot + 1);
    if (mode === 'online') Net.emit('qc', { i, nick: settings.nick || 'Joueur' });
    chatShow(who, QC[i], L.colour);
  }
  function chatIn(peer, d) {
    if (!d || !Number.isInteger(d.i) || !QC[d.i]) return;
    const R = Net.remotes.get(peer); chatShow(R ? R.nick : String(d.nick || 'Joueur').slice(0, 14), QC[d.i], R ? R.colour : '#fff');
  }
  function chatShow(who, text, colour) {
    const d = document.createElement('div'); d.className = 'qc'; const b = document.createElement('b'); b.textContent = who + ' '; b.style.color = colour || 'var(--sunset)'; d.append(b, text);
    $('feed').prepend(d); setTimeout(() => d.remove(), 6000); while ($('feed').children.length > 6) $('feed').lastChild.remove();
    sfx.pick();
  }
