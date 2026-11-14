/* Editor de layout do portrait de OBS.
   ?c=<campanha>  → layout BASE da campanha (só o mestre)
   ?sheet=<ficha> → layout próprio de uma ficha */
import { guard, $, esc, toast, err, qs, act, clip, blank, migrate, faceKey } from '../common.js';
import { db, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from '../firebase.js';
import { createPortrait, mergeLayout, DEFAULT, SCHEMA, FONTS, getPath, setPath, clone, upscale, SCREEN } from '../portrait.js';

const cid = qs('c'), sid = qs('sheet');
const STATES = [['auto', 'Automático (pelos PV/PD)'], ['main', 'Normal'], ['ferido', 'Ferido'], ['morrendo', 'Morrendo'], ['cansado', 'Cansado'], ['exausto', 'Exausto']];
const PHC = { main: ['#34495e', '#1c2833'], ferido: ['#7b4a2a', '#3a1d10'], morrendo: ['#7a1f1f', '#2b0a0a'], cansado: ['#3d3d6b', '#17172b'], exausto: ['#444', '#111'] };
const ph = k => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PHC[k][0]}"/><stop offset="1" stop-color="${PHC[k][1]}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="78" r="34" fill="#fff" opacity=".85"/><path d="M30 200c0-48 31-76 70-76s70 28 70 76z" fill="#fff" opacity=".85"/></svg>`);
const PHI = Object.fromEntries(Object.keys(PHC).map(k => [k, ph(k)]));

guard(async u => {
    try { await boot(u) } catch (x) { $('#app').innerHTML = `<div class=wrap><p class=er>${esc(err(x))}</p><a class="btn g" href="painel.html">← Painel</a></div>` }
});

async function boot(u) {
    if (!cid && !sid) throw new Error('Abra o editor a partir de uma campanha ou de uma ficha.');
    let L, title, back, sheets = [], sheet = null, camp = null, campLayout = null, usingCamp = false;
    if (cid) {
        camp = (await getDoc(doc(db, 'campaigns', cid))).data(); if (!camp) throw new Error('Campanha não encontrada.');
        if (camp.master !== u.uid) throw new Error('Somente o mestre pode editar o layout base da campanha.');
        const d = await getDoc(doc(db, 'layouts', cid)); L = mergeLayout(d.exists() ? d.data().layout : null);
        title = 'Layout base da campanha — ' + camp.name; back = 'campanha.html?id=' + cid;
        sheets = (await getDocs(query(collection(db, 'sheets'), where('campaign', '==', cid)))).docs.map(d => ({ id: d.id, ...d.data() }))
    } else {
        const d = await getDoc(doc(db, 'sheets', sid)); if (!d.exists()) throw new Error('Ficha não encontrada.');
        sheet = { id: sid, ...d.data() }; sheets = [sheet]; L = mergeLayout(sheet.obs?.layout);
        title = 'Layout do portrait — ' + sheet.name; back = 'ficha.html?id=' + sid + (sheet.campaign ? '&c=' + sheet.campaign : '');
        usingCamp = !!sheet.campaign && sheet.obs?.useCampaign !== false;
        if (sheet.campaign) { try { const c = await getDoc(doc(db, 'layouts', sheet.campaign)); if (c.exists()) campLayout = c.data().layout } catch { } }
    }

    /* ---------- estado ---------- */
    let sel = 'portrait', hist = [], last = JSON.stringify(L), dirty = false, sc = 1, pd = { name: sheet?.name || 'Agente Exemplo', pv: sheet?.pv ?? 8, pvMax: sheet?.pvMax ?? 12, pd: sheet?.pd ?? 5, pdMax: sheet?.pdMax ?? 10, state: 'auto', src: sheet ? sheet.id : '' };
    const open = new Set();
    $('#app').innerHTML = `<div class=pe-top>
  <a class="btn g" href="${back}">← Voltar</a><b class=pe-title>${esc(title)}</b>
      <div class=pe-mode role=tablist aria-label="Modo de visualização"><button class=on id=mode-edit role=tab aria-selected=true data-a=mode data-v=edit>Editar</button><button id=mode-preview role=tab aria-selected=false data-a=mode data-v=preview>Prévia</button></div>
  <label class=pe-f>Tela <select id=preset><option value="">Personalizada</option><option value=2k>2K · 2560×1440</option><option value=fhd>Full HD · 1920×1080</option></select> <input type=number id=cw min=50 max=4000 value=${L.w}> × <input type=number id=ch min=50 max=4000 value=${L.h}></label>
  <label class=pe-f>Fundo <select id=bgm><option value=chk>Transparente (xadrez)</option><option value=dark>Escuro</option><option value=light>Claro</option><option value=green>Verde</option></select></label>
  <label class=pe-f>Zoom <select id=zoom><option value=auto>Auto</option>${[50, 75, 100, 150, 200, 300].map(z => `<option value=${z}>${z}%</option>`).join('')}</select></label>
  <label class=pe-f><input type=checkbox id=snap checked> Grade <select id=gs>${[1, 2, 5, 10, 20].map(z => `<option ${z == 5 ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
  <span class=pe-sp></span><span id=ss class=mt></span>
  <button class=g data-a=undo>Desfazer</button>${campLayout ? '<button class=g data-a=fromcamp>Copiar da campanha</button>' : ''}<button class=g data-a=to2k title="Amplia este layout para o padrão 1040×340 em tela 2K, centralizado">Converter para 2K</button><button class=g data-a=reset>Padrão</button>${sheet ? '<button class=g data-a=copylink>Copiar link do OBS</button>' : ''}<button data-a=save>Salvar</button></div>
  ${usingCamp ? '<div class=pe-warn>Esta ficha está usando o portrait da campanha. Para este layout aparecer no OBS, desmarque “Usar portrait da campanha” na engrenagem ⚙ da ficha.</div>' : ''}
  <div class=pe-main><aside class=pe-l><h4>Elementos</h4><div id=els></div><h4>Pré-visualização</h4><div id=prev></div></aside>
  <main id=wrap class=pe-c><div id=sz class=pe-sz><div id=stage class="pe-stage chk"><div id=pv></div><div id=ov></div></div></div></main><aside id=insp class=pe-r></aside></div>`;
    const pg = createPortrait($('#pv'), { allFonts: true }); pg.setLayout(L);

    /* ---------- dados de exemplo ---------- */
    const srcSheet = () => sheets.find(x => x.id === pd.src);
    function pdata() {
        const sh = srcSheet(), imgs = sh ? { ...PHI, ...Object.fromEntries(Object.entries(sh.img || {}).filter(([, v]) => v)) } : PHI;
        let k = pd.state; if (k === 'auto') { k = faceKey({ img: { main: 1, ferido: 1, morrendo: 1, cansado: 1, exausto: 1 }, pv: pd.pv, pvMax: pd.pvMax, pd: pd.pd, pdMax: pd.pdMax }) || 'main' }
        return { name: pd.name, pv: pd.pv, pvMax: pd.pvMax, pd: pd.pd, pdMax: pd.pdMax, src: imgs[k] || imgs.main, crop: sh?.crop || { z: 1, x: 0, y: 0 } }
    }
    const push = () => pg.setData(pdata());
    function drawPrev() {
        $('#prev').innerHTML = `<label class=fr><span>Ficha</span><select data-pv=src><option value="">Exemplo</option>${sheets.map(x => `<option value="${esc(x.id)}" ${x.id == pd.src ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
  <label class=fr><span>Nome</span><input data-pv=name value="${esc(pd.name)}"></label>
  <label class=fr><span>PV</span><input type=number data-pv=pv value=${pd.pv}> / <input type=number data-pv=pvMax min=1 value=${pd.pvMax}></label>
  <label class=fr><span>PD</span><input type=number data-pv=pd value=${pd.pd}> / <input type=number data-pv=pdMax min=1 value=${pd.pdMax}></label>
  <label class=fr><span>Estado</span><select data-pv=state>${STATES.map(([v, l]) => `<option value=${v} ${v == pd.state ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <button class=g data-a=dmg>Simular dano (−1 PV)</button><p class=mt style="font-size:13px;margin:4px 0 0">Só simula o que o OBS mostrará; nada disso é salvo na ficha.</p>`
    }
    $('#prev').addEventListener('input', e => { const k = e.target.dataset.pv; if (!k) return; const t = e.target; pd[k] = t.type == 'number' ? +t.value : t.value; if (k !== 'src') push() });
    $('#prev').addEventListener('change', e => {
        if (e.target.dataset.pv !== 'src') return; const sh = srcSheet();
        if (sh) Object.assign(pd, { name: sh.name, pv: sh.pv, pvMax: sh.pvMax, pd: sh.pd, pdMax: sh.pdMax }); drawPrev(); push()
    });

    /* ---------- elementos / sobreposição de arrastar ---------- */
    const ids = () => Object.keys(L.el);
    function drawEls() {
        $('#els').innerHTML = ids().map(id => `<div class="eli ${id == sel ? 'on' : ''}" data-a=pick data-id=${id}><input type=checkbox data-on=${id} ${L.el[id].on ? 'checked' : ''} aria-label="Mostrar ${esc(L.el[id].label)}"><span>${esc(L.el[id].label)}</span></div>`).join('')
    }
    const HD = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    function drawOv() {
        $('#ov').innerHTML = ids().filter(id => L.el[id].on).sort((a, b) => L.el[a].z - L.el[b].z).map(id => {
            const e = L.el[id]; return `<div class="hb ${id == sel ? 'on' : ''}" data-id=${id} style="left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;transform:rotate(${e.rot}deg);z-index:${id == sel ? 999 : e.z}">${id == sel ? HD.map(h => `<i class="hd ${h}" data-h=${h}></i>`).join('') : ''}</div>`
        }).join('')
    }
    function fit() {
        const w = $('#wrap'), preview = document.body.classList.contains('pe-preview'), z = preview ? 'auto' : $('#zoom').value, layout = pg.layout;
        sc = z == 'auto' ? Math.max(preview ? .05 : .2, Math.min(3, (w.clientWidth - 48) / layout.w, (w.clientHeight - 48) / layout.h)) : +z / 100;
        const st = $('#stage'); st.style.width = layout.w + 'px'; st.style.height = layout.h + 'px'; st.style.transform = `scale(${sc})`; st.style.setProperty('--inv', 1 / sc);
        const s = $('#sz'); s.style.width = layout.w * sc + 'px'; s.style.height = layout.h * sc + 'px'
    }
    const sn = v => $('#snap').checked ? Math.round(v / +$('#gs').value) * +$('#gs').value : Math.round(v);
    const previewLayout = () => {
        const layout = clone(L), name = layout.el.name;
        const effects = name.fx;
        const margin = Math.ceil(Math.max(24, name.size / 2,
            effects.shadow.on ? Math.max(Math.abs(effects.shadow.x), Math.abs(effects.shadow.y)) + effects.shadow.blur * 2 : 0,
            effects.glow.on ? effects.glow.blur * effects.glow.str * 2 : 0,
            effects.chroma.on ? effects.chroma.off + 4 : 0,
            effects.glitch.on ? effects.glitch.int + 4 : 0));
        Object.entries(layout.el).forEach(([id, element]) => { element.on = id === 'name' });
        name.x = margin; name.y = margin; layout.w = name.w + margin * 2; layout.h = name.h + margin * 2;
        return layout
    };
    function setMode(mode) {
        const preview = mode === 'preview';
        document.body.classList.toggle('pe-preview', preview);
        $('#mode-edit').classList.toggle('on', !preview); $('#mode-edit').setAttribute('aria-selected', String(!preview));
        $('#mode-preview').classList.toggle('on', preview); $('#mode-preview').setAttribute('aria-selected', String(preview));
        pg.setLayout(preview ? previewLayout() : L); drawOv(); fit()
    }
    const rebuild = () => { pg.setLayout(document.body.classList.contains('pe-preview') ? previewLayout() : L); drawOv() };
    function commit() { const c = JSON.stringify(L); if (c !== last) { hist.push(last); if (hist.length > 100) hist.shift(); last = c; dirty = true; $('#ss').textContent = 'Alterações não salvas' } }
    function syncPos() { ['x', 'y', 'w', 'h', 'rot'].forEach(k => { const i = $(`#insp [data-p="${k}"]`); if (i) i.value = L.el[sel][k] }) }

    let dr = null;
    $('#ov').addEventListener('pointerdown', e => {
        const hb = e.target.closest('.hb'); if (!hb) return; e.preventDefault();
        const id = hb.dataset.id, h = e.target.dataset.h; if (id != sel) { sel = id; drawEls(); drawInsp(); drawOv() }
        const el = L.el[id]; dr = { id, h, px: e.clientX, py: e.clientY, x: el.x, y: el.y, w: el.w, h0: el.h }
    });
    addEventListener('pointermove', e => {
        if (!dr) return; const el = L.el[dr.id], r = el.rot * Math.PI / 180, ddx = (e.clientX - dr.px) / sc, ddy = (e.clientY - dr.py) / sc;
        if (!dr.h) { el.x = sn(dr.x + ddx); el.y = sn(dr.y + ddy) }
        else {
            const lx = ddx * Math.cos(r) + ddy * Math.sin(r), ly = -ddx * Math.sin(r) + ddy * Math.cos(r); let x = dr.x, y = dr.y, w = dr.w, h = dr.h0;
            if (dr.h.includes('e')) w = dr.w + lx; if (dr.h.includes('s')) h = dr.h0 + ly;
            if (dr.h.includes('w')) { w = dr.w - lx; x = dr.x + lx } if (dr.h.includes('n')) { h = dr.h0 - ly; y = dr.y + ly }
            if (e.shiftKey && el.shape) { const m = Math.max(w, h); if (dr.h.includes('w')) x += w - m; if (dr.h.includes('n')) y += h - m; w = h = m }
            Object.assign(el, { x: sn(x), y: sn(y), w: Math.max(1, sn(w)), h: Math.max(1, sn(h)) })
        }
        pg.move(dr.id, el); drawOv(); syncPos()
    });
    addEventListener('pointerup', () => { if (dr) { dr = null; commit() } });
    addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.body.classList.contains('pe-preview')) { setMode('edit'); return }
        const tg = e.target; const typing = tg.matches?.('input:not([type=checkbox]):not([type=range]),textarea,select');
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() == 's') { e.preventDefault(); A.save(); return }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() == 'z' && !typing) { e.preventDefault(); A.undo(); return }
        if (typing || !e.key.startsWith('Arrow')) return; e.preventDefault();
        const el = L.el[sel], k = e.shiftKey ? 10 : 1; if (e.key == 'ArrowLeft') el.x -= k; if (e.key == 'ArrowRight') el.x += k; if (e.key == 'ArrowUp') el.y -= k; if (e.key == 'ArrowDown') el.y += k;
        pg.move(sel, el); drawOv(); syncPos(); commit()
    });

    /* ---------- inspetor ---------- */
    function field(f, e) {
        const v = getPath(e, f.k), p = `data-p="${f.k}"`, id = 'f_' + f.k.replace(/\W/g, '_');
        let c;
        if (f.t == 'bool') c = `<input type=checkbox ${p} ${v ? 'checked' : ''}>`;
        else if (f.t == 'num') c = `<input type=number ${p} value="${v}" min=${f.min} max=${f.max} step=${f.step}>`;
        else if (f.t == 'range') c = `<input type=range ${p} value="${v}" min=${f.min} max=${f.max} step=${f.step}><output>${v}</output>`;
        else if (f.t == 'color') c = `<input type=color ${p} value="${v}">`;
        else if (f.t == 'text') c = `<input type=text ${p} value="${esc(v)}">`;
        else if (f.t == 'font') c = `<select ${p} class=ff>${FONTS.map(x => `<option ${x == v ? 'selected' : ''} style="font-family:'${x}'">${x}</option>`).join('')}</select>`;
        else c = `<select ${p}>${f.o.map(([a, b]) => `<option value="${a}" ${String(a) == String(v) ? 'selected' : ''}>${b}</option>`).join('')}</select>`;
        return `<label class="fr ${f.t}"><span>${f.l}</span>${c}</label>`
    }
    function drawInsp() {
        const e = L.el[sel]; $('#insp').innerHTML = `<h3>${esc(e.label)}</h3><label class=fr><span>Visível</span><input type=checkbox data-on=${sel} ${e.on ? 'checked' : ''}></label>` +
            SCHEMA[sel].map(([t, fs]) => { const fxs = t.startsWith('Efeito'), o = open.has(t) || (!fxs && !open.has('-' + t)); return `<details data-sec="${esc(t)}" ${o ? 'open' : ''}><summary>${t}</summary>${fs.map(f => field(f, e)).join('')}</details>` }).join('')
    }
    const insp = $('#insp');
    insp.addEventListener('toggle', e => { const d = e.target, t = d.dataset.sec; if (!t) return; if (d.open) { open.add(t); open.delete('-' + t) } else { open.delete(t); open.add('-' + t) } }, true);
    const coerce = t => { const f = SCHEMA[sel].flatMap(x => x[1]).find(f => f.k == t.dataset.p); if (t.type == 'checkbox') return t.checked; if (t.type == 'number' || t.type == 'range') { const n = +t.value; return isNaN(n) ? 0 : n } if (f?.t == 'sel') { const o = f.o.find(([a]) => String(a) == t.value); return o ? o[0] : t.value } return t.value };
    insp.addEventListener('input', e => {
        const t = e.target, p = t.dataset.p; if (!p) return;
        if (t.type == 'number' && t.value === '') return;
        setPath(L.el[sel], p, coerce(t)); if (t.type == 'range') t.nextElementSibling.textContent = t.value;
        if (['x', 'y', 'w', 'h', 'rot', 'opacity'].includes(p)) { pg.move(sel, L.el[sel]); drawOv() } else rebuild()
    });
    insp.addEventListener('change', e => { if (e.target.dataset.p) { commit(); if (['z'].includes(e.target.dataset.p)) rebuild() } if (e.target.dataset.on) toggle(e.target) });
    function toggle(t) { L.el[t.dataset.on].on = t.checked; commit(); rebuild(); drawEls(); if (t.dataset.on == sel) drawInsp() }
    $('#els').addEventListener('change', e => { if (e.target.dataset.on) toggle(e.target) });

    /* ---------- barra de cima ---------- */
    $('#cw').oninput = $('#ch').oninput = () => { const w = +$('#cw').value, h = +$('#ch').value; if (w >= 50 && h >= 50) { L.w = w; L.h = h; pg.setLayout(L); fit(); commit() } };
    const syncPreset = () => { $('#preset').value = L.w == 2560 && L.h == 1440 ? '2k' : L.w == 1920 && L.h == 1080 ? 'fhd' : '' };
    $('#preset').onchange = () => { const v = $('#preset').value; if (!v) return; const [w, h] = v == '2k' ? [2560, 1440] : [1920, 1080]; L.w = w; L.h = h; $('#cw').value = w; $('#ch').value = h; pg.setLayout(L); drawOv(); fit(); commit() };
    $('#bgm').onchange = () => { $('#stage').className = 'pe-stage ' + $('#bgm').value };
    $('#zoom').onchange = fit; addEventListener('resize', fit);
    new ResizeObserver(() => fit()).observe($('#wrap'));   // reajusta a prévia quando o layout muda (celular/rotação)
    const setL = x => { L = mergeLayout(x); syncPreset(); $('#cw').value = L.w; $('#ch').value = L.h; if (!L.el[sel]) sel = 'portrait'; rebuild(); fit(); drawEls(); drawInsp() };
    const A = {
        mode: t => setMode(t.dataset.v),
        pick: t => { if (t.dataset.id == sel) return; sel = t.dataset.id; drawEls(); drawInsp(); drawOv() },
        dmg: () => { pd.pv = Math.max(0, pd.pv - 1); drawPrev(); push() },
        undo: () => { const p = hist.pop(); if (!p) return toast('Nada para desfazer'); last = p; dirty = true; setL(JSON.parse(p)) },
        to2k: () => { const e = L.el.bg; const k = 1040 / e.w; if (!confirm('Ampliar o layout para 1040×340 centralizado numa tela 2K (2560×1440)? Dá para desfazer.')) return; setL(upscale(L, k, SCREEN.w, SCREEN.h)); commit() },
        reset: () => { if (!confirm('Voltar todo o layout ao padrão?')) return; setL(DEFAULT()); commit() },
        fromcamp: () => { if (!confirm('Substituir este layout pelo layout base da campanha?')) return; setL(clone(campLayout)); commit() },
        copylink: () => clip(new URL('obs.html?id=' + sid, location.href).href, 'Link do OBS copiado'),
        save: async () => {
            try {
                $('#ss').textContent = 'Salvando…'; const data = JSON.parse(JSON.stringify(L));
                if (cid) await setDoc(doc(db, 'layouts', cid), { layout: data, master: u.uid, updated: serverTimestamp() });
                else await updateDoc(doc(db, 'sheets', sid), { 'obs.layout': data, updated: serverTimestamp() });
                dirty = false; $('#ss').textContent = 'Salvo ✓'; toast('Layout salvo')
            } catch (x) { $('#ss').textContent = 'Erro ao salvar'; toast(err(x), 1) }
        }
    };
    act(A);
    addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = '' } });
    drawEls(); drawInsp(); drawPrev(); drawOv(); fit(); push(); syncPreset();
    if (document.fonts?.ready) document.fonts.ready.then(() => { rebuild(); fit(); push() });
}
