import { createFileRoute } from "@tanstack/react-router";

import { PublicPage } from "@/components/PublicPage";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Central de ajuda — DocFlow" },
      {
        name: "description",
        content:
          "Dúvidas frequentes sobre envio de documentos, assinatura eletrônica, evidências e verificação no DocFlow.",
      },
      { property: "og:title", content: "Central de ajuda — DocFlow" },
      {
        property: "og:description",
        content: "Guia rápido do fluxo de documentos, contratos e assinaturas no DocFlow.",
      },
    ],
  }),
  component: () => (
    <PublicPage title="Central de ajuda">
      <h2>Como envio um documento para assinatura?</h2>
      <p>
        Cadastre a empresa em <strong>Empresas</strong>, envie o arquivo em <strong>Documentos</strong> e use a
        ação <em>Enviar para assinatura</em>. Em seguida adicione os signatários, posicione os campos na página
        e confirme o envio para gerar os links seguros.
      </p>

      <h2>Quais formatos são aceitos?</h2>
      <p>PDF, Word, Excel, PowerPoint, imagens, TXT/CSV e ZIP com até 2 GB por arquivo. A assinatura com posicionamento de campos usa arquivos PDF.</p>

      <h2>Assinatura sequencial ou paralela?</h2>
      <p>
        Na tela de preparação você escolhe: no modo sequencial cada pessoa só assina após a anterior; no
        paralelo todos podem assinar ao mesmo tempo.
      </p>

      <h2>Que evidências são registradas?</h2>
      <p>
        Nome, e-mail, aceite dos termos, data e hora, endereço IP, dispositivo, navegador, localização
        aproximada (quando autorizada) e o hash SHA-256 do arquivo original e do PDF final.
      </p>

      <h2>Como comprovar a autenticidade?</h2>
      <p>
        Todo documento finalizado recebe um código de verificação, um QR Code e uma página de evidências, além
        de rodapé em todas as páginas. Qualquer pessoa pode conferir em <strong>/verify</strong>.
      </p>

      <h2>Onde ficam os arquivos assinados?</h2>
      <p>
        Na pasta <strong>Assinados</strong> da empresa e na aba <strong>Assinaturas</strong>, com download do
        PDF final. Se a integração com Dropbox estiver ativa, a cópia é enviada para a pasta configurada.
      </p>

      <h2>Esqueci minha senha</h2>
      <p>Na tela de acesso, use “Esqueci minha senha” para receber o link de redefinição por e-mail.</p>

      <h2>Preciso de mais ajuda</h2>
      <p>Escreva para suporte@docflow.app com o nome do documento e o código de verificação, se houver.</p>
    </PublicPage>
  ),
});
