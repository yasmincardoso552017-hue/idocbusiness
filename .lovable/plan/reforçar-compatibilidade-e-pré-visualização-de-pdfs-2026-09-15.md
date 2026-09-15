# Reforçar compatibilidade e pré-visualização de PDFs

## Objetivo
Fazer a área de ferramentas abrir e exibir o maior número possível de PDFs válidos, inclusive arquivos antigos, malformados, com formulários avançados, páginas grandes ou erros isolados.

## Implementação
- Tornar o leitor de pré-visualização mais tolerante a estruturas incomuns, fontes ausentes, formulários XFA e pequenos erros internos.
- Tentar uma segunda estratégia de leitura quando a primeira falhar e reconstruir PDFs recuperáveis antes de desistir.
- Renderizar página por página, preservando as páginas já carregadas e identificando falhas específicas sem derrubar toda a prévia.
- Melhorar o estado visual com progresso, aviso de páginas recuperadas e mensagem clara para arquivos protegidos por senha ou realmente irrecuperáveis.
- Reutilizar a normalização reforçada nas ações de juntar e nas demais ferramentas compatíveis.

## Validação
- Testar PDF comum, PDF com estrutura danificada recuperável, páginas de dimensões incomuns e mistura de PDF com imagem/documento.
- Confirmar prévia, seleção, reordenação e exportação final em computador e celular.
- Verificar compilação e ausência de erros durante o carregamento.

## Limite real
PDFs criptografados sem senha, truncados sem dados recuperáveis ou com recursos proprietários não suportados pelo navegador não podem ser garantidos; nesses casos, a ferramenta mostrará o motivo sem travar.
