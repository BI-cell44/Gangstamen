  // ---------- voices (speech synthesis, French when the browser has a voice for it) ----------
  let voice = null;
  function pickVoice() { try { const v = speechSynthesis.getVoices(); voice = v.find(x => /^fr/i.test(x.lang)) || null; } catch (e) { } }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { }
  // (21 nov., audit UX) what the voices say is written at the bottom of the screen (« Sous-titres » in the options); the
  // dialogues have their own box
  let subT = 0;
  function subtitle(text) {
    let el = $('subs'); if (!el) { el = document.createElement('div'); el.id = 'subs'; el.className = 'hud'; document.body.append(el); }
    el.textContent = text; el.classList.add('on'); clearTimeout(subT);
    subT = setTimeout(() => el.classList.remove('on'), 1600 + text.length * 60);
  }
  function say(text, o = {}) {
    if (settings.subs !== false && !o.nosub && started) subtitle(text);
    if (!settings.voices || !window.speechSynthesis) return;
    try {
      if (o.cancel) speechSynthesis.cancel(); else if (speechSynthesis.speaking && !o.queue) return;
      const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; if (voice) u.voice = voice;
      u.rate = o.rate || 1.05; u.pitch = o.pitch || 1; u.volume = (o.vol ?? 0.9) * Math.max(0.2, settings.fx);
      speechSynthesis.speak(u);
    } catch (e) { }
  }

