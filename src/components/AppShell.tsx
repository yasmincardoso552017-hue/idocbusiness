import { Brand } from "@/components/Brand";
import { InstallAppButton } from "@/components/InstallAppButton";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Building2,
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
  Users,
  BellRing,
  KeyRound,
  Scale,
} from "lucide-react";
import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const tabs = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/empresas", label: "Empresas", icon: Building2 },
  { to: "/app/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/app/contratos", label: "Contratos", icon: FileSignature },
  { to: "/app/assinaturas", label: "Assinaturas", icon: PenLine },
];

const menu = [
  { to: "/app/perfil", label: "Perfil", icon: User },
  { to: "/app/meus-contratos", label: "Meus contratos assinados", icon: FileSignature },
  { to: "/app/auditor", label: "Auditor jurídico com IA", icon: Scale },
  { to: "/app/compartilhadas", label: "Pastas compartilhadas (SKU)", icon: KeyRound },
  { to: "/app/lembretes", label: "Lembretes e notificações", icon: BellRing },
  { to: "/app/ferramentas", label: "Ferramentas PDF", icon: Wrench },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings },
  { to: "/app/integracoes", label: "Integrações", icon: Plug },
  { to: "/app/seguranca", label: "Segurança", icon: ShieldCheck },
  { to: "/verify", label: "Verificar documento", icon: BadgeCheck },
  { to: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

function DesktopSidebar({ items, pathname, onSignOut }: { items: typeof menu; pathname: string; onSignOut: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isActive = (to: string) => to === "/app" ? pathname === "/app" : pathname.startsWith(to);
  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
        <Link to="/app" className="flex items-center overflow-hidden">
          <Brand className={collapsed ? "h-7 max-w-8 object-left" : "h-8"} />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Área de trabalho</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <Link to={item.to}><item.icon /><span>{item.label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Mais recursos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.filter((item) => !tabs.some((tab) => tab.to === item.to)).map((item) => (
                <SidebarMenuItem key={`${item.to}-${item.label}`}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <Link to={item.to}><item.icon /><span>{item.label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={onSignOut} className="text-destructive">
              <LogOut /><span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
      return Boolean(data);
    },
    staleTime: 300000,
  });
  const items = isAdmin
    ? [...menu, { to: "/app/admin", label: "Gestão de usuários", icon: Users }]
    : menu;
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <SidebarProvider>
      <DesktopSidebar items={items} pathname={pathname} onSignOut={signOut} />
      <SidebarInset className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
          <SidebarTrigger className="hidden md:inline-flex" aria-label="Recolher menu lateral" />
          <Link to="/app" className="flex items-center gap-2 md:hidden">
            <Brand className="h-7" />
          </Link>
          <h1 className="ml-1 min-w-0 flex-1 truncate text-sm font-semibold text-foreground md:text-base">{title}</h1>
          <GlobalSearch />
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
                {items.map((m) => (
                  <Link
                    key={m.to}
                    to={m.to}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary"
                  >
                    <m.icon className="size-4 text-primary" /> {m.label}
                  </Link>
                ))}
                 <Button variant="ghost" onClick={signOut} className="mt-2 w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive">
                   <LogOut className="size-4" /> Sair
                 </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 md:px-6 md:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
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
      </SidebarInset>
    </SidebarProvider>
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
