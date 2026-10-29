# Convite levando ao site certo + convite por WhatsApp

## 1. Por que chega e-mail do Lovable
O e-mail da foto é um pedido de acesso ao **editor** do projeto. Ele aparece quando alguém abre o endereço de pré-visualização (o do editor). Hoje o link do convite é montado a partir do endereço onde você está ao enviar. Se você convida pela pré-visualização, o link leva a pessoa para lá, e ela cai na tela do Lovable.

Correção:
- O link do convite passa a apontar sempre para o site publicado: https://nobreempilhadeiras.lovable.app (tela "Definir senha").
- O e-mail de convite chega em português, com o logo Empilha Nobre e o botão "Criar minha senha".
- Para os convites já enviados: mostrar "Reenviar" e "Copiar link" ao lado de cada convite pendente.

## 2. Convidar pelo WhatsApp (por telefone)
- No formulário "Convidar usuário", uma escolha: **E-mail** ou **WhatsApp**.
- No modo WhatsApp: Nome, Telefone (com DDD), E-mail e Papel. O e-mail continua necessário porque é com ele que a pessoa entra no sistema.
- Ao clicar em "Convidar", o WhatsApp abre já no número da pessoa, com uma mensagem curta e o link de acesso. Você só aperta enviar.
- A pessoa abre o link, cria a senha e já entra no site publicado.
- O telefone fica salvo no convite e aparece na lista de Convites, com o ícone do WhatsApp para reenviar.

## Detalhes técnicos
- `inviteUser`: usar uma URL fixa do site publicado (constante `PUBLIC_APP_URL`) em vez de `redirectTo` vindo do navegador. Gerar o link com `generateLink({ type: "invite" })`, ou `recovery` se o usuário já existir.
- Migração: `invitations` + `phone text`, `full_name text`.
- Novo `resendInvite(id)`, que devolve o link (só admin).
- Modo WhatsApp: `waLink(phone, texto)` com mensagem pré-preenchida, aberto em nova aba.
- Modelos de e-mail de autenticação em português: verificar o domínio de envio. Se não houver domínio configurado, o convite segue pelo remetente padrão e o caminho principal passa a ser o WhatsApp.
