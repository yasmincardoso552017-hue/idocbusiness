import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Plus, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/empresas/")({
  component: Companies,
});

const FIELDS: Array<[string, string, string?]> = [
  ["razao_social", "Razão social"],
  ["nome_fantasia", "Nome fantasia"],
  ["cnpj", "CNPJ"],
  ["inscricao_estadual", "Inscrição estadual"],
  ["endereco", "Endereço"],
  ["cidade", "Cidade"],
  ["estado", "Estado"],
  ["cep", "CEP"],
  ["telefone", "Telefone"],
  ["email", "E-mail", "email"],
  ["contato", "Pessoa de contato"],
];

const DEFAULT_FOLDERS = [
  "Documentos",
  "Contratos",
  "Contratos Pendentes",
  "Contratos Assinados",
  "Documentos Assinados",
  "Documentos Arquivados",
  "Outros",
];

function Companies() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () =>
      (await supabase.from("companies").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      if (!form.razao_social) throw new Error("Informe a razão social");
      const { data, error } = await supabase
        .from("companies")
        .insert({ ...form, owner_id: u.user.id, razao_social: form.razao_social })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("folders").insert(
        DEFAULT_FOLDERS.map((name) => ({ name, company_id: data.id, owner_id: u.user!.id })),
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Empresa cadastrada com estrutura de pastas");
      setForm({});
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (companies ?? []).filter((c) =>
    [c.razao_social, c.nome_fantasia, c.cnpj].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Empresas">
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou CNPJ"
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" aria-label="Nova empresa">
              <Plus className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova empresa</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {FIELDS.map(([key, label, type]) => (
                <div key={key}>
                  <Label htmlFor={key} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={key}
                    type={type ?? "text"}
                    value={form[key] ?? ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <Label htmlFor="obs" className="text-xs">
                  Observações
                </Label>
                <Textarea
                  id="obs"
                  value={form.observacoes ?? ""}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
                Cadastrar empresa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {list.map((c) => (
          <Link
            key={c.id}
            to="/app/empresas/$companyId"
            params={{ companyId: c.id }}
            className="card-soft flex items-center gap-3 p-3"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="size-5 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {c.nome_fantasia || c.razao_social}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {c.cnpj || c.razao_social}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
        {list.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma empresa cadastrada. Toque em + para começar.
          </p>
        )}
      </div>
    </AppShell>
  );
}
