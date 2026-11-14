import {guard,page,act,qs,$,clip,toast,blank,err} from '../common.js';
import {db,doc,getDoc,setDoc,serverTimestamp} from '../firebase.js';
import {mountSheet} from '../sheet.js';
const id=qs('id'),demo=qs('demo'),c=qs('c');
async function start(u){let s=blank();
 if(!demo){const d=await getDoc(doc(db,'sheets',id));if(!d.exists())return page('Ficha','<p>Ficha não encontrada.</p>',u);s={...s,...d.data()}}
 page(demo?'Ficha (demo, nada é salvo)':'Ficha',`<div class=row style="margin-bottom:10px"><a class="btn g" href="${demo?'index.html':c?'campanha.html?id='+c:'fichas.html'}">← Voltar</a>${demo?'':'<button class=g data-a=obs>Copiar link do OBS</button>'}</div><div id=sh></div>`,u);
 let tm;mountSheet($('#sh'),s,{onSave:()=>{if(demo)return;clearTimeout(tm);tm=setTimeout(()=>setDoc(doc(db,'sheets',id),{...s,updated:serverTimestamp()}).catch(x=>toast(err(x),1)),500)}})}
act({obs:()=>clip(new URL('obs.html?id='+id,location.href).href,'Link do OBS copiado')});
const fail=(x,u)=>page('Ficha',`<p class=er>${err(x)}</p>`,u);
demo?start(null):guard(u=>start(u).catch(x=>fail(x,u)));
