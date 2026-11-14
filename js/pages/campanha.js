import { guard, page, act, qs, $, esc, clip, err, modal, close, face, picHTML } from '../common.js';
import { db, doc, collection, query, where, onSnapshot, getDocs, updateDoc } from '../firebase.js';
const id = qs('id'); let U;
guard(u => {
    U = u; page('Campanha', '<div id=ct></div>', u); let c, L = [];
    const draw = () => {
        if (!c) return; const m = c.master == u.uid, v = L.filter(x => m || x.owner == u.uid);
        $('#ct').innerHTML = `<h3>${esc(c.name)} <span class=mt>${m ? 'Área do mestre' : 'Área do jogador'}</span></h3>
  <div class=row style="margin:10px 0">${m ? '<button data-a=invite>Copiar link de convite</button><a class="btn" href="portrait-editor.html?c=' + id + '">Layout base dos portraits (OBS)</a>' : ''}<button class=g data-a=link>Vincular uma ficha</button></div>
  <div class=pn><h3>${m ? 'Todas as fichas' : 'Minhas fichas na campanha'}</h3>${v.map(x => `<div class=card data-a=open data-id=${x.id}><span class=row><span class="pic sm">${picHTML(face(x), x.crop)}</span><span>${esc(x.name)} <span class=mt>${x.perfil}, nível ${x.nivel}</span></span></span><span>PV ${x.pv}/${x.pvMax} · PD ${x.pd}/${x.pdMax}</span><button class=g data-a=obs data-id=${x.id}>OBS</button></div>`).join('') || '<p class=mt>Nenhuma ficha vinculada.</p>'}</div>
  <div class="pn mt" style="margin-top:12px">Investigação${m ? ' e escudo do mestre' : ''}: em breve.</div>`
    };
    onSnapshot(doc(db, 'campaigns', id), d => { c = d.data(); draw() }, x => $('#ct').innerHTML = `<p class=er>${err(x)}</p>`);
    onSnapshot(query(collection(db, 'sheets'), where('campaign', '==', id)), q => { L = q.docs.map(d => ({ id: d.id, ...d.data() })); draw() })
});
act({
    invite: () => clip(new URL('convite.html?c=' + id, location.href).href, 'Link de convite copiado'),
    obs: t => clip(new URL('obs.html?id=' + t.dataset.id, location.href).href, 'Link do OBS copiado'),
    open: t => location.href = `ficha.html?id=${t.dataset.id}&c=${id}`,
    link: async () => {
        const q = await getDocs(query(collection(db, 'sheets'), where('owner', '==', U.uid)));
        modal(`<h3>Vincular ficha</h3>${q.docs.map(d => `<button class=cat data-a=dolink data-id=${d.id}>${esc(d.data().name)}</button>`).join('') || '<p>Crie uma ficha primeiro.</p>'}<button class=g data-a=close>Fechar</button>`)
    },
    dolink: async t => { await updateDoc(doc(db, 'sheets', t.dataset.id), { campaign: id }); close() }
});
