import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type State = {
  kind: "confirm" | "prompt";
  title: string;
  description?: string;
  confirmText: string;
  destructive?: boolean;
  requireText?: string;
};

/**
 * Confirmações e entradas de texto em diálogo próprio — `window.confirm`/`prompt`
 * são bloqueados dentro de iframes, o que fazia ações como excluir não funcionarem.
 */
export function useDialogs() {
  const [state, setState] = useState<State | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<((v: unknown) => void) | null>(null);

  const open = useCallback((s: State, initial = "") => {
    setValue(initial);
    setState(s);
    return new Promise<unknown>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (v: unknown) => {
    setState(null);
    resolver.current?.(v);
    resolver.current = null;
  };

  const confirm = useCallback(
    (o: { title: string; description?: string; confirmText?: string; destructive?: boolean; requireText?: string }) =>
      open({
        kind: "confirm",
        title: o.title,
        description: o.description,
        confirmText: o.confirmText ?? "Confirmar",
        destructive: o.destructive ?? true,
        requireText: o.requireText,
      }) as Promise<boolean>,
    [open],
  );

  const promptText = useCallback(
    (o: { title: string; description?: string; defaultValue?: string; confirmText?: string }) =>
      open(
        {
          kind: "prompt",
          title: o.title,
          description: o.description,
          confirmText: o.confirmText ?? "Salvar",
        },
        o.defaultValue ?? "",
      ) as Promise<string | null>,
    [open],
  );

  const blocked =
    state?.kind === "confirm" && state.requireText
      ? value.trim().toUpperCase() !== state.requireText.toUpperCase()
      : state?.kind === "prompt" && !value.trim();

  const dialog = (
    <Dialog open={Boolean(state)} onOpenChange={(o) => !o && finish(state?.kind === "prompt" ? null : false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{state?.title}</DialogTitle>
          {state?.description && <DialogDescription className="text-xs">{state.description}</DialogDescription>}
        </DialogHeader>
        {(state?.kind === "prompt" || state?.requireText) && (
          <Input
            autoFocus
            value={value}
            placeholder={state?.requireText ? state.requireText : ""}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !blocked) finish(state?.kind === "prompt" ? value.trim() : true);
            }}
          />
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => finish(state?.kind === "prompt" ? null : false)}>
            Cancelar
          </Button>
          <Button
            variant={state?.destructive ? "destructive" : "default"}
            disabled={blocked}
            onClick={() => finish(state?.kind === "prompt" ? value.trim() : true)}
          >
            {state?.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, promptText, dialog };
}
