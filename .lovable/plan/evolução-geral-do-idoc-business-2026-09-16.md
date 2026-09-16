# Evolução geral do IDOC BUSINESS

## Visão recomendada

Transformar a plataforma em uma central de trabalho documental: o usuário entra, encontra qualquer empresa ou arquivo rapidamente e conclui todo o ciclo — organizar, editar, auditar, enviar, assinar, acompanhar e arquivar — sem trocar de contexto.

## Fase 1 — Confiabilidade e acabamento essencial

- Corrigir avisos e inconsistências de carregamento, estados vazios, mensagens antigas e ações sem retorno claro.
- Criar uma bateria de testes dos fluxos críticos em celular e computador: login, upload, pastas, compartilhamento por SKU, ferramentas PDF, assinatura, evidências, download e notificações.
- Tratar arquivo grande, internet instável e interrupção de upload com progresso, cancelamento e tentativa novamente.
- Padronizar carregamento, sucesso, erro, confirmação e recuperação em todas as telas.
- Concluir funções ainda apresentadas como preparação, especialmente a autorização e sincronização real com Dropbox.
- Salvar preferências importantes na conta, em vez de mantê-las somente no aparelho usado.

## Fase 2 — Experiência profissional unificada

- Manter a navegação inferior no celular e criar uma barra lateral produtiva no computador.
- Adicionar busca global por empresa, pasta, documento, contrato, signatário e código de verificação.
- Reorganizar o início como uma central de trabalho: pendências, assinaturas aguardando, vencimentos, uploads recentes, notificações e ações rápidas.
- Criar um fluxo guiado único: escolher empresa → pasta → arquivo → ação → destinatários → revisão → envio.
- Adicionar recentes, favoritos e atalhos para reduzir cliques em tarefas repetidas.
- Unificar empresas, pastas, documentos, contratos e assinaturas pelo mesmo padrão visual e de ações.

## Fase 3 — Assinatura e contratos em nível avançado

- Criar modelos reutilizáveis de documentos, signatários, campos e exigências de evidência.
- Permitir duplicar envelopes, enviar em lote e reutilizar uma configuração anterior.
- Exibir uma linha do tempo operacional com entrega, abertura, falha, lembrete, assinatura e conclusão.
- Criar fila de falhas de envio e reenvio seguro, evitando processos silenciosamente parados.
- Adicionar versionamento do documento e comparação entre original, revisão e versão assinada.
- Melhorar relatórios por empresa, período, situação, tempo médio de assinatura e taxa de conclusão.

## Fase 4 — Colaboração e crescimento SaaS

- Evoluir o compartilhamento por SKU para equipes com papéis claros: proprietário, gestor, editor, assinante e somente leitura.
- Adicionar comentários, menções e tarefas vinculadas a documentos, sem alterar o arquivo original.
- Criar painel de uso e limites por conta: armazenamento, documentos processados, assinaturas e auditorias.
- Preparar planos, cobrança, administração de organizações, identidade personalizada e trilhas de conformidade.
- Disponibilizar integrações reais, webhooks e API para sistemas empresariais.

## Prioridade sugerida

1. Confiabilidade e testes completos.
2. Navegação profissional e busca global.
3. Modelos e automações de assinatura.
4. Colaboração por equipe e versionamento.
5. Planos comerciais, integrações e API.

## Resultado esperado

- Menos erros e menos abandono durante tarefas importantes.
- Operação mais rápida no celular e muito mais produtiva no computador.
- Contratos e documentos fáceis de localizar, acompanhar e comprovar.
- Base sólida para vender o produto a profissionais, escritórios e empresas.

## Detalhes técnicos

- Cobertura automatizada dos fluxos principais e validação visual em diferentes tamanhos de tela.
- Processamento pesado isolado, com progresso persistente e recuperação de falhas.
- Permissões verificadas no servidor e no banco para cada organização, pasta e documento compartilhado.
- Histórico imutável para ações sensíveis, com identificadores de correlação para diagnóstico.
- Entrega incremental por fase, sem interromper os recursos já disponíveis.