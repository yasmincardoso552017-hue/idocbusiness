import { Link } from "@tanstack/react-router";
import { FileSignature } from "lucide-react";
import type { ReactNode } from "react";

export function PublicPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="gradient-brand flex size-8 items-center justify-center rounded-lg">
              <FileSignature className="size-4 text-primary-foreground" />
            </span>
            <span className="text-sm font-extrabold tracking-tight">DocFlow</span>
          </Link>
          <nav className="ml-auto flex gap-3 text-xs font-medium text-muted-foreground">
            <Link to="/verify">Verificar</Link>
            <Link to="/ajuda">Ajuda</Link>
            <Link to="/auth">Entrar</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <div className="card-soft mt-4 space-y-3 p-5 text-sm leading-relaxed text-muted-foreground [&_h2]:pt-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground">
          {children}
        </div>
        <footer className="py-8 text-center text-xs text-muted-foreground">
          <div className="flex justify-center gap-3">
            <Link to="/termos">Termos</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/ajuda">Ajuda</Link>
          </div>
          <p className="mt-2">© {new Date().getFullYear()} DocFlow</p>
        </footer>
      </main>
    </div>
  );
}
