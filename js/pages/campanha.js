import { guard, page, act, qs, $, esc, clip, err, modal, close, face, picHTML, toast } from '../common.js';
import { db, doc, collection, query, where, onSnapshot, getDocs, updateDoc, deleteDoc } from '../firebase.js';
import { getProfile, findUser, sendInvite, watchFriends, trackCampaign, avatar } from '../profile.js';
const id = qs('id'); let U;
guard(u => {
    U = u; page('', '<div id=ct></div>', u); trackCampaign(u.uid, id);
    let c, L = [], friends = [], sent = [], people = [];
    const draw = () => {
        if (!c) return; const m = c.master == u.uid, v = L.filter(x => m || x.owner == u.uid), mem = new Set(c.members || []), sentTo = new Set(sent.map(s => s.to));
        $('#ct').innerHTML = `<div class=camphead style="${c.banner ? `background-image:url('${esc(c.banner)}')` : ''}"><div class=hi><span class=chip>${m ? 'Área do mestre' : 'Área do jogador'}</span><h1 style="font-size:clamp(22px,4vw,36px)">${esc(c.name)}</h1>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div></div>
  <div class=row style="margin:10px 0;justify-content:flex-start">${m ? '<a class="btn" href="portrait-editor.html?c=' + id + '">Layout base dos portraits (OBS)</a>' : ''}<button class=g data-a=link>Vincular uma ficha</button></div>
  <div class=pn><h3>${m ? 'Todas as fichas' : 'Minhas fichas na campanha'}</h3>${v.map(x => `<div class=card data-a=open data-id=${x.id}><span class=row><span class="pic sm">${picHTML(face(x), x.crop)}</span><span>${esc(x.name)} <span class=mt>${x.perfil}, nível ${x.nivel}</span></span></span><span>PV ${x.pv}/${x.pvMax} · PD ${x.pd}/${x.pdMax}</span><button class=g data-a=obs data-id=${x.id}>OBS</button></div>`).join('') || '<p class=mt>Nenhuma ficha vinculada.</p>'}</div>
  <div class=pn style="margin-top:12px"><h3>Participantes</h3><div class="row mem">${people.map(p => `<span class=row style="gap:6px">${avatar(p, 'sm')}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}${p.uid == c.master ? ' · mestre' : ''}</small></span></span>`).join('')}</div></div>
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
        obs: t => clip(new URL('obs.html?id=' + t.dataset.id, location.href).href, 'Link do OBS copiado'),
        open: t => location.href = `ficha.html?id=${t.dataset.id}&c=${id}`,
        link: async () => {
            const q = await getDocs(query(collection(db, 'sheets'), where('owner', '==', U.uid)));
            modal(`<h3>Vincular ficha</h3>${q.docs.map(d => `<button class=cat data-a=dolink data-id=${d.id}>${esc(d.data().name)}</button>`).join('') || '<p>Crie uma ficha primeiro.</p>'}<button class=g data-a=close>Fechar</button>`)
        },
        dolink: async t => { await updateDoc(doc(db, 'sheets', t.dataset.id), { campaign: id }); close() }
    })
});
