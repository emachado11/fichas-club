import { guard, page, act, $, blank, err, PERF } from '../common.js';
import { db, addDoc, collection } from '../firebase.js';
guard(u => {
    let p = 'Executor';
    page('Nova ficha', `<div class=pn style="display:grid;gap:10px;max-width:640px"><input id=nm placeholder="Nome do agente" maxlength=32><input id=oc placeholder=Ocupação maxlength=28><label>Nível <select id=nv>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option>${n}</option>`).join('')}</select></label><div id=pfs></div><button data-a=create>Criar ficha</button><p id=er class=er></p></div>`, u);
    const draw = () => { document.body.dataset.p = p; $('#pfs').innerHTML = Object.keys(PERF).map(k => `<div class="pf ${k} ${k == p ? 'on' : ''}" data-a=pick data-v=${k}><h3>${k}</h3><p>${PERF[k]}</p></div>`).join('') }; draw();
    act({
        pick: t => { p = t.dataset.v; draw() }, create: async () => {
            $('#er').textContent = '';
            try { const r = await addDoc(collection(db, 'sheets'), { ...blank(), name: $('#nm').value || 'Novo Agente', ocup: $('#oc').value, nivel: +$('#nv').value, perfil: p, owner: u.uid }); location.href = 'ficha.html?id=' + r.id }
            catch (x) { $('#er').textContent = err(x) }
        }
    })
});
