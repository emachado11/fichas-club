import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { onSnapshot as _onSnapshot, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword, verifyBeforeUpdateEmail, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser, EmailAuthProvider, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
export { doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, serverTimestamp, writeBatch, deleteField, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyD5s6r-X_GLuEJCJdK7Yrlz1a_HT_X3Eho",
    authDomain: "the-club-fichas.firebaseapp.com",
    projectId: "the-club-fichas",
    storageBucket: "the-club-fichas.firebasestorage.app",
    messagingSenderId: "897327064601",
    appId: "1:897327064601:web:77946fdb1f03bf11f86c88"
};
const fb = initializeApp(firebaseConfig);
/* Cache local (IndexedDB): páginas abrem com os dados do último acesso e atualizam em seguida. */
let _db;
try { _db = initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }) } catch { _db = getFirestore(fb) }
export const auth = getAuth(fb), db = _db;
/* Escutas em tempo real ficam registradas: ao trocar de página (sem recarregar) as da página antiga são encerradas.
   Escutas do cabeçalho (scope.global) permanecem. */
export const scope = { unsubs: [], global: false };
export const onSnapshot = (...a) => { const u = _onSnapshot(...a); if (!scope.global) scope.unsubs.push(u); return u };
