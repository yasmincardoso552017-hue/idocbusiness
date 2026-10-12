# SignFlow Documents

Gastando menos token possível crie completo sem deixar nada pra depois o seguinte Crie um SaaS MOBILE-FIRST completo de Gestão de Documentos, Contratos e Assinaturas Eletrônicas.

O produto deve ter aparência profissional, moderna, limpa e empresarial, funcionando perfeitamente em celular, tablet e desktop.

NOME PROVISÓRIO DO SISTEMA:

DocFlow

OBJETIVO DO PRODUTO:

Criar uma plataforma SaaS onde usuários possam cadastrar empresas, organizar documentos por empresa, gerenciar contratos, enviar documentos para assinatura eletrônica, coletar assinaturas de múltiplos signatários, manter uma trilha completa de auditoria e gerar automaticamente uma versão final do documento assinado em PDF, com uma página adicional contendo o relatório de evidências da assinatura.

IMPORTANTE:

Não criar apenas uma interface visual. Construir a estrutura completa da aplicação, incluindo autenticação, banco de dados, armazenamento de arquivos, permissões, fluxo de assinatura, auditoria, geração de PDF e arquitetura preparada para integrações externas.

==================================================

1. AUTENTICAÇÃO

==================================================

Permitir:

- Login com Google.

- Cadastro tradicional com:

  - Nome

  - E-mail

  - Senha

  - Telefone opcional

- Login.

- Recuperação de senha.

- Logout.

- Verificação de e-mail.

- Perfil do usuário.

Todo usuário do sistema deve possuir uma conta.

Existem dois papéis principais:

1. REMETENTE / PROPRIETÁRIO

2. SIGNATÁRIO / DESTINATÁRIO

Um mesmo usuário pode exercer os dois papéis.

O usuário que envia um documento controla completamente seus próprios documentos, empresas, contratos e processos de assinatura.

O signatário NÃO pode visualizar dados privados de outras empresas ou documentos do remetente.

Cada usuário só poderá acessar os dados aos quais possui autorização.

Implementar isolamento completo dos dados entre usuários/organizações utilizando regras de segurança no banco de dados.

==================================================

2. DASHBOARD

==================================================

Criar dashboard principal com:

- Total de empresas

- Total de documentos

- Documentos pendentes de assinatura

- Documentos assinados

- Documentos expirados

- Contratos ativos

- Contratos próximos do vencimento

- Assinaturas pendentes

- Atividades recentes

Criar cards e gráficos simples.

Mostrar alertas:

- Contrato vencendo

- Documento aguardando assinatura

- Documento parcialmente assinado

- Documento totalmente assinado

- Falha em assinatura

- Documento expirado

==================================================

3. CADASTRO DE EMPRESAS

==================================================

Criar área "Empresas".

O usuário poderá cadastrar:

- Razão social

- Nome fantasia

- CNPJ

- Inscrição estadual

- Endereço

- Cidade

- Estado

- CEP

- Telefone

- E-mail

- Pessoa de contato

- Observações

Cada empresa terá uma página própria.

Exemplo:

EMPRESAS

|

|-- Empresa ABC Ltda.

|     |-- Documentos

|     |-- Contratos

|     |-- Pendentes de assinatura

|     |-- Assinados

|     |-- Histórico

|

|-- Empresa XYZ Ltda.

      |-- Documentos

      |-- Contratos

      |-- Pendentes

      |-- Assinados

      |-- Histórico

==================================================

4. GESTÃO DE DOCUMENTOS

==================================================

Dentro de cada empresa criar:

- Todos os documentos

- Pendentes

- Em assinatura

- Assinados

- Arquivados

- Cancelados

Permitir upload de:

- PDF

- DOCX

- XLSX

- Imagens

O sistema deve permitir:

- Visualizar

- Baixar

- Renomear

- Excluir

- Mover

- Organizar

- Criar pastas

- Pesquisar

- Filtrar

- Ordenar

- Visualizar histórico

Para PDFs implementar ferramentas inspiradas no iLovePDF:

- Juntar PDFs

- Dividir PDF

- Comprimir PDF

- Girar páginas

- Organizar páginas

- PDF para Word

- Word para PDF

- PDF para Excel

- OCR

- Editar PDF

- Inserir texto

- Inserir imagem

- Inserir assinatura

- Baixar PDF final

==================================================

5. ESTRUTURA DE PASTAS

==================================================

Cada empresa deve possuir estrutura documental.

Exemplo:

Empresa ABC

|

|-- Documentos

|

|-- Contratos

|

|-- Contratos Pendentes

|

|-- Contratos Assinados

|

|-- Documentos Assinados

|

