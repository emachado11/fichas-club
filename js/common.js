import { auth, onAuthStateChanged, signOut, scope } from './firebase.js';
import { ensureProfile } from './profile.js?v=4';
import { mountHeader, earlyHeader, syncNav } from './header.js?v=4';
/* Listeners da página atual: são removidos ao trocar de página sem recarregar. */
const _off = [];
export const track = (t, type, fn, o) => { t.addEventListener(type, fn, o); _off.push(() => t.removeEventListener(type, fn, o)) };
export const $ = s => document.querySelector(s);
export const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const qs = k => new URLSearchParams(location.search).get(k);
const AUTOCOMPLETE_FIELDS = 'input:not([type]),input[type=text],input[type=search],input[type=email],input[type=url],input[type=tel],input[type=number],textarea';
const disableAutocomplete = node => {
  if (node.nodeType !== 1) return;
  const off = field => { if (!field.hasAttribute('autocomplete')) field.setAttribute('autocomplete', 'off') };   // respeita campos que pedem autopreenchimento (login)
  if (node.matches(AUTOCOMPLETE_FIELDS)) off(node);
  node.querySelectorAll(AUTOCOMPLETE_FIELDS).forEach(off)
};
disableAutocomplete(document.documentElement);
new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(disableAutocomplete)))
  .observe(document.documentElement, { childList: true, subtree: true });
