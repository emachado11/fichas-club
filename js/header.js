/* Cabeçalho do site: logo, navegação, amigos, convites e perfil. */
import { ME, setMe, avatar, isFarolThemeUnlocked, unlockEntityTheme, unlockFarolTheme, watchFriends, watchFriendRequests, watchInvites, answerFriendRequest, answerInvite } from './profile.js?v=3';
import { esc, toast, err } from './common.js?v=10';
import { scope } from './firebase.js';
import { watchBrowserNotifications } from './browser-notifications.js?v=2';

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
let mounted = null, unsubs = [], menusBound = false;
let logoEventActive = false;
let typedFarolCode = '';
const FAROL_CODE = 'smil3';
const LOGO_EVENT_PROGRESS_KEY = 'club-logo-event-progress';
const LOGO_EVENT_IDS = ['jose', 'diane', 'patrick', 'jose-burned', 'diane-mask', 'devil', 'timeo'];
const JUMPSCARE_IMAGES = [
  { id: 'jose', src: 'img/Jos%C3%A9.png' },
  { id: 'diane', src: 'img/Diane.png' },
  { id: 'patrick', src: 'img/Patrick.png' },
  { id: 'jose-burned', src: 'img/JoseQUEIMADO.png' },
  { id: 'diane-mask', src: 'img/DianeMascara.png' },
  { id: 'devil', src: 'img/ODIABO.png' }
];
const loadLogoEventProgress = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(LOGO_EVENT_PROGRESS_KEY) || '[]');
    return new Set(Array.isArray(stored) ? stored.filter(id => LOGO_EVENT_IDS.includes(id)) : [])
  } catch (error) {
    console.warn('Não foi possível carregar o progresso dos eventos do logo.', error);
    return new Set()
  }
};
let completedLogoEvents = loadLogoEventProgress();

function showAchievement(icon, title) {
  const popup = document.createElement('div');
  popup.className = 'club-achievement';
  popup.setAttribute('role', 'status');
  popup.setAttribute('aria-live', 'polite');
  popup.innerHTML = `<span class=club-achievement-icon aria-hidden=true>${icon}</span><span class=club-achievement-copy><small>CONQUISTA DESBLOQUEADA</small><b>${title}</b></span>`;
  document.body.append(popup);
  requestAnimationFrame(() => popup.classList.add('visible'));
  setTimeout(() => popup.classList.add('leaving'), 5450);
  setTimeout(() => popup.remove(), 5850)
}

function recordLogoEvent(id) {
  completedLogoEvents.add(id);
  if (completedLogoEvents.size < LOGO_EVENT_IDS.length) {
    try { sessionStorage.setItem(LOGO_EVENT_PROGRESS_KEY, JSON.stringify([...completedLogoEvents])) }
    catch (error) { console.warn('Não foi possível salvar o progresso dos eventos do logo.', error) }
    return
  }
  completedLogoEvents.clear();
  try { sessionStorage.setItem(LOGO_EVENT_PROGRESS_KEY, '[]') }
  catch (error) { console.warn('Não foi possível reiniciar o progresso dos eventos do logo.', error) }
  unlockEntityTheme(ME?.uid).catch(error => console.warn('Não foi possível sincronizar o desbloqueio do tema Entidade do Medo.', error));
  showAchievement('?', 'A Entidade do Medo reina')
}

function unlockFarol() {
  if (isFarolThemeUnlocked()) return;
  unlockFarolTheme(ME?.uid).catch(error => console.warn('Não foi possível sincronizar o desbloqueio do tema Farol.', error));
  showAchievement(':)', 'Nos veremos novamente. :)')
}

/* Computador: digitar o código fora de campos de texto (teclado físico). */
addEventListener('keydown', event => {
  const target = event.target;
  const typing = target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
  if (typing || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) {
    typedFarolCode = '';
    return
  }
  const key = event.key.toLowerCase();
  if (key.length !== 1) { typedFarolCode = ''; return }
  typedFarolCode = (typedFarolCode + key).slice(-FAROL_CODE.length);
  if (typedFarolCode !== FAROL_CODE) return;
  typedFarolCode = '';
  unlockFarol()
});

/* Celular (tela de toque): o teclado virtual não envia teclas como o do computador, e quase sempre há um campo
   de texto em foco. Aqui o código vale quando digitado em qualquer campo de escrita (confere o fim do texto digitado). */
const isTouchScreen = () => matchMedia('(pointer: coarse)').matches;
addEventListener('input', event => {
  if (!event.inputType?.startsWith('insert') || event.inputType === 'insertFromPaste' || !isTouchScreen()) return;
  const field = event.target;
  if (!field || field.type === 'password') return;
  const n = FAROL_CODE.length;
  let tail;
  if (field.isContentEditable) tail = (field.textContent || '').slice(-n);
  else if (typeof field.value === 'string') {
    let end = field.value.length;
    try { if (field.selectionStart != null) end = field.selectionStart } catch { }
    tail = field.value.slice(Math.max(0, end - n), end)
  } else return;
  if (tail.toLowerCase() === FAROL_CODE) unlockFarol()
}, true);

