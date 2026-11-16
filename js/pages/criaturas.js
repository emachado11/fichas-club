import { guard, page, act, $, esc, err, toast } from '../common.js?v=12';
import { db, collection, query, where, onSnapshot, deleteDoc, doc } from '../firebase.js';
import { fab, skel } from '../ui.js?v=2';

const TYPES = ['conhecimento', 'morte', 'sangue', 'energia', 'medo'];
const SORTS = { az: 'Ordem alfabética', pv: 'Pontos de Vida' };

guard(u => {
        let all = [], state = { q: '', element: 'todos', sort: 'az', dir: 1, pvMin: '', pvMax: '' };
        page('Criaturas', `<div class=tb><input type=search id=creature-q placeholder="Buscar criatura…" aria-label="Buscar criatura"><select id=creature-element aria-label="Filtrar por elemento"><option value=todos>Todos os elementos</option>${TYPES.map(element => `<option value=${element}>${element[0].toUpperCase() + element.slice(1)}</option>`).join('')}</select><input id=creature-pv-min type=number min=1 placeholder="PV mín." aria-label="PV mínimo"><input id=creature-pv-max type=number min=1 placeholder="PV máx." aria-label="PV máximo"><select id=creature-sort aria-label="Ordenar criaturas">${Object.entries(SORTS).map(([key, label]) => `<option value=${key}>${label}</option>`).join('')}</select><button class=g id=creature-dir data-a=dir title="Inverter ordem"></button></div>
            <div id=creature-grid class=grid>${skel(6)}</div>${fab([{ href: 'criatura.html', label: 'Nova criatura' }])}`, u);
    const elementsOf = creature => Array.isArray(creature.elements) ? creature.elements : creature.type ? [creature.type] : [];
    const draw = () => {
        const creatures = all.filter(creature => (state.element === 'todos' || elementsOf(creature).includes(state.element)) && (!state.q || `${creature.name} ${elementsOf(creature).join(' ')}`.toLowerCase().includes(state.q)) && (!state.pvMin || Number(creature.pv) >= Number(state.pvMin)) && (!state.pvMax || Number(creature.pv) <= Number(state.pvMax)));
        creatures.sort((a, b) => (state.sort === 'az' ? a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) : Number(a.pv) - Number(b.pv)) * state.dir);
        $('#creature-dir').textContent = state.dir === 1 ? (state.sort === 'pv' ? '↑ Menor PV' : '↑ Crescente') : (state.sort === 'pv' ? '↓ Maior PV' : '↓ Decrescente');
        $('#creature-grid').innerHTML = creatures.map(creature => `<article class="sc creature-sheet-card"><a class=creature-sheet-link href="criatura.html?id=${encodeURIComponent(creature.id)}"><div class=scp>${creature.photo ? `<img src="${esc(creature.photo)}" alt="" loading=lazy>` : esc((creature.name || '?').trim().charAt(0).toUpperCase())}</div><div class=scb><b>${esc(creature.name)}</b><div class=creature-element-list>${elementsOf(creature).map(element => `<span class=element-chip data-element="${esc(element)}">${esc(element)}</span>`).join('') || '<span class=hint>Sem elemento</span>'}</div><div class=scs><span>PV ${creature.pv}</span><span>F d${[4, 6, 8, 10, 12, 20][creature.attributes?.f || 0]}</span><span>M d${[4, 6, 8, 10, 12, 20][creature.attributes?.m || 0]}</span><span>E d${[4, 6, 8, 10, 12, 20][creature.attributes?.e || 0]}</span></div></div></a><button class=scx data-a=deleteCreature data-id="${esc(creature.id)}" aria-label="Excluir ${esc(creature.name)}" title="Excluir">×</button></article>`).join('') || `<div class=empty-s style="grid-column:1/-1"><p>${all.length ? 'Nenhuma criatura com esses filtros.' : 'Nenhuma criatura ainda.'}</p>${all.length ? '' : '<p><a href=criatura.html>Criar a primeira criatura</a></p>'}</div>`
    };
    onSnapshot(query(collection(db, 'creatures'), where('owner', '==', u.uid)), snapshot => { all = snapshot.docs.map(item => ({ id: item.id, ...item.data() })); draw() }, error => {
        console.error('Falha ao carregar criaturas', { code: error?.code, message: error?.message });
        $('#creature-grid').innerHTML = `<p class=er>Falha ao carregar criaturas: ${esc(err(error))}</p>`
    });
    $('#creature-q').oninput = event => { state.q = event.target.value.trim().toLowerCase(); draw() };
    $('#creature-element').onchange = event => { state.element = event.target.value; draw() };
    $('#creature-pv-min').oninput = event => { state.pvMin = event.target.value; draw() };
    $('#creature-pv-max').oninput = event => { state.pvMax = event.target.value; draw() };
    $('#creature-sort').onchange = event => { state.sort = event.target.value; state.dir = 1; draw() };
    act({ deleteCreature: async button => {
        const creature = all.find(item => item.id === button.dataset.id);
        if (creature && confirm(`Excluir a ficha de ${creature.name}?`)) await deleteDoc(doc(db, 'creatures', creature.id))
    }, dir: () => { state.dir *= -1; draw() } })
});