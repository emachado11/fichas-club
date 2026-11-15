/* Componentes compartilhados: botão + flutuante e card de ficha. */
import { esc, face } from './common.js?v=10';

/* items: [{href,label}] → 1 item: botão + direto; vários: botão + abre um menu para cima */
export const fab = items => items.length === 1
  ? `<div class=fab><a class="fb btn" href="${items[0].href}" aria-label="${esc(items[0].label)}" title="${esc(items[0].label)}">+</a></div>`
  : `<div class=fab><div class=fm>${items.map(i => `<a href="${i.href}">${esc(i.label)}</a>`).join('')}</div><button class=fb data-fab aria-label="Criar" aria-expanded=false>+</button></div>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fab]'), f = b?.closest('.fab');
  document.querySelectorAll('.fab.open').forEach(x => { if (x !== f) { x.classList.remove('open'); x.querySelector('[data-fab]')?.setAttribute('aria-expanded', false) } });
  if (b) { f.classList.toggle('open'); b.setAttribute('aria-expanded', f.classList.contains('open')) }
});

/* Esqueleto de carregamento (aparece até os dados chegarem) */
export const skel = (n = 6) => Array.from({ length: n }, () => '<div class="sc skel" aria-hidden=true><div class=scp></div><div class=scb><b>&nbsp;</b><small>&nbsp;</small><small>&nbsp;</small></div></div>').join('');
export const sheetCard = (x, o = {}) => {
  const f = face(x);
  return `<a class=sc href="ficha.html?id=${esc(x.id)}" data-p="${esc(x.perfil)}" data-id="${esc(x.id)}" ${o.drag ? 'draggable=true' : ''}>
  <div class=scp>${f ? `<img src="${esc(f)}" alt="" draggable=false loading=lazy>` : esc((x.name || '?').trim().charAt(0).toUpperCase())}</div>
  <div class=scb><b>${esc(x.name)}</b><small>${esc(x.perfil)} · Nível ${esc(x.nivel)}</small><small>${esc(x.ocup || '—')}</small><div class=scs><span>PV ${x.pv}/${x.pvMax}</span><span>PD ${x.pd}/${x.pdMax}</span></div></div>
  ${o.del ? `<button class=scx data-a=del data-id="${esc(x.id)}" aria-label="Excluir ${esc(x.name)}" title=Excluir>×</button>` : ''}
  ${o.move ? `<span class=mv><button data-a=mvl data-id="${esc(x.id)}" aria-label="Mover para antes">‹</button><button data-a=mvr data-id="${esc(x.id)}" aria-label="Mover para depois">›</button></span>` : ''}</a>`
};
/* botões dentro do card não devem abrir a ficha */
document.addEventListener('click', e => { if (e.target.closest('.scx,.mv')) e.preventDefault() }, true);
