/* Perfil público (profiles/{uid}), dados privados (users/{uid}), amizades e convites de campanha. */
import { db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, writeBatch, serverTimestamp, arrayUnion } from './firebase.js';

const cache = {};
let ready = false;
export let ME = null, PRIV = {};
export const clean = h => String(h || '').trim().replace(/^@/, '').toLowerCase();
export const validHandle = h => /^[a-z0-9_.]{3,20}$/.test(h);
export const isEmail = t => /^\S+@\S+\.\S+$/.test(String(t).trim());
export const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t).trim().toLowerCase())))].map(b => b.toString(16).padStart(2, '0')).join('');
export const MODES = { light: 'Claro', dark: 'Escuro' };
export const ENTITY_THEME_UNLOCK_KEY = 'club-entity-theme-unlocked';
export const ENTITY_ACHIEVEMENT_ID = 'entity-fear';
export const FAROL_THEME_UNLOCK_KEY = 'club-farol-theme-unlocked';
export const FAROL_ACHIEVEMENT_ID = 'farol-reunion';
export const PALETTES = { executor: 'Executor', analista: 'Analista', vigilante: 'Vigilante', conhecimento: 'Conhecimento', morte: 'Morte', sangue: 'Sangue', energia: 'Energia', medo: 'Medo', conchas: 'Conchas', halloween25: 'Halloween 25', entidade: 'Entidade do Medo', farol: 'Farol' };
export const isEntityThemeUnlocked = () => {
  if (PRIV.entityThemeUnlocked === true || (Array.isArray(PRIV.achievements) && PRIV.achievements.includes(ENTITY_ACHIEVEMENT_ID))) return true;
  try { return localStorage.getItem(ENTITY_THEME_UNLOCK_KEY) === 'true' } catch { return false }
};
export const isFarolThemeUnlocked = () => {
  if (PRIV.farolThemeUnlocked === true || (Array.isArray(PRIV.achievements) && PRIV.achievements.includes(FAROL_ACHIEVEMENT_ID))) return true;
  try { return localStorage.getItem(FAROL_THEME_UNLOCK_KEY) === 'true' } catch { return false }
};
export const applyTheme = t => { t = MODES[t] ? t : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.theme = t } catch { } };
export const applyPalette = p => { p = PALETTES[p] ? p : 'executor'; document.documentElement.dataset.palette = p; try { localStorage.palette = p } catch { } };

/* Garante que o usuário tenha perfil (cria @ automático na primeira vez) e carrega as preferências privadas.
   Se já houver uma cópia salva neste aparelho, a página abre imediatamente e os dados são atualizados em segundo plano. */
