import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  Search,
  Eye,
  Download,
  Pencil,
  Trash2,
  FolderInput,
  Send,
  Archive,
  History,
  Copy,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, fmtSize, statusClass, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/documentos")({
  validateSearch: (s: Record<string, unknown>) =>
    ({ doc: (s["doc"] as string) ?? undefined }) as { doc?: string },
  component: Documents,
});

const ALLOWED = [
  "pdf", "docx", "doc", "xlsx", "xls", "csv", "txt", "rtf", "odt", "ods",
  "pptx", "ppt", "png", "jpg", "jpeg", "webp", "gif", "heic", "tiff", "zip",
] as const;
const ACCEPT = ALLOWED.map((e) => `.${e}`).join(",");
const MAX = 2 * 1024 * 1024 * 1024; // 2 GB por arquivo
const MAX_LABEL = "2 GB";
const HASH_LIMIT = 200 * 1024 * 1024; // acima disso, hash por amostragem de blocos

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256File(file: File) {
  if (file.size <= HASH_LIMIT) {
    return toHex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
  }
  // Arquivos muito grandes: hash determinístico de blocos (início/meio/fim) + tamanho
  const chunk = 8 * 1024 * 1024;
  const parts: ArrayBuffer[] = [
    await file.slice(0, chunk).arrayBuffer(),
    await file.slice(Math.floor(file.size / 2), Math.floor(file.size / 2) + chunk).arrayBuffer(),
    await file.slice(Math.max(0, file.size - chunk)).arrayBuffer(),
    new TextEncoder().encode(`${file.size}`).buffer as ArrayBuffer,
  ];
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    merged.set(new Uint8Array(p), off);
    off += p.byteLength;
  }
  return toHex(await crypto.subtle.digest("SHA-256", merged.buffer));
}

