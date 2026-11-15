import { track, guard, page, act, qs, $, esc, clip, err, modal, close, face, cropCss, load, rd, shrink, jpg, toast } from '../common.js?v=10';
import { db, doc, collection, query, where, onSnapshot, getDoc, getDocs, updateDoc, setDoc, addDoc, deleteDoc, serverTimestamp, arrayRemove, deleteField, writeBatch } from '../firebase.js';
import { getProfile, findUser, sendInvite, sendFriendRequest, removeFriend, watchFriends, trackCampaign, avatar } from '../profile.js?v=4';
import { pickImage, openCropper } from '../cropper.js?v=2';
const id = qs('id'); let U;

async function removePlayer(campaignId, playerUid) {
    const q = await getDocs(query(collection(db, 'sheets'), where('campaign', '==', campaignId)));
    const sheets = q.docs.filter(d => d.data().owner === playerUid);
    for (let i = 0; i < sheets.length; i += 450) {
        const batch = writeBatch(db);
        sheets.slice(i, i + 450).forEach(sheet => batch.update(sheet.ref, { campaign: deleteField() }));
        await batch.commit()
    }
    await updateDoc(doc(db, 'campaigns', campaignId), { members: arrayRemove(playerUid) })
}

guard(u => {
    U = u; page('', '<div id=ct></div>', u); trackCampaign(u.uid, id);
    let c, L = [], friends = [], sent = [], people = [], campaignTab = 'jogadores', investigationBoard = null, campaignEdit = null, pendingFriendRemoval = null;
    let sharedNotes = '', personalNotes = '', combat = null, draftCombat = null, combatId = null, combatUnsub = null, draftUnsub = null, featureWatchId = null, noteTimers = {}, startingCombat = false, draftWatchStarted = false, creatureTarget = 'draft', creatureIndex = -1;
    let raf = 0, lastSig = '', lastTab = '', boardLoading = false, mstarted = false;
    /* junta várias atualizações seguidas (fichas, amigos, convites…) em um único desenho */
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw() }) };
    let contextMenu = null;
    const closeContextMenu = () => { contextMenu?.remove(); contextMenu = null };
    const openContextMenu = (e, items) => {
        e.preventDefault(); closeContextMenu();
        const menu = document.createElement('div');
        menu.className = 'ctx-menu'; menu.setAttribute('role', 'menu');
        items.forEach(({ action, label, data }) => {
            const button = document.createElement('button');
            button.type = 'button'; button.setAttribute('role', 'menuitem'); button.dataset.a = action; button.textContent = label;
            Object.entries(data || {}).forEach(([key, value]) => { button.dataset[key] = value });
            menu.append(button)
        });
        document.body.append(menu); contextMenu = menu;
        const rect = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(e.clientX, innerWidth - rect.width - 8))}px`;
        menu.style.top = `${Math.max(8, Math.min(e.clientY, innerHeight - rect.height - 8))}px`
    };
    const contextItems = target => {
        const participant = target.closest('[data-player-context]');
        if (participant) {
            const playerUid = participant.dataset.playerContext, person = people.find(p => p.uid === playerUid);
            if (playerUid === u.uid || !(c?.members || []).includes(playerUid)) return null;
            const isFriend = friends.some(friend => friend.uid === playerUid);
            const handle = '@' + (person?.username || person?.displayName || 'jogador');
            const items = [
                { action: 'friend', label: isFriend ? `Remover ${handle} dos amigos` : `Adicionar ${handle} como amigo`, data: { u: playerUid, n: handle } }
            ];
            if (c.master === u.uid) items.push({ action: 'kick', label: 'Remover jogador da campanha', data: { u: playerUid, n: person?.displayName || 'jogador' } });
            return items
        }
        const card = target.closest('[data-sheet-context]');
        if (!card) return null;
        const sheet = L.find(x => x.id === card.dataset.id);
        return sheet && (c?.master === u.uid || sheet.owner === u.uid)
            ? [{ action: 'unlink', label: 'Remover ficha da mesa', data: { id: sheet.id, n: sheet.name } }]
            : null
    };
    const showContextMenu = (e, target) => {
        const items = contextItems(target);
        if (!items) return false;
        openContextMenu(e, items);
        return true
    };
    let contextHold = null, contextHoldTimer = 0, suppressedHoldClick = null;
    const clearContextHold = () => { clearTimeout(contextHoldTimer); contextHoldTimer = 0; contextHold = null };
    track(document, 'click', e => {
        if (contextMenu?.contains(e.target)) { suppressedHoldClick = null; return }
        const target = e.target.closest?.('[data-player-context], [data-sheet-context]');
        if (target && suppressedHoldClick?.target === target && Date.now() <= suppressedHoldClick.expires) {
            suppressedHoldClick = null; e.preventDefault(); return
        }
        if (suppressedHoldClick && Date.now() > suppressedHoldClick.expires) suppressedHoldClick = null;
        if (contextMenu && !contextMenu.contains(e.target)) closeContextMenu()
    });
    track(document, 'contextmenu', e => {
        if (contextMenu && !contextMenu.contains(e.target) && !e.target.closest('[data-player-context], [data-sheet-context]')) closeContextMenu()
    });
    track(window, 'keydown', e => { if (e.key === 'Escape') closeContextMenu() });
    track($('#ct'), 'pointerdown', e => {
        if (e.pointerType === 'mouse' || e.button !== 0) return;
        const target = e.target.closest?.('[data-player-context], [data-sheet-context]');
        if (!target) return;
        clearContextHold();
        contextHold = { pointerId: e.pointerId, target, x: e.clientX, y: e.clientY };
        contextHoldTimer = setTimeout(() => {
            const hold = contextHold;
            clearContextHold();
            if (!hold?.target.isConnected) return;
            const event = { clientX: hold.x, clientY: hold.y, preventDefault() {} };
            if (showContextMenu(event, hold.target)) suppressedHoldClick = { target: hold.target, pointerId: hold.pointerId, expires: Infinity }
        }, 500)
    });
    track(document, 'pointermove', e => {
        if (contextHold && e.pointerId === contextHold.pointerId && Math.hypot(e.clientX - contextHold.x, e.clientY - contextHold.y) > 12) clearContextHold()
    });
    track(document, 'pointerup', e => {
        if (contextHold?.pointerId === e.pointerId) clearContextHold();
        if (suppressedHoldClick?.pointerId === e.pointerId) suppressedHoldClick.expires = Date.now() + 700
    });
    track(document, 'pointercancel', e => {
        if (contextHold?.pointerId === e.pointerId) clearContextHold();
        if (suppressedHoldClick?.pointerId === e.pointerId) suppressedHoldClick = null
    });
    const draw = () => {
        if (!c) return;
        const sig = JSON.stringify([c.name, c.desc, c.banner ? 1 : 0, c.master]);
        /* no quadro de investigação não redesenha a página inteira por causa de outras atualizações */
        if (campaignTab === 'investigacao' && lastTab === 'investigacao' && lastSig === sig && investigationBoard && $('#investigation-board')?.childElementCount) return;
        lastSig = sig; lastTab = campaignTab;
        const iq = $('#iq'), shared = $('#shared-notes'), personal = $('#personal-notes');
        const keep = {
            iq: iq ? { v: iq.value, f: document.activeElement === iq, s: iq.selectionStart } : null,
            shared: shared ? { v: shared.value, f: document.activeElement === shared, s: shared.selectionStart } : null,
            personal: personal ? { v: personal.value, f: document.activeElement === personal, s: personal.selectionStart } : null
        };
        const m = c.master == u.uid, v = L, mem = new Set(c.members || []), sentTo = new Set(sent.map(s => s.to));
        const playersContent = `<div class=campaign-actions><div class=campaign-actions-main>${!m && mem.has(u.uid) ? '<button class=g data-a=leave>Sair da campanha</button>' : ''}<button class=g data-a=link>Vincular uma ficha</button></div>${m ? '<button class="g campaign-settings-button" data-a=campaignSettings title="Configurações da campanha" aria-label="Configurações da campanha">⚙</button>' : ''}</div>
  <div class=pn><h3>${m ? 'Todas as fichas' : 'Fichas vinculadas'}</h3><div class="grid campaign-sheet-grid">${v.map(x => {
            const portrait = face(x);
            const canAccess = m || x.owner === u.uid;
            const card = `<div class=scp>${portrait ? `<img src="${esc(portrait)}" alt="" draggable=false loading=lazy>` : esc((x.name || '?').trim().charAt(0).toUpperCase())}</div>
    <div class=scb><b>${esc(x.name)}</b><small>${esc(x.perfil)} · Nível ${esc(x.nivel)}</small><small>${esc(x.ocup || '—')}</small><div class=scs><span>PV ${x.pv}/${x.pvMax}</span><span>PD ${x.pd}/${x.pdMax}</span></div>${canAccess ? '' : '<small class=campaign-sheet-lock>Somente visualização</small>'}</div>`;
            return `<div class="campaign-sc-wrap ${canAccess ? '' : 'is-locked'}">
   ${canAccess
                    ? `<a class=sc data-p="${esc(x.perfil)}" href="ficha.html?id=${esc(x.id)}&amp;c=${esc(id)}" data-id="${esc(x.id)}" data-sheet-context>${card}</a>`
                    : `<div class="sc campaign-sheet-locked" data-p="${esc(x.perfil)}" data-id="${esc(x.id)}" data-sheet-context aria-disabled=true title="Você não pode abrir a ficha de outro jogador.">${card}</div>`}
  </div>`
        }).join('') || '<p class=mt style="grid-column:1/-1">Nenhuma ficha vinculada.</p>'}</div></div>
  <div class=pn style="margin-top:12px"><h3>Participantes</h3><div class="row mem">${people.map(p => `<span class=row style="gap:6px" ${p.uid !== u.uid ? `data-player-context="${esc(p.uid)}"` : ''}>${avatar(p, 'sm')}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}${p.uid == c.master ? ' · mestre' : ''}</small></span></span>`).join('')}</div></div>
  ${m ? `<div class=pn style="margin-top:12px;display:grid;gap:10px"><h3>Convidar</h3>
   <div class=row style="justify-content:flex-start"><input id=iq placeholder="@usuario ou e-mail" style="flex:1 1 220px"><button data-a=sendinv>Enviar convite</button></div>
   ${friends.length ? `<div><b class=mt>Amigos</b>${friends.map(p => `<div class=frow><span class=who>${avatar(p, 'sm')}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}</small></span></span>${mem.has(p.uid) ? '<small>Já na campanha</small>' : sentTo.has(p.uid) ? '<small>Convite enviado</small>' : `<button class=g data-a=invfr data-u="${esc(p.uid)}">Convidar</button>`}</div>`).join('')}</div>` : '<p class=hint>Adicione amigos em Perfil › Amigos para convidá-los com um toque.</p>'}
   ${sent.length ? `<p class=hint>Convites pendentes: ${sent.map(s => '@' + esc(s.toName || '?')).join(', ')}</p>` : ''}
   <div><button class=g data-a=invite>Copiar link de convite</button></div></div>` : ''}`;
        const notesContent = `<div class=campaign-notes><section class=pn><h3>Anotações pessoais</h3><p class=hint>Visíveis somente para você.</p><textarea id=personal-notes rows=12 placeholder="Suas anotações nesta campanha...">${esc(personalNotes)}</textarea></section><section class=pn><h3>Anotações conjuntas</h3><p class=hint>Compartilhadas com os participantes da campanha.</p><textarea id=shared-notes rows=12 placeholder="Anotações para todos...">${esc(sharedNotes)}</textarea></section></div>`;
        const visibility = { sheets: true, pv: true, pd: true, creatureInfo: true, ...((combat?.active ? combat : draftCombat)?.visibility || {}) };
        const source = combat?.active ? 'live' : 'draft';
        const currentCombat = combat?.active ? combat : draftCombat;
        const included = new Set(currentCombat?.sheetIds || L.map(x => x.id));
        const visibilityOptions = [['sheets', 'Fichas em combate'], ['pv', 'PV dos jogadores'], ['pd', 'PD dos jogadores'], ['creatureInfo', 'Informações dos inimigos']];
        const visibilityEditor = (action, state) => `<div class=combat-visibility><b>Exibição para jogadores</b>${visibilityOptions.map(([key, label]) => `<label><input type=checkbox data-a=${action} data-k=${key} ${state[key] ? 'checked' : ''}> ${label}</label>`).join('')}</div>`;
        const creatureCards = (currentCombat?.creatures || []).map((creature, index) => {
            const showInfo = m || visibility.creatureInfo;
            const pv = Math.max(0, Math.min(100, Number(creature.pv || 0) / (Number(creature.pvMax) || 1) * 100));
            const actions = m ? `<div class=combat-creature-actions>
                <button class=creature-icon data-a=editCreature data-mode=${source} data-i=${index} aria-label="Editar ${esc(creature.name)}" title="Editar"><svg viewBox="0 0 24 24" aria-hidden=true><path d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5Z"/><path d="m13.5 7 3.5 3.5"/></svg></button>
                <button class=creature-icon data-a=removeCreature data-mode=${source} data-i=${index} aria-label="Remover ${esc(creature.name)}" title="Remover"><svg viewBox="0 0 24 24" aria-hidden=true><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 3v7m4-7v7"/></svg></button>
            </div>` : '';
            return `<article class=combat-creature>${showInfo && creature.photo ? `<img src="${esc(creature.photo)}" alt="" loading=lazy>` : ''}<div class=combat-creature-body><h4>${esc(creature.name)}</h4>${showInfo ? `<div class=combat-creature-vitals><div class=combat-bar><i style="width:${pv}%"></i></div><span>PV ${creature.pv}/${creature.pvMax}</span>${m ? `<span class=combat-creature-pv-controls><button data-a=enemyStat data-mode=${source} data-i=${index} data-d=-1 aria-label="Diminuir PV de ${esc(creature.name)}">−</button><button data-a=enemyStat data-mode=${source} data-i=${index} data-d=1 aria-label="Aumentar PV de ${esc(creature.name)}">+</button></span>` : ''}</div>${creature.elements?.length ? `<div class=combat-elements>${creature.elements.map(element => `<span>${esc(element)}</span>`).join('')}</div>` : ''}${creature.abilities ? `<div><b>Habilidades</b><p>${esc(creature.abilities)}</p></div>` : ''}${creature.info ? `<div><b>Informações</b><p>${esc(creature.info)}</p></div>` : ''}` : '<p class=hint>As informações deste inimigo estão ocultas.</p>'}</div>${actions}</article>`
        }).join('') || '<p class=hint>Nenhum inimigo adicionado.</p>';
        const selectedCount = L.filter(sheet => included.has(sheet.id)).length;
        const combatRoster = (currentCombat?.sheetIds ? L.filter(x => included.has(x.id)) : L).map(x => {
            const editable = m || x.owner === u.uid, link = `ficha.html?id=${encodeURIComponent(x.id)}&c=${encodeURIComponent(id)}${editable ? '' : '&ro=1'}`;
            const img = face(x), showPv = m || visibility.pv, showPd = m || visibility.pd;
            const pv = showPv ? `<div class="combat-stat ${editable ? '' : 'readonly'}"><div class=combat-bar><i style="width:${Math.max(0, Math.min(100, x.pv / (x.pvMax || 1) * 100))}%"></i></div><span>PV ${x.pv}/${x.pvMax}</span>${editable ? `<button data-a=combatStat data-id=${esc(x.id)} data-k=pv data-d=-1 aria-label="Diminuir PV">−</button><button data-a=combatStat data-id=${esc(x.id)} data-k=pv data-d=1 aria-label="Aumentar PV">+</button>` : ''}</div>` : '';
            const pd = showPd ? `<div class="combat-stat ${editable ? '' : 'readonly'}"><div class="combat-bar pd"><i style="width:${Math.max(0, Math.min(100, x.pd / (x.pdMax || 1) * 100))}%"></i></div><span>PD ${x.pd}/${x.pdMax}</span>${editable ? `<button data-a=combatStat data-id=${esc(x.id)} data-k=pd data-d=-1 aria-label="Diminuir PD">−</button><button data-a=combatStat data-id=${esc(x.id)} data-k=pd data-d=1 aria-label="Aumentar PD">+</button>` : ''}</div>` : '';
            return `<article class=combat-character><a class=combat-character-main href="${link}"><span class=combat-avatar>${img ? `<img src="${esc(img)}" alt="" style="${cropCss(x.crop)}">` : esc((x.name || '?').charAt(0).toUpperCase())}</span><b>${esc(x.name)}</b><small>${editable ? 'Abrir ficha' : 'Ficha somente para visualização'}</small></a>${pv}${pd}${m ? `<button class="g combat-sheet-remove" data-a=removeCombatSheet data-id="${esc(x.id)}" aria-label="Remover a ficha de ${esc(x.name)} do combate">Remover do combate</button>` : ''}</article>`
        }).join('');
        const combatContent = combat?.active
            ? `<div class=combat-controls>${m ? `<button data-a=addCombatSheets>Adicionar fichas de jogadores</button><button class=g data-a=closeCombat>Encerrar combate</button>${visibilityEditor('combatVisibility', visibility)}` : ''}</div>
              <div class=combat-layout>
                <section class="combat-roster pn"><h3>Personagens</h3>${m || visibility.sheets ? (combatRoster || '<p class=hint>Nenhuma ficha selecionada para este combate.</p>') : '<p class=hint>As fichas em combate estão ocultas pelo mestre.</p>'}</section>
                <section class="combat-creatures pn"><div class=combat-heading><h3>Inimigos</h3>${m ? '<button data-a=addCreature>Adicionar inimigo</button>' : ''}</div>${creatureCards}</section>
              </div>`
            : m
                ? draftCombat
                    ? `<div class=pn><div class=combat-controls><div><h3>Rascunho privado</h3><p class=hint>Somente você vê este combate até iniciá-lo.</p></div>${draftCombat.creatures?.length ? '<button data-a=startCombat>Iniciar combate</button>' : '<p class=hint>Adicione ao menos um inimigo para iniciar o combate.</p>'}<button class=g data-a=discardCombat>Descartar rascunho</button>${visibilityEditor('draftVisibility', visibility)}</div></div>
                      <div class=combat-layout><section class="combat-roster pn"><h3>Personagens participantes (${selectedCount})</h3><p class=hint>Marque as fichas que entrarão neste combate.</p>${L.map(x => `<label class=combat-select><input type=checkbox data-a=draftSheet data-id="${esc(x.id)}" aria-label="Incluir ${esc(x.name)} no combate" ${included.has(x.id) ? 'checked' : ''}><span class=combat-avatar>${face(x) ? `<img src="${esc(face(x))}" alt="" style="${cropCss(x.crop)}">` : esc((x.name || '?').charAt(0).toUpperCase())}</span><span><b>${esc(x.name)}</b><small>${esc(x.perfil)} · Nível ${esc(x.nivel)}</small></span></label>`).join('') || '<p class=hint>Vincule fichas à campanha para selecionar participantes.</p>'}</section>
                        <section class="combat-creatures pn"><div class=combat-heading><h3>Inimigos</h3><button data-a=addCreature>Adicionar inimigo</button></div>${creatureCards}</section></div>`
                    : `<div class=pn><p class=hint>Nenhum combate preparado.</p><button data-a=createCombat>Preparar combate</button></div>`
                : `<div class=pn><p class=hint>${c.activeCombat ? 'O mestre ainda não revelou o combate.' : 'O mestre ainda não iniciou um combate.'}</p></div>`;
        $('#ct').innerHTML = `<div class=camphead style="${c.banner ? `background-image:url('${esc(c.banner)}')` : ''}"><div class=hi><span class=chip>${m ? 'Área do mestre' : 'Área do jogador'}</span><h1 style="font-size:clamp(22px,4vw,36px)">${esc(c.name)}</h1>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div></div>
  <div class="tabs2 campaign-tabs" role=tablist aria-label="Seções da campanha">
   ${[['jogadores', 'JOGADORES'], ['investigacao', 'INVESTIGAÇÃO'], ['combate', 'COMBATE'], ['importantes', 'IMPORTANTES']].map(([key, label]) => `<button type=button role=tab data-a=campaignTab data-tab=${key} aria-selected="${campaignTab === key}" class="${campaignTab === key ? 'on' : ''}">${label}</button>`).join('')}
  </div>
  <section class="campaign-tab-panel ${campaignTab === 'investigacao' ? 'campaign-board-panel' : ''}">${campaignTab === 'jogadores' ? playersContent : campaignTab === 'investigacao' ? '<div id=investigation-board></div>' : campaignTab === 'combate' ? combatContent : notesContent}</section>`;
        for (const [key, selector] of [['iq', '#iq'], ['shared', '#shared-notes'], ['personal', '#personal-notes']]) {
            const input = $(selector), saved = keep[key];
            if (input && saved) { input.value = saved.v; if (saved.f) { input.focus(); try { input.setSelectionRange(saved.s, saved.s) } catch { } } }
        }
        if (campaignTab === 'investigacao') {
            if (!investigationBoard && !boardLoading) {   // o quadro só é carregado quando a aba é aberta
                boardLoading = true;
                import('../investigation-board.js').then(mod => { investigationBoard = new mod.InvestigationBoard(id, c.master === u.uid ? 'master' : 'players'); boardLoading = false; schedule() }).catch(x => { boardLoading = false; toast(err(x), 1) })
            }
            if (investigationBoard) investigationBoard.attach($('#investigation-board'))
        }
    };
    const who = async () => { people = await Promise.all((c.members || []).map(getProfile)); people.sort((a, b) => (b.uid == c.master) - (a.uid == c.master)); schedule() };
    const combatRef = () => doc(db, 'campaigns', id, 'combats', combatId);
    const draftRef = () => doc(db, 'campaigns', id, 'combatDrafts', 'current');
    const expandCreatures = creatures => (creatures || []).flatMap(creature => {
        const { quantity, ...data } = creature;
        const count = Number.isSafeInteger(Number(quantity)) && Number(quantity) > 1 ? Number(quantity) : 1;
        return Array.from({ length: count }, () => ({ ...data }))
    });
    const watchCombat = () => {
        const next = c?.activeCombat || null;
        if (next === combatId) return;
        combatUnsub?.(); combatUnsub = null; combatId = next; combat = null;
        if (next) combatUnsub = onSnapshot(combatRef(), d => { combat = d.exists() ? { ...d.data(), creatures: expandCreatures(d.data().creatures) } : null; schedule() }, x => toast(err(x), 1))
    };
    const watchDraft = () => {
        if (c?.master !== u.uid) {
            draftUnsub?.(); draftUnsub = null; draftCombat = null; draftWatchStarted = false;
            return
        }
        if (draftWatchStarted) return;
        draftWatchStarted = true;
        draftUnsub = onSnapshot(draftRef(), d => { draftCombat = d.exists() ? { ...d.data(), creatures: expandCreatures(d.data().creatures) } : null; schedule() }, x => toast(err(x), 1))
    };
    const watchFeatures = () => {
        if (featureWatchId === id) return;
        featureWatchId = id;
        onSnapshot(doc(db, 'campaigns', id, 'notes', 'shared'), d => { sharedNotes = d.exists() ? d.data().text || '' : ''; schedule() }, x => toast(err(x), 1));
        onSnapshot(doc(db, 'campaigns', id, 'notes', 'personal-' + u.uid), d => { personalNotes = d.exists() ? d.data().text || '' : ''; schedule() }, x => toast(err(x), 1))
    };
    onSnapshot(doc(db, 'campaigns', id), d => {
        c = d.data();
        if (!c) { $('#ct').innerHTML = '<p class=er>Campanha não encontrada.</p>'; return }
        watchFeatures(); watchCombat(); watchDraft();
        if (c.master === u.uid && !mstarted) { mstarted = true; startMaster() }
        schedule(); who()
    }, x => $('#ct').innerHTML = `<p class=er>${err(x)}</p>`);
    onSnapshot(query(collection(db, 'sheets'), where('campaign', '==', id)), q => { L = q.docs.map(d => ({ id: d.id, ...d.data() })); schedule() });
    watchFriends(u.uid, f => { friends = f; schedule() });
    $('#ct').addEventListener('contextmenu', e => {
        const target = e.target.closest('[data-player-context], [data-sheet-context]');
        if (contextHold && target === contextHold.target) {
            const hold = contextHold;
            clearContextHold();
            suppressedHoldClick = { target, pointerId: hold.pointerId, expires: Infinity }
        }
        showContextMenu(e, e.target)
    });
    track($('#ct'), 'input', e => {
        const t = e.target, key = t.id === 'shared-notes' ? 'shared' : t.id === 'personal-notes' ? 'personal-' + u.uid : '';
        if (!key) return;
        clearTimeout(noteTimers[key]);
        noteTimers[key] = setTimeout(() => setDoc(doc(db, 'campaigns', id, 'notes', key), { text: t.value, updated: serverTimestamp() }).catch(x => toast(err(x), 1)), 350)
    });
    const startMaster = () => {
        onSnapshot(query(collection(db, 'invites'), where('campaign', '==', id), where('from', '==', u.uid)), async q => { sent = await Promise.all(q.docs.map(async d => { const x = d.data(), p = await getProfile(x.to); return { ...x, id: d.id, toName: p.username } })); schedule() }, () => { });
    };
    const invite = async p => {
        if (!p) return toast('Ninguém encontrado com esse @ ou e-mail.', 1);
        await sendInvite(u, c, id, p); toast(`Convite enviado para @${p.username}`)
    };
    const renderCampaignEditor = () => {
        if (!campaignEdit) throw new Error('O editor da campanha não está aberto.');
        const bannerStyle = campaignEdit.banner ? `background-image:url('${esc(campaignEdit.banner)}')` : '';
        modal(`<h3>Configurações da campanha</h3><a class="btn g campaign-layout-link" href="portrait-editor.html?c=${esc(id)}">Editar layout base dos portraits</a><label class=fld><span>Nome</span><input id=campaign-name maxlength=50 value="${esc(campaignEdit.name)}"></label><label class=fld><span>Descrição</span><textarea id=campaign-desc maxlength=400 rows=4>${esc(campaignEdit.desc)}</textarea></label><div class=fld><span>Banner</span><button type=button class=campaign-banner-edit data-a=chooseCampaignBanner style="${bannerStyle}">${campaignEdit.banner ? 'Trocar banner' : 'Escolher banner'}</button></div><div class=row>${campaignEdit.banner ? '<button class=g data-a=removeCampaignBanner>Remover banner</button>' : ''}<button data-a=saveCampaign>Salvar alterações</button><button class=g data-a=cancelCampaignEdit>Cancelar</button></div>`)
    };
    const captureCampaignEditor = () => {
        if (!campaignEdit) throw new Error('O editor da campanha não está aberto.');
        const name = $('#campaign-name'), desc = $('#campaign-desc');
        if (name) campaignEdit.name = name.value;
        if (desc) campaignEdit.desc = desc.value
    };
    act({
        campaignTab: t => {
            if (!['jogadores', 'investigacao', 'combate', 'importantes'].includes(t.dataset.tab)) return;
            campaignTab = t.dataset.tab; draw()
        },
        sendinv: async () => { const q = $('#iq').value; await invite(await findUser(q)); if ($('#iq')) $('#iq').value = '' },
        invfr: async t => invite(await getProfile(t.dataset.u)),
        invite: () => clip(new URL('convite.html?c=' + id, location.href).href, 'Link de convite copiado'),
        campaignSettings: () => {
            if (c.master !== u.uid) throw new Error('Somente o mestre pode editar a campanha.');
            campaignEdit = { name: c.name || '', desc: c.desc || '', banner: c.banner || '', thumb: c.thumb || '' };
            renderCampaignEditor()
        },
        chooseCampaignBanner: async () => {
            if (c.master !== u.uid || !campaignEdit) throw new Error('Somente o mestre pode editar o banner.');
            captureCampaignEditor();
            const source = await pickImage();
            if (!source) return;
            try {
                const banner = await openCropper(source, { aspect: 8 / 3, round: false, out: [960, 360], title: 'Banner da campanha' });
                if (banner) {
                    const image = await load(banner), canvas = document.createElement('canvas');
                    canvas.width = 400; canvas.height = 150;
                    canvas.getContext('2d').drawImage(image, 0, 0, 400, 150);
                    campaignEdit.banner = banner; campaignEdit.thumb = jpg(canvas, .75)
                }
            } catch (x) {
                renderCampaignEditor();
                throw x
            }
            renderCampaignEditor()
        },
        removeCampaignBanner: () => {
            if (c.master !== u.uid || !campaignEdit) throw new Error('Somente o mestre pode editar o banner.');
            captureCampaignEditor();
            campaignEdit.banner = ''; campaignEdit.thumb = '';
            renderCampaignEditor()
        },
        saveCampaign: async () => {
            if (c.master !== u.uid || !campaignEdit) throw new Error('Somente o mestre pode editar a campanha.');
            captureCampaignEditor();
            const name = campaignEdit.name.trim();
            if (!name) return toast('Informe o nome da campanha.', 1);
            await updateDoc(doc(db, 'campaigns', id), { name, desc: campaignEdit.desc.trim(), banner: campaignEdit.banner, thumb: campaignEdit.thumb });
            campaignEdit = null; close(); toast('Campanha atualizada.')
        },
        cancelCampaignEdit: () => { campaignEdit = null; close() },
        friend: async t => {
            closeContextMenu();
            if (t.dataset.u === u.uid || !(c.members || []).includes(u.uid) || !(c.members || []).includes(t.dataset.u)) throw new Error('Ação disponível apenas entre participantes da campanha.');
            if (friends.some(friend => friend.uid === t.dataset.u)) {
                pendingFriendRemoval = { uid: t.dataset.u, handle: t.dataset.n || 'este usuário' };
                modal(`<h3>Remover ${esc(pendingFriendRemoval.handle)} dos amigos?</h3><p>Vocês deixarão de aparecer na lista de amigos um do outro.</p><div class=row><button class=danger data-a=confirmFriendRemoval>Remover amigo</button><button class=g data-a=cancelFriendRemoval>Cancelar</button></div>`)
            } else {
                await sendFriendRequest(u.uid, t.dataset.u);
                toast(`Solicitação de amizade enviada para ${t.dataset.n}.`)
            }
        },
        confirmFriendRemoval: async () => {
            const target = pendingFriendRemoval;
            if (!target || !(c.members || []).includes(u.uid) || !(c.members || []).includes(target.uid) || !friends.some(friend => friend.uid === target.uid)) throw new Error('Este usuário não está mais disponível para remoção.');
            await removeFriend(u.uid, target.uid);
            pendingFriendRemoval = null; close(); toast(`${target.handle} removido dos amigos.`)
        },
        cancelFriendRemoval: () => { pendingFriendRemoval = null; close() },
        kick: async t => {
            closeContextMenu();
            if (c.master !== u.uid || t.dataset.u === c.master) throw new Error('Somente o mestre pode remover jogadores.');
            if (!confirm(`Remover ${t.dataset.n} da campanha? As fichas serão desvinculadas, não apagadas.`)) return;
            await removePlayer(id, t.dataset.u);
            toast(`${t.dataset.n} foi removido da campanha.`)
        },
        unlink: async t => {
            closeContextMenu();
            const sheet = L.find(x => x.id === t.dataset.id);
            if (!sheet || (c.master !== u.uid && sheet.owner !== u.uid)) throw new Error('Você não pode remover esta ficha da mesa.');
            if (!confirm(`Remover "${t.dataset.n}" da mesa? A ficha continuará na conta do jogador, e ele permanecerá na campanha.`)) return;
            await updateDoc(doc(db, 'sheets', t.dataset.id), { campaign: deleteField() });
            toast('Ficha removida da mesa; ela não foi apagada.')
        },
        leave: async () => {
            if (c.master === u.uid || !(c.members || []).includes(u.uid)) throw new Error('Você não pode sair desta campanha.');
            if (!confirm('Sair da campanha? Suas fichas serão desvinculadas, mas continuarão na sua conta.')) return;
            await removePlayer(id, u.uid);
            toast('Você saiu da campanha.');
            setTimeout(() => location.replace('campanhas.html'), 700)
        },
        createCombat: async () => {
            if (c.master !== u.uid || c.activeCombat || draftCombat) throw new Error('Somente o mestre pode preparar um combate quando não há outro ativo ou rascunho.');
            if ((await getDoc(draftRef())).exists()) throw new Error('Já existe um rascunho de combate nesta campanha.');
            await setDoc(draftRef(), { active: false, visibility: { sheets: true, pv: true, pd: true, creatureInfo: true }, sheetIds: L.map(x => x.id), creatures: [], created: serverTimestamp() });
        },
        startCombat: async () => {
            if (c.master !== u.uid || !draftCombat || c.activeCombat) throw new Error('Não há um rascunho pronto para iniciar.');
            if (!draftCombat.creatures?.length) throw new Error('Adicione ao menos um inimigo antes de iniciar o combate.');
            if (startingCombat) return;
            startingCombat = true;
            try {
                const ref = await addDoc(collection(db, 'campaigns', id, 'combats'), { ...draftCombat, active: true, creatures: expandCreatures(draftCombat.creatures), started: serverTimestamp() });
                await updateDoc(doc(db, 'campaigns', id), { activeCombat: ref.id });
                c.activeCombat = ref.id; watchCombat();
                await deleteDoc(draftRef());
                draftCombat = null; schedule()
            } finally { startingCombat = false }
        },
        discardCombat: async () => {
            if (c.master !== u.uid || !draftCombat) throw new Error('Não há rascunho para descartar.');
            if (!confirm('Descartar este rascunho de combate?')) return;
            await deleteDoc(draftRef()); draftCombat = null; schedule()
        },
        addCombatSheets: () => {
            if (c.master !== u.uid || !combat?.active) throw new Error('Somente o mestre pode adicionar fichas ao combate.');
            const included = new Set(combat.sheetIds || L.map(x => x.id));
            const available = L.filter(sheet => !included.has(sheet.id));
            if (!available.length) return toast('Não há outras fichas vinculadas para adicionar.', 1);
            modal(`<h3>Adicionar fichas de jogadores ao combate</h3><div class=combat-sheet-picker>${available.map(x => `<label class=combat-select><input type=checkbox data-combat-sheet data-id="${esc(x.id)}"><span class=combat-avatar>${face(x) ? `<img src="${esc(face(x))}" alt="" style="${cropCss(x.crop)}">` : esc((x.name || '?').charAt(0).toUpperCase())}</span><span><b>${esc(x.name)}</b><small>${esc(x.perfil)} · Nível ${esc(x.nivel)}</small></span></label>`).join('')}</div><div class=row><button data-a=saveCombatSheets>Adicionar selecionadas</button><button class=g data-a=close>Cancelar</button></div>`)
        },
        saveCombatSheets: async () => {
            if (c.master !== u.uid || !combat?.active) throw new Error('Somente o mestre pode adicionar fichas ao combate.');
            const selected = [...document.querySelectorAll('[data-combat-sheet]:checked')].map(input => input.dataset.id);
            if (!selected.length) return toast('Selecione ao menos uma ficha.', 1);
            const availableIds = new Set(L.map(sheet => sheet.id));
            if (selected.some(sheetId => !availableIds.has(sheetId))) throw new Error('Uma das fichas selecionadas não está mais vinculada à campanha.');
            const sheetIds = new Set(combat.sheetIds || L.map(sheet => sheet.id));
            selected.forEach(sheetId => sheetIds.add(sheetId));
            await updateDoc(combatRef(), { sheetIds: [...sheetIds] });
            close()
        },
        removeCombatSheet: async t => {
            if (c.master !== u.uid || !combat?.active) throw new Error('Somente o mestre pode remover fichas do combate.');
            if (!L.some(sheet => sheet.id === t.dataset.id)) throw new Error('Ficha não encontrada nesta campanha.');
            const sheetIds = new Set(combat.sheetIds || L.map(sheet => sheet.id));
            if (!sheetIds.delete(t.dataset.id)) throw new Error('Esta ficha não participa do combate.');
            await updateDoc(combatRef(), { sheetIds: [...sheetIds] })
        },
        addCreature: () => {
            if (c.master !== u.uid) throw new Error('Somente o mestre pode adicionar inimigos.');
            if (combat?.active) modalCreature('live');
            else if (draftCombat) modalCreature('draft');
            else throw new Error('Prepare um combate antes de adicionar inimigos.')
        },
        closeCombat: async () => {
            if (c.master !== u.uid || !combat?.active) throw new Error('Somente o mestre pode encerrar este combate.');
            await updateDoc(combatRef(), { active: false, closed: serverTimestamp() });
            await updateDoc(doc(db, 'campaigns', id), { activeCombat: null });
            c.activeCombat = null; watchCombat(); schedule()
        },
        combatVisibility: async t => {
            if (c.master !== u.uid || !combat?.active) throw new Error('Somente o mestre pode alterar a exibição do combate.');
            await updateDoc(combatRef(), { [`visibility.${t.dataset.k}`]: t.checked })
        },
        draftVisibility: async t => {
            if (c.master !== u.uid || !draftCombat) throw new Error('Somente o mestre pode alterar o rascunho.');
            await updateDoc(draftRef(), { [`visibility.${t.dataset.k}`]: t.checked })
        },
        draftSheet: async t => {
            if (c.master !== u.uid || !draftCombat || !L.some(x => x.id === t.dataset.id)) throw new Error('Ficha inválida para este combate.');
            const sheetIds = new Set(draftCombat.sheetIds || L.map(x => x.id));
            if (t.checked) sheetIds.add(t.dataset.id); else sheetIds.delete(t.dataset.id);
            await updateDoc(draftRef(), { sheetIds: [...sheetIds] })
        },
        combatStat: async t => {
            const sheet = L.find(x => x.id === t.dataset.id), key = t.dataset.k;
            if (!sheet || !['pv', 'pd'].includes(key) || (c.master !== u.uid && sheet.owner !== u.uid)) throw new Error('Você só pode alterar a sua própria ficha.');
            await updateDoc(doc(db, 'sheets', sheet.id), { [key]: Math.max(0, Number(sheet[key] || 0) + Number(t.dataset.d)) })
        },
        enemyStat: async t => {
            if (c.master !== u.uid) throw new Error('Somente o mestre pode alterar os PV dos inimigos.');
            const live = t.dataset.mode === 'live', state = live ? combat : draftCombat, index = Number(t.dataset.i);
            if (!state || (live && !state.active) || !Number.isSafeInteger(index)) throw new Error('Inimigo não encontrado.');
            const enemy = state.creatures?.[index];
            if (!enemy) throw new Error('Inimigo não encontrado.');
            const pvMax = Math.max(1, Number(enemy.pvMax) || 1);
            const pv = Math.max(0, Math.min(pvMax, Number(enemy.pv || 0) + Number(t.dataset.d)));
            if (pv === enemy.pv) return;
            const creatures = [...state.creatures];
            creatures[index] = { ...enemy, pv };
            await updateDoc(live ? combatRef() : draftRef(), { creatures })
        },
        removeCreature: async t => {
            if (c.master !== u.uid) throw new Error('Somente o mestre pode remover inimigos.');
            const live = t.dataset.mode === 'live';
            const state = live ? combat : draftCombat;
            if ((live && !state?.active) || (!live && !state)) throw new Error('Combate não encontrado.');
            const creatures = [...(state.creatures || [])]; creatures.splice(Number(t.dataset.i), 1);
            await updateDoc(live ? combatRef() : draftRef(), { creatures })
        },
        editCreature: t => {
            if (c.master !== u.uid) throw new Error('Somente o mestre pode editar inimigos.');
            modalCreature(t.dataset.mode, Number(t.dataset.i))
        },
        open: t => location.href = `ficha.html?id=${t.dataset.id}&c=${id}`,
        link: async () => {
            const q = await getDocs(query(collection(db, 'sheets'), where('owner', '==', U.uid)));
            modal(`<h3>Vincular ficha</h3>${q.docs.map(d => `<button class=cat data-a=dolink data-id=${d.id}>${esc(d.data().name)}</button>`).join('') || '<p>Crie uma ficha primeiro.</p>'}<button class=g data-a=close>Fechar</button>`)
        },
        dolink: async t => { await updateDoc(doc(db, 'sheets', t.dataset.id), { campaign: id }); close() }
    })
    function modalCreature(target = 'draft', index = -1) {
        const state = target === 'live' ? combat : draftCombat;
        if (!state || (target === 'live' && !state.active)) throw new Error('Combate não encontrado.');
        const existing = index >= 0 ? state.creatures?.[index] : null;
        if (index >= 0 && !existing) throw new Error('Inimigo não encontrado.');
        creatureTarget = target; creatureIndex = index;
        modal(`<h3>${existing ? 'Editar inimigo' : 'Adicionar inimigo'}</h3><label class=fld><span>Nome</span><input id=creature-name maxlength=80 required value="${esc(existing?.name || '')}"></label><div class=row><label class=fld><span>PV atual</span><input id=creature-pv type=number min=0 value="${existing?.pv ?? 10}"></label><label class=fld><span>PV máximo</span><input id=creature-pvmax type=number min=1 value="${existing?.pvMax ?? 10}"></label>${existing ? '' : '<label class=fld><span>Quantidade (até 20)</span><input id=creature-quantity type=number min=1 max=20 value=1></label>'}</div><label class=fld><span>Foto (URL ou arquivo)</span><input id=creature-photo type=text placeholder=https://... value="${esc(existing?.photo || '')}"><input id=creature-file type=file accept=image/*></label><details class=creature-elements><summary>Elementos (escolha de 1 a 3)</summary><div class=creature-element-options>${['conhecimento', 'energia', 'medo', 'morte', 'sangue'].map(x => `<label><input type=checkbox value=${x} data-element ${existing?.elements?.includes(x) ? 'checked' : ''}> ${x}</label>`).join('')}</div></details><label class=fld><span>Habilidades</span><textarea id=creature-abilities rows=3>${esc(existing?.abilities || '')}</textarea></label><label class=fld><span>Informações</span><textarea id=creature-info rows=3>${esc(existing?.info || '')}</textarea></label><div class=row><button data-a=saveCreature>${existing ? 'Salvar alterações' : 'Adicionar'}</button><button class=g data-a=close>Cancelar</button></div>`);
        $('#creature-file').onchange = async () => {
            const file = $('#creature-file').files?.[0]; if (!file) return;
            try { const source = await rd(file); $('#creature-photo').value = shrink(await load(source), source, 256) }
            catch (x) { toast(err(x), 1) }
        }
        const elements = [...document.querySelectorAll('[data-element]')];
        const syncElements = () => {
            const full = elements.filter(element => element.checked).length >= 3;
            elements.forEach(element => { element.disabled = full && !element.checked })
        };
        elements.forEach(element => { element.onchange = syncElements })
        syncElements()
    }
    act({
        saveCreature: async () => {
            const live = creatureTarget === 'live', state = live ? combat : draftCombat;
            if (c.master !== u.uid || !state || (live && !combat?.active)) throw new Error('Somente o mestre pode alterar inimigos.');
            const name = $('#creature-name').value.trim(), pv = Number($('#creature-pv').value), pvMax = Number($('#creature-pvmax').value), quantity = creatureIndex >= 0 ? 1 : Number($('#creature-quantity').value);
            const elements = [...document.querySelectorAll('[data-element]:checked')].map(input => input.value);
            if (!name || !Number.isFinite(pv) || pv < 0 || !Number.isFinite(pvMax) || pvMax < 1 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) return toast('Preencha nome, PV válido e uma quantidade de 1 a 20.', 1);
            if (elements.length < 1 || elements.length > 3) return toast('Escolha de 1 a 3 elementos.', 1);
            const creature = { name, pv, pvMax, photo: $('#creature-photo').value.trim(), elements, abilities: $('#creature-abilities').value.trim(), info: $('#creature-info').value.trim() };
            const creatures = [...(state.creatures || [])];
            if (creatureIndex >= 0) creatures[creatureIndex] = { ...creatures[creatureIndex], ...creature };
            else {
                for (let i = 0; i < quantity; i++) creatures.push({ ...creature, id: crypto.randomUUID?.() || `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}` })
            }
            await updateDoc(live ? combatRef() : draftRef(), { creatures });
            close()
        }
    })
});
