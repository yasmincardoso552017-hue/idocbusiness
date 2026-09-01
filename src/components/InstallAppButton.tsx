import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Botão "Baixar app" que adiciona o IDOC BUSINESS à tela inicial. */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }
    setShowHelp(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 ${className}`}
      >
        <Download className="size-4" /> Baixar app
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 sm:items-center">
          <div className="card-soft w-full max-w-sm space-y-3 bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold">Adicionar à tela inicial</h2>
              <button aria-label="Fechar" onClick={() => setShowHelp(false)}>
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            {isIos ? (
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  1. Toque em <Share className="size-4 text-primary" /> Compartilhar
                </li>
                <li className="flex items-center gap-2">
                  2. Escolha <Plus className="size-4 text-primary" /> Adicionar à Tela de Início
                </li>
                <li>3. Confirme em "Adicionar"</li>
              </ol>
            ) : (
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>1. Abra o menu do navegador (⋮)</li>
                <li>2. Toque em "Instalar app" ou "Adicionar à tela inicial"</li>
                <li>3. Confirme a instalação</li>
              </ol>
            )}
            <p className="text-xs text-muted-foreground">
              O app abre em tela cheia com o ícone do IDOC BUSINESS.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
