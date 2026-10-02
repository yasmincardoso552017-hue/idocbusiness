import { useEffect, useRef, useState } from "react";
import { Download, FileUp, Loader2, Printer, RefreshCw, ScanLine, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONNECTOR_URL = "http://127.0.0.1:17654";
const TOKEN_KEY = "idoc-print-connector-token";

type PrinterInfo = { name: string; default: boolean; status: string };
type ConnectorStatus = { ready: boolean; version: string; paired: boolean; computer: string };

async function connectorRequest<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${CONNECTOR_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "O Conector IDOC não respondeu.");
  }
  return response.json() as Promise<T>;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function PrintScanConnector({ onScanned }: { onScanned: (file: File) => void }) {
  const [status, setStatus] = useState<ConnectorStatus | null>(null);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [printer, setPrinter] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [printFile, setPrintFile] = useState<File | null>(null);
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState<"connect" | "print" | "scan" | null>(null);
  const fallbackInput = useRef<HTMLInputElement>(null);

  const token = typeof window === "undefined" ? "" : window.localStorage.getItem(TOKEN_KEY) ?? "";

  async function refresh() {
    setBusy("connect");
    try {
      const nextStatus = await connectorRequest<ConnectorStatus>("/status");
      setStatus(nextStatus);
      if (token) {
        const result = await connectorRequest<{ printers: PrinterInfo[] }>("/printers", undefined, token);
        setPrinters(result.printers);
        setPrinter((current) => current || result.printers.find((item) => item.default)?.name || result.printers[0]?.name || "");
      }
    } catch {
      setStatus(null);
      setPrinters([]);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function pair() {
    if (!pairCode.trim()) {
      toast.error("Digite o código mostrado pelo Conector IDOC no Windows.");
      return;
    }
    setBusy("connect");
    try {
      const result = await connectorRequest<{ token: string }>("/pair", {
        method: "POST",
        body: JSON.stringify({ code: pairCode.trim() }),
      });
      window.localStorage.setItem(TOKEN_KEY, result.token);
      setPairCode("");
      toast.success("Computador pareado com segurança.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Código inválido.");
    } finally {
      setBusy(null);
    }
  }

  async function print() {
    if (!printFile || !printer) {
      toast.error("Escolha o arquivo e a impressora.");
      return;
    }
    setBusy("print");
    try {
      await connectorRequest("/print", {
        method: "POST",
        body: JSON.stringify({
          printer,
          copies,
          name: printFile.name,
          mime: printFile.type || "application/octet-stream",
          data: await fileToBase64(printFile),
        }),
      }, token);
      toast.success("Documento enviado para a fila de impressão.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível imprimir.");
    } finally {
      setBusy(null);
    }
  }

  async function scan() {
    setBusy("scan");
    try {
      const result = await connectorRequest<{ name: string; mime: string; data: string }>("/scan", { method: "POST", body: "{}" }, token);
      const bytes = Uint8Array.from(atob(result.data), (char) => char.charCodeAt(0));
      onScanned(new File([bytes], result.name, { type: result.mime }));
      toast.success("Digitalização recebida. Você já pode tratar e salvar o documento.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível digitalizar.");
    } finally {
      setBusy(null);
    }
  }

  function useFallback(file: File | undefined) {
    if (!file) return;
    onScanned(file);
    toast.success("Imagem adicionada às ferramentas.");
  }

  const connected = Boolean(status && token && printers.length);

  return (
    <div className="space-y-4">
      <section className="card-soft p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Printer className="size-5" /></span>
            <div><h2 className="font-bold">Conector IDOC para Windows</h2><p className="mt-1 text-xs text-muted-foreground">Impressoras e scanners do computador, sem enviar o arquivo para armazenamento.</p></div>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${connected ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}>
            {connected ? `Conectado a ${status?.computer}` : status ? "Aguardando pareamento" : "Não instalado"}
          </span>
        </div>

        {!status && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div><p className="text-sm font-semibold">1. Instale no computador Windows 10/11</p><p className="mt-1 text-xs text-muted-foreground">Baixe, extraia a pasta e abra “Instalar Conector IDOC”.</p></div>
            <Button asChild><a href="/idoc-connector-windows.zip" download><Download className="size-4" /> Baixar conector</a></Button>
          </div>
        )}

        {status && !connected && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div><Label htmlFor="pair-code">Código mostrado no Windows</Label><Input id="pair-code" value={pairCode} onChange={(event) => setPairCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" /></div>
            <Button onClick={pair} disabled={busy === "connect"}><ShieldCheck className="size-4" /> Parear computador</Button>
          </div>
        )}

        <Button variant="ghost" size="sm" className="mt-3" onClick={refresh} disabled={busy === "connect"}><RefreshCw className={busy === "connect" ? "animate-spin" : ""} /> Verificar conexão</Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-soft p-4 sm:p-5">
          <div className="flex items-center gap-2"><Printer className="size-5 text-primary" /><h2 className="font-bold">Imprimir</h2></div>
          <div className="mt-4 space-y-3">
            <div><Label htmlFor="print-file">Documento ou imagem</Label><Input id="print-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" onChange={(event) => setPrintFile(event.target.files?.[0] ?? null)} /></div>
            <div><Label htmlFor="printer">Impressora</Label><select id="printer" value={printer} onChange={(event) => setPrinter(event.target.value)} disabled={!connected} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{connected ? "Escolha" : "Conecte o computador primeiro"}</option>{printers.map((item) => <option key={item.name} value={item.name}>{item.name}{item.default ? " — padrão" : ""}</option>)}</select></div>
            <div className="max-w-28"><Label htmlFor="copies">Cópias</Label><Input id="copies" type="number" min={1} max={20} value={copies} onChange={(event) => setCopies(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /></div>
            <Button className="w-full" disabled={!connected || !printFile || busy === "print"} onClick={print}>{busy === "print" ? <Loader2 className="animate-spin" /> : <Printer />} Imprimir agora</Button>
            {!connected && printFile && <Button variant="outline" className="w-full" onClick={() => { const url = URL.createObjectURL(printFile); const popup = window.open(url, "_blank"); popup?.addEventListener("load", () => popup.print(), { once: true }); setTimeout(() => URL.revokeObjectURL(url), 60000); }}>Usar impressão do navegador</Button>}
          </div>
        </section>

        <section className="card-soft p-4 sm:p-5">
          <div className="flex items-center gap-2"><ScanLine className="size-5 text-primary" /><h2 className="font-bold">Digitalizar</h2></div>
          <p className="mt-2 text-xs text-muted-foreground">O Windows abrirá a escolha do scanner e as configurações do equipamento.</p>
          <div className="mt-4 space-y-3">
            <Button className="w-full" disabled={!connected || busy === "scan"} onClick={scan}>{busy === "scan" ? <Loader2 className="animate-spin" /> : <ScanLine />} Buscar imagem do scanner</Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
            <Input ref={fallbackInput} type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={(event) => useFallback(event.target.files?.[0])} />
            <Button variant="outline" className="w-full" onClick={() => fallbackInput.current?.click()}><FileUp /> Usar câmera ou arquivo</Button>
          </div>
        </section>
      </div>
    </div>
  );
}