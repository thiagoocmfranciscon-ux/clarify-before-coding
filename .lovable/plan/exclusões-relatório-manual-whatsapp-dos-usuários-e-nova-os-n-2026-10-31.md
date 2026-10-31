# Exclusões, relatório manual, WhatsApp dos usuários e nova OS no modelo Nobre

## 1. Acessos
- **Convites:** o botão "Excluir" já existe na lista de convites pendentes; ele passa a aparecer também nos convites vencidos/revogados, para limpar a lista toda.
- **Usuários arquivados:** novo botão "Excluir definitivamente" com confirmação. Apaga a conta e o acesso; o histórico (OS, auditoria) continua, mostrando o nome salvo. Não é possível excluir a si mesmo nem o último usuário com acesso total.
- **Usuários ativos:** telefone sempre visível na coluna e botão do WhatsApp que abre a conversa direto com o contato (sem mensagem pronta). Sem telefone cadastrado, o botão não aparece.

## 2. Relatórios
- Novo cartão **"Relatório manual"**: título, período, texto livre e uma tabela onde você digita as linhas (descrição, quantidade, valor, observação), adicionando ou removendo linhas.
- Botões **PDF** e **Excel** para baixar esse relatório, no mesmo padrão visual dos outros. Fica registrado na auditoria.

## 3. Equipamentos
- Botão **"Excluir"** ao lado de "Arquivar" (na lista e na ficha), com confirmação.
- Se o equipamento já tiver OS ou checklist ligados, a exclusão é bloqueada com o aviso "Este equipamento tem histórico; use Arquivar" — para não perder registros.

## 4. Nova OS no modelo anexado
O formulário de "Nova ordem de serviço" passa a seguir o modelo Nobre, em seções:
- **Cabeçalho:** Nº da OS (gerado automaticamente), data de entrada, prazo previsto.
- **Solicitante / cliente:** cliente/empresa, responsável pela solicitação, setor, consultor/contato, telefone/e-mail, prioridade.
- **Empilhadeira:** identificação/frota, marca, modelo, ano, horímetro, chassi/nº de série, tipo (Elétrica / GLP), tipo de manutenção.
- **Solicitação / defeito relatado.**
- **Técnico responsável (nome).**
- **Peças, materiais e serviços:** linhas com tipo, descrição, código, qtd., valor unit. e total, com subtotal de peças, serviços e total geral.
- **Observações / pendências.**

**Preenchimento manual:** cliente, equipamento e técnico são digitados livremente. Ao começar a digitar, aparecem sugestões dos já cadastrados; se escolher uma, os campos se preenchem sozinhos. Se digitar um novo, o sistema cadastra o cliente e/ou equipamento automaticamente ao abrir a OS. O técnico pode ser um cadastrado ou só um nome escrito.

Diagnóstico, serviços executados, andamento e conclusão continuam sendo preenchidos depois, na tela da OS. Um botão **"Imprimir OS (PDF)"** gera o documento no layout de 2 páginas do modelo.

## Detalhes técnicos
- Migração: novas colunas opcionais em work_orders (requester_name, requester_sector, consultant, contact, fleet_number, year, equipment_kind, technician_name, notes, items jsonb); função create_work_order estendida para criar cliente/equipamento quando vierem só por texto.
- Exclusão de usuário: server function admin-only (verifica papel com acesso total) usando cliente admin para apagar o usuário de auth; vínculos em organization_members removidos; auditado.
- Exclusão de equipamento: política DELETE para papéis gestores + checagem de referências (work_orders, checklists, readings, planos) antes de apagar.
- Relatório manual reaproveita exportPdf/exportXlsx de src/lib/reports.ts; PDF da OS em novo gerador com pdf-lib.
- Testes: regra de bloqueio de exclusão (último admin / equipamento com histórico) e totais da tabela de itens.