|-- Documentos Arquivados

|

|-- Outros

O usuário pode criar subpastas personalizadas.

==================================================

6. GESTÃO DE CONTRATOS

==================================================

Criar módulo específico chamado:

"Contratos"

Permitir cadastrar contrato com:

- Nome do contrato

- Número do contrato

- Empresa relacionada

- Tipo de contrato

- Data de início

- Data de término

- Valor

- Renovação automática

- Prazo de aviso

- Responsável

- Observações

- Documento principal

Status:

- Rascunho

- Aguardando assinatura

- Parcialmente assinado

- Assinado

- Ativo

- Próximo do vencimento

- Expirado

- Cancelado

Criar alertas automáticos de vencimento.

==================================================

7. FLUXO DE ASSINATURA

==================================================

O usuário deverá conseguir abrir um documento e clicar:

"Enviar para assinatura"

Depois deverá adicionar um ou vários signatários.

Para cada signatário:

- Nome

- E-mail

- Telefone opcional

- CPF opcional

- Ordem de assinatura

- Tipo de assinatura

- Obrigatoriedade

Permitir:

- Assinatura sequencial

- Assinatura paralela

Exemplo:

Signatário 1 assina

↓

Signatário 2 recebe

↓

Signatário 3 recebe

↓

Documento concluído

OU:

Todos recebem simultaneamente.

==================================================

8. POSICIONAMENTO DA ASSINATURA

==================================================

Essa é uma função extremamente importante.

Antes de enviar o documento, o remetente deve abrir um visualizador de PDF.

Criar uma ferramenta de preparação de assinatura.

O remetente poderá selecionar:

- Signatário

- Página

- Local exato

- Campo de assinatura

Permitir arrastar e soltar o campo de assinatura.

Permitir redimensionar.

Permitir adicionar vários campos para o mesmo signatário.

Exemplo:

João Silva:

- assinatura página 2

- assinatura página 5

- assinatura página 8

Maria:

- assinatura página 3

- assinatura página 8

Cada campo precisa estar vinculado ao signatário correto.

Também permitir campos adicionais:

- Nome

- Data

- CPF

- Rubrica

- Texto

- Checkbox

- Local/data

- Campo obrigatório

O sistema deve impedir que o documento seja enviado caso existam campos obrigatórios sem signatário definido.

==================================================

9. LINK DE ASSINATURA

==================================================

Quando o remetente enviar:

Gerar um link único e seguro.

Exemplo:

/sign/UNIQUE-TOKEN

O signatário recebe o link por e-mail.

Ao abrir:

1. Visualiza o documento.

2. Visualiza os termos de assinatura.

3. Confirma sua identidade conforme os métodos disponíveis.

4. Assina exatamente nos campos definidos pelo remetente.

5. Confirma a assinatura.

6. O sistema registra as evidências.

7. O documento passa para o próximo signatário ou é finalizado.

O link deve ser:

- Único

- Seguro

- Não previsível

- Expirável

- Revogável

- Vinculado ao processo de assinatura

==================================================

10. EXPERIÊNCIA DO SIGNATÁRIO

==================================================

A experiência deve ser extremamente simples no celular.

Tela:

"Você recebeu um documento para assinatura"

Mostrar:

- Nome do documento

- Quem enviou

- Empresa

- Quantidade de páginas

- Campos que precisam ser preenchidos

Botão:

"Visualizar documento"

Depois:

"Assinar documento"

Após concluir:

"Documento assinado com sucesso."

Depois mostrar:

"Crie sua conta gratuitamente para acessar e guardar uma cópia dos seus documentos assinados."

IMPORTANTE:

O signatário não deve ganhar acesso aos documentos privados do remetente.

Depois de criar a conta, ele terá acesso apenas:

- Aos documentos dos quais participa

- Aos documentos que assinou

- Aos documentos que recebeu

- Aos seus próprios documentos

==================================================

11. ASSINATURA ELETRÔNICA

==================================================

Implementar arquitetura preparada para assinatura eletrônica com forte trilha de evidências.

Registrar, quando tecnicamente e legalmente permitido:

- Nome

- E-mail

- Telefone

- CPF, quando fornecido

- IP

- Data

- Hora

- Fuso horário

- User Agent

- Sistema operacional

- Navegador

- Dispositivo

- Localização aproximada quando houver consentimento e disponibilidade

- Identificador do processo de assinatura

- Identificador único do documento

- Hash do documento

- Hash da versão final

- Eventos realizados

- Data de criação

- Data de envio

- Data de visualização

- Data de assinatura

- Ordem das assinaturas

- Método de autenticação

- Aceite dos termos

- Evidências técnicas disponíveis

IMPORTANTE:

