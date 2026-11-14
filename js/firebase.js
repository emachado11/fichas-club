import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword, verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
export { doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, arrayUnion, collection, query, where, onSnapshot, serverTimestamp, writeBatch, deleteField, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyD5s6r-X_GLuEJCJdK7Yrlz1a_HT_X3Eho",
    authDomain: "the-club-fichas.firebaseapp.com",
    projectId: "the-club-fichas",
    storageBucket: "the-club-fichas.firebasestorage.app",
    messagingSenderId: "897327064601",
    appId: "1:897327064601:web:77946fdb1f03bf11f86c88"
};
const fb = initializeApp(firebaseConfig);
export const auth = getAuth(fb), db = getFirestore(fb);
