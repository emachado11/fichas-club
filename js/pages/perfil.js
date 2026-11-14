/* Perfil: foto, nomes, @usuário, aparência, conta e amigos */
import { guard, page, act, $, esc, toast, err, clip, modal, close } from '../common.js';
import { auth, db, doc, writeBatch, getDoc, getDocs, collection, query, where, deleteField, arrayRemove, updatePassword, verifyBeforeUpdateEmail, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser, GoogleAuthProvider, EmailAuthProvider, sendPasswordResetEmail } from '../firebase.js';
import { ME, setMe, savePriv, applyTheme, applyPalette, MODES, PALETTES, clean, validHandle, findUser, sendFriendRequest, answerFriendRequest, removeFriend, watchFriends, watchFriendRequests, avatar, getProfile } from '../profile.js';
import { pickImage, openCropper } from '../cropper.js';
import { refreshAvatar } from '../header.js';

async function commitBatches(operations) {
  for (let i = 0; i < operations.length; i += 450) {
    const batch = writeBatch(db);
    operations.slice(i, i + 450).forEach(add => add(batch));
    await batch.commit()
  }
}

async function deleteAccountData(uid) {
  const [ownedCampaigns, memberCampaigns, sheets, friendships, incomingRequests, outgoingRequests, incomingInvites, outgoingInvites, usernames] = await Promise.all([
    getDocs(query(collection(db, 'campaigns'), where('master', '==', uid))),
    getDocs(query(collection(db, 'campaigns'), where('members', 'array-contains', uid))),
    getDocs(query(collection(db, 'sheets'), where('owner', '==', uid))),
    getDocs(query(collection(db, 'friendships'), where('members', 'array-contains', uid))),
    getDocs(query(collection(db, 'friendRequests'), where('to', '==', uid))),
    getDocs(query(collection(db, 'friendRequests'), where('from', '==', uid))),
    getDocs(query(collection(db, 'invites'), where('to', '==', uid))),
    getDocs(query(collection(db, 'invites'), where('from', '==', uid))),
    getDocs(query(collection(db, 'usernames'), where('uid', '==', uid)))
  ]);
  const campaignIds = new Set(ownedCampaigns.docs.map(c => c.id));
  const [campaignSheets, layouts] = await Promise.all([
    Promise.all([...campaignIds].map(id => getDocs(query(collection(db, 'sheets'), where('campaign', '==', id))))),
    Promise.all([...campaignIds].map(id => getDoc(doc(db, 'layouts', id))))
  ]);
  const operations = [], deleted = new Set();
  const remove = ref => {
    if (deleted.has(ref.path)) return;
    deleted.add(ref.path);
    operations.push(batch => batch.delete(ref))
  };
  campaignSheets.forEach(q => q.docs.forEach(sheet => {
    if (sheet.data().owner !== uid) operations.push(batch => batch.update(sheet.ref, { campaign: deleteField() }))
  }));
  layouts.forEach(layout => { if (layout.exists()) remove(layout.ref) });
  ownedCampaigns.docs.forEach(c => remove(c.ref));
  memberCampaigns.docs.forEach(c => {
    if (!campaignIds.has(c.id)) operations.push(batch => batch.update(c.ref, { members: arrayRemove(uid) }))
  });
  sheets.docs.forEach(sheet => remove(sheet.ref));
  [friendships, incomingRequests, outgoingRequests, incomingInvites, outgoingInvites, usernames].forEach(q => q.docs.forEach(d => remove(d.ref)));
  remove(doc(db, 'profiles', uid));
  remove(doc(db, 'users', uid));
  await commitBatches(operations)
}

