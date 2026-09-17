# Tratamento profissional de documentos digitalizados

## Objetivo
Adicionar à central uma ferramenta para receber PDF ou imagem digitalizada, limpar ruído e manchas leves, recuperar contraste e aumentar a nitidez de textos, imagens e códigos de barras, sem reconstruir, apagar ou alterar o conteúdo original.

## Experiência
- Criar a opção **Tratar documento** na categoria Otimização.
- Aceitar PDF, JPG, PNG e WEBP, incluindo documentos fotografados ou escaneados.
- Oferecer tratamento conservador, equilibrado e intenso, sempre com aviso de preservação do conteúdo.
- Processar página por página, mostrar andamento e gerar uma nova cópia em PDF.
- Abrir a prévia final para seleção, rotação, reorganização, nome do arquivo e download; o original permanece intacto.

## Tratamento técnico
- Renderizar em alta resolução e aplicar normalização adaptativa de iluminação, limpeza seletiva do fundo, redução de ruído e nitidez controlada.
- Reforçar contraste de bordas finas para favorecer números pequenos, linhas e códigos de barras sem inventar pixels ou usar IA generativa.
- Preservar cores e imagens; a limpeza mais forte será aplicada somente a áreas claras e de baixa saturação identificadas como fundo.
- Controlar resolução e memória para funcionar em celular e computador, liberando imagens temporárias após cada página.
- Reconstruir o resultado como PDF de alta qualidade, mantendo a proporção e orientação de cada página.

## Validação
- Testar imagens e PDFs digitalizados, documento colorido, texto pequeno e página com código de barras.
- Conferir que a ferramenta não baixa automaticamente e que a prévia final permite editar nome e páginas.
- Validar funcionamento e apresentação em celular e computador, além da compilação sem erros.

## Limite de fidelidade
Nenhum tratamento consegue recuperar informação que não foi capturada no arquivo original. A ferramenta melhorará o que existe, mas não recriará letras ou códigos totalmente apagados, cortados ou fora de foco.