function showJumpscare(src, eventId) {
  const overlay = document.createElement('div'), image = document.createElement('img');
  overlay.className = 'club-logo-event club-logo-jumpscare';
  overlay.setAttribute('aria-hidden', 'true');
  image.onload = () => {
    document.body.append(overlay);
    setTimeout(() => overlay.classList.add('fading'), 200);
    setTimeout(() => { overlay.remove(); logoEventActive = false; recordLogoEvent(eventId) }, 500)
  };
  image.onerror = () => { logoEventActive = false };
  image.src = src; image.alt = ''; image.draggable = false;
  overlay.append(image);
  logoEventActive = true
}

function showTimeo() {
  const overlay = document.createElement('div'), backdrop = document.createElement('div'), image = document.createElement('img');
  overlay.className = 'club-logo-event club-logo-timeo';
  overlay.setAttribute('aria-hidden', 'true');
  image.onload = () => {
    overlay.append(backdrop, image);
    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('dark'));
    setTimeout(() => overlay.classList.add('image-visible'), 500);
    setTimeout(() => overlay.classList.add('image-fading'), 7500);
    setTimeout(() => overlay.classList.add('screen-opening'), 10500);
    setTimeout(() => { overlay.remove(); logoEventActive = false; recordLogoEvent('timeo') }, 11500)
  };
  image.onerror = () => { logoEventActive = false };
  backdrop.className = 'club-logo-timeo-backdrop';
  image.src = 'img/TIMEO.png'; image.alt = ''; image.draggable = false;
  logoEventActive = true
}

function handleLogoClick(event) {
  event.preventDefault();
  if (logoEventActive) return;
  const outcome = Math.random() * 100;
  if (outcome < 80) {
    window.open('https://www.youtube.com/@TheClub091', '_blank', 'noopener,noreferrer');
    return
  }
  if (outcome < 98) {
    const event = JUMPSCARE_IMAGES[Math.floor((outcome - 80) / 3)];
    showJumpscare(event.src, event.id);
    return
  }
  showTimeo()
}

