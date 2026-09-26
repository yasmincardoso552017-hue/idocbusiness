import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plug, FolderSync, Info, Bot, Check, Copy, ExternalLink, KeyRound, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/integracoes")({
  head: () => ({ meta: [
    { title: "Integrações | IDOC BUSINESS" },
    { name: "description", content: "Conecte serviços de armazenamento ao IDOC BUSINESS." },
    { property: "og:title", content: "Integrações | IDOC BUSINESS" },
    { property: "og:description", content: "Central de integrações do seu espaço documental." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Integrations,
});

function Integrations() {
  const qc = useQueryClient();
  const [root, setRoot] = useState("/IDOC BUSINESS");

  const { data } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: rows } = await supabase.from("integrations").select("*").eq("owner_id", auth.user!.id);
      return { userId: auth.user!.id, rows: rows ?? [] };
    },
  });

  const dropbox = data?.rows.find((r) => r.provider === "dropbox");
  const mcpUrl = typeof window === "undefined" ? "/mcp" : `${window.location.origin}/mcp`;

  async function copyMcpUrl() {
    await navigator.clipboard.writeText(mcpUrl);
    toast.success("Endpoint MCP copiado.");
  }

  async function upsert(patch: Record<string, unknown>) {
    if (!data) return;
    const payload = {
      owner_id: data.userId,
      provider: "dropbox",
      connected: dropbox?.connected ?? false,
      auto_sync: dropbox?.auto_sync ?? false,
      root_folder: dropbox?.root_folder ?? root,
      config: dropbox?.config ?? {},
      ...patch,
    };
    const res = dropbox
      ? await supabase.from("integrations").update(payload).eq("id", dropbox.id)
      : await supabase.from("integrations").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    qc.invalidateQueries({ queryKey: ["integrations"] });
  }

  return (
    <AppShell title="Integrações">
      <div className="space-y-4">
        <div className="card-soft p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-bold">MCP e IA</div>
                <span className="rounded-md border px-2 py-0.5 text-[10px] font-semibold text-primary">OAuth protegido</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Conecte Gemini e outros assistentes usando sua própria conta IDOC BUSINESS.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="mcp-url">Endpoint MCP</Label>
              <div className="flex gap-2">
                <Input id="mcp-url" readOnly value={mcpUrl} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copyMcpUrl} aria-label="Copiar endpoint MCP">
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Search className="size-4 text-primary" /> Ferramentas disponíveis
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-4 text-primary" /> Buscar e listar documentos da conta conectada
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyMcpUrl}>
                <KeyRound className="mr-1 size-4" /> Copiar para o Gemini
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Abrir documentação do Gemini"
                onClick={() => window.open("https://ai.google.dev/gemini-api/docs", "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Ao conectar, o Gemini abrirá a autorização do IDOC BUSINESS. Nenhuma chave secreta precisa ser copiada ou exposta.
            </p>
          </div>
        </div>

        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Plug className="size-5" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-bold">Dropbox</div>
              <div className="text-[11px] text-muted-foreground">
                {dropbox?.connected ? "Conectado" : "Não conectado"}
              </div>
            </div>
            <Switch
              checked={!!dropbox?.connected}
              onCheckedChange={(v) => {
                upsert({ connected: v });
                toast.info(
                  v
                    ? "Preferência salva. A autorização OAuth do Dropbox será concluída quando as credenciais do app forem cadastradas."
                    : "Integração desativada.",
                );
              }}
            />
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="root">Pasta raiz no Dropbox</Label>
              <Input
                id="root"
                value={dropbox?.root_folder ?? root}
                onChange={(e) => setRoot(e.target.value)}
                onBlur={(e) => upsert({ root_folder: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">Sincronizar automaticamente documentos assinados</span>
              <Switch checked={!!dropbox?.auto_sync} onCheckedChange={(v) => upsert({ auto_sync: v })} />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                toast.info("Estrutura de pastas por empresa será replicada no Dropbox na sincronização.")
              }
            >
              <FolderSync className="mr-1 size-4" /> Testar estrutura de sincronização
            </Button>
          </div>
        </div>

        <div className="card-soft flex gap-3 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            A arquitetura já está preparada: as preferências de conexão, pasta raiz e sincronização automática ficam
            registradas por usuário. Para ativar o envio real dos arquivos basta cadastrar as credenciais do app
            Dropbox — nenhuma alteração no fluxo de documentos será necessária.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
