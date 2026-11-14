/* Portrait de OBS: modelo do layout + renderizador (usado pelo editor e pela página do OBS). */
import { faceKey, cropCss } from './common.js';

export const FONTS = ['Cinzel', 'Crimson Pro', 'Orbitron', 'Rajdhani', 'Bebas Neue', 'Oswald', 'Playfair Display', 'Special Elite', 'Share Tech Mono', 'VT323', 'Press Start 2P', 'Metal Mania', 'Creepster', 'IM Fell English', 'Inter'];
const ONE = ['Bebas Neue', 'Special Elite', 'VT323', 'Press Start 2P', 'Metal Mania', 'Creepster', 'IM Fell English']; // fontes de um único peso
export function loadFonts() {
    if (document.getElementById('pg-fonts')) return;
    const l = document.createElement('link'); l.id = 'pg-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + FONTS.map(f => 'family=' + f.replace(/ /g, '+') + (ONE.includes(f) ? '' : ':wght@400;500;700')).join('&') + '&display=swap';
    document.head.append(l)
}

/* ---------- modelo ---------- */
const fx = () => ({
    glow: { on: false, color: '#ff3b3b', blur: 12, str: 2, pulse: false, speed: 2 },
    chroma: { on: false, off: 2, c1: '#ff0040', c2: '#00e5ff' },
    glitch: { on: false, int: 6, speed: 3 },
    shadow: { on: false, color: '#000000', x: 0, y: 3, blur: 6 },
    scan: { on: false, op: .25, gap: 3 },
    flicker: { on: false, int: .4, speed: 4 },
    hit: { on: false },
    hitpd: { on: false }
});
const txt = (o = {}) => ({ font: 'Cinzel', size: 22, weight: 700, color: '#ffffff', align: 'left', ls: 1, upper: false, sw: 0, sc: '#000000', ...o });
const base = (label, x, y, w, h, z, o = {}) => ({ label, on: true, x, y, w, h, rot: 0, opacity: 1, z, ...o, fx: fx() });
const bar = (label, y, fill, fmt, z = 4) => base(label, 172, y, 334, 34, z, {
    ...txt({ size: 17, align: 'center', ls: .5 }), mode: 'both', dir: 'ltr', seg: 0, gap: 3, fmt, fill, fill2: '', track: '#000000', talpha: .55, radius: 8, bw: 2, bc: '#000000',
    low: true, lowPct: 30, lowColor: '#ff2a2a'
});
/* Escala um layout por k (posição, tamanho, fontes, bordas, efeitos) e centraliza na tela W×H. Usado no padrão e em "Converter para 2K". */
export function upscale(src, k, W, H) {
    const l = JSON.parse(JSON.stringify(src)), ox = Math.round((W - l.w * k) / 2), oy = Math.round((H - l.h * k) / 2);
    for (const e of Object.values(l.el)) {
        ['x', 'y'].forEach(a => e[a] = Math.round(e[a] * k) + (a == 'x' ? ox : oy));
        ['w', 'h', 'size', 'sw', 'radius', 'bw', 'gap'].forEach(a => { if (typeof e[a] == 'number') e[a] = +(e[a] * k).toFixed(1) });
        if (typeof e.ls == 'number') e.ls = +(e.ls * k).toFixed(1);
        const f = e.fx; if (!f) continue;
        f.glow.blur = Math.round(f.glow.blur * k); f.chroma.off *= k; f.glitch.int = Math.round(f.glitch.int * k);
        f.shadow.x *= k; f.shadow.y *= k; f.shadow.blur *= k; f.scan.gap = Math.round(f.scan.gap * k)
    }
    l.w = W; l.h = H; return l
}
export const SCREEN = { w: 2560, h: 1440 };      // tela "2K" padrão: sobra espaço em volta para os efeitos não serem cortados
export const PORTRAIT = { w: 1040, h: 340 };     // tamanho do portrait dentro da tela
const SMALL = () => ({
    v: 1, w: 520, h: 170,
    el: {
        bg: base('Painel de fundo', 0, 0, 520, 170, 1, { color: '#0b0b10', alpha: .6, radius: 18, bw: 2, bc: '#b4472b' }),
        portrait: base('Foto', 14, 14, 142, 142, 3, { shape: 'circle', radius: 16, bw: 4, bc: '#ffffff', bgOn: false, bgc: '#111111', clip: true }),
        name: base('Nome', 172, 16, 334, 36, 4, { ...txt({ size: 26 }), maxc: 20, ell: true }),
        pv: bar('Pontos de Vida', 62, '#c0392b', 'PV {cur}/{max}'),
        pd: bar('Pontos de Determinação', 108, '#2e86c1', 'PD {cur}')
    }
});
export const DEFAULT = () => ({ ...upscale(SMALL(), PORTRAIT.w / 520, SCREEN.w, SCREEN.h), v: 2 });
const isO = v => v && typeof v === 'object' && !Array.isArray(v);
const merge = (b, o) => { const r = { ...b }; if (!isO(o)) return r; for (const k in o) r[k] = isO(b[k]) && isO(o[k]) ? merge(b[k], o[k]) : o[k] === undefined ? b[k] : o[k]; return r };
export const mergeLayout = l => merge(DEFAULT(), l || {});
export const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- esquema do inspetor ---------- */
const N = (k, l, min, max, step = 1) => ({ k, l, t: 'num', min, max, step }), R = (k, l, min, max, step) => ({ k, l, t: 'range', min, max, step });
const C = (k, l) => ({ k, l, t: 'color' }), B = (k, l) => ({ k, l, t: 'bool' }), T = (k, l) => ({ k, l, t: 'text' }), S = (k, l, o) => ({ k, l, t: 'sel', o }), F = (k, l) => ({ k, l, t: 'font' });
const POS = ['Posição e tamanho', [N('x', 'X', -3000, 5000), N('y', 'Y', -3000, 5000), N('w', 'Largura', 1, 5000), N('h', 'Altura', 1, 5000), N('rot', 'Rotação (°)', -180, 180), N('z', 'Camada (z)', 0, 99), R('opacity', 'Opacidade', 0, 1, .01)]];
const TXT = ['Texto', [F('font', 'Fonte'), N('size', 'Tamanho (px)', 6, 400), S('weight', 'Peso', [[400, 'Normal'], [500, 'Médio'], [700, 'Negrito']]), C('color', 'Cor'), S('align', 'Alinhamento', [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]), N('ls', 'Espaço entre letras', -5, 40, .5), B('upper', 'MAIÚSCULAS'), N('sw', 'Contorno (px)', 0, 20, .5), C('sc', 'Cor do contorno')]];
const FX = [
    ['Efeito: brilho (glow)', [B('fx.glow.on', 'Ativar'), C('fx.glow.color', 'Cor'), N('fx.glow.blur', 'Desfoque (px)', 0, 80), N('fx.glow.str', 'Intensidade', 1, 5), B('fx.glow.pulse', 'Pulsar'), N('fx.glow.speed', 'Velocidade do pulso (s)', .3, 10, .1)]],
    ['Efeito: aberração cromática', [B('fx.chroma.on', 'Ativar'), N('fx.chroma.off', 'Deslocamento (px)', 0, 20, .5), C('fx.chroma.c1', 'Cor A'), C('fx.chroma.c2', 'Cor B')]],
    ['Efeito: glitch', [B('fx.glitch.on', 'Ativar'), N('fx.glitch.int', 'Intensidade (px)', 1, 60), N('fx.glitch.speed', 'Ciclo (s)', .5, 12, .1)]],
    ['Efeito: sombra', [B('fx.shadow.on', 'Ativar'), C('fx.shadow.color', 'Cor'), N('fx.shadow.x', 'X', -50, 50), N('fx.shadow.y', 'Y', -50, 50), N('fx.shadow.blur', 'Desfoque', 0, 80)]],
    ['Efeito: linhas de varredura', [B('fx.scan.on', 'Ativar'), R('fx.scan.op', 'Opacidade', 0, 1, .01), N('fx.scan.gap', 'Espaçamento (px)', 2, 20)]],
    ['Efeito: cintilar', [B('fx.flicker.on', 'Ativar'), R('fx.flicker.int', 'Intensidade', 0, 1, .01), N('fx.flicker.speed', 'Ciclo (s)', .5, 12, .1)]],
    ['Efeito: tremer ao perder PV', [B('fx.hit.on', 'Ativar')]],
    ['Efeito: tremer ao perder PD', [B('fx.hitpd.on', 'Ativar')]]
];
const BAR = ['Barra', [S('mode', 'Exibir', [['both', 'Barra + texto'], ['bar', 'Só barra'], ['text', 'Só texto']]), T('fmt', 'Texto ({cur} {max} {pct})'), S('dir', 'Direção', [['ltr', 'Esquerda → direita'], ['rtl', 'Direita → esquerda'], ['btt', 'Baixo → cima'], ['ttb', 'Cima → baixo']]), C('fill', 'Cor do preenchimento'), T('fill2', 'Cor final do degradê (opcional, ex. #ff0)'), C('track', 'Cor do fundo'), R('talpha', 'Opacidade do fundo', 0, 1, .01), N('radius', 'Arredondamento', 0, 200), N('bw', 'Borda (px)', 0, 30), C('bc', 'Cor da borda'), N('seg', 'Segmentos (0 = contínua)', 0, 60), N('gap', 'Espaço entre segmentos', 0, 20), B('low', 'Mudar cor com pouca vida'), N('lowPct', 'Abaixo de (%)', 1, 100), C('lowColor', 'Cor de alerta')]];
export const SCHEMA = {
    bg: [POS, ['Painel', [C('color', 'Cor'), R('alpha', 'Opacidade da cor', 0, 1, .01), N('radius', 'Arredondamento', 0, 400), N('bw', 'Borda (px)', 0, 40), C('bc', 'Cor da borda')]], ...FX],
    portrait: [POS, ['Foto', [S('shape', 'Formato', [['circle', 'Círculo'], ['rounded', 'Arredondado'], ['square', 'Quadrado']]), N('radius', 'Arredondamento (px)', 0, 400), N('bw', 'Borda (px)', 0, 40), C('bc', 'Cor da borda'), B('bgOn', 'Fundo atrás da foto'), C('bgc', 'Cor do fundo'), B('clip', 'Recortar no formato')]], ...FX],
    name: [POS, ['Nome', [N('maxc', 'Limite de caracteres', 1, 64), B('ell', 'Colocar … ao cortar')]], TXT, ...FX],
    pv: [POS, BAR, TXT, ...FX], pd: [POS, BAR, TXT, ...FX]
};
export const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
export const setPath = (o, p, v) => { const ks = p.split('.'), l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v };

