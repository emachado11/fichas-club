import { D, AN, SKILLS, MUNDOS, PERF, CAT, TABN, $, esc, modal, close, act, face, faceKey, picHTML, cropCss, small, load, rd, shrink, toast } from './common.js';

/* Tamanho (px) do círculo do editor de enquadramento (estilo Discord) */
const RING = 260;

export function mountSheet(root, s, o = {}) {
    let tab = 'hab', lp = 0, lt, later = false, ed = null;
    const save = () => { if (!o.ro) o.onSave?.() };
    const render = () => { document.body.dataset.p = s.perfil; root.innerHTML = html() };
    const upd = (f, re = true) => { f(s); save(); if (re) render() };
    /* Chamado quando chegam dados novos de outro dispositivo. Não re-renderiza enquanto a pessoa digita. */
    const refresh = () => {
        const a = document.activeElement;
        if (a && root.contains(a) && a.matches('input,textarea,[contenteditable]')) later = true; else render()
    };
    const pick = cb => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = () => f.files[0] && cb(f.files[0]); f.click() };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    /* Aplica uma mudança no máximo (PV/PD) pela DIFERENÇA do atributo, preservando bônus/penalidades manuais. */
    const shiftMax = (s, k, dl) => {
        const mx = k + 'Max'; s[mx] = Math.max(1, s[mx] + dl);
        s[k] = Math.min(dl > 0 ? s[k] + dl : s[k], s[mx])
    };

    function html() {
        const a = s.a, f = face(s), L = s[tab] || [], SKL = SKILLS[s.mundo] || SKILLS.moderno;
        const bar = (k, l) => `<div class=st><div class=f style="width:${Math.max(0, Math.min(100, s[k] / (s[k + 'Max'] || 1) * 100))}%"></div><button data-a=cur data-k=${k} data-d=-1>‹</button><div class=n>${l} <span contenteditable data-ce=${k}>${s[k]}</span>/<span contenteditable data-ce=${k}Max>${s[k + 'Max']}</span></div><button data-a=cur data-k=${k} data-d=1>›</button></div>`;
        return `<div class="sheet ${o.ro ? 'ro' : ''}">
  <div class=pn><div class=prof><div class=pic data-a=photo>${f ? picHTML(f, s.crop) : '+'}</div><div class=pi>
   <input class=nm data-k=name value="${esc(s.name)}" maxlength=32>
   <div class=dd><button data-a=dd>${s.perfil} ▾</button><div class=ddm>${Object.keys(PERF).map(p => `<div class=opt data-a=perfil data-v=${p}>${p}<i title="${esc(PERF[p])}">?</i></div>`).join('')}</div></div>
   <input data-k=ocup value="${esc(s.ocup)}" maxlength=28 placeholder="Ocupação">
   <label>Nível <select data-k=nivel>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option ${n == s.nivel ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div></div>
   <div class=ttl>ATRIBUTOS</div><div class=at>${['f', 'm', 'e'].map(k => `<div>${AN[k]}<div class=v>${D[a[k]]}</div><button class=s data-a=attr data-k=${k} data-d=-1>−</button><button class=s data-a=attr data-k=${k} data-d=1>+</button></div>`).join('')}</div>
   ${bar('pv', 'PV')}${bar('pd', 'PD')}<div class=mod>Modificadores de perícias (em construção)</div></div>
  <div class=pn><div class=mundo role=group aria-label="Mundo">${Object.keys(MUNDOS).map(m => `<button class="${s.mundo == m ? 'on' : ''}" data-a=mundo data-v=${m} aria-pressed=${s.mundo == m}>${MUNDOS[m]}</button>`).join('')}</div><div class=ttl>PERÍCIAS</div><div class=skl>${SKL.map(([n, k]) => `<div class=sk><span>${n}</span><select data-sk="${esc(n)}">${D.map((d, j) => `<option value=${j} ${(s.sk[n] || 0) == j ? 'selected' : ''}>${d}</option>`).join('')}</select><b>${D[a[k]]}</b><em>${AN[k]}</em></div>`).join('')}</div></div>
  <div style="display:grid;gap:12px"><div class=pn><div class=row style="justify-content:space-between"><b class=cz>Pontos de relação</b><button data-a=addrel>+</button></div><div class=rels>${s.rel.map((r, i) => `<div class=rc><div class=ph data-a=relph data-i=${i} style="${r.img ? `background-image:url('${esc(r.img)}')` : ''}">${r.img ? '' : 'Clique para adicionar uma foto.'}</div><input data-r=${i} value="${esc(r.name)}" maxlength=20 placeholder="Nome aqui"><div class=dots>${[0, 1, 2].map(j => `<div class="dot ${r.pts > j ? 'p' : r.pts < 0 && -r.pts > j ? 'n' : ''}" data-dot=${i}:${j}>${r.pts < 0 && -r.pts > j ? '×' : ''}</div>`).join('')}</div><button class=g data-a=rmrel data-i=${i}>Remover</button></div>`).join('')}</div></div>
  <div class=pn><div class=tabs>${Object.keys(TABN).map(t => `<button class="${tab == t ? 'on' : ''}" data-a=tab data-v=${t}>${TABN[t]}</button>`).join('')}${tab != 'outros' ? '<button data-a=cat style="margin-left:auto">+</button>' : ''}</div>
  <div class=box>${tab == 'outros' ? `<textarea class=ot data-k=outros placeholder="Anotações...">${esc(s.outros)}</textarea>` : L.length ? L.map((x, i) => `<div class=it><b>${esc(x.name)}</b><p>${esc(x.description)}</p><button class=g data-a=rm data-i=${i}>×</button></div>`).join('') : `<p class=mt>Adicione itens com o botão +.</p>`}</div></div></div></div>`
    }

    /* ===== Foto do agente ===== */
    const STATES = ['ferido', 'morrendo', 'cansado', 'exausto'];
    function photo(open) {
        const m = s.img.main;
        modal(`<h3>Foto do agente</h3><div class="pic big">${m ? picHTML(m, s.crop) : '+'}</div>
  <div class=drop id=dz>Arraste uma imagem ou <button class=g data-a=pick>escolher do dispositivo</button></div>
  <div class=row><input id=pu placeholder="ou cole uma URL" style="flex:1"><button class=g data-a=loadurl>Carregar</button></div>
  ${m ? `<button class=g data-a=reframe>Ajustar enquadramento</button>
  <button class=g data-a=states>Imagens por estado ▾</button><div id=sts ${open ? '' : 'hidden'}>${STATES.map(k => `<div class="row strow"><div class="pic sm">${s.img[k] ? picHTML(s.img[k], s.crop) : ''}</div><span style="width:70px">${k}</span><input data-img=${k} value="${esc((s.img[k] || '').startsWith('data:') ? '' : s.img[k] || '')}" placeholder=URL style="flex:1;min-width:0"><button class=g data-a=stfile data-k=${k}>Arquivo</button>${s.img[k] ? `<button class=g data-a=strm data-k=${k} title=Remover>×</button>` : ''}</div>`).join('')}<p class=mt style="font-size:14px">Todas as imagens de estado usam o mesmo enquadramento da foto principal. PV ≤ metade: ferido · PV ≤ 0: morrendo · PD ≤ metade: cansado · PD ≤ 0: exausto. O PV tem prioridade.</p></div>` : ''}
  <button class=g data-a=close>Fechar</button>`);
        const dz = $('#dz'); dz.ondragover = e => { e.preventDefault(); dz.classList.add('h') }; dz.ondragleave = () => dz.classList.remove('h');
        dz.ondrop = async e => { e.preventDefault(); dz.classList.remove('h'); const f = e.dataTransfer.files[0]; if (f) openCrop(await newImg(await rd(f))) }
    }
    /* carrega e reduz; devolve { im, data } */
    const newImg = async src => { const im = await load(src); return { im, data: shrink(im, src) } };

    /* ===== Editor de enquadramento (estilo Discord): arraste a foto e use o zoom ===== */
    function openCrop(img, keep) {
        const im = img.im, W = im.naturalWidth || im.width, H = im.naturalHeight || im.height, mn = Math.min(W, H);
        const c0 = keep ? s.crop : { z: 1, x: 0, y: 0 };
        ed = { img, z: c0.z || 1, x: c0.x || 0, y: c0.y || 0 };
        modal(`<div class=ce><div class=ceh><h3>Editar imagem</h3><button class="g cex" data-a=cecancel aria-label=Fechar>✕</button></div>
  <div class=stage id=cst><img class=gh id=cg draggable=false src="${esc(img.data)}" alt=""><div class=ring id=cr><img id=ci draggable=false src="${esc(img.data)}" alt=""></div></div>
  <div class=zrow><span class=zi>▫</span><input type=range id=cz min=1 max=4 step=.01 value=${ed.z} aria-label=Zoom><span class="zi lg">▣</span></div>
  <p class=mt style="text-align:center;font-size:14px;margin:0">Arraste para posicionar · role ou use o controle para dar zoom</p>
  <div class=cef><button class="g lnk" data-a=cereset>Redefinir</button><span class=row><button class=g data-a=cecancel>Cancelar</button><button data-a=ceapply>Aplicar</button></span></div></div>`);
        const st = $('#cst'), ci = $('#ci'), cg = $('#cg'), cz = $('#cz');
        const lim = () => ({ x: Math.max(0, (W / mn * ed.z - 1) / 2), y: Math.max(0, (H / mn * ed.z - 1) / 2) });
        const draw = () => {
            const l = lim(); ed.x = clamp(ed.x, -l.x, l.x); ed.y = clamp(ed.y, -l.y, l.y);
            [ci, cg].forEach(e => { e.style.width = W / mn * RING * ed.z + 'px'; e.style.height = H / mn * RING * ed.z + 'px'; e.style.transform = `translate(-50%,-50%) translate(${ed.x * RING}px,${ed.y * RING}px)` });
            cz.value = ed.z
        };
        draw();
        cz.oninput = () => { ed.z = +cz.value; draw() };
        st.onwheel = e => { e.preventDefault(); ed.z = clamp(ed.z - e.deltaY * .002, 1, 4); draw() };
        let dr = null;
        st.onpointerdown = e => { dr = { px: e.clientX, py: e.clientY, x: ed.x, y: ed.y }; st.setPointerCapture(e.pointerId); st.classList.add('drag') };
        st.onpointermove = e => { if (!dr) return; ed.x = dr.x + (e.clientX - dr.px) / RING; ed.y = dr.y + (e.clientY - dr.py) / RING; draw() };
        st.onpointerup = st.onpointercancel = () => { dr = null; st.classList.remove('drag') };
        ed.draw = draw
    }

    const dot = (i, j, neg) => upd(s => { const r = s.rel[i], v = neg ? -(j + 1) : j + 1; r.pts = r.pts === v ? (neg ? -j : j) : v });
    const showCatalog = () => {
        modal(`<div class=catalog-modal-head><h3>${TABN[tab]}</h3><button class=g data-a=createcustom aria-label="Criar ${tab === 'hab' ? 'habilidade' : tab === 'equip' ? 'equipamento' : 'item'}" title="Criar novo">+</button></div><div class=catalog-modal-list>${CAT[tab].map((x, i) => `<button class=cat data-a=addcat data-i=${i}>${x.name}<small>${x.description}</small></button>`).join('')}</div>`);
        $('#modal .mb').classList.add('catalog-picker-modal')
    };
    const showCustomCatalogForm = () => {
        const label = { hab: 'habilidade', equip: 'equipamento', itens: 'item' }[tab];
        modal(`<h3>Novo ${label}</h3><input id=nn maxlength=64 placeholder=Nome><textarea id=nd rows=5 placeholder=Descrição></textarea><div class=row><button class=g data-a=backcat>Voltar</button><button data-a=addnew>Adicionar ${label}</button></div>`);
        $('#modal .mb').classList.add('catalog-create-modal')
    };
    act({
        close: () => { ed = null; close(); render() }, dd: t => t.parentNode.classList.toggle('open'),
        perfil: (t, e) => { if (e.target.closest('i')) return; upd(s => s.perfil = t.dataset.v) },
        attr: t => upd(s => {
            const k = t.dataset.k, old = D[s.a[k]]; s.a[k] = clamp(s.a[k] + +t.dataset.d, 0, 4);
            const dl = D[s.a[k]] - old; if (!dl) return;
            if (k == 'f') shiftMax(s, 'pv', dl); if (k == 'e') shiftMax(s, 'pd', dl)
        }),
        cur: t => upd(s => { const k = t.dataset.k; s[k] = Math.min(s[k + 'Max'], s[k] + +t.dataset.d) }),
        mundo: t => upd(s => s.mundo = t.dataset.v),
        tab: t => { tab = t.dataset.v; render() }, rm: t => upd(s => s[tab].splice(+t.dataset.i, 1)),
        cat: showCatalog,
        createcustom: showCustomCatalogForm,
        backcat: showCatalog,
        addcat: t => { const x = CAT[tab][+t.dataset.i]; upd(s => s[tab].push({ ...x })); close() },
        addnew: () => {
            const name = $('#nn').value.trim(), description = $('#nd').value.trim();
            if (!name) return toast('Digite um nome.', 1);
            if (tab === 'hab' && !description) return toast('Digite a descrição da habilidade.', 1);
            upd(s => s[tab].push({ name, description })); close()
        },
        addrel: () => upd(s => s.rel.push({ name: '', img: '', pts: 0 })), rmrel: t => upd(s => s.rel.splice(+t.dataset.i, 1)),
        relph: t => pick(async f => { const u = await small(await rd(f)); upd(s => s.rel[+t.dataset.i].img = u) }),
        photo: () => photo(),
        pick: () => pick(async f => openCrop(await newImg(await rd(f)))),
        loadurl: async () => { try { openCrop(await newImg($('#pu').value.trim())) } catch { alert('Não foi possível carregar a URL') } },
        reframe: async () => { try { openCrop({ im: await load(s.img.main), data: s.img.main }, true) } catch { alert('Não foi possível abrir a imagem') } },
        cereset: () => { if (!ed) return; ed.z = 1; ed.x = 0; ed.y = 0; ed.draw() },
        cecancel: () => { ed = null; photo() },
        ceapply: () => {
            if (!ed) return; const r = n => +n.toFixed(4), c = { z: r(ed.z), x: r(ed.x), y: r(ed.y) }, d = ed.img.data; ed = null;
            upd(s => { s.img.main = d; s.crop = c }, false); photo()
        },
        states: () => $('#sts').hidden = !$('#sts').hidden,
        stfile: t => pick(async f => { try { const { data } = await newImg(await rd(f)); upd(s => s.img[t.dataset.k] = data, false); photo(true) } catch { alert('Não foi possível abrir a imagem') } }),
        strm: t => { upd(s => delete s.img[t.dataset.k], false); photo(true) }
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
        if (t.dataset.img) { if (t.value.trim()) s.img[t.dataset.img] = t.value.trim(); else delete s.img[t.dataset.img]; save() }
    });
    document.addEventListener('change', e => {
        const t = e.target;
        if (t.dataset.k == 'nivel') upd(s => s.nivel = +t.value, false);
        if (t.dataset.sk !== undefined) upd(s => s.sk[t.dataset.sk] = +t.value, false)
    });
    document.addEventListener('focusout', e => {
        const t = e.target, k = t.dataset?.ce;
        if (!k) { if (later) { later = false; setTimeout(() => { const a = document.activeElement; if (!(a && root.contains(a) && a.matches('input,textarea,[contenteditable]'))) render(); else later = true }, 0) } return }
        later = false;
        upd(s => {
            let v = parseInt(t.textContent); if (isNaN(v)) v = s[k];
            if (k.endsWith('Max')) { const b = k.slice(0, 2); s[k] = Math.max(1, v); s[b] = Math.min(s[b], s[k]) } else s[k] = Math.min(v, s[k + 'Max'])
        })
    });
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset?.ce) { e.preventDefault(); e.target.blur() } });
    render(); return { render, refresh, upd };
}
