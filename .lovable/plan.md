# Menu lateral premium + cartão do usuário no topo

Concordo: foto, nome e cargo no topo (como na imagem) fica mais elegante e libera o menu.

## Cartão do usuário (canto superior direito)
- Cápsula branca arredondada com borda suave: foto redonda com anel vermelho HELI, nome em negrito, cargo abaixo e ícone de engrenagem.
- Sem foto: iniciais do nome no círculo.
- Ao clicar abre um menu: Meu perfil, Trocar senha, Sair.
- No celular mostra só a foto (o menu abre igual).
- O nome da empresa sai do topo (já está no logo).

## Menu lateral redesenhado
- Remove o rodapé com nome/Sair (foi para o topo) — acaba o problema do nome cortado.
- Sem barra de rolagem visível: itens mais compactos e agrupados com pequenos títulos:
  - Operação: Dashboard, Ordens de Serviço, Estoque, Frotas
  - Cadastros: Técnicos, Clientes, Equipamentos
  - Gestão: Relatórios, Acessos, Auditoria
- Item ativo: fundo levemente vermelho, ícone vermelho e barra vermelha à esquerda; passar o mouse clareia suavemente.
- Fundo grafite com leve degradê; logo centralizado com mais respiro.
- Rodapé discreto: "Empilha Nobre · Distribuidor HELI" em letras pequenas.

## Detalhes técnicos
- Tudo em `app-shell.tsx`: novo `UserMenu` com `DropdownMenu` + `Avatar` (shadcn), foto via URL assinada do avatar já usado em Meu Perfil.
- `NAV` ganha campo `group`; grupos vazios para o papel são ocultados.
- Scroll do menu mantido só como fallback (`overflow-y-auto` com scrollbar oculta).
- Verificação com Playwright em 1280px e 766px.
