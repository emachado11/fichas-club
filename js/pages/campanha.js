import { guard, page, act, qs, $, esc, clip, err, modal, close, face, picHTML, toast } from '../common.js';
import { db, doc, collection, query, where, onSnapshot, getDocs, updateDoc, arrayRemove, deleteField, writeBatch } from '../firebase.js';
import { getProfile, findUser, sendInvite, watchFriends, trackCampaign, avatar } from '../profile.js';
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
    let c, L = [], friends = [], sent = [], people = [];
    let contextMenu = null;
    const closeContextMenu = () => { contextMenu?.remove(); contextMenu = null };
    const openContextMenu = (e, action, label, data) => {
        e.preventDefault(); closeContextMenu();
        const menu = document.createElement('div'), button = document.createElement('button');
        menu.className = 'ctx-menu'; menu.setAttribute('role', 'menu');
        button.type = 'button'; button.setAttribute('role', 'menuitem'); button.dataset.a = action; button.textContent = label;
        Object.entries(data).forEach(([key, value]) => { button.dataset[key] = value });
        menu.append(button); document.body.append(menu); contextMenu = menu;
        const rect = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(e.clientX, innerWidth - rect.width - 8))}px`;
        menu.style.top = `${Math.max(8, Math.min(e.clientY, innerHeight - rect.height - 8))}px`
    };
    document.addEventListener('click', e => { if (contextMenu && !contextMenu.contains(e.target)) closeContextMenu() });
    document.addEventListener('contextmenu', e => {
        if (contextMenu && !contextMenu.contains(e.target) && !e.target.closest('[data-player-context], [data-sheet-context]')) closeContextMenu()
    });
    addEventListener('keydown', e => { if (e.key === 'Escape') closeContextMenu() });
    const draw = () => {
        if (!c) return; const m = c.master == u.uid, v = L.filter(x => m || x.owner == u.uid), mem = new Set(c.members || []), sentTo = new Set(sent.map(s => s.to));
        $('#ct').innerHTML = `<div class=camphead style="${c.banner ? `background-image:url('${esc(c.banner)}')` : ''}"><div class=hi><span class=chip>${m ? 'Área do mestre' : 'Área do jogador'}</span><h1 style="font-size:clamp(22px,4vw,36px)">${esc(c.name)}</h1>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div></div>
  <div class=row style="margin:10px 0;justify-content:flex-start">${m ? '<a class="btn" href="portrait-editor.html?c=' + id + '">Layout base dos portraits (OBS)</a>' : ''}${!m && mem.has(u.uid) ? '<button class=g data-a=leave>Sair da campanha</button>' : ''}<button class=g data-a=link>Vincular uma ficha</button></div>
  <div class=pn><h3>${m ? 'Todas as fichas' : 'Minhas fichas na campanha'}</h3>${v.map(x => `<div class=card data-a=open data-id=${x.id} data-sheet-context><span class=row><span class="pic sm">${picHTML(face(x), x.crop)}</span><span>${esc(x.name)} <span class=mt>${x.perfil}, nível ${x.nivel}</span></span></span><span>PV ${x.pv}/${x.pvMax} · PD ${x.pd}/${x.pdMax}</span><button class=g data-a=obs data-id=${x.id}>OBS</button></div>`).join('') || '<p class=mt>Nenhuma ficha vinculada.</p>'}</div>
  <div class=pn style="margin-top:12px"><h3>Participantes</h3><div class="row mem">${people.map(p => `<span class=row style="gap:6px" ${m && p.uid !== c.master ? `data-player-context="${esc(p.uid)}"` : ''}>${avatar(p, 'sm')}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}${p.uid == c.master ? ' · mestre' : ''}</small></span></span>`).join('')}</div></div>
  ${m ? `<div class=pn style="margin-top:12px;display:grid;gap:10px"><h3>Convidar</h3>
   <div class=row style="justify-content:flex-start"><input id=iq placeholder="@usuario ou e-mail" style="flex:1 1 220px"><button data-a=sendinv>Enviar convite</button></div>
   ${friends.length ? `<div><b class=mt>Amigos</b>${friends.map(p => `<div class=frow><span class=who>${avatar(p, 'sm')}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}</small></span></span>${mem.has(p.uid) ? '<small>Já na campanha</small>' : sentTo.has(p.uid) ? '<small>Convite enviado</small>' : `<button class=g data-a=invfr data-u="${esc(p.uid)}">Convidar</button>`}</div>`).join('')}</div>` : '<p class=hint>Adicione amigos em Perfil › Amigos para convidá-los com um toque.</p>'}
   ${sent.length ? `<p class=hint>Convites pendentes: ${sent.map(s => '@' + esc(s.toName || '?')).join(', ')}</p>` : ''}
   <div><button class=g data-a=invite>Copiar link de convite</button></div></div>` : ''}
  <div class="pn mt" style="margin-top:12px">Investigação${m ? ' e escudo do mestre' : ''}: em breve.</div>`
    };
    const who = async () => { people = await Promise.all((c.members || []).map(getProfile)); people.sort((a, b) => (b.uid == c.master) - (a.uid == c.master)); draw() };
    onSnapshot(doc(db, 'campaigns', id), d => { c = d.data(); if (!c) { $('#ct').innerHTML = '<p class=er>Campanha não encontrada.</p>'; return } draw(); who() }, x => $('#ct').innerHTML = `<p class=er>${err(x)}</p>`);
    onSnapshot(query(collection(db, 'sheets'), where('campaign', '==', id)), q => { L = q.docs.map(d => ({ id: d.id, ...d.data() })); draw() });
    $('#ct').addEventListener('contextmenu', e => {
        const participant = e.target.closest('[data-player-context]');
        if (participant && c?.master === u.uid) {
            const person = people.find(p => p.uid === participant.dataset.playerContext);
            openContextMenu(e, 'kick', 'Remover jogador da mesa', { u: participant.dataset.playerContext, n: person?.displayName || 'jogador' });
            return
        }
        const card = e.target.closest('[data-sheet-context]');
        if (!card) return;
        const sheet = L.find(x => x.id === card.dataset.id);
        if (sheet && (c?.master === u.uid || sheet.owner === u.uid)) {
            openContextMenu(e, 'unlink', 'Remover ficha da mesa', { id: sheet.id, n: sheet.name })
        }
    });
    watchFriends(u.uid, f => { friends = f; draw() });
    onSnapshot(query(collection(db, 'invites'), where('campaign', '==', id), where('from', '==', u.uid)), async q => { sent = await Promise.all(q.docs.map(async d => { const x = d.data(), p = await getProfile(x.to); return { ...x, id: d.id, toName: p.username } })); draw() }, () => { });
    const invite = async p => {
        if (!p) return toast('Ninguém encontrado com esse @ ou e-mail.', 1);
        await sendInvite(u, c, id, p); toast(`Convite enviado para @${p.username}`)
    };
    act({
        sendinv: async () => { const q = $('#iq').value; await invite(await findUser(q)); if ($('#iq')) $('#iq').value = '' },
        invfr: async t => invite(await getProfile(t.dataset.u)),
        invite: () => clip(new URL('convite.html?c=' + id, location.href).href, 'Link de convite copiado'),
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
        obs: t => clip(new URL('obs.html?id=' + t.dataset.id, location.href).href, 'Link do OBS copiado'),
        open: t => location.href = `ficha.html?id=${t.dataset.id}&c=${id}`,
        link: async () => {
            const q = await getDocs(query(collection(db, 'sheets'), where('owner', '==', U.uid)));
            modal(`<h3>Vincular ficha</h3>${q.docs.map(d => `<button class=cat data-a=dolink data-id=${d.id}>${esc(d.data().name)}</button>`).join('') || '<p>Crie uma ficha primeiro.</p>'}<button class=g data-a=close>Fechar</button>`)
        },
        dolink: async t => { await updateDoc(doc(db, 'sheets', t.dataset.id), { campaign: id }); close() }
    })
});