/* ---------- CSS dos efeitos ---------- */
const CSS = `.pg{position:relative;pointer-events:none}.pg *{box-sizing:border-box}
.pe{position:absolute}.fxw{position:absolute;inset:0}.pc{position:absolute;inset:0;overflow:hidden}
.pc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.pe .scan{position:absolute;inset:0;pointer-events:none}
.pe .trk{position:absolute;inset:0}.pe .fl{position:absolute}
.pe .tx{position:absolute;inset:0;display:flex;align-items:center;padding:0 .4em;white-space:nowrap;overflow:hidden}
.pe .tx.nm{padding:0}
@keyframes pg-glitch{0%,78%,100%{transform:none;clip-path:none}80%{transform:translate(calc(var(--gi)*-1),0);clip-path:inset(10% 0 55% 0)}82%{transform:translate(var(--gi),0);clip-path:inset(60% 0 8% 0)}84%{transform:translate(calc(var(--gi)*-.5),calc(var(--gi)*.3));clip-path:inset(30% 0 40% 0)}86%{transform:translate(calc(var(--gi)*.8),0);clip-path:inset(0 0 70% 0)}88%{transform:translate(calc(var(--gi)*-.7),0);clip-path:inset(45% 0 20% 0)}90%{transform:none;clip-path:none}}
@keyframes pg-flicker{0%,100%{opacity:1}91%{opacity:1}92%{opacity:calc(1 - var(--fi))}93%{opacity:1}95%{opacity:calc(1 - var(--fi)*.6)}96%{opacity:1}}
@keyframes pg-pulse{0%,100%{filter:var(--f0)}50%{filter:var(--f1)}}
@keyframes pg-hit{0%,100%{translate:0 0;filter:none}15%{translate:-7px 0;filter:drop-shadow(0 0 8px #f00) brightness(1.6)}35%{translate:6px 0}55%{translate:-4px 0;filter:drop-shadow(0 0 8px #f00) brightness(1.3)}75%{translate:3px 0}}
@keyframes pg-hitpd{0%,100%{translate:0 0;filter:none}15%{translate:-6px 0;filter:drop-shadow(0 0 8px #2e86ff) brightness(1.5)}35%{translate:5px 0}55%{translate:-4px 0;filter:drop-shadow(0 0 8px #2e86ff) brightness(1.3)}75%{translate:3px 0}}
.pe.hit{animation:pg-hit .6s steps(1,end) 1}.pe.hitpd{animation:pg-hitpd .6s steps(1,end) 1}`;
function css() { if (document.getElementById('pg-css')) return; const s = document.createElement('style'); s.id = 'pg-css'; s.textContent = CSS; document.head.append(s) }

