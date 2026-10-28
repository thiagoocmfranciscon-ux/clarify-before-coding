# Nobre Empilhadeiras — Gestão de Manutenção e Operações (entrega única)

## Decisões confirmadas
- Backend: Lovable Cloud (banco, login, arquivos privados).
- Entrega única cobrindo as fases A a E.
- Organização inicial: "Nobre Empilhadeiras". Primeiro administrador: thiagoocmfranciscon@gmail.com, criado por um script de provisionamento documentado. O cadastro público fica desligado.
- O logo SVG e o HTML do protótipo ainda não chegaram. Até você enviar, uso a marca escrita em vermelho #E50914.
- As rotas usam o sistema próprio da plataforma (TanStack Router) no lugar do React Router. Todo o resto da stack pedida é mantido.

## O que será entregue
1. **Acesso**: login, logout, recuperação de senha, convites individuais com validade e uso único, 5 papéis (Administrador, Gestor, Técnico, Almoxarife, Leitura), revogação imediata e tela de Administração de Acessos.
2. **Estrutura**: sidebar escura no desktop, menu em gaveta no celular, busca global agrupada e Meu Perfil com foto.
3. **Cadastros** com criação, edição com controle de versão e arquivamento: Clientes e contatos, Equipamentos (página por série com histórico e planos de manutenção), Técnicos, Veículos (eventos e despesas), Fornecedores e Peças.
4. **Ordens de Serviço**: lista com filtros na URL e detalhe com abas (Resumo, Diagnóstico, Execução, Peças, Custos, Documentos, Histórico). Máquina de estados validada no servidor, atribuição, apontamentos de horas, despesas, conclusão técnica com checklist, aprovação de encerramento, cancelamento com decisão sobre devolução de peças e OS de retrabalho vinculada.
5. **Estoque**: entrada, saída, ajuste e estorno por operação atômica com chave de idempotência, trava contra concorrência, custo médio ponderado e alertas Sem estoque / Baixo / Normal. O técnico solicita a peça e o almoxarife confirma a saída.
6. **Dashboard** com indicadores reais por período e tooltips de definição, além de gráficos de status, custos mensais e OS encerradas.
7. **Relatórios** em PDF e XLSX (manutenções, frotas, estoque, OS e custos), com valores tipados, proteção contra fórmulas e registro na auditoria. Também o laudo operacional da OS.
8. **Anexos** em armazenamento privado com limites de tipo e tamanho e links temporários.
9. **Auditoria** registrada no servidor e consultável conforme o papel.
10. **Documentação**: README, `.env.example`, modelo de dados, matriz de permissões, regras e fórmulas, inventário de dados LGPD para você preencher, backup e restauração com metas RPO/RTO, runbook e guia do usuário.

## Detalhes técnicos
- Migrações versionadas com `organization_id` em todas as tabelas de negócio. Chaves estrangeiras compostas impedem cruzar dados entre organizações. Valores monetários e quantidades usam `numeric`, e as tabelas com edição concorrente têm coluna `version`.
- RLS em todas as tabelas, com permissões mínimas e funções auxiliares SECURITY DEFINER (`is_member` e `has_role`, ambas com search_path fixo). Os papéis ficam em `organization_members`.
- Custos e contatos restritos ficam em tabelas ou views separadas, inacessíveis ao Técnico e ao perfil Leitura.
- Operações críticas passam por RPCs transacionais (`stock_move`, `wo_transition`, `wo_assign`, `wo_close`). O UPDATE direto em saldo, status e organização é bloqueado por grants e triggers.
- Auditoria registrada por triggers e funções do servidor. Usuários comuns não podem escrever nela.
- Exportações e convites rodam em funções de servidor com verificação de papel. O XLSX é gerado com exceljs e o PDF com pdf-lib.
- Testes: Vitest para as regras de domínio (custo médio, alertas, transições, datas em São Paulo), testes de RLS e concorrência com usuários reais de teste, e Playwright para o fluxo completo e as larguras 360, 390, 768 e 1440 px.
- Os seeds usam apenas dados sintéticos e são opcionais. Nada é publicado em produção.

## Limitações conhecidas
- O ensaio real de backup e restauração e a configuração de MFA dependem do seu plano e ficam documentados como pendências.
- A análise de malware dos documentos enviados fica documentada como estratégia, sem implementação no MVP.
- O WhatsApp abre a conversa por link, sem envio automático. O rastreamento de veículos aparece como "integração não configurada".
