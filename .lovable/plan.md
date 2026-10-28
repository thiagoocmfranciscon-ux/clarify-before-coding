# Exibir arquivados + novo Quadro Técnico

## 1. Botão "Exibir arquivados" em tudo que pode ser arquivado
Em cada lista abaixo entra um botão "Exibir arquivados". Quando ele está ligado:
- os itens arquivados aparecem com a etiqueta "Arquivado" e ficam um pouco apagados;
- administrador e gestor veem o botão **Restaurar**, que devolve o item para a lista de ativos.

Onde entra:
- Clientes (já tem o filtro; falta o botão Restaurar) e contatos do cliente
- Equipamentos
- Planos de manutenção (na tela do equipamento)
- Técnicos
- Frotas (veículos)
- Estoque: peças e fornecedores

Também entra o botão **Arquivar** nas listas que ainda não têm, com confirmação antes de arquivar.

## 2. Quadro Técnico em cartões, igual à imagem
- Título "Quadro Técnico", subtítulo e botão vermelho "+ Novo técnico".
- Um cartão por técnico: nome, situação colorida (Disponível em verde, Em serviço em azul, Afastado em amarelo, Inativo em cinza) e especialidade.
- Caixa cinza com **Telefone** e **Produtividade**. A produtividade é calculada pelo app: percentual das OS do técnico nos últimos 90 dias que chegaram a "Concluída tecnicamente" ou "Encerrada". Sem OS no período aparece "—".
- Rodapé do cartão:
  - **Ficha**: abre a janela com os dados do técnico, custo/hora e telefone para editar.
  - **WhatsApp** (botão vermelho com o ícone do WhatsApp): abre a conversa com o número do técnico, sem mensagem pronta. Fica desativado se não houver telefone.
  - **Lixeira**: arquiva o técnico depois de confirmar (nada é apagado de verdade).
- Lado a lado: 3 cartões no computador, 2 no tablet, 1 no celular.
- Telefone e custo continuam visíveis apenas para administrador e gestor.
- O botão WhatsApp sem mensagem pronta também passa a valer para os contatos do cliente.

## Detalhes técnicos
- `useArchive` já suporta `archive:false`; adicionar componente `ArchivedToggle` e `RestoreButton` em `crud.tsx`, aplicar nas rotas clientes.$id, equipamentos.index/$id, tecnicos, frotas.index, estoque.
- WhatsApp: `https://wa.me/55<digitos>` (sem `?text=`), `target="_blank"`. Ícone SVG do WhatsApp em `src/components/icons.tsx` (lucide não tem).
- Produtividade: consulta `work_order_assignments` + `work_orders(status, opened_at)` agrupando no navegador; sem mudança no banco.
- Cores das situações via tokens novos em `src/styles.css` (success/info/warning).
- Verificação com Playwright: arquivar e restaurar um técnico, abrir link do WhatsApp, layout em 1280px e 390px.
