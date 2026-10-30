# Convite enviado automaticamente por e-mail

## Situação
O envio automático só funciona com um domínio de e-mail seu configurado e verificado (ex.: empilhanobre.com.br). Hoje nenhum domínio está configurado — por isso nada chega. Sem esse passo, nenhum código consegue enviar o e-mail.

## O que será feito
1. **Configurar o domínio** empilhanobre.com.br pelo botão "Configurar domínio de e-mail" (você faz uma vez; quem administra o domínio adiciona os registros indicados). Convites sairão de um endereço como avisos@notify.empilhanobre.com.br.
2. **Botão renomeado para "Enviar link".**
3. Ao clicar, o sistema envia sozinho para o e-mail digitado em "E-mail (usado para entrar)" uma mensagem em português, com o logo Empilha Nobre, o nome da pessoa, o papel e o botão **Criar minha senha** (link do próprio site, válido 7 dias). Nada de Lovable.
4. Mensagem na tela: "Convite enviado para fulano@...". Se falhar, mostra o motivo e oferece copiar o link como reserva.
5. Na lista de convites, "Gerar novo link" passa a **Reenviar por e-mail** (mantém WhatsApp e Excluir).
6. Enquanto o domínio não for verificado (pode levar algumas horas), o botão avisa "Domínio de e-mail ainda em verificação" e copia o link como reserva.

## Detalhes técnicos
- Scaffold de e-mails do app; template `invite-user.tsx` (estilo HELI, fundo branco).
- `inviteUser`/`resendInvite` chamam `sendTemplateEmail('invite-user', email, { templateData, idempotencyKey: invite-<id>-<tokenhash> })` no servidor; retornam `{ sent, link }`.
- Trata `domain_not_verified` com fallback de cópia.
