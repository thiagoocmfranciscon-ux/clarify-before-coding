# Convite confiável: link próprio do site, sem depender de e-mail

## O que está acontecendo (confirmado no sistema)
- **E-mail não chega:** o site não tem um domínio de envio próprio. O envio padrão é limitado e costuma cair no spam ou ser bloqueado.
- **Tela "Validando o link…" travada:** o link de convite atual só pode ser aberto uma vez. O WhatsApp e o Gmail "abrem" o link sozinhos para gerar a prévia, e com isso ele é gasto antes da pessoa tocar. Também, ao reenviar, o link novo anula o anterior. Exemplo real: a conta tholiveira0603@gmail.com aparece como "entrou às 19:03", mas ficou sem senha e o convite segue pendente.
- A tela não avisa quando o link já foi usado ou venceu: fica parada em "Validando".

## Solução
### 1. Novo link de convite do próprio site
- Cada convite gera um endereço próprio, por exemplo `nobreempilhadeiras.lovable.app/convite/AbC123…`.
- Ao abrir, a pessoa vê: logo, "Olá, Juliana", o e-mail e o papel, e os campos **Criar senha** e **Confirmar senha**.
- A conta só é criada quando ela toca em **Criar minha conta**. Prévias do WhatsApp/Gmail não gastam o link.
- Depois de criar a senha, ela já entra no sistema com o papel certo.
- O link vale 7 dias e funciona uma única vez. Se estiver vencido, usado ou excluído, aparece uma mensagem clara: "Este convite não é mais válido. Peça um novo ao administrador."
- Funciona igual para convite por WhatsApp ou para link copiado e enviado de qualquer jeito.

### 2. E-mail
- O botão "Por e-mail" passa a se chamar **Copiar link** e gera o link para você enviar por e-mail, WhatsApp ou SMS. Assim nada depende do envio automático.
- Opcional, quando quiser: cadastrar um domínio seu (ex.: avisos@empilhanobre.com.br) para o convite chegar sozinho no e-mail, em português e com o logo.

### 3. Tela "Definir nova senha" (Esqueci minha senha)
- Se o link estiver vencido ou já usado, mostra o aviso e o botão **Pedir novo link**, em vez de ficar travada.
- Se a validação não terminar em 5 segundos, mostra o mesmo aviso.

### 4. Botão Excluir convite
- Na lista de Convites, botão **Excluir** (ícone de lixeira) em todos os convites que não foram usados, com confirmação "Excluir este convite?".
- O convite sai da lista e o link dele para de funcionar na hora. Fica registrado na Auditoria.
- Convites já usados continuam na lista como histórico.

### 5. Arrumar as contas que ficaram pela metade
- tholiveira0603@gmail.com (sem senha) e julianapnuness07@gmail.com (convite não concluído): a lista mostra **Gerar novo link** para cada um. Pelo novo link, a pessoa cria a senha e o acesso é liberado.

## Detalhes técnicos
- Migração: `invitations.token_hash text unique` (SHA-256 do token aleatório de 32 bytes; o token nunca é salvo em claro). Excluir = `delete` para convites com `used_at is null` + `audit_events` `invite_deleted`.
- Server functions públicas (sem login), validando token: `getInvitePreview(token)` retorna só nome, e-mail mascarado e papel; `acceptInviteWithPassword(token, password)` (senha ≥ 10) com `supabaseAdmin`: se o usuário não existe → `auth.admin.createUser({ email_confirm: true, password })`; se existe (casos pela metade) → `updateUserById(password)`; então insere/atualiza `organization_members`, marca `used_at/used_by`, audita. Tudo em um passo; token conferido por hash e prazo.
- Cliente faz `signInWithPassword` após aceitar e navega para `/dashboard`.
- `inviteUser`/`resendInvite` deixam de usar `generateLink`/`inviteUserByEmail`; devolvem `${PUBLIC_APP_URL}/convite/${token}` (reenviar gera token novo e anula o anterior).
- Nova rota pública `src/routes/convite.$token.tsx` com head próprio.
- `reset-password.tsx`: ler `error_code` do hash/query (`otp_expired`, `access_denied`) e timeout de 5 s.
- `deleteInvitation(id)` admin-only em `admin.functions.ts`.
- Teste: token vencido/usado/excluído é recusado; senha curta é recusada.
