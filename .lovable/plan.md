# Logo correto + nome "Empilha Nobre" + acabamento premium

## 1. Logo oficial
- Usar o logo enviado (HELI + Nobre Empilhadeiras) como arquivo de imagem do app.
- Criar também uma versão recortada só do "Nobre" (com a coroa) para espaços pequenos: menu lateral recolhido, celular e ícone da aba do navegador.
- Como o "Nobre" é preto, no menu lateral escuro ele ficará sobre uma faixa/cartão claro (ou versão invertida em branco), para não sumir.
- Substituir a marca provisória atual em todos os lugares: tela de login, recuperação de senha, menu lateral, topo no celular, laudo PDF e relatórios exportados.
- Ícone da aba do navegador gerado a partir do "Nobre".

## 2. Nome "Empilha Nobre"
- Trocar "Nobre Empilhadeiras"/"Nobre" por "Empilha Nobre" em todos os títulos de página, descrições, cabeçalhos de PDF/Excel e textos da tela de login.
- Atualizar o nome da organização no banco para "Empilha Nobre".

## 3. Experiência premium
- **Login:** tela dividida — à esquerda painel com o logo HELI + Nobre, frase de apresentação e fundo vermelho HELI com textura sutil; à direita formulário limpo, campos maiores, mostrar/ocultar senha, estado de carregamento no botão e mensagens de erro em português claro.
- **Cores:** vermelho HELI (#E30613 aprox.) como cor principal, preto grafite no menu, cinzas quentes no fundo; tipografia mais marcante para títulos (ex.: Sora) e corpo legível (Manrope), saindo do Inter genérico.
- **Menu lateral:** logo no topo, item ativo com barra vermelha, ícones alinhados, cartão do usuário no rodapé com foto, nome e papel (corrige o nome cortado visto no print).
- **Dashboard e listas:** cartões com sombra suave, números grandes, cabeçalhos fixos nas tabelas, estados vazios com ilustração/ícone e ação sugerida, carregamento em esqueleto em vez de tela em branco.
- **Microinterações:** transições suaves ao abrir diálogos e trocar abas, confirmação visual (aviso no canto) ao salvar, botões com retorno ao clique.
- **Celular:** topo compacto com logo "Nobre", menu em gaveta, tabelas viram cartões.

## Detalhes técnicos
- Logo enviado via CDN de arquivos (`lovable-assets`); recorte do "Nobre" gerado com ImageMagick; favicon PNG em `public/`, removendo `favicon.ico`.
- `src/components/brand.tsx` passa a exportar `<BrandLogo variant="full|mark" />`.
- Tokens em `src/styles.css` (oklch), fontes via `<link>` no `__root.tsx`.
- `UPDATE organizations SET name='Empilha Nobre'` via migração.
- `src/lib/reports.ts`: cabeçalho com logo e novo nome.
- Verificação com Playwright em desktop e celular.