export async function ensureProfile(u) {
  if (ready && ME?.uid === u.uid) return ME;   // já carregado nesta sessão (troca de página sem recarregar)
  let c = null; try { c = JSON.parse(localStorage.getItem('club-prof-' + u.uid) || 'null') } catch { }
  if (c?.me) {
    ME = { uid: u.uid, ...c.me }; cache[u.uid] = ME; PRIV = c.priv || {}; applyPrefs(u); ready = true;
    loadProfile(u).then(() => dispatchEvent(new Event('club-profile'))).catch(() => { });
    return ME
  }
  return loadProfile(u)
}
function applyPrefs(u) {
  const localPrefs = {};
  try { localPrefs.theme = localStorage.theme; localPrefs.palette = localStorage.palette } catch { }
  const syncPrefs = {};
  if (MODES[localPrefs.theme]) {
    applyTheme(localPrefs.theme);
    if (PRIV.theme !== localPrefs.theme) syncPrefs.theme = localPrefs.theme
  } else if (PRIV.theme) applyTheme(PRIV.theme);
  if (PALETTES[localPrefs.palette]) {
    applyPalette(localPrefs.palette);
    if (PRIV.palette !== localPrefs.palette) syncPrefs.palette = localPrefs.palette
  } else if (PRIV.palette) applyPalette(PRIV.palette);
  if (Object.keys(syncPrefs).length) savePriv(u.uid, syncPrefs).catch(() => { })
}
async function loadProfile(u) {
  const ref = doc(db, 'profiles', u.uid);
  const [d, eh, pu] = await Promise.all([getDoc(ref).catch(() => null), u.email ? sha(u.email) : '', getDoc(doc(db, 'users', u.uid)).catch(() => null)]);
  if (d && d.exists()) { ME = { uid: u.uid, ...d.data() }; if (eh && ME.emailHash !== eh) { ME.emailHash = eh; updateDoc(ref, { emailHash: eh }).catch(() => { }) } }
  else if (d) {
    let base = clean((u.email || 'agente').split('@')[0]).replace(/[^a-z0-9_.]/g, '').slice(0, 14); if (base.length < 3) base = (base + 'agente').slice(0, 14);
    for (let i = 0; i < 6 && !ME; i++) {
      const h = i ? base.slice(0, 15) + Math.floor(1000 + Math.random() * 9000) : base;
      if ((await getDoc(doc(db, 'usernames', h))).exists()) continue;
      try {
        const p = { username: h, displayName: u.displayName || base, photo: u.photoURL || '', emailHash: eh }, b = writeBatch(db);
        b.set(doc(db, 'usernames', h), { uid: u.uid }); b.set(ref, p); await b.commit(); ME = { uid: u.uid, ...p }
      } catch { }
    }
  }
  if (ME) cache[u.uid] = ME;
  PRIV = pu && pu.exists() ? pu.data() : {};
  applyPrefs(u);
  try { localStorage.setItem('club-prof-' + u.uid, JSON.stringify({ me: ME, priv: PRIV })) } catch { }
  ready = true;
  return ME
}
export const setMe = p => { ME = { ...ME, ...p }; cache[ME.uid] = ME };
export async function getProfile(uid) {
  if (cache[uid]) return cache[uid];
  try { const d = await getDoc(doc(db, 'profiles', uid)); return cache[uid] = d.exists() ? { uid, ...d.data() } : { uid, displayName: 'Agente', username: '' } } catch { return { uid, displayName: 'Agente', username: '' } }
}
/* Preferências e atalhos privados do usuário (tema, idioma, recentes, ordem das fichas) */
export const savePriv = async (uid, patch) => { Object.assign(PRIV, patch); await setDoc(doc(db, 'users', uid), patch, { merge: true }) };
export function unlockEntityTheme(uid) {
  try { localStorage.setItem(ENTITY_THEME_UNLOCK_KEY, 'true') }
  catch (error) { console.warn('Não foi possível salvar o desbloqueio do tema Entidade do Medo.', error) }
  PRIV.entityThemeUnlocked = true;
  PRIV.achievements = [...new Set([...(Array.isArray(PRIV.achievements) ? PRIV.achievements : []), ENTITY_ACHIEVEMENT_ID])];
  const saving = uid ? setDoc(doc(db, 'users', uid), {
    entityThemeUnlocked: true,
    achievements: arrayUnion(ENTITY_ACHIEVEMENT_ID)
  }, { merge: true }) : Promise.resolve();
  window.dispatchEvent(new Event('club-theme-unlocked'));
  return saving
}
export function unlockFarolTheme(uid) {
  try { localStorage.setItem(FAROL_THEME_UNLOCK_KEY, 'true') }
  catch (error) { console.warn('Não foi possível salvar o desbloqueio do tema Farol.', error) }
  PRIV.farolThemeUnlocked = true;
  PRIV.achievements = [...new Set([...(Array.isArray(PRIV.achievements) ? PRIV.achievements : []), FAROL_ACHIEVEMENT_ID])];
  const saving = uid ? setDoc(doc(db, 'users', uid), {
    farolThemeUnlocked: true,
    achievements: arrayUnion(FAROL_ACHIEVEMENT_ID)
  }, { merge: true }) : Promise.resolve();
  window.dispatchEvent(new Event('club-theme-unlocked'));
  return saving
}
export const trackSheet = (uid, id) => { const r = [id, ...(PRIV.recent || []).filter(x => x !== id)].slice(0, 9); if (r[0] === (PRIV.recent || [])[0]) return; savePriv(uid, { recent: r }).catch(() => { }) };
export const trackCampaign = (uid, id) => { if (PRIV.lastCampaign === id) return; savePriv(uid, { lastCampaign: id }).catch(() => { }) };

/* Procura alguém por @usuario ou e-mail. Devolve o perfil ou null. */
export async function findUser(text) {
  const t = String(text || '').trim(); if (!t) return null;
  if (isEmail(t) && !t.startsWith('@')) {
    const q = await getDocs(query(collection(db, 'profiles'), where('emailHash', '==', await sha(t))));
    const d = q.docs[0]; return d ? { uid: d.id, ...d.data() } : null
  }
  const h = clean(t), d = await getDoc(doc(db, 'usernames', h));
  return d.exists() ? getProfile(d.data().uid) : null
}
export const initial = p => (p?.displayName || p?.username || '?').trim().charAt(0).toUpperCase();
export const avatar = (p, cls = '') => `<span class="av ${cls}">${p?.photo ? `<img src="${String(p.photo).replace(/"/g, '&quot;')}" alt="">` : initial(p)}</span>`;