Solicitar consentimento quando necessário para coleta de dados pessoais e localização.

Não coletar localização de forma oculta.

Criar política de privacidade e consentimento compatíveis com LGPD.

==================================================

12. TRILHA DE AUDITORIA

==================================================

Criar um "Relatório de Evidências da Assinatura".

Registrar todos os eventos:

Documento criado

↓

Documento enviado

↓

E-mail enviado

↓

Documento visualizado

↓

Campos preenchidos

↓

Termos aceitos

↓

Assinatura realizada

↓

IP registrado

↓

Dispositivo registrado

↓

Data/hora registrada

↓

Próximo signatário

↓

Documento finalizado

Cada evento deve ter:

- Data

- Hora

- Usuário

- Ação

- IP

- Identificador

- Informações técnicas disponíveis

Não permitir edição manual da trilha de auditoria.

==================================================

13. PDF FINAL ASSINADO

==================================================

Quando todos os signatários concluírem:

Gerar automaticamente um novo PDF final.

O PDF deve conter:

1. Documento original

2. Assinaturas nos locais definidos

3. Página adicional no final chamada:

"RELATÓRIO DE EVIDÊNCIAS DA ASSINATURA"

Essa página deve conter informações resumidas e organizadas sobre:

- Documento

- Identificador único

- Hash

- Signatários

- E-mails

- Datas e horários

- Ordem de assinatura

- Métodos de autenticação

- IP

- Dispositivo

- Navegador

- Localização, quando coletada com consentimento

- Registro de aceite

- Histórico de eventos

- Data de conclusão

Criar QR Code ou identificador verificável apontando para uma página pública/segura de verificação da autenticidade do documento, sem expor informações privadas desnecessárias.

==================================================

14. RODAPÉ DE EVIDÊNCIAS

==================================================

Adicionar no rodapé de TODAS as páginas do PDF final uma única linha pequena e discreta.

Exemplo:

"DocFlow • ID: ABC123 • Hash: 8F2... • Assinado em 30/08/2026"

O texto deve:

- Ser pequeno

- Caber em uma única linha

- Não atrapalhar o documento

- Manter boa legibilidade

- Aparecer em todas as páginas

- Ter identificador único do documento

- Permitir relacionar a página ao documento final

Não sobrepor conteúdo existente.

==================================================

15. VERIFICAÇÃO DO DOCUMENTO

==================================================

Criar página:

"Verificar documento"

O usuário poderá informar:

- ID do documento

- Código de verificação

- Escanear QR Code

O sistema deverá mostrar:

- Documento válido ou inválido

- Data da assinatura

- Status

- Signatários

- Hash

- Identificador do documento

Não expor dados pessoais além do necessário.

==================================================

16. DOWNLOAD E ENVIO

==================================================

Depois de assinado:

Botões:

- Visualizar

- Baixar PDF

- Compartilhar

- Enviar por e-mail

- Copiar link

- Arquivar

Criar opção:

"Enviar cópia"

==================================================

17. DROPBOX

==================================================

Criar arquitetura preparada para integração com Dropbox.

Criar área:

Configurações

→ Integrações

→ Dropbox

Preparar campos/configuração necessários para:

- Client ID

- Client Secret

- Redirect URI

- OAuth

- Token de acesso seguro

NÃO armazenar secrets diretamente no frontend.

Utilizar backend/server-side seguro.

Permitir ao usuário conectar sua conta Dropbox.

Depois de conectado:

Criar opção:

"Sincronizar documentos com Dropbox"

Estrutura:

Dropbox

|

|-- DocFlow

|    |

|    |-- Empresa ABC

|    |     |-- Documentos

|    |     |-- Contratos

|    |     |-- Assinados

|    |

|    |-- Empresa XYZ

|          |-- Documentos

|          |-- Contratos

|          |-- Assinados

Permitir configurar:

- Sincronização automática

- Sincronização manual

- Pasta principal do Dropbox

IMPORTANTE:

O sistema deve ser desenhado para que o Dropbox seja uma camada de armazenamento/sincronização, sem comprometer a segurança e integridade dos registros de auditoria.

==================================================

18. SEGURANÇA

==================================================

Implementar:

- Criptografia em trânsito

- Controle de acesso

- Isolamento por usuário/organização

- Tokens seguros

- Links de assinatura com expiração

- Proteção contra acesso não autorizado

- Rate limiting

- Logs

- Auditoria

- Validação de arquivos

- Limite de tamanho de upload

- Proteção contra arquivos maliciosos

- Controle de permissões

- Exclusão segura

- Backup

- Recuperação

Nunca expor:

- Tokens privados

- Secrets

- Client Secret