const rgba = (h, a = 1) => { h = String(h || '#000').replace('#', ''); if (h.length == 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16) || 0; return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})` };

/* ---------- renderizador ---------- */
export function createPortrait(root, opt = {}) {
    css(); loadFonts();
    let L = mergeLayout(), D = null, N = {}, hitT = {};
    const place = (w, e) => { w.style.cssText = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;z-index:${e.z};opacity:${e.opacity};transform:rotate(${e.rot}deg)` };
    function effects(w, f) {
        const base = [];
        if (f.chroma.on) base.push(`drop-shadow(${-f.chroma.off}px 0 0 ${rgba(f.chroma.c1, .9)})`, `drop-shadow(${f.chroma.off}px 0 0 ${rgba(f.chroma.c2, .9)})`);
        if (f.shadow.on) base.push(`drop-shadow(${f.shadow.x}px ${f.shadow.y}px ${f.shadow.blur}px ${f.shadow.color})`);
        const gl = k => f.glow.on ? Array.from({ length: f.glow.str }, () => `drop-shadow(0 0 ${Math.round(f.glow.blur * k)}px ${f.glow.color})`) : [];
        const f0 = [...base, ...gl(f.glow.pulse ? .35 : 1)], f1 = [...base, ...gl(f.glow.pulse ? 1.5 : 1)], j = a => a.length ? a.join(' ') : 'none';
        w.style.setProperty('--f0', j(f0)); w.style.setProperty('--f1', j(f1)); w.style.filter = 'var(--f0)';
        const an = [];
        if (f.glow.on && f.glow.pulse) an.push(`pg-pulse ${f.glow.speed}s ease-in-out infinite`);
        if (f.glitch.on) { w.style.setProperty('--gi', f.glitch.int + 'px'); an.push(`pg-glitch ${f.glitch.speed}s steps(1,end) infinite`) }
        if (f.flicker.on) { w.style.setProperty('--fi', f.flicker.int); an.push(`pg-flicker ${f.flicker.speed}s steps(1,end) infinite`) }
        w.style.animation = an.join(',')
    }
    const font = (n, e) => { const s = n.style; s.fontFamily = `'${e.font}',sans-serif`; s.fontSize = e.size + 'px'; s.fontWeight = e.weight; s.color = e.color; s.letterSpacing = e.ls + 'px'; s.textTransform = e.upper ? 'uppercase' : 'none'; s.justifyContent = e.align == 'left' ? 'flex-start' : e.align == 'right' ? 'flex-end' : 'center'; s.textAlign = e.align; if (e.sw > 0) { s.webkitTextStroke = e.sw + 'px ' + e.sc; s.paintOrder = 'stroke fill' } };
    function build() {
        root.className = 'pg'; root.style.width = L.w + 'px'; root.style.height = L.h + 'px'; root.innerHTML = ''; N = {};
        Object.entries(L.el).filter(([, e]) => e.on).sort((a, b) => a[1].z - b[1].z).forEach(([id, e]) => {
            const w = document.createElement('div'); w.className = 'pe'; w.dataset.id = id; place(w, e);
            const x = document.createElement('div'); x.className = 'fxw'; effects(x, e.fx); w.append(x);
            const c = document.createElement('div'); c.className = 'pc'; x.append(c); const n = { w, c };
            if (id == 'bg') { c.style.background = rgba(e.color, e.alpha); c.style.borderRadius = e.radius + 'px'; c.style.border = `${e.bw}px solid ${e.bc}` }
            else if (id == 'portrait') {
                c.style.borderRadius = e.shape == 'circle' ? '50%' : e.shape == 'rounded' ? e.radius + 'px' : '0'; c.style.border = `${e.bw}px solid ${e.bc}`; c.style.background = e.bgOn ? e.bgc : 'transparent'; if (!e.clip) c.style.overflow = 'visible';
                n.img = document.createElement('img'); n.img.alt = ''; n.img.hidden = true; c.append(n.img)
            } else if (id == 'name') { n.tx = document.createElement('div'); n.tx.className = 'tx nm'; font(n.tx, e); c.append(n.tx) }
            else {
                const hasBar = e.mode != 'text'; c.style.position = 'absolute';
                if (hasBar) {
                    c.style.background = rgba(e.track, e.talpha); c.style.borderRadius = e.radius + 'px'; c.style.border = `${e.bw}px solid ${e.bc}`;
                    n.trk = document.createElement('div'); n.trk.className = 'trk';
                    if (e.seg > 1) { const u = 100 / e.seg, m = `repeating-linear-gradient(${e.dir == 'btt' || e.dir == 'ttb' ? '0deg' : '90deg'},#000 0 calc(${u}% - ${e.gap}px),transparent calc(${u}% - ${e.gap}px) ${u}%)`; n.trk.style.webkitMaskImage = n.trk.style.maskImage = m }
                    n.fl = document.createElement('div'); n.fl.className = 'fl'; n.trk.append(n.fl); c.append(n.trk)
                }
                if (e.mode != 'bar') { n.tx = document.createElement('div'); n.tx.className = 'tx'; font(n.tx, e); c.append(n.tx) }
            }
            if (e.fx.scan.on) { const sc = document.createElement('div'); sc.className = 'scan'; sc.style.background = `repeating-linear-gradient(0deg,rgba(0,0,0,${e.fx.scan.op}) 0 1px,transparent 1px ${e.fx.scan.gap}px)`; c.append(sc) }
            N[id] = n; root.append(w)
        });
        D && patch(null)
    }
    function patch(prev) {
        if (!D) return; const e = L.el;
        if (N.portrait) { const i = N.portrait.img; if (D.src) { if (i.getAttribute('src') !== D.src) i.src = D.src; i.style.cssText = cropCss(D.crop); i.hidden = false } else i.hidden = true }
        if (N.name) { const m = [...String(D.name ?? '')], cut = m.length > e.name.maxc; N.name.tx.textContent = m.slice(0, e.name.maxc).join('') + (cut && e.name.ell ? '…' : '') }
        ['pv', 'pd'].forEach(k => {
            const n = N[k]; if (!n) return; const c = e[k], cur = +D[k] || 0, mx = +D[k + 'Max'] || 1, p = Math.max(0, Math.min(100, cur / mx * 100));
            if (n.tx) n.tx.textContent = String(c.fmt).replace(/\{cur\}/g, cur).replace(/\{max\}/g, mx).replace(/\{pct\}/g, Math.round(p));
            if (n.fl) {
                const col = c.low && p <= c.lowPct ? c.lowColor : c.fill, v = c.dir == 'btt' || c.dir == 'ttb', g = `linear-gradient(${v ? '0deg' : '90deg'},${col},${c.fill2 && !(c.low && p <= c.lowPct) ? c.fill2 : col})`, s = n.fl.style;
                s.cssText = 'position:absolute;background:' + g + ';' + (v ? `left:0;right:0;${c.dir == 'btt' ? 'bottom' : 'top'}:0;height:${p}%` : `top:0;bottom:0;${c.dir == 'ltr' ? 'left' : 'right'}:0;width:${p}%`)
            }
        });
        const shake = (cls, k) => ['portrait', 'pv', 'pd', 'name', 'bg'].forEach(id => { const n = N[id]; if (n && e[id].fx[k].on) { n.w.classList.remove('hit', 'hitpd'); void n.w.offsetWidth; n.w.classList.add(cls); clearTimeout(hitT[id]); hitT[id] = setTimeout(() => n.w.classList.remove(cls), 700) } });
        if (prev && (+D.pv < +prev.pv)) shake('hit', 'hit');
        if (prev && (+D.pd < +prev.pd)) shake('hitpd', 'hitpd')
    }
    return {
        get layout() { return L },
        setLayout(l) { L = mergeLayout(l); build() },
        setData(d) { const p = D; D = d; patch(p) },
        /* só reposiciona um elemento (usado ao arrastar, sem recriar o DOM) */
        move(id, el) { const n = N[id]; if (n) place(n.w, el || L.el[id]) }
    }
}

/* dados do portrait a partir de uma ficha */
export const dataFromSheet = s => { const k = faceKey(s); return { name: s.name, pv: s.pv, pvMax: s.pvMax, pd: s.pd, pdMax: s.pdMax, src: k ? s.img[k] : '', crop: s.crop, state: k } };
