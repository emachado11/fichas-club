/* Início: hero da última campanha + 3 últimas fichas abertas */
import { guard, page, esc, $ } from '../common.js';
import { db, doc, getDoc, getDocs, collection, query, where } from '../firebase.js';
import { PRIV } from '../profile.js';
import { fab, sheetCard, skel } from '../ui.js';

const ms = x => x?.updated?.toMillis?.() || 0;
guard(async u => {
    page('', `<div id=hero><div class=skel-h></div></div><div class=sec><h3>Fichas recentes</h3><a href=fichas.html>Ver todas</a></div><div id=rec class=grid>${skel(3)}</div>${fab([{ href: 'ficha-nova.html', label: 'Criar Ficha' }, { href: 'campanha-nova.html', label: 'Criar Campanha' }])}`, u);
    const camp = async () => {
        if (PRIV.lastCampaign) { try { const d = await getDoc(doc(db, 'campaigns', PRIV.lastCampaign)); if (d.exists() && (d.data().members || []).includes(u.uid)) return { id: d.id, ...d.data() } } catch { } }
        try { const q = await getDocs(query(collection(db, 'campaigns'), where('members', 'array-contains', u.uid))); return q.docs[0] ? { id: q.docs[0].id, ...q.docs[0].data() } : null } catch { return null }
    };
    const sheets = async () => {
        const out = [], seen = new Set(), add = d => {
            if (!d.exists() || seen.has(d.id) || out.length >= 3) return;
            const sheet = { id: d.id, ...d.data() };
            if (sheet.owner !== u.uid) return;
            seen.add(d.id); out.push(sheet)
        };
        const docs = await Promise.all((PRIV.recent || []).slice(0, 6).map(id => getDoc(doc(db, 'sheets', id)).catch(() => null)));   // em paralelo
        docs.forEach(d => d && add(d));
        if (out.length < 3) try { (await getDocs(query(collection(db, 'sheets'), where('owner', '==', u.uid)))).docs.sort((a, b) => ms(b.data()) - ms(a.data())).forEach(add) } catch { }
        return out
    };
    const [c, S] = await Promise.all([camp(), sheets()]);
    $('#hero').innerHTML = c
        ? `<a class=hero href="campanha.html?id=${esc(c.id)}" style="${c.banner ? `background-image:url('${esc(c.banner)}')` : ''}"><div class=hi><span class=chip>Última campanha · ${c.master === u.uid ? 'Mestre' : 'Jogador'}</span><h1>${esc(c.name)}</h1>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}<span class=go>Continuar campanha →</span></div></a>`
        : `<a class="hero empty" href=campanha-nova.html><div class=hi><span class=chip>Bem-vindo ao The Club</span><h1>Comece sua primeira campanha</h1><p>Crie uma campanha como mestre ou entre numa por convite de um amigo.</p><span class=go>Criar campanha</span></div></a>`;
    $('#rec').innerHTML = S.map(x => sheetCard(x)).join('') || `<div class=empty-s style="grid-column:1/-1"><p>Você ainda não abriu nenhuma ficha.</p><p><a href=ficha-nova.html>Criar uma ficha</a></p></div>`
});
