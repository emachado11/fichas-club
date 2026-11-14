/* Cabeçalho do site: logo, navegação, amigos, convites e perfil. */
import { ME, avatar, watchFriends, watchFriendRequests, watchInvites, answerFriendRequest, answerInvite } from './profile.js';
import { esc, toast, err } from './common.js';

const IC = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
  sheet: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  camp: '<svg viewBox="0 0 24 24"><path d="M3 20L12 4l9 16zM9 20l3-6 3 6"/></svg>',
  friends: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14c3 0 4.5 1.8 4.9 5"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>'
};
const PAGES = { home: ['painel'], sheet: ['fichas', 'ficha', 'ficha-nova'], camp: ['campanhas', 'campanha', 'campanha-nova', 'convite'] };
const isOn = k => PAGES[k].includes(location.pathname.split('/').pop().replace('.html', ''));
const NAV = [['painel.html', 'Início', 'home'], ['fichas.html', 'Fichas', 'sheet'], ['campanhas.html', 'Campanhas', 'camp']];
let mounted = null, unsubs = [];

export function mountHeader(u) {
  let h = document.getElementById('hdr');
  if (!h) { h = document.createElement('header'); h.id = 'hdr'; document.getElementById('app').before(h) }
  if (mounted === u?.uid && h.firstChild) return; mounted = u?.uid; unsubs.forEach(f => f()); unsubs = [];
  let bn = document.getElementById('bnav'); if (!bn) { bn = document.createElement('nav'); bn.id = 'bnav'; document.body.append(bn) }
  bn.innerHTML = NAV.map(([href, t, k]) => `<a href=${href} class="${isOn(k) ? 'on' : ''}">${IC[k]}<span>${t}</span></a>`).join('');
  h.innerHTML = `<div class=hin>
  <a class=logo href=painel.html aria-label="The Club | Início"><img src="img/logo.png" alt="The Club"></a>
  <nav class=hnav>${NAV.map(([href, t, k]) => `<a href=${href} class="${isOn(k) ? 'on' : ''}">${IC[k]}<span>${t}</span></a>`).join('')}</nav>
  <div class=hact>${!u ? '<a class=btn href=index.html>Entrar</a>' : ''}
    ${!u ? '<template>' : ''}<div class=hd data-h=fr><button class=ib data-hd=fr aria-label="Amigos" aria-expanded=false>${IC.friends}<span class=act-label>Amigos</span></button><div class=menu role=menu><h4>Amigos</h4><div class=ml id=hfriends><p class=mt>Carregando…</p></div><h4 class=mt>Pedidos</h4><div class=ml id=hrequests><p class=mt>Carregando…</p></div><a class=mf href="perfil.html#amigos">Gerenciar amigos</a></div></div>
    <div class=hd data-h=inv><button class=ib data-hd=inv aria-label="Convites" aria-expanded=false>${IC.mail}<span class=act-label>Convites</span><i class=badge id=hbd hidden></i></button><div class=menu role=menu><h4>Convites para campanhas</h4><div class=ml id=hinv><p class=mt>Carregando…</p></div></div></div>
    <a class="hp ${/perfil/.test(location.pathname) ? 'on' : ''}" href=perfil.html aria-label="Meu perfil" title="Meu perfil">${avatar(ME || { displayName: u?.email })}</a>${!u ? '</template>' : ''}
  </div></div>`;
  h.onclick = e => {
    const b = e.target.closest('[data-hd]'); const open = b && !b.parentNode.classList.contains('open');
    h.querySelectorAll('.hd.open').forEach(x => { x.classList.remove('open'); x.firstElementChild.setAttribute('aria-expanded', false) });
    if (open) { b.parentNode.classList.add('open'); b.setAttribute('aria-expanded', true) }
    const a = e.target.closest('[data-inv]'); if (a) answer(a, u);
    const r = e.target.closest('[data-fr]'); if (r) answerFriend(r, u)
  };
  document.addEventListener('click', e => { if (!e.target.closest('#hdr .hd')) h.querySelectorAll('.hd.open').forEach(x => x.classList.remove('open')) });
  addEventListener('keydown', e => { if (e.key === 'Escape') h.querySelectorAll('.hd.open').forEach(x => x.classList.remove('open')) });
  if (!u) return;
  unsubs.push(watchFriends(u.uid, L => {
    document.getElementById('hfriends').innerHTML = L.length ? L.map(p => `<div class=mi>${avatar(p)}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}</small></span></div>`).join('') : '<p class=mt>Nenhum amigo ainda. Adicione pelo @, e-mail ou link em Perfil › Amigos.</p>'
  }));
  unsubs.push(watchFriendRequests(u.uid, L => {
    const received = L.incoming.length ? L.incoming.map(r => `<div class=frow><span class=who>${avatar(r.fromProfile)}<span class=mn><b>${esc(r.fromProfile?.displayName || 'Agente')}</b><small>@${esc(r.fromProfile?.username || '')}</small></span></span><span class=row><button data-fr=accept data-id="${esc(r.id)}" data-from="${esc(r.from)}" data-to="${esc(r.to)}">Aceitar</button><button class=g data-fr=reject data-id="${esc(r.id)}" data-from="${esc(r.from)}" data-to="${esc(r.to)}">Recusar</button></span></div>`).join('') : '<p class=mt>Nenhum pedido recebido.</p>';
    const sent = L.outgoing.length ? L.outgoing.map(r => `<div class=frow><span class=who>${avatar(r.toProfile)}<span class=mn><b>${esc(r.toProfile?.displayName || 'Agente')}</b><small>@${esc(r.toProfile?.username || '')}</small></span></span><button class=g data-fr=cancel data-id="${esc(r.id)}" data-from="${esc(r.from)}" data-to="${esc(r.to)}">Cancelar</button></div>`).join('') : '<p class=mt>Nenhum pedido enviado.</p>';
    document.getElementById('hrequests').innerHTML = `<b class=mt>Recebidos</b>${received}<b class=mt>Enviados</b>${sent}`
  }));
  unsubs.push(watchInvites(u.uid, L => {
    const b = document.getElementById('hbd'); b.hidden = !L.length; b.textContent = L.length;
    L.forEach(i => i._t = i.id);
    document.getElementById('hinv').innerHTML = L.length ? L.map(i => `<div class=iv><div class=ivb style="${i.thumb ? `background-image:url('${esc(i.thumb)}')` : ''}"></div><div class=ivt><b>${esc(i.campaignName)}</b><small>de @${esc(i.fromProfile?.username || '?')}</small><span class=row><button data-inv=1 data-id="${esc(i.id)}" data-c="${esc(i.campaign)}">Aceitar</button><button class=g data-inv=0 data-id="${esc(i.id)}" data-c="${esc(i.campaign)}">Recusar</button></span></div></div>`).join('') : '<p class=mt>Nenhum convite pendente.</p>'
  }));
}
async function answer(b, u) {
  const ok = b.dataset.inv == '1'; b.disabled = true;
  try { await answerInvite({ id: b.dataset.id, campaign: b.dataset.c }, u.uid, ok); toast(ok ? 'Convite aceito! Você entrou na campanha.' : 'Convite recusado.'); if (ok && /campanhas\.html$/.test(location.pathname)) location.reload() }
  catch (x) { b.disabled = false; toast(err(x), 1) }
}

async function answerFriend(b, u) {
  const action = b.dataset.fr; b.disabled = true;
  try {
    await answerFriendRequest({ id: b.dataset.id, from: b.dataset.from, to: b.dataset.to }, u.uid, action === 'accept');
    toast(action === 'accept' ? 'Solicitação aceita; vocês agora são amigos.' : action === 'reject' ? 'Solicitação recusada.' : 'Solicitação cancelada.')
  } catch (x) { b.disabled = false; toast(err(x), 1) }
}

export const refreshAvatar = () => { const a = document.querySelector('#hdr .hp'); if (a) a.innerHTML = avatar(ME) };
