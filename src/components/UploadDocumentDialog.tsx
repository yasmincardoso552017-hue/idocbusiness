import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type FolderRec = { id: string; name: string; parent_id: string | null; company_id: string };

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Envia um documento escolhendo empresa, pasta/subpasta e nome do arquivo. */
export function UploadDocumentDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  defaultFolderId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCompanyId?: string | undefined;
  defaultFolderId?: string | null | undefined;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [folderId, setFolderId] = useState<string>(defaultFolderId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["upload-dialog-targets"],
    enabled: open,
    queryFn: async () => {
      const [companies, folders] = await Promise.all([
        supabase.from("companies").select("id, razao_social, nome_fantasia").order("razao_social"),
        supabase.from("folders").select("id, name, parent_id, company_id").order("name"),
      ]);
      return {
        companies: companies.data ?? [],
        folders: (folders.data ?? []) as FolderRec[],
      };
    },
  });

  useEffect(() => {
    if (!open) return;
    setCompanyId(defaultCompanyId ?? "");
    setFolderId(defaultFolderId ?? "");
    setFile(null);
    setName("");
  }, [open, defaultCompanyId, defaultFolderId]);

  useEffect(() => {
    const list = data?.companies ?? [];
    if (!companyId && list.length === 1) setCompanyId(list[0]!.id);
  }, [data, companyId]);

  /** Opções de pasta em árvore (com indentação) da empresa selecionada. */
  const folderOptions = useMemo(() => {
    const all = (data?.folders ?? []).filter((f) => f.company_id === companyId);
    const out: { id: string; label: string }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const f of all.filter((x) => (x.parent_id ?? null) === parent)) {
        out.push({ id: f.id, label: `${"— ".repeat(depth)}${f.name}` });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [data, companyId]);

  const submit = async () => {
    if (!companyId) {
      toast.error("Selecione a empresa");
      return;
    }
    if (!file) {
      toast.error("Selecione o documento");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada — entre novamente");
      const target = folderId || null;
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      let finalName = (name.trim() || file.name).trim();
      if (ext && !finalName.toLowerCase().endsWith(ext.toLowerCase())) finalName += ext;
      const id = crypto.randomUUID();
      const path = `${u.user.id}/${id}/original-${finalName.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (up.error) throw up.error;
      let pageCount: number | null = null;
      if ((file.type || "").includes("pdf") || finalName.toLowerCase().endsWith(".pdf")) {
        try {
          const { PDFDocument } = await import("pdf-lib");
          const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
          pageCount = pdf.getPageCount();
        } catch {
          pageCount = null;
        }
      }
      const { error } = await supabase.from("documents").insert({
        id,
        owner_id: u.user.id,
        name: finalName,
        company_id: companyId,
        folder_id: target,
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        page_count: pageCount,
        hash: file.size <= 200 * 1024 * 1024 ? await sha256(file) : null,
        status: "draft",
      });
      if (error) throw error;

      toast.success("Documento enviado para a pasta escolhida");
      await qc.invalidateQueries({ queryKey: ["company", companyId] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      onOpenChange(false);
      navigate({ to: "/app/empresas/$companyId", params: { companyId }, search: { folder: target ?? "" } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Enviar documento</DialogTitle>
          <DialogDescription className="text-xs">
            Escolha a empresa, a pasta ou subpasta, dê um nome e envie o arquivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Empresa</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setFolderId("");
              }}
            >
              <option value="">Selecione…</option>
              {(data?.companies ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nome_fantasia || k.razao_social}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Pasta / subpasta</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              disabled={!companyId}
            >
              <option value="">Raiz da empresa</option>
              {folderOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Arquivo</Label>
            <Input
              ref={fileRef}
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !name.trim()) setName(f.name);
              }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nome do documento</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contrato de prestação" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !companyId || !file}>
            {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
