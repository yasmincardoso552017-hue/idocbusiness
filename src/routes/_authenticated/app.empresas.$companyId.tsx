import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  FolderPlus,
  FileText,
  Folder,
  Upload,
  Pencil,
  Trash2,
  Eye,
  Download,
  Send,
  Wrench,
  FolderInput,
  FolderArchive,
  Link2,
  ChevronLeft,
  Loader2,
  Building2,
  BellRing,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useDialogs } from "@/components/Dialogs";
import { UploadDocumentDialog } from "@/components/UploadDocumentDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContractEnvelopeDialog, StageBadge } from "@/components/ContractEnvelope";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, fmtSize, statusClass, STATUS_LABEL } from "@/lib/format";
import { shareFolder } from "@/lib/vault.functions";

export const Route = createFileRoute("/_authenticated/app/empresas/$companyId")({
  validateSearch: (s: Record<string, unknown>) => ({ folder: typeof s['folder'] === "string" ? s['folder'] : "" }),
  component: CompanyDetail,
});

type Doc = {
  id: string;
  name: string;
  status: string;
  folder_id: string | null;
  storage_path: string | null;
  signed_storage_path: string | null;
  size_bytes: number | null;
  page_count: number | null;
  created_at: string;
};
type FolderRec = { id: string; name: string; parent_id: string | null; public_token: string | null };

