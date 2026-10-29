# Login no celular + Checklists de Entrega/Retorno + novos papéis

## 1. Login no celular (o computador não muda)
- Topo vermelho HELI com curva suave, logo HELI + Nobre num cartão branco e a frase "Sua operação de empilhadeiras, sob controle."
- Formulário num cartão branco que sobe por cima do vermelho, com campos grandes e botão "Entrar" largo, fácil de tocar.
- Rodapé pequeno "Empilha Nobre · Distribuidor HELI".
- Só vale para telas pequenas. No computador a tela fica exatamente igual.

## 2. Aba "Checklists" no menu (grupo Operação)
Quatro sub-abas: **Combustão**, **Elétrica contrabalançada**, **Retrátil elétrica** e **Transpaleteira elétrica**.

Cada sub-aba mostra a lista de checklists já feitos (data, Entrega/Retorno, cliente, nº frota, responsável, quantos itens ficaram "Ruim") e o botão "+ Novo checklist".

O formulário segue o modelo dos PDFs:
- **Cabeçalho:** Entrega ou Retorno, consultor, responsável (preenchido com o usuário logado), cliente (da lista de clientes), nota fiscal, contrato, equipamento (puxa marca, modelo e série), nº frota, horímetro, data e hora.
- **Tipo** (pode marcar vários): Cliente, Locação, Foto geral, Outros, Movimentação.
- **Itens de inspeção:** cada item marcado como Bom ou Ruim, com botões grandes para usar no celular.
- **Observações técnicas** e **observações do cliente**.
- **Fotos:** usa o mesmo envio de anexos que já existe.
- **Assinaturas:** nome e CPF do responsável e nome do cliente.
- **PDF** com o mesmo visual do modelo: cabeçalho EMPILHA NOBRE, "CHECK-LIST DE ENTREGA/RETORNO" e duas colunas de itens.

Itens de cada sub-aba:
- **Combustão:** os 38 itens do modelo, iguais aos PDFs.
- **As outras três:** listas montadas por mim com base no modelo. Tiro os itens de motor e gás e coloco os de máquina elétrica (bateria e carga, conector, carregador, motor de tração, motor de bomba, controlador, painel e códigos de erro). A retrátil ganha mastro e retração, e a transpaleteira ganha timão, garfos e rodas de carga. Essas três listas ficam marcadas "a validar" para você revisar.

## 3. Papéis na tela de Acessos
| Papel | Pode ver e mexer em |
|---|---|
| Setor Técnico (o antigo Administrador) | Tudo, inclusive Acessos. É o único que muda papéis e configurações. |
| CEO | Tudo, menos Acessos |
| Diretor Comercial | Tudo, menos Acessos |
| Gestor de Manutenção | Tudo, menos Acessos |
| Almoxarifado | Dashboard, OS, Estoque de peças, Frotas |
| Técnico Interno | Dashboard, Frotas, OS, Estoque de peças |
| Técnico Externo | Dashboard, Frotas, OS, Estoque de peças |
| Suporte Técnico | Tudo, menos Acessos |

- Quem já tem um papel passa para o papel novo equivalente: gestor vira Gestor de Manutenção, técnico vira Técnico Interno, almoxarife vira Almoxarifado e leitura vira Suporte Técnico. Você continua como Setor Técnico.
- Checklists ficam liberados para todos os papéis que veem OS.
- Ponto a confirmar: você não citou "Serviços gerais" nas permissões, então esse papel fica só com acesso de leitura ao Dashboard. Me avise se for diferente.

## Detalhes técnicos
- Login: classes `lg:hidden` / `max-lg:` em `auth.tsx`, sem mudar o bloco `lg:`.
- Novos valores no enum `app_role` (`ceo`, `diretor_comercial`, `gestor_manutencao`, `almoxarifado`, `tecnico_interno`, `tecnico_externo`, `suporte_tecnico`, `servicos_gerais`). `admin` continua no banco, com o rótulo "Setor Técnico". Os papéis antigos não são removidos, só deixam de ser oferecidos. A troca dos usuários atuais é feita junto com a mudança.
- `has_any_role` e as regras de acesso do banco são atualizadas para os novos papéis. `PERM` em `domain.ts` e os grupos do menu são reescritos.
- Tabelas novas: `checklist_templates` (tipo de máquina, versão, itens em jsonb, flag `needs_validation`) e `checklists` (cabeçalho, kind entrega/retorno, tipos[], respostas jsonb, observações, assinaturas, equipment_id/customer_id, versão do modelo). Ambas com GRANT, RLS por organização e auditoria. Os 4 modelos são criados junto.
- Fotos via `attachments` com `entity_type='checklist'`. PDF em `reports.ts` com pdf-lib.
- Rota `/checklists` com busca por `?tipo=`. Testes vitest para o mapa de permissões e a contagem de itens "Ruim". Conferência no Playwright no celular (390px) e no computador.
