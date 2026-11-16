/* Editor de enquadramento (mesmo visual das fichas): arraste e use o zoom.
   openCropper(src, { aspect: 1, round: true, out: [256, 256] }) → Promise<dataURL | null> */
import { $, modal, close, load, jpg, esc } from './common.js?v=12';

export const pickImage = () => new Promise(ok => {
  const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
  f.onchange = () => { const x = f.files[0]; if (!x) return ok(null); const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(x) }; f.click()
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export async function openCropper(src, { aspect = 1, round = true, out = [256, 256], title = 'Editar imagem' } = {}) {
  const im = await load(src), W = im.naturalWidth || im.width, H = im.naturalHeight || im.height;
  const rw = aspect >= 1 ? Math.min(320, innerWidth - 70) : 260, rh = rw / aspect, base = Math.max(rw / W, rh / H);
  let z = 1, x = 0, y = 0;
  return new Promise(done => {
    modal(`<div class=ce><div class=ceh><h3>${esc(title)}</h3><button class="g cex" data-c=no aria-label=Fechar>✕</button></div>
    <div class=stage id=cst><img class=gh id=cg draggable=false src="${esc(src)}" alt=""><div class=ring id=cr style="width:${rw}px;height:${rh}px;border-radius:${round ? '50%' : '8px'}"><img id=ci draggable=false src="${esc(src)}" alt=""></div></div>
    <div class=zrow><span class=zi>▫</span><input type=range id=cz min=1 max=4 step=.01 value=1 aria-label=Zoom><span class="zi lg">▣</span></div>
    <p class=mt style="text-align:center;font-size:14px;margin:0">Arraste para posicionar · role ou use o controle para dar zoom</p>
    <div class=cef><button class="g lnk" data-c=reset>Redefinir</button><span class=row><button class=g data-c=no>Cancelar</button><button data-c=ok>Aplicar</button></span></div></div>`);
    const st = $('#cst'), ci = $('#ci'), cg = $('#cg'), cz = $('#cz'), box = $('#modal');
    const draw = () => {
      const dw = W * base * z, dh = H * base * z, lx = Math.max(0, (dw - rw) / 2), ly = Math.max(0, (dh - rh) / 2); x = clamp(x, -lx, lx); y = clamp(y, -ly, ly);
      [ci, cg].forEach(e => { e.style.width = dw + 'px'; e.style.height = dh + 'px'; e.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)` }); cz.value = z
    };
    draw(); cz.oninput = () => { z = +cz.value; draw() };
    st.onwheel = e => { e.preventDefault(); z = clamp(z - e.deltaY * .002, 1, 4); draw() };
    let dr = null;
    st.onpointerdown = e => { dr = { px: e.clientX, py: e.clientY, x, y }; st.setPointerCapture(e.pointerId); st.classList.add('drag') };
    st.onpointermove = e => { if (!dr) return; x = dr.x + e.clientX - dr.px; y = dr.y + e.clientY - dr.py; draw() };
    st.onpointerup = st.onpointercancel = () => { dr = null; st.classList.remove('drag') };
    box.onclick = e => {
      const b = e.target.closest('[data-c]'), bg = e.target === box; if (!b && !bg) return;
      const a = b?.dataset.c; if (a === 'reset') { z = 1; x = y = 0; return draw() }
      box.onclick = null; close();
      if (a !== 'ok') return done(null);
      const s = base * z, sw = rw / s, sh = rh / s, c = document.createElement('canvas'); c.width = out[0]; c.height = out[1];
      c.getContext('2d').drawImage(im, W / 2 - x / s - sw / 2, H / 2 - y / s - sh / 2, sw, sh, 0, 0, out[0], out[1]); done(jpg(c))
    }
  })
}
