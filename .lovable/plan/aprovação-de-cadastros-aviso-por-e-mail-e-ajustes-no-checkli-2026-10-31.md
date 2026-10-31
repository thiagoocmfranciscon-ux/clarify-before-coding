# Aprovação de cadastros, aviso por e-mail e ajustes no Checklist

## 1. Novos usuários só entram com sua aprovação
- Quando a pessoa cria a senha pelo convite, a conta fica **"Aguardando aprovação"**. Ela não consegue entrar: vê a mensagem "Seu cadastro foi enviado ao Setor Técnico. Você poderá entrar assim que for aprovado."
- Na tela de Acessos aparece uma área **"Aguardando aprovação"** no topo, com os botões **Aprovar** e **Recusar**.
- Ao aprovar, a pessoa já pode entrar com o papel escolhido no convite. Ao recusar, o acesso é revogado.
- Quem já usa o sistema hoje continua entrando normalmente.

## 2. E-mail para você a cada novo cadastro
- Cada novo cadastro envia um e-mail para **thiagoocmfranciscon@gmail.com** com nome, e-mail, papel e um botão "Revisar na tela de Acessos".
- Importante: esse envio também precisa do domínio **empilhanobre.com.br** configurado como remetente (o Gmail pode receber, mas não pode enviar). Até o domínio ser verificado, o aviso aparece só na tela de Acessos (com um contador no menu). O e-mail passa a sair sozinho assim que o domínio ficar pronto.

## 3. Checklist: botão Excluir e sem aviso "a validar"
- Cada checklist da lista ganha um botão **Excluir**, com confirmação ("Excluir este checklist? As fotos dele também serão apagadas."). Fica disponível para quem pode editar checklists.
- O aviso amarelo "Os itens deste modelo ainda estão a validar pelo setor técnico" é removido das quatro sub-abas.

## 4. Checklist independente de Clientes e Equipamentos
- Os campos **Cliente**, **Marca**, **Modelo**, **Série** passam a ser digitados direto no checklist, em vez de escolhidos das listas de Clientes e Equipamentos.
- Nada precisa estar cadastrado antes. Checklists antigos continuam mostrando o cliente e o equipamento que já tinham.
- O PDF usa os dados digitados.

## Detalhes técnicos
- Migração: `organization_members.approved_at/approved_by` (existentes recebem `approved_at = now()`); `checklists.customer_name text`; `checklist_templates.needs_validation = false` para os 4 modelos; política DELETE em `checklists` para papéis que editam.
- `acceptInviteWithPassword` cria o membro com `active=false, approved_at=null`; mensagem própria no login para membro pendente (`use-membership`/auth). Novas funções `approveMember`/`rejectMember` (admin-only, auditadas).
- E-mail de aviso: template transacional via `scaffold_transactional_email_templates`, disparado no aceite do convite; silencioso enquanto o domínio não estiver ativo.
- `checklists.tsx`: remove selects de cliente/equipamento e o banner; botão Excluir apaga anexos (`entity_type='checklist'`) e a linha.
- Testes vitest para a regra "membro sem aprovação não entra".
