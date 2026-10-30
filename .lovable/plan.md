# Corrigir criação de conta, abas do Checklist no celular e convite por e-mail automático

## 1. Erro "Não foi possível criar sua conta"
Causa provável: a proteção contra senhas vazadas recusa senhas comuns, e a tela mostra uma mensagem genérica. Também, se a conta ficou pela metade, a busca pelo usuário pode falhar.
- Mostrar o motivo real em português (ex.: "Esta senha é muito comum ou já apareceu em vazamentos. Escolha outra.").
- Se a conta já existir, completar a senha em vez de travar.
- Registrar o detalhe do erro para diagnóstico.

## 2. Abas do Checklist cortadas no celular
- No celular, trocar a barra de abas por uma grade 2x2 (ou lista rolável com o nome inteiro visível), sem cortar "Elétrica contrabalançada" e "Transpaleteira".
- No computador, fica igual.

## 3. Botão "Gerar e copiar link" vira "Enviar convite por e-mail"
- Ao clicar, o site envia sozinho um e-mail em português, com o logo Empilha Nobre, para o endereço digitado. O e-mail leva ao link do próprio site (/convite/...) para a pessoa criar a senha. Nada do Lovable.
- Aviso de sucesso: "Convite enviado para fulano@...". Se o envio falhar, o link é copiado como plano B.
- Na lista de convites, "Gerar novo link" ganha "Reenviar e-mail".
- WhatsApp continua igual.

**Domínio de envio:** usar empilhanobre.com.br, que já é da empresa (setortecnico@empilhanobre.com.br). Os convites sairão de um endereço como avisos@notify.empilhanobre.com.br. Quem cuida do domínio (Registro.br ou a empresa de hospedagem) precisa adicionar alguns registros que a tela de configuração mostra; o e-mail setortecnico@ continua funcionando normalmente. Até a verificação (algumas horas, até 72 h), o botão usa o plano B (copiar link).

## Detalhes técnicos
- `acceptInviteWithPassword`: tratar `weak_password`/`AuthApiError` de `createUser`, retornar mensagem específica; manter devolução do convite.
- `checklists.tsx`: `grid grid-cols-2 sm:flex` nas abas.
- Scaffold de e-mails do app, template `invite-user`, envio em `inviteUser`/`resendInvite` via `sendTemplateEmail` com idempotência por id do convite.