function Documents() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [folderId, setFolderId] = useState("none");
  const [sort, setSort] = useState("recent");
  const [active, setActive] = useState<string | undefined>(search.doc);
  const [auditFor, setAuditFor] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const [docs, companies, folders] = await Promise.all([
        supabase.from("documents").select("*").order("created_at", { ascending: false }),
        supabase.from("companies").select("id, razao_social, nome_fantasia"),
        supabase.from("folders").select("id, name, company_id"),
      ]);
      return { docs: docs.data ?? [], companies: companies.data ?? [], folders: folders.data ?? [] };
    },
  });

  const { data: audit } = useQuery({
    queryKey: ["audit", auditFor],
    enabled: !!auditFor,
    queryFn: async () =>
      (
        await supabase
          .from("audit_events")
          .select("*")
          .eq("document_id", auditFor!)
          .order("created_at")
      ).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["documents"] });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    for (const file of Array.from(files)) {
      if (file.size > MAX) {
        toast.error(`${file.name}: limite de ${MAX_LABEL} excedido`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(ALLOWED as readonly string[]).includes(ext)) {
        toast.error(`${file.name}: tipo não permitido`);
        continue;
      }
      const hash = await sha256File(file);
      let pages = 1;
      if (ext === "pdf" && file.size <= HASH_LIMIT) {
        try {
          pages = (
            await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
          ).getPageCount();
        } catch {
          pages = 1;
        }
      }
      const id = crypto.randomUUID();
      const path = `${u.user.id}/${id}/original-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (up.error) {
        toast.error(up.error.message);
        continue;
      }
      const { error } = await supabase.from("documents").insert({
        id,
        owner_id: u.user.id,
        name: file.name,
        company_id: companyId !== "all" ? companyId : null,
        folder_id: folderId !== "none" ? folderId : null,
        storage_path: path,
        mime_type: file.type || `application/${ext}`,
        size_bytes: file.size,
        hash,
        page_count: pages,
        status: "draft",
      });
      if (error) toast.error(error.message);
      else toast.success(`${file.name} enviado`);
    }
    refresh();
  };

  const openFile = async (path: string | null, download = false) => {
    if (!path) { toast.error("Arquivo indisponível"); return; }
    const { data: signed } = await supabase.storage.from("documents").createSignedUrl(path, 300, {
      download,
    });
    if (signed?.signedUrl) window.open(signed.signedUrl, "_blank");
  };

  const sendToSignature = async (docId: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const existing = await supabase
      .from("signing_requests")
      .select("id, status")
      .eq("document_id", docId)
      .in("status", ["draft", "sent", "partially_signed"])
      .maybeSingle();
    let requestId = existing.data?.id;
    if (!requestId) {
      const { data, error } = await supabase
        .from("signing_requests")
        .insert({ document_id: docId, owner_id: u.user.id, mode: "sequential", status: "draft" })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      requestId = data.id;
    }
    navigate({ to: "/app/preparar/$requestId", params: { requestId } });
  };

  const docs = (data?.docs ?? [])
    .filter((d) => (status === "all" ? true : d.status === status))
    .filter((d) => (companyId === "all" ? true : d.company_id === companyId))
    .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const folders = (data?.folders ?? []).filter((f) =>
    companyId === "all" ? true : f.company_id === companyId,
  );

  return (
    <AppShell title="Documentos">
      <div className="card-soft mb-3 space-y-2 p-3">
        <div className="flex gap-2">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {(data?.companies ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_fantasia || c.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Pasta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem pasta</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        <Button className="w-full" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 size-4" /> Enviar arquivos (PDF, Office, imagens, ZIP)
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Até {MAX_LABEL} por arquivo, envios múltiplos. Cada upload gera hash SHA-256 e trilha de
          auditoria.
        </p>
      </div>

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "draft", "sent", "signing", "signed", "archived", "cancelled", "expired"].map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "Todos" : STATUS_LABEL[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recentes</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="card-soft p-3">
            <button
              className="flex w-full items-center gap-3 text-left"
              onClick={() => setActive(active === d.id ? undefined : d.id)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-4 text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{d.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {fmtSize(d.size_bytes)} • {d.page_count ?? 1} pág. • {fmtDateTime(d.created_at)}
                </span>
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(d.status)}`}>
                {STATUS_LABEL[d.status] ?? d.status}
              </span>
            </button>

            {active === d.id && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                <Act icon={Eye} label="Ver" onClick={() => openFile(d.signed_storage_path ?? d.storage_path)} />
                <Act
                  icon={Download}
                  label="Baixar"
                  onClick={() => openFile(d.signed_storage_path ?? d.storage_path, true)}
                />
                <Act
                  icon={Send}
                  label="Assinar"
                  onClick={() => sendToSignature(d.id)}
                />
                <Act
                  icon={Pencil}
                  label="Renomear"
                  onClick={async () => {
                    const name = window.prompt("Novo nome", d.name);
                    if (!name) return;
                    await supabase.from("documents").update({ name }).eq("id", d.id);
                    refresh();
                  }}
                />
                <Act
                  icon={FolderInput}
                  label="Mover"
                  onClick={async () => {
                    if (folderId === "none") { toast.error("Selecione uma pasta no topo"); return; }
                    await supabase.from("documents").update({ folder_id: folderId }).eq("id", d.id);
                    toast.success("Documento movido");
                    refresh();
                  }}
                />
                <Act
                  icon={Archive}
                  label="Arquivar"
                  onClick={async () => {
                    await supabase.from("documents").update({ status: "archived" }).eq("id", d.id);
                    refresh();
                  }}
                />
                <Act
                  icon={Copy}
                  label="Copiar link"
                  onClick={async () => {
                    const path = d.signed_storage_path ?? d.storage_path;
                    if (!path) return;
                    const { data: s } = await supabase.storage
                      .from("documents")
                      .createSignedUrl(path, 3600);
                    if (s?.signedUrl) {
                      await navigator.clipboard.writeText(s.signedUrl);
                      toast.success("Link temporário copiado");
                    }
                  }}
                />
                <Act
                  icon={Mail}
                  label="Enviar cópia"
                  onClick={() => {
                    window.location.href = `mailto:?subject=${encodeURIComponent(d.name)}&body=${encodeURIComponent(
                      "Documento disponível no DocFlow.",
                    )}`;
                  }}
                />
                <Act icon={History} label="Histórico" onClick={() => setAuditFor(d.id)} />
                <Act
                  icon={Trash2}
                  label="Excluir"
                  onClick={async () => {
                    if (!window.confirm("Excluir definitivamente?")) return;
                    if (d.storage_path) await supabase.storage.from("documents").remove([d.storage_path]);
                    await supabase.from("documents").delete().eq("id", d.id);
                    toast.success("Documento excluído");
                    refresh();
                  }}
                />
              </div>
            )}
          </div>
        ))}
        {docs.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</p>
        )}
      </div>

      <Dialog open={!!auditFor} onOpenChange={(o) => !o && setAuditFor(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-primary" /> Trilha de auditoria
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(audit ?? []).map((e) => (
              <div key={e.id} className="border-l-2 border-primary/40 pl-3">
                <p className="text-xs font-semibold">{e.action}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fmtDateTime(e.created_at)} • {e.actor ?? "sistema"} • IP {e.ip ?? "—"}
                </p>
              </div>
            ))}
            {(audit ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Sem eventos registrados.</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Registros imutáveis: a trilha não pode ser editada manualmente.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Label className="sr-only">Documentos</Label>
    </AppShell>
  );
}

function Act({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2 py-2.5 text-[10px] font-medium hover:bg-secondary"
    >
      <Icon className="size-4 text-primary" />
      {label}
    </button>
  );
}
