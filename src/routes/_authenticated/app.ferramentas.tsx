import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Combine, Scissors, RotateCw, Droplets, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/ferramentas")({
  component: Tools,
});

function save(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Tools() {
  const mergeRef = useRef<HTMLInputElement>(null);
  const splitRef = useRef<HTMLInputElement>(null);
  const rotRef = useRef<HTMLInputElement>(null);
  const wmRef = useRef<HTMLInputElement>(null);
  const [range, setRange] = useState("1-2");
  const [angle, setAngle] = useState("90");
  const [text, setText] = useState("CONFIDENCIAL");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      toast.success("Arquivo gerado");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao processar o PDF");
    } finally {
      setBusy(false);
    }
  }

  const merge = () =>
    run(async () => {
      const files = Array.from(mergeRef.current?.files ?? []);
      if (files.length < 2) throw new Error("Selecione ao menos 2 PDFs");
      const out = await PDFDocument.create();
      for (const f of files) {
        const src = await PDFDocument.load(await f.arrayBuffer());
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      save(await out.save(), "docflow-unido.pdf");
    });

  const split = () =>
    run(async () => {
      const f = splitRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const src = await PDFDocument.load(await f.arrayBuffer());
      const idx = new Set<number>();
      for (const part of range.split(",")) {
        const [a, b] = part.split("-").map((n) => parseInt(n.trim(), 10));
        if (!a) continue;
        for (let i = a; i <= (b || a); i++) if (i >= 1 && i <= src.getPageCount()) idx.add(i - 1);
      }
      if (!idx.size) throw new Error("Intervalo inválido");
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, Array.from(idx).sort((x, y) => x - y));
      pages.forEach((p) => out.addPage(p));
      save(await out.save(), "docflow-paginas.pdf");
    });

  const rotate = () =>
    run(async () => {
      const f = rotRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const pdf = await PDFDocument.load(await f.arrayBuffer());
      pdf.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + Number(angle)) % 360)));
      save(await pdf.save(), "docflow-rotacionado.pdf");
    });

  const watermark = () =>
    run(async () => {
      const f = wmRef.current?.files?.[0];
      if (!f) throw new Error("Selecione um PDF");
      const pdf = await PDFDocument.load(await f.arrayBuffer());
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      for (const p of pdf.getPages()) {
        const { width, height } = p.getSize();
        p.drawText(text, {
          x: width * 0.12,
          y: height * 0.45,
          size: Math.min(60, (width * 0.8) / Math.max(6, text.length) * 1.6),
          font,
          color: rgb(0.45, 0.5, 0.58),
          opacity: 0.18,
          rotate: degrees(35),
        });
      }
      save(await pdf.save(), "docflow-marca-dagua.pdf");
    });

  return (
    <AppShell title="Ferramentas PDF">
      <div className="card-soft p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wrench className="size-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            Tudo é processado no seu dispositivo — os arquivos não são enviados ao servidor.
          </p>
        </div>
        <Tabs defaultValue="merge">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="merge">Unir</TabsTrigger>
            <TabsTrigger value="split">Dividir</TabsTrigger>
            <TabsTrigger value="rotate">Rotacionar</TabsTrigger>
            <TabsTrigger value="wm">Marca</TabsTrigger>
          </TabsList>

          <TabsContent value="merge" className="mt-4 space-y-3">
            <Label htmlFor="fm">PDFs (2 ou mais)</Label>
            <Input id="fm" ref={mergeRef} type="file" accept=".pdf" multiple />
            <Button className="w-full" disabled={busy} onClick={merge}>
              <Combine className="mr-1 size-4" /> Unir PDFs
            </Button>
          </TabsContent>

          <TabsContent value="split" className="mt-4 space-y-3">
            <Label htmlFor="fs">PDF</Label>
            <Input id="fs" ref={splitRef} type="file" accept=".pdf" />
            <Label htmlFor="rg">Páginas (ex.: 1-3,5)</Label>
            <Input id="rg" value={range} onChange={(e) => setRange(e.target.value)} />
            <Button className="w-full" disabled={busy} onClick={split}>
              <Scissors className="mr-1 size-4" /> Extrair páginas
            </Button>
          </TabsContent>

          <TabsContent value="rotate" className="mt-4 space-y-3">
            <Label htmlFor="fr">PDF</Label>
            <Input id="fr" ref={rotRef} type="file" accept=".pdf" />
            <Label htmlFor="an">Ângulo</Label>
            <Input id="an" type="number" step="90" value={angle} onChange={(e) => setAngle(e.target.value)} />
            <Button className="w-full" disabled={busy} onClick={rotate}>
              <RotateCw className="mr-1 size-4" /> Rotacionar
            </Button>
          </TabsContent>

          <TabsContent value="wm" className="mt-4 space-y-3">
            <Label htmlFor="fw">PDF</Label>
            <Input id="fw" ref={wmRef} type="file" accept=".pdf" />
            <Label htmlFor="tx">Texto</Label>
            <Input id="tx" value={text} onChange={(e) => setText(e.target.value)} />
            <Button className="w-full" disabled={busy} onClick={watermark}>
              <Droplets className="mr-1 size-4" /> Aplicar marca d'água
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