- Dados de outros usuários

- Documentos de outras empresas

==================================================

19. BANCO DE DADOS

==================================================

Criar estrutura relacional adequada.

Entidades principais:

users

organizations

companies

folders

documents

document_versions

contracts

signing_requests

signers

signature_fields

signatures

audit_events

document_evidence

notifications

integrations

dropbox_connections

Relacionamentos devem ser bem definidos.

Cada documento deve possuir:

- ID único

- Nome

- Empresa

- Pasta

- Proprietário

- Status

- Versão

- Hash

- Data de criação

- Data de atualização

- Storage path

- Tipo MIME

==================================================

20. NOTIFICAÇÕES

==================================================

Criar notificações para:

- Documento enviado

- Documento visualizado

- Assinatura pendente

- Assinatura realizada

- Documento concluído

- Contrato próximo do vencimento

- Contrato expirado

- Falha na assinatura

Preparar arquitetura para:

- E-mail

- WhatsApp futuramente

- Push notification futuramente

==================================================

21. DESIGN MOBILE

==================================================

Prioridade absoluta para celular.

Navegação inferior:

Início

Empresas

Documentos

Contratos

Assinaturas

Menu:

Perfil

Configurações

Integrações

Segurança

Ajuda

Interface:

- Moderna

- Minimalista

- Profissional

- Empresarial

- Fácil de usar

- Botões grandes

- Boa leitura em telas pequenas

Criar visualizador PDF mobile excelente.

==================================================

22. BUSCA

==================================================

Busca global por:

- Empresa

- Documento

- Contrato

- Número

- Nome

- CNPJ

- Signatário

- Status

Filtros:

- Data

- Empresa

- Status

- Tipo

- Assinado

- Pendente

- Expirado

==================================================

23. ARQUITETURA SaaS

==================================================

O sistema deve ser preparado para funcionar como SaaS multi-tenant.

Cada cliente deve ter seu ambiente lógico isolado.

Preparar:

- Planos

- Limites de armazenamento

- Limite de documentos

- Limite de assinaturas

- Usuários

- Empresas

- Integrações

Criar estrutura preparada para futuramente adicionar:

FREE

PRO

BUSINESS

ENTERPRISE

Não é necessário implementar cobrança inicialmente, mas a arquitetura deve permitir isso futuramente.

==================================================

24. CONFORMIDADE E RESPONSABILIDADE JURÍDICA

==================================================

Não afirmar que a plataforma garante automaticamente validade judicial de qualquer contrato.

O sistema deve ser construído para maximizar a força probatória e a integridade documental.

Criar:

- Termos de uso

- Política de privacidade

- Consentimento de dados

- Registro de aceite

- Trilha de auditoria

- Integridade por hash

- Identificador único

- Evidências de autenticação

- Registro temporal

- Verificação do documento

Preparar arquitetura para integração futura com provedores especializados de assinatura eletrônica/certificação digital, caso seja necessário elevar o nível de assinatura conforme o tipo de documento e legislação aplicável.

==================================================

25. RESULTADO ESPERADO

==================================================

Quero um produto que na prática funcione como uma combinação de:

iLovePDF

+

Google Drive/Dropbox

+

Gestão de contratos

+

Assinatura eletrônica

+

Trilha de auditoria

+

Gestão documental empresarial

Mas com foco principal em:

GESTÃO DE DOCUMENTOS + CONTRATOS + ASSINATURAS.

O fluxo principal deve ser extremamente simples:

CADASTRAR EMPRESA

↓

CRIAR/ENVIAR DOCUMENTO

↓

ORGANIZAR DOCUMENTO

↓

ADICIONAR SIGNATÁRIOS

↓

MARCAR EXATAMENTE ONDE CADA UM ASSINA

↓

ENVIAR LINK

↓

SIGNATÁRIO ABRE

↓

ASSINA

↓

REGISTRO DAS EVIDÊNCIAS

↓

OUTROS SIGNATÁRIOS ASSINAM

↓

DOCUMENTO FINALIZADO

↓

GERAR PDF FINAL

↓

ADICIONAR PÁGINA DE EVIDÊNCIAS

↓

ADICIONAR RODAPÉ EM TODAS AS PÁGINAS

↓

SALVAR NA PASTA "ASSINADOS" DA EMPRESA

↓

DISPONIBILIZAR VISUALIZAÇÃO/DOWNLOAD

↓

OPCIONALMENTE SINCRONIZAR COM DROPBOX.

Priorizar primeiro um MVP funcional completo desse fluxo principal antes de implementar funcionalidades secundárias.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://idocbusiness.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6b73cc70-0820-4dc9-9868-202fd9a12208).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
