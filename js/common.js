import {auth,onAuthStateChanged,signOut} from './firebase.js';
export const $=s=>document.querySelector(s);
export const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const qs=k=>new URLSearchParams(location.search).get(k);
export const D=[4,6,8,10,12,20],AN={f:'Físico',m:'Mente',e:'Emoção'};
export const SK=[["Acrobacia","f"],["Animais/Máquinas","e"],["Aptidão","m"],["Atletismo","f"],["Bruxaria/Ocultismo","m"],["Carisma/Persuasão","e"],["Crime","f"],["Disciplina","e"],["Enganação","e"],["Furtividade","f"],["Inspecionar/Pesquisa","m"],["Intimidar","e"],["Intuição","e"],["Luta","f"],["Medicina","m"],["Ofício/Tecnologia","m"],["Percepção","m"],["Pontaria","f"],["Sobrevivência","m"],["Vigor","f"]];
export const PERF={Executor:"Você age primeiro e pensa depois. E, se não der certo da primeira vez, tenta de novo até conseguir, vencendo pela força de sua perseverança.",Analista:"Você observa, entende e se prepara, para só então agir. Pode demorar para tomar uma atitude, mas quando o faz, é com a maior precisão possível.",Vigilante:"Você está sempre atento aos arredores, aproveitando as brechas perfeitas para agir primeiro. Se adapta a imprevistos e não tem problemas em tomar decisões sob pressão."};
export const CAT={hab:[["Reflexos rápidos","Uma vez por cena, age antes de todos."],["Olhar clínico","+1 passo em Percepção ao examinar um alvo."],["Voz firme","Pode acalmar aliados em pânico."]],
 equip:[["Pistola leve","Dano curto, fácil de ocultar."],["Faca de combate","Dano corpo a corpo discreto."],["Colete reforçado","Reduz o dano recebido."]],
 itens:[["Kit de primeiros socorros","Estabiliza um aliado ferido."],["Lanterna","Ilumina ambientes escuros."],["Cordas e ganchos","Auxilia escaladas."]]};
export const TABN={hab:"Habilidades",equip:"Equipamentos",itens:"Itens",outros:"Outros"};
export const blank=()=>({name:"Novo Agente",perfil:"Executor",ocup:"",nivel:1,a:{f:1,m:1,e:1},pv:6,pvMax:6,pd:6,pdMax:6,img:{},sk:{},rel:[],hab:[],equip:[],itens:[],outros:"",campaign:null});
export const face=s=>{const i=s.img||{};if(!i.main)return '';
 if(s.pv<=0&&i.morrendo)return i.morrendo;if(s.pv<=s.pvMax/2&&i.ferido)return i.ferido;
 if(s.pd<=0&&i.exausto)return i.exausto;if(s.pd<=s.pdMax/2&&i.cansado)return i.cansado;return i.main};
export const toast=(m,bad)=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',bad?6000:2000)};
export const modal=h=>{$('#modal').innerHTML=`<div class=mb>${h}</div>`;$('#modal').classList.add('on')};
export const close=()=>$('#modal').classList.remove('on');
export const clip=(s,m)=>navigator.clipboard.writeText(s).then(()=>toast(m));
export const err=e=>e?.code==='permission-denied'||/permissions/i.test(e?.message||'')?'Sem permissão no Firestore. Publique as regras do arquivo firestore.rules.':(e?.code||e?.message||String(e));
export const guard=cb=>onAuthStateChanged(auth,u=>{if(u)cb(u);else{sessionStorage.next=location.href;location.href='index.html'}});
const NAV=[['painel.html','Painel'],['fichas.html','Fichas'],['ficha-nova.html','Nova ficha'],['campanhas.html','Campanhas'],['campanha-nova.html','Nova campanha']];
export function page(title,html,u){const here=location.pathname.split('/').pop();
 $('#app').innerHTML=`<div class=wrap><div class=bar0><nav class=row>${NAV.map(([h,t])=>`<a href=${h} class="${h==here?'on':''}">${t}</a>`).join('')}</nav><div class=row><span class=mt>${esc(u?.email||'')}</span>${u?'<button class=g data-a=out>Sair</button>':''}</div></div><h2 style="margin-bottom:12px">${title}</h2>${html}</div>`}
export function act(map){const m={close,out:()=>signOut(auth).then(()=>location.href='index.html'),...map};
 document.addEventListener('click',async e=>{if(e.target.id==='modal')m.close();const t=e.target.closest('[data-a]');if(!t||!m[t.dataset.a])return;
  try{await m[t.dataset.a](t,e)}catch(x){toast(err(x),1)}})}
/* imagens */
export const load=src=>new Promise((ok,no)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=no;i.src=src});
export const rd=f=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(f)});
export function crop(im,sz,z=1,ox=0,oy=0,cv){const c=cv||document.createElement('canvas');c.width=c.height=sz;const m=Math.min(im.width,im.height)/z;
 c.getContext('2d').drawImage(im,(im.width-m)/2*(1+ox),(im.height-m)/2*(1+oy),m,m,0,0,sz,sz);return c}
export const jpg=c=>c.toDataURL('image/jpeg',.82);
export async function small(src){try{return jpg(crop(await load(src),256))}catch{return src}}
