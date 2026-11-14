import {guard,page,act,$,esc,err} from '../common.js';
import {db,collection,query,where,onSnapshot,deleteDoc,doc} from '../firebase.js';
guard(u=>{page('Minhas fichas','<div id=ls></div>',u);
 onSnapshot(query(collection(db,'sheets'),where('owner','==',u.uid)),q=>{
  $('#ls').innerHTML=q.docs.map(d=>{const x=d.data();return `<div class=card data-a=open data-id=${d.id}><span>${esc(x.name)} <span class=mt>${x.perfil}, nível ${x.nivel}</span></span><button class=g data-a=del data-id=${d.id}>×</button></div>`}).join('')||'<p class=mt>Nenhuma ficha. <a href=ficha-nova.html>Criar ficha</a></p>'},x=>$('#ls').textContent=err(x));
 act({open:t=>location.href='ficha.html?id='+t.dataset.id,del:t=>confirm('Excluir esta ficha?')&&deleteDoc(doc(db,'sheets',t.dataset.id))})});
