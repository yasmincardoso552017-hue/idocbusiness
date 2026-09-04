import { Brand } from "@/components/Brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Eraser,
  MapPin,
  Camera,
  IdCard,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getSigningSession, submitSignature, getSignedDocument, claimSignedCopy } from "@/lib/signing.functions";
import { renderPdfPages, type RenderedPage } from "@/lib/pdf-preview";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sign/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Assinar documento — IDOC BUSINESS" },
      {
        name: "description",
        content: "Assine eletronicamente seu documento com registro de evidências e auditoria.",
      },
      { property: "og:title", content: "Assinar documento — IDOC BUSINESS" },
      {
        property: "og:description",
        content: "Assinatura eletrônica segura com evidências e verificação pública.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignPage,
});

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsDataURL(file);
  });
}

/** Gera a imagem da assinatura a partir do nome digitado. */
function typedSignatureImage(text: string) {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 260;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "italic 110px 'Brush Script MT','Segoe Script',cursive";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 24, 140, 850);
  return c.toDataURL("image/png");
}

function SignPage() {
  const { token } = Route.useParams();
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [geo, setGeo] = useState<string | null>(null);
  const [geoAsking, setGeoAsking] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);

  const session = useQuery({
    queryKey: ["signing-session", token],
    queryFn: () => getSigningSession({ data: { token } }),
    retry: false,
  });

  const data = session.data && !("error" in session.data) ? session.data : null;

  useEffect(() => {
    if (data?.signer.name && !name) setName(data.signer.name);
  }, [data?.signer.name]);

  // Preview visível de todas as páginas do contrato.
  useEffect(() => {
    const url = data?.fileUrl;
    if (!url || pages.length) return;
    let alive = true;
    setLoadingPreview(true);
    (async () => {
      try {
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        await renderPdfPages(bytes, 720, (p) => {
          if (alive) setPages((prev) => [...prev, p]);
        });
      } catch {
        /* documento não-PDF: link continua disponível */
      } finally {
        if (alive) setLoadingPreview(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [data?.fileUrl]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || mode !== "draw") return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    hasDrawn.current = false;
  }, [data?.signer.id, mode]);

  // Solicita a localização em tempo real quando exigido pelo remetente.
  function askGeo() {
    if (!navigator.geolocation) {
      toast.error("Dispositivo sem GPS disponível");
      return;
    }
    setGeoAsking(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeo(`${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`);
        setGeoAsking(false);
        toast.success("Localização autorizada");
      },
      () => {
        setGeoAsking(false);
        toast.error("Permissão de localização negada");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  useEffect(() => {
    if (data?.request.requireGeo && !geo && !geoAsking) askGeo();
  }, [data?.request.requireGeo]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    hasDrawn.current = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function clear() {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    hasDrawn.current = false;
  }

  const submit = useMutation({
    mutationFn: async () => {
      if (!accepted) throw new Error("É necessário aceitar os termos");
      if (name.trim().length < 2) throw new Error("Informe seu nome completo");
      if (data?.request.requireGeo && !geo) throw new Error("Autorize a localização para assinar");
      if (data?.request.requireSelfie && !selfie) throw new Error("Capture a selfie de verificação");
      if (data?.request.requirePhotoId && !photoId)
        throw new Error("Envie a foto do documento com foto");

      let imageData: string | undefined;
      if (mode === "draw") {
        if (!hasDrawn.current) throw new Error("Desenhe sua assinatura ou use a opção Digitar");
        imageData = canvasRef.current?.toDataURL("image/png");
      } else {
        imageData = typedSignatureImage(name.trim());
      }

      return submitSignature({
        data: {
          token,
          typedName: name.trim(),
          imageData,
          acceptedTerms: true,
          geo: geo ?? undefined,
          selfie: selfie ?? undefined,
          photoId: photoId ?? undefined,
          values,
        },
      });
    },
    onSuccess: () => {
      setDone(true);
      toast.success("Assinatura registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (session.isLoading)
    return <Centered title="Carregando documento…" text="Validando seu link seguro." />;

  if (session.error)
    return <Centered title="Não foi possível abrir" text="Tente novamente pelo link recebido." />;

  if (session.data && "error" in session.data)
    return <Centered title={session.data.error} text="Solicite um novo link ao remetente." />;

  if (!data) return null;

  if (done || data.signer.status === "signed") return <AfterSign token={token} />;

  if (data.blocked)
    return (
      <Centered
        title="Aguardando assinatura anterior"
        text="Este processo é sequencial. Você será avisado quando for sua vez de assinar."
      />
    );

  const textFields = data.fields.filter((f) => f.type === "text" || f.type === "cpf");

  return (
    <div className="min-h-screen bg-muted/40 pb-10">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Brand className="h-7" />
          <span className="ml-auto text-xs text-muted-foreground">Assinatura eletrônica</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <section className="card-soft space-y-1 p-4">
          <h1 className="text-base font-bold">{data.document.name}</h1>
          <p className="text-xs text-muted-foreground">
            {data.document.company ? `${data.document.company} • ` : ""}
            {data.document.pages} página(s)
          </p>
          {data.request.message ? (
            <p className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
              {data.request.message}
            </p>
          ) : null}
          {data.fileUrl ? (
            <a
              href={data.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 pt-2 text-xs font-semibold text-primary"
            >
              <ExternalLink className="size-3.5" /> Abrir em nova aba
            </a>
          ) : null}
        </section>

        <section className="card-soft space-y-3 p-4">
          <h2 className="text-sm font-bold">Leia o contrato</h2>
          {loadingPreview && !pages.length ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Carregando páginas…
            </p>
          ) : null}
          <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-lg bg-muted p-2">
            {pages.map((p) => (
              <figure key={p.index} className="space-y-1">
                <img
                  src={p.url}
                  alt={`Página ${p.index + 1} do documento ${data.document.name}`}
                  className="w-full rounded-md border border-border bg-card shadow-sm"
                />
                <figcaption className="text-center text-[11px] text-muted-foreground">
                  Página {p.index + 1}
                </figcaption>
              </figure>
            ))}
            {!pages.length && !loadingPreview ? (
              <p className="p-3 text-xs text-muted-foreground">
                Prévia indisponível para este formato. Use o link acima para ler o documento.
              </p>
            ) : null}
          </div>
        </section>

        {(data.request.requireGeo || data.request.requireSelfie || data.request.requirePhotoId) && (
          <section className="card-soft space-y-3 p-4">
            <h2 className="text-sm font-bold">Verificações solicitadas</h2>

            {data.request.requireGeo ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="flex items-start gap-2 text-xs">
                  <MapPin className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="font-semibold">Localização em tempo real</p>
                    <p className="text-muted-foreground">
                      {geo ? `Autorizada (${geo})` : "Permita o acesso para registrar a evidência."}
                    </p>
                  </div>
                </div>
                {geo ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : (
                  <Button size="sm" variant="outline" onClick={askGeo} disabled={geoAsking}>
                    {geoAsking ? "Aguardando…" : "Permitir"}
                  </Button>
                )}
              </div>
            ) : null}

            {data.request.requireSelfie ? (
              <CaptureRow
                icon={<Camera className="mt-0.5 size-4 text-primary" />}
                title="Selfie de verificação"
                hint="Tire uma foto do seu rosto agora."
                value={selfie}
                capture="user"
                onPick={setSelfie}
              />
            ) : null}

            {data.request.requirePhotoId ? (
              <CaptureRow
                icon={<IdCard className="mt-0.5 size-4 text-primary" />}
                title="Documento com foto"
                hint="Fotografe RG ou CNH."
                value={photoId}
                capture="environment"
                onPick={setPhotoId}
              />
            ) : null}
          </section>
        )}

        {textFields.length > 0 ? (
          <section className="card-soft space-y-3 p-4">
            <h2 className="text-sm font-bold">Informações solicitadas</h2>
            {textFields.map((f) => (
              <div key={f.id} className="space-y-1">
                <Label htmlFor={f.id} className="text-xs">
                  {f.type === "cpf" ? "CPF" : "Texto"}
                </Label>
                <Input
                  id={f.id}
                  value={values[f.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                />
              </div>
            ))}
          </section>
        ) : null}

        <section className="card-soft space-y-3 p-4">
          <h2 className="text-sm font-bold">Sua assinatura</h2>
          <div className="space-y-1">
            <Label htmlFor="nome" className="text-xs">
              Nome completo
            </Label>
            <Input id="nome" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "draw" ? "default" : "outline"}
              onClick={() => setMode("draw")}
            >
              Desenhar
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "type" ? "default" : "outline"}
              onClick={() => setMode("type")}
            >
              Digitar
            </Button>
          </div>

          {mode === "draw" ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label className="text-xs">Desenhe abaixo</Label>
                <Button variant="ghost" size="sm" onClick={clear}>
                  <Eraser className="mr-1 size-3.5" /> Limpar
                </Button>
              </div>
              <canvas
                ref={canvasRef}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={() => (drawing.current = false)}
                onPointerLeave={() => (drawing.current = false)}
                className="h-40 w-full touch-none rounded-lg border-2 border-dashed border-border bg-card"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs">Prévia da assinatura digitada</Label>
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-card px-3">
                <span
                  className="truncate text-3xl italic"
                  style={{ fontFamily: "'Brush Script MT','Segoe Script',cursive" }}
                >
                  {name.trim() || "Seu nome completo"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Essa assinatura digitada será aplicada no contrato final.
              </p>
            </div>
          )}

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <span>
              Declaro que li o documento e concordo em assiná-lo eletronicamente, aceitando os{" "}
              <Link to="/termos" className="font-semibold text-primary">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link to="/privacidade" className="font-semibold text-primary">
                Política de Privacidade
              </Link>
              . Autorizo o registro de IP, dispositivo, data/hora e localização aproximada como evidências.
            </span>
          </label>

          <Button className="w-full" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Registrando…" : "Assinar documento"}
          </Button>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Conexão segura e trilha de auditoria imutável.
          </p>
        </section>
      </main>
    </div>
  );
}

function CaptureRow({
  icon,
  title,
  hint,
  value,
  capture,
  onPick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  value: string | null;
  capture: "user" | "environment";
  onPick: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
      <div className="flex items-start gap-2 text-xs">
        {icon}
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-muted-foreground">{value ? "Capturado" : hint}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {value ? <img src={value} alt={title} className="size-10 rounded object-cover" /> : null}
        <Button size="sm" variant="outline" onClick={() => ref.current?.click()}>
          {value ? "Refazer" : "Capturar"}
        </Button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            onPick(await fileToDataUrl(file));
          } catch {
            toast.error("Não foi possível usar essa imagem");
          }
        }}
      />
    </div>
  );
}

/** Tela pós-assinatura: via assinada com login Google para acesso do signatário. */
function AfterSign({ token }: { token: string }) {
  const [authed, setAuthed] = useState(false);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signed = useQuery({
    queryKey: ["signed-doc", token],
    queryFn: () => getSignedDocument({ data: { token } }),
    refetchInterval: (q) => (q.state.data?.ready ? false : 5000),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function claim() {
    setBusy(true);
    try {
      const res = await claimSignedCopy({ data: { token } });
      if (res.error) toast.error(res.error);
      else if (!res.url) toast.info("A via assinada estará disponível ao concluir todas as assinaturas.");
      else setClaimUrl(res.url);
    } catch {
      toast.error("Não foi possível liberar o download");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (authed && !claimUrl) void claim();
  }, [authed]);

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (res.error) toast.error("Falha ao entrar com Google");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="card-soft w-full max-w-sm space-y-3 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h1 className="text-base font-bold">Assinatura concluída</h1>
        <p className="text-xs text-muted-foreground">
          {signed.data?.ready
            ? "Sua via assinada está pronta."
            : "Estamos finalizando o documento com as evidências. Você poderá baixar aqui mesmo."}
        </p>
        {signed.data?.code ? (
          <p className="rounded-md bg-muted p-2 text-[11px] text-muted-foreground">
            Código de verificação: <strong>{signed.data.code}</strong>
          </p>
        ) : null}

        {authed ? (
          claimUrl ? (
            <Button asChild className="w-full">
              <a href={claimUrl}>
                <Download className="mr-2 size-4" /> Baixar minha via assinada
              </a>
            </Button>
          ) : (
            <Button className="w-full" onClick={() => void claim()} disabled={busy}>
              {busy ? "Preparando…" : "Liberar download"}
            </Button>
          )
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Entre com sua conta Google para baixar a sua versão do contrato assinado.
            </p>
            <Button className="w-full" onClick={() => void google()}>
              Entrar com conta Google
            </Button>
          </div>
        )}

        <Link to="/" className="inline-block pt-1 text-xs font-semibold text-primary">
          Ir para o IDOC BUSINESS
        </Link>
      </div>
    </div>
  );
}

function Centered({ title, text, icon }: { title: string; text: string; icon?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="card-soft max-w-sm space-y-2 p-6 text-center">
        {icon ? <CheckCircle2 className="mx-auto size-10 text-primary" /> : null}
        <h1 className="text-base font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{text}</p>
        <Link to="/" className="inline-block pt-2 text-xs font-semibold text-primary">
          Ir para o IDOC BUSINESS
        </Link>
      </div>
    </div>
  );
}
