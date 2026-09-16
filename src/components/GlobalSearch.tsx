import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Building2, FileSignature, FileText, Folder, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

type SearchData = {
  companies: Array<{ id: string; name: string; detail: string }>;
  folders: Array<{ id: string; companyId: string; name: string; detail: string }>;
  documents: Array<{ id: string; companyId: string; folderId: string | null; name: string; detail: string }>;
  contracts: Array<{ id: string; name: string; detail: string }>;
};

const EMPTY: SearchData = { companies: [], folders: [], documents: [], contracts: [] };

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data = EMPTY, isLoading } = useQuery({
    queryKey: ["global-search"],
    enabled: open,
    staleTime: 60_000,
    queryFn: async (): Promise<SearchData> => {
      const [companies, folders, documents, contracts] = await Promise.all([
        supabase.from("companies").select("id, razao_social, nome_fantasia, cnpj, cpf").limit(200),
        supabase.from("folders").select("id, company_id, name, companies(razao_social, nome_fantasia)").limit(300),
        supabase.from("documents").select("id, company_id, folder_id, name, companies(razao_social, nome_fantasia)").limit(300),
        supabase.from("contracts").select("id, name, number, companies(razao_social, nome_fantasia)").limit(200),
      ]);
      const companyName = (value: unknown) => {
        const company = value as { razao_social?: string; nome_fantasia?: string | null } | null;
        return company?.nome_fantasia || company?.razao_social || "Sem empresa";
      };
      return {
        companies: (companies.data ?? []).map((item) => ({
          id: item.id,
          name: item.nome_fantasia || item.razao_social,
          detail: item.cnpj || item.cpf || "Empresa",
        })),
        folders: (folders.data ?? []).map((item) => ({
          id: item.id,
          companyId: item.company_id,
          name: item.name,
          detail: companyName(item.companies),
        })),
        documents: (documents.data ?? []).filter((item) => Boolean(item.company_id)).map((item) => ({
          id: item.id,
          companyId: item.company_id ?? "",
          folderId: item.folder_id,
          name: item.name,
          detail: companyName(item.companies),
        })),
        contracts: (contracts.data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          detail: `${companyName(item.companies)}${item.number ? ` • ${item.number}` : ""}`,
        })),
      };
    },
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (to: "/app/empresas/$companyId" | "/app/contratos", params?: { companyId: string }, folder?: string | null) => {
    setOpen(false);
    if (to === "/app/contratos") {
      navigate({ to });
      return;
    }
    navigate({ to, params: params ?? { companyId: "" }, search: { folder: folder ?? "" } });
  };

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 gap-2 md:min-w-52 md:justify-start" onClick={() => setOpen(true)}>
        <Search className="size-4" />
        <span className="hidden md:inline">Buscar em tudo</span>
        <span className="ml-auto hidden text-[10px] text-muted-foreground lg:inline">Ctrl K</span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Empresa, pasta, documento ou contrato…" />
        <CommandList>
          <CommandEmpty>{isLoading ? "Buscando…" : "Nenhum resultado encontrado."}</CommandEmpty>
          <CommandGroup heading="Empresas">
            {data.companies.map((item) => (
              <CommandItem key={item.id} value={`${item.name} ${item.detail}`} onSelect={() => go("/app/empresas/$companyId", { companyId: item.id })}>
                <Building2 /> <span className="min-w-0 flex-1 truncate">{item.name}</span><small className="text-muted-foreground">{item.detail}</small>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Pastas">
            {data.folders.map((item) => (
              <CommandItem key={item.id} value={`${item.name} ${item.detail}`} onSelect={() => go("/app/empresas/$companyId", { companyId: item.companyId }, item.id)}>
                <Folder /> <span className="min-w-0 flex-1 truncate">{item.name}</span><small className="text-muted-foreground">{item.detail}</small>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Documentos">
            {data.documents.map((item) => (
              <CommandItem key={item.id} value={`${item.name} ${item.detail}`} onSelect={() => go("/app/empresas/$companyId", { companyId: item.companyId }, item.folderId)}>
                <FileText /> <span className="min-w-0 flex-1 truncate">{item.name}</span><small className="text-muted-foreground">{item.detail}</small>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Contratos">
            {data.contracts.map((item) => (
              <CommandItem key={item.id} value={`${item.name} ${item.detail}`} onSelect={() => go("/app/contratos")}>
                <FileSignature /> <span className="min-w-0 flex-1 truncate">{item.name}</span><small className="text-muted-foreground">{item.detail}</small>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}