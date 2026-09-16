# Configurações pessoais de envio

## Objetivo
Cada usuário controla no próprio perfil como envia links de assinatura, sem compartilhar credenciais com outras contas.

## Implementação
- Criar no perfil uma seção “Canais de envio” com WhatsApp, Gmail e Outlook.
- WhatsApp: salvar o número do remetente e abrir mensagens individuais já preenchidas, uma para cada signatário e seu link exclusivo; o usuário confirma cada envio.
- E-mail: permitir escolher Gmail ou Outlook e exibir conexão, reconexão e desconexão da caixa pessoal.
- Guardar as autorizações de e-mail criptografadas no servidor e vinculadas ao ID autenticado de cada usuário; nenhuma conta poderá usar a conexão de outra.
- No envio e reenvio de contratos, mostrar uma central com todos os destinatários, status por canal e ações “Abrir WhatsApp” e “Enviar por e-mail”.
- Manter cópia de link e envio manual disponíveis quando o e-mail ainda não estiver conectado.
- Registrar na trilha do contrato somente confirmações e resultados de envio, sem salvar credenciais.

## Dependência
A autorização do cliente Gmail/Outlook pelo administrador do espaço é necessária uma única vez. Depois disso, cada usuário conecta sua própria caixa diretamente no perfil. Como a autorização do Gmail foi recusada agora, a interface ficará pronta e mostrará claramente quando a conexão ainda precisar ser habilitada.

## Validação
- Testar isolamento entre duas contas.
- Testar mensagens com links diferentes para vários signatários.
- Testar envio, reenvio, conexão e desconexão em celular e computador.
