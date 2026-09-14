# Corrigir carregamento e ampliar formatos nas ferramentas

## Objetivo
Fazer a opção **Juntar** aceitar PDFs comuns, PDFs problemáticos e formatos usuais de imagem/documento, convertendo cada item para PDF antes da união e mantendo a revisão final antes do download.

## Implementação
- Detectar o formato pelo conteúdo e pela extensão, sem depender apenas do tipo informado pelo navegador.
- Normalizar PDFs compatíveis e tentar reparar/recriar PDFs que não abrem diretamente.
- Converter imagens JPG, PNG e WEBP para páginas PDF.
- Converter DOCX, XLS/XLSX, CSV, PPTX, HTML e TXT para PDF antes de juntar.
- Permitir seleção de formatos mistos na opção Juntar, preservar a ordem escolhida e mostrar qual arquivo falhou com uma mensagem clara.
- Reaproveitar a mesma normalização nas ferramentas que recebem um único PDF quando isso for seguro.

## Validação
- Testar união de PDFs, mistura de PDF + imagem + documento e arquivo inválido.
- Confirmar a visualização das páginas e a escolha de nome/formato antes do download.
- Verificar funcionamento em tela móvel e computador, além da compilação do aplicativo.

## Limite real
Arquivos executáveis, vídeos, arquivos corrompidos sem conteúdo recuperável e formatos proprietários sem suporte do navegador não podem ser transformados com fidelidade; nesses casos, a ferramenta identificará o arquivo e explicará o problema sem travar.
