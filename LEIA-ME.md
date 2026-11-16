# Atualização — The Club

**Depois de atualizar, publique o arquivo `firestore.rules` no Firebase** (Firestore → Regras → colar → Publicar).
Ele inclui as coleções `profiles`, `usernames`, `users`, `friendRequests`, `friendships`, `invites`,
`campaigns/{id}/combats`, `campaigns/{id}/combatDrafts`, `campaigns/{id}/notes` e `creatures` (fichas
privadas ao usuário que as criou), além de `creatureCatalog` (catálogo padrão, leitura para usuários
autenticados e gravação somente por administradores habilitados). Rascunhos de combate
são privados ao mestre; ao iniciar, o encontro é publicado aos participantes. O mestre pode editar
inimigos, escolher fichas participantes, adicioná-las durante o combate e configurar a exibição
antes de revelar. As anotações pessoais só podem ser lidas por seu autor e as conjuntas pelos
participantes da campanha.
Erros de permissão podem indicar uma regra que negou a operação, não necessariamente que as regras não foram publicadas.

Para habilitar o gerenciamento do catálogo, abra o perfil existente em `profiles/{UID}` no Firebase
Console e defina `admin` como `true` (use `false` para remover o acesso). As regras impedem que o
próprio usuário altere esse campo pelo app. O administrador verá **Gerenciar catálogo padrão** na
página Criaturas; por lá poderá criar, editar e excluir documentos de `creatureCatalog`.
Os documentos usam os campos `name`, `pv`, `attributes`, `elements`, `skills`, `photo` e `actions`,
no mesmo formato das fichas pessoais. Publique as regras do Firestore depois de atualizá-las.

Arquivos novos: `perfil.html`, `css/app.css`, `img/logo.png`, `js/header.js`, `js/profile.js`, `js/ui.js`, `js/cropper.js`, `js/theme.js`, `js/pages/perfil.js`.

Layouts de portrait já salvos continuam como estavam: no editor, use **Converter para 2K** para ampliá-los
para 1040×340 centralizados numa tela 2560×1440. Fotos transparentes enviadas antes desta versão já foram
salvas como JPEG (fundo preto): é preciso enviá-las de novo.

Na campanha, a aba **Importantes** guarda anotações pessoais e compartilhadas. A aba **Combate** mantém
um rascunho privado ao mestre antes da revelação, com seleção das fichas participantes, inimigos
em grupos com quantidade configurável e controles de visibilidade. Durante o combate, o mestre pode
adicionar e remover fichas e controlar os PV dos inimigos. Cada jogador pode alterar apenas PV/PD da
própria ficha; outras fichas ficam disponíveis somente para visualização. Na aba **Jogadores**, o
mestre pode editar o nome, a descrição e o banner da campanha.

## Instalar como app

O The Club pode ser instalado pelo navegador quando estiver publicado em HTTPS. No Chrome/Edge, abra o menu
de três pontos e escolha **Instalar The Club** (ou **Instalar página como app**). O app usa os mesmos dados
e a mesma conta do site; a instalação não permite notificações com o app fechado sem um serviço de push.
