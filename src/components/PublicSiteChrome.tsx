import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="IDOC BUSINESS — início" className="mr-auto"><Brand className="h-7" /></Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-5 md:flex">
          <Link to="/ferramentas" className="text-sm font-medium text-muted-foreground hover:text-foreground">Ferramentas</Link>
          <a href="/manual-idoc-business.pdf" className="text-sm font-medium text-muted-foreground hover:text-foreground">Manual</a>
          <Link to="/verify" className="text-sm font-medium text-muted-foreground hover:text-foreground">Verificar</Link>
        </nav>
        <Button asChild size="sm" variant="ghost"><Link to="/auth">Entrar</Link></Button>
        <Button asChild size="sm"><Link to="/auth">Criar conta</Link></Button>
      </div>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 text-sm sm:grid-cols-[1.4fr_1fr_1fr] sm:px-2">
        <div><Brand className="h-7" /><p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">Ferramentas de PDF, assinatura eletrônica e gestão segura de documentos para celular e computador.</p></div>
        <div><p className="font-bold">Explorar</p><div className="mt-3 grid gap-2 text-xs text-muted-foreground"><Link to="/ferramentas">Ferramentas de PDF</Link><Link to="/verify">Verificar documento</Link><a href="/manual-idoc-business.pdf">Manual ilustrado</a><Link to="/ajuda">Central de ajuda</Link></div></div>
        <div><p className="font-bold">Informações</p><div className="mt-3 grid gap-2 text-xs text-muted-foreground"><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link><Link to="/auth">Entrar ou criar conta</Link></div></div>
      </div>
    </footer>
  );
}

export function PublicSiteLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background"><PublicSiteHeader />{children}<PublicSiteFooter /></div>;
}