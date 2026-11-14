import { guard, page, act, qs, $, clip, toast, blank, migrate, err, esc, modal } from '../common.js';
import { db, doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from '../firebase.js';
import { mountSheet } from '../sheet.js';
import { clone } from '../portrait.js';
import { trackSheet } from '../profile.js';
const id = qs('id'), demo = qs('demo');
const SKIP = new Set(['updated', 'owner']);
/* texto estável (ordena as chaves) para comparar valores */
const st = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : x);
let M, S;

async function canAccessSheet(sheet, uid) {
    if (sheet.owner === uid) return true;
    if (!sheet.campaign) return false;
    const campaign = await getDoc(doc(db, 'campaigns', sheet.campaign));
    return campaign.exists() && campaign.data().master === uid
}

async function start(u) {
    S = blank();
    page(demo ? 'Ficha (demo, nada é salvo)' : 'Ficha', `<div class=row style="margin-bottom:10px"><a class="btn g" href="${demo ? 'index.html' : qs('c') ? 'campanha.html?id=' + qs('c') : 'fichas.html'}">← Voltar</a>${demo ? '' : '<button class=g data-a=obs>Copiar link do OBS</button><button class="g gear" data-a=obscfg title="Configurar portrait do OBS" aria-label="Configurar portrait do OBS">⚙</button><span id=sv class=mt></span>'}</div><div id=sh></div>`, u);
    if (demo) { M = mountSheet($('#sh'), S, {}); return }

    const ref = doc(db, 'sheets', id), server = {};   // server[k] = último valor conhecido no servidor (texto estável)
    let tm, first = true, dead = false, checkingAccess = false;
    const sv = t => { const e = $('#sv'); if (e) e.textContent = t };
    /* grava só os campos que mudaram, para dois dispositivos editarem campos diferentes sem se sobrescrever */
    const flush = () => {
        clearTimeout(tm); if (dead) return; const p = {}; let n = 0;
        for (const k of Object.keys(S)) { if (SKIP.has(k)) continue; const v = st(S[k]); if (v !== server[k]) { p[k] = clone(S[k]); server[k] = v; n++ } }
        if (!n) return; p.updated = serverTimestamp(); sv('Salvando…');
        return updateDoc(ref, p).then(() => sv('Salvo ✓')).catch(x => { for (const k in p) if (k != 'updated') server[k] = '__falhou__'; sv('Erro ao salvar'); toast(err(x), 1) })
    };
    const queue = () => { sv('Salvando…'); clearTimeout(tm); tm = setTimeout(flush, 250) };

    await new Promise((ok, no) => onSnapshot(ref, async snap => {
        if (dead) return;
        if (!snap.exists()) { if (first) { dead = true; page('Ficha', '<p>Ficha não encontrada.</p>', u); first = false; ok() } return }
        if (snap.metadata.hasPendingWrites) return;          // eco das minhas próprias gravações
        const d = snap.data(); let changed = false;
        if (first) {
            if (checkingAccess) return;
            checkingAccess = true;
            try {
                if (!await canAccessSheet(d, u.uid)) {
                    dead = true; first = false; checkingAccess = false;
                    page('Ficha', '<p class=er>Você não tem permissão para acessar esta ficha.</p>', u); ok(); return
                }
            } catch (x) {
                dead = true; first = false; checkingAccess = false; no(x); return
            }
            checkingAccess = false;
            Object.assign(S, blank(), d); migrate(S);
            if (d.owner === u.uid) trackSheet(u.uid, id);
            for (const k of Object.keys(d)) if (!SKIP.has(k)) server[k] = st(d[k]);
            first = false; ok(); return
        }
        for (const k of Object.keys(d)) {
            if (SKIP.has(k)) continue; const r = st(d[k]); if (r === server[k]) continue;
            const dirty = server[k] !== undefined && st(S[k]) !== server[k];   // tenho edição local ainda não enviada?
            server[k] = r; if (!dirty) { S[k] = clone(d[k]); changed = true }
        }
        if (changed) { migrate(S); M?.refresh() }
    }, x => { if (first) { first = false; no(x) } else toast(err(x), 1) }));
    if (dead) return;
    M = mountSheet($('#sh'), S, { onSave: queue });
    addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => document.hidden && flush());
    window.flushSheet = flush
}

/* ===== engrenagem: configuração do portrait do OBS ===== */
async function gear(u) {
    let master = false; const c = S.campaign;
    if (c) { try { master = (await getDoc(doc(db, 'campaigns', c))).data()?.master === u.uid } catch { } }
    const on = S.obs.useCampaign !== false && !!c;
    modal(`<h3>Portrait do OBS</h3>
  <label class=chk><input type=checkbox id=ucamp ${on ? 'checked' : ''} ${c ? '' : 'disabled'}> Usar portrait da campanha</label>
  <p class=mt style="font-size:14px;margin:0">${c ? 'Ligado: o OBS mostra o layout base criado pelo mestre para a campanha. Desligado: usa o layout próprio desta ficha.' : 'Esta ficha não está vinculada a uma campanha, então usa o layout próprio.'}</p>
  <div class=row><a class="btn" id=lay href="portrait-editor.html?sheet=${esc(id)}" style="${on ? 'opacity:.4;pointer-events:none' : ''}">Editar layout desta ficha</a>${master ? `<a class="btn g" href="portrait-editor.html?c=${esc(c)}">Editar layout base da campanha</a>` : ''}</div>
  <div class=row><button class=g data-a=obs>Copiar link do OBS</button><button class=g data-a=close>Fechar</button></div>
  <p class=mt style="font-size:13px;margin:0">No OBS: Fonte → Navegador, cole o link e use o tamanho indicado no editor de layout. O fundo é transparente.</p>`);
    const cb = $('#ucamp'); cb.onchange = () => {
        M.upd(s => s.obs = { ...s.obs, useCampaign: cb.checked }, false);
        const l = $('#lay'); l.style.opacity = cb.checked ? .4 : 1; l.style.pointerEvents = cb.checked ? 'none' : ''
    }
}
act({ obs: () => clip(new URL('obs.html?id=' + id, location.href).href, 'Link do OBS copiado'), obscfg: () => gear(U) });
let U;
const fail = (x, u) => page('Ficha', `<p class=er>${err(x)}</p>`, u);
demo ? start(null) : guard(u => { U = u; start(u).catch(x => fail(x, u)) });
