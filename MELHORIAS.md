# Melhorias desta versão

**Velocidade**
- Cache offline do Firestore (IndexedDB): páginas abrem com os dados do último acesso e atualizam em seguida.
- Perfil e preferências ficam salvos no aparelho; a página abre sem esperar o banco (atualiza em segundo plano).
- Perfil, preferências e hash do e-mail agora são buscados em paralelo (antes eram em fila).
- Início: fichas recentes buscadas em paralelo (antes uma por vez).
- `preconnect` + `modulepreload` em todas as páginas (Firebase e módulos carregam em paralelo).
- Quem já está logado vai direto de `index.html` para o painel, sem montar a tela de login.
- Amigos/pedidos do cabeçalho só são consultados depois do carregamento ou ao abrir o menu.
- Campanha: quadro de investigação só carrega ao abrir a aba; amigos/convites só para o mestre; atualizações são agrupadas.
- OBS e editor de portrait carregam só as fontes usadas pelo layout.
- Esqueletos de carregamento em Início, Fichas e Campanhas.

**Correções**
- Regras: ficha só pode ser criada em nome do próprio usuário; o dono não muda; só o dono apaga. (Publique `firestore.rules`.)
- Campanha: o texto digitado em “Convidar” e a anotação do quadro não somem mais quando chega uma atualização.
- Quadro: arrastar não é interrompido por mudanças de outros jogadores; linhas redesenhadas no máximo 1× por quadro.
- Login: Enter envia, mensagens em português, autopreenchimento do navegador funciona.
- `viewport-fit=cover` (os cálculos de área segura do iPhone não funcionavam sem ele).
- Dados: fecham ao clicar fora ou com Esc.
- Fichas criadas agora têm data (“mais recentes” ordena certo).

**Layout**
- Ficha em tablet: duas colunas. Botões, bolinhas e seletores maiores em telas de toque.
- Sem desfoque nos painéis da ficha em telas pequenas (rolagem mais leve).
- Editor de portrait no celular: prévia fixa no topo.

**Próximo passo recomendado**
As imagens (fotos, estados, relações) ficam dentro do documento da ficha, e as listas baixam o documento inteiro.
Mover as imagens para o Firebase Storage (guardando só a URL) é o maior ganho que ainda resta.

**Navegação sem recarregar (cabeçalho persistente)**
- Entre Início, Fichas, Ficha, Campanhas, Campanha, Perfil e as telas de criar, o cabeçalho, a barra de baixo e o rolador de dados NÃO são redesenhados: só o conteúdo troca. Usa a Navigation API (Chrome, Edge e navegadores recentes); onde não existir, as páginas carregam normalmente.
- Ao sair de uma página, as escutas em tempo real e os atalhos dela são encerrados, e as edições pendentes da ficha são gravadas antes.
- Se algo falhar na troca, o site carrega a página do jeito antigo automaticamente.
