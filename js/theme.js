/* Aplica o tema salvo antes da página aparecer (evita piscar). */
try {
  const root = document.documentElement, palette = localStorage.palette;
  root.dataset.theme = localStorage.theme == 'light' ? 'light' : 'dark';
  root.dataset.palette = ['executor', 'analista', 'vigilante'].includes(palette) ? palette : 'executor';
  root.lang = 'pt-BR'
} catch { }
