import { createFileRoute } from "@tanstack/react-router";

import { PublicPage } from "@/components/PublicPage";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — IDOC BUSINESS" },
      {
        name: "description",
        content:
          "Condições de uso do IDOC BUSINESS para gestão de documentos, contratos e assinaturas eletrônicas.",
      },
      { property: "og:title", content: "Termos de Uso — IDOC BUSINESS" },
      { property: "og:description", content: "Condições de uso da plataforma IDOC BUSINESS." },
    ],
  }),
  component: () => (
    <PublicPage title="Termos de Uso">
      <p>Última atualização: 1º de setembro de 2026.</p>

      <h2>1. Objeto</h2>
      <p>
        O IDOC BUSINESS oferece plataforma para armazenamento, organização e assinatura eletrônica de documentos e
        contratos, com registro de evidências e trilha de auditoria.
      </p>

      <h2>2. Conta e responsabilidades</h2>
      <p>
        O usuário é responsável pela veracidade dos dados cadastrados, pela guarda de suas credenciais e pelo
        conteúdo dos documentos enviados, garantindo que possui autorização para tratá-los.
      </p>

      <h2>3. Assinatura eletrônica</h2>
      <p>
        As assinaturas seguem o modelo de assinatura eletrônica simples/avançada previsto na Lei 14.063/2020 e
        no art. 10, §2º da MP 2.200-2/2001, com validade entre as partes que aceitaram os termos. Cada
        assinatura é acompanhada de evidências técnicas e do hash do documento.
      </p>

      <h2>4. Uso permitido</h2>
      <ul>
        <li>É proibido enviar conteúdo ilícito, fraudulento ou que viole direitos de terceiros.</li>
        <li>É proibido tentar burlar controles de acesso, links de assinatura ou a trilha de auditoria.</li>
      </ul>

      <h2>5. Disponibilidade</h2>
      <p>
        Buscamos disponibilidade contínua, mas o serviço pode sofrer interrupções para manutenção. Não há
        garantia de operação ininterrupta.
      </p>

      <h2>6. Retenção e encerramento</h2>
      <p>
        O usuário pode excluir documentos a qualquer momento. Evidências de assinaturas concluídas são retidas
        pelo prazo legal para comprovação da validade do ato.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        O IDOC BUSINESS não responde por decisões negociais, pelo conteúdo dos contratos ou por perdas indiretas
        decorrentes do uso da plataforma.
      </p>

      <h2>8. Foro e contato</h2>
      <p>Aplica-se a legislação brasileira. Contato: suporte@docflow.app.</p>
    </PublicPage>
  ),
});
