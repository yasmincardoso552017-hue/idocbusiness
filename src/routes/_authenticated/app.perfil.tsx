import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/perfil")({
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "" });
  const [pwd, setPwd] = useState("");

  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user!.id)
        .maybeSingle();
      return { user: auth.user!, profile };
    },
  });

  useEffect(() => {
    if (data)
      setForm({
        full_name: data.profile?.full_name ?? "",
        phone: data.profile?.phone ?? "",
        email: data.profile?.email ?? data.user.email ?? "",
      });
  }, [data]);

  async function save() {
    const { error } = await supabase.from("profiles").upsert({
      id: data!.user.id,
      full_name: form.full_name || null,
      phone: form.phone || null,
      email: form.email || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function changePassword() {
    if (pwd.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return toast.error(error.message);
    setPwd("");
    toast.success("Senha alterada");
  }

  return (
    <AppShell title="Perfil">
      <div className="space-y-4">
        <div className="card-soft p-4">
          <div className="flex items-center gap-3">
            <span className="gradient-brand flex size-12 items-center justify-center rounded-xl">
              <User className="size-6 text-primary-foreground" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{form.full_name || "Sem nome"}</div>
              <div className="truncate text-[11px] text-muted-foreground">{data?.user.email}</div>
              <div className="text-[11px] text-muted-foreground">
                Plano {data?.profile?.plan ?? "free"} • desde {fmtDateTime(data?.profile?.created_at)}
              </div>
            </div>
          </div>
        </div>

        <div className="card-soft space-y-3 p-4">
          <h2 className="text-sm font-bold">Dados pessoais</h2>
          <div>
            <Label htmlFor="pn">Nome completo</Label>
            <Input id="pn" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="pt">Telefone</Label>
            <Input id="pt" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="pe">E-mail de contato</Label>
            <Input id="pe" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Button className="w-full" onClick={save}>
            Salvar
          </Button>
        </div>

        <div className="card-soft space-y-3 p-4">
          <h2 className="text-sm font-bold">Alterar senha</h2>
          <Input type="password" placeholder="Nova senha" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          <Button variant="outline" className="w-full" onClick={changePassword}>
            Atualizar senha
          </Button>
        </div>

        <Button
          variant="ghost"
          className="w-full text-destructive"
          onClick={async () => {
            await qc.cancelQueries();
            qc.clear();
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="mr-1 size-4" /> Sair da conta
        </Button>
      </div>
    </AppShell>
  );
}
