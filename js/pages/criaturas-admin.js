import { guard, page, act, $, esc, err, toast, D, rd } from '../common.js?v=13';
import { db, doc, getDoc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp } from '../firebase.js';
import { dieIcon } from '../dice.js?v=7';
import { openCropper } from '../cropper.js?v=2';

const ELEMENTS = ['conhecimento', 'morte', 'sangue', 'energia', 'medo'];
const ATTRIBUTES = [['f', 'Físico'], ['m', 'Mente'], ['e', 'Emoção']];
const blankCreature = () => ({ name: '', pv: 10, attributes: { f: 0, m: 0, e: 0 }, elements: [], skills: [], photo: '', actions: [] });
const validDie = value => Number.isInteger(value) && value >= 0 && value < D.length;
const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

guard(async user => {
    try {
        const profile = await getDoc(doc(db, 'profiles', user.uid));
        if (!profile.exists() || profile.data().admin !== true) {
            page('Acesso restrito', '<p class=hint>Esta página é exclusiva para administradores do catálogo.</p><a href=criaturas.html>Voltar às criaturas</a>', user);
            return
        }
    } catch (error) {
        page('Acesso restrito', `<p class=er>Não foi possível verificar o acesso: ${esc(err(error))}</p><a href=criaturas.html>Voltar às criaturas</a>`, user);
        return
    }

    let all = [], editId = '', draft = blankCreature();
    page('Catálogo padrão', `<div class=creature-admin-layout><section class="pn creature-admin-list-panel"><div class=creature-admin-list-head><label class=fld><span>Buscar no catálogo</span><input id=admin-creature-q type=search placeholder="Nome ou elemento"></label><button data-a=newGlobalCreature>Nova criatura</button></div><div id=admin-creature-error></div><div id=admin-creature-list class=creature-admin-list><p class=hint>Carregando catálogo…</p></div></section><section id=admin-creature-editor class="pn creature-admin-editor"></section></div>`, user);

    const syncForm = () => {
        draft.name = $('#admin-creature-name')?.value.trim() ?? draft.name;
        const pv = $('#admin-creature-pv')?.value;
        if (pv !== undefined && pv !== '') draft.pv = Number(pv);
        draft.photo = $('#admin-creature-photo')?.value.trim() || draft.photo;
        draft.attributes = Object.fromEntries(ATTRIBUTES.map(([key]) => [key, Number($(`[data-admin-attribute="${key}"]`)?.value ?? draft.attributes[key])]));
        draft.elements = [...document.querySelectorAll('[data-admin-element]:checked')].map(input => input.value);
        draft.skills = draft.skills.map((skill, index) => ({ name: $(`[data-admin-skill-name="${index}"]`)?.value.trim() ?? skill.name, die: Number($(`[data-admin-skill-die="${index}"]`)?.value ?? skill.die) }));
        draft.actions = draft.actions.map((action, index) => ({ name: $(`[data-admin-action-name="${index}"]`)?.value.trim() ?? action.name, description: $(`[data-admin-action-description="${index}"]`)?.value.trim() ?? action.description }));
        return draft
    };
    const renderEditor = () => {
        const dieSelect = (step, key = '', index = '') => `<select ${index === '' ? `data-admin-attribute="${key}"` : `data-admin-skill-die="${index}"`}>${D.map((die, option) => `<option value=${option} ${option === step ? 'selected' : ''}>d${die}</option>`).join('')}</select>`;
        $('#admin-creature-editor').innerHTML = `<div class=creature-admin-editor-head><div><h3>${editId ? 'Editar criatura padrão' : 'Nova criatura padrão'}</h3><p class=hint>${editId ? `ID: ${esc(editId)}` : 'O ID será criado a partir do nome.'}</p></div>${editId ? '<button class=g data-a=clearGlobalEditor>Nova</button>' : ''}</div>
          <label class=fld><span>Nome</span><input id=admin-creature-name maxlength=80 value="${esc(draft.name)}" required></label>
          <label class=fld><span>Pontos de Vida (PV)</span><input id=admin-creature-pv type=number min=1 max=1000000 value="${draft.pv}" required></label>
          <div class=fld><span>Imagem</span><div class=creature-image-row><div class=creature-image-preview>${draft.photo ? `<img src="${esc(draft.photo)}" alt="Prévia">` : '<span>Sem imagem</span>'}</div><div class=creature-image-fields><input id=admin-creature-photo type=text placeholder="URL da imagem" value="${esc(draft.photo.startsWith('data:') ? '' : draft.photo)}"><label class="g btn creature-upload-button">Escolher arquivo<input id=admin-creature-file type=file accept="image/*" aria-label="Enviar imagem"></label></div></div></div>
          <section><h4>Atributos</h4><div class=creature-attributes>${ATTRIBUTES.map(([key, label]) => `<label class=creature-attribute><b>${label}</b>${dieSelect(draft.attributes[key], key)}</label>`).join('')}</div></section>
          <section><h4>Elementos</h4><div class=creature-element-options>${ELEMENTS.map(element => `<label><input type=checkbox data-admin-element value=${element} ${draft.elements.includes(element) ? 'checked' : ''}> <span class=element-chip data-element=${element}>${element}</span></label>`).join('')}</div><small class=hint>Escolha de 1 a 3 elementos.</small></section>
          <section><div class=row style="justify-content:space-between"><h4>Perícias</h4><button class=g data-a=addGlobalSkill aria-label="Adicionar perícia">+</button></div><div class=creature-skill-list>${draft.skills.map((skill, index) => `<div class=creature-skill-row><input data-admin-skill-name=${index} maxlength=60 value="${esc(skill.name)}" placeholder="Nome da perícia">${dieSelect(skill.die, '', index)}<button class=g data-a=removeGlobalSkill data-i=${index} aria-label="Remover perícia">×</button></div>`).join('')}</div></section>
          <section><div class=row style="justify-content:space-between"><h4>Ações</h4><button class=g data-a=addGlobalAction aria-label="Adicionar ação">+</button></div><div class=creature-action-list>${draft.actions.map((action, index) => `<article class=creature-action-card><label class=fld><span>Nome da ação</span><input data-admin-action-name=${index} maxlength=80 value="${esc(action.name)}" placeholder="Nome"></label><label class=fld><span>Descrição</span><textarea data-admin-action-description=${index} rows=4 maxlength=2000 placeholder="Descrição">${esc(action.description)}</textarea></label><button class="g creature-remove-action" data-a=removeGlobalAction data-i=${index}>Remover ação</button></article>`).join('')}</div></section>
          <div class=row><button data-a=saveGlobalCreature>Salvar no catálogo</button>${editId ? `<button class=g data-a=deleteGlobalCreature data-id="${esc(editId)}">Excluir</button>` : ''}</div>`
    };
    const drawList = () => {
        const q = $('#admin-creature-q').value.trim().toLowerCase();
        const items = all.filter(item => !q || `${item.name} ${(item.elements || []).join(' ')}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
        $('#admin-creature-list').innerHTML = items.map(item => `<button class="cat creature-admin-item ${item.id === editId ? 'on' : ''}" data-a=editGlobalCreature data-id="${esc(item.id)}"><b>${esc(item.name)}</b><small>${esc((item.elements || []).join(' · '))} · PV ${Number(item.pv) || 0}</small></button>`).join('') || '<p class=hint>Nenhuma criatura padrão. Use “Nova criatura” para começar.</p>'
    };
    $('#admin-creature-q').oninput = drawList;
    $('#admin-creature-editor').addEventListener('input', event => {
        if (event.target.id === 'admin-creature-photo') {
            draft.photo = event.target.value.trim();
            $('.creature-image-preview').innerHTML = draft.photo ? `<img src="${esc(draft.photo)}" alt="Prévia">` : '<span>Sem imagem</span>'
        }
    });
    $('#admin-creature-editor').addEventListener('change', event => {
        if (event.target.matches('[data-admin-element]') && event.target.checked && document.querySelectorAll('[data-admin-element]:checked').length > 3) {
            event.target.checked = false; toast('Escolha até 3 elementos.', 1)
        }
        if (event.target.id === 'admin-creature-file') {
            const file = event.target.files?.[0]; if (!file) return;
            syncForm();
            rd(file).then(async source => {
                const photo = await openCropper(source, { aspect: 1, round: false, out: [384, 384], title: 'Recortar imagem da criatura' });
                if (photo) { draft.photo = photo; renderEditor() }
            }).catch(error => toast(err(error), 1))
        }
    });
    onSnapshot(collection(db, 'creatureCatalog'), snapshot => { all = snapshot.docs.map(item => ({ id: item.id, ...item.data() })); drawList(); $('#admin-creature-error').innerHTML = '' }, error => {
        console.error('Falha ao carregar o catálogo padrão', { code: error?.code, message: error?.message });
        $('#admin-creature-error').innerHTML = `<p class=er>Falha ao carregar: ${esc(err(error))}</p>`
    });
    renderEditor();

    act({
        newGlobalCreature: () => { editId = ''; draft = blankCreature(); renderEditor(); drawList() },
        clearGlobalEditor: () => { editId = ''; draft = blankCreature(); renderEditor(); drawList() },
        editGlobalCreature: button => {
            const item = all.find(creature => creature.id === button.dataset.id);
            if (!item) return;
            editId = item.id;
            draft = { ...blankCreature(), ...item, attributes: { f: 0, m: 0, e: 0, ...(item.attributes || {}) }, elements: [...(item.elements || [])], skills: (item.skills || []).map(skill => ({ ...skill })), actions: (item.actions || []).map(action => ({ ...action })) };
            renderEditor(); drawList()
        },
        addGlobalSkill: () => { syncForm(); draft.skills.push({ name: '', die: 0 }); renderEditor() },
        removeGlobalSkill: button => { syncForm(); draft.skills.splice(Number(button.dataset.i), 1); renderEditor() },
        addGlobalAction: () => { syncForm(); draft.actions.push({ name: '', description: '' }); renderEditor() },
        removeGlobalAction: button => { syncForm(); draft.actions.splice(Number(button.dataset.i), 1); renderEditor() },
        saveGlobalCreature: async () => {
            syncForm();
            draft.skills = draft.skills.map(skill => ({ name: skill.name.trim(), die: Number(skill.die) })).filter(skill => skill.name);
            draft.actions = draft.actions.map(action => ({ name: action.name.trim(), description: action.description.trim() })).filter(action => action.name || action.description);
            if (!draft.name || !Number.isSafeInteger(draft.pv) || draft.pv < 1 || draft.pv > 1000000 || draft.elements.length < 1 || draft.elements.length > 3 || !ATTRIBUTES.every(([key]) => validDie(draft.attributes[key])) || draft.skills.some(skill => !validDie(skill.die)) || draft.actions.some(action => !action.name || !action.description)) return toast('Confira nome, PV, atributos, 1 a 3 elementos, perícias e ações.', 1);
            let id = editId;
            if (!id) {
                const base = slug(draft.name) || 'criatura';
                id = base;
                let suffix = 2;
                while (all.some(item => item.id === id) || (await getDoc(doc(db, 'creatureCatalog', id))).exists()) id = `${base}-${suffix++}`
            }
            const ref = doc(db, 'creatureCatalog', id), existing = all.find(item => item.id === id);
            const data = { name: draft.name.trim(), pv: draft.pv, attributes: draft.attributes, elements: draft.elements, skills: draft.skills, photo: draft.photo, actions: draft.actions, schemaVersion: 1, updatedAt: serverTimestamp() };
            if (existing) await updateDoc(ref, data);
            else await setDoc(ref, { ...data, createdAt: serverTimestamp() });
            editId = id; toast('Criatura padrão salva.');
        },
        deleteGlobalCreature: async button => {
            const item = all.find(creature => creature.id === button.dataset.id);
            if (!item || !confirm(`Excluir ${item.name} do catálogo padrão?`)) return;
            await deleteDoc(doc(db, 'creatureCatalog', item.id));
            editId = ''; draft = blankCreature(); renderEditor()
        }
    })
});