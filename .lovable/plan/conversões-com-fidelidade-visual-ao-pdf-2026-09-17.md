# Conversões com fidelidade visual ao PDF

## Objetivo
Fazer as conversões de PDF para Word, Excel e PowerPoint manterem cada página visualmente igual ao PDF original, sem reorganizar textos, imagens, tabelas ou posições.

## Implementação
- Trocar a reconstrução por texto por uma conversão visual página a página em alta resolução.
- Gerar um arquivo Word real (`.docx`), com uma página correspondente a cada página do PDF, mesmo tamanho e conteúdo integral preservado.
- Gerar o Excel com uma aba por página, inserindo a página completa como imagem e ocultando a grade para não bagunçar o documento.
- Ajustar o PowerPoint para preservar a proporção das páginas, sem esticar ou recortar o conteúdo.
- Exibir uma orientação clara: o modo fiel mantém a aparência exata, mas o conteúdo convertido fica como imagem, não como texto/células livremente editáveis.
- Atualizar a descrição pública da ferramenta para refletir corretamente esse comportamento.

## Validação
- Testar PDF com texto, tabelas e imagens nas três conversões.
- Confirmar que número, ordem, proporção e aparência das páginas permanecem iguais.
- Validar os arquivos gerados e conferir a compilação da aplicação.