guard(u => {
  let tab = location.hash.slice(1) || 'perfil', friends = [], friendRequests = { incoming: [], outgoing: [] };
  const pwd = u.providerData.some(p => p.providerId === 'password');
  page('Perfil', `<div class=ptabs role=tablist>${[['perfil', 'Perfil'], ['aparencia', 'Aparência'], ['conta', 'Conta'], ['amigos', 'Amigos']].map(([k, t]) => `<button role=tab data-a=tab data-v=${k} id=t_${k}>${t}</button>`).join('')}</div><div class=pf2 id=pb></div>`, u);
  const msg = (t, bad) => { const e = $('#ms'); if (e) { e.textContent = t; e.className = bad ? 'er' : 'ok' } };
  const draw = () => {
    document.querySelectorAll('.ptabs button').forEach(b => { const on = b.dataset.v == tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on) });
    const me = ME || {}, T = {
      perfil: `<div class=pn><div class=avrow><span data-a=photo role=button tabindex=0 title="Trocar foto">${avatar(me, 'xl')}</span><div class=cps><button data-a=photo>Trocar foto</button>${me.photo ? '<button class=g data-a=rmphoto>Remover</button>' : ''}</div></div>
        <label class=fld><span>Nome de exibição</span><input id=dn maxlength=32 value="${esc(me.displayName)}"></label>
        <label class=fld><span>@ de usuário</span><input id=un maxlength=20 value="${esc(me.username)}" autocapitalize=none autocomplete=off><small class=hint>3 a 20 caracteres: letras minúsculas, números, _ e .</small></label>
        <div><button data-a=saveprof>Salvar</button></div><p id=ms class=ok></p></div>`,
      aparencia: `<div class=pn><b class=cz>Modos:</b><div class="themes modes">${Object.entries(MODES).map(([k, v]) => `<button class="th ${document.documentElement.dataset.theme == k ? 'on' : ''}" data-a=theme data-v=${k}><i></i>${v}</button>`).join('')}</div></div>
        <div class=pn><b class=cz>Temas:</b><div class="themes palettes">${Object.entries(PALETTES).map(([k, v]) => `<button class="th ${document.documentElement.dataset.palette == k ? 'on' : ''}" data-a=palette data-v=${k}><i></i>${v}</button>`).join('')}</div></div>
        `,
      conta: `<div class=pn><b class=cz>E-mail</b><p style="margin:0">${esc(u.email || '—')}</p>${pwd ? `<label class=fld><span>Novo e-mail</span><input id=ne type=email autocomplete=email></label><label class=fld><span>Senha atual</span><input id=cp1 type=password autocomplete=current-password></label><div><button data-a=chmail>Alterar e-mail</button></div><p class=hint>Enviamos um link de confirmação para o novo endereço; o e-mail só muda depois de confirmar.</p>` : '<p class=hint>Sua conta entra com o Google, então o e-mail é gerenciado por lá.</p>'}<p id=ms class=ok></p></div>
        ${pwd ? `<div class=pn><b class=cz>Senha</b><label class=fld><span>Senha atual</span><input id=cp2 type=password autocomplete=current-password></label><label class=fld><span>Nova senha</span><input id=np type=password autocomplete=new-password minlength=6></label><label class=fld><span>Repetir nova senha</span><input id=np2 type=password autocomplete=new-password></label><div class=row><button data-a=chpass>Alterar senha</button><button class=g data-a=reset>Enviar e-mail de redefinição</button></div><p id=ms2 class=ok></p></div>` : ''}
        <div class=pn><b class=cz>Apagar perfil</b><p class=hint>Apaga sua conta, fichas, amizades e dados privados. Campanhas suas serão apagadas; fichas de outros jogadores serão mantidas e desvinculadas.</p><button class=danger data-a=delaccount style="justify-self:start">Apagar perfil</button></div>
        <div class=pn><button class=g data-a=out style="justify-self:start">Sair da conta</button></div>`,
      amigos: `<div class=pn><b class=cz>Solicitar amizade</b><div class=row><input id=fq placeholder="@usuario ou e-mail" style="flex:1 1 220px" autocapitalize=none><button data-a=addfr>Enviar solicitação</button></div><div class=row><button class=g data-a=mylink>Copiar meu link de amizade</button></div><p id=ms class=ok></p></div>
        <div class=pn><b class=cz>Solicitações recebidas (${friendRequests.incoming.length})</b>${friendRequests.incoming.map(r => `<div class=frow><span class=who>${avatar(r.fromProfile, 'sm')}<span class=mn><b>${esc(r.fromProfile?.displayName || 'Agente')}</b><small>@${esc(r.fromProfile?.username || '')}</small></span></span><span class=row><button data-a=acceptfr data-id="${esc(r.id)}" data-from="${esc(r.from)}">Aceitar</button><button class=g data-a=rejectfr data-id="${esc(r.id)}">Recusar</button></span></div>`).join('') || '<p class=hint>Nenhuma solicitação recebida.</p>'}</div>
        <div class=pn><b class=cz>Solicitações enviadas (${friendRequests.outgoing.length})</b>${friendRequests.outgoing.map(r => `<div class=frow><span class=who>${avatar(r.toProfile, 'sm')}<span class=mn><b>${esc(r.toProfile?.displayName || 'Agente')}</b><small>@${esc(r.toProfile?.username || '')}</small></span></span><button class=g data-a=cancelreq data-id="${esc(r.id)}" data-to="${esc(r.to)}">Cancelar</button></div>`).join('') || '<p class=hint>Nenhuma solicitação enviada.</p>'}</div>
        <div class=pn><b class=cz>Meus amigos (${friends.length})</b>${friends.map(p => `<div class=frow><span class=who>${avatar(p, 'sm')}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}</small></span></span><button class=g data-a=rmfr data-u="${esc(p.uid)}" aria-label="Remover ${esc(p.displayName)}">Remover</button></div>`).join('') || '<p class=hint>Você ainda não tem amigos adicionados.</p>'}</div>`
    }; $('#pb').innerHTML = T[tab] || T.perfil
  };
  draw(); watchFriends(u.uid, f => { friends = f; if (tab == 'amigos') { const k = $('#fq')?.value; draw(); if (k && $('#fq')) $('#fq').value = k } });
  watchFriendRequests(u.uid, r => { friendRequests = r; if (tab == 'amigos') { const k = $('#fq')?.value; draw(); if (k && $('#fq')) $('#fq').value = k } });
  addEventListener('hashchange', () => { tab = location.hash.slice(1) || 'perfil'; draw() });
  /* link de amizade: perfil.html?add=<uid> */
  const add = new URLSearchParams(location.search).get('add');
  if (add && add !== u.uid) getProfile(add).then(p => { tab = 'amigos'; draw(); modal(`<h3>Solicitar amizade</h3><div class=row style="justify-content:flex-start">${avatar(p)}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}</small></span></div><div class=row><button data-a=okadd data-u="${esc(add)}">Enviar solicitação</button><button class=g data-a=close>Cancelar</button></div>`) });
  const reauth = pw => reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(u.email, pw));
  const cropSave = async src => {
    const d = await openCropper(src, { aspect: 1, round: true, out: [256, 256], title: 'Foto de perfil' }); if (!d) return;
    await savePhoto(d)
  };
  const savePhoto = async d => { const b = writeBatch(db); b.update(doc(db, 'profiles', u.uid), { photo: d }); await b.commit(); setMe({ photo: d }); refreshAvatar(); draw(); toast(d ? 'Foto atualizada' : 'Foto removida') };
  act({
    tab: t => { tab = t.dataset.v; history.replaceState(null, '', '#' + tab); draw() },
    photo: async () => { const s = await pickImage(); if (s) await cropSave(s) },
    rmphoto: () => savePhoto(''),
    saveprof: async () => {
      const dn = $('#dn').value.trim(), un = clean($('#un').value); if (!dn) return msg('Escolha um nome de exibição.', 1); if (!validHandle(un)) return msg('O @ precisa ter 3 a 20 caracteres: a–z, 0–9, _ ou .', 1);
      const b = writeBatch(db); if (un !== ME.username) {
        const t = await getDoc(doc(db, 'usernames', un)); if (t.exists() && t.data().uid !== u.uid) return msg(`@${un} já está em uso.`, 1);
        b.set(doc(db, 'usernames', un), { uid: u.uid }); if (ME.username) b.delete(doc(db, 'usernames', ME.username))
      }
      b.update(doc(db, 'profiles', u.uid), { displayName: dn, username: un }); await b.commit(); setMe({ displayName: dn, username: un }); refreshAvatar(); msg('Perfil salvo ✓')
    },
    theme: t => { applyTheme(t.dataset.v); savePriv(u.uid, { theme: t.dataset.v }).catch(() => { }); draw() },
    palette: t => { applyPalette(t.dataset.v); savePriv(u.uid, { palette: t.dataset.v }).catch(() => { }); draw() },
    chmail: async () => {
      const ne = $('#ne').value.trim(); if (!ne || !$('#cp1').value) return msg('Preencha o novo e-mail e a senha atual.', 1);
      try { await reauth($('#cp1').value); await verifyBeforeUpdateEmail(auth.currentUser, ne); msg('Enviamos um link de confirmação para ' + ne + '.') } catch (x) { msg(x.code == 'auth/invalid-credential' || x.code == 'auth/wrong-password' ? 'Senha atual incorreta.' : err(x), 1) }
    },
    chpass: async () => {
      const m = t => { const e = $('#ms2'); e.textContent = t[0]; e.className = t[1] ? 'er' : 'ok' };
      if (!$('#cp2').value) return m(['Digite a senha atual.', 1]); if ($('#np').value.length < 6) return m(['A nova senha precisa ter ao menos 6 caracteres.', 1]); if ($('#np').value !== $('#np2').value) return m(['As senhas novas não conferem.', 1]);
      try { await reauth($('#cp2').value); await updatePassword(auth.currentUser, $('#np').value); m(['Senha alterada ✓']);['#cp2', '#np', '#np2'].forEach(i => $(i).value = '') } catch (x) { m([x.code == 'auth/invalid-credential' || x.code == 'auth/wrong-password' ? 'Senha atual incorreta.' : err(x), 1]) }
    },
    reset: async () => { await sendPasswordResetEmail(auth, u.email); toast('E-mail de redefinição enviado') },
    delaccount: () => modal(`<h3>Apagar perfil permanentemente?</h3><p>Essa ação não pode ser desfeita. Todas as suas fichas e campanhas serão apagadas. Fichas de outros jogadores serão preservadas.</p><label class=fld><span>Digite APAGAR para continuar</span><input id=delword autocomplete=off></label>${pwd ? '<label class=fld><span>Senha atual</span><input id=delpw type=password autocomplete=current-password></label>' : '<p class=hint>Você precisará confirmar sua identidade com o Google.</p>'}<p id=delstatus class=er></p><div class=row><button class=danger data-a=confirmdel>Apagar conta</button><button class=g data-a=close>Cancelar</button></div>`),
    confirmdel: async t => {
      const status = $('#delstatus');
      if ($('#delword').value !== 'APAGAR') { status.textContent = 'Digite APAGAR exatamente como aparece para confirmar.'; return }
      const current = auth.currentUser;
      if (!current) throw new Error('Sua sessão expirou. Entre novamente para continuar.');
      t.disabled = true;
      status.className = 'hint'; status.textContent = 'Confirmando identidade e apagando seus dados…';
      let cleanupStarted = false;
      try {
        if (pwd) {
          if (!$('#delpw').value) throw new Error('Digite sua senha atual.');
          await reauth($('#delpw').value)
        } else if (u.providerData.some(p => p.providerId === 'google.com')) {
          await reauthenticateWithPopup(current, new GoogleAuthProvider())
        } else {
          throw new Error('Não foi possível identificar o método de autenticação desta conta.')
        }
        cleanupStarted = true;
        await deleteAccountData(u.uid);
        await deleteUser(current);
        try { localStorage.removeItem('theme'); localStorage.removeItem('palette') } catch { }
        location.replace('index.html')
      } catch (x) {
        const detail = x?.code === 'auth/popup-closed-by-user' ? 'Autenticação cancelada.' : x?.code === 'auth/requires-recent-login' ? 'Entre novamente e tente apagar o perfil outra vez.' : err(x);
        status.className = 'er';
        status.textContent = `${cleanupStarted ? 'A exclusão não foi concluída; alguns dados podem já ter sido removidos. ' : ''}${detail}`;
        t.disabled = false
      }
    },
    addfr: async () => {
      const p = await findUser($('#fq').value); if (!p) return msg('Ninguém encontrado com esse @ ou e-mail.', 1);
      await sendFriendRequest(u.uid, p.uid); $('#fq').value = ''; msg(`Solicitação enviada para @${p.username} ✓`)
    },
    okadd: async t => { const p = await getProfile(t.dataset.u); await sendFriendRequest(u.uid, t.dataset.u); close(); toast(`Solicitação enviada para @${p.username}`); history.replaceState(null, '', 'perfil.html#amigos') },
    acceptfr: async t => { await answerFriendRequest({ id: t.dataset.id, from: t.dataset.from, to: u.uid }, u.uid, true); toast('Solicitação aceita; vocês agora são amigos.') },
    rejectfr: async t => { await answerFriendRequest({ id: t.dataset.id, to: u.uid }, u.uid, false); toast('Solicitação recusada.') },
    cancelreq: async t => { await answerFriendRequest({ id: t.dataset.id, from: u.uid, to: t.dataset.to }, u.uid, false); toast('Solicitação cancelada.') },
    rmfr: async t => { if (confirm('Remover este amigo?')) await removeFriend(u.uid, t.dataset.u) },
    mylink: () => clip(new URL('perfil.html?add=' + u.uid, location.href).href, 'Link de amizade copiado')
  });
});
