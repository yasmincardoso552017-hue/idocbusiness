import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { FileSignature, CheckCircle2, ShieldCheck, ExternalLink, Eraser } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getSigningSession, submitSignature } from "@/lib/signing.functions";

export const Route = createFileRoute("/sign/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Assinar documento — DocFlow" },
      {
        name: "description",
        content: "Assine eletronicamente seu documento com registro de evidências e auditoria.",
      },
      { property: "og:title", content: "Assinar documento — DocFlow" },
      {
        property: "og:description",
        content: "Assinatura eletrônica segura com evidências e verificação pública.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignPage,
});

function SignPage() {
  const { token } = Route.useParams();
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
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

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }, [data?.signer.id]);

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
      if (!hasDrawn.current) throw new Error("Desenhe sua assinatura");
      const imageData = canvasRef.current?.toDataURL("image/png");
      let geo: string | undefined;
      try {
        geo = await new Promise<string | undefined>((resolve) => {
          if (!navigator.geolocation) return resolve(undefined);
          const t = setTimeout(() => resolve(undefined), 4000);
          navigator.geolocation.getCurrentPosition(
            (p) => {
              clearTimeout(t);
              resolve(`${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`);
            },
            () => {
              clearTimeout(t);
              resolve(undefined);
            },
          );
        });
      } catch {
        geo = undefined;
      }
      return submitSignature({
        data: {
          token,
          typedName: name.trim(),
          imageData,
          acceptedTerms: true,
          geo,
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

  if (done || data.signer.status === "signed")
    return (
      <Centered
        title="Assinatura concluída"
        text="Você receberá o documento final assinado. Guarde o código de verificação enviado pelo remetente."
        icon
      />
    );

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
          <span className="gradient-brand flex size-8 items-center justify-center rounded-lg">
            <FileSignature className="size-4 text-primary-foreground" />
          </span>
          <span className="text-sm font-extrabold tracking-tight">DocFlow</span>
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
              <ExternalLink className="size-3.5" /> Ler documento antes de assinar
            </a>
          ) : null}
        </section>

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

          <Button
            className="w-full"
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
          >
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

function Centered({ title, text, icon }: { title: string; text: string; icon?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="card-soft max-w-sm space-y-2 p-6 text-center">
        {icon ? <CheckCircle2 className="mx-auto size-10 text-primary" /> : null}
        <h1 className="text-base font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{text}</p>
        <Link to="/" className="inline-block pt-2 text-xs font-semibold text-primary">
          Ir para o DocFlow
        </Link>
      </div>
    </div>
  );
}
