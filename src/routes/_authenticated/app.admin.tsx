import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Ban, CheckCircle2, KeyRound, Plus, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fmtDateTime } from "@/lib/format";
import {
  createPlatformUser,
  listPlatformUsers,
  resetUserPassword,
  setUserAdmin,
  setUserBlocked,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin")({
  component: AdminPanel,
});

function AdminPanel() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", admin: false });

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => listPlatformUsers(),
    retry: false,
  });

  const users = data?.users ?? [];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(t) || (u.full_name ?? "").toLowerCase().includes(t),
    );
  }, [users, q]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["platform-users"] });

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (error) {
    return (
      <AppShell title="Gestão de usuários">
        <div className="card-soft p-5 text-sm text-muted-foreground">
          Área exclusiva do acesso mestre.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Gestão de usuários">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Cadastros" value={users.length} icon={Users} />
        <StatCard
          label="Ativos"
          value={users.filter((u) => !u.blocked).length}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Bloqueados"
          value={users.filter((u) => u.blocked).length}
          icon={Ban}
          tone="destructive"
        />
        <StatCard
          label="Administradores"
          value={users.filter((u) => u.admin).length}
          icon={ShieldCheck}
        />
      </div>

      <div className="card-soft mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nome ou e-mail"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 size-4" /> Cadastrar usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="an">Nome completo</Label>
                  <Input
                    id="an"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ae">E-mail</Label>
                  <Input
                    id="ae"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ap">Senha provisória</Label>
                  <Input
                    id="ap"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="at">Telefone</Label>
                  <Input
                    id="at"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.admin}
                    onCheckedChange={(v) => setForm({ ...form, admin: v })}
                  />
                  Conceder acesso administrativo
                </label>
                <Button
                  className="w-full"
                  onClick={() =>
                    act(async () => {
                      await createPlatformUser({
                        data: {
                          fullName: form.fullName,
                          email: form.email,
                          password: form.password,
                          phone: form.phone || undefined,
                          admin: form.admin,
                        },
                      });
                      setOpen(false);
                      setForm({ fullName: "", email: "", password: "", phone: "", admin: false });
                    }, "Usuário cadastrado")
                  }
                >
                  Criar conta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && <p className="mt-4 text-xs text-muted-foreground">Carregando cadastros…</p>}

        <ul className="mt-4 space-y-3">
          {filtered.map((u) => (
            <li key={u.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.full_name ?? "Sem nome"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                </div>
                {u.admin && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Master
                  </span>
                )}
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    u.blocked
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-success/30 bg-success/10 text-success"
                  }`}
                >
                  {u.blocked ? "Bloqueado" : "Ativo"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Cadastro {fmtDateTime(u.created_at)} • Último acesso{" "}
                {u.last_sign_in_at ? fmtDateTime(u.last_sign_in_at) : "nunca"} • {u.companies}{" "}
                empresas • {u.documents} documentos
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={u.blocked ? "secondary" : "outline"}
                  onClick={() =>
                    act(
                      () => setUserBlocked({ data: { userId: u.id, blocked: !u.blocked } }),
                      u.blocked ? "Usuário liberado" : "Usuário bloqueado",
                    )
                  }
                >
                  <Ban className="mr-1 size-3.5" /> {u.blocked ? "Desbloquear" : "Bloquear"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    act(
                      () => setUserAdmin({ data: { userId: u.id, admin: !u.admin } }),
                      "Permissão atualizada",
                    )
                  }
                >
                  <ShieldCheck className="mr-1 size-3.5" /> {u.admin ? "Remover master" : "Tornar master"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const pwd = window.prompt("Nova senha para " + u.email);
                    if (!pwd || pwd.length < 6) return;
                    act(
                      () => resetUserPassword({ data: { userId: u.id, password: pwd } }),
                      "Senha redefinida",
                    );
                  }}
                >
                  <KeyRound className="mr-1 size-3.5" /> Senha
                </Button>
              </div>
            </li>
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum cadastro encontrado.</p>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