/* ---------- amizades (mútuas e imediatas) ---------- */
export const fid = (a, b) => [a, b].sort().join('_');
export function watchFriends(uid, cb) {
  return onSnapshot(query(collection(db, 'friendships'), where('members', 'array-contains', uid)), async q => {
    const ids = q.docs.map(d => d.data().members.find(m => m !== uid)).filter(Boolean);
    cb(await Promise.all(ids.map(getProfile)))
  }, () => cb([]))
}
export function watchFriendRequests(uid, cb) {
  let incoming = [], outgoing = [], active = true;
  const load = async (q, key, profileKey) => {
    const requests = await Promise.all(q.docs.map(async d => {
      const request = { id: d.id, ...d.data() };
      return { ...request, [profileKey]: await getProfile(request[key]) }
    }));
    if (!active) return;
    if (key === 'from') incoming = requests; else outgoing = requests;
    cb({ incoming, outgoing })
  };
  const fail = () => { if (active) cb({ incoming, outgoing }) };
  const unIncoming = onSnapshot(query(collection(db, 'friendRequests'), where('to', '==', uid)), q => load(q, 'from', 'fromProfile'), fail);
  const unOutgoing = onSnapshot(query(collection(db, 'friendRequests'), where('from', '==', uid)), q => load(q, 'to', 'toProfile'), fail);
  return () => { active = false; unIncoming(); unOutgoing() }
}
export async function sendFriendRequest(uid, other) {
  if (!other || other === uid) throw new Error('Esse é você mesmo.');
  const ref = doc(db, 'friendships', fid(uid, other));
  if ((await getDoc(ref)).exists()) throw new Error('Vocês já são amigos.');
  const outgoing = doc(db, 'friendRequests', `${uid}_${other}`);
  if ((await getDoc(outgoing)).exists()) throw new Error('A solicitação já foi enviada.');
  if ((await getDoc(doc(db, 'friendRequests', `${other}_${uid}`))).exists()) {
    throw new Error('Essa pessoa já enviou uma solicitação. Aceite-a em Perfil › Amigos.')
  }
  await setDoc(outgoing, { from: uid, to: other, created: serverTimestamp() })
}
export async function answerFriendRequest(request, uid, accept) {
  if (accept ? request.to !== uid : request.to !== uid && request.from !== uid) {
    throw new Error('Você não pode responder a essa solicitação.')
  }
  const requestRef = doc(db, 'friendRequests', request.id);
  if (!accept) return deleteDoc(requestRef);
  const batch = writeBatch(db);
  batch.set(doc(db, 'friendships', fid(uid, request.from)), {
    members: [uid, request.from], from: uid, created: serverTimestamp()
  });
  batch.delete(requestRef);
  await batch.commit()
}
export const removeFriend = (uid, other) => deleteDoc(doc(db, 'friendships', fid(uid, other)));

/* ---------- convites para campanhas ---------- */
export function watchInvites(uid, cb) {
  return onSnapshot(query(collection(db, 'invites'), where('to', '==', uid)), async q => {
    const L = q.docs.map(d => ({ id: d.id, ...d.data() }));
    await Promise.all(L.map(async i => i.fromProfile = await getProfile(i.from))); cb(L)
  }, () => cb([]))
}
export async function sendInvite(me, camp, campId, target) {
  if ((camp.members || []).includes(target.uid)) throw new Error(`@${target.username} já está na campanha.`);
  const ref = doc(db, 'invites', `${campId}_${target.uid}`);
  if ((await getDoc(ref)).exists()) throw new Error(`@${target.username} já foi convidado.`);
  await setDoc(ref, { campaign: campId, campaignName: camp.name, thumb: camp.thumb || '', from: me.uid, to: target.uid, created: serverTimestamp() })
}
export async function answerInvite(inv, uid, accept) {
  if (accept) await updateDoc(doc(db, 'campaigns', inv.campaign), { members: arrayUnion(uid) });
  await deleteDoc(doc(db, 'invites', inv.id))
}
