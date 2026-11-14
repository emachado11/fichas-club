import { guard, page, act, $, esc, err } from '../common.js';
import { db, collection, query, where, onSnapshot } from '../firebase.js';
guard(u => {
    page('Minhas campanhas', '<div id=ls></div>', u);
    onSnapshot(query(collection(db, 'campaigns'), where('members', 'array-contains', u.uid)), q => {
        $('#ls').innerHTML = q.docs.map(d => { const x = d.data(); return `<div class=card data-a=open data-id=${d.id}><span>${esc(x.name)}</span><span class=mt>${x.master == u.uid ? 'Mestre' : 'Jogador'}</span></div>` }).join('') || '<p class=mt>Nenhuma campanha. <a href=campanha-nova.html>Criar campanha</a></p>'
    }, x => $('#ls').textContent = err(x));
    act({ open: t => location.href = 'campanha.html?id=' + t.dataset.id })
});
