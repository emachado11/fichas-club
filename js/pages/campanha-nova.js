import { guard, page, act, $, err } from '../common.js';
import { db, addDoc, collection } from '../firebase.js';
guard(u => {
    page('Nova campanha', `<div class=pn style="display:grid;gap:10px;max-width:480px"><input id=nm placeholder="Nome da campanha" maxlength=50><button data-a=create>Criar campanha</button><p id=er class=er></p></div>`, u);
    act({
        create: async () => {
            const n = $('#nm').value.trim(); if (!n) return;
            try { const r = await addDoc(collection(db, 'campaigns'), { name: n, master: u.uid, members: [u.uid] }); location.href = 'campanha.html?id=' + r.id } catch (x) { $('#er').textContent = err(x) }
        }
    })
});
