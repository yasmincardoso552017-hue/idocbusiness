import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_documents",
  title: "Buscar documentos",
  description: "Busca documentos pertencentes à conta autenticada no IDOC BUSINESS.",
  inputSchema: {
    query: z.string().trim().max(160).optional().describe("Nome ou parte do nome do documento."),
    limit: z.number().int().min(1).max(50).default(20).describe("Quantidade máxima de resultados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("É necessário entrar no IDOC BUSINESS.");

    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("documents")
      .select("id,name,mime_type,size_bytes,page_count,status,version,created_at,updated_at,company_id,folder_id")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (query) request = request.ilike("name", `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);

    const { data, error } = await request;
    if (error) throw new ToolError(`Não foi possível buscar os documentos: ${error.message}`);

    const documents = (data ?? []).map((document) => ({
      id: document.id,
      name: document.name,
      mimeType: document.mime_type,
      sizeBytes: document.size_bytes,
      pageCount: document.page_count,
      status: document.status,
      version: document.version,
      companyId: document.company_id,
      folderId: document.folder_id,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    }));

    const summary = documents.length
      ? `${documents.length} documento(s) encontrado(s):\n${documents.map((item) => `- ${item.name} (${item.status})`).join("\n")}`
      : "Nenhum documento foi encontrado para esta busca.";

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { documents, count: documents.length },
    };
  },
});
