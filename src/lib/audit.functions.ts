import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(body: unknown) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("IA indisponível no momento");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
  if (!res.ok) throw new Error(`Falha na análise (${res.status})`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

const SYSTEM = `Você é um(a) advogado(a) sênior brasileiro(a), especialista em direito contratual, civil, empresarial, consumerista e trabalhista.
Sua missão: auditar o contrato linha por linha, com calma e profundidade, para BLINDAR JURIDICAMENTE quem contratou a auditoria (o contratante que enviou o documento).
Regras:
- Leia todo o texto antes de concluir. Identifique o tipo de contrato, as partes, o objeto, o valor, os prazos e a lei aplicável.
- Aponte cláusulas abusivas, ambíguas, nulas, desequilibradas, omissões perigosas e riscos concretos.
- Cite o número/nome da cláusula sempre que possível e a base legal (CC, CDC, CLT, Lei 13.709/LGPD, etc.).
- Para cada problema, dê uma sugestão de redação alternativa pronta para uso.
- Nunca reescreva o documento inteiro; entregue diagnóstico e recomendações.
Responda SOMENTE com JSON válido no formato:
{"tipo":"...","resumo":"...","partes":["..."],"objeto":"...","risco_geral":"baixo|medio|alto",
"pontos":[{"clausula":"...","trecho":"...","risco":"baixo|medio|alto","problema":"...","base_legal":"...","sugestao":"..."}],
"clausulas_faltantes":[{"titulo":"...","porque":"...","sugestao":"..."}],
"checklist":[{"item":"...","ok":true}],
"recomendacoes_finais":["..."]}`;

export type AuditResult = {
  tipo: string;
  resumo: string;
  partes: string[];
  objeto: string;
  risco_geral: string;
  pontos: Array<{
    clausula: string;
    trecho?: string;
    risco: string;
    problema: string;
    base_legal?: string;
    sugestao: string;
  }>;
  clausulas_faltantes: Array<{ titulo: string; porque: string; sugestao: string }>;
  checklist: Array<{ item: string; ok: boolean }>;
  recomendacoes_finais: string[];
};

function parseJson(raw: string): AuditResult {
  const clean = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const slice = start >= 0 && end > start ? clean.slice(start, end + 1) : clean;
  const parsed = JSON.parse(slice) as Partial<AuditResult>;
  return {
    tipo: parsed.tipo ?? "Contrato",
    resumo: parsed.resumo ?? "",
    partes: parsed.partes ?? [],
    objeto: parsed.objeto ?? "",
    risco_geral: parsed.risco_geral ?? "medio",
    pontos: parsed.pontos ?? [],
    clausulas_faltantes: parsed.clausulas_faltantes ?? [],
    checklist: parsed.checklist ?? [],
    recomendacoes_finais: parsed.recomendacoes_finais ?? [],
  };
}

/** Auditoria jurídica profunda do contrato, salva no histórico do usuário. */
export const auditContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        fileName: z.string().min(1),
        text: z.string().min(40, "Não foi possível ler texto suficiente do documento"),
        documentId: z.string().uuid().optional(),
        companyId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const text = data.text.slice(0, 180000);
    const content = await callGateway({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Arquivo: ${data.fileName}\n\nTexto integral do contrato entre <<<>>>:\n<<<\n${text}\n>>>`,
        },
      ],
    });
    const result = parseJson(content);
    const { data: row } = await context.supabase
      .from("contract_audits")
      .insert({
        owner_id: context.userId,
        document_id: data.documentId ?? null,
        company_id: data.companyId ?? null,
        file_name: data.fileName,
        summary: result.resumo.slice(0, 900),
        result: JSON.parse(JSON.stringify(result)),
      })
      .select("id")
      .single();
    return { id: row?.id ?? null, result };
  });

/** Pergunta livre sobre um contrato já auditado. */
export const askAboutContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ text: z.string().min(20), question: z.string().min(3) }).parse(d),
  )
  .handler(async ({ data }) => {
    const answer = await callGateway({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content:
            "Você é advogado(a) sênior brasileiro(a). Responda com base exclusivamente no contrato fornecido, citando cláusulas. Seja objetivo, prático e proteja o contratante. Se a informação não existir no contrato, diga isso claramente.",
        },
        {
          role: "user",
          content: `Contrato:\n<<<\n${data.text.slice(0, 180000)}\n>>>\n\nPergunta: ${data.question}`,
        },
      ],
    });
    return { answer };
  });

/** OCR de páginas digitalizadas para gerar PDF pesquisável. */
export const ocrPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ images: z.array(z.string().min(100)).min(1).max(30) }).parse(d),
  )
  .handler(async ({ data }) => {
    const texts: string[] = [];
    for (const image of data.images) {
      const content = await callGateway({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Transcreva fielmente TODO o texto visível da imagem, mantendo a ordem de leitura e as quebras de linha. Não comente, não traduza, não adicione nada. Se não houver texto, responda vazio.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcreva o texto desta página." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      });
      texts.push(content.trim());
    }
    return { texts };
  });
