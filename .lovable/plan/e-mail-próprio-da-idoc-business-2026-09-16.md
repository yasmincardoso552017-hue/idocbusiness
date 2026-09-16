# E-mail próprio da IDOC BUSINESS

## Objetivo
Cada conta enviará convites de assinatura pelo sistema, usando um remetente da IDOC BUSINESS. O usuário não precisará conectar nem expor Gmail ou Outlook pessoal.

## Implementação
1. Configurar o domínio `idoc.business` para os e-mails do aplicativo e criar o sistema de modelos gerenciado.
2. Criar um modelo profissional de convite para assinatura, com nome do signatário, documento, remetente, mensagem e botão para o link exclusivo.
3. Ligar o envio ao fluxo de contratos:
   - envio individual para cada signatário;
   - ação para enviar todos os links pendentes;
   - reenvio individual;
   - proteção contra duplicidade;
   - registro do resultado na trilha do contrato.
4. Remover do perfil a exigência de Gmail/Outlook e mostrar que o e-mail seguro da IDOC BUSINESS já está disponível para a conta.
5. Tratar bloqueios, destinatários suprimidos, falhas e limite temporário com mensagens claras, mantendo WhatsApp e cópia do link como alternativas.
6. Validar no celular e computador o envio inicial, o reenvio e os estados da central de destinatários.

## Segurança e privacidade
- O destinatário e o modelo serão definidos somente no servidor a partir dos signatários do contrato pertencente à conta autenticada.
- A tela não poderá escolher destinatários arbitrários nem acessar credenciais de envio.
- Cada link continuará exclusivo por signatário; nenhum dado de outra conta será exposto.

## Dependência externa
O envio real começa após a verificação DNS do domínio `idoc.business`. A configuração será iniciada no painel de e-mail e, enquanto a verificação estiver pendente, a plataforma continuará oferecendo WhatsApp e cópia segura do link.
