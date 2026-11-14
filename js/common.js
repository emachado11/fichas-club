import { auth, onAuthStateChanged, signOut } from './firebase.js';
import { initDice } from './dice.js';
export const $ = s => document.querySelector(s);
export const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const qs = k => new URLSearchParams(location.search).get(k);
export const D = [4, 6, 8, 10, 12, 20], AN = { f: 'Físico', m: 'Mente', e: 'Emoção' };
const L1 = [["ACROBACIA", "f"], ["APTIDÃO", "m"], ["ATLETISMO", "f"], ["CRIME", "f"], ["DISCIPLINA", "e"], ["ENGANAÇÃO", "e"], ["FURTIVIDADE", "f"], ["INTIMIDAÇÃO", "e"], ["INTUIÇÃO", "e"], ["LUTA", "f"], ["MÁQUINAS", "m"], ["MEDICINA", "m"], ["OCULTISMO", "m"], ["PERCEPÇÃO", "m"], ["PERSUASÃO", "e"], ["PESQUISA", "m"], ["PONTARIA", "f"], ["SOBREVIVÊNCIA", "m"], ["TECNOLOGIA", "m"], ["VIGOR", "f"]];
const L2 = [["ACROBACIA", "f"], ["ANIMAIS", "e"], ["APTIDÃO", "m"], ["ATLETISMO", "f"], ["BRUXARIA", "m"], ["CARISMA", "e"], ["CRIME", "f"], ["DISCIPLINA", "e"], ["ENGANAÇÃO", "e"], ["FURTIVIDADE", "f"], ["INSPECIONAR", "m"], ["INTIMIDAR", "e"], ["INTUIÇÃO", "e"], ["LUTA", "f"], ["MEDICINA", "m"], ["OFÍCIO", "m"], ["PERCEPÇÃO", "m"], ["PONTARIA", "f"], ["SOBREVIVÊNCIA", "m"], ["VIGOR", "f"]];
/* Perícias por mundo. O valor de cada perícia é guardado pelo NOME (s.sk[nome] = índice do dado). */
export const SKILLS = { moderno: L1, medieval: L2 };
export const MUNDOS = { moderno: 'Moderno', medieval: 'Medieval' };
/* Fichas antigas guardavam perícias por índice da lista antiga: [nome no moderno, nome no medieval] */
const LEG = [["ACROBACIA"], ["MÁQUINAS", "ANIMAIS"], ["APTIDÃO"], ["ATLETISMO"], ["OCULTISMO", "BRUXARIA"], ["PERSUASÃO", "CARISMA"], ["CRIME"], ["DISCIPLINA"], ["ENGANAÇÃO"], ["FURTIVIDADE"], ["PESQUISA", "INSPECIONAR"], ["INTIMIDAÇÃO", "INTIMIDAR"], ["INTUIÇÃO"], ["LUTA"], ["MEDICINA"], ["TECNOLOGIA", "OFÍCIO"], ["PERCEPÇÃO"], ["PONTARIA"], ["SOBREVIVÊNCIA"], ["VIGOR"]];
export const PERF = { Executor: "Você age primeiro e pensa depois. E, se não der certo da primeira vez, tenta de novo até conseguir, vencendo pela força de sua perseverança.", Analista: "Você observa, entende e se prepara, para só então agir. Pode demorar para tomar uma atitude, mas quando o faz, é com a maior precisão possível.", Vigilante: "Você está sempre atento aos arredores, aproveitando as brechas perfeitas para agir primeiro. Se adapta a imprevistos e não tem problemas em tomar decisões sob pressão." };
export const CAT = {
  hab: [["Reflexos rápidos", "Uma vez por cena, age antes de todos."], ["Olhar clínico", "+1 passo em Percepção ao examinar um alvo."], ["Voz firme", "Pode acalmar aliados em pânico."]],
  equip: [["Pistola leve", "Dano curto, fácil de ocultar."], ["Faca de combate", "Dano corpo a corpo discreto."], ["Colete reforçado", "Reduz o dano recebido."]],
  itens: [["Kit de primeiros socorros", "Estabiliza um aliado ferido."], ["Lanterna", "Ilumina ambientes escuros."], ["Cordas e ganchos", "Auxilia escaladas."]]
};
export const TABN = { hab: "Habilidades", equip: "Equipamentos", itens: "Itens", outros: "Outros" };
export const blank = () => ({ name: "Novo Agente", perfil: "Executor", ocup: "", nivel: 1, mundo: "moderno", a: { f: 1, m: 1, e: 1 }, pv: 6, pvMax: 6, pd: 6, pdMax: 6, img: {}, crop: { z: 1, x: 0, y: 0 }, sk: {}, rel: [], hab: [], equip: [], itens: [], outros: "", campaign: null, obs: { useCampaign: true, layout: null } });
/* Completa campos que fichas antigas não têm e converte as perícias antigas (por índice) para o formato novo (por nome). */
export function migrate(s) {
  const b = blank();
  s.a = { ...b.a, ...(s.a || {}) }; s.img = s.img || {}; s.rel = s.rel || []; s.mundo = SKILLS[s.mundo] ? s.mundo : 'moderno';
  s.crop = { ...b.crop, ...(s.crop || {}) }; s.obs = { ...b.obs, ...(s.obs || {}) };
  const ks = Object.keys(s.sk || {});
  if (ks.length && ks.every(k => /^\d+$/.test(k))) { const n = {}; ks.forEach(k => (LEG[+k] || []).forEach(nm => n[nm] = s.sk[k])); s.sk = n } else s.sk = s.sk || {};
  return s
}
export const faceKey = s => {
  const i = s.img || {}; if (!i.main) return '';
  if (s.pv <= 0 && i.morrendo) return 'morrendo'; if (s.pv <= s.pvMax / 2 && i.ferido) return 'ferido';
  if (s.pd <= 0 && i.exausto) return 'exausto'; if (s.pd <= s.pdMax / 2 && i.cansado) return 'cansado'; return 'main'
};
export const face = s => { const k = faceKey(s); return k ? s.img[k] : '' };
/* Todas as imagens de estado usam o MESMO enquadramento (s.crop). x e y são frações do tamanho do quadro. */
export const cropCss = c => { c = c || {}; return `transform:translate(${+((c.x || 0) * 100).toFixed(3)}%,${+((c.y || 0) * 100).toFixed(3)}%) scale(${c.z || 1})` };
export const picHTML = (src, c) => src ? `<img src="${esc(src)}" alt="" draggable=false style="${cropCss(c)}">` : '';
export const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(() => t.style.display = 'none', bad ? 6000 : 2000) };
export const modal = h => { $('#modal').innerHTML = `<div class=mb>${h}</div>`; $('#modal').classList.add('on') };
export const close = () => $('#modal').classList.remove('on');
export const clip = (s, m) => navigator.clipboard.writeText(s).then(() => toast(m));
export const err = e => e?.code === 'permission-denied' || /permissions/i.test(e?.message || '') ? 'Sem permissão no Firestore. Publique as regras do arquivo firestore.rules.' : (e?.code || e?.message || String(e));
export const guard = cb => onAuthStateChanged(auth, u => { if (u) cb(u); else { sessionStorage.next = location.href; location.href = 'index.html' } });
const NAV = [['painel.html', 'Painel'], ['fichas.html', 'Fichas'], ['ficha-nova.html', 'Nova ficha'], ['campanhas.html', 'Campanhas'], ['campanha-nova.html', 'Nova campanha']];
export function page(title, html, u) {
  initDice(); const here = location.pathname.split('/').pop();
  $('#app').innerHTML = `<div class=wrap><div class=bar0><nav class=row>${NAV.map(([h, t]) => `<a href=${h} class="${h == here ? 'on' : ''}">${t}</a>`).join('')}</nav><div class=row><span class=mt>${esc(u?.email || '')}</span>${u ? '<button class=g data-a=out>Sair</button>' : ''}</div></div><h2 style="margin-bottom:12px">${title}</h2>${html}</div>`
}
export function act(map) {
  const m = { close, out: () => signOut(auth).then(() => location.href = 'index.html'), ...map };
  document.addEventListener('click', async e => {
    if (e.target.id === 'modal') m.close(); const t = e.target.closest('[data-a]'); if (!t || !m[t.dataset.a]) return;
    try { await m[t.dataset.a](t, e) } catch (x) { toast(err(x), 1) }
  })
}
/* imagens */
/* Carrega uma imagem. Se o servidor não permitir CORS, tenta sem CORS (só dá para exibir, não para reduzir). */
export const load = src => new Promise((ok, no) => {
  const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i);
  i.onerror = () => { if (/^data:/.test(src)) return no(); const j = new Image(); j.onload = () => ok(j); j.onerror = no; j.src = src }; i.src = src
});
export const rd = f => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f) });
export function crop(im, sz, z = 1, ox = 0, oy = 0, cv) {
  const c = cv || document.createElement('canvas'); c.width = c.height = sz; const m = Math.min(im.width, im.height) / z;
  c.getContext('2d').drawImage(im, (im.width - m) / 2 * (1 + ox), (im.height - m) / 2 * (1 + oy), m, m, 0, 0, sz, sz); return c
}
export const jpg = c => c.toDataURL('image/jpeg', .82);
export async function small(src) { try { return jpg(crop(await load(src), 256)) } catch { return src } }
/* Reduz a imagem inteira (sem cortar) para caber no Firestore. Se não der (CORS), guarda o link original. */
export function shrink(im, src, max = 512) {
  try {
    const k = Math.min(1, max / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height)), w = Math.round((im.naturalWidth || im.width) * k), h = Math.round((im.naturalHeight || im.height) * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); return c.toDataURL('image/jpeg', .85)
  } catch { return src }
}
