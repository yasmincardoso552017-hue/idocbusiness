import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BellRing, CalendarClock, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PushSetup } from "@/components/PushSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";
import { createReminder, sendReminderNow } from "@/lib/reminders.functions";

export const Route = createFileRoute("/_authenticated/app/lembretes")({
  component: Reminders,
});

const REPEAT = { none: "Não repetir", daily: "Diário", weekly: "Semanal", monthly: "Mensal" } as const;

function Reminders() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    body: "",
    dueAt: "",
    targetEmail: "",
    repeatEvery: "none" as keyof typeof REPEAT,
  });

  const { data } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const [reminders, notifications] = await Promise.all([
        supabase.from("reminders").select("*").order("due_at"),
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      return { reminders: reminders.data ?? [], notifications: notifications.data ?? [] };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["reminders"] });

  async function create() {
    if (!form.title.trim() || !form.dueAt) {
      toast.error("Informe título e data/hora");
      return;
    }
    try {
      await createReminder({
        data: {
          title: form.title.trim(),
          body: form.body || undefined,
          dueAt: form.dueAt,
          targetEmail: form.targetEmail.trim() ? form.targetEmail.trim() : undefined,
          repeatEvery: form.repeatEvery,
        },
      });
      setForm({ title: "", body: "", dueAt: "", targetEmail: "", repeatEvery: "none" });
      toast.success("Lembrete agendado");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AppShell title="Lembretes e notificações">
      <div className="card-soft p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <BellRing className="size-4 text-primary" /> Notificações no dispositivo
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Ative para receber os lembretes na tela inicial mesmo com o aplicativo fechado.
        </p>
        <PushSetup className="mt-3 w-full" />
      </div>

      <div className="card-soft mt-4 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <CalendarClock className="size-4 text-primary" /> Novo lembrete
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="rt">Título</Label>
            <Input
              id="rt"
              placeholder="Assinar contrato de prestação de serviço"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="rd">Data e hora</Label>
            <Input
              id="rd"
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="re">E-mail do signatário (opcional)</Label>
            <Input
              id="re"
              type="email"
              placeholder="deixe vazio para lembrar você"
              value={form.targetEmail}
              onChange={(e) => setForm({ ...form, targetEmail: e.target.value })}
            />
          </div>
          <div>
            <Label>Repetição</Label>
            <Select
              value={form.repeatEvery}
              onValueChange={(v) => setForm({ ...form, repeatEvery: v as keyof typeof REPEAT })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPEAT).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="rb">Mensagem</Label>
            <Textarea
              id="rb"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
        </div>
        <Button className="mt-3 w-full" onClick={create}>
          Agendar lembrete
        </Button>
      </div>

      <div className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Agendados</h2>
        <ul className="mt-3 space-y-2">
          {(data?.reminders ?? []).map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtDateTime(r.due_at)} • {r.target_email ?? "você"} •{" "}
                    {r.status === "sent" ? "enviado" : "agendado"}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Enviar agora"
                  onClick={async () => {
                    try {
                      const res = await sendReminderNow({ data: { reminderId: r.id } });
                      toast.success(`Notificação enviada (${res.sent} dispositivo(s))`);
                      refresh();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Send className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Excluir"
                  onClick={async () => {
                    await supabase.from("reminders").delete().eq("id", r.id);
                    refresh();
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
          {(data?.reminders ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum lembrete agendado.</p>
          )}
        </ul>
      </div>

      <div className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Notificações recebidas</h2>
        <ul className="mt-3 space-y-2">
          {(data?.notifications ?? []).map((n) => (
            <li key={n.id} className="border-b border-border pb-2 last:border-0">
              <p className="text-xs font-semibold">{n.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {n.body} • {fmtDateTime(n.created_at)}
              </p>
            </li>
          ))}
          {(data?.notifications ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">Sem notificações ainda.</p>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
