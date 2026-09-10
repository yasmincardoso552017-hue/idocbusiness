import { useState } from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Link2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export type TreeFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  public_token: string | null;
  sku: string;
};

type Props = {
  rootLabel: string;
  folders: TreeFolder[];
  docCount: (folderId: string | null) => number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (parentId: string | null) => void;
  onRename: (f: TreeFolder) => void;
  onDelete: (f: TreeFolder) => void;
  onUpload: (folderId: string | null) => void;
  onTogglePublic?: (f: TreeFolder) => void;
};

/** Árvore de pastas no padrão de explorador de arquivos: abre, fecha e age em cada nó. */
export function FolderTree({
  rootLabel,
  folders,
  docCount,
  selected,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onUpload,
  onTogglePublic,
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const childrenOf = (id: string | null) => folders.filter((f) => (f.parent_id ?? null) === id);

  const Node = ({ f, depth }: { f: TreeFolder; depth: number }) => {
    const kids = childrenOf(f.id);
    const isOpen = !!open[f.id];
    const active = selected === f.id;
    return (
      <li>
        <div
          className={`group flex items-center gap-1 rounded-md pr-1 ${
            active ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          }`}
          style={{ paddingLeft: depth * 12 }}
        >
          <button
            aria-label={isOpen ? `Fechar ${f.name}` : `Abrir ${f.name}`}
            className="flex size-6 items-center justify-center rounded"
            onClick={() => setOpen((s) => ({ ...s, [f.id]: !isOpen }))}
          >
            {kids.length > 0 && (
              <ChevronRight className={`size-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            )}
          </button>
          <button
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
            onClick={() => {
              onSelect(f.id);
              if (kids.length) setOpen((s) => ({ ...s, [f.id]: true }));
            }}
          >
            {isOpen ? (
              <FolderOpen className="size-4 shrink-0 text-primary" />
            ) : (
              <Folder className="size-4 shrink-0 text-primary" />
            )}
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{f.name}</span>
            {f.public_token && <Link2 className="size-3 shrink-0 text-success" />}
            <span className="shrink-0 text-[10px] text-muted-foreground">{docCount(f.id) || ""}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Ações da pasta ${f.name}`}
                className="shrink-0 rounded p-1 opacity-60 hover:opacity-100"
              >
                <MoreVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onCreate(f.id)}>
                <FolderPlus className="mr-2 size-4" /> Nova subpasta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpload(f.id)}>
                <Upload className="mr-2 size-4" /> Enviar documento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(f)}>
                <Pencil className="mr-2 size-4" /> Renomear
              </DropdownMenuItem>
              {onTogglePublic && (
                <DropdownMenuItem onClick={() => onTogglePublic(f)}>
                  <Link2 className="mr-2 size-4" />
                  {f.public_token ? "Desativar link público" : "Gerar link público"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(f)}>
                <Trash2 className="mr-2 size-4" /> Excluir pasta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isOpen && kids.length > 0 && (
          <ul>
            {kids.map((k) => (
              <Node key={k.id} f={k} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="card-soft flex flex-col p-2">
      <div className="mb-1 flex items-center gap-1">
        <button
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left ${
            selected === null ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          }`}
          onClick={() => onSelect(null)}
        >
          <HardDrive className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{rootLabel}</span>
          <span className="text-[10px] text-muted-foreground">{docCount(null) || ""}</span>
        </button>
        <Button size="icon" variant="ghost" aria-label="Nova pasta" onClick={() => onCreate(null)}>
          <FolderPlus className="size-4" />
        </Button>
      </div>
      <ul className="max-h-[60vh] overflow-y-auto pr-1">
        {childrenOf(null).map((f) => (
          <Node key={f.id} f={f} depth={0} />
        ))}
      </ul>
      {folders.length === 0 && (
        <p className="px-2 pb-2 text-[10px] text-muted-foreground">
          Nenhuma pasta ainda. Use o ícone + para criar a primeira.
        </p>
      )}
    </div>
  );
}
