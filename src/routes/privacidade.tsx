import { createFileRoute } from "@tanstack/react-router";

import { PublicPage } from "@/components/PublicPage";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — DocFlow" },
      {
        name: "description",
        content:
          "Como o DocFlow trata dados pessoais na assinatura eletrônica, em conformidade com a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — DocFlow" },
      { property: "og:description", content: "Tratamento de dados pessoais e LGPD no DocFlow." },
    ],
  }),
  component: () => (
    <PublicPage title="Política de Privacidade">
      <p>Última atualização: 1º de setembro de 2026.</p>

      <h2>1. Papéis</h2>
      <p>
        O cliente que envia documentos é o <strong>controlador</strong> dos dados neles contidos; o DocFlow atua
        como <strong>operador</strong>. Para os dados de cadastro da conta, o DocFlow é controlador.
      </p>

      <h2>2. Dados tratados</h2>
      <ul>
        <li>Cadastro: nome, e-mail, telefone e senha (armazenada de forma cifrada).</li>
        <li>Empresas e contratos: dados cadastrais e comerciais informados pelo usuário.</li>
        <li>
          Assinatura: nome, e-mail, CPF (quando solicitado), imagem da assinatura, IP, dispositivo,
          navegador, data/hora, localização aproximada quando autorizada.
        </li>
        <li>Arquivos: documentos enviados e o PDF final assinado, com hash SHA-256.</li>
      </ul>

      <h2>3. Finalidades e bases legais</h2>
      <ul>
        <li>Execução de contrato: prestação do serviço de assinatura e gestão documental.</li>
        <li>Cumprimento de obrigação legal e exercício regular de direitos: evidências e auditoria.</li>
        <li>Legítimo interesse: segurança, prevenção a fraudes e melhoria do serviço.</li>
      </ul>

      <h2>4. Compartilhamento</h2>
      <p>
        Utilizamos provedores de infraestrutura em nuvem para banco de dados, armazenamento e envio de e-mails.
        A integração com Dropbox só ocorre quando o usuário a ativa. Não vendemos dados pessoais.
      </p>

      <h2>5. Segurança</h2>
      <p>
        Armazenamento privado com links temporários assinados, isolamento por conta no banco de dados,
        criptografia em trânsito, hash dos arquivos e registro imutável de eventos.
      </p>

      <h2>6. Retenção</h2>
      <p>
        Documentos permanecem enquanto a conta existir ou até exclusão pelo usuário. Evidências de assinaturas
        concluídas são mantidas pelo prazo legal aplicável, mesmo após a exclusão do documento.
      </p>

      <h2>7. Direitos do titular</h2>
      <p>
        Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade e
        eliminação, salvo quando a retenção for necessária à comprovação da assinatura. Solicitações:
        privacidade@docflow.app.
      </p>

      <h2>8. Cookies</h2>
      <p>Usamos apenas armazenamento local essencial para manter a sessão e as preferências da interface.</p>
    </PublicPage>
  ),
});
