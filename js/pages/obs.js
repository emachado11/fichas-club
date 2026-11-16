/* Página do OBS (Fonte de navegador): só o portrait, fundo transparente. */
import { $, qs, blank, migrate } from '../common.js?v=12';
import { db, doc, onSnapshot } from '../firebase.js';
import { createPortrait, dataFromSheet, DEFAULT } from '../portrait.js?v=2';
document.body.classList.add('obs');
const app = $('#app'), pg = createPortrait(app);
let sheet = null, camp = undefined, campId = null, unsub = null, key = '';
/* Qual layout usar: o da campanha (se a ficha estiver vinculada e "usar portrait da campanha" estiver ligado) ou o da própria ficha. */
const useCamp = () => !!sheet?.campaign && sheet.obs?.useCampaign !== false;
function show() {
    if (!sheet) return;
    const l = useCamp() && camp ? camp : sheet.obs?.layout || DEFAULT();
    const k = JSON.stringify(l); if (k !== key) { key = k; pg.setLayout(l); fit() }
    pg.setData(dataFromSheet(sheet))
}
/* ?fit=1 escala o portrait para caber na janela da fonte do OBS */
function fit() { if (qs('fit')) { const w = pg.layout.w, h = pg.layout.h, k = Math.min(innerWidth / w, innerHeight / h); app.style.transformOrigin = '0 0'; app.style.transform = `scale(${k})` } }
addEventListener('resize', fit);
function watchCampaign() {
    const c = useCamp() ? sheet.campaign : null; if (c === campId) return; campId = c; unsub?.(); camp = undefined;
    if (c) unsub = onSnapshot(doc(db, 'layouts', c), d => { camp = d.exists() ? d.data().layout : null; show() }, () => { camp = null; show() })
}
onSnapshot(doc(db, 'sheets', qs('id')), d => {
    if (!d.exists()) return; sheet = migrate({ ...blank(), ...d.data() }); watchCampaign();
    if (useCamp() && camp === undefined) return;   // espera carregar o layout da campanha para não "piscar" o layout errado
    show()
});
