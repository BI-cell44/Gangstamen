// ---------- the save slots screen (cycle 10) ----------
function renderSaves() {
  const box = $('saveList'); if (!box || !Profile.data) return;
  const S = Profile.data, fmt = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  box.replaceChildren();
  S.slots.forEach((p, i) => {
    const card = document.createElement('div'); card.className = 'saveCard' + (i === S.cur ? ' cur' : '');
    const st = p ? p.stats : null;
    card.innerHTML = p
      ? `<b>${i + 1}. ${p.name.replace(/[<>&]/g, '')}${i === S.cur ? ' · en cours' : ''}</b><p class="fine">Respect ${p.respect} · missions ${p.camp.done.length} / 7 · ${st.km.toFixed(1)} km · ${st.kos} KO · pointe ${st.vmax} km/h · ${Math.round(st.time / 60)} min de jeu</p><p class="fine">Mise à jour le ${fmt(p.updated)}</p>`
      : `<b>${i + 1}. Emplacement libre</b><p class="fine">Une nouvelle partie commence à zéro.</p>`;
    const row = document.createElement('div'); row.className = 'menu';
    const btn = (txt, f) => { const b = document.createElement('button'); b.className = 'mbtn'; b.textContent = txt; b.addEventListener('click', f); row.appendChild(b); };
    if (i !== S.cur) btn(p ? 'Jouer cette partie' : 'Nouvelle partie ici', () => { Profile.use(i); renderSaves(); if (typeof renderCampaign === 'function') try { renderCampaign(); } catch (e) { } if (gx && gx.renderCampaign) gx.renderCampaign(); });
    if (p) btn('Renommer', () => { // inline field: dialogs (prompt, confirm) may be blocked inside an artifact
      const inp = document.createElement('input'); inp.value = p.name; inp.maxLength = 24; card.querySelector('b').replaceWith(inp); inp.focus(); inp.select();
      const done = () => { Profile.rename(i, inp.value.trim()); renderSaves(); }; inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(); if (e.key === 'Escape') renderSaves(); }); inp.addEventListener('blur', done); });
    if (p) btn('Exporter (code)', () => { $('saveIO').hidden = false; $('saveCode').value = Profile.exportCode(i); $('saveCode').select(); $('saveDo').hidden = true; $('saveMsg').textContent = 'Copie ce code (Ctrl+C) et garde-le : il contient toute la partie.'; });
    btn('Importer un code ici', () => { $('saveIO').hidden = false; $('saveCode').value = ''; $('saveCode').focus(); $('saveDo').hidden = false; $('saveDo').dataset.i = i; $('saveMsg').textContent = p ? 'Attention : la partie de cet emplacement sera remplacée.' : 'Colle le code exporté.'; });
    if (p) btn('Effacer', e => { const b = e.currentTarget; if (b.dataset.sure) { Profile.reset(i); renderSaves(); } else { b.dataset.sure = 1; b.textContent = 'Sûr ? Cliquer encore (définitif)'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Effacer'; } }, 4000); } });
    card.appendChild(row); box.appendChild(card);
  });
}
$('saveDo').addEventListener('click', () => { const err = Profile.importCode($('saveCode').value, +$('saveDo').dataset.i); $('saveMsg').textContent = err || 'Partie importée.'; if (!err) { renderSaves(); if (gx && gx.renderCampaign) gx.renderCampaign(); } });
$('saveClose').addEventListener('click', () => { $('saveIO').hidden = true; });
document.querySelectorAll('[data-go="vSave"]').forEach(b => b.addEventListener('click', renderSaves));
