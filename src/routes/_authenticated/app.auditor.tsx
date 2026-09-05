import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Scale, Upload, Loader2, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { extractPdfText, rasterizePages } from "@/lib/pdf-preview";
import { auditContract, askAboutContract, ocrPages } from "@/lib/audit.functions";
import type { AuditResult } from "@/lib/audit.functions";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/auditor")({
  head: () => ({
    meta: [
      { title: "Auditor jurídico com IA — IDOC BUSINESS" },
      {
        name: "description",
        content:
          "Envie um contrato em PDF e receba análise jurídica linha a linha: riscos, cláusulas abusivas, brechas e sugestões de blindagem.",
      },
      { property: "og:title", content: "Auditor jurídico com IA — IDOC BUSINESS" },
      {
        property: "og:description",
        content: "Análise jurídica de contratos com riscos, base legal e sugestões de redação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditorPage,
});

const riskTone: Record<string, string> = {
  alto: "bg-destructive/10 text-destructive",
  medio: "bg-warning/15 text-warning-foreground",
  baixo: "bg-success/12 text-success",
};

function AuditorPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const runAudit = useServerFn(auditContract);
  const runAsk = useServerFn(askAboutContract);
  const runOcr = useServerFn(ocrPages);

  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const { data: history = [] } = useQuery({
    queryKey: ["contract-audits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_audits")
        .select("id, file_name, summary, created_at, result")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const audit = useMutation({
    mutationFn: async (file: File) => {
      setResult(null);
      setAnswer("");
      setStatus("Lendo o documento…");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let pages: string[] = [];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        pages = await extractPdfText(bytes);
        const chars = pages.join("").length;
        if (chars < 200) {
          setStatus("Documento digitalizado: aplicando OCR…");
          const count = Math.min(pages.length || 1, 15);
          const shots = await rasterizePages(
            bytes,
            Array.from({ length: count }, (_, i) => i),
            "image/jpeg",
            1.6,
          );
          const images = await Promise.all(
            shots.map(
              (s) =>
                new Promise<string>((resolve) => {
                  const r = new FileReader();
                  r.onload = () => resolve(String(r.result));
                  r.readAsDataURL(s.blob);
                }),
            ),
          );
          const ocr = await runOcr({ data: { images } });
          pages = ocr.texts;
        }
      } else {
        pages = [await file.text()];
      }
      const full = pages.join("\n\n").trim();
      if (full.length < 40) throw new Error("Não foi possível ler texto suficiente do documento");
      setText(full);
      setFileName(file.name);
      setStatus("Auditando cláusula por cláusula…");
      return runAudit({ data: { fileName: file.name, text: full } });
    },
    onSuccess: (data) => {
      setResult(data.result);
      setStatus("");
      toast.success("Auditoria concluída");
      qc.invalidateQueries({ queryKey: ["contract-audits"] });
    },
    onError: (e: Error) => {
      setStatus("");
      toast.error(e.message || "Falha na auditoria");
    },
  });

  const ask = useMutation({
    mutationFn: async () => runAsk({ data: { text, question } }),
    onSuccess: (d) => setAnswer(d.answer),
    onError: (e: Error) => toast.error(e.message || "Falha ao consultar"),
  });

  return (
    <AppShell title="Auditor jurídico com IA">
      <div className="card-soft p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Scale className="size-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold">Blinde seu contrato antes de assinar</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Envie o contrato em PDF (ou TXT). A IA lê linha por linha, identifica o tipo, aponta
              cláusulas abusivas, brechas, omissões e sugere redação de proteção. O arquivo original
              não é alterado.
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) audit.mutate(f);
          }}
        />
        <Button
          className="mt-4 w-full"
          disabled={audit.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {audit.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Upload className="mr-2 size-4" />
          )}
          {audit.isPending ? status || "Analisando…" : "Enviar contrato para auditoria"}
        </Button>
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <div className="card-soft p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{result.tipo}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  riskTone[result.risco_geral] ?? riskTone["medio"]
                }`}
              >
                risco {result.risco_geral}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{result.resumo}</p>
            {result.objeto && (
              <p className="mt-2 text-xs">
                <strong>Objeto:</strong> {result.objeto}
              </p>
            )}
            {result.partes.length > 0 && (
              <p className="mt-1 text-xs">
                <strong>Partes:</strong> {result.partes.join(" • ")}
              </p>
            )}
          </div>

          {result.pontos.map((p, i) => (
            <div key={i} className="card-soft p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning-foreground" />
                <span className="flex-1 text-sm font-semibold">{p.clausula}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    riskTone[p.risco] ?? riskTone["medio"]
                  }`}
                >
                  {p.risco}
                </span>
              </div>
              {p.trecho && (
                <p className="mt-2 rounded-md bg-secondary p-2 text-xs italic">“{p.trecho}”</p>
              )}
              <p className="mt-2 text-xs">{p.problema}</p>
              {p.base_legal && (
                <p className="mt-1 text-[11px] text-muted-foreground">Base legal: {p.base_legal}</p>
              )}
              <p className="mt-2 text-xs">
                <strong>Sugestão:</strong> {p.sugestao}
              </p>
            </div>
          ))}

          {result.clausulas_faltantes.length > 0 && (
            <div className="card-soft p-4">
              <h3 className="text-sm font-bold">Cláusulas que faltam</h3>
              {result.clausulas_faltantes.map((c, i) => (
                <div key={i} className="mt-2 border-t border-border pt-2 text-xs">
                  <strong>{c.titulo}</strong>
                  <p className="text-muted-foreground">{c.porque}</p>
                  <p className="mt-1">{c.sugestao}</p>
                </div>
              ))}
            </div>
          )}

          {result.checklist.length > 0 && (
            <div className="card-soft p-4">
              <h3 className="text-sm font-bold">Checklist</h3>
              <ul className="mt-2 space-y-1 text-xs">
                {result.checklist.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {c.ok ? (
                      <CheckCircle2 className="size-3.5 text-success" />
                    ) : (
                      <AlertTriangle className="size-3.5 text-destructive" />
                    )}
                    {c.item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.recomendacoes_finais.length > 0 && (
            <div className="card-soft p-4">
              <h3 className="text-sm font-bold">Recomendações finais</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                {result.recomendacoes_finais.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card-soft p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <MessageSquare className="size-4 text-primary" /> Pergunte sobre {fileName}
            </h3>
            <Textarea
              className="mt-2"
              rows={3}
              placeholder="Ex.: essa multa por rescisão é válida?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button
              className="mt-2 w-full"
              variant="secondary"
              disabled={ask.isPending || question.trim().length < 3}
              onClick={() => ask.mutate()}
            >
              {ask.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Consultar
            </Button>
            {answer && <p className="mt-3 whitespace-pre-wrap text-xs">{answer}</p>}
          </div>
        </div>
      )}

      <div className="card-soft mt-4 p-4">
        <h3 className="text-sm font-bold">Auditorias anteriores</h3>
        {history.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Nenhuma auditoria ainda.</p>
        )}
        <div className="mt-2 divide-y divide-border">
          {history.map((h) => (
            <button
              key={h.id}
              className="w-full py-2 text-left"
              onClick={() => setResult(h.result as unknown as AuditResult)}
            >
              <div className="text-xs font-semibold">{h.file_name}</div>
              <div className="text-[11px] text-muted-foreground">
                {fmtDateTime(h.created_at)} — {h.summary ?? ""}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 text-[11px] text-muted-foreground">
        <Input className="hidden" readOnly value={text.slice(0, 1)} />
        Análise informativa gerada por IA. Não substitui parecer de advogado responsável.
      </div>
    </AppShell>
  );
}
