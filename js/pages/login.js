import { auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from '../firebase.js';
import { $, act } from '../common.js?v=11';
const MSG = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.', 'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'Digite um e-mail válido.', 'auth/missing-password': 'Digite a senha.', 'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Use “Entrar”.', 'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet.', 'auth/popup-closed-by-user': '', 'auth/cancelled-popup-request': ''
};
$('#app').innerHTML = `<form class=login id=lf novalidate><img class=lg src="img/logo.png" alt="The Club"><h1>The Club</h1>
<input id=em type=email name=email autocomplete=username inputmode=email autocapitalize=off placeholder=E-mail aria-label=E-mail>
<input id=pw type=password name=password autocomplete=current-password placeholder=Senha aria-label=Senha>
<button type=submit id=bs>Entrar</button><button type=button class=g data-a=signup>Criar conta</button><button type=button class=g data-a=google>Entrar com Google</button><p id=er class=er role=alert></p><div id=cont class=cont hidden><button type=button data-a=cont>Continuar como <b id=cn></b></button><button type=button class=g data-a=other>Usar outra conta</button></div></form>`;
/* Só redireciona quando o Firebase restaura uma sessão autenticada existente. */
let redirecting = false;
const go = () => {
    if (redirecting) return;
    redirecting = true;
    try { localStorage.setItem('club-in', '1') } catch { }
    const n = sessionStorage.next; sessionStorage.removeItem('next');
    location.replace(n || 'painel.html')
};
onAuthStateChanged(auth, u => {
    $('#cont').hidden = !u;
    if (u) {
        $('#cn').textContent = u.email || u.displayName || 'sua conta';
        go()
    }
});
const fail = x => { $('#er').textContent = x.code in MSG ? MSG[x.code] : (x.code || x.message) };
const busy = on => document.querySelectorAll('#lf button').forEach(b => b.disabled = on);
const run = p => { $('#er').textContent = ''; busy(true); return p().then(go).catch(fail).finally(() => busy(false)) };
$('#lf').onsubmit = e => { e.preventDefault(); run(() => signInWithEmailAndPassword(auth, $('#em').value.trim(), $('#pw').value)) };
act({
    signup: () => run(() => createUserWithEmailAndPassword(auth, $('#em').value.trim(), $('#pw').value)),
    google: () => run(() => { const g = new GoogleAuthProvider(); g.setCustomParameters({ prompt: 'select_account' }); return signInWithPopup(auth, g) }),
    cont: go,
    other: () => signOut(auth).then(() => { try { localStorage.removeItem('club-in') } catch { } })
});
