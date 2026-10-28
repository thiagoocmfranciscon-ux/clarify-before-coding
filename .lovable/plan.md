# Módulo Checklists — integrado a OS, Equipamentos e permissões

Entrega em uma única fase, na ordem pedida. Reaproveita o login, os papéis (admin, gestor, técnico, almoxarife, leitura), a auditoria, o bucket privado de anexos, o kit visual e o gerador de PDF já existentes. O checklist simples que existe hoje dentro da OS continua funcionando.

## 1. Modelos e versionamento (admin/gestor)
- Tela "Modelos de checklist": criar, editar rascunho, pré-visualizar, publicar, arquivar.
- Modelo tem seções e itens ordenados. Cada item: código estável, descrição, instrução, tipo de resposta (Conforme/Não conforme/N.A., Sim/Não, Texto, Número com unidade, Opções), obrigatório, aplicabilidade (tipo de energia), permite N.A., exige justificativa, exige foto, criticidade (baixa/média/alta/crítica), unidade e limites.
- Versão publicada é imutável; "Nova versão" copia para rascunho. Inspeções guardam a versão usada.
- Três rascunhos iniciais (Inspeção inicial, Manutenção preventiva, Verificação de entrega) com as 7 seções pedidas, itens genéricos sem tolerâncias inventadas e aviso "Aguardando validação do responsável técnico — não é certificação normativa". Não podem ser publicados sem confirmar essa validação.

## 2. Listagem, início e preenchimento
- Menu Operação → "Checklists". Lista com número (CHK-2026-00001), OS, cliente, equipamento/série, modelo, técnico, data, progresso, estado, nº de não conformidades e alerta crítico. Busca, paginação e filtros (período, cliente, equipamento, técnico, estado, criticidade).
- Iniciar: escolhe a OS (obrigatória); cliente, equipamento e horímetro vêm da OS. O servidor confere coerência. Depois da 1ª resposta os vínculos ficam travados; erro de vínculo = cancelar com motivo e iniciar outra.
- Preenchimento: cabeçalho compacto, barra de progresso, navegação por seções, cartões com botões grandes (texto + ícone + cor), observação e fotos por item (câmera ou galeria). Nenhum item vem marcado.
- Salvamento automático com espera curta, fila e controle de versão; indicador real: "Alterações não salvas / Salvando… / Salvo às 14:32 / Falha ao salvar — tentar de novo". Aviso ao sair com pendências; aviso de sem conexão (sem prometer offline).
- Resumo antes de enviar (respondidos, pendentes, não conformidades, críticas, fotos faltantes) com botão que leva ao primeiro item inválido. Rascunho pode ser salvo mesmo sem foto.

## 3. Revisão e ocorrências
- Estados: Rascunho → Em revisão → Finalizado; Cancelado (com motivo). Gestor/admin devolve com justificativa. Técnico não revisa a própria inspeção.
- Finalizado é imutável; correção = Retificação vinculada ao original, com nova revisão; o original e seus bloqueios permanecem.
- "Não conforme" exige observação e gera uma ocorrência única por item (não duplica a cada salvamento). Mudar a resposta não apaga a ocorrência.
- Ocorrência: descrição, criticidade, fotos, responsável, prazo, estado (Aberta, Em tratamento, Resolvida, Verificada), ação executada, quem resolveu/verificou e quando, histórico de eventos. Sem botão de ignorar; reclassificar exige justificativa e aprovação de gestor/admin.
- Tela de ocorrências com filtros.

## 4. Integração com a OS
- Configuração (admin/gestor): quais modelos são exigidos por tipo de OS e etapa (Conclusão técnica / Encerramento). Proposta inicial: Inspeção inicial na conclusão; Verificação de entrega no encerramento; Preventivo adicional nas OS preventivas.
- Ao criar a OS, os requisitos e versões ficam gravados nela; mudanças futuras só valem com atualização explícita e auditada.
- O servidor bloqueia concluir/encerrar a OS se faltar checklist finalizado exigido ou houver ocorrência crítica não verificada — inclusive por chamada direta.
- Pendências não críticas: permitidas desde que tenham responsável e prazo (política inicial — confirme se é isso).
- Ocorrência crítica após encerramento gera alerta no Dashboard e sugestão de OS de retrabalho; a OS encerrada fica intacta. Nada muda a situação do equipamento automaticamente.
- Aba "Checklists" na OS (iniciar, continuar, anteriores, pendências que bloqueiam) e no equipamento (histórico).

## 5. PDF, histórico e Dashboard
- PDF "Relatório de Checklist Operacional": organização, número, OS, cliente, equipamento/série, horímetro, modelo/versão, executor, revisor, datas, seções/itens/respostas, observações, não conformidades, fotos selecionadas em grade sem sobreposição, paginação, apêndice datado de tratamentos posteriores, aviso "não é ART nem certificado". Registro de exportação na auditoria.
- Dashboard: "Aguardando revisão" e "Ocorrências críticas pendentes", vindos do banco e respeitando permissões, abrindo a lista já filtrada.

## 6. Permissões
- Técnico: só OS em que está atribuído; preenche e envia; não se atribui; não finaliza.
- Gestor/admin: modelos, revisão, ocorrências, retificações, configuração.
- Almoxarife/leitura: consulta conforme o acesso atual à OS; nada de custos ou contatos novos expostos.
- Tudo validado no banco (regras por organização, vínculo ativo, papel e atribuição), não só na tela.

## 7. Testes e entrega
- Testes automáticos das regras (progresso, N.A., numérico com zero e decimais, obrigatoriedade, sem resposta padrão).
- Testes no banco: ocorrência não duplica, bloqueio de encerramento via chamada direta, técnico fora da OS bloqueado, finalizado imutável, conflito de versão entre duas abas, envio repetido idempotente, nova versão sem afetar inspeções antigas.
- Teste no navegador: preencher, recarregar e ver respostas; enviar, revisar, gerar PDF; telas em 360/390/768/1440 px.
- Isolamento entre organizações: testado criando uma 2ª organização de teste temporária.
- Documentação em `docs/checklists.md` com permissões, fluxos, resultados dos testes executados e lista dos modelos pendentes de validação técnica. Sem publicar.

## Detalhes técnicos
- Tabelas: checklist_templates, checklist_template_versions (status draft/published/archived, snapshot jsonb ao publicar), checklist_sections, checklist_items, checklist_inspections (number via org_counters, version, status, rectifies_id, vínculos com FKs compostas por organization_id), checklist_answers (unique inspection_id+item_id, trigger valida item da mesma versão), checklist_findings (unique answer_id), checklist_finding_events, checklist_status_events, wo_checklist_rules, wo_checklist_requirements. Anexos reutilizam `attachments` com entity_type `checklist_answer`/`checklist_finding`.
- RPCs SECURITY DEFINER: checklist_start, checklist_save_answers (lote, expected_version, upsert de ocorrência), checklist_submit/approve/return/cancel/rectify (idempotentes, travam linha FOR UPDATE), template_publish/new_version, finding_transition. Escrita direta nas tabelas negada por RLS; leitura via can_view_wo.
- wo_transition passa a chamar wo_checklist_blockers() antes de concluida_tecnicamente/encerrada.
- Fotos: bucket privado existente, validação de MIME/tamanho/assinatura no servidor, URLs assinadas de 5 min; PDF com pdf-lib baixando via URL assinada.
- Escopo grande: deve consumir vários créditos; pode ser necessário mais de uma mensagem para concluir os testes.
