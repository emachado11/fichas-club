/* Perfil: foto, nomes, @usuário, aparência, idioma, conta e amigos */
import { guard, page, act, $, esc, toast, err, clip, modal, close } from '../common.js';
import { auth, db, doc, writeBatch, getDoc, updatePassword, verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from '../firebase.js';
import { ME, setMe, PRIV, savePriv, applyTheme, applyLang, THEMES, clean, validHandle, findUser, addFriend, removeFriend, watchFriends, avatar, getProfile } from '../profile.js';
import { pickImage, openCropper } from '../cropper.js';
import { refreshAvatar } from '../header.js';

const LANGS = { 'pt-BR': 'Português (Brasil)', en: 'English', es: 'Español' };
guard(u => {
  let tab = location.hash.slice(1) || 'perfil', friends = [];
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
      aparencia: `<div class=pn><b class=cz>Tema</b><div class=themes>${Object.entries(THEMES).map(([k, v]) => `<button class="th ${document.documentElement.dataset.theme == k ? 'on' : ''}" data-a=theme data-v=${k}><i></i>${v}</button>`).join('')}</div></div>
        <div class=pn><label class=fld><span>Idioma</span><select id=lg>${Object.entries(LANGS).map(([k, v]) => `<option value=${k} ${(PRIV.lang || localStorage.lang || 'pt-BR') == k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><p class=hint>A escolha fica salva na sua conta. A tradução dos textos do site ainda está em desenvolvimento: por enquanto a interface continua em português.</p></div>`,
      conta: `<div class=pn><b class=cz>E-mail</b><p style="margin:0">${esc(u.email || '—')}</p>${pwd ? `<label class=fld><span>Novo e-mail</span><input id=ne type=email autocomplete=email></label><label class=fld><span>Senha atual</span><input id=cp1 type=password autocomplete=current-password></label><div><button data-a=chmail>Alterar e-mail</button></div><p class=hint>Enviamos um link de confirmação para o novo endereço; o e-mail só muda depois de confirmar.</p>` : '<p class=hint>Sua conta entra com o Google, então o e-mail é gerenciado por lá.</p>'}<p id=ms class=ok></p></div>
        ${pwd ? `<div class=pn><b class=cz>Senha</b><label class=fld><span>Senha atual</span><input id=cp2 type=password autocomplete=current-password></label><label class=fld><span>Nova senha</span><input id=np type=password autocomplete=new-password minlength=6></label><label class=fld><span>Repetir nova senha</span><input id=np2 type=password autocomplete=new-password></label><div class=row><button data-a=chpass>Alterar senha</button><button class=g data-a=reset>Enviar e-mail de redefinição</button></div><p id=ms2 class=ok></p></div>` : ''}
        <div class=pn><button class=g data-a=out style="justify-self:start">Sair da conta</button></div>`,
      amigos: `<div class=pn><b class=cz>Adicionar amigo</b><div class=row><input id=fq placeholder="@usuario ou e-mail" style="flex:1 1 220px" autocapitalize=none><button data-a=addfr>Adicionar</button></div><div class=row><button class=g data-a=mylink>Copiar meu link de amizade</button></div><p id=ms class=ok></p></div>
        <div class=pn><b class=cz>Meus amigos (${friends.length})</b>${friends.map(p => `<div class=frow><span class=who>${avatar(p, 'sm')}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}</small></span></span><button class=g data-a=rmfr data-u="${esc(p.uid)}" aria-label="Remover ${esc(p.displayName)}">Remover</button></div>`).join('') || '<p class=hint>Você ainda não tem amigos adicionados.</p>'}</div>`
    }; $('#pb').innerHTML = T[tab] || T.perfil
  };
  draw(); watchFriends(u.uid, f => { friends = f; if (tab == 'amigos') { const k = $('#fq')?.value; draw(); if (k && $('#fq')) $('#fq').value = k } });
  addEventListener('hashchange', () => { tab = location.hash.slice(1) || 'perfil'; draw() });
  /* link de amizade: perfil.html?add=<uid> */
  const add = new URLSearchParams(location.search).get('add');
  if (add && add !== u.uid) getProfile(add).then(p => { tab = 'amigos'; draw(); modal(`<h3>Adicionar amigo</h3><div class=row style="justify-content:flex-start">${avatar(p)}<span class=mn><b>${esc(p.displayName)}</b><small>@${esc(p.username)}</small></span></div><div class=row><button data-a=okadd data-u="${esc(add)}">Adicionar</button><button class=g data-a=close>Cancelar</button></div>`) });
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
    addfr: async () => {
      const p = await findUser($('#fq').value); if (!p) return msg('Ninguém encontrado com esse @ ou e-mail.', 1);
      await addFriend(u.uid, p.uid); $('#fq').value = ''; msg(`@${p.username} adicionado ✓`)
    },
    okadd: async t => { await addFriend(u.uid, t.dataset.u); close(); toast('Amigo adicionado'); history.replaceState(null, '', 'perfil.html#amigos') },
    rmfr: async t => { if (confirm('Remover este amigo?')) await removeFriend(u.uid, t.dataset.u) },
    mylink: () => clip(new URL('perfil.html?add=' + u.uid, location.href).href, 'Link de amizade copiado')
  });
  $('#app').addEventListener('change', e => { if (e.target.id == 'lg') { const v = e.target.value; applyLang(v); savePriv(u.uid, { lang: v }).catch(() => { }); toast('Idioma salvo') } })
});
