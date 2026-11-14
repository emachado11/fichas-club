import { guard, page, act, $, esc, err, toast } from '../common.js';
import { db, collection, query, where, onSnapshot, getDocs, getDoc, doc, writeBatch, deleteField } from '../firebase.js';
import { fab } from '../ui.js';

async function deleteCampaign(id, uid) {
    const [sheets, invites, layout, board, sharedBoard] = await Promise.all([
        getDocs(query(collection(db, 'sheets'), where('campaign', '==', id))),
        getDocs(query(collection(db, 'invites'), where('campaign', '==', id), where('from', '==', uid))),
        getDoc(doc(db, 'layouts', id)),
        getDocs(collection(db, 'campaigns', id, 'investigation')),
        getDocs(collection(db, 'campaigns', id, 'playerInvestigation'))
    ]);
    const operations = [
        ...sheets.docs.map(sheet => batch => batch.update(sheet.ref, { campaign: deleteField() })),
        ...invites.docs.map(invite => batch => batch.delete(invite.ref)),
        ...board.docs.map(item => batch => batch.delete(item.ref)),
        ...sharedBoard.docs.map(item => batch => batch.delete(item.ref)),
        ...(layout.exists() ? [batch => batch.delete(layout.ref)] : []),
        batch => batch.delete(doc(db, 'campaigns', id))
    ];
    for (let i = 0; i < operations.length; i += 450) {
        const batch = writeBatch(db);
        operations.slice(i, i + 450).forEach(add => add(batch));
        await batch.commit()
    }
}

guard(u => {
    let all = [], tab = sessionStorage.ctab || 'play';
    page('Campanhas', `<div class=tabs2 role=tablist><button role=tab data-a=tab data-v=play id=tp>Como jogador</button><button role=tab data-a=tab data-v=master id=tm>Como Mestre</button></div><div id=ls class=crs></div>${fab([{ href: 'campanha-nova.html', label: 'Nova campanha' }])}`, u);
    const draw = () => {
        const mine = c => c.master === u.uid, P = all.filter(c => !mine(c)), M = all.filter(mine), L = tab == 'master' ? M : P;
        $('#tp').textContent = `Como jogador (${P.length})`; $('#tm').textContent = `Como Mestre (${M.length})`;
        $('#tp').classList.toggle('on', tab == 'play'); $('#tm').classList.toggle('on', tab == 'master');
        $('#tp').setAttribute('aria-selected', tab == 'play'); $('#tm').setAttribute('aria-selected', tab == 'master');
        $('#ls').innerHTML = L.map(c => `<div class=cmp-wrap><a class=cmp href="campanha.html?id=${esc(c.id)}"><div class=crt><span class=cmeta>${tab == 'master' ? 'Você é o mestre' : 'Jogador'} · ${(c.members || []).length} ${(c.members || []).length == 1 ? 'participante' : 'participantes'}</span><h3>${esc(c.name)}</h3><p>${esc(c.desc || 'Sem descrição.')}</p></div><div class=crb style="${c.banner ? `background-image:url('${esc(c.banner)}')` : ''}"></div></a>${tab == 'master' ? `<button class="camp-delete g" data-a=delcamp data-id="${esc(c.id)}">Apagar campanha</button>` : ''}</div>`).join('')
            || `<div class=empty-s><p>${tab == 'master' ? 'Você ainda não criou nenhuma campanha.' : 'Você ainda não participa de nenhuma campanha como jogador.'}</p><p>${tab == 'master' ? '<a href=campanha-nova.html>Criar campanha</a>' : 'Peça um convite ao seu mestre — ele aparece no envelope ✉ do topo.'}</p></div>`
    };
    onSnapshot(query(collection(db, 'campaigns'), where('members', 'array-contains', u.uid)), q => { all = q.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')); draw() }, x => $('#ls').textContent = err(x));
    act({
        tab: t => { tab = t.dataset.v; sessionStorage.ctab = tab; draw() },
        delcamp: async t => {
            if (!confirm('Apagar esta campanha? As fichas serão mantidas, mas desvinculadas; convites, quadros de investigação e layout serão removidos.')) return;
            await deleteCampaign(t.dataset.id, u.uid);
            toast('Campanha apagada.')
        }
    })
});
