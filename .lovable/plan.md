# Correções: criação de conta, checklist (abas e fotos), convite por e-mail e telefone no Perfil

## 1. Erro "Não foi possível criar sua conta"
Causa provável: a proteção contra senhas vazadas recusa senhas comuns, e a tela mostra uma mensagem genérica.
- Mostrar o motivo real em português (ex.: "Esta senha é muito comum ou já apareceu em vazamentos. Escolha outra.").
- Se a conta já existir, completar a senha em vez de travar.
- Registrar o detalhe do erro para diagnóstico.

## 2. Abas do Checklist cortadas no celular
- No celular, abas em grade 2x2 com o nome inteiro visível. No computador, fica igual.

## 3. Fotos no Checklist ("Falha ao registrar anexo")
Causa confirmada: o banco só aceita anexos de OS, equipamento e veículo; "checklist" ficou de fora.
- Liberar anexos de checklist no banco. Depois disso, "Enviar arquivo" funciona.
- Testar enviando uma foto de verdade.

## 4. Botão "Gerar e copiar link" vira "Enviar convite por e-mail"
- Ao clicar, o site envia sozinho um e-mail em português, com o logo Empilha Nobre, para o endereço digitado, com o link do próprio site para criar a senha. Nada do Lovable.
- Aviso "Convite enviado para fulano@...". Se o envio falhar, o link é copiado como plano B.
- Na lista de convites, botão "Reenviar e-mail". WhatsApp continua igual.

**Domínio de envio:** empilhanobre.com.br, que já é da empresa (setortecnico@empilhanobre.com.br). Os convites sairão de algo como avisos@notify.empilhanobre.com.br; o e-mail setortecnico@ continua funcionando. Quem administra o domínio (Registro.br ou hospedagem) adiciona os registros que a tela de configuração mostrar. Até a verificação (horas, até 72 h), vale o plano B.

## 5. Telefone no Perfil
- Novo campo "Telefone (WhatsApp)" em Meu Perfil, com máscara (11) 98765-4321, salvo junto com o nome.
- Fica visível para os administradores na tela de Acessos, para facilitar contato e feedback.

## Detalhes técnicos
- Migração: recriar CHECK `attachments.entity_type` incluindo `'checklist'`; `profiles.phone text` (≤ 20).
- `acceptInviteWithPassword`: tratar `weak_password`/`AuthApiError` de `createUser`, mensagem específica.
- `checklists.tsx`: `grid grid-cols-2 sm:flex` nas abas.
- Scaffold de e-mails do app, template `invite-user`, envio em `inviteUser`/`resendInvite` via `sendTemplateEmail` (idempotência por id do convite + token).
- `perfil.tsx` campo telefone; `listMembers` retorna `phone`.
