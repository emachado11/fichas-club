import {guard,page} from '../common.js';
guard(u=>page('Painel',`<div class=cols>
<a class=tile href=ficha-nova.html><h3>Nova ficha</h3><small>Criar um agente</small></a>
<a class=tile href=fichas.html><h3>Minhas fichas</h3><small>Ver e editar</small></a>
<a class=tile href=campanha-nova.html><h3>Nova campanha</h3><small>Criar como mestre</small></a>
<a class=tile href=campanhas.html><h3>Minhas campanhas</h3><small>Mestre e jogador</small></a></div>`,u));
