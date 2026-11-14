/* Aplica o tema salvo antes da página aparecer (evita piscar). */
try { document.documentElement.dataset.theme = localStorage.theme || 'dark'; document.documentElement.lang = localStorage.lang || 'pt-BR' } catch { }
