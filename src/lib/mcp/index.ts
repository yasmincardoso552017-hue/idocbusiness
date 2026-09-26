import { auth, defineMcp } from "@lovable.dev/mcp-js";

import searchDocumentsTool from "./tools/search-documents";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "signflow-documents",
  title: "SignFlow Documents",
  version: "0.1.0",
  instructions:
    "Ferramentas protegidas do IDOC BUSINESS. Use search_documents para localizar documentos da conta autenticada.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchDocumentsTool],
});