const THEME_BACKGROUNDS = {
  entidade: 'img/Padrao.mp4',
  conchas: 'img/bg_areia.mp4',
  halloween25: 'img/bg_halloween.mp4',
  farol: 'img/bg_farol.mp4'
};
function syncThemeBackground() {
  const palette = document.documentElement.dataset.palette;
  const src = THEME_BACKGROUNDS[palette];
  const active = src && !document.body.classList.contains('obs');
  let video = document.getElementById('special-theme-background');
  document.body.classList.toggle('theme-video-active', !!active);
  if (!active) { video?.remove(); return }
  if (video?.dataset.palette === palette) return;
  video?.remove();
  video = document.createElement('video');
  video.id = 'special-theme-background';
  video.dataset.palette = palette;
  video.src = src;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.controls = false;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('muted', '');
  video.tabIndex = -1;
  document.body.prepend(video);
  video.play().catch(error => console.warn(`Não foi possível reproduzir o vídeo do tema ${palette}.`, error))
}
new MutationObserver(syncThemeBackground).observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette'] });
syncThemeBackground();
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
  hab: [
    { name: "ÍMPETO", description: "Você possui uma barra de ímpeto, com cinco espaços. Sempre que faz um teste e falha, você preenche um espaço na barra de ímpeto. Como uma ação livre, você pode gastar espaços da barra de ímpeto para receber benefícios.\n1 espaço. Você recebe +d4 em um teste.\n3 espaços. Você aumenta um atributo em um passo até o fim da cena.\n5 espaços. Em cenas de conflito, você faz uma ação extra.\nNo fim da cena, sua barra de ímpeto esvazia." },
    { name: "ANÁLISE", description: "Você pode gastar uma ação para receber 2 marcadores de análise.\nQuando faz um teste, pode gastar quantos marcadores quiser após rolar os dados. Para cada marcador gasto, pode mudar o resultado de um dado em +1 ou –1 (até o máximo do dado).\nVocê pode acumular no máximo 4 marcadores de análise e, no fim da cena, perde quaisquer marcadores não usados." },
    { name: "PRONTIDÃO", description: "Uma vez por rodada, quando você ou outro ser em alcance curto faz um teste, você pode gastar 2 PD para rolar novamente, ou para fazer o outro ser rolar novamente, um dos dados do teste cujo resultado não tenha sido 1.\nAlém disso, em combates, você pode fazer sua ação na fase dela ou em fases posteriores, e após qualquer ação daquela fase já ter sido rolada." },
    { name: "FOCO MENTAL", description: "Quando faz um teste mental, você pode gastar 2 PD para receber + 1d4 no teste." },
    { name: "CONHECIMENTO TÉCNICO", description: "Você possui uma perícia mental aumentada para 1d6 (este aumento já está contabilizado na ficha)." },
    { name: "MENTORIA", description: "Quando ajuda outro personagem, você pode fazer um teste da perícia que usou para ajudar contra DT 7. Se o personagem ajudado pode substituir um dos dados rolados por ele pela sua rolagem mais alta." },
    { name: "FOCO EMOCIONAL", description: "Quando faz um teste emocional, você pode gastar 2 PD para receber +1d4 no teste." },
    { name: "ESFORÇO E SUOR", description: "Você possui uma perícia física aumentada para 1d6 (já contabilizado na ficha)." },
    { name: "TÉCNICA MEDICINAL", description: "Sempre que você usa um efeito que cura pontos de vida, seu efeito cura +1 PV (ou +1 PV por dado)." },
    { name: "VARREDURA AMPLA", description: "Quando investiga um ponto de interesse, você pode escolher duas perícias e receber informações de ambas." },
    { name: "ESTOICO", description: "Você recebe +1d6 em testes de trauma e, na primeira vez em cada cena que faz um teste de trauma, recupera 9 PD." },
    { name: "PARA BELLUM", description: "Você recebe proficiência com armas de fogo e seu dano com essas armas aumenta em +2." },
    { name: "INCANSÁVEL", description: "Uma por cena de conflito, você pode gastar 5 PV para fazer uma ação extra." },
    { name: "LINHA DE TIRO", description: "Você recebe proficiência com armas de fogo e, quando faz um teste de ataque com essas armas, pode gastar 4 PD para receber +1d10 no teste." },
    { name: "AMOR PELA DESCOBERTA", description: "Quando examina um ponto de interesse e recebe uma informação nova, você recupera 1 PD." },
    { name: "OLHAR INFALÍVEL", description: "Quando faz um teste de examinar, você pode gastar 2 PD para rolar novamente um dos dados do teste." },
    { name: "LEITURA DE COMBATE", description: "Em combate, sempre que você gastar uma ação para se defender, você recebe um marcador de análise." },
    { name: "SEGREDO DO AÇO", description: "Você sabe usar equipamentos marciais. Além disso, se estiver vestindo um item que forneça pontos de armadura, o item fornece 1 ponto de armadura adicional." },
    { name: "ESQUIVA", description: "Uma vez por rodada, quando sofre um ataque, pode fazer um teste de Acrobacia (d8+d4) oposto ao teste de ataque como uma ação livre. Se vencer, evita o ataque." },
    { name: "ESPECTRO, O LOBO", description: "Você possui um parceiro lobo que fornece +d6 em testes de ataque corpo a corpo. Porém, se o dado do lobo rolar 1, ele terá se machucado e não poderá mais ajudá-lo pelo resto da cena." },
    { name: "ARSENAL DE HERBORISTA", description: "Você possui uma pequena bolsa contendo preparados medicinais feitos com ervas, óleos e mel. Para usar o item, escolha um alvo e gaste uma ação. Cada item é de uso único.\n- Tônico de urtiga-feroz. Uma mistura viscosa de sabor amargo, capaz de fortalecer quem a consome. O alvo recebe aumento de passo no atributo Físico por uma cena.\n- Bálsamo de confrei. Uma pasta grossa e mal-cheirosa feita para passar nos ferimentos. O alvo recupera 2d4PV (se for outro ser, ele precisa ficar parado nesta rodada).\n- Pote de vespa. Um pote quebradiço contendo vespas furiosas. Faça um teste de Sobrevivência para fazer um ataque à distância, com dano RA+1. Se o alvo sobreviver, perde sua próxima ação espantando as vespas." },
    { name: "CURANDEIRO", description: "Você pode gastar uma ação e 2 PD para curar um aliado. Faça um teste de Medicina (DT 7). Se passar, você cura PV do aliado iguais à RA do teste. Você só pode usar este poder em um mesmo alvo uma vez por cena." },
    { name: "ÍMPETO FERVILHANTE", description: "No início de cada cena, você preenche um espaço de sua barra de ímpeto." },
    { name: "ANTECIPAÇÃO TÁTICA", description: "No início de qualquer combate, você pode gastar 2 PD. Se fizer isso, ganha uma rodada na qual pode agir antes dos demais personagens e NPCs." },
    { name: "SORRATEIRO", description: "Quando faz um teste usando Crime ou Furtividade, você pode gastar 3 PD para receber +d8 no teste." },
    { name: "GUARDIÃ", description: "Você recebe +1 PV por patamar (já anotado na ficha) e, uma vez por rodada, quando um aliado em alcance curto sofre um ataque, pode gastar 2 PD para se tornar o alvo deste ataque." },
    { name: "INSTINTO DE SOBREVIVÊNCIA", description: "Se você estiver com metade ou menos de seus PV máximos, recebe um aumento de passo em todos os testes." },
    { name: "HERANÇA", description: "Sua categoria de riqueza aumenta em 1*.\n*As regras para compra de itens serão apresentadas futuramente. Na prática, por hora isso significa que você começa com itens melhores (veja em “Equipamento”)" },
    { name: "PLANO ESTRATÉGICO", description: "Você pode gastar uma ação e 3 PD para elaborar um plano de ação. Faça um teste de Aptidão (Guerra) contra DT 7. Se passar, você e os seus aliados recebem d6, +d6 para cada 3 pontos pelos quais o resultado do teste exceder a DT, que podem gastar em quaisquer testes até o fim da cena." },
    { name: "CASCA GROSSA", description: "Quando você sofre dano físico, ele pode gastar 3 PD para reduzir esse dano em 5." },
    { name: "INQUEBRÁVEL", description: "Você recebe +1d8 em testes de lesão ou trauma." },
    { name: "ARREMESSAR ABELHAS", description: "Você consegue arremessar um jarro de abelhas contra um alvo que sofre dano das picadas e pode perder sua próxima ação tentando se livrar delas." },
    { name: "DEDICADA", description: "Você é um pouco mais apto na perícia Pontaria." },
    { name: "FLECHAS FLAMEJANTES", description: "Você pode gastar 2 PD para incendiar as suas flechas, fazendo elas causarem dano de fogo." },
    { name: "CHAMADO", description: "Uma vez por cena, você pode gastar 2 PD para sentir um chamado misterioso." },
    { name: "RESOLUTO", description: "Você é firme em seus propósitos, e por isso, recebe +6 PD." }
  ],
  equip: [{ name: "Pistola leve", description: "Dano curto, fácil de ocultar." }, { name: "Faca de combate", description: "Dano corpo a corpo discreto." }, { name: "Colete reforçado", description: "Reduz o dano recebido." }],
  itens: [{ name: "Kit de primeiros socorros", description: "Estabiliza um aliado ferido." }, { name: "Lanterna", description: "Ilumina ambientes escuros." }, { name: "Cordas e ganchos", description: "Auxilia escaladas." }]
};
export const TABN = { hab: "Habilidades", equip: "Equipamentos", itens: "Itens", outros: "Outros" };
export const blank = () => ({ name: "Novo Agente", perfil: "Executor", ocup: "", nivel: 1, mundo: "moderno", a: { f: 1, m: 1, e: 1 }, pv: 6, pvMax: 6, pd: 6, pdMax: 6, img: {}, crop: { z: 1, x: 0, y: 0 }, sk: {}, skillInfo: {}, rel: [], hab: [], equip: [], itens: [], outros: "", campaign: null, obs: { useCampaign: true, layout: null } });
/* Completa campos que fichas antigas não têm e converte as perícias antigas (por índice) para o formato novo (por nome). */
export function migrate(s) {
  const b = blank();
  s.a = { ...b.a, ...(s.a || {}) }; s.img = s.img || {}; s.rel = s.rel || []; s.mundo = SKILLS[s.mundo] ? s.mundo : 'moderno';
  s.skillInfo = s.skillInfo || {};
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
export const cropCss = (c, w, h) => {
  c = c || {};
  const unit = w && h ? Math.min(w, h) : 1;
  const x = (c.x || 0) * (w && h ? unit / w : 1), y = (c.y || 0) * (w && h ? unit / h : 1);
  return `transform:translate(${+(x * 100).toFixed(3)}%,${+(y * 100).toFixed(3)}%) scale(${c.z || 1})`
};
export const picHTML = (src, c) => src ? `<img src="${esc(src)}" alt="" draggable=false style="${cropCss(c)}">` : '';
export const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(t._t); t._t = setTimeout(() => t.style.display = 'none', bad ? 6000 : 2000) };
export const modal = h => { $('#modal').innerHTML = `<div class=mb>${h}</div>`; $('#modal').classList.add('on') };
export const close = () => $('#modal').classList.remove('on');
export const clip = (s, m) => navigator.clipboard.writeText(s).then(() => toast(m));
export const err = e => e?.code === 'permission-denied' || /permissions/i.test(e?.message || '') ? 'O Firestore negou a permissão para esta ação.' : (e?.code || e?.message || String(e));
export const guard = cb => { const un = onAuthStateChanged(auth, async u => {
  if (u) { try { localStorage.setItem('club-in', u.uid) } catch { } try { await ensureProfile(u) } catch { } cb(u) }
  else { try { localStorage.removeItem('club-in') } catch { } sessionStorage.next = location.href; location.href = 'index.html' }
}); _off.push(un); return un };
export function page(title, html, u) {
  document.title = title ? `${title} | The Club` : 'The Club';
  mountHeader(u);
  $('#app').innerHTML = `<div class=wrap>${title ? `<h2 class=pt>${title}</h2>` : ''}${html}</div>`
}
export function act(map) {
  const m = { close, out: () => signOut(auth).then(() => { try { localStorage.removeItem('club-in') } catch { } location.href = 'index.html' }), ...map };
  track(document, 'click', async e => {
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
/* Páginas internas: desenha o cabeçalho na hora. */
if (document.getElementById('app') && !/(^|\/)(index|obs|portrait|portrait-editor)(\.html)?$|\/$/.test(location.pathname)) earlyHeader();

/* ===== Troca de página sem recarregar: o cabeçalho (e tudo fora do conteúdo) fica no lugar =====
   Usa a Navigation API (Chrome/Edge/Safari recentes). Em navegadores sem ela, as páginas carregam normalmente. */
const ROUTES = new Set(['painel', 'fichas', 'ficha', 'ficha-nova', 'campanhas', 'campanha', 'campanha-nova', 'convite', 'perfil']);
const routeOf = u => { const n = (u.pathname.split('/').pop() || '').replace(/\.html$/, ''); return ROUTES.has(n) ? n : null };
function cleanupPage() {
  _off.splice(0).forEach(f => { try { f() } catch { } });
  scope.unsubs.splice(0).forEach(f => { try { f() } catch { } });
  document.querySelectorAll('.ctx-menu').forEach(e => e.remove());
  close(); delete document.body.dataset.p; const t = $('#toast'); if (t) t.style.display = 'none'
}
let hard = false, hops = 0;
if (window.navigation && document.getElementById('app')) {
  navigation.addEventListener('navigate', e => {
    if (hard || !e.canIntercept || e.hashChange || e.downloadRequest || e.formData) return;
    const to = new URL(e.destination.url); if (to.origin !== location.origin) return;
    const from = routeOf(location), next = routeOf(to); if (!from || !next) return;   // só entre as páginas com cabeçalho
    e.intercept({
      scroll: 'manual',
      async handler() {
        try {
          const f = window.flushSheet; window.flushSheet = null; await f?.();   // grava edições pendentes da ficha
          cleanupPage(); syncNav(); scrollTo(0, 0);
          $('#app').innerHTML = '<div class=wrap><div class=skel-h style="min-height:160px"></div></div>';
          await import(`./pages/${next}.js?r=${++hops}`)
        } catch (x) { console.warn('Navegação suave falhou; carregando a página normalmente.', x); hard = true; location.href = to.href }
      }
    })
  })
}
