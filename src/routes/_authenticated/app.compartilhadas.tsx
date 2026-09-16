import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Copy, Download, Folder, KeyRound, Loader2, LogOut, Upload, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useDialogs } from "@/components/Dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, fmtSize } from "@/lib/format";
import { folderFileUrl } from "@/lib/vault.functions";

export const Route = createFileRoute("/_authenticated/app/compartilhadas")({
  head: () => ({
    meta: [
      { title: "Pastas compartilhadas por SKU | IDOC BUSINESS" },
      {
        name: "description",
        content:
          "Ative o SKU de uma pasta e trabalhe em conjunto: veja, envie e baixe documentos em tempo real no IDOC BUSINESS.",
      },
      { property: "og:title", content: "Pastas compartilhadas por SKU | IDOC BUSINESS" },
      {
        property: "og:description",
        content: "Colabore em pastas de outras contas usando o SKU único de cada pasta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharedFolders,
});

type Share = {
  id: string;
  folder_id: string;
  owner_id: string;
  member_id: string;
  member_email: string | null;
  sku: string;
  can_edit: boolean;
  created_at: string;
  folders: { id: string; name: string; company_id: string } | null;
};

type Doc = {
  id: string;
  name: string;
  folder_id: string | null;
  size_bytes: number | null;
  created_at: string;
};
type SharedFolder = { id: string; name: string; parent_id: string | null; company_id: string };

function SharedFolders() {
  const { confirm, dialog } = useDialogs();
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadTarget = useRef<{ share: Share; folderId: string } | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["folder-shares"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const me = u.user?.id ?? "";
      const [mine, granted, visibleFolders, visibleDocs] = await Promise.all([
        supabase
          .from("folder_shares")
          .select("*, folders(id, name, company_id)")
          .eq("member_id", me)
          .is("revoked_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("folder_shares")
          .select("*, folders(id, name, company_id)")
          .eq("owner_id", me)
          .is("revoked_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("folders").select("id, name, parent_id, company_id").order("name"),
        supabase
          .from("documents")
          .select("id, name, folder_id, size_bytes, created_at")
          .order("created_at", { ascending: false }),
      ]);
      const shares = (mine.data ?? []) as unknown as Share[];
      return {
        me,
        shares,
        granted: (granted.data ?? []) as unknown as Share[],
        folders: (visibleFolders.data ?? []) as SharedFolder[],
        docs: (visibleDocs.data ?? []) as Doc[],
      };
    },
  });

  const shares = data?.shares ?? [];
  const granted = data?.granted ?? [];
  const docs = data?.docs ?? [];
  const folders = data?.folders ?? [];

  /** Ativa o SKU recebido e passa a ver a pasta do outro usuário. */
  const activate = async () => {
    if (!sku.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("redeem_folder_sku", { _sku: sku.trim() });
    setBusy(false);
    if (error) toast.error(error.message.replace(/^.*?:\s*/, ""));
    else {
      toast.success("Pasta liberada — você já pode trabalhar nela");
      setSku("");
      refetch();
    }
  };

  const revoke = async (s: Share, mine: boolean) => {
    const ok = await confirm({
      title: mine ? "Sair desta pasta?" : `Remover o acesso de ${s.member_email ?? "usuário"}?`,
      description: mine ? "Você perde o acesso imediatamente." : "O usuário perde o acesso na hora.",
      confirmText: mine ? "Sair" : "Remover",
    });
    if (!ok) return;
    const { error } = await supabase.from("folder_shares").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    else toast.success("Acesso removido");
    refetch();
  };

  const download = async (docId: string) => {
    try {
      const res = await folderFileUrl({ data: { documentId: docId } });
      if (!res.url) throw new Error("Arquivo indisponível");
      window.open(res.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao baixar");
    }
  };

  const pickUpload = (s: Share, folderId = s.folder_id) => {
    uploadTarget.current = { share: s, folderId };
    fileRef.current?.click();
  };

  /** Envia um arquivo para dentro da pasta compartilhada. */
  const doUpload = async (files: FileList | null) => {
    const target = uploadTarget.current;
    const file = files?.[0];
    if (!target || !file) return;
    const { share: s, folderId } = target;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sessão expirada — entre novamente");
      const path = `${uid}/compartilhado/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const up = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (up.error) throw new Error(up.error.message);
      const { error } = await supabase.from("documents").insert({
        name: file.name,
        owner_id: s.owner_id,
        company_id: s.folders?.company_id ?? null,
        folder_id: folderId,
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        status: "draft",
      });
      if (error) {
        await supabase.storage.from("documents").remove([path]);
        throw new Error(error.message);
      }
      toast.success("Documento enviado para a pasta");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AppShell title="Pastas compartilhadas">
      {dialog}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          void doUpload(e.target.files);
        }}
      />

      <div className="card-soft space-y-3 p-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Ativar SKU de pasta</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Recebeu um SKU? Cole abaixo e ative para acessar e trabalhar dentro da pasta em tempo real.
        </p>
        <div className="flex gap-2">
          <Input
            value={sku}
            placeholder="IDOC-XXXX-XXXX"
            onChange={(e) => setSku(e.target.value.toUpperCase())}
          />
          <Button onClick={activate} disabled={busy || !sku.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Ativar"}
          </Button>
        </div>
      </div>

      <section className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold">Pastas liberadas para mim ({shares.length})</h2>
        {!shares.length && (
          <p className="card-soft p-4 text-xs text-muted-foreground">
            Nenhuma pasta compartilhada com você ainda.
          </p>
        )}
        {shares.map((s) => {
          const descendantIds = new Set<string>([s.folder_id]);
          let added = true;
          while (added) {
            added = false;
            for (const folder of folders) {
              if (folder.parent_id && descendantIds.has(folder.parent_id) && !descendantIds.has(folder.id)) {
                descendantIds.add(folder.id);
                added = true;
              }
            }
          }
          const visible = folders.filter((folder) => descendantIds.has(folder.id));
          const files = docs.filter((d) => d.folder_id && descendantIds.has(d.folder_id));
          const isOpen = open === s.id;
          return (
            <div key={s.id} className="card-soft p-3">
              <div className="flex items-center gap-2">
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => setOpen(isOpen ? null : s.id)}
                >
                  <Folder className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">
                      {s.folders?.name ?? "Pasta"}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      SKU {s.sku} • {files.length} arquivo(s) •{" "}
                      {s.can_edit ? "pode enviar arquivos" : "somente leitura"}
                    </span>
                  </span>
                </button>
                {s.can_edit && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => pickUpload(s)}>
                    <Upload className="mr-1 size-4" /> Enviar
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(s, true)}>
                  <LogOut className="size-4" />
                </Button>
              </div>
              {isOpen && (
                <div className="mt-2 space-y-1 border-t border-border pt-2">
                  {!files.length && <p className="text-[11px] text-muted-foreground">Pasta vazia.</p>}
                   {visible.map((folder) => {
                     const folderFiles = files.filter((d) => d.folder_id === folder.id);
                     if (folder.id !== s.folder_id && !folderFiles.length) return null;
                     return (
                       <div key={folder.id} className="space-y-1">
                         <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
                           <Folder className="size-4 shrink-0 text-primary" />
                           <span className="min-w-0 flex-1 truncate text-xs font-semibold">{folder.name}</span>
                           {s.can_edit && (
                             <Button size="sm" variant="ghost" aria-label={`Enviar para ${folder.name}`} onClick={() => pickUpload(s, folder.id)}>
                               <Upload className="size-4" />
                             </Button>
                           )}
                         </div>
                         {folderFiles.map((d) => (
                           <div key={d.id} className="ml-4 flex items-center gap-2 rounded-md bg-muted/30 p-2">
                             <span className="min-w-0 flex-1">
                               <span className="block truncate text-xs">{d.name}</span>
                               <span className="block text-[10px] text-muted-foreground">{fmtSize(d.size_bytes)} • {fmtDateTime(d.created_at)}</span>
                             </span>
                             <Button size="sm" variant="ghost" aria-label={`Baixar ${d.name}`} onClick={() => download(d.id)}>
                               <Download className="size-4" />
                             </Button>
                           </div>
                         ))}
                       </div>
                     );
                   })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="mt-5 space-y-2">
        <h2 className="text-sm font-semibold">SKUs que eu compartilhei ({granted.length})</h2>
        {!granted.length && (
          <p className="card-soft p-4 text-xs text-muted-foreground">
            Abra uma pasta de empresa e use “Copiar SKU” para convidar alguém.
          </p>
        )}
        {granted.map((s) => (
          <div key={s.id} className="card-soft flex items-center gap-2 p-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{s.folders?.name ?? "Pasta"}</span>
              <span className="block text-[10px] text-muted-foreground">
                {s.member_email ?? s.member_id} • SKU {s.sku} • desde {fmtDateTime(s.created_at)}
              </span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(s.sku);
                toast.success("SKU copiado");
              }}
            >
              <Copy className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(s, false)}>
              <UserMinus className="size-4" />
            </Button>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
