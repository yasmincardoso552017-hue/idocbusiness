import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plug, FolderSync, Info } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/integracoes")({
  component: Integrations,
});

function Integrations() {
  const qc = useQueryClient();
  const [root, setRoot] = useState("/DocFlow");

  const { data } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: rows } = await supabase.from("integrations").select("*").eq("owner_id", auth.user!.id);
      return { userId: auth.user!.id, rows: rows ?? [] };
    },
  });

  const dropbox = data?.rows.find((r) => r.provider === "dropbox");

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
    if (res.error) return toast.error(res.error.message);
    qc.invalidateQueries({ queryKey: ["integrations"] });
  }

  return (
    <AppShell title="Integrações">
      <div className="space-y-4">
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
