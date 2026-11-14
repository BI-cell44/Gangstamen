  // ---------- the radio host comments on the action ----------
  let djCd = 0, djLast = '';
  const DJ = {
    ko: ['Et un Rapace de moins dans le quartier !', 'Oh la belle tôle froissée ! Ça, c’est du travail.', 'Encore un qui finit à la casse, quelle soirée !', 'Les Rapaces perdent des plumes ce soir !', 'Démoli ! On m’appelle du standard, ça klaxonne de partout.', 'Allô la dépanneuse ? Il y a du boulot à Chantenay.'],
    police: ['Les gyrophares s’allument du côté de Chantenay, prudence au volant.', 'Avis aux auditeurs : la police a sorti les grands moyens.', 'Ça sent le barrage de police, mes amis.'],
    civko: ['Une pensée pour le propriétaire de cette pauvre voiture.', 'Hé, doucement avec les voitures des honnêtes gens !'],
    copko: ['Une voiture de police en flammes… ça va faire du bruit au commissariat.'],
    station: [],
  };
  function dj(kind, arg) {
    if (!sfx.station && kind !== 'station') return;
    if (kind === 'station') { if (arg) say('Vous écoutez ' + arg.name + '. ' + ({ 'G-funk': 'Le son de la côte ouest, depuis Chantenay.', 'rap français': 'Le meilleur du rap, made in Nantes.', 'techno': 'Ça tape fort du côté de la Loire.', 'funk': 'Du groove, rien que du groove.' }[arg.style] || ''), { cancel: true, pitch: 1.05, rate: 1.12 }); return; }
    if (djCd > performance.now() || Math.random() < 0.45) return;
    const list = DJ[kind]; if (!list || !list.length) return;
    let t = list[(Math.random() * list.length) | 0]; if (t === djLast) t = list[(Math.random() * list.length) | 0]; djLast = t;
    djCd = performance.now() + 14000;
    say(t, { pitch: 1.05, rate: 1.12, vol: 0.8 });
  }
