# Atualização — The Club

**Depois de atualizar, publique o arquivo `firestore.rules` no Firebase** (Firestore → Regras → colar → Publicar).
Ele inclui as coleções `profiles`, `usernames`, `users`, `friendRequests`, `friendships` e `invites`.
Erros de permissão podem indicar uma regra que negou a operação, não necessariamente que as regras não foram publicadas.

Arquivos novos: `perfil.html`, `css/app.css`, `img/logo.png`, `js/header.js`, `js/profile.js`, `js/ui.js`, `js/cropper.js`, `js/theme.js`, `js/pages/perfil.js`.

Layouts de portrait já salvos continuam como estavam: no editor, use **Converter para 2K** para ampliá-los
para 1040×340 centralizados numa tela 2560×1440. Fotos transparentes enviadas antes desta versão já foram
salvas como JPEG (fundo preto): é preciso enviá-las de novo.

## Instalar como app

O The Club pode ser instalado pelo navegador quando estiver publicado em HTTPS. No Chrome/Edge, abra o menu
de três pontos e escolha **Instalar The Club** (ou **Instalar página como app**). O app usa os mesmos dados
e a mesma conta do site; a instalação não permite notificações com o app fechado sem um serviço de push.
