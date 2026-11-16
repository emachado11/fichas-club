import { guard, page, act, $, blank, err, PERF } from '../common.js?v=12';
import { db, addDoc, collection, serverTimestamp } from '../firebase.js';
guard(u => {
    let p = 'Executor';
    page('Nova ficha', `<div class=pn style="display:grid;gap:10px;max-width:640px"><input id=nm placeholder="Nome do agente" maxlength=32><div id=pfs></div><button data-a=create>Criar ficha</button><p id=er class=er></p></div>`, u);
    const draw = () => { document.body.dataset.p = p; $('#pfs').innerHTML = Object.keys(PERF).map(k => `<div class="pf ${k} ${k == p ? 'on' : ''}" data-a=pick data-v=${k}><h3>${k}</h3><p>${PERF[k]}</p></div>`).join('') }; draw();
    act({
        pick: t => { p = t.dataset.v; draw() }, create: async () => {
            $('#er').textContent = '';
            try { const r = await addDoc(collection(db, 'sheets'), { ...blank(), name: $('#nm').value || 'Novo Agente', perfil: p, owner: u.uid, updated: serverTimestamp() }); location.href = 'ficha.html?id=' + r.id }
            catch (x) { $('#er').textContent = err(x) }
        }
    })
});
