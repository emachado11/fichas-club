import { auth, onAuthStateChanged, signOut } from './firebase.js';
import { initDice } from './dice.js';
import { ensureProfile } from './profile.js';
import { mountHeader } from './header.js';
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
  hab: [{ name: "Reflexos rápidos", description: "Uma vez por cena, age antes de todos." }, { name: "Olhar clínico", description: "+1 passo em Percepção ao examinar um alvo." }, { name: "Voz firme", description: "Pode acalmar aliados em pânico." }],
  equip: [{ name: "Pistola leve", description: "Dano curto, fácil de ocultar." }, { name: "Faca de combate", description: "Dano corpo a corpo discreto." }, { name: "Colete reforçado", description: "Reduz o dano recebido." }],
  itens: [{ name: "Kit de primeiros socorros", description: "Estabiliza um aliado ferido." }, { name: "Lanterna", description: "Ilumina ambientes escuros." }, { name: "Cordas e ganchos", description: "Auxilia escaladas." }]
};
export const TABN = { hab: "Habilidades", equip: "Equipamentos", itens: "Itens", outros: "Outros" };
export const blank = () => ({ name: "Novo Agente", perfil: "Executor", ocup: "", nivel: 1, mundo: "moderno", a: { f: 1, m: 1, e: 1 }, pv: 6, pvMax: 6, pd: 6, pdMax: 6, img: {}, crop: { z: 1, x: 0, y: 0 }, sk: {}, rel: [], hab: [], equip: [], itens: [], outros: "", campaign: null, obs: { useCampaign: true, layout: null } });
/* Completa campos que fichas antigas não têm e converte as perícias antigas (por índice) para o formato novo (por nome). */
export function migrate(s) {
  const b = blank();
  s.a = { ...b.a, ...(s.a || {}) }; s.img = s.img || {}; s.rel = s.rel || []; s.mundo = SKILLS[s.mundo] ? s.mundo : 'moderno';
  s.crop = { ...b.crop, ...(s.crop || {}) }; s.obs = { ...b.obs, ...(s.obs || {}) };
  for (const k of ['hab', 'equip', 'itens']) {
    s[k] = (Array.isArray(s[k]) ? s[k] : []).map(x => Array.isArray(x)
      ? { name: String(x[0] || ''), description: String(x[1] || '') }
      : x && typeof x === 'object'
        ? { name: String(x.name || ''), description: String(x.description || '') }
        : { name: String(x || ''), description: '' })
  }
  const ks = Object.keys(s.sk || {});
  if (ks.length && ks.every(k => /^\d+$/.test(k))) { const n = {}; ks.forEach(k => (LEG[+k] || []).forEach(nm => n[nm] = s.sk[k])); s.sk = n } else s.sk = s.sk || {};
  return s
}
/* Prioridade das imagens de estado: Morrendo > Ferido > Exausto > Cansado. Vale o primeiro estado que se aplica E tem imagem; senão, a principal. */
export const FACE_ORDER = [['morrendo', s => s.pv <= 0], ['ferido', s => s.pv <= s.pvMax / 2], ['exausto', s => s.pd <= 0], ['cansado', s => s.pd <= s.pdMax / 2]];
export const faceKey = s => {
  const i = s.img || {}; if (!i.main) return '';
  for (const [k, cond] of FACE_ORDER) if (i[k] && cond(s)) return k;
  return 'main'
};
export const face = s => { const k = faceKey(s); return k ? s.img[k] : '' };
/* Todas as imagens de estado usam o MESMO enquadramento (s.crop). x e y são frações do tamanho do quadro. */
export const cropCss = c => { c = c || {}; return `transform:translate(${+((c.x || 0) * 100).toFixed(3)}%,${+((c.y || 0) * 100).toFixed(3)}%) scale(${c.z || 1})` };
export const picHTML = (src, c) => src ? `<img src="${esc(src)}" alt="" draggable=false style="${cropCss(c)}">` : '';
export const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(() => t.style.display = 'none', bad ? 6000 : 2000) };
export const modal = h => { $('#modal').innerHTML = `<div class=mb>${h}</div>`; $('#modal').classList.add('on') };
export const close = () => $('#modal').classList.remove('on');
export const clip = (s, m) => navigator.clipboard.writeText(s).then(() => toast(m));
export const err = e => e?.code === 'permission-denied' || /permissions/i.test(e?.message || '') ? 'O Firestore negou a permissão para esta ação.' : (e?.code || e?.message || String(e));
export const guard = cb => onAuthStateChanged(auth, async u => { if (u) { try { await ensureProfile(u) } catch { } cb(u) } else { sessionStorage.next = location.href; location.href = 'index.html' } });
export function page(title, html, u) {
  initDice(); mountHeader(u);
  $('#app').innerHTML = `<div class=wrap>${title ? `<h2 class=pt>${title}</h2>` : ''}${html}</div>`
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
/* Tem pixels transparentes? (amostra reduzida) */
function hasAlpha(c) {
  try { const t = document.createElement('canvas'); t.width = t.height = 48; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 48, 48); const d = x.getImageData(0, 0, 48, 48).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true } catch { }
  return false
}
const WEBP = (() => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp') } catch { return false } })();
/* Codifica o canvas: JPEG se for opaco; WebP/PNG se tiver transparência. */
export const jpg = (c, q = .82) => {
  if (!hasAlpha(c)) return c.toDataURL('image/jpeg', q);
  if (WEBP) {
    const webp = c.toDataURL('image/webp', q);
    if (webp.startsWith('data:image/webp')) return webp
  }
  return c.toDataURL('image/png')
};
export async function small(src) { try { return jpg(crop(await load(src), 256)) } catch { return src } }
/* Reduz a imagem inteira (sem cortar) para caber no Firestore. Se não der (CORS), guarda o link original. */
export function shrink(im, src, max = 512) {
  try {
    const W0 = im.naturalWidth || im.width, H0 = im.naturalHeight || im.height;
    const draw = m => { const k = Math.min(1, m / Math.max(W0, H0)), c = document.createElement('canvas'); c.width = Math.round(W0 * k); c.height = Math.round(H0 * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c };
    let c = draw(max), out = jpg(c, .85);
    if (out.startsWith('data:image/png') && max > 384) out = jpg(draw(384), .85);   // PNG é pesado: reduz mais para caber no limite de 1 MB da ficha
    return out
  } catch { return src }
}
