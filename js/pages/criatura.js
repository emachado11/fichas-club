import { guard, page, act, $, qs, esc, err, toast, D, load, rd, shrink } from '../common.js?v=12';
import { db, doc, collection, getDoc, setDoc, updateDoc, serverTimestamp } from '../firebase.js';
import { dieIcon } from '../dice.js?v=7';

const TYPES = ['conhecimento', 'morte', 'sangue', 'energia', 'medo'];
const ATTRS = [['f', 'Físico'], ['m', 'Mente'], ['e', 'Emoção']];
const validStep = value => Number.isInteger(value) && value >= 0 && value < D.length;

guard(async user => {
    const id = qs('id'), catalogId = qs('catalogId'), readOnly = !!catalogId;
    let creature = { name: '', pv: 10, attributes: { f: 0, m: 0, e: 0 }, elements: ['conhecimento'], skills: [], photo: '', actions: [] };
    if (id || catalogId) {
        let snapshot;
        try { snapshot = await getDoc(doc(db, readOnly ? 'creatureCatalog' : 'creatures', catalogId || id)) }
        catch (error) {
            page('Criaturas', `<p class=er>Falha ao carregar ficha: ${esc(err(error))}</p><a href=criaturas.html>Voltar às criaturas</a>`, user);
            return
        }
        if (!snapshot.exists() || (!readOnly && snapshot.data().owner !== user.uid)) {
            page('Criaturas', '<p class=er>Ficha não encontrada.</p><a href=criaturas.html>Voltar às criaturas</a>', user);
            return
        }
        const saved = snapshot.data();
        const actions = Array.isArray(saved.actions) ? saved.actions : saved.actions ? [{ name: 'Ação', description: String(saved.actions) }] : [];
        creature = {
            ...creature, ...saved,
            attributes: Object.fromEntries(ATTRS.map(([key]) => [key, validStep(saved.attributes?.[key]) ? saved.attributes[key] : 0])),
            elements: Array.isArray(saved.elements) ? saved.elements.filter(element => TYPES.includes(element)).slice(0, 3) : [TYPES.includes(saved.type) ? saved.type : 'conhecimento'],
            skills: Array.isArray(saved.skills) ? saved.skills.filter(skill => skill && typeof skill === 'object').map(skill => ({ name: String(skill.name || ''), die: validStep(skill.die) ? skill.die : 0 })) : [],
            photo: String(saved.photo || ''),
            actions: actions.map(action => ({ name: String(action.name || ''), description: String(action.description || '') }))
        }
    }
    page(readOnly ? 'Criatura padrão' : id ? 'Editar criatura' : 'Nova criatura', `<div id=creature-editor></div>`, user);
        const dieControl = (step, key) => `<div class=creature-die-control><button class=g data-a=attrStep data-k=${key} data-d=-1 aria-label="Diminuir dado">−</button>${dieIcon(D[step], D[step])}<button class=g data-a=attrStep data-k=${key} data-d=1 aria-label="Aumentar dado">+</button></div>`;
        const skillDieControl = step => `<div class=creature-die-control><button class=g data-a=skillStep data-d=-1 aria-label="Diminuir dado da perícia">−</button>${dieIcon(D[step], D[step])}<button class=g data-a=skillStep data-d=1 aria-label="Aumentar dado da perícia">+</button></div>`;
    const draw = () => {
                $('#creature-editor').innerHTML = `<div class=creature-editor><section class=pn><label class=fld><span>Nome</span><input id=creature-name maxlength=80 value="${esc(creature.name)}" required></label><label class=fld><span>Pontos de Vida (PV)</span><input id=creature-pv type=number min=1 max=1000000 step=1 value="${creature.pv}" required></label><div class=fld><span>Imagem</span><div class=creature-image-row><div class=creature-image-preview>${creature.photo ? `<img src="${esc(creature.photo)}" alt="Prévia da criatura">` : '<span>Sem imagem</span>'}</div><div class=creature-image-fields><input id=creature-photo type=text placeholder="URL da imagem" value="${esc(creature.photo.startsWith('data:') ? '' : creature.photo)}" aria-label="URL da imagem"><label class="g btn creature-upload-button">Escolher arquivo<input id=creature-photo-file type=file accept="image/*" aria-label="Enviar imagem"></label></div></div></div></section>
          <section class=pn><h3>Atributos</h3><div class=creature-attributes>${ATTRS.map(([key, label]) => `<div class=creature-attribute><b>${label}</b>${dieControl(creature.attributes[key], key)}</div>`).join('')}</div></section>
          <section class=pn><h3>Elementos</h3><div class=creature-element-options>${TYPES.map(type => `<label><input type=checkbox value=${type} data-element ${creature.elements.includes(type) ? 'checked' : ''}> ${type[0].toUpperCase() + type.slice(1)}</label>`).join('')}</div><small class=hint>Escolha de 1 a 3 elementos.</small></section>
                    <section class=pn><h3>Perícias</h3><div class=creature-skill-list>${creature.skills.map((skill, index) => `<div class=creature-skill-row><input data-skill-name=${index} maxlength=60 value="${esc(skill.name)}" placeholder="Nome da perícia" aria-label="Nome da perícia ${index + 1}">${skillDieControl(skill.die)}<button class="g creature-remove-skill" data-a=removeSkill data-i=${index} aria-label="Remover perícia">×</button></div>`).join('')}</div><button class="g creature-add-skill" data-a=addSkill>+ Adicionar perícia</button></section>
          <section class=pn><div class=row style="justify-content:space-between"><h3>Ações</h3><button class=g data-a=addAction aria-label="Adicionar ação" title="Adicionar ação">+</button></div><div class=creature-action-list>${creature.actions.map((action, index) => `<article class=creature-action-card><label class=fld><span>Nome da ação</span><input data-action-name=${index} maxlength=80 value="${esc(action.name)}" placeholder="Ex.: Mordida"></label><label class=fld><span>Descrição da ação</span><textarea data-action-description=${index} rows=3 maxlength=1200 placeholder="Descreva a ação">${esc(action.description)}</textarea></label><button class="g creature-remove-action" data-a=removeAction data-i=${index} aria-label="Remover ação">Remover ação</button></article>`).join('') || '<p class=hint>Nenhuma ação adicionada.</p>'}</div></section>
          <div class=creature-editor-actions><a class="g btn" href=criaturas.html>Voltar</a><button data-a=saveCreature>Salvar ficha</button></div></div>`
    };
    draw();
    if (readOnly) {
        $('#creature-editor').insertAdjacentHTML('afterbegin', '<p class=hint>Criatura padrão do app · somente leitura.</p>');
        $('#creature-editor').querySelectorAll('input,textarea,select,button').forEach(control => { control.disabled = true });
        $('#creature-editor').querySelectorAll('.creature-add-skill,.creature-remove-skill,.creature-remove-action,[data-a=addAction],[data-a=saveCreature],.creature-upload-button').forEach(control => { control.hidden = true })
    }
    const syncForm = () => {
        creature.name = $('#creature-name')?.value ?? creature.name;
        const pv = $('#creature-pv')?.value;
        if (pv !== undefined && pv !== '') creature.pv = Number(pv);
        creature.photo = $('#creature-photo')?.value.trim() || creature.photo;
        creature.skills.forEach((skill, index) => { skill.name = $(`[data-skill-name="${index}"]`)?.value ?? skill.name });
        creature.actions.forEach((action, index) => {
            action.name = $(`[data-action-name="${index}"]`)?.value ?? action.name;
            action.description = $(`[data-action-description="${index}"]`)?.value ?? action.description
        });
        creature.elements = [...document.querySelectorAll('[data-element]:checked')].map(input => input.value)
    };
    $('#creature-editor').addEventListener('input', event => {
        if (event.target.id === 'creature-name') creature.name = event.target.value;
        if (event.target.id === 'creature-pv') creature.pv = Number(event.target.value);
        if (event.target.id === 'creature-photo') {
            creature.photo = event.target.value.trim();
            const preview = $('.creature-image-preview');
            preview.innerHTML = creature.photo ? `<img src="${esc(creature.photo)}" alt="Prévia da criatura">` : '<span>Sem imagem</span>'
        }
        if (event.target.matches('[data-skill-name]')) {
            const skill = creature.skills[Number(event.target.dataset.skillName)];
            if (skill) skill.name = event.target.value
        }
        if (event.target.matches('[data-action-name]')) creature.actions[Number(event.target.dataset.actionName)].name = event.target.value;
        if (event.target.matches('[data-action-description]')) creature.actions[Number(event.target.dataset.actionDescription)].description = event.target.value
    });
    $('#creature-editor').addEventListener('change', event => {
        if (event.target.matches('[data-element]')) {
            const checked = [...document.querySelectorAll('[data-element]:checked')];
            if (checked.length > 3) { event.target.checked = false; toast('Escolha no máximo 3 elementos.', 1) }
            creature.elements = [...document.querySelectorAll('[data-element]:checked')].map(input => input.value)
        }
        if (event.target.id === 'creature-photo-file') {
            const file = event.target.files?.[0];
            if (!file) return;
            rd(file).then(async source => { syncForm(); creature.photo = shrink(await load(source), source, 512); draw() }).catch(error => toast(err(error), 1))
        }
    });
    act({
        attrStep: button => { syncForm(); const key = button.dataset.k; creature.attributes[key] = Math.max(0, Math.min(D.length - 1, creature.attributes[key] + Number(button.dataset.d))); draw() },
        skillStep: button => {
            syncForm();
            const input = button.closest('.creature-skill-row')?.querySelector('[data-skill-name]');
            const index = Number(input?.dataset.skillName), skill = creature.skills[index];
            if (!input || !Number.isInteger(index) || !skill) return toast('Esta perícia não está mais disponível.', 1);
            skill.die = Math.max(0, Math.min(D.length - 1, skill.die + Number(button.dataset.d))); draw()
        },
        addSkill: () => { syncForm(); creature.skills.push({ name: '', die: 0 }); draw(); $('#creature-editor .creature-skill-row:last-child [data-skill-name]')?.focus() },
        removeSkill: button => { syncForm(); creature.skills.splice(Number(button.dataset.i), 1); draw() },
        addAction: () => { syncForm(); creature.actions.push({ name: '', description: '' }); draw(); $('#creature-editor .creature-action-card:last-child [data-action-name]')?.focus() },
        removeAction: button => { syncForm(); creature.actions.splice(Number(button.dataset.i), 1); draw() },
        saveCreature: async () => {
            if (readOnly) return toast('As criaturas padrão não podem ser editadas.', 1);
            syncForm();
            creature.name = creature.name.trim();
            creature.actions = creature.actions.map(action => ({ name: action.name.trim(), description: action.description.trim() })).filter(action => action.name || action.description);
            creature.skills = creature.skills.map(skill => ({ name: skill.name.trim(), die: skill.die })).filter(skill => skill.name);
            if (!creature.name || !Number.isSafeInteger(creature.pv) || creature.pv < 1 || creature.pv > 1000000 || creature.elements.length < 1 || creature.elements.length > 3 || !ATTRS.every(([key]) => validStep(creature.attributes[key])) || creature.skills.some(skill => !validStep(skill.die)) || creature.actions.some(action => !action.name || !action.description)) return toast('Confira nome, PV, 1 a 3 elementos, perícias e ações.', 1);
            const data = { name: creature.name, pv: creature.pv, attributes: creature.attributes, elements: creature.elements, skills: creature.skills, photo: creature.photo, actions: creature.actions, owner: user.uid, updatedAt: serverTimestamp() };
            if (id) await updateDoc(doc(db, 'creatures', id), data);
            else await setDoc(doc(collection(db, 'creatures')), { ...data, createdAt: serverTimestamp() });
            toast('Ficha salva.'); location.href = 'criaturas.html'
        }
    })
});