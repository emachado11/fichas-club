import { guard, page, act, $, err, toast } from '../common.js';
import { db, collection, query, where, onSnapshot, deleteDoc, doc } from '../firebase.js';
import { PRIV, savePriv } from '../profile.js';
import { fab, sheetCard } from '../ui.js';

const SORTS = { az: 'Ordem alfabética', lvl: 'Nível', perfil: 'Perfil', recent: 'Mais recentes', mine: 'Minha ordem' };
const PF = ['Todos', 'Executor', 'Analista', 'Vigilante'];
guard(u => {
    let all = [], st = { sort: PRIV.fsort || 'az', dir: PRIV.fdir || 1, perfil: 'Todos', mundo: '', q: '' }, order = PRIV.sheetOrder || [], drag = null;
    page('Minhas fichas', `<div class=tb><input type=search id=q placeholder="Buscar ficha…" aria-label="Buscar ficha">
   <select id=so aria-label="Ordenar por">${Object.entries(SORTS).map(([k, v]) => `<option value=${k} ${k == st.sort ? 'selected' : ''}>${v}</option>`).join('')}</select>
   <button class=g id=dr data-a=dir title="Inverter ordem"></button>
   <select id=mu aria-label="Mundo"><option value="">Todos os mundos</option><option value=moderno>Moderno</option><option value=medieval>Medieval</option></select></div>
   <div class="chips tb" id=ch>${PF.map(p => `<button data-a=pf data-v=${p} class="${p == 'Todos' ? 'on' : ''}">${p}</button>`).join('')}</div><div id=gr class=grid></div>${fab([{ href: 'ficha-nova.html', label: 'Nova ficha' }])}`, u);
    const cmp = {
        az: (a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }), lvl: (a, b) => a.nivel - b.nivel || cmp.az(a, b),
        perfil: (a, b) => a.perfil.localeCompare(b.perfil) || cmp.az(a, b), recent: (a, b) => (a.updated?.toMillis?.() || 0) - (b.updated?.toMillis?.() || 0)
    };
    const full = () => { const m = new Map(all.map(x => [x.id, x])), ids = order.filter(i => m.has(i)); all.forEach(x => { if (!ids.includes(x.id)) ids.push(x.id) }); return ids };
    function view() {
        let L = all.filter(x => (st.perfil == 'Todos' || x.perfil == st.perfil) && (!st.mundo || (x.mundo || 'moderno') == st.mundo) && (!st.q || (x.name + ' ' + x.ocup).toLowerCase().includes(st.q)));
        if (st.sort == 'mine') { const ids = full(); L.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) } else { L.sort((a, b) => cmp[st.sort](a, b) * (st.sort == 'recent' ? -st.dir : st.dir)) }
        return L
    }
    const draw = () => {
        const L = view(), mine = st.sort == 'mine'; $('#gr').classList.toggle('ord', mine);
        $('#dr').hidden = mine; $('#dr').textContent = st.dir == 1 ? '↑ Crescente' : '↓ Decrescente'; if (st.sort == 'recent') $('#dr').textContent = st.dir == 1 ? '↓ Mais novas' : '↑ Mais antigas';
        $('#gr').innerHTML = L.map(x => sheetCard(x, { del: true, move: mine, drag: mine })).join('') || `<div class=empty-s style="grid-column:1/-1"><p>${all.length ? 'Nenhuma ficha com esses filtros.' : 'Nenhuma ficha ainda.'}</p>${all.length ? '' : '<p><a href=ficha-nova.html>Criar a primeira ficha</a></p>'}</div>`
    };
    const save = () => savePriv(u.uid, { fsort: st.sort, fdir: st.dir }).catch(() => { });
    const saveOrder = o => { order = o; savePriv(u.uid, { sheetOrder: o }).catch(x => toast(err(x), 1)); draw() };
    const move = (id, d) => { const v = view().map(x => x.id), i = v.indexOf(id), j = i + d; if (j < 0 || j >= v.length) return; const o = full(), a = o.indexOf(v[i]), b = o.indexOf(v[j]);[o[a], o[b]] = [o[b], o[a]]; saveOrder(o) };
    onSnapshot(query(collection(db, 'sheets'), where('owner', '==', u.uid)), q => { all = q.docs.map(d => ({ id: d.id, ...d.data() })); draw() }, x => $('#gr').textContent = err(x));
    $('#q').oninput = e => { st.q = e.target.value.trim().toLowerCase(); draw() };
    $('#so').onchange = e => { st.sort = e.target.value; st.dir = st.sort == 'lvl' ? -1 : 1; save(); draw() };
    $('#mu').onchange = e => { st.mundo = e.target.value; draw() };
    const g = $('#gr');
    g.addEventListener('dragstart', e => { const c = e.target.closest('.sc'); if (!c) return; drag = c.dataset.id; c.classList.add('dgd'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag) });
    g.addEventListener('dragover', e => { if (!drag) return; e.preventDefault(); g.querySelectorAll('.ov').forEach(x => x.classList.remove('ov')); e.target.closest('.sc')?.classList.add('ov') });
    g.addEventListener('dragend', () => { drag = null; draw() });
    g.addEventListener('drop', e => { e.preventDefault(); const t = e.target.closest('.sc'); if (!drag || !t || t.dataset.id == drag) return; const o = full().filter(i => i != drag); o.splice(o.indexOf(t.dataset.id), 0, drag); drag = null; saveOrder(o) });
    act({
        dir: () => { st.dir *= -1; save(); draw() },
        pf: t => { st.perfil = t.dataset.v; document.querySelectorAll('#ch button').forEach(b => b.classList.toggle('on', b == t)); draw() },
        mvl: t => move(t.dataset.id, -1), mvr: t => move(t.dataset.id, 1),
        del: t => confirm('Excluir esta ficha?') && deleteDoc(doc(db, 'sheets', t.dataset.id))
    })
});
