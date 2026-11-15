/* Aplica o tema salvo antes da página aparecer (evita piscar). */
try {
  const root = document.documentElement, palette = localStorage.palette;
  root.dataset.theme = localStorage.theme == 'light' ? 'light' : 'dark';
  const palettes = ['executor', 'analista', 'vigilante', 'conhecimento', 'morte', 'sangue', 'energia', 'medo', 'conchas', 'halloween25'];
  if (localStorage.getItem('club-entity-theme-unlocked') === 'true') palettes.push('entidade');
  if (localStorage.getItem('club-farol-theme-unlocked') === 'true') palettes.push('farol');
  root.dataset.palette = palettes.includes(palette) ? palette : 'executor';
  root.lang = 'pt-BR'
} catch { }
