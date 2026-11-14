import { auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../firebase.js';
import { $, act } from '../common.js';
$('#app').innerHTML = `<div class=login><h1>Fichas de Agentes</h1><input id=em type=email placeholder=E-mail><input id=pw type=password placeholder=Senha><button data-a=signin>Entrar</button><button class=g data-a=signup>Criar conta</button><button class=g data-a=google>Entrar com Google</button><p id=er class=er></p><a href="ficha.html?demo=1">Ver a ficha sem login (demo)</a></div>`;
onAuthStateChanged(auth, u => { if (u) { const n = sessionStorage.next; sessionStorage.removeItem('next'); location.href = n || 'painel.html' } });
const fail = x => $('#er').textContent = x.code || x.message;
act({
    signin: () => signInWithEmailAndPassword(auth, $('#em').value, $('#pw').value).catch(fail),
    signup: () => createUserWithEmailAndPassword(auth, $('#em').value, $('#pw').value).catch(fail),
    google: () => signInWithPopup(auth, new GoogleAuthProvider()).catch(fail)
});
