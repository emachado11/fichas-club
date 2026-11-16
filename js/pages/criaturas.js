import { guard, page, act, $, esc, err, toast } from '../common.js?v=12';
import { db, collection, query, where, onSnapshot, deleteDoc, doc, getDoc } from '../firebase.js';
import { fab, skel } from '../ui.js?v=2';

const TYPES = ['conhecimento', 'morte', 'sangue', 'energia', 'medo'];
const SORTS = { az: 'Ordem alfabética', pv: 'Pontos de Vida' };

guard(u => {
    let mine = [], catalog = [], catalogError = '', state = { q: '', elements: [], source: 'todos', sort: 'az', dir: 1, pvMin: '', pvMax: '' };
    page('Criaturas', `<div class="creature-admin-actions"><a id=creature-admin-link class="g btn" href=criaturas-admin.html hidden>Gerenciar catálogo padrão</a></div><div class="tb creature-list-toolbar"><input type=search id=creature-q placeholder="Buscar criatura…" aria-label="Buscar criatura"><select id=creature-source aria-label="Filtrar por origem"><option value=todos>Todas as criaturas</option><option value=catalog>Padrão do app</option><option value=mine>Minhas criaturas</option></select><input id=creature-pv-min type=number min=1 placeholder="PV mín." aria-label="PV mínimo"><input id=creature-pv-max type=number min=1 placeholder="PV máx." aria-label="PV máximo"><select id=creature-sort aria-label="Ordenar criaturas">${Object.entries(SORTS).map(([key, label]) => `<option value=${key}>${label}</option>`).join('')}</select><button class=g id=creature-dir data-a=dir title="Inverter ordem"></button></div><div class="chips tb creature-element-filters" id=creature-element-filters role=group aria-label="Filtrar por elementos"><button class=on data-a=elementFilter data-v=todos aria-pressed=true>Todos</button>${TYPES.map(element => `<button data-a=elementFilter data-v=${element} aria-pressed=false>${element[0].toUpperCase() + element.slice(1)}</button>`).join('')}</div><div id=creature-catalog-status></div>
            <div id=creature-grid class=grid>${skel(6)}</div>${fab([{ href: 'criatura.html', label: 'Nova criatura' }])}`, u);
    const elementsOf = creature => Array.isArray(creature.elements) ? creature.elements : creature.type ? [creature.type] : [];
    const getAll = () => [...mine.map(creature => ({ ...creature, source: 'mine' })), ...catalog.map(creature => ({ ...creature, source: 'catalog' }))];
    const draw = () => {
        const allCreatures = getAll();
        const creatures = allCreatures.filter(creature => (state.source === 'todos' || creature.source === state.source) && (!state.elements.length || state.elements.some(element => elementsOf(creature).includes(element))) && (!state.q || `${creature.name} ${elementsOf(creature).join(' ')}`.toLowerCase().includes(state.q)) && (!state.pvMin || Number(creature.pv) >= Number(state.pvMin)) && (!state.pvMax || Number(creature.pv) <= Number(state.pvMax)));
        creatures.sort((a, b) => (state.sort === 'az' ? a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) : Number(a.pv) - Number(b.pv)) * state.dir);
        $('#creature-dir').textContent = state.dir === 1 ? (state.sort === 'pv' ? '↑ Menor PV' : '↑ Crescente') : (state.sort === 'pv' ? '↓ Maior PV' : '↓ Decrescente');
        $('#creature-grid').innerHTML = creatures.map(creature => {
            const href = creature.source === 'catalog' ? `criatura.html?catalogId=${encodeURIComponent(creature.id)}` : `criatura.html?id=${encodeURIComponent(creature.id)}`;
            const sourceLabel = creature.source === 'catalog' ? 'Padrão do app' : 'Minha criatura';
            return `<article class="sc creature-sheet-card"><a class=creature-sheet-link href="${href}"><div class=scp>${creature.photo ? `<img src="${esc(creature.photo)}" alt="" loading=lazy>` : esc((creature.name || '?').trim().charAt(0).toUpperCase())}</div><div class=scb><b>${esc(creature.name)}</b><small class=creature-source-label>${sourceLabel}</small><div class=creature-element-list>${elementsOf(creature).map(element => `<span class=element-chip data-element="${esc(element)}">${esc(element)}</span>`).join('') || '<span class=hint>Sem elemento</span>'}</div><div class=scs><span>PV ${creature.pv}</span><span>F d${[4, 6, 8, 10, 12, 20][creature.attributes?.f || 0]}</span><span>M d${[4, 6, 8, 10, 12, 20][creature.attributes?.m || 0]}</span><span>E d${[4, 6, 8, 10, 12, 20][creature.attributes?.e || 0]}</span></div></div></a>${creature.source === 'mine' ? `<button class=scx data-a=deleteCreature data-id="${esc(creature.id)}" aria-label="Excluir ${esc(creature.name)}" title="Excluir">×</button>` : ''}</article>`
        }).join('') || `<div class=empty-s style="grid-column:1/-1"><p>${allCreatures.length ? 'Nenhuma criatura com esses filtros.' : 'Nenhuma criatura cadastrada ainda.'}</p>${allCreatures.length ? '' : '<p>A biblioteca padrão ainda não tem criaturas.</p><p><a href=criatura.html>Criar a primeira criatura personalizada</a></p>'}</div>`;
        document.querySelectorAll('#creature-element-filters [data-v]').forEach(button => {
            const active = button.dataset.v === 'todos' ? !state.elements.length : state.elements.includes(button.dataset.v);
            button.classList.toggle('on', active); button.setAttribute('aria-pressed', active)
        });
        $('#creature-catalog-status').innerHTML = catalogError ? `<p class=hint>Não foi possível carregar o catálogo padrão: ${esc(err(catalogError))}</p>` : ''
    };
    onSnapshot(query(collection(db, 'creatures'), where('owner', '==', u.uid)), snapshot => { mine = snapshot.docs.map(item => ({ id: item.id, ...item.data() })); draw() }, error => {
        console.error('Falha ao carregar criaturas', { code: error?.code, message: error?.message });
        $('#creature-grid').innerHTML = `<p class=er>Falha ao carregar criaturas: ${esc(err(error))}</p>`
    });
    onSnapshot(collection(db, 'creatureCatalog'), snapshot => { catalog = snapshot.docs.map(item => ({ id: item.id, ...item.data() })); catalogError = ''; draw() }, error => {
        console.error('Falha ao carregar catálogo padrão de criaturas', { code: error?.code, message: error?.message });
        catalogError = error; draw()
    });
    getDoc(doc(db, 'profiles', u.uid)).then(snapshot => {
        if (snapshot.exists() && snapshot.data().admin === true) $('#creature-admin-link').hidden = false
    }).catch(() => { });
    $('#creature-q').oninput = event => { state.q = event.target.value.trim().toLowerCase(); draw() };
    $('#creature-source').onchange = event => { state.source = event.target.value; draw() };
    $('#creature-pv-min').oninput = event => { state.pvMin = event.target.value; draw() };
    $('#creature-pv-max').oninput = event => { state.pvMax = event.target.value; draw() };
    $('#creature-sort').onchange = event => { state.sort = event.target.value; state.dir = 1; draw() };
    act({ deleteCreature: async button => {
        const creature = mine.find(item => item.id === button.dataset.id);
        if (creature && confirm(`Excluir a ficha de ${creature.name}?`)) await deleteDoc(doc(db, 'creatures', creature.id))
    }, dir: () => { state.dir *= -1; draw() }, elementFilter: button => {
        const element = button.dataset.v;
        if (element === 'todos') state.elements = [];
        else state.elements = state.elements.includes(element) ? state.elements.filter(value => value !== element) : [...state.elements, element];
        draw()
    } })
});