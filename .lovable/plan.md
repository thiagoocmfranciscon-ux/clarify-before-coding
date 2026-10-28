# Correções: mudança de status da OS, e-mail de convite, código automático e segurança

## 1. Erro "column status does not exist" ao mudar status da OS
- Causa confirmada: no registro do histórico, a função de troca de status busca uma coluna `status` que não existe na tabela de histórico (o nome correto é `to_status`). Isso quebra **toda** mudança de status, não só o cancelamento.
- Correção: ajustar a função para usar `to_status`. Testar abrindo uma OS → Em diagnóstico → Cancelada.

## 2. E-mail de convite não chega
- Primeiro passo: verificar a situação do envio de e-mails (domínio de envio configurado, fila, limite por hora) e o registro dos envios do convite.
- Correções prováveis, conforme o resultado:
  - Configurar um domínio de envio próprio (ex.: avisos.empilhanobre.com.br) com modelos de e-mail em português e com o logo — o envio padrão tem limite baixo e cai no spam.
  - Se a pessoa já tiver conta, o convite hoje falha calado: passar a enviar um link de "definir senha" e mostrar o aviso na tela.
  - Na tela de Acessos, botão **Copiar link de convite**, para mandar por WhatsApp quando o e-mail não chegar.

## 3. Código do técnico automático
- Código gerado sozinho na sequência, no formato `TEC-001`, `TEC-002`… (por empresa, sem repetir mesmo com cadastros simultâneos).
- O campo some do formulário de cadastro e aparece só para leitura na edição. Técnicos já cadastrados mantêm o código atual.

## 4. Ajuste visual do menu (print 2)
- O cartão do usuário no rodapé do menu fica sem o fundo escuro quando a tela é baixa. Fixar o rodapé e deixar só a lista de itens rolar.

## 5. Pontos de segurança
- Rodar a verificação de segurança do banco e corrigir o que aparecer.
- Ativar bloqueio de senhas vazadas e exigir a senha atual para trocar a senha.
- Obrigar a troca da senha provisória `123456` no primeiro acesso (Thiago e Felipe usam essa senha hoje).
- Corrigir o registro de auditoria para alterações feitas fora do app (hoje ele falha).
- Revisar se custo/hora e telefone de técnico continuam visíveis só para admin/gestor.

## Detalhes técnicos
- Migração: `CREATE OR REPLACE FUNCTION wo_transition` trocando `select status` por `select to_status`.
- Migração: função `next_technician_code()` usando `org_counters` (chave `tech`) + gatilho BEFORE INSERT em `technicians` que preenche `code` quando vazio; formulário remove `code` obrigatório.
- `tg_audit`: usar `coalesce(organization_id, id)` para a tabela `organizations` e ignorar quando a organização for nula.
- E-mail: `email_domain--check_email_domain_status` + logs; se preciso, configurar domínio e `scaffold_auth_email_templates`. `inviteUser` passa a tratar "usuário já existe" com `generateLink({type:'recovery'})` e retorna o link para o botão copiar.
- Senha provisória: flag `must_change_password` em `profiles`; o layout autenticado redireciona para tela de troca.
- `supabase--configure_auth` com `password_hibp_enabled` e `require_current_password`.
- `app-shell.tsx`: nav com `flex-1 overflow-y-auto`, rodapé `shrink-0`.
