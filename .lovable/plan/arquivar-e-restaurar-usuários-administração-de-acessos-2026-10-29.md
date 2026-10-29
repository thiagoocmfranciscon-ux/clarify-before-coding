# Arquivar e restaurar usuários (Administração de Acessos)

## O que muda na tela
- Tabela **Usuários**: novo botão **Arquivar** ao lado de "Revogar acesso" / "Reativar" (Ativo → [Revogar acesso] [Arquivar]; Revogado → [Reativar] [Arquivar]).
- Ao lado do título "Usuários", botão **Usuários arquivados** (mesmo estilo dos botões atuais, com contador).
- Clicar abre a área **Usuários arquivados** na mesma página (com botão "Voltar aos usuários"), contendo tabela: Nome, E-mail, Papel, Data do arquivamento, Situação (badge cinza "Arquivado"), Ações [Restaurar].
- Modais de confirmação com os textos exatos da especificação ("Arquivar usuário?" / "Restaurar usuário?", botões Cancelar e Arquivar usuário / Restaurar usuário).
- No celular, a tabela rola na horizontal e os botões ficam empilhados, mantendo o visual atual.

## Regras de negócio
- Três situações: **Ativo**, **Revogado**, **Arquivado**. Nada é apagado; histórico, OS, apontamentos e auditoria ficam intactos.
- Arquivar: tira o usuário da lista principal e encerra o acesso na hora (ele não consegue mais entrar nem usar o sistema, inclusive sessões já abertas).
- Restaurar: volta para a lista principal como **Revogado**; o administrador decide depois se reativa o acesso e com qual papel.
- Só administradores arquivam/restauram. Ninguém arquiva a si mesmo, e não é possível arquivar o último administrador ativo.
- Arquivar e restaurar ficam registrados na Auditoria (quem, quando).
- Se o usuário estiver vinculado a um técnico, o técnico **não** é arquivado automaticamente (continua sendo feito no Quadro Técnico).

## Detalhes técnicos
- Migração: em `organization_members` adicionar `archived_at timestamptz` e `archived_by uuid` (nullable). Estado derivado: archived_at não nulo = arquivado; senão active true/false = ativo/revogado. Ao arquivar, `active=false`; `is_member`/`my_org` já exigem `active`, então o acesso cai imediatamente.
- `updateMember` em `admin.functions.ts` ganha `archive: boolean`; arquivar aplica as mesmas travas (próprio usuário, último admin) e grava `audit_events` (`user_archived` / `user_restored`). `listMembers` retorna `archived_at`.
- Tela `admin.acessos.tsx`: estado `showArchived`, filtro das listas, `AlertDialog` do shadcn para confirmações.
- Teste vitest para a regra de situação (ativo/revogado/arquivado) e verificação com Playwright: arquivar e restaurar um usuário de teste.