const EDIT_FIELDS: Array<[string, string]> = [
  ["razao_social", "Razão social / Nome"],
  ["nome_fantasia", "Nome fantasia"],
  ["cnpj", "CNPJ"],
  ["cpf", "CPF"],
  ["inscricao_estadual", "Inscrição estadual"],
  ["endereco", "Endereço"],
  ["cidade", "Cidade"],
  ["estado", "Estado"],
  ["cep", "CEP"],
  ["telefone", "Telefone"],
  ["email", "E-mail"],
  ["contato", "Pessoa de contato"],
];

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);

  const search = Route.useSearch();
  const [cwd, setCwd] = useState<string | null>(search.folder || null);
  const [uploadOpen, setUploadOpen] = useState(false);
  useEffect(() => {
    if (search.folder) setCwd(search.folder);
  }, [search.folder]);
  const { confirm, promptText, dialog } = useDialogs();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [actionDoc, setActionDoc] = useState<Doc | null>(null);
  const [envelopeFor, setEnvelopeFor] = useState<{ id: string; name: string; documentId: string | null } | null>(
    null,
  );

  const { data, refetch } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const [company, docs, contracts, folders, events] = await Promise.all([
        supabase.from("companies").select("*").eq("id", companyId).single(),
        supabase
          .from("documents")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),
        supabase.from("contracts").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
        supabase.from("folders").select("*").eq("company_id", companyId).order("name"),
        supabase.from("audit_events").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      return {
        company: company.data,
        docs: (docs.data ?? []) as Doc[],
        contracts: contracts.data ?? [],
        folders: (folders.data ?? []) as FolderRec[],
        events: events.data ?? [],
      };
    },
  });

  const c = data?.company;
  const docs = data?.docs ?? [];
  const folders = data?.folders ?? [];
  const docIds = new Set(docs.map((d) => d.id));
  const refresh = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const current = cwd ? folders.find((f) => f.id === cwd) ?? null : null;
  const children = folders.filter((f) => (f.parent_id ?? null) === cwd);
  const filesHere = docs.filter((d) => (d.folder_id ?? null) === cwd);

  const path: FolderRec[] = [];
  let walk = current;
  while (walk) {
    path.unshift(walk);
    walk = walk.parent_id ? folders.find((f) => f.id === walk!.parent_id) ?? null : null;
  }

  /** Cria pasta ou subpasta dentro da pasta aberta. */
  const addFolder = async () => {
    const name = await promptText({ title: cwd ? "Nome da subpasta" : "Nome da pasta" });
    if (!name?.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("folders").insert({
      name: name.trim(),
      company_id: companyId,
      parent_id: cwd,
      owner_id: u.user!.id,
    });
    if (error) toast.error(error.message);
    else toast.success("Pasta criada");
    refresh();
  };

  const renameFolder = async (f: FolderRec) => {
    const name = await promptText({ title: "Renomear pasta", defaultValue: f.name });
    if (!name?.trim()) return;
    await supabase.from("folders").update({ name: name.trim() }).eq("id", f.id);
    refresh();
  };

  /** Exclui a pasta com confirmação; subpastas e arquivos voltam para a raiz. */
  const deleteFolder = async (f: FolderRec) => {
    const inside = docs.filter((d) => d.folder_id === f.id).length;
    const ok = await confirm({
      title: `Excluir a pasta "${f.name}"?`,
      description: inside ? `${inside} arquivo(s) voltarão para a raiz da empresa.` : undefined,
      confirmText: "Excluir",
    });
    if (!ok) return;
    await supabase.from("documents").update({ folder_id: null }).eq("folder_id", f.id);
    await supabase.from("folders").update({ parent_id: f.parent_id }).eq("parent_id", f.id);
    const { error } = await supabase.from("folders").delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else toast.success("Pasta excluída");
    if (cwd === f.id) setCwd(f.parent_id);
    refresh();
  };

  const togglePublic = async (f: FolderRec) => {
    try {
      const res = await shareFolder({ data: { folderId: f.id, enabled: !f.public_token } });
      if (res.token) {
        const link = `${window.location.origin}/pasta/${res.token}`;
        await navigator.clipboard?.writeText(link).catch(() => null);
        toast.success("Link público copiado");
      } else toast.success("Link público desativado");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  /** Baixa a pasta (com subpastas) em ZIP organizado. */
  const zipFolder = async (rootId: string | null) => {
    setBusy(true);
    try {
      const rootName = rootId ? folders.find((f) => f.id === rootId)?.name ?? "pasta" : c?.razao_social ?? "empresa";
      const ids: (string | null)[] = [rootId];
      const paths = new Map<string | null, string>([[rootId, rootName]]);
      let frontier: (string | null)[] = [rootId];
      while (frontier.length) {
        const next: string[] = [];
        for (const f of folders) {
          if (frontier.includes(f.parent_id ?? null) && !ids.includes(f.id)) {
            ids.push(f.id);
            next.push(f.id);
            paths.set(f.id, `${paths.get(f.parent_id ?? null)}/${f.name}`);
          }
        }
        frontier = next;
      }
      const items = docs.filter((d) => ids.includes(d.folder_id ?? null));
      if (!items.length) throw new Error("Nenhum arquivo nesta pasta");
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const d of items) {
        const p = d.signed_storage_path ?? d.storage_path;
        if (!p) continue;
        const { data: signed } = await supabase.storage.from("documents").createSignedUrl(p, 600);
        if (!signed?.signedUrl) continue;
        const buf = await (await fetch(signed.signedUrl)).arrayBuffer();
        zip.folder(paths.get(d.folder_id ?? null) ?? rootName)!.file(d.name, buf);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rootName}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`${items.length} arquivo(s) no ZIP`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Envia arquivos direto para a pasta escolhida (a aberta por padrão). */
  const upload = async (input: FileList | File[] | null, targetFolder: string | null = uploadTarget.current) => {
    // A lista precisa ser copiada de forma síncrona: limpar o input zera o FileList original.
    const files = input ? Array.from(input) : [];
    if (!files.length) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      toast.error("Sessão expirada — entre novamente");
      return;
    }
    let ok = 0;
    for (const file of files) {
      try {
        const id = crypto.randomUUID();
        const p = `${u.user.id}/${id}/original-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const up = await supabase.storage.from("documents").upload(p, file, { upsert: true });
        if (up.error) throw up.error;
        const { error } = await supabase.from("documents").insert({
          id,
          owner_id: u.user.id,
          name: file.name,
          company_id: companyId,
          folder_id: targetFolder,
          storage_path: p,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          hash: file.size <= 200 * 1024 * 1024 ? await sha256(file) : null,
          status: "draft",
        });
        if (error) throw error;
        ok += 1;
      } catch (e) {
        toast.error(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    if (ok) {
      const folderName = targetFolder ? folders.find((f) => f.id === targetFolder)?.name ?? "pasta" : "raiz";
      toast.success(`${ok} arquivo(s) em ${folderName}`);
      if (targetFolder !== cwd) setCwd(targetFolder);
    }
    await refetch();
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  /** Abre o seletor de arquivos apontando para uma pasta específica. */
  const pickFiles = (targetFolder: string | null) => {
    uploadTarget.current = targetFolder;
    fileRef.current?.click();
  };

  const openFile = async (d: Doc, download = false) => {
    const p = d.signed_storage_path ?? d.storage_path;
    if (!p) { toast.error("Arquivo indisponível"); return; }
    const { data: s } = await supabase.storage.from("documents").createSignedUrl(p, 300, { download });
    if (s?.signedUrl) window.open(s.signedUrl, "_blank");
  };

  const sendToSignature = async (docId: string) => {
    const { data: u } = await supabase.auth.getUser();
    const existing = await supabase
      .from("signing_requests")
      .select("id")
      .eq("document_id", docId)
      .in("status", ["draft", "sent", "partially_signed"])
      .maybeSingle();
    let requestId = existing.data?.id;
    if (!requestId) {
      const { data: r, error } = await supabase
        .from("signing_requests")
        .insert({ document_id: docId, owner_id: u.user!.id, mode: "sequential", status: "draft" })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      requestId = r.id;
    }
    navigate({ to: "/app/preparar/$requestId", params: { requestId } });
  };

  const deleteDoc = async (d: Doc) => {
    const ok = await confirm({
      title: `Excluir "${d.name}"?`,
      description: "Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
    });
    if (!ok) return;
    const paths = [d.storage_path, d.signed_storage_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("documents").remove(paths);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) toast.error(error.message);
    else toast.success("Documento excluído");
    setActionDoc(null);
    refresh();
  };

  const moveDoc = async (d: Doc, target: string) => {
    await supabase
      .from("documents")
      .update({ folder_id: target === "root" ? null : target })
      .eq("id", d.id);
    toast.success("Documento movido");
    setActionDoc(null);
    refresh();
  };

  /** Exclui a empresa com dupla confirmação, removendo pastas, contratos e arquivos. */
  const deleteCompany = async () => {
    const label = c?.nome_fantasia || c?.razao_social || "empresa";
    const ok = await confirm({
      title: `Excluir a empresa "${label}"?`,
      description: `Serão removidos ${docs.length} documento(s), ${folders.length} pasta(s) e ${
        data?.contracts.length ?? 0
      } contrato(s). Digite EXCLUIR para confirmar.`,
      confirmText: "Excluir",
      requireText: "EXCLUIR",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const paths = docs
        .flatMap((d) => [d.storage_path, d.signed_storage_path])
        .filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from("documents").remove(paths);
      await supabase.from("contracts").delete().eq("company_id", companyId);
      await supabase.from("documents").delete().eq("company_id", companyId);
      await supabase.from("folders").delete().eq("company_id", companyId);
      const { error } = await supabase.from("companies").delete().eq("id", companyId);
      if (error) throw error;
      toast.success("Empresa excluída");
      qc.invalidateQueries({ queryKey: ["companies"] });
      navigate({ to: "/app/empresas" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveCompany = async () => {
    const { error } = await supabase.from("companies").update(form as never).eq("id", companyId);
    if (error) { toast.error(error.message); return; }
    toast.success("Empresa atualizada");
    setEditOpen(false);
    refresh();
  };

  const createContract = async () => {
    const name = await promptText({ title: "Nome do contrato" });
    if (!name?.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("contracts").insert({
      owner_id: u.user!.id,
      company_id: companyId,
      name: name.trim(),
      status: "draft",
      stage: "draft",
    });
    if (error) toast.error(error.message);
    else toast.success("Contrato criado");
    refresh();
  };

  return (
    <AppShell title={c?.nome_fantasia || c?.razao_social || "Empresa"}>
      <div className="card-soft mb-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold">{c?.razao_social}</h2>
            <p className="text-[11px] text-muted-foreground">
              {c?.tipo === "fisica" ? "Pessoa física" : "Pessoa jurídica"} •{" "}
              {c?.tipo === "fisica" ? c?.cpf || "sem CPF" : c?.cnpj || "sem CNPJ"}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <span>
            {c?.cidade || "—"}/{c?.estado || "—"}
          </span>
          <span>CEP: {c?.cep || "—"}</span>
          <span>Tel: {c?.telefone || "—"}</span>
          <span className="truncate">E-mail: {c?.email || "—"}</span>
          <span>Contato: {c?.contato || "—"}</span>
          <span>Documentos: {docs.length}</span>
        </div>
        {c?.observacoes && <p className="mt-2 text-xs">{c.observacoes}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setForm({
                razao_social: c?.razao_social ?? "",
                nome_fantasia: c?.nome_fantasia ?? "",
                cnpj: c?.cnpj ?? "",
                cpf: c?.cpf ?? "",
                inscricao_estadual: c?.inscricao_estadual ?? "",
                endereco: c?.endereco ?? "",
                cidade: c?.cidade ?? "",
                estado: c?.estado ?? "",
                cep: c?.cep ?? "",
                telefone: c?.telefone ?? "",
                email: c?.email ?? "",
                contato: c?.contato ?? "",
                observacoes: c?.observacoes ?? "",
                tipo: c?.tipo ?? "juridica",
              });
              setEditOpen(true);
            }}
          >
            <Pencil className="mr-1 size-4" /> Editar
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)} disabled={busy}>
            <Upload className="mr-1 size-4" /> Enviar documento
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/lembretes" })}>
            <BellRing className="mr-1 size-4" /> Lembretes
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={deleteCompany} disabled={busy}>
            <Trash2 className="mr-1 size-4" /> Excluir
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          e.target.value = "";
          upload(picked);
        }}
      />

      <Tabs defaultValue="files">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="files">Pastas e arquivos</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="signed">Assinados</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-3 space-y-3">
          <div className="card-soft p-3">
            <div className="flex flex-wrap items-center gap-2">
              {cwd && (
                <Button size="icon" variant="ghost" aria-label="Voltar" onClick={() => setCwd(current?.parent_id ?? null)}>
                  <ChevronLeft className="size-4" />
                </Button>
              )}
              <div className="min-w-0 flex-1 truncate text-xs font-semibold">
                {c?.nome_fantasia || c?.razao_social}
                {path.map((p) => (
                  <span key={p.id} className="text-muted-foreground">
                    {" / "}
                    {p.name}
                  </span>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={addFolder}>
                <FolderPlus className="mr-1 size-4" /> {cwd ? "Subpasta" : "Pasta"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => pickFiles(cwd)} disabled={busy}>
                {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Upload className="mr-1 size-4" />}
                {cwd ? "Enviar nesta pasta" : "Documento"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => zipFolder(cwd)} disabled={busy}>
                <FolderArchive className="mr-1 size-4" /> ZIP
              </Button>
              {current && (
                <>
                  <Button size="sm" variant="outline" onClick={() => renameFolder(current)}>
                    <Pencil className="mr-1 size-4" /> Renomear
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublic(current)}>
                    <Link2 className={`mr-1 size-4 ${current.public_token ? "text-success" : ""}`} />
                    {current.public_token ? "Link ativo" : "Link público"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => deleteFolder(current)}
                  >
                    <Trash2 className="mr-1 size-4" /> Excluir pasta
                  </Button>
                </>
              )}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Abra uma pasta para organizar em árvore, enviar documentos e escolher a ação (assinar, editar,
              baixar).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {children.map((f) => (
              <div key={f.id} className="card-soft flex items-center gap-2 p-3">
                <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setCwd(f.id)}>
                  <Folder className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{f.name}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {folders.filter((x) => x.parent_id === f.id).length} subpasta(s) •{" "}
                      {docs.filter((d) => d.folder_id === f.id).length} arquivo(s)
                    </span>
                  </span>
                </button>
                {f.public_token && <Link2 className="size-3 shrink-0 text-success" />}
                <button
                  aria-label={`Enviar documento para ${f.name}`}
                  className="shrink-0 rounded-md border border-border p-1.5"
                  disabled={busy}
                  onClick={() => pickFiles(f.id)}
                >
                  <Upload className="size-3.5 text-primary" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {filesHere.map((d) => (
              <button key={d.id} className="card-soft flex w-full items-center gap-3 p-3 text-left" onClick={() => setActionDoc(d)}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="size-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{d.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {fmtSize(d.size_bytes)} • {fmtDateTime(d.created_at)}
                  </span>
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(d.status)}`}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </button>
            ))}
            {filesHere.length === 0 && children.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Pasta vazia. Crie uma subpasta ou envie um documento.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-3 space-y-2">
          <Button className="w-full" size="sm" onClick={createContract}>
            <Plus className="mr-1 size-4" /> Novo contrato desta empresa
          </Button>
          {(data?.contracts ?? []).map((k) => (
            <div key={k.id} className="card-soft p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{k.name}</span>
                <StageBadge stage={k.stage ?? k.status} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {k.number || "sem número"} • vence {k.end_date ?? "—"}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEnvelopeFor({ id: k.id, name: k.name, documentId: k.document_id })}
                >
                  <Send className="mr-1 size-4" /> Enviar / acompanhar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={async () => {
                    if (!(await confirm({ title: `Excluir o contrato "${k.name}"?`, confirmText: "Excluir" }))) return;
                    const { error } = await supabase.from("contracts").delete().eq("id", k.id);
                    if (error) toast.error(error.message);
                    else toast.success("Contrato excluído");
                    refresh();
                  }}
                >
                  <Trash2 className="mr-1 size-4" /> Excluir
                </Button>
              </div>
            </div>
          ))}
          {(data?.contracts ?? []).length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhum contrato.</p>
          )}
        </TabsContent>

        <TabsContent value="signed" className="mt-3 space-y-2">
          {docs
            .filter((d) => d.status === "signed")
            .map((d) => (
              <div key={d.id} className="card-soft flex items-center gap-2 p-3">
                <FileText className="size-4 text-success" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.name}</span>
                <Button size="icon" variant="ghost" aria-label="Baixar" onClick={() => openFile(d, true)}>
                  <Download className="size-4" />
                </Button>
              </div>
            ))}
          {docs.filter((d) => d.status === "signed").length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhum documento assinado.</p>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <div className="space-y-2">
            {(data?.events ?? [])
              .filter((e) => e.document_id && docIds.has(e.document_id))
              .map((e) => (
                <div key={e.id} className="card-soft p-3">
                  <p className="text-xs font-medium">{e.action}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.actor ?? "sistema"} • {fmtDateTime(e.created_at)} • IP {e.ip ?? "—"}
                  </p>
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!actionDoc} onOpenChange={(o) => !o && setActionDoc(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate text-base">{actionDoc?.name}</DialogTitle>
          </DialogHeader>
          {actionDoc && (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">O que deseja fazer com este documento?</p>
              <div className="grid grid-cols-3 gap-2">
                <Act icon={Send} label="Assinar" onClick={() => sendToSignature(actionDoc.id)} />
                <Act icon={Eye} label="Ver" onClick={() => openFile(actionDoc)} />
                <Act icon={Download} label="Baixar" onClick={() => openFile(actionDoc, true)} />
                <Act icon={Wrench} label="Editar PDF" onClick={() => navigate({ to: "/app/ferramentas" })} />
                <Act
                  icon={Pencil}
                  label="Renomear"
                  onClick={async () => {
                    const name = await promptText({ title: "Renomear documento", defaultValue: actionDoc.name });
                    if (!name?.trim()) return;
                    await supabase.from("documents").update({ name: name.trim() }).eq("id", actionDoc.id);
                    setActionDoc(null);
                    refresh();
                  }}
                />
                <Act icon={Trash2} label="Excluir" onClick={() => deleteDoc(actionDoc)} />
              </div>
              <div>
                <Label className="text-xs">Mover para pasta</Label>
                <Select onValueChange={(v) => moveDoc(actionDoc, v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolher pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Raiz da empresa</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <FolderInput className="size-3" /> Organize em pastas e subpastas da empresa.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form["tipo"] ?? "juridica"} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="juridica">Pessoa jurídica</SelectItem>
                  <SelectItem value="fisica">Pessoa física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {EDIT_FIELDS.map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={`e-${key}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`e-${key}`}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <Label htmlFor="e-obs" className="text-xs">
                Observações
              </Label>
              <Textarea
                id="e-obs"
                value={form["observacoes"] ?? ""}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={saveCompany}>
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {envelopeFor && (
        <ContractEnvelopeDialog
          contractId={envelopeFor.id}
          contractName={envelopeFor.name}
          documentId={envelopeFor.documentId}
          open={!!envelopeFor}
          onOpenChange={(o) => !o && setEnvelopeFor(null)}
        />
      )}
      {dialog}
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
