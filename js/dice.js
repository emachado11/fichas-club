/* Rolador de dados: botão no canto superior direito. Ajuste as regras de crítico aqui. */
const D = [4, 6, 8, 10, 12, 20];
const crit = (L) => L.some(([d, v]) => v === d) ? 'ok' : L.every(([, v]) => v === 1) ? 'fail' : ''; // ok = algum dado no máximo; fail = todos tiraram 1
const IC = {
  4: '<polygon points="30,6 54,50 6,50"/><path d="M30,6 30,36 6,50M30,36 54,50"/>',
  6: '<polygon points="30,5 53,18 53,42 30,55 7,42 7,18"/><path d="M30,30 7,18M30,30 53,18M30,30 30,55"/>',
  8: '<polygon points="30,4 54,30 30,56 6,30"/><path d="M6,30 54,30M30,4 30,56"/>',
  10: '<polygon points="30,4 54,26 30,56 6,26"/><path d="M30,4 30,56M6,26 54,26"/>',
  12: '<polygon points="30,5 55,23 46,53 14,53 5,23"/><polygon points="30,18 43,27 38,42 22,42 17,27"/>',
  20: '<polygon points="30,4 54,17 54,43 30,56 6,43 6,17"/><polygon points="30,16 44,40 16,40"/><path d="M30,4 30,16M54,17 44,40M6,17 16,40"/>'
};
const svg = (d, t = '') => `<svg viewBox="0 0 60 60" class=dc fill=none stroke=currentColor stroke-width=2 stroke-linejoin=round aria-hidden=true>${IC[d]}${t !== '' ? `<text x=30 y=37 text-anchor=middle fill=currentColor stroke=none font-size=${String(t).length > 1 ? 15 : 18} font-family=Cinzel font-weight=700>${t}</text>` : ''}</svg>`;
export function initDice() {
  if (document.getElementById('dice')) return;
  const w = document.createElement('div'); w.id = 'dice'; document.body.append(w);
  const n = { 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0 }; let open = false, lp = 0, lt;
  const total = () => D.reduce((a, d) => a + n[d], 0);
  const draw = () => { w.innerHTML = `<button id=dbtn aria-label="Rolagem de dados" aria-expanded=${open}>${svg(20)}</button>` + (open ? `<div id=dpanel><div class=dg>${D.map(d => `<div class=dx data-d=${d} role=button tabindex=0>${svg(d)}${n[d] ? `<b>${n[d]}</b>` : ''}<span>d${d}</span></div>`).join('')}</div><div class=dfoot><span class=mt>Rolar dados${total() ? ` (${total()})` : ''}</span><button class=g data-x=clr>Limpar</button><button data-x=go>Rolar</button></div><p class=mt>Toque para adicionar, segure ou clique direito para remover.</p></div>` : '') };
  const chg = (d, k) => { n[d] = Math.max(0, Math.min(20, n[d] + k)); draw() };
  w.addEventListener('click', e => {
    if (lp) return; const x = e.target.closest('[data-x]'), d = e.target.closest('[data-d]');
    if (e.target.closest('#dbtn')) { open = !open; draw() } else if (d) chg(+d.dataset.d, 1); else if (x?.dataset.x === 'clr') { D.forEach(k => n[k] = 0); draw() } else if (x?.dataset.x === 'go') roll()
  });
  w.addEventListener('contextmenu', e => { const d = e.target.closest('[data-d]'); if (d) { e.preventDefault(); chg(+d.dataset.d, -1) } });
  w.addEventListener('pointerdown', e => { const d = e.target.closest('[data-d]'); lp = 0; if (!d || e.pointerType === 'mouse') return; lt = setTimeout(() => { lp = 1; chg(+d.dataset.d, -1) }, 450) });
  w.addEventListener('pointerup', () => { clearTimeout(lt); setTimeout(() => lp = 0, 60) });
  w.addEventListener('keydown', e => { const d = e.target.closest?.('[data-d]'); if (d && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); chg(+d.dataset.d, 1) } });
  function roll() {
    const L = []; D.forEach(d => { for (let i = 0; i < n[d]; i++)L.push([d, 1]) }); if (!L.length) return;
    document.getElementById('roll')?.remove(); const ov = document.createElement('div'); ov.id = 'roll'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-live', 'polite'); document.body.append(ov); open = false; draw();
    const dice = () => `<div class=rd>${L.map(([d, v]) => `<div class=rdie>${svg(d, v)}<small>d${d}</small></div>`).join('')}</div>`;
    const shut = () => { ov.remove(); document.removeEventListener('keydown', esc) }, esc = e => e.key === 'Escape' && shut();
    ov.onclick = shut; document.addEventListener('keydown', esc);
    let k = 0; const t = setInterval(() => {
      L.forEach(x => x[1] = 1 + Math.floor(Math.random() * x[0]));
      if (++k < 9) { ov.innerHTML = `<div class=rbox>${dice()}</div>`; return }
      clearInterval(t); const v = L.map(x => x[1]), sum = v.reduce((a, b) => a + b, 0), c = crit(L);
      ov.innerHTML = `<div class="rbox ${c}">${dice()}<div class=sum>${sum}</div><div class=rab><span class=ra>RA <b>${Math.max(...v)}</b></span><span class=rb>RB <b>${Math.min(...v)}</b></span></div>${c ? `<div class=cr>${c === 'ok' ? 'Acerto crítico' : 'Falha crítica'}</div>` : ''}<p class=mt>Toque para fechar</p></div>`
    }, 60)
  }
  draw();
  document.addEventListener('click', e => { if (open && !w.contains(e.target)) { open = false; draw() } });
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) { open = false; draw() } });
}
