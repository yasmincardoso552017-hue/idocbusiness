import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  component: Settings,
});

const PREF_KEY = "docflow:prefs";

type Prefs = { notifySigned: boolean; notifyExpiring: boolean; darkMode: boolean };

function readPrefs(): Prefs {
  if (typeof window === "undefined") return { notifySigned: true, notifyExpiring: true, darkMode: false };
  try {
    return { notifySigned: true, notifyExpiring: true, darkMode: false, ...JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") };
  } catch {
    return { notifySigned: true, notifyExpiring: true, darkMode: false };
  }
}

function Settings() {
  const qc = useQueryClient();

  const { data: prefs } = useQuery({ queryKey: ["prefs"], queryFn: async () => readPrefs() });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  function setPref(patch: Partial<Prefs>) {
    const next = { ...readPrefs(), ...patch };
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
    if (patch.darkMode !== undefined)
      document.documentElement.classList.toggle("dark", patch.darkMode);
    qc.setQueryData(["prefs"], next);
  }

  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <AppShell title="Configurações">
      <div className="space-y-4">
        <div className="card-soft space-y-4 p-4">
          <h2 className="text-sm font-bold">Preferências</h2>
          {[
            { k: "notifySigned" as const, label: "Avisar quando um documento for assinado" },
            { k: "notifyExpiring" as const, label: "Avisar sobre contratos próximos do vencimento" },
            { k: "darkMode" as const, label: "Tema escuro" },
          ].map((row) => (
            <div key={row.k} className="flex items-center justify-between gap-3">
              <span className="text-sm">{row.label}</span>
              <Switch checked={!!prefs?.[row.k]} onCheckedChange={(v) => setPref({ [row.k]: v } as Partial<Prefs>)} />
            </div>
          ))}
        </div>

        <div className="card-soft p-4">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h2 className="flex-1 text-sm font-bold">Notificações {unread > 0 && `(${unread})`}</h2>
            {unread > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await supabase.from("notifications").update({ read: true }).eq("read", false);
                  qc.invalidateQueries({ queryKey: ["notifications"] });
                }}
              >
                <Check className="mr-1 size-3.5" /> Marcar lidas
              </Button>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {(notifications ?? []).map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border p-2 ${n.read ? "border-border" : "border-primary/30 bg-primary/5"}`}
              >
                <div className="text-sm font-semibold">{n.title}</div>
                {n.body && <div className="text-[11px] text-muted-foreground">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground">{fmtDateTime(n.created_at)}</div>
              </div>
            ))}
            {(notifications ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma notificação.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
