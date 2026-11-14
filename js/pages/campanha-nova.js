import { guard, page, act, $, err, load, jpg } from '../common.js';
import { db, addDoc, collection, serverTimestamp } from '../firebase.js';
import { pickImage, openCropper } from '../cropper.js';

guard(u => {
    let banner = '', thumb = '';
    page('Nova campanha', `<div class=pn style="display:grid;gap:12px;max-width:640px"><label class=fld><span>Nome da campanha</span><input id=nm maxlength=50></label>
  <label class=fld><span>Descrição</span><textarea id=ds rows=4 maxlength=400 placeholder="Sobre o que é essa campanha?"></textarea></label>
  <div class=fld><span>Banner (proporção 8:3, ex.: 960 × 360 pixels)</span><div class=cbn id=bn data-a=banner role=button tabindex=0>+ Escolher imagem</div></div>
  <button data-a=create>Criar campanha</button><p id=er class=er></p></div>`, u);
    act({
        banner: async () => {
            const src = await pickImage(); if (!src) return;
            const d = await openCropper(src, { aspect: 8 / 3, round: false, out: [960, 360], title: 'Banner da campanha' }); if (!d) return;
            banner = d; const c = document.createElement('canvas'); c.width = 400; c.height = 150; c.getContext('2d').drawImage(await load(d), 0, 0, 400, 150); thumb = jpg(c, .75);
            const b = $('#bn'); b.style.backgroundImage = `url('${d}')`; b.textContent = ''; b.classList.add('has')
        },
        create: async () => {
            const n = $('#nm').value.trim(); if (!n) { $('#er').textContent = 'Dê um nome à campanha.'; return }
            try { const r = await addDoc(collection(db, 'campaigns'), { name: n, desc: $('#ds').value.trim(), banner, thumb, master: u.uid, members: [u.uid], created: serverTimestamp() }); location.href = 'campanha.html?id=' + r.id } catch (x) { $('#er').textContent = err(x) }
        }
    })
});
