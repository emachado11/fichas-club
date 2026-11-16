import { guard, page, err } from '../common.js?v=12';
import { db, doc, updateDoc, arrayUnion } from '../firebase.js';
const c = new URLSearchParams(location.search).get('c');
guard(async u => {
    page('Convite', '<p>Entrando na campanha...</p>', u);
    try { await updateDoc(doc(db, 'campaigns', c), { members: arrayUnion(u.uid) }); location.replace('campanha.html?id=' + c) }
    catch (x) { page('Convite', `<p class=er>${err(x)}</p>`, u) }
});
