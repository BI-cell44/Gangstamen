  // ---------- voices (speech synthesis, French when the browser has a voice for it) ----------
  let voice = null;
  function pickVoice() { try { const v = speechSynthesis.getVoices(); voice = v.find(x => /^fr/i.test(x.lang)) || null; } catch (e) { } }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { }
  function say(text, o = {}) {
    if (!settings.voices || !window.speechSynthesis) return;
    try {
      if (o.cancel) speechSynthesis.cancel(); else if (speechSynthesis.speaking && !o.queue) return;
      const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; if (voice) u.voice = voice;
      u.rate = o.rate || 1.05; u.pitch = o.pitch || 1; u.volume = (o.vol ?? 0.9) * Math.max(0.2, settings.fx);
      speechSynthesis.speak(u);
    } catch (e) { }
  }

