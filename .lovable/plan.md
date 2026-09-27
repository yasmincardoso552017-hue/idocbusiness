# Armazenamento híbrido com Google Drive e Dropbox

## Objetivo
Reduzir o uso de armazenamento do IDOC BUSINESS sem comprometer contratos, evidências ou isolamento entre contas. Cada usuário poderá conectar sua própria conta, copiar arquivos nos dois sentidos e controlar quando a sincronização acontece.

## Entregas
- Central de Integrações com estados reais de conexão para Google Drive e Dropbox.
- Conexão individual e revogável por usuário; credenciais nunca aparecem no navegador ou no banco em texto legível.
- Seleção da pasta raiz `IDOC BUSINESS` em cada serviço.
- Exportação de documentos e árvores de pastas do IDOC para Drive/Dropbox.
- Importação de pastas e documentos externos para uma empresa/pasta escolhida no IDOC.
- Escolha entre cópia manual e cópia automática apenas para documentos assinados/concluídos.
- Histórico de transferências com andamento, sucesso, falha e opção de tentar novamente.
- Confirmação antes de substituir ou duplicar arquivos com o mesmo nome.
- Ferramentas PDF permanecem locais até o usuário escolher salvar; contratos ativos e provas permanecem protegidos no IDOC.

## Segurança e confiabilidade
- O vínculo de cada serviço será associado ao identificador autenticado da conta, nunca ao e-mail.
- O Google Drive usará autorização individual oficial e permissões mínimas de arquivos.
- O Dropbox usará autorização individual equivalente; como não há conector individual pronto neste workspace, será preparado com OAuth próprio e ativado após cadastrar o aplicativo Dropbox.
- Compartilhamentos por SKU continuam somente leitura quando aplicável e não concedem permissão para copiar em nome do proprietário.
- Arquivos assinados só serão removidos do armazenamento principal após cópia confirmada, hash conferido e período de retenção configurado.

## Dependências para ativação real
- Reativar temporariamente o Cloud para criar as tabelas seguras de conexões e histórico e testar autenticação e transferências.
- Configurar um cliente Google Drive no workspace; a tentativa de abrir essa configuração não foi concluída.
- Cadastrar um aplicativo Dropbox com retorno autorizado para habilitar conexões individuais.

## Validação
- Conectar e desconectar cada serviço com duas contas diferentes.
- Exportar e importar arquivo e árvore de subpastas, preservando nomes e tipos.
- Confirmar que uma conta não acessa a conexão nem os arquivos externos de outra.
- Testar arquivos grandes, nomes repetidos, conexão revogada e retomada após falha.
- Verificar a Central de Integrações em celular e computador.
