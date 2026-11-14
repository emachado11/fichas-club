import { $, qs, blank } from '../common.js';
import { db, doc, onSnapshot } from '../firebase.js';
import { mountSheet } from '../sheet.js';
document.body.classList.add('obs');
const s = blank(), m = mountSheet($('#app'), s, { ro: true });
onSnapshot(doc(db, 'sheets', qs('id')), d => { Object.keys(s).forEach(k => delete s[k]); Object.assign(s, blank(), d.data()); m.render() });
