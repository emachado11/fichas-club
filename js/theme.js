/* Aplica o tema salvo antes da página aparecer (evita piscar). */
try {
  const root = document.documentElement, palette = localStorage.palette;
  root.dataset.theme = localStorage.theme == 'light' ? 'light' : 'dark';
  const palettes = ['executor', 'analista', 'vigilante', 'conhecimento', 'morte', 'sangue', 'energia', 'medo', 'conchas', 'halloween25'];
  const uid = localStorage.getItem('club-in'), has = k => !!uid && uid !== '1' && localStorage.getItem(`${k}-${uid}`) === 'true';   // desbloqueio por conta
  if (has('club-entity-theme-unlocked')) palettes.push('entidade');
  if (has('club-farol-theme-unlocked')) palettes.push('farol');
  root.dataset.palette = palettes.includes(palette) ? palette : 'executor';
  root.lang = 'pt-BR'
} catch { }
