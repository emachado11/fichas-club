import { D, AN, SK, PERF, CAT, TABN, $, esc, modal, close, act, face, small, load, rd, crop, jpg } from './common.js';
export function mountSheet(root, s, o = {}) {
    let tab = 'hab', P_ = null, lp = 0, lt;
    const save = () => { if (!o.ro) o.onSave?.() };
    const render = () => { document.body.dataset.p = s.perfil; root.innerHTML = html() };
    const upd = (f, re = true) => { f(s); save(); if (re) render() };
    const pick = cb => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = () => cb(f.files[0]); f.click() };
    function html() {
        const a = s.a, f = face(s), L = s[tab] || [];
        const bar = (k, l) => `<div class=st><div class=f style="width:${Math.max(0, Math.min(100, s[k] / (s[k + 'Max'] || 1) * 100))}%"></div><button data-a=cur data-k=${k} data-d=-1>‹</button><div class=n>${l} <span contenteditable data-ce=${k}>${s[k]}</span>/<span contenteditable data-ce=${k}Max>${s[k + 'Max']}</span></div><button data-a=cur data-k=${k} data-d=1>›</button></div>`;
        return `<div class="sheet ${o.ro ? 'ro' : ''}">
  <div class=pn><div class=prof><div class=pic data-a=photo style="${f ? `background-image:url('${esc(f)}')` : ''}">${f ? '' : '+'}</div><div class=pi>
   <input class=nm data-k=name value="${esc(s.name)}" maxlength=32>
   <div class=dd><button data-a=dd>${s.perfil} ▾</button><div class=ddm>${Object.keys(PERF).map(p => `<div class=opt data-a=perfil data-v=${p}>${p}<i title="${esc(PERF[p])}">?</i></div>`).join('')}</div></div>
   <input data-k=ocup value="${esc(s.ocup)}" maxlength=28 placeholder="Ocupação">
   <label>Nível <select data-k=nivel>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option ${n == s.nivel ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div></div>
   <div class=ttl>ATRIBUTOS</div><div class=at>${['f', 'm', 'e'].map(k => `<div>${AN[k]}<div class=v>${D[a[k]]}</div><button class=s data-a=attr data-k=${k} data-d=-1>−</button><button class=s data-a=attr data-k=${k} data-d=1>+</button></div>`).join('')}</div>
   ${bar('pv', 'PV')}${bar('pd', 'PD')}<div class=mod>Modificadores de perícias (em construção)</div></div>
  <div class=pn><div class=ttl>PERÍCIAS</div><div class=skl>${SK.map(([n, k], i) => `<div class=sk><span>${n}</span><select data-sk=${i}>${D.map((d, j) => `<option value=${j} ${(s.sk[i] || 0) == j ? 'selected' : ''}>${d}</option>`).join('')}</select><b>${D[a[k]]}</b><em>${AN[k]}</em></div>`).join('')}</div></div>
  <div style="display:grid;gap:12px"><div class=pn><div class=row style="justify-content:space-between"><b class=cz>Pontos de relação</b><button data-a=addrel>+</button></div><div class=rels>${s.rel.map((r, i) => `<div class=rc><div class=ph data-a=relph data-i=${i} style="${r.img ? `background-image:url('${esc(r.img)}')` : ''}">${r.img ? '' : 'Clique para adicionar uma foto.'}</div><input data-r=${i} value="${esc(r.name)}" maxlength=20 placeholder="Nome aqui"><div class=dots>${[0, 1, 2].map(j => `<div class="dot ${r.pts > j ? 'p' : r.pts < 0 && -r.pts > j ? 'n' : ''}" data-dot=${i}:${j}>${r.pts < 0 && -r.pts > j ? '×' : ''}</div>`).join('')}</div><button class=g data-a=rmrel data-i=${i}>Remover</button></div>`).join('')}</div></div>
  <div class=pn><div class=tabs>${Object.keys(TABN).map(t => `<button class="${tab == t ? 'on' : ''}" data-a=tab data-v=${t}>${TABN[t]}</button>`).join('')}${tab != 'outros' ? '<button data-a=cat style="margin-left:auto">+</button>' : ''}</div>
  <div class=box>${tab == 'outros' ? `<textarea class=ot data-k=outros placeholder="Anotações...">${esc(s.outros)}</textarea>` : L.length ? L.map((x, i) => `<div class=it><b>${esc(x[0])}</b><p>${esc(x[1])}</p><button class=g data-a=rm data-i=${i}>×</button></div>`).join('') : `<p class=mt>Adicione itens com o botão +.</p>`}</div></div></div></div>`
    }
    function photo(open) {
        const m = s.img.main;
        modal(`<h3>Foto do agente</h3>${m ? `<img class=big src="${esc(m)}">` : '<canvas id=pc class=big></canvas>'}
  <div class=drop id=dz>Arraste uma imagem ou <button class=g data-a=pick>escolher do dispositivo</button></div>
  <div class=row><input id=pu placeholder="ou cole uma URL" style="flex:1"><button class=g data-a=loadurl>Carregar</button></div>
  <div id=cr hidden class=row>Zoom <input type=range id=pz min=1 max=3 step=.05 value=1> X <input type=range id=px min=-1 max=1 step=.05 value=0> Y <input type=range id=py min=-1 max=1 step=.05 value=0><button data-a=setmain>Definir foto</button></div>
  ${m ? `<button class=g data-a=states>Imagens por estado ▾</button><div id=sts ${open ? '' : 'hidden'}>${['ferido', 'morrendo', 'cansado', 'exausto'].map(k => `<div class=row style="margin:4px 0"><span style="width:70px">${k}</span><input data-img=${k} value="${esc((s.img[k] || '').startsWith('data:') ? '' : s.img[k] || '')}" placeholder=URL style="flex:1">${s.img[k] ? '✓' : ''}<button class=g data-a=stfile data-k=${k}>Arquivo</button></div>`).join('')}<p class=mt style="font-size:14px">PV ≤ metade: ferido · PV ≤ 0: morrendo · PD ≤ metade: cansado · PD ≤ 0: exausto. O PV tem prioridade.</p></div>` : ''}
  <button class=g data-a=close>Fechar</button>`);
        const dz = $('#dz'); dz.ondragover = e => { e.preventDefault(); dz.classList.add('h') }; dz.ondragleave = () => dz.classList.remove('h');
        dz.ondrop = async e => { e.preventDefault(); dz.classList.remove('h'); const f = e.dataTransfer.files[0]; if (f) pend(await load(await rd(f))) }
    }
    function pend(im) {
        P_ = { im }; if (s.img.main) { const c = document.createElement('canvas'); c.id = 'pc'; c.className = 'big'; $('.big').replaceWith(c) }
        $('#cr').hidden = false; const d = () => crop(im, 160, +$('#pz').value, +$('#px').value, +$('#py').value, $('#pc')); d();['pz', 'px', 'py'].forEach(i => $('#' + i).oninput = d)
    }
    const dot = (i, j, neg) => upd(s => { const r = s.rel[i], v = neg ? -(j + 1) : j + 1; r.pts = r.pts === v ? (neg ? -j : j) : v });
    act({
        close: () => { close(); render() }, dd: t => t.parentNode.classList.toggle('open'),
        perfil: (t, e) => { if (e.target.closest('i')) return; upd(s => s.perfil = t.dataset.v) },
        attr: t => upd(s => {
            const k = t.dataset.k; s.a[k] = Math.max(0, Math.min(4, s.a[k] + +t.dataset.d));
            if (k == 'f') { s.pvMax = D[s.a.f]; s.pv = Math.min(s.pv, s.pvMax) } if (k == 'e') { s.pdMax = D[s.a.e]; s.pd = Math.min(s.pd, s.pdMax) }
        }),
        cur: t => upd(s => { const k = t.dataset.k; s[k] = Math.min(s[k + 'Max'], s[k] + +t.dataset.d) }),
        tab: t => { tab = t.dataset.v; render() }, rm: t => upd(s => s[tab].splice(+t.dataset.i, 1)),
        cat: () => modal(`<h3>${TABN[tab]}</h3>${CAT[tab].map((x, i) => `<button class=cat data-a=addcat data-i=${i}>${x[0]}<small>${x[1]}</small></button>`).join('')}<h3>Criar nova</h3><input id=nn placeholder=Nome><textarea id=nd rows=3 placeholder=Descrição></textarea><button data-a=addnew>Adicionar</button>`),
        addcat: t => { upd(s => s[tab].push([...CAT[tab][+t.dataset.i]])); close() },
        addnew: () => { const n = $('#nn').value.trim(); if (!n) return; upd(s => s[tab].push([n, $('#nd').value])); close() },
        addrel: () => upd(s => s.rel.push({ name: '', img: '', pts: 0 })), rmrel: t => upd(s => s.rel.splice(+t.dataset.i, 1)),
        relph: t => pick(async f => { const u = await small(await rd(f)); upd(s => s.rel[+t.dataset.i].img = u) }),
        photo: () => photo(), pick: () => pick(async f => pend(await load(await rd(f)))),
        loadurl: async () => { try { pend(await load($('#pu').value)) } catch { alert('Não foi possível carregar a URL') } },
        setmain: () => { const u = jpg(crop(P_.im, 256, +$('#pz').value, +$('#px').value, +$('#py').value)); upd(s => s.img.main = u); P_ = null; photo() },
        states: () => $('#sts').hidden = !$('#sts').hidden,
        stfile: t => pick(async f => { const u = await small(await rd(f)); upd(s => s.img[t.dataset.k] = u, false); photo(true) })
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('.dd')) document.querySelectorAll('.dd.open').forEach(d => d.classList.remove('open'));
        const d = e.target.closest('[data-dot]'); if (d && !lp) { const [i, j] = d.dataset.dot.split(':').map(Number); dot(i, j, false) }
    });
    document.addEventListener('contextmenu', e => { const d = e.target.closest('[data-dot]'); if (!d) return; e.preventDefault(); const [i, j] = d.dataset.dot.split(':').map(Number); dot(i, j, true) });
    document.addEventListener('pointerdown', e => {
        const d = e.target.closest('[data-dot]'); lp = 0; if (!d || e.pointerType === 'mouse') return;
        lt = setTimeout(() => { lp = 1; const [i, j] = d.dataset.dot.split(':').map(Number); dot(i, j, true) }, 450)
    });
    document.addEventListener('pointerup', () => { clearTimeout(lt); setTimeout(() => lp = 0, 50) });
    document.addEventListener('input', e => {
        const t = e.target;
        if (t.dataset.k && t.dataset.k != 'nivel') { s[t.dataset.k] = t.value; save() }
        if (t.dataset.r) { s.rel[+t.dataset.r].name = t.value; save() }
        if (t.dataset.img) { s.img[t.dataset.img] = t.value; save() }
    });
    document.addEventListener('change', e => {
        const t = e.target;
        if (t.dataset.k == 'nivel') upd(s => s.nivel = +t.value, false);
        if (t.dataset.sk !== undefined) upd(s => s.sk[t.dataset.sk] = +t.value, false)
    });
    document.addEventListener('focusout', e => {
        const t = e.target, k = t.dataset?.ce; if (!k) return;
        upd(s => { let v = parseInt(t.textContent); if (isNaN(v)) v = s[k]; const mx = k.endsWith('Max'); s[k] = mx ? Math.max(1, v) : Math.min(v, s[k + 'Max']); if (mx) { const b = k.slice(0, 2); s[b] = Math.min(s[b], s[k]) } })
    });
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset?.ce) { e.preventDefault(); e.target.blur() } });
    render(); return { render };
}
