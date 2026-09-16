import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Mail, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/perfil")({
  head: () => ({ meta: [
    { title: "Perfil e canais de envio | IDOC BUSINESS" },
    { name: "description", content: "Gerencie seus dados e canais pessoais de envio de contratos." },
    { property: "og:title", content: "Perfil e canais de envio | IDOC BUSINESS" },
    { property: "og:description", content: "Configurações pessoais e canais de envio de contratos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "" });
  const [pwd, setPwd] = useState("");
  const [channels, setChannels] = useState({ whatsapp: "", emailProvider: "gmail" as "gmail" | "outlook" });

  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user!.id)
        .maybeSingle();
       const { data: communication } = await supabase
         .from("integrations")
         .select("*")
         .eq("owner_id", auth.user!.id)
         .eq("provider", "communications")
         .maybeSingle();
       return { user: auth.user!, profile, communication };
    },
  });

  useEffect(() => {
    if (data)
      setForm({
        full_name: data.profile?.full_name ?? "",
        phone: data.profile?.phone ?? "",
        email: data.profile?.email ?? data.user.email ?? "",
      });
    const config = (data?.communication?.config ?? {}) as Record<string, unknown>;
    setChannels({
      whatsapp: typeof config.whatsapp === "string" ? config.whatsapp : data?.profile?.phone ?? "",
      emailProvider: config.emailProvider === "outlook" ? "outlook" : "gmail",
    });
  }, [data]);

  async function save() {
    const { error } = await supabase.from("profiles").upsert({
      id: data!.user.id,
      full_name: form.full_name || null,
      phone: form.phone || null,
      email: form.email || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function changePassword() {
    if (pwd.length < 6) { toast.error("A senha precisa ter ao menos 6 caracteres"); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) { toast.error(error.message); return; }
    setPwd("");
    toast.success("Senha alterada");
  }

  async function saveChannels() {
    if (!data) return;
    const payload = {
      owner_id: data.user.id,
      provider: "communications",
      connected: false,
      auto_sync: false,
      root_folder: null,
      config: {
        whatsapp: channels.whatsapp.replace(/[^\d+]/g, ""),
        emailProvider: channels.emailProvider,
      },
    };
    const result = data.communication
      ? await supabase.from("integrations").update(payload).eq("id", data.communication.id)
      : await supabase.from("integrations").insert(payload);
    if (result.error) { toast.error(result.error.message); return; }
    await qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Canais de envio atualizados");
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

        <div className="card-soft space-y-4 p-4">
          <div>
            <h2 className="text-sm font-bold">Canais de envio</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Estas preferências pertencem somente à sua conta.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-4 text-success" /> WhatsApp
            </div>
            <Label htmlFor="whatsapp">Seu número com DDD</Label>
            <Input
              id="whatsapp"
              inputMode="tel"
              placeholder="Ex.: 5511999999999"
              value={channels.whatsapp}
              onChange={(e) => setChannels({ ...channels, whatsapp: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Ao enviar, o IDOC abrirá uma mensagem pronta para cada signatário. Você confirma o envio no seu WhatsApp.
            </p>
          </div>
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="size-4 text-primary" /> E-mail pessoal
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={channels.emailProvider === "gmail" ? "default" : "outline"}
                onClick={() => setChannels({ ...channels, emailProvider: "gmail" })}
              >
                Gmail
              </Button>
              <Button
                type="button"
                variant={channels.emailProvider === "outlook" ? "default" : "outline"}
                onClick={() => setChannels({ ...channels, emailProvider: "outlook" })}
              >
                Outlook
              </Button>
            </div>
            <div className="rounded-md bg-muted p-3 text-[11px] text-muted-foreground">
              A conexão segura da caixa pessoal está aguardando habilitação administrativa. Enquanto isso, os links continuam disponíveis para WhatsApp e cópia manual.
            </div>
          </div>
          <Button className="w-full" onClick={saveChannels}>Salvar canais</Button>
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
