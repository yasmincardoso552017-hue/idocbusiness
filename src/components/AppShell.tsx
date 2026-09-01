import { Brand } from "@/components/Brand";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Building2,
  FileText,
  FileSignature,
  PenLine,
  Menu,
  User,
  Settings,
  Plug,
  ShieldCheck,
  HelpCircle,
  LogOut,
  BadgeCheck,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/empresas", label: "Empresas", icon: Building2 },
  { to: "/app/documentos", label: "Docs", icon: FileText },
  { to: "/app/contratos", label: "Contratos", icon: FileSignature },
  { to: "/app/assinaturas", label: "Assinaturas", icon: PenLine },
];

const menu = [
  { to: "/app/perfil", label: "Perfil", icon: User },
  { to: "/app/ferramentas", label: "Ferramentas PDF", icon: Wrench },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings },
  { to: "/app/integracoes", label: "Integrações", icon: Plug },
  { to: "/app/seguranca", label: "Segurança", icon: ShieldCheck },
  { to: "/verify", label: "Verificar documento", icon: BadgeCheck },
  { to: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link to="/app" className="flex items-center gap-2">
            <Brand className="h-7" />
          </Link>
          <h1 className="ml-1 flex-1 truncate text-sm font-semibold text-muted-foreground">{title}</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-3 px-3">
                <InstallAppButton className="w-full justify-center" />
              </div>
              <nav className="mt-2 flex flex-col gap-1 px-2">
                {menu.map((m) => (
                  <Link
                    key={m.to}
                    to={m.to}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary"
                  >
                    <m.icon className="size-4 text-primary" /> {m.label}
                  </Link>
                ))}
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/auth" });
                  }}
                  className="mt-2 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4" /> Sair
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl">
          {tabs.map((t) => {
            const active = t.to === "/app" ? pathname === "/app" : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <t.icon className={`size-5 ${active ? "" : "opacity-70"}`} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <div className="card-soft p-3">
      <div className={`mb-2 flex size-8 items-center justify-center rounded-lg ${toneMap[tone]}`}>
        <Icon className="size-4" />
      </div>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}
