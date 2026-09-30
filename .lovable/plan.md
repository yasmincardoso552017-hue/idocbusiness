# Corrigir texto e posicionamento da assinatura

## Resultado
- O ícone **Texto** ativa a inserção e o próximo clique ou toque no PDF cria uma caixa visível exatamente naquele ponto.
- A caixa permanece disponível mesmo vazia, recebe foco para digitação e pode ser movida, redimensionada ou excluída.
- A assinatura pode ficar horizontal ou vertical e mantém no PDF final a mesma posição, tamanho e orientação mostrados na prévia.

## Implementação
- Ajustar os eventos de clique/toque do editor para não perder a nova caixa durante a troca de foco.
- Tornar a caixa vazia claramente visível e limitar sua posição às bordas da página.
- Adicionar controle de orientação e redimensionamento à marcação da assinatura.
- Converter as coordenadas visíveis para o PDF considerando escala e rotação original da página.
- Registrar na página de evidências a página, posição, dimensões e orientação aplicadas.

## Validação
- Testar inserção, edição, movimento e exportação de texto em celular e computador.
- Testar assinaturas horizontal e vertical em páginas normais e giradas.
- Abrir o PDF exportado e comparar visualmente posição, tamanho e orientação com a prévia.