export function mountHeader(u, opt = {}) {
  let h = document.getElementById('hdr');
  if (!h) { h = document.createElement('header'); h.id = 'hdr'; document.getElementById('app').before(h) }
  if (mounted === u?.uid && h.firstChild) return; mounted = opt.shell ? null : u?.uid; unsubs.forEach(f => f()); unsubs = [];
  let bn = document.getElementById('bnav'); if (!bn) { bn = document.createElement('nav'); bn.id = 'bnav'; document.body.append(bn) }
  const links = NAV.map(([href, t, k]) => `<a href=${href} class="${isOn(k) ? 'on' : ''}">${IC[k]}<span>${t}</span></a>`).join('');
  bn.innerHTML = links;
  h.innerHTML = `<div class=hin>
  <a class=logo href="#" aria-label="The Club | Eventos aleatórios"><img src="img/logo.png" alt="The Club"></a>
  <nav class=hnav>${links}</nav>
  <div class=hact>${!u ? '<a class=btn href=index.html>Entrar</a>' : ''}
    ${!u ? '<template>' : ''}<div class=hd data-h=fr><button class=ib data-hd=fr aria-label="Amigos" aria-expanded=false>${IC.friends}<span class=act-label>Amigos</span></button><div class=menu role=menu><h4>Amigos</h4><div class=ml id=hfriends><p class=mt>Carregando…</p></div><h4 class=mt>Pedidos</h4><div class=ml id=hrequests><p class=mt>Carregando…</p></div><a class=mf href="perfil.html#amigos">Gerenciar amigos</a></div></div>
    <div class=hd data-h=inv><button class=ib data-hd=inv aria-label="Convites" aria-expanded=false>${IC.mail}<span class=act-label>Convites</span><i class=badge id=hbd hidden></i></button><div class=menu role=menu><h4>Convites para campanhas</h4><div class=ml id=hinv><p class=mt>Carregando…</p></div></div></div>
    <a class="hp ${/perfil/.test(location.pathname) ? 'on' : ''}" href=perfil.html aria-label="Meu perfil" title="Meu perfil">${avatar(ME || { displayName: u?.email })}</a>${!u ? '</template>' : ''}
  </div></div>`;
  h.querySelector('.logo').addEventListener('click', handleLogoClick);
  h.onclick = e => {
    const b = e.target.closest('[data-hd]'); const open = b && !b.parentNode.classList.contains('open');
    h.querySelectorAll('.hd.open').forEach(x => { x.classList.remove('open'); x.firstElementChild.setAttribute('aria-expanded', false) });
    if (open) { b.parentNode.classList.add('open'); b.setAttribute('aria-expanded', true) }
    const a = e.target.closest('[data-inv]'); if (a) answer(a, u);
    const r = e.target.closest('[data-fr]'); if (r) answerFriend(r, u)
  };
  if (!menusBound) {
    menusBound = true;
    const closeMenus = () => document.querySelectorAll('#hdr .hd.open').forEach(x => x.classList.remove('open'));
    document.addEventListener('click', e => { if (!e.target.closest('#hdr .hd')) closeMenus() });
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus() })
  }
  if (!u || opt.shell) return;
  let fstarted = false;
  const startFriends = () => { if (fstarted) return; fstarted = true; scope.global = true;
  unsubs.push(watchFriends(u.uid, L => {
    document.getElementById('hfriends').innerHTML = L.length ? L.map(p => `<div class=mi>${avatar(p)}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}</small></span></div>`).join('') : '<p class=mt>Nenhum amigo ainda. Adicione pelo @, e-mail ou link em Perfil › Amigos.</p>'
  }));
  unsubs.push(watchFriendRequests(u.uid, L => {
    const received = L.incoming.length ? L.incoming.map(r => `<div class=frow><span class=who>${avatar(r.fromProfile)}<span class=mn><b>${esc(r.fromProfile?.displayName || 'Agente')}</b><small>@${esc(r.fromProfile?.username || '')}</small></span></span><span class=row><button data-fr=accept data-id="${esc(r.id)}" data-from="${esc(r.from)}" data-to="${esc(r.to)}">Aceitar</button><button class=g data-fr=reject data-id="${esc(r.id)}" data-from="${esc(r.from)}" data-to="${esc(r.to)}">Recusar</button></span></div>`).join('') : '<p class=mt>Nenhum pedido recebido.</p>';
    const sent = L.outgoing.length ? L.outgoing.map(r => `<div class=frow><span class=who>${avatar(r.toProfile)}<span class=mn><b>${esc(r.toProfile?.displayName || 'Agente')}</b><small>@${esc(r.toProfile?.username || '')}</small></span></span><button class=g data-fr=cancel data-id="${esc(r.id)}" data-from="${esc(r.from)}" data-to="${esc(r.to)}">Cancelar</button></div>`).join('') : '<p class=mt>Nenhum pedido enviado.</p>';
    document.getElementById('hrequests').innerHTML = `<b class=mt>Recebidos</b>${received}<b class=mt>Enviados</b>${sent}`
  }));
  scope.global = false;
  };
  setTimeout(startFriends, 2500);
  h.querySelector('[data-hd=fr]')?.addEventListener('click', startFriends);
  scope.global = true;
  unsubs.push(watchInvites(u.uid, L => {
    const b = document.getElementById('hbd'); b.hidden = !L.length; b.textContent = L.length;
    L.forEach(i => i._t = i.id);
    document.getElementById('hinv').innerHTML = L.length ? L.map(i => `<div class=iv><div class=ivb style="${i.thumb ? `background-image:url('${esc(i.thumb)}')` : ''}"></div><div class=ivt><b>${esc(i.campaignName)}</b><small>de @${esc(i.fromProfile?.username || '?')}</small><span class=row><button data-inv=1 data-id="${esc(i.id)}" data-c="${esc(i.campaign)}">Aceitar</button><button class=g data-inv=0 data-id="${esc(i.id)}" data-c="${esc(i.campaign)}">Recusar</button></span></div></div>`).join('') : '<p class=mt>Nenhum convite pendente.</p>'
  }));
  unsubs.push(watchBrowserNotifications(u.uid));
  scope.global = false
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
addEventListener('club-profile', () => refreshAvatar());

/* Cabeçalho imediato (sem esperar o login): usa o perfil salvo no aparelho, então trocar de página não pisca. */
export function earlyHeader() {
  try {
    const uid = localStorage.getItem('club-in'); if (!uid || uid === '1') return;
    const c = JSON.parse(localStorage.getItem('club-prof-' + uid) || 'null'); if (!c?.me) return;
    setMe({ uid, ...c.me }); mountHeader({ uid, email: '' }, { shell: true })
  } catch { }
}

/* Atualiza o destaque do menu quando a página muda sem recarregar. */
export function syncNav() {
  document.querySelectorAll('#hdr .hnav a, #bnav a').forEach(a => { const k = NAV.find(n => n[0] === a.getAttribute('href'))?.[2]; a.classList.toggle('on', !!k && isOn(k)) });
  document.querySelector('#hdr .hp')?.classList.toggle('on', /perfil/.test(location.pathname))
}
